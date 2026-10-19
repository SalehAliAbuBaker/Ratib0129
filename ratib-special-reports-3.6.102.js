(function(){
'use strict';
const el=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>Math.abs(val(v))<0.0000005?'0':val(v).toLocaleString('en-US',{maximumFractionDigits:6});
const zero=v=>Math.abs(val(v))<0.000001;
const keys=['openingDebit','openingCredit','periodDebit','periodCredit','closingDebit','closingCredit'];
function calculate(from,to,currency,level){
 if(from&&to&&from>to)throw Error('تاريخ البداية بعد تاريخ النهاية');
 return trialBuildModel(getAllTransactions(),{from,to,currency:currency==='ALL'?'YER':currency,base:currency==='ALL'?'YER':currency,mode:currency==='ALL'?'original':'specific',level:String(level),costCenter:'',project:'',budget:'all',fxMethod:'entry',presentation:'brief',compact:false});
}
function movement(from,to,currency){
 const base=calculate(from,to,currency,4),rows=[];
 for(const account of base.accounts)for(const c of account.currencies){
  if(keys.every(k=>zero(c.native[k])))continue;
  rows.push({name:account.name,code:account.code,currency:c.currency,values:keys.map(k=>val(c.native[k]))});
 }
 rows.sort((a,b)=>String(a.code).localeCompare(String(b.code),'en',{numeric:true}));
 const totals=base.totals.filter(x=>currency==='ALL'||x.currency===currency);
 return {from,to,currency,rows,totals,warnings:base.warnings,title:'حركة الحسابات'};
}
function position(to,currency){
 if(!to)throw Error('حدد تاريخ المركز المالي');
 if(currency==='ALL'||!currency)throw Error('حدد العملة الأساسية لعرض المركز المالي');
 // Reuse the existing audited valuation engine without changing vouchers or
 // applying a new market rate retrospectively. Unlike the old 'specific' mode,
 // equivalent mode includes every account, irrespective of its native currency.
 const base=trialBuildModel(getAllTransactions(),{from:'',to,currency,base:currency,
  mode:'equivalent',level:'3',costCenter:'',project:'',budget:'all',
  fxMethod:'approved',presentation:'brief',compact:false});
 const groups={assets:[],liabilities:[],equity:[],revenue:[],expenses:[],unknown:[]};
 const kinds={'الأصول':'assets','الالتزامات':'liabilities','حقوق الملكية':'equity','الإيرادات':'revenue','المصروفات':'expenses'};
 for(const account of base.accounts){
  const dr=account.currencies.reduce((sum,row)=>sum+val(row.equivalent.closingDebit)-val(row.equivalent.closingCredit),0);
  const type=kinds[account.main]||'unknown';
  if(zero(dr))continue;
  groups[type].push({name:account.name,value:['assets','expenses','unknown'].includes(type)?dr:-dr});
 }
 const sum=name=>groups[name].reduce((a,x)=>a+x.value,0);
 const assets=sum('assets'),liabilities=sum('liabilities'),equity=sum('equity');
 const profit=sum('revenue')-sum('expenses'),other=sum('unknown');
 const total=liabilities+equity+profit,difference=assets-total;
 const missing=base.base.missing||0;
 const complete=!missing&&!base.reviewAccounts.length&&!groups.unknown.length&&!base.requiresReview;
 const balanced=complete&&zero(difference);
 // A partial converted statement must never be called 'balanced' or passed as
 // a final financial position just because its known amounts happen to cancel.
 const status=!complete?'incomplete':balanced?'balanced':'difference';
 const warnings=[];
 if(missing)warnings.push('المعادل بالعملة '+currency+' غير مكتمل: '+missing+' طرفًا بلا سعر تقييم موثق. الأرقام المعروضة جزئية ولا يجوز اعتبارها مركزًا ماليًا معتمدًا.');
 if(base.reviewAccounts.length||groups.unknown.length)warnings.push('توجد حسابات غير مصنفة في دليل الحسابات؛ لا يعتمد المركز المالي قبل مراجعتها.');
 if(base.requiresReview&&!missing&&!base.reviewAccounts.length&&!groups.unknown.length)warnings.push('توجد ملاحظات محاسبية في البيانات الأصلية تستلزم المراجعة قبل اعتماد المركز المالي.');
 if(status==='difference')warnings.push('فرق فعلي في المركز المالي بعد تقييم الأطراف المتاحة: '+fmt(difference)+' '+currency+'، لا تتم تسويته تلقائيًا.');
 if(missing) {
  const affected=new Map();
  for(const tx of getAllTransactions()){
   for(const leg of trialTransactionLegs(tx)){
    if(leg.date>to||trialEquivalent(leg,currency,'approved')!==null)continue;
    const key=typeof trialFxDocKey==='function'?trialFxDocKey(tx):String(tx.id||'');
    if(!affected.has(key))affected.set(key,{date:leg.date,count:0,ref:String(tx.seqNum||tx.documentNumber||tx.voucherNumber||tx.number||tx.id||'غير محدد')});
    affected.get(key).count++;
   }
  }
  if(affected.size)warnings.push('مستندات ينقصها تقييم موثق ('+affected.size+'): '+[...affected.values()].slice(0,12).map(x=>x.ref+' بتاريخ '+x.date+' ('+x.count+' طرف)').join('؛ ')+(affected.size>12?'؛ وغيرها':'')+'. يمكن مراجعتها عبر أداة التشخيص الموجودة مسبقًا.');
 }
 return {to,currency,groups,assets,liabilities,equity,profit,other,total,difference,
  missing,complete,balanced,status,warnings,title:'المركز المالي'};
}
const numeric=x=>'<b class="ratib-special-number" dir="ltr">'+safe(fmt(x))+'</b>';
const issues=notes=>notes?.length?'<details class="ratib-special-issues"><summary>⚠ ملاحظات التقرير ('+notes.length+')</summary>'+notes.map(s=>'<p>'+safe(s)+'</p>').join('')+'</details>':'';
function movementHtml(r){
 let lines=r.rows.map(a=>'<tr><th>'+safe(a.name)+' <small>'+safe(a.code)+'</small></th><td>'+safe(a.currency)+'</td>'+a.values.map(v=>'<td>'+numeric(v)+'</td>').join('')+'</tr>').join('');
 lines+=r.totals.map(t=>'<tr class="ratib-special-total"><th>إجمالي '+safe(t.currency)+'</th><td>'+safe(t.currency)+'</td>'+keys.map(k=>'<td>'+numeric(t[k])+'</td>').join('')+'</tr>').join('');
 return '<h2>حركة الحسابات</h2><p class="ratib-special-caption">من '+safe(r.from||'أول عملية')+' إلى '+safe(r.to||'آخر عملية')+' — '+safe(r.currency==='ALL'?'العملات منفصلة':r.currency)+'</p>'+
 '<div class="ratib-special-scroll"><table class="ratib-special-table"><thead><tr><th rowspan="2">الحساب</th><th rowspan="2">العملة</th><th colspan="2">رصيد سابق</th><th colspan="2">حركة الفترة</th><th colspan="2">صافي الرصيد</th></tr><tr>'+Array(3).fill('<th>مدين</th><th>دائن</th>').join('')+'</tr></thead><tbody>'+(lines||'<tr><td colspan="8">لا توجد حركة ضمن المرشحات</td></tr>')+'</tbody></table></div>'+issues(r.warnings);
}
function positionHtml(r){
 const rows=k=>r.groups[k].map(a=>'<div class="ratib-special-item"><span>'+safe(a.name)+'</span>'+numeric(a.value)+'</div>').join('')||'<p class="ratib-special-empty">لا توجد أرصدة</p>';
 const sect=(heading,group)=>'<h4>'+heading+'</h4>'+rows(group);
 const statusText=r.status==='incomplete'
  ?'⚠ المركز المالي غير مكتمل: '+r.missing+' طرفًا دون سعر تقييم موثق. الأرقام المعروضة جزئية.'
  :r.status==='balanced'?'✓ المركز المالي متوازن بالعملة الأساسية':'⚠ فرق يحتاج مراجعة: '+fmt(r.difference)+' '+r.currency;
 return '<h2>المركز المالي</h2><p class="ratib-special-caption">كما في '+safe(r.to)+' — المعادل بالعملة الأساسية '+safe(r.currency)+' (جميع العملات الأصلية)</p>'+
 '<div class="ratib-special-position"><section><h3>الأصول</h3>'+sect('الأصول','assets')+'<div class="ratib-special-sum">إجمالي الأصول '+numeric(r.assets)+'</div></section>'+
 '<section><h3>الالتزامات وحقوق الملكية</h3>'+sect('الالتزامات','liabilities')+sect('حقوق الملكية','equity')+
 '<div class="ratib-special-item"><span>نتيجة النشاط (ربح / خسارة)</span>'+numeric(r.profit)+'</div><div class="ratib-special-sum">الإجمالي '+numeric(r.total)+'</div></section></div>'+
 '<p class="ratib-special-check '+(r.status==='balanced'?'':'ratib-special-bad')+'">'+safe(statusText)+'</p>'+
 (r.groups.unknown.length?'<section class="ratib-special-unknown"><h4>حسابات غير مصنفة — للمراجعة</h4>'+rows('unknown')+'</section>':'')+issues(r.warnings);
}
function pdfGrid(kind,r){
 if(kind==='movement')return {heads:['الحساب','العملة','سابق م','سابق د','حركة م','حركة د','ختامي م','ختامي د'],widths:[330,96,190,190,190,190,190,190],rows:[
 ...r.rows.map(a=>[a.name,a.currency,...a.values.map(fmt)]),...r.totals.map(t=>['الإجمالي',t.currency,...keys.map(k=>fmt(t[k]))])]};
 const a=r.groups.assets.map(x=>[x.name,fmt(x.value)]),b=[...r.groups.liabilities,...r.groups.equity].map(x=>[x.name,fmt(x.value)]);
 b.push(['نتيجة النشاط',fmt(r.profit)]);
 const rows=Array.from({length:Math.max(a.length,b.length)},(_,i)=>[...(a[i]||['','']),...(b[i]||['',''])]);
 rows.push(['إجمالي الأصول',fmt(r.assets),'إجمالي الالتزامات والملكية والنتيجة',fmt(r.total)]);
 rows.push(['فرق المعادل',r.status==='incomplete'?'غير مكتمل':fmt(r.difference),'الحالة',r.status==='incomplete'?'غير مكتمل — أسعار تقييم ناقصة':r.status==='balanced'?'متوازن':'غير متوازن']);
 if(r.groups.unknown.length)for(const row of r.groups.unknown)rows.push([row.name,fmt(row.value),'حساب غير مصنف','للمراجعة']);
 return {heads:['الأصول','المبلغ','الالتزامات والملكية','المبلغ'],widths:[540,250,540,250],rows};
}
function canvases(kind,r){
 const t=pdfGrid(kind,r),W=1700,H=1140,left=60,top=170,rowHeight=42,per=20,pages=[];
 for(let offset=0;offset<Math.max(1,t.rows.length);offset+=per){
  const c=document.createElement('canvas');c.width=W;c.height=H;c._ratibTemporary=true;
  const ctx=c.getContext('2d');if(!ctx)throw Error('تعذر تجهيز PDF');
  ctx.direction='rtl';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#0b5b45';ctx.textAlign='center';ctx.font='bold 34px Tajawal,Arial';ctx.fillText(r.title,W/2,52);
  ctx.fillStyle='#344054';ctx.font='22px Tajawal,Arial';ctx.fillText(kind==='movement'?'من '+(r.from||'البداية')+' إلى '+(r.to||'النهاية')+' — '+(r.currency==='ALL'?'العملات منفصلة':r.currency):'كما في '+r.to+' — '+r.currency,W/2,94);
  ctx.font='17px Tajawal,Arial';ctx.fillText('راتب للتنظيم والتدبير المالي',W/2,132);
  function draw(items,y,head){
   let right=W-left;
   items.forEach((item,i)=>{
    const width=t.widths[i];ctx.fillStyle=head?'#e4ece8':'#fff';ctx.fillRect(right-width,y,width,rowHeight);ctx.strokeStyle='#a9b8b1';ctx.strokeRect(right-width,y,width,rowHeight);
    ctx.fillStyle='#152d24';ctx.font=(head?'bold ':'')+'18px Tajawal,Arial';ctx.textAlign=i===0||t.heads.length===4&&i===2?'right':'center';
    ctx.fillText(String(item),i===0||t.heads.length===4&&i===2?right-9:right-width/2,y+rowHeight/2,width-15);right-=width;
   });
  }
  draw(t.heads,top,true);t.rows.slice(offset,offset+per).forEach((a,i)=>draw(a,top+(i+1)*rowHeight,false));
  ctx.fillStyle='#64748b';ctx.textAlign='center';ctx.font='18px Tajawal,Arial';ctx.fillText('صفحة '+(pages.length+1)+(kind==='movement'?' — الأرقام حسب عملتها الأصلية':' — المركز المالي بمعادل '+r.currency+(r.status==='incomplete'?' — غير مكتمل':'')),W/2,H-45);pages.push(c);
 }
 return pages;
}
const saved={movement:null,position:null};
function generate(kind){
 try{
  const r=kind==='movement'?movement(el('ratibMovementFrom').value,el('ratibMovementTo').value,el('ratibMovementCurrency').value):position(el('ratibPositionDate').value,el('ratibPositionCurrency').value);
  saved[kind]=r;el(kind==='movement'?'ratibMovementReportBody':'ratibPositionReportBody').innerHTML=kind==='movement'?movementHtml(r):positionHtml(r);return r;
 }catch(e){saved[kind]=null;el(kind==='movement'?'ratibMovementReportBody':'ratibPositionReportBody').textContent='تعذر عرض التقرير: '+e.message;return null;}
}
function output(kind,action){
 const r=generate(kind);if(!r)return;
 try{
  if(action==='print'){
   el('ratibSpecialPrintHost').innerHTML=kind==='movement'?movementHtml(r):positionHtml(r);
   document.body.classList.add('ratib-special-print');const cleanup=()=>document.body.classList.remove('ratib-special-print');
   window.addEventListener('afterprint',cleanup,{once:true});try{window.print()}catch(e){cleanup();throw e}return;
  }
  const file=new File([buildPdfFromCanvases(canvases(kind,r),[842,595])],kind==='movement'?'حركة-الحسابات.pdf':'المركز-المالي.pdf',{type:'application/pdf'});
  if(action==='share'){Promise.resolve(shareRatibDocumentFile(file,r.title)).catch(e=>showToast('تعذر المشاركة: '+e.message,'error'));return;}
  downloadFinancialFile(file,file.name);
 }catch(e){showToast('تعذر إخراج التقرير: '+e.message,'error');}
}
function hideNew(){['reportsGroupMovementBody','reportsGroupMovementHeader','reportsGroupPositionBody','reportsGroupPositionHeader'].forEach(x=>el(x)?.classList.remove('open'));}
function toggle(kind){
 const name=kind==='movement'?'Movement':'Position',body=el('reportsGroup'+name+'Body'),head=el('reportsGroup'+name+'Header'),open=body.classList.contains('open');
 hideNew();closeAllReportsSections();if(open)return;
 body.classList.add('open');head.classList.add('open');generate(kind);
}
function init(){
 if(!el('reportsGroupMovementHeader'))return;
 const currencies=[...new Set(['YER','SAR','USD',...getAllTransactions().flatMap(trialTransactionLegs).map(x=>x.currency).filter(Boolean)])];
 for(const [id,all] of [['ratibMovementCurrency',true],['ratibPositionCurrency',false]]){
  el(id).innerHTML=(all?'<option value="ALL">جميع العملات منفصلة</option>':'')+currencies.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join('');el(id).value=all?'ALL':(typeof getGlobalCurrency==='function'&&currencies.includes(getGlobalCurrency())?getGlobalCurrency():'YER');
 }
 const ds=getAllTransactions().flatMap(trialTransactionLegs).map(x=>x.date).filter(Boolean).sort();el('ratibPositionDate').value=ds.at(-1)||new Date().toISOString().slice(0,10);
 for(const k of ['movement','position']){
  const pre=k==='movement'?'ratibMovement':'ratibPosition';
  el(k==='movement'?'reportsGroupMovementHeader':'reportsGroupPositionHeader').addEventListener('click',()=>toggle(k));
  for(const [action,id] of [['run','RunBtn'],['print','PrintBtn'],['pdf','PdfBtn'],['share','ShareBtn']])el(pre+id).addEventListener('click',()=>action==='run'?generate(k):output(k,action));
 }
 for(const id of ['reportsGroupBudgetHeader','reportsGroupStatementHeader','reportsGroupTrialHeader'])el(id)?.addEventListener('click',hideNew,true);
}
window.RatibNewReports={movement,position,movementHtml,positionHtml,pdfGrid};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();