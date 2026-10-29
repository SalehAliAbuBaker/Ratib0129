const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<body><form><div id="a"><input type="date" value="2026-10-28"></div><div id="b"></div></form></body>',{runScripts:'outside-only'});
const w=dom.window;w.RatibAndroid={};
const code=fs.readFileSync('ratib-date-display.js','utf8');
w.eval(code);
(async()=>{
const input=w.document.querySelector('input'),label=w.document.querySelector('.ratib-native-date-label');
assert.equal(input.value,'2026-10-28');assert.equal(label.textContent,'2026/10/28');
input.value='2027-01-02';assert.equal(label.textContent,'2027/01/02');
assert.equal(input.type,'date');assert.equal(w.getComputedStyle(label).pointerEvents,'none');
w.document.querySelector('#b').append(input);await new Promise(r=>setTimeout(r,10));
assert.equal(input.parentElement.className,'ratib-native-date-wrap');assert.equal(w.document.querySelectorAll('.ratib-native-date-wrap').length,1);
input.value='';assert.equal(label.textContent,'YYYY/MM/DD');
w.document.querySelector('form').reset();await new Promise(r=>setTimeout(r,10));
assert.equal(input.value,'2026-10-28');assert.equal(label.textContent,'2026/10/28');
console.log('PASS native date: ISO value, programmatic update, original picker, pointer pass-through, relocation, empty value, form reset');
})().catch(e=>{console.error(e);process.exitCode=1});
