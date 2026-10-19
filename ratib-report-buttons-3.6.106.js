/* Ratib trial 3.6.106 — consistent buttons in Reports.
 * UI only: existing nodes, IDs, event listeners and accounting functions are preserved.
 */
(function(){
'use strict';
if(window.RatibReportButtons106)return;
const icons={
 refresh:'<path d="M20 11a8 8 0 0 0-15-3M4 4v4h4"/><path d="M4 13a8 8 0 0 0 15 3M20 20v-4h-4"/>',
 preview:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
 printer:'<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/>',
 pdf:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
 share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
 excel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M10 3v18"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 scale:'<path d="M12 3v18M3 7h18M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7ZM8 21h8"/>',
 chart:'<path d="M3 3v18h18m-14-6 4-4 3 3 5-7"/>',
 filter:'<path d="M4 7h16M6 12h12M9 17h6"/>'
};
const labels={
 ratibMovementRunBtn:['refresh','تحديث'],ratibMovementPrintBtn:['printer','طباعة'],ratibMovementPdfBtn:['pdf','PDF'],ratibMovementShareBtn:['share','مشاركة'],
 ratibPositionRunBtn:['refresh','تحديث'],ratibPositionPrintBtn:['printer','طباعة'],ratibPositionPdfBtn:['pdf','PDF'],ratibPositionShareBtn:['share','مشاركة'],
 trialPreviewBtn:['preview','معاينة'],printTrialBalanceBtn:['printer','طباعة'],shareTrialBalancePdfBtn:['pdf','PDF'],trialExcelBtn:['excel','Excel'],
 shareBudgetReportPdfBtn:['share','مشاركة PDF'],printBudgetReportBtn:['printer','طباعة'],
 trialDiagnosisBtn:['search','تشخيص الفروقات'],trialFxMatchBtn:['scale','معادلة العملات']
};
function svg(key){
 const e=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [name,value] of Object.entries({viewBox:'0 0 24 24',width:'19',height:'19',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linejoin':'round','stroke-linecap':'round','aria-hidden':'true'}))e.setAttribute(name,value);
 e.innerHTML=icons[key]||icons.chart;return e;
}
function fromText(raw){
 const t=String(raw||'').trim();
 if(/Excel|إكسل|اكسل/i.test(t))return ['excel',t];
 if(/PDF|بي دي اف/i.test(t))return ['pdf',t];
 if(/طباعة/.test(t))return ['printer',t];
 if(/مشاركة/.test(t))return ['share',t];
 if(/معاينة/.test(t))return ['preview',t];
 if(/تحديث|إعادة حساب/.test(t))return ['refresh',t];
 if(/تشخيص|بحث/.test(t))return ['search',t];
 if(/معادلة/.test(t))return ['scale',t];
 return ['chart',t];
}
const seen=new WeakSet();
function enhance(button){
 if(!button||seen.has(button))return;
 const info=labels[button.id]||fromText(button.textContent);
 if(!info[1])return;
 // All event listeners are attached to original button, which is preserved.
 const caption=document.createElement('span');caption.className='ratib-report-action-label';caption.textContent=info[1];
 button.replaceChildren(svg(info[0]),caption);
 button.classList.add('ratib-report-action');
 button.setAttribute('aria-label',info[1]);
 if(!button.title)button.title=info[1];
 seen.add(button);
}
function budgetShortcuts(page){
 const info={budgetOpenAnalysisBtn:['chart','عرض التحليل'],budgetRefreshBtn:['refresh','تحديث البيانات'],budgetGenerateBtn:['filter','تطبيق المرشحات']};
 for(const [id,[key,label]] of Object.entries(info)){
  const button=page.querySelector('#'+id);
  if(!button||button.classList.contains('ratib-report-shortcut'))continue;
  const symbol=button.querySelector('strong');if(symbol)symbol.replaceWith(svg(key));
  button.classList.add('ratib-report-shortcut');button.setAttribute('aria-label',label);
 }
}
function scan(){
 const page=document.getElementById('pageReports');if(!page)return;
 const budgetActions=page.querySelector('#budgetReportCard>h2>span:last-child');
 if(budgetActions)budgetActions.classList.add('ratib-report-budget-actions');
 page.querySelectorAll('.ratib-special-actions button, #trialBalanceCard .report-actions button, #budgetReportCard>h2>span:last-child button, .trial-fx-toolbar button').forEach(enhance);
 budgetShortcuts(page);
}
function start(){
 scan();const page=document.getElementById('pageReports');if(!page)return;
 let scheduled=false;
 const observer=new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;
  queueMicrotask(()=>{scheduled=false;scan();});
 });
 observer.observe(page,{childList:true,subtree:true});
}
window.RatibReportButtons106={enhance,scan,version:'3.6.106'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
})();