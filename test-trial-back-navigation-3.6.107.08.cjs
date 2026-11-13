'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sizeJs=fs.readFileSync('ratib-global-button-size-3.6.146.js','utf8');
const sizeCss=fs.readFileSync('ratib-global-button-size-3.6.146.css','utf8');
const fontCss=fs.readFileSync('ratib-interface-font-3.6.148.css','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');
const sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.match(pkg.version,/^3\.6\.\d+(?:\.\d+)?$/);
assert(html.includes('const RATIB_RELEASE={"version":"'+pkg.version+'"'));
assert(sw.includes("const CACHE_VERSION='")&&sw.includes(pkg.version));
for(const level of ['xxsmall','xsmall','small','medium','large','xlarge','xxlarge']){
 assert(sizeJs.includes("'"+level+"'"));
 assert(sizeCss.includes('data-ratib-button-size="'+level+'"'));
 assert(fontCss.includes('data-ratib-font-size="'+level+'"'));
 assert(sidebar.includes('type="range" id="ratibGlobalButtonSize" min="1" max="7" step="1"'));
 assert(sidebar.includes('type="range" id="ratibGlobalFontSize" min="1" max="7" step="1"'));
}
assert(sidebar.includes('المستوى 4 من 7 — متوسط'));
assert(sizeJs.includes("value==='normal'?'medium'"));
assert(commerce.includes('window.RatibCommerce.hasUnsavedDraft='));
const from=html.indexOf('function ratibGestureDraftCheck(){'),to=html.indexOf('const _appBackStack=[];',from);
assert(from>0&&to>from);
const code=html.slice(from,to);
function simulate({tab='pageSettings',depth=0,known=true,dirty=false,commerceDirty=false,accept=true,overlay=false,form='single'}={}){
 const log={go:[],forward:0,home:0,exit:0,confirmed:0,leaveDialogs:0,stored:[],flushes:0,done:0,history:[]};
 const ctx={
  allowExit:false,_appExited:false,_appHistoryInitialized:true,_exitPromise:null,_appHistoryPending:null,
  _appHistorySession:'sess',_appExitHistoryDelta:0,_restoringAppView:false,
  _appHomeReset:false,_appReplayDepth:null,_appCurrentHistoryDepth:Math.max(1,depth+1),
  _appBackStack:Array.from({length:Math.max(1,depth+1)},(_,i)=>({tab:i?'pageLedger':'pageDashboard',scrollY:125,ledger:{search:'fixture'}})),_appSavedViews:new Map(),
  currentActiveTab:tab,hasUnsavedChanges:dirty,
  document:{getElementById:id=>({style:{display:'none'},classList:{contains:cl=>cl==='hidden'&&((id==='cashFlowCard'&&form==='multi')||(id==='multiVoucherCard'&&form==='single'))}})},
  window:{RatibCommerce:{hasUnsavedDraft:()=>commerceDirty}},
  history:{state:known?{ratibGuard:true,ratibSession:'sess',ratibDepth:depth}:{page:'ratib_app_base'},go:n=>log.go.push(n),forward:()=>log.forward++,back:()=>{}},
  closeTransientAppUi:()=>overlay,
  ratibCancelSearchWithoutLeaving:()=>false, // no active query in these navigation fixtures
  beginAppHistoryMovement:()=>Promise.resolve(),goBackInApp:()=>{log.requested=true;},
  restoreAppView:view=>{ctx.currentActiveTab=view.tab;log.restored=view;},
  ratibRestorePrintScreen:()=>{}, // Popstate test extracts navigation without the global print module.
  confirm:()=>{log.confirmed++;return accept;},
  ratibVoucherHasUnsavedEdits:()=>tab==='pageExpenses'&&dirty,
  ratibAskVoucherLeave:()=>{log.leaveDialogs++;return Promise.resolve(accept);},
  store:{get:()=>[],set:(k,val)=>log.stored.push([k,val])},
  captureSingleDraft:()=>({amount:'50',note:'test'}),
  updateDraftButton:()=>{},
  flushStorage:()=>{log.flushes++;return Promise.resolve();},
  showToast:()=>{},buildMultiVoucherData:()=>({id:'draft-1'}),
  navigateToTab:target=>{assert.equal(target,'pageDashboard');log.home++;ctx.currentActiveTab=target;},
  captureAppView:()=>({tab:ctx.currentActiveTab}),
  recordAppHistory:x=>log.history.push(x),
  finishAppHistoryMovement:()=>log.done++,
  showExitModal:()=>log.exit++
 };
 vm.runInNewContext(code+'\nhandleRatibPopState()',ctx);
 return {log,ctx};
}
for(const tab of ['pageExpenses','pageReports','pageLedger','pageSettings','pageAccountsTree','pageAccountOperations','pageCommerce']){
 const {log,ctx}=simulate({tab});
 assert.equal(log.restored.tab,'pageDashboard');
 assert.equal(log.exit,0);assert.equal(ctx._appBackStack.length,0);
}
const nested=simulate({tab:'pageExpenses',depth:2});
assert.equal(nested.log.restored.tab,'pageLedger');
assert.equal(nested.log.restored.scrollY,125);
assert.equal(nested.log.restored.ledger.search,'fixture');
assert.equal(nested.ctx._appBackStack.length,2);
assert.deepEqual(nested.log.go,[]);
const base=simulate({tab:'pageReports',known:false,depth:-1});
assert.equal(base.log.home,1);
assert.equal(base.log.forward,1);
assert.equal(base.ctx._appReplayDepth,0);
const canceled=simulate({tab:'pageExpenses',dirty:true,accept:false});
assert.equal(canceled.log.home,0);
assert.deepEqual(canceled.log.go,[1]);
assert.equal(canceled.ctx.currentActiveTab,'pageExpenses');
const single=simulate({tab:'pageExpenses',dirty:true});
assert.equal(single.log.home,0,'navigation waits for three-way modal');
assert.equal(single.log.leaveDialogs,1);
assert.deepEqual(single.log.go,[1]);
assert.equal(single.log.stored.length,0,'no automatic draft write before user selection');
const multi=simulate({tab:'pageExpenses',dirty:true,form:'multi'});
assert.equal(multi.log.leaveDialogs,1);
assert.equal(multi.log.stored.length,0,'compound draft save is opt-in');
const commerceCanceled=simulate({tab:'pageCommerce',commerceDirty:true,accept:false});
assert.equal(commerceCanceled.log.home,0);
assert.deepEqual(commerceCanceled.log.go,[1]);
const overlay=simulate({tab:'pageReports',overlay:true});
assert.equal(overlay.log.home,0);assert.deepEqual(overlay.log.go,[1]);
assert.equal(simulate({tab:'pageDashboard',known:false,depth:-1}).log.exit,1);
for(const script of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(script);
new Function(commerce);new Function(sw);
console.log('PASS 3.6.107.09: five sizes, guarded Android Back, opt-in voucher draft choices, commerce warning and parse checks');
