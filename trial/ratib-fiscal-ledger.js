(function ratibTrialFiscalRollover(){
"use strict";
const dateOf=t=>String(t?.isoDate||t?.date|| (t?.timestamp?new Date(t.timestamp).toISOString().slice(0,10):"")).slice(0,10);
const closings=()=>store.get("annual_closures_v1",{})||{};
const activeClosings=()=>Object.values(closings()).sort((a,b)=>Number(a.year)-Number(b.year));
const lastYear=()=>activeClosings().at(-1)?.year||"";
let chosenYear="auto";
const yearResolved=()=>chosenYear==="auto"?(lastYear()?String(Number(lastYear())+1):"all"):chosenYear;
const money=x=>Number(x||0).toLocaleString("en-US",{maximumFractionDigits:6});
const all=()=>getAllTransactions();
const active=tx=>tx&&tx.status!=="deleted"&&tx.status!=="reversed";
const dateYear=t=>dateOf(t).slice(0,4);
const catalog=()=>new Map(getCanonicalCatalog().flatMap(g=>(g.details||[]).map(([code,name])=>[name,String(code)])));
function filtered(transactions){
 const year=yearResolved();
 const seen=new Set();
 return (Array.isArray(transactions)?transactions:[]).filter(tx=>{
  if(!tx||!tx.id)return false;
  const key=String(tx.id);
  if(seen.has(key))return false;
  seen.add(key);
  return year==="all"||dateYear(tx)===year;
 });
}
window.ratibFiscalVisibleLedgerTransactions=filtered;
const $=id=>document.getElementById(id);
const sel=document.createElement("select");
sel.id="ratibFiscalLedgerYear";sel.setAttribute("aria-label","السنة المالية المعروضة في سجل المستندات");
sel.style.cssText="width:auto;max-width:100%;min-height:39px;font-size:13px;padding:6px 9px;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:8px";
const top=document.createElement("section");
top.id="ratibFiscalLedgerBar";top.className="no-print";
top.style.cssText="margin:10px 0;padding:11px;border:1px solid var(--border);border-radius:12px;background:var(--card);direction:rtl";
const label=document.createElement("label");label.setAttribute("for","ratibFiscalLedgerYear");label.textContent="السنة المالية في السجل  ";
const note=document.createElement("small");note.id="ratibFiscalYearNotice";note.style.cssText="display:block;margin:6px 0 0;color:var(--muted);font-size:12px;line-height:1.6";
label.appendChild(sel);top.append(label,note);
const balances=document.createElement("section");
balances.id="ratibFiscalOpeningBalances";
balances.style.cssText="margin:10px 0;border:1px solid var(--border);background:var(--card);border-radius:12px;padding:12px;direction:rtl";
const ledger=$("ledgerList");
if(ledger?.parentNode){ledger.parentNode.insertBefore(top,ledger);ledger.parentNode.insertBefore(balances,ledger);}
const style=document.createElement("style");style.textContent=`
#ratibFiscalOpeningBalances[hidden],#ratibFiscalLedgerBar[hidden]{display:none!important}
#ratibFiscalOpeningBalances summary{font-weight:700;cursor:pointer;color:var(--accent);font-size:14px}
#ratibFiscalOpeningBalances .ratib-rollover-table{width:100%;min-width:360px;border-collapse:collapse;font-size:12px;line-height:1.6}
#ratibFiscalOpeningBalances .ratib-rollover-table th,#ratibFiscalOpeningBalances .ratib-rollover-table td{padding:6px 7px;border-bottom:1px solid var(--border);text-align:right}
#ratibFiscalOpeningBalances .ratib-rollover-total{font-size:12px;color:var(--muted);padding:5px 0}
#ratibFiscalOpeningBalances .ratib-rollover-flag{color:var(--danger);font-size:12px;line-height:1.5}
#ratibFiscalLedgerBar label{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;font-weight:700}
@media print{#ratibFiscalLedgerBar{display:none!important}}`;
document.head.append(style);
function allYears(){
 const years=new Set(all().map(dateYear).filter(x=>/^\d{4}$/.test(x)));
 for(const y of Object.keys(closings())){years.add(y);years.add(String(Number(y)+1));}
 return [...years].sort((a,b)=>Number(b)-Number(a));
}
function refreshOptions(){
 const year=yearResolved();
 const years=allYears();
 const options=[];
 if(lastYear())options.push({value:"auto",label:`${String(Number(lastYear())+1)} — السنة الجديدة (الرصيد المُدوّر)`});
 else options.push({value:"auto",label:"جميع السنوات — لم تُغلق أي سنة بعد"});
 for(const y of years){
  if(lastYear()&&y===String(Number(lastYear())+1))continue;
  const item=closings()[y];
  options.push({value:y,label:`${y} — ${item?(item.simulation?"أرشيف محاكاة الإغلاق":"سنة مغلقة"):"سنة مفتوحة أو تاريخية"}`});
 }
 options.push({value:"all",label:"أرشيف جميع السنوات"});
 const values=new Set(options.map(x=>x.value));
 if(chosenYear!=="auto"&&!values.has(chosenYear))chosenYear="auto";
 sel.innerHTML=options.map(x=>`<option value="${x.value}">${x.label}</option>`).join("");
 sel.value=chosenYear;
 const activeYear=yearResolved();
 if(lastYear()&&activeYear===String(Number(lastYear())+1)){
  note.textContent=`عرض سجل السنة ${activeYear} فقط. سندات ${lastYear()} وما قبلها محفوظة في الأرشيف ويمكن عرضها من القائمة. أرصدة الحسابات الدائمة مُدوّرة دون إنشاء سندات افتتاحية مكررة.`;
 }else if(closings()[activeYear]){
  note.textContent=`أرشيف السنة المالية ${activeYear}: السندات محفوظة للعرض والطباعة، والتعديل محظور ما دامت السنة مغلقة.`;
 }else if(activeYear==="all"){
  note.textContent="عرض شامل للأرشيف التاريخي. لن تُحذف أي عملية عند تغيير هذا الاختيار.";
 }else note.textContent=`عرض السندات المؤرخة خلال السنة ${activeYear} فقط.`;
}
function calculatedOpening(start){
 const map=new Map(),unknown=new Set(),codes=catalog(),prior=all().filter(t=>active(t)&&dateOf(t)&&dateOf(t)<start);
 const seen=new Set();
 for(const tx of prior){
  if(seen.has(String(tx.id)))continue;
  seen.add(String(tx.id));
  const names=new Set([tx.debitAccount,tx.creditAccount,tx.openingBalance?.account].filter(Boolean));
  for(const name of names){
   const entry=getAccountEntry(tx,[name]);
   if(!entry)continue;
   const amount=Number(getAccountDisplayAmount(entry));if(!Number.isFinite(amount))continue;
   const delta=entry.bothSides?0:(entry.side==="debit"?-amount:amount);
   const currency=entry.currency||tx.currency||"YER",code=codes.get(name)||String(getAccountCode(name)||"");
   const key=name+"\x1f"+currency;
   const old=map.get(key)||{name,currency,code,balance:0};
   old.balance+=delta;map.set(key,old);
  }
 }
 const balances=[];
 for(const row of map.values()){
  row.balance=Math.round(row.balance*1000000)/1000000;
  if(Math.abs(row.balance)<0.0000005)continue;
  if(/^[45]/.test(row.code)){unknown.add(`الحساب المؤقت «${row.name}» (${row.currency}) ما زال يحمل رصيدًا بعد الإقفال؛ راجع قيود الإغلاق.`);continue;}
  if(!/^[123]/.test(row.code))unknown.add(`حساب غير مصنف «${row.name}» (${row.currency}) — تحقق من التصنيف قبل ترحيل الرصيد.`);
  balances.push(row);
 }
 balances.sort((a,b)=>a.currency.localeCompare(b.currency)||a.code.localeCompare(b.code,undefined,{numeric:true}));
 return {balances,unknown:[...unknown],previousRecords:prior.length};
}
function renderOpening(){
 const year=yearResolved(),priorClose=closings()[String(Number(year)-1)];
 if(year==="all"||!priorClose){balances.hidden=true;balances.innerHTML="";return;}
 balances.hidden=false;
 const {balances:rows,unknown}=calculatedOpening(year+"-01-01");
 const printLabel=priorClose.simulation?"محاكاة تدوير أرصدة":"تدوير أرصدة";
 const toptext=`${printLabel} ${priorClose.year} ← ${year} (أرصدة افتتاحية، وليست مستندات جديدة)`;
 const body=rows.length?rows.map((r,i)=>`<tr><td>${esc(r.name)}</td><td>${esc(r.code)}</td><td>${esc(r.currency)}</td><td style="font-weight:700" dir="ltr">${money(Math.abs(r.balance))}</td><td>${r.balance<0?"مدين":"دائن"}</td><td><button type="button" class="btn btn-ghost ratib-rollover-open" data-i="${i}" style="min-height:31px;width:auto;padding:3px 8px;font-size:11px">كشف الحساب</button></td></tr>`).join(""):`<tr><td colspan="6">لا توجد أرصدة دائمة غير صفرية مُرحّلة.</td></tr>`;
 balances.innerHTML=`<details open><summary>↪ ${esc(toptext)} — ${rows.length} حساب</summary>
 <div class="ratib-rollover-total">السندات القديمة محفوظة في أرشيف ${esc(priorClose.year)}. جميع الأرصدة حسب العملة الأصلية، دون جمع عملات مختلفة.</div>
 <div style="overflow:auto"><table class="ratib-rollover-table"><thead><tr><th>الحساب</th><th>الرقم</th><th>العملة</th><th>الرصيد المدور</th><th>الطبيعة</th><th>كشف</th></tr></thead><tbody>${body}</tbody></table></div>
 ${unknown.map(x=>`<p class="ratib-rollover-flag">⚠ ${esc(x)}</p>`).join("")}
 </details>`;
 balances.querySelectorAll('.ratib-rollover-open').forEach(button=>{
  button.addEventListener('click',()=>{
   const row=rows[Number(button.dataset.i)];
   if(!row)return;
   openAccountFromPager(row.name,[row.name],row.currency);
   accountOpsState.from=year+'-01-01';
   accountOpsState.to=year+'-12-31';
   accountOpsState.filtered=true;
   accountOpsState.currency=row.currency;
   accountOpsState.activeCurrency=row.currency;
   const from=$('accountOpsFromDate'),to=$('accountOpsToDate');
   if(from)from.value=accountOpsState.from;
   if(to)to.value=accountOpsState.to;
   renderAccountOperations(row.name,[row.name]);
  });
 });
}
function refresh(){
 if(!ledger)return;
 refreshOptions();renderOpening();
}
const prior=renderAllData;
renderAllData=function(...args){
 const result=prior.apply(this,args);
 if(currentActiveTab==="pageLedger"||args[0]===true)refresh();
 return result;
};
sel.addEventListener("change",()=>{
 chosenYear=sel.value;
 ledgerVisibleLimit=50;
 renderAllData(true);
});
window.addEventListener("ratib:annual-close-changed",()=>{
 chosenYear="auto";
 if(currentActiveTab==="pageLedger")renderAllData(true);
 else refresh();
});
refresh();
})();
