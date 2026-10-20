/* Ratib commerce extension 3.6.128 — experimental only */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:'',adjust:''}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(String(v??'').replace(/,/g,'')),rnd=v=>Math.round(Number(v)*100)/100;
const f=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toLocaleDateString('en-CA');
let mode='sale',view='new',draft=null,loading=false;
function data(){const v=store.get('commerce_v1',null);return v&&typeof v==='object'?Object.assign(fresh(),JSON.parse(JSON.stringify(v))):fresh();}
function save(x){store.set('commerce_v1',x);}
function notify(t,k='info'){if(typeof showToast==='function')showToast(t,k);else alert(t);}
function positive(v,label,allowZero=false){if(!Number.isFinite(v)||v<0||(!allowZero&&v===0)||rnd(v)!==v)throw Error('راجع '+label);}
function sel(id,items,selected=''){return '<select id="rc-'+id+'"><option value="">اختر</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';}
function inp(id,type='text',val='',extra=''){return '<input type="'+type+'" id="rc-'+id+'" value="'+esc(val)+'" '+extra+'>';}
function fld(label,ctl){return '<label class="rc-field"><span>'+label+'</span>'+ctl+'</label>';}
function wrap(t,c){return '<section class="rc-card"><h3>'+t+'</h3>'+c+'</section>';}
function table(labels,rows){return '<div class="rc-scroll"><table><thead><tr>'+labels.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function move(x,l,wid){
 if(x.kind==='transfer')return x.from===wid?-l.qty:x.to===wid?l.qty:0;
 if(x.warehouse!==wid)return 0;
 return ['purchase','sale_return'].includes(x.kind)?l.qty:['sale','purchase_return'].includes(x.kind)?-l.qty:x.kind==='adjust'?(x.direction==='in'?l.qty:-l.qty):0;
}
function qty(db,pid,wid){return rnd(db.invoices.reduce((a,x)=>a+x.lines.filter(l=>l.product===pid).reduce((sum,l)=>sum+move(x,l,wid),0),0));}
function average(db,pid,wid){
 let value=0,units=0;
 for(const x of db.invoices)for(const l of x.lines)if(l.product===pid){
  const delta=move(x,l,wid);
  if(!delta)continue;
  const sign=delta>0?1:-1;value+=sign*l.cost;units+=delta;
 }
 return units>0?Math.max(0,value/units):0;
}
function leaf(){return getCanonicalCatalog().flatMap(x=>(x.details||[]).map(d=>({id:d[1],name:d[0]+' — '+d[1]})));}
function paint(){
 const db=data(),tabs=mode==='stock'?[['products','الأصناف'],['warehouses','المخازن'],['adjust','إدخال وإخراج'],['transfer','تحويل المخزون'],['movements','حركة الأصناف'],['summary','التقارير'],['accounts','ربط الحسابات']]:[['new','فاتورة جديدة'],['return','المرتجعات'],['records','سجل الفواتير'],['people',mode==='sale'?'العملاء':'الموردون'],['summary','التقارير'],['accounts','ربط الحسابات']];
 const btns=x=>x.map(item=>'<button type="button" class="'+(item[0]===view?'active':'')+'" data-rc-view="'+item[0]+'">'+item[1]+'</button>').join('');
 let body='';
 if(view==='products')body=products(db);
 if(view==='warehouses')body=warehouses(db);
 if(view==='people')body=people(db);
 if(view==='accounts')body=accounts(db);
 if(view==='new'||view==='return')body=invoice(db);
 if(view==='adjust'||view==='transfer')body=movementForm(db);
 if(view==='movements')body=movements(db);
 if(view==='records')body=records(db);
 if(view==='summary')body=summary(db);
 $('pageCommerce').innerHTML='<div class="rc-app"><h2>المبيعات والمشتريات والمخزون</h2><p class="rc-note">يعمل محليًا، وتحفظ بياناته مع النسخ الاحتياطية لراتب</p><div class="rc-tabs">'+[['sale','المبيعات'],['purchase','المشتريات'],['stock','المخزون']].map(x=>'<button type="button" '+(mode===x[0]?'class="active"':'')+' data-rc-mode="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="rc-tabs">'+btns(tabs)+'</div>'+body+'</div>';
}
function products(db){return wrap('إدارة الأصناف','<form id="rc-product-form" class="rc-grid">'+fld('رمز الصنف',inp('sku','text','','required'))+fld('اسم الصنف',inp('name','text','','required'))+fld('الوحدة',inp('unit','text','حبة','required'))+fld('سعر البيع (YER)',inp('price','number','0','step="0.01" min="0" required'))+'<button class="rc-primary">إضافة صنف</button></form>')+wrap('الأصناف',table(['الرمز','الصنف','الوحدة','سعر البيع'],db.products.map(x=>[esc(x.sku),esc(x.name),esc(x.unit),f(x.price)])));}
function warehouses(db){return wrap('إدارة المخازن','<form id="rc-warehouse-form" class="rc-grid">'+fld('اسم المخزن',inp('name','text','','required'))+'<button class="rc-primary">إضافة مخزن</button></form>')+wrap('المخازن',db.warehouses.map(w=>'<p>'+esc(w.name)+'</p>').join(''));}
function people(db){const type=mode==='sale'?'client':'vendor';return wrap('الأطراف','<form id="rc-person-form" class="rc-grid">'+fld('الاسم',inp('name','text','','required'))+fld('رقم الهاتف',inp('phone','tel'))+'<button class="rc-primary">حفظ</button></form>')+wrap('السجل',db.people.filter(x=>x.type===type).map(x=>'<p>'+esc(x.name)+'</p>').join(''));}
function accounts(db){const names={cash:'الصندوق / البنك',receivable:'ذمم العملاء',payable:'ذمم الموردين',inventory:'المخزون',sales:'إيرادات المبيعات',cogs:'تكلفة البضاعة المباعة',adjust:'فروق وتسويات المخزون'};
return wrap('ربط الحسابات','<p class="rc-note">لا يُرحّل أي مستند قبل ربط حساباته التفصيلية. القيد المحاسبي متوازن وبالريال اليمني YER فقط.</p><form id="rc-accounts-form" class="rc-grid">'+Object.keys(names).map(k=>fld(names[k],sel('acc-'+k,leaf(),db.accounts[k]))).join('')+'<button class="rc-primary">حفظ الحسابات</button></form>');}
function records(db){return wrap('الفواتير والمرتجعات المعتمدة',table(['الرقم','النوع','التاريخ','الطرف','المجموع YER',''],db.invoices.filter(x=>x.kind===mode||x.kind===mode+'_return').slice().reverse().map(x=>[esc(x.number),x.kind.endsWith('return')?'مرتجع':'فاتورة',esc(x.date),esc(x.partyName||'نقدي'),f(x.total),'<button type="button" data-rc-print="'+esc(x.id)+'">طباعة</button>'])));}
function summary(db){
 const sum=kind=>db.invoices.filter(x=>x.kind===kind).reduce((a,x)=>a+x.total,0);
 const sales=rnd(sum('sale')-sum('sale_return')),purchases=rnd(sum('purchase')-sum('purchase_return'));
 const cogs=rnd(db.invoices.filter(x=>x.kind==='sale').reduce((a,x)=>a+x.cost,0)-db.invoices.filter(x=>x.kind==='sale_return').reduce((a,x)=>a+x.cost,0));
 return wrap('الملخص التجاري (YER)','<div class="rc-kpis"><div>صافي المبيعات<strong>'+f(sales)+'</strong></div><div>صافي المشتريات<strong>'+f(purchases)+'</strong></div><div>مجمل الربح<strong>'+f(sales-cogs)+'</strong></div></div>')+wrap('الأرصدة والكميات',table(['الصنف','المخزن','الكمية','القيمة','الحد الأدنى'],db.products.flatMap(p=>db.warehouses.map(w=>[esc(p.name),esc(w.name),f(qty(db,p.id,w.id)),f(qty(db,p.id,w.id)*average(db,p.id,w.id)),qty(db,p.id,w.id)<=Number(p.minimum||0)?'تنبيه':'متاح']))));}
function movementForm(db){
 const transfer=view==='transfer';
 return wrap(transfer?'تحويل الأصناف بين المخازن':'إدخال وإخراج المخزون','<form id="rc-movement-form" class="rc-grid">'+
 fld('التاريخ',inp('date','date',today(),'required'))+
 fld('الصنف',sel('product',db.products))+
 fld('المخزن المصدر',sel('warehouse',db.warehouses))+
 (transfer?fld('المخزن الوجهة',sel('target',db.warehouses)):fld('نوع الحركة','<select id="rc-direction"><option value="in">إدخال</option><option value="out">إخراج</option></select>'))+
 fld('الكمية',inp('qty','number',1,'step="0.01" min="0.01" required'))+
 (transfer?'':fld('تكلفة الوحدة عند الإدخال YER',inp('cost','number',0,'step="0.01" min="0" required')))+
 '<button type="submit" class="rc-primary">اعتماد الحركة</button></form>');
}
function movements(db){
 return wrap('كشف حركة الأصناف',table(['التاريخ','نوع الحركة','الصنف','المخزن','الكمية'],db.invoices.slice().reverse().flatMap(x=>x.lines.flatMap(l=>db.warehouses.filter(w=>move(x,l,w.id)!==0).map(w=>[esc(x.date),esc(x.kind),esc(db.products.find(p=>p.id===l.product)?.name),esc(w.name),f(move(x,l,w.id))])))));
}
function printDoc(code){
 const db=data(),x=db.invoices.find(x=>x.id===code);if(!x)return;
 const names={sale:'فاتورة بيع',purchase:'فاتورة شراء',sale_return:'مرتجع مبيعات',purchase_return:'مرتجع مشتريات'};
 const w=window.open('','_blank');if(!w){notify('اسمح بالطباعة من المتصفح','warn');return;}
 const lines=x.lines.map(l=>'<tr><td>'+esc(db.products.find(p=>p.id===l.product)?.name)+'</td><td>'+f(l.qty)+'</td><td>'+f(l.price)+'</td></tr>').join('');
 w.document.open();
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>'+esc(x.number)+'</title><style>body{font-family:Arial;padding:25px}table{border-collapse:collapse;width:100%}td,th{padding:9px;border:1px solid #bbb}</style><h2>راتب — '+esc(names[x.kind]||'مستند تجاري')+'</h2><p>رقم '+esc(x.number)+' — '+esc(x.date)+' — '+esc(x.partyName||'')+'</p><table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>'+lines+'</table><h3>الإجمالي: '+f(x.total)+' ريال يمني</h3></html>');
 w.document.close();w.focus();w.print();
}
function newDraft(){return {kind:view==='return'?mode+'_return':mode,date:today(),warehouse:'main',party:'',payment:'cash',origin:'',product:'',qty:1,price:0};}
function leftToReturn(db,id,pid){
 const x=db.invoices.find(x=>x.id===id);
 return rnd((x?.lines.find(l=>l.product===pid)?.qty||0)-db.invoices.filter(t=>t.origin===id).flatMap(t=>t.lines).filter(l=>l.product===pid).reduce((a,l)=>a+l.qty,0));
}
function invoice(db){
 const kind=view==='return'?mode+'_return':mode,returning=view==='return';
 if(!draft||draft.kind!==kind)draft=newDraft();
 const source=db.invoices.find(x=>x.id===draft.origin);
 const originals=db.invoices.filter(x=>x.kind===mode&&x.lines.some(l=>leftToReturn(db,x.id,l.product)>0));
 const eligible=returning?(source?.lines.filter(l=>leftToReturn(db,source.id,l.product)>0).map(l=>({id:l.product,name:db.products.find(p=>p.id===l.product)?.name||''}))||[]):db.products;
 const selected=db.products.find(x=>x.id===draft.product);
 return wrap(returning?'مرتجع '+(mode==='sale'?'مبيعات':'مشتريات'):'فاتورة '+(mode==='sale'?'بيع':'شراء')+' جديدة','<form id="rc-invoice-form" class="rc-grid">'+
 fld('التاريخ',inp('date','date',draft.date,'required'))+
 fld('المخزن',sel('warehouse',db.warehouses,draft.warehouse))+
 (returning?fld('الفاتورة الأصلية',sel('origin',originals.map(x=>({id:x.id,name:x.number+' — '+x.date})),draft.origin)):'')+
 fld('الصنف',sel('product',eligible,draft.product))+
 fld('الكمية',inp('qty','number',draft.qty,'step="0.01" min="0.01" required'))+
 fld('سعر الوحدة (YER)',inp('price','number',draft.price||selected?.price||0,'step="0.01" min="0" required '+(returning?'readonly':'')))+
 fld('الطرف',sel('party',db.people.filter(x=>x.type===(mode==='sale'?'client':'vendor')),draft.party))+
 fld('طريقة الدفع','<select id="rc-payment"><option value="cash">نقدي</option><option value="credit" '+(draft.payment==='credit'?'selected':'')+'>آجل</option></select>')+
 '<button type="submit" class="rc-primary">اعتماد وترحيل '+(returning?'المرتجع':'الفاتورة')+'</button></form><p class="rc-note">المرتجعات مرتبطة بمستندها الأصلي، ويُمنع تجاوز الكمية أو إنشاء مستند غير متوازن.</p>');
}
function syncInvoice(){if(!draft)return;for(const k of ['date','warehouse','product','party','payment','origin','qty','price'])if($('rc-'+k))draft[k]=$('rc-'+k).value;}
function makeJournal(doc,db){
 if(doc.kind==='transfer')return [];
 const a=db.accounts,accounts=leaf(),valid=new Set(accounts.map(x=>x.id)),lines=[];
 const post=(side,key,sum)=>{sum=rnd(sum);if(sum<=0)return;if(!a[key]||!valid.has(a[key]))throw Error('يرجى ربط الحساب التفصيلي: '+key);lines.push({side,account:a[key],amount:sum});};
 if(doc.kind==='sale'||doc.kind==='sale_return'){
  const sign=doc.kind==='sale';post(sign?'debit':'credit',doc.payment==='cash'?'cash':'receivable',doc.total);
  post(sign?'credit':'debit','sales',doc.total);post(sign?'debit':'credit','cogs',doc.cost);post(sign?'credit':'debit','inventory',doc.cost);
 }else if(doc.kind==='purchase'||doc.kind==='purchase_return'){
  const sign=doc.kind==='purchase';post(sign?'debit':'credit','inventory',doc.total);post(sign?'credit':'debit',doc.payment==='cash'?'cash':'payable',doc.total);
 }else if(doc.kind==='adjust'){
  const incoming=doc.direction==='in';post(incoming?'debit':'credit','inventory',doc.total);post(incoming?'credit':'debit','adjust',doc.total);
 }
 const dr=rnd(lines.filter(x=>x.side==='debit').reduce((a,l)=>a+l.amount,0)),cr=rnd(lines.filter(x=>x.side==='credit').reduce((a,l)=>a+l.amount,0));
 if(!lines.length||dr!==cr)throw Error('القيد المحاسبي غير متوازن.');
 const ids=new Map(accounts.map(x=>[x.id,x.name.split(' — ')[0]])),vid='com_'+doc.id,seq=getNextMultiVoucherNumber();
 const m={id:vid,seq,date:doc.date,mode:'multi-entry',baseCurrency:'YER',baseTotal:dr,note:'مستند تجاري '+doc.number,lines:lines.map(x=>({side:x.side,account:x.account,accountId:ids.get(x.account)||'',currency:'YER',amount:x.amount,base:x.amount,rate:1,budgetId:'general',note:doc.number}))};
 return lines.map((x,i)=>({id:vid+'_'+i,multiVoucherId:vid,commerceId:doc.id,isMultiVoucher:true,voucherMode:'multi-entry',seqNum:seq,date:doc.date,isoDate:doc.date,timestamp:new Date(doc.date+'T12:00:00').getTime(),amount:x.amount,currency:'YER',debitAccount:x.side==='debit'?x.account:'',creditAccount:x.side==='credit'?x.account:'',debitAccountId:x.side==='debit'?ids.get(x.account)||'':'',creditAccountId:x.side==='credit'?ids.get(x.account)||'':'',multiVoucher:m,type:'مستند تجاري '+doc.number,status:'posted',schemaVersion:APP_SCHEMA_VERSION,updatedAt:Date.now(),distribution:{},execution:{}}));
}
async function persistDoc(doc,db){
 if(loading)throw Error('هناك حفظ سابق قيد التنفيذ.');
 if(typeof _pendingFinancialCompletion!=='undefined'&&_pendingFinancialCompletion)throw Error('أكمل حفظ راتب السابق.');
 if(db.invoices.some(x=>x.id===doc.id)||getAllTransactions().some(x=>x.commerceId===doc.id))throw Error('المستند مكرر.');
 const lines=makeJournal(doc,db);
 if(window.RatibLicense?.beforeCreate&&!(await window.RatibLicense.beforeCreate(getAllTransactions())))return false;
 loading=true;
 try{
  const plan=lines.length?getMasterPlan():null;
  if(plan)plan.transactions.push(...lines);
  db.invoices.push(doc);save(db);if(plan)store.set('plan',plan);
  if(typeof audit==='function')audit('COMMERCE_POST',doc.id,null,doc);
  await flushStorage();
  window.RatibLicense?.recordCreated?.();
  if(typeof renderAllData==='function')renderAllData();
  if(typeof updateProDashboard==='function')updateProDashboard();
  draft=null;view=mode==='stock'?'movements':'records';paint();notify('تم اعتماد المستند وحفظه','success');
  return true;
 }finally{loading=false;}
}
async function saveInvoice(){
 syncInvoice();const db=data(),v=draft,q=n(v.qty),p=db.products.find(x=>x.id===v.product),returning=v.kind.endsWith('_return');
 positive(q,'الكمية');
 if(!p||!db.warehouses.some(w=>w.id===v.warehouse))throw Error('اختر الصنف والمخزن.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date)))throw Error('التاريخ غير صحيح.');
 if(v.payment==='credit'&&!v.party)throw Error('حدد العميل أو المورد للآجل.');
 const src=db.invoices.find(x=>x.id===v.origin);
 if(returning&&(!src||src.kind!==mode||src.warehouse!==v.warehouse))throw Error('اختر فاتورة أصلية بمخزن صحيح.');
 if(returning&&q>leftToReturn(db,src.id,p.id))throw Error('كمية المرتجع تتجاوز الفاتورة الأصلية.');
 if(['sale','purchase_return'].includes(v.kind)&&q>qty(db,p.id,v.warehouse))throw Error('الكمية المتاحة لا تكفي.');
 let price=n(v.price),cost;
 if(returning){const line=src.lines.find(x=>x.product===p.id);if(!line)throw Error('الصنف غير موجود في الفاتورة الأصلية.');price=line.price;cost=rnd(q*line.cost/line.qty);}
 else{positive(price,'سعر الوحدة',true);cost=rnd(q*(v.kind==='sale'?average(db,p.id,v.warehouse):price));}
 const total=rnd(q*price);positive(total,'المبلغ');
 const prefix={sale:'S',purchase:'P',sale_return:'SR',purchase_return:'PR'}[v.kind];
 const doc={id:id(),kind:v.kind,number:prefix+'-'+String(db.invoices.filter(x=>x.kind===v.kind).length+1).padStart(5,'0'),date:v.date,warehouse:v.warehouse,party:returning?src.party:v.party,payment:returning?src.payment:v.payment,partyName:returning?src.partyName:(db.people.find(x=>x.id===v.party)?.name||''),origin:returning?src.id:'',total,cost,lines:[{product:p.id,qty:q,price,cost}],status:'posted'};
 await persistDoc(doc,db);
}
async function saveMovement(){
 const db=data(),transfer=view==='transfer',product=$('rc-product')?.value,warehouse=$('rc-warehouse')?.value,to=$('rc-target')?.value,direction=$('rc-direction')?.value,units=n($('rc-qty')?.value),dateValue=$('rc-date')?.value;
 if(!db.products.some(p=>p.id===product)||!db.warehouses.some(w=>w.id===warehouse))throw Error('اختر صنفًا ومخزنًا.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)||!Number.isFinite(Date.parse(dateValue)))throw Error('التاريخ غير صحيح.');
 positive(units,'الكمية');
 if(transfer&&(!to||to===warehouse||!db.warehouses.some(w=>w.id===to)))throw Error('المخزن الهدف غير صالح.');
 if((transfer||direction==='out')&&qty(db,product,warehouse)<units)throw Error('كمية المخزون غير كافية.');
 if(!transfer&&!['in','out'].includes(direction))throw Error('نوع الحركة غير معروف.');
 const unitCost=transfer||direction==='out'?average(db,product,warehouse):n($('rc-cost')?.value);
 positive(rnd(unitCost),'تكلفة الوحدة');
 const total=rnd(units*unitCost),kind=transfer?'transfer':'adjust';
 const doc={id:id(),kind,number:(transfer?'TR':'AD')+'-'+String(db.invoices.filter(x=>x.kind===kind).length+1).padStart(5,'0'),date:dateValue,warehouse,from:warehouse,to:to||'',direction:direction||'',payment:'cash',party:'',partyName:'',total,cost:total,lines:[{product,qty:units,price:unitCost,cost:total}],status:'posted'};
 await persistDoc(doc,db);
}
function printDoc(docId){
 const db=data(),x=db.invoices.find(x=>x.id===docId);if(!x)return;
 const w=window.open('','_blank');if(!w){notify('السماح بنوافذ الطباعة مطلوب','warn');return;}
 const rows=x.lines.map(l=>'<tr><td>'+esc(db.products.find(p=>p.id===l.product)?.name)+'</td><td>'+f(l.qty)+'</td><td>'+f(l.price)+'</td></tr>').join('');
 w.document.open();
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>'+esc(x.number)+'</title><style>body{font-family:Arial;padding:25px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:9px}</style><h2>راتب — مستند تجاري</h2><p>'+esc(x.number)+' — '+esc(x.date)+' — '+esc(x.partyName||'')+'</p><table><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr>'+rows+'</table><h3>الإجمالي: '+f(x.total)+' YER</h3></html>');
 w.document.close();w.focus();w.print();
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
    const sku=$('rc-sku').value.trim(),name=$('rc-name').value.trim(),unit=$('rc-unit').value.trim(),price=n($('rc-price').value);
    positive(price,'سعر البيع',true);if(!sku||!name||!unit||db.products.some(p=>p.sku===sku))throw Error('البيانات غير مكتملة أو رمز الصنف مكرر.');
    db.products.push({id:id(),sku,name,unit,price,minimum:0});save(db);await flushStorage();paint();
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