'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-account-movement-search-3.6.114.css','utf8'),
 sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
const doc=new JSDOM(html).window.document;
assert.equal(pkg.version,'3.6.172');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.172","build":"p17200"'));
assert(sw.includes('v260-opening-mobile-clean-3.6.139'));
assert(sw.includes('"./ratib-account-movement-search-3.6.114.css"'));
assert(doc.querySelector('link[href="./ratib-account-movement-search-3.6.114.css?v=3.6.139"]'));
const input=doc.getElementById('ratibAccountMovementSearchInput'),
 clear=doc.getElementById('ratibAccountMovementSearchClear'),
 counter=doc.getElementById('ratibAccountMovementSearchCount');
assert(input&&clear&&counter);
assert(doc.querySelector('#pageAccountOperations #ratibAccountMovementSearchBar'));
assert(!doc.querySelector('#accountStatementCard #ratibAccountMovementSearchInput'),'report search stays separate');
assert(css.includes('account-statement-row.ratib-movement-hidden{display:none!important}'));
assert(css.includes('@media print')&&css.includes('display:grid!important'),'print formatting remains available');
assert(html.includes("movementSearch:sameAccount?previous.movementSearch:''"),'new account clears query');
assert(html.includes("movementSearch:accountOpsState.movementSearch||''"),'same-account query is retained');
assert(html.includes("if(accountOpsUi.panelId==='accountOperationsStandalonePanel')"),'standalone only');
assert(html.includes("row.dataset.ratibMovementText=ratibAccountMovementSearchCorpus("));
assert(html.includes("if(view.account){accountOpsState=cloneData(view.account)"),'Back navigation preserves saved search state');
const first=html.indexOf('function ratibAccountMovementNormalize(value){'),last=html.indexOf('function accountOpsMatchesSearch(',first);
assert(first>0&&last>first);
const testDoc=new JSDOM('<div id="accountOperationsStandalonePanel"><section class="account-currency-page" data-currency="YER"><div class="account-statement-table"><div class="account-statement-row" data-tx-id="1">نص أول</div><div class="account-statement-row" data-tx-id="2">نص ثان</div></div></section></div><input id="ratibAccountMovementSearchInput" type="search"><button id="ratibAccountMovementSearchClear"></button><small id="ratibAccountMovementSearchCount"></small>').window.document;
const ctx={document:testDoc,accountOpsState:{movementSearch:''},getAccountOpsDate:t=>t.isoDate||'',getTransactionDisplayType:t=>t.type||''};
vm.createContext(ctx);vm.runInContext(html.slice(first,last),ctx);
const tx1={id:'1',seqNum:78,isoDate:'2026-10-28',type:'سند قبض',beneficiary:'أحمد',reference:'MR-77',amount:1500,execution:{person:{note:'تحويل للصندوق'}}};
const tx2={id:'2',seqNum:90,isoDate:'2026-10-29',type:'قيد بسيط',beneficiary:'صالح',reference:'AB-14',amount:250,execution:{person:{note:'مصاريف مكتبية'}}};
const list=[...testDoc.querySelectorAll('[data-tx-id]')];
list[0].dataset.ratibMovementText=ctx.ratibAccountMovementSearchCorpus(tx1,{amount:1500,foreignAmount:1500},list[0].textContent);
list[1].dataset.ratibMovementText=ctx.ratibAccountMovementSearchCorpus(tx2,{amount:250,foreignAmount:250},list[1].textContent);
assert(ctx.ratibAccountMovementNormalize('أَحْمَد')==='احمد','Arabic diacritics and hamza');
assert(ctx.ratibAccountMovementNormalize('١,٥٠٠')==='1500','Arabic monetary digits and separators');
const field=testDoc.getElementById('ratibAccountMovementSearchInput');
function run(query,expected){field.value=query;field.dispatchEvent(new testDoc.defaultView.Event('input'));assert.equal(list.filter(r=>!r.classList.contains('ratib-movement-hidden')).length,expected,query);}
run('أحمد',1);assert(!list[0].classList.contains('ratib-movement-hidden'));
run('١,٥٠٠',1);run('MR-77',1);run('2026-10-29',1);assert(!list[1].classList.contains('ratib-movement-hidden'));
run('مصاريف مكتبية',1);run('كلمة غير موجودة',0);
assert(testDoc.querySelector('.ratib-movement-empty')?.hidden===false,'search no-match message');
testDoc.getElementById('ratibAccountMovementSearchClear').click();
assert.equal(field.value,'');assert.equal(ctx.accountOpsState.movementSearch,'');
assert(list.every(r=>!r.classList.contains('ratib-movement-hidden')),'clear restores all');
assert(testDoc.getElementById('ratibAccountMovementSearchCount').textContent.includes('2'));
assert(html.includes("function getAccountCurrencyReportData(currency){\n  const scope=accountOpsState.scopeNames, rows=getAccountOperations("),'financial calculations unchanged');
console.log('PASS 3.6.118 account movement search: Arabic text, amount, reference, date, clear, zero results, independent financial totals');
