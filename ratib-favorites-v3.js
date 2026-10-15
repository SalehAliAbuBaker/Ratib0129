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
async function settingsControl(id){
 if(!await page('pageSettings'))return;
 const control=document.getElementById(id);if(!control)return;
 const card=control.closest('.settings-accordion-card'),heading=card?.querySelector('.settings-accordion-header');
 if(card&&!card.querySelector('.settings-accordion-body')?.classList.contains('open'))heading?.click();
 control.click();
}
addChoice('add-account','إضافة حساب جديد','➕',()=>settingsControl('openAddAccountDialogBtn'));
addChoice('add-budget-item','إضافة بند ميزانية','➕',()=>settingsControl('addCatBtn'));
addChoice('legacy-import','استيراد من نظام آخر','📥',()=>document.getElementById('legacyImportSidebarBtn')?.click());
addChoice('import-management','إدارة الحسابات والأرصدة المستوردة','📁',()=>{
 const launcher=[...document.querySelectorAll('#pageSettings button')].find(b=>b.textContent.trim()==='إدارة الحسابات المستوردة');launcher?.click();
});
addChoice('reminders-list','قائمة التذكيرات والمهام','🔔',async()=>{if(await page('pageDashboard'))document.getElementById('openAddReminderModalBtn')?.closest('.card')?.scrollIntoView({block:'start'});});
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
let filterText='',filterGroup='';
const panel=document.createElement('div');panel.id='ratibFavoritesPanel';panel.className='no-print';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','المفضلة السريعة');
panel.innerHTML='<div class="fav-box"><div class="fav-head"><strong>المفضلة — وظائف مباشرة</strong><button type="button" class="fav-small" data-close aria-label="إغلاق">✕ إغلاق</button></div><div id="ratibFavItems"></div><button type="button" class="btn btn-ghost" id="ratibPinCurrent" hidden></button><div class="fav-section">تخصيص الاختصارات</div><label for="ratibFavSearch">ابحث عن الوظيفة المطلوبة</label><input id="ratibFavSearch" type="search" placeholder="مثل: قيد متعدد، عملات، ترويسة…"><label for="ratibFavGroup">القسم</label><select id="ratibFavGroup"><option value="">جميع الوظائف</option><option>السندات</option><option>التقارير</option><option>الحسابات والاستيراد</option><option>الإعدادات</option><option>النسخ والتفعيل</option><option>التذكيرات</option></select><p id="ratibFavCount" role="status" class="field-hint"></p><div id="ratibFavOptions"></div></div>';
document.body.appendChild(panel);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
document.getElementById('ratibFavItems').innerHTML=selected.length?'<div class="fav-grid">'+selected.map((id,i)=>{const a=byId[id];return '<div class="fav-item"><button type="button" class="fav-item" style="width:100%" data-go="'+id+'">'+a[2]+' '+escapeHtml(a[1])+'</button><div class="fav-row"><button class="fav-small" data-up="'+id+'" '+(i===0?'disabled':'')+'>↑</button><button class="fav-small" data-down="'+id+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="fav-small" data-remove="'+id+'">حذف</button></div></div>';}).join('')+'</div>':'<p>لا توجد مفضلة بعد. اختر من الوظائف أدناه.</p>';
renderOptions();renderCurrent();
}
function groupOf(id){
 if(['receipt','payment','simple-entry','multi-entry'].includes(id))return 'السندات';
 if(['statement','trial-balance','budget-analysis','annual-close'].includes(id))return 'التقارير';
 if(id.startsWith('setting:')||id==='add-budget-item')return 'الإعدادات';
 if(['account-tree','add-account','ledger','legacy-import','import-management'].includes(id))return 'الحسابات والاستيراد';
 if(['new-reminder','reminders-list'].includes(id))return 'التذكيرات';
 return 'النسخ والتفعيل';
}
function normalized(value){return value.normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/[\u064B-\u065F\u0670]/g,'').trim().toLowerCase();}
function renderOptions(){
 const available=choices.filter(x=>!selected.includes(x[0])&&(!filterGroup||groupOf(x[0])===filterGroup)&&normalized(x[1]).includes(normalized(filterText)));
 const groups=[...new Set(available.map(x=>groupOf(x[0])))];
 document.getElementById('ratibFavOptions').innerHTML=groups.map(group=>'<section class="fav-choice-group"><h3>'+escapeHtml(group)+'</h3><div class="fav-grid">'+available.filter(x=>groupOf(x[0])===group).map(x=>'<button type="button" class="fav-item" data-add="'+x[0]+'" aria-label="إضافة '+escapeHtml(x[1])+' إلى المفضلة">'+x[2]+' '+escapeHtml(x[1])+' ＋</button>').join('')+'</div></section>').join('')||'<p>لا توجد وظائف أخرى مطابقة للبحث.</p>';
 document.getElementById('ratibFavCount').textContent=choices.length+' وظيفة متاحة للتخصيص — '+selected.length+' في المفضلة';
}
function currentChoice(){
 const visible=id=>{const el=document.getElementById(id);return el&&!el.classList.contains('hidden');};
 if(visible('pageExpenses')){
  if(visible('multiVoucherCard'))return typeof multiVoucherMode!=='undefined'?({income:'receipt',spend:'payment','multi-entry':'multi-entry'}[multiVoucherMode]):null;
  if(visible('cashFlowCard'))return 'simple-entry';
 }
 if(visible('pageReports'))for(const [id,key] of [['reportsGroupStatementHeader','statement'],['reportsGroupBudgetHeader','budget-analysis'],['reportsGroupTrialHeader','trial-balance']])if(document.getElementById(id)?.classList.contains('open'))return key;
 if(visible('pageSettings')){
  const active=[...document.querySelectorAll('#pageSettings .settings-accordion-card')].find(card=>card.querySelector('.settings-accordion-body.open'));
  if(active)return 'setting:'+(active.id||active.querySelector('[id]')?.id);
 }
 return null;
}
function renderCurrent(){
 const id=currentChoice(),button=document.getElementById('ratibPinCurrent');
 button.hidden=!byId[id];if(!byId[id])return;
 button.textContent=(selected.includes(id)?'إزالة من المفضلة: ':'إضافة هذه الوظيفة: ')+byId[id][1];button.dataset.pin=id;
}
document.getElementById('ratibFavSearch').addEventListener('input',e=>{filterText=e.target.value;renderOptions();});
document.getElementById('ratibFavGroup').addEventListener('change',e=>{filterGroup=e.target.value;renderOptions();});
function close(){panel.classList.remove('open');}
function open(){discoverSettings();filterText='';filterGroup='';document.getElementById('ratibFavSearch').value='';document.getElementById('ratibFavGroup').value='';render();panel.classList.add('open');panel.querySelector('[data-close]').focus();}
panel.addEventListener('click',e=>{if(e.target===panel){close();return;}const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if('close'in d){close();return;}
if(d.go){close();Promise.resolve().then(()=>byId[d.go]?.run()).catch(error=>{console.error('Ratib favorite',error);window.showToast?.('تعذر فتح الاختصار؛ حاول مرة أخرى.','warn');});return;}
if(d.pin){if(selected.includes(d.pin))selected=selected.filter(x=>x!==d.pin);else selected.push(d.pin);}
if(d.add&&byId[d.add]&&!selected.includes(d.add)){selected.push(d.add);}
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
(()=>{if(document.querySelector('script[data-ratib-unified-output]'))return;const s=document.createElement('script');s.src='./ratib-unified-output.js?v=15';s.defer=true;s.dataset.ratibUnifiedOutput='1';document.head.appendChild(s);})();
