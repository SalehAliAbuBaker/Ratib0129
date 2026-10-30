/* Ratib trial 3.6.109.11 — payment-only presentation of the EXISTING voucher controls.
 * No duplicated account/amount fields, ledger writes, or changes to accounting equations.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const card=()=>$('multiVoucherCard');
const active=()=>card()?.classList.contains('spend-voucher')&&typeof multiVoucherMode!=='undefined'&&multiVoucherMode==='spend';
const anchors=new Map();
let layout=null,priceSource=null,updating=false;
function make(cls,tag='div'){const el=document.createElement(tag);el.className=cls;return el;}
function move(el,dest){
 if(!el||!dest)return;
 if(!anchors.has(el)){const mark=document.createComment('Ratib payment layout original location');el.before(mark);anchors.set(el,mark);}
 dest.append(el);
}
function restore(){
 if(!layout)return;
 for(const [el,mark] of [...anchors].reverse())if(mark.parentNode)mark.replaceWith(el);
 anchors.clear();layout.remove();layout=null;
 card()?.classList.remove('ratib-spend-layout-on');
}
function balance(name,preferred){
 if(!name||typeof computeAccountTreeBalanceSummary!=='function')return 'الرصيد الحالي: اختر الحساب';
 try{
  const sums=computeAccountTreeBalanceSummary().get(name),rows=sums?[...sums]:[];
  if(!rows.length)return 'الرصيد الحالي: 0';
  const selected=rows.find(x=>x[0]===preferred)||rows[0];
  const sum=selected[1],net=Number(sum?.debit||0)-Number(sum?.credit||0);
  const n=Math.abs(net).toLocaleString('en-US',{maximumFractionDigits:3});
  return 'الرصيد الحالي: '+n+' '+selected[0]+' ('+(net>0?'مدين':net<0?'دائن':'صفر')+')';
 }catch(error){console.warn('Ratib payment balance preview',error);return 'الرصيد الحالي غير متاح';}
}
function updateBalanceHints(){
 if(!active()||!layout)return;
 const name=typeof multiSourceAcc!=='undefined'?multiSourceAcc?.getValue?.():'';
 const currency=$('multiVoucherBaseCurrency')?.value||'YER';
 const source=$('ratibSpendCreditBalance');
 if(source)source.textContent=balance(name,currency);
 for(const row of $('multiVoucherLinesBody')?.rows||[]){
  const hint=row.querySelector('.ratib-spend-debit-balance'),account=row.querySelector('.multi-line-account');
  const curr=row.querySelector('.multi-line-currency')?.value||currency;
  if(hint&&account)hint.textContent=balance(account.value,curr);
 }
}
function equivalent(){
 const out=$('ratibSpendCreditEquivalent');
 if(!out||!active())return;
 const amount=Number(String($('ratibHeaderAmount')?.value||'').replace(/,/g,''));
 const currency=$('multiVoucherBaseCurrency')?.value||'YER';
 const rate=currency==='YER'?1:Number(String($('ratibHeaderRate')?.value||'').replace(/,/g,''));
 const converted=amount*rate;
 out.textContent=Number.isFinite(converted)&&amount>0&&rate>0
  ?converted.toLocaleString('en-US',{maximumFractionDigits:3}):'—';
 out.title=currency==='YER'?'المعادل بالريال اليمني':'المعادل بالريال اليمني بسعر الصرف المثبت في السند';
}
function newRateSource(){
 const label=make('ratib-spend-rate-source','label');
 priceSource=document.createElement('input');priceSource.type='text';priceSource.id='ratibSpendPriceSource';
 priceSource.maxLength=240;priceSource.placeholder='مصدر السعر أو مرجعه';
 priceSource.setAttribute('aria-label','مصدر سعر الصرف');
 label.append(priceSource);return label;
}
function compose(){
 if(!active()||layout||!$('ratibHeaderAmount')||!$('spendSeqInput')||!$('spendHeaderBudget'))return;
 const c=card(),grid=c.querySelector('.multi-voucher-grid'),source=c.querySelector('.multi-voucher-source-row');
 if(!grid||!source||!$('multiVoucherLinesBody'))return;
 layout=make('ratib-spend-layout');layout.id='ratibSpendLayout';layout.setAttribute('dir','rtl');
 grid.before(layout);c.classList.add('ratib-spend-layout-on');
 function row(id,cls){const e=make('ratib-spend-row '+(cls||''));e.dataset.spendOrder=id;layout.append(e);return e;}
 const r1=row('1','ratib-spend-sequence-date');
 move($('spendSeqInput').closest('label'),r1);move($('multiVoucherDate').closest('label'),r1);
 const r2=row('2','ratib-spend-credit-tools');
 const control=source.querySelector('.ratib-side-choice');move(control,r2);move($('ratibHeaderMoney'),r2);
 const r3=row('3','ratib-spend-credit-account');
 move(source,r3);
 const creditorBalance=make('ratib-spend-balance','small');creditorBalance.id='ratibSpendCreditBalance';r3.append(creditorBalance);
 const r4=row('4','ratib-spend-money-details');
 move($('multiVoucherBaseCurrency').closest('label'),r4);
 const eq=make('ratib-spend-equivalent','label');eq.append(document.createTextNode('المعادل '));
 const output=make('ratib-spend-equivalent-value','output');output.id='ratibSpendCreditEquivalent';output.setAttribute('aria-label','المعادل بعملة السند');
 eq.append(output);r4.append(eq);move($('spendHeaderBudget').closest('label'),r4);
 const r5=row('5','ratib-spend-credit-note');
 move($('multiVoucherNote').closest('label'),r5);$('multiVoucherNote').rows=3;
 const r6=row('6','ratib-spend-beneficiary');
 const beneficiary=$('multiVoucherBeneficiary');
 const beneficiaryLabel=beneficiary?.closest('label');
 if(beneficiaryLabel){
  // Move the original label and input together, without the redundant caption.
  if(beneficiaryLabel.firstChild?.nodeType===3)beneficiaryLabel.firstChild.textContent='';
  move(beneficiaryLabel,r6);
 }
 if(beneficiary){
  beneficiary.required=false;
  beneficiary.placeholder='اسم المستفيد (اختياري)';
  beneficiary.setAttribute('aria-label','اسم المستفيد (اختياري)');
 }
 const r7=row('7–10','ratib-spend-debit-area');
 move(c.querySelector('.multi-voucher-table-wrap'),r7);
 const rate=row('11','ratib-spend-fx');
 const heading=document.createElement('h3');heading.textContent='أسعار العملات عند إنشاء السند';rate.append(heading);
 const rates=make('ratib-spend-fx-fields');rate.append(rates);
 move($('ratibHeaderFx'),rates);
 if($('ratibHeaderRate')){$('ratibHeaderRate').placeholder='السعر باليمني';$('ratibHeaderRate').setAttribute('aria-label','السعر باليمني');}
 rates.append(newRateSource());
 const r12=row('12','ratib-spend-add');
 move(c.querySelector('.spend-lines-toolbar'),r12);
 const quick=row('13','ratib-spend-actions');
 const preview=document.createElement('button');preview.type='button';preview.className='btn btn-ghost';preview.textContent='◉ معاينة';
 preview.onclick=()=>{if(typeof printMultiVoucher==='function')printMultiVoucher();};
 const share=document.createElement('button');share.type='button';share.className='btn btn-ghost';share.textContent='⇪ مشاركة';
 share.onclick=()=>{if(typeof validateMultiVoucher!=='function')return;const error=validateMultiVoucher();if(error){showToast(error,'warn');return;}shareSpendData(buildMultiVoucherData('draft'));};
 const nativeActions=c.querySelector('.multi-voucher-actions');
 for(const id of ['saveMultiDraftBtn','loadMultiDraftBtn'])move($(id),quick);
 quick.append(preview,share);for(const id of ['printMultiVoucherBtn','pdfMultiVoucherBtn'])move($(id),quick);
 const keep=$('ratibSaveAndNew');if(keep)move(keep,quick);
 const final=row('14','ratib-spend-final');
 move($('commitMultiVoucherBtn').closest('.voucher-savebar'),final);
 const cancel=nativeActions.querySelector('.btn-danger');move(cancel,final);
 const balanceRow=row('15','ratib-spend-balance-summary');
 move($('multiVoucherBalance'),balanceRow);
 const other=make('ratib-spend-support');layout.append(other);
 // Retain existing supporting controls, including FX-detail action and draft notice.
 for(const id of ['spendFxButton','multiVoucherSummary'])if($(id))move($(id),other);
 decorateRows();equivalent();updateBalanceHints();
}
function suppressBeneficiaryHeading(){
 const input=$('multiVoucherBeneficiary'),label=input?.closest('label');
 if(label?.firstChild?.nodeType===3)label.firstChild.textContent='';
}
function decorateRows(){
 if(!active()||!layout)return;
 suppressBeneficiaryHeading();
 for(const tr of $('multiVoucherLinesBody')?.rows||[]){
  const acct=tr.querySelector('td:nth-child(2)'),amount=tr.querySelector('td:nth-child(3)'),note=tr.querySelector('.multi-line-note');
  if(!acct||!amount)continue;
  if(!acct.querySelector('.ratib-spend-debit-balance')){
   const hint=make('ratib-spend-debit-balance','small');acct.append(hint);
  }
  if(!amount.querySelector('.ratib-spend-side-tools')){
   const tools=make('ratib-spend-side-tools');
   const swap=document.createElement('button');swap.type='button';swap.className='ratib-spend-swap';swap.textContent='⇄';swap.title='عكس طرفي القيد';
   swap.setAttribute('aria-label','عكس طرفي القيد للمدين والدائن');
   swap.onclick=()=>$('ratibReverseSide')?.click();
   const side=make('ratib-spend-side-label','span');side.textContent=$('ratibHeaderSide')?.value==='debit'?'دائن':'مدين';
   tools.append(swap,side);
   const money=amount.querySelector('.ratib-money-row');
   if(money)tools.append(money);
   amount.prepend(tools);
  }
  const side=amount.querySelector('.ratib-spend-side-label');
  if(side)side.textContent=$('ratibHeaderSide')?.value==='debit'?'دائن':'مدين';
  if(note){note.placeholder='البيان العام للمدين (قابل للتعديل)';note.setAttribute('aria-label','البيان العام للمدين');}
 }
 updateBalanceHints();
}
function wrapFunctions(){
 if(typeof configureVoucherMode==='function'){
  const original=configureVoucherMode;
  configureVoucherMode=function(mode){
   if(layout&&mode!=='spend')restore();
   const result=original.apply(this,arguments);
   if(mode==='spend')queueMicrotask(()=>{compose();decorateRows();});
   else if(typeof ratibOrderDocumentAccounts==='function')queueMicrotask(ratibOrderDocumentAccounts);
   return result;
  };
 }
 if(typeof renderMultiVoucherLines==='function'){
  const original=renderMultiVoucherLines;
  renderMultiVoucherLines=function(){
   const result=original.apply(this,arguments);
   if(active())queueMicrotask(()=>{compose();decorateRows();});
   return result;
  };
 }
 if(typeof ratibOrderDocumentAccounts==='function'){
  const original=ratibOrderDocumentAccounts;
  ratibOrderDocumentAccounts=function(){if(active()&&layout)return;return original.apply(this,arguments);};
 }
 if(typeof buildMultiVoucherData==='function'){
  const original=buildMultiVoucherData;
  buildMultiVoucherData=function(){
   const result=original.apply(this,arguments);
   if(active()&&priceSource)result.ratibSpendRateSource=priceSource.value.trim();
   return result;
  };
 }
 if(typeof resetMultiVoucherForm==='function'){
  const original=resetMultiVoucherForm;
  resetMultiVoucherForm=function(){
   const result=original.apply(this,arguments);
   if(active()&&priceSource)priceSource.value='';
   return result;
  };
 }
 if(typeof applySpendDocument==='function'){
  const original=applySpendDocument;
  applySpendDocument=function(d){
   const result=original.apply(this,arguments);
   if(active())queueMicrotask(()=>{compose();if(priceSource)priceSource.value=String(d?.ratibSpendRateSource||'');});
   return result;
  };
 }
}
function bind(){
 const c=card();if(!c)return;
 c.addEventListener('input',e=>{
  if(!active())return;
  if(e.target.matches('#ratibHeaderAmount,#ratibHeaderRate'))equivalent();
  if(e.target.matches('#inpMultiSourceAcc,.multi-line-account'))queueMicrotask(updateBalanceHints);
 });
 c.addEventListener('change',e=>{
  if(!active())return;
  if(e.target.matches('#multiVoucherBaseCurrency,.multi-line-currency,.multi-line-account,#ratibHeaderSide'))queueMicrotask(()=>{equivalent();decorateRows();});
 });
 c.addEventListener('click',e=>{if(e.target.closest('#ratibReverseSide'))queueMicrotask(decorateRows);});
}
wrapFunctions();
function initialize(){bind();if(active())queueMicrotask(compose);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
window.RatibTrialSpendLayout={refresh(){if(active()){compose();decorateRows();equivalent();}},get order(){return layout?[...layout.querySelectorAll(':scope > [data-spend-order]')].map(x=>x.dataset.spendOrder):[];}};
})();