/* Trial 3.6.109.03: quick entry and deferred Excel without breaking offline support. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const dom=new JSDOM(html,{url:'https://ratibtrial.pages.dev/',runScripts:'outside-only'});
const d=dom.window.document;
assert.equal(d.querySelector('script[src="./vendor/xlsx.full.min.js"]'),null,'Excel cannot block first paint');
const links=[...d.querySelectorAll('#dashboardHomeContent .ratib-quick-entry-grid button')];
assert.deepEqual(links.map(b=>b.textContent.trim()),['سند قبض / صرف','قيد بسيط','قيد مركب']);
assert(links.every(b=>b.getAttribute('onclick').includes("navigateToTab('pageExpenses'")));
assert.equal(d.querySelectorAll('#dashboardHomeContent .main-menu-grid .main-menu-btn').length,4,'existing sections remain available');
assert(html.includes("async function exportTrialExcel(){try{await ensureSpreadsheet();"));
assert(!html.includes('exportOpeningImport('),'old import export removed');
assert(!html.includes('readExternalImportFile('),'old import reader removed');
assert(commerce.includes("if(action==='export'||action==='template'){await window.ratibEnsureSpreadsheet?.()"));
assert(commerce.includes("reader.onload=async()=>{try{\n await window.ratibEnsureSpreadsheet?.()"));
assert(worker.includes('"./vendor/xlsx.full.min.js"'),'offline shell keeps Excel available');
const source=html.match(/function loadLocalScript\(src\)\{[\s\S]*?\n\}\n\nasync function ensureSpreadsheet\(\)\{[\s\S]*?\n\}/)?.[0];
assert(source,'shared lazy loader must be present');
let appends=0;
const mock={window:{},document:{
 createElement(){return{remove(){}};},
 head:{append(el){appends++;assert.equal(el.src,'./vendor/xlsx.full.min.js');queueMicrotask(()=>{mock.XLSX={utils:{}};el.onload();});}}
}};
vm.runInNewContext('const _scriptLoads=new Map();\n'+source+'\nwindow.testEnsureSpreadsheet=ensureSpreadsheet;',mock);
(async()=>{
 await Promise.all([mock.window.testEnsureSpreadsheet(),mock.window.testEnsureSpreadsheet()]);
 await mock.window.testEnsureSpreadsheet();
 assert.equal(appends,1,'simultaneous exports should load a single copy');
 for(const script of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim()))assert.doesNotThrow(()=>new vm.Script(script));
 assert.doesNotThrow(()=>new vm.Script(commerce));
 dom.window.close();
 console.log('PASS trial quick actions and lazily loaded offline-ready Excel');
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
