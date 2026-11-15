/* Regression: the opening editor's calculator, voice input and amount width. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-opening-account-typeahead.css','utf8');
const source=fs.readFileSync('ratib-opening-account-typeahead.js','utf8');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
assert.doesNotThrow(()=>new Function(source));
assert.match(css,/#financialCalculatorModal\.show\s*\{\s*z-index:100320!important/);
assert.match(css,/>td:nth-child\(2\)\{\s*grid-column:1\/span 2!important/);
assert.match(css,/>td:nth-child\(3\),\s*#importedOpeningVoucherModal[^\n]+>td:nth-child\(4\)\{\s*grid-column:3\/span 4!important/);
assert.match(css,/\.financial-calc-trigger\{\s*display:inline-flex!important/);
assert(source.includes('scopeVoiceButton(modal,true)'),'Voice mic should be a child of the active editor');
assert(source.includes('scopeVoiceButton(modal,false)'),'Mic must return to document body on closing');
assert(source.includes("input.dataset.precision='6'"),'Opening calculator keeps six-decimal accounting precision');

const calcBegin=html.indexOf('function financialDecimalText(value){');
const calcEnd=html.indexOf('function trialTransactionLegs(',calcBegin);
assert(calcBegin>0&&calcEnd>calcBegin);
const calcSource=html.slice(calcBegin,calcEnd);
assert.doesNotThrow(()=>new Function(calcSource));
const selectorBegin=html.indexOf('class SearchableSelect {');
const selectorEnd=html.indexOf('\nlet selDebitAcc',selectorBegin);
const selectSource=html.slice(selectorBegin,selectorEnd);
const foldBegin=html.indexOf('function ratibSearchFold(value){');
const foldEnd=html.indexOf('function findSubgroupParents',foldBegin);
const matchBegin=html.indexOf('function ratibAccountSearchMatch(value,query){');
const matchEnd=html.indexOf('// Aggregated statements',matchBegin);
assert(selectorBegin>0&&selectorEnd>selectorBegin&&foldBegin>0&&matchBegin>0);

const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
 '<div id="pageSettings"></div>'+
 '<div id="financialCalculatorModal" class="modal-overlay">'+
 '<input id="financialCalcExpression"><output id="financialCalcResult"></output>'+
 '<span id="financialCalcPrecision"></span><button id="financialCalcClose">إغلاق</button>'+
 '<button id="financialCalcUse">اعتماد</button>'+
 '<button data-calc-key="clear">C</button><button data-calc-key="4">4</button>'+
 '<button data-calc-key="+">+</button><button data-calc-key="3">3</button></div>'+
 '<div id="importedOpeningVoucherModal" class="modal-overlay opening-manual show">'+
 '<section class="modal-content"><table><tbody id="importedOpeningRows"></tbody></table></section>'+
 '</div></body></html>',{
  url:'https://ratib.example/',runScripts:'outside-only',pretendToBeVisual:true
 });
const w=dom.window,d=w.document;
w.localStorage.setItem('ratib.voice.visible.v1','true');
let listening=0;
const engines=[];
w.SpeechRecognition=function(){const engine={start(){listening++;},stop(){this.onend?.();}};engines.push(engine);return engine;};
w.eval(voice);
w.eval(html.slice(foldBegin,foldEnd)+'\n'+html.slice(matchBegin,matchEnd)+'\n'+selectSource+'\nwindow.SearchableSelect=SearchableSelect;\nfunction highlightText(value){return String(value);}');
w.eval(`
var importedOpeningEdit={
 manual:true,dirty:false,busy:false,
 rows:[{openingBalance:{account:'',accountId:'',currency:'SAR',debit:'1234.5',credit:'0',note:''}},
       {openingBalance:{account:'',accountId:'',currency:'SAR',debit:'0',credit:'1234.5',note:''}}]
};
function getMultiAccountItems(){return [
 {id:'صندوق النقدية',text:'صندوق النقدية',accountId:'101'},
 {id:'مؤسسة الرأفة',text:'مؤسسة الرأفة',accountId:'102'}
];}
function renderImportedOpeningRows(){
 const body=document.getElementById('importedOpeningRows');
 body.replaceChildren();
 importedOpeningEdit.rows.forEach((r,index)=>{
  const tr=document.createElement('tr');
  for(const key of ['account','currency','debit','credit','note']){
   const td=document.createElement('td'),el=document.createElement(key==='currency'?'select':'input');
   el.dataset.field=key;el.dataset.row=index;
   if(key==='currency')el.innerHTML='<option value="SAR">SAR</option><option value="YER">YER</option>';
   if(key==='debit'||key==='credit')el.inputMode='decimal';
   el.value=r.openingBalance[key]||'';
   el.oninput=el.onchange=()=>{importedOpeningEdit.dirty=true;r.openingBalance[key]=el.value;};
   td.append(el);tr.append(td);
  }
  body.append(tr);
 });
}
function closeImportedOpeningVoucher(){
 importedOpeningEdit=null;
 document.getElementById('importedOpeningVoucherModal').classList.remove('show');
}
function activateRatibOverlay(modal){modal.removeAttribute('inert');}
function releaseRatibOverlay(){}
function pushAppHistoryState(){}
`);
w.eval(calcSource);
w.eval(source);
w.eval('initFinancialTools()');
w.eval('renderImportedOpeningRows()');
const modal=d.getElementById('importedOpeningVoucherModal');
const mic=d.getElementById('ratibVoiceButton');
assert.equal(mic.parentNode,modal,'Mic is interactive inside opening modal (not an inert body sibling)');
assert.equal(w.RatibOpeningAccountTypeahead.size(),2,'Every opening account row uses smart search');

const amount=d.querySelector('#importedOpeningRows input[data-row="0"][data-field="debit"]');
const amountWrap=amount.closest('.financial-number-field');
assert(amountWrap,'Financial enhancer wraps opening amount');
const trigger=amountWrap.querySelector('.financial-calc-trigger');
assert(trigger,'Opening amount has a working calculator action');
assert.equal(amount.dataset.precision,'6');
trigger.click();
const calc=d.getElementById('financialCalculatorModal');
assert(calc.classList.contains('show'),'Calculator opens over opening voucher');
const expression=d.getElementById('financialCalcExpression');
expression.value='4+3';
expression.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(d.getElementById('financialCalcResult').textContent,'7.000000');
d.getElementById('financialCalcUse').click();
assert(!calc.classList.contains('show'),'Use closes calculator and returns to voucher');
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.debit'),'7.000000','Calculator applies result to the correct debit');
assert.equal(w.eval('importedOpeningEdit.rows[1].openingBalance.credit'),'1234.5','Other opening leg remains untouched');

amount.focus();
mic.click();
assert.equal(listening,1,'Voice recognizer starts for focused amount');
engines.at(-1).onresult({resultIndex:0,results:[{0:{transcript:'خمسة آلاف'},isFinal:true}]});
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.debit'),'5000','Spoken Arabic amount updates only focused debit');
mic.click();

const name=d.querySelector('#importedOpeningRows input[data-row="1"][data-field="account"]');
name.focus();mic.click();assert.equal(listening,2,'Voice recognizer starts for account name');
engines.at(-1).onresult({resultIndex:0,results:[{0:{transcript:'مؤسسة الرأفة'},isFinal:true}]});
assert.equal(w.eval('importedOpeningEdit.rows[1].openingBalance.account'),'مؤسسة الرأفة','Exact spoken account is resolved by autocomplete');
assert.equal(w.eval('importedOpeningEdit.rows[1].openingBalance.accountId'),'102','Spoken account retains canonical account ID');
mic.click();

const note=d.querySelector('#importedOpeningRows input[data-row="0"][data-field="note"]');
note.focus();mic.click();assert.equal(listening,3,'Voice recognizer starts for note');
engines.at(-1).onresult({resultIndex:0,results:[{0:{transcript:'رصيد افتتاحي'},isFinal:true}]});
assert.equal(w.eval('importedOpeningEdit.rows[0].openingBalance.note'),'رصيد افتتاحي','Text speech targets the chosen note only');
mic.click();

w.eval('renderImportedOpeningRows()');
assert.equal(mic.parentNode,modal,'Mic remains within editor after changing or adding rows');
assert.equal(d.querySelectorAll('.opening-account-dropdown').length,2,'Re-render does not leak account suggestions');
w.eval('closeImportedOpeningVoucher()');
assert.equal(mic.parentNode,d.body,'Closing returns global microphone to its original body scope');
assert.equal(w.RatibOpeningAccountTypeahead.size(),0,'Closing removes all dynamic account selectors');
// The real financial enhancer and voice module both queue animation/mutation
// callbacks. Leave jsdom alive for those microtasks; closing synchronously
// makes jsdom's own requestAnimationFrame access a destroyed Window location.
console.log('PASS opening input tools: calculator apply, six decimals, account/amount/note speech, modal lifecycle and amount width');
