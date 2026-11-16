/* Regression: the single voice control belongs inside a text field and never covers the calculator. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
assert.doesNotThrow(()=>new Function(source));
async function run(){
 const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
  '<div id="pageSettings"></div>'+
  '<div class="searchable-select-wrap"><input id="account" type="search" class="searchable-input" /></div>'+
  '<textarea id="statement" aria-label="بحث في كشف الحساب"></textarea>'+
  '<div class="financial-number-field"><button class="financial-calc-trigger" id="calc">▦</button>'+
  '<input id="amount" type="text" inputmode="decimal" /></div>'+
  '<div id="financialCalculatorModal" class="modal-overlay"></div>'+
  '<button class="ratib-simple-account-mic" id="historical">old</button></body></html>',
  {url:'https://ratib.example/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.localStorage.setItem('ratib.voice.visible.v1','true');
 let started=0;
 w.SpeechRecognition=function(){return {start(){started++;},stop(){this.onend?.();}};};
 w.eval(source);
 const mic=d.getElementById('ratibVoiceButton');
 assert(mic,'one shared microphone is installed');
 assert.equal(d.querySelectorAll('#ratibVoiceButton').length,1);
 assert.equal(d.querySelectorAll('.ratib-simple-account-mic').length,0,'obsolete duplicate controls removed');
 const statement=d.getElementById('statement');
 const account=d.getElementById('account');
 const amount=d.getElementById('amount');
 for(const field of [statement,account,amount]){
  field.getBoundingClientRect=()=>({left:40,right:250,top:100,bottom:145,width:210,height:45});
 }
 const settle=()=>new Promise(r=>w.setTimeout(r,45));
 statement.focus();
 await settle();
 assert.equal(mic.hidden,false,'voice is visible in the focused text field');
 assert.equal(mic.style.left,'212px','RTL microphone is inside right border, not in calculator column');
 assert.equal(mic.style.top,'107px');
 assert(Number.parseFloat(statement.style.paddingInlineStart)>=44,'the text does not collide with icon');
 statement.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,key:'س'}));
 await settle();
 assert(mic.hidden,'typing hides the voice icon immediately');
 assert.equal(statement.style.paddingInlineStart,'','original field padding is restored');
 account.focus();
 await settle();
 assert(!mic.hidden,'next text field can display the icon');
 mic.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
 mic.click();
 assert.equal(started,1,'mic works only on explicit click');
 mic.click();
 amount.focus();
 await settle();
 assert(!mic.hidden,'decimal amount field has its microphone inside the input');
 assert.equal(mic.style.left,'212px','amount microphone stays within input, away from calculator column');
 assert.equal(d.getElementById('calc').disabled,false,'calculator control remains enabled');
 statement.focus();
 await settle();
 assert(!mic.hidden);
 d.getElementById('financialCalculatorModal').classList.add('show');
 statement.dispatchEvent(new w.Event('focusin',{bubbles:true}));
 await settle();
 assert(mic.hidden,'open calculator overlay suppresses floating controls');
 d.getElementById('financialCalculatorModal').classList.remove('show');
 statement.dispatchEvent(new w.Event('focusin',{bubbles:true}));
 await settle();
 assert(!mic.hidden);
 statement.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:'أ'}));
 await settle();
 assert(mic.hidden,'software keyboard input hides the icon');
 assert(source.includes('@media print'),'voice icon is excluded from print');
 dom.window.close();
 console.log('PASS voice 3.6.207: one inside-field mic, keyboard-aware, calculator-safe');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
