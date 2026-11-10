/* Ratib 3.6.175 — primary reports menu mirrors the six home tiles.
 * Reparent the existing report headings (do NOT clone them): original event
 * listeners, history, data, filters, printing and PDF handlers stay intact. */
(()=>{'use strict';
 const PAGE='pageReports',MENU='ratibReportsTiles175';
 const ITEMS=[
  ['reportsGroupBudgetHeader','بنود الميزانية','chart'],
  ['reportsGroupMovementHeader','حركة الحسابات','movement'],
  ['reportsGroupPositionHeader','المركز المالي','position'],
  ['reportsGroupTrialHeader','ميزان المراجعة','balance']
 ];
 const P={
  chart:'<path d="M4 4v16h16M7 15l4-4 4 2 5-7M16 6h4v4"/>',
  movement:'<path d="M8 5H5v16h14V5h-3M8 3h8v4H8zM8 11h8M8 15h8M8 18h5"/>',
  position:'<path d="M3 10h18M5 10v10m5-10v10m4-10v10m5-10v10M2 21h20M3 9l9-6 9 6"/>',
  balance:'<path d="M12 3v18M4 7h16M7 7l-4 7h8l-4-7M17 7l-4 7h8l-4-7M8 21h8"/>'
 };
 const by=id=>document.getElementById(id);
 function makeIcon(kind){
  const circle=document.createElement('span');circle.className='ratib-report-primary-icon';circle.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(k,v);
  svg.innerHTML=P[kind];circle.append(svg);return circle;
 }
 function mount(){
  const page=by(PAGE);if(!page||by(MENU))return;
  const headers=ITEMS.map(([id])=>by(id));if(headers.some(x=>!x||!page.contains(x)))return;
  const menu=document.createElement('nav');menu.id=MENU;menu.className='ratib-reports-primary-grid no-print';menu.setAttribute('aria-label','أقسام التقارير');
  const check=()=>{
   for(const head of headers){
    const isOpen=head.classList.contains('open');
    if(head.getAttribute('aria-expanded')!==String(isOpen))head.setAttribute('aria-expanded',String(isOpen));
    head.classList.toggle('ratib-report-primary-active',isOpen);
   }
  };
  ITEMS.forEach(([id,label,kind],i)=>{
   const head=headers[i]; // Keep the actual original node and all registered listeners.
   head.classList.add('ratib-report-primary-tile');
   head.setAttribute('role','button');head.setAttribute('tabindex','0');
   head.setAttribute('aria-label',label);
   const caption=document.createElement('span');caption.className='ratib-report-primary-label';caption.textContent=label;
   head.replaceChildren(makeIcon(kind),caption);
   head.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();head.click();}});
   menu.append(head);
  });
  const anchor=by('reportsGroupStatementBody');
  if(anchor&&anchor.parentElement===page)anchor.after(menu);else page.prepend(menu);
  const observer=new MutationObserver(check);
  for(const head of headers)observer.observe(head,{attributes:true,attributeFilter:['class']});
  check();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();