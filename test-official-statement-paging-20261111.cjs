'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function ratibStatementDisplayPage(');
const end=html.indexOf('\nfunction openAccountFromPager(',start);
assert(start>=0&&end>start,'Page helpers and statement renderer must be present');
const js=html.slice(start,end);
assert(html.includes("const rows=view.rows.map(t=>"),'Rows must render only one 50/100-item screen page');
assert(html.includes('const runningBalances=getAccountRunningBalances(txs,scope,opening)'),'Running balance must use ALL chronological account movements');
assert(html.includes('const inclusive=ratibStatementInclusiveTotals(data)'),'Totals must use full account data, not displayed page');
assert(html.includes('ratibAccountMovementSearchCorpus(t,getAccountEntry(t,scope)'),'Search must be applied to whole account before paging');
assert(html.includes("if(panel.dataset.ratibPaginated==='1')"),'Search counter must work with paginated screens');
assert(html.includes("renderAccountOperations(accountOpsState.accountName,accountOpsState.scopeNames,accountOpsUi);"),'Search must rerender new page after full-account filter');
const printStart=html.indexOf('function renderAccountCurrencyCanvas(data)');
const printEnd=html.indexOf('\nfunction ',printStart+25);
assert(printStart>0&&printEnd>printStart);
const printSource=html.slice(printStart,printEnd);
assert(!printSource.includes('ratibStatementDisplayPage'),'Print must never be paginated');
assert(printSource.includes('const {currency,rows,opening,totalDebit,totalCredit,closing}=data'),'Printed statement must read full account rows');

const dom=new JSDOM('<!doctype html><html><body><h2 id="accountOperationsScreenTitle"></h2><button id="accountAddOperationBtn"></button><div id="accountCurrencyTabs"></div><div id="accountOperationsStandalonePanel"></div><input id="ratibAccountMovementSearchInput"><span id="ratibAccountMovementSearchCount"></span><button id="ratibAccountMovementSearchClear"></button></body></html>');
const doc=dom.window.document;
dom.window.Element.prototype.scrollTo=function(){};
const account=Array.from({length:3925},(_,n)=>({id:'acc-'+(n+1),seqNum:n+1,currency:'YER',amount:1,side:'credit',date:'2026-10-01',note:n===19||n===3920?'unique-target-2026':'other-note'}));
const outsiders=Array.from({length:22100-3925},(_,n)=>({id:'other-'+n,amount:100,side:'credit',currency:'YER',date:'2026-10-01'}));
const all=[...account,...outsiders],before=JSON.stringify(all);
let reportReads=0,fullSearch=0;
const state={accountName:'صندوق المؤسسة',scopeNames:['صندوق المؤسسة'],currency:'ALL',activeCurrency:'YER',from:'',to:'',aggregate:false,viewOrder:'newest',viewPageSize:50,viewPages:{},movementSearch:''};
const ctx={
 document:doc,window:dom.window,accountOpsState:state,
 accountOpsUi:{panelId:'accountOperationsStandalonePanel',tabsId:'accountCurrencyTabs'},
 ACCOUNT_OPS_UI_DEFAULT:{panelId:'accountOperationsStandalonePanel',tabsId:'accountCurrencyTabs'},
 requestAnimationFrame:cb=>cb(),
 getAccountCurrencies:()=>['YER'],
 getAccountCurrencyReportData:currency=>{reportReads++;return {currency,rows:account,opening:100,totalDebit:0,totalCredit:3925,closing:4025};},
 getAccountRunningBalances:(rows,scope,opening)=>{const map=new Map();let balance=opening;for(const tx of rows){balance+=tx.side==='credit'?tx.amount:-tx.amount;map.set(tx,balance);}return map;},
 getAllTransactions:()=>all,
 getAccountEntry:tx=>({amount:tx.amount,side:tx.side,bothSides:false,line:{note:tx.note}}),
 getAccountDisplayAmount:e=>e.amount,
 getAccountOpsDate:t=>t.date,
 ratibAccountMovementNormalize:str=>String(str||'').trim().toLowerCase(),
 ratibAccountMovementSearchCorpus:(t,e)=>{fullSearch++;return (t.note+' '+t.id+' '+t.seqNum).toLowerCase();},
 ratibStatementEffectiveFrom:()=>'',ratibStatementText:(x,f)=>String(x||f),ratibStatementDateHtml:()=>'<time>2026-10-01</time>',
 ratibStatementDocumentLabel:()=> 'قيد',ratibStatementTotalsTitle:()=> 'إجمالي العمليات',
 ratibStatementInclusiveTotals:d=>({debit:d.totalDebit,credit:d.totalCredit}),
 ratibStatementClosingText:()=> 'إجمالي الرصيد النهائي',ratibStatementNoticeText:()=>'',ratibAggregateOwner:()=>'',getTransactionDisplayType:()=> 'قيد',
 esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
 setAccountCurrencyPage:currency=>{state.activeCurrency=currency;},
 ratibApplyAccountMovementSearch:()=>{},
 openDocumentDetailsModal:()=>{},
};
ctx.window.ratibStatementEffectiveFrom=()=> '';
vm.runInNewContext(js+'\nthis.renderTestStatement=renderAccountOperations;this.pageTest=ratibStatementDisplayPage;this.formatTest=ratibStatementDisplayAmount;',ctx,{timeout:10000});
const panel=doc.getElementById('accountOperationsStandalonePanel');
function ids(){return [...panel.querySelectorAll('.account-statement-row[data-tx-id]')].map(e=>e.dataset.txId);}
ctx.renderTestStatement('صندوق المؤسسة',['صندوق المؤسسة']);
assert.equal(ids().length,50);assert.equal(ids()[0],'acc-3925');assert.equal(ids().at(-1),'acc-3876');
assert.equal(panel.querySelector('.ratib-statement-page-tools').classList.contains('no-print'),true);
assert.equal(panel.querySelector('.ratib-statement-page-actions [aria-live]').textContent.includes('1 من 79'),true);
assert.equal(panel.querySelector('.account-statement-row[data-tx-id] .balance').textContent.includes('4,025'),true);
assert.equal(panel.querySelector('.statement-grand-total .credit').textContent,'3,925');
assert.equal(ctx.formatTest(12968804.859999),'12,968,804.86');
assert.equal(ctx.pageTest(account,'oldest',1,100).rows[0],account[0]);
assert.equal(ctx.pageTest(account,'newest',1,100).rows[0],account.at(-1));
assert.equal(ctx.pageTest(account,'newest',80,50).page,79);

