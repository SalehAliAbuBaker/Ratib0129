/* Ratib 3.6.148 — configurable output-only document signatories.
   Never mutates accounts, vouchers, totals, or posted records. */
(function(){
'use strict';
const KEY='ratib_document_signatures_v1';
const DEFAULTS={
 payment:['المحاسب / المدير','أمين الصندوق','المستلم'],
 receipt:['المحاسب / المدير','أمين الصندوق','المستفيد'],
 journal:['المحاسب / المدير','أمين الصندوق'],
 compound:['المعدّ','المراجع','المعتمد'],
 opening:['المعدّ','المراجع','المعتمد'],
 'أمر توريد':['معدّ الطلب','المراجع','المعتمد'],
 'توريد مخزني':['المسلّم','أمين المخزن المستلم','الفاحص','المعتمد'],
 'فاتورة مشتريات':['مسؤول المشتريات','مراجع الحسابات','المعتمد'],
 'أمر صرف':['طالب الصرف','المراجع','المعتمد'],
 'صرف مخزني':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد'],
 'فاتورة مبيعات':['محرّر الفاتورة','المحاسب','المعتمد','العميل / المستلم'],
 'مرتجع الوارد':['المسلّم','أمين المخزن المستلم','المراجع','المعتمد'],
 'مرتجع الصادر':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد']
};
const TITLES={payment:'سند صرف',receipt:'سند قبض',journal:'قيد بسيط',compound:'قيد مركب',opening:'قيد افتتاحي'};
// Offer only the five active accounting voucher types in Settings.
// Keep historical commerce definitions for printing existing archived documents.
const keys=['payment','receipt','journal','compound','opening'];
const newDefault=key=>({enabled:DEFAULTS[key].length>0,people:DEFAULTS[key].map(label=>({label,name:''}))});
const cleanText=(x,n=64)=>String(x==null?'':x).trim().slice(0,n);
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeKey=key=>Object.prototype.hasOwnProperty.call(DEFAULTS,key)?key:'';
let state={};
try{
 const raw=typeof store!=='undefined'&&typeof store.get==='function'?store.get(KEY,null):JSON.parse(localStorage.getItem(KEY)||'null');
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))state=raw;
}catch(_){}
function sanitize(key,item){
 const def=newDefault(key);
 if(!item||typeof item!=='object')return def;
 const people=Array.isArray(item.people)?item.people.slice(0,8).map(p=>({label:cleanText(p?.label),name:cleanText(p?.name,90)})).filter(p=>p.label):def.people;
 return {enabled:item.enabled!==false,people};
}
function liveState(){
 try{
  const current=typeof store!=='undefined'&&typeof store.get==='function'?store.get(KEY,null):JSON.parse(localStorage.getItem(KEY)||'null');
  if(current&&typeof current==='object'&&!Array.isArray(current))state=current;
 }catch(_){}
 return state;
}
function get(key){key=safeKey(key);return key?sanitize(key,liveState()[key]):{enabled:false,people:[]};}
function persist(){
 try{if(typeof store!=='undefined'&&typeof store.set==='function')store.set(KEY,state);else localStorage.setItem(KEY,JSON.stringify(state));}
 catch(error){console.warn('Ratib signature settings could not be saved',error);return false;}
 return true;
}
function put(key,value){
 key=safeKey(key);if(!key)return false;
 liveState();
 const next=sanitize(key,value);
 if(next.people.length>8)return false;
 state[key]=next;return persist();
}
function reset(key){key=safeKey(key);if(!key)return false;liveState();delete state[key];return persist();}
function html(key){
 const config=get(key);
 if(!config.enabled||!config.people.length)return '';
 return '<div class="ratib-output-signatures">'+config.people.map(p=>'<div class="ratib-output-signature"><b>'+htmlEscape(p.label)+'</b><span>الاسم: '+(p.name?htmlEscape(p.name):'____________')+'</span><span>التوقيع: ____________</span></div>').join('')+'</div>';
}
function drawCanvas(ctx,key,width,y){
 const data=get(key);
 if(!data.enabled||!data.people.length)return 0;
 const margin=40,perRow=Math.min(4,data.people.length),cols=perRow,cellWidth=(width-2*margin)/cols;
 const rows=Math.ceil(data.people.length/cols),height=rows*91+12;
 ctx.save();ctx.fillStyle='#111827';ctx.direction='rtl';ctx.textAlign='center';
 data.people.forEach((p,i)=>{
  const row=Math.floor(i/cols),col=i%cols,x=width-margin-(col+.5)*cellWidth,top=y+row*91;
  ctx.font="bold 17px Tajawal,Arial,sans-serif";ctx.fillText(p.label,x,top+19,cellWidth-14);
  ctx.font="15px Tajawal,Arial,sans-serif";
  ctx.fillText('الاسم: '+(p.name||'____________'),x,top+49,cellWidth-14);
  ctx.fillText('التوقيع: ____________',x,top+76,cellWidth-14);
 });
 ctx.restore();return height;
}
function height(key){const v=get(key);return v.enabled&&v.people.length?Math.ceil(v.people.length/4)*91+12:0;}
function fillVoucher(key){
 const element=document.querySelector('.pv-signatures');if(!element)return;
 for(const child of element.children){if(!child.classList.contains('ratib-sig-print-host'))child.style.display='none';}
 let host=element.querySelector('.ratib-sig-print-host');
 if(!host){host=document.createElement('div');host.className='ratib-sig-print-host';element.append(host);}
 host.style.width='100%';host.innerHTML=html(key);
 element.classList.add('ratib-signatures-managed');
}
let selected='payment',draft=null;
function field(name,type='text',value=''){
 const inp=document.createElement('input');inp.type=type;inp.value=value;inp.className='ratib-sig-input';inp.setAttribute('aria-label',name);inp.maxLength=name==='name'?90:64;return inp;
}
function notify(message){if(typeof window.showToast==='function')window.showToast(message,'success');}
function findHost(){
 const page=document.getElementById('pageSettings');if(!page)return null;
 const cards=[...page.querySelectorAll(':scope > .settings-accordion-card')];
 const card=cards.find(c=>c.querySelector(':scope > .settings-accordion-header')?.textContent?.includes('الحسابات الافتراضية للسندات'));
 return card?.querySelector(':scope > .settings-accordion-body')||null;
}
function build(){
 const host=findHost();if(!host||document.getElementById('ratibSignatureSettings'))return;
 const box=document.createElement('section');box.id='ratibSignatureSettings';box.className='ratib-signature-settings';
 box.innerHTML='<h3>✍️ تواقيع المستندات</h3><p class="ratib-sig-hint">تخصيص أسماء ومسميات التواقيع لكل مستند، دون تغيير الحسابات أو الحركات المالية.</p>'+
 '<label for="ratibSignatureType">نوع المستند</label><select id="ratibSignatureType" class="ratib-sig-select">'+keys.map(key=>'<option value="'+htmlEscape(key)+'">'+htmlEscape(TITLES[key]||key)+'</option>').join('')+'</select>'+
 '<label class="ratib-sig-check"><input type="checkbox" id="ratibSignatureEnabled"> إظهار التواقيع لهذا المستند</label>'+
 '<div id="ratibSignatureRows"></div><button type="button" class="btn btn-ghost" id="ratibSignatureAdd">＋ إضافة توقيع</button>'+
 '<h4>معاينة أسفل المستند</h4><div id="ratibSignaturePreview"></div>'+
 '<div class="ratib-sig-actions"><button type="button" class="btn btn-primary" id="ratibSignatureSave">حفظ التواقيع</button><button type="button" class="btn btn-ghost" id="ratibSignatureReset">استعادة الافتراضي</button></div>'+
 '<details class="ratib-sig-bulk"><summary>تطبيق التواقيع على مستندات أخرى</summary><p class="ratib-sig-hint">يتم نسخ المسميات والأسماء والحالة بعد الحفظ على الأنواع المحددة.</p><div id="ratibSignatureBulk">'+keys.map(k=>'<label><input type="checkbox" value="'+htmlEscape(k)+'">'+htmlEscape(TITLES[k]||k)+'</label>').join('')+'</div><button type="button" class="btn btn-ghost" id="ratibSignatureApply">تطبيق على المحدد</button></details>';
 host.appendChild(box);
 const type=box.querySelector('#ratibSignatureType'),enabled=box.querySelector('#ratibSignatureEnabled'),rows=box.querySelector('#ratibSignatureRows'),preview=box.querySelector('#ratibSignaturePreview');
 const commit=()=>{if(!draft)return false;const invalid=draft.people.some(p=>!p.label.trim());if(invalid){notify('يرجى إدخال مسمى لكل توقيع.');return false;}if(!put(selected,draft))return false;return true;};
 function updatePreview(){
  preview.innerHTML=draft.enabled&&draft.people.length?'<div class="ratib-output-signatures">'+draft.people.map(p=>'<div class="ratib-output-signature"><b>'+htmlEscape(p.label||'المسمى')+'</b><span>الاسم: '+htmlEscape(p.name||'____________')+'</span><span>التوقيع: ____________</span></div>').join('')+'</div>':'<span>التواقيع مخفية لهذا المستند.</span>';
 }
 function render(){
  rows.replaceChildren();
  draft.people.forEach((p,i)=>{
   const row=document.createElement('div');row.className='ratib-sig-row';
   const label=field('label','text',p.label),name=field('name','text',p.name);
   label.placeholder='صفة صاحب التوقيع';name.placeholder='الاسم (اختياري)';
   label.addEventListener('input',()=>{p.label=cleanText(label.value);updatePreview();});
   name.addEventListener('input',()=>{p.name=cleanText(name.value,90);updatePreview();});
   row.append(label,name);
   [['↑','رفع',()=>{if(i){[draft.people[i-1],draft.people[i]]=[draft.people[i],draft.people[i-1]];render();}}],
    ['↓','خفض',()=>{if(i<draft.people.length-1){[draft.people[i+1],draft.people[i]]=[draft.people[i],draft.people[i+1]];render();}}],
    ['×','حذف',()=>{draft.people.splice(i,1);render();}]].forEach(([mark,title,fn])=>{
    const b=document.createElement('button');b.type='button';b.textContent=mark;b.title=title;b.className='ratib-sig-row-action';b.addEventListener('click',fn);row.append(b);
   });
   rows.append(row);
  });
  enabled.checked=draft.enabled;updatePreview();
 }
 function load(key){selected=key;draft=get(key);enabled.checked=draft.enabled;render();}
 type.addEventListener('change',()=>load(type.value));
 enabled.addEventListener('change',()=>{draft.enabled=enabled.checked;updatePreview();});
 box.querySelector('#ratibSignatureAdd').addEventListener('click',()=>{if(draft.people.length>=8){notify('الحد الأعلى ثمانية تواقيع.');return;}draft.people.push({label:'توقيع جديد',name:''});render();});
 box.querySelector('#ratibSignatureSave').addEventListener('click',()=>{if(commit())notify('تم حفظ إعدادات التواقيع.');});
 box.querySelector('#ratibSignatureReset').addEventListener('click',()=>{reset(selected);load(selected);notify('عادت التواقيع الافتراضية لهذا المستند.');});
 box.querySelector('#ratibSignatureApply').addEventListener('click',()=>{
  if(!commit())return;
  const targets=[...box.querySelectorAll('#ratibSignatureBulk input:checked')].map(el=>el.value).filter(k=>safeKey(k)&&k!==selected);
  if(!targets.length){notify('حدد المستندات المطلوب تطبيق التواقيع عليها.');return;}
  liveState();for(const key of targets)state[key]=sanitize(key,draft);
  persist();notify('تم تطبيق التواقيع على '+targets.length+' نوع مستند.');
 });
 load(selected);
}
const css=document.createElement('style');css.id='ratibSignaturesStyle148';css.textContent=
 '.ratib-signature-settings{margin-top:18px;padding:14px 0;border-top:1px solid var(--border)}'+
 '.ratib-signature-settings h3,.ratib-signature-settings h4{margin:10px 0;font-size:1rem;color:var(--text)}'+
 '.ratib-sig-hint{color:var(--muted);font-size:.84rem;line-height:1.6}'+
 '.ratib-sig-select,.ratib-sig-input{width:100%;min-width:0;padding:8px 9px;border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--text);font:inherit}'+
 '.ratib-sig-select{margin:5px 0 12px}.ratib-sig-check{display:flex;gap:9px;align-items:center;margin:8px 0}'+
 '.ratib-sig-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 27px 27px 27px;gap:5px;align-items:center;margin:7px 0}'+
 '.ratib-sig-row-action{padding:2px;min-height:34px;border:1px solid var(--border);border-radius:7px;background:var(--card);color:var(--text)}'+
 '.ratib-sig-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.ratib-sig-bulk{margin-top:12px;padding:10px;border:1px solid var(--border);border-radius:9px}'+
 '#ratibSignatureBulk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}#ratibSignatureBulk label{display:flex;gap:6px;align-items:center}'+
 '.ratib-output-signatures{display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-top:20px;break-inside:avoid;page-break-inside:avoid}'+
 '.ratib-output-signature{flex:1 1 145px;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;color:#111827;font-size:9.5pt;line-height:1.4}'+
 '#ratibSignaturePreview{padding:10px;border:1px dashed var(--border);border-radius:8px}'+
 '.pv-signatures.ratib-signatures-managed{display:block!important;margin-top:12px!important}'+
 '@media(max-width:430px){.ratib-sig-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 25px 25px 25px;gap:3px}.ratib-sig-row-action{font-size:.85rem}}'+
 '@media print{#ratibSignatureSettings{display:none!important}.ratib-output-signatures{break-inside:avoid;page-break-inside:avoid}}';
document.head.appendChild(css);
window.RatibSignatureSettings={get,put,reset,html,drawCanvas,height,fillVoucher,defaults:keys.slice()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();