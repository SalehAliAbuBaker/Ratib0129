'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-statement-compact-3.6.119.css','utf8');
const polish=fs.readFileSync('ratib-voucher-polish-3.6.117.css','utf8');
const src=fs.readFileSync('ratib-display-separation-3.6.122.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.147');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.147","build":"p14700"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.147","build":"p14700"'));
assert(sw.includes('v260-opening-mobile-clean-3.6.139'));
assert(sw.includes('"./ratib-display-separation-3.6.122.js"'));
assert(html.includes('ratib-display-separation-3.6.122.js?v=3.6.139'));
assert(!css.includes('grid-template-columns:minmax(130px,1.05fr)'),'No forced seven columns on desktop');
assert(css.includes('Preserve the exact number and order of user-selected'));
assert(html.includes("row.style.gridTemplateColumns=widths.join(' ')"),'Existing optional-column logic stays intact');
assert(polish.includes('> .multi-voucher-grid > #spendTafqit'),'Amount words have a dedicated full-width grid row');
assert(polish.includes('grid-column:1 / -1!important;grid-row:4!important'),'Amount words span all columns');
assert(polish.includes('grid-template-columns:repeat(12,minmax(0,1fr))'),'Mobile grid is responsive');
assert(polish.includes('grid-column:1 / span 2!important;grid-row:1!important'),'Document number uses two narrow tracks');
assert(polish.includes('grid-column:3 / -1!important;grid-row:1!important'),'Date uses the remaining ten tracks');
assert(polish.includes('grid-column:1 / span 5!important;grid-row:5!important'),'Currency row is retained');
assert(!polish.includes('grid-template-columns:minmax(74px,1fr)'),'No fixed-width grid introduced');
assert(css.includes('Ratib 3.6.123: more compact DESKTOP statement'));
assert(css.includes('@media screen and (min-width:1200px)'));
assert(css.includes('margin:0!important;padding:6px 9px!important'));
assert(!css.includes('grid-template-columns:minmax(130px,1.05fr)'),'No forced columns in statement');
assert(!src.includes('store.set(')&&!src.includes('localStorage'),'No financial state writes');
(async()=>{
 const d=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="multiVoucherCard" class="spend-voucher"><div class="multi-voucher-grid">'+
 '<label class="spend-sequence"><input id="spendSeqInput" readonly value="3"></label>'+
 '<label><input id="multiVoucherDate" value="2026-10-22"></label>'+
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
 assert.equal(words.parentElement,grid,'Words are a full-width sibling of the amount group');
 assert.equal(money.nextElementSibling,words,'Words follow the complete amount row, not its input');
 assert.equal(grid.nextElementSibling,note.parentElement,'The original note stays after the header grid');
 assert.equal(doc.getElementById('spendTafqit'),words,'The existing words element was moved, not copied');
  assert.equal(doc.getElementById('spendSeqInput').value,'3','Document number retained');
 assert.equal(doc.getElementById('multiVoucherDate').value,'2026-10-22','Voucher date retained');
 assert.equal(doc.getElementById('spendSeqInput').parentElement.parentElement,grid,'Original document field stays inside form grid');
 assert.equal(doc.getElementById('multiVoucherDate').parentElement.parentElement,grid,'Original date field stays inside form grid');
 assert.equal(amount.value,'360000','Original amount unchanged');
 assert.equal(beneficiary.value,'محمد','Original beneficiary unchanged');
 assert.equal(note.value,'إيجار','Original note unchanged');
 assert.equal(words.textContent,'ثلاثمائة وستون ألف ريال يمني فقط لا غير','Amount in words unchanged');
 beneficiary.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(fired,1,'Original field event listeners remain intact');
 doc.getElementById('ratibHeaderMoney').append(words);
 await tick();
 assert.equal(words.parentElement,grid,'Words return to their independent row after external setup moves them');
 assert.equal(money.nextElementSibling,words);
 w.close();
 console.log('PASS 3.6.125: full-width amount words, wide date, narrow document number, data and listeners preserved');
})().catch(err=>{console.error(err);process.exitCode=1});
