(function trialReconciliationEvidence(){
"use strict";
const REC_KEY="account_reconciliations_v1";
const fmt=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const recordKey=(name,currency)=>encodeURIComponent(name)+"|"+encodeURIComponent(currency);
function inspect(name,currency,from="",to=""){
 const saved=(store.get(REC_KEY,{})||{})[recordKey(name,currency)];
 if(!saved?.date)return null;
 let balance=0;const parts=[];
 for(const tx of getAllTransactions()){
  if(tx.status==="reversed"||tx.status==="deleted"||getAccountOpsDate(tx)>saved.date)continue;
  const entry=getAccountEntry(tx,[name]);
  if(!entry||entry.currency!==currency)continue;
  const amt=getAccountDisplayAmount(entry);
  if(!Number.isFinite(amt))continue;
  const delta=entry.bothSides?0:(entry.side==="debit"?-amt:amt);
  balance+=delta;
  parts.push([tx.id,getAccountOpsDate(tx),entry.side,entry.bothSides?"both":"one",amt,tx.debitAccount,tx.creditAccount,tx.multiVoucherId||""].join("|"));
 }
 let hash=2166136261;
 for(const ch of parts.sort().join("\n")){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const actual={balance:Math.round(balance*1000000)/1000000,fingerprint:String(hash>>>0),count:parts.length};
 const stable=actual.fingerprint===String(saved.fingerprint)&&actual.count===saved.count&&Math.abs(actual.balance-Number(saved.balance))<0.000001;
 return {
  name,currency,date:saved.date,balance:Number(saved.balance),stable,
  inPeriod:(!from||saved.date>=from)&&(!to||saved.date<=to),
  from,to,
  dateAfterPeriod:!!to&&saved.date>to
 };
}
window.ratibReconciliationEvidence=inspect;
const evidenceText=(v)=>`الرصيد ${fmt(Math.abs(v.balance))} ${v.currency} (${v.balance<0?"مدين":"دائن"})`;
const confirmed=()=>`✓ مطابق`;
function printProof(name,currency,txs){
 const page=document.getElementById("printStatementContainer");
 if(!page||!name||name==="ALL")return;
 page.querySelectorAll(".ratib-reconciliation-print-proof").forEach(e=>e.remove());
 const from=window.ratibStatementEffectiveFrom?.(accountOpsState.from||"")??(accountOpsState.from||"");
 const to=accountOpsState.to||"";
 const evidence=inspect(name,currency,from,to);
 if(!evidence)return;
 // Only the reconciled balance cell is marked; no separate footer or banner.
 if(window.ratibStatementSettings?.().reconciliation===false||!evidence.stable||!evidence.inPeriod||evidence.dateAfterPeriod)return;
 const rows=[...page.querySelectorAll("#psTableBody tr")].filter(tr=>tr.cells?.length>=6&&tr.cells[0]?.colSpan===1&&!tr.classList.contains("ps-total-row"));
 const series=txs.filter(t=>t.debitAccount===name||t.creditAccount===name);
 let last=-1;
 for(let i=0;i<Math.min(rows.length,series.length);i++){
  const date=String(series[i]?.isoDate||series[i]?.date||"").slice(0,10);
  if(date&&date<=evidence.date)last=i;
 }
 if(last>=0){
  const cell=rows[last].cells[rows[last].cells.length-1];
  if(cell){
   cell.style.background="#e2f2e5";cell.style.printColorAdjust="exact";cell.style.color="#173d35";cell.style.fontWeight="900";cell.style.border="2px solid #39784a";
   const mark=document.createElement("small");mark.style.cssText="display:block;font-size:9pt;color:#173d35;font-weight:900";
   mark.textContent="✓ مطابق";cell.appendChild(mark);
  }
 }
}
const beforePrint=preparePrintStatementTemplate;
preparePrintStatementTemplate=function(name,txs,opening,title,currencyLabel){
 const out=beforePrint.apply(this,arguments);
 if(name==="ALL")return out;
 // Account print helpers always append the display currency to their subtitle.
 const currency=accountOpsState?.activeCurrency||"YER";
 const candidate=String(title||"").match(/\b(?:YER|SAR|USD|AED|EUR|OMR|KWD|QAR|BHD)\b/);
 const knownCurrencies=getAccountCurrencies(name,accountOpsState.scopeNames);
 const inferred=txs?.[0]?.currency||knownCurrencies.find(c=>String(title||"").includes(c))||currency;
 const selected=knownCurrencies.find(c=>String(currencyLabel||"")===String(accountCurrencyLabel(c)))||candidate?.[0]||inferred;
 printProof(name,selected,txs);
 return out;
};
const beforeScreen=renderAccountOperations;
renderAccountOperations=function(name,scope=null,ui=null){
 const out=beforeScreen.apply(this,arguments);
 const panel=document.getElementById((ui||accountOpsUi)?.panelId||"accountOperationsStandalonePanel");
 if(!panel||!name)return out;
 const from=window.ratibStatementEffectiveFrom?.(accountOpsState.from||"")??(accountOpsState.from||"");
 const to=accountOpsState.to||"";
 panel.querySelectorAll(".account-currency-page").forEach(page=>{
  const currency=page.dataset.currency,proof=currency?inspect(name,currency,from,to):null;
  // Screen-only: do not change the confirmed print/share reconciliation output.
  // Remove the legacy date-string badge too: Hijri display text cannot be compared
  // with the saved ISO date, and its position may differ from the ledger row.
  page.querySelectorAll(".ratib-reconciliation-screen-proof,.account-statement-row .balance .ratib-match-mark").forEach(el=>el.remove());
  if(!proof||window.ratibStatementSettings?.().reconciliation===false||
     !proof.stable||!proof.inPeriod||proof.dateAfterPeriod)return;
  const report=getAccountCurrencyReportData(currency);
  const transactions=Array.isArray(report?.rows)?report.rows:[];
  const scopeNames=accountOpsState.scopeNames||scope||[name];
  const balanceMap=getAccountRunningBalances(transactions,scopeNames,report.opening);
  let lastTx=null, lastDate="";
  for(const tx of transactions){
   const date=getAccountOpsDate(tx);
   if(!date||date>proof.date)continue;
   // Reconciliation is an end-of-day checkpoint; never match a later movement.
   if(date>=lastDate){lastDate=date;lastTx=tx;}
  }
  let cell=null;
  if(lastTx){
   const balance=balanceMap.get(lastTx);
   if(Number.isFinite(balance)&&Math.abs(balance-proof.balance)<0.000001){
    const row=[...page.querySelectorAll(".account-statement-row[data-tx-id]")]
     .find(row=>String(row.dataset.txId)===String(lastTx.id));
    cell=row?.querySelector(".balance")||null;
   }
  }else if(Number.isFinite(report?.opening)&&Math.abs(report.opening-proof.balance)<0.000001){
   // A checkpoint after the period starts but before its first transaction
   // belongs to the opening balance, not to the first later transaction.
   cell=page.querySelector(".account-statement-row.opening .balance");
  }
  // On a paged statement, mark only the actual matching balance if visible.
  if(cell){
   cell.style.background="#e1f1e5";
   cell.style.color="#24513c";
   cell.style.fontWeight="900";
   const marker=document.createElement("small");
   marker.className="ratib-reconciliation-screen-proof ratib-match-mark";
   marker.style.cssText="display:block;font-weight:900;font-size:11px";
   marker.textContent="✓ مطابق";
   cell.appendChild(marker);
  }
 });
 return out;
};
})();
