/* Ratib quick favorites and shared output controls — additive, no accounting data changes. */
(()=>{'use strict';
const KEY='ratib.quickFavorites.v2';
const oldKey='ratib.quickFavorites.v1';
const choices=[];
const byId=Object.create(null);
const ICON_KEY='ratib.quickFavorites.icons.v1';
const ICON_CHOICES=['🧾','💰','💵','📥','📤','📋','📑','📊','📈','⚖️','🏦','💼','📁','🗂️','🔒','⚙️','💾','☁️','🧮','🔔','🗓️','⭐','❤️','➕','🔎','🏠','📝','📌','🔧','👤'];
let savedIcons={};
try{const value=JSON.parse(localStorage.getItem(ICON_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))for(const [id,icon] of Object.entries(value))if(ICON_CHOICES.includes(icon))savedIcons[id]=icon;}catch(_){}
function persistIcons(){try{localStorage.setItem(ICON_KEY,JSON.stringify(savedIcons));}catch(error){console.warn('تعذر حفظ أيقونات المفضلة',error);}}

function addChoice(id,label,icon,run){if(byId[id])return;const item=[id,label,savedIcons[id]||icon];item.run=run;choices.push(item);byId[id]=item;}
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
for(const [id,label,target] of [['budget-analysis','تحليل بنود الميزانية','reportsGroupBudgetHeader'],['trial-balance','ميزان المراجعة','reportsGroupTrialHeader']]){
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
  if(card.id==='ratibFavoritesSettingsCard')return;
  const heading=card.querySelector('.settings-accordion-header');
  if(!heading)return;
  const label=(heading.querySelector('span')||heading).textContent.replace(/\p{Extended_Pictographic}|[\uFE0F▼]/gu,'').trim();
  const anchor=card.id||card.querySelector('[id]')?.id;
  if(!anchor||!label)return;
  addChoice('setting:'+anchor,label,'⚙️',async()=>{if(!await page('pageSettings'))return;const body=card.querySelector('.settings-accordion-body');if(body&&!body.classList.contains('open'))heading.click();heading.scrollIntoView?.({block:'center'});});
 });
}
discoverSettings();
const migrated={pageLedger:'ledger',pageAccountsTree:'account-tree'};
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
panel.innerHTML='<div class="fav-box"><div class="fav-head"><strong>المفضلة — وظائف مباشرة</strong><button type="button" class="fav-small" data-close aria-label="إغلاق">✕ إغلاق</button></div><div id="ratibFavItems"></div><button type="button" class="btn btn-ghost" id="ratibPinCurrent" hidden></button><button type="button" class="btn btn-ghost" data-settings style="width:100%;margin:10px 0">⚙️ إدارة المفضلة والأيقونات من الإعدادات</button><div class="fav-section">تخصيص الاختصارات</div><label for="ratibFavSearch">ابحث عن الوظيفة المطلوبة</label><input id="ratibFavSearch" type="search" placeholder="مثل: قيد متعدد، عملات، ترويسة…"><label for="ratibFavGroup">القسم</label><select id="ratibFavGroup"><option value="">جميع الوظائف</option><option>السندات</option><option>التقارير</option><option>الحسابات والاستيراد</option><option>الإعدادات</option><option>النسخ والتفعيل</option><option>التذكيرات</option></select><p id="ratibFavCount" role="status" class="field-hint"></p><div id="ratibFavOptions"></div></div>';
document.body.appendChild(panel);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
document.getElementById('ratibFavItems').innerHTML=selected.length?'<div class="fav-grid">'+selected.map((id,i)=>{const a=byId[id];return '<div class="fav-item"><button type="button" class="fav-item" style="width:100%" data-go="'+id+'">'+a[2]+' '+escapeHtml(a[1])+'</button><div class="fav-row"><button class="fav-small" data-up="'+id+'" '+(i===0?'disabled':'')+'>↑</button><button class="fav-small" data-down="'+id+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="fav-small" data-remove="'+id+'">حذف</button></div></div>';}).join('')+'</div>':'<p>لا توجد مفضلة بعد. اختر من الوظائف أدناه.</p>';
renderOptions();renderCurrent();renderSettings();renderShortcutBar();
}
function groupOf(id){
 if(['receipt','payment','simple-entry','multi-entry'].includes(id))return 'السندات';
 if(['trial-balance','budget-analysis','annual-close'].includes(id))return 'التقارير';
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
 if(visible('pageReports'))for(const [id,key] of [['reportsGroupBudgetHeader','budget-analysis'],['reportsGroupTrialHeader','trial-balance']])if(document.getElementById(id)?.classList.contains('open'))return key;
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
let star=null, exit=null;
if(actions){
star=document.createElement('button');star.type='button';star.className='icon-btn ratib-quick-btn';star.textContent='☆';star.title='المفضلة السريعة';star.setAttribute('aria-label','فتح المفضلة السريعة');star.addEventListener('click',open);actions.prepend(star);
exit=document.createElement('button');exit.type='button';exit.className='icon-btn ratib-quick-btn';exit.textContent='🚪';exit.title='الخروج';exit.setAttribute('aria-label','الخروج من التطبيق');exit.addEventListener('click',event=>{
 event.preventDefault();
 if(typeof window.RatibExitNow==='function')window.RatibExitNow();
 else window.showToast?.('تعذر بدء الخروج؛ يرجى تحديث الصفحة.','error');
});actions.append(exit);
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
@media print{#ratibFavoritesSettingsCard{display:none!important}}`;
document.head.appendChild(favCompactStyle);
function openFavoritesSettings(){
 if(typeof window.navigateToTab==='function')window.navigateToTab('pageSettings',true);
 const card=document.getElementById('ratibFavoritesSettingsCard');
 if(!card)return;
 card.querySelector('.settings-accordion-body')?.classList.add('open');
 card.querySelector('.accordion-arrow')?.setAttribute('aria-hidden','true');
 renderSettings();
 card.scrollIntoView?.({block:'start',behavior:'smooth'});
}
function renderSettings(){
 const host=document.getElementById('ratibFavoritesSettingsCard');
 if(!host)return;
 const selectedRoot=host.querySelector('#ratibSettingsFavSelected');
 const catalogRoot=host.querySelector('#ratibSettingsFavCatalog');
 if(!selectedRoot||!catalogRoot)return;
 selectedRoot.innerHTML=selected.length?'<div class="fav-settings-grid">'+selected.map((id,i)=>{
  const a=byId[id];if(!a)return '';
  return '<div class="fav-settings-item"><strong>'+escapeHtml(a[2]+' '+a[1])+'</strong><label style="display:block;margin-top:8px">أيقونة الاختصار<select data-fav-icon="'+escapeHtml(id)+'">'+ICON_CHOICES.map(icon=>'<option value="'+escapeHtml(icon)+'" '+(a[2]===icon?'selected':'')+'>'+escapeHtml(icon)+'</option>').join('')+'</select></label><div class="fav-settings-actions"><button class="btn btn-ghost" data-move-up="'+escapeHtml(id)+'" '+(i===0?'disabled':'')+'>↑ أعلى</button><button class="btn btn-ghost" data-move-down="'+escapeHtml(id)+'" '+(i===selected.length-1?'disabled':'')+'>↓ أسفل</button><button class="btn btn-ghost" data-remove-fav="'+escapeHtml(id)+'">إزالة</button></div></div>';
 }).join('')+'</div>':'<p>لا توجد اختصارات مختارة. أضف من القائمة التالية.</p>';
 const input=host.querySelector('#ratibSettingsFavSearch'),group=host.querySelector('#ratibSettingsFavGroup');
 const search=normalized(input?.value||''),groupValue=group?.value||'';
 const available=choices.filter(a=>!selected.includes(a[0])&&(!groupValue||groupOf(a[0])===groupValue)&&normalized(a[1]).includes(search));
 catalogRoot.innerHTML=available.length?'<div class="fav-settings-grid">'+available.map(a=>'<button type="button" class="fav-settings-item" data-add-fav="'+escapeHtml(a[0])+'" style="text-align:right;cursor:pointer;font:inherit;color:var(--text)">'+escapeHtml(a[2]+' '+a[1])+' ＋</button>').join('')+'</div>':'<p>لا توجد اختصارات أخرى مطابقة للبحث.</p>';
 host.querySelector('#ratibSettingsFavCount').textContent='المحدد: '+selected.length+' · المتاح للإضافة: '+available.length;
}
function installFavoritesSettings(){
 const page=document.getElementById('pageSettings');
 if(!page||document.getElementById('ratibFavoritesSettingsCard'))return;
 const card=document.createElement('div');
 card.id='ratibFavoritesSettingsCard';card.className='card settings-accordion-card no-print';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>⭐ المفضلة والأيقونات</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><p style="color:var(--muted)">حدد الوظائف التي تظهر في المفضلة السريعة، واختر رمزًا لكل اختصار ورتبها. لا يؤثر التخصيص على بياناتك المحاسبية.</p><h3>اختصاراتي</h3><div id="ratibSettingsFavSelected"></div><h3>إضافة اختصار</h3><div class="fav-settings-filter"><input type="search" id="ratibSettingsFavSearch" placeholder="ابحث عن وظيفة"><select id="ratibSettingsFavGroup"><option value="">جميع الأقسام</option><option>السندات</option><option>التقارير</option><option>الحسابات والاستيراد</option><option>الإعدادات</option><option>النسخ والتفعيل</option><option>التذكيرات</option></select></div><small id="ratibSettingsFavCount" aria-live="polite"></small><div id="ratibSettingsFavCatalog"></div></div>';
 page.prepend(card);
 const head=card.querySelector('.settings-accordion-header'),body=card.querySelector('.settings-accordion-body');
 function toggle(){const active=body.classList.toggle('open');head.setAttribute('aria-expanded',String(active));head.querySelector('.accordion-arrow').textContent=active?'▲':'▼';if(active)renderSettings();}
 head.addEventListener('click',toggle);
 head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 card.querySelector('#ratibSettingsFavSearch').addEventListener('input',renderSettings);
 card.querySelector('#ratibSettingsFavGroup').addEventListener('change',renderSettings);
 card.addEventListener('click',e=>{
  const btn=e.target.closest('button');
  if(!btn)return;
  const id=btn.dataset.addFav||btn.dataset.removeFav||btn.dataset.moveUp||btn.dataset.moveDown;
  if(!id||!byId[id])return;
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

/* Ratib 3.6.118: direct quick-access icons with a mobile-friendly overflow menu. */
const shortStyle=document.createElement('style');
shortStyle.textContent=[
'#ratibFavoritesShortcutBar{position:relative;border:1px solid var(--border,#d8e2dd);border-radius:12px;padding:9px;margin:8px 0;background:var(--card,#fff);box-shadow:0 2px 9px #00000009}',
'#ratibFavoritesShortcutBar .ratib-fav-heading{font-size:13px;color:var(--muted,#555);font-weight:800;margin-bottom:7px}',
'#ratibFavoritesShortcutBar .ratib-fav-shortcuts{display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;overscroll-behavior-x:contain}',
'#ratibFavoritesShortcutBar .ratib-fav-action{display:flex;flex:1 0 66px;max-width:132px;min-width:64px;align-items:center;justify-content:center;flex-direction:column;gap:3px;text-align:center;padding:7px 4px;background:var(--bg,#f4f8fc);color:var(--text,#123);border:1px solid var(--border,#ddd);border-radius:10px;min-height:68px;cursor:pointer}',
'#ratibFavoritesShortcutBar .ratib-fav-glyph{font-size:22px;line-height:1.15;display:block}',
'#ratibFavoritesShortcutBar .ratib-fav-title{font-size:11px;line-height:1.4;font-weight:750;display:block;overflow-wrap:anywhere}',
'#ratibFavoritesShortcutBar button:focus-visible{outline:2px solid var(--accent,#14532d);outline-offset:2px}',
'#ratibFavoritesShortcutBar .ratib-fav-overflow{position:absolute;inset-inline-end:8px;top:calc(100% - 3px);min-width:min(255px,calc(100vw - 30px));max-height:45vh;overflow-y:auto;display:grid;gap:2px;z-index:9500;background:var(--card,#fff);border:1px solid var(--border,#ddd);box-shadow:0 10px 27px #0003;border-radius:10px;padding:7px}',
'#ratibFavoritesShortcutBar .ratib-fav-overflow[hidden]{display:none!important}',
'#ratibFavoritesShortcutBar .ratib-fav-overflow button{font:700 13px/1.5 inherit;background:transparent;color:var(--text,#123);text-align:right;border:0;border-radius:7px;padding:9px;min-height:38px;cursor:pointer}',
'#ratibFavoritesShortcutBar .ratib-fav-overflow button:hover{background:var(--bg,#eef6f1)}',
'#ratibFavoritesShortcutBar .ratib-fav-empty{font-size:13px;color:var(--muted,#555);line-height:1.6;padding:9px}',
'@media print{#ratibFavoritesShortcutBar{display:none!important}}'
].join('\n');
document.head.appendChild(shortStyle);
function renderShortcutBar(){
 const bar=document.getElementById('ratibFavoritesShortcutBar');if(!bar)return;
 const actions=selected.filter(id=>byId[id]);
 const primary=actions.slice(0,4),extra=actions.slice(4);
 if(!actions.length){bar.innerHTML='<div class="ratib-fav-empty">لا توجد اختصارات بعد. <button type="button" class="btn btn-ghost" data-fav-config>اختر المفضلة من الإعدادات</button></div>';return;}
 const item=id=>{const c=byId[id];
  return '<button type="button" class="ratib-fav-action" data-fav-direct="'+escapeHtml(id)+'" title="'+escapeHtml(c[1])+'" aria-label="افتح '+escapeHtml(c[1])+'"><span class="ratib-fav-glyph" aria-hidden="true">'+escapeHtml(c[2])+'</span><span class="ratib-fav-title">'+escapeHtml(c[1])+'</span></button>';};
 bar.innerHTML='<div class="ratib-fav-heading">⭐ اختصاراتي</div><div class="ratib-fav-shortcuts">'+primary.map(item).join('')+
  (extra.length?'<button type="button" class="ratib-fav-action" data-fav-more aria-expanded="false" aria-controls="ratibFavoritesOverflow"><span class="ratib-fav-glyph" aria-hidden="true">⋮</span><span class="ratib-fav-title">المزيد ('+extra.length+')</span></button>':'')+'</div>'+
  (extra.length?'<div id="ratibFavoritesOverflow" class="ratib-fav-overflow" data-fav-overflow role="menu" hidden>'+
  extra.map(id=>'<button type="button" role="menuitem" data-fav-direct="'+escapeHtml(id)+'">'+escapeHtml(byId[id][2]+' '+byId[id][1])+'</button>').join('')+'</div>':'');
}
function closeShortcutOverflow(){
 const bar=document.getElementById('ratibFavoritesShortcutBar');
 const menu=bar?.querySelector('[data-fav-overflow]'),trigger=bar?.querySelector('[data-fav-more]');
 if(menu)menu.hidden=true;
 if(trigger)trigger.setAttribute('aria-expanded','false');
}
const shortcutBar=document.createElement('section');
shortcutBar.id='ratibFavoritesShortcutBar';shortcutBar.className='no-print';
shortcutBar.setAttribute('aria-label','اختصارات المفضلة');
shortcutBar.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-fav-config')){openFavoritesSettings();return;}
 if(button.hasAttribute('data-fav-more')){
  const menu=shortcutBar.querySelector('[data-fav-overflow]');if(!menu)return;
  menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));return;
 }
 const id=button.getAttribute('data-fav-direct');if(!id||!byId[id])return;
 closeShortcutOverflow();
 Promise.resolve().then(()=>byId[id].run()).catch(error=>{
  console.error('Ratib favorite shortcut',error);
  window.showToast?.('تعذر فتح الاختصار؛ حاول مرة أخرى.','warn');
 });
});
document.addEventListener('click',event=>{if(!shortcutBar.contains(event.target))closeShortcutOverflow();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeShortcutOverflow();});

const home=document.querySelector('#dashboardHomeContent');
if(home){home.prepend(shortcutBar);renderShortcutBar();}

// Desktop-safe direct bindings: do not depend on the deferred application init chain.
const menuBtn=document.getElementById('sidebarMenuBtn');
if(menuBtn){menuBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.openRatibSidebar==='function')window.openRatibSidebar();};}
const themeBtn=document.getElementById('themeBtn');
if(themeBtn){themeBtn.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();const root=document.documentElement,next=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=next;try{localStorage.setItem('theme',JSON.stringify(next));}catch(_){}themeBtn.textContent=next==='dark'?'☀️':'🌙';};}
if(star){star.onclick=(e)=>{e.preventDefault();e.stopImmediatePropagation();open();};}

window.RatibQuickFavorites={open,close};
})();

/* Load the approved unified output UI without touching accounting logic. */
(()=>{if(document.querySelector('script[data-ratib-unified-output]'))return;const s=document.createElement('script');s.src='./ratib-unified-output.js?v=16';s.defer=true;s.dataset.ratibUnifiedOutput='1';document.head.appendChild(s);})();
