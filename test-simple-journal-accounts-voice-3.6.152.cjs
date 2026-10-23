/* Ratib 3.6.152 regression: simple journal selectors and direct speech inputs. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const head=html.indexOf('class SearchableSelect {');
const tail=html.indexOf('\nlet selDebitAcc',head);
assert(head>0&&tail>head,'Main application must expose original searchable account selector');
const original=html.slice(head,tail);
new Function(original+';return SearchableSelect;');
new Function(voice);
const trial=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert(trial&&sw.includes('"version":"'+trial+'"'),'App and worker version updated');
assert(html.includes("this.isSimpleAccount=['wrapDebitAcc','wrapCreditAcc'].includes(wrapId)"),'Both simple journal dropdowns use a visible portal');
assert(voice.includes('ratibSimpleVoiceDebit')&&voice.includes('ratibSimpleVoiceCredit'),'Dedicated voice buttons present');

(async()=>{
 const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
  '<div id="pageSettings"></div>'+
  '<div id="cashFlowCard" class="unified-voucher simple-journal">'+
  '<div class="simple-journal-grid">'+
  '<div class="form-group journal-account-field"><label>الحساب المدين</label><div style="display:flex">'+
  '<div id="wrapDebitAcc" class="searchable-select-wrap"><input type="text" id="inpDebitAcc"/><span class="searchable-arrow">▼</span><div id="dropDebitAcc" class="searchable-dropdown"></div></div>'+
  '<button type="button" id="lockDebitAccBtn">🔓</button></div><input type="hidden" id="valDebitAcc"/></div>'+
  '<div class="form-group journal-account-field"><label>الحساب الدائن</label><div style="display:flex">'+
  '<div id="wrapCreditAcc" class="searchable-select-wrap"><input type="text" id="inpCreditAcc"/><span class="searchable-arrow">▼</span><div id="dropCreditAcc" class="searchable-dropdown"></div></div>'+
  '<button type="button" id="lockCreditAccBtn">🔓</button></div><input type="hidden" id="valCreditAcc"/></div>'+
  '</div></div></body></html>',
  {url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.normalizeParentQuery=x=>String(x||'').normalize('NFKC').trim().toLowerCase();
 w.highlightText=x=>String(x);
 let recognizer,started=0;
 class SpeechMock{
  start(){started++;}
  stop(){this.onend?.();}
 }
 w.SpeechRecognition=function(){recognizer=new SpeechMock();return recognizer;};
 w.eval(original+';window.RatibTestSearchableSelect=SearchableSelect;');
 const selectors=[
  new w.RatibTestSearchableSelect({wrapId:'wrapDebitAcc',inputId:'inpDebitAcc',dropId:'dropDebitAcc',hiddenId:'valDebitAcc'}),
  new w.RatibTestSearchableSelect({wrapId:'wrapCreditAcc',inputId:'inpCreditAcc',dropId:'dropCreditAcc',hiddenId:'valCreditAcc'})
 ];
 const items=[{id:'صندوق النقدية',text:'صندوق النقدية',accountId:'1101',group:'أصول'},
              {id:'مصروفات الوقود',text:'مصروفات الوقود',accountId:'5101',group:'مصروفات'}];
 selectors.forEach(s=>s.setItems(items));
 const debit=d.getElementById('inpDebitAcc'),credit=d.getElementById('inpCreditAcc');
 debit.focus();
 assert.equal(d.getElementById('dropDebitAcc').parentElement,d.body,'Debit dropdown escapes compact grid');
 assert.equal(d.getElementById('dropCreditAcc').parentElement,d.body,'Credit dropdown escapes compact grid');
 assert.equal(d.querySelector('#dropDebitAcc .sd-toolbar'),null,'Debit has one editable search: the primary field');
 assert.equal(d.querySelector('#dropCreditAcc .sd-toolbar'),null,'Credit has one editable search: the primary field');
 assert.equal(debit.getAttribute('inputmode'),'text','Android keyboard and Gboard speech may write directly');
 assert.equal(credit.getAttribute('inputmode'),'text','Credit Android keyboard and speech may write directly');
 assert.equal(debit.getAttribute('aria-expanded'),'false','Typing field must not open full results on focus');
 assert.equal(d.getElementById('dropDebitAcc').classList.contains('open'),false,'Android focus must not cover keyboard with full list');
 debit.value='صندوق';
 debit.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert(d.getElementById('dropDebitAcc').classList.contains('open'));
 const option=d.getElementById('dropDebitAcc').querySelector('.searchable-item');
 assert(option,'Account choices displayed');
 option.click();
 assert.equal(selectors[0].getValue(),'صندوق النقدية','Debtor stored as selected account, not arbitrary text');
 assert.equal(selectors[0].getAccountId(),'1101','Debtor account code preserved');
 credit.focus();
 assert.equal(credit.getAttribute('aria-expanded'),'false','Creditor should allow typing before displaying list');
 credit.value='مصروف';credit.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(credit.getAttribute('aria-expanded'),'true','Typing partial account filters creditor list');
 assert(!d.getElementById('dropDebitAcc').classList.contains('open'),'Only active dropdown stays open');
 const matches=d.getElementById('dropCreditAcc').querySelectorAll('.searchable-item');
 assert.equal(matches.length,1,'Typed account name should reduce matching suggestions');
 matches[0].click();
 assert.equal(selectors[1].getValue(),'مصروفات الوقود');
 assert.equal(selectors[1].getAccountId(),'5101');
 // Selection by arrow remains available to people who prefer scrolling lists.
 const arrow=d.getElementById('wrapDebitAcc').querySelector('.searchable-arrow');
 assert.equal(arrow.getAttribute('role'),'button');
 debit.value='';debit.focus();arrow.click();
 assert(d.getElementById('dropDebitAcc').classList.contains('open'),'Account arrow must open full list');
 assert.equal(d.getElementById('dropDebitAcc').querySelectorAll('.searchable-item').length,2);
 selectors[0].close();
 // Both mic controls are present even while the general voice setting remains hidden.
 w.eval(voice);
 const debitMic=d.getElementById('ratibSimpleVoiceDebit');
 const creditMic=d.getElementById('ratibSimpleVoiceCredit');
 assert(debitMic&&creditMic,'Direct microphones must be next to both account fields');
 assert.equal(debitMic.parentElement,d.getElementById('wrapDebitAcc').parentElement);
 assert.equal(creditMic.parentElement,d.getElementById('wrapCreditAcc').parentElement);
 assert.equal(w.localStorage.getItem('ratib.voice.visible.v1'),null,'No global voice pref overwritten');
 assert.equal(started,0,'Permission only on user click');
 selectors[1].setValue('','');
 credit.value='';credit.focus();credit.setSelectionRange(0,0);
 creditMic.click();
 assert.equal(started,1,'Credit microphone can start directly from user click');
 // Android speech services may move focus; keep transcript in the clicked field.
 debit.focus();
 recognizer.onresult({resultIndex:0,results:[{0:{transcript:'مصروفات الوقود'},isFinal:true}]});
 assert.equal(credit.value,'مصروفات الوقود','Voice transcript inserted directly into account field');
 assert.equal(selectors[1].getValue(),'مصروفات الوقود','Voice transcript selects the exact ledger account');
 assert.equal(selectors[1].getAccountId(),'5101','Voice preserves account accounting identifier');
 creditMic.click();
 debitMic.click();
 assert.equal(started,2,'Debit microphone can also activate');
 dom.window.close();
 console.log('PASS 3.6.156: direct typing, dropdown arrow, mobile focus-safe dictation, account IDs');
})().catch(err=>{console.error(err);process.exitCode=1;});
