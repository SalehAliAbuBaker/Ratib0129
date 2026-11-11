'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  const statementTxById=new Map();');
const end=html.indexOf("  panel.querySelectorAll('[data-ratib-statement-order]')",start);
assert(start>=0&&end>start,'Statement row index should be in renderAccountOperations');
const snippet=html.slice(start,end);
assert(!snippet.includes('getAllTransactions().find'),'Do not scan all 22,100 transactions for every row');
const total=22100,visible=50;
const txs=Array.from({length:total},(_,i)=>({id:'synthetic-'+i,amount:i+1,currency:'YER'}));
const duplicate={id:'synthetic-0',amount:999999,currency:'YER'};
txs.push(duplicate);
let getCalls=0,opened=null,searchCorpusCount=0,entryCalls=0,bindCount=0;
const rows=Array.from({length:visible},(_,i)=>({
 dataset:{txId:'synthetic-'+i},
 textContent:'Synthetic statement row '+i,
 addEventListener(event,handler){assert.equal(event,'click');this.handler=handler;bindCount++;}
}));
const panel={dataset:{},querySelectorAll(selector){assert.equal(selector,'[data-tx-id]');return rows;}};
const context={
 Map,String,panel,scope:['synthetic'],accountOpsUi:{panelId:'accountOperationsStandalonePanel'},
 getAllTransactions(){getCalls++;return txs;},
 getAccountEntry(t){entryCalls++;return {amount:t.amount};},
 ratibAccountMovementSearchCorpus(t,e,text){searchCorpusCount++;return String(t.id)+'|'+String(e.amount)+'|'+text;},
 openDocumentDetailsModal(t){opened=t;}
};
const frozenBefore=JSON.stringify(txs);
vm.runInNewContext(snippet,context,{timeout:8000});
assert.equal(getCalls,1,'Read the large ledger exactly once even for thousands of rendered rows');
assert.equal(bindCount,visible,'All paged rows retain voucher-opening handlers');
assert.equal(searchCorpusCount,0,'Search corpus generation is now lazy until a user searches');
assert.equal(entryCalls,0,'Opening a statement must not extract voucher entries merely for unused search');
assert.equal(panel._ratibStatementTxById.get('synthetic-0'),txs[0],'First duplicate ID must win, matching previous find');
rows[0].handler();assert.equal(opened,txs[0],'Opening a row must locate the original first transaction object');
rows[visible-1].handler();assert.equal(opened,txs[visible-1]);
assert.equal(JSON.stringify(txs),frozenBefore,'Indexing must not modify financial records');
console.log('PASS: 22,100 synthetic movements, 50 bound rows, one linear archive pass, stable first-match identity, no accounting mutation');
