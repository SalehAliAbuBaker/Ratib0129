/* Ratib 3.6.159 regression: genuine editable caret/selection in account, financial and commerce fields. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const amount=fs.readFileSync('ratib-amount-edit-3.6.97.js','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
assert.doesNotMatch(sidebar,/ratibSelectField\(/);
assert.match(sidebar,/ratibPrepareEditableNumber/);
assert.match(sidebar,/function ratibSelectInitialValue/,'first tap selects all editable text');
assert.match(sidebar,/document\.activeElement!==el/,'second tap may place caret freely');
const trial=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert(trial,'A unified trial release is required');
assert(sw.includes('const APP_RELEASE={"version":"'+trial+'"'),'Worker and page must match');
assert(html.includes('الإصدار '+trial+' (تجريبية)'),'Visible release should match trial');
assert(sw.includes(trial),'Offline cache should mention current release');
assert(html.includes('ratib-amount-edit-3.6.97.js?v=3.6.158'),'Amount-edit asset kept unchanged');
assert(html.includes('ratib-commerce-3.6.131.js?v='+trial),'Commerce query must reflect current release');
assert.doesNotMatch(html,/ratibSelectNext/);
assert.doesNotMatch(amount,/input\.select\(\)/);
for(const source of [amount,commerce])assert.doesNotThrow(()=>new vm.Script(source));
const head=html.indexOf('class SearchableSelect {'),tail=html.indexOf('\nlet selDebitAcc',head);
assert(head>0&&tail>head);
const searchable=html.slice(head,tail);
assert.doesNotMatch(searchable,/this\.input\.select\(\)/);
assert.doesNotMatch(searchable,/this\.input\.setSelectionRange\(typedLength/);
assert.match(searchable,/this\._singleMatchTimer=setTimeout\(/,'Unique smart completion is restored');
assert.doesNotMatch(html,/input\.value=name;input\.focus\(\);input\.setSelectionRange\(query\.length/);
const commerceStart=commerce.indexOf('function commerceAutocomplete('),commerceEnd=commerce.indexOf('function commerceResolveProduct(',commerceStart);
assert(commerceStart>=0&&commerceEnd>commerceStart);
const commerceSuggestions=commerce.slice(commerceStart,commerceEnd);
assert.match(commerceSuggestions,/input\.value\s*=\s*match/,'One matching suggestion is inserted into the editable field');

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
 // A unique newly typed prefix should insert only the remaining suffix,
 // and that suffix stays highlighted for replacing by typing.
 acc.value='صندوق النق';acc.focus();acc.setSelectionRange(acc.value.length,acc.value.length);
 acc.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
 await new Promise(r=>w.setTimeout(r,520));
 assert.equal(acc.value,'صندوق النقدية','unique account name completes automatically');
 assert.equal(acc.selectionStart,'صندوق النق'.length,'only proposed suffix is selected');
 assert.equal(acc.selectionEnd,acc.value.length,'selected suffix extends to end');
 assert.equal(selected.getAccountId(),'110101','smart match binds real account id');
 acc.setRangeText('ك',acc.selectionStart,acc.selectionEnd,'end');
 acc.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
 assert.equal(selected.getAccountId(),'','replacing a suggestion unbinds account if name is unrecognized');
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
 party.value='محم';party.setSelectionRange(3,3);
 w.commerceAutocompleteTest(party,['محمد','محسن'],new w.InputEvent('input',{inputType:'insertText'}));
 assert.equal(party.value,'محمد','unique commerce suggestion is inserted');
 assert.equal(party.selectionStart,3,'commerce suggestion selects only remaining suffix');
 assert.equal(party.selectionEnd,4,'suffix remains editable');
 party.value='مح';party.setSelectionRange(2,2);
 w.commerceAutocompleteTest(party,['محمد','محسن'],new w.InputEvent('input',{inputType:'deleteContentBackward'}));
 assert.equal(party.value,'مح','deletion must not force autocomplete');
 dom.window.close();
 console.log('PASS 3.6.159: selected subtext editing, native caret, unique account identity, amounts, commerce suggestions');
})().catch(err=>{console.error(err);process.exitCode=1;});

(async()=>{
 const marker=sidebar.indexOf('// On entering a filled field, select its complete text once.');
 const end=sidebar.indexOf("document.addEventListener('focusout',e=>{",marker);
 assert(marker>0&&end>marker,'first-focus caret handlers located');
 const handlers=sidebar.slice(marker,end);
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+
   '<input id="field1" type="text" value="محمد أحمد">'+
   '<input id="field2" type="search" value="صندوق النقدية">'+
   '<textarea id="notes">فاتورة قديمة</textarea>'+
   '<input id="pin" type="password" value="1234"></body></html>',
   {url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.eval('function ratibPrepareEditableNumber(el){};\n'+handlers);
 const first=d.getElementById('field1'),second=d.getElementById('field2'),
   note=d.getElementById('notes'),pin=d.getElementById('pin');
 const down=el=>el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:12,clientY:12}));
 down(first);first.focus();first.click();
 assert.equal(first.selectionStart,0,'first tap selects from start');
 assert.equal(first.selectionEnd,first.value.length,'first tap selects all existing text');
 first.setRangeText('علي',0,first.value.length,'end');
 assert.equal(first.value,'علي','typing over full selection replaces text');
 first.setSelectionRange(1,1);down(first);first.click();
 assert.equal(first.selectionStart,1,'second tap respects caret');
 assert.equal(first.selectionEnd,1,'second tap never selects all again');
 down(second);second.focus();second.click();
 assert.equal(second.selectionEnd,second.value.length,'next fresh field selects all once');
 second.setSelectionRange(2,6);down(second);second.click();
 assert.equal(second.selectionStart,2,'partial selection remains editable after second tap');
 assert.equal(second.selectionEnd,6,'partial selection end preserved');
 down(note);note.focus();note.click();
 assert.equal(note.selectionEnd,note.value.length,'textarea selects all on first tap');
 down(pin);pin.focus();pin.click();
 assert.notEqual(pin.selectionEnd,pin.value.length,'password is excluded from automatic selection');
 // Drag/long-press on a new field must preserve the browser's partial selection.
 first.blur();down(first);first.focus();
 first.setSelectionRange(0,1);
 first.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:40,clientY:40}));
 first.click();
 assert.equal(first.selectionEnd,1,'dragging selection cannot be overwritten by delayed click');
 dom.window.close();
 console.log('PASS trial first-tap select-all, second-tap caret, partial selection, protected PIN, drag handling');
})().catch(err=>{console.error(err);process.exitCode=1;});
