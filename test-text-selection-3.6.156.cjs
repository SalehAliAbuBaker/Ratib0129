/* Ratib 3.6.156 regression: genuine editable caret/selection in account, financial and commerce fields. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const amount=fs.readFileSync('ratib-amount-edit-3.6.97.js','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
assert.doesNotMatch(sidebar,/ratibSelectField\(/);
assert.match(sidebar,/ratibPrepareEditableNumber/);
assert.match(html,/الإصدار 3\.6\.156 \(تجريبية\)/);
assert.match(sw,/v176-native-text-selection-3\.6\.156/);
assert.match(html,/ratib-amount-edit-3\.6\.97\.js\?v=3\.6\.156/);
assert.match(html,/ratib-commerce-3\.6\.131\.js\?v=3\.6\.156/);
assert.doesNotMatch(html,/ratibSelectNext/);
assert.doesNotMatch(amount,/input\.select\(\)/);
for(const source of [amount,commerce])assert.doesNotThrow(()=>new vm.Script(source));
const head=html.indexOf('class SearchableSelect {'),tail=html.indexOf('\nlet selDebitAcc',head);
assert(head>0&&tail>head);
const searchable=html.slice(head,tail);
assert.doesNotMatch(searchable,/this\.input\.select\(\)/);
assert.doesNotMatch(searchable,/this\.input\.setSelectionRange\(typedLength/);
assert.doesNotMatch(searchable,/this\._singleMatchTimer=setTimeout\(/);
assert.doesNotMatch(html,/input\.value=name;input\.focus\(\);input\.setSelectionRange\(query\.length/);
const commerceStart=commerce.indexOf('function commerceAutocomplete('),commerceEnd=commerce.indexOf('function commerceResolveProduct(',commerceStart);
assert(commerceStart>=0&&commerceEnd>commerceStart);
const commerceSuggestions=commerce.slice(commerceStart,commerceEnd);
assert.doesNotMatch(commerceSuggestions,/input\.value\s*=\s*match/);

(async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+
  '<div id="wrapDebitAcc"><input id="inpDebitAcc" type="text"><span class="searchable-arrow">▼</span><div id="dropDebitAcc" class="searchable-dropdown"></div></div>'+
  '<input id="valDebitAcc" type="hidden">'+
  '<input id="amount" type="text" inputmode="decimal" value="12,345.67">'+
  '<input id="party" type="text" value="محمد">'+
  '</body></html>',{url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.normalizeParentQuery=x=>String(x??'').trim().toLocaleLowerCase('ar');
 w.highlightText=x=>x;
 w.eval(searchable+';window.SelectTest=SearchableSelect');
 const selected=new w.SelectTest({wrapId:'wrapDebitAcc',inputId:'inpDebitAcc',dropId:'dropDebitAcc',hiddenId:'valDebitAcc'});
 const matches=[
  {id:'صندوق النقدية',text:'صندوق النقدية',accountId:'110101',group:'أصول'},
  {id:'صندوق المؤسسة',text:'صندوق المؤسسة',accountId:'110102',group:'أصول'}
 ];
 selected.setItems(matches);
 const acc=d.getElementById('inpDebitAcc');acc.focus();
 acc.value='صندوق';acc.setSelectionRange(3,3);
 acc.dispatchEvent(new w.Event('input',{bubbles:true}));
 await new Promise(r=>w.setTimeout(r,520));
 assert.equal(acc.value,'صندوق','partial query never becomes selected suggestion by timer');
 assert.equal(acc.selectionStart,3,'typing caret must not be replaced by timer');
 acc.value='صندوق النقدية';acc.setSelectionRange(3,3);
 acc.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(selected.getAccountId(),'110101','exact unique name keeps ledger account id');
 assert.equal(acc.selectionStart,3,'exact match keeps middle-of-word caret');
 acc.click();assert.notEqual(acc.selectionStart,0,'tapping selected account does not select all text');
 acc.setSelectionRange(0,5);acc.setRangeText('حساب',0,5,'end');
 acc.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(acc.value,'حساب النقدية','partial account name can be replaced');
 assert.equal(selected.getAccountId(),'','edited non-matching account must clear posted identity');
 selected.choose(matches[0]);
 assert.equal(selected.getAccountId(),'110101','suggestion can still be explicitly selected');
 w.eval(amount);
 const money=d.getElementById('amount');
 money.focus();money.setSelectionRange(3,5);
 money.click();
 assert.equal(money.selectionStart,3,'amount click preserves start of selected substring');
 assert.equal(money.selectionEnd,5,'amount click preserves end of selected substring');
 money.setRangeText('88',3,5,'end');
 money.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(money.value,'12,885.67','selected digits can be replaced inside grouped amount');
 assert.equal(money.selectionStart,5,'caret remains after replacement');
 w.eval('function commerceNormalize(s){return String(s||"").trim().toLocaleLowerCase("ar");}'+commerceSuggestions+
 ';window.commerceAutocompleteTest=commerceAutocomplete;');
 const party=d.getElementById('party');party.value='مح';party.focus();party.setSelectionRange(1,1);
 w.commerceAutocompleteTest(party,['محمد','محسن']);
 assert.equal(party.value,'مح','commerce autocomplete preserves typed text');
 assert.equal(party.selectionStart,1,'commerce suggestions preserve caret');
 assert.equal(d.getElementById(party.getAttribute('list')).options.length,2,'choices remain available in datalist');
 dom.window.close();
 console.log('PASS 3.6.156: selected subtext editing, native caret, unique account identity, amounts, commerce suggestions');
})().catch(err=>{console.error(err);process.exitCode=1;});
