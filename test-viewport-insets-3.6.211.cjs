'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><head><style>html.keyboard #ratibHomeBottomNav{display:none}</style></head><body><main id="mainWrap"><input value="unchanged"></main><nav id="ratibHomeBottomNav"></nav></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://ratib.test'});
const w=dom.window,d=w.document,nav=d.getElementById('ratibHomeBottomNav');let height=64,resize;
nav.getBoundingClientRect=()=>({height});w.ResizeObserver=class{constructor(cb){resize=cb;}observe(){}};
w.eval(fs.readFileSync('ratib-viewport-insets-3.6.211.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
const value=()=>d.documentElement.style.getPropertyValue('--ratib-bottom-obstruction');
const tick=()=>new Promise(r=>w.setTimeout(r,40));
(async()=>{
 assert.equal(value(),'64px');height=112;resize();await tick();assert.equal(value(),'112px','larger bar reserves its real height');
 nav.hidden=true;await tick();assert.equal(value(),'0px');nav.hidden=false;await tick();assert.equal(value(),'112px');
 d.documentElement.classList.add('keyboard');await tick();assert.equal(value(),'0px','hidden keyboard bar leaves no stale obstruction');d.documentElement.classList.remove('keyboard');await tick();assert.equal(value(),'112px');
 assert.equal(d.querySelector('input').value,'unchanged');const css=fs.readFileSync('ratib-viewport-insets-3.6.211.css','utf8');assert(css.includes('@media screen'));assert(css.includes('.modal-overlay.show>.modal-content'));assert(css.includes('100dvh - var(--ratib-bottom-obstruction)'));console.log('PASS viewport insets: real bar height, resizing, hidden/keyboard state, fixed editors, unchanged fields and print isolation');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
