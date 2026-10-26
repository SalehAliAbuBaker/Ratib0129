'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-cash-pulse.js','utf8');
const NEW='ratib_trial_pulse_selected_cash_accounts_v2';
const OLD='ratib_trial_pulse_extra_cash_accounts_v1';
function boot(seed={}){
 const dom=new JSDOM('<!doctype html><html><body><div id="dashboardHomeContent"><div class="main-menu-grid"></div></div></body></html>',{
  url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window;
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,JSON.stringify(v));
 w.__ratibProceedInitialized=true;
 w.RatibSimpleAccounts={classify:row=>row.subCode==='1101'?'cash':''};
 w.getSubgroupParents=()=>({});
 w.getCanonicalCatalog=()=>[
  {mainCode:'1',subCode:'1101',group:'الأصول',sub:'الصناديق والبنوك',
   details:[...Array.from({length:12},(_,i)=>['1101'+String(i+1).padStart(3,'0'),'صندوق فرعي '+(i+1)]),['1101999','بنك مستقل']]},
  {mainCode:'1',subCode:'1102',group:'الأصول',sub:'الذمم',details:[['110201','حساب عميل']]},
 ];
 // Imported projection adds a real cash account absent from the canonical chart.
 w.ratibImportVisibleCatalog=()=>[{mainCode:'1',subCode:'1198',group:'الأصول',sub:'نقدية مستوردة',details:[['119801','صندوق مستورد مستقل']]}];
 w.getAllTransactions=()=>[];
 w.getAccountEntry=()=>null;
 w.trialTransactionLegs=()=>[];
 w.getRatibBaseCurrency=()=> 'YER';
 w.getLocalTodayISO=()=> '2026-10-26';
 w.eval(js);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const q=id=>w.document.getElementById(id);
 q('ratibPulseToggle').click();
 return {dom,w,q};
}
function check(app,name,value){
 const x=[...app.q('ratibPulseAccountList').querySelectorAll('input[type=checkbox]')].find(el=>el.value===name);
 assert(x,'Missing account '+name);
 assert.equal(x.disabled,false,'User chooses every account freely');
 x.checked=value;
 x.dispatchEvent(new app.w.Event('change',{bubbles:true}));
}
{
 const app=boot();
 assert.equal(app.q('ratibPulseReadout').hidden,true,'12 auto-detected boxes must not be forced');
 assert.equal(app.q('ratibPulseAccount').options.length,0);
 const all=[...app.q('ratibPulseAccountList').querySelectorAll('input[type=checkbox]')];
 assert.equal(all.length,15,'12 boxes, bank, client and imported cash account all visible');
 assert(all.every(x=>!x.disabled&&!x.checked),'No preselected or locked account');
 check(app,'صندوق مستورد مستقل',true);
 assert.equal(app.q('ratibPulseAccount').value,'صندوق مستورد مستقل');
 assert.deepEqual(JSON.parse(app.w.localStorage.getItem(NEW)),['صندوق مستورد مستقل']);
 const saved=JSON.parse(app.w.localStorage.getItem(NEW));
 app.dom.window.close();
 const reopened=boot({[NEW]:saved});
 assert.equal(reopened.q('ratibPulseAccount').value,'صندوق مستورد مستقل','Stored single-account selection survives restart');
 assert.equal(reopened.q('ratibPulseAccount').options.length,1,'Only selected account may be shown');
 check(reopened,'صندوق مستورد مستقل',false);
 assert.equal(reopened.q('ratibPulseReadout').hidden,true,'Removing last account does not display zeros');
 reopened.dom.window.close();
}
{
 const app=boot({[OLD]:['بنك مستقل']});
 assert.deepEqual(JSON.parse(app.w.localStorage.getItem(NEW)),['بنك مستقل'],'Migrate only explicit manual additions');
 assert.equal(app.q('ratibPulseAccount').value,'بنك مستقل');
 assert.equal(app.q('ratibPulseAccount').options.length,1);
 check(app,'صندوق فرعي 12',true);
 assert.equal(app.q('ratibPulseAccount').value,'بنك مستقل','Retain viewed bank after adding second account');
 assert.equal(app.q('ratibPulseAccount').options.length,3,'Aggregate is an optional third view');
 app.dom.window.close();
}
{
 const app=boot({[OLD]:['بنك مستقل'],[NEW]:[]});
 assert.equal(app.q('ratibPulseAccount').options.length,0,'Explicit empty selection must override legacy preferences');
 assert.equal(app.q('ratibPulseReadout').hidden,true);
 app.dom.window.close();
}
console.log('PASS trial Cash Pulse 3.6.109.16: twelve unlocked suggestions, imported chart inclusion, manual single account, restart persistence and migration');
