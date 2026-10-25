const fs=require('fs');
const assert=require('assert/strict');
const vm=require('vm');
const {webcrypto}=require('crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const htmlFor=variant=>fs.readFileSync(require('node:path').join(__dirname,variant==='trial'?'trial/index.html':'index.html'),'utf8');
const results=[],fixtures=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function workerFixture(waiting){const listeners=new Map(),messages=[];const add=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};const registration={waiting:waiting?{postMessage(message){messages.push(message);}}:null,active:{postMessage(){}},addEventListener(){}};return {messages,emit(type,event){for(const fn of listeners.get(type)||[])fn(event);},service:{controller:{},register:async()=>registration,ready:Promise.resolve(registration),addEventListener:add}};}
async function waitFor(fn,label,ms=5000){const deadline=Date.now()+ms;while(Date.now()<deadline){if(fn())return;await pause(10);}throw Error('Timeout: '+label);}
function code(win,script){if(script.includes('goBackInApp()')||script.includes("runAccountAction('close')"))return win.eval('(async()=>{'+script.replaceAll('goBackInApp()','await goBackInApp()').replaceAll("runAccountAction('close')","await runAccountAction('close')")+'})()');return win.eval(script);}
function localSnapshot(win){return Object.fromEntries(Object.keys(win.localStorage).map(k=>[k,win.localStorage.getItem(k)]));}
function makeFixture({variant='official',idb=new IDBFactory(),seed={},blockLocal=false,blockIDB=false,serviceWorker=null,historySetup=[]}={}){
  const errors=[],downloads=[],canvasText=[],logs=[],permissions={requests:0},faults={local:false,idb:false};
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));virtualConsole.on('error',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));virtualConsole.on('warn',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));
  const dom=new JSDOM(htmlFor(variant),{url:'https://ratib.test/Ratib0129/'+(variant==='trial'?'trial/':''),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,beforeParse(win){
    historySetup.forEach((entry,index)=>{if(index)win.history.pushState(entry.state||{},'',entry.path);else win.history.replaceState(entry.state||{},'',entry.path);});
    for(const [k,v] of Object.entries(seed))win.localStorage.setItem(k,v);
    faults.local=blockLocal;faults.idb=blockIDB;
    const setItem=win.Storage.prototype.setItem;
    win.Storage.prototype.setItem=function(k,v){if(faults.local)throw new win.DOMException('simulated storage quota','QuotaExceededError');return setItem.call(this,k,v);};
    Object.defineProperty(win,'indexedDB',{value:{open(...args){if(faults.idb)throw Error('simulated IndexedDB unavailable');return idb.open(...args);}}});
    Object.defineProperty(win,'crypto',{value:webcrypto});win.TextEncoder=TextEncoder;win.TextDecoder=TextDecoder;win.structuredClone=structuredClone;win.Blob=Blob;win.File=File;
    win.alert=()=>{};win.print=()=>{};win.confirm=()=>true;win.prompt=()=> 'correct-pin';win.close=()=>{};
    win.Notification=function(){};win.Notification.permission='default';win.Notification.requestPermission=async()=>{permissions.requests++;return 'granted';};
    if(serviceWorker)Object.defineProperty(win.navigator,'serviceWorker',{value:serviceWorker});
    const blobs=new Map();win.URL.createObjectURL=blob=>{const url='blob:fixture-'+blobs.size;blobs.set(url,blob);return url;};win.URL.revokeObjectURL=()=>{};
    win.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)});};
    win.scrollTo=()=>{};win.HTMLElement.prototype.scrollIntoView=()=>{};win.HTMLElement.prototype.scrollTo=()=>{};
    win.HTMLCanvasElement.prototype.getContext=function(){return {font:'',textAlign:'right',direction:'rtl',fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},measureText(value){return {width:String(value).length*10};},fillText(value){canvasText.push(String(value));}};};
    win.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,/9j/2Q==';
  }});
  const fixture={variant,dom,win:dom.window,idb,errors,logs,downloads,canvasText,permissions,faults};
  fixtures.push(fixture);return fixture;
}
async function boot(f){try{await waitFor(()=>{try{return code(f.win,'typeof selDebitAcc!=="undefined" && !!selDebitAcc && typeof ledgerNeedsRender!=="undefined"');}catch{return false;}},'boot');}catch(e){console.error('Startup diagnostics',JSON.stringify({errors:f.errors,logs:f.logs,fatal:f.win.document.body.textContent.slice(-1200)}));throw e;}await pause(50);assert.deepEqual(f.errors,[]);}
async function flush(f){await code(f.win,'flushStorage()');}
function setStore(f,key,value){f.win.__testValue=value;code(f.win,`store.set(${JSON.stringify(key)},__testValue)`);delete f.win.__testValue;}
function tx(amount=100,currency='YER',mode='spend',extra={}){return {id:'t'+Math.random(),seqNum:1,isoDate:'2026-10-01',date:'2026-10-01',amount,currency,voucherMode:mode,isExpense:mode==='spend',status:'posted',debitAccount:'حساب مدين',creditAccount:'حساب دائن',distribution:{general:{id:'general',name:'عام',amount,color:'#64748b'}},execution:{general:{actualSpent:mode==='income'?0:amount,note:''}},...extra};}
async function test(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS',name);}

function filter(win,overrides={}){return {from:'2026-10-01',to:'2026-10-31',budget:'all',base:'YER',mode:'original',currency:'YER',level:'',costCenter:'',project:'',compact:false,...overrides};}
function model(f,overrides={}){f.win.reportFilters=filter(f.win,overrides);return code(f.win,'trialBuildModel(getAllTransactions(),reportFilters)');}
function names(result){return result.accounts.map(account=>account.name);}
async function run(){
 for(const variant of ['official','trial']){
  let f=makeFixture({variant});await boot(f);let w=f.win,d=w.document;
  const accounts=code(w,'getCanonicalCatalog().flatMap(r=>r.details.map(([code,name])=>({code:String(code),name}))).slice(0,4)');
  const payload={format:'ratib-legacy-import',version:1,baseCurrency:'YER',cutoff:'2026-09-01',accounts:accounts.slice(0,2).map((a,i)=>({id:'a'+i,name:a.name,matchCode:a.code})),balances:['YER','SAR','USD','AED'].flatMap((currency,i)=>[{accountId:'a0',currency,debit:'10.123456',credit:'0',baseDebit:'20.246912',baseCredit:'0'},{accountId:'a1',currency,debit:'0',credit:'10.123456',baseDebit:'0',baseCredit:'20.246912'}])};
  w.payload=payload;w.names=accounts.map(a=>a.name);
  await test(variant+': actual import creates one logical compound document with every currency and exact source valuation',async()=>{
   code(w,"legacyImportState.payload=payload;document.getElementById('legacyImportCutoff').value=payload.cutoff;document.getElementById('legacyImportKind').value='balances';legacyRenderPreview();document.getElementById('legacyImportApprove').checked=true;legacyCalculatePreview()");
   assert.equal(await code(w,'applyLegacyImport()'),true);code(w,'closeLegacyImport()');
   assert.equal(code(w,'getAllTransactions().length'),8);assert.equal(code(w,'new Set(getAllTransactions().map(t=>t.importVoucherId)).size'),1);assert.equal(code(w,'new Set(getAllTransactions().map(t=>t.seqNum)).size'),1);
   const before=code(w,'JSON.stringify(getAllTransactions())'),docs=code(w,'groupLedgerItemsForDisplay(getAllTransactions())');assert.equal(docs.length,1);assert.equal(docs[0].records.length,8);assert.equal(docs[0].amount,80.987648);assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   code(w,'renderAllData(true)');assert.equal(d.querySelectorAll('#ledgerList .tx-log-item').length,1);code(w,'renderGlobalSearch("")');assert.equal(d.querySelectorAll('#globalSearchResults .global-result').length,1);
  });
  await test(variant+': historic batches group from current legs without modifying or resurrecting source snapshots',async()=>{
   const p=code(w,'getMasterPlan()');for(const t of p.transactions)delete t.importVoucherId;setStore(f,'plan',p);const before=code(w,'JSON.stringify(getAllTransactions())');assert.equal(code(w,'groupLedgerItemsForDisplay(getAllTransactions()).length'),1);assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   w.batchSnapshot=code(w,'JSON.stringify(store.get("legacy_import_batches"))');
   // Both the ledger document and individual account movement open the whole voucher.
   code(w,'openTxModal(getAllTransactions()[0])');assert(d.getElementById('importedOpeningVoucherModal').classList.contains('show'));assert.equal(d.querySelectorAll('#importedOpeningRows tr').length,8);
  });
  const change=(row,field,value)=>{const el=d.querySelector(`#importedOpeningRows [data-row="${row}"][data-field="${field}"]`);assert(el,field);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  await test(variant+': unbalanced editing, unknown accounts and duplicate account/currency are rejected atomically',async()=>{
   const before=code(w,'JSON.stringify(legacyCurrentData())');change(0,'debit','9.123456');change(0,'baseDebit','18.246912');assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);assert.equal(code(w,'JSON.stringify(legacyCurrentData())'),before);
   change(0,'account','حساب غير موجود');assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);assert.equal(code(w,'JSON.stringify(legacyCurrentData())'),before);change(0,'account',accounts[0].name);
   change(0,'currency','SAR');assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);change(0,'currency','YER');
  });
  await test(variant+': edit both sides, add a balanced foreign pair, preserve old identifiers and unrelated history',async()=>{
   code(w,"const hist={month:'2026-08',transactions:[{id:'unrelated',isoDate:'2026-08-01',debitAccount:names[2],creditAccount:names[3],amount:7,currency:'YER',status:'posted'}]};store.set('history',[hist])");
   const history=code(w,'JSON.stringify(store.get("history"))'),oldIds=code(w,'getMasterPlan().transactions.map(t=>t.id)');
   change(1,'credit','9.123456');change(1,'baseCredit','18.246912');
   for(let i=0;i<2;i++){
    d.getElementById('importedOpeningAdd').click();change(8+i,'account',accounts[2+i].name);change(8+i,'currency','USD');change(8+i,i?'credit':'debit','5.123456');change(8+i,i?'baseCredit':'baseDebit','100.123456');
   }
   const before=code(w,'JSON.stringify(getAllTransactions())');code(w,'outputImportedOpeningEditor("preview")');assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);assert(d.getElementById('printVoucherContainer').textContent.includes('5.123456'),d.getElementById('importedOpeningError').textContent||f.logs.join(' | '));assert.equal(code(w,'_ratibOverlayState.surface.id'),'printPreviewModal');d.getElementById('printPreviewCancelBtn').click();assert.equal(code(w,'_ratibOverlayState.surface.id'),'importedOpeningVoucherModal');
   assert.equal(await code(w,'saveImportedOpeningVoucher()'),true);assert.equal(code(w,'getMasterPlan().transactions.length'),10);assert.equal(JSON.stringify(code(w,'getMasterPlan().transactions.slice(0,8).map(t=>t.id)')),JSON.stringify(oldIds));assert.equal(code(w,'JSON.stringify(store.get("history"))'),history);assert.equal(code(w,'JSON.stringify(store.get("legacy_import_batches"))'),w.batchSnapshot);
   assert.equal(code(w,'getMasterPlan().transactions[0].openingBalance.debit'),'9.123456');assert.equal(code(w,'getMasterPlan().transactions[0].importEditHistory.length'),1);
   const docs=code(w,'groupLedgerItemsForDisplay(getAllTransactions())');assert.equal(docs.length,2);assert.equal(docs.find(t=>t.isImportedOpeningVoucher).records.length,10);assert(model(f).totals.every(t=>Math.abs(t.difference)<1e-9));
  });
  await test(variant+': preview, print and PDF include all balances once without storing edits',async()=>{
   const before=code(w,'JSON.stringify(legacyCurrentData())');code(w,'preparePrintVoucherTemplate(getAllTransactions()[0])');assert.equal(d.getElementById('pvTableBox').querySelectorAll('tbody tr').length,11);assert(d.getElementById('pvVoucherTitle').textContent.includes('قيد مركب'));
   let prints=0;w.print=()=>prints++;code(w,'openTxModal(getAllTransactions()[0]);outputImportedOpeningEditor("print")');assert.equal(prints,1);w.dispatchEvent(new w.Event('afterprint'));
   f.canvasText.length=0;const pdf=code(w,'buildSingleVoucherPdf(getAllTransactions()[0])');assert((await pdf.text()).startsWith('%PDF'));for(const currency of ['YER','SAR','USD','AED'])assert(f.canvasText.some(t=>t===currency));assert.equal(code(w,'JSON.stringify(legacyCurrentData())'),before);code(w,'closeImportedOpeningVoucher()');
  });
  await test(variant+': concurrent edit and failed persistent write never overwrite stored accounting data',async()=>{
   code(w,'openTxModal(getAllTransactions()[0])');const plan=code(w,'getMasterPlan()');plan.transactions[0].openingBalance.note='changed externally';setStore(f,'plan',plan);const before=code(w,'JSON.stringify(legacyCurrentData())');assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);assert.equal(code(w,'JSON.stringify(legacyCurrentData())'),before);code(w,'closeImportedOpeningVoucher();openTxModal(getAllTransactions()[0]);window.savedWriter=_replacePersistentData;_replacePersistentData=async()=>{throw Error("simulated failure")}');
   assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);assert.equal(code(w,'JSON.stringify(legacyCurrentData())'),before);code(w,'_replacePersistentData=window.savedWriter;closeImportedOpeningVoucher()');
  });
  await test(variant+': a voucher spanning plan and history saves in place and a closed fiscal year rejects edits',async()=>{
   code(w,"const p=getMasterPlan(),h=store.get('history');h.push({month:'2026-09',transactions:p.transactions.splice(0,2)});store.set('plan',p);store.set('history',h);openTxModal(getAllTransactions()[0])");
   const planIds=JSON.stringify(code(w,'getMasterPlan().transactions.map(t=>t.id)')),historyIds=JSON.stringify(code(w,'store.get("history").flatMap(h=>h.transactions.map(t=>t.id))'));
   change(0,'note','مراجعة القيد المركب');assert.equal(await code(w,'saveImportedOpeningVoucher()'),true);assert.equal(JSON.stringify(code(w,'getMasterPlan().transactions.map(t=>t.id)')),planIds);assert.equal(JSON.stringify(code(w,'store.get("history").flatMap(h=>h.transactions.map(t=>t.id))')),historyIds);
   w.eval(fs.readFileSync(require('node:path').join(__dirname,variant==='trial'?'trial/ratib-annual-close.js':'ratib-annual-close.js'),'utf8'));
   code(w,"store.set('annual_closures_v1',{'2026':{year:'2026',cutoff:'2026-12-31',snapshots:cloneData(getAllTransactions())}});openTxModal(getAllTransactions()[0])");
   const before=code(w,'JSON.stringify(Object.fromEntries(Object.entries(legacyCurrentData()).filter(([key])=>key!=="masar_ratib_ui_resume_view_v1")))');change(0,'note','لا يحفظ في سنة مغلقة');assert.equal(await code(w,'saveImportedOpeningVoucher()'),false);assert.equal(code(w,'JSON.stringify(Object.fromEntries(Object.entries(legacyCurrentData()).filter(([key])=>key!=="masar_ratib_ui_resume_view_v1")))'),before);assert(d.getElementById('importedOpeningError').textContent.includes('مغلقة'));code(w,"closeImportedOpeningVoucher();store.set('annual_closures_v1',{})");
  });
  await test(variant+': reload and backup restore retain the edited compound without repopulating removed legs',async()=>{
   await flush(f);const idb=f.idb,before=code(w,'JSON.stringify(getAllTransactions())'),backup=code(w,'cloneData(legacyCurrentData())');f.dom.window.close();f=makeFixture({variant,idb});await boot(f);w=f.win;d=w.document;assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);assert.equal(code(w,'groupLedgerItemsForDisplay(getAllTransactions()).filter(t=>t.isImportedOpeningVoucher).length'),1);w.backup=backup;await code(w,'legacyPersistSnapshot(backup)');assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   code(w,'openTxModal(getAllTransactions()[0])');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!d.getElementById('importedOpeningVoucherModal').classList.contains('show'));assert.equal(code(w,'!!_ratibOverlayState'),false);
  });
  await test(variant+': deleted foreign accounts settled before the period disappear even without a display exchange rate',async()=>{
   const name='محذوف صفري بلا سعر';w.deletedName=name;
   code(w,`const p=getMasterPlan();p.transactions=[{id:'op-a',isOpeningBalance:true,openingBalance:{account:deletedName,currency:'SAR',debit:'100',credit:'0',baseCurrency:'SAR',baseDebit:'100',baseCredit:'0'},amount:100,currency:'SAR',isoDate:'2026-09-01',status:'posted'},{id:'op-b',isOpeningBalance:true,openingBalance:{account:deletedName,currency:'SAR',debit:'0',credit:'100',baseCurrency:'SAR',baseDebit:'0',baseCredit:'100'},amount:100,currency:'SAR',isoDate:'2026-09-02',status:'posted'}];store.set('history',[]);store.set('plan',p)`);
   const before=code(w,'JSON.stringify(getAllTransactions())');for(const mode of ['original','dual','equivalent','specific']){const result=model(f,{base:'YER',mode,currency:'SAR'});assert(!names(result).includes(name));assert.equal(result.omittedDeletedAccounts,1);assert.equal(result.requiresReview,false);}assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   code(w,"runTrialBalanceReport();printTrialReport()");assert(!d.getElementById('trialPrintHost').textContent.includes(name));w.dispatchEvent(new w.Event('afterprint'));f.canvasText.length=0;await code(w,'buildTrialBalancePdf()');assert(!f.canvasText.some(t=>t.includes(name)));
   code(w,"const active=getCanonicalCatalog()[0].details[0][1],plan=getMasterPlan();for(const t of plan.transactions)t.openingBalance.account=active;store.set('plan',plan)");const activeResult=model(f,{mode:'dual'});assert.equal(activeResult.accounts.length,1);assert.equal(activeResult.base.missing,0);assert.equal(activeResult.requiresReview,false);
  });
  await test(variant+': zero native but material independent valuation stays with the exact reason in every output',async()=>{
   code(w,"const p=getMasterPlan();p.transactions=[{id:'valuation-only',isOpeningBalance:true,openingBalance:{account:deletedName,currency:'SAR',debit:'0',credit:'0',baseCurrency:'YER',baseDebit:'123.456789',baseCredit:'0'},amount:123.456789,currency:'YER',isoDate:'2026-10-01',status:'posted'}];store.set('plan',p)");const result=model(f);assert(names(result).includes('محذوف صفري بلا سعر'));assert(result.reviewAccounts[0].reasons.some(r=>r.includes('123.456789')));w.report=result;assert(code(w,'trialReportHtml(report)').includes('123.456789'));f.canvasText.length=0;await code(w,'buildTrialBalancePdf()');assert(f.canvasText.some(t=>t.includes('123.456789')));
  });
  assert.deepEqual(f.errors,[]);
 }
 fixtures.forEach(f=>f.dom.window.close());
}
run().then(()=>process.exit(0)).catch(error=>{console.error(error.stack);process.exit(1)});
