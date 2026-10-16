const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const recorded=[];
class AppResources extends ResourceLoader{
 fetch(address){
  const url=new URL(address);
  if(url.origin!=='https://ratib.test'||!url.pathname.startsWith('/Ratib0129/'))return null;
  const file=path.resolve(root,url.pathname.slice('/Ratib0129/'.length));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!/\.(js|css)$/.test(file))return null;
  return Promise.resolve(fs.readFileSync(file));
 }
}
const errors=[],canvasText=[],virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',e=>errors.push(e.message));
virtualConsole.on('error',(...args)=>errors.push(args.map(String).join(' ')));
const dom=new JSDOM(html,{
 url:'https://ratib.test/Ratib0129/',runScripts:'dangerously',pretendToBeVisual:true,
 resources:new AppResources(),virtualConsole,
 beforeParse(w){
  Object.defineProperty(w,'indexedDB',{value:new IDBFactory()});
  Object.defineProperty(w,'crypto',{value:webcrypto});
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;
  w.Blob=Blob;w.File=File;
  w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'';w.close=()=>{};
  w.Notification=function(){};w.Notification.permission='default';w.Notification.requestPermission=async()=> 'default';
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.scrollTo=()=>{};
  w.URL.createObjectURL=()=> 'blob:ratib-test';w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){
   return {font:'',direction:'rtl',textAlign:'right',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,
    fillRect(){},strokeRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
    measureText(v){return {width:String(v).length*10};},
    fillText(v){canvasText.push(String(v));}
   };
  };
  w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,/9j/2Q==';
 }
});
const w=dom.window,d=w.document;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const code=src=>w.eval(src);
async function until(fn,label){
 for(let i=0;i<350;i++){try{if(fn())return;}catch(_){}await wait(20);}
 throw Error('Application startup failed: '+label+'\n'+errors.join('\n'));
}
const t=(id,isoDate,amount,side,currency='YER')=>({
 id,seqNum:Number(id.split('-').at(-1))||1,isoDate,date:isoDate,amount,currency,status:'posted',
 voucherMode:'entry',isExpense:false,isMultiVoucher:false,
 debitAccount:side==='debit'?'حساب النقدية':'الحساب المقابل',
 creditAccount:side==='credit'?'حساب النقدية':'الحساب المقابل',
 distribution:{},execution:{general:{note:'اختبار '+id}}
});
function checkReport(label,expected){
 const data=code("getAccountCurrencyReportData('YER')");
 for(const [key,value] of Object.entries(expected))assert.equal(data[key],value,label+' '+key);
 return data;
}
async function main(){
 await until(()=>code("typeof getAccountCurrencyReportData==='function' && typeof selDebitAcc!=='undefined' && !!selDebitAcc"),'functions');
 // The account ledger always comes from fresh, artificial entries: never from a user's backup.
 w.ratibSynthetic=[
  t('test-1','2026-10-01',88000,'debit'),
  t('test-2','2026-10-02',123600,'credit'),
  t('test-3','2026-10-11',119000,'debit'),
  t('test-4','2026-10-12',86600,'credit')
 ];
 code("const p=getMasterPlan();p.transactions=ratibSynthetic;store.set('plan',p);");
 code("accountOpsState={accountName:'حساب النقدية',scopeNames:['حساب النقدية'],from:'',to:'',filtered:false,currency:'YER',activeCurrency:'YER',search:''};");
 let data=checkReport('full',{opening:0,totalDebit:207000,totalCredit:210200,closing:3200});
 code("renderAccountOperations(accountOpsState.accountName,accountOpsState.scopeNames,{panelId:'reportAccountOpsPanel',tabsId:'reportCurrencyTabs'});");
 let page=d.querySelector('#reportAccountOpsPanel .account-currency-page[data-currency="YER"]');
 assert(page,'Full statement exists');
 assert.equal(page.querySelectorAll('.account-statement-row.opening').length,0,'Full statement has no opening row');
 assert.equal(page.querySelectorAll('.statement-grand-total').length,1,'Full statement has exactly one total');
 assert.match(page.querySelector('.statement-grand-total').textContent,/إجمالي العمليات/);
 assert.match(page.querySelector('.statement-grand-total').textContent,/3,200/);
 assert(!page.querySelector('.statement-grand-total').textContent.includes('رصيد سابق'));
 recorded.push('Unfiltered statement: 207,000 debit / 210,200 credit / 3,200 credit; no opening row');

 code("accountOpsState.from='2026-10-11';accountOpsState.to='2026-10-16';accountOpsState.filtered=true;");
 data=checkReport('period',{opening:35600,totalDebit:119000,totalCredit:86600,closing:3200});
 code("renderAccountOperations(accountOpsState.accountName,accountOpsState.scopeNames,{panelId:'reportAccountOpsPanel',tabsId:'reportCurrencyTabs'});");
 page=d.querySelector('#reportAccountOpsPanel .account-currency-page[data-currency="YER"]');
 assert.equal(page.querySelectorAll('.account-statement-row.opening').length,1);
 assert.equal(page.querySelectorAll('.statement-grand-total').length,1);
 const statementRows=[...page.querySelector('.account-statement-grid').children];
 assert(statementRows[1].classList.contains('opening'),'Opening balance precedes first transaction');
 const total=page.querySelector('.statement-grand-total').textContent;
 for(const value of ['119,000','86,600','3,200'])assert(total.includes(value),value);
 assert(!total.includes('35,600'),'Opening is not included in movement totals');
 recorded.push('Filtered statement: opening credit 35,600; movements 119,000 / 86,600; closing credit 3,200');
 
 code("preparePrintStatementTemplate('حساب النقدية',getAccountCurrencyReportData('YER').rows,35600,accountPeriodTitle(),'ريال يمني');");
 let body=d.getElementById('psTableBody');
 assert.equal(body.querySelectorAll('.ps-total-row').length,1,'Printed totals are one row');
 assert.match(body.firstElementChild.textContent,/الرصيد السابق/);
 assert.match(body.lastElementChild.textContent,/3,200\s*دائن/);
 assert(!body.lastElementChild.textContent.includes('رصيد سابق'),'No repeated previous balance at end');
 assert(!d.getElementById('psStatementTitle').textContent.includes('undefined'));
 recorded.push('Print/preview template contains one opening and one fully shaded final totals row');
 
 code("accountOpsState.from='';accountOpsState.to='';accountOpsState.filtered=false;");
 code("preparePrintStatementTemplate('حساب النقدية',getAccountCurrencyReportData('YER').rows,0,accountPeriodTitle(),'ريال يمني');");
 body=d.getElementById('psTableBody');
 assert.equal(body.querySelectorAll('.ps-total-row').length,1);
 assert.equal(body.textContent.includes('الرصيد السابق'),false,'No opening in full print');
 assert.match(body.lastElementChild.textContent,/207,000/);
 assert.match(body.lastElementChild.textContent,/210,200/);
 recorded.push('Full print/preview has no previous balance');

 code("accountOpsState.from='2026-10-11';accountOpsState.to='2026-10-16';accountOpsState.filtered=true;");
 canvasText.length=0;
 const pdf=code("buildAccountOperationsPdf('YER')");
 assert(pdf.size>100);
 const binary=await pdf.text();assert(binary.startsWith('%PDF-1.4'));
 const draw=canvasText.join('|');
 for(const value of ['35,600','119,000','86,600','3,200','إجمالي عمليات الفترة'])assert(draw.includes(value),'PDF missing '+value);
 assert(!canvasText.includes('undefined'),'PDF should not draw undefined');
 const labels=canvasText.filter(x=>x.includes('الرصيد السابق'));
 assert.equal(labels.length,1,'PDF should draw one opening label');
 recorded.push('PDF produced with all sample totals, one opening, no undefined');

 code("accountOpsState.from='2026-10-01';accountOpsState.to='2026-10-16';");
 data=checkReport('first date period',{opening:0,totalDebit:207000,totalCredit:210200,closing:3200});
 code("renderAccountOperations(accountOpsState.accountName,accountOpsState.scopeNames,{panelId:'reportAccountOpsPanel',tabsId:'reportCurrencyTabs'});");
 page=d.querySelector('#reportAccountOpsPanel .account-currency-page[data-currency="YER"]');
 assert.equal(page.querySelectorAll('.opening').length,0,'Opening zero must be omitted');
 recorded.push('Date-filtered statement with no earlier entries omits zero opening');

 assert(!errors.some(e=>/SyntaxError|ReferenceError/.test(e)),errors.join('\n'));
 for(const message of recorded)console.log('PASS',message);
 console.log('PASS Ratib statement 3.6.60: '+recorded.length+' checks');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{dom.window.close();});
