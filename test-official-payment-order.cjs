'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-cash-layout-3.6.83.js','utf8');
const css=fs.readFileSync('ratib-cash-layout-3.6.85.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const html='<html lang="ar"><body><div id="multiVoucherCard" class="spend-voucher">'+
 '<div class="multi-voucher-grid"><label id="dateLabel"><input id="multiVoucherDate"></label>'+
 '<label id="beneficiaryLabel">المستفيد<input id="multiVoucherBeneficiary" value="مستفيد تجريبي"></label>'+
 '<label><select id="multiVoucherBaseCurrency"></select></label>'+
 '<div class="ratib-side-choice" id="ratibSide">طرف</div><div id="ratibHeaderMoney">100</div>'+
 '<div class="multi-voucher-source-row" id="creditRow"><div class="searchable-select-wrap"><input id="inpMultiSourceAcc" value="الصندوق"></div><button id="ratibLockSource">قفل</button></div></div>'+
 '<label class="ratib-approved-general-note" id="noteLabel">البيان العام<textarea id="multiVoucherNote">وصف السند</textarea></label>'+
 '<div class="multi-voucher-table-wrap" id="lines"><table><tbody id="multiVoucherLinesBody"><tr><td>بند صرف</td></tr></tbody></table></div>'+
 '<div class="spend-lines-toolbar" id="toolbar">إضافة بند</div></div></body></html>';
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://ratib.test'});
const w=dom.window,d=w.document;
w.eval("var multiVoucherMode='spend'; function ratibOrderDocumentAccounts(){const card=document.getElementById('multiVoucherCard'),grid=card.querySelector('.multi-voucher-grid'),source=document.getElementById('creditRow'),after=document.getElementById('toolbar');let holder=document.getElementById('ratibOrderedCreditSource');if(card.classList.contains('spend-voucher')&&document.getElementById('ratibHeaderSide')?.value==='credit'){if(!holder){holder=document.createElement('div');holder.id='ratibOrderedCreditSource';holder.className='multi-voucher-grid';}after.after(holder);holder.append(source);}else{grid.append(source);holder?.remove();}}");
const side=d.createElement('select');side.id='ratibHeaderSide';side.innerHTML='<option value="credit">دائن</option><option value="debit">مدين</option>';d.getElementById('ratibSide').append(side);
const beneficiary=d.getElementById('multiVoucherBeneficiary'),note=d.getElementById('multiVoucherNote'),account=d.getElementById('inpMultiSourceAcc'),lock=d.getElementById('ratibLockSource'),lines=d.getElementById('lines');
let clicks=0;lock.addEventListener('click',()=>clicks++);
w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
w.eval('ratibOrderDocumentAccounts()');
const card=d.getElementById('multiVoucherCard'),grid=card.querySelector(':scope > .multi-voucher-grid');
const holder=d.getElementById('ratibOrderedCreditSource');
assert.equal(grid.nextElementSibling,holder,'payment credit account precedes beneficiary');
assert.equal(holder.nextElementSibling,beneficiary.closest('label'),'beneficiary follows credit');
assert.equal(beneficiary.closest('label').nextElementSibling,note.closest('label'),'general statement follows beneficiary');
assert.equal(note.closest('label').nextElementSibling,lines,'table follows statement');
assert.equal(beneficiary.value,'مستفيد تجريبي');assert.equal(note.value,'وصف السند');assert.equal(account.value,'الصندوق');
assert.equal(d.querySelectorAll('#ratibLockSource').length,1);
lock.click();assert.equal(clicks,1,'existing lock handler still works');
assert.equal(d.querySelectorAll('#multiVoucherBeneficiary').length,1,'no duplicate beneficiary');
assert(beneficiary.closest('label').textContent.includes('اختياري'));
w.eval('ratibOrderDocumentAccounts()');
assert.equal(grid.nextElementSibling,holder,'repeat renders retain correct order');
side.value='debit';w.eval('ratibOrderDocumentAccounts()');
assert.equal(grid.nextElementSibling,beneficiary.closest('label'),'reverse-side layout remains ordered');
card.classList.add('receipt-voucher');
w.eval("multiVoucherMode='income';ratibOrderDocumentAccounts()");
assert.equal(d.getElementById('creditRow').parentElement,grid,'receipt retains debit-before-credit document order');
assert.equal(beneficiary.closest('label').parentElement,card,'receipt payer uses the same visible field position as payment');
assert.equal(grid.nextElementSibling,beneficiary.closest('label'),'receipt payer immediately follows the main account group');
assert.equal(beneficiary.closest('label').nextElementSibling,note.closest('label'),'receipt general note follows payer');
assert.equal(beneficiary.placeholder,'اسم الدافع (اختياري)','receipt retains the distinct payer name');
assert.equal(beneficiary.getAttribute('aria-label'),'اسم الدافع الاختياري لسند القبض');
assert.equal(beneficiary.value,'مستفيد تجريبي','switching mode does not change saved payer text');
const receiptCss=fs.readFileSync('ratib-receipt-payer-3.6.115.css','utf8');
assert(receiptCss.includes('grid-row:6!important'),'the visible receipt account follows its amount/currency rows');
side.value='credit';w.eval('ratibOrderDocumentAccounts()');
assert(d.getElementById('ratibOrderedCreditSource')?.contains(d.getElementById('creditRow')),'reversing receipt puts credit after debit');
side.value='debit';w.eval('ratibOrderDocumentAccounts()');
assert.equal(d.getElementById('creditRow').parentElement,grid,'restoring receipt returns debit before credit');
card.classList.remove('receipt-voucher','spend-voucher');
w.eval("multiVoucherMode='multi-entry';ratibOrderDocumentAccounts()");
assert.equal(beneficiary.closest('label').parentElement,grid,'compound journal unaffected');
assert(!beneficiary.closest('label').classList.contains('ratib-payment-beneficiary-row'));
assert(css.includes('#multiVoucherCard.spend-voucher > .ratib-payment-beneficiary-row'));
assert(css.includes('@media screen'),'layout styles only on screen');
assert(sw.includes('v242-official-receipt-balance-lock-3.6.127'));
// MutationObservers created by the shared cash layout may still be queued. Let jsdom
// drain those callbacks without synchronously destroying their window.
console.log('PASS official receipt/payment parity: account → optional party → general statement; preserved cash modes and compound entry');
