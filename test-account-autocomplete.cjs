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

async function run(){const f=makeFixture();await boot(f);const w=f.win,d=w.document;
const input=(el,text,type='insertText')=>{el.value=text;el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:type}));};
await test('Unique exact input adopts existing account code without click',async()=>{w.__items=[{id:'محمد علي',text:'محمد علي',accountId:'101',group:'الصناديق'},{id:'زيد محمد',text:'زيد محمد',accountId:'102',group:'البنوك'}];code(w,'selDebitAcc.setItems(__items)');input(d.getElementById('inpDebitAcc'),'محمد');assert.equal(code(w,'selDebitAcc.getValue()'),'');assert.equal(code(w,'selDebitAcc.visibleItems.length'),2);input(d.getElementById('inpDebitAcc'),'محمد علي');assert.equal(code(w,'selDebitAcc.getValue()'),'محمد علي');assert.equal(code(w,'selDebitAcc.getAccountId()'),'101');});
await test('Contains search, duplicate exact names require deliberate choice',async()=>{w.__items=[{id:'محمد',text:'محمد',accountId:'201',group:'الصناديق'},{id:'محمد',text:'محمد',accountId:'202',group:'البنوك'}];code(w,'selDebitAcc.setItems(__items)');input(d.getElementById('inpDebitAcc'),'محمد');assert.equal(code(w,'selDebitAcc.getValue()'),'');code(w,'selDebitAcc.choose(__items[1])');assert.equal(code(w,'selDebitAcc.getAccountId()'),'202');});
await test('Backspace and unknown input clear identity and never create accounts',async()=>{const before=code(w,'JSON.stringify(getCanonicalCatalog())');input(d.getElementById('inpDebitAcc'),'محم','deleteContentBackward');assert.equal(code(w,'selDebitAcc.getAccountId()'),'');assert.equal(d.getElementById('inpDebitAcc').value,'محم');input(d.getElementById('inpDebitAcc'),'اسم غير موجود');assert.equal(code(w,'selDebitAcc.getValue()'),'');assert.equal(code(w,'JSON.stringify(getCanonicalCatalog())'),before);});
code(w,'updateSearchableData()');
for(const mode of ['spend','income','multi-entry'])await test('Searchable repeated accounts and saved IDs in '+mode,async()=>{
code(w,'multiVoucherLines=[];multiVoucherDraftId="";'+(mode==='multi-entry'?'selectMultiVoucherType()':'selectVoucherTypeDirect('+JSON.stringify(mode)+')')+';');
const name=code(w,'getMultiAccountItems()[0].text'),id=code(w,'getMultiAccountItems()[0].accountId');
code(w,'addMultiVoucherLine()');let fields=[...d.querySelectorAll('#multiVoucherLinesBody .voucher-account-search input')];assert(fields.length>=2);input(fields[0],name);fields=[...d.querySelectorAll('#multiVoucherLinesBody .voucher-account-search input')];input(fields[1],name);assert.equal(code(w,'multiVoucherLines.filter(l=>!l.autoBalance)[0].accountId'),id);assert.equal(code(w,'multiVoucherLines.filter(l=>!l.autoBalance)[1].accountId'),id);
if(mode==='multi-entry')code(w,'multiVoucherLines[0].side="debit";multiVoucherLines[1].side="credit";multiVoucherLines[0].amount="10";multiVoucherLines[1].amount="10";renderMultiVoucherLines()');else{const source=d.getElementById('inpMultiSourceAcc');input(source,name);code(w,'multiVoucherLines[0].amount="10";multiVoucherLines[1].amount="20";document.getElementById("ratibHeaderAmount").value="30";syncMultiAutoBalance()');}
assert.equal(code(w,'validateMultiVoucher()'),'');const data=code(w,'buildMultiVoucherData("posted")');assert(data.lines.every(l=>l.accountId===id));if(mode!=='multi-entry')assert.equal(data.sourceAccountId,id);
code(w,'commitMultiVoucher()');await flush(f);assert((w.__testId=id,code(w,'getAllTransactions().some(t=>t.debitAccountId===__testId||t.creditAccountId===__testId)')));
});
await test('Posted voucher reopens with account identity and deletion remains editable',async()=>{code(w,'openMultiVoucherEditor(getAllTransactions().filter(t=>t.isMultiVoucher).at(-1))');const field=d.querySelector('#multiVoucherLinesBody .voucher-account-search input');assert(field.dataset.accountId);input(field,field.value.slice(0,-1),'deleteContentBackward');assert.equal(field.dataset.accountId,'');assert(code(w,'validateMultiVoucher()'));});
await test('Same account on both sides of simple entry accepted with ID metadata',async()=>{const name=code(w,'getMultiAccountItems()[0].text');input(d.getElementById('inpDebitAcc'),name);input(d.getElementById('inpCreditAcc'),name);w.__tx=tx(10,'YER','entry',{debitAccount:name,creditAccount:name});assert.equal(code(w,'validateTransaction(__tx).length'),0);assert(code(w,'selDebitAcc.getAccountId()'));});
await test('Repeated debit and credit keep balances and report totals correct',async()=>{w.__self=tx(50,'YER','entry',{debitAccount:'صندوق النقدية الرئيسي',creditAccount:'صندوق النقدية الرئيسي'});setStore(f,'plan',{month:'2026-10',transactions:[w.__self]});code(w,'accountOpsState={accountName:"صندوق النقدية الرئيسي",scopeNames:["صندوق النقدية الرئيسي"],from:"",to:"",filtered:false,currency:"ALL",activeCurrency:"YER"}');const report=code(w,'getAccountCurrencyReportData("YER")');assert.equal(report.totalDebit,50);assert.equal(report.totalCredit,50);assert.equal(report.closing,0);assert.equal(code(w,'getAccountRunningBalances([__self],["صندوق النقدية الرئيسي"],0).get(__self)'),0);});
console.log(JSON.stringify(results,null,2));fixtures.forEach(x=>x.dom.window.close());}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
