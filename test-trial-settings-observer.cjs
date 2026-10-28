'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><head></head><body><button id="sidebarMenuBtn"></button><button id="backToMenuBtn"><span></span></button><aside id="appSidebar"><div class="sidebar-nav"></div><div class="sidebar-footer"></div></aside><div id="pageSettings"></div></body></html>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,page=w.document.getElementById('pageSettings');
w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.navigateToTab=()=>{};w.closeRatibSidebar=()=>{};
function card(title){const el=w.document.createElement('div');el.className='settings-accordion-card';el.innerHTML='<div class="settings-accordion-header"><span>'+title+'</span></div><div class="settings-accordion-body"><input></div>';return el;}
const finder=w.document.createElement('div');finder.id='ratibSettingsFinder';page.append(finder);
page.append(card('إدارة العملات'),card('إعدادات الحسابات الافتراضية للسندات'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 w.eval(fs.readFileSync(process.argv[2]||'ratib-sidebar-3.6.124.js','utf8'));w.dispatchEvent(new w.Event('load'));await pause(120);
 const picker=w.document.getElementById('ratibGlobalButtonSize');picker.focus();let mutations=0;
 const observer=new w.MutationObserver(records=>mutations+=records.length);observer.observe(page,{childList:true});
 await pause(160);assert.equal(mutations,0,'settled settings must not reparent cards every animation frame');assert.equal(w.document.activeElement,picker);
 // A lazily created settings card can trigger one reorder, but it must settle.
 page.append(card('الإدخال الصوتي'));await pause(120);mutations=0;picker.focus();await pause(160);
 assert.equal(mutations,0,'late modules must not restart a feedback loop');assert.equal(w.document.activeElement,picker);
 assert.equal(page.firstElementChild.id,'ratibSettingsFinder');assert.equal(w.document.getElementById('ratibGlobalButtonSize'),picker);
 observer.disconnect();console.log('PASS real sidebar observer settles after boot/late card, preserves focused picker and card identity');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
