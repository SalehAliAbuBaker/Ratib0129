/* Android host services. Accounting data and encryption stay in Ratib. */
(()=>{'use strict';
if(!window.RatibNative)return;
document.documentElement.dataset.ratibNativeFont='1';
const pending=new Map(),blobs=new Map();let sequence=0;
function request(method,args={}){return new Promise((resolve,reject)=>{const id='r'+(++sequence);pending.set(id,{resolve,reject});RatibNative.request(id,method,JSON.stringify(args));});}
window.__ratibNativeResult=(id,ok,value)=>{const p=pending.get(id);if(!p)return;pending.delete(id);if(ok)p.resolve(value);else{const message=value?.message||String(value);p.reject(value?.name==='TypeError'?new TypeError(message):new DOMException(message,value?.name||'OperationError'));}};
const capabilities=()=>JSON.parse(RatibNative.capabilities());
window.RatibAndroid={request,capabilities};
// Android-owned speech UI; no web-origin microphone grants or background capture.
class AndroidSpeechRecognition {
 start(){
  if(this._active)throw new DOMException('الإملاء قيد التشغيل','InvalidStateError');
  this._active=true;const generation=this._generation=(this._generation||0)+1;
  request('voiceStart',{lang:this.lang||'ar-SA'}).then(text=>{
   if(!this._active||generation!==this._generation)return;
   const item=[{transcript:String(text),confidence:1}];item.isFinal=true;
   this.onresult?.({resultIndex:0,results:[item]});
  }).catch(e=>{if(this._active&&generation===this._generation&&e.name!=='AbortError')this.onerror?.({error:e.message});})
  .finally(()=>{if(generation===this._generation){this._active=false;this.onend?.();}});
 }
 stop(){if(!this._active)return;this._active=false;this._generation++;request('voiceCancel').catch(()=>{});this.onend?.();}
 abort(){this.stop();}
}
window.SpeechRecognition=window.webkitSpeechRecognition=AndroidSpeechRecognition;
// Only the public licensing endpoints use native networking. Keep ordinary
// fetch and the existing licence/device/trial validation policy intact.
const webFetch=window.fetch?.bind(window);
window.fetch=async function(url,opts={}){
 const address=String(url);
 const match=/^https:\/\/ratib\.saleh0129\.workers\.dev\/api\/license\/(activate|verify)$/.exec(address);
 if(!match)return webFetch(url,opts);
 if(opts.method!=='POST')throw Error('طريقة طلب الترخيص غير مسموحة');
 const r=await request('licenseRequest',{action:match[1],body:opts.body});
 return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json'}});
};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const url=create(b);blobs.set(url,b);return url;};
URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url);};
function error(e){if(e.name!=='AbortError'){console.error(e);window.showToast?.('تعذر حفظ الملف: '+e.message,'error',6000);}}
async function sendFile(blob,name,action='save',options={}){
 if(/\.xls$/i.test(name||'')&&typeof window.XLSX!=='undefined'){
  const text=await blob.text();
  if(/^\s*\uFEFF?\s*<html/i.test(text)){
   const table=new DOMParser().parseFromString(text,'text/html').querySelector('table');
   if(!table)throw Error('جدول Excel غير متاح');
   const book=XLSX.utils.table_to_book(table,{raw:true});book.Workbook={Views:[{RTL:true}]};
   blob=new Blob([XLSX.write(book,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   name=name.replace(/\.xls$/i,'.xlsx');
  }
 }
 const id='f'+(++sequence),max=128*1024*1024;
 if(blob.size>max)throw Error('الملف أكبر من الحد المدعوم (128 MB)');
 const begun=RatibNative.beginFile(id,String(name||'ratib-file'),blob.type||'application/octet-stream',action);
 if(begun)throw Error(begun);
 try{
  const blockSize=384*1024;
  for(let offset=0;offset<blob.size;offset+=blockSize){
    const encoded=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result.slice(reader.result.indexOf(',')+1));
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(blob.slice(offset,offset+blockSize));
    });
    const error=RatibNative.appendFile(id,encoded);
    if(error)throw Error(error);
  }
  return await request('finishFile',{...options,fileId:id});
 }
 catch(e){RatibNative.abortFile(id);throw e;}
}
window.RatibAndroid.sendFile=sendFile;
async function download(anchor){const href=anchor.href;let blob=blobs.get(href);if(!blob){const response=await fetch(href);if(!response.ok)throw Error('تعذر قراءة الملف');blob=await response.blob();}return sendFile(blob,anchor.download||decodeURIComponent(new URL(href).pathname.split('/').pop()));}
const click=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download')||this.href.startsWith('blob:')){download(this).catch(error);return;}return click.call(this);};
document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&(a.hasAttribute('download')||a.href.startsWith('blob:'))){e.preventDefault();e.stopImmediatePropagation();download(a).catch(error);}},true);
Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>!!data?.files?.length||!!data?.text||!!data?.url});
Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{if(data.files?.length){if(data.files.length!==1)throw Error('مشاركة ملف واحد في كل مرة');return sendFile(data.files[0],data.files[0].name,'share');}return request('shareText',{text:[data.title,data.text,data.url].filter(Boolean).join('\n')});}});
window.print=()=>{
 const styles=[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(x=>x.outerHTML).join('\n');
 const clone=document.body.cloneNode(true);clone.querySelectorAll('script').forEach(x=>x.remove());
 clone.querySelectorAll('input,textarea,select').forEach((el,i)=>{const original=document.querySelectorAll('input,textarea,select')[i];if(original){if(el.tagName==='TEXTAREA')el.textContent=original.value;else if(el.tagName==='INPUT')el.setAttribute('value',original.value);}});
 const html='<!doctype html><html lang="ar" dir="rtl" class="'+document.documentElement.className+'"><head><meta charset="utf-8"><base href="https://app.ratib.local/">'+styles+'</head>'+clone.outerHTML+'</html>';
 request('print',{html,name:'راتب',landscape:document.documentElement.classList.contains('ratib-print-landscape')}).then(()=>window.dispatchEvent(new Event('afterprint'))).catch(error);
};
// Native biometric prompt verifies the enrolled Android user; PIN remains needed
// to obtain the vault key at the beginning of each app session.
if(capabilities().biometric)window.PublicKeyCredential=window.PublicKeyCredential||function(){};
class NativeNotification{constructor(title,opts={}){request('notify',{title,body:opts.body||'',tag:opts.tag||title,silent:opts.silent===true||window.RatibFeedback?.allowReminderSound?.()===false}).catch(error);}close(){}static get permission(){return capabilities().notifications?'granted':'default';}static async requestPermission(){return request('notificationPermission');}}
window.Notification=NativeNotification;
Object.defineProperty(navigator,'app',{value:{exitApp(){request('exit');}}});
window.close=()=>request('exit');
})();
