/* Ratib 3.6.144: read-only accounting dashboard cross-checks. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'ratib-dashboard-finance-3.6.144.js'),'utf8');
const ctx={window:{addEventListener(){}},document:{readyState:'loading',addEventListener(){}},console,Date,Number,Math,Intl,Map,Set};
vm.runInNewContext(source,ctx);
const {compute}=ctx.window.RatibDashboardFinance144;
const catalog=[
 {main:'الأصول',sub:'النقدية وما في حكمها',subCode:'1101',details:[['110101','الصندوق'],['110102','البنك']]},
 {main:'الأصول',sub:'العملاء',subCode:'1102',details:[['110201','العملاء']]},
 {main:'الالتزامات',sub:'قروض',details:[['2101','قروض']]},
 {main:'حقوق الملكية',sub:'رأس المال',details:[['3101','رأس المال']]},
 {main:'الإيرادات',sub:'مبيعات',details:[['4101','مبيعات']]},
 {main:'المصروفات',sub:'مصاريف',details:[['5201','إيجار']]}
];
let seq=0;
const leg=(account,side,amount,opening=false,currency='YER')=>({account,debit:side==='dr'?amount:0,credit:side==='cr'?amount:0,baseDebit:side==='dr'?amount:0,baseCredit:side==='cr'?amount:0,currency,baseCurrency:currency,opening});
const transaction=(date,legs,props={})=>({id:'tx'+ ++seq,seqNum:seq,isoDate:date,date,status:'posted',__legs:legs,...props});
const data=[
 transaction('2026-09-01',[leg('الصندوق','dr',1000,true),leg('رأس المال','cr',1000,true)],{isOpeningBalance:true}),
 transaction('2026-10-01',[leg('العملاء','dr',500),leg('مبيعات','cr',500)]),
 transaction('2026-10-02',[leg('إيجار','dr',150),leg('البنك','cr',150)]),
 transaction('2026-10-03',[leg('البنك','dr',400),leg('الصندوق','cr',400)]),
 transaction('2026-10-04',[leg('الصندوق','dr',300),leg('العملاء','cr',300)]),
 transaction('2026-10-05',[leg('البنك','dr',200),leg('قروض','cr',200)]),
 transaction('2026-10-06',[leg('العملاء','dr',123),leg('مبيعات','cr',123)],{status:'deleted'}),
];
const model=(rows,period='all',converter=(l)=>({debit:l.debit,credit:l.credit}))=>
 compute(rows,catalog,'YER',period,'2026-10',t=>t.__legs.map(l=>({...l,date:t.isoDate,tx:t})),converter);
const r=model(data);
for(const [k,n] of Object.entries({cashIn:500,cashOut:150,cashNet:350,cashBalance:1350,revenue:500,expenses:150,surplus:350}))assert.equal(r.values[k],n,k);
assert.equal(r.rows.cashIn.reduce((s,x)=>s+x.amount,0),r.values.cashIn,'inflow detail matches');
assert.equal(r.rows.cashOut.reduce((s,x)=>s+x.amount,0),r.values.cashOut,'outflow detail matches');
assert.equal(r.rows.revenue.reduce((s,x)=>s+x.amount,0),r.values.revenue,'revenue detail matches');
assert.equal(r.rows.expenses.reduce((s,x)=>s+x.amount,0),r.values.expenses,'expense detail matches');
assert.equal(r.rows.cashNet.reduce((s,x)=>s+x.amount,0),r.values.cashNet,'net detail matches');
assert.equal(r.rows.surplus.reduce((s,x)=>s+x.amount,0),r.values.surplus,'activity detail matches');
const oct=model(data,'current');assert.equal(oct.values.cashBalance,1350);assert.equal(oct.values.cashIn,500);assert.equal(oct.values.revenue,500);
const adjusted=model([...data,transaction('2026-10-07',[leg('الصندوق','dr',50,false,'SAR'),leg('مبيعات','cr',50,false,'SAR')])],'all',leg=>({debit:leg.debit*400,credit:leg.credit*400}));
assert.equal(adjusted.values.revenue,500*400+50*400,'documented equivalent is used instead of mixing currencies');
const missing=model([...data,transaction('2026-10-08',[leg('البنك','dr',10,false,'USD'),leg('مبيعات','cr',10,false,'USD')])],'all',leg=>leg.currency==='USD'?null:{debit:leg.debit,credit:leg.credit});
assert.equal(missing.missing.cash,true);assert.equal(missing.missing.activity,true);
const noClass=model([...data,transaction('2026-10-09',[leg('حساب تاريخي','dr',20),leg('البنك','cr',20)])]);assert(noClass.unknown.includes('حساب تاريخي'));assert.equal(noClass.missing.activity,true);
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert(html.includes('"version":"3.6.145"'));assert(sw.includes('"version":"3.6.145"'));
assert(html.includes('ratib-dashboard-finance-3.6.144.js?v=3.6.144'));
assert(sw.includes('"./ratib-dashboard-finance-3.6.144.js"'));
assert(sw.includes('"./ratib-dashboard-finance-3.6.144.css"'));
assert(source.includes("trialEquivalent(leg,target,'approved')"),'FX follows existing voucher and report engine');
assert(source.includes('trialTransactionLegs(t)'), 'booked journal legs, not voucher header amounts');
assert(!source.includes("store.set("),'no accounting mutation');
console.log('PASS 3.6.144: classified cash & activity, opening cash, transfer netting, refunds, traceable details, reviewed FX and safe read-only launch.');
