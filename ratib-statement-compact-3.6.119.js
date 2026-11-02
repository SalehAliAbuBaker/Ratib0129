/* Ratib official 3.6.119 — move the existing search, keep listeners and mark state. */
(function(){
 'use strict';
 function init(){
  const page=document.getElementById('pageAccountOperations');
  const panel=document.getElementById('accountOperationsStandalonePanel');
  const search=document.getElementById('ratibAccountMovementSearchBar');
  if(!page||!panel||!search||!page.contains(search))return;
  const input=search.querySelector('#ratibAccountMovementSearchInput');
  if(input){
   input.placeholder='البحث في حركات الحساب';
   input.setAttribute('aria-label','البحث في حركات الحساب');
  }
  search.querySelector('label.ratib-movement-search-label')?.remove();
  let scheduled=false;
  function align(){
   scheduled=false;
   // The statement renderer replaces panel.innerHTML on account/currency refresh.
   // Retain the original search node (and its event listeners), then reattach it.
   const markbar=panel.querySelector(':scope > .ratib-statement-markbar');
   if(markbar){
    if(search.parentElement!==panel||search.previousElementSibling!==markbar)
     markbar.insertAdjacentElement('afterend',search);
   }else if(search.parentElement!==panel||panel.firstElementChild!==search){
    panel.prepend(search);
   }
  }
  function schedule(){
   if(scheduled)return;
   scheduled=true;
   queueMicrotask(align);
  }
  new MutationObserver(schedule).observe(panel,{childList:true});
  window.addEventListener('pageshow',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
