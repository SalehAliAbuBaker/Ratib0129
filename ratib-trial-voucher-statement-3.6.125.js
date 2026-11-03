/* Ratib official 3.6.125 — selected presentation behavior ported from trial 3.6.109.13.
 * Move ORIGINAL cash receipt/payment date & document-number labels into the trial header.
 * Do not clone inputs, replace handlers, touch ledger data, or modify posting/PDF logic.
 * Restore their original grid placement for noncash compound entries. */
(function(){
  'use strict';
  function adapt(){
    const card=document.getElementById('multiVoucherCard');
    const grid=card?.querySelector(':scope > .multi-voucher-grid');
    const seq=document.getElementById('spendSeqInput')?.closest('label');
    const date=document.getElementById('multiVoucherDate')?.closest('label');
    if(!card||!grid||!seq||!date)return;
    const cash=card.classList.contains('spend-voucher');
    let header=card.querySelector(':scope > #ratibCashVoucherHeader');
    if(cash){
      if(!header){
        header=document.createElement('div');
        header.id='ratibCashVoucherHeader';
        header.className='ratib-cash-voucher-header no-print';
        grid.before(header);
      }
      if(seq.parentElement!==header)header.append(seq);
      if(date.parentElement!==header)header.append(date);
      if(header.hidden)header.hidden=false;
      seq.classList.remove('hidden');
      const badge=document.getElementById('multiVoucherSeqBadge');
      const number=String(badge?.textContent||'').match(/\d+/)?.[0]||'';
      const numberInput=document.getElementById('spendSeqInput');
      if(numberInput&&number&&numberInput.value!==number)numberInput.value=number;
      numberInput?.setAttribute('aria-label','رقم المستند');
    }else if(header){
      if(seq.parentElement!==grid)grid.prepend(seq);
      if(date.parentElement!==grid)seq.after(date);
      if(!header.hidden)header.hidden=true;
    }
  }
  function init(){
    const card=document.getElementById('multiVoucherCard');
    if(!card)return;
    let scheduled=false;
    function schedule(){
      if(scheduled)return;
      scheduled=true;
      queueMicrotask(()=>{scheduled=false;adapt();});
    }
    // The original form is sometimes rebuilt or switches receipt/payment/compound modes.
    // Observe only structural changes and card class; never use value/input observers.
    new MutationObserver(records=>{
      if(records.some(r=>r.type==='attributes'
           ? r.target===card&&r.attributeName==='class'
           : Array.from(r.addedNodes).some(n=>n.nodeType===1&&(
             n.id==='ratibCashVoucherHeader'||n.id==='spendSeqInput'||
             n.id==='multiVoucherDate'||n.querySelector?.('#spendSeqInput,#multiVoucherDate')
           ))))schedule();
    }).observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('pageshow',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();