const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.js'),'utf8'),mark="window.RatibCommerce={open,render:paint,version:'3.6.131'};";
assert(source.includes(mark));assert(source.includes("['pdf','PDF'],['share','المشاركة']"));
const code=source.replace(mark,"window.__test={data,products,guideMarkup,documentHtml,productOutput,productGuideCanvases,filteredCatalogProducts,setCatalogFilter:(term,group)=>{catalogSearch=term;catalogGroup=group;},nextNumber,invoice,currentDraftDocument,draftOutput,setInbound:()=>{mode='in';view='new';draft=null;},setDraft:x=>{draft=x;}};"+mark);
const memory={},store={get:(k,d)=>memory[k]??d,set:(k,v)=>memory[k]=v},capture=[],rows=[];
const window={RatibPrintLogo:{whenReady:async()=>true,syncPrint(){}}},document={readyState:'loading',addEventListener(){},getElementById(){return null;}};
class File{constructor(parts,name,opts){this.name=name;this.type=opts.type;}}
const state={
 window,document,File,store,console,
 getCanonicalCatalog:()=>[{details:[['1','مخزون']]}],
 getNextMultiVoucherNumber:()=>1,getAllTransactions:()=>[],getMasterPlan:()=>({transactions:[]}),
 APP_SCHEMA_VERSION:3,flushStorage:async()=>{},showToast(){},audit(){},renderAllData(){},updateProDashboard(){},navigateToTab(){},
 getHeaderConfig:()=>({name:'الجهة من إعدادات الترويسة',details:'العنوان من الإعدادات',show:true}),
 reportCanvasPage:(title,subtitle,page)=>({canvas:{title,subtitle,page},ctx:{},y:210}),
 reportTableLayout:(_,values)=>({values,height:48}),
 drawReportTableRow:(page,layout)=>{page.y+=layout.height;rows.push(layout.values);},
 buildPdfFromCanvases:generator=>({pages:[...generator].map(x=>x.title)}),
 downloadFinancialFile:(blob,name)=>capture.push({action:'pdf',blob,name}),
 shareRatibDocumentFile:async(file,title)=>capture.push({action:'share',file,title})
};
vm.runInNewContext(code,state,{filename:'ratib-commerce-3.6.131.js'});
const T=window.__test,d=T.data();
d.products=[{id:'a',sku:'000001',name:'صنف أ',group:'مواد',unitMain:'حبة',unitSub:'باكت',price:5},{id:'b',sku:'000002',name:'صنف ب',group:'مواد',unitMain:'كرتون',price:6}];
d.warehouses=[{id:'main',name:'المخزن الرئيسي'}];store.set('commerce_v1',d);
(async()=>{
 const layout=T.products(d),full=T.guideMarkup(d),single=T.guideMarkup(d,d.products[0]);
 assert(layout.includes('data-rc-catalog-toggle="search"')&&layout.includes('data-rc-catalog-toggle="group"'));
 assert(layout.includes('rc-guide-tool-icon')&&layout.includes('rc-catalog-results'));
 T.setCatalogFilter('000002','');assert.deepEqual(Array.from(T.filteredCatalogProducts(d),p=>p.id),['b']);
 T.setCatalogFilter('صنف أ','مواد');assert.deepEqual(Array.from(T.filteredCatalogProducts(d),p=>p.id),['a']);
 T.setCatalogFilter('صنف أ','مستلزمات');assert.equal(T.filteredCatalogProducts(d).length,0);
 T.setCatalogFilter('','');
 for(const val of ['data-rc-products="pdf"','data-rc-products="share"','data-rc-item="a"'])assert(layout.includes(val),val);
 assert(full.includes('الجهة من إعدادات الترويسة'));
 assert(full.includes('العنوان من الإعدادات'));
 assert(full.includes('دليل الأصناف'));
 assert(single.includes('بطاقة الصنف'));
 assert(single.includes('صنف أ')&&!single.includes('صنف ب'));
 await T.productOutput('pdf');
 await T.productOutput('share');
 await T.productOutput('pdf','a');
 await T.productOutput('share','a');
 assert.equal(capture.length,4);
 assert.equal(capture[0].blob.pages[0],'دليل الأصناف');
 assert.equal(capture[2].blob.pages[0],'بطاقة الصنف');
 assert(capture[2].name.includes('000001'));
 assert(capture[3].title.includes('صنف أ'));
 const inboundTitles=['أمر توريد','توريد مخزني','فاتورة مشتريات'];
 T.setInbound();
 const inboundLayout=T.invoice(d);
 for(const title of inboundTitles)assert(inboundLayout.includes('data-rc-select-doctype="'+title+'"'),title);
 for(const action of ['view','preview','print','pdf','share','search','back'])assert(inboundLayout.includes('data-rc-draft-action="'+action+'"'),action);
 assert(!inboundLayout.includes('id="rc-doctype"'),'inbound type should be selected via three top buttons, not a dropdown');
 d.invoices.push({kind:'purchase',title:'أمر توريد',number:'IN-00007'},
 {kind:'purchase',title:'توريد مخزني',number:'IN-00003'},
 {kind:'purchase',title:'فاتورة مشتريات',number:'IN-00020'});
 assert.equal(T.nextNumber(d,'purchase','أمر توريد'),'PO-00008');
 assert.equal(T.nextNumber(d,'purchase','توريد مخزني'),'GR-00004');
 assert.equal(T.nextNumber(d,'purchase','فاتورة مشتريات'),'PI-00021');
 assert.notEqual(T.nextNumber(d,'purchase','توريد مخزني'),T.nextNumber(d,'purchase','أمر توريد'));
 store.set('commerce_v1',d);
 T.setDraft({kind:'purchase',title:'توريد مخزني',number:'GR-00004',date:'2026-10-20',warehouse:'main',partyName:'مورد',note:'مراجعة',
  lines:[{product:'a',unit:'حبة',qty:2,price:5}]});
 const before=d.invoices.length;
 await T.draftOutput('pdf');await T.draftOutput('share');
 assert.equal(T.data().invoices.length,before,'draft output must not save accounting documents');
 assert.equal(capture.at(-2).blob.pages[0],'مسودة غير معتمدة — توريد مخزني');
 assert.equal(capture.at(-1).action,'share');
 const css=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.css'),'utf8');
 assert(css.includes('.rc-type-switch')&&css.includes('repeat(3,minmax(0,1fr))'));
 assert(css.includes('.rc-invoice-card .rc-grid')&&css.includes('repeat(2,minmax(0,1fr))'));
 const doc=T.documentHtml(d,{kind:'purchase',title:'فاتورة مشتريات',number:'IN-1',date:'2026-10-20',warehouse:'main',partyName:'مورد',total:10,lines:[]});
 assert(doc.includes('الجهة من إعدادات الترويسة')&&doc.includes('فاتورة مشتريات'));
 console.log('PASS 3.6.131: three inbound type buttons, independent PO/GR/PI numbering, seven draft tools, nonposting PDF/share, compact fields and catalog');
})().catch(error=>{console.error(error);process.exitCode=1;});
