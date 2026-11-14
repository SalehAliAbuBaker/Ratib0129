/* Ratib 3.6.148 — output-only five-column reference for income/spend vouchers.
 * HTML preview/print and shared-data PDF; NEVER modifies posted financial data. */
(function(){
'use strict';
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').trim();
function amount(value){
 const n=Number(String(value??0).replace(/,/g,''));
 return Number.isFinite(n)?n:0;
}
function money(value){return amount(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function currencyName(code){
 try{return accountCurrencyLabel(code)||code||'';}catch(_){return code||'';}
}
function currencySymbol(code){return ({YER:'ر.ي',SAR:'ر.س',USD:'$'})[code]||code||'';}
/*
 * Read the signed account balance after the SAVED voucher (not a simulated
 * posting). Reprints use the ledger state at this document's position in the
 * dated transaction sequence, so later transactions are not included.
 */
function balanceAfterSavedVoucher(d){
 const mode=clean(d?.mode),voucherId=clean(d?.id);
 const names=[...new Set((Array.isArray(d?.lines)?d.lines:[])
   .filter(l=>l&&!l.autoBalance).map(l=>clean(l.account)).filter(Boolean))];
 const blank={text:'',negative:false};
 if(!voucherId||!names.length||!['income','spend'].includes(mode)||
    typeof getAllTransactions!=='function'||typeof trialTransactionLegs!=='function')return blank;
 try{
  // Show the account(s) from the printed voucher table, not the cash account.
  const all=getAllTransactions().filter(t=>t&&
   !['deleted','reversed','draft'].includes(clean(t.status).toLowerCase()));
  const belongs=t=>clean(t.voucherMode)===mode&&
   (clean(t.multiVoucherId)===voucherId||clean(t.id)===voucherId);
  const saved=all.filter(belongs);
  if(!saved.length)return blank;
  const expected=mode==='income'?'credit':'debit';
  const active=names.filter(name=>saved.some(t=>trialTransactionLegs(t).some(l=>
   clean(l.account)===name&&Number(l[expected]||0)>0)));
  if(!active.length)return blank;
  const dated=all.map((t,i)=>({t,i,date:clean(t.isoDate||t.date).slice(0,10)}))
   .sort((a,b)=>a.date.localeCompare(b.date)||a.i-b.i);
  let last=-1;
  dated.forEach((row,i)=>{if(belongs(row.t))last=i;});
  if(last<0)return blank;
  const totals=new Map(active.map(name=>[name,new Map()]));
  for(let i=0;i<=last;i++){
   for(const leg of trialTransactionLegs(dated[i].t)){
    const account=clean(leg.account),currency=clean(leg.currency);
    if(!totals.has(account)||!currency)continue;
    const debit=Number(leg.debit||0),credit=Number(leg.credit||0);
    if(!Number.isFinite(debit)||!Number.isFinite(credit))continue;
    const currencies=totals.get(account);
    currencies.set(currency,(currencies.get(currency)||0)+credit-debit);
   }
  }
  const rank=code=>({YER:0,SAR:1,USD:2})[code]??3;
  let reversed=false;
  const parts=[];
  for(const [account,balances] of totals){
   const currencies=[...balances].sort((a,b)=>rank(a[0])-rank(b[0])||
    currencyName(a[0]).localeCompare(currencyName(b[0]),'ar'));
   if(!currencies.length)continue;
   const labels=currencies.map(([code,raw])=>{
    const value=Math.round(raw*1e6)/1e6;
    const zero=Math.abs(value)<.0000005;
    const side=zero?'صفر':value<0?'مدين':'دائن';
    const opposite=!zero&&(expected==='credit'?value<0:value>0);
    if(opposite)reversed=true;
    const number=Math.abs(value).toLocaleString('en-US',{maximumFractionDigits:3});
    return currencyName(code)+': '+side+' '+(opposite?'-':'')+number;
   });
   parts.push((active.length>1?account+' — ':'')+labels.join('، '));
  }
  if(!parts.length)return blank;
  return {text:'الرصيد الحالي بعد السند: '+parts.join(' ؛ '),negative:reversed};
 }catch(error){console.warn('Could not calculate saved voucher running balance',error);return blank;}
}
function referenceModel(d){
 if(!d||!['income','spend'].includes(d.mode))throw Error('السند المرجعي مخصص لسندات القبض والصرف.');
 const categories=new Map((typeof getCats==='function'?getCats():[]).map(x=>[x.id,x.name]));
 const code=clean(d.baseCurrency)||'YER',isReceipt=d.mode==='income',lines=Array.isArray(d.lines)?d.lines.filter(l=>l&&!l.autoBalance):[];
 const note=clean(d.note),beneficiary=clean(d.beneficiary),source=clean(d.sourceAccount);
 const balanceAfter=balanceAfterSavedVoucher(d);
 const rows=lines.map(line=>{
  const cur=clean(line.currency)||code,acc=clean(line.account);
  let accountCode='';try{const val=getAccountCode(acc);accountCode=val==='—'?'':clean(val);}catch(_){}
  const notes=[clean(line.note),clean(line.notes)].filter((v,i,a)=>v&&a.indexOf(v)===i);
  // Honor the existing "show exchange equation" output preference; no revaluation is performed here.
  if(cur!==code&&typeof ratibVoucherShowPrintEquation==='function'&&ratibVoucherShowPrintEquation()){
   try{const formula=clean(spendSavedEquation(line,code));if(formula)notes.push(formula);}catch(_){}
  }
  return {account:acc,accountCode,amount:money(line.amount),currency:currencySymbol(cur),
   notes:notes.join(' — '),budget:clean(categories.get(line.budgetId||d.headerBudgetId)||'')};
 });
 return {
  isReceipt,title:isReceipt?'سند قبض':'سند صرف',seq:clean(d.seq)||'',
  date:clean(d.date),currencyCode:code,currencyName:currencyName(code),cashAccount:source,
  money:money(d.baseTotal),beneficiary,amountWords:typeof tafqitAccountCurrency==='function'?tafqitAccountCurrency(amount(d.baseTotal),code):'',
  notes:note,openingLabel:isReceipt?'استلمنا من':'صرفنا إلى',rows:rows.length?rows:[{account:'',accountCode:'',amount:'',currency:'',notes:'',budget:''}],
  signatureKey:isReceipt?'receipt':'payment',postBalance:balanceAfter.text,
  postBalanceNegative:balanceAfter.negative
 };
}
function html(d){
 const m=referenceModel(d),e=escapeText;
 const field=(label,value)=>'<div class="ratib-cash-statement"><span class="ratib-cash-caption">'+e(label)+'</span><span class="ratib-cash-value">'+(clean(value)?e(value):'&nbsp;')+'</span></div>';
 const hdr=(label,value)=>'<div class="ratib-cash-pair"><b>'+e(label)+'</b> '+(clean(value)?e(value):'&nbsp;')+'</div>';
 const rows=m.rows.map(r=>'<tr><td class="cash-account">'+e(r.account)+(r.accountCode?'<small>رقم الحساب: '+e(r.accountCode)+'</small>':'')+'</td>'+
 '<td class="cash-amount">'+e(r.amount)+'</td><td>'+e(r.currency)+'</td><td class="cash-notes">'+e(r.notes)+'</td><td>'+e(r.budget)+'</td></tr>').join('');
 return '<div class="ratib-cash-reference" dir="rtl">'+
 '<div class="ratib-cash-head"><div class="ratib-cash-head-right">'+hdr('رقم السند:',m.seq)+
 '<div class="ratib-cash-pair"><b>المبلغ:</b> <span class="ratib-cash-money">'+e(m.money)+'</span></div>'+hdr('العملة:',m.currencyName)+'</div>'+
 '<div class="ratib-cash-head-title">'+e(m.title)+'</div>'+
 '<div class="ratib-cash-head-left"><div class="ratib-cash-pair"><b>التاريخ:</b> '+(m.date?ratibStatementDateHtml(m.date):'&nbsp;')+'</div>'+hdr('الصندوق:',m.cashAccount)+'</div></div>'+
 '<div class="ratib-cash-frame"><div class="ratib-cash-narrative">'+
 field(m.openingLabel+' /',m.beneficiary)+field('مبلغ وقدره /',m.amountWords)+field('ملاحظات /',m.notes)+
 '</div><div class="ratib-cash-record-label">ويقيد في الحساب:</div>'+
 '<table class="ratib-cash-grid"><colgroup><col style="width:36%"><col style="width:14%"><col style="width:9%"><col style="width:26%"><col style="width:15%"></colgroup>'+
 '<thead><tr><th>الحساب</th><th>المبلغ</th><th>العملة</th><th>ملاحظات</th><th>بند الميزانية</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+ 
 (m.postBalance?'<div class="ratib-cash-post-balance" data-negative="'+(m.postBalanceNegative?'true':'false')+'" style="margin:7px 2px 0;text-align:right;font:500 9pt/1.5 Tajawal,Arial,sans-serif;color:'+(m.postBalanceNegative?'#c62828':'#475569')+';white-space:nowrap;break-inside:avoid;page-break-inside:avoid">'+e(m.postBalance)+'</div>':'')+'</div>';
}
function* pdfPages(d){
 const m=referenceModel(d),cfg=getHeaderConfig(),WIDTH=1190,HEIGHT=1684,LEFT=50,RIGHT=1140,INNER=1090,BOTTOM=1518;
 const widths=[390,153,98,285,164],labels=['الحساب','المبلغ','العملة','ملاحظات','بند الميزانية'];
 let canvas,ctx,y,pageNo=0,frameStart=315;
 function drawText(value,x,top,size=18,bold=false,maxWidth,color='#163524'){
  ctx.font=(bold?'700 ':'500 ')+size+'px Tajawal,Arial,sans-serif';
  ctx.fillStyle=color;if(Number.isFinite(maxWidth)&&maxWidth>0)ctx.fillText(String(value??''),x,top,maxWidth);else ctx.fillText(String(value??''),x,top);
 }
 function wrap(value,width,size=18){
  ctx.font='500 '+size+'px Tajawal,Arial,sans-serif';
  return String(value??'').split('\n').flatMap(line=>wrapCanvasText(ctx,line,width).map(String));
 }
 function page(){
  canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;canvas._ratibTemporary=true;
  ctx=canvas.getContext('2d');if(!ctx)throw Error('تعذر إنشاء صفحة PDF للسند');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.direction='rtl';ctx.textAlign='right';
  if(cfg.show){
   if(cfg.name)drawText(cfg.name,RIGHT,65,23,true,INNER);
   if(cfg.details)drawText(cfg.details,RIGHT,93,15,false,INNER);
   ctx.strokeStyle='#d6b65d';ctx.strokeRect(LEFT,112,INNER,1);
  }
  ctx.fillStyle='#e2f3e9';ctx.fillRect(450,125,290,60);
  ctx.strokeStyle='#c5a64b';ctx.strokeRect(450,125,290,60);
  ctx.textAlign='center';drawText(m.title,595,166,31,true,280);ctx.textAlign='right';
  drawText('رقم السند: '+m.seq,RIGHT-5,218,20,true,490);
  drawText('المبلغ: '+m.money,RIGHT-5,253,22,true,490);
  drawText('العملة: '+m.currencyName,RIGHT-5,285,17,true,490);
  ctx.textAlign='left';
  const dateParts=m.date?ratibCanvasDateParts(m.date):{primary:'',secondary:''};
  drawText('التاريخ: '+dateParts.primary,LEFT+5,215,17,true,480);
  if(dateParts.secondary)drawText(dateParts.secondary,LEFT+5,232,11,false,480);
  drawText('الصندوق: '+m.cashAccount,LEFT+5,265,17,true,480);
  ctx.textAlign='right';
  drawText('صفحة '+(++pageNo),RIGHT,1642,15);
  y=frameStart+24;
 }
 function closeFrame(){
  ctx.strokeStyle='#0b6643';ctx.lineWidth=1.5;ctx.strokeRect(LEFT,frameStart,INNER,Math.max(65,Math.min(1560-frameStart,y+12-frameStart)));
 }
 function narrate(label,value){
  const lines=wrap(value,INNER-235,18);
  let index=0;
  return {label,lines:lines.length?lines:[''],index};
 }
 function tableHeading(){
  let right=RIGHT;
  labels.forEach((label,i)=>{
   const x=right-widths[i];ctx.fillStyle='#e0f0e8';ctx.fillRect(x,y,widths[i],53);
   ctx.strokeStyle='#789780';ctx.lineWidth=1;ctx.strokeRect(x,y,widths[i],53);
   ctx.textAlign='center';drawText(label,x+widths[i]/2,y+33,17,true,widths[i]-12);right=x;
  });
  ctx.textAlign='right';y+=53;
 }
 function drawRow(groups,height){
  let right=RIGHT;
  groups.forEach((lines,i)=>{
   const x=right-widths[i];ctx.strokeStyle='#789780';ctx.lineWidth=1;ctx.strokeRect(x,y,widths[i],height);
   ctx.textAlign=i===0||i===3?'right':'center';
   const tx=ctx.textAlign==='right'?right-8:x+widths[i]/2;
   lines.forEach((line,j)=>drawText(line,tx,y+26+j*23,16,i===1,widths[i]-16));
   right=x;
  });
  ctx.textAlign='right';y+=height;
 }
 page();
 const phrases=[
  narrate(m.openingLabel+' /',m.beneficiary),
  narrate('مبلغ وقدره /',m.amountWords),
  narrate('ملاحظات /',m.notes)
 ];
 for(const block of phrases){
  while(block.index<block.lines.length){
   if(y+34>BOTTOM){closeFrame();yield canvas;page();}
   const capacity=Math.max(1,Math.floor((BOTTOM-y-13)/24));
   const chunk=block.lines.slice(block.index,block.index+capacity);
   drawText(block.label,RIGHT-15,y+19,18,true,205);
   chunk.forEach((line,j)=>drawText(line,RIGHT-225,y+19+j*24,18,false,INNER-245));
   y+=Math.max(34,chunk.length*24+10);block.index+=chunk.length;
  }
 }
 if(y+97>BOTTOM){closeFrame();yield canvas;page();}
 drawText('ويقيد في الحساب:',RIGHT-15,y+21,19,true,400);y+=35;tableHeading();
 for(const row of m.rows){
  const cells=[
   row.account+(row.accountCode?'\nرقم الحساب: '+row.accountCode:''),
   row.amount,row.currency,row.notes,row.budget
  ].map((value,i)=>wrap(value,widths[i]-16,i===0||i===3?16:17));
  const maxLines=Math.max(1,...cells.map(c=>c.length));let offset=0;
  while(offset<maxLines){
   if(y+46>BOTTOM){closeFrame();yield canvas;page();tableHeading();}
   const available=Math.max(1,Math.floor((BOTTOM-y-12)/23));
   const count=Math.min(maxLines-offset,available);
   const chunk=cells.map(col=>col.slice(offset,offset+count));
   const height=Math.max(48,count*23+13);
   drawRow(chunk,height);offset+=count;
  }
 }
 closeFrame();
 const signatureHeight=window.RatibSignatureSettings?.height?.(m.signatureKey)||0;
 const automatic=window.RatibSignatureSettings?.get?.(m.signatureKey)?.automatic===true;
 if(m.postBalance&&!automatic){
  if(y+50>BOTTOM){yield canvas;page();}
  ctx.textAlign='right';
  drawText(m.postBalance,RIGHT-12,y+32,15,false,INNER-24,m.postBalanceNegative?'#c62828':'#163524');
  y+=44;
 }
 if(signatureHeight){
  if(y+signatureHeight+75>BOTTOM){yield canvas;page();}
  window.RatibSignatureSettings.drawCanvas(ctx,m.signatureKey,WIDTH,y+26,
   automatic&&m.postBalance?{rightNote:m.postBalance,rightNoteNegative:m.postBalanceNegative}:undefined);
  y+=signatureHeight+26;
 }
 yield canvas;
}
function pdf(d){return buildPdfFromCanvases(pdfPages(d));}
window.RatibCashReference={model:referenceModel,html,pdf,pdfPages};
})();