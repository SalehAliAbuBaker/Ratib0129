(function trialReconciliationEvidence(){
"use strict";
const REC_KEY="account_reconciliations_v1";
const fmt=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:6});
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
const confirmed=v=>`✓ مطابق حتى ${v.date} — ${evidenceText(v)}`;
function printProof(name,currency,txs){
 const page=document.getElementById("printStatementContainer");
 if(!page||!name||name==="ALL")return;
 page.querySelectorAll(".ratib-reconciliation-print-proof").forEach(e=>e.remove());
 const from=window.ratibStatementEffectiveFrom?.(accountOpsState.from||"")??(accountOpsState.from||"");
 const to=accountOpsState.to||"";
 const evidence=inspect(name,currency,from,to);
 if(!evidence)return;
 const banner=document.createElement("div");
 banner.className="ratib-reconciliation-print-proof";
 banner.style.cssText="direction:rtl;text-align:right;font-size:10.5pt;font-weight:700;padding:8px 12px;margin:7px 0 10px;border:1.5px solid #365a4f;background:#eaf5ed;color:#173d35;break-inside:avoid;page-break-inside:avoid";
 if(!evidence.stable){
  banner.style.cssText+=";border-color:#b45309;background:#fff7ed;color:#78350f";
  banner.textContent=`⚠ مطابقة مؤرخة ${evidence.date} لم تعد سارية: تغيرت حركات الحساب بعد اعتمادها. يلزم إعادة المطابقة، ولا يُعد الرصيد مطابقًا.`;
 }else if(evidence.dateAfterPeriod){
  banner.style.cssText+=";background:#f8fafc;border-color:#64748b;color:#334155";
  banner.textContent=`↪ تاريخ المطابقة ${evidence.date} يأتي بعد نهاية فترة الكشف؛ ${evidenceText(evidence)}. هذه المطابقة لا تُثبت رصيد الفترة المعروضة.`;
 }else{
  banner.innerHTML=`<span style="font-size:12pt;display:block">✓ رصيد مطابق ومعتمد حتى ${evidence.date}</span><span style="font-size:10pt;display:block;margin-top:2px">${evidenceText(evidence)} · إثبات المطابقة محفوظ في راتب بتاريخ ${evidence.date}</span>`;
 }
 const table=page.querySelector(".ps-table-wrap");
 if(table)table.before(banner);else page.append(banner);
 if(!evidence.stable||!evidence.inPeriod)return;
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
   cell.style.background="#e2f2e5";cell.style.color="#173d35";cell.style.fontWeight="900";cell.style.border="2px solid #39784a";
   const mark=document.createElement("small");mark.style.cssText="display:block;font-size:9pt;color:#173d35;font-weight:900";
   mark.textContent="✓ رصيد مطابق حتى "+evidence.date;cell.appendChild(mark);
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
  page.querySelectorAll(".ratib-reconciliation-screen-proof").forEach(el=>el.remove());
  if(!proof)return;
  const banner=document.createElement("div");banner.className="ratib-reconciliation-screen-proof";
  banner.style.cssText="margin:7px 0;padding:8px 10px;font-size:12px;line-height:1.7;border:1.5px solid #6a9582;border-radius:8px;background:#e7f4e9;color:#24513c";
  if(!proof.stable){
   banner.style.cssText+=";border-color:#d99b40;background:#fff7ed;color:#713f12";
   banner.textContent=`⚠ المطابقة السابقة بتاريخ ${proof.date} تحتاج مراجعة؛ تغيّرت حركات الحساب ولا يُعد الرصيد مطابقًا.`;
  }else if(proof.dateAfterPeriod){
   banner.textContent=`↪ مطابقة سابقة حتى ${proof.date}، لكنها بعد تاريخ نهاية الكشف المعروض؛ لا تُثبت رصيد هذه الفترة.`;
  }else{
   banner.textContent=confirmed(proof);
   if(proof.inPeriod){
    const rows=[...page.querySelectorAll(".account-statement-row[data-tx-id]")];
    const group=getAccountOperations(name,scope,currency);
    let last=-1;
    for(let i=0;i<Math.min(group.length,rows.length);i++)if(getAccountOpsDate(group[i])<=proof.date)last=i;
    if(last>=0){
     const cell=rows[last].querySelector(".balance")||rows[last].lastElementChild;
     if(cell){
      cell.style.background="#e1f1e5";cell.style.color="#24513c";cell.style.fontWeight="900";
      cell.querySelectorAll(".ratib-match-mark").forEach(e=>e.remove());
      const marker=document.createElement("small");marker.className="ratib-reconciliation-screen-proof";
      marker.style.cssText="display:block;font-weight:900;font-size:11px";marker.textContent="✓ مطابق حتى "+proof.date;
      cell.appendChild(marker);
     }
    }
   }
  }
  page.querySelector(".account-operations-head")?.insertAdjacentElement("afterend",banner);
 });
 return out;
};
})();
