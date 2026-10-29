'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const dom=new JSDOM('<!doctype html><html lang="ar"><body><div id="wrapDefaultIncomeDebit" class="searchable-select-wrap">'+
 '<input id="inpDefaultIncomeDebit" class="searchable-input" type="text"></div>'+
 '<div id="wrapDefaultSpendCredit" class="searchable-select-wrap">'+
 '<input id="inpDefaultSpendCredit" class="searchable-input" type="text"></div>'+
 '<input type="text" id="debitAmount"></body></html>',
 {runScripts:'outside-only',url:'https://ratib.test/',pretendToBeVisual:true});
const w=dom.window;
w.eval(sidebar);
function before(el,character){
 const e=new w.InputEvent('beforeinput',{data:character,inputType:'insertText',bubbles:true,cancelable:true});
 el.dispatchEvent(e);return e.defaultPrevented;
}
for(const id of ['inpDefaultIncomeDebit','inpDefaultSpendCredit']){
 const el=w.document.getElementById(id);
 assert.equal(before(el,'ع'),false,'account selector must accept Arabic characters: '+id);
 el.value='عميل جديد';
 el.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(el.value,'عميل جديد','account selection must not be sanitized into a numeric amount: '+id);
}
const amount=w.document.getElementById('debitAmount');
assert.equal(before(amount,'ع'),true,'financial amount input must continue rejecting nonnumeric characters');
amount.value='123ع';amount.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(amount.value,'123','existing amount sanitizer remains intact');
assert(html.includes('if(banner.parentElement!==document.body)document.body.appendChild(banner)'),
 'waiting PWA update banner must be reachable above PIN overlay');
assert(html.includes("reg.update().then(showUpdate).catch("),
 'installed app must actively check for updates when foregrounded');
assert(html.includes('z-index:10005!important'),
 'waiting update banner should remain above the PIN overlay');
assert(sw.includes("const CACHE_VERSION='v261-trial-muyassar-ui-3.6.109.04'"),
 'new trial release must invalidate cached older scripts');
console.log('PASS trial 3.6.109.03: Arabic default account inputs work; numeric amount sanitizer unchanged; PWA updates accessible without clearing financial storage');
dom.window.close();
