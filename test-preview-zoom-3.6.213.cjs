'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><head></head><body><div><div id="printPreviewBody"><table><tr><td>123.45 رصيد محفوظ</td></tr></table></div></div><div><div id="trialPreviewContent">كشف تجريبي</div></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://ratib.test'});
const w=dom.window,d=w.document,host=d.getElementById('printPreviewBody'),original=host.innerHTML;
let contentWidth=500;
Object.defineProperties(host,{scrollWidth:{get:()=>contentWidth},scrollHeight:{get:()=>800},offsetHeight:{get:()=>800}});
w.eval(fs.readFileSync('ratib-preview-zoom-3.6.213.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
const viewport=host.closest('.ratib-preview-zoom-viewport');Object.defineProperty(viewport,'clientWidth',{get:()=>500});w.dispatchEvent(new w.Event('resize'));
const tick=()=>new Promise(r=>w.setTimeout(r,50));
(async()=>{
 await tick();const tools=viewport.previousElementSibling,button=label=>tools.querySelector('[aria-label="'+label+'"]');
 button('تكبير المعاينة').click();assert.equal(host.style.transform,'scale(1.25)');assert.equal(host.parentElement.style.height,'1000px');assert.equal(host.innerHTML,original,'zoom never changes printed/exported content');
 button('تصغير المعاينة').click();assert.equal(host.style.transform,'scale(1)');
 function touch(type,points){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))});viewport.dispatchEvent(e);return e;}
 assert(!touch('touchstart',[[0,0]]).defaultPrevented,'single-finger scrolling remains native');touch('touchstart',[[0,0],[100,0]]);assert(touch('touchmove',[[0,0],[200,0]]).defaultPrevented);assert.equal(host.style.transform,'scale(2)');touch('touchend',[]);
 button('ملاءمة المعاينة للشاشة').click();assert.equal(host.style.transform,'scale(1)');
 contentWidth=800;button('ملاءمة المعاينة للشاشة').click();assert.equal(host.style.transform,'scale(0.63)');assert.equal(host.style.left,'189px','RTL overflow remains inside the scrollable extent');assert.equal(host.parentElement.style.width,'504px');contentWidth=500;
 for(let i=0;i<30;i++)button('تكبير المعاينة').click();assert.equal(host.style.transform,'scale(4)');assert(button('تكبير المعاينة').disabled);
 host.innerHTML='<p>مستند جديد</p>';await tick();assert.equal(host.style.transform,'scale(1)');
 const late=d.createElement('div');late.id='ratibSpecialPreview';late.innerHTML='<div id="ratibSpecialPreviewPages"><canvas></canvas></div>';d.body.append(late);await tick();assert(d.getElementById('ratibSpecialPreviewPages').dataset.ratibPreviewZoom);assert.equal(d.querySelectorAll('.ratib-preview-zoom-tools').length,3);
 console.log('PASS document zoom: plus/minus/fit, bounded pinch, native single-finger pan, content unchanged, fresh-preview reset and late financial report canvases');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
