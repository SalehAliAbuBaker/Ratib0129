const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'ratib-commerce-3.6.129.js');
const raw=fs.readFileSync(root,'utf8');
const marker="window.RatibCommerce={open,render:paint,version:'3.6.129'};";
assert(raw.includes(marker),'Commerce entry point');
assert(raw.includes("'أمر توريد','توريد مخزني','فاتورة مشتريات'"));
assert(raw.includes("'أمر صرف','صرف مخزني','فاتورة مبيعات'"));
for(const x of ['documentHtml','documentCanvases','pdfFor','shareRatibDocumentFile','printRatibDocument','data-rc-action','rc-product-form'])assert(raw.includes(x),x);
let js=raw.replace(marker,"window.__test={setDraft:d=>{draft=d;mode=d.kind==='purchase'?'in':d.kind==='sale'?'out':d.kind==='purchase_return'?'in':'out';view=d.kind.endsWith('return')?'return':'new';},saveInvoice,qty,data,nextSku,leftToReturn,documentHtml};"+marker);
const plan={month:'2026-10',transactions:[]},memory={};
const store={get:(k,fallback)=>memory[k]??fallback,set:(k,v)=>{memory[k]=v;}},fields={pageCommerce:{innerHTML:''}};
const doc={readyState:'loading',addEventListener(){},getElementById:id=>fields[id]||null,querySelector:()=>null};
const win={RatibLicense:{beforeCreate:async()=>true,recordCreated(){}},RatibPrintLogo:{syncPrint(){}}};
const names=['صندوق','عملاء','موردون','مخزون','مبيعات','تكلفة','فروق'];
const ctx={window:win,document:doc,store,console,Date,Math,Promise,Number,Set,Map,Array,String,JSON,
 getCanonicalCatalog:()=>[{details:names.map((name,i)=>[String(i+101),name])}],
 getNextMultiVoucherNumber:()=>plan.transactions.length+1,
 getAllTransactions:()=>plan.transactions,getMasterPlan:()=>plan,APP_SCHEMA_VERSION:3,
 flushStorage:async()=>{},renderAllData(){},updateProDashboard(){},navigateToTab(){},
 showToast(){},audit(){},getHeaderConfig:()=>({name:'راتب',show:true,details:'اختبار'})};
vm.runInNewContext(js,ctx,{filename:'ratib-commerce-3.6.129.js'});
const t=win.__test;
let d=t.data();
d.products=[{id:'a',name:'الصنف الأول',sku:'000001',group:'مواد',unitMain:'كرتون',unitSub:'درزن',price:9},{id:'b',name:'الصنف الثاني',sku:'000002',group:'قرطاسية',unitMain:'حبة',price:2}];
d.accounts={cash:names[0],receivable:names[1],payable:names[2],inventory:names[3],sales:names[4],cogs:names[5],adjust:names[6]};
store.set('commerce_v1',d);
assert.equal(t.nextSku(d),'000003');
const put=obj=>{for(const [k,v] of Object.entries(obj))fields['rc-'+k]={value:String(v)};};
function draft(kind,title,number,lines,origin=''){
 const d={kind,title,number,date:'2026-10-20',warehouse:'main',partyName:'شركة الاختبار',payment:'credit',note:'بيان',origin,lines:lines.map((l,i)=>({id:'line'+i,...l}))};
 t.setDraft(d);put({number,date:d.date,warehouse:d.warehouse,partyName:d.partyName,payment:d.payment,note:d.note,origin,doctype:title});
 for(let i=0;i<lines.length;i++)put({['product-'+i]:lines[i].product,['unit-'+i]:lines[i].unit,['qty-'+i]:lines[i].qty,['price-'+i]:lines[i].price});
}
(async()=>{
 draft('purchase','أمر توريد','IN-00001',[{product:'a',unit:'كرتون',qty:10,price:4},{product:'b',unit:'حبة',qty:3,price:2}]);
 await t.saveInvoice();assert.equal(t.data().invoices[0].total,46);
 assert.equal(t.qty(t.data(),'a','main','كرتون'),10);
 draft('purchase','توريد مخزني','IN-00002',[{product:'a',unit:'درزن',qty:6,price:3}]);
 await t.saveInvoice();assert.equal(t.qty(t.data(),'a','main','درزن'),6);
 assert.equal(t.qty(t.data(),'a','main','كرتون'),10);
 draft('sale','فاتورة مبيعات','OUT-00001',[{product:'a',unit:'كرتون',qty:5,price:10},{product:'b',unit:'حبة',qty:2,price:3}]);
 await t.saveInvoice();assert.equal(t.data().invoices[2].total,56);
 const original=t.data().invoices[2];
 draft('sale_return','مرتجع الصادر','OR-00001',[{product:'a',unit:'كرتون',qty:1,price:10}],original.id);
 await t.saveInvoice();assert.equal(t.qty(t.data(),'a','main','كرتون'),6);
 assert.equal(t.leftToReturn(t.data(),original.id,'a','كرتون'),4);
 draft('sale','أمر صرف','OUT-00002',[{product:'a',unit:'كرتون',qty:200,price:10}]);
 await assert.rejects(()=>t.saveInvoice(),/الرصيد غير كاف/);
 assert.equal(t.data().invoices.length,4);
 draft('sale','صرف مخزني','OUT-00003',[{product:'a',unit:'درزن',qty:2,price:8}]);await t.saveInvoice();
 assert.equal(t.qty(t.data(),'a','main','درزن'),4);
 const balance=plan.transactions.reduce((n,x)=>n+(x.debitAccount?x.amount:0)-(x.creditAccount?x.amount:0),0);
 assert.equal(Math.round(balance*100),0);
 const latest=t.data().invoices.at(-1),html=t.documentHtml(t.data(),latest);
 for(const x of [latest.number,'شركة الاختبار','درزن','بيان'])assert(html.includes(x));
 assert.equal(t.data().invoices.length,5);
 console.log('PASS 3.6.129 trial: 5 documents, two unit balances, inventory guard, financial balance, printable fields');
})().catch(e=>{console.error(e);process.exitCode=1;});
