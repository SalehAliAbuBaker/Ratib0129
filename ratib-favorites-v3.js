/* Ratib quick favorites and shared output controls — additive, no accounting data changes. */
(()=>{'use strict';
const KEY='ratib.quickFavorites.v2';
const oldKey='ratib.quickFavorites.v1';
const choices=[];
const byId=Object.create(null);
const favoriteGroups=Object.create(null);
const ICON_KEY='ratib.quickFavorites.icons.v1';
const ICON_CHOICES=['🧾','💰','💵','📥','📤','📋','📑','📊','📈','⚖️','🏦','💼','📁','🗂️','🔒','⚙️','💾','☁️','🧮','🔔','🗓️','⭐','❤️','➕','🔎','🏠','📝','📌','🔧','👤'];
let savedIcons={};
try{const value=JSON.parse(localStorage.getItem(ICON_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))for(const [id,icon] of Object.entries(value))if(ICON_CHOICES.includes(icon))savedIcons[id]=icon;}catch(_){}
function persistIcons(){try{localStorage.setItem(ICON_KEY,JSON.stringify(savedIcons));}catch(error){console.warn('تعذر حفظ أيقونات المفضلة',error);}}

function addChoice(id,label,icon,run){if(byId[id]){byId[id][1]=label;byId[id].run=run;return;}const item=[id,label,savedIcons[id]||icon];item.run=run;choices.push(item);byId[id]=item;}
async function page(id){
 if(typeof _appHistoryPending!=='undefined'&&_appHistoryPending)await _appHistoryPending.promise;
 if(typeof window.navigateToTab!=='function')return false;
 window.navigateToTab(id,true);
 return !document.getElementById(id)?.classList.contains('hidden');
}
const sidebar=action=>()=>document.querySelector('[data-sidebar-action="'+action+'"]')?.click();
for(const [id,label,target] of [['home','الرئيسية','pageDashboard'],['new-voucher','إضافة سند','pageExpenses'],['reports-home','التقارير','pageReports']])addChoice(id,label,'🏠',()=>page(target));
for(const [id,label,mode] of [['receipt','سند قبض','income'],['payment','سند صرف','spend'],['simple-entry','سند قيد بسيط','entry'],['multi-entry','سند قيد متعدد','multi-entry']]){
 addChoice(id,label,'🧾',async()=>{if(!await page('pageExpenses'))return;if(mode==='multi-entry')window.selectMultiVoucherType?.();else window.selectVoucherTypeDirect?.(mode);});
}
for(const [id,label,target] of [['budget-analysis','تحليل بنود الميزانية','reportsGroupBudgetHeader'],['trial-balance','ميزان المراجعة','reportsGroupTrialHeader']]){
 addChoice(id,label,'📑',async()=>{if(!await page('pageReports'))return;const button=document.getElementById(target);if(button&&!button.classList.contains('open'))button.click();});
}
async function openReportGroup(target){
 if(!await page('pageReports'))return;
 const heading=document.getElementById(target),section=document.getElementById(target.replace(/Header$/,'Body'));
 if(!heading||heading.classList.contains('hidden')||heading.style.display==='none')throw Error('التقرير غير متاح في هذه النسخة.');
 if(!section?.classList.contains('open'))heading.click();
}
for(const [id,label,target] of [['movement-report','حركة الحسابات','reportsGroupMovementHeader'],['position-report','المركز المالي','reportsGroupPositionHeader']])addChoice(id,label,'📊',()=>openReportGroup(target));
function discoverReports(){
 const builtIn=new Set(['reportsGroupBudgetHeader','reportsGroupTrialHeader','reportsGroupMovementHeader','reportsGroupPositionHeader','reportsGroupStatementHeader']);
 document.querySelectorAll('#pageReports [id^="reportsGroup"][id$="Header"]').forEach(heading=>{
  if(builtIn.has(heading.id)||heading.classList.contains('hidden')||heading.style.display==='none')return;
  const label=heading.textContent.replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim();
  if(label)addChoice('report:'+heading.id,label,'📑',()=>openReportGroup(heading.id));
 });
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
const commerceFavorites=[
 ['stock','المخزون',[['products','بطاقة الصنف'],['warehouses','إدارة المخازن'],['movements','حركة المخزون'],['summary','تقارير المخزون']]],
 ['purchase','الوارد',[['new','مستند جديد — الوارد'],['new:أمر توريد','أمر توريد'],['new:توريد مخزني','توريد مخزني'],['new:فاتورة مشتريات','فاتورة مشتريات'],['return','مرتجعات الوارد'],['records','سجل مستندات الوارد'],['people','الموردون'],['summary','تقارير الوارد']]],
 ['sale','الصادر',[['new','مستند جديد — الصادر'],['new:أمر صرف','أمر صرف'],['new:صرف مخزني','صرف مخزني'],['new:فاتورة مبيعات','فاتورة مبيعات'],['return','مرتجعات الصادر'],['records','سجل مستندات الصادر'],['people','العملاء'],['summary','تقارير الصادر']]]
];
for(const [target,group,items] of commerceFavorites)for(const [screen,label] of items){
 const id='commerce:'+target+':'+screen;
 addChoice(id,label,target==='stock'?'📦':target==='purchase'?'📥':'📤',async()=>{
  if(!window.RatibCommerce?.openFavorite)throw Error('تعذر فتح قسم التجارة؛ حدّث التطبيق إلى الإصدار الجديد.');
  await window.RatibCommerce.openFavorite(target,screen);
 });
}
// Retain already selected legacy shortcuts, all pointing to the one settings location.
for(const target of ['stock','purchase','sale']){
 const legacy='commerce:'+target+':accounts';
 let saved=[];try{saved=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){}
 if(Array.isArray(saved)&&saved.includes(legacy))addChoice(legacy,'حسابات الفواتير والمخزون','⚙️',()=>window.RatibCommerce?.openAccountDefaults?.());
}
const settingsCatalog=[
 ['tree','إدارة شجرة الحسابات والأسقف'],
 ['budget','إدارة بنود الميزانية / التكاليف'],
 ['identity','الهوية والبيانات الشخصية'],
 ['security','إعدادات الأمان وقفل الحماية'],
 ['printing','إعدادات الطباعة'],
 ['defaults','إعدادات الحسابات الافتراضية للسندات'],
 ['buttonsize','حجم الأزرار والخط'],
 ['currencies','إدارة العملات'],
 ['backupsettings','النسخ الاحتياطي'],
 ['favorites','مفضلتي'],
 ['voice','الإدخال الصوتي'],
 ['sound','أصوات التنبيهات والتذكيرات']
];
for(const [key,label] of settingsCatalog)addChoice('settings:'+key,label,'⚙️',async()=>{
 if(typeof window.RatibSettingsOpen==='function'){window.RatibSettingsOpen(key);return;}
 if(!await page('pageSettings'))return;
 const card=[...document.querySelectorAll('#pageSettings .settings-accordion-card')].find(c=>(c.querySelector('.settings-accordion-header')?.textContent||'').includes(label));
 if(!card)throw Error('الإعداد غير متاح في هذه النسخة.');
 const head=card.querySelector('.settings-accordion-header');
 if(!card.querySelector('.settings-accordion-body')?.classList.contains('open'))head?.click();
 card.scrollIntoView?.({block:'start'});
});
function discoverSettings(){
 const raw=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){return [];}})();
 const previous=new Set(Array.isArray(raw)?raw:[]);
 document.querySelectorAll('#pageSettings .settings-accordion-card').forEach(card=>{
  if(card.id==='ratibFavoritesSettingsCard')return;
  const heading=card.querySelector('.settings-accordion-header');
  if(!heading)return;
  const label=(heading.querySelector('span')||heading).textContent.replace(/\p{Extended_Pictographic}|[\uFE0F▼]/gu,'').trim();
  const anchor=card.id||card.querySelector('[id]')?.id;
  if(!anchor||!label)return;
  const legacyId='setting:'+anchor;
  const hasNewShortcut=settingsCatalog.some(([,name])=>normalized(name)===normalized(label));
  if(hasNewShortcut&&!previous.has(legacyId))return;
  addChoice(legacyId,label,'⚙️',async()=>{
   if(!await page('pageSettings'))return;
   const node=document.getElementById(anchor),fresh=node?.closest('.settings-accordion-card')||node;
   const head=fresh?.querySelector('.settings-accordion-header');
   if(!fresh||!head)throw Error('لم يعد هذا الإعداد متاحًا.');
   if(!fresh.querySelector('.settings-accordion-body')?.classList.contains('open'))head.click();
   fresh.scrollIntoView?.({block:'center'});
  });
 });
}

