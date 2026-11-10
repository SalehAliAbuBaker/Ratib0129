'use strict';
/* Ratib 3.6.165: reproduce an explicit 5,008 General journal on the receipt side,
 * without classifying unassigned journals or opposite-side/internal transfers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const script=fs.readFileSync('ratib-cash-pulse-dual-ring-3.6.162.js','utf8');
assert(!script.includes('store.set('),'Cash Pulse model must be strictly read-only');
assert.doesNotThrow(()=>new Function(script));
const cats=[
 {id:'charity_gifts',name:'الصدقة والهبات',color:'#10b981',pct:10},
 {id:'investment_savings',name:'الاستثمار والادخار',color:'#84cc16',pct:20},
 {id:'food_home',name:'الغذاء',color:'#f59e0b',pct:65},
 {id:'general',name:'عام',color:'#64748b',pct:5}
];
const d=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><section id="ratibCashPulse"><div id="ratibPulseReadout"><div class="ratib-pulse-visual">old</div></div></section></body></html>',{url:'https://ratib.example',runScripts:'outside-only',pretendToBeVisual:true});
const w=d.window,doc=w.document;
w.DEFAULT_CATS=cats;
let writes=0;
w.store={get:()=>null,set:()=>{writes++}};
w.RatibCashPulse={refresh:()=>{},openDetails:()=>{}};
w.eval(script);
const v=w.RatibCashPulseViz;
function receipt(id,budget,amount){
 return {id:id+'_0',isMultiVoucher:true,multiVoucherId:id,voucherMode:'income',amount,currency:'YER',
 multiVoucher:{mode:'income',baseCurrency:'YER',lines:[
 {side:'credit',budgetId:budget,base:amount,autoBalance:false},
 {side:'debit',budgetId:'general',base:amount,autoBalance:true}
 ]},status:'posted'};
}
function payment(id,items){
 const amount=items.reduce((n,[,a])=>n+a,0);
 return {id:id+'_0',isMultiVoucher:true,multiVoucherId:id,voucherMode:'spend',amount,currency:'YER',
 multiVoucher:{mode:'spend',baseCurrency:'YER',lines:[
 ...items.map(([budgetId,base])=>({side:'debit',budgetId,base,autoBalance:false})),
 {side:'credit',budgetId:'general',base:amount,autoBalance:true}
 ]},status:'posted'};
}
const r1=receipt('r1','charity_gifts',6600);
const r2=receipt('r2','investment_savings',50000);
const generalJournal={id:'j-5008',voucherMode:'entry',type:'سند قيد #1',currency:'YER',
 amount:5008,debitAccount:'صندوق النقدية',creditAccount:'الإيرادات الأخرى',
 distribution:{general:{id:'general',name:'عام',amount:5008,pct:100,excluded:false}},
 status:'posted',note:'بند العام'};
const p1=payment('p1',[['general',3000],['food_home',10632]]);
const entry=(t,side,amount=t.amount,currency='YER')=>({t,side,currency,amount,opening:false});
const entries=[entry(r1,'debit'),entry(r2,'debit'),entry(generalJournal,'debit'),entry(p1,'credit')];
const before=JSON.stringify(entries);
const row=(model,id)=>model.rows.find(c=>c.id===id);
const receipts=v.buildBudgetModel(entries,cats,'YER','debit');
const payments=v.buildBudgetModel(entries,cats,'YER','credit');
assert.equal(receipts.movement,61608,'Reported receipt total must remain unchanged');
assert.equal(receipts.classified,61608,'Saved General 5008 must no longer show as unclassified');
assert.equal(receipts.unclassified,0);
assert.equal(row(receipts,'general').spent,5008,'General appears as its own actual category');
assert.equal(row(receipts,'charity_gifts').spent,6600);
assert.equal(row(receipts,'investment_savings').spent,50000);
assert.equal(row(receipts,'general').count,1);
assert.equal(payments.movement,13632);
assert.equal(payments.classified,13632);
assert.equal(row(payments,'general').spent,3000,'Independent General payment amount');
assert.equal(row(payments,'food_home').spent,10632);
assert.equal(v.buildBudgetModel([entry(generalJournal,'credit')],cats,'YER','credit').classified,0,
 'A debit-side journal must not become a payment merely due to its note');
const noDistribution={...generalJournal,id:'j-unassigned',amount:800,distribution:{},note:'بند العام'};
assert.equal(v.buildBudgetModel([entry(noDistribution,'debit')],cats,'YER','debit').classified,0,
 'A note is not proof of a saved budget allocation');
const transfer={id:'internal-transfer',voucherMode:'multi-entry',amount:1000,currency:'YER',
 debitAccount:'صندوق النقدية',creditAccount:'البنك',
 distribution:{general:{id:'general',amount:1000}}};
assert.equal(v.buildBudgetModel([entry(transfer,'debit')],cats,'YER','debit').classified,0,
 'Do not turn a compound internal transfer into General');
const untrusted={...generalJournal,id:'unknown',voucherMode:'',amount:1200,note:'بند عام'};
assert.equal(v.buildBudgetModel([entry(untrusted,'debit',1200)],cats,'YER','debit').classified,0,
 'Unknown voucher mode is not automatically promoted to General');
assert.equal(v.buildBudgetModel(entries,cats,'USD','debit').classified,0,'Do not mix currencies');
v.update({currency:'YER',receipts:61608,payments:13632,closing:47976,
  accountLabel:'صندوق النقدية',entries});
doc.querySelector('[data-budget-side="debit"]').click();
const general=doc.querySelector('#ratibDualLegend [data-budget-id="general"]');
assert(general,'General must be rendered as a clickable legend');
assert(general.textContent.includes('5,008'));
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,3);
assert(!doc.getElementById('ratibDualSummary').textContent.includes('غير مصنفة'));
general.click();
assert(doc.getElementById('ratibDualDetail').textContent.includes('5,008'),'General detail amount');
doc.querySelector('[data-budget-side="credit"]').click();
const paymentGeneral=doc.querySelector('#ratibDualLegend [data-budget-id="general"]');
assert(paymentGeneral?.textContent.includes('3,000'),'Payment classification stays independent');
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,2);
assert.equal(JSON.stringify(entries),before,'No accounting data mutation');
assert.equal(writes,0,'No storage writes');
w.close();
console.log('PASS 3.6.165: explicit 5008 General receipt and independent General payment, unchanged turnover/balances, no financial writes');
