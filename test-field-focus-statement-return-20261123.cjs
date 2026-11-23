'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-polish-20261123.css','utf8');
const start=html.indexOf('let _ratibStatementViewCache=null;'),end=html.indexOf('// Screen-only pager.',start);
assert(start>0&&end>start);
const scope=['fixture'];let source=Array.from({length:5000},(_,i)=>({id:String(i),amount:i+1})),reads=0,balances=0;
const state={accountName:'fixture',scopeNames:scope,activeCurrency:'YER',viewPages:{YER:3}};
const rows=[{dataset:{txId:'visible'},style:{scrollMarginTop:'4px'},getBoundingClientRect:()=>({height:60,top:148,bottom:208}),scrollIntoView(options){this.restored={options,margin:this.style.scrollMarginTop};}}];
const page={dataset:{currency:'YER'},querySelectorAll:()=>rows},panel={querySelectorAll:()=>[page]},frames=[],listeners={};
const context={Map,Set,JSON,Number,String,store:{_ratibTxRevision:0},accountOpsState:state,
 currentActiveTab:'pageAccountOperations',window:{innerHeight:800,ratibStatementEffectiveFrom:from=>from},
 document:{getElementById:()=>panel,addEventListener:(name,fn)=>listeners[name]=fn},requestAnimationFrame:fn=>frames.push(fn),
 getAllTransactions:()=>source,
 getAccountCurrencyReportData(currency){reads++;return {currency,rows:source,opening:0,closing:source.reduce((n,t)=>n+t.amount,0)};},
 getAccountRunningBalances(txs){balances++;let n=0;return new Map(txs.map(t=>[t,n+=t.amount]));}
};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
const first=context.ratibStatementReadView('YER',scope),before=first.data.closing;
state.viewPages.YER=4;state.viewOrder='oldest';state.movementSearch='reference';
assert.equal(context.ratibStatementReadView('YER',scope),first,'Paging, display order and visual search reuse the screen model');
assert.equal(reads,1);assert.equal(balances,1);
source[0].amount=400;context.store._ratibTxRevision++;
assert.equal(context.ratibStatementReadView('YER',scope).data.closing,before+399,'Saved edit invalidates totals and balances');
state.from='2026-01-01';context.ratibStatementReadView('YER',scope);assert.equal(reads,3,'Date filter invalidates');
context.ratibStatementReadView('USD',scope);assert.equal(reads,4,'Currencies never share a model');
source=source.slice();context.ratibStatementReadView('YER',scope);assert.equal(reads,5,'Restored/replaced data invalidates');
const anchor=context.captureStatementReadingPosition();assert.equal(anchor.txId,'visible');
const flush=()=>{while(frames.length)frames.shift()();};
context.restoreStatementReadingPosition(anchor);flush();assert.equal(rows[0].restored.margin,'148px');assert.equal(rows[0].style.scrollMarginTop,'4px');
rows[0].restored=null;context.restoreStatementReadingPosition(anchor);listeners.pointerdown();flush();assert.equal(rows[0].restored,null,'User interaction cancels pending restoration');
context.restoreStatementReadingPosition(anchor);state.accountName='different';flush();assert.equal(rows[0].restored,null,'Account changes cancel restoration');
state.accountName='fixture';context.restoreStatementReadingPosition(anchor);context.currentActiveTab='pageDashboard';flush();assert.equal(rows[0].restored,null,'Leaving statement cancels restoration');
assert(html.includes('view.statementAnchor=captureStatementReadingPosition()'));
assert(html.includes('if(view.statementAnchor)restoreStatementReadingPosition(view.statementAnchor)'));
assert(html.includes("if(currentActiveTab!=='pageAccountOperations')ratibClearTextSearchAfterTargetOpen()"));
const dom=new JSDOM('<style>'+css+'</style><input id="touch"><textarea></textarea>');
const input=dom.window.document.getElementById('touch');input.focus();
const activeRule=[...dom.window.document.styleSheets[0].cssRules].flatMap(rule=>rule.cssRules?[...rule.cssRules]:[]).find(rule=>rule.selectorText?.includes('.financial-number-field:focus-within'));
assert(input.matches(activeRule.selectorText),'Touch-focused input matches the active-field rule');
assert.equal(activeRule.style.getPropertyValue('outline').startsWith('2px solid'),true);
dom.window.close();
console.log('PASS touch focus, bounded statement model reuse/invalidation, financial edits, reading anchor, user cancellation and account isolation');
