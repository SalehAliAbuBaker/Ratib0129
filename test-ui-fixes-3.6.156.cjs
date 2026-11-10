/* Ratib official 3.6.165 — compact simple journal, wide document number and shared Back arrow. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-ui-fixes-3.6.156.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=require('./tools/assert-release.cjs')();
assert.equal(version,'3.6.165');
assert(html.includes('ratib-ui-fixes-3.6.156.css?v=3.6.165'),'new visual corrections must load');
assert(sw.includes('"./ratib-ui-fixes-3.6.156.css"'),'offline version must include new CSS');
assert(css.includes('@media screen')&&!css.includes('@media print'),'print and PDF must remain untouched');
assert(css.includes('> h2 {\n    display:flex!important'),'simple journal heading must no longer use display:contents');
assert(css.includes('> h2 > .ratib-header-date'),'date remains inside compact header');
assert(css.includes('> h2 > #swapAccountsBtn'),'account swap stays accessible');
assert(css.includes('> .simple-journal-grid > :empty'),'only genuinely empty grid children may be suppressed');
assert(css.includes('min-width:88px!important'),'number display must have meaningful minimum width');
assert(css.includes('#importedOpeningSeq'),'opening document number must be widened');
assert(css.includes('mask:url("data:image/svg+xml,'),'back-arrow artwork must be a real vector');
assert(css.includes('content:"رجوع"!important'),'back arrow must be accompanied by visible wording');
const d=new JSDOM(html).window.document;
const nav=d.getElementById('ratibPageNav');
assert(nav,'one shared navigation bar');
const back=nav.querySelector('#backToMenuBtn');
assert.equal(back.getAttribute('onclick'),'goBackInApp()','Back handler must not change');
assert.equal(back.getAttribute('aria-label'),'رجوع','screen reader label must remain');
assert(nav.querySelector('#ratibVoucherSequence'),'voucher number remains in shared header');
for(const id of ['voucherDateInput','multiVoucherDate']){
 assert.equal(d.getElementById(id)?.type,'date','native underlying date not replaced');
}
for(const id of ['voucherAmountInput','voucherCurrencySelect','inpDebitAcc','inpCreditAcc','swapAccountsBtn','commitVoucherBtn']){
 assert(d.getElementById(id),'original simple journal control missing: '+id);
}
assert.equal(d.querySelector('#pageExpenses #cashFlowCard > h2 #swapAccountsBtn'),null,'layout scripts must retain ownership of moving controls');
d.defaultView.close();
console.log('PASS Ratib 3.6.165: one-line journal metadata, number legibility, Back icon and no accounting/print changes');
