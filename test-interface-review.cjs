const fs=require('fs');
const assert=require('assert/strict');
const vm=require('vm');
const {webcrypto}=require('crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const results=[],fixtures=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function workerFixture(waiting){const listeners=new Map(),messages=[];const add=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};const registration={waiting:waiting?{postMessage(message){messages.push(message);}}:null,active:{postMessage(){}},addEventListener(){}};return {messages,emit(type,event){for(const fn of listeners.get(type)||[])fn(event);},service:{controller:{},register:async()=>registration,ready:Promise.resolve(registration),addEventListener:add}};}
async function waitFor(fn,label,ms=5000){const deadline=Date.now()+ms;while(Date.now()<deadline){if(fn())return;await pause(10);}throw Error('Timeout: '+label);}
function code(win,script){if(script.includes('goBackInApp()')||script.includes("runAccountAction('close')"))return win.eval('(async()=>{'+script.replaceAll('goBackInApp()','await goBackInApp()').replaceAll("runAccountAction('close')","await runAccountAction('close')")+'})()');return win.eval(script);}
function localSnapshot(win){return Object.fromEntries(Object.keys(win.localStorage).map(k=>[k,win.localStorage.getItem(k)]));}
function makeFixture({idb=new IDBFactory(),seed={},blockLocal=false,blockIDB=false,serviceWorker=null,historySetup=[]}={}){
  const errors=[],downloads=[],canvasText=[],logs=[],permissions={requests:0},faults={local:false,idb:false};
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));virtualConsole.on('error',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));virtualConsole.on('warn',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));
  const dom=new JSDOM(html,{url:'https://ratib.test/Ratib0129/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,beforeParse(win){
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
  const fixture={dom,win:dom.window,idb,errors,logs,downloads,canvasText,permissions,faults};
  fixtures.push(fixture);return fixture;
}
async function boot(f){try{await waitFor(()=>{try{return code(f.win,'typeof selDebitAcc!=="undefined" && !!selDebitAcc && typeof ledgerNeedsRender!=="undefined"');}catch{return false;}},'boot');}catch(e){console.error('Startup diagnostics',JSON.stringify({errors:f.errors,logs:f.logs,fatal:f.win.document.body.textContent.slice(-1200)}));throw e;}await pause(50);assert.deepEqual(f.errors,[]);}
async function flush(f){await code(f.win,'flushStorage()');}
function setStore(f,key,value){f.win.__testValue=value;code(f.win,`store.set(${JSON.stringify(key)},__testValue)`);delete f.win.__testValue;}
function tx(amount=100,currency='YER',mode='spend',extra={}){return {id:'t'+Math.random(),seqNum:1,isoDate:'2026-10-01',date:'2026-10-01',amount,currency,voucherMode:mode,isExpense:mode==='spend',status:'posted',debitAccount:'حساب مدين',creditAccount:'حساب دائن',distribution:{general:{id:'general',name:'عام',amount,color:'#64748b'}},execution:{general:{actualSpent:mode==='income'?0:amount,note:''}},...extra};}
async function test(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS',name);}


async function run(){
 const f=makeFixture({seed:{'ratib.quickFavorites.v1':JSON.stringify(['pageExpenses','pageReports','pageSettings','pageLedger'])}});await boot(f);const w=f.win,d=w.document;
 const load=name=>w.eval(fs.readFileSync(require('node:path').join(__dirname,name),'utf8'));
 for(const name of ['ratib-annual-close.js','ratib-favorites-v3.js','ratib-theme.js','ratib-navigation-v3.js'])load(name);
 await pause(20);
 await test('Report grid reuses the four original controls; annual dialog remains functional',async()=>{
  assert.equal(d.querySelectorAll('#ratibReportMenu>*').length,4);code(w,"navigateToTab('pageReports',true);closeAllReportsSections()");
  for(const id of ['reportsGroupStatementHeader','reportsGroupBudgetHeader','reportsGroupTrialHeader']){d.getElementById(id).click();await pause(10);assert(d.getElementById(id.replace('Header','Body')).classList.contains('open'));}
  d.getElementById('yearToolOpen').click();assert.equal(d.getElementById('yearToolOverlay').style.display,'flex');d.getElementById('yearToolDismiss').click();assert.equal(d.getElementById('yearToolOverlay').style.display,'none');
 });
 const open=()=>w.RatibQuickFavorites.open();
 const choose=async(id)=>{open();if(!d.querySelector(`[data-go="${id}"]`))d.querySelector(`[data-add="${id}"]`).click();d.querySelector(`[data-go="${id}"]`).click();await pause(25);};
 await test('Generic menu favorites are removed while a specific legacy favorite is retained',async()=>{open();for(const id of ['pageExpenses','pageReports','pageSettings'])assert.equal(d.querySelector(`[data-go="${id}"],[data-add="${id}"]`),null);assert(d.querySelector('[data-go="ledger"]'));});
 await test('Four voucher favorites open their exact mode without saving transactions',async()=>{
  const before=code(w,'JSON.stringify(getAllTransactions())');
  for(const [id,mode] of [['receipt','income'],['payment','spend'],['multi-entry','multi-entry'],['simple-entry','entry']]){
   await choose(id);assert(!d.getElementById('pageExpenses').classList.contains('hidden'));
   if(mode==='entry')assert(!d.getElementById('cashFlowCard').classList.contains('hidden'));else{assert.equal(code(w,'multiVoucherMode'),mode);assert(!d.getElementById('multiVoucherCard').classList.contains('hidden'));}
  }
  assert.equal(code(w,'JSON.stringify(getAllTransactions())'),before);
 });
 await test('Specific report favorites open the intended report every time',async()=>{
  for(const [id,section] of [['trial-balance','Trial'],['budget-analysis','Budget'],['statement','Statement'],['trial-balance','Trial']]){
   await choose(id);assert(!d.getElementById('pageReports').classList.contains('hidden'));assert(d.getElementById('reportsGroup'+section+'Body').classList.contains('open'));
  }
 });
 await test('Settings favorites open their exact section and support persistent add/remove',async()=>{
  open();const ids=[...d.querySelectorAll('[data-add^="setting:"]')].map(b=>b.dataset.add);assert(ids.length>=6);
  for(const id of ids){await choose(id);assert(!d.getElementById('pageSettings').classList.contains('hidden'));
   const anchor=d.getElementById(id.slice(8));const card=anchor.closest('.settings-accordion-card');assert(card.querySelector('.settings-accordion-body').classList.contains('open'),id);
   open();d.querySelector(`[data-remove="${id}"]`).click();assert(!JSON.parse(w.localStorage.getItem('ratib.quickFavorites.v2')).includes(id));assert(d.querySelector(`[data-add="${id}"]`));
  }
 });
 await test('Favorites search, category filtering, and current-function pinning',async()=>{
  code(w,"navigateToTab('pageExpenses',true);selectMultiVoucherType()");open();
  const pin=d.getElementById('ratibPinCurrent');assert(!pin.hidden);assert.equal(pin.dataset.pin,'multi-entry');
  const before=JSON.parse(w.localStorage.getItem('ratib.quickFavorites.v2'));pin.click();const after=JSON.parse(w.localStorage.getItem('ratib.quickFavorites.v2'));assert.notEqual(before.includes('multi-entry'),after.includes('multi-entry'));
  const search=d.getElementById('ratibFavSearch');search.value='العملات';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert([...d.querySelectorAll('[data-add]')].every(b=>b.textContent.includes('العملات')));assert(d.querySelectorAll('[data-add]').length>=1);
  search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));const group=d.getElementById('ratibFavGroup');group.value='التقارير';group.dispatchEvent(new w.Event('change',{bubbles:true}));assert([...d.querySelectorAll('.fav-choice-group h3')].every(el=>el.textContent==='التقارير'));
 });
 await test('Back controls are marked; existing text and command handlers remain',async()=>{assert(d.getElementById('ledgerBackBtn').classList.contains('ratib-back-control'));assert(d.getElementById('backToMenuBtn').querySelector('[data-icon="back"]'));assert.equal(d.getElementById('backToMenuBtn').getAttribute('onclick'),'goBackInApp()');});
 assert.deepEqual(f.errors,[]);fixtures.forEach(x=>x.dom.window.close());
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
