/* Approved navigation presentation: reuse existing targets and their handlers. */
(()=>{'use strict';
const tilePaths={
 reportsGroupStatementHeader:'M5 3h14v18H5zM9 7h6M9 11h6M9 15h4',
 reportsGroupBudgetHeader:'M4 4v16h16M7 15l4-4 4 2 5-7M16 6h4v4',
 reportsGroupTrialHeader:'M12 3v18M5 6h14M5 6l-4 8h8ZM19 6l-4 8h8ZM7 21h10',
 reportsGroupMovementHeader:'M3 3v18h18M7 15l4-4 3 3 5-7',
 reportsGroupPositionHeader:'M3 21h18M4 10h16M5 10v9M10 10v9M14 10v9M19 10v9M3 10l9-7 9 7',
 yearToolOpen:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3'
};
const titles={reportsGroupStatementHeader:'كشف الحساب',reportsGroupBudgetHeader:'بنود الميزانية',reportsGroupTrialHeader:'ميزان المراجعة',reportsGroupMovementHeader:'حركة الحسابات',reportsGroupPositionHeader:'المركز المالي',yearToolOpen:'الإغلاق السنوي'};
function tile(el){
 if(el.dataset.ratibTile)return;
 el.dataset.ratibTile='1';el.classList.add('main-menu-btn','ratib-report-tile');
 const label=document.createElement('span');label.className='ratib-report-label';
 label.textContent=titles[el.id]||el.textContent.trim();
 el.setAttribute('aria-label',label.textContent);
 el.replaceChildren();
 const icon=document.createElement('span');icon.className='main-menu-icon ratib-report-icon';icon.setAttribute('aria-hidden','true');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(k,v);
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',tilePaths[el.id]);svg.append(path);icon.append(svg);el.append(icon,label);
}
function reportsMenu(){
 const page=document.getElementById('pageReports');if(!page)return;
 let menu=document.getElementById('ratibReportMenu');
 if(!menu){menu=document.createElement('div');menu.id='ratibReportMenu';menu.className='ratib-report-menu no-print';menu.setAttribute('role','group');menu.setAttribute('aria-label','خيارات التقارير');page.prepend(menu);}
 for(const id of ['reportsGroupStatementHeader','reportsGroupBudgetHeader','reportsGroupTrialHeader','reportsGroupMovementHeader','reportsGroupPositionHeader','yearToolOpen']){
  const el=document.getElementById(id);if(!el)continue;
  if(el.parentElement!==menu)menu.append(el);tile(el);
  if(el.tagName!=='BUTTON'&&!el.dataset.ratibKeyboard){el.dataset.ratibKeyboard='1';el.setAttribute('role','button');el.tabIndex=0;el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});}
 }
}
function backIcons(){
 document.querySelectorAll('button').forEach(b=>{
  const label=[b.getAttribute('aria-label'),b.title,b.textContent].filter(Boolean).join(' ').trim();
  const back=b.matches('#backToMenuBtn,#ledgerBackBtn,[data-account-action="close"],#yearToolDismiss')||/^(?:[←↩⬅️\s]*)(?:رجوع|الرجوع|العودة إلى|العودة للشاشة)/u.test(label);
  if(!back)return;
  b.classList.add('ratib-back-control');
  if(/^[←↩⬅️\s]+$/u.test(b.textContent.trim()))b.classList.add('ratib-back-icon-only');
 });
}
function refresh(){reportsMenu();backIcons();}
refresh();let pending=false;
new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh();});}).observe(document.body,{childList:true,subtree:true});
})();


/* Ratib trial 3.6.118: guard unsaved voucher inputs and style success toasts. */
(function ratibTrialBackAndToast116(){
 'use strict';
 const originals=new Map();
 const editor='#cashFlowCard,#multiVoucherCard';
 const backButtons='button.ratib-back-control,#ratibCashBackBtn,#backToMenuBtn,#ledgerBackBtn,button.back-to-menu-btn,[data-account-action="close"]';
 function trackable(el){
  return !!el?.closest?.(editor) && !el.closest('.hidden,[hidden]') &&
    !el.disabled&&!el.readOnly&&/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)&&
    !/^(hidden|button|submit|checkbox|radio|file)$/.test(el.type||'');
 }
 function hasChanges(){
  for(const [el,initial] of originals){
   if(!el.isConnected||!trackable(el)){originals.delete(el);continue;}
   if(el.value!==initial)return true;
  }
  return false;
 }
 document.addEventListener('focusin',e=>{
  const el=e.target;
  if(trackable(el)&&!originals.has(el))originals.set(el,el.value);
 },true);
 document.addEventListener('input',e=>{
  if(!e.isTrusted)return;
  const el=e.target;
  if(trackable(el)&&!originals.has(el))originals.set(el,el.defaultValue??'');
 },true);
 document.addEventListener('click',e=>{
  const button=e.target?.closest?.(backButtons);
  if(!button||!hasChanges())return;
  if(!window.confirm('هناك تغييرات في السند لم تُحفظ. هل تريد الرجوع دون حفظها؟')){
   e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();return;
  }
  originals.clear();
 },true);
 function successStyle(message){
  const value=String(message??'').trim();if(!value)return;
  for(const el of document.querySelectorAll('#toast,.toast,.toast-message,#toastNotification,#appToast,.app-toast,.notification,.toast-notification,[role="status"]')){
   if(!(el.textContent||'').trim().includes(value))continue;
   (el.closest('.toast,.app-toast,.notification,.toast-notification')||el).classList.add('ratib-success-toast-116');
  }
 }
 function hookToast(){
  const old=window.showToast;
  if(typeof old!=='function'||old.__ratibToast116)return;
  function enhanced(message,kind,...args){
   if(kind!=='success')document.querySelectorAll('.ratib-success-toast-116').forEach(el=>el.classList.remove('ratib-success-toast-116'));
   const result=old.apply(this,[message,kind,...args]);
   if(kind==='success'){
    const msg=String(message||'');
    if(/حفظ|تسجيل|إضافة/.test(msg)&&/سند|قيد|عملية/.test(msg))originals.clear();
    queueMicrotask(()=>successStyle(message));setTimeout(()=>successStyle(message),60);
   }
   return result;
  }
  enhanced.__ratibToast116=true;window.showToast=enhanced;
 }
 hookToast();
 let pending=false;
 new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;hookToast();});}).observe(document.body,{childList:true,subtree:true});
})();
