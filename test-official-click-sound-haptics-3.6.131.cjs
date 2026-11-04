'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-feedback-3.6.149.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.132');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.132","build":"p13200"'));
assert(sw.includes('v247-official-native-tap-and-swipe-3.6.132'));
assert(html.includes('ratib-feedback-3.6.149.js?v=3.6.132'));
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
function pointer(id,type,x=0,y=0){
 const e=new w.Event(type,{bubbles:true,cancelable:true});
 for(const [key,value] of Object.entries({button:0,pointerId:1,clientX:x,clientY:y}))Object.defineProperty(e,key,{value});
 d.getElementById(id).dispatchEvent(e);
 clock+=40;
}
function press(id){pointer(id,'pointerdown');pointer(id,'pointerup');}
const key=(id,key,extra={})=>{
 d.getElementById(id).dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,key,...extra}));
 clock+=40;
};
let systemClicks=0;
w.RatibAndroid={playSystemClick(){systemClicks++;}};
pointer('inside','pointerdown');
assert.equal(vibrations.length,0,'Press start must not trigger feedback');
pointer('inside','pointerup');
assert.deepEqual(vibrations,[10]);
assert.equal(systemClicks,1,'Native Android OS click is requested');
assert.equal(oscillators,0,'No fake click oscillator is generated');
press('btn2');assert.equal(vibrations.length,2);assert.equal(systemClicks,2);
pointer('btn2','pointerdown',4,5);pointer('btn2','pointermove',4,60);pointer('btn2','pointerup',4,60);
assert.equal(vibrations.length,2,'Vertical swipe remains silent');
pointer('btn2','pointerdown',4,5);pointer('btn2','pointermove',70,5);pointer('btn2','pointerup',70,5);
assert.equal(vibrations.length,2,'Horizontal swipe remains silent');
pointer('btn2','pointerdown',0,0);d.dispatchEvent(new w.Event('scroll',{bubbles:true}));pointer('btn2','pointerup',0,0);
assert.equal(vibrations.length,2,'Scroll events cancel feedback');
pointer('btn2','pointerdown',0,0);pointer('btn2','pointercancel',0,0);pointer('btn2','pointerup',0,0);
assert.equal(vibrations.length,2,'Cancelled presses stay silent');
press('disabled');press('noop');assert.equal(vibrations.length,2,'Disabled/non-interactive elements stay silent');
press('legacy');assert.equal(vibrations.length,3,'Inline click handlers work');
key('btn2','Enter');assert.equal(vibrations.length,4,'Keyboard activation stays enabled');
key('textInput','a');key('multiLine','Backspace');
assert.equal(vibrations.length,6,'Physical text editing keys are supported');
key('textInput','Shift');key('textInput','a',{ctrlKey:true});key('btn2','Enter',{repeat:true});
assert.equal(vibrations.length,6,'Modifier/repeated keys ignored');
feedback.write({tapCue:'sound'});
const beforeSound=systemClicks;press('btn1');
assert.equal(vibrations.length,6,'Sound-only avoids vibration');
assert.equal(systemClicks,beforeSound+1,'Sound-only invokes OS bridge');
feedback.write({tapCue:'vibration'});
const beforeVibrate=systemClicks;press('btn1');
assert.equal(vibrations.length,7);assert.equal(systemClicks,beforeVibrate);
feedback.write({tapCue:'silent'});press('btn1');
assert.equal(vibrations.length,7);assert.equal(systemClicks,beforeVibrate);
feedback.write({tap:false,tapCue:'both'});press('btn1');assert.equal(vibrations.length,7);
feedback.write({master:false,tap:true});press('btn1');assert.equal(vibrations.length,7);
feedback.write({master:true,tap:false,save:true,saveCue:'both'});
feedback.toast('تم حفظ السند بنجاح','success');
assert.deepEqual(Array.from(vibrations.at(-1)),[65,40,65],'Saving confirmation vibration is preserved');
const count=vibrations.length;
feedback.toast('تعذر حفظ السند','error',3000,{force:true});
assert.equal(vibrations.length,count,'Failed save never confirms success');
feedback.write({tap:true,tapCue:'sound'});delete w.RatibAndroid;
const beforeOsc=oscillators;press('btn2');
assert.equal(oscillators,beforeOsc,'PWA does not fake the device sound');
assert.equal(vibrations.length,count,'Sound-only without native bridge is silent');
feedback.write({tapCue:'both'});press('btn2');
assert.equal(vibrations.length,count+1,'Web touch vibration remains available');
w.close();
console.log('PASS official 3.6.132: taps on buttons/inputs, clicks + 10ms haptics, all preference modes, physical keys, save/error isolation');
