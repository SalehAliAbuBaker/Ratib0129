/* Ratib 3.6.150 — approved compound-journal output ONLY.
 * Preview, print and shared PDF read a single immutable display model.
 * No posting, balancing, rounding, or ledger records are modified here. */
(function(){
'use strict';
const COLUMN_TITLES=['م','الحساب','مدين','دائن','العملة','سعر الصرف','مبلغ التقييم','بند الميزانية','البيان'];
const PDF_WIDTHS=[56,300,171,171,98,137,168,173,294]; // Exactly 1568px: A4 landscape inner width
const enc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asText=v=>String(v??'').trim();
const number=v=>{const n=Number(String(v??0).replace(/[٬,]/g,''));return Number.isFinite(n)?n:0};
const fmt=(value,precision=6)=>number(value).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:precision});
const amountCell=v=>v===null||v===undefined||v===''?'—':fmt(v);
function referenceModel(doc){
 if(!doc||!Array.isArray(doc.lines)||['income','spend'].includes(doc.mode))throw Error('قالب القيد المركب مخصص للقيد المركب فقط.');
 const baseCurrency=asText(doc.baseCurrency)||'YER',cfg=getHeaderConfig();
 const budgets=new Map((getCats()||[]).map(c=>[c.id,c.name]));
 const rawLines=doc.lines.filter(l=>l&&!l.autoBalance);
 const rows=rawLines.map((line,i)=>{
  const currency=asText(line.currency)||baseCurrency,original=number(line.amount);
  const exactRate=Number(String(line.rate??'').replace(/,/g,''));
  const rate=currency===baseCurrency?1:(Number.isFinite(exactRate)&&exactRate>0?exactRate:0);
  const storedBase=Number(String(line.base??'').replace(/,/g,''));
  const valuation=Number.isFinite(storedBase)?storedBase:(rate>0?original*rate:0);
  const debit=line.side!=='credit',account=asText(line.account);
  let accountCode='';
  try{accountCode=asText(getAccountCode(account));if(accountCode==='—')accountCode='';}catch(_){}
  return {seq:i+1,side:debit?'debit':'credit',account,accountCode,
   currency,rate:rate?fmt(rate,6):'—',
   debit:debit?original:null,credit:debit?null:original,
   valuation,valuationText:rate?fmt(valuation):'—',budget:asText(budgets.get(line.budgetId||'general'))||'',
   note:asText(line.note||line.notes||'')};
 });
 const byCurrency=new Map();
 for(const row of rows){
  const g=byCurrency.get(row.currency)||{currency:row.currency,debit:0,credit:0};
  if(row.side==='debit')g.debit+=number(row.debit);else g.credit+=number(row.credit);
  byCurrency.set(row.currency,g);
 }
 const baseDebit=rows.filter(r=>r.side==='debit').reduce((a,r)=>a+r.valuation,0);
 const baseCredit=rows.filter(r=>r.side==='credit').reduce((a,r)=>a+r.valuation,0);
 const epsilon=Math.pow(10,-Math.min(4,Math.max(0,Math.log10(Math.max(baseDebit,baseCredit,1))-10)));
 const balanced=Math.abs(baseDebit-baseCredit)<Math.max(0.000001,epsilon);
 const budgetNames=[...new Set(rows.map(r=>r.budget).filter(Boolean))];
 return {title:'سند قيد مركب',seq:asText(doc.seq),date:asText(doc.date),
  baseCurrency,header:cfg,description:asText(doc.note),party:asText(doc.party),
  budget:budgetNames.length===1?budgetNames[0]:budgetNames.length>1?'بنود متعددة':'',
  rows:rows.length?rows:[{seq:'',side:'debit',account:'',accountCode:'',debit:null,credit:null,currency:'',rate:'',valuationText:'',budget:'',note:''}],
  byCurrency:[...byCurrency.values()],baseDebit,baseCredit,balanced,difference:Math.abs(baseDebit-baseCredit),
  signatureKey:'compound'};
}
function html(d){
 const m=referenceModel(d),date=m.date?ratibStatementDateHtml(m.date):'&nbsp;';
 const cell=(value,cls='')=>'<td'+(cls?' class="'+cls+'"':'')+'>'+enc(value===null||value===undefined||value===''?'':value)+'</td>';
 const rowHtml=m.rows.map(r=>'<tr class="ratib-cmp-out-line">'+cell(r.seq)+
  '<td class="ratib-cmp-out-account">'+enc(r.account)+(r.accountCode?'<small>رقم الحساب: '+enc(r.accountCode)+'</small>':'')+'</td>'+
  cell(amountCell(r.debit),'ratib-cmp-out-num')+cell(amountCell(r.credit),'ratib-cmp-out-num')+
  cell(r.currency)+cell(r.rate,'ratib-cmp-out-num')+cell(r.valuationText,'ratib-cmp-out-num')+
  cell(r.budget)+cell(r.note,'ratib-cmp-out-note')+'</tr>').join('');
 const totals=m.byCurrency.map(g=>'<tr><td>'+enc(g.currency)+'</td><td>'+enc(fmt(g.debit))+'</td><td>'+enc(fmt(g.credit))+'</td></tr>').join('')||
 '<tr><td>—</td><td>—</td><td>—</td></tr>';
 return '<article class="ratib-compound-reference" dir="rtl">'+
  '<div class="ratib-cmp-out-head"><div class="ratib-cmp-out-identity"><b>راتب</b><span>للتنظيم والتدبير المالي</span></div>'+
  '<div class="ratib-cmp-out-title">سند قيد مركب</div>'+
  '<div class="ratib-cmp-out-number">رقم السند <strong>'+enc(m.seq)+'</strong></div></div>'+
  '<div class="ratib-cmp-out-info">'+
  '<div><b>التاريخ:</b> '+date+'</div><div><b>العملة الأساسية:</b> '+enc(m.baseCurrency)+'</div>'+
  '<div><b>بند الميزانية:</b> '+enc(m.budget)+'</div><div><b>وصف القيد:</b> '+enc(m.description)+'</div>'+
  (m.party?'<div class="ratib-cmp-out-party"><b>الجهة:</b> '+enc(m.party)+'</div>':'')+
  '</div><div class="ratib-cmp-out-table-wrap"><table class="ratib-cmp-out-table"><colgroup>'+
  PDF_WIDTHS.map(w=>'<col style="width:'+(100*w/1568).toFixed(4)+'%">').join('')+'</colgroup>'+
  '<thead><tr>'+COLUMN_TITLES.map(t=>'<th>'+enc(t)+'</th>').join('')+'</tr></thead>'+
  '<tbody>'+rowHtml+'</tbody></table></div>'+
  '<div class="ratib-cmp-out-summary"><div><b>الإجماليات حسب العملة</b><table class="ratib-cmp-out-total-table"><thead><tr><th>العملة</th><th>المدين</th><th>الدائن</th></tr></thead><tbody>'+totals+'</tbody></table></div>'+
  '<div class="ratib-cmp-out-valuation"><b>الإجمالي بالعملة الأساسية ('+enc(m.baseCurrency)+')</b>'+
  '<div>مدين <strong>'+enc(fmt(m.baseDebit))+'</strong></div><div>دائن <strong>'+enc(fmt(m.baseCredit))+'</strong></div>'+
  '<div class="ratib-cmp-out-status '+(m.balanced?'ratib-cmp-out-balanced':'ratib-cmp-out-unbalanced')+'">'+
  (m.balanced?'✓ القيد متوازن':'فرق التقييم: '+enc(fmt(m.difference)))+'</div></div></div></article>';
}
function prepare(d){
 const m=referenceModel(d),cfg=m.header;
 window.RatibPrintLogo?.syncPrint?.();
 for(const [id,value] of Object.entries({
  pvOrgName:cfg.show?cfg.name||'':'',pvOrgDetails:cfg.show?cfg.details||'':'',
  pvVoucherTitle:'سند قيد مركب رقم '+m.seq,pvAmount:fmt(m.baseDebit)+' '+m.baseCurrency,
  pvDebit:m.rows.filter(r=>r.side==='debit').map(r=>r.account).filter(Boolean).join('، '),
  pvCredit:m.rows.filter(r=>r.side==='credit').map(r=>r.account).filter(Boolean).join('، '),
  pvTafqit:'',pvNote:m.description
 })){
  const node=document.getElementById(id);if(node)node.textContent=value;
 }
 const date=document.getElementById('pvDate');if(date)date.innerHTML=m.date?ratibStatementDateHtml(m.date):'';
 const recipient=document.getElementById('pvRecipientRow');if(recipient)recipient.style.display='none';
 const signRow=document.getElementById('pvRecipientSignRow');if(signRow)signRow.style.display='none';
 const table=document.getElementById('pvTableBox');if(!table)throw Error('لم يتم العثور على موضع سند الطباعة.');
 table.innerHTML=html(d);
 window.RatibSignatureSettings?.fillVoucher?.('compound');
}
function* pages(d){
 const m=referenceModel(d),W=1684,H=1190,L=58,R=W-58,CONTENT=W-116,MAX=H-92;
 let canvas,ctx,y,frameTop,number=0;
 const text=(value,x,top,size=19,bold=false,maxWidth)=>{
  ctx.fillStyle='#163524';ctx.font=(bold?'700 ':'500 ')+size+'px Tajawal,Arial,sans-serif';
  if(maxWidth)ctx.fillText(String(value??''),x,top,maxWidth);else ctx.fillText(String(value??''),x,top);
 };
 const wrap=(value,maxWidth,size=18)=>{
  ctx.font='500 '+size+'px Tajawal,Arial,sans-serif';
  return String(value??'').split(/\r?\n/).flatMap(part=>wrapCanvasText(ctx,part,maxWidth));
 };
 const stroke=(x,top,w,h,color='#b9cbc2')=>{ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.strokeRect(x,top,w,h)};
 const boxText=(label,value,x,top,maxWidth)=>{text(label,x,top,18,true,maxWidth);text(value,x,top+28,18,false,maxWidth)};
 function start(){
  canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas._ratibTemporary=true;
  ctx=canvas.getContext('2d');if(!ctx)throw Error('تعذر إنشاء لوحة طباعة القيد المركب');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textAlign='right';
  ctx.fillStyle='#0b6643';ctx.fillRect(L,36,CONTENT,6);
  ctx.fillStyle='#d6b65d';ctx.fillRect(L,43,CONTENT,3);
  if(m.header.show){
   if(m.header.name)text(m.header.name,R,88,23,true,660);
   if(m.header.details)text(m.header.details,R,111,15,false,660);
  }
  text('راتب – للتنظيم والتدبير المالي',L+680,90,25,true,655);
  ctx.fillStyle='#e2f3e9';ctx.fillRect(W/2-232,122,464,58);
  stroke(W/2-232,122,464,58,'#b99e47');
  ctx.textAlign='center';text(m.title,W/2,161,31,true,420);
  ctx.textAlign='right';
  const dateObj=m.date?ratibCanvasDateParts(m.date):{primary:'',secondary:''};
  boxText('رقم السند',m.seq,R,216,280);
  text('التاريخ: '+(dateObj.primary||''),W/2+140,214,18,true,560);
  if(dateObj.secondary)text(dateObj.secondary,W/2+140,237,14,false,560);
  text('العملة الأساسية: '+m.baseCurrency,L+675,214,18,true,630);
  text('بند الميزانية: '+m.budget,L+675,241,17,false,630);
  text('صفحة '+(++number),L+110,164,14,false,120);
  frameTop=270;y=frameTop+20;
  if(m.description){
   const lines=wrap(m.description,CONTENT-195,18);
   const shown=lines.slice(0,2);text('البيان:',R-10,y+16,19,true,150);
   shown.forEach((value,i)=>text(value,R-172,y+16+i*25,18,false,CONTENT-190));
   y+=Math.max(44,shown.length*25+12);
   // Remaining description lines are printed below the table as continuation if necessary.
  }
  tableHeading();
 }
 function tableHeading(){
  let right=R;
  COLUMN_TITLES.forEach((v,i)=>{
   const left=right-PDF_WIDTHS[i];ctx.fillStyle='#e0f0e8';ctx.fillRect(left,y,PDF_WIDTHS[i],45);
   stroke(left,y,PDF_WIDTHS[i],45,'#789780');
   ctx.textAlign='center';text(v,left+PDF_WIDTHS[i]/2,y+29,16,true,PDF_WIDTHS[i]-8);right=left;
  });ctx.textAlign='right';y+=45;
 }
 function lineGroups(r){
  const values=[String(r.seq),r.account+(r.accountCode?'\nرقم الحساب: '+r.accountCode:''),
   amountCell(r.debit),amountCell(r.credit),r.currency,r.rate,r.valuationText,r.budget,r.note];
  return values.map((value,i)=>wrap(value,PDF_WIDTHS[i]-14,i===1||i===8?17:18));
 }
 function drawRow(cells,height){
  let right=R;
  cells.forEach((arr,i)=>{
   const left=right-PDF_WIDTHS[i];stroke(left,y,PDF_WIDTHS[i],height,'#9cb1a5');
   ctx.textAlign=(i===1||i===8)?'right':'center';
   const x=ctx.textAlign==='right'?right-8:left+PDF_WIDTHS[i]/2;
   arr.forEach((v,j)=>text(v,x,y+25+j*24,17,i===2||i===3,PDF_WIDTHS[i]-15));
   right=left;
  });ctx.textAlign='right';y+=height;
 }
 function closeFrame(){
  stroke(L,frameTop,CONTENT,Math.min(MAX-frameTop+10,Math.max(70,y-frameTop+12)),'#0b6643');
  ctx.fillStyle='#0b6643';ctx.fillRect(L,H-49,CONTENT,4);
 }
 start();
 for(const r of m.rows){
  const columns=lineGroups(r),total=Math.max(...columns.map(a=>a.length),1);let off=0;
  while(off<total){
   if(y+55>MAX){closeFrame();yield canvas;start();}
   const available=Math.max(1,Math.floor((MAX-y-16)/24));
   const count=Math.min(total-off,available);
   const sliced=columns.map((c,i)=>c.slice(off,off+count));
   drawRow(sliced,Math.max(46,count*24+12));off+=count;
  }
 }
 function space(h){
  if(y+h>MAX){closeFrame();const former=canvas;canvas=null;return former;}return null;
 }
 const totalRows=Math.max(m.byCurrency.length,1),totalsHeight=76+totalRows*32+90;
 const sigHeight=window.RatibSignatureSettings?.height?.('compound')||0;
 const captionParts=m.description?wrap(m.description,CONTENT-110,17).slice(2):[];
 const captionHeight=captionParts.length?30+captionParts.length*23:0;
 if(space(totalsHeight+captionHeight+sigHeight+28)){yield canvas;start();}
 y+=17;
 text('الإجماليات حسب العملة',R-12,y+15,20,true,440);y+=26;
 for(const g of m.byCurrency.length?m.byCurrency:[{currency:'—',debit:0,credit:0}]){
  text(g.currency,R-15,y+18,17,true,120);
  text('مدين: '+fmt(g.debit),R-195,y+18,17,false,250);
  text('دائن: '+fmt(g.credit),R-485,y+18,17,false,250);
  y+=32;
 }
 ctx.strokeStyle='#d7e4da';ctx.beginPath();ctx.moveTo(L+10,y+5);ctx.lineTo(R-10,y+5);ctx.stroke();y+=26;
 text('إجمالي التقييم '+m.baseCurrency,R-15,y+13,19,true,360);
 text('مدين: '+fmt(m.baseDebit),R-405,y+13,19,true,310);
 text('دائن: '+fmt(m.baseCredit),R-765,y+13,19,true,310);
 y+=34;text(m.balanced?'✓ القيد متوازن':'فرق التقييم: '+fmt(m.difference),R-15,y+14,18,true,430);y+=32;
 if(captionParts.length){
  text('استكمال البيان:',R-15,y+13,17,true,200);y+=22;
  for(const part of captionParts){
   if(y+27>MAX){closeFrame();yield canvas;start();}
   text(part,R-24,y+16,16,false,CONTENT-60);y+=23;
  }
 }
 if(sigHeight){
  if(y+sigHeight+24>MAX){closeFrame();yield canvas;start();}
  ctx.strokeStyle='#d1dfd4';ctx.beginPath();ctx.moveTo(L+10,y+8);ctx.lineTo(R-10,y+8);ctx.stroke();
  window.RatibSignatureSettings.drawCanvas(ctx,'compound',W,y+18);
  y+=sigHeight+22;
 }
 closeFrame();yield canvas;
}
function pdf(d){return buildPdfFromCanvases(pages(d),[842,595]);}
window.RatibCompoundOutput={model:referenceModel,html,prepare,pdf,pages,COLUMN_TITLES};
})();