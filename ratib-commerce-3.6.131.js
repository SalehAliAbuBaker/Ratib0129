/* Ratib commerce 3.6.131 — trial only. Preserve commerce_v1 and original journal. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:'',adjust:''}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(String(v??'').replace(/,/g,'')),rnd=v=>Math.round(Number(v)*100)/100;
const f=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toLocaleDateString('en-CA');
let mode='stock',view='products',draft=null,loading=false,editingProduct=null,query='',detailId='',previewId='',pendingImport=null,editingWarehouse=null,previewDraft=null;
let catalogSearch='',catalogGroup='',catalogSearchVisible=false,catalogGroupVisible=false;
function data(){const base=fresh(),v=store.get('commerce_v1',null);if(!v||typeof v!=='object')return base;const x=JSON.parse(JSON.stringify(v));return {...base,...x,products:Array.isArray(x.products)?x.products:[],warehouses:Array.isArray(x.warehouses)?x.warehouses:base.warehouses,people:Array.isArray(x.people)?x.people:[],invoices:Array.isArray(x.invoices)?x.invoices:[],accounts:{...base.accounts,...(x.accounts||{})}};}
function save(x){store.set('commerce_v1',x);}
function notify(t,k='info'){if(typeof showToast==='function')showToast(t,k);else alert(t);}
function positive(v,label,allowZero=false){if(!Number.isFinite(v)||v<0||(!allowZero&&v===0)||rnd(v)!==v)throw Error('راجع '+label);}
function sel(id,items,selected=''){return '<select id="rc-'+id+'"><option value="">اختر</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';}
function inp(id,type='text',val='',extra=''){return '<input type="'+type+'" id="rc-'+id+'" value="'+esc(val)+'" '+extra+'>';}
function fld(label,ctl){return '<label class="rc-field"><span class="rc-field-label">'+esc(label)+'</span>'+ctl+'</label>';}
function wrap(t,c){return '<section class="rc-card"><h3>'+t+'</h3>'+c+'</section>';}
function table(labels,rows){return '<div class="rc-scroll"><table><thead><tr>'+labels.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const types={in:['أمر توريد','توريد مخزني','فاتورة مشتريات'],out:['أمر صرف','صرف مخزني','فاتورة مبيعات']};
const inboundNumbers={'أمر توريد':'PO','توريد مخزني':'GR','فاتورة مشتريات':'PI'};
const outboundNumbers={'أمر صرف':'SO','صرف مخزني':'GI','فاتورة مبيعات':'SI'};
const dir=()=>mode==='in'?'purchase':'sale';
const docName=d=>d?.title||({purchase:'فاتورة مشتريات',sale:'فاتورة مبيعات',purchase_return:'مرتجع مشتريات',sale_return:'مرتجع مبيعات',transfer:'تحويل مخزني',adjust:'تسوية مخزنية'}[d?.kind]||'مستند مخزني');
const pMain=p=>String(p?.unitMain||p?.unit||'حبة').trim();
const pSub=p=>String(p?.unitSub||'').trim();
const pUnit=(p,val)=>String(val||pMain(p)).trim();
const lineUnit=(db,l)=>pUnit(db.products.find(p=>p.id===l.product),l.unit);
const unitList=p=>[pMain(p),pSub(p)].filter((x,i,a)=>x&&a.indexOf(x)===i);

function commerceNormalize(value){return String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').trim().toLocaleLowerCase('ar');}
function commerceProductLabel(p){return String(p.sku||'')+' — '+p.name;}
function commerceFindProduct(products,value){
 const q=commerceNormalize(value);
 if(!q)return null;
 const exact=products.filter(p=>[commerceProductLabel(p),p.name,p.sku].some(v=>commerceNormalize(v)===q));
 if(exact.length===1)return exact[0];
 const prefix=products.filter(p=>[commerceProductLabel(p),p.name,p.sku].some(v=>commerceNormalize(v).startsWith(q)));
 return prefix.length===1?prefix[0]:null;
}
function commerceProductInput(i,products,selected){
 const p=products.find(x=>x.id===selected);
 const label=p?commerceProductLabel(p):'';
 return '<input type="text" id="rc-product-search-'+i+'" class="rc-product-search" value="'+esc(label)+'" list="rc-product-options-'+i+'" placeholder="ابحث باسم الصنف أو رقمه" autocomplete="off">'+
  '<input type="hidden" id="rc-product-'+i+'" value="'+esc(selected||'')+'">'+
  '<datalist id="rc-product-options-'+i+'">'+products.map(x=>'<option value="'+esc(commerceProductLabel(x))+'"></option>').join('')+'</datalist>';
}
function commerceAutocomplete(input,values){
 if(!input||input.dataset.composing==='1')return;
 const value=input.value,typed=commerceNormalize(value);
 if(typed.length<2)return;
 const options=[...new Set(values.map(x=>String(x||'').trim()).filter(Boolean))];
 const matches=options.filter(x=>commerceNormalize(x).startsWith(typed));
 if(matches.length!==1)return;
 const match=matches[0];
 if(commerceNormalize(match)===typed)return;
 input.value=match;
 try{input.setSelectionRange(value.length,match.length);}catch(_){}
}
function commerceResolveProduct(index){
 if(!draft)return;
 const input=$('rc-product-search-'+index),hidden=$('rc-product-'+index);
 if(!input||!hidden||!draft.lines[index])return;
 const list=mode==='in'||mode==='out'?data().products:[];
 const p=commerceFindProduct(list,input.value);
 hidden.value=p?.id||'';
 const old=draft.lines[index].product||'';
 draft.lines[index].product=hidden.value;
 if(p&&old!==p.id){
  draft.lines[index].unit=pMain(p);
  draft.lines[index].price=mode==='out'?Number(p.price)||0:0;
  const unit=$('rc-unit-'+index),price=$('rc-price-'+index);
  if(unit)unit.innerHTML=unitList(p).map(v=>'<option value="'+esc(v)+'"'+(v===draft.lines[index].unit?' selected':'')+'>'+esc(v)+'</option>').join('');
  if(price)price.value=draft.lines[index].price;
 }
 if(!p){draft.lines[index].unit='';draft.lines[index].price=0;}
 refreshTotals();
}
function leafAccount(value){return leaf().some(a=>a.id===value);}
function validatedAccount(v,label){if(v&&!leafAccount(v))throw Error('الحساب المحدد غير موجود أو غير تفصيلي: '+label);return v||'';}
function warehouseAccount(db,wid){const w=db.warehouses.find(x=>x.id===wid);return w?.accountId||db.accounts.inventory||'';}
function partyAccount(db,doc){return doc.partyAccount||db.people.find(p=>p.name===doc.partyName&&p.type===(['purchase','purchase_return'].includes(doc.kind)?'vendor':'client'))?.accountId||(doc.kind==='purchase'||doc.kind==='purchase_return'?db.accounts.payable:db.accounts.receivable);}
function productRows(db){return db.products.map(p=>[p.sku,p.name,p.group||'',pMain(p),pSub(p),p.price||0,p.minimum||0]);}

function commerceAmountWords(amount,currency='YER'){
 if(typeof tafqitAccountCurrency==='function')return tafqitAccountCurrency(amount,currency);
 if(typeof tafqit==='function'&&currency==='YER')return tafqit(amount);
 return '';
}
function commerceCurrencyName(code){
 return ({YER:'ريال يمني',SAR:'ريال سعودي',USD:'دولار أمريكي'})[code]||code;
}
function commerceSignatureLabels(d){
 const labels={
  'أمر توريد':['معدّ الطلب','المراجع','المعتمد'],
  'توريد مخزني':['المسلّم','أمين المخزن المستلم','الفاحص','المعتمد'],
  'فاتورة مشتريات':['مسؤول المشتريات','مراجع الحسابات','المعتمد'],
  'أمر صرف':['طالب الصرف','المراجع','المعتمد'],
  'صرف مخزني':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد'],
  'فاتورة مبيعات':['محرّر الفاتورة','المحاسب','المعتمد','العميل / المستلم'],
  'مرتجع الوارد':['المسلّم','أمين المخزن المستلم','المراجع','المعتمد'],
  'مرتجع الصادر':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد']
 };
 return labels[docName(d)]||['المعدّ','المستلم','المراجع','المعتمد'];
}
function commerceSignatureHtml(d){
 return '<div class="rc-paper-signatures">'+commerceSignatureLabels(d).map(label=>'<div class="rc-signature-cell"><b>'+esc(label)+'</b><span>الاسم: ______________</span><span>التوقيع: ____________</span></div>').join('')+'</div>';
}
function printHeading(title,info=''){
 const cfg=typeof getHeaderConfig==='function'?getHeaderConfig():{name:'راتب للتنظيم والتدبير المالي',details:'',show:true};
 return (cfg.show?'<header class="rc-paper-head"><div class="rc-basmalah">بسم الله الرحمن الرحيم</div><strong>'+esc(cfg.name||'راتب للتنظيم والتدبير المالي')+'</strong>'+(cfg.details?'<div class="rc-paper-header-details">'+esc(cfg.details)+'</div>':'')+'</header>':'')+
 '<h2 class="rc-document-title">'+esc(title)+'</h2>'+(info?'<p class="rc-paper-subtitle">'+esc(info)+'</p>':'');
}
function guideMarkup(db,selected){
 const title=selected?'بطاقة الصنف':'دليل الأصناف',subtitle=selected?selected.sku+' — '+selected.name:'إجمالي الأصناف: '+db.products.length;
 const heads=['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'];
 return '<article class="rc-paper rc-guide-paper" dir="rtl">'+printHeading(title,subtitle)+
 '<table class="rc-document-table"><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
 productRows(selected?{products:[selected]}:db).map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></article>';
}
function* productGuideCanvases(db,selected){
 const title=selected?'بطاقة الصنف':'دليل الأصناف',subtitle=selected?selected.sku+' — '+selected.name:'عدد الأصناف: '+db.products.length;
 const heads=['رقم الصنف','اسم الصنف','المجموعة','الرئيسية','الفرعية','سعر YER','حد التنبيه'];
 const widths=[130,260,190,150,140,120,100];
 let number=1,page=reportCanvasPage(title,subtitle,number);
 const draw=(layout,color)=>drawReportTableRow(page,layout,widths,color);
 const header=()=>draw(reportTableLayout(page.ctx,heads,widths,18),'#e2e8f0');
 header();
 for(const values of productRows(selected?{products:[selected]}:db)){
  const layout=reportTableLayout(page.ctx,values.map(x=>String(x??'')),widths,18);
  if(page.y+layout.height>1530){yield page.canvas;page=reportCanvasPage(title,subtitle,++number);header();}
  draw(layout,'#fff');
 }
 yield page.canvas;
}
async function productOutput(action,productId=''){
 const db=data(),selected=productId?db.products.find(p=>p.id===productId):null;
 if(productId&&!selected)throw Error('الصنف المحدد لم يعد موجودًا.');
 const filename=selected?'بطاقة-صنف-'+selected.sku+'.pdf':'دليل-الأصناف-راتب.pdf';
 if(action==='preview'){const modal=ensurePreview();modal.querySelector('#rc-preview-content').innerHTML=guideMarkup(db,selected);previewId=selected?'__product__:'+selected.id:'__products__';modal.querySelector('#rc-preview-print').disabled=false;window.RatibPrintLogo?.syncPrint?.();modal.classList.add('show');return;}
 if(action==='print'){let host=$('ratibCommercePrintHost');if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}host.innerHTML=guideMarkup(db,selected);window.RatibPrintLogo?.syncPrint?.();if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');else window.print();return;}
 if(action==='pdf'||action==='share'){
  await window.RatibPrintLogo?.whenReady?.();
  const pdf=buildPdfFromCanvases(productGuideCanvases(db,selected));
  if(action==='pdf')downloadFinancialFile(pdf,filename);
  else await shareRatibDocumentFile(new File([pdf],filename,{type:'application/pdf'}),'راتب — '+(selected?'بطاقة الصنف '+selected.name:'دليل الأصناف'));
  return;
 }
 if(action==='export'||action==='template'){if(typeof XLSX==='undefined')throw Error('مكتبة Excel غير متاحة.');const rows=action==='template'?[]:productRows(db);const sheet=XLSX.utils.aoa_to_sheet([['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'],...rows]);sheet['!cols']=[12,38,25,19,19,20,16].map(wch=>({wch}));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'الأصناف');XLSX.writeFile(book,action==='template'?'نموذج-استيراد-أصناف-راتب.xlsx':'راتب-دليل-الأصناف.xlsx',{compression:true});return;}
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
function nextNumber(db,kind,title=''){
 const groups=kind==='purchase'?inboundNumbers:kind==='sale'?outboundNumbers:null;
 const prefix=groups?(groups[title]||(kind==='purchase'?'IN':'OUT')):'OUT';
 const docs=db.invoices.filter(x=>x.kind===kind&&(!groups||(groups[title]?x.title===title:!groups[x.title])));
 const max=docs.reduce((m,x)=>Math.max(m,Number(String(x.number).match(/(\d+)$/)?.[1]||0)),0);
 const used=new Set(db.invoices.filter(x=>x.kind===kind).map(x=>String(x.number)));
 let count=max+1,number=prefix+'-'+String(count).padStart(5,'0');
 while(used.has(number)){number=prefix+'-'+String(++count).padStart(5,'0');}
 return number;
}
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
function filteredCatalogProducts(db){
 const term=catalogSearch.trim().toLocaleLowerCase();
 return db.products.filter(p=>(!term||String(p.name||'').toLocaleLowerCase().includes(term)||String(p.sku||'').toLocaleLowerCase().includes(term))&&(!catalogGroup||p.group===catalogGroup));
}
function catalogListMarkup(db){
 const items=filteredCatalogProducts(db);
 const rows=items.length?items.map(p=>[esc(p.sku),esc(p.name),esc(p.group||'—'),esc(pMain(p)),esc(pSub(p)||'—'),'<button type="button" data-rc-edit-product="'+esc(p.id)+'">تعديل</button> <button type="button" data-rc-products="preview" data-rc-item="'+esc(p.id)+'">معاينة</button> <button type="button" data-rc-products="pdf" data-rc-item="'+esc(p.id)+'">PDF</button> <button type="button" data-rc-products="share" data-rc-item="'+esc(p.id)+'">مشاركة</button>']):[['لا توجد أصناف مطابقة','','','','','']];
 return '<div class="rc-catalog-count" aria-live="polite">عرض '+items.length+' من '+db.products.length+' صنف</div>'+table(['الرقم','الصنف','المجموعة','الرئيسية','الفرعية',''],rows);
}
function refreshCatalogListing(){
 const host=$('rc-catalog-results');
 if(host)host.innerHTML=catalogListMarkup(data());
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
 const toolbar='<div class="rc-guide-actions no-print">'+[['preview','◉','المعاينة'],['print','▤','الطباعة'],['pdf','▣','PDF'],['share','⇧','المشاركة'],['export','⇩','تصدير Excel'],['template','▦','نموذج Excel'],['import','⇧','استيراد Excel']].map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-products="'+action+'"><span class="rc-guide-tool-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('')+'<input id="rc-import-file" type="file" accept=".xlsx,.xls" hidden></div>';
 const itemActions=exists?'<div class="rc-guide-actions no-print">'+[['preview','المعاينة'],['print','الطباعة'],['pdf','PDF'],['share','المشاركة']].map(([action,label])=>'<button type="button" class="rc-doc-action" data-rc-products="'+action+'" data-rc-item="'+esc(p.id)+'">'+label+'</button>').join('')+'</div>':'';
 const review=pendingImport?'<div class="rc-import-review"><h4>معاينة قبل الاستيراد: '+pendingImport.length+' صنف</h4>'+table(['رقم','الصنف','المجموعة','الرئيسية','الفرعية'],pendingImport.slice(0,25).map(x=>[x.sku,x.name,x.group,x.unitMain,x.unitSub].map(esc)))+'<p>المعروض أول 25 صنفًا فقط؛ سيُحفظ الإجمالي بعد الموافقة.</p><button type="button" class="btn btn-primary" data-rc-confirm-import="1">تأكيد الاستيراد</button><button type="button" class="btn btn-ghost" data-rc-cancel-import="1">إلغاء</button></div>':'';
 return wrap('بطاقة الصنف',form+itemActions+'<p class="rc-note">الوحدتان تعريفان مستقلان للصنف؛ لا يُطبّق التحويل بينهما حتى اعتماد نسب التحويل لاحقًا.</p>')+
 '<section class="rc-card rc-products-guide">'+
 '<div class="rc-guide-heading no-print"><h3>دليل الأصناف</h3><div class="rc-catalog-buttons">'+
 '<button type="button" class="rc-catalog-toggle'+(catalogSearchVisible?' is-active':'')+'" data-rc-catalog-toggle="search" aria-expanded="'+catalogSearchVisible+'" aria-controls="rc-catalog-search-field"><span aria-hidden="true">⌕</span> بحث الصنف</button>'+
 '<button type="button" class="rc-catalog-toggle'+(catalogGroupVisible?' is-active':'')+'" data-rc-catalog-toggle="group" aria-expanded="'+catalogGroupVisible+'" aria-controls="rc-catalog-group-field"><span aria-hidden="true">▦</span> فلترة المجموعة</button>'+
 '</div></div>'+
 ((catalogSearchVisible||catalogGroupVisible)?'<div class="rc-catalog-filter-fields no-print">'+
  (catalogSearchVisible?'<label id="rc-catalog-search-field"><span>البحث باسم الصنف أو رقمه</span><input type="search" id="rc-catalog-search" value="'+esc(catalogSearch)+'" placeholder="اكتب اسم الصنف أو رقمه" autocomplete="off"></label>':'')+
  (catalogGroupVisible?'<label id="rc-catalog-group-field"><span>اختيار المجموعة</span><select id="rc-catalog-group"><option value="">جميع المجموعات</option>'+[...new Set(db.products.map(p=>p.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(g=>'<option value="'+esc(g)+'" '+(g===catalogGroup?'selected':'')+'>'+esc(g)+'</option>').join('')+'</select></label>':'')+
 '</div>':'')+
 toolbar+review+'<div id="rc-catalog-results">'+catalogListMarkup(db)+'</div></section>';
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
 const db=data(),kind=view==='return'?(mode==='in'?'purchase_return':'sale_return'):dir(),title=view==='return'?'مرتجع':types[mode]?.[0]||'مرتجع';
 return {kind,title,number:nextNumber(db,kind,title),date:today(),warehouse:db.warehouses[0]?.id||'main',partyName:'',displayPartyName:'',partyAccount:'',payment:'credit',note:'',origin:'',lines:[{id:id(),product:'',unit:'',qty:1,price:0}]};
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
 (ret?fld('نوع المستند','<strong>مرتجع '+(mode==='in'?'الوارد':'الصادر')+'</strong>'):'')+
 fld('رقم المستند / الفاتورة',inp('number','text',draft.number,'required maxlength="40"'))+
 fld('التاريخ',inp('date','date',draft.date,'required'))+
 fld('المخزن',sel('warehouse',db.warehouses,draft.warehouse))+
 (ret?fld('المستند الأصلي',sel('origin',originals.map(x=>({id:x.id,name:x.number+' — '+docName(x)})),draft.origin)):'')+
 fld(mode==='in'?'المورد أو صاحب الحساب':'العميل أو صاحب الحساب',inp('partyName','text',draft.partyName,'required maxlength="140" autocomplete="off" list="rc-parties"')+'<datalist id="rc-parties">'+[...new Set(partySuggestions)].map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist>')+
 (commerceInvoiceRecipientLabel(draft)?fld('اسم '+(mode==='in'?'المورد':'العميل')+' على الفاتورة (اختياري)',inp('displayPartyName','text',draft.displayPartyName||'','maxlength="140" autocomplete="off" placeholder="اكتب اسمًا أو اترك الحقل فارغًا" list="rc-parties"')):'')+
 fld('الحساب الفرعي للطرف (افتراضي، قابل للتغيير)',sel('partyAccount',leaf(),draft.partyAccount||db.accounts[mode==='in'?'payable':'receivable']))+
 fld('طريقة التسوية','<select id="rc-payment"><option value="credit" '+(draft.payment==='credit'?'selected':'')+'>آجل / على الحساب</option><option value="cash" '+(draft.payment==='cash'?'selected':'')+'>نقدي</option></select>')+
 fld('عملة المستند','<strong>YER — ريال يمني</strong><small class="rc-currency-note">عملة الترحيل المتاحة حاليًا؛ العملات الأخرى تحتاج سعر صرف معتمد.</small>')+
 '<div class="rc-full">'+fld('البيان / الملاحظات','<textarea id="rc-note" rows="2" placeholder="ملاحظة المستند">'+esc(draft.note)+'</textarea>')+'</div></div>'+
 '<div class="rc-scroll"><table class="rc-lines"><thead><tr><th>الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th><th></th></tr></thead><tbody>'+
 draft.lines.map((l,i)=>{
  const available=ret?(orig?.lines||[]).filter(x=>leftToReturn(db,orig.id,x.product,lineUnit(db,x))>0).map(x=>({id:x.product,name:db.products.find(p=>p.id===x.product)?.name||''})):db.products;
  const p=db.products.find(p=>p.id===l.product);
  const units=p?unitList(p).map(x=>({id:x,name:x})):[];
  return '<tr><td>'+commerceProductInput(i,available,l.product)+'</td><td>'+sel('unit-'+i,units,l.unit)+'</td><td>'+inp('qty-'+i,'number',l.qty,'min="0" step="0.01" inputmode="decimal"')+'</td><td>'+inp('price-'+i,'number',l.price,'min="0" step="0.01" inputmode="decimal" '+(ret?'readonly':''))+'</td><td class="rc-line-total" data-total="'+i+'">'+f(n(l.qty)*n(l.price))+'</td><td><button type="button" class="btn btn-ghost" data-rc-remove="'+i+'" aria-label="حذف السطر">×</button></td></tr>';
 }).join('')+'</tbody></table></div>'+
 '<div class="rc-actions no-print"><button type="button" class="btn btn-ghost" data-rc-add="1">＋ إضافة صنف</button>'+
 '<strong class="rc-grand">الإجمالي: <span id="rc-grand">'+f(draft.lines.reduce((a,l)=>a+n(l.qty)*n(l.price),0))+'</span> YER</strong></div>'+
 (!ret?'<div class="rc-document-actions rc-draft-actions no-print">'+[['view','◉','المشاهدة'],['preview','▣','المعاينة'],['print','▤','الطباعة'],['pdf','▣','PDF'],['share','⇧','المشاركة'],['search','⌕','البحث'],['back','↪','الرجوع']].map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-draft-action="'+action+'"><span class="rc-tool-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('')+'</div>':'<div class="rc-actions no-print"><button type="button" class="btn btn-ghost" data-rc-draft-preview="1">👁 معاينة</button></div>')+
 '<div class="rc-actions no-print"><button type="submit" class="btn btn-primary">💾 اعتماد وحفظ المستند</button></div></form><div id="rc-draft-view"></div>'+
 '<p class="rc-note">جميع البنود بسعرها وإجماليها؛ لا يوجد تحويل تلقائي بين الوحدة الرئيسية والفرعية قبل اعتماده. يمنع الحفظ غير المتوازن أو صرف كمية غير متاحة.</p>';
 const headings=!ret?'<div class="rc-type-switch no-print" role="group" aria-label="نوع مستند '+(mode==='in'?'الوارد':'الصادر')+'">'+types[mode].map((title,i)=>'<button type="button" class="rc-type-option'+(draft.title===title?' active':'')+'" data-rc-select-doctype="'+esc(title)+'" aria-pressed="'+(draft.title===title)+'"><span class="rc-type-symbol" aria-hidden="true">'+['▤','▦','▣'][i]+'</span><span>'+esc(title)+'</span></button>').join('')+'</div>':'<h3>'+esc(ret?'مرتجع مخزني — '+(mode==='in'?'الوارد':'الصادر'):draft.title)+'</h3>';
 return '<section class="rc-card rc-invoice-card">'+headings+form+'</section>';
}
function currentDraftDocument(){
 syncInvoice();if(!draft)throw Error('لا يوجد مستند قيد الإدخال.');
 const db=data(),lines=draft.lines.filter(l=>l.product&&n(l.qty)>0).map(l=>{
  const p=db.products.find(x=>x.id===l.product);if(!p)throw Error('اختر صنفًا معتمدًا.');
  const unit=pUnit(p,l.unit);if(!unitList(p).includes(unit))throw Error('اختر وحدة معتمدة للصنف '+p.name);
  const amount=rnd(n(l.qty)*n(l.price));return {product:l.product,unit,qty:n(l.qty),price:n(l.price),subtotal:amount};
 });
 if(!lines.length)throw Error('أدخل صنفًا واحدًا بكمية موجبة للعرض أو المعاينة.');
 return {...draft,isDraft:true,lines,total:rnd(lines.reduce((sum,l)=>sum+l.subtotal,0))};
}
async function draftOutput(action){
 if(['search','back'].includes(action)){
  if(typeof window.confirm==='function'&&!window.confirm('البيانات غير المحفوظة في المستند ستُفقد. هل تريد المتابعة؟'))return;
  draft=null;view='records';
  if(action==='back'&&typeof goBackInApp==='function'){goBackInApp();return;}
  paint();if(action==='search')$('rc-query')?.focus();return;
 }
 const doc=currentDraftDocument();
 if(action==='view'){const host=$('rc-draft-view');if(host)host.innerHTML='<div class="rc-draft-view-head"><b>مشاهدة المستند قبل اعتماده</b><button type="button" class="btn btn-ghost" data-rc-close-draft-view="1">إغلاق</button></div>'+documentHtml(data(),doc);return;}
 if(action==='preview'){previewDocument('',doc);return;}
 if(action==='print'){printDocument('',doc);return;}
 if(action==='pdf'||action==='share'){
  const blob=await pdfFor(doc),filename=docName(doc)+'-'+doc.number+'-معاينة.pdf';
  if(action==='pdf')downloadFinancialFile(blob,filename);
  else await shareRatibDocumentFile(new File([blob],filename,{type:'application/pdf'}),'معاينة '+docName(doc)+' '+doc.number);
 }
}
function syncInvoice(){
 if(!draft)return;
 for(const key of ['doctype','number','date','warehouse','origin','partyName','displayPartyName','partyAccount','payment','note']){
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
 if(origin){draft.warehouse=origin.warehouse;draft.partyName=origin.partyName;draft.displayPartyName=origin.displayPartyName||'';draft.partyAccount=origin.partyAccount||'';draft.payment=origin.payment;}
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
 if(!String(d.partyName||'').trim())throw Error('حدد المورد أو العميل أو صاحب الحساب المحاسبي.');
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
 const doc={id:id(),kind,title:ret?'مرتجع '+(mode==='in'?'الوارد':'الصادر'):d.title,number:String(d.number).trim(),date:d.date,warehouse:d.warehouse,partyName:String(d.partyName).trim(),partyAccount:d.payment==='credit'?validatedAccount(d.partyAccount,'الحساب المقابل'):'',payment:d.payment,note:String(d.note||''),origin:ret?origin.id:'',currency:'YER',displayPartyName:commerceInvoiceRecipientLabel(d)?String(d.displayPartyName||'').trim():'',total:rnd(total),cost:rnd(totalCost),lines:items,status:'posted',createdAt:new Date().toISOString()};
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

function commerceInvoiceRecipientLabel(d){
 const title=docName(d);
 return title==='فاتورة مبيعات'?'مباع على / صادر إلى':title==='فاتورة مشتريات'?'مُشترى من / وارد من':'';
}
function commerceInvoiceRecipientRow(d){
 const label=commerceInvoiceRecipientLabel(d),name=String(d.displayPartyName||'').trim();
 if(!label||!name)return '';
 return '<div class="rc-invoice-party-row" dir="rtl"><div class="rc-invoice-recipient"><b>'+esc(label)+':</b> <span>'+esc(name)+'</span></div></div>';
}
function documentHtml(db,d){
 const rows=documentLines(db,d),invoiceLabel=commerceInvoiceRecipientLabel(d);
 const tableHtml='<table class="rc-document-table"><thead><tr><th>#</th><th>اسم الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 return '<article class="rc-paper rc-document-paper" dir="rtl">'+printHeading((d.isDraft?'مسودة غير معتمدة — ':'')+docName(d))+
 (invoiceLabel?'<div class="rc-document-meta rc-invoice-meta"><span><b>التاريخ:</b> '+esc(d.date||'—')+'</span><span>رقم الفاتورة: <b>'+esc(d.number)+'</b></span><span>المخزن: <b>'+esc(db.warehouses.find(w=>w.id===d.warehouse)?.name||'—')+'</b></span><span>عملة المستند: <b>'+esc(commerceCurrencyName(d.currency||'YER'))+'</b></span></div>':
 '<div class="rc-document-meta"><span>رقم المستند: <b>'+esc(d.number)+'</b></span><span>التاريخ: <b>'+esc(d.date)+'</b></span><span>المخزن: <b>'+esc(db.warehouses.find(w=>w.id===d.warehouse)?.name||'—')+'</b></span><span>الطرف: <b>'+esc(d.partyName||'—')+'</b></span></div>')+
 commerceInvoiceRecipientRow(d)+
 tableHtml+'<div class="rc-document-footer"><div class="rc-paper-total">الإجمالي: '+f(d.total)+' '+esc(commerceCurrencyName(d.currency||'YER'))+'</div>'+
 '<p class="rc-paper-tafqit"><b>التفقيط:</b> '+esc(commerceAmountWords(d.total,d.currency||'YER'))+'</p>'+
 (String(d.note||'').trim()?'<p class="rc-paper-note"><b>ملاحظات:</b> '+esc(d.note)+'</p>':'')+commerceSignatureHtml(d)+'</div></article>';
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
 modal.querySelector('#rc-preview-print').addEventListener('click',()=>{const chosen=previewId;modal.classList.remove('show');if(chosen==='__products__')productOutput('print');else if(chosen?.startsWith('__product__:'))productOutput('print',chosen.slice(12));else if(chosen==='__draft__'&&previewDraft)Promise.resolve(printDocument('',previewDraft)).catch(e=>notify(e.message,'error'));else Promise.resolve(printDocument(chosen)).catch(e=>notify(e.message,'error'));});
 return modal;
}
function previewDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 previewId=docId||'__draft__';previewDraft=docId?null:JSON.parse(JSON.stringify(d));const modal=ensurePreview();modal.querySelector('#rc-preview-print').disabled=false;modal.querySelector('#rc-preview-content').innerHTML=documentHtml(db,d);window.RatibPrintLogo?.syncPrint();
 modal.classList.add('show');
}
async function printDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 let host=$('ratibCommercePrintHost');
 if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}
 host.innerHTML=documentHtml(db,d);
 await window.RatibPrintLogo?.whenReady?.();
 window.RatibPrintLogo?.syncPrint?.();
 await Promise.all(Array.from(host.querySelectorAll('img')).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));
 if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');
 else window.print();
}
function commerceCanvasPage(db,d,pageNumber){
 const title=(d.isDraft?'مسودة غير معتمدة — ':'')+docName(d);
 const warehouse=db.warehouses.find(w=>w.id===d.warehouse)?.name||'—';
 const label=commerceInvoiceRecipientLabel(d),recipient=String(d.displayPartyName||'').trim();
 const subtitle=label?'':'رقم: '+d.number+' — التاريخ: '+d.date+' — المخزن: '+warehouse+' — الطرف: '+(d.partyName||'—');
 // reportCanvasPage renders the single personal heading and a generic issuance date.
 const page=reportCanvasPage(title,subtitle,pageNumber);
 if(label){
  const ctx=page.ctx;
  ctx.save();
  // Erase only the generic "تاريخ الإصدار" row at y=181, then put document date at y=150.
  // For invoices, the base subtitle is empty; metadata is laid out as one compact RTL row.
  ctx.fillStyle='#ffffff';ctx.fillRect(755,156,389,37);
  ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#182231';
  ctx.font="bold 18px 'Tajawal',sans-serif";
  ctx.fillText('التاريخ: '+(d.date||'—'),1140,150,250);
  ctx.font="17px 'Tajawal',sans-serif";
  ctx.fillText('رقم الفاتورة: '+d.number+' — المخزن: '+warehouse+' — عملة المستند: '+(d.currency||'YER'),856,150,720);
  if(recipient){
   ctx.font="bold 19px 'Tajawal',sans-serif";
   ctx.fillText(label+': '+recipient,1140,197,1030);
  }
  ctx.restore();
  // Keep the recipient separated from the table without an outline or filler panel.
  page.y=recipient?242:222;
 }
 window.RatibPrintLogo?.drawCanvas?.(page.canvas);
 return page;
}
function commerceCanvasSignatures(page,d){
 const labels=commerceSignatureLabels(d),ctx=page.ctx,width=page.canvas.width,left=65,right=65,col=(width-left-right)/labels.length,y=page.y+24;
 ctx.save();ctx.direction='rtl';ctx.textAlign='center';ctx.fillStyle='#111827';
 labels.forEach((label,i)=>{
  const x=width-right-(i+.5)*col;
  ctx.font="bold 19px 'Tajawal',sans-serif";ctx.fillText(label,x,y,col-12);
  ctx.font="16px 'Tajawal',sans-serif";ctx.fillText('الاسم: ____________',x,y+34,col-12);ctx.fillText('التوقيع: ____________',x,y+64,col-12);
 });
 ctx.restore();page.y+=116;
}
function* documentCanvases(db,d){
 let pageNumber=1,page=commerceCanvasPage(db,d,pageNumber);
 const widths=[70,340,150,140,170,220],headers=['#','اسم الصنف','الوحدة','العدد','السعر','الإجمالي'],maxY=1480;
 const draw=(vals,color,layout)=>drawReportTableRow(page,layout||reportTableLayout(page.ctx,vals,widths,19),widths,color||'#fff');
 const heading=()=>draw(headers,'#e2e8f0');
 const nextPage=()=>{page=commerceCanvasPage(db,d,++pageNumber);heading();};
 heading();
 for(const row of documentLines(db,d)){
  const vals=row.map(r=>r.replace(/&amp;|&quot;|&#39;|&lt;|&gt;/g,m=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[m])));
  const layout=reportTableLayout(page.ctx,vals,widths,19);
  if(page.y+layout.height>maxY){yield page.canvas;nextPage();}
  draw(vals,'#fff',reportTableLayout(page.ctx,vals,widths,19));
 }
 const curr=d.currency||'YER',total=['','الإجمالي',curr,'','',f(d.total)],totalLayout=reportTableLayout(page.ctx,total,widths,19);
 const spelled=commerceAmountWords(d.total,curr),note=String(d.note||'').trim();
 // One unboxed notes section, including long paragraphs, not a new table row for each fragment.
 const measure=(value,width)=>typeof wrapCanvasText==='function'?wrapCanvasText(page.ctx,value,width):String(value).match(/.{1,55}/gu)||[''];
 const words=spelled?measure('التفقيط: '+spelled,970):[];
 const lines=note?note.split(/\r?\n/).flatMap(para=>measure(para||' ',970)):[];
 const preliminary=totalLayout.height+(words.length+Math.min(lines.length,5))*31+166;
 if(page.y+preliminary>maxY&&preliminary<maxY-300){yield page.canvas;nextPage();}
 if(page.y+totalLayout.height>maxY){yield page.canvas;nextPage();}
 draw(total,'#ecfdf5',reportTableLayout(page.ctx,total,widths,19));
 const prose=[...words,...(lines.length?['ملاحظات:',...lines]:[])];
 for(let i=0;i<prose.length;i++){
  if(page.y+32+116>maxY){yield page.canvas;nextPage();}
  page.ctx.save();page.ctx.fillStyle='#182231';page.ctx.textAlign='right';page.ctx.direction='rtl';
  page.text(prose[i],1130,page.y+23,18,i===0||prose[i]==='ملاحظات:'?'700':'500');
  page.ctx.restore();page.y+=31;
 }
 if(prose.length)page.y+=12;
 if(page.y+126>maxY){yield page.canvas;nextPage();}
 commerceCanvasSignatures(page,d);
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
 view=mode==='stock'?'products':'new';draft=null;editingProduct=null;query='';detailId='';catalogSearch='';catalogGroup='';catalogSearchVisible=false;catalogGroupVisible=false;
 navigateToTab('pageCommerce',true);paint();
}
function openFavorite(target,screen='products'){
 const source=target==='purchase'?'in':target==='sale'?'out':target==='stock'?'stock':null;
 if(!source)throw Error('قسم غير معروف في مفضلتي.');
 const key=String(screen||'').trim();
 const available=source==='stock'?['products','warehouses','movements','summary','accounts']:
  ['return','records','people','summary','accounts','new'];
 const [pageTitle,...rest]=key.split(':');
 const directTitle=rest.join(':');
 if(!available.includes(pageTitle))throw Error('وظيفة المفضلة غير متاحة.');
 if(directTitle&&(!['in','out'].includes(source)||pageTitle!=='new'||!types[source].includes(directTitle)))throw Error('نوع المستند غير صحيح.');
 open(target);
 view=pageTitle;
 if(directTitle){draft=newDraft();draft.title=directTitle;draft.number=nextNumber(data(),draft.kind,directTitle);}
 paint();
}
function bind(){
 const root=$('pageCommerce');if(!root)return;
 root.addEventListener('click',event=>{
  const hit=selector=>event.target.closest(selector);
  try{
   const chooseDocType=hit('[data-rc-select-doctype]');if(chooseDocType&&draft&&['in','out'].includes(mode)&&view==='new'){
    const newTitle=chooseDocType.dataset.rcSelectDoctype;
    if(!types[mode].includes(newTitle))throw Error('نوع المستند غير معتمد.');
    if(draft.title!==newTitle){syncInvoice();draft.title=newTitle;draft.number=nextNumber(data(),draft.kind,newTitle);paint();}
    return;
   }
   const catalogToggle=hit('[data-rc-catalog-toggle]');if(catalogToggle){
     const kind=catalogToggle.dataset.rcCatalogToggle;
     if(kind==='search'){catalogSearchVisible=!catalogSearchVisible;if(!catalogSearchVisible)catalogSearch='';}
     if(kind==='group'){catalogGroupVisible=!catalogGroupVisible;if(!catalogGroupVisible)catalogGroup='';}
     const productForm=$('rc-product-form');const unsavedFields=productForm?Array.from(productForm.querySelectorAll('input,select,textarea')).filter(el=>el.id).map(el=>[el.id,el.value]):[];
     paint();for(const [fieldId,value] of unsavedFields){const field=$(fieldId);if(field)field.value=value;}
     $(kind==='search'?'rc-catalog-search':'rc-catalog-group')?.focus();return;
    }
   const draftAction=hit('[data-rc-draft-action]');if(draftAction){Promise.resolve(draftOutput(draftAction.dataset.rcDraftAction)).catch(e=>notify(e.message||'تعذر إعداد المستند','error'));return;}
   if(hit('[data-rc-close-draft-view]')){const host=$('rc-draft-view');if(host)host.innerHTML='';return;}
    const productAction=hit('[data-rc-products]');if(productAction){Promise.resolve(productOutput(productAction.dataset.rcProducts,productAction.dataset.rcItem||'')).catch(e=>notify(e.message||'تعذّر تجهيز دليل الأصناف','error'));return;}
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
 root.addEventListener('change',e=>{if(e.target.id==='rc-catalog-group'){catalogGroup=e.target.value;refreshCatalogListing();return;}if(e.target.id==='rc-partyName'){const p=data().people.find(p=>p.name===e.target.value);if(p&&$('rc-partyAccount'))$('rc-partyAccount').value=p.accountId||'';}if(e.target.id==='rc-import-file'){stageImportFile(e.target.files?.[0]);e.target.value='';return;}if(e.target.id==='rc-person-account'){const input=$('rc-name');if(input&&!input.value.trim())input.value=e.target.value;}});
 root.addEventListener('input',e=>{
  if(e.target.id==='rc-catalog-search'){catalogSearch=e.target.value;refreshCatalogListing();return;}
  const productInput=e.target.id.match(/^rc-product-search-(\d+)$/);
  if(productInput&&draft){
   const k=Number(productInput[1]);commerceResolveProduct(k);
   if(!e.isComposing&&!e.target.value.includes(' — ')){
    const matches=data().products.map(commerceProductLabel);
    commerceAutocomplete(e.target,matches);
    commerceResolveProduct(k);
   }
   return;
  }
  if(['rc-partyName','rc-displayPartyName'].includes(e.target.id)){
   if(!e.isComposing)commerceAutocomplete(e.target,data().people.filter(p=>p.type===(mode==='in'?'vendor':'client')).map(p=>p.name));
   if(e.target.id==='rc-partyName'){
    const p=data().people.find(p=>commerceNormalize(p.name)===commerceNormalize(e.target.value));
    if(p&&$('rc-partyAccount'))$('rc-partyAccount').value=p.accountId||'';
   }
   return;
  }
  if(/^rc-(qty|price)-\d+$/.test(e.target.id)){syncInvoice();refreshTotals();}
 });
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
window.RatibCommerce={open,openFavorite,render:paint,version:'3.6.137'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();