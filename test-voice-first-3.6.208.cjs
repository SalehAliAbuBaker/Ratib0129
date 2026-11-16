/* Enabled voice: completed field tap dictates, second tap restores the keyboard. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const dom=new JSDOM('<html dir="rtl"><head></head><body><div id="pageSettings"></div><input id="account" inputmode="text"><div class="financial-number-field"><button id="calc">▦</button><input id="amount" inputmode="decimal"></div><input id="number" type="number"><textarea id="note"></textarea><input id="secret" type="password"><input id="locked" readonly><select id="currency"><option>YER</option></select></body></html>',{url:'https://ratib.example',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,engines=[];
w.localStorage.setItem('ratib.voice.visible.v1','true');
w.SpeechRecognition=function(){const e={start(){engines.push(e);},stop(){this.onend?.();}};return e;};
w.eval(source);
const el=id=>d.getElementById(id);
function pointer(id,type,x=100,y=100){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'touch'},isPrimary:{value:true},button:{value:0},clientX:{value:x},clientY:{value:y}});el(id).dispatchEvent(e);return e;}
function tap(id){const down=pointer(id,'pointerdown');pointer(id,'pointerup');return down;}
el('account').focus();assert.equal(engines.length,0,'focus alone never records');
assert(tap('account').defaultPrevented);assert.equal(engines.length,1);
assert(w.RatibVoiceFirstAccountActive(el('account')));
engines[0].onresult({resultIndex:0,results:[{0:{transcript:'صندوق النقدية'},isFinal:true}]});
assert.equal(el('account').value,'صندوق النقدية');
assert(!tap('account').defaultPrevented,'second tap permits the native keyboard');
assert.equal(el('account').getAttribute('inputmode'),'text');assert.equal(engines.length,1);
assert(!w.RatibVoiceFirstAccountActive(el('account')));
tap('account');assert.equal(engines.length,1,'keyboard remains usable for subsequent taps');
tap('amount');assert.equal(engines.length,2);
engines[1].onresult({resultIndex:0,results:[{0:{transcript:'ثلاثين ألف وخمسمئة'},isFinal:true}]});
assert.equal(el('amount').value,'30500','decimal text keeps numeric parsing while keyboard is suppressed');
tap('amount');assert.equal(el('amount').getAttribute('inputmode'),'decimal');
tap('number');engines[2].onresult({resultIndex:0,results:[{0:{transcript:'١٢٣ فاصلة ٥'},isFinal:true}]});assert.equal(el('number').value,'123.5');
const n=engines.length;pointer('note','pointerdown');pointer('note','pointermove',100,150);pointer('note','pointerup',100,150);assert.equal(engines.length,n,'scroll never starts speech');assert(!el('note').hasAttribute('inputmode'));
pointer('note','pointerdown');pointer('note','pointercancel');pointer('note','pointerup');assert.equal(engines.length,n,'canceled tap never starts speech');
for(const id of ['secret','locked','currency'])assert(!tap(id).defaultPrevented);
assert.equal(engines.length,n,'protected and choice fields keep their native controls');
tap('note');assert.equal(engines.length,n+1);
const setting=el('ratibVoiceVisible');setting.checked=false;setting.dispatchEvent(new w.Event('change',{bubbles:true}));assert(!el('note').hasAttribute('inputmode'),'disabling restores original keyboard mode');
assert(!tap('amount').defaultPrevented);assert.equal(engines.length,n+1);
assert.equal(el('calc').disabled,false);
dom.window.close();console.log('PASS voice-first: completed tap, second-tap keyboard, amounts, scroll/cancel, protected fields, disabled fallback and original input modes');