discoverSettings();discoverReports();
const migrated={pageLedger:'ledger',pageAccountsTree:'account-tree'};
let selected=[];
try{const saved=localStorage.getItem(KEY);const v=JSON.parse(saved??localStorage.getItem(oldKey)??'[]');if(Array.isArray(v))selected=[...new Set(v.map(id=>saved?id:migrated[id]).filter(id=>typeof id==='string'&&id.length<180))];}catch(_){}
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
panel.innerHTML='<div class="fav-box"><div class="fav-head"><strong>المفضلة — وظائف مباشرة</strong><button type="button" class="fav-small" data-close aria-label="إغلاق">✕ إغلاق</button></div><div id="ratibFavItems"></div><button type="button" class="btn btn-ghost" id="ratibPinCurrent" hidden></button><button type="button" class="btn btn-ghost" data-settings style="width:100%;margin:10px 0">⚙️ إدارة المفضلة والأيقونات من الإعدادات</button><div class="fav-section">تخصيص الاختصارات</div><label for="ratibFavSearch">ابحث عن الوظيفة المطلوبة</label><input id="ratibFavSearch" type="search" placeholder="مثل: قيد متعدد، عملات، ترويسة…"><label for="ratibFavGroup">القسم</label><select id="ratibFavGroup"><option value="">جميع الوظائف</option><option>السندات</option><option>المخزون</option><option>الوارد</option><option>الصادر</option><option>التقارير</option><option>الحسابات والاستيراد</option><option>الإعدادات</option><option>النسخ والتفعيل</option><option>التذكيرات</option></select><p id="ratibFavCount" role="status" class="field-hint"></p><div id="ratibFavOptions"></div></div>';
document.body.appendChild(panel);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
discoverSettings();discoverReports();
document.getElementById('ratibFavItems').innerHTML=selected.length?'<div class="fav-grid">'+selected.map((id,i)=>{const a=byId[id];if(!a)return '<div class="fav-item"><span>اختصار قديم غير متاح</span><button type="button" class="fav-small" data-remove="'+escapeHtml(id)+'">إزالة</button></div>';return '<div class="fav-item"><button type="button" class="fav-item" style="width:100%" data-go="'+id+'">'+a[2]+' '+escapeHtml(a[1])+'</button><div class="fav-row"><button class="fav-small" data-up="'+id+'" '+(i===0?'disabled':'')+'>↑</button><button class="fav-small" data-down="'+id+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="fav-small" data-remove="'+id+'">حذف</button></div></div>';}).join('')+'</div>':'<p>لا توجد مفضلة بعد. اختر من الوظائف أدناه.</p>';
renderOptions();renderCurrent();renderSettings();renderShortcutBar();
}
function groupOf(id){
 if(id.startsWith('commerce:'))return ({stock:'المخزون',purchase:'الوارد',sale:'الصادر'})[id.split(':')[1]]||'المخزون';
 if(['receipt','payment','simple-entry','multi-entry'].includes(id))return 'السندات';
 if(['trial-balance','budget-analysis','annual-close','movement-report','position-report','reports-home'].includes(id)||id.startsWith('report:'))return 'التقارير';
 if(['home','new-voucher'].includes(id))return 'السندات';
 if(favoriteGroups[id])return favoriteGroups[id];
 if(id.startsWith('setting:')||id.startsWith('settings:')||id==='add-budget-item')return 'الإعدادات';
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
 if(visible('pageReports'))for(const [id,key] of [['reportsGroupBudgetHeader','budget-analysis'],['reportsGroupTrialHeader','trial-balance']])if(document.getElementById(id)?.classList.contains('open'))return key;
 if(visible('pageSettings')){
  const active=[...document.querySelectorAll('#pageSettings .settings-accordion-card')].find(card=>card.querySelector('.settings-accordion-body.open'));
  if(active){
   const heading=active.querySelector('.settings-accordion-header');
   const label=(heading?.querySelector('span')||heading)?.textContent.replace(/\p{Extended_Pictographic}|[\uFE0F▼]/gu,'').trim()||'';
   const canonical=settingsCatalog.find(([,name])=>normalized(name)===normalized(label));
   if(canonical)return 'settings:'+canonical[0];
   return 'setting:'+(active.id||active.querySelector('[id]')?.id);
  }
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
function open(){discoverSettings();discoverReports();filterText='';filterGroup='';document.getElementById('ratibFavSearch').value='';document.getElementById('ratibFavGroup').value='';render();panel.classList.add('open');panel.querySelector('[data-close]').focus();}
panel.addEventListener('click',e=>{if(e.target===panel){close();return;}const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if('close'in d){close();return;}
if('settings'in d){close();openFavoritesSettings();return;}
if(d.go){close();Promise.resolve().then(()=>byId[d.go]?.run()).catch(error=>{console.error('Ratib favorite',error);window.showToast?.('تعذر فتح الاختصار؛ حاول مرة أخرى.','warn');});return;}
if(d.pin){if(selected.includes(d.pin))selected=selected.filter(x=>x!==d.pin);else selected.push(d.pin);}
if(d.add&&byId[d.add]&&!selected.includes(d.add)){selected.push(d.add);}
if(d.remove){selected=selected.filter(x=>x!==d.remove);}
if(d.up||d.down){const id=d.up||d.down,i=selected.indexOf(id),j=i+(d.up?-1:1);if(j>=0&&j<selected.length)[selected[i],selected[j]]=[selected[j],selected[i]];}
save();render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))close();});
const actions=document.querySelector('header .header-actions');
if(actions){
 const support=document.createElement('button');
 support.type='button';support.id='ratibWhatsappHeaderBtn';
 support.className='icon-btn ratib-quick-btn ratib-support-header-btn';
 support.textContent='💬';support.title='تواصل عبر واتساب';
 support.setAttribute('aria-label','تواصل عبر واتساب: مشكلة فنية أو مقترح');
 support.setAttribute('aria-haspopup','dialog');
 support.setAttribute('aria-controls','ratibWhatsappSupportDialog');
 support.addEventListener('click',event=>{
  event.preventDefault();
  if(typeof window.RatibSupportOpen==='function')window.RatibSupportOpen();
  else window.showToast?.('تعذر فتح نافذة التواصل؛ أعد تحميل الصفحة.','warn');
 });
 actions.append(support);
}
/* Favorites are launched here; their configuration is only in Settings. */
const favCompactStyle=document.createElement('style');
favCompactStyle.textContent=`
#ratibFavoritesPanel .fav-section,#ratibFavoritesPanel #ratibFavSearch,#ratibFavoritesPanel #ratibFavGroup,#ratibFavoritesPanel #ratibFavCount,#ratibFavoritesPanel #ratibFavOptions,
#ratibFavoritesPanel label[for="ratibFavSearch"],#ratibFavoritesPanel label[for="ratibFavGroup"]{display:none!important}
#ratibFavoritesSettingsCard .fav-settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:9px;margin:10px 0}
#ratibFavoritesSettingsCard .fav-settings-item{border:1px solid var(--border);border-radius:11px;padding:10px;background:var(--bg);min-width:0}
#ratibFavoritesSettingsCard .fav-settings-actions{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:7px}
#ratibFavoritesSettingsCard .fav-settings-actions button{width:auto;min-height:36px;margin:0;padding:6px 10px}
#ratibFavoritesSettingsCard select{width:100%;min-height:40px;margin:6px 0}
#ratibFavoritesSettingsCard .fav-settings-filter{display:flex;flex-wrap:wrap;gap:8px}
#ratibFavoritesSettingsCard .fav-settings-filter>*{flex:1 1 150px;min-width:0}

#ratibFavoritesSettingsCard .fav-settings-grid{grid-template-columns:1fr;gap:5px}
#ratibFavoritesSettingsCard .fav-settings-selected{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:6px 9px}
#ratibFavoritesSettingsCard .fav-settings-selected>strong{flex:1;min-width:0;font-size:.85rem}
#ratibFavoritesSettingsCard .fav-settings-selected .fav-settings-actions{flex-wrap:nowrap;margin:0;gap:4px}
#ratibFavoritesSettingsCard .fav-settings-selected .fav-settings-actions button{min-height:32px;padding:3px 6px;font-size:.76rem}
#ratibFavoritesSettingsCard .fav-icon-picker{width:51px;flex:none}
#ratibFavoritesSettingsCard .fav-icon-picker select{width:100%;min-height:32px;margin:0;padding:2px}
#ratibFavoritesSettingsCard .fav-settings-collection{display:grid;grid-template-columns:1fr;gap:6px;margin-top:9px}
#ratibFavoritesSettingsCard .fav-settings-group{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--card)}
#ratibFavoritesSettingsCard .fav-settings-group>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:10px 12px;font:850 .94rem Tajawal,sans-serif;list-style:none}
#ratibFavoritesSettingsCard .fav-settings-group>summary::-webkit-details-marker{display:none}
#ratibFavoritesSettingsCard .fav-settings-group>summary:after{content:'▾';font-size:.9rem;opacity:.75}
#ratibFavoritesSettingsCard .fav-settings-group[open]>summary:after{content:'▴'}
#ratibFavoritesSettingsCard .fav-settings-count{font-size:.74rem;color:var(--muted);font-weight:600;margin-inline-start:auto}
#ratibFavoritesSettingsCard .fav-settings-compact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:8px;border-top:1px solid var(--border)}
#ratibFavoritesSettingsCard .fav-settings-option{display:flex;justify-content:flex-start;align-items:center;gap:6px;text-align:right;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:7px;min-height:39px;padding:6px;cursor:pointer;font:700 .78rem Tajawal,sans-serif}
#ratibFavoritesSettingsCard .fav-settings-option>span:nth-child(2){flex:1;min-width:0}
@media(max-width:420px){#ratibFavoritesSettingsCard .fav-settings-compact{grid-template-columns:1fr}}

@media print{#ratibFavoritesSettingsCard{display:none!important}}`;
document.head.appendChild(favCompactStyle);
function openFavoritesSettings(){
 discoverSettings();discoverReports();
 if(typeof window.RatibSettingsOpen==='function'){window.RatibSettingsOpen('favorites');renderSettings();return;}
 if(typeof window.navigateToTab==='function')window.navigateToTab('pageSettings',true);
 const card=document.getElementById('ratibFavoritesSettingsCard');
 if(!card)return;
 card.querySelector('.settings-accordion-body')?.classList.add('open');
 card.querySelector('.accordion-arrow')?.setAttribute('aria-hidden','true');
 renderSettings();
 card.scrollIntoView?.({block:'start',behavior:'smooth'});
}
const favExpandedGroups=new Set();
function renderSettings(){
 discoverSettings();discoverReports();
 const host=document.getElementById('ratibFavoritesSettingsCard');
 if(!host)return;
 const selectedRoot=host.querySelector('#ratibSettingsFavSelected');
 const catalogRoot=host.querySelector('#ratibSettingsFavCatalog');
 if(!selectedRoot||!catalogRoot)return;
 selectedRoot.innerHTML=selected.length?'<div class="fav-settings-grid">'+selected.map((id,i)=>{
  const a=byId[id];if(!a)return '<div class="fav-settings-item fav-settings-selected"><strong>اختصار قديم لم يعد متاحًا</strong><button type="button" class="btn btn-ghost" data-remove-fav="'+escapeHtml(id)+'">إزالة</button></div>';
  return '<div class="fav-settings-item fav-settings-selected"><strong>'+escapeHtml(a[1])+'</strong><div class="fav-settings-actions">'+
  '<label class="fav-icon-picker" aria-label="أيقونة الاختصار"><select data-fav-icon="'+escapeHtml(id)+'">'+ICON_CHOICES.map(icon=>'<option value="'+escapeHtml(icon)+'" '+(a[2]===icon?'selected':'')+'>'+escapeHtml(icon)+'</option>').join('')+'</select></label>'+
  '<button type="button" class="btn btn-ghost" data-move-up="'+escapeHtml(id)+'" '+(i===0?'disabled':'')+' title="تحريك لأعلى">↑</button>'+
  '<button type="button" class="btn btn-ghost" data-move-down="'+escapeHtml(id)+'" '+(i===selected.length-1?'disabled':'')+' title="تحريك لأسفل">↓</button>'+
  '<button type="button" class="btn btn-ghost" data-remove-fav="'+escapeHtml(id)+'">إزالة</button></div></div>';
 }).join('')+'</div>':'<p>لا توجد اختصارات مختارة. أضف من القائمة التالية.</p>';
 const input=host.querySelector('#ratibSettingsFavSearch'),group=host.querySelector('#ratibSettingsFavGroup');
 const search=normalized(input?.value||''),groupValue=group?.value||'';
 const available=choices.filter(a=>!selected.includes(a[0])&&(!groupValue||groupOf(a[0])===groupValue)&&normalized(a[1]).includes(search));
 const groupOrder=['السندات','المخزون','الوارد','الصادر','التقارير','الحسابات والاستيراد','الإعدادات','النسخ والتفعيل','التذكيرات'];
 const grouped=groupOrder.filter(group=>available.some(a=>groupOf(a[0])===group));
 catalogRoot.innerHTML=available.length?'<div class="fav-settings-collection">'+grouped.map(group=>{
  const options=available.filter(a=>groupOf(a[0])===group);
  const expand=!!search||!!groupValue&&group===groupValue||favExpandedGroups.has(group);
  return '<details class="fav-settings-group" data-group="'+escapeHtml(group)+'" '+(expand?'open':'')+'>'+
   '<summary><span>'+escapeHtml(group)+'</span><span class="fav-settings-count">'+options.length+' وظيفة</span></summary>'+
   '<div class="fav-settings-compact">'+options.map(a=>'<button type="button" class="fav-settings-option" data-add-fav="'+escapeHtml(a[0])+'" title="إضافة إلى مفضلتي"><span>'+escapeHtml(a[2])+'</span><span>'+escapeHtml(a[1])+'</span><span aria-hidden="true">＋</span></button>').join('')+'</div></details>';
 }).join('')+'</div>':'<p>لا توجد اختصارات أخرى مطابقة للبحث.</p>';
 host.querySelector('#ratibSettingsFavCount').textContent='المحدد: '+selected.length+' · المتاح للإضافة: '+available.length;
}
function installFavoritesSettings(){
 const page=document.getElementById('pageSettings');
 if(!page||document.getElementById('ratibFavoritesSettingsCard'))return;
 const card=document.createElement('div');
 card.id='ratibFavoritesSettingsCard';card.className='card settings-accordion-card no-print';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>⭐ المفضلة والأيقونات</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><p style="color:var(--muted)">حدد الوظائف التي تظهر في المفضلة السريعة، واختر رمزًا لكل اختصار ورتبها. لا يؤثر التخصيص على بياناتك المحاسبية.</p><h3>اختصاراتي</h3><div id="ratibSettingsFavSelected"></div><h3>إضافة اختصار</h3><div class="fav-settings-filter"><input type="search" id="ratibSettingsFavSearch" placeholder="ابحث عن وظيفة"><select id="ratibSettingsFavGroup"><option value="">جميع الأقسام</option><option>السندات</option><option>المخزون</option><option>الوارد</option><option>الصادر</option><option>التقارير</option><option>الحسابات والاستيراد</option><option>الإعدادات</option><option>النسخ والتفعيل</option><option>التذكيرات</option></select></div><small id="ratibSettingsFavCount" aria-live="polite"></small><div id="ratibSettingsFavCatalog"></div></div>';
 page.prepend(card);
 const head=card.querySelector('.settings-accordion-header'),body=card.querySelector('.settings-accordion-body');
 function toggle(){const active=body.classList.toggle('open');head.setAttribute('aria-expanded',String(active));head.querySelector('.accordion-arrow').textContent=active?'▲':'▼';if(active)renderSettings();}
 head.addEventListener('click',toggle);
 head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 card.querySelector('#ratibSettingsFavSearch').addEventListener('input',renderSettings);
 card.querySelector('#ratibSettingsFavGroup').addEventListener('change',renderSettings);
 card.addEventListener('click',e=>{
  const summary=e.target.closest('summary');
  if(summary){const group=summary.closest('[data-group]');if(group){const key=group.dataset.group;if(group.open)favExpandedGroups.delete(key);else favExpandedGroups.add(key);}return;}
  const btn=e.target.closest('button');
  if(!btn)return;
  const id=btn.dataset.addFav||btn.dataset.removeFav||btn.dataset.moveUp||btn.dataset.moveDown;
  if(!id||(!byId[id]&&!('removeFav'in btn.dataset)))return;
  const sourceGroup=btn.closest('.fav-settings-group');if(sourceGroup)favExpandedGroups.add(sourceGroup.dataset.group);
  if('addFav'in btn.dataset&&!selected.includes(id))selected.push(id);
  if('removeFav'in btn.dataset)selected=selected.filter(x=>x!==id);
  if('moveUp'in btn.dataset||'moveDown'in btn.dataset){
   const i=selected.indexOf(id),j=i+('moveUp'in btn.dataset?-1:1);
   if(i>=0&&j>=0&&j<selected.length)[selected[i],selected[j]]=[selected[j],selected[i]];
  }
  save();render();
 });
 card.addEventListener('change',e=>{
  const id=e.target.dataset.favIcon;
  if(!id||!byId[id]||!ICON_CHOICES.includes(e.target.value))return;
  savedIcons[id]=e.target.value;byId[id][2]=e.target.value;persistIcons();render();
 });
 renderSettings();
}
installFavoritesSettings();

/* Ratib 3.6.119: centered shortcut trigger at the intersection of four tiles. */
const intersectionCSS=document.createElement('style');
intersectionCSS.textContent=[
'#dashboardHomeContent .main-menu-grid.ratib-favorites-cross{position:relative;overflow:visible}',
'#ratibCenterFavorites{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:48px;width:48px;border:2px solid #0b6046;border-radius:13px;background:var(--card,#fff);color:#0b6046;z-index:110;box-shadow:0 3px 12px #0003;font-size:23px;cursor:pointer}',
'#ratibCenterFavoritesMenu{position:absolute;left:50%;top:calc(50% + 29px);transform:translateX(-50%);width:min(275px,calc(100vw - 32px));max-height:55vh;overflow-y:auto;background:var(--card,#fff);color:var(--text,#111);padding:8px;border:1px solid var(--border,#ddd);border-radius:11px;z-index:111;box-shadow:0 10px 25px #0003}',
'#ratibCenterFavoritesMenu[hidden]{display:none!important}',
'#ratibCenterFavoritesMenu button{display:block;width:100%;min-height:42px;text-align:right;border:0;border-bottom:1px solid var(--border,#ddd);background:transparent;color:inherit;font:inherit;padding:8px;cursor:pointer}',
'#ratibCenterFavoritesMenu strong{display:block;margin:5px;font-size:13px}',
'@media print{#ratibCenterFavorites,#ratibCenterFavoritesMenu{display:none!important}}'
].join('\n');
document.head.appendChild(intersectionCSS);
const fourTiles=document.querySelector('#dashboardHomeContent .main-menu-grid');
let centerButton=null,centerMenu=null,centerIdleTimer=null;
const CENTER_IDLE_MS=5000;
function armCenterAutoClose(){
 if(centerIdleTimer!==null){window.clearTimeout(centerIdleTimer);centerIdleTimer=null;}
 if(centerMenu&&!centerMenu.hidden){
  centerIdleTimer=window.setTimeout(()=>{closeCenterFavorites();},CENTER_IDLE_MS);
 }
}
function renderShortcutBar(){if(!centerMenu)return;centerMenu.innerHTML='<strong>⭐ اختصاراتي</strong>'+(selected.length?selected.filter(id=>byId[id]).map(id=>'<button type="button" data-center-fav="'+escapeHtml(id)+'">'+escapeHtml(byId[id][2]+' '+byId[id][1])+'</button>').join(''):'<button type="button" data-center-settings>⚙️ اختر الاختصارات من الإعدادات</button>');}
function closeCenterFavorites(){
 if(centerIdleTimer!==null){window.clearTimeout(centerIdleTimer);centerIdleTimer=null;}
 if(centerMenu)centerMenu.hidden=true;
 if(centerButton)centerButton.setAttribute('aria-expanded','false');
}
if(fourTiles){
fourTiles.classList.add('ratib-favorites-cross');
centerButton=document.createElement('button');centerButton.type='button';centerButton.id='ratibCenterFavorites';centerButton.className='no-print';centerButton.textContent='★';centerButton.title='اختصاراتي';centerButton.setAttribute('aria-label','فتح قائمة اختصاراتي');centerButton.setAttribute('aria-expanded','false');
centerMenu=document.createElement('div');centerMenu.id='ratibCenterFavoritesMenu';centerMenu.className='no-print';centerMenu.hidden=true;
fourTiles.append(centerButton,centerMenu);renderShortcutBar();
centerButton.addEventListener('click',()=>{
 if(!centerMenu.hidden){closeCenterFavorites();return;}
 centerMenu.hidden=false;centerButton.setAttribute('aria-expanded','true');armCenterAutoClose();
});
for(const type of ['pointerdown','touchstart','keydown','focusin','scroll']){
 centerMenu.addEventListener(type,armCenterAutoClose,{passive:type==='touchstart'||type==='scroll'});
}
centerMenu.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-center-settings')){closeCenterFavorites();openFavoritesSettings();return;}const id=button.dataset.centerFav;if(!id||!byId[id])return;closeCenterFavorites();Promise.resolve().then(()=>byId[id].run()).catch(error=>{console.error(error);window.showToast?.('تعذر فتح الاختصار','warn');});});
document.addEventListener('click',e=>{if(!fourTiles.contains(e.target))closeCenterFavorites();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCenterFavorites();});
}
// Desktop-safe direct bindings: do not depend on the deferred application init chain.
const menuBtn=document.getElementById('sidebarMenuBtn');
if(menuBtn){menuBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.openRatibSidebar==='function')window.openRatibSidebar();};}
const themeBtn=document.getElementById('themeBtn');
if(themeBtn){themeBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();const root=document.documentElement,next=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=next;try{localStorage.setItem('theme',JSON.stringify(next));}catch(_){}themeBtn.textContent=next==='dark'?'☀️':'🌙';};}
function registerFavorite(id,label,icon,run,group){
 if(typeof id!=='string'||!/^[-:a-zA-Z0-9_]{1,120}$/.test(id)||typeof label!=='string'||!label.trim()||typeof run!=='function')return false;
 const groups=['السندات','المخزون','الوارد','الصادر','التقارير','الحسابات والاستيراد','الإعدادات','النسخ والتفعيل','التذكيرات'];
 if(groups.includes(group))favoriteGroups[id]=group;
 addChoice(id,label.trim(),ICON_CHOICES.includes(icon)?icon:'📌',run);
 if(document.getElementById('ratibSettingsFavCatalog'))render();
 return true;
}
window.RatibQuickFavorites={open,close,register:registerFavorite,refresh:()=>{discoverSettings();discoverReports();render();}};
})();

/* Load the approved unified output UI without touching accounting logic. */
(()=>{if(document.querySelector('script[data-ratib-unified-output]'))return;const s=document.createElement('script');s.src='./ratib-unified-output.js?v=16';s.defer=true;s.dataset.ratibUnifiedOutput='1';document.head.appendChild(s);})();
