const fs=require('fs');
const assert=require('assert/strict');
const vm=require('vm');
const {webcrypto}=require('crypto');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const results=[],fixtures=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function workerFixture(waiting){const listeners=new Map(),messages=[];const add=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};const registration={waiting:waiting?{postMessage(message){messages.push(message);}}:null,active:{postMessage(){}},addEventListener(){}};return {messages,emit(type,event){for(const fn of listeners.get(type)||[])fn(event);},service:{controller:{},register:async()=>registration,ready:Promise.resolve(registration),addEventListener:add}};}
async function waitFor(fn,label,ms=5000){const deadline=Date.now()+ms;while(Date.now()<deadline){if(fn())return;await pause(10);}throw Error('Timeout: '+label);}
function code(win,script){if(script.includes('goBackInApp()')||script.includes("runAccountAction('close')"))return win.eval('(async()=>{'+script.replaceAll('goBackInApp()','await goBackInApp()').replaceAll("runAccountAction('close')","await runAccountAction('close')")+'})()');return win.eval(script);}
function localSnapshot(win){return Object.fromEntries(Object.keys(win.localStorage).map(k=>[k,win.localStorage.getItem(k)]));}
class LocalScripts extends ResourceLoader{
 fetch(address){
  const url=new URL(address);if(url.origin!=='https://ratib.test'||!url.pathname.startsWith('/Ratib0129/'))return null;
  const path=require('node:path'),root=path.resolve(__dirname),file=path.resolve(root,url.pathname.slice('/Ratib0129/'.length));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!file.match(/\.(js|css)$/))return null;
  return Promise.resolve(fs.readFileSync(file));
 }
}
function makeFixture({idb=new IDBFactory(),seed={},blockLocal=false,blockIDB=false,serviceWorker=null,historySetup=[],loadResources=false}={}){
  const errors=[],downloads=[],canvasText=[],logs=[],permissions={requests:0},faults={local:false,idb:false};
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));virtualConsole.on('error',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));virtualConsole.on('warn',(...e)=>logs.push(e.map(v=>v?.stack||String(v)).join(' ')));
  const dom=new JSDOM(html,{url:'https://ratib.test/Ratib0129/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,...(loadResources?{resources:new LocalScripts()}:{}),beforeParse(win){
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
 const f=makeFixture();await boot(f);const w=f.win,d=w.document;
 for(const name of ['ratib-annual-close.js','ratib-favorites-v3.js','ratib-theme.js','ratib-navigation-v3.js','ratib-unified-output.js'])w.eval(fs.readFileSync(require('node:path').join(__dirname,name),'utf8'));
 await pause(30);
 for(let pass=0;pass<3;pass++)w.RatibUnifiedOutput.refresh();
 code(w,`{
  const names=getCanonicalCatalog().flatMap(row=>row.details.map(item=>item[1]));
  window.outputAccount=names[0];window.outputCounterpart=names[1];
  const p=getMasterPlan();p.transactions=[
   {id:'output-yer',seqNum:1,isoDate:'2026-10-01',date:'2026-10-01',amount:125,currency:'YER',debitAccount:outputAccount,creditAccount:outputCounterpart,voucherMode:'entry',status:'posted',distribution:{general:{id:'general',name:'عام',amount:125}},execution:{}},
   {id:'output-usd',seqNum:2,isoDate:'2026-10-02',date:'2026-10-02',amount:10,currency:'USD',debitAccount:outputAccount,creditAccount:outputCounterpart,voucherMode:'entry',status:'posted',distribution:{general:{id:'general',name:'عام',amount:10}},execution:{}}
  ];store.set('plan',p);
  accountOpsState={accountName:outputAccount,scopeNames:[outputAccount],from:'2026-10-01',to:'2026-10-31',currency:'ALL',activeCurrency:'YER',filtered:true};
  setAccountReportActionsEnabled(true);
 }`);
 const transactions=code(w,'JSON.stringify(getAllTransactions())');
 const filters=code(w,'JSON.stringify(accountOpsState)');
 const prints=[];w.print=()=>prints.push({mode:d.body.className,content:d.getElementById('printStatementContainer').textContent});
 const finishPrint=()=>w.dispatchEvent(new w.Event('afterprint'));
 const menu=d.getElementById('accountScreenMenu'),overlay=d.getElementById('ratibToolsOverlay'),toggle=d.getElementById('accountScreenMenuToggle');
 const action=name=>{toggle.click();menu.querySelector(`[data-account-action="${name}"]`).click();};
 const choose=choice=>{
  const modal=d.getElementById('accountStatementCurrencyModal');assert(modal.classList.contains('show'));
  modal.querySelector(`[data-choice="${choice}"]`).click();assert(!modal.classList.contains('show'));
 };
 await test('Drawer backdrop shares its stacking context and text/icons match the main sidebar scale',async()=>{
  assert.equal(overlay.parentElement,menu.parentElement);
  assert.equal(w.getComputedStyle(menu).position,'fixed');assert.equal(w.getComputedStyle(overlay).position,'fixed');
  assert(Number(w.getComputedStyle(menu).zIndex)>Number(w.getComputedStyle(overlay).zIndex));
  for(const b of menu.querySelectorAll('[role="menuitem"]')){
   assert.equal(w.getComputedStyle(b.querySelector('.ratib-menu-text')).fontSize,'0.97rem');
   assert.equal(w.getComputedStyle(b.querySelector('.ratib-menu-text')).fontWeight,'500');
   assert(b.querySelector('.ratib-menu-icon svg'));
  }
  toggle.click();assert(overlay.classList.contains('show'));overlay.click();assert(!menu.classList.contains('open'));assert(!overlay.classList.contains('show'));
 });
 await test('Drawer search and document inquiry execute and release the backdrop',async()=>{
  d.getElementById('accountAdvancedSearchPanel').classList.add('hidden');action('advanced');
  assert(!d.getElementById('accountAdvancedSearchPanel').classList.contains('hidden'));assert(!overlay.classList.contains('show'));
  action('documentQuery');assert(d.getElementById('globalSearchModal').classList.contains('show'));d.getElementById('globalSearchModal').classList.remove('show');
 });
 await test('Account preview waits for confirmation; print executes once and persists until afterprint',async()=>{
  action('preview');choose('YER');assert.equal(prints.length,0);assert(d.getElementById('printPreviewModal').classList.contains('show'));
  assert(d.querySelector('#printPreviewBody .ratib-statement-unified-page img')?.alt.includes(w.outputAccount),'Preview shows the selected account as a rendered PDF-equivalent page');
  d.getElementById('printPreviewConfirmBtn').click();assert.equal(prints.length,1);assert(d.body.classList.contains('printing-statement'));finishPrint();assert(!d.body.classList.contains('printing-statement'));
  action('print');choose('ALL');assert.equal(prints.length,2);assert(!d.getElementById('printPreviewModal').classList.contains('show'));assert.equal(d.querySelectorAll('#printStatementContainer .ratib-statement-unified-page img').length,3,'Printed all-currency statement includes two account pages and one summary');assert(d.querySelector('#printStatementContainer .ratib-statement-unified-page:last-child img')?.alt.includes('خلاصة كشف الحساب متعدد العملات'));finishPrint();
  assert.equal(code(w,'JSON.stringify(accountOpsState)'),filters);
 });
 await test('Account PDF export asks for currencies and downloads the selected PDF without sharing',async()=>{
  const before=f.downloads.length;action('pdfDownload');choose('ALL');assert.equal(f.downloads.length,before+1);
  const file=f.downloads.at(-1);assert(file.name.includes('جميع-العملات'));assert(file.blob.size>100);assert((await file.blob.text()).startsWith('%PDF-1.4'));
 });
 await test('Account sharing uses native sharing, downloads unsupported PDF, and honors cancellation',async()=>{
  const shared=[];w.navigator.canShare=()=>true;w.navigator.share=async data=>shared.push(data);
  const before=f.downloads.length;action('share');choose('USD');await pause(20);
  assert.equal(shared.length,1);assert(shared[0].files[0].name.includes('USD'));assert.equal(f.downloads.length,before);
  delete w.navigator.share;action('share');choose('YER');await pause(20);
  assert.equal(f.downloads.length,before+1,'Unsupported sharing downloads the prepared PDF');
  assert(f.downloads.at(-1).name.includes('YER'));
  w.navigator.share=async()=>{throw new w.DOMException('cancelled','AbortError');};
  action('share');choose('YER');await pause(20);
  assert.equal(f.downloads.length,before+1,'Cancelled sharing must not download');
  w.navigator.share=async()=>{throw new w.DOMException('denied','NotAllowedError');};
  action('share');choose('YER');await pause(20);
  assert.equal(f.downloads.length,before+2,'Browser rejection falls back to PDF download');
  w.navigator.share=async()=>{};
 });
 await test('Budget and trial balance each expose distinct working preview, print, download and share controls',async()=>{
  const shared=[];w.navigator.share=async data=>shared.push(data);
  d.getElementById('trialFrom').value='2026-10-01';d.getElementById('trialTo').value='2026-10-31';
  for(const [preview,print,pdf,share,mode] of [
   ['ratibBudgetPreviewBtn','printBudgetReportBtn','ratibBudgetPdfBtn','shareBudgetReportPdfBtn','printing-budget'],
   ['trialPreviewBtn','printTrialBalanceBtn','ratibTrialPdfBtn','shareTrialBalancePdfBtn','trial-printing']
  ]){
   const count=prints.length,downloads=f.downloads.length,shares=shared.length;
   d.getElementById(preview).click();assert.equal(prints.length,count);assert(d.getElementById('printPreviewModal').classList.contains('show'));
   d.getElementById('printPreviewConfirmBtn').click();assert.equal(prints.length,count+1);assert(d.body.classList.contains(mode));finishPrint();
   d.getElementById(print).click();assert.equal(prints.length,count+2);assert(d.body.classList.contains(mode));finishPrint();
   d.getElementById(pdf).click();assert.equal(f.downloads.length,downloads+1);assert(f.downloads.at(-1).blob.size>100);
   d.getElementById(share).click();await pause(20);assert.equal(shared.length,shares+1);
  }
  assert.equal(d.getElementById('trialFrom').value,'2026-10-01');assert.equal(d.getElementById('trialTo').value,'2026-10-31');
 });
 await test('Report statement outputs use its selected account and currency instead of stale standalone state',async()=>{
  code(w,`selReportAccount.setValue(outputAccount,outputAccount);reportAdv={active:true,currency:'YER',from:'2026-10-01',to:'2026-10-31'};`);
  const count=prints.length,before=f.downloads.length;
  d.getElementById('ratibStatementPreviewBtn').click();assert.equal(prints.length,count);assert(d.getElementById('printPreviewModal').classList.contains('show'));d.getElementById('printPreviewCancelBtn').click();
  d.getElementById('printStatementBtn').click();assert.equal(prints.length,count+1);finishPrint();
  d.getElementById('ratibReportStatementPdfBtn').click();assert.equal(f.downloads.length,before+1);assert(f.downloads.at(-1).name.includes('YER'));
 });
 await test('A4 controls share one setting and apply to both PDF pages and native printing',async()=>{
  w.localStorage.setItem('ratib.statementLandscape','0');code(w,'ratibUpdatePaperOrientation()');
  const button=d.getElementById('ratib-budgetReportCard-a4');button.click();assert.equal(code(w,'ratibPaperLandscape()'),true);assert.equal(d.getElementById('ratib-trialBalanceCard-a4').getAttribute('aria-pressed'),'true');
  const pdf=code(w,'buildTrialBalancePdf()');assert((await pdf.text()).includes('/MediaBox [0 0 842 595]'));
  d.getElementById('printTrialBalanceBtn').click();assert(d.getElementById('ratibDocumentPageStyle').textContent.includes('A4 landscape'));finishPrint();
  toggle.click();d.getElementById('ratibAccountOrientationBtn').click();assert.equal(code(w,'ratibPaperLandscape()'),false);assert.equal(button.getAttribute('aria-pressed'),'false');
 });
 await test('Voucher preview, printing and PDF keep validation and execute once without saving',async()=>{
  const names=code(w,'getCanonicalCatalog().flatMap(r=>r.details.map(d=>({name:d[1]})))');
  code(w,"selectVoucherTypeDirect('multi-entry')");
  w.outputNames=names;
  code(w,`multiVoucherLines=[{...newMultiLine(),account:outputNames[0].name,side:'debit',amount:'75',currency:'YER',rate:'1',budgetId:'general',note:'اختبار طباعة'},{...newMultiLine(),account:outputNames[1].name,side:'credit',amount:'75',currency:'YER',rate:'1',budgetId:'general',note:''}];renderMultiVoucherLines();`);
  const count=prints.length,before=f.downloads.length;
  d.getElementById('ratibMultiVoucherPreviewBtn').click();assert.equal(prints.length,count);assert(d.getElementById('printPreviewModal').classList.contains('show'));d.getElementById('printPreviewCancelBtn').click();
  d.getElementById('printMultiVoucherBtn').click();assert.equal(prints.length,count+1);assert(d.body.classList.contains('printing-voucher'));finishPrint();
  d.getElementById('pdfMultiVoucherBtn').click();await waitFor(()=>f.downloads.length===before+1,'compound voucher PDF');
  code(w,"multiVoucherLines[0].amount='0';renderMultiVoucherLines()");
  d.getElementById('printMultiVoucherBtn').click();assert.equal(prints.length,count+1);
  d.getElementById('ratibMultiVoucherPreviewBtn').click();assert(!d.getElementById('printPreviewModal').classList.contains('show'));
  d.getElementById('pdfMultiVoucherBtn').click();assert.equal(f.downloads.length,before+1);
 });
 await test('Receipt and payment forms preview, print, download and share their current validated voucher',async()=>{
  const shared=[];w.navigator.share=async data=>shared.push(data);
  for(const mode of ['income','spend']){
   w.outputMode=mode;
   code(w,`selectVoucherTypeDirect(outputMode);multiSourceAcc.setValue(outputAccount,outputAccount);multiVoucherLines=[{...newSpendLine(),account:outputCounterpart,amount:'50',currency:'YER',rate:'1',budgetId:'general',note:'اختبار سند'}];document.getElementById('ratibHeaderAmount').value='50';renderMultiVoucherLines();syncMultiAutoBalance();`);
   assert.equal(code(w,'validateMultiVoucher()'),'');
   const count=prints.length,downloads=f.downloads.length,shares=shared.length;
   d.getElementById('ratibMultiVoucherPreviewBtn').click();assert(d.getElementById('printPreviewModal').classList.contains('show'));assert.equal(prints.length,count);d.getElementById('printPreviewCancelBtn').click();
   d.getElementById('printMultiVoucherBtn').click();assert.equal(prints.length,count+1);finishPrint();
   d.getElementById('pdfMultiVoucherBtn').click();await waitFor(()=>f.downloads.length===downloads+1,'receipt/payment PDF');
   d.getElementById('ratibMultiVoucherShareBtn').click();await pause(20);assert.equal(shared.length,shares+1);
  }
 });
 await test('Stored voucher preview and print use the selected record and preserve the ledger',async()=>{
  code(w,'activeEditingTx=getAllTransactions()[0];lastPrintedTx=activeEditingTx;');
  const count=prints.length,downloads=f.downloads.length;
  d.getElementById('ratibModalVoucherPreviewBtn').click();assert(d.getElementById('printPreviewModal').classList.contains('show'));assert.equal(prints.length,count);d.getElementById('printPreviewConfirmBtn').click();assert.equal(prints.length,count+1);finishPrint();
  d.getElementById('modalPrintDocBtn').click();assert.equal(prints.length,count+2);finishPrint();
  d.getElementById('modalPdfDocBtn').click();await waitFor(()=>f.downloads.length===downloads+1,'stored voucher PDF');
  d.getElementById('ratibConfirmedVoucherPreviewBtn').click();assert(d.getElementById('printPreviewModal').classList.contains('show'));d.getElementById('printPreviewCancelBtn').click();
  d.getElementById('confirmPrintDocBtn').click();assert.equal(prints.length,count+3);finishPrint();
 });
 await test('Saved payment notice retains its own document for preview, print, download and share',async()=>{
  code(w,"showMultiSavedNotice(buildMultiVoucherData('draft'))");await pause(30);
  const count=prints.length,downloads=f.downloads.length;
  d.getElementById('ratibSavedVoucherPreviewBtn').click();assert(d.getElementById('printPreviewModal').classList.contains('show'));assert.equal(prints.length,count);d.getElementById('printPreviewCancelBtn').click();
  d.getElementById('printSavedSpendBtn').click();await waitFor(()=>prints.length===count+1,'saved voucher print');finishPrint();
  d.getElementById('downloadSavedSpendBtn').click();await waitFor(()=>f.downloads.length===downloads+1,'saved voucher PDF');
  let shared=0;w.navigator.share=async()=>{shared++;};d.getElementById('shareSavedSpendBtn').click();await waitFor(()=>shared===1,'saved voucher share');
 });
 await test('Voucher output glyphs recover after legacy startup replaces an initialized button',async()=>{
  const button=d.getElementById('printMultiVoucherBtn'),pdf=d.getElementById('pdfMultiVoucherBtn');
  button.textContent='🖨';pdf.textContent='▤';
  assert.equal(button.dataset.ratibKind,'print');assert.equal(button.dataset.ratibGlyph,'1');
  await pause(50);
  const svg=button.querySelector(':scope>svg[data-ratib-output-icon="print"]');assert(svg);assert.equal(w.getComputedStyle(svg).display,'block');assert.equal(w.getComputedStyle(svg).visibility,'visible');
  assert.equal(pdf.textContent,'PDF');
  assert.equal(d.querySelectorAll('#multiVoucherCard .ratib-icon-tools,#ratibMultiEditPrint').length,0);
  const markup=button.innerHTML;for(let pass=0;pass<3;pass++)w.RatibUnifiedOutput.refresh();assert.equal(button.innerHTML,markup);
 });
 await test('Simple journal preview, print, PDF, share and A4 use the unsaved form without posting or changing its number',async()=>{
  code(w,`selectVoucherTypeDirect('entry');selDebitAcc.setValue(outputAccount,outputAccount);selCreditAcc.setValue(outputCounterpart,outputCounterpart);document.getElementById('voucherAmountInput').value='175';document.getElementById('voucherCurrencySelect').value='YER';document.getElementById('voucherDateInput').value='2026-10-05';document.getElementById('voucherNoteInput').value='معاينة القيد البسيط';isVoucherSplitActive=false;`);
  const next=code(w,"getNextVoucherNumber('entry')"),count=prints.length,downloads=f.downloads.length,snapshot=code(w,'JSON.stringify(captureSingleDraft())');
  const share=[];w.navigator.share=async data=>share.push(data);
  assert.equal(d.querySelectorAll('#ratibSimpleVoucherTools button').length,5);
  d.getElementById('ratibSimpleVoucherPreviewBtn').click();assert(d.getElementById('printPreviewModal').classList.contains('show'));assert.equal(prints.length,count);assert(d.getElementById('printPreviewBody').textContent.includes('معاينة القيد البسيط'));assert(d.getElementById('printPreviewBody').textContent.includes('175'));
  d.getElementById('printPreviewCancelBtn').click();d.getElementById('ratibSimpleVoucherPrintBtn').click();assert.equal(prints.length,count+1);finishPrint();
  d.getElementById('ratibSimpleVoucherPdfBtn').click();await waitFor(()=>f.downloads.length===downloads+1,'simple voucher PDF');assert(f.downloads.at(-1).blob.size>100);
  d.getElementById('ratibSimpleVoucherShareBtn').click();await pause(20);assert.equal(share.length,1);assert(share[0].files[0].name.includes('قيد'));
  d.getElementById('ratibSimpleVoucherA4Btn').click();assert.equal(code(w,'ratibPaperLandscape()'),true);d.getElementById('ratibSimpleVoucherPdfBtn').click();await waitFor(()=>f.downloads.length===downloads+2,'landscape simple PDF');assert((await f.downloads.at(-1).blob.text()).includes('/MediaBox [0 0 842 595]'));
  assert.equal(code(w,"getNextVoucherNumber('entry')"),next);
  const before=JSON.parse(snapshot),after=JSON.parse(code(w,'JSON.stringify(captureSingleDraft())'));delete before.savedAt;delete after.savedAt;assert.deepEqual(after,before);
  code(w,"document.getElementById('voucherAmountInput').value='0'");
  d.getElementById('ratibSimpleVoucherPrintBtn').click();d.getElementById('ratibSimpleVoucherPdfBtn').click();d.getElementById('ratibSimpleVoucherShareBtn').click();await pause(20);
  assert.equal(prints.length,count+1);assert.equal(f.downloads.length,downloads+2);assert.equal(share.length,1);
 });
 await test('Deferred script startup preserves visible print icons and one output toolbar through voucher mode switches',async()=>{
  const live=makeFixture({loadResources:true});await boot(live);const win=live.win,doc=win.document;
  await waitFor(()=>win.RatibUnifiedOutput,'deferred output script');await pause(50);
  const trialTools=doc.querySelector('#trialBalanceCard .report-actions');
  assert.equal(win.getComputedStyle(trialTools).display,'flex');assert.equal(win.getComputedStyle(trialTools).flexWrap,'wrap');
  assert.equal(win.getComputedStyle(doc.getElementById('trialExcelBtn')).width,'auto');
  assert.deepEqual([...trialTools.children].map(b=>b.id),['ratib-trialBalanceCard-a4','trialPreviewBtn','printTrialBalanceBtn','ratibTrialPdfBtn','shareTrialBalancePdfBtn','trialExcelBtn']);
  for(const mode of ['spend','income','multi-entry','entry','spend']){
   win.outputMode=mode;code(win,'selectVoucherTypeDirect(outputMode)');await pause(30);
   const button=doc.getElementById(mode==='entry'?'ratibSimpleVoucherPrintBtn':'printMultiVoucherBtn');
   const svg=button.querySelector(':scope>svg[data-ratib-output-icon="print"]');assert(svg,mode);assert.equal(win.getComputedStyle(svg).display,'block');
   assert.equal(doc.querySelectorAll('#multiVoucherCard .ratib-icon-tools,#ratibMultiEditPrint').length,0);
   const card=doc.getElementById(mode==='entry'?'cashFlowCard':'multiVoucherCard');assert.equal(card.querySelectorAll('button[data-ratib-kind="share"]').length,1);
  }
  assert.deepEqual(live.errors,[]);
 });
 await test('Simple journal save retains validation, posting and numbering after sharing its document builder with output',async()=>{
  const saved=makeFixture();await boot(saved);const win=saved.win,doc=win.document;let licenses=0,created=0;
  win.RatibLicense={beforeCreate:async()=>{licenses++;return true;},recordCreated(){created++;}};
  code(win,`selectVoucherTypeDirect('entry');const names=getCanonicalCatalog().flatMap(r=>r.details.map(x=>x[1]));selDebitAcc.setValue(names[0],names[0]);selCreditAcc.setValue(names[1],names[1]);document.getElementById('voucherAmountInput').value='175';document.getElementById('voucherCurrencySelect').value='YER';document.getElementById('voucherDateInput').value='2026-10-05';document.getElementById('voucherNoteInput').value='قيد اختباري';isVoucherSplitActive=true;voucherCatStates={general:{enabled:true,amount:100}};`);
  const next=code(win,"getNextVoucherNumber('entry')");
  doc.getElementById('commitVoucherBtn').click();await pause(20);assert.equal(licenses,0);assert.equal(code(win,'getAllTransactions().length'),0);
  code(win,'isVoucherSplitActive=false;voucherCatStates.general.amount=175');doc.getElementById('commitVoucherBtn').click();
  await waitFor(()=>!doc.getElementById('commitVoucherBtn').disabled&&code(win,'getAllTransactions().length')===1,'simple journal save');await flush(saved);
  const tx=code(win,'getAllTransactions()[0]');assert.equal(tx.amount,175);assert.equal(tx.currency,'YER');assert.equal(tx.isoDate,'2026-10-05');assert.equal(tx.status,'posted');assert.equal(tx.seqNum,next);assert.equal(tx.distribution.general.amount,175);assert.equal(tx.execution.general.note,'قيد اختباري');assert.equal(licenses,1);assert.equal(created,1);assert.equal(code(win,"getNextVoucherNumber('entry')"),next+1);assert.deepEqual(saved.errors,[]);
 });
 assert.equal(code(w,'JSON.stringify(getAllTransactions())'),transactions);
 assert.deepEqual(f.errors,[]);fixtures.forEach(x=>x.dom.window.close());
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});


