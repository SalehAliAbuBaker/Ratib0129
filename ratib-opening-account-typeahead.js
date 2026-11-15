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
  // The cash voucher source includes every detailed account, regardless of tree view.
  return getMultiAccountItems().filter(item=>item&&item.id&&item.id!=='ALL'&&item.accountId);
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
  if(draft.account){
   const match=items.find(item=>item.id===draft.account&&
     (!draft.accountId||String(item.accountId)===String(draft.accountId)));
   // Historical accounts are preserved as text when no longer in the catalog.
   selector.setValue(draft.account,draft.account,match?.accountId||draft.accountId||'');
  }else selector.setValue('','');
  selectors.push({selector,input,index});
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
