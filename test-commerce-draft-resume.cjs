const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.js'),'utf8'),mark=source.match(/window\.RatibCommerce=\{open,openFavorite,openDocument:commerceOpenDocument,documentAction:commerceDocumentOperation,render:paint,version:[^\n]+?\};/)?.[0];
assert(source.includes(mark));assert(source.includes("['pdf','PDF'],['share','المشاركة']"));
const code=source.replace(mark,"window.__test={data,products,guideMarkup,documentHtml,productOutput,productGuideCanvases,filteredCatalogProducts,setCatalogFilter:(term,group)=>{catalogSearch=term;catalogGroup=group;},nextNumber,invoice,currentDraftDocument,draftOutput,commerceSignatureLabels,commerceCanvasPage,commerceInvoiceRecipientLabel,commerceInvoiceRecipientRow,commerceProductLabel,commerceFindProduct,leaf,commerceSmartAccount,commerceResolveAccount,commerceChosenAccount,accounts,commerceAmountWords,commerceBaseTotal,commerceValidFx,makeJournal,openFavorite,commerceOpenInvoice,commerceReplaceOrDelete,commerceValidateRevision,commerceDocumentOperation,saveInvoice,getDraft:()=>draft,setInbound:()=>{mode='in';view='new';draft=null;},setOutbound:()=>{mode='out';view='new';draft=null;},setDraft:x=>{draft=x;}};"+mark);
const memory={},store={get:(k,d)=>memory[k]??d,set:(k,v)=>memory[k]=v},capture=[],rows=[],headerDraws=[],plan={transactions:[]};
const window={RatibPrintLogo:{whenReady:async()=>true,syncPrint(){},drawCanvas(){return true;}}},document={readyState:'loading',addEventListener(){},getElementById(id){return id==='pageCommerce'?{innerHTML:''}:null;}};
class File{constructor(parts,name,opts){this.name=name;this.type=opts.type;}}
const state={
 window,document,File,store,console,
 getCanonicalCatalog:()=>[{details:[['1','مخزون'],['2','صندوق'],['3','عملاء'],['4','موردون'],['5','مبيعات'],['6','تكلفة'],['7','تسويات']]}],
 getNextMultiVoucherNumber:()=>(memory.plan||plan).transactions.length+1,getAllTransactions:()=>(memory.plan||plan).transactions,getMasterPlan:()=>memory.plan||plan,
 APP_SCHEMA_VERSION:3,flushStorage:async()=>{},showToast(){},audit(){},renderAllData(){},updateProDashboard(){},navigateToTab(){},
 getHeaderConfig:()=>({name:'الجهة من إعدادات الترويسة',details:'العنوان من الإعدادات',show:true}),
 tafqitAccountCurrency:(v,c)=>'تفقيط '+v+' '+c+' فقط لا غير',
 wrapCanvasText:(_,words)=>words.match(/.{1,42}/gu)||[''],
 reportCanvasPage:(title,subtitle,page)=>{
  const ctx={save(){},restore(){},fillRect(){},strokeRect(){},fillText(text){headerDraws.push(String(text));}};
  ctx.fillText('الجهة من إعدادات الترويسة');
  return {canvas:{title,subtitle,page,width:1200,height:1590},ctx,y:210,text:(value)=>{headerDraws.push(String(value));}};
 },
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

const api=window.RatibCommerce;
let accepted=false,prompts=0;window.confirm=()=>{prompts++;return accepted;};
const snap=()=>JSON.stringify(memory);
for(const direction of ['in','out'])for(const returned of [false,true]){
 T.setInbound();
 const sample={format:1,mode:direction,view:returned?'return':'new',editingDocId:'',draft:{kind:direction==='in'?(returned?'purchase_return':'purchase'):(returned?'sale_return':'sale'),title:direction==='in'?'فاتورة مشتريات':'فاتورة مبيعات',number:'D-77',date:'2026-10-25',warehouse:'main',partyName:'طرف',partyAccount:'عملاء',payment:'credit',currency:'SAR',exchangeRate:150,note:'مسودة',origin:returned?'original':'',lines:[{id:'line',product:'a',unit:'حبة',qty:'3',price:'15'}]}};
 const before=snap();assert(api.restoreView(sample));
 assert(api.hasUnsavedDraft());
 const captured=api.captureView();assert.equal(captured.mode,direction);assert.equal(captured.view,sample.view);
 assert.equal(captured.draft.currency,'SAR');assert.equal(captured.draft.lines[0].qty,'3');
 accepted=false;assert.equal(api.requestLeave(),false);assert.equal(api.openFavorite('stock','products'),false);
 assert.deepEqual(api.captureView().draft,captured.draft,'cancel preserves all fields');
 accepted=true;const count=prompts;assert(api.requestLeave());assert(api.requestLeave());assert.equal(prompts,count+1,'one approval per unchanged draft');
 T.getDraft().note='تغيير جديد';accepted=false;assert.equal(api.requestLeave(),false,'new edits require fresh approval');
 assert(api.restoreView(captured));assert.equal(api.captureView().draft.note,'مسودة');
 assert.equal(snap(),before,'capture/restore/guards do not write financial data');
 const edit={...captured,editingDocId:'invoice-id'};api.restoreView(edit);assert.equal(api.captureView().editingDocId,'invoice-id');
 assert.equal(api.restoreView({format:99}),false);
}
T.setInbound();T.invoice(T.data());assert.equal(api.hasUnsavedDraft(),false,'untouched new form has no warning');
T.getDraft().number='custom';assert(api.hasUnsavedDraft(),'document number edits protected');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes("if(tab==='pageCommerce')view.commerce=window.RatibCommerce?.captureView?.()"));
assert(html.includes("window.RatibCommerce?.restoreView?.(view.commerce)"));
console.log('PASS inbound/outbound/returns/edit-state roundtrip, cancel navigation, changed metadata, one confirmation, and no financial writes');
const {JSDOM}=require('jsdom');
function browser(seed){
 const dom=new JSDOM('<html><body><div id="pageCommerce"></div></body></html>',{url:'https://ratib.test',runScripts:'outside-only'}),w=dom.window;
 w.store={get:(k,d)=>memory[k]??d,set:()=>{throw Error('Unexpected financial write');}};
 w.getCanonicalCatalog=state.getCanonicalCatalog;w.navigateToTab=()=>{};w.showToast=()=>{};
 w.confirm=()=>false;w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 if(seed)w.RatibCommerce.restoreView(seed);
 return dom;
}
let b=browser();
try{
 b.window.RatibCommerce.openFavorite('purchase','new:فاتورة مشتريات');
 const d=b.window.document;
 assert.equal(b.window.RatibCommerce.hasUnsavedDraft(),false,'rendered blank form stays clean after syncing controls');
 d.getElementById('rc-note').value='نص قبل إغلاق العملية';
 d.getElementById('rc-number').value='PI-custom';
 d.querySelector('[data-rc-view="records"]').click();
 assert(d.getElementById('rc-note'),'cancel tab switch retains editor');
 assert.equal(d.getElementById('rc-note').value,'نص قبل إغلاق العملية');
 const saved=b.window.RatibCommerce.captureView();b.window.close();b=browser(saved);
 assert.equal(b.window.document.getElementById('rc-note').value,'نص قبل إغلاق العملية');
 assert.equal(b.window.document.getElementById('rc-number').value,'PI-custom');
 b.window.confirm=()=>true;b.window.document.querySelector('[data-rc-view="records"]').click();
 assert.equal(b.window.document.getElementById('rc-note'),null,'accepted tab switch opens records');
 console.log('PASS rendered form cleanliness, cancel tab switch, fresh browser instance restoration and accepted navigation');
}finally{b.window.close();}
