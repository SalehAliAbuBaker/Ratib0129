'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('ratib-trial-voucher-statement-3.6.125.css','utf8');
const js=fs.readFileSync('ratib-trial-voucher-statement-3.6.125.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.157');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.157","build":"p15700"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.157","build":"p15700"'));
assert(sw.includes("v260-opening-mobile-clean-3.6.139"));
for(const file of ['ratib-trial-voucher-statement-3.6.125.js','ratib-trial-voucher-statement-3.6.125.css']){
  assert(html.includes('./'+file+'?v=3.6.139'),'Versioned new asset '+file);
  assert(sw.includes('"./'+file+'"'),'Asset cached for offline: '+file);
}
assert(css.includes('grid-template-columns:minmax(70px,.74fr) minmax(0,2.26fr)'),'Trial cash header ratio');
assert(css.includes('#ratibCashVoucherHeader #spendSeqInput'));
assert(css.includes('ratib-native-date-button'));
assert(css.includes('.ratib-hijri-text>span')&&css.includes('.ratib-hijri-text small'),'Trial two-line account date display');
assert(!css.includes('account-statement-row{grid-template-columns:185px'),'No overwriting optional ledger column settings');
assert(html.includes("const widths=['minmax(162px,1.2fr)'"),'Account first-column width is adjusted without replacing dynamic settings');
for(const token of ['store.set(', 'saveMultiVoucher','postVoucher','getAllTransactions(', 'roundAccountingAmount','localStorage','buildPdf'])assert(!js.includes(token),'No mutation/accounting code in trial bridge: '+token);
assert(html.includes('ratibStatementInclusiveTotals(data)'),'Inclusive accounting totals from official preserved');
const markup=`<!doctype html><html lang="ar" dir="rtl"><body>
<div id="multiVoucherCard" class="spend-voucher">
 <div id="multiVoucherSeqBadge">رقم: 27</div>
 <div class="multi-voucher-grid">
  <label class="spend-sequence">رقم السند<input id="spendSeqInput" value="21" readonly></label>
  <label>التاريخ<div class="ratib-native-date-wrap"><button type="button" class="ratib-native-date-button">19 جمادى الأولى 1448هـ <small>2026-10-30</small></button><input id="multiVoucherDate" value="2026-10-30"></div></label>
  <div id="ratibHeaderMoney"><input id="ratibHeaderAmount" value="360000"></div>
  <p id="spendTafqit">ثلاثمائة وستون ألف ريال يمني فقط لا غير</p>
  <label>العملة<select id="multiVoucherBaseCurrency"><option selected>YER</option></select></label>
  <label><input id="multiVoucherBeneficiary" value="اسم مستفيد"></label>
 </div>
 <label><textarea id="multiVoucherNote">بيان محفوظ</textarea></label>
</div></body></html>`;
(async()=>{
 const dom=new JSDOM(markup,{url:'https://example.org/',runScripts:'outside-only'});
 const w=dom.window,d=w.document,card=d.getElementById('multiVoucherCard');
 const grid=card.querySelector('.multi-voucher-grid'),seq=d.getElementById('spendSeqInput'),date=d.getElementById('multiVoucherDate');
 const amount=d.getElementById('ratibHeaderAmount'),words=d.getElementById('spendTafqit'),beneficiary=d.getElementById('multiVoucherBeneficiary'),note=d.getElementById('multiVoucherNote');
 let dateEvents=0,seqEvents=0;
 date.addEventListener('change',()=>dateEvents++);
 seq.addEventListener('change',()=>seqEvents++);
 w.eval(js);
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
 await settle();
 let header=d.getElementById('ratibCashVoucherHeader');
 assert(header&&header.previousElementSibling.id==='multiVoucherSeqBadge','Header follows existing voucher sequence badge');
 assert.equal(header.parentElement,card,'Header stays inside voucher card');
 assert.equal(header.nextElementSibling,grid,'Header precedes the original input grid');
 assert.equal(seq.closest('label').parentElement,header,'Original sequence label moved to trial header');
 assert.equal(date.closest('label').parentElement,header,'Original date label moved to trial header');
 assert.equal(seq.value,'27','Document number synchronized with existing display badge');
 assert.equal(date.value,'2026-10-30','Date value retained');
 assert.equal(amount.value,'360000','Original voucher amount retained');
 assert.equal(words.textContent,'ثلاثمائة وستون ألف ريال يمني فقط لا غير','Words value preserved');
 assert.equal(beneficiary.value,'اسم مستفيد','Beneficiary retained');
 assert.equal(note.value,'بيان محفوظ','Narration retained');
 assert.equal(d.querySelectorAll('#spendSeqInput').length,1,'No sequence duplicate');
 assert.equal(d.querySelectorAll('#multiVoucherDate').length,1,'No date duplicate');
 date.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(dateEvents,1,'Original date listener preserved');
 // Switch to noncash compound entry, then back to both receipt/payment behavior.
 card.classList.remove('spend-voucher');
 await settle();
 assert.equal(seq.closest('label').parentElement,grid,'Compound entry receives its original sequence label');
 assert.equal(date.closest('label').parentElement,grid,'Compound entry receives its original date label');
 assert(header.hidden,'Trial-specific cash header hidden on compound form');
 card.classList.add('spend-voucher');
 await settle();
 assert.equal(seq.closest('label').parentElement,header,'Original sequence reused after entering receipt/payment');
 assert.equal(date.closest('label').parentElement,header,'Original date reused after entering receipt/payment');
 assert.equal(card.querySelectorAll('#ratibCashVoucherHeader').length,1,'No duplicated header');
 assert.equal(note.value,'بيان محفوظ');
 seq.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(seqEvents,1,'Original document event listener preserved');
 w.close();
 console.log('PASS 3.6.125: trial voucher header with original fields, original data, reversible compound mode, and original statement accounting');
})().catch(err=>{console.error(err);process.exitCode=1;});
