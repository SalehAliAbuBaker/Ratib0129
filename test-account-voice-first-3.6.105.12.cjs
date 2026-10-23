/* Ratib 3.6.105.12: mobile account voice-first tap, manual typing second tap. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const version=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert.equal(version,'3.6.105.12');
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
const first=touch('inpDebitAcc');
assert(first.defaultPrevented,'First tap should not open keyboard');
assert.equal(instances.length,1,'First tap starts dictation');
assert.equal(el('inpDebitAcc').getAttribute('inputmode'),'none');
assert.equal(w.RatibVoiceFirstAccountActive(el('inpDebitAcc')),true);
const tapClick=new w.MouseEvent('click',{bubbles:true,cancelable:true});
el('inpDebitAcc').dispatchEvent(tapClick);
assert(tapClick.defaultPrevented,'First account tap cannot trigger Android menu');
instances[0].onresult({resultIndex:0,results:[{0:{transcript:'صندوق النقدية'},isFinal:true}]});
assert.equal(el('inpDebitAcc').value,'صندوق النقدية','Speech writes directly into account input');
const second=touch('inpDebitAcc');
assert(!second.defaultPrevented,'Second tap permits native keyboard');
assert.equal(el('inpDebitAcc').getAttribute('inputmode'),'text','Second tap restores original input mode');
assert.equal(instances.length,1,'Second tap cannot restart dictation');
assert.equal(w.RatibVoiceFirstAccountActive(el('inpDebitAcc')),false);
const manualInput=new w.Event('input',{bubbles:true});
el('inpDebitAcc').value='صندوق آخر';el('inpDebitAcc').dispatchEvent(manualInput);
assert.equal(el('inpDebitAcc').value,'صندوق آخر','Manual typing remains editable');
const third=touch('rc-search-partyAccount');
assert(third.defaultPrevented,'Commerce account input begins in speech mode');
assert.equal(instances.length,2);
touch('unrelatedNote');
assert.equal(el('rc-search-partyAccount').getAttribute('inputmode'),null,'Leaving account restores input mode');
assert.equal(w.RatibVoiceFirstAccountActive(el('rc-search-partyAccount')),false);
const setting=el('ratibVoiceVisible');setting.checked=false;
setting.dispatchEvent(new w.Event('change',{bubbles:true}));
const fallback=touch('rc-partyName');
assert(!fallback.defaultPrevented,'Disabled speech preserves keyboard on first touch');
assert.equal(instances.length,2,'Disabled speech does not start recording');
dom.window.close();
console.log('PASS 3.6.105.12: voice-first, second-tap keyboard, transcription, account scope, disabled fallback');
