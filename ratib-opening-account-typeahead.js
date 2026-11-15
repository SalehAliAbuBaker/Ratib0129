/* Ratib — opening vouchers share the live leaf-account selector used by cash vouchers.
   Presentation-only: accounting, validation, saved voucher data and print routes stay intact. */
(function(){
 'use strict';
 if(typeof SearchableSelect!=='function'||typeof renderImportedOpeningRows!=='function')return;
 const previousRender=renderImportedOpeningRows;
 const previousClose=closeImportedOpeningVoucher;
 let selectors=[];
 // The global voice button normally lives under <body>. While the opening editor
 // is modal, body siblings are inert, so the microphone must join the modal.
 function scopeVoiceButton(modal,inside){
  const mic=document.getElementById('ratibVoiceButton');
  if(!mic||!modal)return;
  if(inside){if(!modal.contains(mic))modal.append(mic);}
  else if(modal.contains(mic))document.body.append(mic);
 }


 function dispose(){
  for(const item of selectors){
   try{item.selector.destroy();}catch(error){console.warn('Opening account selector cleanup',error);}
  }
  selectors=[];
 }
 function accounts(){
  // Include newly persisted leaf accounts even if the cached voucher search
  // index has not yet been rebuilt. Do not create or infer any ledger account.
  const items=getMultiAccountItems().filter(item=>item&&item.id&&item.id!=='ALL'&&item.accountId);
  if(typeof getCanonicalCatalog!=='function')return items;
  const known=new Set(items.map(item=>String(item.id)+'|'+String(item.accountId)));
  for(const group of getCanonicalCatalog()||[]){
   for(const detail of group.details||[]){
    if(!Array.isArray(detail)||!detail[0]||!detail[1])continue;
    const code=String(detail[0]),name=String(detail[1]),key=name+'|'+code;
    if(known.has(key))continue;
    items.push({id:name,text:name,accountId:code});
    known.add(key);
   }
  }
  return items;
 }
 function installRow(tr,index,items,modal,state){
  const input=tr.querySelector('input[data-field="account"]');
  const draft=state.rows[index]?.openingBalance;
  if(!input||!draft)return;
  const td=input.closest('td');
  if(!td)return;
  const suffix=String(index),wrap=document.createElement('div'),arrow=document.createElement('span'),
        drop=document.createElement('div'),hidden=document.createElement('input');
  wrap.id='openingAccountWrap_'+suffix;
  wrap.className='searchable-select-wrap voucher-account-search opening-account-wrap';
  input.id='openingAccountInput_'+suffix;
  input.classList.add('searchable-input');
  input.removeAttribute('list');
  input.setAttribute('autocomplete','off');
  input.setAttribute('inputmode','text');
  input.setAttribute('enterkeyhint','done');
  input.placeholder='ابحث باسم الحساب أو رقمه';
  input.setAttribute('aria-label','ابحث باسم الحساب أو رقمه في البند '+(index+1));
  arrow.className='searchable-arrow';
  arrow.textContent='▼';
  drop.id='openingAccountDrop_'+suffix;
  drop.className='searchable-dropdown opening-account-dropdown';
  hidden.type='hidden';
  hidden.id='openingAccountValue_'+suffix;
  input.before(wrap);
  wrap.append(input,arrow,hidden,drop);
  const selector=new SearchableSelect({
   wrapId:wrap.id,inputId:input.id,dropId:drop.id,hiddenId:hidden.id,isGrouped:true,
   onSelect(item){
    if(importedOpeningEdit!==state||state.busy)return;
    if(draft.account!==item.id||String(draft.accountId||'')!==String(item.accountId||'')){
     draft.account=item.id;
     draft.accountId=String(item.accountId||'');
     state.dirty=true;
    }
   }
  });
  // Keep the fixed-position popup within the modal's interactive surface:
  // a body-level popup would become inert when the modal is activated.
  modal.append(selector.drop);
  selector.onClear=()=>{
   if(importedOpeningEdit!==state||state.busy)return;
   if(draft.account||draft.accountId){
    draft.account='';draft.accountId='';
    state.dirty=true;
   }
  };
  // Escape dismisses suggestions first; a subsequent Escape may close the editor.
  input.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&selector.drop.classList.contains('open')){
    event.preventDefault();event.stopPropagation();selector.close();
   }
  },true);
  selector.setItems(items);
  // A new account can be created while this editor remains open. Refresh its
  // items at the start of each interaction, before the live search runs.
  const refresh=()=>{
   const fresh=accounts(),seen=selector.items||[];
   if(fresh.length!==seen.length||fresh.some(item=>!seen.some(x=>x.id===item.id&&String(x.accountId)===String(item.accountId)))){
    selector.setItems(fresh);
   }
  };
  input.addEventListener('focus',refresh,true);
  input.addEventListener('input',refresh,true);
  if(draft.account){
   const match=items.find(item=>item.id===draft.account&&
     (!draft.accountId||String(item.accountId)===String(draft.accountId)));
   // Historical accounts are preserved as text when no longer in the catalog.
   selector.setValue(draft.account,draft.account,match?.accountId||draft.accountId||'');
  }else selector.setValue('','');
  selectors.push({selector,input,index});
 }
 // A matching label alone is not a committed account in the opening editor.
 // Resolve it against the *current* leaf catalog immediately before validation.
 // Never guess between duplicate labels or modify a historical unknown account.
 function reconcileOpeningAccounts(state){
  const latest=accounts();
  for(const {selector,input,index} of selectors){
   const draft=state.rows[index]?.openingBalance;
   if(!draft||!input.isConnected)continue;
   const visible=String(input.value||'').trim();
   if(!visible)continue;
   const hits=latest.filter(item=>String(item.id)===visible||
     String(item.text||'')===visible||String(item.accountId)===visible);
   if(hits.length!==1)continue;
   const item=hits[0],code=String(item.accountId);
   if(draft.account!==item.id||String(draft.accountId||'')!==code){
    draft.account=item.id;
    draft.accountId=code;
    state.dirty=true;
   }
   if(typeof selector.getValue==='function'&&selector.getValue()!==item.id){
    selector.setValue(item.id,item.text||item.id,code);
   }
  }
 }
 if(typeof buildImportedOpeningVoucher==='function'){
  const previousBuild=buildImportedOpeningVoucher;
  buildImportedOpeningVoucher=function(state,data){
   if(state?.manual&&state===importedOpeningEdit)reconcileOpeningAccounts(state);
   return previousBuild.apply(this,arguments);
  };
 }
 renderImportedOpeningRows=function(){
  dispose();
  const result=previousRender.apply(this,arguments);
  const state=importedOpeningEdit,modal=document.getElementById('importedOpeningVoucherModal');
  if(!state?.manual||!modal){if(modal)scopeVoiceButton(modal,false);return result;}
  scopeVoiceButton(modal,true);
  const rows=[...document.querySelectorAll('#importedOpeningRows > tr')],items=accounts();
  rows.forEach((tr,index)=>{
   // The opening journal stores up to six decimals; the calculator must not
   // silently truncate foreign or locally entered opening balances to two.
   tr.querySelectorAll('input[data-field="debit"],input[data-field="credit"]').forEach(input=>{
    input.dataset.precision='6';
   });
   installRow(tr,index,items,modal,state);
  });
  // Attach the calculator to each new opening amount immediately. Waiting for
  // the global MutationObserver leaves a brief non-interactive period and makes
  // newly added rows depend on asynchronous observer scheduling.
  if(typeof enhanceFinancialFields==='function'){
   enhanceFinancialFields(document.getElementById('importedOpeningRows'));
  }
  return result;
 };
 closeImportedOpeningVoucher=function(){
  const result=previousClose.apply(this,arguments);
  const modal=document.getElementById('importedOpeningVoucherModal');
  if(!importedOpeningEdit||!modal?.classList.contains('show')){
   dispose();
   scopeVoiceButton(modal,false);
  }
  return result;
 };
 window.RatibOpeningAccountTypeahead=Object.freeze({
  size:()=>selectors.length,
  closeAll:()=>selectors.forEach(({selector})=>selector.close())
 });
})();
