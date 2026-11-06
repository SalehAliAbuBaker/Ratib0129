'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-cash-actions-3.6.135.css','utf8');
const section=(begin,end)=>{
 const a=html.indexOf(begin),b=html.indexOf(end,a);
 assert(a>-1&&b>a,'Missing expected code: '+begin);
 return html.slice(a,b);
};
const jsdom=new JSDOM('<body><div id="importedOpeningVoucherModal" class="opening-manual"><label id="sourceSeq">رقم القيد <input id="importedOpeningSeq"></label><table><thead><tr><th>الحساب</th><th>العملة</th></tr></thead><tbody id="importedOpeningRows"></tbody></table><div id="importedOpeningTotals"></div></div></body>');
const doc=jsdom.window.document;
const state={manual:true,rows:[{
 id:'',isoDate:'2026-11-06',_openingSide:'debit',
 openingBalance:{account:'حساب طويل جدًا يحتاج إلى احتواء في الحقل نفسه',currency:'USD',baseCurrency:'YER',debit:'1250',credit:'0',baseDebit:'0',baseCredit:'0',exchangeRate:'1571',sourceRef:'الصرافة',note:'بيان تفصيلي طويل'}
}],dirty:false,busy:false};
const ctx={
 document:doc,importedOpeningEdit:state,
 importedRecordCurrencies:()=>['YER','USD'],openingDisplayAmount:v=>String(v),
 trialNumber:v=>String(v),esc:v=>String(v),
 openingFormConvert:()=>{},renderImportedOpeningTotals:()=>{},
 getLocalTodayISO:()=> '2026-11-06',
 console,Set
};
vm.createContext(ctx);
/* Verify the actual editable DOM, not an illustrative mockup. */
vm.runInContext(section("const seqField=document.getElementById('importedOpeningSeq');","dateLabel.querySelector('input').addEventListener("),ctx);
const seq=doc.querySelector('#sourceSeq');
const date=doc.querySelector('#openingDateLabel');
assert.equal(seq.querySelector('.opening-field-caption').textContent,'رقم القيد');
assert.equal(date.querySelector('.opening-field-caption'),null,'Date must have no visible caption inside the field');
assert.equal(date.querySelector('#importedOpeningHeaderDate').getAttribute('aria-label'),'التاريخ','Accessible date label remains');
assert(date.querySelector('#openingDateHijri'),'Hijri display remains available');
assert(seq.contains(doc.getElementById('importedOpeningSeq')));
assert(date.contains(doc.getElementById('importedOpeningHeaderDate')));
assert.equal([...seq.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length,0,'No text above number input');
assert.equal([...date.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length,0,'No text above date input');
vm.runInContext(section('function openingFormDecorate(){','function importedOpeningExactTotals('),ctx);
ctx.renderImportedOpeningRows();
let tr=doc.querySelector('#importedOpeningRows>tr');
assert(tr&&tr.classList.contains('opening-foreign'));
const captions={
 account:'الحساب',currency:'العملة',debit:'المبلغ',credit:'المبلغ',
 baseCurrency:'عملة التقييم',sourceRef:'مصدر السعر',note:'البيان (اختياري)'
};
for(const [key,expected] of Object.entries(captions)){
 const input=tr.querySelector('[data-field="'+key+'"]');
 assert(input,'Missing original input: '+key);
 const cell=input.closest('td');
 assert(cell.classList.contains('opening-inline-field'),'Real container missing: '+key);
 const caption=cell.querySelector(':scope > .opening-field-caption');
 assert(caption,'Caption not a child of field: '+key);
 assert.equal(caption.textContent,expected);
 assert.equal([...cell.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length,0,'No external text: '+key);
}
assert.equal(tr.querySelector('.opening-fx label .opening-field-caption').textContent,'سعر الصرف');
assert(tr.querySelector('.opening-side .opening-inline-delete'),'Real remove button remains with debit/credit');
assert(tr.querySelector('td:nth-child(10) .opening-field-caption'),'Note has internal caption');
assert(css.includes('#importedOpeningVoucherModal.opening-manual table:has(>#importedOpeningRows)>thead'),'Only editor table header hidden');
assert(css.includes('#importedOpeningVoucherModal.opening-manual #importedOpeningRows>tr>td::before'),'Legacy pseudo-headings replaced');
assert(css.includes('content:none!important;display:none!important'),'No legacy top field captions');
assert(css.includes('.opening-inline-header-field>.opening-field-caption'),'Native header text is inside field');
assert(css.includes('#importedOpeningVoucherModal.opening-manual #importedOpeningDescription'),'Description hidden for manual editor');
assert(html.includes("  ?''"),'Manual explanatory paragraph no longer populated');
const printSection=section('function manualOpeningPrintTable(doc){','function importedOpeningPrint(');
for(const printed of ['م','رقم الحساب','الحساب','البيان','مدين','دائن','العملة','سعر التقييم']){
 assert(printSection.includes(printed),'Printed column title retained: '+printed);
}
assert(printSection.includes('<thead><tr>'),'All column headings remain in print');
assert(html.includes("const columns=['م','رقم الحساب','الحساب','البيان','مدين','دائن','العملة','سعر التقييم']"),'PDF headers match approved print layout');
assert(!css.includes('#pvTableBox thead{display:none'),'Print headings must never be hidden');
console.log('PASS opening labels: actual DOM captions in every field, editor-only header removal, reference print/PDF labels preserved, original editing controls untouched');
