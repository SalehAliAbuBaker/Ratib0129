'use strict';
// Synthetic archive regression only: never include real accounting data in CI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function importBackupFile(file,options={})');
const stop=html.indexOf('// ---- نسخ تلقائي لمجلد على الجهاز',start);
assert(start>=0&&stop>start,'Official recovery importer must exist');
const restoreSource=html.slice(start,stop);
assert(html.includes('importBackupFile(file,{archiveRecovery:true})'),'Recovery UI must explicitly authorize recovery');
assert(html.includes('_ratibArchiveRecoveryRequired=true'),'Boot integrity error must enable recovery');
assert(html.includes("if(String(error?.message||'').includes('إشارة إلى أرشيف مستعاد'))"));
assert(html.includes('await _storageQueue;'),'Recovery must wait for prior writes');
assert(html.includes('_pendingWrites.clear();'),'Stale pending writes must be discarded only after verified restore');
assert(html.includes('saved!==count||savedMonths!==months'),'Persisted archive must be verified before success');

function syntheticArchive(){
 let i=0;
 const history=Array.from({length:53},(_,period)=>{
   const count=period===52?454:413;
   return {month:'2022-'+String(period%12+1).padStart(2,'0'),transactions:Array.from({length:count},()=>{
     const n=i++;return {id:'synthetic-history-'+n,multiVoucherId:'v-'+Math.floor(n*10251/21930),amount:1,currency:'YER'};
   })};
 });
 const plan={month:'2026-11',transactions:Array.from({length:170},(_,n)=>({id:'synthetic-current-'+n,amount:1,currency:'YER'}))};
 return {app:'ratib',schema:3,encrypted:false,data:{masar_plan:plan,masar_history:history}};
}
const synthetic=syntheticArchive(),data=synthetic.data;
const rows=x=>(x?.masar_history||[]).reduce((n,p)=>n+p.transactions.length,0);
const all=[...data.masar_plan.transactions,...data.masar_history.flatMap(p=>p.transactions)];
assert.equal(all.length,22100);
assert.equal(new Set(all.map(t=>String(t.multiVoucherId||t.id))).size,10421);
assert.equal(data.masar_history.length,53);

function fixture({failPersist=false,allowRecovery=true}={}){
 const store=new Map([['masar_large_archive_authority_v1',JSON.stringify({rows:21930,savedAt:1})]]);
 const notices=[],exports=[],confirms=[],timers=[],mem={masar_history:[{month:'2026-10',transactions:[{id:'old'}]}]};
 let saved=null,flushes=0,commits=0;
 const state={
  APP_STORAGE_PREFIX:'masar_',APP_SCHEMA_VERSION:3,SECURITY_CONFIG_KEY:'masar_security_config_v2',VAULT_BLOB_KEY:'masar_vault_v1',
  _ratibArchiveRecoveryRequired:allowRecovery,
  _pendingWrites:new Map([['masar_plan',{month:'old',transactions:[{id:'old'}]}]]),
  _storageQueue:Promise.resolve(),_storageBusy:0,_storageTimer:123,
  _pendingFinancialCompletion:false,_draftTimer:null,_autoBackupTimer:null,
  _memStore:mem,_securityConfigCache:null,_vaultCryptoKey:null,_vaultUnlocked:false,_vaultBlob:null,
  _largeArchiveAuthority:false,hasUnsavedChanges:true,
  _storageInternalKeys:new Set(['masar_storage_meta_v1']),
  localStorage:{getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  sessionStorage:{setItem:(key,val)=>store.set(key,val)},
  JSON,Number,Date,Set,Map,Object,Array,Promise,Error,Math,
  clearTimeout:()=>{},setTimeout:(fn,ms)=>{timers.push(ms);return 0;},location:{reload:()=>{throw Error('Unexpected test reload')}},
  showToast:(message,type)=>notices.push({message,type}),
  console:{error:()=>{}}, confirm:(message)=>{confirms.push(message);return true;},
  normalizeRestoredData:raw=>raw,
  validateRestoredData:records=>[...(records.masar_plan?.transactions||[]),...(records.masar_history||[]).flatMap(p=>p.transactions)].length,
  getSecurityConfig:()=>({enabled:false,salt:null}),
  flushStorage:async()=>{flushes++;throw Error('حماية الأرشيف: تعذّر حفظ السجل القديم');},
  buildBackupPayload:async()=>({app:'ratib',data:{masar_plan:mem.masar_plan||{transactions:[]}}}),
  downloadBackupPayload:(payload,name)=>exports.push(name),
  backupStamp:()=> 'test-stamp',
  _replacePersistentData:async value=>{commits++;if(failPersist)throw Error('Synthetic IndexedDB quota rejection');saved=value;},
  _readShadowRecords:async()=>saved,
  _largeArchiveRows:rows,
  cacheVaultKeyForBiometrics:async()=>true,clearVaultBiometricSession:()=>{},
 };
 vm.runInNewContext(restoreSource+'\nthis.importBackupFile=importBackupFile;',state);
 return {state,get flushes(){return flushes},get commits(){return commits},get saved(){return saved},confirms,exports,notices,timers};
}
const file={name:'synthetic-merged.json',text:async()=>JSON.stringify(synthetic)};

async function run(){
 const a=fixture();
 assert.equal(await a.state.importBackupFile(file),false,'Normal restore must remain blocked by stale storage');
 assert.equal(a.flushes,1);assert.equal(a.commits,0);
 const recovered=await a.state.importBackupFile(file,{archiveRecovery:true});
 assert.equal(recovered,true,'Authorized recovery should bypass blocked stale flush: '+JSON.stringify({notices:a.notices,flushes:a.flushes,commits:a.commits,confirms:a.confirms.length}));
 assert.equal(a.flushes,1,'Recovery must not flush old memory');
 assert.equal(a.commits,1);
 assert.equal(a.state._pendingWrites.size,0);
 assert.equal(a.state._ratibArchiveRecoveryRequired,false);
 assert.equal(rows(a.saved),21930);
 assert.equal(a.saved.masar_history.length,53);
 assert.equal(a.saved.masar_plan.transactions.length,170);
 assert.equal(JSON.parse(a.state.localStorage.getItem('masar_large_archive_authority_v1')).rows,21930);
 assert.equal(a.exports.length,1,'Rollback backup is always created before mutation');
 assert(a.confirms.at(-1).includes('22,100')&&a.confirms.at(-1).includes('10,421')&&a.confirms.at(-1).includes('53'));
 assert(a.timers.includes(500),'Reload only follows verified persist');
 assert(a.notices.some(t=>t.type==='success'));

 const b=fixture({allowRecovery:false});
 assert.equal(await b.state.importBackupFile(file,{archiveRecovery:true}),false,'Recovery bypass not available outside detected integrity failure');
 assert.equal(b.commits,0);
 const c=fixture({failPersist:true});
 assert.equal(await c.state.importBackupFile(file,{archiveRecovery:true}),false,'Failed persistent write must never count as success');
 assert.equal(c.state._pendingWrites.size,1,'Failed recovery must not discard original queued state');
 assert.equal(c.state._ratibArchiveRecoveryRequired,true);
 assert(!c.notices.some(t=>t.type==='success'));
 assert(!c.timers.includes(500));
 console.log('PASS: 22,100 synthetic movements, 10,421 documents, 53 periods; recovery bypasses stale flush but keeps safe rollback and verification');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
