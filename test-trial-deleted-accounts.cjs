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
    win.alert=()=>{};win.confirm=()=>true;win.prompt=()=> 'correct-pin';win.close=()=>{};
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
  const a='حساب_حذف_اختبار',b='حساب_نشط_اختبار',currencies=['YER','SAR','USD','EUR'];
  const payload={format:'ratib-legacy-import',version:1,baseCurrency:'YER',cutoff:'2026-10-01',sourceLabel:'اختبار حذف حساب مستورد',accounts:[
   {id:'deleted-a',name:a,preferredCode:'980001',path:['مجموعة_اختبار','تجميعي_اختبار','فرع_اختبار',a]},
   {id:'active-b',name:b,preferredCode:'980002',path:['مجموعة_اختبار','تجميعي_اختبار','فرع_اختبار',b]}
  ],balances:currencies.flatMap(currency=>[
   {accountId:'deleted-a',currency,debit:'100',credit:'0',baseDebit:'100',baseCredit:'0'},
   {accountId:'active-b',currency,debit:'0',credit:'100',baseDebit:'0',baseCredit:'100'}
  ])};
  let oldBackup,deletedBackup,ledger,batch;
  await test(variant+': import a real balanced batch with three built-in currencies and a custom currency',async()=>{
   w.importPayload=payload;
   code(w,`legacyImportState.payload=importPayload;document.getElementById('legacyImportCutoff').value='2026-10-01';document.getElementById('legacyImportKind').value='both';legacyRenderPreview();document.getElementById('legacyImportApprove').checked=true;legacyCalculatePreview()`);
   assert.equal(await code(w,'applyLegacyImport()'),true);code(w,'closeLegacyImport()');await flush(f);
   assert.equal(code(w,'getAllTransactions().length'),8);assert(names(model(f)).includes(a));
   oldBackup=code(w,'cloneData(legacyCurrentData())');batch=code(w,'JSON.stringify(store.get("legacy_import_batches"))');
   for(const [id,value] of [['trialFrom','2026-10-01'],['trialTo','2026-10-31'],['trialBudget','all']])d.getElementById(id).value=value;
   code(w,"openReportsSection('trial')");assert(d.getElementById('trialBalanceSections').textContent.includes(a));
  });
  await test(variant+': zero the imported records through their editor, then delete only the selected account from the live tree',async()=>{
   const ids=code(w,'getAllTransactions().map(tx=>tx.id)');
   for(const id of ids){
    w.editId=id;code(w,'openImportedRecordEditor(getAllTransactions().find(tx=>tx.id===editId))');
    d.getElementById('importedAmount').value='0';d.getElementById('importedBaseAmount').value='0';d.getElementById('importedRate').value='';
    assert.equal(await code(w,'saveImportedRecordCorrection()'),true);
   }
   assert.equal(code(w,'JSON.stringify(store.get("legacy_import_batches"))'),batch,'source batch still contains the original nonzero data');
   code(w,`const controlNames=getCanonicalCatalog().filter(row=>row.main!=='مجموعة_اختبار').flatMap(row=>row.details.map(item=>item[1]));const controlPlan=getMasterPlan();controlPlan.transactions.push({id:'unrelated-balanced-control',debitAccount:controlNames[0],creditAccount:controlNames[1],amount:250.25,currency:'YER',isoDate:'2026-10-10',status:'posted'});store.set('plan',controlPlan);`);
   const totalsBefore=JSON.stringify(model(f).totals);ledger=code(w,'JSON.stringify(getAllTransactions())');w.deletedName=a;
   code(w,`deleteAccountFromTree('مجموعة_اختبار',deletedName)`);await flush(f);
   assert(!code(w,'getCanonicalCatalog().some(row=>row.details.some(item=>item[1]===deletedName))'));
   assert.equal(code(w,'JSON.stringify(getAllTransactions())'),ledger);
   const result=model(f);assert(!names(result).includes(a));assert(names(result).includes(b));assert.equal(result.omittedDeletedAccounts,1);assert.equal(result.requiresReview,false);
   assert.equal(JSON.stringify(result.totals),totalsBefore,'nonzero debit, credit and period totals remain unchanged');assert(result.totals.some(total=>total.periodDebit===250.25&&total.periodCredit===250.25));
   assert(result.totals.every(total=>total.difference===0));
   code(w,"openReportsSection('trial')");assert(!d.getElementById('trialBalanceSections').textContent.includes(a),'reopening an already loaded report refreshes the catalog');
  });
  await test(variant+': all display modes, currency selections and hierarchy levels apply deletion before grouping',async()=>{
   for(const mode of ['original','dual','equivalent','specific'])for(const currency of currencies)for(const base of currencies){
    const result=model(f,{mode,currency,base});assert(!names(result).includes(a));assert(names(result).includes(b),'active zero account is retained');
    assert(result.balanceChecks.every(check=>check.openingDifference===0&&check.periodDifference===0&&check.closingDifference===0));
   }
   for(const level of ['1','2','3','4']){const result=model(f,{level});assert(!names(result).includes(a));assert(!result.accounts.some(account=>account.outsideCatalog));assert(result.totals.every(total=>total.difference===0));}
   assert.equal(code(w,'JSON.stringify(getAllTransactions())'),ledger);assert.equal(code(w,'JSON.stringify(store.get("legacy_import_batches"))'),batch);
  });
  await test(variant+': screen, print and generated PDF share the same filtered model',async()=>{
   for(const [id,value] of [['trialFrom','2026-10-01'],['trialTo','2026-10-31'],['trialBudget','all'],['trialMode','original'],['trialBase','YER']])d.getElementById(id).value=value;
   code(w,'runTrialBalanceReport()');assert(!d.getElementById('trialBalanceSections').textContent.includes(a));assert(d.getElementById('trialBalanceSections').textContent.includes(b));
   let printed=0;w.print=()=>{printed++;};code(w,'printTrialReport()');assert.equal(printed,1);assert(!d.getElementById('trialPrintHost').textContent.includes(a));assert(d.getElementById('trialPrintHost').textContent.includes(b));w.dispatchEvent(new w.Event('afterprint'));
   f.canvasText.length=0;const pdf=code(w,'buildTrialBalancePdf()');assert((await pdf.text()).startsWith('%PDF-1.4'));assert(!f.canvasText.some(text=>text.includes(a)));assert(f.canvasText.some(text=>text.includes(b)));
   assert.equal(code(w,'JSON.stringify(getAllTransactions())'),ledger);await flush(f);deletedBackup=code(w,'cloneData(legacyCurrentData())');
  });
  await test(variant+': restart retains the deletion and stale import metadata never restores the row',async()=>{
   const idb=f.idb;f.dom.window.close();f=makeFixture({variant,idb});await boot(f);w=f.win;d=w.document;
   assert(!names(model(f)).includes(a));assert(names(model(f)).includes(b));assert.equal(code(w,'JSON.stringify(getAllTransactions())'),ledger);assert.equal(code(w,'JSON.stringify(store.get("legacy_import_batches"))'),batch);
   code(w,'initializeCanonicalChart();updateSearchableData();runTrialBalanceReport()');assert(!names(model(f)).includes(a));
  });
  await test(variant+': old and new backup restores respect the catalog in each snapshot',async()=>{
   w.backupData=oldBackup;await code(w,'legacyPersistSnapshot(backupData)');assert(names(model(f)).includes(a));assert(names(model(f)).includes(b));
   w.backupData=deletedBackup;await code(w,'legacyPersistSnapshot(backupData)');assert(!names(model(f)).includes(a));assert.equal(code(w,'JSON.stringify(getAllTransactions())'),ledger);
  });
  await test(variant+': archive visibility is not mistaken for permanent catalog deletion',async()=>{
   w.activeName=b;code(w,"store.set('import_archived_accounts',['980002|'+activeName])");
   assert(names(model(f)).includes(b));assert(!model(f).reviewAccounts.some(account=>account.name===b));
  });
  await test(variant+': deleting a parent also removes its zeroed children without changing their historical records',async()=>{
   const before=code(w,'JSON.stringify(getAllTransactions())');
   code(w,"deleteMainCategory('مجموعة_اختبار')");assert(!names(model(f)).includes(a));assert(!names(model(f)).includes(b));assert.equal(model(f).omittedDeletedAccounts,2);assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   w.backupData=deletedBackup;await code(w,'legacyPersistSnapshot(backupData)');
  });
  await test(variant+': settled historical turnover is omitted only when it has no effect on any report column',async()=>{
   w.a=a;w.b=b;
   code(w,`const plan=getMasterPlan();plan.transactions=[
    {id:'history-opening-a',isOpeningBalance:true,openingBalance:{account:a,currency:'YER',debit:'100',credit:'0',baseCurrency:'YER',baseDebit:'100',baseCredit:'0'},amount:100,currency:'YER',isoDate:'2026-09-01',status:'posted'},
    {id:'history-opening-b',isOpeningBalance:true,openingBalance:{account:b,currency:'YER',debit:'0',credit:'100',baseCurrency:'YER',baseDebit:'0',baseCredit:'100'},amount:100,currency:'YER',isoDate:'2026-09-01',status:'posted'},
    {id:'history-settlement',debitAccount:b,creditAccount:a,amount:100,currency:'YER',isoDate:'2026-09-02',status:'posted'}
   ];store.set('history',[{month:'2026-09',transactions:plan.transactions}]);plan.transactions=[];store.set('plan',plan);`);
   const before=code(w,'JSON.stringify(getAllTransactions())'),result=model(f);assert(!names(result).includes(a));assert(names(result).includes(b));assert.equal(result.requiresReview,false);assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
  });
  await test(variant+': a deleted zero closing account with current-period turnover remains visible for accounting review',async()=>{
   code(w,`const history=store.get('history');history[0].transactions.find(tx=>tx.id==='history-settlement').isoDate='2026-10-05';store.set('history',history)`);
   const before=code(w,'JSON.stringify(getAllTransactions())'),result=model(f);
   assert(names(result).includes(a));assert.equal(result.requiresReview,true);assert(result.reviewAccounts.some(account=>account.name===a));assert(result.warnings.some(text=>text.includes('قبل اعتماد التقرير')));
   w.reviewModel=result;assert(code(w,'trialReportRows(reviewModel)[0].values[1]').includes('لا يعتمد'));
   assert(result.totals.every(total=>total.difference===0));assert.equal(result.balanceChecks[0].openingDifference,0);assert.equal(result.balanceChecks[0].periodDifference,0);assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
   const historical=model(f,{from:'2026-09-01',to:'2026-09-01'});assert(names(historical).includes(a),'historical nonzero balance must not disappear');
  });
  await test(variant+': equal debit and credit period turnover is retained even with a zero opening and closing balance',async()=>{
   code(w,`const plan=getMasterPlan();plan.transactions=[{id:'period-a',debitAccount:a,creditAccount:b,amount:25,currency:'YER',isoDate:'2026-10-05',status:'posted'},{id:'period-b',debitAccount:b,creditAccount:a,amount:25,currency:'YER',isoDate:'2026-10-06',status:'posted'}];store.set('plan',plan);store.set('history',[])`);
   const result=model(f),row=result.accounts.find(account=>account.name===a).currencies[0];
   assert.equal(row.native.openingDebit,0);assert.equal(row.native.closingDebit,0);assert.equal(row.native.closingCredit,0);assert.equal(row.native.periodDebit,25);assert.equal(row.native.periodCredit,25);assert.equal(result.requiresReview,true);assert(result.totals.every(total=>total.difference===0));
  });
  await test(variant+': native, valuation and different original currencies cannot cancel one another or hide residual balances',async()=>{
   for(const pair of [
    [{currency:'YER',debit:'0.000001',credit:'0',baseCurrency:'YER',baseDebit:'0.000001',baseCredit:'0'}],
    [{currency:'USD',debit:'0',credit:'0',baseCurrency:'YER',baseDebit:'75',baseCredit:'0'}],
    [{currency:'YER',debit:'100',credit:'0',baseCurrency:'YER',baseDebit:'100',baseCredit:'0'},{currency:'SAR',debit:'0',credit:'100',baseCurrency:'YER',baseDebit:'0',baseCredit:'100'}]
   ]){
    w.testOpenings=pair;code(w,`const plan=getMasterPlan();plan.transactions=testOpenings.map((item,index)=>({id:'residual-'+index,isOpeningBalance:true,openingBalance:{account:a,...item},amount:Number(item.baseDebit)+Number(item.baseCredit),currency:item.baseCurrency,isoDate:'2026-10-01',status:'posted'}));store.set('plan',plan)`);
    const result=model(f);assert(names(result).includes(a));assert.equal(result.requiresReview,true);
   }
  });
  await test(variant+': visible version labels are unified while trial storage remains isolated',async()=>{
   const source=htmlFor(variant);
   const release=JSON.parse(source.match(/const RATIB_RELEASE=(\{[^\n]+\});/)[1]);
   assert.equal(code(w,'RATIB_RELEASE.version'),release.version);
   const staticLabel=source.split('id="appVersionLabel" class="app-version">')[1].split('</small>')[0];
   const label=JSDOM.fragment(staticLabel).textContent.trim();
   assert(label.includes('الإصدار '+release.version),'Visible label matches its own release metadata');
   assert.equal(d.getElementById('appVersionLabel').textContent.trim(),label);
   assert.equal(d.querySelector('.ratib-about-version').textContent.trim(),label);
   assert.equal(code(w,'APP_STORAGE_PREFIX'),variant==='trial'?'ratib_trial_masar_':'masar_');
  });
  assert.deepEqual(f.errors,[]);
 }
 // Keep the financial reporting policy identical in both distributions.
 const official=htmlFor('official'),trial=htmlFor('trial');
 assert(official.includes('function trialBuildModel(')&&trial.includes('function trialBuildModel('),'Both distributions retain trial balance calculations; release sources can differ');
 fixtures.forEach(f=>f.dom.window.close());
}
run().then(()=>process.exit(0)).catch(error=>{console.error(error.stack);process.exit(1)});

