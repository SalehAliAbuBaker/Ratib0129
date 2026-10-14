(function annualCloseTrial(){
"use strict";
const IS_TRIAL=Boolean(document.getElementById("ratibTrialBanner"));
const YEAR_KEY="annual_closures_v1",SESSION_KEY="year_correction_sessions_v1",REVISION_KEY="year_correction_history_v1";
const getSessions=()=>store.get(SESSION_KEY,{})||{};
const getRevisionHistory=()=>store.get(REVISION_KEY,[])||[];
function yearOwnDocument(tx,year){return dateOf(tx).slice(0,4)===year&&!tx?.ratibAnnualClosingYear;}
function fingerprint(tx){const t=JSON.stringify(tx);let hash=2166136261;for(let i=0;i<t.length;i++){hash^=t.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16)+":"+t.length;}
function yearCorrections(year,session){
 const prev=new Map(Object.entries(session?.original||{})),current=new Map(all().filter(t=>yearOwnDocument(t,year)).map(t=>[String(t.id),t]));
 const added=[],edited=[],removed=[];
 for(const [id,original] of prev){const t=current.get(id);if(!t||['reversed','deleted'].includes(t.status))removed.push(id);else if(fingerprint(t)!==original)edited.push(id);}
 for(const [id,t] of current)if(!prev.has(id)&&!['reversed','deleted'].includes(t.status))added.push(id);
 return {added:added.length,edited:edited.length,removed:removed.length,addedIds:added,editedIds:edited,removedIds:removed};
}
function yearHistory(event,year,details){store.set(REVISION_KEY,[...getRevisionHistory(),{event,year,at:new Date().toISOString(),...details}]);}

const getYears=()=>store.get(YEAR_KEY,{})||{};
const copy=value=>structuredClone(value);
const dateOf=tx=>String(tx?.isoDate||tx?.date||"").slice(0,10);
const nowDate=()=>getLocalTodayISO();
const fmt=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:3});
const round=n=>Math.round((Number(n)||0)*1000000)/1000000;
const all=(p=store.get("plan",null),h=store.get("history",[]))=>[...(p?.transactions||[]),...(Array.isArray(h)?h:[]).flatMap(i=>i?.transactions||[])];
const closed=()=>Object.values(getYears()).sort((a,b)=>Number(a.year)-Number(b.year));
let lastSaved=null,restoring=false,hasBackup=false;
function saveState(){lastSaved={plan:copy(store.get("plan",null)),history:copy(store.get("history",[]))};}
function baseline(){const m=new Map();for(const y of closed())for(const tx of y.snapshots||[])m.set(String(tx.id),JSON.stringify(tx));return m;}
function validateLocked(p,h){
 const list=closed();if(!list.length)return "";
 const limit=list.at(-1).cutoff,original=baseline(),seen=new Set();
 for(const tx of all(p,h)){
  const date=dateOf(tx),id=String(tx?.id||"");
  if(!date||date>limit)continue;
  if(!original.has(id))return "لا يجوز تسجيل عملية بتاريخ "+date+" لأن السنة مغلقة.";
  // Month archival briefly holds the same transaction in plan and history; allow this only if identical.
  seen.add(id);
  if(JSON.stringify(tx)!==original.get(id))return "هذا السند يعود لسنة مالية مغلقة، ولا يجوز تعديله أو إلغاؤه.";
 }
 for(const id of original.keys())if(!seen.has(id))return "تعذر الحفظ لأن مستندًا من سنة مغلقة حُذف أو تغير تاريخه.";
 return "";
}
function rollback(){
 if(restoring||!lastSaved)return;
 restoring=true;
 try{store._setSilent("plan",copy(lastSaved.plan));store._setSilent("history",copy(lastSaved.history));}
 finally{restoring=false;}
}
const oldSet=store.set;
store.set=function(k,v){
 if(restoring||!["plan","history"].includes(k)){
  const result=oldSet.call(this,k,v);
  return result;
 }
 const error=validateLocked(k==="plan"?v:store.get("plan",null),k==="history"?v:store.get("history",[]));
 if(error){rollback();showToast("🔒 "+error,"error",6000);throw Error(error);}
 const result=oldSet.call(this,k,v);saveState();return result;
};
const oldSilent=store._setSilent;
store._setSilent=function(k,v){
 if(!restoring&&["plan","history"].includes(k)){
  const e=validateLocked(k==="plan"?v:store.get("plan",null),k==="history"?v:store.get("history",[]));
  if(e){rollback();throw Error(e);}
 }
 const result=oldSilent.call(this,k,v);
 if(!restoring&&["plan","history"].includes(k))saveState();
 return result;
};
if(typeof _replacePersistentData==="function"){
 const oldReplace=_replacePersistentData;
 _replacePersistentData=async function(records){
  if(closed().length){
   const e=validateLocked(records[APP_STORAGE_PREFIX+"plan"]||null,records[APP_STORAGE_PREFIX+"history"]||[]);
   if(e)throw Error("لا يمكن استعادة بيانات تمس سنوات مغلقة. أعد فتحها قبل الاستعادة. "+e);
  }
  return oldReplace.apply(this,arguments);
 };
}
saveState();
if(typeof proceedAppInit==='function'){
 const originalInit=proceedAppInit;
 proceedAppInit=function(...args){
  // Refresh the last safe snapshot after the encrypted vault has been unlocked.
  saveState();
  const result=originalInit.apply(this,args);
  saveState();
  return result;
 };
}
const originalRemove=store.remove;
store.remove=function(key){
 if(['plan','history'].includes(key)&&closed().length){
  const error='لا يمكن حذف دفتر السنة المالية المغلقة. أعد فتحها أولًا.';
  showToast('🔒 '+error,'error',6000);throw Error(error);
 }
 return originalRemove.call(this,key);
};
function catalog(){
 const map=new Map();
 for(const group of getCanonicalCatalog())for(const detail of group.details||[])map.set(detail[1],String(detail[0]||""));
 return map;
}
function preview(year){
 const cutoff=year+"-12-31",begin=year+"-01-01",codes=catalog(),balances=new Map(),unknown=new Set();
 const eligible=all().filter(t=>!["deleted","reversed"].includes(t.status)&&dateOf(t)&&dateOf(t)<=cutoff);
 for(const tx of eligible){
  const names=new Set([tx.debitAccount,tx.creditAccount,tx.openingBalance?.account].filter(Boolean));
  for(const name of names){
   const e=getAccountEntry(tx,[name]);if(!e)continue;
   const amount=Number(getAccountDisplayAmount(e));if(!Number.isFinite(amount)||amount<0)throw Error("المبلغ غير صالح في المستند "+tx.id);
   const cur=e.currency||"YER",key=name+"\u0001"+cur;
   const item=balances.get(key)||{name,currency:cur,code:codes.get(name)||"",balance:0,activity:0};
   const delta=e.bothSides?0:(e.side==="credit"?amount:-amount);
   item.balance=round(item.balance+delta);
   if(dateOf(tx)>=begin)item.activity=round(item.activity+delta);
   balances.set(key,item);
  }
 }
 const rows=[...balances.values()];
 for(const r of rows)if(!/^[1-5]/.test(r.code))unknown.add(r.name);
 const equity=[...codes.entries()].filter(([name,code])=>code.startsWith("3102")&&name.includes("الأرباح المبقاة"));
 return {cutoff,rows,eligible,unknown:[...unknown],retained:equity.length===1?equity[0][0]:""};
}
function closingEntries(year){
 const info=preview(year),byCurrency=new Map();
 for(const a of info.rows){
  if(!["4","5"].includes(a.code.slice(0,1))||Math.abs(a.balance)<0.000001)continue;
  const cur=a.currency,lines=byCurrency.get(cur)||[];
  lines.push({account:a.name,side:a.balance>0?"debit":"credit",currency:cur,amount:Math.abs(a.balance),base:Math.abs(a.balance),rate:1,budgetId:"general",note:"إقفال حساب "+a.name});
  byCurrency.set(cur,lines);
 }
 const journals=[];
 for(const [currency,lines] of byCurrency){
  const income=round(lines.reduce((sum,l)=>sum+(l.side==="debit"?l.amount:-l.amount),0));
  if(Math.abs(income)>0.000001)lines.push({account:info.retained,side:income>0?"credit":"debit",currency,amount:Math.abs(income),base:Math.abs(income),rate:1,budgetId:"general",note:"ترحيل نتيجة السنة للأرباح المبقاة"});
  const debit=round(lines.filter(l=>l.side==="debit").reduce((s,l)=>s+l.amount,0));
  const credit=round(lines.filter(l=>l.side==="credit").reduce((s,l)=>s+l.amount,0));
  if(Math.abs(debit-credit)>0.000001)throw Error("قيد الإقفال غير متوازن: "+currency);
  journals.push({currency,lines,debit,credit,income});
 }
 return {info,journals};
}
function earlierYears(year){
 return [...new Set(all().filter(t=>!["deleted","reversed"].includes(t.status)&&dateOf(t)&&dateOf(t)<year+"-01-01").map(t=>dateOf(t).slice(0,4)))].filter(y=>!getYears()[y]).sort();
}
function yearIsPast(year){return /^\d{4}$/.test(year)&&year<nowDate().slice(0,4);}
function isCurrentYearTrial(year){return /^\d{4}$/.test(year)&&year===nowDate().slice(0,4);}
function currentYearSimulation(year){return IS_TRIAL&&isCurrentYearTrial(year)&&Boolean(document.getElementById('yearToolSimulateCurrent')?.checked);}
function eligibleToClose(year){return yearIsPast(year)||currentYearSimulation(year);}
function writeJournal(year,proposal,index){
 const date=year+"-12-31",id="ratib_year_end_"+year+"_"+proposal.currency+"_"+Date.now()+"_"+index,seq=getNextMultiVoucherNumber()+index;
 const doc={id,mode:"multi-entry",seq,date,baseCurrency:proposal.currency,note:"قيد الإغلاق السنوي "+year,lines:proposal.lines};
 const txs=proposal.lines.map((line,i)=>({
  id:id+"_"+i,multiVoucherId:id,isMultiVoucher:true,ratibAnnualClosingYear:year,seqNum:seq,
  timestamp:new Date(date).getTime(),isoDate:date,date,amount:line.amount,currency:line.currency,isExpense:false,
  voucherMode:"multi-entry",debitAccount:line.side==="debit"?line.account:"",creditAccount:line.side==="credit"?line.account:"",
  type:"إقفال سنوي "+year,multiVoucher:doc,status:"posted",schemaVersion:APP_SCHEMA_VERSION,
  distribution:{},execution:{},recipient:"",updatedAt:new Date().toISOString()
 }));
 return {id,txs};
}
const root=document.createElement("div");
root.className="ratib-annual-trial no-print";
root.innerHTML=`<button type="button" id="yearToolOpen" class="btn btn-ghost" style="width:auto;margin:8px 0">🔒 الإغلاق السنوي (تجريبي)</button>
<div id="yearToolOverlay" class="modal-overlay" style="display:none;align-items:center;justify-content:center;z-index:100005" role="dialog" aria-modal="true" aria-label="الإغلاق السنوي">
<div class="modal-box" style="width:95vw;max-width:750px;max-height:85vh;overflow:auto;text-align:right">
<h2>الإغلاق السنوي للحسابات — نسخة اختبار</h2>
<p class="field-hint">الإغلاق يمنع تعديل القيود التاريخية ويُنشئ قيود إقفال الإيرادات والمصروفات حسب كل عملة. الأرصدة الدائمة تُرحّل إلى السنة التالية في كشوفها تلقائيًا دون تكرار القيد الافتتاحي.</p>
<div style="padding:10px;background:#fff8e4;border:1px solid #e8bd64;border-radius:10px;color:#663c0b;font-size:13px;line-height:1.7">
<label style="display:flex;align-items:center;gap:7px;cursor:pointer"><input type="checkbox" id="yearToolSimulateCurrent" style="min-width:20px;width:20px;height:20px;margin:0"> 🧪 السماح بمحاكاة إغلاق سنة 2026 الجارية (النسخة التجريبية فقط)</label>
<div style="font-size:12px">هذا الاختبار يُنشئ قيود إقفال تجريبية مؤرخة 31/12/2026 ويقفل حركات 2026 في النسخة التجريبية حتى إعادة فتح السنة. <strong>لا يغيّر أي بيانات في التطبيق الرسمي، وليس إقفالًا سنويًا معتمدًا.</strong></div>
</div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label>السنة <input type="number" id="yearToolYear" min="2000" max="2100" style="width:115px"></label><button type="button" class="btn btn-ghost" id="yearToolPreview" style="width:auto">معاينة</button></div>
<div id="yearToolInfo" style="max-height:43vh;overflow:auto;font-size:13px;line-height:1.8"></div>
<div style="display:flex;gap:7px;flex-wrap:wrap">
<button type="button" class="btn btn-ghost" id="yearToolBackup" style="width:auto">⬇ نسخة احتياطية شاملة لجميع السنوات</button>
<button type="button" class="btn btn-primary" id="yearToolClose" style="width:auto">✓ اعتماد الإغلاق</button>
<button type="button" class="btn btn-danger" id="yearToolReopen" style="width:auto">✎ إعادة فتح السنة للتصحيح</button>
</div>
<div style="padding:9px;border:1px solid var(--border);border-radius:9px;margin:10px 0">
<label for="yearToolReason" style="display:block;font-size:13px;font-weight:700">سبب إعادة فتح السنة للتعديل (إلزامي)</label>
<textarea id="yearToolReason" rows="2" placeholder="مثال: تصحيح مبلغ سند صرف رقم 18" style="width:100%;box-sizing:border-box;padding:8px;font:inherit"></textarea>
<small style="display:block;color:var(--muted);line-height:1.6;margin-top:5px">للسماح بتعديل السنة المغلقة يجب تنزيل نسخة شاملة وذكر السبب وإعادة فتح آخر سنة مغلقة. بعدها عدّل السند، ثم أعِد الإغلاق لتحديث الأرصدة المدورة.</small>
</div><p id="yearToolMessage" role="status" style="font-size:12px"></p>
<button type="button" class="btn btn-ghost" id="yearToolDismiss" style="width:auto">رجوع</button>
</div></div>`;
if(!IS_TRIAL){
 root.innerHTML=root.innerHTML.replaceAll("الإغلاق السنوي (تجريبي)","الإغلاق السنوي").replaceAll("الإغلاق السنوي للحسابات — نسخة اختبار","الإغلاق السنوي للحسابات");
 const simulator=root.querySelector("#yearToolSimulateCurrent");
 if(simulator){simulator.checked=false;simulator.disabled=true;const wrapper=simulator.closest("div");if(wrapper)wrapper.style.display="none";}
}
(document.getElementById("pageReports")||document.getElementById("pageAccountsTree")||document.body).append(root);
const $=id=>root.querySelector("#"+id),current=()=>String(Number($("yearToolYear").value)||""),message=(s,bad=false)=>{$("yearToolMessage").textContent=s;$("yearToolMessage").style.color=bad?"var(--danger)":"var(--ok)";};
function draw(){
 const year=current(),saved=getYears()[year],earlier=earlierYears(year);
 let html="<p>السنة "+year+" — "+(saved?(saved.simulation?"🧪 إغلاق تجريبي لمحاكاة 2026":"🔒 مغلقة"):"مفتوحة")+"</p>";
 if(isCurrentYearTrial(year)){
  html+=IS_TRIAL?'<p style="color:var(--warn)">2026 سنة جارية. لتجربة الإقفال عليها فعّل خيار «محاكاة إغلاق سنة 2026» أعلاه.</p>':'<p style="color:var(--danger)">لا يجوز إغلاق السنة الحالية قبل انتهاء 31 ديسمبر في الرسمية.</p>';
  if(currentYearSimulation(year))html+='<p style="color:var(--ok)">🧪 محاكاة مُفعّلة: ستُغلق السنة افتراضيًا حتى 31/12/2026 على نسخة الاختبار فقط.</p>';
 }else if(!yearIsPast(year))html+='<p style="color:var(--danger)">لا يجوز إقفال سنة مستقبلية، ويمكن إقفال سنة ماضية فقط.</p>';
 if(earlier.length)html+='<p style="color:var(--danger)">يلزم إغلاق السنوات السابقة أولًا: '+earlier.join("، ")+"</p>";
 try{
  const {info,journals}=closingEntries(year);
  html+="<p>الحركات حتى نهاية السنة: "+info.eligible.length+"، الأرصدة التفصيلية: "+info.rows.length+"، قيود الإقفال المقترحة: "+journals.length+"</p>";
  if(info.unknown.length)html+='<p style="color:var(--danger)">حسابات بلا رقم تصنيف معتبر: '+info.unknown.map(esc).join("، ")+"</p>";
  if(journals.length&&!info.retained)html+='<p style="color:var(--danger)">حساب الأرباح المبقاة غير موجود أو غير محدد برقم صحيح (3102).</p>';
  html+='<details open><summary>ميزان تفصيلي حتى تاريخ الإغلاق</summary><div style="overflow:auto"><table style="min-width:440px;width:100%;border-collapse:collapse"><tr><th>الحساب</th><th>العملة</th><th>المدين/الدائن (دائن - مدين)</th></tr>';
  html+=info.rows.map(r=>"<tr><td>"+esc(r.name)+"</td><td>"+esc(r.currency)+"</td><td dir='ltr'>"+fmt(r.balance)+"</td></tr>").join("");
  html+="</table></div></details>";
  if(journals.length){html+='<details><summary>معاينة قيود إقفال الأرباح والخسائر</summary>';for(const doc of journals){html+="<p>"+esc(doc.currency)+": "+fmt(doc.debit)+" مدين = "+fmt(doc.credit)+" دائن</p>";for(const l of doc.lines)html+="<div>"+esc(l.account)+" — "+(l.side==="debit"?"مدين":"دائن")+" "+fmt(l.amount)+"</div>";}html+="</details>";}
  if(saved)html+='<p style="color:var(--ok)">'+(saved.simulation?"🧪 محاكاة أُجريت في ":"✓ تاريخ الاعتماد ")+esc(saved.closedAt)+"، المستندات المحمية "+saved.snapshots.length+"</p>";
 const session=getSessions()[year];
 if(session)html+='<p style="color:var(--danger);font-weight:700">✎ هذه السنة مفتوحة للتصحيح منذ '+esc(session.reopenedAt)+' — السبب: '+esc(session.reason)+'. أعِد الإغلاق بعد التصحيح.</p>';
 const history=getRevisionHistory().filter(e=>e.year===year);
 if(history.length)html+='<details><summary>سجل إجراءات السنة ('+history.length+')</summary>'+history.map(e=>'<p style="border-bottom:1px solid var(--border);padding:4px">'+esc(e.at)+' — '+(e.event==='reopen'?'إعادة فتح':'إعادة إغلاق')+' — '+esc(e.reason||'')+(e.changes?' — جديد: '+e.changes.added+'، تعديل: '+e.changes.edited+'، إلغاء: '+e.changes.removed:'')+'</p>').join('')+'</details>';
 }catch(e){html+='<p style="color:var(--danger)">'+esc(e.message)+"</p>";}
 $("yearToolInfo").innerHTML=html;
 $("yearToolClose").disabled=Boolean(saved)||!eligibleToClose(year)||earlier.length>0;
 $("yearToolClose").textContent=getSessions()[year]?"✓ إعادة الإغلاق بعد التصحيح":currentYearSimulation(year)?"🧪 تنفيذ محاكاة الإغلاق":"✓ اعتماد الإغلاق";
 $("yearToolReopen").disabled=!saved||closed().some(x=>Number(x.year)>Number(year));
}
$("yearToolOpen").onclick=()=>{$("yearToolYear").value=nowDate().slice(0,4);$("yearToolSimulateCurrent").checked=false;$("yearToolOverlay").style.display="flex";hasBackup=false;draw();};
$("yearToolDismiss").onclick=()=>{$("yearToolOverlay").style.display="none";};
$("yearToolPreview").onclick=()=>{hasBackup=false;draw();};
$("yearToolSimulateCurrent").onchange=()=>{hasBackup=false;draw();};
$("yearToolYear").onchange=()=>{hasBackup=false;draw();};
$("yearToolBackup").onclick=async()=>{try{await flushStorage();hasBackup=await exportBackupFile();message(hasBackup?"تم تجهيز النسخة الاحتياطية. احتفظ بها.":"تعذر إنشاء النسخة الاحتياطية.",!hasBackup);}catch(e){hasBackup=false;message(e.message,true);}};
$("yearToolClose").onclick=async()=>{
 const year=current();if(!hasBackup){message("يجب تنزيل نسخة أمان قبل اعتماد الإغلاق.",true);return;}
 if(!eligibleToClose(year)||getYears()[year]||earlierYears(year).length){message(IS_TRIAL?"السنة غير مؤهلة للإغلاق. فعّل المحاكاة إذا كانت السنة جارية، أو راجع السنوات السابقة.":"السنة غير مؤهلة للإغلاق؛ لا يجوز إغلاق السنة الحالية قبل انتهائها.",true);return;}
 const {info,journals}=closingEntries(year);
 if(!info.eligible.length||info.unknown.length||(journals.length&&!info.retained)){message("راجع الحسابات والأرصدة والتصنيفات قبل الإغلاق.",true);return;}
 const correction=getSessions()[year]||null;
 const changes=correction?yearCorrections(year,correction):null;
 const simulation=currentYearSimulation(year);
 const confirmText=(simulation?"محاكاة ":"إغلاق ")+year;
 if(prompt((simulation?"هذا اختبار على بيانات التجريبية فقط. ستنشأ قيود الإقفال بتاريخ 31/12/2026، وستُقفل عمليات 2026 إلى أن تعيد فتحها. ":"سيُقفل راتب قيود السنة ويُنشئ سندات التسوية. ")+"للتأكيد اكتب: "+confirmText)!==confirmText)return;
 const priorPlan=copy(store.get("plan",null)),priorHistory=copy(store.get("history",[]));
 try{
  const p=getMasterPlan(),ids=[];
  const nextSequence=getNextMultiVoucherNumber();
  journals.forEach((doc,i)=>{
   const r=writeJournal(year,doc,i);
   for(const tx of r.txs){tx.seqNum=nextSequence+i;tx.multiVoucher.seq=nextSequence+i;}
   p.transactions.push(...r.txs);ids.push(r.id);
  });
  store.set("plan",p);
  const records={...getYears(),[year]:{year,cutoff:info.cutoff,closedAt:new Date().toISOString(),simulation,simulationAsOf:simulation?nowDate():null,revision:correction?(Number(correction.previousRevision)||0)+1:0,correctionReason:correction?.reason||null,correctionSummary:changes?{added:changes.added,edited:changes.edited,removed:changes.removed}:null,journals:ids,snapshots:all().filter(t=>dateOf(t)&&dateOf(t)<=info.cutoff).map(copy)}};
  store.set(YEAR_KEY,records);
   if(correction){const sessions={...getSessions()};delete sessions[year];store.set(SESSION_KEY,sessions);yearHistory("reclose",year,{reason:correction.reason,reopenedAt:correction.reopenedAt,changes,revision:records[year].revision});}
   saveState();await flushStorage();hasBackup=false;
  if(typeof audit==="function")audit("FINANCIAL_YEAR_CLOSED",year,null,{documents:records[year].snapshots.length,journals:ids});
  if(typeof renderAllData==="function")renderAllData();
  window.dispatchEvent(new Event('ratib:annual-close-changed'));
  draw();message(simulation?"🧪 نجحت محاكاة إغلاق "+year+"؛ قيود السنة مقفلة في التجريبية حتى تعيد فتحها. لم تتأثر النسخة الرسمية.":"✓ تم اعتماد الإغلاق للسنة "+year+(IS_TRIAL?" في التجريبية.":" في راتب."));
 }catch(e){
  try{const y={...getYears()};delete y[year];store.set(YEAR_KEY,y);store.set("plan",priorPlan);store.set("history",priorHistory);await flushStorage();}catch(_){}
  message("فشل اعتماد الإغلاق: "+e.message,true);
 }
};
$("yearToolReopen").onclick=async()=>{
 const year=current(),saved=getYears()[year];if(!saved)return;
 if(!hasBackup){message("حمّل نسخة احتياطية شاملة لكل السنوات قبل إعادة الفتح.",true);return;}
 if(closed().some(c=>Number(c.year)>Number(year))){message("افتح السنوات اللاحقة أولًا.",true);return;}
 const reason=String($("yearToolReason").value||"").trim();
 if(reason.length<8){message("اكتب سببًا للتصحيح من 8 أحرف على الأقل قبل إعادة فتح السنة.",true);$("yearToolReason").focus();return;}
 if(prompt("إعادة الفتح ستعكس قيود الإقفال وتتيح تعديل المستندات، وقد تتغير الأرصدة المدورة بعد التصحيح. اكتب: إعادة فتح "+year)!=="إعادة فتح "+year)return;
 try{
  const original={};for(const tx of saved.snapshots||[])if(yearOwnDocument(tx,year))original[String(tx.id)]=fingerprint(tx);
  const sessions={...getSessions(),[year]:{year,reopenedAt:new Date().toISOString(),reason,previousRevision:Number(saved.revision)||0,previousClosedAt:saved.closedAt,original}};
  const y={...getYears()};delete y[year];store.set(YEAR_KEY,y);store.set(SESSION_KEY,sessions);
  const reverse=tx=>saved.journals.includes(tx.multiVoucherId)?{...tx,status:"reversed",reversedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:tx;
  const p=store.get("plan",null),h=store.get("history",[]);
  if(p)store.set("plan",{...p,transactions:(p.transactions||[]).map(reverse)});
  store.set("history",h.map(x=>({...x,transactions:(x.transactions||[]).map(reverse)})));
  yearHistory("reopen",year,{reason,previousClosedAt:saved.closedAt,previousRevision:Number(saved.revision)||0});
  await flushStorage();saveState();hasBackup=false;$("yearToolReason").value="";draw();
  window.dispatchEvent(new Event('ratib:annual-close-changed'));
  if(typeof audit==="function")audit("FINANCIAL_YEAR_REOPENED",year,{year,closedAt:saved.closedAt,journals:saved.journals?.length||0},{reason});
  message("✓ أُعيد فتح السنة "+year+" للتصحيح، وسُجل السبب. عدّل السندات ثم أعِد الإغلاق.");
 }catch(e){message("تعذرت إعادة الفتح: "+e.message,true);}
};
const oldReport=renderAccountOperations;
renderAccountOperations=function(...args){
 const output=oldReport.apply(this,args);
 const panel=document.getElementById((args[2]||accountOpsUi)?.panelId||"reportAccountOpsPanel");
 if(panel)for(const page of panel.querySelectorAll(".account-currency-page")){
  const head=page.querySelector('.account-operations-head');
  const years=closed().filter(y=>!accountOpsState.from||accountOpsState.from<=y.cutoff);
  if(head&&years.length){
   const banner=document.createElement('small');
   banner.style.cssText='display:block;font-size:11px;color:var(--ok)';
   banner.textContent='سنوات الإغلاق: '+years.map(y=>y.simulation?'🧪 '+y.year+' (محاكاة)':'🔒 '+y.year).join('، ');
   head.appendChild(banner);
  }
  for(const y of closed()){
   const lines=[...page.querySelectorAll(".account-statement-row[data-tx-id]")].filter(row=>row.firstElementChild?.textContent?.trim()===y.cutoff);
   const target=lines.at(-1)?.querySelector(".balance");
   if(target&&!target.querySelector(".ratib-annual-mark")){
    const mark=document.createElement("small");mark.className="ratib-annual-mark";mark.style.cssText="display:block;color:var(--ok);font-size:11px";mark.textContent=y.simulation?"🧪 محاكاة إغلاق "+y.year:"🔒 السنة "+y.year+" مغلقة";target.append(mark);
   }
  }
 }
 return output;
};
})();
