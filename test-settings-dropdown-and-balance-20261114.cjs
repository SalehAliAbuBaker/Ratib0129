'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('ratib-ui-v3.6.37.js','utf8');

// Settings must not portal the default-account suggestions over other fields or Save.
assert(html.includes("this.isDefaultAccountSelector=['wrapDefaultIncomeDebit','wrapDefaultSpendCredit'].includes(wrapId)"));
assert(html.includes('this.isAccountSelector=isGrouped===true&&!this.isDefaultAccountSelector'));
assert(html.includes('#pageSettings :is(#wrapDefaultIncomeDebit,#wrapDefaultSpendCredit) > .searchable-dropdown'));
assert(html.includes('position:static!important'));
assert(html.includes('max-height:min(184px,35dvh)!important'));
assert(html.includes('overscroll-behavior:contain'));
assert(html.includes('id="saveDefaultAccountsBtn"'));

// The existing receipt/payment balance elements remain in both the source row
// and the account-line cells, rather than being written into stored vouchers.
assert(ui.includes("source?.querySelector(':scope > .ratib-multi-source-balance')"));
assert(ui.includes("const note=smallHint(cell,'balance')"));
assert(ui.includes("hint.textContent=cash&&name?accountBalance(name,currency)?.label||''"));

// Test the exact formatter against posted balances in original currencies.
const start=ui.indexOf('const FORMAT=');
const end=ui.indexOf('function smallHint(',start);
assert(start>=0&&end>start);
const context={
  getCurrentAccountBalance:()=>({byCurrency:{
    YER:{debit:700,credit:1250},
    USD:{debit:600,credit:50},
    SAR:{debit:0,credit:0}
  }}),
  getAccountEntry:()=>({}),
  getAllTransactions:()=>[],
  accountCurrencyLabel:code=>({YER:'ريال يمني',USD:'دولار أمريكي',SAR:'ريال سعودي'})[code]||code
};
const labels=vm.runInNewContext(
  ui.slice(start,end)+'\n[accountBalance("account","YER").label,accountBalance("account","USD").label,accountBalance("account","SAR").label]',
  context
);
assert.deepEqual(Array.from(labels),[
  'الرصيد الحالي دائن: 550 - ريال يمني',
  'الرصيد الحالي مدين: 550 - دولار أمريكي',
  'الرصيد الحالي: 0 - ريال سعودي'
]);
console.log('PASS: settings defaults in-flow; receipt and payment balances with direction and original currency');
