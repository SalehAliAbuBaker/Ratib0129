'use strict';
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=readFileSync('index.html','utf8');
function functionSource(name){
 const from=html.indexOf('function '+name+'(');assert(from>=0);
 let brace=html.indexOf('{',from),level=1,end=brace+1;
 while(level&&end<html.length){if(html[end]==='{')level++;if(html[end]==='}')level--;end++;}
 return html.slice(from,end);
}
for(const type of ['entry','spend','multi']){
 const visited=[],form=[],hidden=new Set();
 const ctx={_appHistoryPending:null,_restoringAppView:false,currentActiveTab:'pageDashboard',
  document:{getElementById:id=>{assert.equal(id,'voucherSelectorCard');return {classList:{add:x=>hidden.add(x),contains:x=>hidden.has(x)}};}},
  navigateToTab(tab,remember){assert(remember);visited.push(ctx.currentActiveTab);ctx.currentActiveTab=tab;hidden.delete('hidden');},
  rememberAppView(){visited.push('selector');},recordAppHistory:s=>form.push(s),
  selectVoucherTypeDirect:t=>ctx.setVoucherFormHistory(t),selectMultiVoucherType:()=>ctx.setVoucherFormHistory('multi-entry')};
 vm.createContext(ctx);vm.runInContext(functionSource('setVoucherFormHistory')+'\n'+functionSource('openDashboardVoucher'),ctx);
 ctx.openDashboardVoucher(type);assert.deepEqual(visited,['pageDashboard']);assert.equal(form.length,1);
 hidden.clear();ctx.setVoucherFormHistory('entry');assert.equal(visited.at(-1),'selector');
}
console.log('PASS home voucher shortcuts return directly home; a visited selector keeps its own history entry.');

const restored=[];
const fallback={
 ratibRestorePrintScreen(){},document:{getElementById:()=>({style:{display:'none'}})},
 _appExited:false,_exitPromise:null,_appHistoryPending:null,closeTransientAppUi:()=>false,
 ratibVoucherHasUnsavedEdits:()=>false,currentActiveTab:'pageExpenses',_appBackStack:[],
 navigateToTab:(destination,remember)=>restored.push([destination,remember])
};
vm.runInNewContext(functionSource('goBackInApp')+';goBackInApp();',fallback);
assert.deepEqual(restored,[['pageDashboard',false]],'A resumed voucher without a previous view returns home');