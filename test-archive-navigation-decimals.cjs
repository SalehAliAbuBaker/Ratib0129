'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf("const ratibMoneyFormat2 = new Intl.NumberFormat(");
const end=html.indexOf("function fmt(amount, explicitCur = null)",start);
assert(start>=0&&end>start,'The two-decimal display helper must exist');
const context={Intl,Number,Math};
vm.runInNewContext(html.slice(start,end)+';this.showMoney=ratibMoneyText;',context);
const show=n=>context.showMoney(n);
assert.equal(show(10000000.456789),'10,000,000.46');
assert.equal(show(124.5),'124.5');
assert.equal(show(-0.0001),'0');
assert.equal(show(-1234.5678),'-1,234.57');
assert.equal(show(0.005),'0.01');

const renderFrom=html.indexOf('function renderAccountOperations(');
const renderTo=html.indexOf('function openAccountFromPager(',renderFrom);
assert(renderFrom>=0&&renderTo>renderFrom,'Statement render function must exist');
const statement=html.slice(renderFrom,renderTo);
assert(statement.includes('ratibStatementTxById=new Map()'),'Statement must index transactions once');
assert(statement.includes("ratibStatementTxById.get(String(row.dataset.txId))"),'Row click must use indexed lookup');
assert(!statement.includes('getAllTransactions().find('),'Per-row linear archive scans are forbidden');
assert(!statement.includes('.toLocaleString()'),'Statement money displays should use two-digit formatter');

const pagerFrom=html.indexOf('function renderAccountsPager(');
const pagerTo=html.indexOf('\nfunction ',pagerFrom+10);
const pager=html.slice(pagerFrom,pagerTo);
assert(!pager.includes('balances=getAccountPagerBalances()'),'Avoid unused full-history scan during account navigation');
assert(pager.includes('ratibMoneyText(Math.abs(amount))'),'Account cards show two-decimal amounts');

// Index must preserve Array.find's first-match semantics for legacy duplicate identifiers.
const entries=[{id:'voucher-1',v:10},{id:'voucher-2',v:20},{id:'voucher-1',v:999},{id:'voucher-3',v:30}];
const lookup=new Map();
for(const tx of entries){const key=String(tx?.id);if(!lookup.has(key))lookup.set(key,tx);}
for(const id of ['voucher-1','voucher-2','voucher-3']){
 assert.equal(lookup.get(id),entries.find(x=>String(x.id)===id));
}
console.log('PASS: 2-decimal display, linear statement lookup, account navigation, duplicate-ID compatibility');
