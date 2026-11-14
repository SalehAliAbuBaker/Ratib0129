'use strict';
/* Ratib official 3.6.185: compound-account freedom, safe FX balance, uninterrupted movement search, account-first smart search. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const index=fs.readFileSync('index.html','utf8'),
 compound=fs.readFileSync('ratib-compound-layout-3.6.142.js','utf8'),
 home=fs.readFileSync('ratib-home-3.6.167.js','utf8'),
 worker=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.196');
assert(index.includes('const RATIB_RELEASE={"version":"3.6.196"'));
assert(worker.includes('const APP_RELEASE={"version":"3.6.196"'));
assert(worker.includes('compound-edit-search-home-3.6.184'));
assert(!index.includes("note:'سطر متمم تلقائي'"),'No forced auto-balancing leg in compound vouchers');
assert(compound.includes("makeButton('＋ إضافة طرف'"));
assert(compound.includes("card.dataset.ratibCmpSeeded='1'"),'Starter two-party template is seeded once');
assert(!index.includes('if(line.autoBalance&&[\'side\',\'currency\',\'amount\',\'rate\'].includes(key))return;'));
assert(home.includes("select.value='accounts'"),'Smart search starts with accounts');
assert(home.includes(".replace(/ة/g,'ه')"),'Account search treats ta-marbuta and ha as equivalent');
assert(index.includes('},850);'),'Searching does not interrupt typing every 220 milliseconds');
assert(index.includes('if(e.isComposing)return;'),'Respect Android/IME composition');
assert(index.includes('field.setSelectionRange(caret.start,caret.end)'),'Keep caret and selection after rendering');
function functionSlice(startName,endName){
 const start=index.indexOf('function '+startName+'('),end=index.indexOf('function '+endName+'(',start);
 assert(start>=0&&end>start);
 return index.slice(start,end);
}
const balanceCode=functionSlice('entrysyncMultiAutoBalance','entryupdateMultiVoucherSummary');
const summaryCode=functionSlice('entryupdateMultiVoucherSummary','entryvalidateMultiVoucher');
const validateCode=functionSlice('entryvalidateMultiVoucher','entrybuildMultiVoucherData');
const dom=new JSDOM('<!doctype html><html><body>'+
 '<select id="multiVoucherBaseCurrency"><option value="YER" selected>YER</option></select>'+
 '<input id="multiVoucherDate" value="2026-11-12">'+
 '<div id="multiVoucherSummary"></div><div id="multiVoucherBalance"></div>'+
 '</body></html>',{url:'https://ratib.test',runScripts:'outside-only'});
const d=dom.window.document;
const lines=[
 {side:'debit',account:'صندوق الرأفة',budgetId:'general',amount:'100000',currency:'YER',rate:'1',base:0},
 {side:'credit',account:'عهدة العامل',budgetId:'general',amount:'60000',currency:'YER',rate:'1',base:0}
];
let ctx={document:d,KNOWN_CURRENCIES:new Set(['YER','SAR','USD']),multiVoucherLines:lines,
 getCleanNumber:x=>Number(String(x??0).replace(/,/g,'')),
 multiLineRate:(line,base)=>line.currency===base?1:Number(line.rate),
 roundAccountingAmount:(num)=>Math.round(num*100)/100,
 multiCurrencyLabel:x=>x,
 isValidISODate:x=>/^\d{4}-\d\d-\d\d$/.test(x),
 syncMultiAutoBalance:()=>vm.runInContext('entrysyncMultiAutoBalance()',realm),
 updateMultiVoucherSummary:()=>vm.runInContext('entryupdateMultiVoucherSummary()',realm),
 };
const realm=vm.createContext(ctx);
vm.runInContext(balanceCode+summaryCode+validateCode+';this.balance=entrysyncMultiAutoBalance;this.summary=entryupdateMultiVoucherSummary;this.validate=entryvalidateMultiVoucher;',realm);
realm.balance();let summary=realm.summary();
assert.equal(lines.length,2,'The system never creates its own third account/leg');
assert.equal(summary.balanced,false);
assert.equal(summary.debitTotal,100000);
assert.equal(summary.creditTotal,60000);
assert(d.getElementById('multiVoucherBalance').textContent.includes('40,000'),'Show remainder as a suggestion, without writing it');
assert.equal(realm.validate().includes('لا يمكن اعتماد'),true,'An imbalanced compound voucher cannot be approved');
assert.equal(lines[1].amount,'60000','Suggestion does not overwrite any manual amount');
lines.push({side:'credit',account:'مورد آخر',budgetId:'general',amount:'40000',currency:'YER',rate:'1',base:0});
realm.balance();summary=realm.summary();
assert.equal(summary.balanced,true);
assert.equal(realm.validate(),'','100000 debit = 60000 credit + 40000 credit');
assert.equal(lines.length,3);
lines[2].currency='USD';lines[2].amount='100';lines[2].rate='400';
realm.balance();summary=realm.summary();
assert.equal(lines[2].base,40000);
assert.equal(summary.balanced,true,'FX equivalent is balanced at the approved rate');
assert.equal(realm.validate(),'');
lines[1].amount='50000';realm.balance();summary=realm.summary();
assert.equal(summary.balanced,false);
assert(d.getElementById('multiVoucherBalance').textContent.includes('10,000'),'Display accounting difference');
lines[1].amount='60000';lines.splice(2,1);
lines[1].account='';lines[1].amount='';
assert.equal(realm.validate().includes('طرفين فعليين'),true,'At least one valid debit and one valid credit');
assert.equal(lines.length,2,'No missing third party is inserted by validation');
dom.window.close();
console.log('PASS 3.6.185: unlocked compound, no auto-balancing, three-party arithmetic, foreign exchange, safe validation, search and account default');
