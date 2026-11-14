'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const css=fs.readFileSync('ratib-receipt-payer-3.6.115.css','utf8');
const ui=fs.readFileSync('ratib-ui-v3.6.37.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.196');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.196","build":"p19600"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.196","build":"p19600"'));
assert(sw.includes('v260-opening-mobile-clean-3.6.139'));
assert(html.includes('ratib-receipt-payer-3.6.115.css?v=3.6.139'));
assert(css.includes('/* 3.6.127: one shared account-card geometry for receipt and payment.'));
const sourceStyle=css.slice(css.indexOf('/* 3.6.127: one shared account-card geometry'));
assert(sourceStyle.includes('display:grid!important'),'Receipt uses grid, not nowrap flex');
assert(sourceStyle.includes('grid-template-columns:minmax(0,1fr) 40px!important'),'Account has flexible column and fixed lock column');
assert(sourceStyle.includes('grid-template-rows:minmax(44px,auto) auto!important'),'Balance has its own row');
for(const term of ['> #ratibLockSource','grid-column:2!important','grid-row:1!important',
                   '> .ratib-multi-source-balance','grid-column:1/-1!important',
                   'grid-row:2!important','[hidden]','display:none!important']){
 assert(sourceStyle.includes(term),'Required receipt layout rule: '+term);
}
assert(sourceStyle.includes('max-width:380px'),'Very narrow screens retain the lock within the card');
assert(!sourceStyle.includes('getCurrentAccountBalance('),'No accounting logic in receipt CSS');
const start=ui.indexOf('function repaintMultiBalances(){');
const end=ui.indexOf('\nfunction main(){',start);
assert(start>=0&&end>start,'Use the original shared account balance renderer');
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
 '<div id="multiVoucherCard" class="spend-voucher receipt-voucher">'+
 '<div class="multi-voucher-grid">'+
 '<div class="multi-voucher-source-row" id="source">'+
 '<div class="searchable-select-wrap"><input id="inpMultiSourceAcc" value="صندوق المؤسسة"></div>'+
 '<button id="ratibLockSource" type="button">قفل</button>'+
 '</div></div><select id="multiVoucherBaseCurrency"><option value="YER">ريال يمني</option></select>'+
 '<table><tbody id="multiVoucherLinesBody"></tbody></table></div></body></html>',
 {url:'https://example.org',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval("var accountName='صندوق المؤسسة';var multiSourceAcc={getValue(){return accountName}};"+
 "function available(){return true};function accountBalance(name,currency){return {label:'الرصيد الحالي: 1,275,400 '+currency+' (دائن)'}};");
w.eval(ui.slice(start,end));
const source=d.getElementById('source'),field=d.getElementById('inpMultiSourceAcc'),lock=d.getElementById('ratibLockSource');
let clicked=0;lock.addEventListener('click',()=>clicked++);
w.repaintMultiBalances();
const hint=source.querySelector(':scope > .ratib-multi-source-balance');
assert(hint,'Original balance renderer adds source hint');
assert.equal(hint.textContent,'الرصيد الحالي: 1,275,400 YER (دائن)');
assert(!hint.hidden,'Balance is visible when account selected');
assert.equal(hint.parentElement,source,'Balance remains inside original source row');
assert.equal(source.querySelectorAll('#ratibLockSource').length,1,'Only one lock button');
assert.equal(source.querySelectorAll('.ratib-multi-source-balance').length,1,'Only one balance hint');
assert.equal(field.value,'صندوق المؤسسة','Original account input unchanged');
lock.click();assert.equal(clicked,1,'Original lock click listener works');
w.eval("accountName=''");
w.repaintMultiBalances();
assert.equal(hint.hidden,true,'Balance hides when account cleared');
w.eval("accountName='صندوق المؤسسة'");
w.repaintMultiBalances();
assert.equal(hint.hidden,false,'Balance returns for selected account');
assert.equal(source.querySelectorAll('.ratib-multi-source-balance').length,1,'No duplicated balance across renders');
console.log('PASS 3.6.127: receipt source lock within two-column grid and original account balance beneath');
w.close();
