/* Ratib commerce 3.6.130 — trial only. Preserve commerce_v1 and original journal. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:'',adjust:''}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(String(v??'').replace(/,/g,'')),rnd=v=>Math.round(Number(v)*100)/100;
const f=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toLocaleDateString('en-CA');
let mode='stock',view='products',draft=null,loading=false,editingProduct=null,query='',detailId='',previewId='',pendingImport=null,editingWarehouse=null;
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

function leafAccount(value){return leaf().some(a=>a.id===value);}
function validatedAccount(v,label){if(v&&!leafAccount(v))throw Error('الحساب المحدد غير موجود أو غير تفصيلي: '+label);return v||'';}
function warehouseAccount(db,wid){const w=db.warehouses.find(x=>x.id===wid);return w?.accountId||db.accounts.inventory||'';}
function partyAccount(db,doc){return doc.partyAccount||db.people.find(p=>p.name===doc.partyName&&p.type===(['purchase','purchase_return'].includes(doc.kind)?'vendor':'client'))?.accountId||(doc.kind==='purchase'||doc.kind==='purchase_return'?db.accounts.payable:db.accounts.receivable);}
function productRows(db){return db.products.map(p=>[p.sku,p.name,p.group||'',pMain(p),pSub(p),p.price||0,p.minimum||0]);}
function guideMarkup(db){return '<article class="rc-paper" dir="rtl"><header class="rc-paper-head"><strong>راتب للتنظيم والتدبير المالي</strong><h2>دليل الأصناف</h2><small>عدد الأصناف: '+db.products.length+'</small></header>'+table(['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'],productRows(db).map(row=>row.map(esc)))+'</article>';}
function productOutput(action){const db=data(),name='راتب-دليل-الأصناف.xlsx';if(action==='preview'){const modal=ensurePreview();modal.querySelector('#rc-preview-content').innerHTML=guideMarkup(db);previewId='__products__';modal.querySelector('#rc-preview-print').disabled=false;modal.classList.add('show');return;}
 if(action==='print'){let host=$('ratibCommercePrintHost');if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}host.innerHTML=guideMarkup(db);window.RatibPrintLogo?.syncPrint?.();if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');else window.print();return;}
 if(action==='export'||action==='template'){if(typeof XLSX==='undefined')throw Error('مكتبة Excel غير متاحة.');const rows=action==='template'?[]:productRows(db);const sheet=XLSX.utils.aoa_to_sheet([['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'],...rows]);sheet['!cols']=[12,38,25,19,19,20,16].map(wch=>({wch}));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'الأصناف');XLSX.writeFile(book,action==='template'?'نموذج-استيراد-أصناف-راتب.xlsx':name,{compression:true});return;}
 if(action==='import'){$('rc-import-file')?.click();return;}
}
function stageProducts(rows,db){if(!Array.isArray(rows)||rows.length===0)throw Error('ملف Excel فارغ.');if(rows.length>10000)throw Error('قسّم الملف إلى دفعات لا تتجاوز 10000 صنف.');
 const seen=new Set(),existing=new Set(db.products.map(x=>String(x.sku).trim())),out=[];
 for(let i=0;i<rows.length;i++){const r=rows[i];if(!Array.isArray(r)||r.every(x=>x==null||String(x).trim()===''))continue;
 let [sku,name,group,main,sub,price,minimum]=r.map(x=>String(x??'').trim());sku=sku||String(i+1).padStart(6,'0');
 if(!sku||!name||!group||!main)throw Error('سطر '+(i+2)+': الرقم والاسم والمجموعة والوحدة الرئيسية مطلوبة.');
 if(main===sub&&sub)throw Error('سطر '+(i+2)+': الوحدة الفرعية تطابق الرئيسية.');
 if(seen.has(sku)||existing.has(sku))throw Error('رقم صنف مكرر في الملف أو الدليل: '+sku+' (سطر '+(i+2)+')');
 if(!/^\d+(?:\.\d+)?$/.test(price||'0')||!/^\d+(?:\.\d+)?$/.test(minimum||'0'))throw Error('سطر '+(i+2)+': السعر أو الحد ليس رقمًا موجبًا.');
 const p=Number(price||0),m=Number(minimum||0);if(!Number.isFinite(p)||!Number.isFinite(m)||p>1e12||m>1e12)throw Error('قيمة غير صالحة في السطر '+(i+2));
 seen.add(sku);out.push({id:id(),sku,name,group,unitMain:main,unitSub:sub,unit:main,price:p,minimum:m});
 }if(!out.length)throw Error('لا توجد أصناف صالحة للاستيراد.');return out;
}
function stageImportFile(file){if(!file)return;const reader=new FileReader();reader.onerror=()=>notify('تعذر قراءة ملف Excel','error');reader.onload=()=>{try{
 if(typeof XLSX==='undefined')throw Error('مكتبة Excel غير متاحة.');const wb=XLSX.read(reader.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];
 if(!ws)throw Error('لا توجد ورقة Excel صالحة.');
 const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
 const head=(rows[0]||[]).map(x=>String(x).trim());const expected=['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'];
 if(expected.some((h,i)=>head[i]!==h))throw Error('ترتيب الأعمدة مختلف؛ نزّل نموذج الاستيراد واستخدم عناوينه.');
 pendingImport=stageProducts(rows.slice(1),data());paint();
 }catch(e){pendingImport=null;notify(e.message||'تعذر تحليل ملف الاستيراد','error');}};reader.readAsArrayBuffer(file);}
async function confirmProductImport(){if(!pendingImport?.length)throw Error('لا يوجد استيراد قيد المراجعة.');const db=data(),p=pendingImport;
 const exists=new Set(db.products.map(x=>x.sku));if(p.some(x=>exists.has(x.sku)))throw Error('ظهرت أرقام متكررة أثناء المراجعة؛ أعد قراءة الملف.');
 db.products.push(...p);save(db);await flushStorage();pendingImport=null;paint();notify('تم استيراد '+p.length+' صنف دون تعديل الأصناف السابقة','success');
}

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
 $('pageCommerce').innerHTML='<div class="rc-app"><div class="rc-head"><h2>'+header+'</h2>'+(view==='detail'?'':'<button type="button" class="btn btn-ghost" data-rc-back="1">↪️ رجوع</button>')+'</div><div class="rc-tabs">'+panels.map(x=>'<button type="button" class="'+(view===x[0]?'active':'')+'" data-rc-view="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+body+'</div>';
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
 const toolbar='<div class="rc-guide-actions no-print">'+[['preview','المعاينة'],['print','الطباعة'],['export','تصدير Excel'],['template','نموذج Excel'],['import','استيراد Excel']].map(([action,label])=>'<button type="button" class="rc-doc-action" data-rc-products="'+action+'">'+label+'</button>').join('')+'<input id="rc-import-file" type="file" accept=".xlsx,.xls" hidden></div>';
 const review=pendingImport?'<div class="rc-import-review"><h4>معاينة قبل الاستيراد: '+pendingImport.length+' صنف</h4>'+table(['رقم','الصنف','المجموعة','الرئيسية','الفرعية'],pendingImport.slice(0,25).map(x=>[x.sku,x.name,x.group,x.unitMain,x.unitSub].map(esc)))+'<p>المعروض أول 25 صنفًا فقط؛ سيُحفظ الإجمالي بعد الموافقة.</p><button type="button" class="btn btn-primary" data-rc-confirm-import="1">تأكيد الاستيراد</button><button type="button" class="btn btn-ghost" data-rc-cancel-import="1">إلغاء</button></div>':'';
 return wrap('بطاقة الصنف',form+'<p class="rc-note">الوحدتان تعريفان مستقلان للصنف؛ لا يُطبّق التحويل بينهما حتى اعتماد نسب التحويل لاحقًا.</p>')+
 wrap('دليل الأصناف',toolbar+review+table(['الرقم','الصنف','المجموعة','الرئيسية','الفرعية',''],db.products.map(p=>[esc(p.sku),esc(p.name),esc(p.group||'—'),esc(pMain(p)),esc(pSub(p)||'—'),'<button type="button" data-rc-edit-product="'+esc(p.id)+'">تعديل</button>'])));
}
function warehouses(db){
 const w=db.warehouses.find(x=>x.id===editingWarehouse),opts=leaf();
 return wrap('إدارة المخازن','<p class="rc-note">كل مخزن مرتبط بحساب تفصيلي من شجرة راتب؛ الاسم المستعار للعرض فقط. لا يُعدل ربط مستندات قديمة.</p><form id="rc-warehouse-form" class="rc-grid">'+
 fld('الحساب الفرعي المرتبط بالمخزن',sel('warehouse-account',opts,w?.accountId||''))+
 fld('الاسم المستعار (اختياري)',inp('name','text',w?.alias||'','maxlength="100" placeholder="يستخدم اسم الحساب تلقائيًا عند تركه فارغًا"'))+
 '<button class="btn btn-primary" type="submit">'+(w?'حفظ التعديل':'إضافة مخزن')+'</button></form>')+
 wrap('المخازن',table(['اسم المخزن','الحساب الفرعي',''],db.warehouses.map(w=>[esc(w.alias||w.name),esc(w.accountId||'غير مرتبط بعد'),'<button type="button" data-rc-edit-warehouse="'+esc(w.id)+'">تعديل الربط</button>'])));
}
function people(db){const type=mode==='in'?'vendor':'client';return wrap('إدارة '+(type==='vendor'?'الموردين':'العملاء'),'<form id="rc-person-form" class="rc-grid">'+
 fld('الحساب الفرعي '+(type==='vendor'?'للمورد':'للعميل'),sel('person-account',leaf(),''))+
 fld('الاسم المستعار (اختياري)',inp('name','text','','maxlength="120"'))+
 fld('رقم الهاتف',inp('phone','tel'))+'<button class="btn btn-primary">حفظ</button></form>')+
 wrap('السجل',table(['الاسم','الحساب الفرعي','الهاتف'],db.people.filter(p=>p.type===type).map(p=>[esc(p.name),esc(p.accountId||'—'),esc(p.phone||'—')])));}

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
function newDraft(){
 const db=data(),kind=view==='return'?(mode==='in'?'purchase_return':'sale_return'):dir();
 return {kind,title:types[mode]?.[0]||'مرتجع',number:nextNumber(db,kind),date:today(),warehouse:db.warehouses[0]?.id||'main',partyName:'',partyAccount:'',payment:'credit',note:'',origin:'',lines:[{id:id(),product:'',unit:'',qty:1,price:0}]};
}
function leftToReturn(db,origin,pid,unit){
 const x=db.invoices.find(t=>t.id===origin);
 const original=(x?.lines||[]).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((a,l)=>a+Number(l.qty||0),0);
 const returned=db.invoices.filter(t=>t.origin===origin).flatMap(t=>t.lines).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((a,l)=>a+Number(l.qty||0),0);
 return rnd(original-returned);
}
function invoice(db){
 const kind=view==='return'?(mode==='in'?'purchase_return':'sale_return'):dir(),ret=view==='return';
 if(!draft||draft.kind!==kind)draft=newDraft();
 const orig=db.invoices.find(x=>x.id===draft.origin);
 const originals=ret?db.invoices.filter(d=>d.kind===dir()&&d.lines.some(l=>leftToReturn(db,d.id,l.product,lineUnit(db,l))>0)):[];
 const partySuggestions=[...db.people.map(p=>p.name),...leaf().map(x=>x.id)];
 const form='<form id="rc-invoice-form"><div class="rc-grid">'+
 fld('نوع المستند',ret?'<strong>مرتجع '+(mode==='in'?'الوارد':'الصادر')+'</strong>':sel('doctype',types[mode].map(name=>({id:name,name})),draft.title))+
 fld('رقم المستند / الفاتورة',inp('number','text',draft.number,'required maxlength="40"'))+
 fld('التاريخ',inp('date','date',draft.date,'required'))+
 fld('المخزن',sel('warehouse',db.warehouses,draft.warehouse))+
 (ret?fld('المستند الأصلي',sel('origin',originals.map(x=>({id:x.id,name:x.number+' — '+docName(x)})),draft.origin)):'')+
 fld(mode==='in'?'المورد أو صاحب الحساب':'العميل أو صاحب الحساب',inp('partyName','text',draft.partyName,'required maxlength="140" list="rc-parties"')+'<datalist id="rc-parties">'+[...new Set(partySuggestions)].map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist>')+
 fld('الحساب الفرعي للطرف (افتراضي، قابل للتغيير)',sel('partyAccount',leaf(),draft.partyAccount||db.accounts[mode==='in'?'payable':'receivable']))+
 fld('طريقة التسوية','<select id="rc-payment"><option value="credit" '+(draft.payment==='credit'?'selected':'')+'>آجل / على الحساب</option><option value="cash" '+(draft.payment==='cash'?'selected':'')+'>نقدي</option></select>')+
 fld('العملة','<strong>YER — ريال يمني</strong>')+
 '<div class="rc-full">'+fld('البيان / الملاحظات','<textarea id="rc-note" rows="2" placeholder="ملاحظة المستند">'+esc(draft.note)+'</textarea>')+'</div></div>'+
 '<div class="rc-scroll"><table class="rc-lines"><thead><tr><th>الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th><th></th></tr></thead><tbody>'+
 draft.lines.map((l,i)=>{
  const available=ret?(orig?.lines||[]).filter(x=>leftToReturn(db,orig.id,x.product,lineUnit(db,x))>0).map(x=>({id:x.product,name:db.products.find(p=>p.id===x.product)?.name||''})):db.products;
  const p=db.products.find(p=>p.id===l.product);
  const units=p?unitList(p).map(x=>({id:x,name:x})):[];
  return '<tr><td>'+sel('product-'+i,available,l.product)+'</td><td>'+sel('unit-'+i,units,l.unit)+'</td><td>'+inp('qty-'+i,'number',l.qty,'min="0" step="0.01" inputmode="decimal"')+'</td><td>'+inp('price-'+i,'number',l.price,'min="0" step="0.01" inputmode="decimal" '+(ret?'readonly':''))+'</td><td class="rc-line-total" data-total="'+i+'">'+f(n(l.qty)*n(l.price))+'</td><td><button type="button" class="btn btn-ghost" data-rc-remove="'+i+'" aria-label="حذف السطر">×</button></td></tr>';
 }).join('')+'</tbody></table></div>'+
 '<div class="rc-actions no-print"><button type="button" class="btn btn-ghost" data-rc-add="1">＋ إضافة صنف</button>'+
 '<strong class="rc-grand">الإجمالي: <span id="rc-grand">'+f(draft.lines.reduce((a,l)=>a+n(l.qty)*n(l.price),0))+'</span> YER</strong></div>'+
 '<div class="rc-actions no-print"><button type="button" class="btn btn-ghost" data-rc-draft-preview="1">👁 معاينة</button><button type="submit" class="btn btn-primary">💾 اعتماد وحفظ المستند</button></div></form>'+
 '<p class="rc-note">جميع البنود بسعرها وإجماليها؛ لا يوجد تحويل تلقائي بين الوحدة الرئيسية والفرعية قبل اعتماده. يمنع الحفظ غير المتوازن أو صرف كمية غير متاحة.</p>';
 return wrap(ret?'مرتجع مخزني — '+(mode==='in'?'الوارد':'الصادر'):draft.title,form);
}
function syncInvoice(){
 if(!draft)return;
 for(const key of ['doctype','number','date','warehouse','origin','partyName','partyAccount','payment','note']){
  const element=$('rc-'+key);if(element)draft[key==='doctype'?'title':key]=element.value;
 }
 draft.lines.forEach((l,i)=>{
  for(const k of ['product','unit','qty','price']){const e=$('rc-'+k+'-'+i);if(e)l[k]=e.value;}
 });
}
function refreshTotals(){
 if(!draft)return;
 let total=0;draft.lines.forEach((l,i)=>{const amount=rnd(n(l.qty)*n(l.price));total+=amount;const cell=document.querySelector('[data-total="'+i+'"]');if(cell)cell.textContent=f(amount);});
 if($('rc-grand'))$('rc-grand').textContent=f(total);
}
function changeOrigin(){
 const db=data(),origin=db.invoices.find(x=>x.id===draft.origin);
 draft.lines=origin?(origin.lines||[]).filter(l=>leftToReturn(db,origin.id,l.product,lineUnit(db,l))>0).map(l=>({id:id(),product:l.product,unit:lineUnit(db,l),qty:0,price:l.price})):[{id:id(),product:'',unit:'',qty:0,price:0}];
 if(origin){draft.warehouse=origin.warehouse;draft.partyName=origin.partyName;draft.partyAccount=origin.partyAccount||'';draft.payment=origin.payment;}
 paint();
}
function makeJournal(doc,db){
 if(doc.kind==='transfer')return [];
 const a=db.accounts,accounts=leaf(),valid=new Set(accounts.map(x=>x.id)),lines=[];
 const post=(side,key,sum)=>{sum=rnd(sum);if(sum<=0)return;const selected=key==='inventory'?warehouseAccount(db,doc.warehouse):(key==='payable'||key==='receivable')?partyAccount(db,doc):a[key];if(!selected||!valid.has(selected))throw Error('ربط الحساب التفصيلي غير مكتمل: '+key);lines.push({side,account:selected,amount:sum});};
 if(doc.kind==='sale'||doc.kind==='sale_return'){
  const sign=doc.kind==='sale';
  post(sign?'debit':'credit',doc.payment==='cash'?'cash':'receivable',doc.total);
  post(sign?'credit':'debit','sales',doc.total);
  post(sign?'debit':'credit','cogs',doc.cost);
  post(sign?'credit':'debit','inventory',doc.cost);
 }else if(doc.kind==='purchase'||doc.kind==='purchase_return'){
  const sign=doc.kind==='purchase';
  post(sign?'debit':'credit','inventory',doc.total);
  post(sign?'credit':'debit',doc.payment==='cash'?'cash':'payable',doc.total);
 }else if(doc.kind==='adjust'){
  const sign=doc.direction==='in';post(sign?'debit':'credit','inventory',doc.total);post(sign?'credit':'debit','adjust',doc.total);
 }
 const debit=rnd(lines.filter(x=>x.side==='debit').reduce((sum,x)=>sum+x.amount,0)),credit=rnd(lines.filter(x=>x.side==='credit').reduce((sum,x)=>sum+x.amount,0));
 if(!lines.length||debit!==credit)throw Error('القيد غير متوازن؛ لن يتم الحفظ.');
 const codes=new Map(accounts.map(x=>[x.id,x.name.split(' — ')[0]])),vid='com_'+doc.id,seq=getNextMultiVoucherNumber();
 const multi={id:vid,seq,date:doc.date,mode:'multi-entry',baseCurrency:'YER',baseTotal:debit,note:docName(doc)+' رقم '+doc.number,beneficiary:doc.partyName,lines:lines.map(l=>({side:l.side,account:l.account,accountId:codes.get(l.account)||'',currency:'YER',amount:l.amount,base:l.amount,rate:1,budgetId:'general',note:doc.note||doc.number}))};
 return lines.map((l,i)=>({id:vid+'_'+i,multiVoucherId:vid,commerceId:doc.id,isMultiVoucher:true,voucherMode:'multi-entry',seqNum:seq,date:doc.date,isoDate:doc.date,timestamp:new Date(doc.date+'T12:00:00').getTime(),amount:l.amount,currency:'YER',debitAccount:l.side==='debit'?l.account:'',creditAccount:l.side==='credit'?l.account:'',debitAccountId:l.side==='debit'?codes.get(l.account)||'':'',creditAccountId:l.side==='credit'?codes.get(l.account)||'':'',multiVoucher:multi,type:docName(doc)+' '+doc.number,recipient:doc.partyName,distribution:{},execution:{},status:'posted',schemaVersion:APP_SCHEMA_VERSION,updatedAt:Date.now()}));
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
 syncInvoice();const db=data(),d=draft,kind=d.kind,ret=kind.endsWith('_return'),origin=db.invoices.find(x=>x.id===d.origin);
 if(!d||!db.warehouses.some(w=>w.id===d.warehouse))throw Error('اختر مخزنًا صحيحًا.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date)))throw Error('تاريخ المستند غير صحيح.');
 if(!String(d.number||'').trim())throw Error('أدخل رقم المستند.');
 if(db.invoices.some(x=>x.number===d.number&&x.kind===kind))throw Error('رقم المستند مستخدم مسبقًا ضمن نفس النوع.');
 if(!String(d.partyName||'').trim())throw Error('حدد المورد أو العميل أو صاحب الحساب.');
 if(d.partyAccount)validatedAccount(d.partyAccount,'الحساب المقابل');
 if(!['cash','credit'].includes(d.payment))throw Error('طريقة التسوية غير صالحة.');
 if(!ret&&!types[mode].includes(d.title))throw Error('اختر نوع مستند معتمد.');
 if(ret&&(!origin||origin.kind!==dir()||origin.warehouse!==d.warehouse))throw Error('اختر مستندًا أصليًا من نفس اتجاه الحركة والمخزن.');
 const selected=d.lines.filter(l=>l.product&&n(l.qty)>0),pending=new Map();
 if(d.lines.some(l=>l.product&&(!Number.isFinite(n(l.qty))||n(l.qty)<=0)))throw Error('تأكد من كمية جميع الأصناف.');
 if(!selected.length)throw Error('أدخل صنفًا واحدًا بكمية موجبة على الأقل.');
 let total=0,totalCost=0;
 const items=selected.map(l=>{
  const p=db.products.find(x=>x.id===l.product);if(!p)throw Error('اختر صنفًا معتمدًا.');
  const unit=pUnit(p,l.unit);
  if(!unitList(p).includes(unit))throw Error('الوحدة غير معرفة في بطاقة الصنف: '+p.name);
  const quantity=n(l.qty);positive(quantity,'الكمية');
  if(!Number.isFinite(quantity)||quantity>1e9)throw Error('الكمية غير صالحة.');
  const key=p.id+'|'+unit;pending.set(key,rnd((pending.get(key)||0)+quantity));
  if(ret&&pending.get(key)>leftToReturn(db,origin.id,p.id,unit))throw Error('المرتجع يتجاوز كمية المستند الأصلي.');
  if(['sale','purchase_return'].includes(kind)&&pending.get(key)>qty(db,p.id,d.warehouse,unit))throw Error('الرصيد غير كاف للصنف '+p.name+' بوحدة '+unit);
  let price=n(l.price),cost;
  if(ret){
   const originals=origin.lines.filter(x=>x.product===p.id&&lineUnit(db,x)===unit);
   if(!originals.length)throw Error('الصنف والوحدة لا يتبعان المستند الأصلي.');
   const base=originals.reduce((a,x)=>a+Number(x.qty||0),0);
   price=rnd(originals.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||0),0)/base);
   cost=rnd(quantity*originals.reduce((a,x)=>a+Number(x.cost||0),0)/base);
  }else{
   positive(price,'سعر الوحدة',true);
   cost=rnd(quantity*(kind==='purchase'?price:average(db,p.id,d.warehouse,unit)));
  }
  const lineSum=rnd(price*quantity);positive(lineSum,'الإجمالي');
  total=rnd(total+lineSum);totalCost=rnd(totalCost+cost);
  return {product:p.id,unit,qty:quantity,price,subtotal:lineSum,cost};
 });
 positive(total,'الإجمالي');
 const prefix={purchase:'IN',sale:'OUT',purchase_return:'IR',sale_return:'OR'}[kind];
 const doc={id:id(),kind,title:ret?'مرتجع '+(mode==='in'?'الوارد':'الصادر'):d.title,number:String(d.number).trim(),date:d.date,warehouse:d.warehouse,partyName:String(d.partyName).trim(),partyAccount:d.payment==='credit'?validatedAccount(d.partyAccount,'الحساب المقابل'):'',payment:d.payment,note:String(d.note||''),origin:ret?origin.id:'',currency:'YER',total:rnd(total),cost:rnd(totalCost),lines:items,status:'posted',createdAt:new Date().toISOString()};
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
 modal.querySelector('#rc-preview-print').addEventListener('click',()=>{const chosen=previewId;modal.classList.remove('show');if(chosen==='__products__')productOutput('print');else printDocument(chosen);});
 return modal;
}
function previewDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 previewId=docId;const modal=ensurePreview();modal.querySelector('#rc-preview-print').disabled=!docId;modal.querySelector('#rc-preview-content').innerHTML=documentHtml(db,d);window.RatibPrintLogo?.syncPrint();
 modal.classList.add('show');
}
function printDocument(docId){
 const db=data(),d=db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 let host=$('ratibCommercePrintHost');
 if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}
 host.innerHTML=documentHtml(db,d);window.RatibPrintLogo?.syncPrint();
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
async function pdfFor(d){
 await window.RatibPrintLogo?.whenReady?.();
 const db=data();return buildPdfFromCanvases(documentCanvases(db,d));
}
async function documentOutput(action,docId){
 const db=data(),d=db.invoices.find(x=>x.id===docId);if(!d)throw Error('المستند غير موجود.');
 if(action==='view'){detailId=d.id;view='detail';paint();return;}
 if(action==='preview'){previewDocument(d.id);return;}
 if(action==='print'){printDocument(d.id);return;}
 if(['pdf','share'].includes(action)){
  const blob=await pdfFor(d),name=docName(d)+'-'+d.number+'.pdf';
  if(action==='pdf')downloadFinancialFile(blob,name);
  else await shareRatibDocumentFile(new File([blob],name,{type:'application/pdf'}),docName(d)+' '+d.number);
  return;
 }
 if(action==='search'){view='records';paint();$('rc-query')?.focus();return;}
 if(action==='back'){view='records';paint();}
}

function open(target='stock'){
 mode=target==='purchase'?'in':target==='sale'?'out':['stock','in','out'].includes(target)?target:'stock';
 view=mode==='stock'?'products':'new';draft=null;editingProduct=null;query='';detailId='';
 navigateToTab('pageCommerce',true);paint();
}
function bind(){
 const root=$('pageCommerce');if(!root)return;
 root.addEventListener('click',event=>{
  const hit=selector=>event.target.closest(selector);
  try{
   const productAction=hit('[data-rc-products]');if(productAction){productOutput(productAction.dataset.rcProducts);return;}
   if(hit('[data-rc-confirm-import]')){confirmProductImport().catch(e=>notify(e.message,'error'));return;}
   if(hit('[data-rc-cancel-import]')){pendingImport=null;paint();return;}
   const warehouseEdit=hit('[data-rc-edit-warehouse]');if(warehouseEdit){editingWarehouse=warehouseEdit.dataset.rcEditWarehouse;paint();return;}
   if(hit('[data-rc-back]')){if(view==='detail'){view='records';paint();}else if(typeof goBackInApp==='function')goBackInApp();return;}
   const v=hit('[data-rc-view]');if(v){view=v.dataset.rcView;draft=null;editingProduct=null;query='';paint();return;}
   const d=hit('[data-rc-detail]');if(d){detailId=d.dataset.rcDetail;view='detail';paint();return;}
   const edit=hit('[data-rc-edit-product]');if(edit){editingProduct=edit.dataset.rcEditProduct||null;paint();return;}
   const add=hit('[data-rc-add]');if(add){syncInvoice();draft.lines.push({id:id(),product:'',unit:'',qty:1,price:0});paint();return;}
   const del=hit('[data-rc-remove]');if(del){syncInvoice();draft.lines.splice(Number(del.dataset.rcRemove),1);if(!draft.lines.length)draft.lines=[{id:id(),product:'',unit:'',qty:1,price:0}];paint();return;}
   if(hit('[data-rc-search]')){query=$('rc-query')?.value.trim()||'';paint();$('rc-query')?.focus();return;}
   const action=hit('[data-rc-action]');if(action){Promise.resolve(documentOutput(action.dataset.rcAction,action.dataset.doc)).catch(e=>notify(e.message||'تعذر إخراج المستند','error'));return;}
   if(hit('[data-rc-draft-preview]')){syncInvoice();const db=data(),d=draft;const lines=d.lines.filter(l=>l.product&&n(l.qty)>0).map(l=>({product:l.product,unit:l.unit,qty:n(l.qty),price:n(l.price),subtotal:rnd(n(l.qty)*n(l.price))}));if(!lines.length)throw Error('أدخل صنفًا لمعاينته.');previewDocument('',{kind:d.kind,title:d.title,number:d.number,date:d.date,warehouse:d.warehouse,partyName:d.partyName,note:d.note,lines,total:rnd(lines.reduce((a,l)=>a+l.subtotal,0))});return;}
  }catch(e){notify(e.message||'تعذر فتح الأمر','error');}
 });
 root.addEventListener('change',e=>{if(e.target.id==='rc-partyName'){const p=data().people.find(p=>p.name===e.target.value);if(p&&$('rc-partyAccount'))$('rc-partyAccount').value=p.accountId||'';}if(e.target.id==='rc-import-file'){stageImportFile(e.target.files?.[0]);e.target.value='';return;}if(e.target.id==='rc-person-account'){const input=$('rc-name');if(input&&!input.value.trim())input.value=e.target.value;}});
 root.addEventListener('input',e=>{if(/^rc-(qty|price)-\d+$/.test(e.target.id)){syncInvoice();refreshTotals();}});
 root.addEventListener('change',e=>{
  if(e.target.id==='rc-origin'&&draft){syncInvoice();changeOrigin();return;}
  const prod=e.target.id.match(/^rc-product-(\d+)$/);
  if(prod&&draft){syncInvoice();const i=Number(prod[1]),db=data(),p=db.products.find(p=>p.id===draft.lines[i].product);draft.lines[i].unit=pMain(p||{unit:'حبة'});if(view==='return'){const o=db.invoices.find(x=>x.id===draft.origin);draft.lines[i].price=o?.lines.find(x=>x.product===p?.id)?.price||0;}else if(mode==='out')draft.lines[i].price=p?.price||0;paint();return;}
  const unit=e.target.id.match(/^rc-unit-(\d+)$/);
  if(unit&&draft){syncInvoice();const i=Number(unit[1]),db=data(),o=db.invoices.find(x=>x.id===draft.origin),l=draft.lines[i];if(view==='return')l.price=o?.lines.find(x=>x.product===l.product&&lineUnit(db,x)===l.unit)?.price||0;refreshTotals();return;}
  if(e.target.id==='rc-product'&&['adjust','transfer'].includes(view)){const p=data().products.find(x=>x.id===e.target.value),input=$('rc-unit');if(input)input.innerHTML=unitList(p||{unit:'حبة'}).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');}
 });
 root.addEventListener('submit',async event=>{
  if(!event.target.id?.startsWith('rc-'))return;event.preventDefault();if(loading)return;
  try{
   const db=data(),form=event.target.id;
   if(form==='rc-product-form'){
    const sku=$('rc-sku').value.trim(),name=$('rc-name').value.trim(),group=$('rc-group').value.trim(),unitMain=$('rc-unitMain').value.trim(),unitSub=$('rc-unitSub').value.trim(),price=n($('rc-price').value),minimum=n($('rc-minimum').value);
    positive(price,'السعر',true);positive(minimum,'حد المخزون',true);
    if(!sku||!name||!group||!unitMain)throw Error('أكمل رقم واسم الصنف والمجموعة والوحدة الرئيسية.');
    if(unitSub===unitMain)throw Error('الوحدة الفرعية لا تساوي الوحدة الرئيسية.');
    if(db.products.some(p=>p.sku===sku&&p.id!==editingProduct))throw Error('رقم الصنف مستخدم.');
    if(editingProduct){const old=db.products.find(p=>p.id===editingProduct);if(!old)throw Error('الصنف غير موجود.');if(db.invoices.some(x=>x.lines.some(l=>l.product===old.id))&&(pMain(old)!==unitMain||pSub(old)!==unitSub))throw Error('الوحدات مستخدمة في مستندات سابقة؛ لا يمكن تعديلها.');Object.assign(old,{sku,name,group,unitMain,unitSub,unit:unitMain,price,minimum});}
    else db.products.push({id:id(),sku,name,group,unitMain,unitSub,unit:unitMain,price,minimum});
    save(db);await flushStorage();editingProduct=null;paint();notify('تم حفظ بطاقة الصنف','success');
   }else if(form==='rc-warehouse-form'){const accountId=validatedAccount($('rc-warehouse-account').value,'حساب المخزن'),alias=$('rc-name').value.trim();if(!accountId)throw Error('اختر الحساب الفرعي أولًا.');if(db.warehouses.some(w=>w.id!==editingWarehouse&&w.accountId===accountId))throw Error('الحساب مرتبط بمخزن آخر.');const name=alias||accountId;const existing=db.warehouses.find(w=>w.id===editingWarehouse);if(existing)Object.assign(existing,{accountId,alias,name});else db.warehouses.push({id:id(),accountId,alias,name});save(db);await flushStorage();editingWarehouse=null;paint();}
   else if(form==='rc-person-form'){const accountId=validatedAccount($('rc-person-account').value,'حساب المورد أو العميل'),name=$('rc-name').value.trim()||accountId;if(!accountId)throw Error('اختر حساب الطرف من شجرة الحسابات.');if(db.people.some(p=>p.accountId===accountId&&p.type===(mode==='in'?'vendor':'client')))throw Error('هذا الطرف مسجل مسبقًا.');db.people.push({id:id(),accountId,name,phone:$('rc-phone')?.value||'',type:mode==='in'?'vendor':'client'});save(db);await flushStorage();paint();}
   else if(form==='rc-accounts-form'){for(const key of Object.keys(db.accounts))db.accounts[key]=validatedAccount($('rc-acc-'+key)?.value||'',key);save(db);await flushStorage();notify('تم حفظ ربط الحسابات','success');paint();}
   else if(form==='rc-invoice-form')await saveInvoice();
   else if(form==='rc-movement-form')await saveMovement();
  }catch(error){console.error('Ratib commerce',error);notify(error.message||'تعذر الحفظ','error');}
 });
}
window.RatibCommerce={open,render:paint,version:'3.6.130'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();