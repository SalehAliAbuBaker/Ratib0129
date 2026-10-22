/* Ratib 3.6.151 — country and primary currency for NEW records only.
 * Never rewrites existing transactions, exchange rates, balances or licensing.
 * Local-first: no location access, network request or IP-based geolocation.
 */
(function(global){
'use strict';
const KEY='country_currency_settings_v1';
const DEFAULT='YER';
const COUNTRIES=[
 {code:'YE',name:'اليمن',currency:'YER'},
 {code:'SA',name:'السعودية',currency:'SAR'},
 {code:'AE',name:'الإمارات',currency:'AED'},
 {code:'OM',name:'سلطنة عُمان',currency:'OMR'},
 {code:'QA',name:'قطر',currency:'QAR'},
 {code:'KW',name:'الكويت',currency:'KWD'},
 {code:'BH',name:'البحرين',currency:'BHD'},
 {code:'JO',name:'الأردن',currency:'JOD'},
 {code:'EG',name:'مصر',currency:'EGP'},
 {code:'IQ',name:'العراق',currency:'IQD'},
 {code:'MA',name:'المغرب',currency:'MAD'},
 {code:'GB',name:'المملكة المتحدة',currency:'GBP'},
 {code:'US',name:'الولايات المتحدة',currency:'USD'},
 {code:'OTHER',name:'دولة أخرى',currency:''}
];
const NAMES={YER:'ريال يمني',SAR:'ريال سعودي',AED:'درهم إماراتي',OMR:'ريال عُماني',QAR:'ريال قطري',KWD:'دينار كويتي',BHD:'دينار بحريني',JOD:'دينار أردني',EGP:'جنيه مصري',IQD:'دينار عراقي',MAD:'درهم مغربي',USD:'دولار أمريكي',EUR:'يورو',GBP:'جنيه إسترليني'};
const DECIMALS={OMR:3,KWD:3,BHD:3,JOD:3,IQD:3};
const digits=currency=>DECIMALS[currency]??2;
const $=id=>document.getElementById(id);
const validCode=s=>/^[A-Z]{3}$/.test(String(s||''));
const read=()=>{try{const s=store.get(KEY,null);return s&&validCode(s.currency)?s:null;}catch(_){return null;}};
const base=()=>read()?.currency||DEFAULT;
const localeSuggestion=()=>{
 try{const tags=[...(navigator.languages||[]),navigator.language,Intl.DateTimeFormat().resolvedOptions().locale].filter(Boolean);for(const raw of tags){const tag=String(raw);const region=(tag.match(/-([A-Z]{2})(?:-|$)/i)||[])[1]?.toUpperCase();const found=COUNTRIES.find(x=>x.code===region);if(found)return found;}return COUNTRIES[0];}catch(_){return COUNTRIES[0];}
};
const options=()=>{
 let list=[];
 try{if(typeof catalog==='function')list=catalog().filter(x=>x.active!==false).map(x=>({code:x.code,name:x.name||x.code}));}catch(_){}
 for(const c of Object.keys(NAMES))if(!list.some(x=>x.code===c))list.push({code:c,name:NAMES[c]});
 const selected=base();if(!list.some(x=>x.code===selected))list.push({code:selected,name:selected});
 return list;
};
function option(select,currency,label){
 if(!select)return;
 if(![...select.options].some(o=>o.value===currency)){
  const item=document.createElement('option');item.value=currency;item.textContent=label||NAMES[currency]||currency;select.append(item);
 }
}
function prepare(){
 const chosen=base();
 if(typeof KNOWN_CURRENCIES!=='undefined')KNOWN_CURRENCIES.add(chosen);
 for(const id of ['currency','multiVoucherBaseCurrency','voucherCurrencySelect','budgetReportCurrency','trialBase','trialCurrency','ratibPositionCurrency','ratibMovementCurrency']){
  option($(id),chosen,NAMES[chosen]||chosen);
 }
}
function apply(opts={}){
 prepare();
 const chosen=base();
 const dashboard=$('currency');
 if(dashboard){dashboard.value=chosen;if(opts.refresh&&typeof updateProDashboard==='function')updateProDashboard();}
 // Applied to report defaults only. Never modify an open voucher or saved journal.
 for(const id of ['budgetReportCurrency','ratibPositionCurrency','trialBase']){
  const select=$(id);if(select){option(select,chosen);select.value=chosen;}
 }
 const mode=$('trialMode');
 if(mode&&chosen!=='YER'&&mode.value==='paired')mode.value='dual';
 const baseSelect=$('trialBase');if(baseSelect)baseSelect.disabled=!!mode&&mode.value==='paired';
 if(opts.refresh){
  if(typeof runTrialBalanceReport==='function'&&$('trialBalanceSections'))runTrialBalanceReport();
  try{document.dispatchEvent(new CustomEvent('ratib:primary-currency-changed',{detail:{currency:chosen}}));}catch(_){}
 }
 const summary=$('ratibPrimaryCurrencySummary');
 if(summary)summary.textContent=(NAMES[chosen]||chosen)+' ('+chosen+')';
}
function values(){
 const saved=read(),country=saved?.country||'YE';
 return {country,currency:base()};
}
function createUi(){
 let modal=$('ratibCountryCurrencyDialog');
 if(modal)return modal;
 modal=document.createElement('div');
 modal.id='ratibCountryCurrencyDialog';modal.className='ratib-country-overlay';modal.hidden=true;
 modal.innerHTML='<section class="ratib-country-dialog" role="dialog" aria-modal="true" aria-labelledby="ratibCountryDialogTitle"><h2 id="ratibCountryDialogTitle">🌍 الدولة والعملة الأساسية</h2><p>اختر الدولة وعملة عملياتك الجديدة. لا تُغيّر هذه الإعدادات أي قيود أو أسعار صرف سابقة.</p><label for="ratibCountryChoice">دولة الاستخدام</label><select id="ratibCountryChoice"></select><label for="ratibPrimaryCurrencyChoice">العملة الأساسية</label><select id="ratibPrimaryCurrencyChoice"></select><p class="ratib-country-note">العملة المقترحة تعتمد على إعداد لغة الجهاز فقط، وليست تحديدًا لموقعك. لا تُحوَّل العملات الأخرى دون سعر صرف موثق. بعض مستندات التجارة القديمة تُقيَّم بالريال اليمني إلى أن تُراجع بنيتها المحاسبية.</p><p id="ratibCountryFeedback" role="status" aria-live="polite"></p><div class="ratib-country-actions"><button type="button" id="ratibCountrySave" class="btn btn-primary">اعتماد العملة</button><button type="button" id="ratibCountryKeep" class="btn btn-ghost">الاحتفاظ بالإعداد السابق</button></div></section>';
 document.body.append(modal);
 const country=$('ratibCountryChoice'),currency=$('ratibPrimaryCurrencyChoice');
 for(const c of COUNTRIES){const o=document.createElement('option');o.value=c.code;o.textContent=c.name;country.append(o);}
 for(const c of options()){const o=document.createElement('option');o.value=c.code;o.textContent=c.name+' ('+c.code+')';currency.append(o);}
 country.addEventListener('change',()=>{
  const selected=COUNTRIES.find(x=>x.code===country.value);
  if(selected?.currency){option(currency,selected.currency,NAMES[selected.currency]);currency.value=selected.currency;}
 });
 $('ratibCountrySave').addEventListener('click',()=>{void saveSelection(country.value,currency.value,modal);});
 $('ratibCountryKeep').addEventListener('click',()=>{if(!read()){void saveSelection('YE','YER',modal);}else close();});
 return modal;
}
function close(){
 const modal=$('ratibCountryCurrencyDialog');
 if(modal){modal.hidden=true;modal.setAttribute('aria-hidden','true');}
}
function open(){
 const m=createUi(),country=$('ratibCountryChoice'),currency=$('ratibPrimaryCurrencyChoice');
 const cfg=read(),suggest=localeSuggestion();
 const choice=cfg?.country||suggest.code;
 country.value=COUNTRIES.some(x=>x.code===choice)?choice:'OTHER';
 const selected=cfg?.currency||COUNTRIES.find(x=>x.code===country.value)?.currency||DEFAULT;
 option(currency,selected,NAMES[selected]||selected);currency.value=selected;
 $('ratibCountryFeedback').textContent='';
 m.hidden=false;m.removeAttribute('aria-hidden');country.focus();
}
async function saveSelection(country,currency,modal){
 currency=String(currency||'').toUpperCase();
 const record=COUNTRIES.find(x=>x.code===country);
 if(!record||!validCode(currency)){if($('ratibCountryFeedback'))$('ratibCountryFeedback').textContent='اختر الدولة والعملة الصحيحتين.';return;}
 const listed=options().some(x=>x.code===currency);
 if(!listed){$('ratibCountryFeedback').textContent='أضف العملة أولًا من إدارة العملات.';return;}
 if(typeof flushStorage!=='function'){ $('ratibCountryFeedback').textContent='إعداد الحفظ غير متاح، أعد فتح التطبيق.';return;}
 const previous=read();
 const submit=$('ratibCountrySave');if(submit)submit.disabled=true;
 try{
  // Provide AED/EUR in the existing central currency catalog, without rates or historical conversions.
  const data=typeof catalog==='function'?catalog():[];
  if(!data.some(x=>x.code===currency)){
   data.push({code:currency,name:NAMES[currency]||currency,decimals:digits(currency),active:true});
   store.set('currency_catalog_v1',data);
  }
  if(typeof KNOWN_CURRENCIES!=='undefined')KNOWN_CURRENCIES.add(currency);
  store.set(KEY,{country,currency,updatedAt:new Date().toISOString(),version:1});
  await flushStorage();
  const persisted=read();
  if(!persisted||persisted.country!==country||persisted.currency!==currency)throw Error('لم يثبت حفظ اختيار العملة.');
  if(typeof sync==='function')sync();
  apply({refresh:true});close();
  if(typeof showToast==='function')showToast('تم اعتماد '+currency+' للعمليات الجديدة؛ السندات القديمة لم تتغير.','success');
 }catch(e){
  if($('ratibCountryFeedback'))$('ratibCountryFeedback').textContent='تعذّر الحفظ: '+(e.message||e);
  // Revert only the user preference if storage fails; never touch vouchers.
  try{if(previous)store.set(KEY,previous);}catch(_){}
 }finally{if(submit)submit.disabled=false;}
}
function settings(){
 const container=$('ratibCurrencyManager')?.querySelector('.settings-accordion-body');
 if(!container||$('ratibCountryCurrencySettings'))return;
 const div=document.createElement('section');div.id='ratibCountryCurrencySettings';div.className='ratib-country-settings';
 div.innerHTML='<strong>🌍 الدولة والعملة الأساسية</strong><p>العملة المعتمدة للعمليات الجديدة: <b id="ratibPrimaryCurrencySummary">ريال يمني (YER)</b></p><p>تغيير العملة لا يمس السندات القديمة. تقارير المعادل تستخدم أسعار الصرف الموثقة فقط.</p><button type="button" class="btn btn-ghost" id="ratibCountrySettingsOpen">تغيير الدولة والعملة الأساسية</button>';
 container.prepend(div);
 $('ratibCountrySettingsOpen').addEventListener('click',open);
}
let initialized=false;
function initAfterUnlock(){
 if(initialized)return;
 initialized=true;
 settings();prepare();apply();
 // New, empty workspaces receive one-time onboarding. Existing ledgers retain YER.
 if(!read()&&typeof getAllTransactions==='function'&&getAllTransactions().length===0)open();
}
global.RatibCountryCurrency=Object.freeze({KEY,base,read,values,localeSuggestion,digits,open,prepare,apply,initAfterUnlock});
// The encrypted vault may have unlocked before deferred modules were evaluated.
if(global.__ratibProceedInitialized)queueMicrotask(initAfterUnlock);
})(window);
