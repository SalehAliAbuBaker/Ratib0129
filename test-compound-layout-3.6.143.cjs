'use strict';
/* Regression: approved compound editor geometry and two real editable parties. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const css=fs.readFileSync('ratib-compound-layout-3.6.142.css','utf8');
const js=fs.readFileSync('ratib-compound-layout-3.6.142.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.6.196');
assert(html.includes('ratib-compound-layout-3.6.142.css?v=3.6.148'));
assert(html.includes('ratib-compound-layout-3.6.142.js?v=3.6.148'));
assert(sw.includes('compound-compact-auto-signature-tafqit-cash-reference-amount-currency-compound-ref-simple-ref-totals-cash-colors-cash-preview-return-3.6.162'));
assert(html.includes('ratib-compound-layout-3.6.142.css?v=3.6.148'));
assert(html.includes('ratib-compound-layout-3.6.142.js?v=3.6.148'));
const precise='#multiVoucherCard.ratib-cmp-layout142:not(.spend-voucher):not(.hidden)';
const old='#multiVoucherCard.ratib-cmp-layout142';
assert(css.includes(precise+' > h2'),'Header must not require the legacy unified-voucher class');
assert(css.includes(precise+'>.multi-voucher-grid'),'Must hide legacy extraneous grid');
assert(css.includes(precise+' .multi-voucher-table tbody tr>td'),'Cells must outrank old !important grid rules');
assert(css.includes(precise+' .multi-voucher-table tbody tr.ratib-cmp-first>td:nth-child(2)'),'First account full width');
assert(css.includes(precise+' .multi-voucher-table tbody tr.ratib-cmp-counter>td:nth-child(2)'),'Second account full width');
assert(css.includes('body:has(#multiVoucherCard.ratib-cmp-layout142:not(.hidden)) #backToMenuBtn'),'No duplicate external back button');
assert(!css.includes('#cashFlowCard'),'Simple journal unaffected');
const one=(i,side='debit')=>'<tr>'+
'<td><select class="multi-line-side" data-index="'+i+'"><option value="debit"'+(side==='debit'?' selected':'')+'>مدين</option><option value="credit"'+(side==='credit'?' selected':'')+'>دائن</option></select></td>'+
'<td><select class="multi-line-account" data-index="'+i+'"><option value="">اختر الحساب</option><option value="c">الصندوق</option></select></td>'+
'<td><select class="multi-line-budget" data-index="'+i+'"><option value="general">عام</option></select></td>'+
'<td><input class="multi-line-note" data-index="'+i+'"></td>'+
'<td><select class="multi-line-currency" data-index="'+i+'"><option value="YER">ريال يمني</option><option value="USD">دولار</option></select></td>'+
'<td><input class="multi-line-amount" data-index="'+i+'" placeholder="المبلغ"></td>'+
'<td><input class="multi-line-rate" data-index="'+i+'" value="1"></td>'+
'<td class="multi-line-base">0</td>'+
'<td><input class="multi-line-notes" data-index="'+i+'"></td>'+
'<td><button class="multi-remove-line">×</button></td></tr>';
const fixture='<!doctype html><html dir="rtl"><body>'+
'<div id="voucherSelectorCard"></div>'+
'<div id="multiVoucherCard" class="hidden"><h2><span>قيد مركب</span><span id="multiVoucherSeqBadge">رقم: 5</span><button type="button">رجوع</button></h2>'+
'<div class="multi-voucher-grid"><label><input id="multiVoucherDate" type="date" value="2026-11-06"></label>'+
'<label><input id="multiVoucherBeneficiary"></label><label><select id="multiVoucherBaseCurrency"><option value="YER">ريال يمني</option><option value="USD">دولار</option></select></label></div>'+
'<label><textarea id="multiVoucherNote"></textarea></label>'+
'<div class="multi-voucher-table-wrap"><table class="multi-voucher-table"><tbody id="multiVoucherLinesBody">'+one(0)+'</tbody></table></div>'+
'<button id="addMultiVoucherLineBtn" type="button">إضافة حساب</button>'+
'<div id="multiVoucherSummary"></div><div id="multiVoucherBalance"></div>'+
'<div class="multi-voucher-actions"><button id="saveMultiDraftBtn">مسودة</button><button id="loadMultiDraftBtn">تحميل</button>'+
'<div class="voucher-savebar"><button id="commitMultiVoucherBtn">حفظ</button></div>'+
'<button id="printMultiVoucherBtn">طباعة</button><button id="pdfMultiVoucherBtn">PDF</button>'+
'<button class="btn-danger" id="cancelMultiVoucherBtn">إلغاء</button>'+
'<button id="ratibMultiVoucherPreviewBtn">عرض</button><button id="ratibMultiVoucherShareBtn">مشاركة</button>'+
'<button id="ratibMultiVoucherA4Btn">A4</button></div></div></body></html>';
async function test(){
 const dom=new JSDOM(fixture,{url:'https://ratib.example',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.eval('var multiVoucherLines=[{side:"debit",account:"",amount:"",rateReference:""}];var multiVoucherDraftId="";'+
  'var addCalls=0;function renderMultiVoucherLines(){var body=document.getElementById("multiVoucherLinesBody");body.innerHTML=multiVoucherLines.map(function(l,i){return window.__makeRow(i,l.side)}).join("");}'+
  'function addMultiVoucherLine(){addCalls++;multiVoucherLines.push({side:"debit",account:"",amount:"",rateReference:""});renderMultiVoucherLines();}');
 w.__makeRow=one;
 w.eval(js);d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
 await new Promise(r=>setTimeout(r,0));
 assert(!d.getElementById('multiVoucherCard').classList.contains('ratib-cmp-layout142'),'No compound layout in hidden page');
 const card=d.getElementById('multiVoucherCard');card.classList.remove('hidden');
 await new Promise(r=>setTimeout(r,0));
 assert(card.classList.contains('ratib-cmp-layout142'));
 assert.equal(d.querySelectorAll('#multiVoucherLinesBody tr').length,2,'Two parties appear in new document');
 assert.equal(w.eval('multiVoucherLines[1].side'),'credit','Second party defaults to opposite side');
 assert.equal(w.eval('addCalls'),1,'One row added, not twice');
 assert.equal(d.getElementById('ratibCompoundNumber142').value,'5');
 const nativeDate=d.getElementById('multiVoucherDate');
 assert(d.getElementById('ratibCompoundDate142').contains(nativeDate));
 const title=d.querySelector('#multiVoucherCard>h2>span:first-child');
 assert.equal(title.textContent,'سند قيد مركب');
 assert.equal(d.getElementById('ratibCompoundMeta142').querySelectorAll('#multiVoucherDate').length,1);
 const add=[...d.querySelectorAll('#ratibCompoundToolbar142 button')].find(x=>x.textContent.includes('إضافة طرف'));
 add.click();await new Promise(r=>setTimeout(r,0));
 assert.equal(w.eval('addCalls'),2,'Visible add calls original function exactly once');
 assert.equal(d.querySelectorAll('#multiVoucherLinesBody tr').length,3);
 const row=d.querySelector('#multiVoucherLinesBody tr');
 row.querySelector('.multi-line-currency').value='USD';
 row.querySelector('.multi-line-currency').dispatchEvent(new w.Event('change',{bubbles:true}));
 await new Promise(r=>setTimeout(r,0));
 assert(row.classList.contains('ratib-cmp-foreign'));
 assert(row.querySelector('.ratib-cmp-rate-source-input'));
 // The old journal script can move native date into h2 on page resume.
 d.querySelector('#multiVoucherCard>h2').append(nativeDate.closest('label'));
 await new Promise(r=>setTimeout(r,0));
 assert(d.getElementById('ratibCompoundDate142').contains(nativeDate),'Date restored from conflicting journal rearrangement');
 card.classList.add('spend-voucher');
 await new Promise(r=>setTimeout(r,0));
 assert(!card.classList.contains('ratib-cmp-layout142'),'Cash voucher remains isolated');
 console.log('PASS 3.6.144 compound visible controls, two parties, scoped CSS, no duplicate add, date and cash isolation');
}
test().catch(err=>{console.error(err);process.exitCode=1;});