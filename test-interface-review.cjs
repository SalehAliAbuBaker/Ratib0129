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
 await test('Report grid reuses the six current controls; annual dialog remains functional',async()=>{
  assert.equal(d.querySelectorAll('#ratibReportMenu>*').length,6);code(w,"navigateToTab('pageReports',true);closeAllReportsSections()");
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
  for(const [id,section] of [['trial-balance','Trial'],['budget-analysis','Budget'],['trial-balance','Trial']]){
   await choose(id);assert(!d.getElementById('pageReports').classList.contains('hidden'));assert(d.getElementById('reportsGroup'+section+'Body').classList.contains('open'));
  }
 });
 await test('Settings favorites open their exact section and support persistent add/remove',async()=>{
  const legacyIds=[...d.querySelectorAll('#pageSettings .settings-accordion-card')].filter(c=>c.id!=='ratibFavoritesSettingsCard'&&c.querySelector('.settings-accordion-header')).map(c=>'setting:'+(c.id||c.querySelector('[id]')?.id)).filter(id=>!id.endsWith('undefined'));
  const prior=JSON.parse(w.localStorage.getItem('ratib.quickFavorites.v2')||'[]');
  w.localStorage.setItem('ratib.quickFavorites.v2',JSON.stringify([...prior,...legacyIds]));
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
 await test('Account tools retain labels, icons and orientation controls after output normalization',async()=>{
  const menu=d.getElementById('accountScreenMenu');
  const items=[...menu.querySelectorAll('button[role="menuitem"]')];
  const markup=items.map(b=>b.innerHTML);
  const orientationLabel=d.getElementById('ratibAccountOrientationLabel');
  load('ratib-unified-output.js');await pause(30);
  for(let pass=0;pass<3;pass++)w.RatibUnifiedOutput.refresh();
  items.forEach((b,i)=>{
   assert.equal(b.innerHTML,markup[i],b.dataset.accountAction||b.id);
   assert(b.querySelector('.ratib-menu-icon'));
   assert(b.querySelector('.ratib-menu-text').textContent.trim());
   assert(!b.classList.contains('ratib-output-icon'));
  });
  assert(d.getElementById('printMultiVoucherBtn').classList.contains('ratib-output-icon'),'ordinary output toolbar still uses icons');
  const toggle=d.getElementById('accountScreenMenuToggle');toggle.click();
  assert(menu.classList.contains('open'));assert.equal(toggle.getAttribute('aria-expanded'),'true');
  const originalOrientation=code(w,'ratibPaperLandscape()');
  d.getElementById('ratibAccountOrientationBtn').click();await pause(25);
  assert.equal(code(w,'ratibPaperLandscape()'),!originalOrientation);
  assert.equal(d.getElementById('ratibAccountOrientationLabel'),orientationLabel);
  assert(orientationLabel.textContent.includes(originalOrientation?'عمودي':'أفقي'));
  w.RatibUnifiedOutput.refresh();
  d.getElementById('ratibAccountOrientationBtn').click();
  assert.equal(code(w,'ratibPaperLandscape()'),originalOrientation);
  toggle.click();menu.querySelector('[data-account-action="advanced"]').click();
  assert(!menu.classList.contains('open'));assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert(!d.getElementById('accountAdvancedSearchPanel').classList.contains('hidden'));
  toggle.click();d.getElementById('accountToolsCloseBtn').click();assert(!menu.classList.contains('open'));
 });
 await test('Current settings pin and open their exact card through the real sidebar',async()=>{
  load('ratib-sidebar-3.6.124.js');await pause(30);
  for(const key of ['budget','printing','security']){
   w.RatibSettingsOpen(key);await pause(40);open();
   const pin=d.getElementById('ratibPinCurrent');assert(!pin.hidden,key);
   assert.equal(pin.dataset.pin,'settings:'+key);
   if(!JSON.parse(w.localStorage.getItem('ratib.quickFavorites.v2')||'[]').includes(pin.dataset.pin))pin.click();
   code(w,"navigateToTab('pageDashboard',true)");await pause(20);
   await choose('settings:'+key);await pause(40);
   assert(!d.getElementById('pageSettings').classList.contains('hidden'));
   const card=d.querySelector('#pageSettings .ratib-settings-current');
   assert(card&&card.querySelector('.settings-accordion-body.open'),key+' must open its exact detail card');
   const label=card.querySelector('.settings-accordion-header span').textContent;
   assert(label.includes(({budget:'بنود الميزانية',printing:'إعدادات الطباعة',security:'الأمان'})[key]));
  }
 });
 await test('Commerce draft survives the application screen snapshot and restore pipeline',async()=>{
  load('ratib-commerce-3.6.131.js');
  w.RatibCommerce.openFavorite('purchase','new:فاتورة مشتريات');await pause(30);
  d.getElementById('rc-note').value='مسودة تستعاد مع الشاشة';
  d.getElementById('rc-number').value='PI-resume';
  const snapshot=JSON.parse(JSON.stringify(code(w,'captureAppView()')));
  assert.equal(snapshot.commerce.draft.note,'مسودة تستعاد مع الشاشة');
  w.RatibCommerce.openFavorite('stock','products');
  w.__commerceResumeTest=snapshot;code(w,'restoreAppView(__commerceResumeTest)');await pause(30);
  assert.equal(d.getElementById('rc-note').value,'مسودة تستعاد مع الشاشة');
  assert.equal(d.getElementById('rc-number').value,'PI-resume');
  assert.equal(w.RatibCommerce.captureView().mode,'in');
  delete w.__commerceResumeTest;
 });
 await test('Shared commerce defaults and debit-first document fields preserve accounting roles',async()=>{
  for(const [target,screen,first] of [['purchase','new:فاتورة مشتريات','rc-debitAccount'],['sale','new:فاتورة مبيعات','rc-debitAccount'],['purchase','return','rc-partyAccount'],['sale','return','rc-warehouse']]){
   w.RatibCommerce.openFavorite(target,screen);await pause(20);
   assert.equal(d.querySelector('#pageCommerce [data-rc-view="accounts"]'),null);
   if(screen.startsWith('new:')){
    const boxes=[...d.querySelectorAll('.rc-invoice-core .rc-wide-account')];
    assert.equal(boxes.length,3);
    assert(boxes[0].querySelector('#rc-debitAccount'),'first account must be debit');
    assert(boxes[1].querySelector('#rc-creditAccount'),'second account must be credit');
    assert(boxes[2].querySelector('#rc-warehouse'),'warehouse follows account fields');
    assert(d.getElementById('rc-displayPartyName'),'optional free name appears separately above the accounts');
   }else{
    const boxes=[...d.querySelectorAll('.rc-account-fields [data-account-side]')];
    assert.equal(boxes[0].dataset.accountSide,'debit');assert.equal(boxes[1].dataset.accountSide,'credit');
    assert(boxes[0].querySelector('#'+first));
   }
  }
  const before=JSON.stringify(code(w,"store.get('commerce_v1',null)"));
  w.RatibCommerce.openFavorite('purchase','accounts');await pause(40);
  assert(!d.getElementById('pageSettings').classList.contains('hidden'));
  assert.equal(d.querySelectorAll('#rc-accounts-form').length,1);
  assert(d.getElementById('ratibCommerceDefaults').contains(d.getElementById('rc-accounts-form')));
  assert.equal(JSON.stringify(code(w,"store.get('commerce_v1',null)")),before,'moving settings does not mutate stored links');
  const cashSearch=d.getElementById('rc-search-acc-cash');
  const option=d.querySelector('#rc-account-list-acc-cash option');assert(option,'default account search lists leaf accounts');
  cashSearch.value=option.value;cashSearch.dispatchEvent(new w.Event('input',{bubbles:true}));
  const chosen=d.getElementById('rc-acc-cash').value;assert(chosen,'search resolves the chosen account in Settings');
  const docsBefore=code(w,"JSON.stringify(store.get('commerce_v1',{}).invoices||[])");
  d.getElementById('rc-accounts-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause(100);
  assert.equal(code(w,"store.get('commerce_v1',{}).accounts.cash"),chosen);
  assert.equal(code(w,"JSON.stringify(store.get('commerce_v1',{}).invoices||[])"),docsBefore,'saving defaults preserves existing documents');
  for(const mode of ['income','spend']){
   code(w,"navigateToTab('pageExpenses',true);selectVoucherTypeDirect('"+mode+"')");await pause(50);
   const source=d.getElementById('wrapMultiSourceAcc'),table=d.querySelector('#multiVoucherCard .multi-voucher-table-wrap');
   assert(source.compareDocumentPosition(table)&(mode==='income'?w.Node.DOCUMENT_POSITION_FOLLOWING:w.Node.DOCUMENT_POSITION_PRECEDING),mode+' debit before credit');
   d.getElementById('ratibReverseSide').click();await pause(50);
   assert(source.compareDocumentPosition(table)&(mode==='income'?w.Node.DOCUMENT_POSITION_PRECEDING:w.Node.DOCUMENT_POSITION_FOLLOWING),'reversed roles reorder without replacing inputs');
  }
  code(w,"selectMultiVoucherType();multiVoucherLines=[{...newMultiLine(),side:'credit'},{...newMultiLine(),side:'debit'}];renderMultiVoucherLines()");await pause(40);
  const sides=[...d.querySelectorAll('#multiVoucherLinesBody .multi-line-side')];
  assert.equal(sides[0].value,'debit');assert.equal(sides[0].dataset.index,'1');
  assert.equal(code(w,'multiVoucherLines[0].side'),'credit','display sorting preserves original line identities');
 });
 assert.deepEqual(f.errors,[]);fixtures.forEach(x=>x.dom.window.close());
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
