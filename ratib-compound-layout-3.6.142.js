/* Ratib official 3.6.142 — compound voucher presentation only.
 * Retain original ledger controls, data bindings, save, preview and print handlers.
 * The .spend-voucher cash editor is never restyled or re-wired. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const card=byId('multiVoucherCard');
if(!card)return;
const isCompound=()=>!card.classList.contains('spend-voucher');
const header=card.querySelector(':scope > h2');
const grid=card.querySelector(':scope > .multi-voucher-grid');
const body=byId('multiVoucherLinesBody');
const actions=card.querySelector('.multi-voucher-actions');
if(!header||!grid||!body||!actions)return;

function makeButton(text,kind,click){
  const b=document.createElement('button');
  b.type='button';b.textContent=text;b.className='ratib-cmp-action '+kind;
  b.addEventListener('click',click);
  return b;
}
function clickOriginal(id){
  const original=byId(id);
  if(original&&!original.disabled)original.click();
  else if(typeof window.showToast==='function')window.showToast('هذه الأداة غير متاحة حاليًا','warn');
}
function addCompoundAccount(){
  // The shared button has both a legacy onclick and an addEventListener; a
  // synthetic click could add the same account twice. Invoke the original
  // compound add function once without bypassing the accounting model.
  if(typeof addMultiVoucherLine==='function')addMultiVoucherLine();
  else clickOriginal('addMultiVoucherLineBtn');
}
let seedingSecondParty=false;
function ensureSecondParty(){
  if(seedingSecondParty||card.dataset.ratibCmpSeeded==='1'||!isCompound()||card.classList.contains('hidden'))return;
  // Only brand-new, entirely blank documents receive the two-party starting
  // template. Never append to posted documents, drafts, or an edited form.
  if(typeof multiVoucherLines==='undefined'||!Array.isArray(multiVoucherLines)
      ||multiVoucherLines.length!==1)return;
  if(typeof multiVoucherDraftId!=='undefined'&&multiVoucherDraftId)return;
  const first=multiVoucherLines[0];
  if(!first||first.autoBalance||first.account||String(first.amount??'').trim())return;
  seedingSecondParty=true;
  try{
    addCompoundAccount();
    if(multiVoucherLines.length===2){
      card.dataset.ratibCmpSeeded='1';
      multiVoucherLines[1].side='credit';
      if(typeof renderMultiVoucherLines==='function')renderMultiVoucherLines();
    }
  }finally{seedingSecondParty=false;}
}
function initToolbar(){
  if(byId('ratibCompoundToolbar142'))return;
  const host=document.createElement('div');
  host.id='ratibCompoundToolbar142';
  host.className='ratib-compound-toolbar142 no-print';
  const primary=document.createElement('div');primary.className='ratib-cmp-primary';
  primary.append(
    makeButton('＋ إضافة طرف','add',addCompoundAccount),
    makeButton('✓ اعتماد وحفظ','commit',()=>clickOriginal('commitMultiVoucherBtn')),
    makeButton('إلغاء','cancel',()=>{
      const original=[...actions.children].find(x=>x.matches('button.btn-danger'));
      if(original&&!original.disabled)original.click();
    })
  );
  const secondary=document.createElement('div');secondary.className='ratib-cmp-secondary';
  secondary.append(
    makeButton('◉ عرض','view',()=>clickOriginal('ratibMultiVoucherPreviewBtn')),
    makeButton('↗ مشاركة','share',()=>clickOriginal('ratibMultiVoucherShareBtn'))
  );
  const more=makeButton('⋯ المزيد','more',()=>{
    const panel=byId('ratibCompoundMore142');
    panel.hidden=!panel.hidden;
    more.setAttribute('aria-expanded',String(!panel.hidden));
  });
  more.id='ratibCompoundMoreBtn142';
  more.setAttribute('aria-controls','ratibCompoundMore142');
  more.setAttribute('aria-expanded','false');
  secondary.append(more);
  const popup=document.createElement('div');
  popup.id='ratibCompoundMore142';popup.className='ratib-cmp-more-panel';popup.hidden=true;
  const advanced=makeButton('إعدادات السند والبيان العام','detail',()=>{
    const active=card.classList.toggle('ratib-cmp-show-extras');
    advanced.setAttribute('aria-expanded',String(active));
  });
  advanced.setAttribute('aria-expanded','false');
  popup.append(advanced);
  for(const [id,label] of [
    ['saveMultiDraftBtn','حفظ مسودة'],
    ['loadMultiDraftBtn','فتح آخر مسودة'],
    ['printMultiVoucherBtn','طباعة'],
    ['pdfMultiVoucherBtn','تنزيل PDF'],
    ['ratibMultiVoucherA4Btn','حجم الورق A4']
  ])popup.append(makeButton(label,'extra',()=>clickOriginal(id)));
  host.append(primary,secondary,popup);
  actions.after(host);
}
function initMeta(){
  if(byId('ratibCompoundMeta142'))return;
  const strip=document.createElement('div');
  strip.id='ratibCompoundMeta142';
  strip.className='ratib-compound-meta142';
  const number=document.createElement('div');
  number.className='ratib-cmp-number';
  const numberInput=document.createElement('input');
  numberInput.id='ratibCompoundNumber142';
  numberInput.type='text';numberInput.readOnly=true;numberInput.tabIndex=-1;
  numberInput.placeholder='رقم المستند';numberInput.setAttribute('aria-label','رقم المستند');
  number.append(numberInput);
  const dateBox=document.createElement('div');
  dateBox.id='ratibCompoundDate142';
  dateBox.className='ratib-cmp-date';
  strip.append(number,dateBox);
  header.after(strip);
  const badge=byId('multiVoucherSeqBadge');
  const updateNumber=()=>{
    const raw=badge?.dataset.journalSeq||badge?.textContent||'';
    const match=String(raw).match(/[0-9٠-٩]+/);
    numberInput.value=match?match[0]:'';
  };
  updateNumber();
  if(badge)new MutationObserver(updateNumber).observe(badge,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-journal-seq']});
}
function setCellCaption(cell,title){
  if(!cell)return;
  const input=cell.querySelector('input');
  const select=cell.querySelector('select');
  const control=input||select;
  if(control){
    control.setAttribute('aria-label',title);
    if(input&&!input.readOnly&&!input.placeholder)input.placeholder=title;
    if(select&&select.classList.contains('multi-line-account')){
      const blank=select.querySelector('option[value=""]');
      if(blank&&blank.textContent!==title)blank.textContent=title;
    }
  }
}
function syncLine(row,i){
  const tds=row.querySelectorAll(':scope > td');
  if(tds.length<10)return;
  row.classList.toggle('ratib-cmp-first',i===0);
  row.classList.toggle('ratib-cmp-counter',i>0);
  row.dataset.ratibCmpTitle=i===0?'الطرف الأول':i===1?'الطرف الآخر':'حساب إضافي '+i;
  const selected=tds[4].querySelector('.multi-line-currency')?.value;
  const base=byId('multiVoucherBaseCurrency')?.value;
  const foreign=!!selected&&!!base&&selected!==base;
  row.classList.toggle('ratib-cmp-foreign',foreign);
  const captions=['مدين / دائن','اسم الحساب','بند الميزانية','البيان','نوع العملة','المبلغ','سعر الصرف','المعادل','ملاحظات','حذف الحساب'];
  tds.forEach((cell,j)=>{if(j<captions.length){
    cell.dataset.ratibCmpField=captions[j];
    setCellCaption(cell,captions[j]);
  }});
  if(!row.querySelector('.ratib-cmp-rate-source')){
    const extra=document.createElement('td');
    extra.className='ratib-cmp-rate-source';
    const input=document.createElement('input');
    input.type='text';input.maxLength=120;input.placeholder='مرجع السعر';
    input.className='ratib-cmp-rate-source-input';
    input.setAttribute('aria-label','مرجع سعر الصرف');
    extra.append(input);row.append(extra);
    input.addEventListener('input',()=>{
      try{
        if(typeof multiVoucherLines!=='undefined'){
          const line=multiVoucherLines[Number(row.querySelector('[data-index]')?.dataset.index)];
          if(line){line.rateReference=input.value;if(typeof hasUnsavedChanges!=='undefined')hasUnsavedChanges=true;}
        }
      }catch(e){console.error('Rate reference update',e);}
    });
  }
  const source=row.querySelector('.ratib-cmp-rate-source-input');
  if(source){
    let saved='';
    try{
      if(typeof multiVoucherLines!=='undefined'){
        const line=multiVoucherLines[Number(row.querySelector('[data-index]')?.dataset.index)];
        saved=String(line?.rateReference||'');
      }
    }catch(_){}
    if(source.value!==saved&&document.activeElement!==source)source.value=saved;
  }
  const operation=tds[9],notes=tds[8];
  if(operation&&!operation.querySelector('.ratib-cmp-notes-toggle')){
    const toggle=makeButton('ملاحظات','ratib-cmp-notes-toggle',()=>{
      row.classList.toggle('ratib-cmp-notes-open');
      toggle.setAttribute('aria-expanded',String(row.classList.contains('ratib-cmp-notes-open')));
    });
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','إظهار ملاحظات البند');
    operation.prepend(toggle);
  }
  if(notes?.querySelector('input')?.value)row.classList.add('ratib-cmp-notes-open');
}
function updateLines(){
  if(!isCompound())return;
  [...body.querySelectorAll(':scope > tr')].forEach(syncLine);
}
let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;refresh();});
}
function refresh(){
  const meta=byId('ratibCompoundMeta142');
  if(!isCompound()||card.classList.contains('hidden')){
    if(card.classList.contains('ratib-cmp-layout142'))card.classList.remove('ratib-cmp-layout142');
    if(card.classList.contains('ratib-cmp-show-extras'))card.classList.remove('ratib-cmp-show-extras');
    if(meta)meta.hidden=true;
    delete card.dataset.ratibCmpSeeded;
    byId('ratibCompoundMore142')?.setAttribute('hidden','');
    return;
  }
  initMeta();initToolbar();
  if(!card.classList.contains('ratib-cmp-layout142'))card.classList.add('ratib-cmp-layout142');
  const text=header.querySelector(':scope > span:first-child');
  if(text&&text.textContent.trim()!=='سند قيد مركب')text.textContent='سند قيد مركب';
  const back=header.querySelector(':scope > button');
  if(back&&back.dataset.ratibCmpBack!=='1'){
    back.textContent='←';back.title='الرجوع إلى الشاشة السابقة';
    back.setAttribute('aria-label','الرجوع إلى الشاشة السابقة');
    back.dataset.ratibCmpBack='1';
  }
  const date=byId('multiVoucherDate')?.closest('label');
  const dateBox=byId('ratibCompoundDate142');
  if(date&&dateBox&&date.parentElement!==dateBox)dateBox.append(date);
  const strip=byId('ratibCompoundMeta142');if(strip)strip.hidden=false;
  ensureSecondParty();
  updateLines();
}
function init(){
  initMeta();initToolbar();refresh();
  new MutationObserver(schedule).observe(card,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(body,{childList:true});
  // Restore the date if the older journal arranger moves it back into h2.
  new MutationObserver(schedule).observe(header,{childList:true});
  grid.addEventListener('change',schedule);
  body.addEventListener('change',schedule);
  body.addEventListener('input',event=>{
    if(event.target.classList.contains('multi-line-notes'))schedule();
  });
  window.addEventListener('pageshow',schedule);
  document.getElementById('voucherSelectorCard')?.addEventListener('click',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
}());