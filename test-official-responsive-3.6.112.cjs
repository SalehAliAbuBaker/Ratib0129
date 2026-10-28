'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-official-responsive-3.6.112.css','utf8');
const sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
const doc=new JSDOM(html).window.document;
assert.equal(pkg.version,'3.6.112');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.112","build":"p11200"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.112","build":"p11200"'));
assert(sw.includes('v226-official-responsive-3.6.112'));
assert(sw.includes('"./ratib-official-responsive-3.6.112.css"'));
assert(doc.querySelector('link[href="./ratib-official-responsive-3.6.112.css?v=3.6.112"]'));
assert(doc.querySelector('link[href="./ratib-mobile-vouchers-3.6.111.css?v=3.6.112"]'));
const grid=doc.querySelector('#dashboardHomeContent .main-menu-grid.ratib-home-main-grid');
assert(grid);
assert.equal(grid.querySelectorAll('.main-menu-btn').length,8);
assert.equal(grid.querySelectorAll(':scope > .main-menu-btn').length,4);
assert.equal(grid.querySelectorAll('.ratib-home-voucher-shortcuts > .main-menu-btn').length,4);
assert(css.includes('@media screen and (min-width:900px)'));
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'));
assert(css.includes('#dashboardHomeContent .ratib-home-voucher-shortcuts'));
assert.equal(doc.querySelectorAll('#dashboardHomeContent .ratib-commerce-shortcut').length,3);
for(const name of ['stock','in','out'])assert(doc.querySelector('[onclick="RatibCommerce.open(\''+name+'\')"]'));
const captions=[
 ['multiVoucherBeneficiary','المستفيد'],
 ['multiVoucherParty','الجهة / الطرف'],
 ['multiVoucherNote','البيان العام'],
 ['inpMultiSourceAcc','حساب مرجعي (اختياري)'],
 ['inpDebitAcc','الحساب المدين (عليه):'],
 ['inpCreditAcc','الحساب الدائن (له):'],
 ['voucherAmountInput','إجمالي مبلغ السند:']
];
for(const [id,name] of captions){
 const field=doc.getElementById(id);assert(field,id);
 let label=field.closest('label')||doc.querySelector('label[for="'+id+'"]');
 assert(label && label.textContent.includes(name),id+' still has an accessible label');
 assert(label.querySelector('.ratib-duplicate-caption') || label.classList.contains('ratib-duplicate-caption'),id+' has a mobile-only duplicate caption');
 if(field.tagName==='INPUT'||field.tagName==='TEXTAREA')assert(field.getAttribute('placeholder'),id+' must retain the visible field description');
}
assert(css.includes('@media screen and (max-width:640px)'));
assert(css.includes('#pageExpenses .ratib-duplicate-caption'));
assert(css.includes('clip-path:inset(50%)!important'));
assert(!css.includes('display:none!important'),'do not remove labels from accessibility tree');
for(const id of ['multiVoucherDate','voucherDateInput']){
 const el=doc.getElementById(id);
 assert(el && el.type==='date' && el.getAttribute('dir')==='ltr' && el.getAttribute('lang')==='en-CA',id);
}
for(const id of ['multiVoucherBaseCurrency','voucherCurrencySelect'])
 assert(doc.getElementById(id),'currency distinction must remain');
assert(css.includes('unicode-bidi:isolate!important'));
assert(css.includes('::-webkit-datetime-edit'));
assert(css.includes('font-size:var(--ratib-input-font-size,14px)!important'));
for(const action of ['function buildImportedOpeningVoucher(state,data)','async function saveImportedOpeningVoucher()'])
 assert(html.includes(action),'financial opening code preserved');
assert(!css.includes('type="text"'),'date type unchanged');
console.log('PASS official 3.6.112: 4+4 desktop, accessible compact captions and native RTL-safe dates; financial/commerce preserved');
