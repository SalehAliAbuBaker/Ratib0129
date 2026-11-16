/* Ratib: Android keyboard must keep focused inputs at top of visible viewport. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
assert.doesNotThrow(()=>new Function(source));
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body><div id="pageDashboard"><input id="search" type="search" value="بيانات"></div><input id="date" type="date"><div role="dialog"><input id="dialogField"></div></body></html>',{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,raf=[],movements=[];
Object.defineProperty(w,'innerHeight',{configurable:true,value:800});
Object.defineProperty(w,'innerWidth',{configurable:true,value:390});
const viewport=new w.EventTarget();
viewport.height=800;viewport.offsetTop=0;
Object.defineProperty(w,'visualViewport',{configurable:true,value:viewport});
w.requestAnimationFrame=callback=>{raf.push(callback);return raf.length;};
w.scrollBy=(...args)=>movements.push(args);
function flush(){for(const cb of raf.splice(0))cb();}
const field=d.getElementById('search');
field.getBoundingClientRect=()=>({top:270,bottom:312,width:250,height:42,left:20,right:270});
d.getElementById('dialogField').getBoundingClientRect=()=>({top:270,bottom:312,width:250,height:42,left:20,right:270});
w.eval(source);
// No keyboard detected: merely focusing must not cause a jump.
field.focus();flush();
assert.equal(movements.length,0,'no scroll before software keyboard is visible');
assert(!d.documentElement.classList.contains('ratib-keyboard-open'));
// Android visual viewport shrinks: move text field up and allow scrolling.
viewport.height=330;viewport.dispatchEvent(new w.Event('resize'));flush();
assert(d.documentElement.classList.contains('ratib-keyboard-open'));
assert(!d.getElementById('ratibKeyboardFocusReserve').hidden);
assert(Number.parseInt(d.getElementById('ratibKeyboardFocusReserve').style.height)>0);
assert.equal(movements.length,1,'scroll exactly once as keyboard opens');
assert(movements[0][0].top>140,'active input rises toward top of available screen');
assert.equal(field.value,'بيانات','field contents are not changed');
// Typing does not re-scroll or replace focused input.
field.value='بيانات إضافية';
field.dispatchEvent(new w.Event('input',{bubbles:true}));flush();
assert.equal(movements.length,1,'no jumps for every character');
assert.equal(d.activeElement,field);
// Closing keyboard restores the normal layout without changing input value.
viewport.height=800;viewport.dispatchEvent(new w.Event('resize'));flush();
assert(!d.documentElement.classList.contains('ratib-keyboard-open'));
assert(d.getElementById('ratibKeyboardFocusReserve').hidden);
assert.equal(field.value,'بيانات إضافية');
// Date pickers are not text keyboards.
field.blur();d.getElementById('date').focus();flush();
viewport.height=330;viewport.dispatchEvent(new w.Event('resize'));flush();
assert(!d.documentElement.classList.contains('ratib-keyboard-open'));
// A fixed dialog's content must not scroll the page behind it.
d.getElementById('dialogField').focus();flush();
assert(d.documentElement.classList.contains('ratib-keyboard-open'));
assert.equal(movements.length,1,'no global scrolling behind fixed dialog');
d.getElementById('dialogField').blur();flush();
assert(!d.documentElement.classList.contains('ratib-keyboard-open'));
dom.window.close();
console.log('PASS Android keyboard viewport: focus, scroll, typing, close, date, dialog');
