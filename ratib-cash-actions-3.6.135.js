/* Ratib 3.6.135: keep original icon handlers and financial posting. */
(function(){
'use strict';
function init(){
 const card=document.getElementById('multiVoucherCard');
 const host=card?.querySelector('.multi-voucher-actions');
 const save=document.getElementById('commitMultiVoucherBtn');
 if(!card||!host||!save||host.dataset.cashActions135==='1')return;
 host.dataset.cashActions135='1';
 const isCash=()=>card.classList.contains('spend-voucher');
 const markTools=()=>{
  for(const [id,name] of Object.entries({
   ratibMultiVoucherPreviewBtn:'معاينة',ratibMultiVoucherShareBtn:'مشاركة',
   printMultiVoucherBtn:'طباعة',saveMultiDraftBtn:'حفظ'
  })){const btn=document.getElementById(id);if(btn&&btn.dataset.ratibShort!==name)btn.dataset.ratibShort=name;}
 };
 const more=document.createElement('div');more.id='ratibCashMore';more.className='ratib-cash-more no-print';
 const toggle=document.createElement('button');toggle.type='button';toggle.id='ratibCashMoreToggle';
 toggle.setAttribute('aria-controls','ratibCashMoreList');toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-label','المزيد من أدوات السند');
 toggle.innerHTML='<span class="ratib-cash-more-glyph" aria-hidden="true">⋯</span><span class="ratib-cash-more-caption">المزيد</span>';
 const menu=document.createElement('div');menu.id='ratibCashMoreList';menu.hidden=true;menu.setAttribute('role','menu');
 function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');}
 for(const [id,name] of [['ratibMultiVoucherA4Btn','A4 / اتجاه الصفحة'],
  ['pdfMultiVoucherBtn','تنزيل PDF'],['loadMultiDraftBtn','فتح آخر مسودة']]){
  const item=document.createElement('button');item.type='button';item.textContent=name;item.setAttribute('role','menuitem');
  item.addEventListener('click',()=>{closeMenu();const original=document.getElementById(id);if(original&&!original.disabled)original.click();});
  menu.appendChild(item);
 }
 more.append(toggle,menu);host.appendChild(more);
 toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));});
 document.addEventListener('click',e=>{if(!more.contains(e.target))closeMenu();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 function sync(){
  markTools();
  if(!isCash()){closeMenu();return;}
  if(save.textContent.trim()!=='حفظ وخروج')save.textContent='حفظ وخروج';
  save.title='حفظ السند والخروج بعد نجاح الحفظ';
  if(save.getAttribute('aria-label')!=='حفظ وخروج')save.setAttribute('aria-label','حفظ وخروج');
 }
 new MutationObserver(sync).observe(save,{childList:true,characterData:true,subtree:true});
 new MutationObserver(sync).observe(card,{attributes:true,attributeFilter:['class']});
 save.addEventListener('click',async e=>{
  if(!isCash())return;
  e.preventDefault();e.stopImmediatePropagation();
  if(save.disabled)return;
  save.disabled=true;
  try{
   // Only an existing posted voucher carries a return-to-list context.
   // New vouchers and drafts keep their original Save-and-Exit behavior.
   const posted=typeof getAllTransactions==='function'&&typeof multiVoucherDraftId!=='undefined'&&multiVoucherDraftId
    &&getAllTransactions().some(t=>t.id===multiVoucherDraftId||t.multiVoucherId===multiVoucherDraftId);
   const sourceTab=posted&&typeof multiVoucherReturnTab==='string'?multiVoucherReturnTab:null;
   const sourceScroll=posted&&typeof multiVoucherReturnScrollY==='number'?multiVoucherReturnScrollY:0;
   await commitMultiVoucher(()=>{
    if(typeof hasUnsavedChanges!=='undefined')hasUnsavedChanges=false;
    if(typeof restoreQuickVoucherOriginAfterSave==='function'&&restoreQuickVoucherOriginAfterSave())return;
    if(sourceTab&&sourceTab!=='pageDashboard'&&sourceTab!=='pageExpenses'&&typeof navigateToTab==='function'){
     // Do not use generic Back: Android popstate can send an edited document to Home.
     navigateToTab(sourceTab,false);
     if(sourceTab==='pageLedger'&&Number.isFinite(sourceScroll)&&typeof requestAnimationFrame==='function')
      requestAnimationFrame(()=>window.scrollTo({top:sourceScroll,behavior:'instant'}));
     return;
    }
    if(typeof backToVoucherSelector==='function')backToVoucherSelector();
   });
  }catch(error){
   console.error('Ratib save and exit',error);
   if(typeof showToast==='function')showToast('لم يكتمل الحفظ؛ بقي السند مفتوحًا','error');
  }finally{save.disabled=false;}
 },true);
 sync();requestAnimationFrame(markTools);
 window.RatibCashActions135={refresh:sync};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();