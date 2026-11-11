'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-adhkar-20261111.js','utf8'),css=fs.readFileSync('ratib-adhkar-20261111.css','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
new vm.Script(js);
assert(html.includes('./ratib-adhkar-20261111.js?v=3.6.180'));
assert(html.includes('./ratib-adhkar-20261111.css?v=3.6.180'));
assert(sw.includes('./ratib-adhkar-20261111.js')&&sw.includes('./ratib-adhkar-20261111.css'));
for(let i=1;i<=3;i++)assert(html.includes('id="ratibAdhkarText'+i+'"'));
assert(html.includes('id="ratibAdhkarSaveBtn"')&&html.includes("window.RatibAdhkar?.loadSettings?.()"));
assert(css.includes('7s linear both!important')&&css.includes('clamp(1.05rem'));
assert(css.includes('ratibHomeDhikr')&&css.includes('ratibLoginDhikr'));
const template='<div id="lockScreen" style="display:none"><div class="lock-content"></div></div>'+
 '<div id="dashboardHomeContent"><p id="ratibHomeDhikr">old placeholder</p></div>'+
 '<textarea id="ratibAdhkarText1"></textarea><textarea id="ratibAdhkarText2"></textarea><textarea id="ratibAdhkarText3"></textarea>'+
 '<button id="ratibAdhkarSaveBtn"></button><span id="ratibAdhkarSaveStatus"></span>';
const publicKey='ratib_public_adhkar_v1',rotationKey='ratib_adhkar_next_v1';
function create(previous={},stored=null){
 const d=new JSDOM(template,{url:'https://ratib.test/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=d.window;
 for(const [k,v] of Object.entries(previous))w.localStorage.setItem(k,v);
 const data={messages:stored,writes:[],financial:{archiveRows:22100,documents:10421}};
 w.__ratibProceedInitialized=true;
 w.store={get(k,f){assert.equal(k,'adhkar_messages_v1');return data.messages||f;},
   set(k,v){assert.equal(k,'adhkar_messages_v1');data.messages=v;data.writes.push(v);}};
 w.flushStorage=async()=>{};
 w.showToast=()=>{};
 w.eval(js);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.dispatchEvent(new w.Event('ratib:app-ready'));
 return {w,data,close:()=>w.close()};
}
async function flush(){await new Promise(resolve=>setTimeout(resolve,35));}
(async()=>{
 const initial=create();
 await flush();
 let a=initial.w.RatibAdhkar.getSelected();
 assert(a.includes('لا تنس ذكر الله'));
 assert.equal(initial.w.document.getElementById('ratibHomeDhikr').querySelector('span').textContent,a);
 assert.equal(initial.w.document.getElementById('ratibLoginDhikr').querySelector('span').textContent,a);
 const chosen=initial.w.RatibAdhkar.getSelected();
 initial.w.dispatchEvent(new initial.w.Event('ratib:app-ready'));
 assert.equal(initial.w.RatibAdhkar.getSelected(),chosen,'Returning to home must not advance rotation');
 const previous=Object.fromEntries([publicKey,rotationKey].map(k=>[k,initial.w.localStorage.getItem(k)]));
 initial.close();
 const second=create(previous);
 await flush();
 const b=second.w.RatibAdhkar.getSelected();
 assert.notEqual(b,a,'Next app load should show only the second remembrance');
 const previous2=Object.fromEntries([publicKey,rotationKey].map(k=>[k,second.w.localStorage.getItem(k)]));second.close();
 const third=create(previous2);
 await flush();
 const c=third.w.RatibAdhkar.getSelected();
 assert.notEqual(c,b);assert.notEqual(c,a,'Third app load should show third remembrance');
 // Only the first field is filled: user must see the same phrase on every launch.
 third.w.document.getElementById('ratibAdhkarText1').value='الحمد لله وحده';
 third.w.document.getElementById('ratibAdhkarText2').value='   ';
 third.w.document.getElementById('ratibAdhkarText3').value='';
 third.w.document.getElementById('ratibAdhkarSaveBtn').click();
 await flush();
 assert.deepEqual(Array.from(third.data.messages),['الحمد لله وحده','','']);
 assert.equal(third.data.writes.length,1,'Save invokes financial-safe storage exactly once');
 assert.equal(third.data.financial.archiveRows,22100);
 const onlyPublic=Object.fromEntries([publicKey,rotationKey].map(k=>[k,third.w.localStorage.getItem(k)]));third.close();
 const one=create(onlyPublic,['الحمد لله وحده','','']);await flush();
 assert.equal(one.w.RatibAdhkar.getSelected(),'الحمد لله وحده');
 const againData=Object.fromEntries([publicKey,rotationKey].map(k=>[k,one.w.localStorage.getItem(k)]));one.close();
 const again=create(againData,['الحمد لله وحده','','']);await flush();
 assert.equal(again.w.RatibAdhkar.getSelected(),'الحمد لله وحده');
 assert.equal(again.w.document.getElementById('ratibLoginDhikr').textContent,'الحمد لله وحده');
 again.close();
 console.log('PASS 3 editable adhkar, one per load, rotation, only-one fallback, common login/home text, 7-second marquee, safe settings storage');
})().catch(e=>{console.error(e);process.exitCode=1;});
