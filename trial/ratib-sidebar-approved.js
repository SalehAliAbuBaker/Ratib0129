/* RATIB — approved trial sidebar and numeric amount inputs. Trial only. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const shapes={
 settings:'<path d="M9 3l-.6 3-2.6 1.5-2.8-1L1.5 9l2.2 2v3l-2.2 2L3 18.5l2.8-1L8.4 19l.6 3h3l.6-3 2.6-1.5 2.8 1 1.5-2.5-2.2-2v-3l2.2-2L18 6.5l-2.8 1L12.6 6 12 3Z" transform="translate(1 0) scale(1 .95)"/><circle cx="11.5" cy="12" r="3"/>',
 tree:'<rect x="9" y="3" width="6" height="5" rx="1"/><path d="M12 8v5M5 13h14M5 13v3M19 13v3"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/>',
 budget:'<path d="M3 21h18M6 17v-6h4v6M14 17V5h4v12"/>',
 identity:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5 17c0-3 8-3 8 0M15 9h4M15 13h4"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/>',
 print:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 14h12v7H6zM17 12h.01"/>',
 defaults:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 currency:'<circle cx="12" cy="12" r="9"/><path d="M9 9h6m-3-4v14m-3-5h6"/>',
 backup:'<path d="M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-7h8v7"/>',
 cloud:'<path d="M7 17H6a4 4 0 0 1-.6-8 6.5 6.5 0 0 1 12.5-1 4.5 4.5 0 0 1 .1 9h-1M12 21V11m-3 3 3-3 3 3"/>',
 favorites:'<path d="m12 2 3.1 6.4 7.1 1-5.1 5 .9 7-6-3.3-6 3.3.9-7-5.1-5 7.1-1Z"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
 sound:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 2 2-2 2 1 2-2 2-2-2-4 4"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
 down:'<path d="M4 17v4h16v-4M12 3v13m-5-5 5 5 5-5"/>',
 up:'<path d="M4 17v4h16v-4M12 16V3m-5 5 5-5 5 5"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>'
};
const settings=[
 ['tree','إدارة شجرة الحسابات والأسقف','tree'],
 ['budget','إدارة بنود الميزانية / التكاليف','budget'],
 ['identity','الهوية والبيانات الشخصية','identity'],
 ['printing','إعدادات الطباعة','print'],
 ['defaults','إعدادات الحسابات الافتراضية للسندات','defaults'],
 ['currencies','إدارة العملات','currency'],
 ['backupsettings','النسخ الاحتياطي','backup'],
 ['favorites','مفضلتي','favorites'],
 ['voice','الإدخال الصوتي','mic'],
 ['sound','صوت إشعارات التذكيرات','sound']
];
function icon(name){const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('class','sidebar-icon');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','1.7');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.setAttribute('aria-hidden','true');n.innerHTML=shapes[name]||shapes.settings;return n;}
function make(label,ico,action,arrow){const b=document.createElement('button');b.type='button';b.append(icon(ico),Object.assign(document.createElement('span'),{textContent:label}));if(arrow){const a=icon('chevron');a.classList.add('ratib-menu-chevron');b.append(a);}b.addEventListener('click',action);return b;}
function expandGroup(label,ico){const section=document.createElement('section');section.className='sidebar-group';const children=document.createElement('div');children.className='ratib-menu-children';children.hidden=true;const b=make(label,ico,()=>{children.hidden=!children.hidden;b.setAttribute('aria-expanded',String(!children.hidden));},true);b.setAttribute('aria-expanded','false');section.append(b,children);return {section,children};}
function css(){if($('ratibApprovedSidebarStyle'))return;const e=document.createElement('style');e.id='ratibApprovedSidebarStyle';e.textContent=[
'.ratib-menu-children{margin:0 5px 6px;padding:4px 6px;border-inline-start:3px solid var(--border);border-radius:8px;background:var(--bg)}',
'.ratib-menu-children[hidden],.ratib-menu-subchildren[hidden]{display:none!important}',
'.sidebar-nav .ratib-menu-children button{font:900 1rem Tajawal,sans-serif;min-height:48px;padding:10px 12px;color:var(--text)}',
'.sidebar-nav .ratib-menu-subchildren{padding-inline-start:9px;border-inline-start:2px solid var(--border)}',
'.sidebar-nav .ratib-menu-chevron{width:18px;height:18px;flex:0 0 18px;transition:transform .18s}',
'.sidebar-nav button[aria-expanded=true]>.ratib-menu-chevron{transform:rotate(180deg)}',
'.sidebar-nav button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card{background:var(--card);border:1px solid var(--border)!important;border-inline-start:1px solid var(--border)!important;box-shadow:none!important;border-radius:8px;padding:0!important;overflow:hidden}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card>.settings-accordion-header{font:900 1rem Tajawal,sans-serif!important;min-height:48px;padding:10px 12px;gap:10px;cursor:pointer}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card>.settings-accordion-body{padding:12px;margin:0!important;border-top:1px solid var(--border)}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity{margin:10px 0;border:1px solid var(--border)!important;border-radius:8px;padding:0!important;box-shadow:none!important}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity>.settings-accordion-header{padding:10px 12px;min-height:48px;font:900 1rem Tajawal,sans-serif!important}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity>.settings-accordion-body{margin:0!important;padding:12px}',
'#pageSettings #exportDataBtn,#pageSettings #importDataBtn,#pageSettings #restoreFromAutoBackupBtn,#pageSettings #cloudRunNowBtn,#pageSettings #cloudRestoreBtn{display:none!important}'
].join('\n');document.head.append(e);}
function header(c){return c?.querySelector(':scope > .settings-accordion-header');}
function title(c){return header(c)?.querySelector('span')?.textContent?.trim()||'';}
function keyFor(c){
 const t=title(c);if(c.id==='notificationSoundCard'||t.includes('صوت إشعارات التذكيرات'))return 'sound';
 if(c.id==='ratibCurrencyManager'||t.includes('إدارة العملات'))return 'currencies';
 if(c.id==='ratibStatementOptions'||t.includes('عرض وطباعة كشف الحساب'))return 'printing';
 if(t.includes('الأمان وقفل الحماية'))return 'security';
 if(t.includes('ترويسة الكشوفات')||t.includes('الهوية والبيانات الشخصية'))return 'identity';
 if(t.includes('الحسابات الافتراضية للسندات'))return 'defaults';
 if(t.includes('شجرة الحسابات والأسقف'))return 'tree';
 if(t.includes('بنود الميزانية'))return 'budget';
 if(t.includes('النسخ الاحتياطي'))return 'backupsettings';
 if(t.includes('مفضلتي'))return 'favorites';
 if(t.includes('الإدخال الصوتي')||t.includes('الإملاء الصوتي'))return 'voice';
 return '';
}
function setTitle(c,key){
 const h=header(c),sp=h?.querySelector('span');if(!sp)return;
 const lookup=Object.fromEntries(settings.map(([k,t])=>[k,t]));lookup.security='إعدادات الأمان وقفل الحماية';
 sp.textContent=lookup[key]||sp.textContent;
 if(!h.querySelector('svg.sidebar-icon'))h.prepend(icon(key==='security'?'lock':(settings.find(x=>x[0]===key)||[])[2]||'settings'));
}
function createCard(key,content){const c=document.createElement('div');c.className='card settings-accordion-card';c.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span></span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"></div>';c.dataset.ratibCreated=key;c.querySelector('.settings-accordion-body').append(content);setTitle(c,key);header(c).addEventListener('click',()=>{const body=c.querySelector('.settings-accordion-body');body.classList.toggle('open');header(c).setAttribute('aria-expanded',String(body.classList.contains('open')));});header(c).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();header(c).click();}});return c;}
function getCard(key){return [...($('pageSettings')?.querySelectorAll(':scope > .settings-accordion-card')||[])].find(c=>keyFor(c)===key)||null;}
function reorder(){
 const page=$('pageSettings');if(!page)return;page.classList.add('ratib-settings-reordered');
 const cards=[...page.querySelectorAll(':scope > .settings-accordion-card')];
 const map=new Map(cards.map(c=>[keyFor(c),c]).filter(([key])=>key));
 const sec=map.get('security'),identity=map.get('identity');
 if(sec&&identity&&sec.parentNode===page){const body=identity.querySelector(':scope > .settings-accordion-body');if(body){body.prepend(sec);sec.classList.add('ratib-inside-identity');}}
 if(!map.has('favorites')){const holder=document.createElement('div'),b=document.createElement('button');b.type='button';b.className='btn btn-ghost';b.textContent='فتح وإدارة مفضلتي';b.addEventListener('click',()=>document.querySelector('header .ratib-quick-btn[aria-label="فتح المفضلة السريعة"]')?.click());holder.append(b);const card=createCard('favorites',holder);page.append(card);map.set('favorites',card);}
 if(!map.has('voice')){const p=document.createElement('p');p.textContent='الإدخال الصوتي غير مفعّل في ملف هذه النسخة. لن تُنشأ وظيفة صوتية وهمية.';p.style.color='var(--muted)';const card=createCard('voice',p);page.append(card);map.set('voice',card);}
 const order=settings.map(x=>map.get(x[0])).filter(Boolean);
 for(let i=0;i<order.length;i++){const c=order[i],key=keyFor(c);setTitle(c,key);if(page.children[i]!==c)page.insertBefore(c,page.children[i]||null);}
}
function openCard(c){if(!c)return;const body=c.querySelector(':scope > .settings-accordion-body');if(!body||body.classList.contains('open'))return;if(c.dataset.ratibCreated){body.classList.add('open');header(c).setAttribute('aria-expanded','true');}else if(typeof window.toggleSettingsCard==='function')window.toggleSettingsCard(c);else body.classList.add('open');}
function openSetting(key){
 window.closeRatibSidebar?.();
 if(typeof window.navigateToTab==='function')window.navigateToTab('pageSettings',true);
 reorder();const card=getCard(key==='security'?'identity':key);if(!card)return;openCard(card);
 if(key==='security')openCard(card.querySelector('.ratib-inside-identity'));
 requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'start'}));
}
function buildSidebar(){
 const aside=$('appSidebar'),nav=aside?.querySelector('.sidebar-nav');if(!aside||!nav||aside.dataset.ratibApproved==='1')return;
 css();reorder();
 const existing={};for(const action of ['backup','restore','drive','about','exit'])existing[action]=aside.querySelector('[data-sidebar-action="'+action+'"]');
 const contact=$('sidebarContactMenu'),legacy=$('legacyImportSidebarBtn');
 const set=expandGroup('الإعدادات','settings');
 for(const [key,label,ico] of settings){
  if(key!=='identity'){set.children.append(make(label,ico,()=>openSetting(key)));continue;}
  const group=document.createElement('div'),inner=document.createElement('div');inner.className='ratib-menu-subchildren';inner.hidden=true;
  const main=make(label,ico,()=>{inner.hidden=!inner.hidden;main.setAttribute('aria-expanded',String(!inner.hidden));},true);main.setAttribute('aria-expanded','false');
  inner.append(make('الهوية والبيانات الشخصية','identity',()=>openSetting('identity')),make('إعدادات الأمان وقفل الحماية','lock',()=>openSetting('security')));
  group.append(main,inner);set.children.append(group);
 }
 const backup=expandGroup('النسخ المحلي والسحابي','cloud');
 backup.children.append(
  make('حفظ نسخة احتياطية محلية','backup',()=>{window.closeRatibSidebar?.();$('exportDataBtn')?.click();}),
  make('استعادة نسخة احتياطية محلية','down',()=>{window.closeRatibSidebar?.();$('importDataBtn')?.click();}),
  make('النسخ عبر Google Drive','cloud',()=>{window.closeRatibSidebar?.();existing.drive?.click();}),
  make('نسخ سحابي الآن','up',()=>{window.closeRatibSidebar?.();const b=$('cloudRunNowBtn');if(b&&getComputedStyle(b).display!=='none'&&!b.disabled)b.click();else existing.drive?.click();}),
  make('استعادة نسخة سحابية','down',()=>{window.closeRatibSidebar?.();const b=$('cloudRestoreBtn');if(b&&getComputedStyle(b).display!=='none'&&!b.disabled)b.click();else existing.drive?.click();})
 );
 if(legacy)backup.children.append(legacy);
 const license=make('إدخال كود التفعيل','key',()=>{window.closeRatibSidebar?.();if(window.RatibLicense?.showActivation)window.RatibLicense.showActivation();else window.showToast?.('شاشة التفعيل غير متاحة.','warn');});
 const help=expandGroup('المساعدة','help');if(contact)help.children.append(contact);if(existing.about)help.children.append(existing.about);
 nav.replaceChildren(set.section,backup.section,license,help.section);
 if(existing.exit){existing.exit.querySelector('span').textContent='خروج';nav.append(existing.exit);}
 aside.querySelector('.sidebar-footer')?.replaceChildren();
 aside.dataset.ratibApproved='1';
 let queued=false;new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.classList?.contains('settings-accordion-card')))||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reorder();});}).observe($('pageSettings'),{childList:true});
}
function money(el){
 if(!(el instanceof HTMLInputElement)||el.disabled||el.readOnly||el.type==='hidden')return false;
 if(el.matches('.number-formatted,.multi-line-amount,#ratibHeaderAmount,.spend-line-quote'))return true;
 if(['date','time','password','email','tel','search','checkbox','radio','file'].includes(el.type)||el.id==='financialCalcExpression')return false;
 const desc=[el.id,el.name,el.className,el.getAttribute('aria-label')||'',el.placeholder||''].join(' ');
 return /(?:amount|debit|credit|balance|opening|مبلغ|المبلغ|رصيد|قيمة|عمولة)/i.test(desc)&&!/(?:account-name|account-id|code|اسم|رقم الحساب|الحساب المقابل)/i.test(desc);
}
function normalize(v){return String(v).replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x6f0)).replace(/٫/g,'.').replace(/٬/g,',');}
function acceptable(v){const n=normalize(v);return /^[\d,.]*$/.test(n)&&n.split('.').length<=2&&!(n.split('.')[1]||'').includes(',');}
document.addEventListener('beforeinput',e=>{const el=e.target;if(!money(el)||e.isComposing||e.inputType?.startsWith('delete')||!e.data)return;const a=el.selectionStart??el.value.length,b=el.selectionEnd??a;if(!acceptable(el.value.slice(0,a)+e.data+el.value.slice(b)))e.preventDefault();},true);
document.addEventListener('paste',e=>{if(money(e.target)&&!acceptable(e.clipboardData?.getData('text')||''))e.preventDefault();},true);
document.addEventListener('input',e=>{const el=e.target;if(!money(el)||e.isComposing)return;const old=el.value;let v=normalize(old).replace(/[^\d,.]/g,'');const p=v.indexOf('.');if(p>=0)v=v.slice(0,p+1)+v.slice(p+1).replace(/[.,]/g,'');else v=v.replace(/,{2,}/g,',');if(v===old)return;const at=el.selectionStart??old.length;const prefix=normalize(old.slice(0,at)).replace(/[^\d,.]/g,'');el.value=v;try{el.setSelectionRange(Math.min(prefix.length,v.length),Math.min(prefix.length,v.length));}catch(_){}},true);
document.addEventListener('blur',e=>{const el=e.target;if(!money(el)||el.type==='number')return;const v=normalize(el.value);if(v.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(v))el.value=v.replace(/,/g,'');},true);
if(document.readyState==='complete')buildSidebar();else window.addEventListener('load',buildSidebar,{once:true});
})();