/* Ratib commerce extension 3.6.128 — experimental only */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:''}});
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
function qty(db,pid,wid){return rnd(db.invoices.reduce((total,x)=>total+x.lines.reduce((a,l)=>a+(l.product===pid&&x.warehouse===wid?(x.kind==='purchase'?l.qty:-l.qty):0),0),0));}
function average(db,pid,wid){let value=0,units=0;for(const x of db.invoices)for(const l of x.lines)if(l.product===pid&&x.warehouse===wid){let sign=x.kind==='purchase'?1:-1;value+=sign*l.cost;units+=sign*l.qty;}return units>0?Math.max(0,value/units):0;}
function leaf(){return getCanonicalCatalog().flatMap(x=>(x.details||[]).map(d=>({id:d[1],name:d[0]+' — '+d[1]})));}
function paint(){
 const db=data(),tabs=mode==='stock'?[['products','الأصناف'],['warehouses','المخازن'],['summary','الأرصدة']]:[['new','فاتورة جديدة'],['records','سجل الفواتير'],['people',mode==='sale'?'العملاء':'الموردون'],['summary','التقارير'],['accounts','ربط الحسابات']];
 const btns=x=>x.map(item=>'<button type="button" class="'+(item[0]===view?'active':'')+'" data-rc-view="'+item[0]+'">'+item[1]+'</button>').join('');
 let body='';
 if(view==='products')body=products(db);
 if(view==='warehouses')body=warehouses(db);
 if(view==='people')body=people(db);
 if(view==='accounts')body=accounts(db);
 if(view==='new')body=invoice(db);
 if(view==='records')body=records(db);
 if(view==='summary')body=summary(db);
 $('pageCommerce').innerHTML='<div class="rc-app"><h2>المبيعات والمشتريات والمخزون</h2><p class="rc-note">يعمل محليًا، وتحفظ بياناته مع النسخ الاحتياطية لراتب</p><div class="rc-tabs">'+[['sale','المبيعات'],['purchase','المشتريات'],['stock','المخزون']].map(x=>'<button type="button" '+(mode===x[0]?'class="active"':'')+' data-rc-mode="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="rc-tabs">'+btns(tabs)+'</div>'+body+'</div>';
}
function products(db){return wrap('إدارة الأصناف','<form id="rc-product-form" class="rc-grid">'+fld('رمز الصنف',inp('sku','text','','required'))+fld('اسم الصنف',inp('name','text','','required'))+fld('الوحدة',inp('unit','text','حبة','required'))+fld('سعر البيع (YER)',inp('price','number','0','step="0.01" min="0" required'))+'<button class="rc-primary">إضافة صنف</button></form>')+wrap('الأصناف',table(['الرمز','الصنف','الوحدة','سعر البيع'],db.products.map(x=>[esc(x.sku),esc(x.name),esc(x.unit),f(x.price)])));}
function warehouses(db){return wrap('إدارة المخازن','<form id="rc-warehouse-form" class="rc-grid">'+fld('اسم المخزن',inp('name','text','','required'))+'<button class="rc-primary">إضافة مخزن</button></form>')+wrap('المخازن',db.warehouses.map(w=>'<p>'+esc(w.name)+'</p>').join(''));}
function people(db){const type=mode==='sale'?'client':'vendor';return wrap('الأطراف','<form id="rc-person-form" class="rc-grid">'+fld('الاسم',inp('name','text','','required'))+fld('رقم الهاتف',inp('phone','tel'))+'<button class="rc-primary">حفظ</button></form>')+wrap('السجل',db.people.filter(x=>x.type===type).map(x=>'<p>'+esc(x.name)+'</p>').join(''));}
function accounts(db){const names={cash:'الصندوق / البنك',receivable:'ذمم العملاء',payable:'ذمم الموردين',inventory:'المخزون',sales:'إيرادات المبيعات',cogs:'تكلفة البضاعة المباعة'};
return wrap('ربط الحسابات', '<p class="rc-note">لن تُرحّل فاتورة حتى تكون حساباتها التفصيلية محددة وصحيحة. العملة المالية هنا YER.</p><form id="rc-accounts-form" class="rc-grid">'+Object.keys(names).map(k=>fld(names[k],sel('acc-'+k,leaf(),db.accounts[k]))).join('')+'<button class="rc-primary">حفظ الحسابات</button></form>');}
function records(db){return wrap('الفواتير المعتمدة',table(['الرقم','التاريخ','الطرف','المجموع YER'],db.invoices.filter(x=>x.kind===mode).slice().reverse().map(x=>[esc(x.number),esc(x.date),esc(x.partyName||'نقدي'),f(x.total)])));}
function summary(db){const sales=db.invoices.filter(x=>x.kind==='sale').reduce((a,x)=>a+x.total,0),purchases=db.invoices.filter(x=>x.kind==='purchase').reduce((a,x)=>a+x.total,0);
return wrap('الملخص التجاري (YER)','<div class="rc-kpis"><div>المبيعات<strong>'+f(sales)+'</strong></div><div>المشتريات<strong>'+f(purchases)+'</strong></div><div>عدد الفواتير<strong>'+db.invoices.length+'</strong></div></div>')+wrap('الأرصدة والكميات',table(['الصنف','المخزن','الكمية','متوسط التكلفة'],db.products.flatMap(p=>db.warehouses.map(w=>[esc(p.name),esc(w.name),f(qty(db,p.id,w.id)),f(average(db,p.id,w.id))]))));}
function newDraft(){return {kind:mode,date:today(),warehouse:'main',party:'',payment:'cash',product:'',qty:1,price:0};}
function invoice(db){if(!draft||draft.kind!==mode)draft=newDraft();const current=db.products.find(x=>x.id===draft.product);
return wrap(mode==='sale'?'فاتورة بيع جديدة':'فاتورة شراء جديدة','<form id="rc-invoice-form" class="rc-grid">'+fld('التاريخ',inp('date','date',draft.date,'required'))+fld('المخزن',sel('warehouse',db.warehouses,draft.warehouse))+fld('الصنف',sel('product',db.products,draft.product))+fld('الكمية',inp('qty','number',draft.qty,'step="0.01" min="0.01" required'))+fld('سعر الوحدة (YER)',inp('price','number',draft.price||current?.price||0,'step="0.01" min="0" required'))+fld('الطرف',sel('party',db.people.filter(x=>x.type===(mode==='sale'?'client':'vendor')),draft.party))+fld('طريقة الدفع','<select id="rc-payment"><option value="cash">نقدي</option><option value="credit" '+(draft.payment==='credit'?'selected':'')+'>آجل</option></select>')+'<button type="submit" class="rc-primary">اعتماد وترحيل الفاتورة</button></form><p class="rc-note">تُتحقق الكميات والحسابات قبل كل عملية اعتماد. الفواتير المرحّلة لا تُحذف من هذا القسم.</p>');}
function syncInvoice(){if(!draft)return;for(const k of ['date','warehouse','product','party','payment','qty','price'])if($('rc-'+k))draft[k]=$('rc-'+k).value;}
function makeJournal(doc,db){
 const a=db.accounts,leafs=new Set(leaf().map(x=>x.id)),lines=[];
 const post=(side,k,value)=>{if(!a[k]||!leafs.has(a[k]))throw Error('ربط الحساب مفقود: '+k);if(value>0)lines.push({side,account:a[k],amount:value});};
 if(doc.kind==='sale'){post('debit',doc.payment==='cash'?'cash':'receivable',doc.total);post('credit','sales',doc.total);post('debit','cogs',doc.cost);post('credit','inventory',doc.cost);}
 if(doc.kind==='purchase'){post('debit','inventory',doc.total);post('credit',doc.payment==='cash'?'cash':'payable',doc.total);}
 if(rnd(lines.filter(l=>l.side==='debit').reduce((a,l)=>a+l.amount,0))!==rnd(lines.filter(l=>l.side==='credit').reduce((a,l)=>a+l.amount,0)))throw Error('القيد غير متوازن');
 const codes=new Map(leaf().map(x=>[x.id,x.name.split(' — ')[0]])),id='com_'+doc.id,seq=getNextMultiVoucherNumber();
 const multi={id,seq,date:doc.date,mode:'multi-entry',baseCurrency:'YER',baseTotal:doc.total,note:'فاتورة '+doc.number,lines:lines.map(l=>({side:l.side,account:l.account,currency:'YER',amount:l.amount,base:l.amount,rate:1}))};
 return lines.map((l,i)=>({id:id+'_'+i,multiVoucherId:id,commerceId:doc.id,isMultiVoucher:true,voucherMode:'multi-entry',seqNum:seq,date:doc.date,isoDate:doc.date,timestamp:new Date(doc.date).getTime(),amount:l.amount,currency:'YER',debitAccount:l.side==='debit'?l.account:'',creditAccount:l.side==='credit'?l.account:'',debitAccountId:l.side==='debit'?codes.get(l.account)||'':'',creditAccountId:l.side==='credit'?codes.get(l.account)||'':'',multiVoucher:multi,type:'فاتورة '+doc.number,status:'posted',schemaVersion:APP_SCHEMA_VERSION,updatedAt:Date.now(),distribution:{},execution:{}}));
}
async function saveInvoice(){
 if(loading)throw Error('حفظ آخر قيد التنفيذ');syncInvoice();const db=data(),v=draft,q=n(v.qty),price=n(v.price),p=db.products.find(x=>x.id===v.product);
 positive(q,'الكمية');positive(price,'السعر',true);
 if(!p||!db.warehouses.some(x=>x.id===v.warehouse))throw Error('اختر صنفًا ومخزنًا صحيحين');
 if(v.payment==='credit'&&!v.party)throw Error('حدد العميل أو المورد للآجل');
 if(v.kind==='sale'&&qty(db,p.id,v.warehouse)<q)throw Error('المخزون غير كاف');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date)))throw Error('التاريخ غير صحيح');
 const cost=rnd(q*(v.kind==='sale'?average(db,p.id,v.warehouse):price));
 const total=rnd(q*price);positive(total,'الإجمالي');
 const doc={id:id(),kind:v.kind,number:(v.kind==='sale'?'S':'P')+'-'+String(db.invoices.filter(x=>x.kind===v.kind).length+1).padStart(5,'0'),date:v.date,warehouse:v.warehouse,party:v.party,payment:v.payment,partyName:db.people.find(x=>x.id===v.party)?.name||'',total,cost,lines:[{product:p.id,qty:q,price,cost}],status:'posted'};
 const tx=makeJournal(doc,db);
 if(window.RatibLicense?.beforeCreate&&!(await window.RatibLicense.beforeCreate(getAllTransactions())))return;
 loading=true;try{
  const plan=getMasterPlan();plan.transactions.push(...tx);db.invoices.push(doc);
  save(db);store.set('plan',plan);if(typeof audit==='function')audit('COMMERCE_INVOICE',doc.id,null,doc);
  await flushStorage();window.RatibLicense?.recordCreated?.();
  if(typeof renderAllData==='function')renderAllData();if(typeof updateProDashboard==='function')updateProDashboard();
  draft=null;view='records';paint();notify('تم حفظ الفاتورة بقيد متوازن','success');
 }finally{loading=false;}
}
function open(target='sale'){mode=['sale','purchase','stock'].includes(target)?target:'sale';view=mode==='stock'?'products':'new';draft=null;navigateToTab('pageCommerce',true);paint();}
function bind(){
 const root=$('pageCommerce');if(!root)return;
 root.addEventListener('click',e=>{const m=e.target.closest('[data-rc-mode]'),s=e.target.closest('[data-rc-view]');
 if(m){mode=m.dataset.rcMode;view=mode==='stock'?'products':'new';draft=null;paint();}
 if(s){view=s.dataset.rcView;draft=null;paint();}
 });
 root.addEventListener('change',e=>{if(e.target.id==='rc-product'&&draft){syncInvoice();const p=data().products.find(p=>p.id===draft.product);if(p&&mode==='sale')draft.price=p.price;paint();}});
 root.addEventListener('submit',async e=>{if(!e.target.id?.startsWith('rc-'))return;e.preventDefault();
 try{const d=data(),fid=e.target.id;
 if(fid==='rc-product-form'){const sku=$('rc-sku').value.trim(),name=$('rc-name').value.trim(),unit=$('rc-unit').value.trim(),price=n($('rc-price').value);positive(price,'السعر',true);if(!sku||!name||!unit||d.products.some(x=>x.sku===sku))throw Error('بيانات ناقصة أو رمز مكرر');d.products.push({id:id(),sku,name,unit,price});save(d);await flushStorage();paint();}
 else if(fid==='rc-warehouse-form'){const name=$('rc-name').value.trim();if(!name||d.warehouses.some(x=>x.name===name))throw Error('اسم فارغ أو مكرر');d.warehouses.push({id:id(),name});save(d);await flushStorage();paint();}
 else if(fid==='rc-person-form'){const name=$('rc-name').value.trim();if(!name)throw Error('اسم الطرف فارغ');d.people.push({id:id(),name,phone:$('rc-phone').value,type:mode==='sale'?'client':'vendor'});save(d);await flushStorage();paint();}
 else if(fid==='rc-accounts-form'){for(const k of Object.keys(d.accounts))d.accounts[k]=$('rc-acc-'+k).value;save(d);await flushStorage();notify('تم حفظ الربط','success');paint();}
 else if(fid==='rc-invoice-form')await saveInvoice();
 }catch(err){console.error('commerce',err);notify(err.message||'فشل الحفظ','error');}});
}
window.RatibCommerce={open,render:paint};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();