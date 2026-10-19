/* Ratib trial 3.6.105 — historical FX metadata, decimal quotes, consistent report icons.
   Does NOT modify original amounts, sides, balances, or old vouchers. */
(function(){
'use strict';
if(window.RatibFx105)return;
const el=id=>document.getElementById(id);
function parseRate(raw){
 let v=String(raw??'').trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/٫/g,'.').replace(/٬/g,',').replace(/[\s\u200e\u200f\u00a0]/g,'');
 if(!v)return NaN;
 if(v.includes(',')&&v.includes('.')){
   if(v.lastIndexOf('.')>v.lastIndexOf(',')){if(!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))return NaN;v=v.replace(/,/g,'');}
   else {if(!/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v))return NaN;v=v.replace(/\./g,'').replace(',','.');}
 }else if(v.includes(',')){
   if(/^[1-9]\d{0,2},\d{3}$/.test(v))return NaN; // ambiguous: use a dot or Arabic decimal mark
   if((v.match(/,/g)||[]).length>1){if(!/^\d{1,3}(,\d{3})+$/.test(v))return NaN;v=v.replace(/,/g,'');}
   else v=v.replace(',','.');
 }
 if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v))return NaN;
 const n=Number(v);return Number.isFinite(n)&&n>0&&n<=1e9?n:NaN;
}
const byDate=(a,b)=>String(a||'')===String(b||'');
function historicalSuggestion(date,code){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||code==='YER')return null;
 const rows=getAllTransactions().filter(t=>t&&t.status==='posted'&&byDate(t.isoDate||t.date,date)).reverse();
 for(const t of rows){
  const quotes=t.multiVoucher?.ratibFxRates||t.ratibFxRates;
  const q=quotes?.[code];if(q&&Number(q.rate)>0&&q.base==='YER')return {rate:Number(q.rate),source:q.source||'سند سابق بنفس التاريخ',kind:'saved'};
 }
 const list=store.get('trial_fx_report_rates_v1',[]);
 if(Array.isArray(list)){
  const q=list.find(q=>q&&q.date===date&&q.from===code&&q.target==='YER'&&Number(q.rate)>0&&q.source);
  if(q)return {rate:Number(q.rate),source:'مراجعة سعر تقرير سابق بتاريخ '+date+': '+q.source,kind:'suggestion'};
 }
 return null;
}
const panels={simple:null,multi:null},draft={simple:{},multi:{}},lastApplied={};
const dateOf=kind=>el(kind==='simple'?'voucherDateInput':'multiVoucherDate')?.value||'';
function codes(kind){
 if(kind==='simple')return [el('voucherCurrencySelect')?.value||'YER'].filter(c=>c!=='YER');
 const set=new Set(),base=el('multiVoucherBaseCurrency')?.value||'YER';
 if(base!=='YER')set.add(base);
 document.querySelectorAll('#multiVoucherLinesBody .multi-line-currency').forEach(e=>{if(e.value&&e.value!=='YER')set.add(e.value);});
 return Array.from(set);
}
function current(kind,code,date){
 const key=date+':'+code;
 if(!draft[kind][key]){
  let q=null;
  if(kind==='multi'){
   const id=typeof multiVoucherDraftId!=='undefined'?multiVoucherDraftId:'';
   if(id){const t=getAllTransactions().find(t=>t.multiVoucherId===id||t.id===id);q=t?.multiVoucher?.ratibFxRates?.[code]||null;}
  }
  if(!q)q=historicalSuggestion(date,code);
  draft[kind][key]={rate:q?String(q.rate):'',source:String(q?.source||''),kind:q?.kind||'manual'};
 }
 return draft[kind][key];
}
function rateFor(kind,code,strict){
 const date=dateOf(kind),obj=current(kind,code,date),rate=parseRate(obj.rate),source=obj.source.trim();
 if(strict&&(!Number.isFinite(rate)||!source))throw Error('أدخل سعرًا موجبًا ومصدره لعملة '+code+' بتاريخ السند؛ مثال 412.50 أو 412٫50.');
 return Number.isFinite(rate)&&source?{rate,source,date,base:'YER',approvedAt:new Date().toISOString()}:null;
}
function quotes(kind,strict){const out={};for(const code of codes(kind)){const q=rateFor(kind,code,strict);if(q)out[code]=q;}return out;}
function syncLines(code,rate){
 if((el('multiVoucherBaseCurrency')?.value||'YER')!=='YER'||typeof multiVoucherLines==='undefined')return;
 const n=parseRate(rate);if(!Number.isFinite(n))return;
 const previous=lastApplied[code];
 let changed=false;
 for(const line of multiVoucherLines){
  if(!line||line.autoBalance||line.currency!==code)continue;
  const old=String(line.rate??'').trim();
  if(old===''||old==='1'||old===String(previous)){
   line.rate=String(n);changed=true;
  }
 }
 lastApplied[code]=n;
 if(changed&&typeof renderMultiVoucherLines==='function'){
  renderMultiVoucherLines();
  if(typeof syncMultiAutoBalance==='function')syncMultiAutoBalance();
 }
}
function draw(kind){
 const panel=panels[kind];if(!panel)return;
 const date=dateOf(kind),codesNow=codes(kind).sort();
 panel.hidden=!codesNow.length;
 const key=date+'|'+codesNow.join(',');
 if(panel.dataset.key===key)return;
 panel.dataset.key=key;panel.replaceChildren();if(!codesNow.length)return;
 const h=document.createElement('strong');h.textContent='أسعار العملات عند إنشاء السند';panel.append(h);
 const note=document.createElement('p');note.className='ratib-fx-hint';
 note.textContent='سعر كل عملة مقابل الريال اليمني؛ يثبت مع السند. السعر المستدعى من مستند آخر أو تقرير سابق يُراجع قبل الحفظ.';panel.append(note);
 for(const code of codesNow){
  const item=current(kind,code,date),row=document.createElement('div');row.className='ratib-fx-row';
  const label=document.createElement('b');label.textContent='1 '+code+' =';
  const rateBox=document.createElement('label');rateBox.textContent='السعر باليمني';
  const rate=document.createElement('input');rate.type='text';rate.inputMode='decimal';rate.autocomplete='off';rate.dir='ltr';rate.placeholder='مثل 412.50';rate.value=item.rate;
  const sourceBox=document.createElement('label');sourceBox.textContent='مصدر السعر';
  const source=document.createElement('input');source.type='text';source.value=item.source;source.maxLength=240;source.placeholder='مرجع السعر بتاريخ السند';
  rate.addEventListener('input',()=>{item.rate=rate.value;if(kind==='multi')syncLines(code,rate.value);});
  source.addEventListener('input',()=>{item.source=source.value;});
  rateBox.append(rate);sourceBox.append(source);row.append(label,rateBox,sourceBox);panel.append(row);
  if(kind==='multi'&&item.rate)syncLines(code,item.rate);
 }
}
function setup(){
 const simple=el('voucherCurrencySelect');
 if(simple&&!panels.simple){
  const panel=document.createElement('section');panel.id='ratibFxSimple';panel.className='ratib-fx-panel';panel.hidden=true;
  simple.closest('div[style]')?.parentElement?.insertAdjacentElement('afterend',panel);
  panels.simple=panel;
  ['voucherCurrencySelect','voucherDateInput'].forEach(id=>el(id)?.addEventListener('change',()=>draw('simple')));
  draw('simple');
 }
 const table=el('multiVoucherLinesBody')?.closest('table');
 if(table&&!panels.multi){
  const panel=document.createElement('section');panel.id='ratibFxMulti';panel.className='ratib-fx-panel';panel.hidden=true;
  table.closest('.multi-voucher-table-wrap')?.insertAdjacentElement('beforebegin',panel);panels.multi=panel;
  ['multiVoucherDate','multiVoucherBaseCurrency'].forEach(id=>el(id)?.addEventListener('change',()=>draw('multi')));
  const tbody=el('multiVoucherLinesBody');
  tbody?.addEventListener('change',()=>draw('multi'));
  new MutationObserver(()=>draw('multi')).observe(tbody,{childList:true});
  draw('multi');
 }
}
function accounting(){
 if(typeof window.buildSimpleVoucherData==='function'){
  const previous=window.buildSimpleVoucherData;
  window.buildSimpleVoucherData=function(status){
   const fx=quotes('simple',status==='posted');
   const data=previous.apply(this,arguments);
   if(Object.keys(fx).length)data.ratibFxRates=fx;
   return data;
  };
 }
 if(typeof window.validateMultiVoucher==='function'){
  const previous=window.validateMultiVoucher;
  window.validateMultiVoucher=function(){
   const error=previous.apply(this,arguments);if(error)return error;
   try{quotes('multi',true);return '';}catch(e){return e.message;}
  };
 }
 if(typeof window.buildMultiVoucherData==='function'){
  const previous=window.buildMultiVoucherData;
  window.buildMultiVoucherData=function(status){
   const fx=quotes('multi',status==='posted');
   const data=previous.apply(this,arguments);
   if(Object.keys(fx).length)data.ratibFxRates=fx;
   return data;
  };
 }
 if(typeof window.trialSavedFxEvidence==='function'){
  const previous=window.trialSavedFxEvidence;
  window.trialSavedFxEvidence=function(leg,target){
   const old=previous.apply(this,arguments);
   if(old&&old.rate!==null&&old.rate!==undefined)return old;
   if(target!=='YER'||/تعارض|مختلفة/.test(String(old?.reason||'')))return old;
   const code=String(leg?.baseCurrency||'');
   const q=(leg?.tx?.multiVoucher?.ratibFxRates||leg?.tx?.ratibFxRates)?.[code];
   if(q&&q.base==='YER'&&Number.isFinite(Number(q.rate))&&Number(q.rate)>0&&String(q.source||'').trim())
     return {rate:Number(q.rate),source:'سعر الصرف المحفوظ مع السند: '+q.source};
   return old;
  };
 }
 if(typeof window.multiLineRate==='function'){
  const previous=window.multiLineRate;
  window.multiLineRate=function(line,base){
   if(line?.currency===base)return 1;
   const n=parseRate(line?.rate);return Number.isFinite(n)?n:previous.apply(this,arguments);
  };
 }
 if(typeof window.currencyReferenceNumber==='function'){
  window.currencyReferenceNumber=function(raw){return parseRate(raw);};
 }
 if(typeof window.trialFxOpenPanel==='function'){
  const previous=window.trialFxOpenPanel;
  window.trialFxOpenPanel=function(){
   const result=previous.apply(this,arguments);
   document.querySelectorAll('input[id^="trialFxRate"]').forEach(i=>{i.type='text';i.inputMode='decimal';i.dir='ltr';});
   return result;
  };
 }
 if(typeof window.trialFxCollectInputs==='function'){
  const previous=window.trialFxCollectInputs;
  window.trialFxCollectInputs=function(){
   document.querySelectorAll('input[id^="trialFxRate"]').forEach(i=>{const n=parseRate(i.value);if(Number.isFinite(n))i.value=String(n);});
   return previous.apply(this,arguments);
  };
 }
 // Rate inputs only; amount inputs retain existing accounting behavior.
 document.addEventListener('blur',event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||!input.matches('.multi-line-rate,[data-reference-currency],#spendFxRate,[id^="trialFxRate"]'))return;
  const n=parseRate(input.value);
  if(Number.isFinite(n)&&input.value!==String(n)){
   input.value=String(n);input.dispatchEvent(new Event('input',{bubbles:true}));
  }
 },true);
}
function icons(){
 const items=[
  ['reportsGroupBudgetHeader','بنود الميزانية','<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
  ['reportsGroupMovementHeader','حركة الحسابات','<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-7"/>'],
  ['reportsGroupPositionHeader','المركز المالي','<path d="m3 10 9-7 9 7"/><path d="M4 10h16M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18"/>'],
  ['reportsGroupTrialHeader','ميزان المراجعة','<path d="M12 3v18M3 7h18M7 7l-4 7h8l-4-7M17 7l-4 7h8l-4-7M8 21h8"/>']
 ];
 for(const [id,title,paths] of items){
  const e=el(id);if(!e||e.closest('#ratibReportMenu'))continue;
  e.classList.add('ratib-report-icon-heading');
  e.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg><span>'+title+'</span>';
 }
}
function styles(){
 const e=document.createElement('style');e.id='ratibFx105Css';
 e.textContent='.ratib-fx-panel{border:1px solid var(--border,#ccd5dc);border-radius:10px;padding:10px;margin:8px 0 12px;min-width:0}.ratib-fx-panel[hidden]{display:none!important}.ratib-fx-panel>strong{font-size:.95rem}.ratib-fx-hint{font-size:.78rem;color:var(--muted,#666);margin:5px 0 8px}.ratib-fx-row{display:grid;grid-template-columns:auto minmax(110px,1fr) minmax(130px,1.5fr);gap:8px;align-items:end;margin:7px 0}.ratib-fx-row b{padding-bottom:10px}.ratib-fx-row label{min-width:0;font-size:.77rem;display:flex;flex-direction:column;gap:4px}.ratib-fx-row input{box-sizing:border-box;max-width:100%;width:100%;min-width:0;font-size:16px}.ratib-report-icon-heading{display:flex!important;align-items:center;gap:9px!important;min-height:40px}.ratib-report-icon-heading svg{width:18px!important;height:18px!important;min-width:18px;flex:none;stroke:currentColor}@media(max-width:560px){.ratib-fx-row{grid-template-columns:1fr 1fr}.ratib-fx-row b{grid-column:1/-1;padding:0}.ratib-report-icon-heading svg{width:17px!important;height:17px!important;min-width:17px}}';
 document.head.append(e);
}
window.RatibFx105={parseRate,version:'3.6.105'};
styles();accounting();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setup();icons();});else{setup();icons();}
})();