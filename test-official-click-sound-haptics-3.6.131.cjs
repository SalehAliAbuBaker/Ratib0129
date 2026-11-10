'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-feedback-3.6.149.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.166');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.166","build":"p16600"'));
assert(sw.includes('v260-opening-mobile-clean-3.6.139'));
assert(html.includes('ratib-feedback-3.6.149.js?v=3.6.139'));
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
// Original Ratib click tone is restored, but only a completed action may play it.
const oscs=()=>oscillators,vibs=()=>vibrations.length;
pointer('inside','pointerdown');
assert.equal(oscs(),0,'Initial touch stays silent');
pointer('inside','pointerup');
assert.equal(oscs(),1,'Finished button press plays original sound');
assert.deepEqual(vibrations,[10],'Finished button press vibrates');
press('btn2');assert.equal(oscs(),2);assert.equal(vibs(),2);
pointer('btn2','pointerdown',4,5);pointer('btn2','pointermove',4,60);pointer('btn2','pointerup',4,60);
assert.equal(oscs(),2,'Vertical scroll has no tone');
assert.equal(vibs(),2,'Vertical scroll has no vibration');
pointer('btn2','pointerdown',4,5);pointer('btn2','pointermove',70,5);pointer('btn2','pointerup',70,5);
assert.equal(oscs(),2,'Horizontal swipe has no tone');
pointer('btn2','pointerdown',0,0);d.dispatchEvent(new w.Event('scroll',{bubbles:true}));pointer('btn2','pointerup',0,0);
assert.equal(oscs(),2,'Native scroll cancels pending click');
pointer('btn2','pointerdown',0,0);pointer('btn2','pointercancel',0,0);pointer('btn2','pointerup',0,0);
assert.equal(oscs(),2,'Cancelled tap stays silent');
press('disabled');press('noop');press('textInput');press('multiLine');
assert.equal(oscs(),2,'Disabled, static, and editable fields have no tone');
press('legacy');assert.equal(oscs(),3,'Legacy clickable element gets tone');
key('btn2','Enter');assert.equal(oscs(),4,'Keyboard button activation works');
key('textInput','a');key('multiLine','Backspace');
assert.equal(oscs(),4,'Typing does not trigger action tone');
key('btn2','Enter',{repeat:true});assert.equal(oscs(),4,'Held keyboard activation is ignored');
const card=d.createElement('article');card.id='clickableCard';card.setAttribute('role','button');
card.innerHTML='<span id="cardChild">فتح البطاقة</span>';d.body.append(card);
press('cardChild');assert.equal(oscs(),5,'Interactive card child plays one click');
const passive=d.createElement('article');passive.id='passiveCard';passive.className='card';d.body.append(passive);
press('passiveCard');assert.equal(oscs(),5,'Passive information card remains silent');
feedback.write({tapCue:'sound'});
const soundOnly=oscs();press('btn1');assert.equal(oscs(),soundOnly+1);
assert.equal(vibs(),5,'Sound-only does not vibrate');
feedback.write({tapCue:'vibration'});
const vibrationOnly=oscs();press('btn1');
assert.equal(oscs(),vibrationOnly,'Vibration-only does not synthesize sound');
assert.equal(vibs(),6);
feedback.write({tapCue:'silent'});press('btn1');
assert.equal(oscs(),vibrationOnly);assert.equal(vibs(),6);
feedback.write({tap:false,tapCue:'both'});press('btn1');
assert.equal(oscs(),vibrationOnly);assert.equal(vibs(),6);
feedback.write({master:false,tap:true});press('btn1');
assert.equal(oscs(),vibrationOnly);assert.equal(vibs(),6);
feedback.write({master:true,tap:false,save:true,saveCue:'both'});
feedback.toast('تم حفظ السند بنجاح','success');
assert.deepEqual(Array.from(vibrations.at(-1)),[65,40,65],'Save success vibration is retained');
const afterSave=vibs();
feedback.toast('تعذر حفظ السند','error',3000,{force:true});
assert.equal(vibs(),afterSave,'Saving failure is not a success event');
const beforeWebTap=oscs();
feedback.write({tap:true,tapCue:'both'});press('btn2');
assert.equal(oscs(),beforeWebTap+1,'Tone works in ordinary web mode without native bridge');
assert.equal(vibs(),afterSave+1,'Web tap vibration still works');
w.close();
console.log('PASS official 3.6.139: original app click tone on buttons/cards, silent scroll, haptic and save isolation');
