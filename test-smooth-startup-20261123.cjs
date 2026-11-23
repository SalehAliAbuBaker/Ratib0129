'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const spreadsheet=html.slice(html.indexOf('async function ensureSpreadsheet(){'),html.indexOf('async function ensureCharts(){'));
assert(spreadsheet.includes('loadLocalScript'));
assert(!/<script[^>]+src=["']\.\/vendor\/xlsx\.full\.min\.js/.test(html),'Excel must not block startup');
assert(html.includes('async function exportTrialExcel(){try{await ensureSpreadsheet();'));
assert(html.includes("if(kind!=='pdf')await ensureSpreadsheet();"),'PDF must not load Excel');
async function excel(){
 const dom=new JSDOM('<!doctype html><head></head><body></body>',{runScripts:'outside-only',url:'https://app.ratib.local/'}),w=dom.window;
 w.eval('const _scriptLoads=new Map();'+spreadsheet+';window.ensureExcel=ensureSpreadsheet;');
 const first=w.ensureExcel(),second=w.ensureExcel();
 assert.equal(w.document.scripts.length,1,'Concurrent operations share one loader');
 w.document.scripts[0].dispatchEvent(new w.Event('error'));
 const failures=await Promise.allSettled([first,second]);assert(failures.every(x=>x.status==='rejected'));
 const retry=w.ensureExcel();assert.equal(w.document.scripts.length,1,'Failed resource can be retried');
 w.eval(fs.readFileSync('vendor/xlsx.full.min.js','utf8'));
 w.document.scripts[0].dispatchEvent(new w.Event('load'));await retry;await w.ensureExcel();
 const rows=[['الحساب','مدين','دائن'],['حساب تجريبي',125.75,0]],sheet=w.XLSX.utils.aoa_to_sheet(rows),book=w.XLSX.utils.book_new();
 w.XLSX.utils.book_append_sheet(book,sheet,'كشف');
 const restored=w.XLSX.read(w.XLSX.write(book,{bookType:'xlsx',type:'array'}),{type:'array'});
 assert.equal(restored.Sheets['كشف'].B2.v,125.75);dom.window.close();
}
async function fields(){
 const dom=new JSDOM('<!doctype html><body><main id="large"></main><section id="new"></section></body>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
 d.getElementById('large').innerHTML=Array.from({length:6000},(_,i)=>'<div>row '+i+'</div>').join('');
 const start=html.indexOf('function enhanceFinancialFields(root=document){'),end=html.indexOf('function initFinancialTools(){',start);
 w.openFinancialCalculator=()=>{};w.eval(html.slice(start,end));
 let scans=0;const original=d.querySelectorAll.bind(d);d.querySelectorAll=(...args)=>{scans++;return original(...args);};
 const observerStart=html.indexOf('  const pendingRoots=new Set();let scheduled=false;');
 const observerEnd=html.indexOf('  // Authentication controls',observerStart);
 w.eval(html.slice(observerStart,observerEnd));
 const host=d.getElementById('new'),input=d.createElement('input');input.type='number';host.append(input);
 await new Promise(r=>setTimeout(r,30));
 assert.equal(input.dataset.calculatorReady,'1','A directly inserted input is enhanced');
 assert.equal(host.querySelectorAll('.financial-calc-trigger').length,1,'Observer cannot create duplicate calculators');
 assert.equal(scans,0,'Local changes never rescan the whole document');
 host.append(d.createTextNode('text update'));
 const disabled=d.createElement('input');disabled.type='number';disabled.disabled=true;host.append(disabled);
 await new Promise(r=>setTimeout(r,30));assert.equal(disabled.dataset.calculatorReady,undefined);
 assert.equal(scans,0);dom.window.close();
}
(async()=>{await excel();await fields();console.log('PASS lazy Excel, concurrent load, retry, real XLSX roundtrip, scoped observer, direct inputs and no document rescans');})().catch(e=>{console.error(e);process.exitCode=1;});
