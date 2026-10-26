'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-cash-pulse.css','utf8');
const head=html.slice(0,html.indexOf('</head>'));
const version=require('./package.json').version;
assert(head.includes('<link rel="stylesheet" href="./ratib-cash-pulse.css?v='+version+'">'),'The page must load release-matched Cash Pulse CSS');
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
assert.equal(byId('ratibPulseReadout').hidden,true,'No automatically forced cash accounts');
assert.match(byId('ratibPulseStatus').textContent,/اختر حسابًا واحدًا على الأقل/);
assert.equal(byId('ratibPulseAccount').options.length,0);
const full=[...byId('ratibPulseAccountList').querySelectorAll('input[type=checkbox]')];
assert.equal(full.length,9,'All current and imported catalog leaf accounts are available');
for(const checkbox of full)assert(!checkbox.disabled&&!checkbox.checked,'All accounts start as freely selectable');
const cash=full.find(x=>x.value==='صندوق النقدية'),bank=full.find(x=>x.value==='بنك الكريمي');
assert(cash&&bank,'Cash and bank entries are present');
function toggle(name,checked){
 const input=[...byId('ratibPulseAccountList').querySelectorAll('input[type=checkbox]')].find(x=>x.value===name);
 assert(input,'Missing selectable account '+name);assert(!input.disabled);
 input.checked=checked;input.dispatchEvent(new w.Event('change',{bubbles:true}));
}
toggle('صندوق النقدية',true);
let opts=[...byId('ratibPulseAccount').options].map(x=>x.value);
assert.deepEqual(opts,['صندوق النقدية'],'A single choice shows only its own account');
assert.equal(byId('ratibPulseAccount').value,'صندوق النقدية');
assert.equal(byId('ratibPulseBeginning').textContent,'50 YER');
assert.equal(byId('ratibPulseIncome').textContent,'100 YER');
assert.equal(byId('ratibPulseExpense').textContent,'70 YER');
assert.equal(byId('ratibPulseClosing').textContent,'80 YER');
toggle('بنك الكريمي',true);
opts=[...byId('ratibPulseAccount').options].map(x=>x.value);
assert.equal(opts.length,3,'Aggregate is optional and available only with two or more selected accounts');
assert.equal(byId('ratibPulseAccount').value,'صندوق النقدية','Selecting another account does not kick viewer into aggregate');
byId('ratibPulseAccount').value='بنك الكريمي';byId('ratibPulseAccount').dispatchEvent(new w.Event('change'));
assert.equal(byId('ratibPulseIncome').textContent,'30 YER');
assert.equal(byId('ratibPulseExpense').textContent,'30 YER');
assert.equal(byId('ratibPulseClosing').textContent,'0 YER');
byId('ratibPulseAccount').value='__all_cash_and_banks__';byId('ratibPulseAccount').dispatchEvent(new w.Event('change'));
assert.equal(byId('ratibPulseIncome').textContent,'140 YER','Only manually chosen cash legs net internal transfers');
assert.equal(byId('ratibPulseExpense').textContent,'40 YER','Internal transfers excluded from chosen total');
assert.equal(byId('ratibPulseClosing').textContent,'150 YER');
assert.match(byId('ratibPulseStatus').textContent,/2 حساب مختار/);
toggle('صندوق النقدية',false);
assert.equal(byId('ratibPulseAccount').value,'بنك الكريمي','Remaining single bank becomes the active view');
assert.equal(byId('ratibPulseReadout').hidden,false);
assert.deepEqual(JSON.parse(w.localStorage.getItem('ratib_trial_pulse_selected_cash_accounts_v2')),['بنك الكريمي']);
toggle('حساب مخصص للسيولة',true);
assert([...byId('ratibPulseAccount').options].some(x=>x.value==='حساب مخصص للسيولة'),'Manually classified cash name can be added without automatic classifier');
assert.equal(byId('ratibPulseAccount').value,'بنك الكريمي','Single account view preserved after adding another');
assert([...byId('ratibPulseAccountList').querySelectorAll('input')].every(x=>!x.disabled),'No locked automatic ten accounts');
byId('ratibPulseAccountReset').click();
assert.equal(byId('ratibPulseReadout').hidden,true,'Empty account selection hides figures, never shows misleading zero balances');
assert.equal(byId('ratibPulseAccount').options.length,0);
assert.deepEqual(JSON.parse(w.localStorage.getItem('ratib_trial_pulse_selected_cash_accounts_v2')),[]);
assert.match(byId('ratibPulseStatus').textContent,/اختر حسابًا واحدًا على الأقل/);
d.window.close();
console.log('PASS Cash Pulse: all selectable; single/multiple/aggregate; imported catalog; internal transfers; no forced cash; empty state');
