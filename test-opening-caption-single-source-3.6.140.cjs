'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('ratib-cash-actions-3.6.135.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=require('./tools/assert-release.cjs')();
assert.equal(version,'3.6.202','Release and its cache must be consistent');
assert(!css.includes('/* Manual opening display only: labels are INSIDE their controls, not above.'),'Competing caption CSS must not return');
const at=css.indexOf('/* Official 3.6.140 — single caption source per editable opening field.');
assert(at>0,'The high-specificity opening fix must exist');
const scoped=css.slice(at,css.indexOf('/* Ratib 3.6.141:',at));
assert(scoped.includes('@media screen'),'Only edit view may suppress legacy labels');
for(let n=1;n<=11;n++){
 const selector='#importedOpeningVoucherModal.opening-manual #importedOpeningRows>tr.opening-card-row>td:nth-child('+n+')::before';
 assert(scoped.includes(selector),'Legacy CSS caption could reappear for field '+n);
}
assert(scoped.includes('#importedOpeningVoucherModal.opening-manual #openingHeader label#openingDateLabel.opening-inline-header-field::before'),'Date field must not repeat its caption');
assert(scoped.includes('content:none!important;display:none!important;visibility:hidden!important'),'Legacy pseudo headings must not display');
assert(scoped.includes('.opening-field-caption'),'Real gray in-field captions remain');
assert(!scoped.includes('#printVoucherContainer'),'In-field caption rules do not target print output');
assert(html.includes('ratib-cash-actions-3.6.135.css?v=3.6.142-single-label-20261106'),'Fresh CSS bypasses browser cache');
assert(sw.includes('-3.6.152'),'Offline cache version advanced');
const printed=html.slice(html.indexOf('function manualOpeningPrintTable(doc){'),html.indexOf('function importedOpeningPrint('));
assert(printed.includes('<thead><tr>'),'Printed output still has column headings');
for(const v of ['م','رقم الحساب','الحساب','البيان','مدين','دائن','العملة','سعر التقييم'])assert(printed.includes(v),'Approved printed heading preserved: '+v);
assert(!printed.includes('مدين تقييم')&&!printed.includes('دائن تقييم'),'Duplicate valuation columns are removed');
assert(html.includes('رقم القيد')&&html.includes('opening-field-caption'),'Input labels remain semantic');
console.log('PASS Ratib 3.6.142: no duplicate opening captions; release, print and PDF remain intact');
