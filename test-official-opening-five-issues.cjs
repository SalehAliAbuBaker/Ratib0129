'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-cash-actions-3.6.135.css','utf8');
function section(from,to){
 const start=html.indexOf(from),end=html.indexOf(to,start);
 assert(start>=0&&end>start,'Source section not found: '+from);
 return html.slice(start,end);
}
const amount=new Function(section('function openingDisplayAmount(','function openingFormRate(')+';return openingDisplayAmount;')();
for(const [value,expected] of [
 ['1571','1,571'],['1000000.75','1,000,000.75'],['١٬٥٧١','1,571'],
 ['1234567.123456','1,234,567.123456'],['0','0'],['1,571','1,571'],
 ['not-a-number','not-a-number']
])assert.equal(amount(value),expected,value);
const next=new Function('getAllTransactions',section('function nextManualOpeningVoucherNumber(','function openManualOpeningVoucher(')+';return nextManualOpeningVoucherNumber;')(()=>[]);
assert.equal(next([]),1);
assert.equal(next([
 {seqNum:900,isOpeningBalance:false},{seqNum:77,isOpeningBalance:true,isManualOpeningBalance:false},
 {seqNum:8,isOpeningBalance:true,isManualOpeningBalance:true,status:'posted'},
 {seqNum:99,isOpeningBalance:true,isManualOpeningBalance:true,status:'deleted'}
]),9,'Only active manual opening vouchers advance their own sequence');
assert(html.includes('value=String(nextManualOpeningVoucherNumber())'));
assert(html.includes('t.isManualOpeningBalance&&importedOpeningKey(t)!==state.key'),'Manual opening collision guard is separate');
assert(html.includes("el.value=openingDisplayAmount(o[key]||'0')"),'Manual line inputs use display-only separators');
assert(html.includes('el.addEventListener(\'focus\''),'Manual amounts return to raw editing format');
assert(html.includes('openingDisplayAmount(o[baseKey])'),'Equivalent also groups by thousands');
assert(html.includes('openingDisplayAmount(o.baseDebit),openingDisplayAmount(o.baseCredit)'),'Printed and shared detail totals grouped');
assert(html.includes('[190,90,115,115,90,130,130,170]'),'PDF currency columns widened');
assert(css.includes('#printPreviewBody>.ratib-opening-preview-paper'),'Preview is a distinct horizontally scrollable paper');
assert(css.includes('touch-action:pan-x pan-y pinch-zoom'),'Opening preview can pan and pinch');
assert(css.includes('body.printing-voucher #printVoucherContainer #pvTableBox .pv-table'),'Native print has currency wrapping fix');
const document=new JSDOM('<body><div id="importedOpeningVoucherModal"><button id="importedOpeningPreview"></button></div><div id="printPreviewModal"><div id="printPreviewBody"></div><button id="printPreviewConfirmBtn"></button><button id="printPreviewCancelBtn"></button></div><div id="importedOpeningError"></div></body>').window.document;
const calls={printed:0,closed:0};
const context={
 document,importedOpeningEdit:{manual:true},legacyCurrentData:()=>({}),
 buildImportedOpeningVoucher:()=>({records:[{seqNum:1}]}),importedOpeningPrint:()=>{},
 openPrintPreview:()=>{document.getElementById('printPreviewBody').innerHTML='<section id="mock-paper">Opening</section>';},
 getComputedStyle:()=>({zIndex:'9999'}),activateRatibOverlay:()=>{},
 closeImportedOpeningPreview:()=>{calls.closed++},
 printRatibDocument:()=>{calls.printed++},
 console
};
vm.createContext(context);
vm.runInContext(section('function outputImportedOpeningEditor(','const importedOpeningLaunch='),context);
context.outputImportedOpeningEditor('preview');
assert.equal(document.getElementById('printPreviewModal').parentElement,document.body,'Preview moved above all nested app layers');
assert.equal(document.querySelectorAll('.ratib-opening-preview-paper').length,1);
assert(document.querySelector('.ratib-opening-preview-paper #mock-paper'),'Preview includes all paper content');
document.getElementById('printPreviewConfirmBtn').click();
assert.deepEqual(calls,{printed:1,closed:1},'Print handler works after preview');
context.outputImportedOpeningEditor('preview');
document.getElementById('printPreviewCancelBtn').click();
assert.deepEqual(calls,{printed:1,closed:2},'Cancel closes preview without printing');
console.log('PASS opening voucher: independent sequence, grouped amounts, preview interaction, PDF and print currency layout');
