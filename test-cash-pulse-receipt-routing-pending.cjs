'use strict';
/* Pending regression — no release number or production deployment change. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const viz=fs.readFileSync('ratib-cash-pulse-dual-ring-3.6.162.js','utf8');
const pulse=fs.readFileSync('ratib-cash-pulse.js','utf8');
const css=fs.readFileSync('ratib-cash-pulse-dual-ring-3.6.162.css','utf8');
assert(css.includes('.ratib-dual-budget-switch'),'Budget view toggle must be scoped to Pulse');
assert(!viz.includes('store.set('),'Budget visualization may not change stored records');
assert.doesNotThrow(()=>new Function(viz));
assert.doesNotThrow(()=>new Function(pulse));
const cats=[
 {id:'charity_gifts',name:'الصدقات والهبات',color:'#10b981',pct:10},
 {id:'investment_savings',name:'الاستثمار',color:'#84cc16',pct:20},
 {id:'general',name:'عام',color:'#64748b',pct:10},
 {id:'housing_services',name:'السكن',color:'#0ea5e9',pct:60}
];
const receipt=(id,items,currency='YER')=>{
 const lines=items.map(([budgetId,base])=>({side:'credit',budgetId,base,autoBalance:false}));
 const amount=lines.reduce((n,l)=>n+l.base,0);
 lines.push({side:'debit',budgetId:'general',base:amount,autoBalance:true,account:'صندوق النقدية'});
 return {id:id+'_0',isMultiVoucher:true,multiVoucherId:id,voucherMode:'income',
  multiVoucher:{mode:'income',baseCurrency:currency,lines},amount,currency,status:'posted'};
};
const payment=(id,items)=>{
 const lines=items.map(([budgetId,base])=>({side:'debit',budgetId,base,autoBalance:false}));
 const amount=lines.reduce((n,l)=>n+l.base,0);
 lines.push({side:'credit',budgetId:'general',base:amount,autoBalance:true,account:'صندوق النقدية'});
 return {id:id+'_0',isMultiVoucher:true,multiVoucherId:id,voucherMode:'spend',
  multiVoucher:{mode:'spend',baseCurrency:'YER',lines},amount,currency:'YER',status:'posted'};
};
const r1=receipt('r1',[['general',100],['charity_gifts',200],['investment_savings',50],['general',100]]);
const r2=receipt('r2',[['general',100]]);
const rFx=receipt('rFX',[['general',70]],'USD');
const p1=payment('p1',[['general',20],['charity_gifts',100]]);
const p2=payment('p2',[['general',10]]);
const rLegacy={id:'r3',voucherMode:'income',distribution:{general:{amount:25}},amount:25};
const rUnknown={id:'r4',voucherMode:'income',distribution:{},amount:35};
const transfer={id:'bank_transfer',voucherMode:'multi-entry',distribution:{general:{amount:80}},amount:80};
const e=(tx,side,currency=tx.currency,amount=tx.amount)=>({t:tx,side,currency,amount,opening:false});
const entries=[e(r1,'debit'),e(r2,'debit'),e(rFx,'debit'),e(p1,'credit'),
 e(p2,'credit'),e(rLegacy,'debit'),e(rUnknown,'debit'),e(transfer,'debit'),
 {t:r1,side:'debit',currency:'YER',amount:9999,opening:true}];
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><section id="ratibCashPulse"><div id="ratibPulseReadout"><div class="ratib-pulse-visual">Previous indicator</div></div></section></body></html>',
 {url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.DEFAULT_CATS=cats;
let writes=0,details=[];
w.store={get:()=>null,set:()=>writes++};
w.RatibCashPulse={refresh:()=>{},openDetails:side=>details.push(side)};
w.eval(viz);
const api=w.RatibCashPulseViz;
const received=api.buildBudgetModel(entries,cats,'YER','debit');
const spent=api.buildBudgetModel(entries,cats,'YER','credit');
const row=(model,id)=>model.rows.find(x=>x.id===id);
assert.equal(received.receipts,690,'Receipt total: 450+100+25+35+80');
assert.equal(received.classified,575,'Only receipt voucher categories, including General, are classified');
assert.equal(row(received,'general').spent,325,'Repeated General lines and distinct receipts combine once');
assert.equal(row(received,'general').count,3,'General count covers three distinct receipt vouchers');
assert.equal(row(received,'charity_gifts').spent,200,'Other used receipt category is preserved');
assert.equal(row(received,'investment_savings').spent,50);
assert.equal(row(received,'housing_services').spent,0,'Unused category must remain hidden');
assert.equal(received.unclassified,115,'Unassigned receipts and an internal transfer are not invented as General');
assert.equal(spent.classified,130);
assert.equal(row(spent,'general').spent,30);
assert.equal(row(spent,'charity_gifts').spent,100);
assert.equal(row(spent,'investment_savings').spent,0,'Investment receipt cannot appear as payment');
assert.equal(api.buildBudgetModel(entries,cats,'USD','debit').classified,70,'Currency isolation');
assert.equal(api.buildBudgetModel(entries,cats,'USD','credit').classified,0);
const original=JSON.stringify(entries);
api.update({account:'صندوق النقدية',accountLabel:'صندوق النقدية',currency:'YER',receipts:690,payments:130,closing:560,entries});
assert.equal(d.querySelectorAll('#ratibDualLegend [data-budget-id]').length,2,'Spending is the default view');
assert.equal(d.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,2);
assert(d.getElementById('ratibDualSummary').textContent.includes('المصروفات المصنفة'));
d.querySelector('[data-budget-side="debit"]').click();
assert.equal(d.querySelector('[data-budget-side="debit"]').getAttribute('aria-pressed'),'true');
assert.equal(d.querySelectorAll('#ratibDualLegend [data-budget-id]').length,3,'Receipt view shows General, Charity and Investment');
assert.equal(d.querySelectorAll('#ratibDualLegend [data-budget-id="general"]').length,1,'General appears only once');
assert(d.querySelector('#ratibDualLegend [data-budget-id="general"]').textContent.includes('325'));
assert.equal(d.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,3);
assert(d.getElementById('ratibDualSummary').textContent.includes('المقبوضات المصنفة'));
assert(!d.querySelector('[data-budget-id="housing_services"]'),'No inactive categories drawn');
d.querySelector('#ratibDualLegend [data-budget-id="charity_gifts"]').click();
assert(d.getElementById('ratibDualDetail').textContent.includes('200'));
assert(d.getElementById('ratibDualDetail').textContent.includes('المقبوضات المصنفة'));
d.querySelector('[data-budget-side="credit"]').click();
assert.equal(d.querySelectorAll('#ratibDualLegend [data-budget-id]').length,2);
assert(d.getElementById('ratibDualDetail').textContent.includes('مصروف'));
d.querySelector('[data-flow="debit"]').click();
assert.deepEqual(details,['debit'],'Original receipt details remain wired');
assert.equal(d.querySelectorAll('#ratibDualLegend [data-budget-id]').length,3,'Receipt flow button selects receipt categories too');
assert.equal(JSON.stringify(entries),original,'Accounting source remains unchanged');
assert.equal(writes,0);
api.clear();
assert(d.querySelector('.ratib-pulse-visual'),'Fallback remains intact');
w.close();

const vdom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="dashboardHomeContent"><div id="dashboardCarousel"><button class="carousel-dot"></button></div>'+
 '<section id="pageDashboardKpi"><div id="proDashboardCard">Legacy</div></section></div></body></html>',
 {url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const v=vdom.window,doc=v.document;
let openedCash=[],openedLegacy=[];
const posted=[r1,p1,rLegacy].map((tx,i)=>({...tx,status:'posted',
 legs:[{account:'صندوق النقدية',currency:'YER',date:'2026-11-09',
 debit:tx.voucherMode==='income'?tx.amount:0,
 credit:tx.voucherMode==='spend'?tx.amount:0}]}));
v.localStorage.setItem('ratib_official_pulse_selected_cash_accounts_v1',JSON.stringify(['صندوق النقدية']));
v.__ratibProceedInitialized=true;
v.getCanonicalCatalog=()=>[{mainCode:'1',main:'الأصول',subCode:'1101',group:'الأصول المتداولة',sub:'الصناديق',
 details:[['110101','صندوق النقدية']]}];
v.getAllTransactions=()=>posted;
v.getAccountEntry=()=>({});
v.trialTransactionLegs=tx=>tx.legs;
v.getLocalTodayISO=()=>'2026-11-09';
v.getRatibBaseCurrency=()=>'YER';
v.openMultiVoucherEditor=tx=>openedCash.push(tx.voucherMode);
v.openTxModal=tx=>openedLegacy.push(tx.voucherMode);
v.eval(pulse);
doc.dispatchEvent(new v.Event('DOMContentLoaded'));
const box=doc.getElementById('ratibCashPulse');
assert(box,'Cash Pulse must mount');
doc.querySelector('[data-pulse-side="debit"]').click();
let items=doc.querySelectorAll('.ratib-pulse-entry');
assert(items.length>=2);
items[0].click();
assert(openedCash.includes('income'),'Multi-line posted receipt uses dedicated cash editor');
const legacyItem=[...items].find(item=>item.textContent.includes('25'));
assert(legacyItem,'Legacy single receipt is visible');
legacyItem.click();
assert(openedLegacy.includes('income'),'Legacy receipt retains original edit routing');
doc.querySelector('[data-pulse-side="credit"]').click();
doc.querySelector('.ratib-pulse-entry').click();
assert(openedCash.includes('spend'),'Multi-line posted payment uses dedicated cash editor');
assert(!openedLegacy.includes('spend'),'Payment cannot incorrectly open as simple entry');
v.close();
console.log('PASS pending Cash Pulse: receipt/payment category separation, General aggregation, voucher edit routing, no account writes');
