'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),{execFileSync}=require('node:child_process');
const css=fs.readFileSync('ratib-interface-font-3.6.148.css','utf8');
const script=fs.readFileSync('ratib-global-button-size-3.6.146.js','utf8');
const sizes=['xxsmall','xsmall','small','medium','large','xlarge','xxlarge'];
const dom=new JSDOM('<input id="ratibGlobalFontSize" type="range" min="1" max="7"><output id="ratibGlobalFontSizeValue"></output>',{url:'https://ratib.test',runScripts:'outside-only'});
const w=dom.window;w.localStorage.setItem('ratib_ui_font_size_v1','small');w.localStorage.setItem('ratib_ui_button_size_v1','xlarge');w.eval(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(w.RatibButtonSizing.getFont(),'small');
let prev=0;
for(const [i,size] of sizes.entries()){
 const slider=w.document.getElementById('ratibGlobalFontSize');slider.value=String(i+1);slider.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(w.document.documentElement.dataset.ratibFontSize,size);
 assert.equal(w.localStorage.getItem('ratib_ui_font_size_v1'),size);
 assert.equal(w.localStorage.getItem('ratib_ui_button_size_v1'),'xlarge');
 const rule=css.match(new RegExp('data-ratib-font-size="'+size+'"[^{}]*\\{--ratib-font-scale:([.\\d]+)'));
 assert(rule,size);const scale=Number(rule[1]);assert(scale>prev);prev=scale;
}
w.close();
require('./android/tools/bundle-web.cjs');
const generated=fs.readFileSync('android/app/src/main/assets/www/ratib-interface-font-3.6.148.css','utf8');
assert.equal((generated.match(/--ratib-font-scale:[.\d]+\s*!important/g)||[]).join(','),'--ratib-font-scale:1!important','Only print may reset the scale');
const java=fs.readFileSync('android/app/src/main/java/dev/ratib/android/MainActivity.java','utf8');
const bridge=java.slice(java.indexOf('case "interfaceFont"'),java.indexOf('case "treeStatus"'));
assert(bridge.includes('final int zoom=100;'));assert(!bridge.includes('zoom=130'));
// New rules are screen-only; existing print scale remains neutral.
const addition=css.slice(css.indexOf('/* One screen scale'));
assert(addition.includes('@media screen'));assert(!addition.includes('@media print'));
assert(css.includes(':root{--ratib-font-scale:1!important}'));
assert(addition.includes('font-variant-numeric:tabular-nums'));
assert(addition.includes('overflow-wrap:anywhere'));
assert(java.includes('if(main)settings.setTextZoom(100);'));
const html=fs.readFileSync('index.html','utf8');
assert(html.indexOf('href="./ratib-interface-font')>html.indexOf('href="./ratib-home-uniform'));
console.log('PASS typography: seven live settings, retained preferences, independent button sizing, single Android scale and isolated print');
