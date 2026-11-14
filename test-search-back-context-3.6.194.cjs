// Ratib 3.6.198: Back cancels a search in place, without leaving a selected account.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),home=fs.readFileSync('ratib-home-3.6.167.css','utf8'),direct=fs.readFileSync('ratib-home-3.6.171.css','utf8');
const sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.198');
assert.match(sw,/account-font-plus2-search-back-context-3\.6\.197/);
assert.match(html,/الإصدار 3\.6\.198/);
assert.match(html,/\.searchable-item \{[^}]*font-size: calc\(1\.1rem \+ 2px\)/);
assert.match(html,/\.account-sub-name\{[^}]*font-size:calc\(1\.08rem \+ 2px\)/);
assert.match(html,/\.accounts-pager-suggestion\{[^}]*font-size:calc\(\.94rem \+ 2px\)/);
assert.match(home,/\.ratib-smart-result,[^{]*\{[^}]*font-size:calc\(\.79rem \+ 2px\)/);
assert.match(direct,/\.ratib-statement-account strong\{font-size:calc\(\.91rem \+ 2px\)/);
function extract(name){
 const start=html.indexOf('function '+name+'(');
 assert(start>=0,name+' exists');
 const bracket=html.indexOf('{',start);let nesting=0;
 for(let i=bracket;i<html.length;i++){
   if(html[i]==='{')nesting++;
   else if(html[i]==='}'&&!--nesting)return html.slice(start,i+1);
 }
 throw Error('Unclosed function '+name);
}
const ids=[
 'ratibAccountMovementSearchInput','accountOpsFromDate','accountOpsToDate',
 'accountOpsCurrencyFilter','accountAdvancedSearchPanel','ledgerSearchInput',
 'accountsPagerSearchInput','chartAccountSearchInput','accountsPagerSuggestions',
 'statementSearchInput','reportAdvFrom','reportAdvTo','reportStartDate','reportEndDate',
 'reportAdvCurrency','reportFilterType','ratibSmartInput','voucherDate'
];
const fields=Object.fromEntries(ids.map(id=>[id,{value:'',hidden:false,
 classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){},dispatchEvent(){},
 querySelector(){return null;}}]));
fields.voucherDate.value='2026-11-13';
fields.accountOpsFromDate.value='2026-11-13';
fields.accountOpsToDate.value='2026-11-13';
let calls={account:0,ledger:0,report:0,pager:0,chart:0,home:0,toolbar:0,navigate:0,hist:0};
let scheduled=[],ledgerDates={from:'',to:''};
const context=vm.createContext({
 document:{getElementById:id=>fields[id]||null,activeElement:{matches:()=>false}},
 window:{
  RatibStatementToolbar:{close:()=>{calls.toolbar++;return true}},
  RatibLedgerDateFilter177:{values:()=>ledgerDates,clear:()=>{ledgerDates={from:'',to:''}}},
  RatibHomeSmartSearchReset:()=>{calls.home++;fields.ratibSmartInput.value='';}
 },
 currentActiveTab:'pageAccountOperations',
 accountOpsState:{accountName:'حساب المؤسسة',scopeNames:['حساب المؤسسة'],currency:'SAR',
  activeCurrency:'SAR',movementSearch:'',from:'',to:'',filtered:false,viewPages:{SAR:2}},
 accountOpsUi:{panelId:'accountOperationsStandalonePanel'},
 _ratibStatementSearchTimer:null,ledgerRenderTimer:null,ledgerVisibleLimit:100,
 currentLedgerSearchQuery:'',currentStatementSearchQuery:'',
 reportAdv:{from:'',to:'',active:false,currency:'ALL'},
 requestAnimationFrame:fn=>scheduled.push(fn),clearTimeout(){},
 renderAccountOperations:()=>{calls.account++},renderAllData:()=>{calls.ledger++},
 runActiveReport:()=>{calls.report++},
 renderAccountsPager:()=>{calls.pager++},
 renderCanonicalChartOfAccounts:()=>{calls.chart++},
 Event:function(){},
 _appHistoryPending:null,_appBackStack:[],_appHistoryInitialized:false,_appHistorySession:'fixture',
 _appExited:false,_exitPromise:null,allowExit:false,_appHomeReset:false,
 closeTransientAppUi:()=>false,ratibRestorePrintScreen:()=>{},
 ratibVoucherHasUnsavedEdits:()=>false,ratibAskVoucherLeave:()=>Promise.resolve(true),
 accountOperationsReturnTab:'pageAccountsTree',navigateToTab:()=>{calls.navigate++},
 showExitModal:()=>{},beginAppHistoryMovement:()=>Promise.resolve(true),
 history:{state:{},back:()=>{calls.hist++}},_appSavedViews:new Map(),
 _appCurrentHistoryDepth:1,_appReplayDepth:null,_restoringAppView:false,
 captureAppView:()=>({tab:'pageAccountOperations'}),
 finishAppHistoryMovement:()=>{},
 ratibGestureDraftCheck:()=>true,ratibGestureDashboard:()=>{throw Error('moved to home')},
 _appHistorySession:'fixture'
});
for(const name of ['ratibCancelSearchWithoutLeaving','goBackInApp','handleRatibPopState'])
 vm.runInContext(extract(name),context);
assert.equal(context.ratibCancelSearchWithoutLeaving(),false,'prefilled date is not an applied date search');
assert.equal(fields.accountOpsFromDate.value,'2026-11-13');
context.accountOpsState.movementSearch='حوالة';
context.accountOpsState.from='2026-11-01';
context.accountOpsState.to='2026-11-13';
context.accountOpsState.filtered=true;
fields.ratibAccountMovementSearchInput.value='حوالة';
fields.accountOpsFromDate.value='2026-11-01';
fields.accountOpsToDate.value='2026-11-13';
vm.runInContext('goBackInApp()',context);
assert.equal(context.currentActiveTab,'pageAccountOperations');
assert.equal(calls.navigate,0,'first Back never leaves the account');
assert.equal(calls.hist,0,'first Back never navigates browser history');
assert.equal(context.accountOpsState.accountName,'حساب المؤسسة');
assert.equal(context.accountOpsState.activeCurrency,'SAR','selected currency tab preserved');
assert.equal(context.accountOpsState.movementSearch,'');
assert.equal(context.accountOpsState.from,'');
assert.equal(context.accountOpsState.to,'');
assert.equal(context.accountOpsState.filtered,false);
assert.equal(fields.ratibAccountMovementSearchInput.value,'');
assert.equal(fields.accountOpsFromDate.value,'');
assert.equal(fields.accountOpsToDate.value,'');
assert.equal(fields.voucherDate.value,'2026-11-13','voucher date is not a search');
assert.equal(calls.account,0,'rerender deferred until after Back event');
scheduled.splice(0).forEach(fn=>fn());
assert.equal(calls.account,1);
vm.runInContext('goBackInApp()',context);
assert.equal(calls.navigate,1,'second Back may leave account normally');

context.currentActiveTab='pageLedger';
context.currentLedgerSearchQuery='شراء';
fields.ledgerSearchInput.value='شراء';
ledgerDates={from:'2026-11-01',to:'2026-11-13'};
assert.equal(context.ratibCancelSearchWithoutLeaving(),true);
assert.equal(fields.ledgerSearchInput.value,'');
assert.equal(context.currentLedgerSearchQuery,'');
assert.equal(ledgerDates.from,'');
scheduled.splice(0).forEach(fn=>fn());
assert.equal(calls.ledger,1);

context.currentActiveTab='pageReports';
context.currentStatementSearchQuery='رسوم';
context.reportAdv={from:'2026-11-01',to:'2026-11-13',currency:'YER',active:true};
fields.reportFilterType.value='custom';
fields.statementSearchInput.value='رسوم';
fields.reportAdvFrom.value='2026-11-01';
fields.reportAdvTo.value='2026-11-13';
assert.equal(context.ratibCancelSearchWithoutLeaving(),true);
assert.equal(context.reportAdv.active,false);
assert.equal(fields.reportFilterType.value,'all');
assert.equal(fields.statementSearchInput.value,'');
scheduled.splice(0).forEach(fn=>fn());
assert.equal(calls.report,1);

context.currentActiveTab='pageAccountsTree';
fields.accountsPagerSearchInput.value='مؤسسه';
assert.equal(context.ratibCancelSearchWithoutLeaving(),true);
assert.equal(fields.accountsPagerSearchInput.value,'');
scheduled.splice(0).forEach(fn=>fn());
assert.equal(calls.pager,1);

context.currentActiveTab='pageDashboard';
fields.ratibSmartInput.value='حساب';
assert.equal(context.ratibCancelSearchWithoutLeaving(),true);
assert.equal(fields.ratibSmartInput.value,'');
assert.equal(calls.home,1);

context.currentActiveTab='pageAccountOperations';
context.accountOpsState.movementSearch='مكافأة';
fields.ratibAccountMovementSearchInput.value='مكافأة';
context._appHistoryInitialized=true;
context._appCurrentHistoryDepth=2;
context._appHistorySession='fixture';
context.history={state:{ratibGuard:true,ratibSession:'fixture',ratibDepth:1},go:n=>{calls.hist=n}};
vm.runInContext('handleRatibPopState()',context);
assert.equal(calls.hist,1,'phone Back replays the same history entry');
assert.equal(context.accountOpsState.accountName,'حساب المؤسسة');
assert.equal(context.accountOpsState.movementSearch,'');
assert.equal(calls.navigate,1,'phone Back does not cause a second page navigation');
console.log('PASS Ratib 3.6.198: account font +2px and Back clears text/date in place');
