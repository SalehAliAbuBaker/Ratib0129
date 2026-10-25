/* Opening-voucher description layout: presentation-only fix, no data or accounting changes. */
(function ratibOpeningNarrationLayout(){
  try {
    if(document.getElementById("ratibOpeningNarrationStyle"))return;
    const style=document.createElement("style");
    style.id="ratibOpeningNarrationStyle";
    style.textContent='#importedOpeningVoucherModal #importedOpeningRows input[data-field="note"]{width:380px!important;min-width:320px!important;max-width:none!important;min-height:44px!important;box-sizing:border-box!important;padding:8px 10px!important;text-align:right;direction:rtl}#importedOpeningVoucherModal .pv-table{min-width:100%;table-layout:auto}';
    (document.head||document.documentElement).appendChild(style);
  }catch(e){console.warn("Opening voucher description layout:",e);}
})();
/* Ratib 3.6.59 — read-only ledger consistency, live refresh and safe voucher cloning.
 * No transaction, imported balance, account catalog or storage schema is modified here. */
(function ratibAccounting359(){
"use strict";
if(window.RatibAccounting359)return;
const raw = transactions => (Array.isArray(transactions)?transactions:[]).filter(t=>t&&t.status!=="deleted"&&t.status!=="reversed");
const legs = transactions => raw(transactions).flatMap(t=>trialTransactionLegs(t)).filter(l=>l&&l.account&&l.currency&&Number.isFinite(Number(l.debit))&&Number.isFinite(Number(l.credit)));
const round = value => Math.round((Number(value)+Number.EPSILON)*1e6)/1e6;
const key = (name,currency) => name+"\x1f"+currency;
function accountTotals(transactions){
 const sums=new Map();
 for(const leg of legs(transactions)){
  const id=key(leg.account,leg.currency),row=sums.get(id)||{name:leg.account,currency:leg.currency,debit:0,credit:0};
  row.debit+=Number(leg.debit);row.credit+=Number(leg.credit);sums.set(id,row);
 }
 for(const row of sums.values()){row.debit=round(row.debit);row.credit=round(row.credit);row.balance=round(row.credit-row.debit);}
 return sums;
}
window.RatibAccounting359={accountTotals,version:"3.6.59",readOnly:true};
getCurrentAccountBalance=function(name){
 const byCurrency={};
 for(const row of accountTotals(getAllTransactions()).values())if(row.name===name)byCurrency[row.currency]={debit:row.debit,credit:row.credit};
 const currencies=Object.keys(byCurrency),preferred=getGlobalCurrency(),currency=currencies.includes(preferred)?preferred:currencies[0]||preferred;
 const selected=byCurrency[currency]||{debit:0,credit:0};
 return {...selected,balance:round(selected.credit-selected.debit),currency,byCurrency,isMultiCurrency:currencies.length>1};
};
computeAccountTreeBalanceSummary=function(){
 const result=new Map();
 for(const row of accountTotals(getAllTransactions()).values()){
  if(!result.has(row.name))result.set(row.name,new Map());
  result.get(row.name).set(row.currency,{debit:row.debit,credit:row.credit});
 }
 return result;
};
runAllAccountsSummaryReport=function(targetTxs){
 const tbody=document.getElementById("allAccountsBody");if(!tbody)return;
 const selectedCurrency=reportAdv.active&&reportAdv.currency!=="ALL"?reportAdv.currency:getGlobalCurrency();
 const accounts=new Map();
 for(const group of getCanonicalCatalog())for(const detail of group.details||[]){
  accounts.set(detail[1],{name:detail[1],group:group.main+" > "+group.group+" > "+group.sub,debit:0,credit:0});
 }
 for(const row of accountTotals(targetTxs).values()){
  if(row.currency!==selectedCurrency)continue;
  const acc=accounts.get(row.name)||{name:row.name,group:"حساب تاريخي خارج الدليل الحالي — للمراجعة",debit:0,credit:0};
  acc.debit+=row.debit;acc.credit+=row.credit;accounts.set(row.name,acc);
 }
 tbody.replaceChildren();let gDebit=0,gCredit=0;
 for(const account of accounts.values()){
  gDebit+=account.debit;gCredit+=account.credit;
  if(!account.debit&&!account.credit)continue;
  const tr=document.createElement("tr");tr.style.cursor="pointer";tr.title="فتح كشف الحساب التفصيلي";
  const name=document.createElement("td"),debit=document.createElement("td"),credit=document.createElement("td"),balance=document.createElement("td");
  const strong=document.createElement("b");strong.textContent=account.name;name.append(strong);
  const group=document.createElement("small");group.style.color="var(--muted)";group.textContent=" ("+account.group+")";name.append(group);
  debit.textContent=round(account.debit).toLocaleString("en-US",{maximumFractionDigits:6});
  credit.textContent=round(account.credit).toLocaleString("en-US",{maximumFractionDigits:6});
  const net=round(account.credit-account.debit);
  balance.textContent=Math.abs(net).toLocaleString("en-US",{maximumFractionDigits:6})+" "+(net<0?"مدين":"دائن");
  debit.style.color="var(--danger)";credit.style.color="var(--ok)";balance.style.fontWeight="700";
  tr.append(name,debit,credit,balance);
  tr.addEventListener("click",()=>{toggleReportView("accounts");selReportAccount.setValue(account.name,account.name);runAccountStatement();});
  tbody.append(tr);
 }
 const display=n=>round(n).toLocaleString("en-US",{maximumFractionDigits:6});
 const d=document.getElementById("allTotalDebit"),c=document.getElementById("allTotalCredit"),b=document.getElementById("allTotalBalance");
 if(d)d.textContent=display(gDebit);if(c)c.textContent=display(gCredit);
 const net=round(gCredit-gDebit);
 if(b)b.textContent=display(Math.abs(net))+" "+selectedCurrency+" ("+(net<0?"صافي مدين":"صافي دائن")+")";
};
// The all-accounts print/preview must count actual debit/credit legs.
// The previous template counted every compound line as both debit and credit.
const oldStatementPrint=preparePrintStatementTemplate;
preparePrintStatementTemplate=function(accountName,transactions,opening,periodTitle,currencyLabel){
 if(accountName!=="ALL")return oldStatementPrint.apply(this,arguments);
 const currency=reportAdv.active&&reportAdv.currency!=="ALL"?reportAdv.currency:getGlobalCurrency();
 const visible=legs(transactions).filter(leg=>leg.currency===currency),cfg=getHeaderConfig();
 const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
 set("psOrgName",cfg.show?cfg.name||"":"");set("psOrgDetails",cfg.show?cfg.details||"":"");
 set("psStatementTitle","كشف أرصدة كافة الحسابات — "+currency);
 set("psStatementPeriod",periodTitle||"-");set("psGeneratedDate",new Date().toLocaleDateString("en-CA"));
 set("psTxCount",String(visible.length));
 const tbody=document.getElementById("psTableBody");
 let debit=0,credit=0;
 if(tbody){
  tbody.replaceChildren();
  for(const leg of visible){
   const tr=document.createElement("tr"),tx=leg.tx||{};
   const note=leg.meta?.note||Object.values(tx.execution||{})[0]?.note||"";
   const values=[leg.date,String(tx.seqNum||"—"),leg.account+(note?" — "+note:""),leg.debit?round(leg.debit).toLocaleString("en-US",{maximumFractionDigits:6}):"",leg.credit?round(leg.credit).toLocaleString("en-US",{maximumFractionDigits:6}):"",""];
   for(const value of values){const td=document.createElement("td");td.textContent=value;tr.append(td);}
   tbody.append(tr);debit+=Number(leg.debit);credit+=Number(leg.credit);
  }
 }
 const net=round(credit-debit),fmt=n=>round(n).toLocaleString("en-US",{maximumFractionDigits:6});
 set("psTotAlaykom",fmt(debit));set("psTotLakam",fmt(credit));
 set("psNetBal",fmt(Math.abs(net))+" "+(net<0?"مدين":"دائن"));
 set("psTafqitText","فروق تجميع القيود "+currency+": "+fmt(Math.abs(net))+" "+(net<0?"مدين":"دائن"));
 const sum=document.getElementById("psSummaryBlock");if(sum)sum.style.display="";
};
// Independent comparison between the detailed statement rows and trial-balance postings.
// This is diagnostic only; discrepancies NEVER create balancing vouchers.
window.ratibDiagnoseBalanceDifferences=function(transactions=getAllTransactions()){
 const fromLegs=accountTotals(transactions),fromStatements=new Map(),seen=new Set();
 for(const t of raw(transactions)){
  for(const name of new Set([t.isOpeningBalance?t.openingBalance?.account:null,t.debitAccount,t.creditAccount].filter(Boolean))){
   const id=String(t.id)+"|"+name;if(seen.has(id))continue;seen.add(id);
   const e=getAccountEntry(t,[name]);if(!e)continue;
   const currency=e.currency||"YER",amount=getAccountDisplayAmount(e),k=key(name,currency);
   const row=fromStatements.get(k)||{name,currency,debit:0,credit:0};
   if(e.bothSides){row.debit+=amount;row.credit+=amount;}
   else if(e.side==="debit")row.debit+=amount;else row.credit+=amount;
   fromStatements.set(k,row);
  }
 }
 const differences=[];
 for(const k of new Set([...fromLegs.keys(),...fromStatements.keys()])){
  const a=fromLegs.get(k)||{debit:0,credit:0},b=fromStatements.get(k)||{debit:0,credit:0};
  if(Math.abs(a.debit-b.debit)>0.005||Math.abs(a.credit-b.credit)>0.005)
   differences.push({account:(a.name||b.name),currency:(a.currency||b.currency),trialDebit:round(a.debit),trialCredit:round(a.credit),statementDebit:round(b.debit),statementCredit:round(b.credit)});
 }
 return {checked:[...new Set([...fromLegs.keys(),...fromStatements.keys()])].length,differences};
};
function refreshAfterPostedChange(){
 const scrollY=window.scrollY,active=currentActiveTab,requested=accountOpsState?.activeCurrency;
 try{
  if(active==="pageReports"){
   runAccountStatement();
   if(requested&&document.getElementById("reportCurrencyTabs")?.querySelector('[data-currency="'+requested+'"]'))setAccountCurrencyPage(requested,false);
  }else if(active==="pageAccountOperations"&&accountOpsState?.accountName){
   renderAccountOperations(accountOpsState.accountName,accountOpsState.scopeNames,accountOpsUi);
  }else if(active==="pageAccountsTree"&&typeof refreshAccountsTreesPreservingPosition==="function"){
   refreshAccountsTreesPreservingPosition();
  }
  if(document.getElementById("reportsGroupTrialBody")?.classList.contains("open"))runTrialBalanceReport();
  if(active==="pageLedger")renderAllData(true);
  window.dispatchEvent(new CustomEvent("ratib:financial-data-refreshed"));
 }catch(error){console.error("Ratib report refresh failed",error);showToast("حُفظ المستند؛ تعذر تحديث أحد التقارير، افتحه مجددًا.","warn");}
 requestAnimationFrame(()=>window.scrollTo({top:scrollY,behavior:"instant"}));
}
const originalSave=completeFinancialSave;
completeFinancialSave=async function(after){
 return originalSave.call(this,()=>{if(typeof after==="function")after();refreshAfterPostedChange();});
};
if(typeof saveImportedOpeningVoucher==="function"){
 const originalImportedSave=saveImportedOpeningVoucher;
 saveImportedOpeningVoucher=async function(...args){const ok=await originalImportedSave.apply(this,args);if(ok)refreshAfterPostedChange();return ok;};
}
if(typeof saveImportedRecordCorrection==="function"){
 const originalImportedCorrection=saveImportedRecordCorrection;
 saveImportedRecordCorrection=async function(...args){const result=await originalImportedCorrection.apply(this,args);refreshAfterPostedChange();return result;};
}
// Remember the exact statement filters before leaving it to edit or copy a posted voucher.
const originalMultiEditor=openMultiVoucherEditor;
openMultiVoucherEditor=function(item){
 if(!quickVoucherOrigin&&["pageReports","pageAccountOperations"].includes(currentActiveTab))rememberQuickVoucherOrigin(currentActiveTab);
 return originalMultiEditor.call(this,item);
};
function canClone(item){
 if(!item||item.isOpeningBalance||item.isImportedOpeningVoucher||["deleted","reversed"].includes(item.status))return false;
 return item.isMultiVoucher?(item.multiVoucher?.mode||item.voucherMode)==="multi-entry":item.voucherMode==="entry";
}
function cloneEntry(item){
 if(!quickVoucherOrigin&&["pageReports","pageAccountOperations"].includes(currentActiveTab))rememberQuickVoucherOrigin(currentActiveTab);
 navigateToTab("pageExpenses",true);selectVoucherTypeDirect("entry");
 selDebitAcc.setValue(item.debitAccount||"",item.debitAccount||"",item.debitAccountId||"");
 selCreditAcc.setValue(item.creditAccount||"",item.creditAccount||"",item.creditAccountId||"");
 const values={voucherAmountInput:Number(item.amount||0),voucherCurrencySelect:item.currency||"YER",voucherDateInput:getLocalTodayISO(),voucherNoteInput:Object.values(item.execution||{})[0]?.note||"",voucherRecipientInput:item.recipient||""};
 for(const [id,value] of Object.entries(values)){const input=document.getElementById(id);if(input)input.value=value;}
 const dist=item.distribution||{};
 for(const c of getCats()){
  const data=dist[c.id],amount=Number(data?.amount||0);
  voucherCatStates[c.id]={enabled:amount>0,amount,pct:Number(item.amount)>0?100*amount/Number(item.amount):0};
 }
 if(!Object.values(voucherCatStates).some(x=>x.enabled)){const general=getCats().find(x=>x.id==="general");if(general)voucherCatStates[general.id]={enabled:true,amount:Number(item.amount),pct:100};}
 renderVoucherCategoriesList();hasUnsavedChanges=true;
}
function cloneVoucher(item){
 if(!canClone(item)){showToast("استنساخ القيود الافتتاحية أو الملغاة غير مسموح لتفادي ازدواج الأرصدة.","warn");return;}
 document.getElementById("longPressConfirmModal")?.classList.remove("show");
 pendingLongPressTx=null;
 if(!item.isMultiVoucher){cloneEntry(item);showToast("نسخة مستقلة للمراجعة؛ لن تؤثر على الأرصدة قبل الحفظ.","info");return;}
 openMultiVoucherEditor(item);
 multiVoucherDraftId="";
 multiVoucherLines=multiVoucherLines.map(l=>({...l,id:"ml_"+Date.now()+"_"+Math.random().toString(36).slice(2)}));
 document.getElementById("multiVoucherSeqBadge").textContent="رقم: "+getNextMultiVoucherNumber();
 document.getElementById("multiVoucherDate").value=getLocalTodayISO();
 hasUnsavedChanges=true;
 renderMultiVoucherLines();
 showToast("قيد مستنسخ غير مرحّل؛ عدّل البنود ثم احفظه برقم جديد.","info");
}
const editButton=document.getElementById("confirmEditDocBtn");
if(editButton){
 const cloneButton=document.createElement("button");
 cloneButton.id="ratibCloneVoucherBtn";cloneButton.type="button";cloneButton.className="btn btn-ghost";
 cloneButton.textContent="⧉ استنساخ القيد";
 editButton.after(cloneButton);
 cloneButton.onclick=()=>cloneVoucher(pendingLongPressTx);

 // Keep the original buttons and their click handlers intact; only reflow their presentation.
 const detailActions=editButton.parentElement;
 if(detailActions){
  detailActions.classList.add("ratib-doc-actions");
  const shapes={
   edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
   clone:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
   delete:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
   ok:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'
  };
  const spec=[
   [editButton,"edit","تعديل"],
   [cloneButton,"clone","استنساخ"],
   [document.getElementById("deleteDocBtn"),"delete","حذف"],
   [document.getElementById("cancelEditDocBtn"),"ok","موافق"]
  ];
  for(const [button,kind,label] of spec){
   if(!button)continue;
   button.classList.add("ratib-doc-action","ratib-doc-action-"+kind);
   button.innerHTML='<span class="ratib-doc-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true">'+shapes[kind]+'</svg></span><span class="ratib-doc-action-label">'+label+'</span>';
   button.setAttribute("aria-label",kind==="clone"?"استنساخ القيد":label);
   button.title=kind==="clone"?"استنساخ القيد":label;
  }
 }
 const previousOpen=openDocumentDetailsModal;
 openDocumentDetailsModal=function(item){
  previousOpen.call(this,item);
  cloneButton.hidden=!canClone(item);
  detailActions?.classList.toggle("ratib-doc-actions-three",cloneButton.hidden);
 };
}
})();
