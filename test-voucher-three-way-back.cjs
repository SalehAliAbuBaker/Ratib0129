const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{for(const file of ['ratib-navigation-v3.js','ratib-navigation-v3.6.149.js']){
 const d=new JSDOM('<div id="pageExpenses"><div id="cashFlowCard"><input value="old"></div></div><button id="backToMenuBtn">رجوع</button>',{url:'https://test.local',runScripts:'outside-only'}),w=d.window;
 w.eval(html.slice(html.indexOf('let _ratibDraftExitDialog=null;'),html.indexOf('async function ratibGestureDraftCheck()')));
 let saves=0,discards=0,backs=0;
 w.ratibGestureDraftCheck=async()=>{const c=await w.ratibAskDraftExit();if(c==='save')saves++;if(c==='discard')discards++;return c!=='stay';};
 const source=fs.readFileSync(file,'utf8');w.eval(source.slice(source.indexOf('(function ratibTrialBackAndToast116(){')));const input=w.document.querySelector('input'),back=w.document.querySelector('button');back.onclick=()=>backs++;
 input.focus();input.value='changed';
 back.click();assert.equal(backs,0);assert.equal(w.document.querySelectorAll('[data-choice]').length,3);
 w.document.querySelector('[data-choice="stay"]').click();await tick();assert.equal(backs,0);assert.equal(input.value,'changed');
 back.click();back.click();assert.equal(w.document.querySelectorAll('#ratibThreeWayExit').length,1);
 w.document.querySelector('[data-choice="discard"]').click();await tick();assert.equal(backs,1);assert.equal(discards,1);assert.equal(saves,0);
 input.blur();input.focus();input.value='next';back.click();w.document.querySelector('[data-choice="save"]').click();await tick();assert.equal(backs,2);assert.equal(saves,1);
 await tick();d.window.close();console.log('PASS '+file+': stay, discard, save, single dialog and single back');
}})().catch(e=>{console.error(e);process.exitCode=1});
