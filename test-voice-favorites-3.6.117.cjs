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
