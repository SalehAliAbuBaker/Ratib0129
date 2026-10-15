/* Ratib quick favorites and shared output controls — additive, no accounting data changes. */
(()=>{'use strict';
const KEY='ratib.quickFavorites.v2';
const oldKey='ratib.quickFavorites.v1';
const choices=[];
const byId=Object.create(null);
function addChoice(id,label,icon,run){if(byId[id])return;const item=[id,label,icon];item.run=run;choices.push(item);byId[id]=item;}
async function page(id){
 if(typeof _appHistoryPending!=='undefined'&&_appHistoryPending)await _appHistoryPending.promise;
 if(typeof window.navigateToTab!=='function')return false;
 window.navigateToTab(id,true);
 return !document.getElementById(id)?.classList.contains('hidden');
}
const sidebar=action=>()=>document.querySelector('[data-sidebar-action="'+action+'"]')?.click();
for(const [id,label,mode] of [['receipt','سند قبض','income'],['payment','سند صرف','spend'],['simple-entry','سند قيد بسيط','entry'],['multi-entry','سند قيد متعدد','multi-entry']]){
 addChoice(id,label,'🧾',async()=>{if(!await page('pageExpenses'))return;if(mode==='multi-entry')window.selectMultiVoucherType?.();else window.selectVoucherTypeDirect?.(mode);});
}
for(const [id,label,target] of [['statement','كشف الحساب','reportsGroupStatementHeader'],['budget-analysis','تحليل بنود الميزانية','reportsGroupBudgetHeader'],['trial-balance','ميزان المراجعة','reportsGroupTrialHeader']]){
 addChoice(id,label,'📑',async()=>{if(!await page('pageReports'))return;const button=document.getElementById(target);if(button&&!button.classList.contains('open'))button.click();});
}
addChoice('annual-close','الإغلاق السنوي','🔒',async()=>{if(await page('pageReports'))document.getElementById('yearToolOpen')?.click();});
addChoice('ledger','سجل العمليات','📋',()=>page('pageLedger'));
addChoice('account-tree','شجرة الحسابات','📁',()=>page('pageAccountsTree'));
addChoice('new-reminder','إضافة تذكير','🔔',()=>window.openReminderModal?.(-1));
for(const [id,label,action] of [['license','إدخال كود التفعيل وحالته','license'],['backup-file','إنشاء نسخة احتياطية','backup'],['restore-file','استعادة نسخة من ملف','restore'],['cloud-backup','النسخ عبر Google Drive','drive'],['about','حول التطبيق','about']])addChoice(id,label,'⚙️',sidebar(action));
function discoverSettings(){
 document.querySelectorAll('#pageSettings .settings-accordion-card').forEach(card=>{
  const heading=card.querySelector('.settings-accordion-header');
  if(!heading)return;
  const label=(heading.querySelector('span')||heading).textContent.replace(/\p{Extended_Pictographic}|[\uFE0F▼]/gu,'').trim();
  const anchor=card.id||card.querySelector('[id]')?.id;
  if(!anchor||!label)return;
  addChoice('setting:'+anchor,label,'⚙️',async()=>{if(!await page('pageSettings'))return;const body=card.querySelector('.settings-accordion-body');if(body&&!body.classList.contains('open'))heading.click();heading.scrollIntoView?.({block:'center'});});
 });
}
discoverSettings();
const migrated={pageLedger:'ledger',pageAccountsTree:'account-tree',pageAccountOperations:'statement'};
let selected=[];
try{const saved=localStorage.getItem(KEY);const v=JSON.parse(saved??localStorage.getItem(oldKey)??'[]');if(Array.isArray(v))selected=[...new Set(v.map(id=>saved?id:migrated[id]).filter(id=>byId[id]))];}catch(_){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(selected));}catch(e){console.warn('تعذر حفظ المفضلة',e);}};
const css=document.createElement('style');css.textContent=`
.ratib-quick-btn{font-size:1.15rem!important;min-width:38px;min-height:38px}
#ratibFavoritesPanel{position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.56);display:none;align-items:center;justify-content:center;padding:16px}
#ratibFavoritesPanel.open{display:flex}
#ratibFavoritesPanel .fav-box{background:var(--card,#fff);color:var(--text,#111);width:min(520px,100%);max-height:85vh;overflow:auto;border-radius:16px;padding:18px;box-shadow:0 12px 45px #0004}
#ratibFavoritesPanel .fav-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
#ratibFavoritesPanel .fav-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#ratibFavoritesPanel .fav-item{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--bg,#fafafa);color:var(--text,#111);text-align:center;cursor:pointer;font:inherit}
#ratibFavoritesPanel .fav-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
#ratibFavoritesPanel .fav-small{border:1px solid var(--border,#ddd);background:var(--card,#fff);color:var(--text,#111);border-radius:8px;padding:5px 8px;cursor:pointer}
#ratibFavoritesPanel .fav-section{margin:16px 0 8px;font-weight:bold}
@media print{#ratibFavoritesPanel,.ratib-quick-btn{display:none!important}
table{border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}
.no-print{display:none!important}}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.id='ratibFavoritesPanel';panel.className='no-print';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','المفضلة السريعة');
panel.innerHTML='<div class="fav-box"><div class="fav-head"><strong>⭐ المفضلة السريعة</strong><button type="button" class="fav-small" data-close aria-label="إغلاق">✕ إغلاق</button></div><div id="ratibFavItems"></div><div class="fav-section">إضافة اختصار لوظيفة محددة</div><div id="ratibFavOptions" class="fav-grid"></div></div>';
document.body.appendChild(panel);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
document.getElementById('ratibFavItems').innerHTML=selected.length?'<div class="fav-grid">'+selected.map((id,i)=>{const a=byId[id];return '<div class="fav-item"><button type="button" class="fav-item" style="width:100%" data-go="'+id+'">'+a[2]+' '+escapeHtml(a[1])+'</button><div class="fav-row"><button class="fav-small" data-up="'+id+'" '+(i===0?'disabled':'')+'>↑</button><button class="fav-small" data-down="'+id+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="fav-small" data-remove="'+id+'">حذف</button></div></div>';}).join('')+'</div>':'<p>لا توجد مفضلة بعد. اختر من الوظائف أدناه.</p>';
document.getElementById('ratibFavOptions').innerHTML=choices.filter(x=>!selected.includes(x[0])).map(x=>'<button type="button" class="fav-item" data-add="'+x[0]+'">'+x[2]+' '+escapeHtml(x[1])+' ＋</button>').join('')||'<p>أضفت جميع الاختصارات المتاحة.</p>';
}
function close(){panel.classList.remove('open');}
function open(){discoverSettings();render();panel.classList.add('open');panel.querySelector('[data-close]').focus();}
panel.addEventListener('click',e=>{if(e.target===panel){close();return;}const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if('close'in d){close();return;}
if(d.go){close();Promise.resolve().then(()=>byId[d.go]?.run()).catch(error=>{console.error('Ratib favorite',error);window.showToast?.('تعذر فتح الاختصار؛ حاول مرة أخرى.','warn');});return;}
if(d.add){selected.push(d.add);}
if(d.remove){selected=selected.filter(x=>x!==d.remove);}
if(d.up||d.down){const id=d.up||d.down,i=selected.indexOf(id),j=i+(d.up?-1:1);if(j>=0&&j<selected.length)[selected[i],selected[j]]=[selected[j],selected[i]];}
save();render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))close();});
const actions=document.querySelector('header .header-actions');
let star=null, exit=null;
if(actions){
star=document.createElement('button');star.type='button';star.className='icon-btn ratib-quick-btn';star.textContent='☆';star.title='المفضلة السريعة';star.setAttribute('aria-label','فتح المفضلة السريعة');star.addEventListener('click',open);actions.prepend(star);
exit=document.createElement('button');exit.type='button';exit.className='icon-btn ratib-quick-btn';exit.textContent='🚪';exit.title='الخروج';exit.setAttribute('aria-label','الخروج من التطبيق');exit.addEventListener('click',()=>{
if(!confirm('هل تريد الخروج من التطبيق؟ تأكد من حفظ التعديلات أولاً.'))return;
const editing=[...document.querySelectorAll('input,textarea,select')].some(el=>el.matches(':focus')&&!el.disabled);
if(editing&&!confirm('قد تكون هناك تعديلات لم تُحفظ. هل تريد المتابعة؟'))return;
close();const screen=document.createElement('div');screen.style.cssText='position:fixed;inset:0;z-index:999999;background:var(--bg,#fff);color:var(--text,#111);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px';screen.innerHTML='<div><h2>تم الخروج من واجهة راتب</h2><p style="margin:16px 0">يمكنك إغلاق علامة التبويب أو العودة إلى التطبيق.</p><button id="ratibResumeApp" class="btn btn-primary" type="button">العودة إلى التطبيق</button></div>';document.body.appendChild(screen);screen.querySelector('button').onclick=()=>screen.remove();
});actions.append(exit);
}
const home=document.querySelector('#dashboardHomeContent');
if(home){const b=document.createElement('button');b.type='button';b.className='btn btn-ghost no-print';b.style.cssText='width:100%;margin:10px 0';b.textContent='⭐ المفضلة السريعة';b.onclick=open;home.prepend(b);}

// Desktop-safe direct bindings: do not depend on the deferred application init chain.
const menuBtn=document.getElementById('sidebarMenuBtn');
if(menuBtn){menuBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.openRatibSidebar==='function')window.openRatibSidebar();};}
const themeBtn=document.getElementById('themeBtn');
if(themeBtn){themeBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();const root=document.documentElement,next=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=next;try{localStorage.setItem('theme',JSON.stringify(next));}catch(_){}themeBtn.textContent=next==='dark'?'☀️':'🌙';};}
if(star){star.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();open();};}
if(exit){exit.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.showExitModal==='function'){window.showExitModal();return;}if(!confirm('هل تريد الخروج من التطبيق؟'))return;location.reload();};}
window.RatibQuickFavorites={open,close};
})();

/* Load the approved unified output UI without touching accounting logic. */
(()=>{if(document.querySelector('script[data-ratib-unified-output]'))return;const s=document.createElement('script');s.src='./ratib-unified-output.js?v=13';s.defer=true;s.dataset.ratibUnifiedOutput='1';document.head.appendChild(s);})();
