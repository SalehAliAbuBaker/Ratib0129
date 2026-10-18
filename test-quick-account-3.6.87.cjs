'use strict';
/* 3.6.87: voucher quick-account browser simulation, no posting side effects. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-quick-account-3.6.87.js','utf8');
const css=fs.readFileSync('ratib-quick-account-3.6.87.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.6.87');
assert(html.includes('ratib-quick-account-3.6.87.js?v=3.6.87'));
assert(html.includes('ratib-quick-account-3.6.87.css?v=3.6.87'));
assert(sw.includes('ratib-quick-account-3.6.87.js'));
assert(sw.includes('ratib-quick-account-3.6.87.css'));
assert.match(css,/\.ratib-quick-account-modal\[hidden\]/);
assert.match(css,/min-height:44px/);
async function testFlow(){
  const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><div id="cashFlowCard"><input id="voucherAmountInput" value="6500"><select id="voucherCurrencySelect"><option value="YER">YER</option></select><div id="wrapDebitAcc"><input id="inpDebitAcc" value="شركة المشقاص"><div id="dropDebitAcc"><div class="sd-list" id="list"></div></div></div></div><div id="wrapReportAccount"><input id="inpReportAccount"><div id="dropReportAccount"><div id="reportList"></div></div></div></body></html>',{runScripts:'dangerously',url:'https://ratibtrial.pages.dev'});
  const w=dom.window;
  let accounts=[{main:'الأصول',group:'العملاء',sub:'العملاء التجاريون',subCode:'1101',details:[['110101','حساب قديم']]}];
  const storage=new Map(),transactions=[{amount:123,account:'حساب قديم'}],toasts=[];
  w.normalizeParentQuery=x=>String(x??'').trim().toLowerCase().replace(/\s+/g,' ');
  w.getCanonicalCatalog=()=>accounts;
  w.catalogSubKey=x=>[x.main,x.group,x.sub].join('|||');
  w.suggestSubAccountCode=()=>accounts[0].details.some(d=>d[0]==='110102')?'110103':'110102';
  w.accountCodeConflictMessage=code=>accounts[0].details.some(d=>d[0]===code)?'الرقم مستخدم':'';
  w.isAccountNameInUse=()=>false;
  w.getAccountCodes=()=>Object.fromEntries(accounts[0].details.map(d=>[d[1],d[0]]));
  w.addCatalogDetail=(name,code,parent)=>{
    if(parent!==w.catalogSubKey(accounts[0])||accounts[0].details.some(d=>d[0]===code||d[1]===name))return false;
    accounts[0].details.push([code,name]);return true;
  };
  w.store={get:(k,d)=>storage.has(k)?storage.get(k):d,set:(k,v)=>storage.set(k,v)};
  w.KNOWN_CURRENCIES=new Set(['YER','SAR','USD']);
  w.flushStorage=async()=>{};
  w.getMultiAccountItems=()=>accounts[0].details.map(d=>({id:d[1],text:d[1],accountId:d[0]}));
  w.refreshAccountsTreesPreservingPosition=()=>{};
  w.showToast=s=>toasts.push(s);
  let chooser;
  w.updateSearchableData=()=>{if(chooser)chooser.setItems(w.getMultiAccountItems());};
  w.SearchableSelect=class {
    constructor(inputId,wrapId,dropId){
      this.input=w.document.getElementById(inputId);this.wrap=w.document.getElementById(wrapId);
      this.drop=w.document.getElementById(dropId);this.list=this.drop.querySelector('div');
      this.inlineOpen=false;this.items=w.getMultiAccountItems();this.chosen='';
    }
    renderDropdown(){this.list.replaceChildren();return this.items;}
    getValue(){return this.chosen;}
    setItems(items){this.items=items;this.renderDropdown('');}
    choose(item){this.chosen=item.id;this.input.value=item.text;}
    close(){}
  };
  chooser=new w.SearchableSelect('inpDebitAcc','wrapDebitAcc','dropDebitAcc');
  w.selDebitAcc=chooser;
  w.eval(js);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  chooser.renderDropdown('شركة المشقاص');
  const add=w.document.querySelector('.ratib-quick-create-action');
  assert(add,'Create action offered for an unmatched voucher account');
  add.click();
  const modal=w.document.getElementById('ratibQuickAccountModal');
  assert(!modal.hidden);
  assert.equal(w.document.getElementById('ratibQuickAccountName').value,'شركة المشقاص');
  assert.equal(w.document.getElementById('ratibQuickAccountCurrency').value,'YER');
  const parent=w.document.getElementById('ratibQuickAccountParent');
  parent.value=w.catalogSubKey(accounts[0]);parent.dispatchEvent(new w.Event('change'));
  assert.equal(w.document.getElementById('ratibQuickAccountCode').value,'110102');
  w.document.getElementById('ratibQuickAccountForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  for(let i=0;i<10;i++){await new Promise(ok=>setTimeout(ok,1));if(modal.hidden)break;}
  assert(modal.hidden,'Modal closes after verified persistence');
  assert.equal(accounts[0].details.length,2,'Detail added once');
  assert.equal(chooser.chosen,'شركة المشقاص','Newly created account chosen in originating voucher');
  assert.equal(w.document.getElementById('voucherAmountInput').value,'6500','Amount retained unchanged');
  assert.deepEqual(transactions,[{amount:123,account:'حساب قديم'}],'No posting mutation');
  assert.deepEqual(Array.from(storage.get('account_currencies')['شركة المشقاص']),['YER']);
  assert(toasts.some(s=>s.includes('تم إنشاء الحساب')));
  chooser.renderDropdown('شركة المشقاص');
  assert.equal(w.document.querySelectorAll('.ratib-quick-create-action').length,0,'No duplicate creation action for an existing account');
  const report=new w.SearchableSelect('inpReportAccount','wrapReportAccount','dropReportAccount');
  report.renderDropdown('حساب جديد');
  assert.equal(w.document.querySelectorAll('#dropReportAccount .ratib-quick-create-action').length,0,'Report lookup is not an account entry');
  dom.window.close();
}
testFlow().then(()=>console.log('PASS quick account created once, linked to source voucher, existing data preserved and report untouched')).catch(e=>{console.error(e);process.exitCode=1;});
