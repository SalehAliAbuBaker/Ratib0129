/* Ratib 3.6.162 — lock-icon consistency without replacing handlers or account data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync('ratib-account-lock-unified-3.6.161.js','utf8');
const css=fs.readFileSync('ratib-account-lock-unified-3.6.161.css','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
const buttonIds=['lockDebitAccBtn','lockCreditAccBtn','ratibLockSource','ratibLockCounter'];
assert.equal(pkg.version,'3.6.162');
assert(html.includes('ratib-account-lock-unified-3.6.161.css?v=3.6.162'));
assert(html.includes('ratib-account-lock-unified-3.6.161.js?v=3.6.162'));
assert(sw.includes('"version":"3.6.162"'));
assert(sw.includes('"./ratib-account-lock-unified-3.6.161.css"'));
assert(sw.includes('"./ratib-account-lock-unified-3.6.161.js"'));
assert(css.includes('@media screen'),'Lock icon styling must not change printed vouchers');
assert(css.includes('#multiVoucherCard:not(.spend-voucher)'),'Cash-only locks must remain hidden in non-cash voucher modes');
assert(css.includes('44px'),'Shared lock button geometry');
assert(css.includes('#075e47')&&css.includes('#f5cc6e'),'Approved dark-green and gold colors');
assert(css.includes('data:image/svg+xml'),'A device-independent vector icon is required');
assert(css.includes('[aria-pressed="true"]::before'),'Closed lock state should be visible');
for(const id of buttonIds)assert(css.includes('#'+id),'Missing account lock '+id);
assert.doesNotThrow(()=>new Function(script));
const dom=new JSDOM(`<!doctype html><html><body>
<section id="pageExpenses">
 <button id="lockDebitAccBtn" title="تثبيت الحساب المدين">🔓</button>
 <button id="lockCreditAccBtn" title="تثبيت الحساب الدائن">🔓</button>
 <button id="ratibLockSource" aria-pressed="false" title="تثبيت الحساب العلوي"><span>🔓</span></button>
 <button id="ratibLockCounter" aria-pressed="true" title="إلغاء تثبيت الحساب المقابل"><span>🔒</span></button>
</section></body></html>`,{url:'https://ratib.example/',runScripts:'outside-only'});
const win=dom.window,doc=win.document;
win.eval('var voucherDebitLocked=false;var voucherCreditLocked=false;');
let clicks=0;
const debit=doc.getElementById('lockDebitAccBtn'),credit=doc.getElementById('lockCreditAccBtn');
debit.addEventListener('click',()=>{clicks++;win.eval('voucherDebitLocked=true');debit.textContent='🔒';});
win.eval(script);
win.RatibUnifiedAccountLocks.sync();
assert.equal(debit.getAttribute('aria-pressed'),'false');
assert.equal(credit.getAttribute('aria-pressed'),'false');
assert.equal(doc.getElementById('ratibLockSource').getAttribute('aria-pressed'),'false');
assert.equal(doc.getElementById('ratibLockCounter').getAttribute('aria-pressed'),'true');
assert.equal(debit.getAttribute('aria-label'),'تثبيت الحساب المدين');
debit.click();win.RatibUnifiedAccountLocks.sync();
assert.equal(clicks,1,'Original click handler remains in place');
assert.equal(debit.getAttribute('aria-pressed'),'true','Simple-journal lock is synced');
assert.equal(debit.textContent,'🔒','Adapter must not overwrite the original DOM glyph');
win.eval('voucherCreditLocked=true');credit.textContent='🔒';
win.RatibUnifiedAccountLocks.sync();
assert.equal(credit.getAttribute('aria-pressed'),'true');
win.eval('voucherDebitLocked=false');debit.textContent='🔓';
win.RatibUnifiedAccountLocks.sync();
assert.equal(debit.getAttribute('aria-pressed'),'false','Unlock state must reset');
const cash=doc.getElementById('ratibLockSource');
cash.setAttribute('aria-pressed','true');cash.innerHTML='<span aria-hidden="true">🔒</span>';
win.RatibUnifiedAccountLocks.sync();
assert.equal(cash.getAttribute('aria-pressed'),'true');
const dynamicallyRendered=doc.createElement('button');
dynamicallyRendered.className='ratib-account-lock';dynamicallyRendered.setAttribute('aria-pressed','false');
doc.getElementById('pageExpenses').append(dynamicallyRendered);
win.RatibUnifiedAccountLocks.sync();
assert.equal(dynamicallyRendered.getAttribute('aria-pressed'),'false');
dom.window.close();
console.log('PASS 3.6.162: fixed/unfixed vector icon styling, four lock buttons, accessibility and unchanged click handlers');
