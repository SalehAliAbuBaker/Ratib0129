/* Ratib Al-Muyassar — trial-only, read-only cash pulse.
 * Do not sum currencies or infer turnover from voucher titles. Uses the actual
 * debit/credit side of each selected cash account's posted accounting leg.
 * Opening balances affect balances but never period receipts/payments.
 */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''));
const fmt=(n,c)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(Math.abs(n)<1e-8?0:n)+(c?' '+c:'');
const ALL_CASH='__all_cash_and_banks__';
let expanded=false,root=null,kind='',visible=[],lastAccount=ALL_CASH,lastCurrency='',refreshPending=false;
function today(){
 if(typeof getLocalTodayISO==='function'){const d=getLocalTodayISO();if(iso(d))return d;}
 const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function appReady(){
 return !!window.__ratibProceedInitialized&&typeof getCanonicalCatalog==='function'&&typeof getAllTransactions==='function'&&typeof getAccountEntry==='function';
}
function cashAccounts(){
 const catalog=getCanonicalCatalog()||[],names=new Map();
 for(const r of catalog){
  const mainCode=String(r.mainCode||''),section=String(r.group||'')+' '+String(r.sub||'');
  const group=window.RatibSimpleAccounts?.classify?.(r);
  const cash=(group==='cash')||((mainCode==='1'||/أصول|اصول|موجودات/.test(String(r.main||'')))&&/صندوق|نقد|بنك|مصرف|خزين/.test(section));
  if(!cash)continue;
  for(const d of r.details||[]){
   const name=String(d[1]||'').trim(),id=String(d[0]||'');
   // Do not include a client/receivables account just because its parent was
   // misclassified as liquid cash. Example: 1102xx = receivables, not banks.
   const receivableCode=/^1102\d*/.test(id);
   const explicitlyCash=/صندوق|نقد|بنك|مصرف|خزين/.test(name);
   if(receivableCode&&!explicitlyCash)continue;
   if(name&&!names.has(name))names.set(name,{value:name,label:name+(id?' — '+id:'')});
  }
 }
 return [...names.values()].sort((a,b)=>a.label.localeCompare(b.label,'ar'));
}
function options(id,opts,wanted){
 const target=byId(id);if(!target)return '';
 const existing=[...target.options].map(o=>o.value),values=opts.map(o=>o.value);
 if(existing.length!==values.length||existing.some((s,i)=>s!==values[i])){
  target.replaceChildren();
  for(const o of opts){const option=document.createElement('option');option.value=o.value;option.textContent=o.label;target.append(option);}
 }
 target.value=values.includes(wanted)?wanted:(values[0]||'');
 return target.value;
}
function validEntries(account,accounts){
 const list=typeof ratibActiveAccountingTransactions==='function'?ratibActiveAccountingTransactions(getAllTransactions()):getAllTransactions();
 const cashNames=new Set((accounts||[]).map(a=>a.value));
 const isAll=account===ALL_CASH,results=[];
 for(const t of list){
  if(!t||['reversed','deleted','draft','pending','cancelled','void'].includes(String(t.status||'').toLowerCase()))continue;
  if(t.status&&!['posted','approved','confirmed'].includes(String(t.status).toLowerCase()))continue;
  const date=typeof getAccountOpsDate==='function'?getAccountOpsDate(t):String(t.isoDate||'');
  if(!iso(date))continue;
  // One voucher line is an accounting movement. For the consolidated cash
  // view, a transfer from one included cash account to another is internal:
  // both sides cancel; it must not inflate receipts or payments.
  let scopeName=account;
  if(isAll){
   if(t.isOpeningBalance&&t.openingBalance)scopeName=cashNames.has(t.openingBalance.account)?t.openingBalance.account:'';
   else{
    const d=cashNames.has(t.debitAccount),c=cashNames.has(t.creditAccount);
    if(d&&c)continue;
    scopeName=d?t.debitAccount:c?t.creditAccount:'';
   }
   if(!scopeName)continue;
  }
  const leg=getAccountEntry(t,[scopeName]);
  if(!leg||leg.bothSides||(leg.side!=='debit'&&leg.side!=='credit'))continue;
  const amount=Number(typeof getAccountDisplayAmount==='function'?getAccountDisplayAmount(leg):leg.foreignAmount??leg.amount);
  const currency=String(leg.currency||t.currency||'YER').toUpperCase();
  if(!Number.isFinite(amount)||amount<=0||!/^[A-Z]{3}$/.test(currency))continue;
  results.push({t,date,amount,currency,side:leg.side,opening:!!t.isOpeningBalance,note:String(leg.line?.note||t.multiVoucher?.note||t.note||''),account:scopeName});
 }
 return results;
}
function period(){
 const value=byId('ratibPulsePeriod')?.value||'month',last=today();
 const d=new Date(last+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-6);
 const weekStart=d.toISOString().slice(0,10);
 return {from:value==='all'?'':value==='year'?last.slice(0,4)+'-01-01':value==='week'?weekStart:value==='today'?last:last.slice(0,7)+'-01',last,label:value==='all'?'من بداية السجل':value==='year'?'هذه السنة':value==='week'?'آخر سبعة أيام':value==='today'?'اليوم':'هذا الشهر'};
}
function help(s){const el=byId('ratibPulseStatus');if(el)el.textContent=s;}
function arc(id,dash,offset){
 const circle=byId(id);circle.style.strokeDasharray=dash+' '+(2*Math.PI*71);circle.style.strokeDashoffset=String(-offset);
 circle.style.pointerEvents=dash>0?'stroke':'none';circle.tabIndex=dash>0?0:-1;
}
function draw(){
 if(!expanded||!root)return;
 if(!appReady()){
  byId('ratibPulseReadout').hidden=true;help('افتح التطبيق لعرض البيانات المحاسبية المحفوظة.');return;
 }
 try{
  const accounts=cashAccounts();
  if(!accounts.length){byId('ratibPulseReadout').hidden=true;help('لا توجد حسابات نقدية معرفة في دليل الحسابات.');return;}
  const choices=[{value:ALL_CASH,label:'جميع الصناديق والبنوك'},...accounts];
  const account=options('ratibPulseAccount',choices,byId('ratibPulseAccount')?.value||lastAccount);
  const all=validEntries(account,accounts);
  const currencies=[...new Set(all.map(x=>x.currency))].sort();
  if(!currencies.length){const fallback=typeof getRatibBaseCurrency==='function'?getRatibBaseCurrency():'YER';currencies.push(/^[A-Z]{3}$/.test(fallback)?fallback:'YER');}
  const currency=options('ratibPulseCurrency',currencies.map(c=>({value:c,label:typeof accountCurrencyLabel==='function'?accountCurrencyLabel(c):c})),byId('ratibPulseCurrency')?.value||lastCurrency);
  lastAccount=account;lastCurrency=currency;
  const scope=period();let beginning=0,receipts=0,payments=0;visible=[];
  for(const e of all){
   if(e.currency!==currency||e.date>scope.last)continue;
   const amount=e.side==='debit'?e.amount:-e.amount;
   if(scope.from&&e.date<scope.from){beginning+=amount;continue;}
   if(e.opening){beginning+=amount;continue;}
   if(e.side==='debit')receipts+=e.amount;else payments+=e.amount;
   visible.push(e);
  }
  const closing=beginning+receipts-payments;
  visible.sort((a,b)=>b.date.localeCompare(a.date)||String(b.t.id||'').localeCompare(String(a.t.id||'')));
  byId('ratibPulseReadout').hidden=false;
  byId('ratibPulseClosing').textContent=fmt(closing,currency);
  byId('ratibPulseBeginning').textContent=fmt(beginning,currency);
  byId('ratibPulseIncome').textContent=fmt(receipts,currency);
  byId('ratibPulseExpense').textContent=fmt(payments,currency);
  byId('ratibPulseNet').textContent=fmt(receipts-payments,currency);
  help('حركة '+scope.label+' — '+visible.length+' حركة مرحّلة'+(account===ALL_CASH?' في جميع الصناديق والبنوك (دون التحويلات الداخلية)':'')+'. الأرصدة الافتتاحية ليست مقبوضات.');
  const circum=2*Math.PI*71,total=receipts+payments,g=total?circum*receipts/total:0,p=total?circum*payments/total:0;
  arc('ratibPulseGreenArc',g,0);arc('ratibPulseGoldArc',p,g);
  if(kind)details(kind);
 }catch(error){
  console.error('Ratib Cash Pulse',error);byId('ratibPulseReadout').hidden=true;help('تعذر احتساب الملخص، ولم تُغيَّر أي بيانات.');
 }
}
function details(side){
 kind=side;const pane=byId('ratibPulseDetails'),list=byId('ratibPulseList');
 pane.hidden=false;byId('ratibPulseDetailsTitle').textContent=side==='debit'?'حركات القبض':'حركات الصرف';list.replaceChildren();
 const rows=visible.filter(e=>e.side===side);
 if(!rows.length){const el=document.createElement('p');el.textContent='لا توجد حركات خلال الفترة المحددة.';el.className='ratib-pulse-muted';list.append(el);return;}
 for(const r of rows.slice(0,40)){
  const item=document.createElement('button');item.type='button';item.className='ratib-pulse-entry';
  const desc=document.createElement('span');desc.textContent=r.date+' — '+(r.note||'حركة مالية');
  const amount=document.createElement('strong');amount.textContent=fmt(r.amount,r.currency);
  item.append(desc,amount);
  item.addEventListener('click',()=>{if(typeof openTxModal==='function')openTxModal(r.t);});
  list.append(item);
 }
 if(rows.length>40){const el=document.createElement('p');el.textContent='تظهر أحدث 40 حركة، وبقية الحركات في سجل العمليات.';el.className='ratib-pulse-muted';list.append(el);}
}
function setExpanded(next){
 expanded=next;byId('ratibPulseBody').hidden=!expanded;byId('ratibPulseToggle').setAttribute('aria-expanded',String(expanded));
 if(expanded){draw();}else{kind='';byId('ratibPulseDetails').hidden=true;}
}
function schedule(){
 if(!expanded||refreshPending)return;refreshPending=true;
 requestAnimationFrame(()=>{refreshPending=false;if(expanded)draw();});
}
function mount(){
 const dashboard=byId('dashboardHomeContent');if(!dashboard||byId('ratibCashPulse'))return;
 root=document.createElement('section');root.id='ratibCashPulse';root.className='ratib-pulse no-print';
 root.innerHTML=
 '<button type="button" id="ratibPulseToggle" class="ratib-pulse-toggle" aria-controls="ratibPulseBody" aria-expanded="false"><span class="ratib-pulse-toggle-left"><span class="ratib-pulse-symbol" aria-hidden="true">◉</span> نبض الصندوق</span><span aria-hidden="true">⌄</span></button>'+
 '<div id="ratibPulseBody" hidden><div class="ratib-pulse-filters"><label>الصندوق أو البنك<select id="ratibPulseAccount"></select></label><label>العملة<select id="ratibPulseCurrency"></select></label><label>الفترة<select id="ratibPulsePeriod"><option value="month">هذا الشهر</option><option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="year">هذه السنة</option><option value="all">من البداية</option></select></label></div><p id="ratibPulseStatus" class="ratib-pulse-muted" role="status"></p>'+
 '<div id="ratibPulseReadout" hidden><div class="ratib-pulse-visual"><div class="ratib-pulse-circle-wrap"><svg class="ratib-pulse-ring" viewBox="0 0 220 220" role="img" aria-label="المقبوضات باللون الأخضر والمدفوعات باللون الذهبي"><circle class="ratib-pulse-track" cx="110" cy="110" r="71"/><circle id="ratibPulseGreenArc" class="ratib-pulse-arc ratib-pulse-green" cx="110" cy="110" r="71" role="button" tabindex="0" aria-label="تفاصيل المقبوضات"/><circle id="ratibPulseGoldArc" class="ratib-pulse-arc ratib-pulse-gold" cx="110" cy="110" r="71" role="button" tabindex="0" aria-label="تفاصيل المدفوعات"/></svg><div class="ratib-pulse-center"><small>الرصيد الحالي</small><strong id="ratibPulseClosing">—</strong><small>حتى اليوم</small></div></div>'+
 '<div class="ratib-pulse-values"><div class="ratib-pulse-val"><small>الرصيد أول الفترة</small><strong id="ratibPulseBeginning">—</strong></div><button type="button" data-pulse-side="debit" class="ratib-pulse-val"><small><i class="ratib-pulse-dot green"></i>المقبوضات</small><strong id="ratibPulseIncome">—</strong></button><button type="button" data-pulse-side="credit" class="ratib-pulse-val"><small><i class="ratib-pulse-dot gold"></i>المدفوعات</small><strong id="ratibPulseExpense">—</strong></button><div class="ratib-pulse-val"><small>صافي الحركة</small><strong id="ratibPulseNet">—</strong></div></div></div>'+
 '<div id="ratibPulseDetails" class="ratib-pulse-details" hidden><div class="ratib-pulse-details-title"><b id="ratibPulseDetailsTitle"></b><div class="ratib-pulse-details-actions"><button id="ratibPulseStatement" type="button" class="ratib-pulse-statement">كشف الحساب</button><button id="ratibPulseDismiss" type="button" aria-label="إغلاق تفاصيل الحركات">×</button></div></div><div id="ratibPulseList" class="ratib-pulse-list"></div></div></div></div>';
 const main=dashboard.querySelector('.main-menu-grid');
 if(main)main.insertAdjacentElement('afterend',root);else dashboard.append(root);
 byId('ratibPulseToggle').addEventListener('click',()=>setExpanded(!expanded));
 for(const key of ['ratibPulseAccount','ratibPulseCurrency','ratibPulsePeriod'])byId(key).addEventListener('change',()=>{kind='';byId('ratibPulseDetails').hidden=true;draw();});
 for(const b of root.querySelectorAll('[data-pulse-side]'))b.addEventListener('click',()=>details(b.dataset.pulseSide));
 for(const [id,side] of [['ratibPulseGreenArc','debit'],['ratibPulseGoldArc','credit']]){
  const el=byId(id);el.addEventListener('click',()=>details(side));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details(side);}});
 }
 byId('ratibPulseDismiss').addEventListener('click',()=>{kind='';byId('ratibPulseDetails').hidden=true;});
 byId('ratibPulseStatement').addEventListener('click',()=>{
  if(!appReady()||!lastAccount||!lastCurrency||typeof openAccountFromPager!=='function')return;
  try{
   const {from,last}=period();
   const all=lastAccount===ALL_CASH;
   const selected=all?cashAccounts().map(a=>a.value):[lastAccount];
   if(!selected.length)return;
   const name=all?'الصناديق والبنوك':lastAccount;
   openAccountFromPager(name,selected,lastCurrency,all);
   if(typeof accountOpsState==='object'){
    accountOpsState.from=from;accountOpsState.to=last;
    accountOpsState.currency=lastCurrency;accountOpsState.activeCurrency=lastCurrency;
    accountOpsState.filtered=Boolean(from||last);
   }
   const fromField=byId('accountOpsFromDate'),toField=byId('accountOpsToDate'),currencyField=byId('accountOpsCurrencyFilter');
   if(fromField)fromField.value=from;if(toField)toField.value=last;
   if(currencyField)currencyField.value=lastCurrency;
   if(typeof renderAccountOperations==='function')renderAccountOperations(name,selected);
  }catch(e){help('تعذر فتح كشف الحساب، ويمكن فتحه يدويًا من شجرة الحسابات.');}
 });
 // No timers or persistence: refresh on user activity/foreground and when the
 // existing posting workflow visibly returns to dashboard.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 window.addEventListener('focus',schedule,{passive:true});
 document.addEventListener('click',event=>{
  if(!expanded)return;const button=event.target.closest('button');
  if(button&&(/save|commit|restore|post|import|delete/i.test(button.id||'')))schedule();
 },true);
 window.addEventListener('ratib:account-view-change',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.RatibCashPulse={refresh:schedule};
})();