/* Ratib unified output UI — approved 2026-10-11, direct integration */
(()=>{'use strict';
const STYLE_ID='ratibUnifiedOutputStyle';
function addStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
.ratib-output-icon{width:54px!important;height:54px!important;min-width:54px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:12px!important;font-size:21px!important;line-height:1!important}
.ratib-output-icon.ratib-text-icon{font-size:13px!important;font-weight:900!important}
.ratib-unified-account-actions{display:flex!important;gap:8px!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;overflow-x:auto!important}
.ratib-unified-account-actions .account-inline-action span{display:none!important}
#accountAdvancedSearchPanel.ratib-unified-filter{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(125px,.8fr) auto auto;gap:8px;align-items:end;padding:10px;margin-top:8px}
#accountAdvancedSearchPanel.ratib-unified-filter.hidden{display:none!important}
#accountAdvancedSearchPanel.ratib-unified-filter label{margin:0!important}
.ratib-unified-voucher-actions{display:flex!important;gap:8px!important;align-items:center!important;flex-wrap:wrap!important}
header .header-actions{direction:ltr!important}
#dashboardHomeContent>.btn.btn-ghost.no-print{display:none!important}
#pageDashboard .main-menu-grid::before{display:none!important}
#filterAccountSelectBox>label{display:none!important}
@media(max-width:560px){#accountAdvancedSearchPanel.ratib-unified-filter{grid-template-columns:1fr 1fr!important}.ratib-output-icon{width:52px!important;height:52px!important;min-width:52px!important}}
@media print{.ratib-output-icon{display:none!important}table{border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}}
`;document.head.appendChild(s);}
const shareSvg='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"/></svg>';
function iconify(b,type){if(!b)return;b.classList.add('ratib-output-icon');b.dataset.ratibUnified='1';
 if(type==='pdf'){b.textContent='PDF';b.classList.add('ratib-text-icon');}
 else if(type==='share'){b.innerHTML=shareSvg;}
 else if(type==='print'){b.textContent='🖨';}
 else if(type==='preview'){b.textContent='👁';}
 else if(type==='download'){b.textContent='⬇';}
 else if(type==='a4'){b.textContent='A4';b.classList.add('ratib-text-icon');}
 b.querySelectorAll('span,small').forEach(x=>x.remove());
}
function classify(b){const t=((b.title||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase();
 if(/مشارك/.test(t)&&!/pdf/.test(t))return'share';if(/pdf/.test(t))return'pdf';if(/طباع/.test(t))return'print';if(/معاين/.test(t))return'preview';if(/تنزيل|تحميل/.test(t))return'download';if(/a4|حجم الورق|اتجاه الصفحة/.test(t))return'a4';return'';}
function normalizeButtons(){document.querySelectorAll('button').forEach(b=>{const t=classify(b);if(t)iconify(b,t);});}
function normalizeAccount(){
 const actions=document.querySelector('#pageAccountOperations .account-inline-actions');
 if(actions){actions.classList.add('ratib-unified-account-actions');actions.querySelectorAll('button').forEach(b=>{const a=b.dataset.accountAction||'';
  if(a==='advanced'){b.textContent='🔎';b.title='بحث';}
  else if(a==='print'){b.textContent='🖨';b.title='طباعة';}
  else if(a==='share'){b.textContent='PDF';b.title='PDF / مشاركة';b.classList.add('ratib-text-icon');}
  else if(a==='documentQuery'){b.textContent='⌕';b.title='استفسار';}
  else if(a==='close'){b.textContent='←';b.title='رجوع';}
  b.classList.add('ratib-output-icon');});}
 const p=document.getElementById('accountAdvancedSearchPanel');if(p)p.classList.add('ratib-unified-filter');
 const clear=document.getElementById('clearAccountOpsFilterBtn');if(clear){clear.textContent='↻';clear.title='إعادة الضبط';clear.classList.add('ratib-output-icon');}
}
function normalizeVoucher(){
 const p=document.getElementById('printMultiVoucherBtn'),pdf=document.getElementById('pdfMultiVoucherBtn');iconify(p,'print');iconify(pdf,'pdf');
 const save=document.getElementById('commitMultiVoucherBtn');if(save){const host=save.parentElement?.parentElement;if(host)host.classList.add('ratib-unified-voucher-actions');}
}
function cleanRedundantUi(){
 const home=document.getElementById('dashboardHomeContent');
 if(home){[...home.children].forEach(el=>{if(el.matches('button.btn.btn-ghost.no-print')&&/المفضلة السريعة/.test(el.textContent))el.style.display='none';});}
 const label=document.querySelector('#filterAccountSelectBox>label');if(label)label.style.display='none';
}
function normalizeHeader(){const a=document.querySelector('header .header-actions');if(!a)return;const btn=[...a.querySelectorAll('button')];const exit=btn.find(b=>b.textContent.trim()==='🚪'),star=btn.find(b=>b.textContent.trim()==='☆'),menu=document.getElementById('sidebarMenuBtn'),theme=document.getElementById('themeBtn');[exit,menu,theme,star].filter(Boolean).forEach(b=>a.appendChild(b));}
function run(){addStyle();normalizeButtons();normalizeAccount();normalizeVoucher();normalizeHeader();cleanRedundantUi();}
let q=false;const o=new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;run();});});
function start(){run();o.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();