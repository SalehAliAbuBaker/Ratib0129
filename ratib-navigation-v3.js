/* Approved navigation presentation: reuse existing targets and their handlers. */
(()=>{'use strict';
const tilePaths={
 reportsGroupStatementHeader:'M5 3h14v18H5zM9 7h6M9 11h6M9 15h4',
 reportsGroupBudgetHeader:'M4 4v16h16M7 15l4-4 4 2 5-7M16 6h4v4',
 reportsGroupTrialHeader:'M12 3v18M5 6h14M5 6l-4 8h8ZM19 6l-4 8h8ZM7 21h10',
 yearToolOpen:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3'
};
function tile(el){
 if(el.dataset.ratibTile)return;
 el.dataset.ratibTile='1';el.classList.add('main-menu-btn','ratib-report-tile');
 const label=document.createElement('span');label.className='ratib-report-label';
 while(el.firstChild)label.append(el.firstChild);
 const icon=document.createElement('span');icon.className='main-menu-icon ratib-report-icon';icon.setAttribute('aria-hidden','true');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(k,v);
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',tilePaths[el.id]);svg.append(path);icon.append(svg);el.append(icon,label);
}
function reportsMenu(){
 const page=document.getElementById('pageReports');if(!page)return;
 let menu=document.getElementById('ratibReportMenu');
 if(!menu){menu=document.createElement('div');menu.id='ratibReportMenu';menu.className='ratib-report-menu no-print';menu.setAttribute('role','group');menu.setAttribute('aria-label','خيارات التقارير');page.prepend(menu);}
 for(const id of ['reportsGroupStatementHeader','reportsGroupBudgetHeader','reportsGroupTrialHeader','yearToolOpen']){
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
