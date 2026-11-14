'use strict';
/* Ratib 3.6.185: preserved mobile input focus and safe historical compound edits. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const compact=fs.readFileSync('ratib-statement-compact-3.6.119.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.201');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.201"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.201"'));
assert(sw.includes('compound-archive-search-focus-3.6.185'));
assert(!compact.includes("anchor.insertAdjacentElement('afterend',search)"),
 'Do not put search inside the panel replaced by the statement renderer');
assert(compact.includes('panel.before(search)'),
 'Search field lives outside the destructively refreshed statement content');
const previousSearch=html.indexOf("document.getElementById('ratibAccountMovementSearchInput')?.addEventListener('input'");
assert(previousSearch>0);
assert(!html.slice(previousSearch,previousSearch+1100).includes("},220);"));
const opening=html.indexOf('async function commitMultiVoucher('),closing=html.indexOf('\nfunction entryshowMultiSavedNotice(',opening);
assert(opening>0&&closing>opening);
const commitCode=html.slice(opening,closing);
new vm.Script(commitCode);
assert(commitCode.includes("d.mode==='multi-entry'"),'Archive edit is restricted to compound mode');
assert(commitCode.includes('ratibArchiveEdit.history'),'Historic edits stay in the archive');
assert(!commitCode.includes('if(multiVoucherDraftId){p.transactions=p.transactions.filter(t=>t.multiVoucherId!==multiVoucherDraftId&&t.id!==multiVoucherDraftId);removeMultiVoucherLinesFromHistory(multiVoucherDraftId);}'));
assert(commitCode.includes("status:'reversed'"),'Superseded rows remain available for audit');
assert(commitCode.includes('multiVoucher:ratibArchiveEdit?cloneData(d):d'),'Archived postings use independent voucher objects');
assert(commitCode.includes("if(_pendingFinancialCompletion)"),'Do not display two storage-failure alerts');

async function mobileSearch(){
 const dom=new JSDOM('<!doctype html><html><body>'+
  '<section id="pageAccountOperations">'+
   '<div id="ratibAccountMovementSearchBar"><label class="ratib-movement-search-label">البحث</label><input type="search" id="ratibAccountMovementSearchInput"></div>'+
   '<nav id="accountCurrencyTabs"><button data-currency="SAR">SAR</button></nav>'+
   '<div id="accountOperationsStandalonePanel"><div class="account-currency-page" data-currency="SAR"><div class="ratib-reconcile-bar">مطابقة</div><div class="account-statement-table"></div></div></div>'+
  '</section></body></html>',{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.eval(compact);
 d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 const field=d.getElementById('ratibAccountMovementSearchInput');
 const panel=d.getElementById('accountOperationsStandalonePanel');
 assert.equal(panel.contains(field),false,'Search is outside replaced panels');
 assert.equal(field.isConnected,true);
 field.focus();field.value='س';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(d.activeElement,field,'Mobile keyboard focus stays on the original input');
 panel.innerHTML='<div class="account-currency-page" data-currency="SAR">كشوف جديدة</div>';
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(d.getElementById('ratibAccountMovementSearchInput'),field,'Rendering cannot destroy and recreate the input');
 assert.equal(d.activeElement,field,'Re-rendering the statement cannot dismiss the keyboard');
 field.value='شركة';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(field.value,'شركة','Arabic phrase remains editable after the first character');
 assert.equal(panel.contains(field),false);
 dom.window.close();
}

async function archivedEdit(){
 const oldVoucher='mv_archived_123';
 const oldSharedVoucher={id:oldVoucher};
 const preserved=[...Array.from({length:1798},(_,i)=>({id:'import_'+i,status:'posted',amount:1})),
  {id:oldVoucher+'_0',multiVoucherId:oldVoucher,isMultiVoucher:true,status:'posted',amount:100,side:'debit',debitAccount:'صندوق',creditAccount:'',multiVoucher:oldSharedVoucher},
  {id:oldVoucher+'_1',multiVoucherId:oldVoucher,isMultiVoucher:true,status:'posted',amount:100,side:'credit',debitAccount:'',creditAccount:'مورد',multiVoucher:oldSharedVoucher}];
 const records={plan:{month:'2026-11',transactions:[]},history:[{month:'2026-10',transactions:preserved}],multi_voucher_drafts:[]};
 const d={id:oldVoucher,mode:'multi-entry',seq:51,date:'2026-10-14',baseCurrency:'YER',baseTotal:100,beneficiary:'',note:'',
  lines:[
    {side:'debit',account:'صندوق',base:100,accountId:'1',budgetId:'general',note:'',amount:100,currency:'YER',rate:1},
    {side:'credit',account:'مورد',base:60,accountId:'2',budgetId:'general',note:'',amount:60,currency:'YER',rate:1},
    {side:'credit',account:'مصروف',base:40,accountId:'3',budgetId:'general',note:'',amount:40,currency:'YER',rate:1}
  ]};
 let toasts=[],flushes=0,removed=0,prepared=0,audits=0;
 const ctx={
  multiVoucherDraftId:oldVoucher,_pendingFinancialCompletion:null,APP_SCHEMA_VERSION:1,showToast:(t)=>toasts.push(t),
  validateMultiVoucher:()=>'',buildMultiVoucherData:()=>d,cloneData:structuredClone,
  getAllTransactions:()=>[...records.plan.transactions,...records.history.flatMap(h=>h.transactions)],
  getMasterPlan:()=>records.plan,
  store:{get:(key,def)=>records[key]??def,set:(key,value)=>{records[key]=value;}},
  getCats:()=>[{id:'general',name:'عام',color:'#888'}],
  cashVoucherTitle:()=> 'قيد مركب',audit:()=>{audits++;},
  removeMultiVoucherLinesFromHistory:()=>{removed++;throw new Error('Archived history must not be deleted');},
  renderAllData:()=>{},updateProDashboard:()=>{},prepareMultiVoucherPrint:()=>{prepared++;},
  resetMultiVoucherForm:()=>{},showMultiSavedNotice:()=>{},restoreQuickVoucherOriginAfterSave:()=>{},
  window:{RatibLicense:{recordCreated:()=>{},beforeCreate:async()=>true}},
 };
 ctx.completeFinancialSave=async after=>{
  ctx._pendingFinancialCompletion=after;
  flushes++;
  const rows=records.history.reduce((n,h)=>n+h.transactions.length,0);
  if(rows<1800)throw new Error('Archive protection rejects missing rows');
  ctx._pendingFinancialCompletion=null;
  after();
 };
 const sandbox=vm.createContext(ctx);
 vm.runInContext(commitCode+';this.commit=commitMultiVoucher;',sandbox);
 await sandbox.commit();
 assert.equal(flushes,1);
 assert.equal(removed,0,'Do not delete archived original movements');
 assert.equal(audits,1);
 assert.equal(prepared,1);
 assert.equal(records.plan.transactions.length,0,'Edits of archived vouchers are not posted in the current month');
 const old=records.history[0].transactions.filter(t=>t.ratibSupersededVoucherId===oldVoucher);
 const newer=records.history[0].transactions.filter(t=>t.multiVoucherId===oldVoucher&&t.status==='posted');
 assert.equal(old.length,2,'Prior saved entries remain as reversed audit trail');
 assert.notEqual(old[0].multiVoucher,old[1].multiVoucher,'Audited superseded rows have distinct historical snapshots');
 assert(old.every(t=>t.status==='reversed'&&!t.isMultiVoucher&&!t.multiVoucherId));
 assert.equal(newer.length,3,'New editable debits and credits reside in the original archive');
 assert.notEqual(newer[0].multiVoucher,newer[1].multiVoucher,'Archived journal legs must not share voucher references');
 const jsonStart=html.indexOf('function ratibIsJsonSafeArchive(value)'),jsonEnd=html.indexOf('\nasync function ratibEncodeArchive(',jsonStart);
 assert(jsonStart>0&&jsonEnd>jsonStart);
 const jsonSafe=vm.runInNewContext(html.slice(jsonStart,jsonEnd)+';ratibIsJsonSafeArchive;');
 assert(jsonSafe(records.history),'Saving a historical voucher must remain eligible for compact IndexedDB storage');
 const historicalShared={id:'voucher-with-two-legs',lines:[{amount:100,side:'debit'},{amount:100,side:'credit'}]};
 const mixedHistory=[{month:'2022-05',transactions:[
  {id:'A',multiVoucher:historicalShared},
  {id:'B',multiVoucher:historicalShared},
  {id:'C',multiVoucher:{id:'different'}}
 ]}];
 assert(jsonSafe(mixedHistory),'Unedited legacy vouchers with shared references must remain compressible');
 assert.equal(JSON.stringify(JSON.parse(JSON.stringify(mixedHistory))),JSON.stringify(mixedHistory),
  'Expanding a shared reference must preserve voucher content exactly');
 const cyclic={id:'bad'};cyclic.related=cyclic;
 assert.equal(jsonSafe(cyclic),false,'An actual circular reference must still prevent JSON compression');
 assert.equal(jsonSafe({amount:undefined}),false,'Undefined legacy values must never be dropped');
 assert.equal(jsonSafe({amount:NaN}),false,'Non-finite financial amounts must never be normalized');
 assert.equal(JSON.stringify(newer[0].multiVoucher),JSON.stringify(newer[1].multiVoucher),'Independent snapshots retain original values');
 assert.deepEqual([...new Set(newer.map(t=>t.id))].length,3);
 assert.equal(records.history[0].transactions.length,1803,'Archive never drops below the protected restored movement count');
 assert.equal(toasts.filter(t=>t.includes('لم يكتمل')).length,0,'Do not report a failed save after success');
 assert(toasts.some(t=>t.includes('تم حفظ')),'Only a confirmed persistent save produces success');
}
async function archiveMarkerUpdate(){
 const start=html.indexOf('async function _persistPending(){');
 const end=html.indexOf('async function flushStorage(){',start);
 assert(start>0&&end>start);
 const source=html.slice(start,end);
 assert(source.includes('const changesArchive=Object.prototype.hasOwnProperty.call(records,historyKey)'));
 assert(source.includes('await _writeShadowRecords(records,deleted);'));
 assert(source.includes('rows:savedRows'),'Persisted archive marker advances after a successful IndexedDB commit');
 const key='rt_large_archive_authority_v1',values=new Map([[key,JSON.stringify({rows:1800,savedAt:1})]]);
 const storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v))};
 const oldHistory=[{transactions:Array.from({length:1800},(_,i)=>({id:String(i)}))}];
 const nextHistory=[{transactions:[...oldHistory[0].transactions,...Array.from({length:3},(_,i)=>({id:'updated'+i}))]}];
 const state={rows:1800,operations:0};
 const context={
  APP_STORAGE_PREFIX:'rt_',VAULT_BLOB_KEY:'rt_vault',SECURITY_CONFIG_KEY:'rt_security',
  STORAGE_META_KEY:'rt_meta',LARGE_ARCHIVE_AUTH_KEY:key,_largeArchiveAuthority:true,
  _pendingWrites:new Map([['rt_history',nextHistory]]),_storageTimer:null,_storageQueue:Promise.resolve(),
  _memStore:{rt_history:nextHistory},
  _vaultCryptoKey:null,_vaultUnlocked:false,
  getSecurityConfig:()=>({enabled:false}),cloneData:val=>structuredClone(val),
  _snapshotMemStore:()=>({}),clearTimeout:()=>{},_nextStorageMeta:()=>({updatedAt:2}),
  _largeArchiveRows:obj=>Array.isArray(obj.rt_history)?obj.rt_history.reduce((n,h)=>n+h.transactions.length,0):0,
  _largeArchiveMarkerRows:()=>Number(JSON.parse(storage.getItem(key)||'{}').rows||0),
  _writeShadowRecords:async records=>{
    assert.equal(JSON.parse(storage.getItem(key)).rows,1800,'Pre-commit marker remains original');
    state.rows=context._largeArchiveRows(records);state.operations++;
  },
  _persistRecords:async()=>{throw new Error('No localStorage fallback for protected archive');},
  _enqueuePersistence:async job=>job(),localStorage:storage,
  encryptVaultBlob:async()=>{throw new Error('Vault disabled');}
 };
 const sandbox=vm.createContext(context);
 vm.runInContext(source+';this.persist=_persistPending;',sandbox);
 await sandbox.persist();
 assert.equal(state.rows,1803,'Updated archive was durably written');
 assert.equal(JSON.parse(storage.getItem(key)).rows,1803,'Bootstrap marker agrees with IndexedDB count');
 assert.equal(state.operations,1);
 const stale=[{transactions:Array.from({length:1200},(_,i)=>({id:String(i)}))}];
 sandbox._memStore={rt_history:stale};
 sandbox._pendingWrites.set('rt_history',stale);
 await assert.rejects(sandbox.persist(),/حماية الأرشيف/,'An old tab still cannot overwrite the restored ledger');
 assert.equal(state.operations,1,'Stale tab never reaches IndexedDB write');
 assert(sandbox._pendingWrites.has('rt_history'),'Failed historical write remains pending for recovery');
}

Promise.all([mobileSearch(),archivedEdit(),archiveMarkerUpdate()]).then(()=>console.log('PASS 3.6.185: mobile search focus, audited historical edits, durable archive marker, and stale-tab protection'))
.catch(err=>{console.error(err);process.exitCode=1;});
