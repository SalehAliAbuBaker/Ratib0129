const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const names=['الصندوق','العملاء','الموردون','المخزون','المبيعات','التكلفة','فروق المخزون'];
const records={},plan={month:'2026-10',transactions:[]};
const store={get:(k,d)=>records[k]??d,set:(k,v)=>{records[k]=v;}};
const win={RatibLicense:{beforeCreate:async()=>true,recordCreated(){}}},doc={readyState:'loading',addEventListener(){},getElementById:id=>id==='pageCommerce'?{innerHTML:''}:null};
const ctx={window:win,document:doc,store,console,Date,Math,Promise,setTimeout,clearTimeout,
 getCanonicalCatalog:()=>[{details:names.map((n,i)=>[String(i+101),n])}],
 getNextMultiVoucherNumber:()=>plan.transactions.length+1,
 getAllTransactions:()=>plan.transactions,
 getMasterPlan:()=>plan,
 APP_SCHEMA_VERSION:3,flushStorage:async()=>{},renderAllData(){},updateProDashboard(){},audit(){},showToast(){}};
let code=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.128.js'),'utf8');
code=code.replace('window.RatibCommerce={open,render:paint};',"window._checks={saveInvoice,saveMovement,qty,average,data,makeJournal,move,leftToReturn,setDraft:x=>{draft=x;mode=x.kind.endsWith('_return')?x.kind.replace('_return',''):x.kind;view=x.kind.endsWith('_return')?'return':'new';}};window.RatibCommerce={open,render:paint};");
assert(code.includes('window._checks='));
vm.runInNewContext(code,ctx,{filename:'ratib-commerce-3.6.128.js'});
const t=win._checks,db=t.data();
db.products.push({id:'p',sku:'001',name:'صنف',price:10,unit:'حبة'});
db.accounts={cash:names[0],receivable:names[1],payable:names[2],inventory:names[3],sales:names[4],cogs:names[5],adjust:names[6]};
store.set('commerce_v1',db);
function draft(x){t.setDraft(Object.assign({date:'2026-10-20',warehouse:'main',payment:'cash',party:'',product:'p',qty:5,price:4},x));}
(async()=>{
 draft({kind:'purchase'});await t.saveInvoice();assert.equal(t.qty(t.data(),'p','main'),5);
 draft({kind:'sale',qty:2,price:10});await t.saveInvoice();assert.equal(t.qty(t.data(),'p','main'),3);
 const original=t.data().invoices.find(x=>x.kind==='sale');
 draft({kind:'sale_return',qty:1,origin:original.id,price:10});await t.saveInvoice();
 assert.equal(t.qty(t.data(),'p','main'),4);assert.equal(t.leftToReturn(t.data(),original.id,'p'),1);
 const before=t.data().invoices.length;
 draft({kind:'sale',qty:99,price:10});await assert.rejects(()=>t.saveInvoice(),/الكمية المتاحة/);
 assert.equal(t.data().invoices.length,before);
 const total=plan.transactions.reduce((s,x)=>s+(x.debitAccount?x.amount:0)-(x.creditAccount?x.amount:0),0);
 assert.equal(Math.round(total*100),0,'Journal must stay balanced');
 console.log('PASS trial commerce 3.6.128: purchase, sale, return, stock guard, balanced journal');
})().catch(e=>{console.error(e);process.exitCode=1;});
