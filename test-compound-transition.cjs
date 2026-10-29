const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('test-journal-layout-3.6.90.cjs','utf8');
const fixture=source.match(/const fixture=`([\s\S]*?)`;/)[1];
const dom=new JSDOM(fixture,{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.multiVoucherMode='entry';w.ratibOrderDocumentAccounts=()=>{};
w.eval(fs.readFileSync('ratib-cash-layout-3.6.83.js','utf8'));
w.eval(fs.readFileSync('ratib-journal-layout-3.6.90.js','utf8'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
(async()=>{
 const card=d.getElementById('multiVoucherCard'),date=d.getElementById('multiVoucherDate'),original=date.value;
 for(let i=0;i<4;i++){
  w.multiVoucherMode='spend';card.classList.add('spend-voucher');w.ratibOrderDocumentAccounts();await new Promise(r=>setTimeout(r,5));
  w.multiVoucherMode='entry';card.classList.remove('spend-voucher');w.ratibOrderDocumentAccounts();await new Promise(r=>setTimeout(r,5));
  assert(date.closest('h2'),'Date stays in compound header');
  for(const id of ['multiVoucherBeneficiary','multiVoucherParty']){const el=d.getElementById(id);if(el)assert(el.closest('.multi-voucher-grid'),id+' remains in grid');}
  assert(!d.querySelector('h2 #multiVoucherBeneficiary'),'No beneficiary in header');assert.equal(date.value,original);
  assert.equal(d.querySelectorAll('#multiVoucherDate').length,1);
 }
 console.log('PASS 4 cash/compound round trips: date, beneficiary, party, values and single controls');
})().catch(e=>{console.error(e);process.exitCode=1});
