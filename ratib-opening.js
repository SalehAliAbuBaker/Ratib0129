/* Trial-only opening journal entry. Reuses the existing imported-opening ledger schema and year lock. */
(function ratibManualOpeningTrial(){
"use strict";
const q=id=>document.getElementById(id);
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let rows=[],dirty=false,busy=false,active=false,pendingChoice=false;
const mk=()=>({key:crypto.randomUUID?.()||String(Date.now())+"_"+Math.random(),account:"",debit:"",credit:"",note:""});
const code=()=>[...KNOWN_CURRENCIES].find(x=>x===getGlobalCurrency())||"YER";
function accounts(){const results=[],seen=new Set();for(const group of getCanonicalCatalog()){for(const [id,name] of group.details||[]){const k=String(id)+"|"+name;if(!seen.has(k)){seen.add(k);results.push({id:String(id),name:String(name),label:String(id)+" — "+name});}}}return results;}
function cents(value){
 const s=String(value??"").trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٫/g,".");
 if(!s)return 0n;
 if(!/^\d{1,13}(?:\.\d{1,3})?$/.test(s))throw Error("أدخل مبلغًا موجبًا لا يتجاوز ثلاثة منازل عشرية.");
 const [i,d=""]=s.split(".");return BigInt(i)*1000n+BigInt((d+"000").slice(0,3));
}
function amount(n){const sign=n<0n?"-":"";const s=(n<0n?-n:n).toString().padStart(4,"0");return sign+s.slice(0,-3)+"."+s.slice(-3)}
function sums(){
 let debit=0n,credit=0n;
 for(const row of rows){debit+=cents(row.debit);credit+=cents(row.credit);}
 return {debit,credit,diff:debit-credit};
}
function validDate(date){
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
}
function yearClosed(year){const c=store.get("annual_closures_v1",{})||{};return Object.values(c).some(v=>String(v?.year)===String(year));}
function ensureAvailable(date,records){
 if(yearClosed(date.slice(0,4)))throw Error("هذه السنة المالية مغلقة؛ لا يمكن تسجيل قيد افتتاحي فيها.");
 const openings=records.filter(t=>t?.isOpeningBalance&&!["deleted","reversed"].includes(t.status));
 if(openings.some(t=>String(t.isoDate||t.date||"").slice(0,4)===date.slice(0,4)))throw Error("يوجد قيد افتتاحي لهذه السنة. افتحه من سجل العمليات بدلاً من إنشاء قيد مكرر.");
 const existing=new Set(openings.map(t=>String(t.openingBalance?.account||"")+"|"+String(t.openingBalance?.currency||"")));
 if(rows.some(r=>existing.has(r.account+"|"+q("ratibOpeningCurrency").value)))throw Error("توجد أرصدة افتتاحية سابقة لنفس الحساب والعملة. لا يمكن تسجيلها مرة أخرى.");
}
function review(){
 const el=q("ratibOpeningTotals");if(!el)return;
 try{
  const t=sums();el.dataset.balanced=String(t.debit===t.credit);
  el.innerHTML="<span>إجمالي المدين: "+safe(amount(t.debit))+"</span><span>إجمالي الدائن: "+safe(amount(t.credit))+"</span><span>الفرق: "+safe(amount(t.diff))+"</span>";
 }catch(e){el.dataset.balanced="false";el.textContent=e.message;}
}
function paint(){
 const el=q("ratibOpeningRows");if(!el)return;
 const as=accounts(),options='<option value="">اختر الحساب التفصيلي</option>'+as.map(a=>'<option value="'+safe(a.id)+'">'+safe(a.label)+'</option>').join("");
 el.replaceChildren();
 for(const r of rows){
  const tr=document.createElement("tr");tr.dataset.key=r.key;
  const tdAccount=document.createElement("td"),sel=document.createElement("select");sel.setAttribute("aria-label","الحساب");sel.innerHTML=options;
  const found=as.find(a=>a.name===r.account);sel.value=found?.id||"";sel.addEventListener("change",()=>{r.account=as.find(a=>a.id===sel.value)?.name||"";dirty=true;review();});tdAccount.append(sel);tr.append(tdAccount);
  for(const field of ["debit","credit","note"]){
   const td=document.createElement("td"),input=document.createElement(field==="note"?"textarea":"input");if(field!=="note")input.type="text";input.value=r[field];input.setAttribute("aria-label",field==="debit"?"مدين":field==="credit"?"دائن":"البيان");
   if(field!=="note"){input.className="opening-amount";input.inputMode="decimal";input.placeholder="0.000";}else{input.className="opening-description";input.rows=3;input.maxLength=2000;input.placeholder="اكتب البيان التفصيلي للقيد الافتتاحي";}
   input.addEventListener("input",()=>{r[field]=input.value;dirty=true;review();});td.append(input);tr.append(td);
  }
  const del=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="btn btn-ghost";btn.textContent="حذف بند";btn.addEventListener("click",()=>{rows=rows.filter(x=>x.key!==r.key);dirty=true;paint();});del.append(btn);tr.append(del);el.append(tr);
 }
 review();
}
function showError(msg){q("ratibOpeningError").textContent=msg||"";}
function open(){
 if(active)return;
 const draft=store.get("manual_opening_draft_v1",null);
 rows=Array.isArray(draft?.rows)&&draft.rows.length?structuredClone(draft.rows).map(r=>({...mk(),account:String(r.account||""),debit:String(r.debit||""),credit:String(r.credit||""),note:String(r.note||"")})):[mk(),mk()];
 dirty=false;active=true;pendingChoice=false;busy=false;
 q("ratibOpeningDate").value=draft?.date||(typeof getLocalTodayISO==="function"?getLocalTodayISO():new Date().toISOString().slice(0,10)).slice(0,4)+"-01";
 q("ratibOpeningCurrency").value=KNOWN_CURRENCIES.has(draft?.currency)?draft.currency:code();showError("");q("ratibOpeningDecide").hidden=true;paint();
 const modal=q("ratibOpeningOverlay");modal.classList.add("show");try{activateRatibOverlay(modal,document.activeElement);pushAppHistoryState();}catch(_){}
 q("ratibOpeningDate").focus();
}
function close(force=false){
 if(busy)return;
 if(dirty&&!force){pendingChoice=true;q("ratibOpeningDecide").hidden=false;return;}
 active=false;pendingChoice=false;dirty=false;rows=[];
 const modal=q("ratibOpeningOverlay");
 try{releaseRatibOverlay(modal);}catch(_){}
 modal.classList.remove("show");q("ratibOpeningDecide").hidden=true;
}
function inspect(){
 if(!rows.length)throw Error("أضف بندين على الأقل.");
 const date=q("ratibOpeningDate").value,currency=q("ratibOpeningCurrency").value,as=accounts(),names=new Set(),details=[];
 if(!validDate(date))throw Error("حدد تاريخًا صحيحًا للقيد الافتتاحي.");
 if(!KNOWN_CURRENCIES.has(currency))throw Error("اختر عملة معرّفة في التطبيق.");
 for(const r of rows){
  if(!r.account&&!(r.debit||r.credit||r.note))continue;
  const item=as.filter(a=>a.name===r.account);
  if(item.length!==1)throw Error("كل بند يحتاج إلى حساب تفصيلي واحد غير ملتبس في دليل الحسابات.");
  if(names.has(r.account))throw Error("الحساب مكرر داخل القيد: "+r.account);
  names.add(r.account);
  const debit=cents(r.debit),credit=cents(r.credit);
  if(debit===0n&&credit===0n)throw Error("حدد مبلغًا مدينًا أو دائنًا للحساب "+r.account);
  if(debit>0n&&credit>0n)throw Error("لا يجوز إدخال مدين ودائن معًا لنفس الحساب في رصيده الافتتاحي.");
  details.push({name:r.account,id:item[0].id,debit,credit,note:r.note.slice(0,2000)});
 }
 if(details.length<2)throw Error("يلزم بندان على الأقل لإعداد القيد الافتتاحي.");
 const sums=details.reduce((v,r)=>({debit:v.debit+r.debit,credit:v.credit+r.credit}),{debit:0n,credit:0n});
 if(sums.debit===0n||sums.credit===0n||sums.debit!==sums.credit)throw Error("يجب تساوي المدين والدائن مع وجود مبلغ موجب في كل جانب.");
 if(sums.debit>BigInt(Number.MAX_SAFE_INTEGER))throw Error("إجمالي القيد يتجاوز الحد المالي الآمن.");
 ensureAvailable(date,getAllTransactions());
 return {date,currency,details,sums};
}
function preview(){
 try{
  const v=inspect();
  showError("القيد متوازن وجاهز للاعتماد. إجمالي كل طرف: "+amount(v.sums.debit)+" "+v.currency);
  return v;
 }catch(e){showError(e.message);return null;}
}
async function commit(){
 if(busy)return;
 const v=preview();if(!v)return;
 if(!window.confirm("اعتماد القيد الافتتاحي وترحيله إلى السجل؟ لا تنشئ قيدًا آخر لنفس السنة."))return;
 busy=true;const btn=q("ratibOpeningCommit");btn.disabled=true;
 try{
  if(typeof _pendingFinancialCompletion!=="undefined"&&_pendingFinancialCompletion)throw Error("يوجد حفظ مالي معلّق. أكمله أولاً.");
  if(window.RatibLicense?.beforeCreate&&!(await window.RatibLicense.beforeCreate(getAllTransactions())))return;
  await flushStorage();
  ensureAvailable(v.date,getAllTransactions());
  const p=structuredClone(getMasterPlan()),stamp=Date.now(),key="opening_manual_"+stamp+"_"+Math.random().toString(36).slice(2),seq=getNextVoucherNumber("opening");
  for(const [i,r] of v.details.entries()){
   const d=Number(r.debit)/1000,c=Number(r.credit)/1000,base=d+c;
   const o={account:r.name,accountId:r.id,currency:v.currency,debit:amount(r.debit),credit:amount(r.credit),baseCurrency:v.currency,baseDebit:amount(r.debit),baseCredit:amount(r.credit),sourceRef:"إدخال مباشر",note:r.note||"رصيد افتتاحي"};
   p.transactions.push({id:key+"_"+i,importVoucherId:key,openingBalanceManual:true,isOpeningBalance:true,openingBalance:o,seqNum:seq,isoDate:v.date,date:v.date,timestamp:new Date(v.date+"T00:00:00Z").getTime(),updatedAt:stamp,currency:v.currency,amount:base,debitAccount:d?r.name:"",creditAccount:c?r.name:"",debitAccountId:d?r.id:"",creditAccountId:c?r.id:"",voucherMode:"opening",type:"قيد افتتاحي",status:"posted",isExpense:false,distribution:{},execution:{},schemaVersion:3});
  }
  store.set("plan",p);
  store.remove("manual_opening_draft_v1");
  try{audit("CREATE_OPENING_ENTRY",key,null,{date:v.date,currency:v.currency,accounts:v.details.map(r=>r.name),total:amount(v.sums.debit)});}catch(e){console.warn("Opening audit",e);}
  await flushStorage();
  try{window.RatibLicense?.recordCreated?.();}catch(_){}
  dirty=false;close(true);
  for(const cb of ["updateSearchableData","renderAllData","updateProDashboard","runTrialBalanceReport"]){try{if(typeof window[cb]==="function")window[cb]();else if(cb==="renderAllData")renderAllData(true);}catch(e){console.warn(cb,e);}}
  try{showToast("تم حفظ وترحيل القيد الافتتاحي المتوازن بنجاح.","success");}catch(_){}
 }catch(e){showError("تعذر تأكيد اكتمال الحفظ: "+e.message+". راجع السجل قبل إعادة المحاولة.");}
 finally{busy=false;btn.disabled=false;}
}
function mount(){
 if(!q("pageDashboard")||q("ratibOpeningOverlay"))return;
 // The opening balance has one shortcut, directly after the journal vouchers.
 // No duplicated tile in the main department row.
 q("ratibOpeningLaunch")?.remove();
 const quick=document.querySelector("#dashboardHomeContent .ratib-quick-entry-grid");
 if(quick&&!q("ratibOpeningQuickLaunch")){
  const launch=document.createElement("button");launch.type="button";
  launch.id="ratibOpeningQuickLaunch";
  launch.textContent="قيد افتتاحي";
  launch.addEventListener("click",open);
  quick.append(launch);
 }
 const modal=document.createElement("div");modal.id="ratibOpeningOverlay";modal.className="modal-overlay no-print";modal.innerHTML=
 '<section class="modal-content" role="dialog" aria-modal="true" aria-labelledby="ratibOpeningTitle">'+
 '<div class="ratib-opening-head"><h2 id="ratibOpeningTitle">القيد الافتتاحي — إدخال الأرصدة</h2><button type="button" class="btn btn-ghost" id="ratibOpeningClose">رجوع</button></div>'+
 '<p class="ratib-opening-note">أدخل الأرصدة في عملة واحدة وفق دليل الحسابات. ينشئ التطبيق قيدًا متوازنًا ويرحله إلى الأستاذ والتقارير بعد اعتماده. لا تُغيّر الأرصدة القديمة أو السنوات المغلقة.</p>'+
 '<div class="ratib-opening-grid"><label>تاريخ القيد <input type="date" id="ratibOpeningDate"></label><label>عملة القيد <select id="ratibOpeningCurrency"></select></label></div>'+
 '<div style="overflow:auto"><table class="ratib-opening-table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>البيان</th><th></th></tr></thead><tbody id="ratibOpeningRows"></tbody></table></div>'+
 '<button type="button" class="btn btn-ghost" id="ratibOpeningAdd">+ إضافة حساب</button>'+
 '<div id="ratibOpeningTotals" class="ratib-opening-totals" aria-live="polite"></div><p id="ratibOpeningError" class="ratib-opening-error" role="alert"></p>'+
 '<div class="ratib-opening-actions"><button type="button" class="btn btn-ghost" id="ratibOpeningPreview">فحص التوازن</button><button type="button" class="btn btn-primary" id="ratibOpeningCommit">اعتماد وترحيل القيد</button></div>'+
 '<div id="ratibOpeningDecide" hidden><p class="ratib-opening-note">هناك تغييرات لم تُحفظ. ماذا تريد أن تفعل؟</p><div class="ratib-opening-actions"><button type="button" class="btn btn-primary" id="ratibOpeningSaveDraft">حفظ مسودة والخروج</button><button type="button" class="btn btn-ghost" id="ratibOpeningDiscard">خروج دون حفظ</button><button type="button" class="btn btn-ghost" id="ratibOpeningStay">إلغاء والبقاء</button></div><p class="ratib-opening-note">حفظ المسودة لا يُنشئ قيدًا محاسبيًا ولا يؤثر على ميزان المراجعة.</p></div>'+
 '</section>';
 document.body.append(modal);
 q("ratibOpeningCurrency").innerHTML=[...KNOWN_CURRENCIES].map(c=>'<option value="'+safe(c)+'">'+safe(c)+" — "+safe(typeof accountCurrencyLabel==="function"?accountCurrencyLabel(c):c)+"</option>").join("");
 q("ratibOpeningClose").onclick=()=>close();
 q("ratibOpeningAdd").onclick=()=>{rows.push(mk());dirty=true;paint();};
 q("ratibOpeningPreview").onclick=preview;q("ratibOpeningCommit").onclick=commit;
 q("ratibOpeningDate").addEventListener("change",()=>dirty=true);q("ratibOpeningCurrency").addEventListener("change",()=>{dirty=true;review();});
 q("ratibOpeningSaveDraft").onclick=async()=>{
  if(busy)return;busy=true;const btn=q("ratibOpeningSaveDraft");btn.disabled=true;
  try{
   store.set("manual_opening_draft_v1",{date:q("ratibOpeningDate").value,currency:q("ratibOpeningCurrency").value,rows:structuredClone(rows),savedAt:new Date().toISOString()});
   await flushStorage();dirty=false;busy=false;close(true);showToast("حُفظت مسودة القيد الافتتاحي دون ترحيل.","success");
  }catch(e){showError("تعذر حفظ المسودة: "+e.message);}finally{busy=false;btn.disabled=false;}
 };
 q("ratibOpeningDiscard").onclick=()=>close(true);
 q("ratibOpeningStay").onclick=()=>{pendingChoice=false;q("ratibOpeningDecide").hidden=true;};
 // Prevent silent dismissal on Escape while the trial opening form is dirty.
 document.addEventListener("keydown",e=>{if(active&&e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();close();}},true);
 modal.addEventListener("click",e=>{if(e.target===modal)close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();