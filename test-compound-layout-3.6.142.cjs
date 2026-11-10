'use strict';
/* Ratib 3.6.142 — approved compound layout, isolated from posting and cash vouchers. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-compound-layout-3.6.142.js','utf8');
const css=fs.readFileSync('ratib-compound-layout-3.6.142.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.6.172');
assert(index.includes('ratib-compound-layout-3.6.142.js'));
assert(index.includes('ratib-compound-layout-3.6.142.css'));
assert(sw.includes('./ratib-compound-layout-3.6.142.js'));
assert(sw.includes('./ratib-compound-layout-3.6.142.css'));
assert(css.includes('#multiVoucherCard.ratib-cmp-layout142'));
assert(!css.includes('#cashFlowCard'));
assert(!js.includes('store.set('));
assert(!js.includes('commitMultiVoucher('));
function row(i,side,cur){
return '<tr>'+
'<td><select class="multi-line-side" data-index="'+i+'"><option value="debit"'+(side==='debit'?' selected':'')+'>مدين</option><option value="credit"'+(side==='credit'?' selected':'')+'>دائن</option></select></td>'+
'<td><select class="multi-line-account" data-index="'+i+'"><option value="">اختر الحساب</option><option value="x">النقدية</option></select></td>'+
'<td><select class="multi-line-budget" data-index="'+i+'"><option value="general">عام</option></select></td>'+
'<td><input class="multi-line-note" data-index="'+i+'" placeholder="بيان البند"></td>'+
'<td><select class="multi-line-currency" data-index="'+i+'"><option value="YER"'+(cur==='YER'?' selected':'')+'>ريال يمني</option><option value="USD"'+(cur==='USD'?' selected':'')+'>دولار</option></select></td>'+
'<td><input class="multi-line-amount" data-index="'+i+'" value="100"></td>'+
'<td><input class="multi-line-rate" data-index="'+i+'" value="1"></td>'+
'<td class="multi-line-base" data-index="'+i+'">100</td>'+
'<td><input class="multi-line-notes" data-index="'+i+'"></td>'+
'<td><button class="multi-remove-line" data-index="'+i+'">×</button></td></tr>';
}
const html='<!doctype html><html dir="rtl"><body>'+
'<div id="voucherSelectorCard"></div>'+
'<div id="multiVoucherCard" class="unified-voucher"><h2>'+
'<span>🧾 سند قيد مركب</span><span id="multiVoucherSeqBadge" data-journal-seq="5">رقم: 5</span><button type="button">تغيير النوع</button></h2>'+
'<div class="multi-voucher-grid"><label>التاريخ<input type="date" id="multiVoucherDate" value="2026-11-06"></label>'+
'<label><input id="multiVoucherBeneficiary" placeholder="اسم المستفيد"></label>'+
'<label><select id="multiVoucherBaseCurrency"><option value="YER">ريال يمني</option><option value="USD">دولار</option></select></label></div>'+
'<label><textarea id="multiVoucherNote" placeholder="البيان العام"></textarea></label>'+
'<div class="multi-voucher-table-wrap"><table class="multi-voucher-table"><tbody id="multiVoucherLinesBody">'+
row(0,'debit','YER')+row(1,'credit','YER')+'</tbody></table></div>'+
'<button id="addMultiVoucherLineBtn">إضافة حساب</button>'+
'<div id="multiVoucherSummary">100</div><div id="multiVoucherBalance">متوازن</div>'+
'<div class="multi-voucher-actions">'+
'<button id="saveMultiDraftBtn">مسودة</button><button id="loadMultiDraftBtn">تحميل</button>'+
'<div class="voucher-savebar"><button id="commitMultiVoucherBtn">اعتماد السند</button></div>'+
'<button id="printMultiVoucherBtn">طباعة</button><button id="pdfMultiVoucherBtn">PDF</button>'+
'<button class="btn-danger" id="cancelMultiVoucherBtn">إلغاء</button>'+
'<button id="ratibMultiVoucherPreviewBtn">معاينة</button><button id="ratibMultiVoucherShareBtn">مشاركة</button>'+
'<button id="ratibMultiVoucherA4Btn">A4</button></div></div></body></html>';
(async()=>{
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/ratib'});
const w=dom.window,d=w.document;
w.eval('var multiVoucherLines=[{rateReference:""},{rateReference:""}]; var hasUnsavedChanges=false;');
w.eval(js);
d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
await new Promise(r=>setTimeout(r,0));
const card=d.getElementById('multiVoucherCard');
assert(card.classList.contains('ratib-cmp-layout142'));
assert.equal(card.querySelector(':scope > h2 > span:first-child').textContent,'سند قيد مركب');
assert.equal(d.getElementById('ratibCompoundNumber142').value,'5');
assert(d.getElementById('ratibCompoundDate142').contains(d.getElementById('multiVoucherDate')));
assert.equal(d.querySelectorAll('#multiVoucherDate').length,1);
assert.equal(d.querySelectorAll('.multi-line-account').length,2);
assert.equal(d.querySelectorAll('.multi-line-amount').length,2);
const rows=[...d.querySelectorAll('#multiVoucherLinesBody tr')];
assert.equal(rows[0].dataset.ratibCmpTitle,'الطرف الأول');
assert.equal(rows[1].dataset.ratibCmpTitle,'الطرف الآخر');
let add=0,save=0,show=0,share=0;
for(const [id,fn] of [
['addMultiVoucherLineBtn',()=>add++],
['commitMultiVoucherBtn',()=>save++],
['ratibMultiVoucherPreviewBtn',()=>show++],
['ratibMultiVoucherShareBtn',()=>share++]
])d.getElementById(id).addEventListener('click',fn);
const buttons=[...d.querySelectorAll('#ratibCompoundToolbar142 button')];
buttons.find(x=>x.textContent.includes('إضافة حساب')).click();
buttons.find(x=>x.textContent.includes('اعتماد وحفظ')).click();
buttons.find(x=>x.textContent.includes('عرض')).click();
buttons.find(x=>x.textContent.includes('مشاركة')).click();
assert.deepEqual([add,save,show,share],[1,1,1,1],'Original financial and output handlers are invoked');
const more=d.getElementById('ratibCompoundMoreBtn142');
more.click();assert.equal(d.getElementById('ratibCompoundMore142').hidden,false);
buttons.find(x=>x.textContent.includes('إعدادات السند')).click();
assert(card.classList.contains('ratib-cmp-show-extras'));
const currency=rows[0].querySelector('.multi-line-currency');
currency.value='USD';currency.dispatchEvent(new w.Event('change',{bubbles:true}));
await new Promise(r=>setTimeout(r,0));
assert(rows[0].classList.contains('ratib-cmp-foreign'));
const reference=rows[0].querySelector('.ratib-cmp-rate-source-input');
assert(reference,'Foreign FX reference exists without replacing rate input');
reference.value='مكتب الصرافة';reference.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(w.eval('multiVoucherLines[0].rateReference'),'مكتب الصرافة');
assert.equal(rows[0].querySelector('.multi-line-rate').value,'1');
card.classList.add('spend-voucher');
await new Promise(r=>setTimeout(r,0));
assert(!card.classList.contains('ratib-cmp-layout142'),'Cash voucher must be unstyled');
assert(d.getElementById('commitMultiVoucherBtn'),'Original save button remains');
assert(d.getElementById('pdfMultiVoucherBtn'),'Original PDF button remains');
console.log('Ratib 3.6.142 compound layout — PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});