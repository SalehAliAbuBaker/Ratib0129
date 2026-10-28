'use strict';
const currentRelease=require('./tools/assert-release.cjs')();
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'), sidebar=read('ratib-sidebar-3.6.124.js');
const sizeJs=read('ratib-global-button-size-3.6.146.js');
const buttonCss=read('ratib-global-button-size-3.6.146.css');
const fontCss=read('ratib-interface-font-3.6.148.css');
const sw=read('sw.js');
const pkg=require('./package.json');
const levels=['xsmall','small','medium','large','xlarge'];
assert.equal(pkg.version,currentRelease);
assert(html.includes('const RATIB_RELEASE={"version":"'+currentRelease+'"'));
assert(sw.includes('-'+currentRelease));
for(const size of levels){
 assert(sizeJs.includes("'"+size+"'"),'missing size value '+size);
 assert(buttonCss.includes('data-ratib-button-size="'+size+'"'),'button CSS missing '+size);
 assert(fontCss.includes('data-ratib-font-size="'+size+'"'),'font CSS missing '+size);
 assert(sidebar.includes('<option value="'+size+'">'),'settings selector missing '+size);
}
assert(sidebar.includes('<option value="medium">متوسط (الافتراضي)'));
assert(sizeJs.includes("x==='normal'?'medium'"),'migrate earlier normal font preference');
assert(html.includes("const RATIB_GOOGLE_CLIENT_ID = '127962228897-k19m5nstjaun38k38348er1c9cf8vemb.apps.googleusercontent.com'"));
assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"),'trial backups must remain separate');
assert(html.includes("const CLOUD_LEGACY_FOLDER_NAME = 'Ratib Backups'"),'restore/legacy browse must remain available');
assert(html.includes('await verifyCloudFile(token, pending)'),'verify upload before success');
const start=html.indexOf('async function ratibGestureDraftCheck(){');
const end=html.indexOf('const _appBackStack=[];',start);
assert(start>0&&end>start);
const handler=html.slice(start,end);
async function gesture(initialTab,known=true,transient=false){
 const counts={home:0,exit:0,forward:0,close:0};
 const ctx={
  allowExit:false,_appExited:false,_appHistoryInitialized:true,_restoringAppView:false,hasUnsavedChanges:false,window:{RatibCommerce:{hasUnsavedDraft:()=>false}},
  document:{getElementById:()=>({style:{display:'none'}})},
  history:{state:known?{ratibGuard:true,ratibSession:'a',ratibDepth:0}:{page:'ratib_app_base'},forward:()=>counts.forward++,go:()=>{},back:()=>{}},
  currentActiveTab:initialTab,_appHistorySession:'a',
  _appHomeReset:false,_appReplayDepth:null,_appCurrentHistoryDepth:1,
  _appBackStack:[{tab:'pageDashboard'}],_appSavedViews:new Map(),
  closeTransientAppUi:()=>{if(!transient)return false;counts.close++;return true;},
  ratibRestorePrintScreen:()=>{}, // Navigation is tested without loading the print module.
  navigateToTab:tab=>{assert.equal(tab,'pageDashboard');counts.home++;ctx.currentActiveTab=tab;},
  captureAppView:()=>({tab:ctx.currentActiveTab}),
  finishAppHistoryMovement:()=>{},recordAppHistory:()=>{},
  showExitModal:()=>counts.exit++,
 };
 vm.runInNewContext(handler+'\nhandleRatibPopState()',ctx);
 await new Promise(resolve=>setImmediate(resolve));
 return {counts,ctx};
}
async function run(){
for(const tab of ['pageExpenses','pageLedger','pageReports','pageAccountsTree','pageAccountOperations','pageSettings','pageCommerce']){
 const {counts,ctx}=await gesture(tab,false);
 assert.equal(counts.home,1,tab+' must go home on Android Back');
 assert.equal(counts.exit,0,tab+' must not ask to exit');
 assert.equal(ctx._appBackStack.length,0,tab+' must clear visual stack');
}
assert.equal((await gesture('pageDashboard',false)).counts.exit,1,'only dashboard may show exit dialog');
const modal=await gesture('pageReports',true,true);
assert.equal(modal.counts.close,1,'one transient UI closes first');
assert.equal(modal.counts.exit,0,'closing transient UI must never exit');
for(const snippet of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(snippet);
new Function(sizeJs);new Function(sw);
console.log('PASS trial 3.6.107.09: five size levels, middle default, navigation to home, cloud isolation and syntax');

}
run().catch(error=>{console.error(error);process.exitCode=1;});
