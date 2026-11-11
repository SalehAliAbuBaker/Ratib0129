'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const fiscal=fs.readFileSync('ratib-fiscal-ledger.js','utf8');
const dash=fs.readFileSync('ratib-dashboard-finance-3.6.144.js','utf8');

function frozenYear(year){
 return class YearDate extends Date{
  constructor(...args){super(...(args.length?args:[year+'-11-11T10:30:00+03:00']));}
 };
}
const head=fiscal.slice(fiscal.indexOf('const dateOf='),fiscal.indexOf('window.ratibFiscalVisibleLedgerTransactions=filtered;'));
assert(head.includes('const currentYear=()=>String(new Date().getFullYear());'));
function fiscalRun(closures={}){
 const ctx={Date:frozenYear('2026'),Map,Set,String,Number,Object,Array,
   store:{get(name,defaultValue){assert.equal(name,'annual_closures_v1');return closures||defaultValue;}},getAllTransactions:()=>[]};
 vm.runInNewContext(head+';this.fiscal={yearResolved,filtered,changeYear:x=>{chosenYear=x;}};',ctx);
 return ctx.fiscal;
}
const original=[
 {id:'a',isoDate:'2023-03-01'},{id:'b',isoDate:'2026-01-09'},
 {id:'c',isoDate:'2025-09-09'},{id:'d',isoDate:'2026-11-11'}
];
const fiscalDefault=fiscalRun();
assert.equal(fiscalDefault.yearResolved(),'2026','Default operations list is the current year');
assert.deepEqual(Array.from(fiscalDefault.filtered(original),t=>t.id),['b','d'],'Historical operations hidden from current-year view only');
fiscalDefault.changeYear('all');
assert.deepEqual(Array.from(fiscalDefault.filtered(original),t=>t.id),['a','b','c','d'],'Historical years still selectable');
const fiscalClosed=fiscalRun({'2025':{year:'2025'}});
assert.equal(fiscalClosed.yearResolved(),'2026','Last closed year preserves the current open year');
const fiscalNext=fiscalRun({'2026':{year:'2026'}});
assert.equal(fiscalNext.yearResolved(),'2027','Explicitly closed current year selects next open year');
assert.equal(original.length,4,'No journal mutations from fiscal filter');
assert(fiscal.includes('أرشيف جميع السنوات'));

const dashboardAmount=/(?:^|\n)const money=\(value,currency\)=>[^\n]+/.exec(dash);
assert(dashboardAmount,'Financial dashboard formatter exists');
const formatCtx={Number};
vm.runInNewContext(dashboardAmount[0]+';this.money=money;',formatCtx);
assert.equal(formatCtx.money(12968804.859999,'YER'),'12,968,804.86 ر.ي');
assert.equal(formatCtx.money(100,'SAR'),'100 ر.س');
assert(dash.includes('const round=n=>Math.round((n+Number.EPSILON)*1e6)/1e6'),'Accounting calculation precision unchanged');

const start=html.indexOf('function ratibApplyAccountMovementSearch(){');
const end=html.indexOf("document.getElementById('ratibAccountMovementSearchInput')?.addEventListener('input'",start);
assert(start>=0&&end>start,'Statement movement search function');
const snippet=html.slice(start,end);
assert(snippet.includes('panel._ratibStatementTxById'),'Search must reuse index from rendered account statement');
const dom=new JSDOM('<!doctype html><div id="accountOperationsStandalonePanel"><section class="account-currency-page"><div class="account-statement-table"><div class="account-statement-grid" id="synthetic-grid"></div></div></section></div><input id="ratibAccountMovementSearchInput"><span id="ratibAccountMovementSearchCount"></span><button id="ratibAccountMovementSearchClear"></button>',{url:'https://example.test'});
const doc=dom.window.document,panel=doc.getElementById('accountOperationsStandalonePanel');
const grid=doc.getElementById('synthetic-grid'),fragment=doc.createDocumentFragment(),indexed=new Map();
for(let i=0;i<1200;i++){
 const el=doc.createElement('div');el.className='account-statement-row';el.dataset.txId='tx-'+i;el.textContent='الحركة '+i;fragment.appendChild(el);indexed.set('tx-'+i,{id:'tx-'+i,amount:i,note:'unique-'+i});
}
grid.appendChild(fragment);
panel._ratibStatementTxById=indexed;panel._ratibStatementScope=['حساب تجريبي'];
panel.dataset.ratibMovementWasFiltered='0';
let corpusCalls=0,entryCalls=0;
const ctx={document:doc,ratibAccountMovementNormalize:v=>String(v||'').toLowerCase().trim(),
 ratibAccountMovementSearchCorpus(tx){corpusCalls++;return (tx.id+' '+tx.note).toLowerCase();},
 getAccountEntry(tx){entryCalls++;return {amount:tx.amount};}
};
vm.runInNewContext(snippet+';this.search=ratibApplyAccountMovementSearch;',ctx);
ctx.search();
assert.equal(corpusCalls,0,'Opening a large account must not generate full-text search data');
assert.equal(entryCalls,0,'No extra per-row entry extraction on initial open');
assert.equal(doc.getElementById('ratibAccountMovementSearchCount').textContent,'عدد الحركات في الحساب: 1200');
const input=doc.getElementById('ratibAccountMovementSearchInput');input.value='unique-1199';ctx.search();
assert.equal(corpusCalls,1200,'First actual search generates full-text data once');
assert.equal(panel.querySelectorAll('.ratib-movement-hidden').length,1199);
ctx.search();assert.equal(corpusCalls,1200,'Second search reuses cached search corpus');
input.value='';ctx.search();
assert.equal(panel.querySelectorAll('.ratib-movement-hidden').length,0,'Clearing search restores all rows');
assert.equal(indexed.size,1200,'Search is display-only, no accounting change');
dom.window.close();
console.log('PASS current-year default, all-year override, 2-digit display precision, and lazy read-only search for 1,200 statement rows');
