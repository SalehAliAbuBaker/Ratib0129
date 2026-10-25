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
function pulseVisibleCatalog(){
 const catalog=getCanonicalCatalog()||[];
 try{
  if(typeof window.ratibImportVisibleCatalog==='function'){
   const visible=window.ratibImportVisibleCatalog(catalog);
   if(Array.isArray(visible))return visible;
  }
 }catch(e){console.warn('Cash Pulse catalog projection',e);}
 return catalog;
}
function detectedCashAccounts(){
 // Never infer cash accounts from transaction names alone. The user's actual
 // chart of accounts is authoritative, including manually added subgroups.
 const catalog=pulseVisibleCatalog(),names=new Map();
 const parents=typeof getSubgroupParents==='function'?getSubgroupParents():{};
 const normalize=v=>String(v??'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLocaleLowerCase('ar');
 const cashWords=/نقد|صندوق|صناديق|بنك|بنوك|مصرف|خزين|كاش|محفظه|حساب جاري|cash|bank|wallet/i;
 const notLiquidity=/قرض|قروض|تمويل|عميل|ذمم|مورد|مستحق|مدينون|دائنون|استثمار|وديعه لاجل/;
 const cashSubgroup=code=>{
  const visited=new Set();let current=String(code||'');
  while(current&&!visited.has(current)){
   if(current==='1101'||current.startsWith('1101'))return true;
   visited.add(current);current=String(parents[current]||'');
  }
  return false;
 };
 for(const row of catalog){
  const mainCode=String(row.mainCode||''),main=normalize(row.main),sub=String(row.subCode||'');
  const asset=mainCode==='1'||(!mainCode&&/اصول|موجودات/.test(main));
  if(!asset)continue; // Never treat a bank loan or payable as cash.
  const section=normalize([row.group,row.sub].filter(Boolean).join(' '));
  const family=cashSubgroup(sub)||cashWords.test(section)||window.RatibSimpleAccounts?.classify?.(row)==='cash';
  const debtorSection=/عملاء|مدينون|ذمم|ديون لي/.test(section);
  for(const detail of row.details||[]){
   const id=String(detail[0]||''),name=String(detail[1]||'').trim(),normalized=normalize(name);
   const explicit=cashWords.test(normalized)&&!notLiquidity.test(normalized);
   const receivable=/^1102/.test(id)||/^1102/.test(sub)||debtorSection;
   if(!name||(!family&&!explicit)||(receivable&&!explicit))continue;
   if(!names.has(name))names.set(name,{value:name,label:name+(id?' — '+id:'')});
  }
 }
 return [...names.values()].sort((a,b)=>a.label.localeCompare(b.label,'ar'));
}

const EXTRA_CASH_KEY='ratib_trial_pulse_extra_cash_accounts_v1';
let extraCashNames=[];
function loadExtraCash(){
 try{
  const values=JSON.parse(localStorage.getItem(EXTRA_CASH_KEY)||'[]');
  if(Array.isArray(values))extraCashNames=values.filter(x=>typeof x==='string');
 }catch(error){console.warn('Pulse preferences unavailable',error);}
}
function saveExtraCash(){
 try{localStorage.setItem(EXTRA_CASH_KEY,JSON.stringify(extraCashNames));}
 catch(error){console.warn('Pulse preferences could not be saved',error);}
}
function catalogAccounts(){
 const names=new Map();
 for(const row of pulseVisibleCatalog())for(const d of row.details||[]){
  const name=String(d[1]||'').trim(),code=String(d[0]||'');
  if(name&&!names.has(name))names.set(name,{value:name,label:name+(code?' — '+code:'')+' · '+String(row.sub||row.group||'')});
 }
 return [...names.values()].sort((a,b)=>a.label.localeCompare(b.label,'ar'));
}
function cashAccounts(){
 const names=new Map(detectedCashAccounts().map(x=>[x.value,x]));
 const catalog=new Map(catalogAccounts().map(x=>[x.value,x]));
 for(const name of extraCashNames)if(catalog.has(name)&&!names.has(name))names.set(name,catalog.get(name));
 return [...names.values()].sort((a,b)=>a.label.localeCompare(b.label,'ar'));
}
function renderCashDirectory(){
 const list=byId('ratibPulseAccountList'),summary=byId('ratibPulseAccountSummary');
 if(!list||!summary)return;
 const available=catalogAccounts(),auto=new Set(detectedCashAccounts().map(x=>x.value));
 const included=new Set([...auto,...extraCashNames].filter(x=>available.some(a=>a.value===x)));
 summary.textContent='تحديد حسابات النقدية — '+included.size+' من '+available.length+' حساب في الدليل';
 const query=String(byId('ratibPulseAccountSearch')?.value||'').trim().toLocaleLowerCase('ar');
 const frag=document.createDocumentFragment();let count=0;
 for(const a of available){
  if(query&&!a.label.toLocaleLowerCase('ar').includes(query))continue;
  count++;
  const label=document.createElement('label');label.className='ratib-pulse-account-item';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=a.value;checkbox.dataset.pulseCashAccount='1';
  checkbox.checked=included.has(a.value);checkbox.disabled=auto.has(a.value);checkbox.setAttribute('aria-label',a.label);
  const title=document.createElement('span');title.textContent=a.label;
  const hint=document.createElement('small');hint.textContent=auto.has(a.value)?'مدرج تلقائيًا':'إضافة للنبض';
  label.append(checkbox,title,hint);frag.append(label);
 }
 if(!count){const p=document.createElement('p');p.textContent='لا توجد حسابات مطابقة.';frag.append(p);}
 list.replaceChildren(frag);
}
function setupCashDirectory(){
 const list=byId('ratibPulseAccountList');if(!list)return;
 byId('ratibPulseAccountSearch').addEventListener('input',renderCashDirectory);
 list.addEventListener('change',event=>{
  const checkbox=event.target.closest('input[data-pulse-cash-account]');
  if(!checkbox||checkbox.disabled||!catalogAccounts().some(x=>x.value===checkbox.value))return;
  const selected=new Set(extraCashNames);
  if(checkbox.checked)selected.add(checkbox.value);else selected.delete(checkbox.value);
  extraCashNames=[...selected];saveExtraCash();
  byId('ratibPulseAccount').value=ALL_CASH;lastAccount=ALL_CASH;draw();
 });
 byId('ratibPulseAccountReset').addEventListener('click',()=>{
  extraCashNames=[];saveExtraCash();
  byId('ratibPulseAccount').value=ALL_CASH;lastAccount=ALL_CASH;draw();
 });
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
 const isAll=account===ALL_CASH,raw=[];
 for(const t of list){
  if(!t||['reversed','deleted','draft','pending','cancelled','void'].includes(String(t.status||'').toLowerCase()))continue;
  if(t.status&&!['posted','approved','confirmed'].includes(String(t.status).toLowerCase()))continue;
  // Parse both sides of each posted journal entry rather than guessing a
  // single account from the voucher header. Compound rows retain their legs.
  const legs=typeof trialTransactionLegs==='function'?trialTransactionLegs(t):[];
  for(const leg of legs){
   const name=String(leg.account||''),date=String(leg.date||'');
   if(!cashNames.has(name)||(!isAll&&name!==account)||!iso(date))continue;
   const currency=String(leg.currency||'YER').toUpperCase();
   if(!/^[A-Z]{3}$/.test(currency))continue;
   const opening=!!(leg.opening||t.isOpeningBalance);
   const note=String(leg.meta?.note||t.openingBalance?.note||t.multiVoucher?.note||t.note||'');
   for(const [side,amount] of [['debit',Number(leg.debit||0)],['credit',Number(leg.credit||0)]]){
    if(!Number.isFinite(amount)||amount<=0)continue;
    raw.push({t,date,amount,currency,side,opening,note,account:name});
   }
  }
 }
 if(!isAll)return raw;
 // Net all cash legs in the SAME currency within one posted document.
 // Thus internal cash/bank transfers cannot inflate consolidated turnover;
 // genuine cash received or paid in a compound journal remains visible.
 const docs=new Map();
 for(const entry of raw){
  const t=entry.t;
  const doc=t.isMultiVoucher&&t.multiVoucherId?'multi:'+t.multiVoucherId:
   t.isOpeningBalance&&t.importVoucherId?'opening:'+t.importVoucherId:
   'entry:'+String(t.id??'');
  const key=doc+'\u001f'+entry.currency+'\u001f'+(entry.opening?'opening':'movement');
  let item=docs.get(key);
  if(!item){item={...entry,net:0};docs.set(key,item);}
  item.net+=(entry.side==='debit'?entry.amount:-entry.amount);
 }
 const results=[];
 for(const item of docs.values()){
  if(Math.abs(item.net)<1e-7)continue;
  item.side=item.net>0?'debit':'credit';
  item.amount=Math.abs(item.net);delete item.net;
  results.push(item);
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
  const accounts=cashAccounts();renderCashDirectory();
  if(!accounts.length){byId('ratibPulseReadout').hidden=true;help('لا توجد حسابات نقدية معرفة في دليل الحسابات.');return;}
  const choices=[{value:ALL_CASH,label:'جميع الصناديق والبنوك'},...accounts];
  const account=options('ratibPulseAccount',choices,byId('ratibPulseAccount')?.value||lastAccount);
  const all=validEntries(account,accounts);
  const baseCurrency=typeof getRatibBaseCurrency==='function'?getRatibBaseCurrency():'YER';
  const preferred=/^[A-Z]{3}$/.test(baseCurrency)?baseCurrency:'YER';
  const currencies=[...new Set(all.map(x=>x.currency))].sort((a,b)=>a===preferred?-1:b===preferred?1:a.localeCompare(b));
  if(!currencies.length)currencies.push(preferred);
  const currency=options('ratibPulseCurrency',currencies.map(c=>({value:c,label:typeof accountCurrencyLabel==='function'?accountCurrencyLabel(c):c})),byId('ratibPulseCurrency')?.value||lastCurrency||preferred);
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
  help('حركة '+scope.label+' — '+visible.length+' حركة مرحّلة'+(account===ALL_CASH?' في '+accounts.length+' حساب نقدي وبنكي (بعد استبعاد التحويلات الداخلية من إجمالي الحركة)':'')+'. الأرصدة الافتتاحية ليست مقبوضات.');
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
 '<div id="ratibPulseBody" hidden><details class="ratib-pulse-account-picker"><summary id="ratibPulseAccountSummary">تحديد حسابات النقدية</summary><div class="ratib-pulse-account-tools"><input type="search" id="ratibPulseAccountSearch" placeholder="البحث في جميع حسابات الدليل..." aria-label="البحث عن حساب نقدي"><button type="button" id="ratibPulseAccountReset">إلغاء الإضافات اليدوية</button></div><p class="ratib-pulse-muted">اختر الحسابات النقدية التي لم تُدرج تلقائيًا. لا تتغير أرصدة أو قيود الحسابات.</p><div id="ratibPulseAccountList" class="ratib-pulse-account-list"></div></details><div class="ratib-pulse-filters"><label>الصندوق أو البنك<select id="ratibPulseAccount"></select></label><label>العملة<select id="ratibPulseCurrency"></select></label><label>الفترة<select id="ratibPulsePeriod"><option value="month">هذا الشهر</option><option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="year">هذه السنة</option><option value="all">من البداية</option></select></label></div><p id="ratibPulseStatus" class="ratib-pulse-muted" role="status"></p>'+
 '<div id="ratibPulseReadout" hidden><div class="ratib-pulse-visual"><div class="ratib-pulse-circle-wrap"><svg class="ratib-pulse-ring" viewBox="0 0 220 220" width="220" height="220" fill="none" role="img" aria-label="المقبوضات باللون الأخضر والمدفوعات باللون الذهبي"><circle class="ratib-pulse-track" cx="110" cy="110" r="71"/><circle id="ratibPulseGreenArc" class="ratib-pulse-arc ratib-pulse-green" cx="110" cy="110" r="71" role="button" tabindex="0" aria-label="تفاصيل المقبوضات"/><circle id="ratibPulseGoldArc" class="ratib-pulse-arc ratib-pulse-gold" cx="110" cy="110" r="71" role="button" tabindex="0" aria-label="تفاصيل المدفوعات"/></svg><div class="ratib-pulse-center"><small>الرصيد الحالي</small><strong id="ratibPulseClosing">—</strong><small>حتى اليوم</small></div></div>'+
 '<div class="ratib-pulse-values"><div class="ratib-pulse-val"><small>الرصيد أول الفترة</small><strong id="ratibPulseBeginning">—</strong></div><button type="button" data-pulse-side="debit" class="ratib-pulse-val"><small><i class="ratib-pulse-dot green"></i>المقبوضات</small><strong id="ratibPulseIncome">—</strong></button><button type="button" data-pulse-side="credit" class="ratib-pulse-val"><small><i class="ratib-pulse-dot gold"></i>المدفوعات</small><strong id="ratibPulseExpense">—</strong></button><div class="ratib-pulse-val"><small>صافي الحركة</small><strong id="ratibPulseNet">—</strong></div></div></div>'+
 '<div id="ratibPulseDetails" class="ratib-pulse-details" hidden><div class="ratib-pulse-details-title"><b id="ratibPulseDetailsTitle"></b><div class="ratib-pulse-details-actions"><button id="ratibPulseStatement" type="button" class="ratib-pulse-statement">كشف الحساب</button><button id="ratibPulseDismiss" type="button" aria-label="إغلاق تفاصيل الحركات">×</button></div></div><div id="ratibPulseList" class="ratib-pulse-list"></div></div></div></div>';
 const main=dashboard.querySelector('.main-menu-grid');
 if(main)main.insertAdjacentElement('afterend',root);else dashboard.append(root);
 setupCashDirectory();
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
loadExtraCash();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.RatibCashPulse={refresh:schedule};
})();