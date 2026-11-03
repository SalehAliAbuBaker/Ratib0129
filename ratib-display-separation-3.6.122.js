/* Ratib official 3.6.122: presentation-only positioning for amount words in cash vouchers.
   The existing DOM node, its text and all financial input handlers remain untouched. */
(function(){
  'use strict';
  function placeAmountWords(){
    const card=document.getElementById('multiVoucherCard');
    const grid=card?.querySelector('.multi-voucher-grid');
    const words=card?.querySelector('#spendTafqit');
    if(!card||!grid||!words)return;
    // Give the tafqit a separate natural-flow row immediately after the header fields.
    // This prevents text from painting over the beneficiary input in narrow viewports.
    if(words.parentElement!==card||words.previousElementSibling!==grid){
      grid.insertAdjacentElement('afterend',words);
    }
  }
  function init(){
    const card=document.getElementById('multiVoucherCard');
    if(!card)return;
    let queued=false;
    const schedule=()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;placeAmountWords();});
    };
    // The existing setup creates and first moves this node after DOMContentLoaded.
    // Reposition it only when the voucher-header structure changes.
    const grid=card.querySelector('.multi-voucher-grid');
    if(grid)new MutationObserver(records=>{
      if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&
          (n.id==='spendTafqit'||n.id==='ratibHeaderMoney'||n.querySelector?.('#spendTafqit')))))schedule();
    }).observe(grid,{childList:true,subtree:true});
    window.addEventListener('pageshow',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();