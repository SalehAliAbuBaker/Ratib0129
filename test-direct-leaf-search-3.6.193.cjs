// Ratib 3.6.199 — action-only account suggestions and all search-session resets.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const home=fs.readFileSync('ratib-home-3.6.167.js','utf8');
const direct=fs.readFileSync('ratib-home-3.6.171.js','utf8');
const pkg=require('./package.json'),sw=fs.readFileSync('sw.js','utf8');
assert.equal(pkg.version,'3.6.199');
assert.match(sw,/account-font-plus2-search-back-context-3\.6\.197/);
assert.match(html,/الإصدار 3\.6\.199/);
assert.match(home,/window\.RatibHomeSmartSearchReset=resetSearchSession/);
assert.match(home,/openAccountFromPager\(item\.data\.name,\[item\.data\.name\]\)/);
assert.doesNotMatch(home,/if\(item\.type==='account'\)goto\('accounts'/);
assert.match(direct,/clearSearch\(\);window\.openAccountFromPager/);
function functionSource(name){
 const at=html.indexOf('function '+name+'(');
 assert(at>=0,name+' exists');
 const start=html.indexOf('{',at);
 let depth=0;
 for(let i=start;i<html.length;i++){
  if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(at,i+1);
 }
 throw Error('Unbalanced '+name);
}
const catalog=[{main:'الأصول',mainCode:'1',group:'الصندوق',groupCode:'11',sub:'نقدي',subCode:'111',
 details:[['1001','صندوق أحمد بافضل'],['1002','مؤسسة الرحمة'],['1003','مدرسة الأمانة']]}];
const fold=x=>String(x||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').trim();
const find=(value,query)=>fold(query).split(/\s+/).every(q=>fold(value).includes(q));
const pagerDOM=new JSDOM('<div id="accountsPagerCard"></div><input id="accountsPagerSearchInput" value="صندوق"><div id="accountsPagerTabs"></div><div id="accountsPagerTrack"></div>',{url:'https://ratib.test/'});
let opened='';
const pager=vm.createContext({
 document:pagerDOM.window.document,
 window:{RatibSimpleAccounts:{isSimple:()=>true,groupOf:()=>null}},
 getCanonicalCatalog:()=>catalog,normalizeParentQuery:fold,
 ratibAccountSearchMatch:find,openAccountFromPager:(name)=>{opened=name},
 ratibAccountsPagerCachedActivity:()=>{throw Error('Do not build accounting ledger index during name search')}
});
for(const name of ['accountsPagerCandidates','renderAccountsPager'])vm.runInContext(functionSource(name),pager);
assert.equal(vm.runInContext("accountsPagerCandidates('مؤسسه')",pager).length,1,'Arabic ة/ه');
assert.equal(vm.runInContext("accountsPagerCandidates('مدرس')",pager).length,1,'partial Arabic');
assert.equal(vm.runInContext("accountsPagerCandidates('الصندوق')",pager).length,0,'parent-only match is not a selectable account');
vm.runInContext('renderAccountsPager()',pager);
const list=pagerDOM.window.document.querySelector('#accountsPagerTrack');
assert.equal(list.querySelectorAll('button').length,1,'only a matching detail shown');
assert(!list.textContent.includes('حسابات الأصول'),'no aggregate headers in search');
list.querySelector('button').click();assert.equal(opened,'صندوق أحمد بافضل');

const dropdownDOM=new JSDOM('<div id="wrapDebitAcc"><input id="inpDebitAcc"><button class="searchable-arrow">▼</button></div><div id="dropDebitAcc"></div><input type="hidden" id="valDebitAcc">',{url:'https://ratib.test/',pretendToBeVisual:true});
const d=dropdownDOM.window.document;
const classStart=html.indexOf('class SearchableSelect {'),classEnd=html.indexOf('\nlet selDebitAcc',classStart);
assert(classStart>=0&&classEnd>classStart);
const selector=vm.createContext({document:d,window:dropdownDOM.window,clearTimeout:()=>{},setTimeout:()=>0,normalizeParentQuery:fold,ratibAccountSearchMatch:find,highlightText:x=>String(x)});
vm.runInContext(html.slice(classStart,classEnd)+';window.SearchableSelectTest=SearchableSelect;',selector);
const lookup=new dropdownDOM.window.SearchableSelectTest({wrapId:'wrapDebitAcc',inputId:'inpDebitAcc',dropId:'dropDebitAcc',hiddenId:'valDebitAcc',isGrouped:true});
lookup.setItems(catalog[0].details.map(([code,name])=>({id:name,text:name,accountId:code,group:'الأصول > الصندوق'})));
assert.equal(d.querySelectorAll('.sd-search-btn,.sd-search-input').length,0,'no second search control anywhere in live dropdown');
const field=d.getElementById('inpDebitAcc');
field.value='مؤسسه';field.dispatchEvent(new dropdownDOM.window.Event('input',{bubbles:true}));
const entries=[...lookup.drop.querySelectorAll('.searchable-item')];
assert.equal(entries.length,1);
assert(entries[0].textContent.includes('مؤسسة الرحمة'));
assert.equal(lookup.drop.querySelectorAll('.searchable-group-label').length,0,'no aggregate category rows');
assert.equal(lookup.getValue(),'','partial matching requires explicit choice');
entries[0].click();
assert.equal(lookup.getValue(),'مؤسسة الرحمة');
assert.equal(lookup.getAccountId(),'1002','stored accounting identity retained');
assert.equal(d.getElementById('inpDebitAcc').value,'مؤسسة الرحمة');

const ids=[
 'ledgerSearchInput','ledgerDateFrom177','ledgerDateTo177','ratibAccountMovementSearchInput',
 'accountOpsFromDate','accountOpsToDate','statementSearchInput','reportAdvFrom','reportAdvTo',
 'reportStartDate','reportEndDate','globalSearchInput','accountsPagerSearchInput',
 'chartAccountSearchInput','voucherDate','ratibFiscalLedgerYear','reportFilterType','reportAdvCurrency'];
const nodes=Object.fromEntries(ids.map(id=>[id,{
 value:'',classList:{add(){},remove(){}},querySelector:()=>({}),dispatchEvent(){},setAttribute(){},
 replaceChildren(){}
}]));
nodes.voucherDate.value='2026-11-13';
nodes.ratibFiscalLedgerYear.value='all';
nodes.reportFilterType.value='custom';
nodes.reportAdvCurrency.value='USD';
nodes.ledgerSearchInput.value='صندوق';
nodes.ratibAccountMovementSearchInput.value='مدرسه';
nodes.accountOpsFromDate.value='2026-11-01';
nodes.accountOpsToDate.value='2026-11-13';
nodes.reportAdvFrom.value='2026-11-01';
nodes.reportAdvTo.value='2026-11-13';
nodes.reportStartDate.value='2026-10-01';
nodes.reportEndDate.value='2026-11-13';
nodes.statementSearchInput.value='حوالة';
let ledgerDates={from:'2026-11-01',to:'2026-11-13'};
const scheduled=[],calls={ledger:0,account:0,report:0,home:0};
const resetCtx=vm.createContext({
 document:{getElementById:id=>nodes[id]||null,querySelectorAll:()=>[]},
 window:{
  RatibHomeSmartSearchReset:()=>calls.home++,
  RatibDirectStatement171:{clearSearch(){}},RatibStatementToolbar:{close(){}},
  RatibLedgerDateFilter177:{values:()=>ledgerDates,clear:()=>{ledgerDates={from:'',to:''}}}
 },
 Event:function(){},clearTimeout(){},requestAnimationFrame:fn=>scheduled.push(fn),
 currentActiveTab:'pageLedger',currentLedgerSearchQuery:'صندوق',
 ledgerVisibleLimit:100,ledgerRenderTimer:null,
 renderAllData:()=>calls.ledger++,
 accountOpsState:{accountName:'صندوق أحمد بافضل',scopeNames:['صندوق أحمد بافضل'],
  movementSearch:'مدرسه',from:'2026-11-01',to:'2026-11-13',currency:'YER',
  filtered:true,viewPages:{YER:3}},
 accountOpsUi:{panelId:'accountOperationsStandalonePanel'},_ratibStatementSearchTimer:null,
 renderAccountOperations:()=>calls.account++,
 currentStatementSearchQuery:'حوالة',reportAdv:{from:'2026-11-01',to:'2026-11-13',currency:'USD',active:true},
 runAccountStatement:()=>calls.report++
});
vm.runInContext(functionSource('ratibClearTextSearchAfterTargetOpen'),resetCtx);
resetCtx.ratibClearTextSearchAfterTargetOpen();
assert.equal(nodes.ledgerSearchInput.value,'');
assert.deepEqual(ledgerDates,{from:'',to:''});
assert.equal(nodes.ratibFiscalLedgerYear.value,'auto');
assert.equal(nodes.voucherDate.value,'2026-11-13','transaction dates are not search dates');
assert.equal(calls.ledger,0,'search reset repaint is deferred');
scheduled.shift()();assert.equal(calls.ledger,1);
assert.equal(resetCtx.accountOpsState.accountName,'صندوق أحمد بافضل','selected account preserved');
assert.equal(resetCtx.accountOpsState.currency,'YER','selected currency preserved');
assert.equal(resetCtx.accountOpsState.from,'');
assert.equal(resetCtx.accountOpsState.to,'');
assert.equal(nodes.reportAdvFrom.value,'');
assert.equal(nodes.reportAdvTo.value,'');
resetCtx.currentActiveTab='pageAccountOperations';
nodes.ratibAccountMovementSearchInput.value='صدقه';
resetCtx.accountOpsState.movementSearch='صدقه';
resetCtx.accountOpsState.from='2026-11-12';
nodes.accountOpsFromDate.value='2026-11-12';
resetCtx.ratibClearTextSearchAfterTargetOpen();
scheduled.shift()();assert.equal(calls.account,1);
assert.equal(nodes.accountOpsFromDate.value,'');
resetCtx.currentActiveTab='pageReports';
nodes.statementSearchInput.value='مدرسه';
resetCtx.currentStatementSearchQuery='مدرسه';
resetCtx.reportAdv={from:'2026-11-01',to:'2026-11-13',active:true,currency:'SAR'};
resetCtx.ratibClearTextSearchAfterTargetOpen();
scheduled.shift()();assert.equal(calls.report,1);
assert.equal(resetCtx.currentStatementSearchQuery,'');
assert.equal(resetCtx.reportAdv.active,false);
assert.equal(nodes.reportFilterType.value,'all');
assert(calls.home>=3,'home search reset is included');
console.log('PASS Ratib 3.6.199: leaf-only instant suggestions, no magnifier, session/date reset, financial fields preserved');
pagerDOM.window.close();dropdownDOM.window.close();
