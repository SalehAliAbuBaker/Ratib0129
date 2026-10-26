/* Ratib 3.6.83 (trial): rearrange the existing cash-voucher controls,
   preserving nodes, event listeners, field IDs and posting calculations. */
(function () {
  'use strict';
  function arrangeCashVoucher() {
    const card=document.getElementById('multiVoucherCard');
    const grid=card?.querySelector('.multi-voucher-grid');
    const source=grid?.querySelector('.multi-voucher-source-row');
    const amount=grid?.querySelector('#ratibHeaderMoney');
    const side=grid?.querySelector('.ratib-side-choice');
    if (!card||!grid||!source||!amount||!side) return;
    let row=grid.querySelector('.ratib-approved-head-row');
    if (!row) {
      row=document.createElement('div');
      row.className='ratib-approved-head-row spend-only hidden';
      source.before(row);
    }
    if(side.parentElement!==row)row.append(side);
    if(amount.parentElement!==row)row.append(amount);
    const tafqit=card.querySelector('#spendTafqit');
    if(tafqit && tafqit.parentElement!==grid) source.after(tafqit);
    row.classList.toggle('hidden', !card.classList.contains('spend-voucher'));
  }
  function init() {
    arrangeCashVoucher();
    const card=document.getElementById('multiVoucherCard');
    if (!card) return;
    // Switching between cash vouchers and compound entries never duplicates controls.
    new MutationObserver(arrangeCashVoucher)
      .observe(card,{attributes:true,attributeFilter:['class']});
    window.addEventListener('pageshow',arrangeCashVoucher);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}());


/* Official payment form: preserve original controls and posting logic.
   When the credit account is moved under the line toolbar by the shared
   account-order helper, restore it ahead of the optional beneficiary and note. */
(function(){
 'use strict';
 const q=id=>document.getElementById(id);
 const previous=typeof ratibOrderDocumentAccounts==='function'?ratibOrderDocumentAccounts:null;
 function arrangePaymentFields(){
  const card=q('multiVoucherCard'),grid=card?.querySelector(':scope > .multi-voucher-grid');
  const beneficiary=q('multiVoucherBeneficiary')?.closest('label');
  const note=q('multiVoucherNote')?.closest('label');
  const date=q('multiVoucherDate')?.closest('label');
  if(!card||!grid||!beneficiary||!note||!date)return;
  const payment=card.classList.contains('spend-voucher')&&typeof multiVoucherMode!=='undefined'&&multiVoucherMode==='spend';
  if(payment){
   const source=card.querySelector('.multi-voucher-source-row');
   const holder=q('ratibOrderedCreditSource');
   let before=grid;
   if(holder&&holder.contains(source)){
    if(holder.previousElementSibling!==grid)grid.after(holder);
    before=holder;
   }
   if(beneficiary.previousElementSibling!==before)before.after(beneficiary);
   if(note.previousElementSibling!==beneficiary)beneficiary.after(note);
   beneficiary.classList.add('ratib-payment-beneficiary-row');
   if(beneficiary.firstChild?.nodeType===3)beneficiary.firstChild.textContent='إضافة مستفيد (اختياري)';
   const input=q('multiVoucherBeneficiary');
   input.placeholder='اسم المستفيد (اختياري)';
   input.setAttribute('aria-label','إضافة مستفيد اختياري لسند الصرف');
  }else{
   beneficiary.classList.remove('ratib-payment-beneficiary-row');
   if(beneficiary.parentElement!==grid||beneficiary.previousElementSibling!==date)date.after(beneficiary);
   q('multiVoucherBeneficiary').placeholder='اسم المستفيد';
   q('multiVoucherBeneficiary').removeAttribute('aria-label');
  }
 }
 if(previous){
  ratibOrderDocumentAccounts=function(...args){
   const result=previous.apply(this,args);
   arrangePaymentFields();
   return result;
  };
 }
 function init(){
  arrangePaymentFields();
  const card=q('multiVoucherCard');
  if(card&&!card.dataset.ratibPaymentFieldOrder){
   card.dataset.ratibPaymentFieldOrder='1';
   new MutationObserver(()=>queueMicrotask(arrangePaymentFields)).observe(card,{attributes:true,attributeFilter:['class']});
   window.addEventListener('pageshow',arrangePaymentFields);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
