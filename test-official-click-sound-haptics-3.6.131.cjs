'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-feedback-3.6.149.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.131');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.131","build":"p13100"'));
assert(sw.includes('v246-official-touch-sound-haptics-3.6.131'));
assert(html.includes('ratib-feedback-3.6.149.js?v=3.6.131'));
assert(sw.includes('"./ratib-feedback-3.6.149.js"'),'The existing feedback script is cached offline');
assert(!src.includes("store.set('transactions'"),'Touch effects must never mutate ledger data');
const dom=new JSDOM('<!doctype html><html lang="ar"><body>'+
 '<div id="toastStack" class="toast-stack"></div>'+
 '<div id="notificationSoundCard"><div class="settings-accordion-body"></div></div>'+
 '<button id="btn1"><span id="inside">حفظ</span></button>'+
 '<button id="btn2">عودة</button><button id="disabled" disabled>معطّل</button>'+
 '<input id="textInput" type="text"><textarea id="multiLine"></textarea>'+
 '<div id="noop">نص غير تفاعلي</div>'+
 '<div id="legacy" onclick="void(0)">زر قديم</div>'+
 '</body></html>',{url:'https://ratib.example/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
let clock=1700000000000,oscillators=0,vibrations=[],activeAnimations=0;
w.Date.now=()=>clock;
Object.defineProperty(w.navigator,'vibrate',{configurable:true,value:p=>{vibrations.push(p);return true;}});
w.AudioContext=class {
 constructor(){this.currentTime=0;this.state='running';this.destination={};}
 createOscillator(){oscillators++;return {type:'',frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
 resume(){this.state='running';return Promise.resolve();}
};
let storeData={};
w._storeData=storeData;
w.eval('var store={get:(k,v)=>window._storeData[k]??v,set:(k,v)=>window._storeData[k]=v};');
w.eval(src);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const feedback=w.RatibFeedback;
assert.equal(feedback.read().tap,true,'Existing user gets click feedback by default');
assert.equal(feedback.read().tapCue,'both');
assert(d.querySelector('[data-feedback-toggle="tap"]'),'New setting is present');
assert(d.querySelector('[data-feedback-select="tapCue"]'),'User can choose sound/vibration/both/silent');
assert.equal(d.querySelector('[data-feedback-select="tapCue"]').value,'both');
function press(id){
 const e=new w.Event('pointerdown',{bubbles:true,cancelable:true});
 Object.defineProperty(e,'button',{value:0});
 d.getElementById(id).dispatchEvent(e);
 clock+=40;
}
const key=(id,key,extra={})=>{
 d.getElementById(id).dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,key,...extra}));
 clock+=40;
};
press('inside');assert.deepEqual(vibrations,[10]);assert.equal(oscillators,1,'Click sound generated');
press('btn2');assert.equal(vibrations.length,2,'Every distinct button press vibrates');
assert.equal(oscillators,2,'Every distinct button press clicks');
press('disabled');press('noop');
assert.equal(vibrations.length,2,'No effect on disabled/non-interactive elements');
press('legacy');assert.equal(vibrations.length,3,'Inline onclick controls supported');
key('btn2','Enter');assert.equal(vibrations.length,4,'Keyboard activation of button');
key('textInput','a');key('multiLine','Backspace');
assert.equal(vibrations.length,6,'Physical typing keys receive feedback');
key('textInput','Shift');key('textInput','a',{ctrlKey:true});key('btn2','Enter',{repeat:true});
assert.equal(vibrations.length,6,'Modifiers and held repeats are ignored');
feedback.write({tapCue:'sound'});
const beforeSound=oscillators;press('btn1');
assert.equal(vibrations.length,6,'Sound-only mode disables vibration');
assert.equal(oscillators,beforeSound+1);
feedback.write({tapCue:'vibration'});
const beforeVibrate=oscillators;press('btn1');
assert.equal(vibrations.length,7);
assert.equal(oscillators,beforeVibrate,'Vibration-only mode skips audio oscillator');
feedback.write({tapCue:'silent'});press('btn1');
assert.equal(vibrations.length,7);assert.equal(oscillators,beforeVibrate);
feedback.write({tap:false,tapCue:'both'});press('btn1');
assert.equal(vibrations.length,7,'Tap effect can be switched off independently');
feedback.write({master:false,tap:true});press('btn1');
assert.equal(vibrations.length,7,'Global mute disables touch haptics');
feedback.write({master:true,tap:false,save:true,saveCue:'both'});
feedback.toast('تم حفظ السند بنجاح','success');
assert.deepEqual(vibrations.at(-1),[65,40,65],'Saving-success haptic works independently of tap');
const count=vibrations.length;
feedback.toast('تعذر حفظ السند','error',3000,{force:true});
assert.equal(vibrations.length,count,'Failed saves do not play success haptic');
feedback.write({tap:true,tapCue:'both'});
feedback.play('tap','',true);
assert.equal(vibrations.at(-1),10,'Explicit test can trigger gentle haptic');
w.close();
console.log('PASS official 3.6.131: taps on buttons/inputs, clicks + 10ms haptics, all preference modes, physical keys, save/error isolation');
