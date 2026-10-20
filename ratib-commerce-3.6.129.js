/* Ratib commerce 3.6.129 — trial only. Preserve commerce_v1 and original journal. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:'',adjust:''}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(String(v??'').replace(/,/g,'')),rnd=v=>Math.round(Number(v)*100)/100;
const f=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toLocaleDateString('en-CA');
let mode='stock',view='products',draft=null,loading=false,editingProduct=null,query='',detailId='',previewId='';
function data(){const base=fresh(),v=store.get('commerce_v1',null);if(!v||typeof v!=='object')return base;const x=JSON.parse(JSON.stringify(v));return {...base,...x,products:Array.isArray(x.products)?x.products:[],warehouses:Array.isArray(x.warehouses)?x.warehouses:base.warehouses,people:Array.isArray(x.people)?x.people:[],invoices:Array.isArray(x.invoices)?x.invoices:[],accounts:{...base.accounts,...(x.accounts||{})}};}
function save(x){store.set('commerce_v1',x);}
function notify(t,k='info'){if(typeof showToast==='function')showToast(t,k);else alert(t);}
function positive(v,label,allowZero=false){if(!Number.isFinite(v)||v<0||(!allowZero&&v===0)||rnd(v)!==v)throw Error('راجع '+label);}
function sel(id,items,selected=''){return '<select id="rc-'+id+'"><option value="">اختر</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';}
function inp(id,type='text',val='',extra=''){return '<input type="'+type+'" id="rc-'+id+'" value="'+esc(val)+'" '+extra+'>';}
function fld(label,ctl){return '<label class="rc-field"><span>'+label+'</span>'+ctl+'</label>';}
function wrap(t,c){return '<section class="rc-card"><h3>'+t+'</h3>'+c+'</section>';}
function table(labels,rows){return '<div class="rc-scroll"><table><thead><tr>'+labels.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const types={in:['أمر توريد','توريد مخزني','فاتورة مشتريات'],out:['أمر صرف','صرف مخزني','فاتورة مبيعات']};
const dir=()=>mode==='in'?'purchase':'sale';
const docName=d=>d?.title||({purchase:'فاتورة مشتريات',sale:'فاتورة مبيعات',purchase_return:'مرتجع مشتريات',sale_return:'مرتجع مبيعات',transfer:'تحويل مخزني',adjust:'تسوية مخزنية'}[d?.kind]||'مستند مخزني');
const pMain=p=>String(p?.unitMain||p?.unit||'حبة').trim();
const pSub=p=>String(p?.unitSub||'').trim();
const pUnit=(p,val)=>String(val||pMain(p)).trim();
const lineUnit=(db,l)=>pUnit(db.products.find(p=>p.id===l.product),l.unit);
const unitList=p=>[pMain(p),pSub(p)].filter((x,i,a)=>x&&a.indexOf(x)===i);
function nextSku(db){const used=new Set(db.products.map(p=>String(p.sku)));let no=Math.max(0,...db.products.map(p=>/^\d+$/.test(p.sku)?Number(p.sku):0));let val;do{val=String(++no).padStart(6,'0')}while(used.has(val));return val;}
function nextNumber(db,kind){const prefix=kind==='purchase'?'IN':'OUT';const max=db.invoices.filter(x=>x.kind===kind).reduce((m,x)=>Math.max(m,Number(String(x.number).match(/(\d+)$/)?.[1]||0)),0);return prefix+'-'+String(max+1).padStart(5,'0');}
function move(x,l,wid){
 if(x.kind==='transfer')return x.from===wid?-l.qty:x.to===wid?l.qty:0;
 if(x.warehouse!==wid)return 0;
 return ['purchase','sale_return'].includes(x.kind)?l.qty:['sale','purchase_return'].includes(x.kind)?-l.qty:x.kind==='adjust'?(x.direction==='in'?l.qty:-l.qty):0;
}

function qty(db,pid,wid,unit){
 return rnd(db.invoices.reduce((a,x)=>a+(x.lines||[]).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((sum,l)=>sum+move(x,l,wid),0),0));
}
function average(db,pid,wid,unit){
 let balanceQty=0,balanceValue=0;
 for(const x of db.invoices)for(const l of x.lines||[])if(l.product===pid&&(!unit||lineUnit(db,l)===unit)){
  const delta=move(x,l,wid);if(!delta)continue;
  if(delta>0){balanceQty=rnd(balanceQty+delta);balanceValue=rnd(balanceValue+Number(l.cost||0));}
  else {balanceQty=rnd(balanceQty+delta);balanceValue=rnd(balanceValue-Number(l.cost||0));}
 }
 return balanceQty>0?Math.max(0,rnd(balanceValue/balanceQty)):0;
}
function leaf(){return getCanonicalCatalog().flatMap(x=>(x.details||[]).map(d=>({id:d[1],name:d[0]+' — '+d[1]})));}
function paint(){
 const db=data(),panels=mode==='stock'?[['products','بطاقة الصنف'],['warehouses','المخازن'],['movements','حركة المخزون'],['summary','تقارير المخزون'],['accounts','الحسابات']]:[['new','مستند جديد'],['return','مرتجعات'],['records','سجل المستندات'],['people',mode==='in'?'الموردون':'العملاء'],['summary','التقارير'],['accounts','ربط الحسابات']];
 let body='';
 if(view==='products')body=products(db);if(view==='warehouses')body=warehouses(db);if(view==='people')body=people(db);if(view==='accounts')body=accounts(db);
 if(['new','return'].includes(view))body=invoice(db);
 if(['adjust','transfer'].includes(view))body=movementForm(db);
 if(view==='movements')body=movements(db);if(view==='records')body=records(db);if(view==='summary')body=summary(db);
 if(view==='detail')body=showDocument(db);
 const header=mode==='stock'?'المخزون':mode==='in'?'الوارد':'الصادر';
 $('pageCommerce').innerHTML='<div class="rc-app"><div class="rc-head"><h2>'+header+'</h2><button type="button" class="btn btn-ghost" data-rc-back="1">↪️ رجوع</button></div><div class="rc-tabs">'+panels.map(x=>'<button type="button" class="'+(view===x[0]?'active':'')+'" data-rc-view="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+body+'</div>';
}
function products(db){
 const p=db.products.find(x=>x.id===editingProduct),exists=!!p;
 const form='<form id="rc-product-form" class="rc-grid">'+
 fld('رقم الصنف (تلقائي وقابل للتعديل)',inp('sku','text',p?.sku||nextSku(db),'required maxlength="30"'))+
 fld('اسم الصنف',inp('name','text',p?.name||'','required maxlength="120"'))+
 fld('المجموعة',inp('group','text',p?.group||'','required list="rc-group-list" maxlength="80"')+
 '<datalist id="rc-group-list">'+[...new Set(db.products.map(p=>p.group).filter(Boolean))].map(g=>'<option value="'+esc(g)+'"></option>').join('')+'</datalist>')+
 fld('الوحدة الرئيسية',inp('unitMain','text',pMain(p||{unit:'حبة'}),'required maxlength="30"'))+
 fld('الوحدة الفرعية',inp('unitSub','text',pSub(p),'maxlength="30" placeholder="اختياري"'))+
 fld('سعر البيع الافتراضي YER',inp('price','number',p?.price||0,'min="0" step="0.01"'))+
 fld('حد تنبيه المخزون',inp('minimum','number',p?.minimum||0,'min="0" step="0.01"'))+
 '<div class="rc-full rc-actions"><button class="btn btn-primary" type="submit">'+(exists?'حفظ تعديل الصنف':'حفظ الصنف')+'</button>'+(exists?'<button type="button" class="btn btn-ghost" data-rc-edit-product="">إلغاء التعديل</button>':'')+'</div></form>';
 return wrap('بطاقة الصنف',form+'<p class="rc-note">الوحدتان تعريفان مستقلان للصنف؛ لا يُطبّق التحويل بينهما حتى اعتماد نسب التحويل لاحقًا.</p>')+
 wrap('دليل الأصناف',table(['الرقم','الصنف','المجموعة','الرئيسية','الفرعية',''],db.products.map(p=>[esc(p.sku),esc(p.name),esc(p.group||'—'),esc(pMain(p)),esc(pSub(p)||'—'),'<button type="button" data-rc-edit-product="'+esc(p.id)+'">تعديل</button>'])));
}
function warehouses(db){return wrap('إدارة المخازن','<form id="rc-warehouse-form" class="rc-grid">'+fld('اسم المخزن',inp('name','text','','required'))+'<button class="rc-primary">إضافة مخزن</button></form>')+wrap('المخازن',db.warehouses.map(w=>'<p>'+esc(w.name)+'</p>').join(''));}
function people(db){const type=mode==='in'?'vendor':'client';return wrap('إدارة '+(type==='vendor'?'الموردين':'العملاء'),'<form id="rc-person-form" class="rc-grid">'+fld('الاسم أو صاحب الحساب',inp('name','text','','required'))+fld('رقم الهاتف',inp('phone','tel'))+'<button class="btn btn-primary">حفظ</button></form>')+wrap('السجل',db.people.filter(x=>x.type===type).map(x=>'<p>'+esc(x.name)+' — '+esc(x.phone||'')+'</p>').join(''));}
function accounts(db){
 const names={cash:'الصندوق / البنك',receivable:'ذمم العملاء (الصادر الآجل)',payable:'ذمم الموردين (الوارد الآجل)',inventory:'حساب المخزون',sales:'إيرادات المبيعات',cogs:'تكلفة البضاعة المباعة',adjust:'فروق وتسويات المخزون'};
 return wrap('ربط الحسابات المحاسبية','<p class="rc-note">استخدم الحسابات التفصيلية الموجودة في شجرة راتب. الوارد: المخزون مدين، الصادر: المخزون دائن بتكلفته، وتُسجَّل قيمة المبيعات في حساب مستقل. لن يمر مستند غير متوازن.</p><form id="rc-accounts-form" class="rc-grid">'+Object.keys(names).map(k=>fld(names[k],sel('acc-'+k,leaf(),db.accounts[k]))).join('')+'<button class="btn btn-primary">حفظ الربط</button></form>');
}
function records(db){
 const docs=db.invoices.filter(d=>mode==='in'?['purchase','purchase_return'].includes(d.kind):['sale','sale_return'].includes(d.kind));
 const filtered=docs.filter(d=>!query||[d.number,docName(d),d.partyName,d.date,d.note].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return wrap('سجل مستندات '+(mode==='in'?'الوارد':'الصادر'),'<div class="rc-search no-print">'+inp('query','search',query,'placeholder="ابحث برقم المستند أو التاريخ أو الطرف..."')+'<button type="button" class="btn btn-ghost" data-rc-search="1">🔎 بحث</button></div>'+
 table(['رقم المستند','المسمى','التاريخ','الطرف','الإجمالي YER','المشاهدة'],filtered.slice().reverse().map(x=>[esc(x.number),esc(docName(x)),esc(x.date),esc(x.partyName||'—'),f(x.total),'<button type="button" class="btn btn-ghost" data-rc-detail="'+esc(x.id)+'">مشاهدة</button>'])));
}
function summary(db){
 const sum=k=>db.invoices.filter(d=>d.kind===k).reduce((a,d)=>a+Number(d.total||0),0);
 const sales=rnd(sum('sale')-sum('sale_return')),purchases=rnd(sum('purchase')-sum('purchase_return'));
 const cost=rnd(db.invoices.filter(d=>d.kind==='sale').reduce((a,d)=>a+Number(d.cost||0),0)-db.invoices.filter(d=>d.kind==='sale_return').reduce((a,d)=>a+Number(d.cost||0),0));
 const rows=db.products.flatMap(p=>db.warehouses.flatMap(w=>unitList(p).map(u=>{
  const q=qty(db,p.id,w.id,u);return [esc(p.name),esc(p.group||'—'),esc(w.name),esc(u),f(q),f(q*average(db,p.id,w.id,u)),q<=Number(p.minimum||0)?'منخفض':'متاح'];
 })));
 return wrap('ملخص مالي ومخزني (YER)','<div class="rc-kpis"><div>صافي المبيعات<strong>'+f(sales)+'</strong></div><div>صافي المشتريات<strong>'+f(purchases)+'</strong></div><div>مجمل الربح<strong>'+f(sales-cost)+'</strong></div></div>')+
 wrap('كميات الأصناف وتقييمها',table(['الصنف','المجموعة','المخزن','الوحدة','الرصيد','القيمة','الحالة'],rows));
}
function movementForm(db){
 const transfer=view==='transfer';
 return wrap(transfer?'تحويل بين المخازن':'إدخال وإخراج مخزني','<form id="rc-movement-form" class="rc-grid">'+
 fld('التاريخ',inp('date','date',today(),'required'))+
 fld('الصنف',sel('product',db.products))+
 fld('الوحدة',sel('unit',unitList(db.products[0]||{unit:'حبة'}).map(x=>({id:x,name:x}))))+
 fld('المخزن المصدر',sel('warehouse',db.warehouses))+
 (transfer?fld('المخزن الوجهة',sel('target',db.warehouses)):fld('اتجاه التسوية','<select id="rc-direction"><option value="in">وارد</option><option value="out">صادر</option></select>'))+
 fld('الكمية',inp('qty','number',1,'min="0.01" step="0.01"'))+
 (transfer?'':fld('تكلفة الوحدة عند الإدخال (YER)',inp('cost','number',0,'min="0" step="0.01"')))+
 '<button type="submit" class="btn btn-primary">اعتماد الحركة</button></form>');
}
function movements(db){
 const rows=db.invoices.slice().reverse().flatMap(d=>(d.lines||[]).flatMap(l=>db.warehouses.filter(w=>move(d,l,w.id)!==0).map(w=>[esc(d.date),esc(docName(d)),esc(db.products.find(p=>p.id===l.product)?.name||'—'),esc(w.name),esc(lineUnit(db,l)),f(move(d,l,w.id))])));
 return wrap('حركة الأصناف',table(['التاريخ','المستند','الصنف','المخزن','الوحدة','الكمية'],rows));
}
function documentLines(db,d){
 return (d.lines||[]).map((l,i)=>{
  const p=db.products.find(p=>p.id===l.product);
  return [String(i+1),esc(p?.name||'—'),esc(lineUnit(db,l)),f(l.qty),f(l.price),f(Number(l.subtotal??l.qty*l.price))];
 });
}
function documentHtml(db,d){
 const cfg=typeof getHeaderConfig==='function'?getHeaderConfig():{name:'راتب للتنظيم والتدبير المالي',details:'',show:true};
 const rows=documentLines(db,d);
 const tableHtml='<table class="rc-document-table"><thead><tr><th>#</th><th>اسم الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 return '<article class="rc-paper" dir="rtl">'+(cfg.show?'<header class="rc-paper-head"><strong>'+esc(cfg.name||'راتب')+'</strong><div>'+esc(cfg.details||'')+'</div></header>':'')+
 '<h2>'+esc(docName(d))+'</h2><div class="rc-document-meta"><span>رقم المستند: <b>'+esc(d.number)+'</b></span><span>التاريخ: <b>'+esc(d.date)+'</b></span><span>المخزن: <b>'+esc(db.warehouses.find(w=>w.id===d.warehouse)?.name||'—')+'</b></span><span>الطرف: <b>'+esc(d.partyName||'—')+'</b></span></div>'+
 tableHtml+'<div class="rc-paper-total">الإجمالي: '+f(d.total)+' ريال يمني</div><p class="rc-paper-note"><b>ملاحظات:</b> '+esc(d.note||'—')+'</p><div class="rc-paper-signatures"><span>المعدّ: ______________</span><span>المستلم: ______________</span><span>المعتمد: ______________</span></div></article>';
}
function documentToolbar(db,d){
 const actions=[['view','eye','المشاهدة'],['preview','scan-eye','المعاينة'],['print','printer','الطباعة'],['pdf','file-down','PDF'],['share','share-2','المشاركة'],['search','search','البحث'],['back','corner-up-left','الرجوع']];
 const pictures={eye:'◉','scan-eye':'▣',printer:'▤','file-down':'▣','share-2':'⇧',search:'⌕','corner-up-left':'↪'};
 return '<div class="rc-document-actions no-print">'+actions.map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-action="'+action+'" data-doc="'+esc(d.id)+'"><span class="rc-tool-icon" aria-hidden="true">'+pictures[icon]+'</span><small>'+label+'</small></button>').join('')+'</div>';
}
function showDocument(db){
 const doc=db.invoices.find(d=>d.id===detailId);
 return doc?documentToolbar(db,doc)+documentHtml(db,doc):wrap('المستند','المستند غير موجود في البيانات الحالية.');
}
function ensurePreview(){
 let modal=$('rc-preview-modal');
 if(modal)return modal;
 modal=document.createElement('div');modal.id='rc-preview-modal';modal.className='modal-overlay no-print';
 modal.innerHTML='<div class="modal-content rc-preview-modal-body" role="dialog" aria-modal="true" aria-label="معاينة المستند"><h3>معاينة المستند قبل الطباعة</h3><div id="rc-preview-content"></div><div class="rc-actions"><button type="button" class="btn btn-primary" id="rc-preview-print">🖨️ طباعة</button><button type="button" class="btn btn-ghost" id="rc-preview-close">إغلاق</button></div></div>';
 document.body.appendChild(modal);
 modal.querySelector('#rc-preview-close').addEventListener('click',()=>modal.classList.remove('show'));
 modal.querySelector('#rc-preview-print').addEventListener('click',()=>{const chosen=previewId;modal.classList.remove('show');printDocument(chosen);});
 return modal;
}
function previewDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 previewId=docId;const modal=ensurePreview();modal.querySelector('#rc-preview-content').innerHTML=documentHtml(db,d);
 modal.classList.add('show');
}
function printDocument(docId){
 const db=data(),d=db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 let host=$('ratibCommercePrintHost');
 if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}
 host.innerHTML=documentHtml(db,d);
 if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');
 else window.print();
}
function* documentCanvases(db,d){
 let pageNumber=1,page=reportCanvasPage(docName(d),d.number+' — '+d.date+' — '+(d.partyName||''),pageNumber);
 const widths=[70,340,150,140,170,220],headers=['#','اسم الصنف','الوحدة','العدد','السعر','الإجمالي'];
 const draw=(arr,bg)=>drawReportTableRow(page,reportTableLayout(page.ctx,arr,widths,19),widths,bg||'#fff');
 draw(headers,'#e2e8f0');
 for(const row of documentLines(db,d)){
  if(page.y>1490){yield page.canvas;page=reportCanvasPage(docName(d),d.number+' — '+d.date,++pageNumber);draw(headers,'#e2e8f0');}
  draw(row.map(r=>r.replace(/&amp;|&quot;|&#39;|&lt;|&gt;/g,match=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[match]))));
 }
 draw(['','الإجمالي','YER','','',f(d.total)],'#ecfdf5');
 if(d.note){if(page.y>1450){yield page.canvas;page=reportCanvasPage(docName(d),d.number,++pageNumber);}draw(['','الملاحظات',d.note,'','','']);}
 yield page.canvas;
}
function pdfFor(d){
 const db=data();return buildPdfFromCanvases(documentCanvases(db,d));
}
async function documentOutput(action,docId){
 const db=data(),d=db.invoices.find(x=>x.id===docId);if(!d)throw Error('المستند غير موجود.');
 if(action==='view'){detailId=d.id;view='detail';paint();return;}
 if(action==='preview'){previewDocument(d.id);return;}
 if(action==='print'){printDocument(d.id);return;}
 if(['pdf','share'].includes(action)){
  const blob=pdfFor(d),name=docName(d)+'-'+d.number+'.pdf';
  if(action==='pdf')downloadFinancialFile(blob,name);
  else await shareRatibDocumentFile(new File([blob],name,{type:'application/pdf'}),docName(d)+' '+d.number);
  return;
 }
 if(action==='search'){view='records';paint();$('rc-query')?.focus();return;}
 if(action==='back'){view='records';paint();}
}

function open(target='sale'){mode=['sale','purchase','stock'].includes(target)?target:'sale';view=mode==='stock'?'products':'new';draft=null;navigateToTab('pageCommerce',true);paint();}
function bind(){
 const root=$('pageCommerce');if(!root)return;
 root.addEventListener('click',e=>{
  const m=e.target.closest('[data-rc-mode]'),v=e.target.closest('[data-rc-view]'),p=e.target.closest('[data-rc-print]');
  if(m){mode=m.dataset.rcMode;view=mode==='stock'?'products':'new';draft=null;paint();}
  if(v){view=v.dataset.rcView;draft=null;paint();}
  if(p)printDoc(p.dataset.rcPrint);
 });
 root.addEventListener('change',e=>{
  if(e.target.id==='rc-origin'&&draft){
   syncInvoice();const db=data(),src=db.invoices.find(x=>x.id===draft.origin);
   if(src){const line=src.lines.find(l=>leftToReturn(db,src.id,l.product)>0);
    draft.product=line?.product||'';draft.qty=1;draft.price=line?.price||0;draft.warehouse=src.warehouse;draft.party=src.party;draft.payment=src.payment;
   }paint();
  }else if(e.target.id==='rc-product'&&draft){
   syncInvoice();const db=data(),p=db.products.find(x=>x.id===draft.product);
   if(view==='return'){const original=db.invoices.find(x=>x.id===draft.origin);draft.price=original?.lines.find(l=>l.product===draft.product)?.price||0;}
   else if(p&&mode==='sale')draft.price=p.price;
   paint();
  }
 });
 root.addEventListener('submit',async e=>{
  if(!e.target.id?.startsWith('rc-'))return;e.preventDefault();if(loading)return;
  try{
   const db=data(),which=e.target.id;
   if(which==='rc-product-form'){
    const sku=$('rc-sku').value.trim(),name=$('rc-name').value.trim(),unit=$('rc-unit').value.trim(),price=n($('rc-price').value),minimum=n($('rc-minimum').value);
    positive(price,'سعر البيع',true);positive(minimum,'حد المخزون',true);if(!sku||!name||!unit||db.products.some(p=>p.sku===sku))throw Error('البيانات غير مكتملة أو رمز الصنف مكرر.');
    db.products.push({id:id(),sku,name,unit,price,minimum});save(db);await flushStorage();paint();
   }else if(which==='rc-warehouse-form'){
    const name=$('rc-name').value.trim();if(!name||db.warehouses.some(w=>w.name===name))throw Error('اسم المخزن فارغ أو مكرر.');
    db.warehouses.push({id:id(),name});save(db);await flushStorage();paint();
   }else if(which==='rc-person-form'){
    const name=$('rc-name').value.trim();if(!name)throw Error('اسم العميل أو المورد فارغ.');
    db.people.push({id:id(),name,phone:$('rc-phone').value,type:mode==='sale'?'client':'vendor'});save(db);await flushStorage();paint();
   }else if(which==='rc-accounts-form'){
    for(const k of Object.keys(db.accounts))db.accounts[k]=$('rc-acc-'+k)?.value||'';
    save(db);await flushStorage();notify('تم حفظ ربط الحسابات','success');paint();
   }else if(which==='rc-invoice-form')await saveInvoice();
   else if(which==='rc-movement-form')await saveMovement();
  }catch(err){console.error('commerce',err);notify(err.message||'تعذر إكمال الحفظ','error');}
 });
}
window.RatibCommerce={open,render:paint};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();