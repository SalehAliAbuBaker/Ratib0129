/* Ratib official 3.6.123 — amount in words belongs directly below the cash voucher's
   TOP amount field, not below the beneficiary or inside an editable field. Display-only:
   preserve the existing #spendTafqit node, its text and all input event listeners. */
(function(){
  'use strict';
  function positionAmountWords(){
    const card=document.getElementById('multiVoucherCard');
    const money=card?.querySelector('.multi-voucher-grid > #ratibHeaderMoney');
    const amountRow=money?.querySelector(':scope > .ratib-money-row');
    const words=card?.querySelector('#spendTafqit');
    if(!card||!money||!amountRow||!words)return;
    // Keep the original tafqit as a full-width caption within the amount cell.
    // The row will grow naturally; the caption never floats over other fields.
    if(words.parentElement!==money||words.previousElementSibling!==amountRow){
      amountRow.insertAdjacentElement('afterend',words);
    }
  }
  function init(){
    const card=document.getElementById('multiVoucherCard');
    if(!card)return;
    let pending=false;
    function schedule(){
      if(pending)return;
      pending=true;
      queueMicrotask(()=>{pending=false;positionAmountWords();});
    }
    // Other voucher setup wrappers may reparent tafqit or recreate the top-amount box.
    // Only react to those structural changes, not typing or text-value changes.
    new MutationObserver(records=>{
      if(records.some(record=>Array.from(record.addedNodes).some(node=>node.nodeType===1&&
        (node.id==='spendTafqit'||node.id==='ratibHeaderMoney'||
         !!node.querySelector?.('#spendTafqit,#ratibHeaderMoney')))))schedule();
    }).observe(card,{childList:true,subtree:true});
    window.addEventListener('pageshow',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();