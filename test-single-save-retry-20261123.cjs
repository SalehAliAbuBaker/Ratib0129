'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf("document.getElementById('commitVoucherBtn').addEventListener('click',async()=>{");
const end=html.indexOf("document.getElementById('confirmPdfDocBtn')",start);
assert(start>0&&end>start);
const completion=html.slice(html.indexOf('async function completeFinancialSave(after){'),html.indexOf('function captureSingleDraft(){'));
function fixture(failures=0,license=Promise.resolve(true),displayFailure=false){
 const callbacks={},button={disabled:false,textContent:'حفظ السند',dataset:{},addEventListener:(type,fn)=>callbacks[type]=fn};
 const plan={transactions:[]},counts={built:0,audit:0,completed:0,flush:0},toasts=[];
 const context={document:{getElementById:id=>id==='commitVoucherBtn'?button:id==='printPromptModal'?{classList:{add(){}}}:null},
  _saveAndAddAnother:false,_draftTimer:null,_pendingFinancialCompletion:null,hasUnsavedChanges:true,lastPrintedTx:null,
  clearTimeout(){},alert:message=>{throw Error(message)},showToast:(text,type)=>toasts.push({text,type}),
  buildSimpleVoucherData:()=>({id:'fixture-'+(++counts.built),amount:100,seqNum:1}),getAllTransactions:()=>plan.transactions,
  getMasterPlan:()=>plan,store:{set(key,value){assert.equal(key,'plan');assert.equal(value,plan);},remove:key=>assert.equal(key,'single_voucher_draft_v1')},
  audit(){counts.audit++;},window:{RatibLicense:{beforeCreate:()=>license,recordCreated:()=>counts.completed++}},
  flushStorage:async()=>{counts.flush++;if(failures>0){failures--;throw Error('Synthetic storage failure');}},
  preparePrintVoucherTemplate(){if(displayFailure)throw Error('Synthetic display failure');},updateVoucherSeqBadge(){},renderAllData(){},updateProDashboard(){},selectVoucherTypeDirect(){},
  restoreQuickVoucherOriginAfterSave:()=>false,pushAppHistoryState(){},currentVoucherMode:'entry'};
 vm.createContext(context);vm.runInContext(completion+html.slice(start,end),context);
 return {context,button,counts,plan,toasts,click:()=>callbacks.click()};
}
async function exitFixture(dirty,pending=false,fail=false){
 const writes=[],context={_exitPromise:null,_appExited:false,_pendingFinancialCompletion:null,
  hasUnsavedChanges:dirty,currentActiveTab:'pageExpenses',allowExit:false,
  document:{querySelectorAll:()=>[],getElementById:id=>id==='multiVoucherCard'?{classList:{contains:()=>true}}:id==='cashFlowCard'?{classList:{contains:()=>false}}:null},
  hideExitModal(){},clearTimeout(){},_draftTimer:null,_reminderTimer:null,_autoBackupTimer:null,_storageTimer:null,
  captureSingleDraft:()=>({amount:100,note:'fixture'}),store:{set:(key,value)=>writes.push({key,value}),remove(){}},
  RATIB_RESUME_VIEW_KEY:'fixture-resume',SESSION_KEY_CACHE:'fixture-key',_vaultCryptoKey:null,_vaultUnlocked:false,_memStore:{},
  _appBackStack:[],_appSavedViews:new Map(),_appHistoryInitialized:false,
  sessionStorage:{removeItem(){}},getSecurityConfig:()=>({enabled:false}),showExitedScreen(){},
  navigator:{app:{exitApp(){}}},window:{},showToast(){},flushStorage:async()=>{if(fail)throw Error('Synthetic exit persistence failure');}};
 if(pending)context._pendingFinancialCompletion=()=>{context.hasUnsavedChanges=false;};
 vm.createContext(context);
 const a=html.indexOf('function performRealExit(){'),b=html.indexOf('// Unified safe exit',a);
 vm.runInContext(html.slice(a,b),context);const exited=await context.performRealExit();return {writes,context,exited};
}
(async()=>{
 const failed=fixture(2);
 await failed.click();
 assert.equal(failed.plan.transactions.length,1);assert(failed.context._pendingFinancialCompletion);
 assert.equal(failed.counts.completed,0,'Failure cannot announce financial success');
 assert.equal(failed.context.hasUnsavedChanges,true);assert.equal(failed.button.textContent,'إعادة محاولة الحفظ');
 await failed.click();
 assert.equal(failed.plan.transactions.length,1,'Retry must persist the pending voucher, never append another');
 assert.equal(failed.counts.built,1);assert.equal(failed.counts.audit,1);
 assert.equal(failed.button.dataset.originalLabel,'حفظ السند','Repeated failures retain the actual original label');
 await failed.click();
 assert.equal(failed.plan.transactions.length,1);assert.equal(failed.counts.completed,1);
 assert.equal(failed.context._pendingFinancialCompletion,null);assert.equal(failed.context.hasUnsavedChanges,false);
 assert.equal(failed.button.textContent,'حفظ السند');assert.equal(failed.button.disabled,false);
 // A normal rapid double tap while license validation is pending is already guarded.
 let release;const pending=new Promise(resolve=>release=resolve),rapid=fixture(0,pending);
 const first=rapid.click(),second=rapid.click();assert(rapid.button.disabled);release(true);await Promise.all([first,second]);
 assert.equal(rapid.plan.transactions.length,1);assert.equal(rapid.counts.built,1);assert.equal(rapid.counts.completed,1);
 for(const failures of [0,1]){
  const brokenDisplay=fixture(failures,Promise.resolve(true),true);
  await brokenDisplay.click();if(failures)await brokenDisplay.click();
  assert.equal(brokenDisplay.plan.transactions.length,1);
  assert.equal(brokenDisplay.context._pendingFinancialCompletion,null);
  assert.equal(brokenDisplay.context.hasUnsavedChanges,false);
  assert.equal(brokenDisplay.button.textContent,'حفظ السند');assert.equal(brokenDisplay.button.disabled,false);
  assert.equal(brokenDisplay.toasts.at(-1).type,'warn','Durable save plus display failure must not be reported as storage failure');
  assert(brokenDisplay.toasts.at(-1).text.includes('تم حفظ'));
 }
 const cleanExit=await exitFixture(false);
 assert(cleanExit.exited);assert.equal(cleanExit.writes.length,0,'Exiting a saved form must not recreate its voucher as an unsaved draft');
 const dirtyExit=await exitFixture(true);assert(dirtyExit.exited);assert.equal(dirtyExit.writes.length,1,'A genuinely unsaved form remains protected by exit draft saving');
 const completedExit=await exitFixture(true,true);assert(completedExit.exited);assert.equal(completedExit.writes.length,0,'Completing a pending save during exit must not recreate its draft');
 const failedExit=await exitFixture(true,false,true);assert.equal(failedExit.exited,false);assert.equal(failedExit.context._appExited,false);assert(failedExit.context.hasUnsavedChanges);
 console.log('PASS simple-voucher retry after repeated storage failures, one posting/audit/completion, stable label, preserved draft state and rapid-tap guard');
})().catch(error=>{console.error(error);process.exitCode=1;});
