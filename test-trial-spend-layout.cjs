'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert(!html.includes('ratib-trial-spend-layout.js?v='),'Payment-only DOM relocation disabled');
assert(!html.includes('ratib-trial-spend-layout.css?v='),'Payment-only styling disabled');
assert(!sw.includes('"./ratib-trial-spend-layout.js"')&&!sw.includes('"./ratib-trial-spend-layout.css"'));
assert(html.includes('id="ratib-trial-cash-parity"'),'Old multiline notes remain editable');
assert(html.includes("multiVoucherMode==='spend'?ratibCashAccountItems(items):items"));
assert(html.includes("mode==='spend'?ratibCashAccountItems(all):all"));
assert(html.includes('return all.length?all:(multiSourceAcc?.items||[])'),'Counterpart accounts are unfiltered');
assert(html.includes('في سند الصرف يجب اختيار حساب دائن من الصناديق أو البنوك فقط.'));
assert(html.includes("multiVoucherMode==='spend'&&headerSide!=='credit"));
assert(html.includes('textarea aria-label="البيان العام للمدين'),'Existing multiline payment notes preserved');
assert(!html.includes('ratib-spend-layout-on'),'Shared cash voucher uses native receipt layout');
const start=html.indexOf('function ratibCashAccountItems(items){'),end=html.indexOf('\nfunction multiCurrencyLabel(',start);
assert(start>0&&end>start,'Cash classifier exists');
const accounts=[
 {mainCode:'1',main:'الأصول',group:'الأصول المتداولة',sub:'النقدية وما في حكمها',subCode:'1101',details:[['110101','صندوق النقدية الرئيسي'],['110102','حساب البنك الجاري']]},
 {mainCode:'1',main:'الأصول',group:'الأصول المتداولة',sub:'العملاء والمدينون',subCode:'1102',details:[['110201','عميل نقدي'],['110202','بنك أمان فرعي']]},
 {mainCode:'2',main:'الالتزامات',group:'التزامات غير متداولة',sub:'قروض',subCode:'2201',details:[['220101','قرض بنكي']]},
 {mainCode:'1',main:'الأصول',group:'الأصول المتداولة',sub:'حسابات بنكية',subCode:'1199',details:[['119901','الحساب الجاري الجديد']]}
];
const all=accounts.flatMap(x=>x.details.map(([code,name])=>({id:name,text:name,accountId:code})));
const classify=new Function('getCanonicalCatalog','normalizeParentQuery',html.slice(start,end)+';return ratibCashAccountItems;')(()=>accounts,x=>String(x||'').toLowerCase());
assert.deepEqual(classify(all).map(x=>x.id),['صندوق النقدية الرئيسي','حساب البنك الجاري','بنك أمان فرعي','الحساب الجاري الجديد']);
const dom=new JSDOM(html),d=dom.window.document,c=d.getElementById('multiVoucherCard');
for(const id of ['multiVoucherDate','multiVoucherBaseCurrency','multiVoucherBeneficiary','multiVoucherNote','inpMultiSourceAcc','multiVoucherLinesBody','commitMultiVoucherBtn'])assert(c.contains(d.getElementById(id)),id+' must stay in the shared cash form');
dom.window.close();
console.log('PASS trial: native receipt layout in payment, credit cash/banks only, counterpart unrestricted and narration preserved');
