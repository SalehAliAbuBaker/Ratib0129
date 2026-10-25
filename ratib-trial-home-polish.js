/* Ratib Al-Muyassar trial: balanced dashboard, native favorites retained.
   Presentation and navigation only; use the existing accounting forms. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const paths={
 cash:'M6 7h14m0 0-4-4m4 4-4 4M18 17H4m0 0 4-4m-4 4 4 4',
 simple:'M8 4h11v16H8zM5 8h.01M5 13h.01M5 18h.01M11 8h5M11 13h5M11 18h5',
 compound:'M4 5h6v6H4zM14 4h6v6h-6zM9 16h6v5H9zM10 8h4M7 11v4h5M17 10v5h-5',
 opening:'M3 19h18M5 16V5h14v11M8 8h8M8 12h8M12 3v2',
 account:'M14 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a6 6 0 0 1 12 0v2M19 8v8m-4-4h8'
};
function icon(kind){
 const svg=document.createElementNS(NS,'svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
 const path=document.createElementNS(NS,'path');path.setAttribute('d',paths[kind]||paths.simple);svg.append(path);return svg;
}
function brand(){
 const el=document.querySelector('#mainWrap > header .logo > span');if(!el)return;
 if(el.querySelector('strong')?.textContent==='راتب الميسر'&&el.querySelector('small')?.textContent==='للتنظيم والتدبير المالي')return;
 const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent='راتب الميسر';small.textContent='للتنظيم والتدبير المالي';el.replaceChildren(strong,small);
 el.setAttribute('aria-label','راتب الميسر — للتنظيم والتدبير المالي');
}
let cashMenu=null,cashTrigger=null,returnFocus=null;
function dismissCashMenu(restore=false){
 if(!cashMenu||cashMenu.hidden)return;
 cashMenu.hidden=true;cashTrigger?.setAttribute('aria-expanded','false');
 if(restore)try{(returnFocus||cashTrigger)?.focus({preventScroll:true})}catch(_){}
}
function showCashMenu(trigger){
 if(!cashMenu)return;
 if(!cashMenu.hidden){dismissCashMenu(true);return;}
 cashTrigger=trigger;returnFocus=trigger;
 cashMenu.hidden=false;trigger.setAttribute('aria-expanded','true');
 cashMenu.querySelector('button')?.focus({preventScroll:true});
}
function installCashMenu(grid){
 if(document.getElementById('ratibCashVoucherMenu'))return;
 const section=grid.closest('section')||grid.parentElement;
 cashMenu=document.createElement('div');cashMenu.id='ratibCashVoucherMenu';cashMenu.className='ratib-cash-choice no-print';
 cashMenu.hidden=true;cashMenu.setAttribute('role','group');cashMenu.setAttribute('aria-label','اختر نوع السند');
 for(const [type,label] of [['income','سند قبض'],['spend','سند صرف']]){
  const btn=document.createElement('button');btn.type='button';btn.className='ratib-cash-choice-button';btn.textContent=label;
  btn.addEventListener('click',()=>{
   dismissCashMenu(false);
   if(typeof navigateToTab==='function'&&typeof selectVoucherTypeDirect==='function'){
    navigateToTab('pageExpenses',true);selectVoucherTypeDirect(type);
   }
  });
  cashMenu.append(btn);
 }
 section.append(cashMenu);
 document.addEventListener('pointerdown',e=>{
  if(cashMenu&&!cashMenu.hidden&&!cashMenu.contains(e.target)&&!cashTrigger?.contains(e.target))dismissCashMenu(false);
 },true);
 document.addEventListener('keydown',e=>{
  if(!cashMenu||cashMenu.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismissCashMenu(true);return;}
  if(e.key==='Tab'){
   const buttons=[...cashMenu.querySelectorAll('button')],ix=buttons.indexOf(document.activeElement);
   if(ix<0)return;
   if(e.shiftKey&&ix===0){e.preventDefault();buttons.at(-1).focus();}
   else if(!e.shiftKey&&ix===buttons.length-1){e.preventDefault();buttons[0].focus();}
  }
 },true);
}
function quickButtons(){
 const grid=document.querySelector('#dashboardHomeContent .ratib-quick-entry-grid');if(!grid)return;
 const original=[...grid.children].filter(b=>b.tagName==='BUTTON');
 if(!document.getElementById('ratibCashUnifiedQuickBtn')){
  const income=original.find(b=>b.getAttribute('onclick')?.includes("'income'"));
  const spend=original.find(b=>b.getAttribute('onclick')?.includes("'spend'"));
  if(income&&spend){
   income.id='ratibCashUnifiedQuickBtn';
   income.removeAttribute('onclick');income.onclick=null;
   income.textContent='سند قبض / صرف';
   spend.remove();
   income.setAttribute('aria-haspopup','true');income.setAttribute('aria-expanded','false');income.setAttribute('aria-controls','ratibCashVoucherMenu');
   income.addEventListener('click',()=>showCashMenu(income));
  }
 }
 installCashMenu(grid);
 const keys={'ratibCashUnifiedQuickBtn':'cash','ratibOpeningQuickLaunch':'opening'};
 for(const btn of grid.querySelectorAll(':scope > button')){
  if(btn.dataset.ratibVoucherIcon)continue;
  const label=btn.textContent.replace(/\s+/g,' ').trim();
  const kind=keys[btn.id]||(label.includes('افتتاح')?'opening':label.includes('مركب')?'compound':'simple');
  const span=document.createElement('span');span.className='ratib-quick-voucher-icon';span.setAttribute('aria-hidden','true');span.append(icon(kind));
  const txt=document.createElement('span');txt.className='ratib-quick-voucher-label';txt.textContent=label;
  btn.replaceChildren(span,txt);btn.dataset.ratibVoucherIcon=kind;btn.setAttribute('aria-label',label);
 }
}
function mainTiles(){
 const grid=document.querySelector('#dashboardHomeContent .main-menu-grid');if(!grid)return;
 const obsolete=document.getElementById('ratibOpeningLaunch');obsolete?.remove();
 if(!document.getElementById('ratibNewAccountHomeBtn')){
  const account=document.createElement('button');account.type='button';account.id='ratibNewAccountHomeBtn';
  account.className='main-menu-btn';account.setAttribute('aria-label','إضافة حساب جديد');
  const symbol=document.createElement('span');symbol.className='main-menu-icon';symbol.setAttribute('aria-hidden','true');symbol.append(icon('account'));
  const label=document.createElement('span');label.textContent='إضافة حساب جديد';account.append(symbol,label);
  account.addEventListener('click',()=>{
   try{
    if(typeof openAddAccountModal!=='function')throw Error('نافذة إضافة الحسابات غير متاحة');
    openAddAccountModal();
   }catch(error){
    console.error(error);
    if(typeof showToast==='function')showToast('تعذر فتح إضافة الحساب. افتح شجرة الحسابات وحاول مرة أخرى.','warn');
   }
  });
  const fav=document.getElementById('ratibCenterFavorites');
  if(fav)grid.insertBefore(account,fav);else grid.append(account);
 }
 const favorite=document.getElementById('ratibCenterFavorites');
 if(favorite){
  if(favorite.dataset.ratibCardReady||favorite.classList.contains('main-menu-btn')){
   favorite.replaceChildren(document.createTextNode('★'));favorite.classList.remove('main-menu-btn');delete favorite.dataset.ratibCardReady;
  }
  favorite.title='اختصاراتي';favorite.setAttribute('aria-label','فتح قائمة اختصاراتي');
 }
 grid.classList.remove('ratib-approved-home-row');
}
let queued=false;
function update(){queued=false;brand();quickButtons();mainTiles();}
function schedule(){if(queued)return;queued=true;queueMicrotask(update);}
function init(){
 update();const page=document.getElementById('dashboardHomeContent');
 if(page){
  const observer=new MutationObserver(records=>{
   if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('#ratibOpeningQuickLaunch,#ratibOpeningLaunch,#ratibCenterFavorites,.ratib-quick-entry-grid > button')||n.querySelector?.('#ratibOpeningQuickLaunch,#ratibOpeningLaunch,#ratibCenterFavorites')))))schedule();
  });
  observer.observe(page,{subtree:true,childList:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',brand);
})();