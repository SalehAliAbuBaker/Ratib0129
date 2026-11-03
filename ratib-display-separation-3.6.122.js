/* Ratib official 3.6.124 — display-only positioning for cash receipt/payment vouchers.
   Keep the SAME amount-in-words node, its text and all financial input handlers.
   The caption is a full-width grid row under the TOP amount/tools row. */
(function(){
  'use strict';
  function positionAmountWords(){
    const card=document.getElementById('multiVoucherCard');
    const grid=card?.querySelector(':scope > .multi-voucher-grid');
    const money=grid?.querySelector(':scope > #ratibHeaderMoney');
    const words=card?.querySelector('#spendTafqit');
    if(!card||!grid||!money||!words)return;
    if(words.parentElement!==grid||words.previousElementSibling!==money){
      money.insertAdjacentElement('afterend',words);
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
    // Another setup wrapper might reparent the original caption, or create the header.
    // Only respond to structural additions; never react to typing or rewrite any input.
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