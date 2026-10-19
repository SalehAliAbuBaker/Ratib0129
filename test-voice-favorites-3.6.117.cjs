/* Ratib 3.6.117: validate opt-in voice input, settings favorites and offline delivery. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const fav=fs.readFileSync('ratib-favorites-v3.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
for(const [file,source] of [['voice',voice],['favorites',fav],['worker',sw]])assert.doesNotThrow(()=>new vm.Script(source),file+' must parse');
assert.match(html,/ratib-voice-dictation-3\.6\.117\.js\?v=3\.6\.117/);
assert.match(html,/ratib-favorites-v3\.js\?v=3\.6\.117/);
assert.match(html,/الإصدار 3\.6\.117/);
assert.match(sw,/v124-trial-voice-favorites-3\.6\.117/);
assert.match(sw,/ratib-voice-dictation-3\.6\.117\.js/);
assert.match(voice,/button\.addEventListener\('click'/); // speech starts only by user click
assert.match(voice,/const Recognition=window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
assert.match(voice,/target\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/);
assert.doesNotMatch(voice,/saveVoucher\(|saveTransaction\(|submitVoucher\(/); // dictation never posts transactions
assert.match(fav,/ratibFavoritesSettingsCard/);
assert.match(fav,/ratib\.quickFavorites\.v2/); // previous favorite IDs are retained
assert.match(fav,/ratib\.quickFavorites\.icons\.v1/);
assert.match(fav,/persistIcons\(\)/);
console.log('PASS voice activation, caret insertion, favorites settings, persisted icons, cache registration and version');


(async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><html><body><div id="pageSettings"></div><textarea id="memo">مسودة</textarea><input id="amount" type="number"></body></html>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const win=dom.window,d=win.document;let recognizer,starts=0;
 class SpeechMock{
  start(){starts++;}
  stop(){this.onend?.();}
 }
 win.SpeechRecognition=function(){recognizer=new SpeechMock();return recognizer;};
 win.eval(voice);
 const mic=d.getElementById('ratibVoiceButton'),memo=d.getElementById('memo');
 assert(mic,'voice control is present');
 assert.equal(starts,0,'microphone must not activate at page load');
 memo.focus();memo.setSelectionRange(0,0);
 mic.click();assert.equal(starts,1,'mic starts from user click');
 let inputs=0;memo.addEventListener('input',()=>inputs++);
 recognizer.onresult({resultIndex:0,results:[{0:{transcript:'مرحبا '},isFinal:true}]});
 assert.equal(memo.value,'مرحبا مسودة','dictation inserts at the saved caret and keeps remaining input');
 assert.equal(inputs,1,'native input listeners should be notified');
 mic.click();
 const amount=d.getElementById('amount');amount.focus();mic.click();
 recognizer.onresult({resultIndex:0,results:[{0:{transcript:'١٢٣'},isFinal:true}]});
 assert.equal(amount.value,'123','Arabic digits must normalize into numeric amount fields');
 mic.click();
 assert(d.getElementById('ratibVoiceSettingsCard'),'voice options must be in Settings');
 dom.window.close();
 console.log('PASS mock browser voice typing at cursor, numeric digits and user-controlled microphone');
})().catch(error=>{console.error(error);process.exitCode=1;});
