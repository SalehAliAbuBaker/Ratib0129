'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('let _ratibAccountsPagerRevision=0,');
const end=html.indexOf('\nfunction renderAccountsPager(){',start);
assert(start>=0&&end>start,'Account index cache/warmup functions must exist');
const snippet=html.slice(start,end);
assert(html.includes("if(k==='plan'||k==='history'||k==='account_catalog')_ratibAccountsPagerRevision++"),'Saved accounting changes must invalidate cached balances');
assert(html.includes('const activity=ratibAccountsPagerCachedActivity();'),'Account pager must reuse indexed results');
assert(!snippet.includes('store.set(')&&!snippet.includes('_memStore['),'Warmup must never alter stored accounting data');
const plan={transactions:[]},history=[];
const records=Array.from({length:22100},(_,i)=>({id:'t-'+i,debitAccount:i%2?'صندوق المؤسسة':'العمقي للصرافة',creditAccount:'الإيرادات',amount:i+1,status:'posted',isoDate:'2026-10-01'}));
const before=JSON.stringify(records.slice(0,30));
let reads=0,legs=0,callbacks=[],now=0,listeners={};
const ctx={Map,Set,window:{__ratibProceedInitialized:true,addEventListener:(k,fn)=>{listeners[k]=fn;}},requestIdleCallback:fn=>callbacks.push(fn),
 getAllTransactions(){reads++;return records;},
 getAccountEntry(tx,names){legs++;return {currency:'YER',side:tx.debitAccount===names[0]?'debit':'credit',amount:tx.amount};},
 getAccountDisplayAmount:e=>e.amount,getAccountOpsDate:t=>t.isoDate,
 store:{get(k,d){return k==='plan'?plan:k==='history'?history:d;}},
 performance:{now(){return ++now/5;}},setTimeout:fn=>callbacks.push(fn)};
vm.runInNewContext(snippet+`\nthis.getActivity=ratibAccountsPagerCachedActivity;this.warm=ratibWarmAccountsPagerIndex;this.bump=()=>{_ratibAccountsPagerRevision++};this.cached=()=>_ratibAccountsPagerCache;`,ctx,{timeout:10000});
assert.equal(typeof listeners['ratib:app-ready'],'function');
ctx.warm();
assert.equal(ctx.cached(),null,'Warm cache should not block initial page paint');
let slices=0;
while(callbacks.length){const fn=callbacks.shift();fn({timeRemaining:()=>5});slices++;if(slices>6000)throw Error('Idle scheduler stuck');}
assert(slices>1,'Index must be built over multiple short idle slices');
const first=ctx.getActivity();assert.equal(ctx.getActivity(),first,'Repeated opening reuses exact cache result');
assert.equal(reads,1,'Warm cache should fetch ledger only once for repeated openings');
assert.equal(first.get('صندوق المؤسسة').get('YER').count,11050);
assert.equal(first.get('العمقي للصرافة').get('YER').count,11050);
const beforeLegs=legs;ctx.getActivity();assert.equal(legs,beforeLegs,'No full scan on second opening');
ctx.bump();const recomputed=ctx.getActivity();
assert.notEqual(recomputed,first,'After journal update the activity is rebuilt');
assert.equal(recomputed.get('صندوق المؤسسة').get('YER').count,11050);
assert.equal(JSON.stringify(records.slice(0,30)),before,'No accounting transaction mutated by activity indexing');
console.log('PASS 22,100 read-only synthetic accounting legs, idle-sliced warmup, no repeated full scan and invalidation on financial writes');
