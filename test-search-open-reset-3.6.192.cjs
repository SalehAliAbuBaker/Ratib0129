// Ratib 3.6.192 — search-and-open regression; synthetic data only.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.match(html,/الإصدار 3\.6\.192/);
assert.match(sw,/smart-account-search-reset-3\.6\.192/);
assert.equal(pkg.version,'3.6.192');
assert.match(html,/const choose=item=>\{if\(!item\)return;clearTimeout\(timer\);hide\(\);openAccountFromPager\(item.name,\[item.name\]\);\};/);
assert.match(html,/function openDocumentDetailsModal\(item\) \{[\s\S]{0,180}ratibClearTextSearchAfterTargetOpen\(\)/);
assert.match(html,/const pagerInput=document.getElementById\('accountsPagerSearchInput'\)/);
assert.match(html,/const pagerPopup=document.getElementById\('accountsPagerSuggestions'\)/);
function functionSource(name){
 const at=html.indexOf('function '+name+'(');assert(at>=0,'function '+name+' defined');
 const start=html.indexOf('{',at);let depth=0;
 for(let i=start;i<html.length;i++){
  if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(at,i+1);
 }
 throw Error('Unbalanced '+name);
}
const fields={
 ledgerSearchInput:{value:'مؤسسة'},
 ratibAccountMovementSearchInput:{value:'صدقة'},
 statementSearchInput:{value:'مدرسة'}
};
const scheduled=[],calls={ledger:0,movements:0,reports:0};
const context=vm.createContext({
 document:{getElementById:id=>fields[id]||null},
 currentActiveTab:'pageLedger',currentLedgerSearchQuery:'مؤسسه',ledgerVisibleLimit:100,
 ledgerRenderTimer:123,clearTimeout:()=>{},
 requestAnimationFrame:fn=>scheduled.push(fn),
 renderAllData:()=>calls.ledger++,
 accountOpsState:{accountName:'حساب المؤسسة',scopeNames:['حساب المؤسسة'],movementSearch:'صدقه',viewPages:{YER:3},from:'2026-11-01',to:'2026-11-12'},
 accountOpsUi:{panelId:'accountOperationsStandalonePanel'},
 _ratibStatementSearchTimer:4,renderAccountOperations:()=>calls.movements++,
 activeReportTab:'accounts',currentStatementSearchQuery:'مدرسه',runAccountStatement:()=>calls.reports++
});
vm.runInContext(functionSource('ratibClearTextSearchAfterTargetOpen'),context);
const invoke=()=>vm.runInContext('ratibClearTextSearchAfterTargetOpen()',context);
invoke();
assert.equal(fields.ledgerSearchInput.value,'');
assert.equal(context.currentLedgerSearchQuery,'');
assert.equal(context.ledgerVisibleLimit,50);
assert.equal(calls.ledger,0,'refresh is deferred until after result opens');
scheduled.shift()();assert.equal(calls.ledger,1);
context.currentActiveTab='pageAccountOperations';invoke();
assert.equal(fields.ratibAccountMovementSearchInput.value,'');
assert.equal(context.accountOpsState.movementSearch,'');
assert.equal(context.accountOpsState.from,'2026-11-01');
assert.equal(context.accountOpsState.to,'2026-11-12');
assert.equal(context.accountOpsState.accountName,'حساب المؤسسة');
assert.equal(Object.keys(context.accountOpsState.viewPages).length,0);
scheduled.shift()();assert.equal(calls.movements,1);
context.currentActiveTab='pageReports';invoke();
assert.equal(fields.statementSearchInput.value,'');
assert.equal(context.currentStatementSearchQuery,'');
scheduled.shift()();assert.equal(calls.reports,1);
invoke();assert.equal(scheduled.length,0,'empty queries need no rerender');
for(const name of ['ratibSearchFold','normalizeParentQuery','ratibAccountSearchMatch','accountsPagerCandidates'])
 vm.runInContext(functionSource(name),context);
const pairs=[['مؤسسة','مؤسسه'],['مدرسة','مدرسه'],['أمانة','امانه'],['صدقة','صدقه']];
for(const [left,right] of pairs){
 assert.equal(context.ratibSearchFold(left),context.ratibSearchFold(right));
 assert.equal(context.ratibAccountSearchMatch(left,right),true);
 assert.equal(context.ratibAccountSearchMatch(right,left),true);
}
context.window={RatibSimpleAccounts:{isSimple:()=>true,groupOf:()=>null}};
context.getCanonicalCatalog=()=>[{main:'الأصول',group:'الصندوق',sub:'اليوميات',details:[['100','مؤسسة الرحمة'],['200','مدرسة الأمانة']]}];
const candidates=vm.runInContext("accountsPagerCandidates('مؤسسه')",context);
assert.equal(candidates.length,1,'unclassified account visible in simple mode');
assert.equal(candidates[0].name,'مؤسسة الرحمة');
assert.equal(context.ratibAccountSearchMatch('مدرسة الأمانة','مدرس'),true);
console.log('Ratib 3.6.192 search/open + Arabic endings + non-mutating reset — PASS');
