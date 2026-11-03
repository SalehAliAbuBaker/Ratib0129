'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-statement-compact-3.6.119.css','utf8');
const polish=fs.readFileSync('ratib-voucher-polish-3.6.117.css','utf8');
const src=fs.readFileSync('ratib-display-separation-3.6.123.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.123');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.123","build":"p12300"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.123","build":"p12300"'));
assert(sw.includes('v238-official-voucher-tafqit-ledger-3.6.123'));
assert(sw.includes('"./ratib-display-separation-3.6.123.js"'));
assert(html.includes('ratib-display-separation-3.6.123.js?v=3.6.123'));
assert(!css.includes('grid-template-columns:minmax(130px,1.05fr)'),'No forced seven columns on desktop');
assert(css.includes('Preserve the exact number and order of user-selected'));
assert(html.includes("row.style.gridTemplateColumns=widths.join(' ')"),'Existing optional-column logic stays intact');
assert(polish.includes('.multi-voucher-grid > #ratibHeaderMoney > #spendTafqit'),'Amount words are styled as an inline caption beneath the top amount');
assert(!polish.includes('border:1px solid var(--border)!important;\n  border-radius:9px!important;box-shadow:none!important;\n  direction:rtl!important;text-align:right!important;white-space:normal!important;'));
assert(css.includes('Ratib 3.6.123: more compact DESKTOP statement'));
assert(css.includes('@media screen and (min-width:1200px)'));
assert(css.includes('margin:0!important;padding:6px 9px!important'));
assert(!css.includes('grid-template-columns:minmax(130px,1.05fr)'),'No forced columns in statement');
assert(!src.includes('store.set(')&&!src.includes('localStorage'),'No financial state writes');
(async()=>{
 const d=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="multiVoucherCard" class="spend-voucher"><div class="multi-voucher-grid">'+
 '<div id="ratibHeaderMoney"><div class="ratib-money-row"><input id="ratibHeaderAmount" value="360000"></div>'+
 '<p id="spendTafqit">ثلاثمائة وستون ألف ريال يمني فقط لا غير</p></div>'+
 '<label><input id="multiVoucherBeneficiary" value="محمد"></label></div>'+
 '<label class="ratib-approved-general-note"><textarea id="multiVoucherNote">إيجار</textarea></label></div>'+
 '</body></html>',{url:'https://example.org',runScripts:'outside-only'});
 const w=d.window,doc=w.document;
 const grid=doc.querySelector('.multi-voucher-grid'),card=doc.getElementById('multiVoucherCard');
 const words=doc.getElementById('spendTafqit'),beneficiary=doc.getElementById('multiVoucherBeneficiary');
 const amount=doc.getElementById('ratibHeaderAmount'),note=doc.getElementById('multiVoucherNote');
 let fired=0;beneficiary.addEventListener('input',()=>fired++);
 w.eval(src);doc.dispatchEvent(new w.Event('DOMContentLoaded'));
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 await tick();
 const money=doc.getElementById('ratibHeaderMoney'),amountRow=money.querySelector('.ratib-money-row');
 assert.equal(words.parentElement,money,'Words belong to the amount group, not the beneficiary');
 assert.equal(amountRow.nextElementSibling,words,'Words follow the top amount input immediately');
 assert.equal(grid.nextElementSibling,note.parentElement,'The original note stays after the header grid');
 assert.equal(doc.getElementById('spendTafqit'),words,'The existing words element was moved, not copied');
 assert.equal(amount.value,'360000','Original amount unchanged');
 assert.equal(beneficiary.value,'محمد','Original beneficiary unchanged');
 assert.equal(note.value,'إيجار','Original note unchanged');
 assert.equal(words.textContent,'ثلاثمائة وستون ألف ريال يمني فقط لا غير','Amount in words unchanged');
 beneficiary.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(fired,1,'Original field event listeners remain intact');
 doc.getElementById('ratibHeaderMoney').append(words);
 await tick();
 assert.equal(words.parentElement,money,'Words restored beneath top amount after external setup moves them');
 assert.equal(amountRow.nextElementSibling,words);
 w.close();
 console.log('PASS 3.6.123: amount words beneath top amount, compact desktop rows, original listeners and values intact');
})().catch(err=>{console.error(err);process.exitCode=1});
