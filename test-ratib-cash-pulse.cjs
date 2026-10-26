'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-cash-pulse.css','utf8');
const head=html.slice(0,html.indexOf('</head>'));
assert.match(head,/<link rel="stylesheet" href="\.\/ratib-cash-pulse\.css\?v=3\.6\.109\.09">/,'The real page head must load Cash Pulse CSS');
assert.match(css,/#ratibCashPulse svg\.ratib-pulse-ring circle\{fill:none!important/);
assert.match(css,/max-width:188px!important/);
const d=new JSDOM('<!doctype html><html><body><div id="dashboardHomeContent"><div class="main-menu-grid"></div></div></body></html>',{
 url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true
}),w=d.window;
w.__ratibProceedInitialized=true;
w.RatibSimpleAccounts={classify:r=>r.subCode==='1101'?'cash':''};
w.getSubgroupParents=()=>({'110105':'1101'});
w.getCanonicalCatalog=()=>[
 {mainCode:'1',subCode:'1101',group:'الأصول المتداولة',sub:'النقدية',details:[['110101','صندوق النقدية'],['110102','بنك الكريمي']]},
 {mainCode:'1',subCode:'110105',group:'الأصول المتداولة',sub:'موقع فرعي',details:[['11010501','نقدية المشروع']]},
 {mainCode:'1',subCode:'1110',group:'الأصول المتداولة',sub:'متفرقات',details:[['111001','محفظة فلوسك'],['111002','حساب جاري الفرع']]},
 {mainCode:'1',subCode:'1102',group:'الأصول المتداولة',sub:'المدينون',details:[['110201','عميل عام']]},
 {mainCode:'2',subCode:'2201',group:'الخصوم',sub:'قروض',details:[['220101','قرض بنكي']]},
 {mainCode:'1',subCode:'1199',group:'الأصول المتداولة',sub:'حسابات أخرى',details:[['119901','حساب مخصص للسيولة']]}
];
function leg(account,debit,credit,date='2026-10-16',opening=false){return {account,debit,credit,currency:'YER',date,opening,meta:{note:'اختبار'}};}
const transactions=[
 {id:'opening',status:'posted',isOpeningBalance:true,legs:[leg('صندوق النقدية',50,0,'2026-01-01',true)]},
 {id:'income',status:'posted',legs:[leg('صندوق النقدية',100,0)]},
 {id:'internal',status:'posted',legs:[leg('بنك الكريمي',30,0),leg('صندوق النقدية',0,30)]},
 {id:'expense',status:'posted',legs:[leg('صندوق النقدية',0,40)]},
 {id:'compound_0',multiVoucherId:'compound',isMultiVoucher:true,status:'posted',legs:[leg('صندوق النقدية',70,0)]},
 {id:'compound_1',multiVoucherId:'compound',isMultiVoucher:true,status:'posted',legs:[leg('بنك الكريمي',0,30)]},
 {id:'receivable',status:'posted',legs:[leg('عميل عام',200,0)]}
];
w.ratibImportVisibleCatalog=catalog=>[...catalog,{mainCode:'1',subCode:'1101',group:'الأصول المتداولة',sub:'نقدية مستوردة',details:[['110106','صندوق مشروع مستورد']]}];
w.getAllTransactions=()=>transactions;
w.ratibActiveAccountingTransactions=items=>items;
w.trialTransactionLegs=t=>t.legs;
w.getAccountEntry=()=>null; // readiness guard only; entries use actual ledger legs
w.getRatibBaseCurrency=()=> 'YER';
w.getLocalTodayISO=()=> '2026-10-26';
w.getAccountOpsDate=t=>t.isoDate||'2026-10-16';
const js=fs.readFileSync('ratib-cash-pulse.js','utf8');w.eval(js);
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const byId=id=>w.document.getElementById(id);
assert(byId('ratibPulseToggle'),'Pulse must mount');
byId('ratibPulseToggle').click();
assert.equal(byId('ratibPulseReadout').hidden,false);
const accountOptions=[...byId('ratibPulseAccount').options].map(o=>o.value);
for(const name of ['صندوق النقدية','بنك الكريمي','نقدية المشروع','محفظة فلوسك','حساب جاري الفرع'])
 assert(accountOptions.includes(name),'Missing legitimate liquidity account: '+name);
assert(!accountOptions.includes('عميل عام'),'Receivables cannot become cash');
assert(!accountOptions.includes('قرض بنكي'),'Loan is not a bank balance');
assert(accountOptions.includes('صندوق مشروع مستورد'),'Imported cashbox from the displayed tree must be included');
const full=[...byId('ratibPulseAccountList').querySelectorAll('input[type=checkbox]')];
assert.equal(full.length,9,'Imported and regular leaf accounts are available for explicit selection');
const missing=full.find(x=>x.value==='حساب مخصص للسيولة');
assert(missing&&!missing.checked&&!missing.disabled,'Unclassified account must appear as optional');
missing.checked=true;missing.dispatchEvent(new w.Event('change',{bubbles:true}));
assert([...byId('ratibPulseAccount').options].some(x=>x.value==='حساب مخصص للسيولة'),'Chosen account appears in cash dropdown');
assert(JSON.parse(w.localStorage.getItem('ratib_trial_pulse_extra_cash_accounts_v1')).includes('حساب مخصص للسيولة'));

assert.equal(byId('ratibPulseBeginning').textContent,'50 YER');
assert.equal(byId('ratibPulseIncome').textContent,'140 YER','Compound receipt must be net of internal cash legs');
assert.equal(byId('ratibPulseExpense').textContent,'40 YER','Internal cash transfer is excluded');
assert.equal(byId('ratibPulseClosing').textContent,'150 YER');
assert.match(byId('ratibPulseStatus').textContent,/7 حساب نقدي وبنكي/);
byId('ratibPulseAccount').value='بنك الكريمي';
byId('ratibPulseAccount').dispatchEvent(new w.Event('change'));
assert.equal(byId('ratibPulseIncome').textContent,'30 YER','Individual bank view shows its internal transfer');
assert.equal(byId('ratibPulseExpense').textContent,'30 YER','Individual bank view shows compound movement');
assert.equal(byId('ratibPulseClosing').textContent,'0 YER');
d.window.close();
console.log('PASS Cash Pulse SVG stylesheet, cash hierarchy, compound netting and individual accounts');
