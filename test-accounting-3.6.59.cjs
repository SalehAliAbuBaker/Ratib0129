'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const patch=fs.readFileSync('ratib-accounting-3.6.59.js','utf8');
function excerpt(a,b){
 const start=html.indexOf(a),end=html.indexOf(b,start);
 assert.ok(start>=0&&end>start,'missing source function '+a);
 return html.slice(start,end);
}
const core=excerpt('function getAccountEntry(','function tafqitAccountCurrency(')+excerpt('function trialTransactionLegs(','function trialDimension(');
const fixture=[
 {id:'opening-debit',isoDate:'2026-01-01',status:'posted',isOpeningBalance:true,amount:0,
  openingBalance:{account:'شركة المشقاص',currency:'YER',debit:12360000,credit:0,baseCurrency:'SAR',baseDebit:0,baseCredit:0}},
 {id:'debit-ordinary',isoDate:'2026-02-01',status:'posted',amount:111582.85,currency:'YER',debitAccount:'شركة المشقاص',creditAccount:'الصندوق'},
 {id:'credit-ordinary',isoDate:'2026-03-01',status:'posted',amount:11569750,currency:'YER',debitAccount:'الصندوق',creditAccount:'شركة المشقاص'},
 {id:'foreign-voucher_0',isoDate:'2026-04-01',status:'posted',amount:5,currency:'YER',debitAccount:'شركة المشقاص',
  isMultiVoucher:true,multiVoucherId:'foreign-voucher',multiVoucher:{baseCurrency:'YER',lines:[{account:'شركة المشقاص',side:'debit',currency:'SAR',amount:20,rate:0.25}]}},
 {id:'deleted',isoDate:'2026-04-01',status:'deleted',amount:999,currency:'YER',debitAccount:'شركة المشقاص',creditAccount:'الصندوق'}
];
const before=JSON.stringify(fixture);
const context=[
 "let currentActiveTab='pageDashboard',accountOpsState={activeCurrency:'YER'},quickVoucherOrigin=null,hasUnsavedChanges=false,reportAdv={active:false,currency:'ALL'},pendingLongPressTx=null;",
 "function getAllTransactions(){return fixture;}",
 "function getGlobalCurrency(){return 'YER';}",
 "function getAccountOpsDate(t){return t.isoDate||'';}",
 "function getCanonicalCatalog(){return [{main:'الأصول',group:'الذمم',sub:'العملاء',details:[[3102,'شركة المشقاص']]}];}",
 "function getCurrentAccountBalance(){}function computeAccountTreeBalanceSummary(){}function runAllAccountsSummaryReport(){}function preparePrintStatementTemplate(){}function getHeaderConfig(){return {show:false};}",
 "function completeFinancialSave(callback){callback();}",
 "function openMultiVoucherEditor(){}function openDocumentDetailsModal(){}",
 "function CustomEvent(type){this.type=type;}"
].join('\n');
const document={getElementById(){return null;}};
const window={scrollY:0,dispatchEvent(){},scrollTo(){}};
const result=new Function('window','document','fixture',context+core+patch+
 "\nreturn {totals:window.RatibAccounting359.accountTotals(fixture),current:getCurrentAccountBalance('شركة المشقاص'),tree:computeAccountTreeBalanceSummary(),diagnostic:window.ratibDiagnoseBalanceDifferences(fixture)};"
)(window,document,fixture);
const row=result.totals.get('شركة المشقاص\x1fYER');
assert.equal(row.debit,12471582.85);
assert.equal(row.credit,11569750);
assert.equal(row.balance,-901832.85);
assert.equal(result.current.balance,-901832.85);
assert.deepEqual(result.tree.get('شركة المشقاص').get('YER'),{debit:12471582.85,credit:11569750});
assert.equal(result.totals.get('شركة المشقاص\x1fSAR').debit,20);
assert.deepEqual(result.diagnostic.differences,[]);
assert.equal(JSON.stringify(fixture),before,'read-only reporting must not alter posted vouchers');
assert.ok(html.includes('ratib-accounting-3.6.59.js?v='+require('./package.json').version), 'accounting script cache version must match official application version');
console.log('PASS Ratib 3.6.59 native-currency accounting and read-only reconciliation');
