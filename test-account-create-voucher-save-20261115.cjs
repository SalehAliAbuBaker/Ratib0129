/* Regression: newly created detailed accounts remain valid through voucher saving. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const quick=fs.readFileSync('ratib-quick-account-3.6.87.js','utf8');
const opening=fs.readFileSync('ratib-opening-account-typeahead.js','utf8');
const start=html.indexOf('class SearchableSelect {');
const end=html.indexOf('\nlet selDebitAcc',start);
assert(start>0&&end>start,'Real SearchableSelect class is present');
assert.match(html,/Dynamic voucher rows still use a native <select>/);
assert.match(html,/let accountModalVoucherOrigin=null/);
assert.match(html,/openAddAccountModal\('العملاء والمدينون',selDebitAcc\)/);
assert.match(html,/origin\.getValue\(\)!==subName/);
assert.match(quick,/selected\.getAccountId\(\)/);
assert.match(quick,/openingAccountInput_/);
assert.match(opening,/forInput:\(id\)=>/);
const selectorSource=html.slice(start,end);

async function scenario(openingVoucher=false){
 const name=openingVoucher?'اختبار افتتاحي جديد':'حساب قبض وصرف جديد';
 const domHtml='<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
  (openingVoucher?'<div id="importedOpeningVoucherModal" class="opening-manual show"><table><tbody id="importedOpeningRows">':'<table><tbody id="multiVoucherLinesBody">')+
  '<tr><td><div class="searchable-select-wrap voucher-account-search" id="testAccountWrap">'+
  '<input id="'+(openingVoucher?'openingAccountInput_0':'voucherAccount_ml1_input')+'" class="searchable-input">'+
  '<span class="searchable-arrow">▼</span><div id="testAccountDrop" class="searchable-dropdown"></div>'+
  (openingVoucher?'<input type="hidden" id="testAccountValue">':
   '<select class="multi-line-account" id="testAccountValue"><option value="">اختر الحساب</option>'+
   '<option value="حساب سابق">حساب سابق</option></select>')+
  '</div></td><td><select class="multi-line-currency" data-field="currency"><option value="YER">YER</option></select></td></tr>'+
  (openingVoucher?'</tbody></table></div>':'</tbody></table>')+
  '<input id="voucherAmountInput" value="15000"></body></html>';
 const dom=new JSDOM(domHtml,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.org'});
 const w=dom.window,d=w.document;
 let catalog=[{main:'الأصول',group:'الذمم',sub:'العملاء',subCode:'1101',details:[['110101','حساب سابق']]}];
 const storage=new Map(),toasts=[],draft={account:'',accountId:'',amount:15000};
 w.normalizeParentQuery=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
 w.ratibAccountSearchMatch=(text,q)=>w.normalizeParentQuery(text).includes(w.normalizeParentQuery(q));
 w.highlightText=(text)=>String(text);
 w.getCanonicalCatalog=()=>catalog;
 w.catalogSubKey=x=>[x.main,x.group,x.sub].join('|||');
 w.suggestSubAccountCode=()=> '110102';
 w.accountCodeConflictMessage=code=>catalog[0].details.some(x=>x[0]===code)?'رقم مستخدم':'';
 w.isAccountNameInUse=()=>false;
 w.getAccountCodes=()=>Object.fromEntries(catalog[0].details.map(x=>[x[1],x[0]]));
 w.addCatalogDetail=(label,code,parent)=>{
  if(parent!==w.catalogSubKey(catalog[0])||catalog[0].details.some(d=>d[0]===code||d[1]===label))return false;
  catalog[0].details.push([code,label]);return true;
 };
 w.store={get:(k,defaultValue)=>storage.has(k)?storage.get(k):defaultValue,set:(k,v)=>storage.set(k,v)};
 w.KNOWN_CURRENCIES=new Set(['YER','SAR','USD']);
 w.flushStorage=async()=>{};
 w.getMultiAccountItems=()=>catalog.flatMap(x=>x.details.map(d=>({id:d[1],text:d[1],accountId:d[0]})));
 w.refreshAccountsTreesPreservingPosition=()=>{};
 w.showToast=(msg)=>toasts.push(msg);
 w.eval(selectorSource+'\nwindow.SearchableSelect=SearchableSelect;');
 const selector=new w.SearchableSelect({wrapId:'testAccountWrap',inputId:openingVoucher?'openingAccountInput_0':'voucherAccount_ml1_input',dropId:'testAccountDrop',hiddenId:'testAccountValue',isGrouped:openingVoucher,onSelect:item=>{
  draft.account=item.id;draft.accountId=item.accountId;
  if(!openingVoucher)d.getElementById('testAccountValue').dispatchEvent(new w.Event('change',{bubbles:true}));
 }});
 const hidden=d.getElementById('testAccountValue');
 if(!openingVoucher)hidden.addEventListener('change',()=>{
  draft.account=hidden.value;draft.accountId=hidden.dataset.accountId||'';
 });
 const editor=d.getElementById('importedOpeningVoucherModal');
 if(editor){editor.append(selector.drop);w.RatibOpeningAccountTypeahead={forInput:id=>id===selector.input.id?selector:null};}
 w.updateSearchableData=()=>selector.setItems(w.getMultiAccountItems());
 selector.setItems(w.getMultiAccountItems());
 w.eval(quick);
 d.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
 const input=selector.input;
 input.value=name;input.dispatchEvent(new w.Event('input',{bubbles:true}));
 const create=d.querySelector('.ratib-quick-create-action');
 assert(create,'Quick-create button offered for missing account in '+(openingVoucher?'opening':'cash')+' voucher');
 create.click();
 const modal=d.getElementById('ratibQuickAccountModal');
 assert(!modal.hidden);
 if(editor)assert.equal(modal.parentNode,editor,'Quick-create is interactive within modal editor');
 const parent=d.getElementById('ratibQuickAccountParent');
 parent.value=w.catalogSubKey(catalog[0]);
 parent.dispatchEvent(new w.Event('change'));
 assert.equal(d.getElementById('ratibQuickAccountCode').value,'110102');
 d.getElementById('ratibQuickAccountName').value=name;
 d.getElementById('ratibQuickAccountForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 for(let i=0;i<40;i++){
  await new Promise(resolve=>setTimeout(resolve,1));
  if(modal.hidden)break;
 }
 assert(modal.hidden,'Quick-create closes only after selecting verified catalog account');
 assert.equal(modal.parentNode,d.body,'Quick-create modal returns to body for the next voucher');
 assert.equal(catalog[0].details.length,2,'Account created only once');
 assert.equal(selector.getValue(),name,'Visible account has a genuine validated backing value');
 assert.equal(selector.getAccountId(),'110102','Backing account ID matches the saved catalog');
 assert.equal(hidden.value,name,'Native hidden value equals the selected new account');
 assert.equal(draft.account,name,'Voucher draft accepted the chosen account');
 assert.equal(draft.accountId,'110102','Voucher draft retained the canonical six-digit code');
 assert.equal(d.getElementById('voucherAmountInput').value,'15000','Amount unchanged by quick-create');
 assert(toasts.some(x=>x.includes('تم إنشاء الحساب واختياره')),'Successful toast follows verified selection');
 assert.deepEqual([...storage.get('account_currencies')[name]],['YER'],'Account currency saved');
 assert.equal(catalog[0].details[0][1],'حساب سابق','Existing account is not changed');
 assert.equal(selector.getValue()===name&&catalog[0].details.some(d=>d[0]===selector.getAccountId()&&d[1]===selector.getValue()),true,
  'Pre-save validation resolves newly created account');
 selector.destroy();
 dom.window.close();
}
async function main(){
 await scenario(false);
 await scenario(true);
 console.log('PASS new account: underlying select, id validation, cash and opening voucher pickers, currency and old data');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
