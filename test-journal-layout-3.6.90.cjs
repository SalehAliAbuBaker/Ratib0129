'use strict';
/* 3.6.90: presentation-only journal refactor contracts and jsdom behavior. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-journal-layout-3.6.90.js','utf8');
const css=fs.readFileSync('ratib-journal-layout-3.6.90.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(Number(pkg.version.split('.').at(-1))>=89);
if(index.includes('ratib-journal-layout-3.6.90.js')){
 const close=index.lastIndexOf('</body>');
 assert(index.lastIndexOf('<script src="./ratib-journal-layout-3.6.90.js')>index.length-1600,'Journal script must load at document end');
 assert(index.lastIndexOf('ratib-journal-layout-3.6.90.js')<close,'Journal script must not be inserted into exported HTML template');
 const head=index.indexOf('</head>');
 assert(index.indexOf('ratib-journal-layout-3.6.90.css')<head,'Journal CSS must be inside real document head');
 assert(sw.includes('ratib-journal-layout-3.6.90.js')&&sw.includes('ratib-journal-layout-3.6.90.css'));
}
const fixture=`<!DOCTYPE html><html lang="ar" dir="rtl"><head></head><body>
 <div id="voucherSelectorCard"></div>
 <div id="cashFlowCard" class="unified-voucher simple-journal">
 <h2><div><span id="voucherHeaderTitle">سند قيد بسيط</span><span id="voucherSeqNumBadge">3</span></div><button type="button">🔄 تغيير النوع</button></h2>
 <div class="simple-journal-grid">
 <div class="form-group journal-account-field"><label>مدين</label><div style="display: flex"><div id="wrapDebitAcc" class="searchable-select-wrap"><input></div><button id="lockDebitAccBtn">🔓</button><button id="addNewDebitAccBtn">＋</button></div></div>
 <div class="form-group journal-account-field"><label id="lblCreditAcc">دائن</label><div style="display: flex"><div id="wrapCreditAcc" class="searchable-select-wrap"><input></div><button id="lockCreditAccBtn">🔓</button><button id="addNewCreditAccBtn">＋</button></div></div>
 <div class="journal-swap-row"><button id="swapAccountsBtn">تبديل الحسابات</button></div>
 <div class="journal-amount-row"><div><label for="voucherAmountInput">إجمالي مبلغ السند:</label><span class="financial-number-field"><input id="voucherAmountInput" value="200" inputmode="decimal"><button type="button" class="financial-calc-trigger">▦</button></span></div><div><label for="voucherCurrencySelect">العملة:</label><select id="voucherCurrencySelect"><option value="YER">ريال يمني</option></select></div></div>
 <div class="form-group"><input type="date" id="voucherDateInput" value="2026-10-18"></div>
 <div class="form-group"><input id="voucherNoteInput" value="أمانة"></div>
 <div id="voucherRecipientGroup" class="form-group"><input id="voucherRecipientInput"></div>
 </div>
 <div id="tafqitDisplayBox">مئتان</div>
 <div class="budget-head"><strong>بنود الميزانية</strong><button id="toggleSplitBoxBtn">مفعل</button></div>
 <div id="voucherSplitContainer">
 <div>تعليمات التوزيع</div>
 <div><input id="budgetSplitInput" value="200"></div>
 <div><span id="voucherAllocatedSum">200</span><span id="voucherRemainingSum">0</span></div>
 </div>
 </div>
 <div id="multiVoucherCard" class="unified-voucher">
 <h2>قيد مركب</h2>
 <div class="multi-voucher-grid">
 <label><input id="multiVoucherDate" type="date" value="2026-10-18"></label>
 <label><input id="multiVoucherBeneficiary"></label>
 <label><select id="multiVoucherBaseCurrency"><option value="YER">YER</option></select></label>
 </div>
 <div id="multiVoucherBalance" data-base="100">القيد متوازن</div>
 </div>
 </body></html>`;
async function main(){
 const dom=new JSDOM(fixture,{url:'https://ratibtrial.pages.dev/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.eval(js);d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
 await new Promise(r=>setTimeout(r,0));
 const grid=d.querySelector('.simple-journal-grid');

 const header=d.querySelector('#cashFlowCard > h2');
 assert.equal(header.querySelector('#voucherHeaderTitle')?.textContent,'سند قيد بسيط','Header title retained');
 assert.equal(header.querySelector('#voucherSeqNumBadge')?.textContent,'3','Voucher number displayed compactly');
 assert.equal(header.children[2].querySelector('#voucherDateInput')?.value,'2026-10-18','Date placed in the heading row');
 assert.equal(header.children[3].id,'swapAccountsBtn','Account swap is the fourth heading control');
 assert.equal(header.querySelectorAll('button').length,1,'Change type removed');
 assert.equal(grid.children[0].id,'ratibJournalAmountCurrencyRow','Amount/currency/calculator share second row');
 assert.equal(grid.children[0].querySelector('label[for="voucherAmountInput"]')?.textContent,'إجمالي مبلغ السند:','Amount label accessible');
 assert.equal(grid.children[0].querySelector('label[for="voucherCurrencySelect"]')?.textContent,'العملة:','Currency label accessible');
 assert.equal(grid.children[0].querySelectorAll('#ratibSimpleHeaderCalculator').length,1,'Calculator placed beside currency');
 assert.equal(d.getElementById('voucherAmountInput').closest('#ratibJournalAmountCurrencyRow'),grid.children[0],'Amount in second row');
 assert.equal(d.getElementById('voucherCurrencySelect').closest('#ratibJournalAmountCurrencyRow'),grid.children[0],'Currency in second row');
 assert.equal(grid.children[1].id,'tafqitDisplayBox','Tafqit beneath second row');
 assert.equal(d.querySelectorAll('#voucherAmountInput').length,1,'Amount input not duplicated');
 assert.equal(d.querySelectorAll('#voucherCurrencySelect').length,1,'Currency input not duplicated');
 assert.match(css,/#cashFlowCard\\.simple-journal > h2 > #swapAccountsBtn/,'Heading account swap styled');
 assert.match(css,/#ratibJournalAmountCurrencyRow > #ratibSimpleHeaderCalculator/,'Money row calculator styled');
 assert.equal(d.getElementById('voucherAmountInput').value,'200');
 assert.equal(d.getElementById('voucherDateInput').value,'2026-10-18');
 assert.equal(d.getElementById('voucherCurrencySelect').value,'YER');
 assert.equal(d.getElementById('voucherNoteInput').value,'أمانة');
 assert(d.getElementById('addNewDebitAccBtn').hidden&&d.getElementById('addNewCreditAccBtn').hidden,'+ buttons removed from simple entry UI');
 assert.equal(header.querySelector('#swapAccountsBtn')?.textContent,'⇄','Original swap button remains active in header');
 assert(d.getElementById('voucherRecipientGroup').classList.contains('ratib-simple-recipient-collapsed'),'Empty optional recipient starts collapsed');
 d.getElementById('ratibSimpleExtraBtn').click();
 assert(!d.getElementById('voucherRecipientGroup').classList.contains('ratib-simple-recipient-collapsed'));
 assert.equal(d.getElementById('budgetSplitInput').value,'200','Budget model input retained');
 const summary=d.getElementById('ratibSimpleBudgetOverview');
 assert(summary.textContent.includes('المتبقي: 0'),'Budget state is visible when collapsed');
 assert(d.getElementById('voucherSplitContainer').classList.contains('ratib-budget-collapsed'));
 assert.match(css,/\.voucher-split-box\.ratib-budget-collapsed\{[\s\S]*?display:none!important;/,'Collapsed budget must not consume the screen');
 d.getElementById('voucherRemainingSum').textContent='15';
 await new Promise(r=>setTimeout(r,0));
 assert(!d.getElementById('voucherSplitContainer').classList.contains('ratib-budget-collapsed'),'Imbalanced budget must expand');
 assert(summary.textContent.includes('المتبقي: 15'));
 const compound=d.querySelector('#multiVoucherCard > .multi-voucher-grid');
 assert(compound.children[0].contains(d.getElementById('multiVoucherDate')),'Compound date first');
 assert.equal(compound.children[1].id,'ratibCompoundAmountReadout','Read-only compound total follows date');
 assert(compound.children[2].contains(d.getElementById('multiVoucherBaseCurrency')),'Base currency directly follows displayed total');
 assert.equal(d.getElementById('ratibCompoundAmountValue').textContent,'100');
 d.getElementById('multiVoucherBalance').dataset.base='350.5';
 await new Promise(r=>setTimeout(r,0));
 assert.equal(d.getElementById('ratibCompoundAmountValue').textContent,'350.5','Readout follows actual ledger summary');
 d.getElementById('multiVoucherCard').classList.add('spend-voucher');
 assert.match(css,/#multiVoucherCard\.spend-voucher #ratibCompoundAmountReadout\{display:none!important\}/,'Readout hidden for cash vouchers');
 assert.match(css,/tbody select\.multi-line-account\[hidden\]/,'Autocomplete backing select remains hidden');
 assert.match(css,/\.multi-voucher-table tbody tr\{/,'Compound cards styled on mobile');
 assert.match(css,/grid-row:2!important/,'Tafqit stays below the money row');
 d.getElementById('voucherSelectorCard').click();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(d.querySelectorAll('#cashFlowCard > h2 #swapAccountsBtn').length,1,'Rerender must not duplicate controls');
 assert.equal(d.querySelectorAll('#ratibJournalAmountCurrencyRow').length,1,'Rerender must not create a second money row');
 assert.equal(d.getElementById('voucherAmountInput').closest('#ratibJournalAmountCurrencyRow'),grid.children[0],'Rerender retains money row under heading');
 dom.window.close();
 console.log('PASS 3.6.90 simple/compound journal field order, original values, budget, row cards and mode isolation');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
