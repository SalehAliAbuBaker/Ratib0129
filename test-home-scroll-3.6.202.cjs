'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-mobile-edge-back-3.6.128.js','utf8'),html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM('<body><main id="pageDashboard">home</main></body>',{runScripts:'outside-only',url:'https://ratib.test'}),w=dom.window,d=w.document;
Object.defineProperty(w,'innerWidth',{value:400});let backs=0;w.goBackInApp=()=>backs++;
const active=new Set(),add=d.addEventListener.bind(d),remove=d.removeEventListener.bind(d);
d.addEventListener=(type,fn,options)=>{if(type==='touchmove'&&options?.passive===false)active.add(fn);return add(type,fn,options)};
d.removeEventListener=(type,fn,options)=>{if(type==='touchmove')active.delete(fn);return remove(type,fn,options)};
w.eval(src);
function touch(type,x,y,multi=false){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,type==='touchend'?'changedTouches':'touches',{value:multi?[{clientX:x,clientY:y},{clientX:x+10,clientY:y+10}]:[{clientX:x,clientY:y}]});d.getElementById('pageDashboard').dispatchEvent(e);return e;}
assert.equal(active.size,0,'No page-wide scroll-blocking listener while idle');
touch('touchstart',200,100);assert.equal(active.size,0,'Normal content swipes remain compositor-driven');assert.equal(touch('touchmove',205,230).defaultPrevented,false);touch('touchend',205,230);
touch('touchstart',3,100);assert.equal(active.size,1);assert.equal(touch('touchmove',14,114).defaultPrevented,false,'A diagonal vertical start never gets captured as Back');assert.equal(active.size,0,'Vertical motion immediately releases the edge listener');touch('touchend',30,300);assert.equal(backs,0);
touch('touchstart',3,100);assert.equal(touch('touchmove',40,102).defaultPrevented,true);touch('touchend',90,103);assert.equal(backs,1);assert.equal(active.size,0);
touch('touchstart',3,100);touch('touchmove',30,110,true);assert.equal(active.size,0,'Pinch gestures release the blocker');
assert(html.includes('html { overflow-x:clip; width:100%; min-height:100%; height:auto; }'));
assert(html.includes('body { overflow-x:clip; overflow-y:visible; width:100%; height:auto; }'));
dom.window.close();console.log('PASS home scroll: no idle/central touch blockers, early vertical release, preserved horizontal Back, single viewport scroll');
