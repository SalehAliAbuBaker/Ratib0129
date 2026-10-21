/* Ratib 3.6.144 TRIAL: read-only cash-flow vs financial-performance dashboard.
   Source: existing journal legs, canonical account catalog and documented FX engine.
   Never edits vouchers, account balances, storage or approved reports. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const round=n=>Math.round((n+Number.EPSILON)*1e6)/1e6;
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safe=n=>Number.isFinite(n)?n:0;
const cashKind=entry=>entry.main==='الأصول'&&
 (String(entry.subCode)==='1101'||/(?:النقدية|النقد|الصناديق|الصندوق|البنوك|البنك|المصارف)/.test(entry.sub||''));
const docKey=tx=>String(tx.multiVoucherId?'multi:'+tx.multiVoucherId:tx.commerceId?'commerce:'+tx.commerceId:'single:'+(tx.id||tx.seqNum||'')); 
const financeType=(row)=>{
 if(row.main==='الإيرادات')return 'revenue';
 if(row.main==='المصروفات')return 'expense';
 if(cashKind(row))return 'cash';
 return 'other';
};
function classify(catalog){
 const map=new Map(),cashNames=new Set();
 for(const row of catalog||[])for(const d of row.details||[]){
  if(!d?.[1])continue;
  const name=String(d[1]),old=map.get(name),type=financeType(row);
  if(old&&old.type!==type){map.set(name,{type:'unknown',code:String(d[0]||'')});cashNames.delete(name);continue;}
  map.set(name,{type,code:String(d[0]||''),name,main:row.main,sub:row.sub});
  if(type==='cash')cashNames.add(name);
 }
 return {map,cashNames};
}
function compute(txs,catalog,currency,period,currentMonth,getLegs,convert){
 const {map,cashNames}=classify(catalog);
 const grouped=new Map(),result={cashIn:0,cashOut:0,cashNet:0,cashBalance:0,revenue:0,expenses:0,surplus:0},
 missing={cash:false,activity:false},unknown=new Set(),rows={cashIn:[],cashOut:[],cashNet:[],cashBalance:[],revenue:[],expenses:[],surplus:[]};
 const notes=[];
 const active=t=>t&&t.status!=='reversed'&&t.status!=='deleted'&&t.status!=='draft'&&t.status!=='pending';
 const inPeriod=date=>period!=='current'||String(date).startsWith(currentMonth+'-');
 for(const t of (Array.isArray(txs)?txs:[])){
  if(!active(t))continue;
  let legs=[];try{legs=getLegs(t)||[]}catch(_){notes.push('تعذّر قراءة أحد أطراف القيود');continue;}
  for(const leg of legs){
   const date=String(leg.date||t.isoDate||'').slice(0,10),account=String(leg.account||'').trim(),entry=map.get(account);
   const kind=entry?.type||'unknown',key=docKey(t)+'|'+date;
   if(!/^\d{4}-\d\d-\d\d$/.test(date)||!account){notes.push('توجد حركة بتصنيف أو تاريخ غير قابل للمراجعة');continue;}
   if(!entry){unknown.add(account);}
   if(!['cash','revenue','expense'].includes(kind))continue;
   if(!grouped.has(key))grouped.set(key,{date,doc:t.seqNum||'',type:String(t.type||t.voucherMode||'سند'),tx:t,cash:0,cashMissing:false,allOpening:true,lines:[]});
   const group=grouped.get(key);
   let equivalent=null;
   try{equivalent=convert(leg,currency);}catch(_){}
   const valid=equivalent&&Number.isFinite(Number(equivalent.debit))&&Number.isFinite(Number(equivalent.credit));
   if(!valid){
    if(kind==='cash')group.cashMissing=true;
    if(kind==='cash')missing.cash=true;
    else if(inPeriod(date)&&!leg.opening)missing.activity=true;
    continue;
   }
   const debit=Number(equivalent.debit),credit=Number(equivalent.credit);
   const row={date,doc:String(group.doc||'—'),type:group.type,account,currency,amount:0,reference:String(t.id||'')};
   if(kind==='cash'){
    group.allOpening=group.allOpening&&!!leg.opening;
    const value=round(debit-credit);group.cash+=value;
    row.amount=value;rows.cashBalance.push(row);result.cashBalance+=value;
   }
   if(leg.opening||!inPeriod(date))continue;
   if(kind==='revenue'){
    const value=round(credit-debit);result.revenue+=value;
    row.amount=value;rows.revenue.push(row);rows.surplus.push(row);
   }else if(kind==='expense'){
    const value=round(debit-credit);result.expenses+=value;
    row.amount=value;rows.expenses.push(row);rows.surplus.push({...row,amount:-value});
   }
  }
 }
 // Net cash change PER DOCUMENT, so an internal bank-to-cash transfer is not
 // counted as either an inflow or an outflow. Original opening balances are not flow.
 for(const group of grouped.values()){
  if(!inPeriod(group.date))continue;
  if(group.allOpening||group.cashMissing)continue;
  const cash=round(group.cash);
  if(Math.abs(cash)<0.000001)continue;
  const row={date:group.date,doc:String(group.doc||'—'),type:group.type,account:'حركة نقدية خارجية',currency,amount:cash,reference:String(group.tx.id||'')};
  rows.cashNet.push(row);
  if(cash>0){result.cashIn+=cash;rows.cashIn.push(row);}
  else{result.cashOut-=cash;rows.cashOut.push({...row,amount:-cash});}
 }
 result.cashNet=result.cashIn-result.cashOut;
 result.surplus=result.revenue-result.expenses;
 for(const k of Object.keys(result))result[k]=round(result[k]);
 if(!cashNames.size){missing.cash=true;notes.push('لم تُحدد حسابات النقدية والبنوك من شجرة الحسابات');}
 if(unknown.size){notes.push('حسابات تحتاج تصنيفًا في شجرة الحسابات: '+[...unknown].slice(0,4).join('، ')+(unknown.size>4?'، وغيرها':''));missing.activity=true;missing.cash=true;}
 return {values:result,rows,missing,notes,currency,period,cashAccounts:[...cashNames],unknown:[...unknown]};
}
window.RatibDashboardFinance144={compute,classify};
let view='cash',latest=null,modal=null,rendering=false;
const money=(value,currency)=>value===null?'—':Number(value).toLocaleString('en-US',{maximumFractionDigits:6})+' '+(currency==='YER'?'ر.ي':currency==='SAR'?'ر.س':currency==='USD'?'دولار':currency);
const titleMap={cashIn:'المقبوضات الخارجية',cashOut:'المدفوعات الخارجية',cashNet:'صافي الحركة النقدية',cashBalance:'رصيد النقدية والبنوك',revenue:'الإيرادات الفعلية',expenses:'المصروفات الفعلية',surplus:'الفائض أو العجز'};
const definitions={
 cash:[['cashNet','صافي الحركة النقدية'],['cashIn','المقبوضات الخارجية'],['cashOut','المدفوعات الخارجية'],['cashBalance','رصيد النقدية والبنوك']],
 activity:[['surplus','الفائض أو العجز'],['revenue','الإيرادات الفعلية'],['expenses','المصروفات الفعلية']]
};
function read(){
 const currency=$('currency')?.value||'YER',period=$('dashboardPeriod')?.value||'all';
 const txs=typeof getAllTransactions==='function'?getAllTransactions():[];
 const catalog=typeof getCanonicalCatalog==='function'?getCanonicalCatalog():[];
 const currentMonth=typeof monthKey==='function'?monthKey():new Date().toISOString().slice(0,7);
 return compute(txs,catalog,currency,period,currentMonth,t=>trialTransactionLegs(t),(leg,target)=>trialEquivalent(leg,target,'approved'));
}
function setup(){
 const card=$('proDashboardCard'),filter=card?.querySelector('.dashboard-period'),old=card?.querySelector('.pro-kpi-grid');
 if(!card||!filter||!old||$('ratibDashboardFinance144'))return;
 const root=document.createElement('section');root.id='ratibDashboardFinance144';root.className='ratib-finance-panel';root.setAttribute('aria-label','الملخص المالي المحاسبي');
 root.innerHTML='<div class="ratib-finance-tabs" role="group" aria-label="نوع الملخص"><button type="button" data-finance-view="cash" aria-pressed="true">الحركة النقدية</button><button type="button" data-finance-view="activity" aria-pressed="false">نتيجة النشاط</button></div><div class="ratib-finance-grid" id="ratibFinanceGrid"></div><p class="ratib-finance-note" id="ratibFinanceNote"></p>';
 filter.after(root);old.classList.add('ratib-finance-legacy');
 root.querySelectorAll('[data-finance-view]').forEach(b=>b.addEventListener('click',()=>{
   view=b.dataset.financeView;root.querySelectorAll('[data-finance-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();
 }));
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-finance-metric]');if(b)details(b.dataset.financeMetric,b);
 });
 // Use a DOM listener in addition to the application's own update callback.
 for(const id of ['currency','dashboardPeriod'])$(id)?.addEventListener('change',()=>refresh());
 const oldUpdate=typeof updateProDashboard==='function'?updateProDashboard:null;
 if(oldUpdate&&!oldUpdate.ratibFinance144){
  const replacement=function(...args){const out=oldUpdate.apply(this,args);refresh();return out;};
  replacement.ratibFinance144=true;
  updateProDashboard=replacement;
 }
 refresh();
}
function refresh(){
 if(!$('ratibDashboardFinance144')||rendering)return;
 rendering=true;
 try{
  latest=read();
  const oldNet=$('proNetKpi');
  if(oldNet)oldNet.textContent=latest.missing.cash?'—':money(latest.values.cashNet,latest.currency);
  paint();
 }catch(err){
  const note=$('ratibFinanceNote');if(note)note.textContent='تعذّر استخراج الملخص، يرجى مراجعة القيود: '+String(err?.message||err);
 }finally{rendering=false;}
}
function paint(){
 const grid=$('ratibFinanceGrid'),note=$('ratibFinanceNote');
 if(!grid||!note||!latest)return;
 grid.replaceChildren();
 for(const [key,label] of definitions[view]){
  const warn=key==='cashIn'||key==='cashOut'||key==='cashNet'||key==='cashBalance'?latest.missing.cash:latest.missing.activity;
  const btn=document.createElement('button');btn.type='button';btn.className='ratib-finance-card'+(key==='cashNet'||key==='surplus'?' ratib-finance-main':'');
  btn.dataset.financeMetric=key;btn.setAttribute('aria-label','عرض تفاصيل '+label);
  const span=document.createElement('span');span.textContent=label;
  const strong=document.createElement('strong');strong.textContent=money(warn?null:latest.values[key],latest.currency);
  const small=document.createElement('small');small.textContent=warn?'يحتاج مراجعة':'اضغط لعرض تفاصيل الاحتساب';
  btn.append(span,strong,small);grid.append(btn);
 }
 const explanations=view==='cash'?'التحويل بين حسابين نقديين لا يُعد قبضًا أو صرفًا خارجيًا. الرصيد يشمل الحركات الافتتاحية.':'الإيرادات والمصروفات مستخرجة من الحسابات التفصيلية بدليل الحسابات، لا من نوع سند القبض أو الصرف.';
 note.textContent=explanations+(latest.notes.length?' مراجعة: '+latest.notes.join('؛ '):'');
}
let focusBefore=null;
function details(key,opener){
 if(!latest)return;
 if(modal)modal.remove();focusBefore=opener;
 const warn=(key.startsWith('cash')?latest.missing.cash:latest.missing.activity);
 modal=document.createElement('div');modal.id='ratibFinanceDetailModal';modal.className='ratib-finance-overlay no-print';modal.setAttribute('role','presentation');
 const dialog=document.createElement('section');dialog.className='ratib-finance-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label','تفاصيل '+titleMap[key]);
 const heading=document.createElement('div');heading.className='ratib-finance-detail-head';
 const title=document.createElement('strong');title.textContent=titleMap[key];
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','إغلاق التفاصيل');
 heading.append(title,close);
 const summary=document.createElement('p');summary.className='ratib-finance-detail-total';
 summary.textContent='الإجمالي: '+(warn?'يتطلب مراجعة التصنيف أو التحويل':money(latest.values[key],latest.currency));
 const status=document.createElement('p');status.className='ratib-finance-detail-status';
 status.textContent=warn?'لم تُعرض قيمة نهائية حتى تُراجع الحسابات أو أسعار الصرف الموثقة.':'تفاصيل أطراف القيود الداخلة في هذا المؤشر، دون تكرار التحويلات الداخلية.';
 const tableWrap=document.createElement('div');tableWrap.className='ratib-finance-rows';
 const table=document.createElement('table');const thead=document.createElement('thead');
 thead.innerHTML='<tr><th>التاريخ / المستند</th><th>الحساب أو البيان</th><th>الحركة</th></tr>';const tbody=document.createElement('tbody');table.append(thead,tbody);tableWrap.append(table);
 const lines=(latest.rows[key]||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
 let shown=0;
 function appendRows(){
  for(const line of lines.slice(shown,shown+75)){
   const tr=document.createElement('tr');
   for(const value of [line.date+' · '+line.doc,line.account,money(line.amount,latest.currency)]){
    const td=document.createElement('td');td.textContent=value;tr.append(td);
   }tbody.append(tr);
  }
  shown=Math.min(lines.length,shown+75);
  more.hidden=shown>=lines.length;more.textContent='عرض المزيد ('+shown+' من '+lines.length+')';
 }
 const more=document.createElement('button');more.type='button';more.className='ratib-finance-more';more.addEventListener('click',appendRows);
 dialog.append(heading,summary,status,tableWrap,more);
 modal.append(dialog);document.body.append(modal);appendRows();close.focus();
 const dismiss=()=>{modal?.remove();modal=null;document.removeEventListener('keydown',onKey,true);focusBefore?.focus({preventScroll:true});};
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
 document.addEventListener('keydown',onKey,true);close.addEventListener('click',dismiss);
 modal.addEventListener('click',e=>{if(e.target===modal)dismiss()});
}
function start(){
 const loginVersion=document.querySelector('.ratib-login-version');if(loginVersion)loginVersion.textContent='الإصدار 3.6.146 (تجريبية)';
 if($('ratibDashboardFinance144'))return;
 setup();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
window.addEventListener('load',start,{once:true});
})();
