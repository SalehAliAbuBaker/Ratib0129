// Ratib 3.6.189 — contextual statement toolbar regression checks.
// Run with npm dependencies installed: node test-statement-toolbar-3.6.189.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-statement-toolbar-3.6.189.css','utf8');
const src=fs.readFileSync('ratib-statement-toolbar-3.6.189.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.match(html,/ratib-statement-toolbar-3\.6\.189\.js/);
assert.match(html,/ratib-statement-toolbar-3\.6\.189\.css/);
assert.match(html,/الإصدار 3\.6\.189/);
assert.match(sw,/statement-context-nav-3\.6\.189/);
assert.match(sw,/ratib-statement-toolbar-3\.6\.189\.js/);
assert.match(css,/#pageAccountOperations \.ratib-reconcile-bar,/);
assert.match(fs.readFileSync('ratib-date-display.js','utf8'),/input\.dataset\.ratibPlaceholder/);
assert.match(src,/window\.RatibHijriFirst\?\.open/);
assert.doesNotMatch(src,/\b(?:getAllTransactions|commitMultiVoucher|flushStorage)\s*\(/);
new Function(src);
const doc=[
 '<!doctype html><html lang="ar" dir="rtl"><body>',
 '<div id="pageSettings"></div><div id="pageAccountOperations" class="hidden">',
 '<div id="ratibAccountMovementSearchBar"><input id="ratibAccountMovementSearchInput"><span id="ratibAccountMovementSearchCount">4 حركات</span></div>',
 '<button id="accountScreenMenuToggle"></button><div id="accountScreenMenu"><button data-account-action="advanced"></button></div>',
 '<input id="accountOpsFromDate" type="date"><input id="accountOpsToDate" type="date">',
 '<select id="accountOpsCurrencyFilter"><option value="ALL">ALL</option></select>',
 '<button id="applyAccountOpsFilterBtn"></button><button id="clearAccountOpsFilterBtn"></button>',
 '<div id="accountOperationsStandalonePanel"><div class="account-currency-page" data-currency="YER">',
 '<div class="ratib-reconcile-bar"><div class="ratib-match-fields"><input type="date" value="2026-11-01">',
 '<button class="btn-primary"></button><button class="btn-ghost"></button></div></div>',
 '<div class="ratib-statement-markbar"><button data-statement-mark-action="clear"></button></div>',
 '</div></div></div><nav id="ratibHomeBottomNav"></nav></body></html>'
].join('');
const dom=new JSDOM(doc,{url:'https://ratib.example.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.accountOpsState={accountName:'الصندوق',activeCurrency:'YER',from:'',to:'',aggregate:false};
w.getLocalTodayISO=()=> '2026-11-12';
w.RatibStatementMarks={count:()=>2};
let applied=0,recordDate='',requested='',menuOpened=0,bookmarksCleared=0;
d.getElementById('applyAccountOpsFilterBtn').onclick=()=>applied++;
d.getElementById('clearAccountOpsFilterBtn').onclick=()=>applied++;
d.getElementById('accountScreenMenuToggle').onclick=()=>menuOpened++;
d.querySelector('.ratib-match-fields .btn-primary').onclick=()=>recordDate=d.querySelector('.ratib-match-fields input').value;
d.querySelector('[data-statement-mark-action="clear"]').onclick=()=>bookmarksCleared++;
w.createVoucherFromCurrentAccount=mode=>requested=mode;
w.eval(src);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const nav=d.getElementById('ratibStmtNav189'),sheet=d.getElementById('ratibStmtSheet189');
assert(nav,'statement bar mounts');
assert(nav.hidden,'hidden outside statement');
d.getElementById('pageAccountOperations').classList.remove('hidden');
(async()=>{
 await Promise.resolve();
 assert(!nav.hidden,'visible inside statement');
 assert.equal(nav.querySelectorAll('[data-statement-tool]').length,9);
 nav.querySelector('[data-statement-tool="search"]').click();
 assert(!sheet.hidden,'search opens in sheet');
 const query=sheet.querySelector('input[type="search"]');
 assert.match(query.placeholder,/اسم.*بيان.*كلمة.*عملة/);
 query.value='ريال سعودي';query.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(d.getElementById('ratibAccountMovementSearchInput').value,'ريال سعودي');
 const dates=sheet.querySelectorAll('input[type="date"]');assert.equal(dates.length,2);
 assert.deepEqual([...dates].map(x=>x.getAttribute('aria-label')),['من تاريخ','إلى تاريخ']);
 dates[0].value='2026-11-01';dates[1].value='2026-11-10';
 sheet.querySelector('.ratib-stmt-primary').click();
 assert.equal(d.getElementById('accountOpsFromDate').value,'2026-11-01');
 assert.equal(d.getElementById('accountOpsToDate').value,'2026-11-10');
 assert.equal(applied,1);
 nav.querySelector('[data-statement-tool="match"]').click();
 assert.match(sheet.textContent,/تثبيت مطابقة الرصيد/);
 sheet.querySelector('.ratib-stmt-primary').click();
 assert.equal(recordDate,'2026-11-01','matching calls original handler');
 nav.querySelector('[data-statement-tool="clear"]').click();
 sheet.querySelector('.ratib-stmt-danger').click();
 assert.equal(bookmarksCleared,1,'mark clearing delegates to existing handler');
 nav.querySelector('[data-statement-tool="receipt"]').click();
 assert.equal(requested,'income');
 nav.querySelector('[data-statement-tool="more"]').click();
 assert.equal(menuOpened,1);
 d.querySelector('[data-statement-customize]').click();
 assert.match(sheet.textContent,/تخصيص شريط كشف الحساب/);
 const row=[...sheet.querySelectorAll('.ratib-stmt-editor-row')].find(r=>r.textContent.includes('تثبيت المطابقة'));
 row.querySelector('input[type="checkbox"]').click();
 assert(!nav.querySelector('[data-statement-tool="match"]'),'match shortcut optional');
 assert(!d.querySelector('[data-statement-hidden-tool="match"]').hidden,'hidden match is still reachable under More');
 assert(nav.querySelector('[data-statement-tool="accounts"]'),'accounts always present');
 assert(nav.querySelector('[data-statement-tool="more"]'),'more always present');
 assert(w.localStorage.getItem('ratib.ui.statement-nav.v1'),'preferences persisted');
 d.getElementById('pageAccountOperations').classList.add('hidden');
 await Promise.resolve();assert(nav.hidden,'footer disappears outside statement');
 assert(d.querySelector('#pageSettings #ratibStatementNavSettings189'),'settings editor mounted');
 console.log('Ratib 3.6.189 statement toolbar integration PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});