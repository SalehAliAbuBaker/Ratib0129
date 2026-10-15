/* Approved navigation presentation: reuse existing targets and their handlers. */
(()=>{'use strict';
function reportsMenu(){
 const page=document.getElementById('pageReports');if(!page)return;
 let menu=document.getElementById('ratibReportMenu');
 if(!menu){menu=document.createElement('div');menu.id='ratibReportMenu';menu.className='ratib-report-menu no-print';menu.setAttribute('role','group');menu.setAttribute('aria-label','خيارات التقارير');page.prepend(menu);}
 for(const id of ['reportsGroupStatementHeader','reportsGroupBudgetHeader','reportsGroupTrialHeader','yearToolOpen']){
  const el=document.getElementById(id);if(!el)continue;
  if(el.parentElement!==menu)menu.append(el);
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
