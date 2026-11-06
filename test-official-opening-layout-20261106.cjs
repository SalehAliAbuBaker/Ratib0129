'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-cash-actions-3.6.135.css','utf8');
const grab=(from,to)=>{
 const start=html.indexOf(from),end=html.indexOf(to,start);
 assert(start>0&&end>start,'Unable to isolate '+from);
 return html.slice(start,end);
};
const dom=new JSDOM('<body><div id="importedOpeningVoucherModal"><h2 id="importedOpeningTitle"></h2><p id="importedOpeningDescription"></p><div id="openingHeader"><input id="importedOpeningHeaderDate" type="date"><span id="openingDateHijri"></span></div><table><tbody id="importedOpeningRows"></tbody></table><button id="importedOpeningAdd"></button><div id="importedOpeningTotals"></div><div id="actions"><button id="importedOpeningSave"></button><button id="importedOpeningPreview"></button><button id="importedOpeningClose"></button></div></div></body>');
const document=dom.window.document;
const row=(account,side)=>({id:'',isoDate:'2026-11-06',_openingSide:side,openingBalance:{
 account,currency:'YER',baseCurrency:'YER',
 debit:side==='debit'?'1571':'0',credit:side==='credit'?'1571':'0',
 baseDebit:side==='debit'?'1571':'0',baseCredit:side==='credit'?'1571':'0',
 sourceRef:'إدخال يدوي',note:'تجربة'
}});
const state={manual:true,rows:[row('Cash','debit'),row('Capital','credit')],busy:false,dirty:false};
const ctx={document,importedOpeningEdit:state,
 trialNumber:x=>String(x),esc:x=>String(x),
 importedRecordCurrencies:()=>['YER','USD'],
 openingDisplayAmount:x=>String(x),
 openingFormConvert:(r)=>{if(r.openingBalance.currency===r.openingBalance.baseCurrency){
  r.openingBalance.baseDebit=r.openingBalance.debit;
  r.openingBalance.baseCredit=r.openingBalance.credit;
 }},
 getLocalTodayISO:()=> '2026-11-06',renderImportedOpeningTotals:()=>{},
 console,Set,Number,String,Date};
vm.createContext(ctx);
vm.runInContext(grab('function setOpeningEditorTitle(manual){','function newManualOpeningLine('),ctx);
ctx.setOpeningEditorTitle(true);
assert.equal(document.getElementById('importedOpeningAdd').parentElement.id,'actions','Add is adjacent to Save and Close in manual mode');
ctx.setOpeningEditorTitle(false);
assert.equal(document.getElementById('importedOpeningAdd').nextElementSibling.id,'importedOpeningTotals','Imported editor keeps the old Add position');
ctx.setOpeningEditorTitle(true);
vm.runInContext(grab('function openingFormDecorate(){','function importedOpeningExactTotals('),ctx);
ctx.renderImportedOpeningRows();
let first=document.querySelector('#importedOpeningRows>tr');
assert(first.classList.contains('opening-debit'),'Debit card retains color mode');
assert(!first.classList.contains('opening-foreign'),'Base YER never opens valuation inputs by default');
let switcher=first.querySelector('.opening-side .opening-side-choices');
assert.deepEqual([...switcher.children].map(x=>x.textContent.trim()),['مدين','دائن','×'],'Three controls share one row');
assert(first.querySelector('.opening-delete-cell').hasAttribute('hidden'),'Original blank delete cell has no extra row');
assert(first.querySelector('td:nth-child(10)>input[data-field="note"]'),'Optional note remains after controls');
let currency=first.querySelector('select[data-field="currency"]');
currency.value='USD';
currency.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
first=document.querySelector('#importedOpeningRows>tr');
assert(first.classList.contains('opening-foreign'),'Foreign currency reveals valuation');
assert.equal(first.querySelector('select[data-field="baseCurrency"]').value,'YER','Evaluation currency retained');
assert(first.querySelector('.opening-fx input[aria-label="سعر الصرف"]'),'Rate is available');
assert(first.querySelector('input[data-field="sourceRef"]'),'Exchange source is available');
assert.equal(state.rows[0].openingBalance.sourceRef,'','Old local reference is cleared when entering foreign currency');
currency=first.querySelector('select[data-field="currency"]');
currency.value='YER';
currency.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
first=document.querySelector('#importedOpeningRows>tr');
assert(!first.classList.contains('opening-foreign'),'Returning to YER hides all FX fields');
assert.equal(state.rows[0].openingBalance.baseDebit,state.rows[0].openingBalance.debit,'Local valuation tracks the original amount');
first.querySelector('.opening-inline-delete').click();
assert.equal(state.rows.length,1,'X deletes only the unsaved entire line');
assert.equal(state.rows[0].openingBalance.account,'Capital','Other entries remain unchanged');
for(const token of [
 'grid-template-columns:repeat(6,minmax(0,1fr))',
 'grid-column:1/span 2!important;grid-row:3',
 'grid-column:3/span 2!important;grid-row:3',
 'grid-column:5/span 2!important;grid-row:3',
 'grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px',
 'grid-column:1/-1!important;grid-row:4',
 'grid-column:1/-1!important;grid-row:5',
 'td.opening-delete-cell',
 'tr:not(.opening-foreign)>.opening-fx'
])assert(css.includes(token),'Missing balanced responsive style: '+token);
console.log('PASS 2026-11-06 manual opening: YER hides FX, USD shows three fields, controls centered above note, Add with Save/Close, deletion scoped to draft');
