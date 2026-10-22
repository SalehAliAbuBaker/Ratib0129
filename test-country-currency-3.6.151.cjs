'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('ratib-country-currency-3.6.151.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');

new Function(source);
new Function(commerce);
assert.match(html,/ratib-country-currency-3\.6\.152\.js\?v=3\.6\.152/);
assert.match(worker,/"\.\/ratib-country-currency-3\.6\.152\.js"/);
assert.match(worker,/"\.\/ratib-country-currency-3\.6\.152\.css"/);
assert.match(html,/const RATIB_RELEASE=\{"version":"3\.6\.152"/);
assert.match(worker,/const APP_RELEASE=\{"version":"3\.6\.152"/);
assert.match(commerce,/id:'OMR',name:'ريال عُماني \(OMR\)'/);
assert.match(commerce,/moneyDecimals\(draft.currency\)/);
assert.match(html,/function newSpendLine\(\)\{const currency=getRatibBaseCurrency\(\)/);
assert.match(html,/amount!==spendRound\(amount,line.currency\)/);

const roundCode=html.match(/function roundAccountingAmount\(value,currency='YER'\)\{[^\r\n]+\}/)?.[0];
assert(roundCode,'Currency-specific accounting rounding must be present');
const round=new Function('window',roundCode+';return roundAccountingAmount;')({
 RatibCountryCurrency:{digits:currency=>currency==='OMR'?3:2}
});
assert.equal(round(12.345,'OMR'),12.345,'OMR must retain 3 places');
assert.equal(round(12.345,'YER'),12.35,'Existing YER precision stays 2');
assert.equal(round(12.345,'SAR'),12.35,'Existing SAR precision stays 2');

async function scenario({lang='ar-OM',prefs=null,transactions=[]}={}){
 const dom=new JSDOM('<!doctype html><html><body>'+
 '<div id="pageSettings"><div id="ratibCurrencyManager"><div class="settings-accordion-body"></div></div></div>'+
 '<select id="currency"><option value="YER">YER</option></select>'+
 '<select id="voucherCurrencySelect"><option value="YER">YER</option></select>'+
 '<select id="multiVoucherBaseCurrency"><option value="YER">YER</option></select>'+
 '<select id="trialBase"><option value="YER">YER</option></select>'+
 '<select id="trialCurrency"><option value="YER">YER</option></select>'+
 '<select id="trialMode"><option value="paired">paired</option><option value="dual">dual</option></select>'+
 '<select id="ratibPositionCurrency"><option value="YER">YER</option></select>'+
 '<select id="ratibMovementCurrency"><option value="ALL">ALL</option><option value="YER">YER</option></select>'+
 '<select id="budgetReportCurrency"><option value="YER">YER</option></select>'+
 '</body></html>',{url:'https://ratib.test',runScripts:'outside-only'});
 const w=dom.window;
 Object.defineProperty(w.navigator,'language',{configurable:true,value:lang});
 Object.defineProperty(w.navigator,'languages',{configurable:true,value:[lang]});
 const records={currency_catalog_v1:[{code:'YER',name:'ريال يمني',decimals:2,active:true},{code:'SAR',name:'ريال سعودي',decimals:2,active:true,reportRateYer:412,reportRateYerUpdatedAt:'2026-10-18'}]};
 if(prefs)records.country_currency_settings_v1=prefs;
 let flushed=0,notices=[];
 w.store={get:(key,defaultVal=null)=>key in records?records[key]:defaultVal,set:(key,value)=>{records[key]=JSON.parse(JSON.stringify(value));}};
 w.catalog=()=>w.store.get('currency_catalog_v1',[{code:'YER',name:'ريال يمني',active:true},{code:'SAR',name:'ريال سعودي',active:true}]);
 w.KNOWN_CURRENCIES=new Set(['YER','SAR','USD']);
 w.flushStorage=async()=>{flushed++;};
 w.getAllTransactions=()=>transactions;
 w.sync=()=>{};
 w.updateProDashboard=()=>{};
 w.showToast=s=>notices.push(s);
 w.runTrialBalanceReport=()=>{};
 w.__ratibProceedInitialized=true;
 w.eval(source);
 await new Promise(resolve=>setImmediate(resolve));
 return {dom,w,records,get flushed(){return flushed;},notices};
}
(async()=>{
 const fresh=await scenario();
 const w=fresh.w;
 assert.equal(w.RatibCountryCurrency.localeSuggestion().code,'OM','ar-OM should suggest Oman');
 assert.equal(w.document.getElementById('ratibCountryCurrencyDialog').hidden,false);
 assert.equal(w.document.getElementById('ratibCountryChoice').value,'OM');
 assert.equal(w.document.getElementById('ratibPrimaryCurrencyChoice').value,'OMR');
 w.document.getElementById('ratibCountrySave').click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.RatibCountryCurrency.base(),'OMR');
 assert.equal(fresh.records.country_currency_settings_v1.country,'OM');
 assert.equal(fresh.records.currency_catalog_v1.find(x=>x.code==='OMR').decimals,3);
 assert.equal(fresh.records.currency_catalog_v1.find(x=>x.code==='SAR').reportRateYer,412,'Existing SAR rate must survive country selection');
 assert.equal(w.document.getElementById('currency').value,'OMR');
 assert(fresh.flushed>0,'settings should persist locally');
 assert.equal(w.document.getElementById('ratibCountryCurrencyDialog').hidden,true);
 fresh.dom.window.close();

 const history=[{currency:'YER',amount:125.75,baseAmount:125.75}];
 const before=JSON.stringify(history);
 const returning=await scenario({lang:'ar-OM',transactions:history});
 assert.equal(returning.w.document.getElementById('ratibCountryCurrencyDialog')?.hidden??true,true,'Do not force onboarding on existing ledger');
 assert.equal(returning.w.RatibCountryCurrency.base(),'YER','Legacy users remain unchanged');
 assert.equal(JSON.stringify(history),before,'Transactions must not mutate');
 returning.dom.window.close();

 const selected=await scenario({lang:'ar-SA',prefs:{country:'OM',currency:'OMR'},transactions:history});
 assert.equal(selected.w.RatibCountryCurrency.base(),'OMR','Saved user choice takes priority over device region');
 assert.equal(selected.w.document.getElementById('currency').value,'OMR');
 assert.equal(selected.w.RatibCountryCurrency.digits('OMR'),3);
 assert.equal(selected.w.document.getElementById('ratibCountryCurrencyDialog')?.hidden??true,true);
 selected.dom.window.close();
 console.log('PASS Ratib 3.6.151: Oman OMR, 3 decimals, persisted primary currency, old ledgers unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
