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
function refresh(){reportsMenu();}
refresh();let pending=false;
new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refresh();});}).observe(document.body,{childList:true,subtree:true});
})();


/* Ratib trial 3.6.118: guard unsaved voucher inputs and style success toasts. */
(function ratibTrialBackAndToast116(){
 'use strict';
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

/* The same dismiss action is used by the dialog button and by system Back. */
(() => {
  'use strict';
  const actions = {
    accountQuickVoucherModal:'accountQuickVoucherCancelBtn', cloudBackupDueModal:'cloudBackupDueCancelBtn',
    cloudRestoreModal:'closeCloudRestoreBtn', categoryTransactionsModal:'closeCategoryModalBtn',
    reminderModal:'closeReminderModalBtn', editAccountModal:'closeEditAccountModalBtn',
    txModal:'closeModalBtn', addAccountModal:'closeAddAccountModalBtn',
    longPressConfirmModal:'cancelEditDocBtn', globalSearchModal:'closeGlobalSearchBtn',
    accountStatementCurrencyModal:'accountStatementCurrencyCancel', ratibAboutModal:'closeRatibAboutBtn',
    importedRecordModal:'closeImportedRecordBtn', spendFxModal:'cancelSpendFxBtn',
    legacyImportModal:'closeLegacyImportBtn', trialPreviewModal:'trialPreviewClose',
    financialCalculatorModal:'financialCalcClose', yearToolOverlay:'yearToolDismiss',
    ratibWhatsappSupportDialog:'ratibWhatsappSupportClose', importedOpeningVoucherModal:'importedOpeningClose'
  };
  const editors = new Set(['editAccountModal','addAccountModal','reminderModal','txModal','importedRecordModal']);
  const baselines = new WeakMap();
  const openers = new WeakMap();
  let lastControl, pendingClose;
  const prompt = document.createElement('dialog');
  prompt.id = 'ratibDiscardEdits';
  prompt.setAttribute('aria-labelledby','ratibDiscardTitle');
  prompt.innerHTML = '<h3 id="ratibDiscardTitle">تجاهل التعديلات والرجوع؟</h3><form method="dialog"><button class="btn btn-ghost" value="stay" autofocus>متابعة التحرير</button><button class="btn btn-danger" value="discard">تجاهل التعديلات</button></form>';
  document.body.append(prompt);
  function fieldValues(modal) {
    return JSON.stringify([...modal.querySelectorAll('input:not([type=button]):not([type=hidden]),select,textarea')]
      .map(field => [field.value,field.checked]));
  }
  function visible(modal) {
    return modal.open || modal.classList.contains('show') || modal.style.display === 'flex';
  }
  function refresh(modal) {
    if (!visible(modal)) {
      baselines.delete(modal);
      const opener = openers.get(modal);
      openers.delete(modal);
      if (opener?.isConnected && !opener.closest('.hidden,[hidden],[inert]')) opener.focus({preventScroll:true});
      return;
    }
    if (!openers.has(modal)) openers.set(modal,lastControl);
    if (editors.has(modal.id) && !baselines.has(modal)) baselines.set(modal,fieldValues(modal));
    const button = document.getElementById(actions[modal.id]);
    const heading = modal.querySelector('h1,h2,h3,[role=heading]');
    if (!button || !heading || button.classList.contains('ratib-dialog-dismiss')) return;
    const row = document.createElement('div');
    row.className = 'ratib-dialog-heading';
    heading.before(row);
    row.append(button,heading);
    button.classList.add('ratib-dialog-dismiss');
    button.setAttribute('aria-label','إغلاق '+heading.textContent.trim());
  }
  document.addEventListener('pointerdown',event => {
    lastControl = event.target.closest('button,a,input,[tabindex],[role=button]') || document.activeElement;
  },true);
  document.addEventListener('focusin',event => {
    if (!event.target.closest('.modal-overlay,dialog')) lastControl=event.target;
  });
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (actions[record.target.id]) refresh(record.target);
    }
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','open']});
  document.addEventListener('click',event => {
    const button = event.target.closest('button');
    const modal = button?.closest('.modal-overlay');
    if (!modal || !editors.has(modal.id) || !baselines.has(modal)) return;
    if (![actions[modal.id],'closeModalActionBtn','cancelImportedRecordBtn'].includes(button.id)) return;
    if (fieldValues(modal) === baselines.get(modal)) return;
    event.preventDefault();event.stopImmediatePropagation();
    if (prompt.open) return;
    pendingClose = {button,modal};
    prompt.returnValue='stay';
    prompt.showModal();
  },true);
  prompt.addEventListener('close',() => {
    const request = pendingClose;
    pendingClose = null;
    if (!request || prompt.returnValue !== 'discard') return;
    baselines.delete(request.modal);
    request.button.click();
  });
  window.ratibDismissDialog = modal => {
    const button = document.getElementById(actions[modal.id]);
    if (!button) return false;
    button.click();
    return true;
  };
})();
