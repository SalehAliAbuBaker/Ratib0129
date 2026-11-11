'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');

// Synthetic data only. Do not upload customer documents or backup archives to GitHub.
const html=fs.readFileSync('index.html','utf8');
const slice=(a,b)=>{
  const start=html.indexOf(a),end=html.indexOf(b,start);
  assert(start>=0&&end>start,'Missing archived storage function: '+a);
  return html.slice(start,end);
};
const writes=slice('async function _writeShadowRecords(records','function _localRecords()');
const archive=slice('const LARGE_ARCHIVE_AUTH_KEY=', 'async function _persistPending()');
const pending=slice('async function _persistPending()', 'async function flushStorage()');
assert(pending.includes('_largeArchiveRows(_memStore)<protectedRows'),
  'Prevent old in-memory account state from updating the storage timestamp');
assert(pending.includes('throw new Error('),'Old tabs must explicitly report blocked writes');

const indexedDB=new IDBFactory();
const dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open('masar_backup_handles',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('handles');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
const local=new Map();
const context={
  APP_STORAGE_PREFIX:'masar_', _openBackupIdb:()=>dbPromise,
  localStorage:{getItem:key=>local.get(key)??null,setItem:(key,val)=>local.set(key,String(val))},
  JSON,Number,Object,Array,Promise,Set,Error,
};
vm.runInNewContext(archive+'\n'+writes+'\nthis.archiveGuard={write:_writeShadowRecords,rows:_largeArchiveRows,marker:_largeArchiveMarkerRows};',context);
const {write,rows,marker}=context.archiveGuard;
const history=Array.from({length:53},(_,i)=>({
 month:'2022-'+String(i%12+1).padStart(2,'0'),
 transactions:Array.from({length:i===52?110:420},(_,j)=>({id:'synthetic-'+i+'-'+j}))
}));
const expected=rows({masar_history:history});
const read=async(key)=>new Promise(async(resolve,reject)=>{
 const db=await dbPromise,tx=db.transaction('handles','readonly'),request=tx.objectStore('handles').get('shadow_'+key);
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function main(){
 assert(expected>1500,'Large ledger scenario');
 await write({masar_history:history,masar_plan:{month:'2026-11',transactions:[]}},[],true);
 local.set('masar_large_archive_authority_v1',JSON.stringify({rows:expected,savedAt:Date.now()}));
 assert.equal(marker(),expected);

 // An old open tab attempts to rewrite one month of transactions: must not damage IndexedDB.
 const stale=[{month:'2026-10',transactions:Array.from({length:204},(_,i)=>({id:'old-'+i}))}];
 await assert.rejects(write({masar_history:stale,masar_storage_meta_v1:{updatedAt:Date.now()}},[],false),/حماية الأرشيف/);
 assert.equal(rows({masar_history:await read('masar_history')}),expected,'Restored history must remain intact');

 // A healthy tab with the full historical archive can still update unrelated preferences.
 await write({masar_theme:'dark'},[],false);
 assert.equal(await read('masar_theme'),'dark');
 assert.equal(rows({masar_history:await read('masar_history')}),expected);

 // Guard cannot silently accept a mismatched committed archive either.
 await write({masar_history:stale},[],true); // Explicit replacement path, e.g. a user-approved restore
 await assert.rejects(write({masar_theme:'light'},[],false),/حماية الأرشيف/);
 assert.equal(await read('masar_theme'),'dark');

 // Existing boot path must fail closed when authority marker differs from the physical archive.
 assert(html.includes('if(_largeArchiveRows(shadow)!==Number(archiveMarker.rows))'));
 assert(html.includes("throw new Error('توجد إشارة إلى أرشيف مستعاد"));
 console.log('PASS: historic archive guarded against stale tabs, normal writes continue, corruption blocks writes');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
