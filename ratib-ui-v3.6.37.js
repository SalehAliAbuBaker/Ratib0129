(function ratibUiEnhancementsV3637(){
"use strict";
const FORMAT=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:3});
function available(){return typeof getCurrentAccountBalance==='function'&&typeof getAccountEntry==='function'&&typeof getAllTransactions==='function';}
function accountBalance(account,currency){
 if(!account||!available())return null;
 const sum=getCurrentAccountBalance(account).byCurrency?.[currency]||{debit:0,credit:0};
 const value=Number(sum.credit||0)-Number(sum.debit||0);
 return {value, label:`الرصيد الحالي: ${FORMAT(Math.abs(value))} ${currency} (${value<0?'مدين':'دائن'})`};
}
function smallHint(host,kind){
 if(!host)return null;
 let hint=host.querySelector(':scope > .ratib-current-balance');
 if(!hint){hint=document.createElement('small');hint.className='ratib-current-balance';hint.setAttribute('aria-live','polite');host.appendChild(hint);}
 if(kind)hint.dataset.kind=kind;
 return hint;
}
function repaintSimpleBalances(){
 if(!available())return;
 const currency=document.getElementById('voucherCurrencySelect')?.value||'YER';
 for(const [id,field] of [['wrapDebitAcc','selDebitAcc'],['wrapCreditAcc','selCreditAcc']]){
  const wrap=document.getElementById(id),group=wrap?.closest('.form-group');
  if(!group)continue;
  let hint=group.querySelector(':scope > .ratib-current-balance');
  if(!hint){hint=document.createElement('small');hint.className='ratib-current-balance';group.appendChild(hint);}
  const select=field==='selDebitAcc'?(typeof selDebitAcc==='undefined'?null:selDebitAcc):(typeof selCreditAcc==='undefined'?null:selCreditAcc);
  const name=select?.getValue?.()||'';
  hint.textContent=name?accountBalance(name,currency)?.label||'':'';
  hint.hidden=!name;
 }
}
function repaintMultiBalances(){
 if(!available())return;
 const card=document.getElementById('multiVoucherCard'),cash=card?.classList.contains('spend-voucher');
 if(!card)return;
 const source=card.querySelector('.multi-voucher-source-row'),name=(typeof multiSourceAcc!=='undefined'&&multiSourceAcc?.getValue?.())||'';
 if(!source?.closest('.multi-voucher-grid'))return;
 let hint=source?.querySelector(':scope > .ratib-multi-source-balance');
 if(!hint){
  hint=document.createElement('small');hint.className='ratib-current-balance ratib-multi-source-balance';source?.appendChild(hint);
 }
 const currency=document.getElementById('multiVoucherBaseCurrency')?.value||'YER';
 if(hint){hint.textContent=cash&&name?accountBalance(name,currency)?.label||'':'';hint.hidden=!(cash&&name);}
 const body=document.getElementById('multiVoucherLinesBody');
 if(!body)return;
 body.querySelectorAll('tr').forEach(row=>{
  const accountSelect=row.querySelector('.multi-line-account'),amountInput=row.querySelector('.multi-line-amount');
  if(!accountSelect||!amountInput)return;
  const index=Number(accountSelect.dataset.index),line=(typeof multiVoucherLines!=='undefined'&&multiVoucherLines[index])||null;
  const chosen=line?.account||accountSelect.value||'';
  const currentCurrency=line?.currency||row.querySelector('.multi-line-currency')?.value||currency;
  const cell=accountSelect.closest('td');
  const note=smallHint(cell,'balance');
  if(note){note.textContent=chosen?accountBalance(chosen,currentCurrency)?.label||'':'';note.hidden=!chosen;}
  const amountCell=amountInput.closest('td');
  let words=amountCell?.querySelector(':scope > .ratib-line-tafqit');
  if(!words&&amountCell){words=document.createElement('small');words.className='ratib-line-tafqit';amountCell.appendChild(words);}
  if(words){
   const value=typeof getCleanNumber==='function'?getCleanNumber(amountInput.value):Number(amountInput.value||0);
   words.textContent=!cash&&Number.isFinite(value)&&value>0?tafqitAccountCurrency(value,currentCurrency):'';
   words.hidden=cash||!words.textContent;
  }
 });
}
function main(){
 if(!available())return;
 if(!document.getElementById('ratib-v3637-style')){
  const style=document.createElement('style');style.id='ratib-v3637-style';style.textContent=`
  .ratib-current-balance,.ratib-line-tafqit{display:block;font-size:11px!important;line-height:1.45!important;font-weight:500!important;color:var(--muted)!important;direction:rtl;text-align:right;white-space:normal;overflow-wrap:anywhere;margin:3px 1px 0}
  .ratib-current-balance[hidden],.ratib-line-tafqit[hidden]{display:none!important}
  #multiVoucherCard.spend-voucher .multi-voucher-source-row{flex-wrap:wrap!important}
  .ratib-multi-source-balance{flex:0 0 100%!important;order:5!important;margin:1px 8px 0!important}
  #cashFlowCard #tafqitDisplayBox{font-size:12px!important;font-weight:500!important;line-height:1.6!important;margin:3px 0 9px!important;padding:3px 5px!important;border:0!important;background:none!important;color:var(--muted)!important}
  #multiVoucherCard.spend-voucher #cashDirectionControl{display:flex!important;justify-content:center!important;gap:10px!important;align-items:center!important;flex-wrap:nowrap!important}
  #ratibCashBackBtn{min-height:44px!important;padding:8px 12px!important;white-space:nowrap;font-size:13px!important;margin:0!important}
  .ratib-reconcile-bar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:8px 10px;margin:8px 0;border:1px solid var(--border);border-radius:10px;background:var(--bg);font-size:12px}
  .ratib-reconcile-bar label{display:flex;align-items:center;gap:6px;font-weight:700}
  .ratib-reconcile-bar input{width:auto;max-width:150px;padding:6px;font:inherit}
  .ratib-reconcile-bar button{width:auto;min-height:34px;padding:6px 10px;margin:0;font-size:12px}
  .ratib-reconcile-status{flex-basis:100%;font-size:12px;color:var(--muted);line-height:1.5}
  .ratib-reconcile-status[data-state="matched"]{color:var(--ok)}
  .ratib-reconcile-status[data-state="changed"]{color:var(--danger)}
  .ratib-match-mark{display:inline-block;white-space:nowrap;font-size:12px;color:var(--ok);margin-inline-start:4px;font-weight:700}
  @media(max-width:390px){#ratibCashBackBtn{padding:7px 8px!important;font-size:12px!important}.ratib-reconcile-bar input{max-width:125px}}
  @media print{.ratib-reconcile-bar{display:none!important}}
  `;document.head.appendChild(style);
 }
 const money=document.getElementById('voucherAmountInput');
 const tafqit=document.getElementById('tafqitDisplayBox');
 const amountRow=money?.parentElement?.parentElement;
 if(tafqit&&amountRow&&tafqit.previousElementSibling!==amountRow){amountRow.insertAdjacentElement('afterend',tafqit);}
 function installCashBack(){
  const box=document.getElementById('cashDirectionControl');
  if(box&&!box.querySelector('#ratibCashBackBtn')){
   const button=document.createElement('button');button.id='ratibCashBackBtn';button.type='button';button.className='btn btn-ghost';button.textContent='↩ العودة';button.title='العودة إلى قائمة أنواع السندات';
   button.addEventListener('click',()=>backToVoucherSelector());
   box.appendChild(button);
  }
 }
 installCashBack();
 const oldConfigureVoucherMode=configureVoucherMode;
 configureVoucherMode=function(...args){
  const result=oldConfigureVoucherMode.apply(this,args);
  installCashBack();repaintMultiBalances();
  return result;
 };
 const oldSetValue=SearchableSelect.prototype.setValue;
 SearchableSelect.prototype.setValue=function(...args){
  const result=oldSetValue.apply(this,args);
  if(['inpDebitAcc','inpCreditAcc','inpMultiSourceAcc'].includes(this.input?.id))queueMicrotask(()=>{repaintSimpleBalances();repaintMultiBalances();});
  return result;
 };
 const previousRender=renderMultiVoucherLines;
 renderMultiVoucherLines=function(...args){
  const result=previousRender.apply(this,args);
  repaintMultiBalances();
  return result;
 };
 document.addEventListener('input',event=>{
  const id=event.target?.id;
  if(['inpDebitAcc','inpCreditAcc','voucherCurrencySelect','inpMultiSourceAcc','ratibHeaderAmount'].includes(id))queueMicrotask(()=>{repaintSimpleBalances();repaintMultiBalances();});
  if(event.target?.closest?.('#multiVoucherLinesBody')&&(event.target.matches('.multi-line-amount,.multi-line-account,.multi-line-currency')))queueMicrotask(repaintMultiBalances);
 });
 document.addEventListener('change',event=>{
  if(['voucherCurrencySelect','multiVoucherBaseCurrency','inpDebitAcc','inpCreditAcc'].includes(event.target?.id))queueMicrotask(()=>{repaintSimpleBalances();repaintMultiBalances();});
  if(event.target?.closest?.('#multiVoucherLinesBody'))queueMicrotask(repaintMultiBalances);
 });
 document.getElementById('pageExpenses')?.addEventListener('click',()=>queueMicrotask(()=>{installCashBack();repaintSimpleBalances();repaintMultiBalances();}));
 const RECON_KEY='account_reconciliations_v1';
 const today=()=>getLocalTodayISO();
 const records=()=>store.get(RECON_KEY,{})||{};
 const recordKey=(name,currency)=>encodeURIComponent(name)+'|'+encodeURIComponent(currency);
 function checkpoint(name,currency,date){
  let amount=0;const parts=[];
  for(const tx of getAllTransactions()){
   if(tx.status==='reversed'||tx.status==='deleted'||getAccountOpsDate(tx)>date)continue;
   const entry=getAccountEntry(tx,[name]);
   if(!entry||entry.currency!==currency)continue;
   const n=getAccountDisplayAmount(entry);
   if(!Number.isFinite(n))continue;
   const delta=entry.bothSides?0:(entry.side==='debit'?-n:n);
   amount+=delta;
   parts.push([tx.id,getAccountOpsDate(tx),entry.side,entry.bothSides?'both':'one',n,tx.debitAccount,tx.creditAccount,tx.multiVoucherId||''].join('|'));
  }
  let fingerprint=2166136261;
  for(const chr of parts.sort().join('\n')){fingerprint^=chr.charCodeAt(0);fingerprint=Math.imul(fingerprint,16777619);}
  return {balance:Math.round(amount*1000000)/1000000, fingerprint:String(fingerprint>>>0),count:parts.length};
 }
 const oldStatement=renderAccountOperations;
 renderAccountOperations=function(accountName,scopeNames=null,ui=null){
  const result=oldStatement.apply(this,arguments);
  const panel=document.getElementById((ui||accountOpsUi)?.panelId||'reportAccountOpsPanel');
  if(!panel||!accountName)return result;
  panel.querySelectorAll('.account-currency-page').forEach(page=>{
   const currency=page.dataset.currency;
   if(!currency)return;
   const key=recordKey(accountName,currency),saved=records()[key]||null;
   const current=saved?checkpoint(accountName,currency,saved.date):null;
   const stable=saved&&saved.fingerprint===current.fingerprint&&Math.abs(saved.balance-current.balance)<0.000001&&saved.count===current.count;
   const bar=document.createElement('div');bar.className='ratib-reconcile-bar no-print';
   const label=document.createElement('label');label.textContent='مطابقة الرصيد حتى';
   const dateInput=document.createElement('input');dateInput.type='date';dateInput.value=saved?.date||today();dateInput.max=today();dateInput.setAttribute('aria-label','تاريخ مطابقة الرصيد');
   label.appendChild(dateInput);
   const save=document.createElement('button');save.type='button';save.className='btn btn-primary';save.textContent='✓ تثبيت المطابقة';
   const clear=document.createElement('button');clear.type='button';clear.className='btn btn-ghost';clear.textContent='إلغاء العلامة';clear.hidden=!saved;
   const status=document.createElement('small');status.className='ratib-reconcile-status';
   if(saved){
    status.dataset.state=stable?'matched':'changed';
    status.textContent=stable?'':`⚠ تغيّرت حركات الحساب حتى ${saved.date} بعد المطابقة؛ راجع الرصيد وثبّت المطابقة مجددًا.`;status.hidden=!!stable;
   }else status.textContent='لا توجد مطابقة محفوظة. اختر تاريخ المطابقة بعد مراجعة كشف الحساب.';
   bar.append(label,save,clear,status);
   page.querySelector('.account-operations-head')?.insertAdjacentElement('afterend',bar);
   if(stable){
    // Reconciled evidence belongs only to the verified transaction, not to a later closing balance.
    const rows=Array.from(page.querySelectorAll('.account-statement-row[data-tx-id]'));
    const matching=rows.filter(row=>row.querySelector('span')?.textContent?.trim()===saved.date);
    const last=matching.at(-1);
    if(last){
     const balance=last.querySelector('.balance')||last.lastElementChild;
     if(balance){const badge=document.createElement('span');badge.className='ratib-match-mark';badge.textContent='✓ مطابق';badge.title='تمت مطابقة الرصيد حتى '+saved.date;badge.style.cssText='display:inline-block;background:#dff2e5;color:#174c34;border:1px solid #6f9c7a;border-radius:4px;padding:2px 5px;font-weight:900';balance.appendChild(badge);}
    }
   }
   save.addEventListener('click',()=>{
    const date=dateInput.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today()){showToast('اختر تاريخًا صحيحًا لا يتجاوز اليوم.','warn');return;}
    const value=checkpoint(accountName,currency,date);
    const map={...records(),[key]:{...value,date,updatedAt:new Date().toISOString()}};
    try{store.set(RECON_KEY,map);renderAccountOperations(accountName,scopeNames,ui);showToast('تم حفظ علامة المطابقة حتى '+date,'success');}
    catch(error){showToast('تعذر حفظ المطابقة: '+error.message,'error');}
   });
   clear.addEventListener('click',()=>{
    if(!saved)return;
    const map={...records()};delete map[key];
    try{store.set(RECON_KEY,map);renderAccountOperations(accountName,scopeNames,ui);showToast('تم إلغاء علامة المطابقة دون حذف أي حركة.','info');}
    catch(error){showToast('تعذر إلغاء المطابقة: '+error.message,'error');}
   });
  });
  return result;
 };
 repaintSimpleBalances();repaintMultiBalances();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
})();
