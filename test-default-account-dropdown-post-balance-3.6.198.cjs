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
 {id:'open',isoDate:'2026-11-10',status:'posted',creditAccount:'صندوق المؤسسة',debitAccount:'حساب افتتاحي',amount:100,currency:'YER'},
 {id:'rev-usd',isoDate:'2026-11-09',status:'posted',debitAccount:'إيرادات',creditAccount:'افتتاحي',amount:50,currency:'USD'},
 {id:'revenue-before',isoDate:'2026-11-10',status:'posted',creditAccount:'إيرادات',debitAccount:'افتتاحي',amount:100,currency:'YER'},
 {id:'revenue-sar',isoDate:'2026-11-10',status:'posted',creditAccount:'إيرادات',debitAccount:'افتتاحي',amount:250,currency:'SAR'},
 {id:'expense-before',isoDate:'2026-11-10',status:'posted',debitAccount:'مصاريف',creditAccount:'افتتاحي',amount:80,currency:'YER'},
 {id:'expense-reverse',isoDate:'2026-11-10',status:'posted',creditAccount:'مصاريف',debitAccount:'افتتاحي',amount:30,currency:'SAR'},
 {id:'mv1_0',multiVoucherId:'mv1',isoDate:'2026-11-11',status:'posted',voucherMode:'income',debitAccount:'صندوق المؤسسة',creditAccount:'إيرادات',amount:40,currency:'YER'},
 {id:'next',isoDate:'2026-11-12',status:'posted',creditAccount:'صندوق المؤسسة',debitAccount:'مصروفات',amount:30,currency:'YER'},
 {id:'mv2_0',multiVoucherId:'mv2',isoDate:'2026-11-13',status:'posted',voucherMode:'spend',creditAccount:'صندوق المؤسسة',debitAccount:'مصاريف',amount:25,currency:'YER'},
 {id:'mv3_0',multiVoucherId:'mv3',isoDate:'2026-11-13',status:'posted',voucherMode:'income',creditAccount:'إيرادات مستقرة',debitAccount:'صندوق المؤسسة',amount:7,currency:'YER'},
 {id:'late',isoDate:'2026-11-14',status:'posted',creditAccount:'إيرادات',debitAccount:'افتتاحي',amount:700,currency:'YER'}
];
const canvasText=[];
const context={
 window:{},
 getAllTransactions:()=>saved,
 trialTransactionLegs:tx=>[
  {account:tx.debitAccount,currency:tx.currency,debit:tx.amount,credit:0},
  {account:tx.creditAccount,currency:tx.currency,debit:0,credit:tx.amount}
 ],
 accountCurrencyLabel:code=>({YER:'ريال يمني',SAR:'ريال سعودي',USD:'دولار أمريكي'})[code]||code,
 getHeaderConfig:()=>({show:false}),
 ratibCanvasDateParts:date=>({primary:date,secondary:''}),
 ratibStatementDateHtml:date=>date,
 wrapCanvasText:(ctx,line)=>[String(line)],
 document:{createElement:tag=>({width:0,height:0,getContext:()=>({
  fillStyle:'',strokeStyle:'',lineWidth:0,textAlign:'right',direction:'rtl',
  fillRect(){},strokeRect(){},fillText(value){canvasText.push(String(value));},
 })})},
 buildPdfFromCanvases:pages=>[...pages]
};
vm.createContext(context);vm.runInContext(cash,context);
const api=context.window.RatibCashReference;
const receipt={id:'mv1',mode:'income',seq:12,date:'2026-11-11',baseCurrency:'YER',baseTotal:40,sourceAccount:'صندوق المؤسسة',lines:[{account:'إيرادات',currency:'YER',amount:40}]};
const spent={...receipt,id:'mv2',mode:'spend',seq:13,date:'2026-11-13',baseTotal:25,lines:[{account:'مصاريف',currency:'YER',amount:25}]};
const expectReceipt='الرصيد الحالي بعد السند: ريال يمني: دائن 140، ريال سعودي: دائن 250، دولار أمريكي: مدين -50';
const expectSpent='الرصيد الحالي بعد السند: ريال يمني: مدين 105، ريال سعودي: دائن -30';
assert.equal(api.model(receipt).postBalance,expectReceipt,'Receipt shows credited table account for every currency; later postings excluded');
assert.equal(api.model(spent).postBalance,expectSpent,'Payment shows debited table account for every currency');
assert.equal(api.model(receipt).postBalanceNegative,true,'Any opposite receipt currency triggers red');
assert.equal(api.model(spent).postBalanceNegative,true,'Any opposite payment currency triggers red');
assert(api.html(receipt).includes(expectReceipt),'Native print and preview contain all currencies on one line');
assert(api.html(receipt).includes('data-negative="true"'),'Reverse balance has red style hook');
assert(api.html(receipt).includes('color:#c62828'),'All the balance text is red');
assert(api.html(receipt).includes('font:500 9pt'),'Balance line is small');
assert.equal(api.model({...receipt,id:'not-posted'}).postBalance,'','Draft/unsaved voucher cannot report posted balance');
assert(!api.html({...receipt,id:'not-posted'}).includes('الرصيد الحالي بعد السند'),'No draft balance');
const plain={...receipt,id:'mv3',lines:[{account:'إيرادات مستقرة',currency:'YER',amount:7}]};
assert.equal(api.model(plain).postBalance,'الرصيد الحالي بعد السند: ريال يمني: دائن 7');
assert.equal(api.model(plain).postBalanceNegative,false,'Normal balance is not red');
assert(!api.html(plain).includes('data-negative="true"'),'Normal balance is not flagged negative');
api.pdf(receipt);
assert(canvasText.includes(expectReceipt),'Download/shared PDF renders all currency balances');
assert(!ui.includes('getCurrentAccountBalance=function'),'In-form account balance remains unchanged');
const signatures=require('node:fs').readFileSync('ratib-document-signatures-3.6.148.js','utf8');
assert(signatures.includes("element.insertBefore(balance,host)"),'Automatic signature is laid out beside balance');
assert(signatures.includes('rightNoteNegative'),'PDF sign and balance share one baseline');
console.log('PASS: default picker, credited receipt/debited spend, all currencies, reverse sign/red, PDF, unchanged input');
