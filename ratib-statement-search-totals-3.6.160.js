/* Ratib 3.6.160 — Filtered statement totals and output without mutating ledger balances. */
(function(){
 'use strict';
 if(typeof getAccountCurrencyReportData!=='function'||typeof renderAccountOperations!=='function'
    ||typeof ratibApplyAccountMovementSearch!=='function')return;
 const originalData=getAccountCurrencyReportData;
 const originalRender=renderAccountOperations;
 const originalSearch=ratibApplyAccountMovementSearch;
 const originalBalances=getAccountRunningBalances;
 const originalTitle=ratibStatementTotalsTitle;
 const originalPeriod=accountPeriodTitle;
 const originalClosing=ratibStatementClosingText;
 const originalExport=accountExportRows;
 const balanceMaps=new WeakMap(),screenOriginals=new WeakMap();
 let rendering=false;
 const terms=()=>ratibAccountMovementNormalize(accountOpsState?.movementSearch||'').split(/\s+/).filter(Boolean);
 const searching=()=>terms().length>0;
 const round=value=>typeof roundAccountingAmount==='function'?roundAccountingAmount(value):Math.round(value*1e6)/1e6;
 const formatted=value=>Number(value||0).toLocaleString();
 const side=value=>value===0?'صفر':value>0?'دائن':'مدين';
 function amounts(rows,scope){
  let debit=0,credit=0;
  for(const tx of rows){
   const entry=getAccountEntry(tx,scope);if(!entry)continue;
   const amount=getAccountDisplayAmount(entry);
   if(entry.bothSides){debit+=amount;credit+=amount;}
   else if(entry.side==='debit')debit+=amount;
   else credit+=amount;
  }
  return {debit:round(debit),credit:round(credit)};
 }
 function visibleText(tx,entry,currency,balance){
  const note=ratibStatementText(entry?.line?.note||tx.execution?.[Object.keys(tx.execution||{})[0]]?.note||getTransactionDisplayType(tx),'بدون بيان');
  const owner=ratibAggregateOwner(tx);
  const amount=getAccountDisplayAmount(entry);
  const date=ratibStatementDateHtml(getAccountOpsDate(tx)||'-').replace(/<[^>]*>/g,' ');
  return [date,'#'+ratibStatementText(tx.seqNum,'-'),ratibStatementDocumentLabel(tx),
    owner?'['+owner+'] '+note:note,entry?.side==='debit'?formatted(amount):'',
    entry?.side==='debit'&&!entry.bothSides?'':formatted(amount),
    formatted(Math.abs(balance)),currency].join(' ');
 }
 function corpus(tx,entry,currency,balance){
  return ratibAccountMovementSearchCorpus(tx,entry,visibleText(tx,entry,currency,balance));
 }
 function screenCorpus(currency){
  const panel=document.getElementById('accountOperationsStandalonePanel');
  const page=[...(panel?.querySelectorAll('.account-currency-page')||[])].find(p=>p.dataset.currency===currency);
  const found=new Map();
  page?.querySelectorAll('.account-statement-row[data-tx-id]').forEach(row=>{
   found.set(String(row.dataset.txId),row.dataset.ratibMovementText||ratibAccountMovementNormalize(row.textContent));
  });
  return found;
 }
 getAccountCurrencyReportData=function(currency){
  const original=originalData.apply(this,arguments),q=terms();
  if(rendering||!q.length)return original;
  const scope=accountOpsState.scopeNames,balances=originalBalances(original.rows,scope,original.opening);
  const shown=screenCorpus(currency);
  const rows=original.rows.filter(tx=>{
   const entry=getAccountEntry(tx,scope);
   const text=shown.get(String(tx.id))||corpus(tx,entry,currency,balances.get(tx)||0);
   return q.every(term=>text.includes(term));
  });
  const sums=amounts(rows,scope),closing=round(sums.credit-sums.debit);
  balanceMaps.set(rows,balances);
  return {...original,rows,opening:0,totalDebit:sums.debit,totalCredit:sums.credit,closing,
   ratibSearchFiltered:true,ratibFullClosing:original.closing,ratibFullCount:original.rows.length};
 };
 getAccountRunningBalances=function(rows,scope,opening){
  return balanceMaps.get(rows)||originalBalances.apply(this,arguments);
 };
 function saveText(node){
  if(node&&!screenOriginals.has(node))screenOriginals.set(node,node.textContent);
 }
 function restoreText(node){
  if(node&&screenOriginals.has(node))node.textContent=screenOriginals.get(node);
 }
 function updateScreenTotals(){
  const panel=document.getElementById('accountOperationsStandalonePanel');
  if(!panel)return;
  const q=terms(),active=q.length>0;
  const txs=new Map(getAllTransactions().map(tx=>[String(tx.id),tx]));
  let all=0,matched=0;
  panel.querySelectorAll('.account-currency-page').forEach(page=>{
   const scope=accountOpsState.scopeNames,currency=page.dataset.currency;
   let count=0,shown=0;
   const rows=[];
   page.querySelectorAll('.account-statement-row[data-tx-id]').forEach(row=>{
    count++;all++;
    if(!row.classList.contains('ratib-movement-hidden')){
     shown++;matched++;
     const tx=txs.get(String(row.dataset.txId));if(tx)rows.push(tx);
    }
   });
   const total=page.querySelector('.statement-grand-total');
   const label=total?.querySelector('.statement-total-label');
   const debit=total?.querySelector('.debit');
   const credit=total?.querySelector('.credit');
   const balance=total?.querySelector('.balance');
   const words=page.querySelector('.ratib-statement-words');
   const headerCount=page.querySelector('.account-operations-head small');
   for(const node of [label,debit,credit,balance,words,headerCount])saveText(node);
   if(!active){
    for(const node of [label,debit,credit,balance,words,headerCount])restoreText(node);
    return;
   }
   const sum=amounts(rows,scope),net=round(sum.credit-sum.debit);
   if(label)label.textContent='إجمالي نتائج البحث (دون الرصيد السابق)';
   if(debit)debit.textContent=formatted(sum.debit);
   if(credit)credit.textContent=formatted(sum.credit);
   if(balance)balance.textContent='صافي النتائج: '+formatted(Math.abs(net))+' '+currency+' '+side(net);
   if(words)words.textContent='صافي نتائج البحث: '+tafqitAccountCurrency(Math.abs(net),currency);
   if(headerCount)headerCount.textContent=shown+' من '+count+' حركة';
  });
  const counter=document.getElementById('ratibAccountMovementSearchCount');
  if(counter)counter.textContent=active
   ?'نتائج البحث: '+matched+' من '+all+' حركة. الإجماليات للنتائج فقط، والرصيد الدفتري لكل حركة محفوظ.'
   :'عدد الحركات في الحساب: '+all;
 }
 ratibApplyAccountMovementSearch=function(){
  const result=originalSearch.apply(this,arguments);
  updateScreenTotals();
  return result;
 };
 renderAccountOperations=function(){
  rendering=true;
  try{return originalRender.apply(this,arguments);}
  finally{rendering=false;}
 };
 ratibStatementTotalsTitle=function(){
  return !rendering&&searching()?'إجمالي نتائج البحث (دون الرصيد السابق)':originalTitle.apply(this,arguments);
 };
 accountPeriodTitle=function(){
  const title=originalPeriod.apply(this,arguments);
  return !rendering&&searching()?title+' — كشف حركات مفلتر':title;
 };
 ratibStatementClosingText=function(value,currency){
  return !rendering&&searching()
    ?'صافي نتائج البحث: '+tafqitAccountCurrency(Math.abs(Number(value)||0),currency||'YER')
    :originalClosing.apply(this,arguments);
 };
 accountExportRows=function(currency){
  const result=originalExport.apply(this,arguments);
  if(!searching())return result;
  const data=getAccountCurrencyReportData(currency);
  const balances=balanceMaps.get(data.rows);
  data.rows.forEach((tx,index)=>{
   const row=result[index+1],n=balances?.get(tx);
   if(!row||!Number.isFinite(n))return;
   row[5]=Math.abs(n);row[6]=side(n);
  });
  if(result.length>1)result[result.length-1][2]='إجمالي نتائج البحث (صافي الحركات فقط)';
  return result;
 };
 window.RatibStatementFilteredTotals={amounts,updateScreenTotals};
})();