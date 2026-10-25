'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
require('./tools/assert-release.cjs')();

const src = fs.readFileSync('ratib-statement-marks-3.6.106.05.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const saved = new Map();
const domHtml = '<!doctype html><html><head></head><body><div id="pageAccountOperations"><div id="accountOperationsStandalonePanel"><div class="account-currency-track">' +
 ['a','b','c'].map(id => '<div class="account-statement-row" data-tx-id="' + id + '">' + id + '</div>').join('') +
 '</div></div></div></body></html>';

async function open(accountName='الصندوق') {
 const dom = new JSDOM(domHtml, { url:'https://ratibtrial.pages.dev/', runScripts:'outside-only', pretendToBeVisual:true });
 const w = dom.window;
 w.accountOpsState = { accountName };
 w.__ratibProceedInitialized = true;
 w.store = { get:(k,d)=>saved.get(k)??d, _setSilent:(k,v)=>saved.set(k,v) };
 w.confirm = () => true;
 w.showToast = () => {};
 w.eval(src);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(resolve=>w.setTimeout(resolve,0));
 return { dom, w, row:id=>w.document.querySelector('[data-tx-id="'+id+'"]') };
}

(async()=>{
 let app=await open();
 app.row('a').dispatchEvent(new app.w.Event('contextmenu',{bubbles:true,cancelable:true}));
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),true);
 assert.equal(app.w.RatibStatementMarks.isMarked('a'),true);
 app.row('b').click();
 assert.equal(app.w.RatibStatementMarks.count(),2);
 assert.deepEqual(JSON.parse(JSON.stringify(saved.get('ratib_statement_mark_mode_v1'))),{account:'الصندوق',enabled:true});

 // The restored view can briefly unset the account while Android resumes it.
 app.w.accountOpsState.accountName='';
 app.w.RatibStatementMarks.refresh();
 await new Promise(resolve=>app.w.setTimeout(resolve,0));
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),false);
 app.w.accountOpsState.accountName='الصندوق';
 app.w.RatibStatementMarks.refresh();
 await new Promise(resolve=>app.w.setTimeout(resolve,0));
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),true);

 // A suspended PWA may be evicted and re-created instead of merely resumed.
 app.dom.window.close();
 app=await open('الصندوق');
 assert.equal(app.w.RatibStatementMarks.count(),2);
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),true,'mode must survive process recreation');
 app.row('c').click();
 assert.equal(app.w.RatibStatementMarks.count(),3,'selection must continue without tapping تعليم المزيد');

 app.w.accountOpsState.accountName='البنك';
 app.w.RatibStatementMarks.refresh();
 await new Promise(resolve=>app.w.setTimeout(resolve,0));
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),false,'mode must not leak into another account');
 app.w.accountOpsState.accountName='الصندوق';
 app.w.RatibStatementMarks.refresh();
 await new Promise(resolve=>app.w.setTimeout(resolve,0));
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),true);

 app.w.document.querySelector('[data-statement-mark-action="mode"]').click();
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),false,'explicit finish must disable mode');
 app.dom.window.close();
 app=await open();
 assert.equal(app.w.RatibStatementMarks.isSelectionMode(),false,'finished mode must remain off');
 assert.equal(app.w.RatibStatementMarks.count(),3,'previous marks must remain');
 app.dom.window.close();

 const start=html.indexOf('async function cloudBackupSuccess(item) {');
 const end=html.indexOf('// Resolve a lost upload response',start);
 assert(start>0 && end>start, 'The cloud confirmation handler must be present');
 assert(html.includes('await cloudBackupSuccess(item);'));
 assert(html.includes('const statusPersisted = await cloudBackupSuccess(pending);'));
 const events=[];
 const handler=vm.runInNewContext(html.slice(start,end)+'\ncloudBackupSuccess;',{
  saveCloudCfg:(patch)=>events.push(['status',patch]),
  flushStorage:async()=>events.push(['flush']),
  showToast:()=>{},
  console:{warn:()=>{}},
  _todayStr:()=> '2026-10-25',
  CLOUD_FOLDER_NAME:'Ratib Trial Backups',
  CLOUD_LEGACY_FOLDER_NAME:'Ratib Backups'
 });
 assert.equal(await handler({id:'ok-1',name:'test.json',destination:'trial'}),true);
 assert.equal(events[0][0],'status');
 assert.equal(events[0][1].lastStatus,'verified');
 assert.equal(events[1][0],'flush','verified status must be durably saved');
 const warnings=[];
 const handlerOnFlushError=vm.runInNewContext(html.slice(start,end)+'\ncloudBackupSuccess;',{
  saveCloudCfg:()=>{},
  flushStorage:async()=>{throw new Error('disk unavailable');},
  showToast:msg=>warnings.push(msg),
  console:{warn:()=>{}},
  _todayStr:()=> '2026-10-25',
  CLOUD_FOLDER_NAME:'Ratib Trial Backups',
  CLOUD_LEGACY_FOLDER_NAME:'Ratib Backups'
 });
 assert.equal(await handlerOnFlushError({id:'ok-2',name:'test2.json',destination:'trial'}),false);
 assert(warnings.some(msg=>msg.includes('Google Drive')),'warn on failure to persist local confirmation');

 console.log('PASS trial 3.6.108.05: multi-select mode survives resume/reload with account isolation; cloud confirmation is flushed');
})().catch(e=>{console.error(e);process.exitCode=1;});
