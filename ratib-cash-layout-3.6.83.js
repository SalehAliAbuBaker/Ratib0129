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
