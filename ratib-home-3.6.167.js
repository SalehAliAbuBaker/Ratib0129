/* Ratib 3.6.167 — additive home layout; no financial data writes. */
(()=>{'use strict';
const by=id=>document.getElementById(id),fold=x=>String(x??'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLocaleLowerCase('ar').trim();
const node=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
function date(){
const d=new Date(),w=by('ratibHomeWeekday'),h=by('ratibHomeHijri'),g=by('ratibHomeGregorian');if(!w||!h||!g)return;
w.textContent=new Intl.DateTimeFormat('ar-YE',{weekday:'long'}).format(d);
try{const f=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'});h.textContent=f.resolvedOptions().calendar==='islamic-umalqura'?f.format(d).replace(/\s*هـ\s*$/,'هـ'):'التاريخ الهجري غير متاح';}catch(_){h.textContent='التاريخ الهجري غير متاح';}
g.textContent=new Intl.DateTimeFormat('ar-YE-u-ca-gregory-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(d);
}
function header(){
const head=document.querySelector('#mainWrap>header.no-print'),logo=head?.querySelector('.logo'),v=by('appVersionLabel');if(!head||!logo||!v||by('ratibHomeDate'))return;
head.classList.add('ratib-home-app-header');
const brand=node('span','ratib-home-brand'),pic=logo.querySelector('img');
brand.append(node('span','ratib-brand-name','راتب'),node('span','ratib-brand-sub','للتنظيم والتدبير المالي'));
v.textContent='الإصدار 3.6.167';brand.append(v);if(pic)logo.replaceChildren(pic,brand);else logo.replaceChildren(brand);
const dates=node('div','ratib-home-dates');dates.id='ratibHomeDate';dates.setAttribute('aria-label','اليوم والتاريخ الهجري والميلادي');
for(const [id,cls] of [['ratibHomeWeekday','day'],['ratibHomeHijri','hijri'],['ratibHomeGregorian','gregorian']]){const row=node('span','ratib-date-'+cls);row.id=id;dates.append(row);}logo.after(dates);
date();window.addEventListener('focus',date);document.addEventListener('visibilitychange',()=>{if(!document.hidden)date();});
}
function navigate(id){if(typeof window.navigateToTab==='function')window.navigateToTab(id,true);}
// The sixth home tile opens Reports directly; statement remains optional in bottom navigation.
function cards(){
const grid=document.querySelector('#dashboardHomeContent .ratib-home-main-grid');if(!grid||grid.dataset.home167)return;grid.dataset.home167='1';
grid.setAttribute('aria-label','الوظائف الرئيسية');const btns=Array.from(grid.querySelectorAll(':scope>.main-menu-btn'));
for(const b of btns)if(/التقارير|الاعدادات|سجل العمليات/.test(fold(b.textContent)))b.classList.add('ratib-hidden-home-tile');
const first=grid.querySelector('.ratib-home-voucher-shortcuts>.main-menu-btn');if(first)first.querySelector('span:last-child').textContent='قبض وصرف';
const acc=btns.find(x=>fold(x.textContent)==='الحسابات');
if(acc){const b=node('button','main-menu-btn ratib-reports-tile');b.type='button';b.setAttribute('aria-label','التقارير');b.innerHTML='<span class="main-menu-icon" aria-hidden="true">▥</span><span>التقارير</span>';b.addEventListener('click',()=>navigate('pageReports'));acc.after(b);}
}
function pulse(){
const home=by('dashboardHomeContent'),car=by('dashboardCarousel'),grid=home?.querySelector('.ratib-home-main-grid');if(!home||!car||!grid)return;
home.insertBefore(car,grid);
const pul=by('ratibCashPulse'),toggle=by('ratibPulseToggle'),body=by('ratibPulseBody');if(!pul||!toggle||!body)return;
pul.classList.add('ratib-home-pulse');if(by('ratibPulseQuick'))return;
const quick=node('div','ratib-pulse-quick');quick.id='ratibPulseQuick';
for(const [i,t] of [['◉','الرصيد'],['↙','المقبوضات'],['↗','المصروفات']]){const e=node('span','ratib-pulse-stat');e.append(node('span','ratib-pulse-icon',i),node('small','',t));quick.append(e);}
const hint=node('small','ratib-pulse-hint','اضغط لعرض الأرصدة وتحليل البنود حسب العملة');toggle.after(quick,hint);
const refresh=()=>{quick.hidden=!body.hidden;hint.hidden=!body.hidden;};
toggle.addEventListener('click',()=>requestAnimationFrame(refresh));
if(!body.hidden)toggle.click();refresh();
}
function search(){
const grid=document.querySelector('#dashboardHomeContent .ratib-home-main-grid');if(!grid||by('ratibHomeSmartSearch'))return;
const host=node('section','ratib-smart-search no-print');host.id='ratibHomeSmartSearch';
host.append(node('strong','ratib-smart-heading','البحث الذكي'));
const row=node('div','ratib-smart-row'),input=node('input','ratib-smart-input'),select=node('select','ratib-smart-scope'),results=node('div','ratib-smart-results');
input.type='search';input.id='ratibSmartInput';input.autocomplete='off';input.placeholder='ابحث باسم الحساب أو رقمه';input.setAttribute('aria-label','البحث الذكي');
select.id='ratibSmartScope';select.setAttribute('aria-label','نطاق البحث');
for(const [val,label] of [['accounts','الحسابات'],['operations','العمليات'],['all','العمليات والحسابات']]){const option=node('option','',label);option.value=val;select.append(option);}select.value='accounts';
row.append(node('span','ratib-smart-symbol','⌕'),input,select);results.id='ratibSmartResults';results.hidden=true;host.append(row,results);grid.after(host);
const ready=()=>!!window.__ratibProceedInitialized;
function accounts(){if(!ready()||typeof getCanonicalCatalog!=='function')return [];try{return (getCanonicalCatalog()||[]).flatMap(x=>(x.details||[]).map(d=>({name:String(d[1]||''),code:String(d[0]||''),path:[x.main,x.group,x.sub].join(' ')})));}catch(_){return [];}}
function txs(){if(!ready()||typeof getAllTransactions!=='function')return [];try{return getAllTransactions().filter(t=>t&&t.status!=='reversed'&&t.status!=='deleted');}catch(_){return [];}}
function matchText(t){const m=t.multiVoucher||{};return [t.seq,t.id,t.voucherNumber,t.date,t.account,t.accountName,t.debitAcc,t.creditAcc,t.description,t.note,t.notes,t.beneficiary,t.payer,t.amount,t.currency,t.budgetCategory,m.mode,m.seq,m.beneficiary,...(Array.isArray(m.lines)?m.lines.slice(0,20).map(y=>[y.account,y.accountName,y.notes,y.amount].join(' ')):[])].filter(x=>x!==undefined&&x!==null).join(' ');}
// The dashboard query is a temporary navigation aid, never a stored selection.
function resetSearchSession(){
 input.value='';select.value='accounts';results.hidden=true;results.replaceChildren();current=[];searchFocused=false;
}
window.RatibHomeSmartSearchReset=resetSearchSession;
function goto(which,term){
 if(which==='accounts'){
   const found=accounts().find(a=>fold(a.name)===fold(term)||fold(a.code)===fold(term));
   if(found&&typeof openAccountFromPager==='function'){
     resetSearchSession();openAccountFromPager(found.name,[found.name]);return;
   }
   // A search without a chosen detail must remain in the live results list.
   return;
 }
 resetSearchSession();
 navigate('pageLedger');
 const field=by('ledgerSearchInput');
 if(field){field.value=term;field.dispatchEvent(new Event('input',{bubbles:true}));}
}
let current=[],searchFocused=false;
function draw(){
 const term=input.value.trim(),type=select.value,needle=fold(term),fav=window.RatibAccountFavorites;
 const selectedFavorites=type!=='operations'?(fav?.all?.()||[]):[];
 const pinned=!term&&searchFocused&&type==='accounts'?selectedFavorites:[];
 const favoriteNames=new Set(selectedFavorites.map(a=>a.name));
 results.replaceChildren();current=[];
 results.hidden=!term&&!searchFocused;
 if(!term&&type!=='accounts')results.hidden=true;
 if(!term&&(!searchFocused||type!=='accounts'))return;
 if(!ready()){results.append(node('p','ratib-smart-empty','افتح التطبيق أولًا لعرض النتائج.'));return;}
 if(type!=='accounts'&&term){
  let count=0;for(const t of txs()){if(count>=8)break;if(fold(matchText(t)).includes(needle)){
   current.push({type:'op',data:t,label:('سند '+String(t.seq||t.voucherNumber||t.id||'')+' — '+String(t.note||t.description||t.date||'عملية مالية')).slice(0,115)});count++;
  }}
 }
 if(type!=='operations'){
  let count=0;
  const list=term?accounts().filter(a=>fold(a.name+' '+a.code).includes(needle)):pinned;
  // Favorite accounts are prioritized only among matching results; other accounts remain searchable.
  list.sort((a,b)=>Number(favoriteNames.has(b.name))-Number(favoriteNames.has(a.name)));
  for(const a of list){if(term&&count>=8)break;current.push({type:'account',data:a,label:a.name+' · '+a.code});count++;}
 }
 if(!current.length){
  results.append(node('p','ratib-smart-empty',term?'لا توجد نتائج مطابقة. استخدم البحث التفصيلي.':'لا توجد حسابات مفضلة. اكتب اسم الحساب لإضافته بالنجمة.'));
 }
 for(const item of current){
  const b=node('button','ratib-smart-result',item.label);b.type='button';
  b.prepend(node('span','ratib-result-kind',item.type==='op'?'عملية':'حساب'));
  b.addEventListener('click',()=>{
   if(item.type==='account'){
    resetSearchSession();
    if(typeof openAccountFromPager==='function'){
     openAccountFromPager(item.data.name,[item.data.name]);
     if(typeof accountOperationsReturnTab!=='undefined')accountOperationsReturnTab='pageDashboard';
    }
   }else{
    goto('operations',String(item.data.seq||item.data.voucherNumber||item.data.id||term));
    if(typeof openDocumentDetailsModal==='function')openDocumentDetailsModal(item.data);
   }
  });
  if(item.type==='account'){
   const wrapper=node('div','ratib-smart-result-row'),star=node('button','ratib-smart-star',favoriteNames.has(item.data.name)?'★':'☆');
   star.type='button';star.title='إضافة الحساب إلى المفضلة أو إزالته';star.setAttribute('aria-label',star.title+': '+item.data.name);
   star.setAttribute('aria-pressed',String(favoriteNames.has(item.data.name)));
   star.addEventListener('click',e=>{e.stopPropagation();fav?.toggle?.(item.data);});
   wrapper.append(b,star);results.append(wrapper);
  }else results.append(b);
 }
 if(term&&(type==='operations'||type==='all')){
  const more=node('button','ratib-smart-more','المزيد من العمليات');more.type='button';
  more.addEventListener('click',()=>goto('operations',term));results.append(more);
 }
}
input.addEventListener('focus',()=>{searchFocused=true;draw();});
input.addEventListener('input',()=>{searchFocused=true;draw();});select.addEventListener('change',draw);
window.addEventListener('ratib:account-favorites-updated',()=>{if(searchFocused)draw();});
document.addEventListener('pointerdown',e=>{if(!host.contains(e.target)){searchFocused=false;results.hidden=true;}});
input.addEventListener('keydown',e=>{
 if(e.key==='Enter'){
   e.preventDefault();
   // Enter selects the actual detail, not a parent group or another search field.
   if(current.length)results.querySelector('.ratib-smart-result')?.click();
   else if(select.value==='operations')goto('operations',input.value.trim());
 }else if(e.key==='Escape')results.hidden=true;
});
}
function stock(){
const search=by('ratibHomeSmartSearch'),tiles=document.querySelector('#dashboardHomeContent .ratib-commerce-shortcuts');if(!search||!tiles||by('ratibHomeInventory'))return;
const fold=node('details','ratib-inventory-fold no-print');fold.id='ratibHomeInventory';
const summary=node('summary','ratib-inventory-summary');summary.innerHTML='<span class="ratib-stock-icon" aria-hidden="true">▣</span><span class="ratib-inventory-title"><b>المخزون</b><small>المخزون • الوارد • الصادر</small></span><span aria-hidden="true">⌄</span>';
fold.append(summary,tiles);search.after(fold);
}
function bottom(){
const wrap=by('mainWrap');if(!wrap||by('ratibHomeBottomNav'))return;
const nav=node('nav','ratib-home-bottom no-print');nav.id='ratibHomeBottomNav';nav.setAttribute('aria-label','التنقل الرئيسي');
for(const [key,icon,title] of [['home','⌂','الرئيسية'],['operations','▤','العمليات'],['favorites','♡','مفضلتي'],['reports','▥','التقارير'],['settings','⚙','الإعدادات']]){
const b=node('button','ratib-bottom-choice');b.type='button';b.dataset.ratibPage=key;b.append(node('span','ratib-bottom-icon',icon),node('small','',title));
b.addEventListener('click',()=>{if(key==='favorites'){window.RatibQuickFavorites?.open?.();return;}navigate({home:'pageDashboard',operations:'pageLedger',reports:'pageReports',settings:'pageSettings'}[key]);});nav.append(b);
}
wrap.append(nav);
const pageIds=['pageDashboard','pageLedger','pageReports','pageSettings','pageExpenses','pageAccountsTree','pageAccountOperations','pageCommerce'];
const update=()=>{const page=pageIds.find(id=>by(id)&&!by(id).classList.contains('hidden'))||'pageDashboard';
nav.hidden=['pageExpenses','pageCommerce','pageAccountOperations'].includes(page);
const active={pageDashboard:'home',pageLedger:'operations',pageReports:'reports',pageSettings:'settings'}[page];
for(const b of nav.querySelectorAll('button')){b.classList.toggle('active',b.dataset.ratibPage===active);if(b.dataset.ratibPage===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}};
const ob=new MutationObserver(update);for(const id of pageIds)if(by(id))ob.observe(by(id),{attributes:true,attributeFilter:['class']});update();
}
function mount(){const h=by('dashboardHomeContent');if(!h||h.dataset.ratibHome167)return;h.dataset.ratibHome167='1';header();cards();pulse();search();stock();bottom();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();