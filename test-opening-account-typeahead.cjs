/* Opening account typeahead mirrors receipt/payment without mutating ledger data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('ratib-opening-account-typeahead.js','utf8');
const css=fs.readFileSync('ratib-opening-account-typeahead.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert(html.includes('ratib-opening-account-typeahead.js?v=3.6.216-opening1'));
assert(html.includes('ratib-opening-account-typeahead.css?v=3.6.216-opening1'));
assert(sw.includes('"./ratib-opening-account-typeahead.js"'));
assert(sw.includes('"./ratib-opening-account-typeahead.css"'));
assert(css.includes('.opening-account-dropdown'));
assert.doesNotThrow(()=>new Function(script));
const dom=new JSDOM('<!doctype html><body><div id="importedOpeningVoucherModal" class="modal-overlay show">'+
 '<section class="modal-content"><table><tbody id="importedOpeningRows"></tbody></table><button id="importedOpeningSave">حفظ</button></section></div></body>',
 {url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
const selectorSrc=html.slice(html.indexOf('class SearchableSelect {'),html.indexOf('\nlet selDebitAcc',html.indexOf('class SearchableSelect {')));
assert(selectorSrc.startsWith('class SearchableSelect {'));
const foldSrc=html.slice(html.indexOf('function ratibSearchFold(value){'),html.indexOf('function findSubgroupParents',html.indexOf('function ratibSearchFold(value){')));
const matchSrc=html.slice(html.indexOf('function ratibAccountSearchMatch(value,query){'),html.indexOf('// Aggregated statements',html.indexOf('function ratibAccountSearchMatch(value,query){')));
w.eval(foldSrc+'\n'+matchSrc+'\n'+selectorSrc+'\nwindow.SearchableSelect=SearchableSelect;\nfunction highlightText(value){return String(value);}');
w.eval(`
const sampleAccounts=[
 {id:'مؤسسة الرأفة',text:'مؤسسة الرأفة',accountId:'1201'},
 {id:'مدرسة الإيمان',text:'مدرسة الإيمان',accountId:'1202'},
 {id:'صندوق النقدية',text:'صندوق النقدية',accountId:'1101'}
];
var importedOpeningEdit={
 manual:true,dirty:false,busy:false,
 rows:[
  {openingBalance:{account:'',accountId:'',currency:'SAR',debit:'1250',credit:'0'}},
  {openingBalance:{account:'مدرسة الإيمان',accountId:'1202',currency:'SAR',debit:'0',credit:'1250'}}
 ]
};
function getMultiAccountItems(){return sampleAccounts;}
function buildImportedOpeningVoucher(state){return {records:state.rows.map(r=>({...r.openingBalance}))};}
function renderImportedOpeningRows(){
 const body=document.getElementById('importedOpeningRows');body.replaceChildren();
 importedOpeningEdit.rows.forEach((r,i)=>{
  const tr=document.createElement('tr'),td=document.createElement('td'),input=document.createElement('input');
  input.dataset.field='account';input.dataset.row=String(i);
  input.setAttribute('list','importedOpeningAccounts');input.value=r.openingBalance.account||'';
  input.oninput=input.onchange=()=>{importedOpeningEdit.dirty=true;r.openingBalance.account=input.value;};
  td.append(input);tr.append(td);body.append(tr);
 });
}
function closeImportedOpeningVoucher(){importedOpeningEdit=null;document.getElementById('importedOpeningVoucherModal').classList.remove('show');}
`);
w.eval(script);
w.eval('renderImportedOpeningRows()');
assert.equal(w.RatibOpeningAccountTypeahead.size(),2);
let inputs=[...d.querySelectorAll('#importedOpeningRows input[data-field="account"]')];
assert(inputs.every(el=>el.getAttribute('list')===null),'Native datalists are removed from opening entries');
assert(inputs.every(el=>el.getAttribute('role')==='combobox'),'Opening entries use cash searchable combobox');
assert(inputs.every(el=>el.closest('.opening-account-wrap')),'Opening field is wrapped like receipt/payment');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.debit'),'1250','Amount is not modified');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.currency'),'SAR','Currency is not modified');
assert.equal(d.querySelectorAll('.opening-account-dropdown').length,2,'Two portals per two entries');
assert(![...d.querySelectorAll('.opening-account-dropdown')].some(p=>p.parentElement===d.body),'Portal stays within active modal');
inputs[0].focus();
assert(!d.getElementById('openingAccountDrop_0').classList.contains('open'),'Empty focus does not cover keyboard');
inputs[0].value='مؤسسه';
inputs[0].dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
const drop=d.getElementById('openingAccountDrop_0');
assert(drop.classList.contains('open'),'Typing opens live suggestions');
assert(drop.textContent.includes('مؤسسة الرأفة'),'Arabic ة / ه equivalence');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.account'),'','Incomplete input is not a saved account');
drop.querySelector('.searchable-item').click();
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.account'),'مؤسسة الرأفة','Selection commits canonical name');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.accountId'),'1201','Selection retains account code');
assert.equal(inputs[0].value,'مؤسسة الرأفة','Chosen label remains in financial entry');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.debit'),'1250','Selection does not touch amount');
assert.equal(w.eval('importedOpeningEdit.rows[1].openingBalance.account'),'مدرسة الإيمان','Other row is unchanged');
inputs[1].value='1202';
inputs[1].dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
assert(d.getElementById('openingAccountDrop_1').textContent.includes('مدرسة الإيمان'),'Account code lookup works');
const arrow=d.querySelector('#openingAccountWrap_0>.searchable-arrow');
arrow.click();
assert(drop.classList.contains('open'),'Arrow opens complete list');
let escaped=0;d.getElementById('importedOpeningVoucherModal').addEventListener('keydown',e=>{if(e.key==='Escape')escaped++;});
inputs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(escaped,0,'First Escape closes suggestions, not voucher');
assert(!drop.classList.contains('open'));
inputs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(escaped,1,'Second Escape reaches existing voucher close flow');
// A leaf created after the editor was opened must appear immediately and
// be bound to its numeric account ID before the real save validator runs.
w.eval("getMultiAccountItems().push({id:'حساب أنشئ حديثا',text:'حساب أنشئ حديثا',accountId:'1204'});");
inputs[0].value='حساب أنشئ حديثا';
inputs[0].dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
assert(drop.textContent.includes('حساب أنشئ حديثا'),'New leaf is searchable without closing the editor');
const newChoice=[...drop.querySelectorAll('.searchable-item')].find(el=>el.textContent.includes('حساب أنشئ حديثا'));
assert(newChoice,'Fresh account has a selectable result');
newChoice.click();
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.accountId'),'1204');
w.eval("importedOpeningEdit.rows[0].openingBalance.accountId='';");
const saved=w.eval('buildImportedOpeningVoucher(importedOpeningEdit,{}).records');
assert.equal(saved[0].account,'حساب أنشئ حديثا');
assert.equal(saved[0].accountId,'1204','Save validation gets the canonical ID despite a stale draft');
w.eval("importedOpeningEdit.rows.push({openingBalance:{account:'',currency:'YER',debit:'10',credit:'0'}});renderImportedOpeningRows();");
assert.equal(w.RatibOpeningAccountTypeahead.size(),3,'Adding rows initializes the same autocomplete');
assert.equal(d.querySelectorAll('.opening-account-dropdown').length,3,'Re-render removes detached dropdowns');
w.eval('closeImportedOpeningVoucher()');
assert.equal(d.querySelectorAll('.opening-account-dropdown').length,0,'Closing releases popup nodes and listeners');
assert.equal(w.RatibOpeningAccountTypeahead.size(),0);
w.close();
console.log('PASS opening: Arabic/code typeahead, selection retention, safe drafts, keyboard, Escape, add/remove, cleanup');
