'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('ratib-cash-pulse.css','utf8');
const js=fs.readFileSync('ratib-cash-pulse.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.137');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.137","build":"p13700"'));
assert(sw.includes('v257-opening-classic-3.6.137'));
assert(html.includes('ratib-cash-pulse.js?v=3.6.137'));
assert(html.includes('ratib-cash-pulse.css?v=3.6.137'));
assert(sw.includes('"./ratib-cash-pulse.js"')&&sw.includes('"./ratib-cash-pulse.css"'),'Offline cache includes both components');
assert(html.includes('id="proDashboardCard"'),'Keep original KPI node for dependent features');
assert(html.includes('id="pageReminders"'),'Tasks and reminders are preserved');
assert(html.includes('id="remindersChart"'),'Reminder charts are preserved');
assert(html.includes('id="dashboardCarousel"'),'Dashboard carousel navigation is preserved');
assert(css.includes('#pageDashboardKpi > #proDashboardCard{display:none!important}'),'Only original KPI card is visually replaced');
assert(!css.includes('#dashboardHomeContent .ratib-quick-entry{'),'Trial shortcut CSS must not override official home');
assert(!js.includes('store.set('),'Pulse does not write financial transactions');
assert(js.includes("ratib_official_pulse_selected_cash_accounts_v1"),'Official preference namespace');
assert(html.includes('window.RatibCashPulse?.refresh?.();'),'Existing official update cycle refreshes Pulse');
const txs=[
 {id:'opening',status:'posted',isOpeningBalance:true,legs:[{account:'صندوق المؤسسة',currency:'YER',date:'2026-10-20',debit:1000,credit:0,opening:true}]},
 {id:'receipt',status:'posted',legs:[{account:'صندوق المؤسسة',currency:'YER',date:'2026-11-01',debit:200,credit:0}]},
 {id:'payment',status:'posted',legs:[{account:'صندوق المؤسسة',currency:'YER',date:'2026-11-02',debit:0,credit:40}]},
 {id:'transfer',status:'posted',legs:[
  {account:'صندوق المؤسسة',currency:'YER',date:'2026-11-02',debit:0,credit:75},
  {account:'بنك المؤسسة',currency:'YER',date:'2026-11-02',debit:75,credit:0}
 ]},
 {id:'usd',status:'posted',legs:[{account:'صندوق المؤسسة',currency:'USD',date:'2026-11-02',debit:12,credit:0}]},
 {id:'draft',status:'draft',legs:[{account:'صندوق المؤسسة',currency:'YER',date:'2026-11-02',debit:9000,credit:0}]}
];
const original=JSON.stringify(txs);
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="dashboardHomeContent"><div class="main-menu-grid"><button id="originalShortcut">الأقسام</button></div>'+
 '<div id="dashboardCarousel" class="carousel-shell"><div class="carousel-track">'+
 '<section id="pageDashboardKpi" class="carousel-slide"><div id="proDashboardCard">لوحة القيادة القديمة</div></section>'+
 '<section id="pageReminders" class="carousel-slide"><div id="remindersChart">مهام وتذكيرات</div></section>'+
 '</div><div class="carousel-dots"><button class="carousel-dot" aria-label="لوحة القيادة"></button><button class="carousel-dot" aria-label="المهام"></button></div></div></div>'+
 '<input id="accountOpsFromDate"><input id="accountOpsToDate"><input id="accountOpsCurrencyFilter">'+
 '</body></html>',{url:'https://ratib.example/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.localStorage.setItem('ratib_official_pulse_selected_cash_accounts_v1',JSON.stringify(['صندوق المؤسسة']));
w.__ratibProceedInitialized=true;
w._ledger=txs;
w._opened=null;w._statement=null;
w.getCanonicalCatalog=()=>[
 {mainCode:'1',main:'الأصول',subCode:'1101',group:'أصول متداولة',sub:'صناديق وبنوك',details:[['110101','صندوق المؤسسة'],['110102','بنك المؤسسة']]},
 {mainCode:'1',main:'الأصول',subCode:'1102',group:'أصول متداولة',sub:'مدينون',details:[['110201','عميل تجريبي']]}
];
w.getAllTransactions=()=>w._ledger;
w.getAccountEntry=()=>({});
w.trialTransactionLegs=tx=>tx.legs;
w.getLocalTodayISO=()=>'2026-11-03';
w.getRatibBaseCurrency=()=>'YER';
w.accountCurrencyLabel=c=>c;
w.openTxModal=tx=>{w._opened=tx.id;};
w.openAccountFromPager=(name,accounts,currency,aggregate)=>{w._statement={name,accounts,currency,aggregate};};
w.accountOpsState={};w.renderAccountOperations=()=>{w._rendered=(w._rendered||0)+1;};
w.eval(js);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));
(async()=>{
 await wait();
 const pulse=d.getElementById('ratibCashPulse');
 assert(pulse,'Full Pulse mounted');
 assert.equal(pulse.parentElement.id,'pageDashboardKpi','Pulse replaces KPI in its original slide');
 assert.equal(d.getElementById('proDashboardCard').parentElement.id,'pageDashboardKpi','Original KPI stays for legacy hooks');
 assert(d.getElementById('originalShortcut'),'All home shortcuts preserved');
 assert(d.getElementById('pageReminders'),'Reminders slide still present');
 assert.equal(d.querySelector('.carousel-dot').getAttribute('aria-label'),'نبض الصندوق');
 assert.equal(d.getElementById('ratibPulseBody').hidden,false,'Pulse filters expanded by default');
 assert.equal(d.getElementById('ratibPulseBeginning').textContent,'1,000 YER');
 assert.equal(d.getElementById('ratibPulseIncome').textContent,'200 YER');
 assert.equal(d.getElementById('ratibPulseExpense').textContent,'115 YER');
 assert.equal(d.getElementById('ratibPulseClosing').textContent,'1,085 YER');
 assert.equal(d.getElementById('ratibPulseNet').textContent,'85 YER');
 assert.equal(d.getElementById('ratibPulseCurrency').value,'YER','No currency mixing');
 assert(!d.getElementById('ratibPulseReadout').hidden,'Readout visible when configured');
 d.querySelector('[data-pulse-side="credit"]').click();
 const item=d.querySelector('.ratib-pulse-entry');
 assert(item,'Expense details list is interactive');
 item.click();
 assert(['payment','transfer'].includes(w._opened),'Transaction details open original voucher');
 const bank=[...d.querySelectorAll('input[data-pulse-cash-account]')].find(el=>el.value==='بنك المؤسسة');
 assert(bank,'Account-picker searches complete account catalog');
 bank.checked=true;bank.dispatchEvent(new w.Event('change',{bubbles:true}));
 const accounts=d.getElementById('ratibPulseAccount');
 accounts.value='__all_cash_and_banks__';accounts.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('ratibPulseBeginning').textContent,'1,000 YER');
 assert.equal(d.getElementById('ratibPulseIncome').textContent,'200 YER','Internal cash transfer not reported as new income');
 assert.equal(d.getElementById('ratibPulseExpense').textContent,'40 YER','Internal transfer not reported as expense');
 assert.equal(d.getElementById('ratibPulseNet').textContent,'160 YER');
 assert.equal(d.getElementById('ratibPulseClosing').textContent,'1,160 YER','Correct consolidated cash');
 const currencies=d.getElementById('ratibPulseCurrency');
 currencies.value='USD';currencies.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('ratibPulseIncome').textContent,'12 USD','USD not added to YER');
 assert.equal(d.getElementById('ratibPulseClosing').textContent,'12 USD');
 currencies.value='YER';currencies.dispatchEvent(new w.Event('change',{bubbles:true}));
 d.getElementById('ratibPulseStatement').click();
 assert.equal(w._statement?.aggregate,true,'Aggregate statement opens');
 assert.equal(w._statement?.accounts.length,2,'Only selected cash/bank accounts included');
 assert.equal(w._statement?.currency,'YER');
 assert.equal(w._rendered,1,'Statement renders via official report function');
 assert.equal(w.accountOpsState.from,'2026-11-01','Statement filters follow period');
 assert.equal(w.accountOpsState.to,'2026-11-03');
 const period=d.getElementById('ratibPulsePeriod');
 period.value='today';period.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('ratibPulseIncome').textContent,'0 YER');
 assert.equal(d.getElementById('ratibPulseExpense').textContent,'0 YER');
 assert.equal(d.getElementById('ratibPulseClosing').textContent,'1,160 YER','Previous activity correctly rolls into opening');
 period.value='month';period.dispatchEvent(new w.Event('change',{bubbles:true}));
 d.getElementById('ratibPulseAccountReset').click();
 assert(d.getElementById('ratibPulseReadout').hidden,'Clearing selected accounts hides metrics');
 assert.deepEqual(JSON.parse(w.localStorage.getItem('ratib_official_pulse_selected_cash_accounts_v1')),[]);
 assert.equal(JSON.stringify(txs),original,'No posting or ledger changes');
 assert(!d.getElementById('proDashboardCard').hidden,'Only scoped CSS (not removal) hides KPI');
 w.close();
 console.log('PASS official 3.6.129: full Cash Pulse, account controls, single/aggregate figures, FX isolation, transfer netting, drilldowns, reminders, unchanged ledger');
})().catch(e=>{console.error(e);process.exitCode=1;w.close();});
