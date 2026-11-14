'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-cloud-due-3.6.130.css','utf8');
const sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.198');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.198","build":"p19800"'));
assert(sw.includes('v260-opening-mobile-clean-3.6.139'));
assert(html.includes('ratib-cloud-due-3.6.130.css?v=3.6.139'));
assert(sw.includes('"./ratib-cloud-due-3.6.130.css"'));
assert(css.includes('#cloudBackupDueModal .ratib-cloud-due-card'));
assert(html.includes('id="cloudBackupDueRunBtn"')&&html.includes('id="cloudBackupDueCancelBtn"'));
assert(html.includes('aria-modal="true"'),'Scheduled backup asks for approval in a real dialog');
assert(html.includes("runCloudBackup(true, 'official')"),'Due card is always backed up to the official folder');
const start=html.indexOf("const CLOUD_CFG_KEY = 'cloud_backup_cfg';"),end=html.indexOf('function normalizeTransaction(tx)',start);
assert(start>0&&end>start,'Existing cloud backup engine was retained');
const source=html.slice(start,end);
assert(!source.includes('runCloudBackup(false)'), 'Scheduled checks must never upload silently');
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body>'+
'<div class="modal-overlay" id="cloudBackupDueModal" role="dialog"><div class="modal-content">'+
'<h3 id="cloudBackupDueTitle">نسخ سحابي</h3><p id="cloudBackupDueMessage"></p><p id="cloudBackupDueStatus"></p>'+
'<button id="cloudBackupDueRunBtn">عمل نسخة احتياطية</button>'+
'<button id="cloudBackupDueCancelBtn">إلغاء</button></div></div>'+
'<section id="cloudBackupSection">'+
'<div id="cloudBackupStatus"></div><div id="cloudBackupLastTime"></div><div id="cloudBackupWarn" style="display:none"></div>'+
'<input id="cloudEmailInput"><input id="cloudTimeInput"><select id="cloudUploadDestination"><option value="trial">التجريبية</option><option value="official">الرسمية</option></select>'+
'<button id="cloudSaveBtn"></button><button id="cloudRunNowBtn"></button><button id="cloudDisableBtn"></button>'+
'</section></body></html>',
{url:'https://salehaliabubaker.github.io/Ratib0129/',runScripts:'outside-only',pretendToBeVisual:true});
const document=dom.window.document,storage=dom.window.localStorage;
const saved={cloud_backup_cfg:{enabled:true,email:'user@example.com',time:'00:00',lastDate:'',lastStatus:''}};
const state={calls:[],toasts:[],timers:[],alerts:[]};
const store={get:(k,d)=>saved[k]??d,set:(k,v)=>{saved[k]=v;},_setSilent:(k,v)=>{saved[k]=v;}};
const context=vm.createContext({
 window:dom.window,document,localStorage:storage,
 navigator:{onLine:false},location:{protocol:'https:',hostname:'salehaliabubaker.github.io'},
 store,_appExited:false,_pad2:x=>String(x).padStart(2,'0'),
 getSecurityConfig:()=>({enabled:true}),setInterval:()=>0,setTimeout:()=>0,
 showToast:m=>state.toasts.push(m),console:{warn(){},error(){}},confirm:()=>true,
 URL,Date,encodeURIComponent
});
vm.runInContext(source+'\nthis.cloudPromptTest={cloudBackupDue,checkCloudBackupDue,initCloudBackup,getCloudCfg,dismissCloudDueCard};',context);
const f=context.cloudPromptTest;
const card=document.getElementById('cloudBackupDueModal');
const click=id=>document.getElementById(id).click();
function patchBackup(success){
 context.__calls=state.calls;context.__backupSuccess=success;
 vm.runInContext("runCloudBackup=async (interactive,dest)=>{__calls.push([interactive,dest]); if(__backupSuccess){saveCloudCfg({lastDate:_todayStr(),lastStatus:'verified',lastError:''});return true;} return false;};",context);
}
(async()=>{
 f.initCloudBackup();
 assert(f.cloudBackupDue(),'Configured daily schedule is due');
 dom.window.__ratibProceedInitialized=false;
 await f.checkCloudBackupDue();
 assert(!card.classList.contains('show'),'Never expose a backup reminder over the locked app');
 assert.equal(state.calls.length,0,'No upload during locked check');
 dom.window.__ratibProceedInitialized=true;
 context.navigator.onLine=true;
 await f.checkCloudBackupDue();
 assert(card.classList.contains('show'),'Due reminder card is visible');
 assert(document.getElementById('cloudBackupDueMessage').textContent.includes('Ratib Backups'));
 assert.equal(state.calls.length,0,'Checking due date never uploads even if online');
 click('cloudBackupDueCancelBtn');
 assert(!card.classList.contains('show'),'Cancel closes due card');
 assert.equal(saved.cloud_backup_cfg.lastDate,'','Cancel must not mark backup as completed');
 assert.equal(saved.cloud_backup_cfg.enabled,true,'Cancel must not disable recurring schedule');
 assert.equal(storage.getItem('ratib_official_cloud_due_dismissed_date_v1'),vm.runInContext('_todayStr()',context),'Today dismissed only');
 await f.checkCloudBackupDue();
 assert(!card.classList.contains('show'),'Cancelled date does not nag after every scheduled check');
 storage.removeItem('ratib_official_cloud_due_dismissed_date_v1');
 vm.runInContext("_cloudDueDismissedToday=''",context);
 await f.checkCloudBackupDue();
 assert(card.classList.contains('show'));
 patchBackup(false);
 click('cloudBackupDueRunBtn');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(state.calls.length,1);
 assert.equal(state.calls[0][0],true,'Backup invoked by explicit click only');
 assert.equal(state.calls[0][1],'official','Prompt never targets trial backup folder');
 assert(card.classList.contains('show'),'Failed backup keeps dialog open');
 assert.equal(document.getElementById('cloudBackupDueRunBtn').disabled,false,'Retry enabled after failure');
 assert.equal(saved.cloud_backup_cfg.lastDate,'','Failed backup does not advance schedule');
 patchBackup(true);
 click('cloudBackupDueRunBtn');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(state.calls.length,2,'Retry available');
 assert(!card.classList.contains('show'),'Success closes due card');
 assert.equal(saved.cloud_backup_cfg.lastDate,vm.runInContext('_todayStr()',context),'Only success advances successful backup date');
 await f.checkCloudBackupDue();
 assert(!card.classList.contains('show'),'Success prevents duplicate due card');
 dom.window.close();
 console.log('PASS official 3.6.130: scheduled cloud due confirmation, dismiss day, no automatic upload, official-only click, retry and success');
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
