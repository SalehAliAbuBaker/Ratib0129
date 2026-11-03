'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-statement-compact-3.6.119.css','utf8');
const polish=fs.readFileSync('ratib-voucher-polish-3.6.117.css','utf8');
const src=fs.readFileSync('ratib-display-separation-3.6.122.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.122');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.122","build":"p12200"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.122","build":"p12200"'));
assert(sw.includes('v237-official-ui-display-3.6.122'));
assert(sw.includes('"./ratib-display-separation-3.6.122.js"'));
assert(html.includes('ratib-display-separation-3.6.122.js?v=3.6.122'));
assert(!css.includes('grid-template-columns:minmax(130px,1.05fr)'),'No forced seven columns on desktop');
assert(css.includes('Preserve the exact number and order of user-selected'));
assert(html.includes("row.style.gridTemplateColumns=widths.join(' ')"),'Existing optional-column logic stays intact');
assert(polish.includes('#multiVoucherCard.spend-voucher > #spendTafqit'));
assert(!src.includes('store.set(')&&!src.includes('localStorage'),'No financial state writes');
(async()=>{
 const d=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="multiVoucherCard" class="spend-voucher"><div class="multi-voucher-grid">'+
 '<div id="ratibHeaderMoney"><input id="ratibHeaderAmount" value="360000">'+
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
 assert.equal(words.parentElement,card,'Words are outside editable voucher input grid');
 assert.equal(grid.nextElementSibling,words,'Words render on a separate row after header fields');
 assert.equal(words.nextElementSibling,note.parentElement,'The original note remains after words');
 assert.equal(doc.getElementById('spendTafqit'),words,'The existing words element was moved, not copied');
 assert.equal(amount.value,'360000','Original amount unchanged');
 assert.equal(beneficiary.value,'محمد','Original beneficiary unchanged');
 assert.equal(note.value,'إيجار','Original note unchanged');
 assert.equal(words.textContent,'ثلاثمائة وستون ألف ريال يمني فقط لا غير','Amount in words unchanged');
 beneficiary.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(fired,1,'Original field event listeners remain intact');
 doc.getElementById('ratibHeaderMoney').append(words);
 await tick();
 assert.equal(words.parentElement,card,'Words restored when old setup repositions them');
 assert.equal(grid.nextElementSibling,words);
 w.close();
 console.log('PASS 3.6.122: isolated tafqit and dynamic desktop columns without changing inputs or accounting');
})().catch(err=>{console.error(err);process.exitCode=1});
