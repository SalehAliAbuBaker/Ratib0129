'use strict';
// Synthetic timing and accounting-safety regression; never use client ledger files in CI.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const html=fs.readFileSync('index.html','utf8');
const fiscal=fs.readFileSync('ratib-fiscal-ledger.js','utf8');
function extract(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a);
 assert(a>=0&&b>a,'Missing source snippet: '+start);
 return html.slice(a,b);
}
const flatten=extract('const _ratibEmptyFinancialList=[]','function effectiveTransactions(');
const sorted=extract('let _ratibSortedLedgerCache=null;','function renderAllData(force=false)');
assert(!flatten.includes('store.set(')&&!sorted.includes('store.set('),'Read-only caches must not write data');
assert(html.includes("if(k==='plan'||k==='history')this._ratibTxRevision="),'Both financial write paths must invalidate cache');
assert(fiscal.includes('window.ratibFiscalLedgerScopeKey=yearResolved;'),'Real fiscal year must key ledger cache');

let year='2026',groupCalls=0,fiscalCalls=0;
const history=Array.from({length:53},(_,p)=>({
 month:'2022-'+String(p%12+1).padStart(2,'0'),
 transactions:Array.from({length:p===52?260:420},(_,i)=>({
   id:'synthetic-'+p+'-'+i,isoDate:p===52?'2026-11-11':'2024-04-03',
   amount:p*100+i,currency:'YER',debitAccount:'Cash',creditAccount:'Revenue',
   seqNum:i,status:'posted'
 }))
}));
const plan={transactions:[{id:'current',isoDate:'2026-11-11',amount:2,status:'posted'}]};
const data={plan,history};
const store={
 _ratibTxRevision:0,
 get:(key,defaultValue)=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:defaultValue
};
const context={
 store,window:{ratibFiscalLedgerScopeKey:()=>year},
 ratibFiscalVisibleLedgerTransactions:rows=>{
   fiscalCalls++;
   return rows.filter(t=>String(t.isoDate).startsWith(year+'-'));
 },
 groupLedgerItemsForDisplay:rows=>{groupCalls++;return rows.slice()},
 String,Number,Array,Date,Object,Promise,
};
vm.runInNewContext(flatten+'\n'+sorted+'\nthis.cacheFns={getAllTransactions,ratibGetSortedLedgerRows};',context);
const {getAllTransactions,ratibGetSortedLedgerRows}=context.cacheFns;
assert.equal(getAllTransactions().length,22101);
const first=getAllTransactions();
for(let i=0;i<50;i++)assert.strictEqual(getAllTransactions(),first,'Repeated ledger reads reuse same derived array');
let baseline=null;
{
 const d=plan.transactions.concat(...history.map(p=>p.transactions));
 baseline=d.filter(t=>String(t.isoDate).startsWith('2026-')).sort((a,b)=>
 String(a.isoDate).localeCompare(String(b.isoDate))||Number(a.seqNum||0)-Number(b.seqNum||0)||String(a.id).localeCompare(String(b.id)));
}
const view=ratibGetSortedLedgerRows();
assert.deepEqual(Array.from(view,t=>t.id),Array.from(baseline,t=>t.id));
assert.strictEqual(ratibGetSortedLedgerRows(),view,'Same fiscal year reuses sorting and grouping');
assert.equal(groupCalls,1);assert.equal(fiscalCalls,1);
year='2024';
const historic=ratibGetSortedLedgerRows();
assert(historic.length>20000);
assert.notStrictEqual(historic,view,'Year change invalidates journal view');
assert.equal(groupCalls,2);
const updated={...plan,transactions:[...plan.transactions,{id:'new',isoDate:'2024-04-03',amount:99}]};
data.plan=updated;store._ratibTxRevision++;
const changed=getAllTransactions();
assert.notStrictEqual(changed,first,'New committed plan revision invalidates flattened data');
assert.equal(changed.length,22102);
assert(ratibGetSortedLedgerRows().some(x=>x.id==='new'),'Journal view reflects newly added financial record');
history[0].transactions=history[0].transactions.slice();
const current=getAllTransactions();
assert.notStrictEqual(current,changed,'Replacing inner archived array invalidates view even without a revision');
const prior=current;history[0].transactions.push({id:'uncommitted',isoDate:'2024-04-03'});
assert.notStrictEqual(getAllTransactions(),prior,'In-place period length change is noticed safely');
assert(getAllTransactions().some(t=>t.id==='uncommitted'));
data.history=history.map(p=>({...p,transactions:p.transactions.slice()}));store._ratibTxRevision++;
assert.notStrictEqual(getAllTransactions(),prior,'Replacing the full restored history refreshes cache');
const compare=()=>getAllTransactions().map(x=>x.id).join('|');
assert.equal(compare(),[...data.plan.transactions,...data.history.flatMap(h=>h.transactions)].map(x=>x.id).join('|'));
const start=performance.now();
for(let i=0;i<100;i++)getAllTransactions();
const elapsed=performance.now()-start;
console.log('PASS 22,100+ synthetic movements / 53 periods, fiscal-year and saved-edit cache invalidation; 100 cached reads '+elapsed.toFixed(2)+' ms');
