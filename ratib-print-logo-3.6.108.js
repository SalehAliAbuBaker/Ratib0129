/* Ratib trial 3.6.108 — user-owned print/report logo.
 * Store a compressed local image; never touch ledger, transactions or app icon.
 */
(function(){
'use strict';
if(window.RatibPrintLogo)return;
const KEY='user_print_logo_v1',MAX_UPLOAD=8*1024*1024,MAX_SAVED=185*1024,MAX_SIDE=360;
const $=id=>document.getElementById(id);
const safeGet=()=>{try{const v=store.get(KEY,null);return v&&typeof v==='object'&&typeof v.data==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(v.data)?v:null;}catch(_){return null;}};
let cachedSource='',cachedImage=null,loaded=false,active=null,pendingReady=Promise.resolve(false);
function refreshAsset(){
 const item=safeGet();
 active=item;
 const source=item?.enabled===false?'':item?.data||'';
 if(source===cachedSource)return item;
 cachedSource=source;cachedImage=null;loaded=false;
 if(source){
  const image=new Image();
  pendingReady=new Promise(resolve=>{
   image.onload=()=>{if(cachedSource===source){cachedImage=image;loaded=!!image.naturalWidth;syncPrint();}resolve(!!image.naturalWidth);};
   image.onerror=()=>{if(cachedSource===source){cachedImage=null;loaded=false;}resolve(false);};
   image.src=source;
  });
 }else pendingReady=Promise.resolve(false);
 return item;
}
function status(){const obj=refreshAsset();return {configured:!!obj,enabled:!!obj&&obj.enabled!==false,bytes:obj?.bytes||0,ready:loaded};}
function decodePhoto(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  const done=()=>URL.revokeObjectURL(url);
  img.onload=()=>{done();resolve(img);};img.onerror=()=>{done();reject(Error('تعذر فتح الصورة. اختر PNG أو JPG أو WebP صالحًا.'));};
  img.src=url;
 });
}
function compressed(canvas,keepAlpha){
 const png=canvas.toDataURL('image/png');
 const webp=canvas.toDataURL('image/webp',0.81);
 const jpg=canvas.toDataURL('image/jpeg',0.82);
 const options=(keepAlpha?[webp,png]:[webp,jpg,png]).filter(x=>/^data:image\/(?:png|jpeg|webp);base64,/.test(x));
 const size=url=>Math.ceil((url.length-url.indexOf(',')-1)*.75);
 return options.sort((a,b)=>size(a)-size(b))[0]||png;
}
async function optimize(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>MAX_UPLOAD)
  throw Error('اختر صورة PNG أو JPG أو WebP لا تتجاوز 8 ميجابايت.');
 const img=await decodePhoto(file);let side=MAX_SIDE;
 for(let tries=0;tries<5;tries++){
  const factor=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('تعذر تجهيز الصورة على هذا الجهاز.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const data=compressed(canvas,file.type!=='image/jpeg'),bytes=Math.ceil((data.length-data.indexOf(',')-1)*.75);
  canvas.width=1;canvas.height=1;
  if(bytes<=MAX_SAVED)return {data,bytes,width:Math.round(img.naturalWidth*factor),height:Math.round(img.naturalHeight*factor)};
  side=Math.max(80,Math.round(side*.72));
 }
 throw Error('تعذّر ضغط الصورة إلى الحجم المناسب. اختر شعارًا أقل تعقيدًا.');
}
function printLogoNode(){const img=document.createElement('img');img.className='ratib-user-print-logo';img.alt='شعار صاحب التقرير';img.decoding='sync';return img;}
function syncRoot(root,position='header'){
 if(!root)return;
 const item=refreshAsset();
 const desired=item&&item.enabled!==false?item.data:'';
 let img=root.querySelector(':scope > .ratib-user-print-logo');
 if(position==='special'&&root.querySelector('.ps-header .ratib-user-print-logo,.pv-header .ratib-user-print-logo')){if(img)img.remove();return;}
 if(!desired){if(img)img.remove();return;}
 if(!img){img=printLogoNode();root.insertBefore(img,root.firstChild);}
 if(img.src!==desired)img.src=desired;
 root.classList.add('ratib-with-user-logo');
 if(position==='special')img.classList.add('ratib-print-logo-special');
}
function syncPrint(){
 const roots=[
 ['#printStatementContainer .ps-header','header'],['#printBudgetContainer .ps-header','header'],
 ['#printVoucherContainer .pv-header','header'],['#printHeaderBanner','header'],
 ['#trialPrintHost','special'],['#ratibSpecialPrintHost','special'],
 ['#printPreviewBody','special'],['#ratibCommercePrintHost .rc-paper-head','header'],['#rc-preview-content .rc-paper-head','header']
 ];
 for(const [selector,kind] of roots)syncRoot(document.querySelector(selector),kind);
}
function whenReady(){refreshAsset();return pendingReady.then(ok=>Boolean(ok&&loaded));}
function drawCanvas(canvas){
 const item=refreshAsset();
 if(!item||item.enabled===false)return false;
 if(!loaded&&cachedImage?.complete&&cachedImage.naturalWidth)loaded=true;
 if(!loaded||!cachedImage?.naturalWidth)throw Error('شعار المستخدم قيد التحميل؛ انتظر لحظة ثم أعد إنشاء ملف PDF.');
 const ctx=canvas?.getContext?.('2d');if(!ctx)return false;
 if(canvas.__ratibLogoDrawn===cachedSource)return true;
 const side=Math.max(55,Math.min(105,Math.round(Math.min(canvas.width,canvas.height)*.12)));
 const ratio=Math.min(side/cachedImage.naturalWidth,side/cachedImage.naturalHeight);
 const width=cachedImage.naturalWidth*ratio,height=cachedImage.naturalHeight*ratio;
 ctx.save();ctx.drawImage(cachedImage,Math.max(25,Math.round(canvas.width*.035)),Math.max(25,Math.round(canvas.height*.032)),width,height);ctx.restore();
 canvas.__ratibLogoDrawn=cachedSource;return true;
}
async function persist(item){
 store.set(KEY,item);
 if(typeof flushStorage==='function')await flushStorage();
 cachedSource='';refreshAsset();await pendingReady;syncPrint();
}
function addOptions(){
 if($('ratibPrintLogoOptions'))return;
 const field=$('settingShowHeader')?.closest('.settings-accordion-body');
 if(!field)return;
 const card=field.parentElement;
 const title=card.querySelector('.settings-accordion-header span:first-child');
 if(title)title.textContent='🖨️ خيارات عرض وطباعة التقارير والمستندات';
 const box=document.createElement('section');box.id='ratibPrintLogoOptions';box.className='ratib-print-logo-settings';
 box.innerHTML='<strong>شعار المستخدم في التقارير والمستندات</strong><p class="ratib-logo-help">اختر الشعار من الجهاز مرة واحدة. يصغّره التطبيق تلقائيًا ويحفظه محليًا ليظهر في الطباعة وPDF دون إنترنت. لا يتغير شعار «راتب» في أعلى التطبيق.</p>'+
  '<div class="ratib-logo-controls"><label class="btn btn-ghost ratib-logo-pick">＋ اختيار صورة شعار<input id="ratibPrintLogoFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button id="ratibPrintLogoRemove" class="btn btn-ghost" type="button">حذف الشعار</button></div>'+
  '<label class="ratib-logo-visibility"><input type="checkbox" id="ratibPrintLogoEnabled"> إظهار الشعار في التقارير والمستندات المطبوعة</label>'+
  '<div class="ratib-logo-view"><img id="ratibPrintLogoPreview" alt="معاينة شعار المستخدم" hidden><small id="ratibPrintLogoInfo" aria-live="polite"></small></div>';
 const btn=$('saveHeaderSettingsBtn');
 if(btn)btn.before(box);else field.append(box);
 const file=$('ratibPrintLogoFile'),enabled=$('ratibPrintLogoEnabled'),remove=$('ratibPrintLogoRemove'),preview=$('ratibPrintLogoPreview'),info=$('ratibPrintLogoInfo');
 const repaint=()=>{
  const item=refreshAsset();const has=!!item;
  preview.hidden=!has;if(has&&preview.src!==item.data)preview.src=item.data;else if(!has)preview.removeAttribute('src');
  enabled.checked=has&&item.enabled!==false;enabled.disabled=!has;remove.disabled=!has;
  info.textContent=has?'الشعار محفوظ محليًا — '+Math.max(1,Math.round((item.bytes||0)/1024))+' كيلوبايت':'لم تُحدد صورة شعار بعد';
 };
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected)return;
  const label=box.querySelector('.ratib-logo-pick');if(label)label.classList.add('ratib-logo-busy');
  info.textContent='جارٍ تجهيز صورة خفيفة...';
  try{
   const output=await optimize(selected);
   await persist({...output,enabled:true,updatedAt:new Date().toISOString()});
   repaint();if(typeof showToast==='function')showToast('تم حفظ الشعار، وسيظهر في الطباعة وPDF','success');
  }catch(e){repaint();if(typeof showToast==='function')showToast(e.message,'warn');else alert(e.message);}
  finally{file.value='';if(label)label.classList.remove('ratib-logo-busy');}
 });
 enabled.addEventListener('change',async()=>{
  const item=safeGet();if(!item)return;
  try{await persist({...item,enabled:enabled.checked});repaint();}
  catch(e){repaint();if(typeof showToast==='function')showToast('تعذّر حفظ خيار الشعار','error');}
 });
 remove.addEventListener('click',async()=>{
  if(!safeGet()||!confirm('حذف صورة الشعار المحفوظة من هذا الجهاز؟ لا تُحذف المستندات أو البيانات المالية.'))return;
  try{store.remove(KEY);if(typeof flushStorage==='function')await flushStorage();cachedSource='';refreshAsset();syncPrint();repaint();}
  catch(e){if(typeof showToast==='function')showToast('تعذّر حذف الشعار','error');}
 });
 card.querySelector('.settings-accordion-header')?.addEventListener('click',()=>queueMicrotask(repaint));
 repaint();
}
function init(){
 addOptions();refreshAsset();syncPrint();
 const targets=['printStatementContainer','printBudgetContainer','printVoucherContainer','trialPrintHost','ratibSpecialPrintHost','printPreviewBody'];
 let queued=false;
 const request=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;syncPrint();});};
 const observer=new MutationObserver(request);
 for(const id of targets){const root=$(id);if(root)observer.observe(root,{subtree:true,childList:true});}
 document.addEventListener('beforeprint',()=>{refreshAsset();syncPrint();});
 document.addEventListener('pointerdown',()=>{if(!loaded)refreshAsset();},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshAsset();syncPrint();}});
}
window.RatibPrintLogo={drawCanvas,syncPrint,refreshAsset,status,whenReady,compress:optimize};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();