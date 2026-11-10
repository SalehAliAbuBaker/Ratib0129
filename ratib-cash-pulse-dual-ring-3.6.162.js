/* Ratib 3.6.163 improvement to 3.6.162 — read-only, responsive dual-ring Cash Pulse visualization.
   Financial values arrive from the existing Cash Pulse accounting engine.
   This module never posts, modifies, or persists an accounting record. */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg', $=id=>document.getElementById(id);
const money=(n,c)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(Number(n)||0)+(c?' '+c:'');
const num=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
const percent=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n)+'%';
const safeColor=v=>/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(String(v||''))?v:'#64748b';
const svg=(tag,attributes={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e;};
let selected='',activeSide='credit',lastModel=null,lastModels=null,lastSnapshot=null;
const selectedBySide={debit:'',credit:''};
function categories(){
 const defaults=typeof DEFAULT_CATS!=='undefined'&&Array.isArray(DEFAULT_CATS)?DEFAULT_CATS:[];
 let stored=null;
 try{stored=typeof store!=='undefined'?store.get('cats',null):null;}catch(_){/* locked: show defaults only */}
 const core=new Set(defaults.map(c=>String(c.id)));
 const saved=new Map((Array.isArray(stored)?stored:[]).filter(c=>c&&c.id).map(c=>[String(c.id),c]));
 const custom=Array.isArray(stored)?stored.filter(c=>c&&c.id&&!core.has(String(c.id))):[];
 // Read saved configuration without calling the legacy getCats() migration,
 // which may write to the store. Never persist from this dashboard.
 return [...defaults.map(c=>({...c,...(saved.get(String(c.id))||{})})),...custom].filter(c=>c&&c.id).map(c=>({
  id:String(c.id),name:String(c.name||c.id),color:safeColor(c.color),
  pct:Number.isFinite(Number(c.pct))?Math.max(0,Number(c.pct)):0
 }));
}
function docKey(e){
 const t=e.t||{};
 return t.isMultiVoucher&&t.multiVoucherId?'multi:'+String(t.multiVoucherId):
   t.isOpeningBalance&&t.importVoucherId?'opening:'+String(t.importVoucherId):
   'entry:'+String(t.id??'');
}
// Classify only the actually posted counterpart lines. A receipt increases
// cash (debit), so its classified budget lines are CREDIT; for a payment the
// relationship is reversed. The balancing cash line is never a budget item.
function assignments(tx,currency,catIds,side='credit',context={}){
 const expected=side==='debit'?'income':'spend';
 const d=tx?.multiVoucher;
 const mode=String(d?.mode||tx?.voucherMode||'');
 if(['income','spend'].includes(mode)&&mode!==expected)return [];
 if(d&&Array.isArray(d.lines)&&String(d.baseCurrency||tx.currency||'YER')===currency&&mode===expected){
  // Do not try the transaction's own distribution as a fallback: that can
  // belong to the cash balancing line and misattribute all money to "عام".
  return d.lines.filter(l=>!l.autoBalance&&l.side===(side==='debit'?'credit':'debit')&&
    catIds.has(String(l.budgetId||'general'))).map(l=>({
     id:String(l.budgetId||'general'),amount:num(l.base)
    })).filter(x=>x.amount>0);
 }
 if(d&&['income','spend'].includes(mode))return []; // Unknown foreign-currency conversion: never guess.
 const entries=Object.entries(tx?.distribution||{}).filter(([id,v])=>catIds.has(id)&&v&&!v.excluded);
 const explicit=entries.some(([id])=>id!=='general');
 // A posted SIMPLE journal can carry an explicitly saved "عام" allocation.
 // Previously the mode check ignored that allocation just because the
 // journal is 'entry' rather than a receipt/payment voucher. Do not infer
 // General from the journal title, note or cash side, or classify any
 // multi-entry transfer by this exception.
 const selected=context.selectedCashAccounts instanceof Set?context.selectedCashAccounts:null;
 const cashAccount=String(context.cashAccount||'').trim();
 const sideAccount=String(side==='debit'?(tx?.debitAccount||''):(tx?.creditAccount||'')).trim();
 const internalCashTransfer=selected?.has(String(tx?.debitAccount||''))&&selected?.has(String(tx?.creditAccount||''));
 const simpleGeneral=mode==='entry'&&!tx?.isMultiVoucher&&!d&&
  cashAccount&&cashAccount===sideAccount&&
  (!selected||selected.has(cashAccount))&&!internalCashTransfer&&
  !!String(tx?.debitAccount||'').trim()&&!!String(tx?.creditAccount||'').trim()&&
  entries.some(([id,item])=>id==='general'&&Number(item?.amount)>0);
 if(mode!==expected&&!explicit&&!simpleGeneral)return [];
 const booked=entries.map(([id,item])=>({
  id,amount:num(item.amount||(+item.pct>0?num(tx.amount)*num(item.pct)/100:0))
 })).filter(x=>x.amount>0);
 // Older saved cash receipts/payments may not have a distribution object.
 // A confirmed receipt/payment without explicit categories belongs to the
 // default General category. Never apply this fallback to simple journals,
 // internal transfers, opening balances or a movement of the opposite side.
 if(!booked.length&&mode===expected&&catIds.has('general')&&num(tx?.amount)>0)
  return [{id:'general',amount:num(tx.amount)}];
 return booked;
}
function buildBudgetModel(entries,cats,currency,side='credit',selectedCashAccounts=[]){
 const available=new Map(cats.map(c=>[c.id,{...c,spent:0,count:0}]));
 // General must remain available for posted historical movements even after
 // the user edits/archives budget definitions. Never change the ledger.
 if(!available.has('general'))available.set('general',{id:'general',name:'عام',color:'#64748b',pct:0,spent:0,count:0});
 const groups=new Map(),ids=new Set(available.keys());
 const selected=new Set(Array.isArray(selectedCashAccounts)?selectedCashAccounts:[]);
 for(const e of entries||[]){
  if(!e||e.opening||e.side!==side||e.currency!==currency||!e.t)continue;
  const key=docKey(e)+'\u001f'+currency+'\u001f'+side;
  const existing=groups.get(key)||{tx:e.t,amount:0,key,account:e.account||''};
  existing.amount+=num(e.amount);groups.set(key,existing);
 }
 let movement=0,classified=0,classifiedDocuments=0;
 for(const doc of groups.values()){
  movement+=doc.amount;
  const assigned=assignments(doc.tx,currency,ids,side,{cashAccount:doc.account,selectedCashAccounts:selected});
  const rawTotal=assigned.reduce((sum,item)=>sum+item.amount,0);
  if(rawTotal<=0||doc.amount<=0)continue;
  // Net cash movements may be smaller than the individual voucher lines
  // (e.g. internal transfers). Do not classify beyond the real cash movement.
  const scale=Math.min(1,doc.amount/rawTotal);
  let documentClassified=0;
  const touched=new Set();
  for(const item of assigned){
   const part=item.amount*scale;
   if(part<=0)continue;
   const category=available.get(item.id);
   category.spent+=part;
   touched.add(item.id);classified+=part;documentClassified+=part;
  }
  if(documentClassified>0)classifiedDocuments++;
  for(const id of touched)available.get(id).count++;
 }
 const rows=[...available.values()].map(row=>({...row,
   actualPct:classified>0?row.spent/classified*100:null,
   delta:classified>0?row.spent/classified*100-row.pct:null}));
 return {rows,classified,movement,receipts:side==='debit'?movement:0,
   payments:side==='credit'?movement:0,unclassified:Math.max(0,movement-classified),
   classifiedDocuments,totalDocuments:groups.size,currency,side};
}
function point(cx,cy,r,degrees){
 const a=degrees*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];
}
function wedge(a,b,outer=168,inner=121){
 // Never draw a fake slice for a zero-percentage category.
 const start=point(180,180,outer,a),end=point(180,180,outer,b),
       insideEnd=point(180,180,inner,b),insideStart=point(180,180,inner,a),
       big=b-a>180?1:0;
 return 'M '+start.join(' ')+' A '+outer+' '+outer+' 0 '+big+' 1 '+end.join(' ')+
   ' L '+insideEnd.join(' ')+' A '+inner+' '+inner+' 0 '+big+' 0 '+insideStart.join(' ')+' Z';
}
function ensure(){
 const readout=$('ratibPulseReadout');if(!readout)return null;
 let host=$('ratibPulseDual');
 if(host)return host;
 host=document.createElement('section');host.id='ratibPulseDual';
 host.className='ratib-dual';
 host.setAttribute('aria-label','مؤشر نبض الصندوق وحركة الحساب وبنود الميزانية');
 host.innerHTML=
 '<div class="ratib-dual-heading"><b>حركة الحساب وبنود الميزانية</b><small>مؤشر تفاعلي • البيانات المحاسبية المرحّلة فقط</small></div>'+
 '<div class="ratib-dual-budget-switch" role="group" aria-label="اختر تحليل المقبوضات أو المصروفات"><button type="button" data-budget-side="debit" aria-pressed="false">بنود المقبوضات</button><button type="button" data-budget-side="credit" aria-pressed="true">بنود المصروفات</button></div>'+
 '<div class="ratib-dual-layout">'+
 '<div class="ratib-dual-metrics" aria-label="مؤشرات حركة الحساب">'+
 '<button type="button" data-flow="debit" class="ratib-dual-metric receipt"><small>↗ المقبوضات</small><strong id="ratibDualReceipts">—</strong></button>'+
 '<button type="button" data-flow="credit" class="ratib-dual-metric expense"><small>↘ المصروفات</small><strong id="ratibDualPayments">—</strong></button>'+
 '<div class="ratib-dual-metric neutral"><small>صافي الحركة</small><strong id="ratibDualNet">—</strong></div>'+
 '<div class="ratib-dual-metric balance"><small>الرصيد الحالي</small><strong id="ratibDualBalance">—</strong></div></div>'+
 '<div class="ratib-dual-figure"><svg id="ratibDualSvg" viewBox="0 0 360 360" role="group" aria-label="الحلقة الخارجية للمصروفات الفعلية حسب البند والداخلية لحركة الحساب" focusable="false"></svg>'+
 '<div class="ratib-dual-center"><small id="ratibDualCenterAccount">الحساب المختار</small><b id="ratibDualCenterBalance">—</b><span id="ratibDualStatus" class="ratib-dual-status">—</span></div></div>'+
 '<div class="ratib-dual-legend" aria-label="بنود الميزانية ذات الحركات الفعلية"><b id="ratibDualLegendTitle">بنود المصروفات المستخدمة</b><small id="ratibDualLegendCaption">لون كل بند وإجمالي المبلغ</small><div id="ratibDualLegend"></div></div></div>'+
 '<div class="ratib-dual-budget-summary" id="ratibDualSummary" role="status"></div>'+
 '<div id="ratibDualDetail" class="ratib-dual-detail" aria-live="polite"></div>';
 const old=readout.querySelector('.ratib-pulse-visual');
 if(old)old.before(host);else readout.prepend(host);
 host.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-budget-side]');
  if(toggle){setBudgetSide(toggle.dataset.budgetSide);return;}
  const button=event.target.closest('[data-flow]');
  if(button){setBudgetSide(button.dataset.flow);global.RatibCashPulse?.openDetails?.(button.dataset.flow);}
  const pick=event.target.closest('[data-budget-id]');
  if(pick){selected=pick.dataset.budgetId;renderSelection();}
 });
 // Only hide the original readout once its replacement is ready.
 readout.classList.add('ratib-dual-ready');
 return host;
}
function renderArc(container,receipts,payments){
 const track=svg('circle',{cx:180,cy:180,r:101,class:'ratib-dual-flow-track'});
 container.append(track);
 const total=receipts+payments,circ=2*Math.PI*101;
 for(const [side,amount,color,offset,label] of [
  ['debit',receipts,'ratib-dual-income',0,'المقبوضات'],
  ['credit',payments,'ratib-dual-outcome',receipts,'المصروفات']
 ]){
  if(!(amount>0&&total>0))continue;
  const circle=svg('circle',{
   cx:180,cy:180,r:101,class:'ratib-dual-flow '+color,
   'stroke-dasharray':(circ*amount/total)+' '+circ,
   'stroke-dashoffset':-circ*offset/total,
   transform:'rotate(-90 180 180)',role:'button',tabindex:0,
   'aria-label':label+': '+money(amount,lastSnapshot.currency)
  });
  circle.addEventListener('click',()=>{setBudgetSide(side);global.RatibCashPulse?.openDetails?.(side);});
  circle.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();circle.dispatchEvent(new MouseEvent('click'));}
  });
  container.append(circle);
 }
}
function renderRing(rows){
 const svgEl=$('ratibDualSvg');svgEl.replaceChildren();
 // Leave room for readable, colored pointer labels while keeping the ring centered.
 svgEl.setAttribute('viewBox','-60 -60 480 480');
 const total=rows.reduce((sum,row)=>sum+num(row.spent),0);
 svgEl.append(svg('circle',{cx:180,cy:180,r:144,class:'ratib-dual-budget-track'}));
 let angle=-90;
 const pointers=[];
 for(const row of rows){
  const span=total>0?360*num(row.spent)/total:0;
  if(span>0.2){
   const gap=Math.min(1,span*.08),end=angle+span-gap;
   const path=svg('path',{d:wedge(angle+gap,end),fill:row.color,
    class:'ratib-dual-sector'+(selected===row.id?' is-active':''),
    'data-budget-id':row.id,role:'button',tabindex:0,
    'aria-label':row.name+'، إجمالي المصروف '+money(row.spent,lastSnapshot.currency)});
   path.addEventListener('click',()=>{selected=row.id;renderSelection();});
   path.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();selected=row.id;renderSelection();}
   });
   svgEl.append(path);
   if(rows.length<=3&&span>=12)pointers.push({row,angle:angle+span/2});
  }
  angle+=span;
 }
 renderArc(svgEl,num(lastSnapshot.receipts),num(lastSnapshot.payments));
 svgEl.append(svg('circle',{cx:180,cy:180,r:73,class:'ratib-dual-inner-track'}));
 // For a few active categories, point at their actual colored sector.
 // With many categories, the adjacent color/amount legend remains readable.
 for(const item of pointers){
  const start=point(180,180,169,item.angle),end=point(180,180,188,item.angle);
  const at=point(180,180,206,item.angle);
  const x=Math.max(-14,Math.min(374,at[0]));
  const y=Math.max(-12,Math.min(379,at[1]));
  const group=svg('g',{class:'ratib-dual-callout','data-budget-id':item.row.id,
    role:'button',tabindex:0,'aria-label':item.row.name+'، '+money(item.row.spent,lastSnapshot.currency)});
  const leader=svg('line',{x1:start[0],y1:start[1],x2:end[0],y2:end[1],
    stroke:item.row.color,class:'ratib-dual-callout-line'});
  const dot=svg('circle',{cx:end[0],cy:end[1],r:3.3,fill:item.row.color});
  const label=svg('text',{x,y:y-4,class:'ratib-dual-callout-name','text-anchor':'middle'});
  label.textContent=item.row.name.length>17?item.row.name.slice(0,15)+'…':item.row.name;
  const amount=svg('text',{x,y:y+12,class:'ratib-dual-callout-amount','text-anchor':'middle'});
  amount.textContent=money(item.row.spent);
  group.append(leader,dot,label,amount);
  group.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();selected=item.row.id;renderSelection();}
  });
  svgEl.append(group);
 }
}
function addText(parent,tag,textValue,className){
 const node=document.createElement(tag);
 if(className)node.className=className;
 node.textContent=textValue;parent.append(node);return node;
}
function renderLegend(rows){
 const box=$('ratibDualLegend');box.replaceChildren();
 for(const c of rows){
  const btn=document.createElement('button');btn.type='button';
  btn.dataset.budgetId=c.id;btn.className='ratib-dual-legend-item'+(c.id===selected?' is-active':'');
  btn.setAttribute('aria-pressed',String(c.id===selected));
  const swatch=document.createElement('i');swatch.style.backgroundColor=c.color;
  const label=document.createElement('span');label.textContent=c.name;
  const amount=document.createElement('strong');amount.textContent=money(c.spent,lastModel.currency);
  btn.append(swatch,label,amount);box.append(btn);
 }
}
function renderSelection(){
 if(!lastModel)return;
 const active=lastModel.rows.filter(c=>c.spent>1e-8);
 const row=active.find(c=>c.id===selected)||active[0];
 if(!row)return;
 selected=row.id;selectedBySide[activeSide]=row.id;
 const box=$('ratibDualDetail');box.replaceChildren();
 const head=document.createElement('div');head.className='ratib-dual-detail-title';
 const dot=document.createElement('i');dot.style.backgroundColor=row.color;head.append(dot);
 addText(head,'b',row.name);box.append(head);
 const kpis=document.createElement('div');kpis.className='ratib-dual-detail-grid';
 for(const [label,value] of [
  [activeSide==='debit'?'إجمالي مقبوض البند':'إجمالي مصروف البند',money(row.spent,lastModel.currency)],
  [activeSide==='debit'?'نسبته من المقبوضات المصنفة':'نسبته من المصروفات المصنفة',row.actualPct===null?'—':percent(row.actualPct)],
  ['عدد المستندات',String(row.count)],
  ['متوسط المستند',money(row.count?row.spent/row.count:0,lastModel.currency)]
 ]){
  const tile=document.createElement('div');addText(tile,'small',label);
  addText(tile,'strong',value);kpis.append(tile);
 }
 box.append(kpis);
 addText(box,'small','تُظهر الدائرة البنود المستخدمة فعليًا في '+(activeSide==='debit'?'سندات القبض':'سندات الصرف')+'، ويُحدد حجم القطاع بحسب المبالغ المحصلة أو المصروفة في الفترة المختارة.');
 for(const element of $('ratibDualSvg').querySelectorAll('[data-budget-id]')){
  element.classList.toggle('is-active',element.getAttribute('data-budget-id')===selected);
 }
 for(const element of $('ratibDualLegend').querySelectorAll('[data-budget-id]')){
  const active=element.dataset.budgetId===selected;
  element.classList.toggle('is-active',active);element.setAttribute('aria-pressed',String(active));
 }
}
function renderSummary(model){
 const box=$('ratibDualSummary');box.replaceChildren();
 const count=model.rows.filter(row=>row.spent>0).length;
 const receiving=activeSide==='debit';
 addText(box,'span',(receiving?'المقبوضات':'المصروفات')+' المصنفة: '+money(model.classified,model.currency));
 addText(box,'span','بنود مستخدمة: '+count);
 if(model.unclassified>1e-5)addText(box,'span','حركة '+(receiving?'قبض':'صرف')+' غير مصنفة: '+money(model.unclassified,model.currency),'ratib-dual-unclassified');
 if(!model.classified)addText(box,'small','لا توجد '+(receiving?'مقبوضات':'مصروفات')+' مرتبطة ببنود الميزانية خلال هذه الفترة.');
}
function renderBudget(){
 if(!lastModels)return;
 lastModel=lastModels[activeSide];
 const activeRows=lastModel.rows.filter(row=>row.spent>1e-8);
 if(!activeRows.some(row=>row.id===selected))selected=activeRows[0]?.id||'';
 selectedBySide[activeSide]=selected;
 const receiving=activeSide==='debit';
 for(const button of $('ratibPulseDual').querySelectorAll('[data-budget-side]')){
  const active=button.dataset.budgetSide===activeSide;
  button.classList.toggle('is-active',active);
  button.setAttribute('aria-pressed',String(active));
 }
 $('ratibDualLegendTitle').textContent=receiving?'بنود المقبوضات المستخدمة':'بنود المصروفات المستخدمة';
 $('ratibDualLegendCaption').textContent='لون كل بند وإجمالي '+(receiving?'المقبوض':'المصروف')+' عليه';
 $('ratibDualSvg').setAttribute('aria-label',receiving?'تصنيف بنود المقبوضات':'تصنيف بنود المصروفات');
 renderRing(activeRows);renderLegend(activeRows);renderSummary(lastModel);
 if(activeRows.length)renderSelection();else $('ratibDualDetail').textContent='لا توجد بنود مستخدمة في سندات '+(receiving?'القبض':'الصرف')+' للحساب والفترة المختارين.';
}
function setBudgetSide(next){
 if(next!=='debit'&&next!=='credit')return;
 selectedBySide[activeSide]=selected;
 activeSide=next;
 selected=selectedBySide[next]||'';
 if(lastModels)renderBudget();
}
function update(snapshot){
 if(!snapshot||!$('ratibCashPulse')||!$('ratibPulseReadout'))return;
 if(!ensure())return;
 lastSnapshot=snapshot;
 const cats=categories();
 lastModels={
  debit:buildBudgetModel(snapshot.entries,cats,snapshot.currency,'debit',snapshot.selectedAccounts),
  credit:buildBudgetModel(snapshot.entries,cats,snapshot.currency,'credit',snapshot.selectedAccounts)
 };
 const set=(id,value)=>{const e=$(id);if(e)e.textContent=value;};
 set('ratibDualReceipts',money(snapshot.receipts,snapshot.currency));
 set('ratibDualPayments',money(snapshot.payments,snapshot.currency));
 set('ratibDualNet',money(snapshot.receipts-snapshot.payments,snapshot.currency));
 set('ratibDualBalance',money(snapshot.closing,snapshot.currency));
 set('ratibDualCenterBalance',money(snapshot.closing,snapshot.currency));
 set('ratibDualCenterAccount',snapshot.accountLabel||'الصندوق');
 const status=snapshot.closing<0?'رصيد سالب':snapshot.closing===0?'رصيد صفر':'رصيد موجب';
 const element=$('ratibDualStatus');element.textContent=status;
 element.dataset.state=snapshot.closing<0?'negative':snapshot.closing===0?'zero':'positive';
 renderBudget();
}
function clear(){
 lastModel=null;lastModels=null;lastSnapshot=null;
 const section=$('ratibPulseDual');if(section)section.remove();
 $('ratibPulseReadout')?.classList.remove('ratib-dual-ready');
}
global.RatibCashPulseViz={update,clear,buildBudgetModel,assignments,setBudgetSide};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>global.RatibCashPulse?.refresh?.(),{once:true});
else global.RatibCashPulse?.refresh?.();
})(window);
