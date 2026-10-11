/* Ratib unified output UI — approved 2026-10-11 */
(()=>{
'use strict';
const STYLE_ID='ratibUnifiedOutputStyle';
function addStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
.ratib-output-icon{width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:10px!important;font-size:18px!important;line-height:1!important}
.ratib-output-icon.ratib-text-icon{font-size:11px!important;font-weight:900!important;letter-spacing:-.2px}
.ratib-output-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ratib-output-date-row{display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:nowrap!important}
.ratib-output-date-row label{display:flex!important;align-items:center!important;gap:5px!important;margin:0!important;white-space:nowrap!important}
.ratib-output-date-row label input[type=date]{min-width:0!important}
@media(max-width:560px){.ratib-output-date-row{gap:4px!important}.ratib-output-date-row label{font-size:12px!important;gap:3px!important}.ratib-output-date-row label input[type=date]{font-size:12px!important;padding-inline:4px!important}.ratib-output-icon{width:38px!important;height:38px!important;min-width:38px!important}}
@media print{.ratib-output-icon,.ratib-output-date-row button{display:none!important}}
`;document.head.appendChild(s);
}
const shareSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.4"></circle><circle cx="6" cy="12" r="2.4"></circle><circle cx="18" cy="19" r="2.4"></circle><path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"></path></svg>';
function iconify(btn,type){
 if(!btn||btn.dataset.ratibUnified==='1')return;
 btn.dataset.ratibUnified='1';btn.classList.add('ratib-output-icon');
 if(type==='pdf'){btn.textContent='PDF';btn.classList.add('ratib-text-icon');btn.setAttribute('aria-label','PDF');}
 else if(type==='a4'){btn.textContent='A4';btn.classList.add('ratib-text-icon');btn.setAttribute('aria-label','A4');}
 else if(type==='share'){btn.innerHTML=shareSvg;btn.setAttribute('aria-label','مشاركة');}
 else if(type==='print'){btn.textContent='🖨';btn.setAttribute('aria-label','طباعة');}
 else if(type==='preview'){btn.textContent='👁';btn.setAttribute('aria-label','معاينة');}
 else if(type==='download'){btn.textContent='⬇';btn.setAttribute('aria-label','تنزيل');}
 else if(type==='search'){btn.textContent='⌕';btn.setAttribute('aria-label','بحث');}
 btn.querySelectorAll(':scope > span').forEach(x=>x.remove());
}
function classify(btn){
 const t=((btn.title||'')+' '+(btn.getAttribute('aria-label')||'')+' '+(btn.textContent||'')).toLowerCase();
 if(/pdf/.test(t))return 'pdf';
 if(/a4|اتجاه الورق|اتجاه الصفحة|حجم الورق/.test(t))return 'a4';
 if(/مشارك/.test(t))return 'share';
 if(/طباع/.test(t))return 'print';
 if(/معاين/.test(t))return 'preview';
 if(/تنزيل|تحميل/.test(t))return 'download';
 return '';
}
function normalizeButtons(root=document){
 root.querySelectorAll('button').forEach(b=>{const type=classify(b);if(type)iconify(b,type);});
}
function normalizeAccountDates(){
 const p=document.getElementById('accountAdvancedSearchPanel');if(!p)return;
 const from=document.getElementById('accountOpsFromDate'),to=document.getElementById('accountOpsToDate');
 if(!from||!to)return;
 p.classList.add('ratib-output-date-row');
 const lf=from.closest('label'),lt=to.closest('label');
 if(lf)lf.childNodes.forEach(n=>{if(n.nodeType===3&&n.textContent.trim())n.textContent='من ';});
 if(lt)lt.childNodes.forEach(n=>{if(n.nodeType===3&&n.textContent.trim())n.textContent='إلى ';});
 const clear=document.getElementById('clearAccountOpsFilterBtn');
 if(clear){clear.textContent='↻';clear.title='إعادة الضبط';clear.setAttribute('aria-label','إعادة الضبط');clear.classList.add('ratib-output-icon');}
}
function run(){addStyle();normalizeButtons();normalizeAccountDates();}
let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});});
document.addEventListener('DOMContentLoaded',()=>{run();obs.observe(document.body,{childList:true,subtree:true});});
if(document.readyState!=='loading')setTimeout(()=>{run();obs.observe(document.body,{childList:true,subtree:true});},0);
})();