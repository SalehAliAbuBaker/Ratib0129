/* Ratib 3.6.117: validate opt-in voice input, settings favorites and offline delivery. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const voice=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const fav=fs.readFileSync('ratib-favorites-v3.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
for(const [file,source] of [['voice',voice],['favorites',fav],['worker',sw]])assert.doesNotThrow(()=>new vm.Script(source),file+' must parse');
assert.match(html,/ratib-voice-dictation-3\.6\.117\.js\?v=3\.6\.121/);
assert.match(html,/ratib-favorites-v3\.js\?v=3\.6\.120/);
assert.match(html,/الإصدار 3\.6\.123/);
assert.match(sw,/v131-trial-account-codes-safe-fx-3\.6\.123/);
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
 const dom=new JSDOM('<!doctype html><html><body><header><div class="header-actions"><button id="sidebarMenuBtn"></button></div></header><div id="pageSettings"></div><textarea id="memo">مسودة</textarea><input id="amount" type="number"><button id="elsewhere">إغلاق</button></body></html>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
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
 assert.equal(mic.parentElement,d.body,'microphone must float beside the selected field, not in header');
 assert.equal(d.querySelector('header #ratibVoiceButton'),null,'no microphone remains in header');
 const voiceToggle=d.getElementById('ratibVoiceVisible');
 assert(voiceToggle&&!voiceToggle.checked&&mic.hidden,'voice control must start hidden by default');
 voiceToggle.checked=true;voiceToggle.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert(mic.hidden,'no microphone appears until an editable field has focus');
 assert.equal(win.localStorage.getItem('ratib.voice.visible.v1'),'true');
 memo.getBoundingClientRect=()=>({left:40,right:250,top:100,bottom:145,width:210,height:45});
 const amount=d.getElementById('amount');
 amount.getBoundingClientRect=()=>({left:40,right:250,top:200,bottom:245,width:210,height:45});
 memo.focus();memo.setSelectionRange(0,0);
 await new Promise(r=>win.setTimeout(r,35));
 assert(!mic.hidden&&mic.style.display==='flex','microphone appears beside focused field');
 assert.equal(mic.style.top,'107px','microphone aligns vertically beside active input');
 mic.click();assert.equal(starts,1,'mic starts from user click');
 let inputs=0;memo.addEventListener('input',()=>inputs++);
 recognizer.onresult({resultIndex:0,results:[{0:{transcript:'مرحبا '},isFinal:true}]});
 assert.equal(memo.value,'مرحبا مسودة','dictation inserts at the saved caret and keeps remaining input');
 assert.equal(inputs,1,'native input listeners should be notified');
 mic.click();
 amount.focus();
 await new Promise(r=>win.setTimeout(r,35));
 assert.equal(mic.style.top,'207px','microphone follows cursor focus to the next input');
 mic.click();
 recognizer.onresult({resultIndex:0,results:[{0:{transcript:'١٢٣'},isFinal:true}]});
 assert.equal(amount.value,'123','Arabic digits must normalize into numeric amount fields');
 mic.click();
 d.getElementById('elsewhere').focus();
 await new Promise(r=>win.setTimeout(r,35));
 assert(mic.hidden,'microphone disappears when leaving editable fields');
 assert(d.getElementById('ratibVoiceSettingsCard'),'voice options must be in Settings');
 voiceToggle.checked=false;voiceToggle.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert(mic.hidden,'turning voice toggle off must hide header microphone');
 dom.window.close();
 console.log('PASS voice typing at cursor, repositioning beside focused inputs, hide on blur and numeric digits');
})().catch(error=>{console.error(error);process.exitCode=1;});


(async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><html><head></head><body><header><div class="header-actions"></div><button id="themeBtn"></button><button id="sidebarMenuBtn"></button></header><div id="dashboardHomeContent"><div class="main-menu-grid"><button>إضافة</button><button>سجل العمليات</button><button>التقارير</button><button>الحسابات</button></div></div><div id="pageSettings"></div><div id="pageLedger"></div><div id="pageAccountsTree"></div></body></html>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.localStorage.setItem('ratib.quickFavorites.v2',JSON.stringify(['ledger','account-tree','receipt','payment','multi-entry']));
 w.localStorage.setItem('ratib.quickFavorites.icons.v1',JSON.stringify({'ledger':'📊'}));
 w.navigateToTab=()=>{};
 const browserSetTimeout=w.setTimeout.bind(w),browserClearTimeout=w.clearTimeout.bind(w);
 const timers=new Map();let timerId=10000;
 w.setTimeout=(fn,ms,...args)=>ms===5000?(timers.set(++timerId,()=>fn(...args)),timerId):browserSetTimeout(fn,ms,...args);
 w.clearTimeout=id=>{if(timers.has(id)){timers.delete(id);return;}browserClearTimeout(id);};
 w.eval(fav);
 const grid=d.querySelector('.main-menu-grid'),button=d.getElementById('ratibCenterFavorites');
 assert(grid&&button&&grid.contains(button),'favorite button must be located in four-card grid');
 assert.equal(grid.querySelectorAll('.main-menu-btn').length,0,'mock original buttons remain untouched');
 assert(!d.getElementById('ratibFavoritesShortcutBar'),'oversized old favorites bar removed');
 const headerFav=d.querySelector('header .header-actions [aria-label="فتح المفضلة السريعة"]');
 assert.equal(headerFav,null,'header duplicate favorites icon must be removed');
 assert.equal(d.querySelectorAll('header .header-actions .ratib-quick-btn').length,1,'exit door must remain in header');
 button.click();assert.equal(button.getAttribute('aria-expanded'),'true');
 const menu=d.getElementById('ratibCenterFavoritesMenu');
 assert.equal(menu.querySelectorAll('[data-center-fav]').length,5);
 assert(menu.querySelector('[data-center-fav="ledger"]').textContent.includes('📊'));
 const select=d.querySelector('#ratibFavoritesSettingsCard select[data-fav-icon="ledger"]');
 select.value='💰';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert(menu.querySelector('[data-center-fav="ledger"]').textContent.includes('💰'));
 d.querySelector('#ratibFavoritesSettingsCard [data-remove-fav="ledger"]').click();
 assert.equal(menu.querySelector('[data-center-fav="ledger"]'),null);
 // Settings buttons are outside the popup, so they correctly close it.
 if(menu.hidden)button.click();
 assert.equal(menu.hidden,false,'reopen popup before checking its inactivity timer');
 const initialId=[...timers.keys()].at(-1);
 assert(initialId,'five-second auto-close timer must be scheduled');
 menu.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));
 assert(!timers.has(initialId),'menu activity must cancel prior timer');
 const laterId=[...timers.keys()].at(-1);
 assert(laterId&&laterId!==initialId,'interaction must restart inactivity timeout');
 timers.get(laterId)();
 assert(menu.hidden&&button.getAttribute('aria-expanded')==='false','menu must close after inactivity');
 assert.equal(timers.size,0,'closing must clear pending timers');
 assert(d.getElementById('ratibCenterFavorites'),'center shortcut button remains available');
 dom.window.close();
 console.log('PASS centered favorite icon, popup, saved icons and settings controls');
})().catch(error=>{console.error(error);process.exitCode=1;});
