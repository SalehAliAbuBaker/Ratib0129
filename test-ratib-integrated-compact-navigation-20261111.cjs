'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Both optimizations operate on the SAME recovered synthetic ledger.
const html=fs.readFileSync('index.html','utf8');
function section(from,to){
  const a=html.indexOf(from),b=html.indexOf(to,a);
  assert(a>=0&&b>a,'Missing integration boundary '+from);
  return html.slice(a,b);
}
let fiscalYear='2024',groupCalls=0;
const data={plan:{month:'2026-11',transactions:[]},history:[]};
const store={_ratibTxRevision:0,get:(key,def)=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:def};
const context={
  Blob,Response,CompressionStream,DecompressionStream,TextEncoder,TextDecoder,
  Array,ArrayBuffer,Uint8Array,Object,Number,String,Date,JSON,Promise,Set,WeakSet,Error,
  APP_STORAGE_PREFIX:'masar_',store,
  window:{ratibFiscalLedgerScopeKey:()=>fiscalYear},
  ratibFiscalVisibleLedgerTransactions:rows=>rows.filter(r=>r.isoDate?.startsWith(fiscalYear+'-')),
  groupLedgerItemsForDisplay:rows=>{groupCalls++;return [...rows];}
};
const impl=[
  section('async function ratibGzipBlob(input)','function _snapshotMemStore()'),
  section('function ratibIsPackedArchive(v)','async function _readShadowRecords()'),
  section('const _ratibEmptyFinancialList=[]','function effectiveTransactions('),
  section('let _ratibSortedLedgerCache=null;','function renderAllData(force=false)')
].join('\n');
vm.runInNewContext(impl+'\nthis.integrated={ratibEncodeArchive,ratibDecodeArchive,ratibPackBackup,ratibGunzipText,getAllTransactions,ratibGetSortedLedgerRows};',context);
const api=context.integrated;
async function main(){
  const source=Array.from({length:53},(_,p)=>({
    month:'2022-'+String(p%12+1).padStart(2,'0'),
    transactions:Array.from({length:p===52?260:420},(_,i)=>({
      id:'synthetic-'+p+'-'+i,seqNum:i,
      isoDate:p===52?'2026-11-11':'2024-07-20',
      amount:Math.round((p*420+i+0.35)*100)/100,
      currency:p%3===0?'USD':'YER',
      debitAccount:'Synthetic Cash',creditAccount:'Synthetic Revenue',
      description:'سند تجريبي لغرض اختبار التوافق فقط'
    }))
  }));
  const total=source.reduce((n,p)=>n+p.transactions.length,0);
  assert.equal(total,22100);
  const packed=await api.ratibEncodeArchive(source);
  assert.equal(packed.__ratibArchiveGzip,1);
  const restored=await api.ratibDecodeArchive(packed);
  assert.equal(JSON.stringify(restored),JSON.stringify(source),'Recovery must preserve every ledger entry');

  data.history=restored;
  const flattened=api.getAllTransactions();
  assert.equal(flattened.length,total,'Navigation reads complete restored ledger');
  const first=api.ratibGetSortedLedgerRows();
  const oldCount=source.slice(0,-1).reduce((n,p)=>n+p.transactions.length,0);
  assert.equal(first.length,oldCount,'Fiscal filtering keeps historical year');
  assert.strictEqual(api.ratibGetSortedLedgerRows(),first,'Navigation reuses same view');
  assert.equal(groupCalls,1,'Grouping runs once per scope');

  fiscalYear='2026';
  const recent=api.ratibGetSortedLedgerRows();
  assert.equal(recent.length,260,'Year switch invalidates cache');
  assert.equal(groupCalls,2);

  const payload={app:'ratib',schema:3,encrypted:false,data:{masar_plan:data.plan,masar_history:restored}};
  const output=await api.ratibPackBackup(payload);
  assert.equal(output.extension,'.json.gz');
  const unzipped=JSON.parse(await api.ratibGunzipText(output.blob));
  assert.deepEqual(unzipped,payload,'Compressed export is logically identical to source');
  assert.equal(output.blob.size<output.rawBytes,true);

  data.history=unzipped.data.masar_history;store._ratibTxRevision++;
  assert.notStrictEqual(api.getAllTransactions(),flattened,'Restoration invalidates old transaction view');
  assert.equal(api.ratibGetSortedLedgerRows().length,260,'Restored compact export keeps year filter');
  assert.equal(JSON.stringify(data.history),JSON.stringify(source),'No changes to source figures after navigation');
  console.log('PASS integration: GZIP IndexedDB storage + JSON.GZ backup + 22,100 movement navigation + 53 periods, lossless');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
