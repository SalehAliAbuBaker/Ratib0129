/* Ratib 3.6.162 — read-only, responsive dual-ring Cash Pulse visualization.
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
let selected='',lastModel=null,lastSnapshot=null;
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
function assignments(tx,currency,catIds){
 const d=tx?.multiVoucher;
 if(d&&Array.isArray(d.lines)&&String(d.baseCurrency||tx.currency||'YER')===currency){
  const mode=String(d.mode||tx.voucherMode||'');
  const candidates=d.lines.filter(l=>!l.autoBalance&&l.side==='debit'&&
    (mode==='spend'||(l.budgetId&&l.budgetId!=='general'))&&catIds.has(String(l.budgetId||'general')));
  if(candidates.length){
   return candidates.map(l=>({id:String(l.budgetId||'general'),amount:num(l.base)})).filter(x=>x.amount>0);
  }
 }
 const entries=Object.entries(tx?.distribution||{}).filter(([id,v])=>catIds.has(id)&&v&&!v.excluded);
 const explicit=entries.some(([id])=>id!=='general');
 const cashSpend=tx?.isExpense===true||tx?.voucherMode==='spend'||tx?.multiVoucher?.mode==='spend';
 if(!cashSpend&&!explicit)return [];
 return entries.map(([id,d])=>({
  id,
  amount:num(d.amount||(+d.pct>0?num(tx.amount)*num(d.pct)/100:0))
 })).filter(x=>x.amount>0);
}
function buildBudgetModel(entries,cats,currency){
 const available=new Map(cats.map(c=>[c.id,{...c,spent:0,count:0}]));
 const groups=new Map(),ids=new Set(available.keys());
 for(const e of entries||[]){
  if(!e||e.opening||e.side!=='credit'||e.currency!==currency||!e.t)continue;
  const key=docKey(e)+'\u001f'+currency;
  const existing=groups.get(key)||{tx:e.t,amount:0,key};
  existing.amount+=num(e.amount);groups.set(key,existing);
 }
 let payments=0,classified=0,classifiedDocuments=0;
 for(const doc of groups.values()){
  payments+=doc.amount;
  const assigned=assignments(doc.tx,currency,ids),rawTotal=assigned.reduce((s,x)=>s+x.amount,0);
  if(rawTotal<=0||doc.amount<=0)continue;
  // One source can have several lines or imported partial legs: never attribute
  // more spending than the booked cash outflow in the selected currency.
  const scale=Math.min(1,doc.amount/rawTotal);
  let docClassified=0;
  const touched=new Set();
  for(const a of assigned){
   const part=a.amount*scale;
   if(part<=0)continue;
   const category=available.get(a.id);category.spent+=part;
   touched.add(a.id);classified+=part;docClassified+=part;
  }
  if(docClassified>0)classifiedDocuments++;
  for(const id of touched)available.get(id).count++;
 }
 const rows=[...available.values()].map(row=>({...row,
   actualPct:classified>0?row.spent/classified*100:null,
   delta:classified>0?row.spent/classified*100-row.pct:null}));
 return {rows,classified,payments,unclassified:Math.max(0,payments-classified),
   classifiedDocuments,totalDocuments:groups.size,currency};
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
 '<div class="ratib-dual-layout">'+
 '<div class="ratib-dual-metrics" aria-label="مؤشرات حركة الحساب">'+
 '<button type="button" data-flow="debit" class="ratib-dual-metric receipt"><small>↗ المقبوضات</small><strong id="ratibDualReceipts">—</strong></button>'+
 '<button type="button" data-flow="credit" class="ratib-dual-metric expense"><small>↘ المصروفات</small><strong id="ratibDualPayments">—</strong></button>'+
 '<div class="ratib-dual-metric neutral"><small>صافي الحركة</small><strong id="ratibDualNet">—</strong></div>'+
 '<div class="ratib-dual-metric balance"><small>الرصيد الحالي</small><strong id="ratibDualBalance">—</strong></div></div>'+
 '<div class="ratib-dual-figure"><svg id="ratibDualSvg" viewBox="0 0 360 360" role="group" aria-label="الحلقة الخارجية للنسب المعتمدة لبنود الميزانية والداخلية لحركة الحساب" focusable="false"></svg>'+
 '<div class="ratib-dual-center"><small id="ratibDualCenterAccount">الحساب المختار</small><b id="ratibDualCenterBalance">—</b><span id="ratibDualStatus" class="ratib-dual-status">—</span></div></div>'+
 '<div class="ratib-dual-legend" aria-label="بنود الميزانية والنسب المعتمدة"><b>بنود الميزانية</b><small>ألوان ونسب الإعدادات المعتمدة</small><div id="ratibDualLegend"></div></div></div>'+
 '<div class="ratib-dual-budget-summary" id="ratibDualSummary" role="status"></div>'+
 '<div id="ratibDualDetail" class="ratib-dual-detail" aria-live="polite"></div>';
 const old=readout.querySelector('.ratib-pulse-visual');
 if(old)old.before(host);else readout.prepend(host);
 host.addEventListener('click',event=>{
  const button=event.target.closest('[data-flow]');
  if(button)global.RatibCashPulse?.openDetails?.(button.dataset.flow);
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
  circle.addEventListener('click',()=>global.RatibCashPulse?.openDetails?.(side));
  circle.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();circle.dispatchEvent(new MouseEvent('click'));}
  });
  container.append(circle);
 }
}
function renderRing(rows){
 const svgEl=$('ratibDualSvg');svgEl.replaceChildren();
 const total=rows.reduce((n,c)=>n+c.pct,0);
 svgEl.append(svg('circle',{cx:180,cy:180,r:144,class:'ratib-dual-budget-track'}));
 let angle=-90;
 for(const row of rows){
  const span=total>0?360*row.pct/total:0;
  if(span>0.2){
   const gap=Math.min(1,span*.08),end=angle+span-gap;
   const path=svg('path',{d:wedge(angle+gap,end),fill:row.color,
    class:'ratib-dual-sector'+(selected===row.id?' is-active':''),
    'data-budget-id':row.id,role:'button',tabindex:0,
    'aria-label':row.name+'، النسبة المعتمدة '+percent(row.pct)});
   path.addEventListener('click',()=>{selected=row.id;renderSelection();});
   path.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();selected=row.id;renderSelection();}
   });
   svgEl.append(path);
  }
  angle+=span;
 }
 renderArc(svgEl,num(lastSnapshot.receipts),num(lastSnapshot.payments));
 const ring=svg('circle',{cx:180,cy:180,r:73,class:'ratib-dual-inner-track'});
 svgEl.append(ring);
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
  const amount=document.createElement('strong');amount.textContent=percent(c.pct);
  btn.append(swatch,label,amount);box.append(btn);
 }
}
function evaluate(row,model){
 if(!model.classified)return {name:'لا توجد مصروفات مصنفة للمقارنة',tone:'neutral'};
 if(row.delta>3)return {name:'أعلى من النسبة المرجعية',tone:'danger'};
 if(row.delta>=-1)return {name:'قريب من النسبة المرجعية',tone:'warn'};
 return {name:'أقل من النسبة المرجعية',tone:'success'};
}
function renderSelection(){
 if(!lastModel)return;
 const row=lastModel.rows.find(c=>c.id===selected)||lastModel.rows[0];
 if(!row)return;
 selected=row.id;
 const box=$('ratibDualDetail');box.replaceChildren();
 const head=document.createElement('div');head.className='ratib-dual-detail-title';
 const dot=document.createElement('i');dot.style.backgroundColor=row.color;head.append(dot);
 addText(head,'b',row.name);box.append(head);
 const kpis=document.createElement('div');kpis.className='ratib-dual-detail-grid';
 for(const [label,value] of [
  ['النسبة المعتمدة',percent(row.pct)],
  ['نسبته من المصروفات المصنفة',row.actualPct===null?'—':percent(row.actualPct)],
  ['الصرف المصنف',money(row.spent,lastModel.currency)],
  ['عدد المستندات',String(row.count)],
  ['متوسط المستند',money(row.count?row.spent/row.count:0,lastModel.currency)],
  ['الفرق عن النسبة المرجعية',row.delta===null?'—':(row.delta>0?'+':'')+percent(row.delta)]
 ]){
  const tile=document.createElement('div');addText(tile,'small',label);
  addText(tile,'strong',value);kpis.append(tile);
 }
 box.append(kpis);
 const state=evaluate(row,lastModel);
 addText(box,'p',state.name,'ratib-dual-evaluation '+state.tone);
 addText(box,'small','المقارنة بالنسب المعتمدة إرشادية لتوزيع المصروفات المصنفة، وليست حدًا ماليًا للمخصصات.');
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
 const nonzero=model.rows.filter(r=>r.spent>0).length;
 addText(box,'span','المصروفات المصنفة: '+money(model.classified,model.currency));
 addText(box,'span','بنود ذات حركة: '+nonzero+' من '+model.rows.length);
 if(model.unclassified>1e-5)addText(box,'span','حركة صرف غير مصنفة: '+money(model.unclassified,model.currency),'ratib-dual-unclassified');
 if(!model.classified)addText(box,'small','لا توجد مصروفات يمكن ربطها ببنود الميزانية المختارة خلال هذه الفترة.');
}
function update(snapshot){
 if(!snapshot||!$('ratibCashPulse')||!$('ratibPulseReadout'))return;
 if(!ensure())return;
 lastSnapshot=snapshot;
 const cats=categories();
 lastModel=buildBudgetModel(snapshot.entries,cats,snapshot.currency);
 if(!cats.some(c=>c.id===selected))selected=cats[0]?.id||'';
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
 renderRing(lastModel.rows);renderLegend(lastModel.rows);renderSummary(lastModel);
 if(lastModel.rows.length)renderSelection();else $('ratibDualDetail').textContent='لا توجد بنود ميزانية معرّفة.';
}
function clear(){
 lastModel=null;lastSnapshot=null;
 const section=$('ratibPulseDual');if(section)section.remove();
 $('ratibPulseReadout')?.classList.remove('ratib-dual-ready');
}
global.RatibCashPulseViz={update,clear,buildBudgetModel,assignments};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>global.RatibCashPulse?.refresh?.(),{once:true});
else global.RatibCashPulse?.refresh?.();
})(window);