const next=panel.querySelector('[data-ratib-page-step="1"]');
next.click();assert.equal(ids().length,50);assert.equal(ids()[0],'acc-3875');assert.equal(state.viewPages.YER,2);
const size=panel.querySelector('[data-ratib-statement-size]');size.value='100';size.dispatchEvent(new dom.window.Event('change'));
assert.equal(ids().length,100);assert.equal(state.viewPageSize,100);assert.equal(ids()[0],'acc-3925');
const order=panel.querySelector('[data-ratib-statement-order]');order.value='oldest';order.dispatchEvent(new dom.window.Event('change'));
assert.equal(ids()[0],'acc-1');assert.equal(ids().length,100);
assert.equal(panel.querySelector('.account-statement-row[data-tx-id] .balance').textContent.includes('101'),true);
state.movementSearch='unique-target-2026';state.viewPages={};ctx.renderTestStatement('صندوق المؤسسة',['صندوق المؤسسة']);
assert.equal(ids().length,2);assert.deepEqual(ids(),['acc-20','acc-3921']);
assert.equal(panel.querySelector('.account-currency-page').dataset.ratibMatched,'2');
assert.equal(panel.querySelector('.account-currency-page').dataset.ratibAll,'3925');
assert.equal(panel.querySelector('.statement-grand-total .credit').textContent,'3,925','Filtering screen must not alter overall period totals');
assert.equal(JSON.stringify(all),before,'No stored transaction should ever be edited by paging/search');
assert(reportReads>=5&&fullSearch>=3925,'Search must cover all movements even when screen has only 50/100 cards');
dom.window.close();
console.log('PASS: latest/oldest ordering, 50/100 paging, 3925-row total, 22100 synthetic ledger, all-pages search, chronological running balances, unchanged print model and original ledger');
