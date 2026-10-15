/* Ratib unified output system — v3.6.56
   Presentation/output only. No accounting calculations are changed here. */
(()=>{'use strict';
const STYLE_ID='ratibUnifiedOutputStyleV3613';
const SHARE_SVG='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"/></svg>';
const iconPaths={
 print:'M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6ZM17 12h1',
 preview:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 draft:'M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-7h8v7',load:'M12 20V4m-5 5 5-5 5 5M4 15v6h16v-6',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',reset:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5'
};
function iconMarkup(kind){return '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+iconPaths[kind]+'"/></svg>';}

function addStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
.ratib-output-toolbar{display:flex!important;direction:ltr!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:thin;padding:2px 0!important}
.ratib-output-icon{width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important;padding:0!important;margin:0!important;border-radius:11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font:900 18px/1 Tajawal,system-ui,sans-serif!important;box-shadow:none!important;flex:0 0 46px!important}
.ratib-output-icon>svg{display:block!important;visibility:visible!important;opacity:1!important;width:21px;height:21px;flex:none;pointer-events:none}.ratib-output-icon span,.ratib-output-icon small{display:none!important}
.ratib-output-icon[data-ratib-kind]{background:transparent!important;border-color:var(--border)!important;color:var(--accent)!important}
.ratib-output-icon[data-ratib-kind]:hover{background:color-mix(in srgb,var(--accent) 7%,transparent)!important;border-color:var(--accent)!important}
.ratib-output-icon[data-ratib-kind="pdf"],.ratib-output-icon[data-ratib-kind="a4"]{font-size:13px!important;letter-spacing:.2px}
.ratib-unified-account-actions{display:flex!important;direction:ltr!important;gap:7px!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;overflow-x:auto!important}
.ratib-date-row{display:flex!important;direction:rtl!important;align-items:end!important;gap:7px!important;flex-wrap:nowrap!important;overflow-x:auto!important;padding:8px 0!important}
.ratib-date-row label{display:flex!important;align-items:center!important;gap:5px!important;min-width:max-content!important;margin:0!important;font-weight:800!important}
.ratib-date-row label>input{width:148px!important;min-width:148px!important;margin:0!important}
#accountAdvancedSearchPanel.ratib-unified-filter{display:block!important;padding:8px 10px!important;margin-top:7px!important}
#accountAdvancedSearchPanel.ratib-unified-filter.hidden{display:none!important}
#accountAdvancedSearchPanel.ratib-unified-filter>.ratib-filter-rest{display:flex!important;gap:7px!important;align-items:end!important;flex-wrap:wrap!important;margin-top:7px!important}
#accountAdvancedSearchPanel.ratib-unified-filter>.ratib-filter-rest label{min-width:150px!important;flex:1!important;margin:0!important}
#accountStatementCard h2>span:last-child,#budgetReportCard h2>span:last-child,#trialBalanceCard h2>span:last-child{display:flex!important;direction:ltr!important;gap:7px!important;align-items:center!important;overflow-x:auto!important}
.multi-voucher-actions.ratib-voucher-actions{display:flex!important;direction:ltr!important;gap:7px!important;align-items:center!important;flex-wrap:wrap!important}
.multi-voucher-actions.ratib-voucher-actions .voucher-savebar{order:20!important;flex:1 1 100%!important;direction:rtl!important}
.multi-voucher-actions.ratib-voucher-actions .btn-danger{order:21!important;flex:1 1 100%!important}
.spend-notice-actions{gap:7px!important}.spend-notice-actions .ratib-output-icon{display:inline-flex!important}
@media screen{
 #trialBalanceCard .report-actions.ratib-output-toolbar{flex-wrap:wrap!important;direction:rtl!important;overflow:visible!important;gap:8px!important;margin:12px 0!important}
 #trialBalanceCard #trialExcelBtn{width:auto!important;flex:0 0 auto!important;min-height:46px;margin:0!important;padding:9px 14px;white-space:normal}
}
header .header-actions{direction:ltr!important}
#dashboardHomeContent>.btn.btn-ghost.no-print{display:none!important}
#filterAccountSelectBox>label{display:none!important}
@media(max-width:560px){.ratib-output-icon{width:43px!important;height:43px!important;min-width:43px!important;min-height:43px!important;flex-basis:43px!important}.ratib-date-row label>input{width:137px!important;min-width:137px!important}}
@media print{
  .ratib-output-toolbar,.ratib-output-icon,.ratib-date-row{display:none!important}
  table{border-collapse:collapse!important}thead{display:table-header-group!important}tfoot{display:table-footer-group!important}
  tr,td,th{break-inside:avoid!important;page-break-inside:avoid!important}
}
`;document.head.appendChild(s);}
function setKind(btn,kind,title){
 if(!btn)return null;
 btn.classList.add('ratib-output-icon');
 const changed=btn.dataset.ratibKind!==kind;
 if(changed)btn.dataset.ratibKind=kind;
 if(title&&btn.title!==title)btn.title=title;
 if(title&&btn.getAttribute('aria-label')!==title)btn.setAttribute('aria-label',title);
 const usesSvg=kind==='share'||Boolean(iconPaths[kind]);
 const svgReady=[...btn.children].some(el=>el.localName==='svg'&&el.getAttribute('data-ratib-output-icon')===kind);
 const textReady=btn.textContent===(kind==='pdf'?'PDF':'A4');
 // Form startup can replace button contents after the deferred UI script runs.
 // Check the rendered structure, rather than trusting a stale initialization flag.
 if(changed||!btn.dataset.ratibGlyph||(usesSvg?!svgReady:!textReady)){
  if(kind==='share')btn.innerHTML=SHARE_SVG;
  else if(iconPaths[kind])btn.innerHTML=iconMarkup(kind);
  else btn.textContent=kind==='pdf'?'PDF':'A4';
  if(usesSvg)btn.firstElementChild.setAttribute('data-ratib-output-icon',kind);
  btn.dataset.ratibGlyph='1';
 }
 return btn;
}
function orderGroup(host,items){const desired=items.filter(Boolean),current=[...host.children].filter(x=>desired.includes(x));if(current.length===desired.length&&current.every((x,i)=>x===desired[i]))return;desired.forEach(x=>host.appendChild(x));}

function directDownload(blob,name){if(!blob)return false;try{if(typeof window.downloadFinancialFile==='function'){window.downloadFinancialFile(blob,name);return true;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);return true;}catch(e){console.error('Ratib PDF download',e);return false;}}
async function directShare(blob,name,title){
 try{return await window.shareRatibDocumentFile(new File([blob],name,{type:'application/pdf'}),title);}
 catch(e){console.error(e);window.showToast?.('تعذّر تجهيز ملف المشاركة','error');return false;}
}
function ensureButton(host,id,kind,title,handler){let b=document.getElementById(id);if(!b){b=document.createElement('button');b.type='button';b.id=id;b.className='icon-btn no-print';host?.appendChild(b);}setKind(b,kind,title);if(handler&&!b.onclick&&!b.dataset.ratibBound){b.dataset.ratibBound='1';b.addEventListener('click',handler);}return b;}
function normalizeHeader(){const host=document.querySelector('header .header-actions');if(!host)return;const menu=document.getElementById('sidebarMenuBtn'),theme=document.getElementById('themeBtn');const buttons=[...host.querySelectorAll('button')],star=buttons.find(b=>b.textContent.trim()==='☆'),exit=buttons.find(b=>b.textContent.trim()==='🚪');orderGroup(host,[menu,theme,star,exit]);}
function normalizeAccountDates(){const panel=document.getElementById('accountAdvancedSearchPanel');if(!panel||panel.dataset.ratibLayout==='1')return;panel.dataset.ratibLayout='1';panel.classList.add('ratib-unified-filter');const from=document.getElementById('accountOpsFromDate'),to=document.getElementById('accountOpsToDate'),currency=document.getElementById('accountOpsCurrencyFilter'),apply=document.getElementById('applyAccountOpsFilterBtn'),clear=document.getElementById('clearAccountOpsFilterBtn');if(!from||!to)return;const fromLabel=from.closest('label'),toLabel=to.closest('label');if(fromLabel){[...fromLabel.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());fromLabel.prepend(document.createTextNode('من'));}if(toLabel){[...toLabel.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());toLabel.prepend(document.createTextNode('إلى'));}const row=document.createElement('div');row.className='ratib-date-row no-print';panel.prepend(row);row.append(fromLabel,toLabel);if(clear){setKind(clear,'reset','إعادة الضبط');row.append(clear);}const rest=document.createElement('div');rest.className='ratib-filter-rest no-print';panel.append(rest);const currencyLabel=currency?.closest('label');if(currencyLabel)rest.append(currencyLabel);if(apply){apply.textContent='✓';apply.title='تطبيق الفلترة';apply.setAttribute('aria-label','تطبيق الفلترة');apply.classList.add('ratib-output-icon');apply.dataset.ratibKind='search';rest.append(apply);}}
function normalizeAccountToolbar(){
 // The current account screen already routes all secondary actions through its drawer.
 // Leave its return button and three-action layout intact.
 normalizeAccountDates();
}
function togglePaper(){window.ratibTogglePaperOrientation?.();}
function restorePaper(){window.ratibUpdatePaperOrientation?.();}
function normalizeReportToolbar(cardId,printId,shareId,pdfId,pdfBuilder,pdfName,previewId,previewHandler){
 const card=document.getElementById(cardId);
 const host=cardId==='trialBalanceCard'?card?.querySelector('.report-actions'):card?.querySelector('h2>span:last-child');
 if(!host)return;
 host.classList.add('ratib-output-toolbar');
 if(cardId==='trialBalanceCard'){host.setAttribute('role','group');host.setAttribute('aria-label','أدوات ميزان المراجعة');}
 const print=document.getElementById(printId),share=document.getElementById(shareId);
 setKind(print,'print','طباعة');setKind(share,'share','مشاركة PDF');
 const preview=ensureButton(host,previewId,'preview','معاينة قبل الطباعة',previewHandler);
 const a4=ensureButton(host,`ratib-${cardId}-a4`,'a4','A4 / اتجاه الصفحة',togglePaper);
 const pdf=ensureButton(host,pdfId,'pdf','تنزيل PDF',()=>{
  try{const blob=pdfBuilder();if(blob&&directDownload(blob,pdfName))window.showToast?.('تم تنزيل ملف PDF','success');}
  catch(e){console.error(e);window.showToast?.('تعذّر تنزيل ملف PDF','error');}
 });
 orderGroup(host,[a4,preview,print,pdf,share,cardId==='trialBalanceCard'?document.getElementById('trialExcelBtn'):null]);
}
function budgetPdf(){window.runBudgetReport();return window.buildPdfFromCanvases(window.renderBudgetCanvases());}
function normalizeReports(){
 normalizeReportToolbar('budgetReportCard','printBudgetReportBtn','shareBudgetReportPdfBtn','ratibBudgetPdfBtn',budgetPdf,'راتب-الميزانية.pdf','ratibBudgetPreviewBtn',()=>window.outputBudgetReport(true));
 normalizeReportToolbar('trialBalanceCard','printTrialBalanceBtn','shareTrialBalancePdfBtn','ratibTrialPdfBtn',()=>window.buildTrialBalancePdf(),'راتب-ميزان-المراجعة.pdf','trialPreviewBtn',()=>window.trialPreview());
 const host=document.querySelector('#accountStatementCard h2>span:last-child');
 if(host){
  host.classList.add('ratib-output-toolbar');
  const search=document.getElementById('reportAdvToggleBtn'),print=document.getElementById('printStatementBtn'),share=document.getElementById('shareStatementPdfBtn');
  setKind(search,'search','بحث وتصفية');setKind(print,'print','طباعة');setKind(share,'share','مشاركة PDF');
  const preview=ensureButton(host,'ratibStatementPreviewBtn','preview','معاينة قبل الطباعة',()=>window.requestReportStatementOutput('preview'));
  const a4=ensureButton(host,'ratibReportStatementA4Btn','a4','A4 / اتجاه الصفحة',togglePaper);
  const pdf=ensureButton(host,'ratibReportStatementPdfBtn','pdf','تنزيل PDF',()=>window.requestReportStatementOutput('download'));
  orderGroup(host,[search,a4,preview,print,pdf,share]);
 }
}
function currentVoucherData(){if(typeof window.validateMultiVoucher==='function'){const err=window.validateMultiVoucher();if(err){window.showToast?.(err,'warn');return null;}}return typeof window.buildMultiVoucherData==='function'?window.buildMultiVoucherData('draft'):null;}
function voucherBlob(data){return data&&typeof window.buildMultiVoucherPdf==='function'?window.buildMultiVoucherPdf(data):null;}
function voucherName(data){const mode=data?.mode;const name=mode==='income'?'سند-قبض':mode==='spend'?'سند-صرف':'سند-قيد';return `${name}-${data?.seq||''}.pdf`;}
function previewCurrentVoucher(){
 try{const d=currentVoucherData();if(!d)return;window.prepareMultiVoucherPrint(d);window.openPrintPreview('printVoucherContainer','printing-voucher');}
 catch(e){console.error(e);window.showToast?.('تعذّر تجهيز معاينة السند','error');}
}
function normalizeVoucher(){
 const host=document.querySelector('#multiVoucherCard .multi-voucher-actions');if(!host)return;
 host.classList.add('ratib-voucher-actions','ratib-output-toolbar');
 const draft=document.getElementById('saveMultiDraftBtn'),load=document.getElementById('loadMultiDraftBtn'),print=document.getElementById('printMultiVoucherBtn'),pdf=document.getElementById('pdfMultiVoucherBtn');
 setKind(draft,'draft','حفظ مسودة');setKind(load,'load','فتح آخر مسودة');setKind(print,'print','طباعة');setKind(pdf,'pdf','تنزيل PDF');
 const preview=ensureButton(host,'ratibMultiVoucherPreviewBtn','preview','معاينة قبل الطباعة',previewCurrentVoucher);
 const share=ensureButton(host,'ratibMultiVoucherShareBtn','share','مشاركة PDF',async()=>{const d=currentVoucherData();if(d)await directShare(voucherBlob(d),voucherName(d),d.mode==='income'?'سند قبض':d.mode==='spend'?'سند صرف':'سند قيد');});
 const a4=ensureButton(host,'ratibMultiVoucherA4Btn','a4','A4 / اتجاه الصفحة',togglePaper);
 orderGroup(host,[a4,preview,print,pdf,share,draft,load]);
 // Also handle an older cached HTML page loading this newer script: first move
 // the existing controls into the unified toolbar, then remove redundant rows.
 document.querySelectorAll('#multiVoucherCard .ratib-icon-tools,#ratibMultiEditPrint').forEach(el=>el.remove());
 for(const [printId,previewId,handler] of [
  ['modalPrintDocBtn','ratibModalVoucherPreviewBtn',()=>window.previewEditingVoucher()],
  ['confirmPrintDocBtn','ratibConfirmedVoucherPreviewBtn',()=>window.previewLastVoucher()],
  ['printSavedSpendBtn','ratibSavedVoucherPreviewBtn',()=>window.previewLastVoucher()]
 ]){
  const button=document.getElementById(printId);if(!button)continue;
  setKind(button,'print','طباعة');ensureButton(button.parentElement,previewId,'preview','معاينة قبل الطباعة',handler);
 }
 ['modalPdfDocBtn','confirmPdfDocBtn','downloadSavedSpendBtn'].forEach(id=>setKind(document.getElementById(id),'pdf','تنزيل PDF'));
 setKind(document.getElementById('shareSavedSpendBtn'),'share','مشاركة PDF');
}
function normalizeSimpleVoucher(){
 const host=document.getElementById('ratibSimpleVoucherTools');if(!host)return;
 const a4=ensureButton(host,'ratibSimpleVoucherA4Btn','a4','A4 / اتجاه الصفحة',togglePaper);
 const preview=ensureButton(host,'ratibSimpleVoucherPreviewBtn','preview','معاينة قبل الطباعة',()=>window.outputCurrentSimpleVoucher('preview'));
 const print=ensureButton(host,'ratibSimpleVoucherPrintBtn','print','طباعة',()=>window.outputCurrentSimpleVoucher('print'));
 const pdf=ensureButton(host,'ratibSimpleVoucherPdfBtn','pdf','تنزيل PDF',()=>window.outputCurrentSimpleVoucher('download'));
 const share=ensureButton(host,'ratibSimpleVoucherShareBtn','share','مشاركة PDF',()=>window.outputCurrentSimpleVoucher('share'));
 orderGroup(host,[a4,preview,print,pdf,share]);
}
function cleanUi(){const home=document.getElementById('dashboardHomeContent');if(home)[...home.children].forEach(el=>{if(el.matches('button.btn.btn-ghost.no-print')&&/المفضلة السريعة/.test(el.textContent))el.style.display='none';});const label=document.querySelector('#filterAccountSelectBox>label');if(label)label.style.display='none';}
function run(){addStyle();normalizeHeader();normalizeAccountToolbar();normalizeReports();normalizeVoucher();normalizeSimpleVoucher();cleanUi();restorePaper();}
let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run();});});
function start(){run();observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.RatibUnifiedOutput={refresh:run,togglePaper};
})();
