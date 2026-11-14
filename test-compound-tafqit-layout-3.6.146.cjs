'use strict';
/* 3.6.148: live amount-in-words occupies a dedicated compound grid row. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const ui=fs.readFileSync('ratib-ui-v3.6.37.js','utf8');
const css=fs.readFileSync('ratib-compound-layout-3.6.142.css','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.199');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.199","build":"p19800"'));
assert(worker.includes('compound-compact-auto-signature-tafqit-cash-reference-amount-currency-compound-ref-simple-ref-totals-cash-colors-cash-preview-return-3.6.162'));
const match=ui.match(/function repaintMultiBalances\(\)\{[\s\S]*?\n\}\nfunction main\(\)/);
assert(match,'Preserve the original rendering function');
assert(css.includes('td.ratib-cmp-tafqit-cell[hidden]'),'No blank row for empty amounts');
assert(css.includes('ratib-cmp-first.ratib-cmp-has-tafqit'),'First-party grid rows must shift');
assert(css.includes('ratib-cmp-counter.ratib-cmp-has-tafqit'),'Counterparty grid rows must shift');
assert(css.includes('ratib-cmp-foreign.ratib-cmp-has-tafqit'),'Foreign currency must still have a rate row');
assert(css.includes('@media print'),'Existing printed voucher layout must be isolated');
const row=(amount,currency)=>'<tr><td><select class="multi-line-side"></select></td>'+
 '<td><select class="multi-line-account" data-index="0"><option value="">اختر</option></select></td>'+
 '<td><select class="multi-line-budget"></select></td><td><input class="multi-line-note"></td>'+
 '<td><select class="multi-line-currency"><option selected value="'+currency+'">'+currency+'</option></select></td>'+
 '<td><input class="multi-line-amount" data-index="0" value="'+amount+'"></td>'+
 '<td><input class="multi-line-rate"></td><td class="multi-line-base"></td>'+
 '<td><input class="multi-line-notes"></td><td><button class="multi-remove-line">x</button></td></tr>';
function fixture(cash,amount='12522281',currency='YER'){
 const nestedSource=cash?'<div class="multi-voucher-source-row"></div>':'';
 const externalSource=cash?'':'<div class="multi-voucher-source-row"></div>';
 const dom=new JSDOM('<!doctype html><html><body><div id="multiVoucherCard" class="'+(cash?'spend-voucher':'ratib-cmp-layout142')+'">'+
  '<div class="multi-voucher-grid"><select id="multiVoucherBaseCurrency"><option value="YER">YER</option></select>'+
  nestedSource+'</div>'+externalSource+
  '<table><tbody id="multiVoucherLinesBody">'+row(amount,currency)+'</tbody></table></div></body></html>',
  {url:'https://ratib.test/',runScripts:'outside-only'});
 const w=dom.window;
 w.eval('var multiVoucherLines=[{account:"",amount:"'+amount+'",currency:"'+currency+'"}];'+
  'function available(){return true;}'+
  'function smallHint(host){if(!host)return null;let x=host.querySelector("small.ratib-current-balance");'+
  'if(!x){x=document.createElement("small");x.className="ratib-current-balance";host.append(x);}return x;}'+
  'function getCleanNumber(s){return Number(String(s).replace(/,/g,""));}'+
  'function tafqitAccountCurrency(v,c){return "قيمة مطولة "+v+" "+c+" وبكلمات كثيرة ينبغي أن تبقى في سطر منفصل";}'+
  'function accountBalance(){return null;}'+match[0].replace(/\nfunction main\(\)$/, '') );
 return {w,dom,card:w.document.querySelector('#multiVoucherCard'),tr:w.document.querySelector('tr')};
}
const a=fixture(false);
assert.equal(a.card.querySelector('.multi-voucher-source-row').closest('.multi-voucher-grid'),null,
 'Compound reference-account row is actually OUTSIDE the legacy grid');
a.w.eval('repaintMultiBalances()');
const words=a.tr.querySelector(':scope > td.ratib-cmp-tafqit-cell');
assert(words&&!words.hidden,'Separate tafqit cell must exist');
assert.equal(a.tr.querySelectorAll('.ratib-line-tafqit').length,1,'Exactly one tafqit');
assert.equal(a.tr.querySelector('td:nth-child(6)>.ratib-line-tafqit'),null,'No amount-cell overflow');
assert(a.tr.classList.contains('ratib-cmp-has-tafqit'));
assert(words.textContent.includes('12522281 YER'),'Original currency and amount kept');
a.w.eval('repaintMultiBalances()');
assert.equal(a.tr.querySelectorAll('td.ratib-cmp-tafqit-cell').length,1,'Idempotent rendering');
a.tr.querySelector('.multi-line-amount').value='0';a.w.eval('repaintMultiBalances()');
assert(words.hidden&&!a.tr.classList.contains('ratib-cmp-has-tafqit'),'No empty reserved grid row');
const old=fixture(false,'12522281','YER');
const originalWords=old.w.document.createElement('small');
originalWords.className='ratib-line-tafqit';
old.tr.querySelector('td:nth-child(6)').appendChild(originalWords);
old.w.eval('repaintMultiBalances()');
assert.equal(old.tr.querySelector('td.ratib-cmp-tafqit-cell > .ratib-line-tafqit'),originalWords,
 'The existing words node must MOVE from the amount, never be copied');
assert.equal(old.tr.querySelector('td:nth-child(6) > .ratib-line-tafqit'),null);
const fx=fixture(false,'1000','SAR');fx.w.eval('repaintMultiBalances()');
assert(fx.tr.querySelector('td.ratib-cmp-tafqit-cell').textContent.includes('SAR'),'Foreign currency tafqit preserved');
const cash=fixture(true);cash.w.eval('repaintMultiBalances()');
assert.equal(cash.tr.querySelectorAll('td.ratib-cmp-tafqit-cell').length,0,'Cash mode untouched');
assert(cash.tr.querySelector('td:nth-child(6)>.ratib-line-tafqit')?.hidden,'Cash caption stays hidden as before');
console.log('PASS 3.6.148 separate compound tafqit, balance, foreign, empty and cash isolation');
