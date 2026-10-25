/* Trial regression: Android field taps preserve typing; microphone must be pressed explicitly. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert.match(version||'',/^3\.6\.\d+$/,'Voice-first coverage must use the current trial release');
assert(sw.includes('"version":"'+version+'"'));
assert(sidebar.includes('Do not force Android cut/copy selection on account input'));
assert.doesNotThrow(()=>new Function(voice));
const dom=new JSDOM('<!doctype html><html lang="ar"><head></head><body><div id="pageSettings"></div>'+
 '<input class="searchable-input" type="text" id="inpDebitAcc" inputmode="text">'+
 '<input id="rc-search-partyAccount" type="search">'+
 '<input id="rc-partyName" type="text">'+
 '<input id="unrelatedNote" type="text"></body></html>',{
 url:'https://ratibtrial.pages.dev',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window,d=w.document,instances=[];
w.localStorage.setItem('ratib.voice.visible.v1','true');
w.SpeechRecognition=function(){
 const engine={start(){instances.push(engine);},stop(){this.onend?.();}};
 return engine;
};
w.eval(voice);
const el=id=>d.getElementById(id);
const touch=id=>{
 const event=new w.Event('pointerdown',{bubbles:true,cancelable:true});
 Object.defineProperties(event,{pointerType:{value:'touch'},isPrimary:{value:true},button:{value:0}});
 el(id).dispatchEvent(event);return event;
};
assert.equal(el('inpDebitAcc').getAttribute('inputmode'),'text');
for(const id of ['inpDebitAcc','rc-search-partyAccount','rc-partyName']){
 const tap=touch(id);
 assert.equal(tap.defaultPrevented,false,id+' tap must keep native Android keyboard');
 assert.equal(instances.length,0,'touching '+id+' must NOT start the microphone');
 assert.notEqual(el(id).getAttribute('inputmode'),'none','keyboard input must be allowed');
 assert.equal(w.RatibVoiceFirstAccountActive(el(id)),false);
}
el('inpDebitAcc').focus();
const mic=el('ratibVoiceButton');
assert(mic,'visible icon must exist');
assert.equal(instances.length,0,'focusing alone must not start recording');
mic.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
mic.click();
assert.equal(instances.length,1,'mic click starts dictation only when requested');
instances[0].onresult({resultIndex:0,results:[{0:{transcript:'صندوق النقدية'},isFinal:true}]});
assert.equal(el('inpDebitAcc').value,'صندوق النقدية','microphone dictation writes to requested input');
mic.click();
assert.equal(mic.dataset.listening,'false','second mic click stops dictation');
touch('inpDebitAcc');el('inpDebitAcc').value='صندوق آخر';
el('inpDebitAcc').dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(el('inpDebitAcc').value,'صندوق آخر','typing remains functional');
el('rc-search-partyAccount').focus();
mic.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
mic.click();
assert.equal(instances.length,2,'other account requires a fresh mic press');
mic.click();
const setting=el('ratibVoiceVisible');setting.checked=false;
setting.dispatchEvent(new w.Event('change',{bubbles:true}));
const fallback=touch('rc-partyName');
assert(!fallback.defaultPrevented,'disabled voice preserves keyboard on first touch');
assert.equal(instances.length,2,'disabled voice must not start recording');
dom.window.close();
console.log('PASS trial: voice starts only on microphone press; account field taps preserve keyboard and manual edits');
