'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const size=fs.readFileSync('ratib-global-button-size-3.6.146.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const homeCss=fs.readFileSync('ratib-trial-home-polish.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function dom(markup){return new JSDOM('<!doctype html><html><head></head><body>'+markup+'</body></html>',{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});}
async function buttonFontCase(){
 const page=dom('<select id="ratibGlobalButtonSize"><option value="medium">medium</option><option value="xlarge">xlarge</option></select><select id="ratibGlobalFontSize"><option value="medium">medium</option><option value="large">large</option></select>');
 const w=page.window;let writes=0;w.store={get:()=>null,set:()=>writes++};
 w.eval(size);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(writes,0,'loading UI must not mutate protected storage');
 const a=w.document.getElementById('ratibGlobalButtonSize'),b=w.document.getElementById('ratibGlobalFontSize');
 a.value='xlarge';a.dispatchEvent(new w.Event('change',{bubbles:true}));
 b.value='large';b.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.document.documentElement.getAttribute('data-ratib-button-size'),'xlarge');
 assert.equal(w.document.documentElement.dataset.ratibFontSize,'large');
 assert.equal(w.localStorage.getItem('ratib_ui_button_size_v1'),'xlarge');
 assert.equal(w.localStorage.getItem('ratib_ui_font_size_v1'),'large');
 assert.equal(writes,1,'only an explicit button-size change writes legacy UI preference');
 assert.match(homeCss,/data-ratib-button-size="xlarge"/);
 assert.match(homeCss,/--ratib-home-user-height:110px/);
 assert.match(homeCss,/height:var\(--ratib-home-user-height\)!important/);
 assert.match(homeCss,/var\(--ratib-font-scale,1\)/);
 const stored={size:w.localStorage.getItem('ratib_ui_button_size_v1'),font:w.localStorage.getItem('ratib_ui_font_size_v1')};
 page.window.close();
 const next=dom('<select id="ratibGlobalButtonSize"><option value="medium">medium</option><option value="xlarge">xlarge</option></select><select id="ratibGlobalFontSize"><option value="medium">medium</option><option value="large">large</option></select>');
 next.window.localStorage.setItem('ratib_ui_button_size_v1',stored.size);
 next.window.localStorage.setItem('ratib_ui_font_size_v1',stored.font);
 next.window.store={get:()=>null,set:()=>{throw Error('must never mutate on startup')}};
 next.window.eval(size);next.window.document.dispatchEvent(new next.window.Event('DOMContentLoaded'));
 assert.equal(next.window.document.documentElement.getAttribute('data-ratib-button-size'),'xlarge');
 assert.equal(next.window.document.documentElement.dataset.ratibFontSize,'large');
 next.window.close();
}
function accountChooserCase(){
 const page=dom('<div id="pageSettings"><div class="settings-accordion-card" style="overflow:hidden"><div class="settings-accordion-body">'+
 ['IncomeDebit','SpendCredit'].map(s=>'<div id="wrapDefault'+s+'"><input id="inpDefault'+s+'"><div id="dropDefault'+s+'"></div></div><input id="valDefault'+s+'">').join('')+
 '</div></div></div>');
 const w=page.window;
 const start=html.indexOf('class SearchableSelect {'),end=html.indexOf('\nlet selDebitAcc',start);
 assert(start>=0&&end>start,'actual selector class must be present');
 w.eval('function normalizeParentQuery(s){return String(s).toLowerCase()};function ratibAccountSearchMatch(s,q){return String(s).toLowerCase().includes(q)};function highlightText(x){return x};'+html.slice(start,end)+'\nwindow.SearchableSelect=SearchableSelect;');
 for(const suffix of ['IncomeDebit','SpendCredit']){
  const sel=new w.SearchableSelect({wrapId:'wrapDefault'+suffix,inputId:'inpDefault'+suffix,dropId:'dropDefault'+suffix,hiddenId:'valDefault'+suffix,isGrouped:true});
  assert.equal(sel.drop.parentElement,w.document.body,'settings suggestions must leave clipped accordion');
  sel.setItems([{id:'صندوق حقيقي',text:'صندوق حقيقي',accountId:'110101',group:'الصناديق'}]);
  sel.input.focus();sel.input.click();
  assert(sel.drop.classList.contains('open'),'default account chooser should open on touch/click');
  assert.equal(sel.drop.style.position,'fixed','portal should have fixed coordinates');
  sel.choose(sel.items[0]);
  assert.equal(sel.getValue(),'صندوق حقيقي');
  assert.equal(sel.getAccountId(),'110101');
  assert(!sel.drop.classList.contains('open'));
 }
 page.window.close();
}
async function currencyCase(){
 const page=dom('<div id="pageSettings"></div>');
 const w=page.window,records={currency_catalog_v1:[
  {code:'YER',name:'ريال يمني',decimals:2,active:true},
  {code:'USD',name:'دولار أمريكي',decimals:2,active:true},
  {code:'EUR',name:'يورو',decimals:2,active:true,reportRateYer:1200}
 ]},ledger=[{id:'real-operation',amount:500,currency:'USD'}],before=JSON.stringify(ledger);
 let writes=[],toasts=[];
 w.KNOWN_CURRENCIES=new Set(['YER','USD','EUR']);
 w.store={get:(k,def)=>k in records?records[k]:def,set:(k,v)=>{writes.push(k);records[k]=JSON.parse(JSON.stringify(v));}};
 w.flushStorage=async()=>{};w.showToast=x=>toasts.push(x);w.getAllTransactions=()=>ledger;
 const start=html.indexOf('/* ratib-v3611: currency catalog'),end=html.indexOf('</script>',start);
 assert(start>=0&&end>start);
 w.eval(html.slice(start,end));
 const usd=[...w.document.querySelectorAll('.ratib-currency-item')].find(x=>x.querySelector('strong')?.textContent==='USD');
 const eur=[...w.document.querySelectorAll('.ratib-currency-item')].find(x=>x.querySelector('strong')?.textContent==='EUR');
 assert(usd&&eur);
 usd.querySelector('input:not([type])').value='الدولار المعدل';
 usd.querySelector('button').click();await tick();
 assert.equal(records.currency_catalog_v1.find(x=>x.code==='USD').name,'الدولار المعدل','allow editing name without adding a rate');
 assert.equal(records.currency_catalog_v1.find(x=>x.code==='USD').reportRateYer,undefined,'no artificial FX rate');
 const updatedEur=[...w.document.querySelectorAll('.ratib-currency-item')].find(x=>x.querySelector('strong')?.textContent==='EUR');
 updatedEur.querySelector('input[type=text]').value='';
 updatedEur.querySelector('input[type=checkbox]').checked=false;
 updatedEur.querySelector('button').click();await tick();
 assert.equal(records.currency_catalog_v1.find(x=>x.code==='EUR').active,false,'allow disabling without entering reference rate');
 assert.equal(records.currency_catalog_v1.find(x=>x.code==='EUR').reportRateYer,1200,'blank rate retains previously approved rate');
 assert.equal(JSON.stringify(ledger),before,'journal entries never change');
 assert(writes.every(k=>['currency_catalog_v1','import_currencies'].includes(k)),'currency settings may only change currency preferences');
 assert(toasts.some(x=>x.includes('تم حفظ إعدادات')),'proper save confirmation');
 page.window.close();
}
async function defaultAccountSaveCase(){
 const page=dom('<button id="saveDefaultAccountsBtn">حفظ</button><input id="inpDefaultIncomeDebit"><input id="inpDefaultSpendCredit">');
 const w=page.window,records={},writes=[];
 let inc='',spent='',flushes=0,notices=[];
 w.selDefaultIncomeDebit={getValue:()=>inc};w.selDefaultSpendCredit={getValue:()=>spent};
 w.getDefaultAccountsConfig=()=>records.default_accounts||{incomeDebit:'',spendCredit:''};
 w.saveDefaultAccountsConfig=v=>{writes.push(v);records.default_accounts={...v};};
 w.flushStorage=async()=>{flushes++};
 w.showToast=x=>notices.push(x);
 const start=html.indexOf("  document.getElementById('saveDefaultAccountsBtn')?.addEventListener('click', async () => {");
 const end=html.indexOf('\n  });',start)+6;
 assert(start>=0&&end>start+100,'actual defaults handler not found');
 w.eval(html.slice(start,end));
 w.document.getElementById('inpDefaultIncomeDebit').value='اسم مكتوب فقط';
 w.document.getElementById('saveDefaultAccountsBtn').click();await tick();
 assert.equal(writes.length,0,'typing an unmatched account must never be saved');
 assert(notices.some(x=>x.includes('اختر حسابًا')));
 w.document.getElementById('inpDefaultIncomeDebit').value='صندوق حقيقي';inc='صندوق حقيقي';
 w.document.getElementById('saveDefaultAccountsBtn').click();await tick();
 assert.equal(records.default_accounts.incomeDebit,'صندوق حقيقي');
 assert.equal(flushes,1);
 assert.equal(writes.length,1,'only an explicit click commits the defaults');
 assert.equal(w.document.getElementById('saveDefaultAccountsBtn').disabled,false);
 page.window.close();
}
(async()=>{
 await buttonFontCase();accountChooserCase();await currencyCase();await defaultAccountSaveCase();
 assert(!sidebar.includes("cloudRestoreBtn{display:none!important}"),'settings backup actions must not be force-hidden');
 assert(sw.includes("const CACHE_VERSION='v252-trial-settings-functional-3.6.109.20'"),'offline shell must refresh settings assets');
 console.log('PASS trial settings: defaults popup, verified save, optional FX reference rate, button/font persistence and no ledger mutation');
})().catch(e=>{console.error(e);process.exitCode=1;});