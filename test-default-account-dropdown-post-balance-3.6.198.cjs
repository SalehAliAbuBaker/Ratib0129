'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const ui=fs.readFileSync('ratib-unified-output.js','utf8');
const cash=fs.readFileSync('ratib-cash-reference-3.6.148.js','utf8');
new vm.Script(ui);new vm.Script(cash);

// The two settings account pickers keep their original dropdowns and handlers;
// only the popup's placement changes from body-overlay to in-flow scrolling.
{
 const dom=new JSDOM('<body><section id="pageSettings"><div id="wrapDefaultIncomeDebit"><input><span class="searchable-arrow"></span></div><div id="wrapDefaultSpendCredit"><input><span class="searchable-arrow"></span></div><button id="saveDefaultAccountsBtn">حفظ</button></section><div id="dropDefaultIncomeDebit" class="searchable-dropdown"></div><div id="dropDefaultSpendCredit" class="searchable-dropdown"></div></body>');
 const start=ui.indexOf('function fixDefaultAccountDropdowns(){');
 const end=ui.indexOf('function cleanUi(){',start);
 assert(start>=0&&end>start,'Settings-only dropdown repair must be installed');
 const fix=new Function('document',ui.slice(start,end)+';return fixDefaultAccountDropdowns;')(dom.window.document);
 fix();fix();
 for(const [wrap,drop] of [['wrapDefaultIncomeDebit','dropDefaultIncomeDebit'],['wrapDefaultSpendCredit','dropDefaultSpendCredit']]){
  assert.equal(dom.window.document.getElementById(drop).parentElement.id,wrap,'The list stays inside the Settings document flow');
 }
 assert.equal(dom.window.document.querySelectorAll('#ratibDefaultAccountDropdownStyle198').length,1,'Style is idempotent');
 const style=dom.window.document.getElementById('ratibDefaultAccountDropdownStyle198').textContent;
 assert(style.includes('position:static!important')&&style.includes('max-height:172px!important'),'Keep list scrollable and avoid covering Save');
 assert(style.includes('#saveDefaultAccountsBtn'),'Save button remains accessible');
 dom.window.close();
}

const saved=[
 {id:'open',isoDate:'2026-11-10',status:'posted',creditAccount:'إيرادات',debitAccount:'صندوق',amount:100,currency:'YER'},
 {id:'openingSpend',isoDate:'2026-11-10',status:'posted',debitAccount:'مصاريف',creditAccount:'صندوق',amount:60,currency:'YER'},
 {id:'mv1_0',multiVoucherId:'mv1',isoDate:'2026-11-11',status:'posted',voucherMode:'income',debitAccount:'صندوق',creditAccount:'إيرادات',amount:40,currency:'YER'},
 {id:'next',isoDate:'2026-11-12',status:'posted',creditAccount:'إيرادات',debitAccount:'صندوق',amount:30,currency:'YER'},
 {id:'mv2_0',multiVoucherId:'mv2',isoDate:'2026-11-13',status:'posted',voucherMode:'spend',creditAccount:'صندوق',debitAccount:'مصاريف',amount:25,currency:'YER'},
 {id:'revIncomeOpening',isoDate:'2026-11-09',status:'posted',debitAccount:'مرتجعات',creditAccount:'صندوق',amount:120,currency:'YER'},
 {id:'revIncome',multiVoucherId:'rev1',isoDate:'2026-11-14',status:'posted',voucherMode:'income',debitAccount:'صندوق',creditAccount:'مرتجعات',amount:20,currency:'YER'},
 {id:'revSpendOpening',isoDate:'2026-11-09',status:'posted',creditAccount:'سلف',debitAccount:'صندوق',amount:120,currency:'YER'},
 {id:'revSpend',multiVoucherId:'rev2',isoDate:'2026-11-14',status:'posted',voucherMode:'spend',creditAccount:'صندوق',debitAccount:'سلف',amount:20,currency:'YER'}
];
let pdfDraws=[];
const context={
 window:{},
 getAllTransactions:()=>saved,
 trialTransactionLegs:tx=>[
  {account:tx.debitAccount,currency:tx.currency,debit:tx.amount,credit:0},
  {account:tx.creditAccount,currency:tx.currency,debit:0,credit:tx.amount}
 ],
 accountCurrencyLabel:code=>code==='YER'?'ريال يمني':code,
 getHeaderConfig:()=>({show:false}),
 ratibCanvasDateParts:date=>({primary:date,secondary:''}),
 ratibStatementDateHtml:date=>date,
 wrapCanvasText:(ctx,line)=>[String(line)],
 document:{createElement:()=>({width:0,height:0,getContext:()=>({
  fillStyle:'',strokeStyle:'',lineWidth:0,textAlign:'right',direction:'rtl',
  fillRect(){},strokeRect(){},fillText(value){pdfDraws.push(String(value));}
 })})},
 buildPdfFromCanvases:pages=>[...pages]
};
vm.createContext(context);vm.runInContext(cash,context);
const api=context.window.RatibCashReference;
const receipt={id:'mv1',mode:'income',seq:12,date:'2026-11-11',baseCurrency:'YER',baseTotal:40,sourceAccount:'صندوق',lines:[{account:'إيرادات',currency:'YER',amount:40}]};
const spent={...receipt,id:'mv2',mode:'spend',seq:13,date:'2026-11-13',baseTotal:25,lines:[{account:'مصاريف',currency:'YER',amount:25}]};
const receiptText='الرصيد الحالي بعد السند – دائن: 140 ريال يمني';
const spentText='الرصيد الحالي بعد السند – مدين: 85 ريال يمني';
assert.equal(api.model(receipt).postBalance.text,receiptText,'Receipt must print CREDIT counterparty, not source debit');
assert.equal(api.model(spent).postBalance.text,spentText,'Payment must print DEBIT counterparty, not source credit');
assert(api.html(receipt).includes(receiptText),'Printed receipt contains counterparty balance');
assert(api.html(spent).includes(spentText),'Printed payment contains counterparty balance');
assert(!api.html(receipt).includes('الرصيد الحالي بعد السند – مدين: 140'),'Do not use source account balance');
assert.equal(api.model({...receipt,id:'not-posted'}).postBalance.text,'','Do not report a draft balance');
api.pdf(receipt);api.pdf(spent);
assert(pdfDraws.includes(receiptText)&&pdfDraws.includes(spentText),'PDF share and download reflect printed counterparty');

const reverseIncome={...receipt,id:'rev1',lines:[{account:'مرتجعات',currency:'YER',amount:20}]};
const reverseSpend={...spent,id:'rev2',lines:[{account:'سلف',currency:'YER',amount:20}]};
for(const [doc,expected] of [[reverseIncome,'الرصيد الحالي بعد السند – مدين: -100 ريال يمني'],[reverseSpend,'الرصيد الحالي بعد السند – دائن: -100 ريال يمني']]){
 assert.equal(api.model(doc).postBalance.text,expected,'Reversed balance must show minus and opposite side');
 assert(api.model(doc).postBalance.reversed,'Opposite-side balance flagged red');
 assert(api.html(doc).includes('color:#b91c1c'),'Entire reversed line is red');
 pdfDraws=[];api.pdf(doc);
 assert(pdfDraws.includes(expected),'PDF also shows reversed minus amount');
}
assert(!ui.includes('getCurrentAccountBalance=function'),'Do not replace in-form account balance');
console.log('PASS: Settings picker, receipt-credit/payment-debit counterparty, reversed red, draft safety, print/PDF');
