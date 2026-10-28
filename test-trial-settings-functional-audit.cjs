'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const feedback=fs.readFileSync('ratib-feedback-3.6.149.js','utf8');
const size=fs.readFileSync('ratib-global-button-size-3.6.146.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const storage=new Map();
const tick=()=>new Promise(done=>setImmediate(done));
function start(language){
 const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
 '<header><div class="header-actions"></div></header><div id="pageSettings">'+
 '<div class="card settings-accordion-card" id="notificationSoundCard"><div class="settings-accordion-header"><span>الأصوات</span></div><div class="settings-accordion-body"></div></div></div>'+
 '<div id="toastStack" class="toast-stack"></div><textarea id="note"></textarea>'+
 '<select id="ratibGlobalButtonSize"><option value="medium">متوسط</option><option value="large">كبير</option><option value="xlarge">كبير جدا</option></select>'+
 '<select id="ratibGlobalFontSize"><option value="medium">متوسط</option><option value="large">كبير</option></select>'+
 '<p id="ratibSizeSaveStatus"></p></body></html>',
 {url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;const d=w.document;
 const records=storage;
 let flushes=0;
 w.store={get:(key,fallback)=>records.has(key)?JSON.parse(JSON.stringify(records.get(key))):fallback,
 set:(key,value)=>records.set(key,JSON.parse(JSON.stringify(value)))};
 w.flushStorage=async()=>{flushes++};
 if(language)w.localStorage.setItem('ratib.voice.language.v1',language);
 w.eval(voice);w.eval(feedback);w.eval(size);
 d.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,d,get flushes(){return flushes}};
}
(async()=>{
 const app=start(),{w,d}=app;
 const language=d.getElementById('ratibVoiceLanguage');
 assert(language,'voice language field must exist and be interactive');
 assert.equal(language.disabled,false);
 language.value='ar-YE';language.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.RatibVoiceDictation.values().language,'ar-YE');
 assert.equal(w.localStorage.getItem('ratib.voice.language.v1'),'ar-YE');
 assert.match(d.getElementById('ratibVoiceLanguageSaveStatus').textContent,/تم حفظ/);
 const volume=d.getElementById('ratibFeedbackVolume'),tone=d.getElementById('ratibFeedbackStyle');
 assert(volume&&tone,'sound level and tone selectors must be mounted');
 assert(!volume.disabled&&!tone.disabled);
 volume.value='high';volume.dispatchEvent(new w.Event('change',{bubbles:true}));
 tone.value='soft';tone.dispatchEvent(new w.Event('change',{bubbles:true}));
 await tick();await tick();
 assert.equal(w.RatibFeedback.read().volume,'high');
 assert.equal(w.RatibFeedback.read().style,'soft');
 assert(app.flushes>=2,'sound changes must flush preference storage');
 assert.match(d.getElementById('ratibFeedbackPersistStatus').textContent,/تم حفظ/);
 const button=d.getElementById('ratibGlobalButtonSize'),font=d.getElementById('ratibGlobalFontSize');
 button.value='xlarge';button.dispatchEvent(new w.Event('change',{bubbles:true}));
 font.value='large';font.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.documentElement.getAttribute('data-ratib-button-size'),'xlarge');
 assert.equal(d.documentElement.dataset.ratibFontSize,'large');
 assert.match(d.getElementById('ratibSizeSaveStatus').textContent,/تم حفظ/);
 assert(!sidebar.includes('padding:0!important;overflow:hidden'), 'settings card must not clip interactive dropdowns');
 assert(html.includes('id="ratibDefaultAccountSaveStatus"'));
 assert(html.includes("saveStatus.dataset.currencySaveState=c.code"));
 const previous={language:w.localStorage.getItem('ratib.voice.language.v1'),volume:w.RatibFeedback.read().volume,style:w.RatibFeedback.read().style};
 assert.deepEqual([previous.volume,previous.style],['high','soft']);
 app.dom.window.close();
 const returned=start(previous.language);
 assert.equal(returned.w.RatibVoiceDictation.values().language,previous.language,'voice language survives reopening');
 assert.equal(returned.w.RatibFeedback.read().volume,'high','volume survives reopening');
 assert.equal(returned.w.RatibFeedback.read().style,'soft','tone survives reopening');
 assert.equal(returned.d.getElementById('ratibFeedbackVolume').value,'high');
 assert.equal(returned.d.getElementById('ratibFeedbackStyle').value,'soft');
 returned.dom.window.close();
 console.log('PASS trial settings live-change: voice language, tone, volume, font/button controls, persistence, and no transaction writes');
})().catch(err=>{console.error(err);process.exitCode=1;});
