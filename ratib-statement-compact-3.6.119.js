/* Ratib official 3.6.121 — search directly below the selected currency's reconciliation controls.
   Reuse the original search node and listeners; never change ledger amounts or persisted records. */
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
  search.querySelector('.ratib-movement-search-label')?.remove();
  let scheduled=false;
  function activePage(){
   const pages=Array.from(panel.querySelectorAll('.account-currency-page'));
   if(!pages.length)return null;
   let currency='';
   try{currency=typeof accountOpsState==='object'&&accountOpsState?String(accountOpsState.activeCurrency||''):'';}
   catch(_){}
   return pages.find(p=>p.dataset.currency===currency)||pages[0];
  }
  function align(){
   scheduled=false;
   const section=activePage();
   if(!section)return;
   // Reconciliation is inserted dynamically after the account renderer.
   const anchor=section.querySelector(':scope > .ratib-reconcile-bar')
     ||section.querySelector(':scope > .account-operations-head');
   const table=section.querySelector(':scope > .account-statement-table');
   const correct=anchor
     ?search.parentElement===section&&search.previousElementSibling===anchor
     :!!table&&search.parentElement===section&&search.nextElementSibling===table;
   if(correct)return;
   // insertAdjacentElement MOVES the original input, retaining keyboard focus, query and listeners.
   if(anchor)anchor.insertAdjacentElement('afterend',search);
   else if(table)table.insertAdjacentElement('beforebegin',search);
   else section.append(search);
   // The renderer may run while the input is detached. Reapply only visual filtering.
   if(input){
    try{
     if(typeof accountOpsState==='object'&&accountOpsState&&input.value!==String(accountOpsState.movementSearch||''))
      input.value=String(accountOpsState.movementSearch||'');
    }catch(_){}
   }
   try{if(typeof ratibApplyAccountMovementSearch==='function')ratibApplyAccountMovementSearch();}
   catch(err){console.warn('Ratib statement search placement:',err);}
  }
  function schedule(){
   if(scheduled)return;
   scheduled=true;
   queueMicrotask(align);
  }
  // The statement renderer replaces panel.innerHTML. Observe descendants and restore the same node.
  new MutationObserver(schedule).observe(panel,{childList:true,subtree:true});
  document.getElementById('accountCurrencyTabs')?.addEventListener('click',schedule);
  panel.addEventListener('scroll',event=>{
   if(event.target?.classList?.contains('account-currency-track'))schedule();
  },true);
  window.addEventListener('pageshow',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();