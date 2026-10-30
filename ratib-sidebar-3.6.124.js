/* RATIB — approved trial sidebar and numeric amount inputs. Trial only. */
(function(){
'use strict';
const $=id=>document.getElementById(id);

/* Official interface-only palette; green remains Ratib's default identity. */
const RATIB_PALETTE_KEY='ratib.ui.palette.v1';
const RATIB_PALETTE_COLORS=Object.freeze({green:'#0d5b45',gold:'#8a6323',blue:'#1e4e86',emerald:'#047857'});
function ratibStoredPalette(){
 try{const value=localStorage.getItem(RATIB_PALETTE_KEY);return Object.prototype.hasOwnProperty.call(RATIB_PALETTE_COLORS,value)?value:'green';}
 catch(_){return 'green';}
}
function ratibApplyPalette(value,persist=false){
 if(!Object.prototype.hasOwnProperty.call(RATIB_PALETTE_COLORS,value))return false;
 document.documentElement.dataset.ratibPalette=value;
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute('content',RATIB_PALETTE_COLORS[value]);
 if(persist){try{localStorage.setItem(RATIB_PALETTE_KEY,value);}catch(_){}}
 document.querySelectorAll('#ratibPaletteSettingsCard input[name="ratibPalette"]').forEach(el=>{el.checked=el.value===value;});
 return true;
}
ratibApplyPalette(ratibStoredPalette());
window.RatibPalette=Object.freeze({get:()=>document.documentElement.dataset.ratibPalette||'green',set:value=>ratibApplyPalette(value,true)});

// Password recovery remains unavailable; login retains the original warning only.
// Password recovery remains unavailable; login retains the original warning only.
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
 ['calendar','التاريخ والتقويم','settings'],
 ['buttonsize','حجم الأزرار والخط','settings'],
 ['palette','ألوان واجهة راتب','settings'],
 ['currencies','إدارة العملات','currency'],
 ['backupsettings','النسخ الاحتياطي','backup'],
 ['favorites','مفضلتي','favorites'],
 ['voice','الإدخال الصوتي','mic'],
 ['sound','أصوات حفظ المستندات والتنبيهات','sound']
];
function icon(name){const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('class','sidebar-icon');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','1.7');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.setAttribute('aria-hidden','true');n.innerHTML=shapes[name]||shapes.settings;return n;}
function make(label,ico,action,arrow){const b=document.createElement('button');b.type='button';b.append(icon(ico),Object.assign(document.createElement('span'),{textContent:label}));if(arrow){const a=icon('chevron');a.classList.add('ratib-menu-chevron');b.append(a);}b.addEventListener('click',action);return b;}
const menuGroups=[];
function expandGroup(label,ico){
 const section=document.createElement('section');section.className='sidebar-group';
 const children=document.createElement('div');children.className='ratib-menu-children';children.hidden=true;
 const b=make(label,ico,()=>{
  const open=children.hidden;
  for(const other of menuGroups){if(other.children!==children){other.children.hidden=true;other.button.setAttribute('aria-expanded','false');}}
  children.hidden=!open;b.setAttribute('aria-expanded',String(open));
 },true);
 b.setAttribute('aria-expanded','false');section.append(b,children);
 menuGroups.push({children,button:b});return {section,children,button:b};
}
function css(){if($('ratibApprovedSidebarStyle'))return;const e=document.createElement('style');e.id='ratibApprovedSidebarStyle';e.textContent=[
'.ratib-menu-children{margin:0 5px 6px;padding:4px 6px;border-inline-start:3px solid var(--border);border-radius:8px;background:var(--bg)}',
'.ratib-menu-children[hidden],.ratib-menu-subchildren[hidden]{display:none!important}',
'.sidebar-nav .ratib-menu-children button{font:900 calc(1rem * var(--ratib-font-scale,1)) Tajawal,sans-serif!important;line-height:1.4!important;min-height:48px;padding:10px 12px;color:var(--text)!important}',
'.sidebar-nav .ratib-menu-subchildren{padding-inline-start:9px;border-inline-start:2px solid var(--border)}',
'.sidebar-nav .ratib-menu-chevron{width:18px;height:18px;flex:0 0 18px;transition:transform .18s}',
'.sidebar-nav button[aria-expanded=true]>.ratib-menu-chevron{transform:rotate(180deg)}',
'.sidebar-nav button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}',
 '.sidebar-footer .ratib-sidebar-release{display:block;text-align:center;padding:8px 5px;color:var(--muted);font-size:.8rem;font-weight:800}',
'#pageSettings.ratib-settings-detail > :not(.ratib-settings-current){display:none!important}',
'#pageSettings.ratib-settings-detail > .ratib-settings-current{margin-top:0}',
'#pageSettings.ratib-settings-detail > .ratib-settings-current > .settings-accordion-body{display:block}',
'#pageSettings.ratib-security-detail > .ratib-settings-current > .settings-accordion-header{display:flex!important}',
'#pageSettings.ratib-security-detail > .ratib-settings-current > .settings-accordion-body > *{visibility:visible!important}',
'#pageSettings.ratib-security-detail > .ratib-settings-current > .settings-accordion-body{border:0!important;padding:0!important}',
'#pageSettings.ratib-security-detail .ratib-inside-identity{margin:0!important}',
'#pageSettings.ratib-security-detail .ratib-inside-identity > .settings-accordion-header{display:none!important}',
'#pageSettings.ratib-security-detail .ratib-inside-identity > .settings-accordion-body{display:block!important}',
'#pageSettings.ratib-settings-reordered .settings-accordion-header>svg.sidebar-icon+span{flex:1;min-width:0;overflow-wrap:anywhere}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card{background:var(--card);border:1px solid var(--border)!important;border-inline-start:1px solid var(--border)!important;box-shadow:none!important;border-radius:8px;padding:0!important;overflow:visible}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card>.settings-accordion-header{font:900 calc(1rem * var(--ratib-font-scale,1)) Tajawal,sans-serif!important;line-height:1.4!important;color:var(--text)!important;min-height:48px;padding:10px 12px;gap:10px;cursor:pointer}',
'#pageSettings.ratib-settings-reordered>.settings-accordion-card>.settings-accordion-body{padding:12px;margin:0!important;border-top:1px solid var(--border)}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity{margin:10px 0;border:1px solid var(--border)!important;border-radius:8px;padding:0!important;box-shadow:none!important}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity>.settings-accordion-header{padding:10px 12px;min-height:48px;font:900 calc(1rem * var(--ratib-font-scale,1)) Tajawal,sans-serif!important}',
'#pageSettings.ratib-settings-reordered .ratib-inside-identity>.settings-accordion-body{margin:0!important;padding:12px}',
'.ratib-settings-menu-caption{margin:5px 9px 3px;color:var(--muted);font-size:.86rem;font-weight:800}',
'.ratib-settings-more-toggle{width:100%;display:flex;align-items:center;justify-content:flex-start;border-top:1px solid var(--border);margin-top:7px}',
'#pageSettings:not(.ratib-settings-detail)>.ratib-settings-list-hidden{display:none!important}',
'#pageSettings .ratib-settings-finder{padding:12px;margin:0 0 12px;background:var(--card);border:1px solid var(--border);border-radius:12px}',
'#pageSettings .ratib-settings-finder label{display:block;font-weight:800;margin-bottom:6px}',
'#pageSettings .ratib-settings-finder input{display:block;min-height:44px;width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;padding:9px 12px;background:var(--bg);color:var(--text)}',
'#pageSettings .ratib-settings-finder-actions{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:8px;flex-wrap:wrap}',
'#pageSettings .ratib-settings-finder-actions button{min-height:40px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font:inherit;font-weight:700;cursor:pointer}',
'#pageSettings .ratib-settings-finder-actions button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}',
'#pageSettings .ratib-settings-count{color:var(--muted);font-size:.85rem}',
'#pageSettings .settings-accordion-body :is(button,input,select,textarea):focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
'#pageSettings .settings-accordion-card{cursor:default!important}',
'#pageSettings .settings-accordion-header{cursor:pointer!important}',
'#pageSettings .settings-accordion-body :is(input,select,textarea,button){position:relative;pointer-events:auto!important}',
'#pageSettings .settings-accordion-body :is(input:not([type="checkbox"]):not([type="radio"]),textarea){-webkit-user-select:text!important;user-select:text!important;cursor:text!important;touch-action:manipulation}',
'#pageSettings .settings-accordion-body select{cursor:pointer!important;touch-action:manipulation;-webkit-user-select:none;user-select:none}'
].join('\n');document.head.append(e);}
function header(c){return c?.querySelector(':scope > .settings-accordion-header');}
function title(c){return header(c)?.querySelector('span')?.textContent?.trim()||'';}
function keyFor(c){
 if(c.dataset.ratibCreated==='palette'||title(c).includes('ألوان واجهة راتب'))return 'palette';
 const t=title(c);if(c.dataset.ratibCreated==='buttonsize'||t.includes('حجم الأزرار'))return 'buttonsize';if(c.id==='notificationSoundCard'||t.includes('صوت إشعارات التذكيرات'))return 'sound';
 if(c.id==='rhSettingsCard'||c.dataset.ratibCreated==='calendar'||t.includes('التاريخ والتقويم'))return 'calendar';
 if(c.id==='ratibCurrencyManager'||t.includes('إدارة العملات'))return 'currencies';
 if(c.id==='ratibStatementOptions'||t.includes('عرض وطباعة كشف الحساب')||t.includes('إعدادات الطباعة'))return 'printing';
 if(t.includes('الأمان وقفل الحماية'))return 'security';
 if(t.includes('ترويسة الكشوفات')||t.includes('الهوية والبيانات الشخصية'))return 'identity';
 if(t.includes('الحسابات الافتراضية للسندات'))return 'defaults';
 if(t.includes('شجرة الحسابات والأسقف'))return 'tree';
 if(t.includes('بنود الميزانية'))return 'budget';
 if(t.includes('النسخ الاحتياطي'))return 'backupsettings';
 if(c.id==='ratibFavoritesSettingsCard'||t.includes('مفضلتي')||t.includes('المفضلة والأيقونات'))return 'favorites';
 if(c.id==='ratibVoiceSettingsCard'||t.includes('الإدخال الصوتي')||t.includes('الإملاء الصوتي'))return 'voice';
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
 // The security card remains independent of the identity card.
 if(!map.has('buttonsize')){
   const holder=document.createElement('div');holder.className='ratib-global-size-card';
    holder.innerHTML='<label for="ratibGlobalButtonSize">حجم أزرار التطبيق بالكامل</label><select id="ratibGlobalButtonSize" aria-label="حجم أزرار التطبيق"><option value="xsmall">صغير جدًا</option><option value="small">صغير</option><option value="medium">متوسط (الافتراضي)</option><option value="large">كبير</option><option value="xlarge">كبير جدًا</option></select><p>حجم الأزرار مستقل عن حجم الخط، ولا يغير الطباعة.</p><label for="ratibGlobalFontSize">حجم الخط في واجهة التطبيق</label><select id="ratibGlobalFontSize" aria-label="حجم الخط"><option value="xsmall">صغير جدًا — 82%</option><option value="small">صغير — 90%</option><option value="medium">متوسط (الافتراضي) — 100%</option><option value="large">كبير — 110%</option><option value="xlarge">كبير جدًا — 120%</option></select><p>حجم الخط لا يؤثر على طباعة وPDF أو مقاسات الأيقونات.</p><p id="ratibSizeSaveStatus" role="status" aria-live="polite" style="font-weight:700;color:var(--accent-strong)"></p>';
   const card=createCard('buttonsize',holder);
   card.id='ratibButtonSizeSettingsCard';page.append(card);map.set('buttonsize',card);
   holder.querySelector('#ratibGlobalButtonSize').value=window.RatibButtonSizing?.get?.()||'medium';
   holder.querySelector('#ratibGlobalFontSize').value=window.RatibButtonSizing?.getFont?.()||'medium';
    holder.querySelector('#ratibSizeSaveStatus').textContent='الأحجام الحالية محمّلة. غيّر أحد الخيارين لتطبيقه وحفظه.';
 }
 if(!map.has('palette')){
   const holder=document.createElement('div');holder.className='ratib-palette-settings';
   holder.innerHTML='<p class="ratib-palette-intro">الأخضر هو الهوية الأساسية لراتب، ويمكن اختيار لون آخر للواجهة على هذا الجهاز.</p>'+
    '<fieldset class="ratib-palette-choices"><legend>اختر لون واجهة التطبيق</legend>'+
    '<label class="ratib-palette-option"><input type="radio" name="ratibPalette" value="green"><span class="ratib-palette-swatch ratib-palette-swatch-green" aria-hidden="true"></span><span>الأخضر<small>الهوية الرسمية والافتراضية</small></span></label>'+
    '<label class="ratib-palette-option"><input type="radio" name="ratibPalette" value="gold"><span class="ratib-palette-swatch ratib-palette-swatch-gold" aria-hidden="true"></span><span>الذهبي<small>مظهر بديل</small></span></label>'+
    '<label class="ratib-palette-option"><input type="radio" name="ratibPalette" value="blue"><span class="ratib-palette-swatch ratib-palette-swatch-blue" aria-hidden="true"></span><span>الأزرق<small>مظهر بديل</small></span></label>'+
    '<label class="ratib-palette-option"><input type="radio" name="ratibPalette" value="emerald"><span class="ratib-palette-swatch ratib-palette-swatch-emerald" aria-hidden="true"></span><span>الزمردي<small>لون أخضر زاهٍ</small></span></label></fieldset>'+
    '<p class="ratib-palette-note">يُطبق اللون فورًا ويُحفظ تلقائيًا على الجهاز. لا تتغير بيانات الحسابات والسندات أو ألوان الطباعة والتقارير أو دلالات التنبيه والخطأ.</p>';
   const card=createCard('palette',holder);card.id='ratibPaletteSettingsCard';card.classList.add('no-print');
   page.append(card);map.set('palette',card);
   holder.querySelectorAll('input[name="ratibPalette"]').forEach(el=>{
     el.checked=el.value===window.RatibPalette.get();
     el.addEventListener('change',()=>{if(el.checked)ratibApplyPalette(el.value,true);});
   });
 }
 const order=settings.map(x=>map.get(x[0])).filter(Boolean);
 // Keep the finder outside the card slots. Moving cards ahead of it and then
 // prepending it again caused a MutationObserver/requestAnimationFrame loop,
 // detaching focused inputs and immediately closing Android select popups.
 const offset=$('ratibSettingsFinder')?.parentElement===page?1:0;
 if(offset&&page.firstElementChild!==$('ratibSettingsFinder'))page.prepend($('ratibSettingsFinder'));
 for(let i=0;i<order.length;i++){const c=order[i],key=keyFor(c),slot=i+offset;setTitle(c,key);if(page.children[slot]!==c)page.insertBefore(c,page.children[slot]||null);}
 const finder=$('ratibSettingsFinder');if(finder&&page.firstElementChild!==finder)page.prepend(finder);
}
function setCardOpen(c,open){
 if(!c)return;
 const body=c.querySelector(':scope > .settings-accordion-body'),h=header(c);if(!body)return;
 if(body.classList.contains('open')!==open){
  if(!c.dataset.ratibCreated&&typeof window.toggleSettingsCard==='function')window.toggleSettingsCard(c);
  else body.classList.toggle('open',open);
 }
 if(h)h.setAttribute('aria-expanded',String(open));
 const arrow=h?.querySelector('.accordion-arrow');if(arrow)arrow.textContent=open?'▲':'▼';
}
function openCard(c){setCardOpen(c,true);}
function isSettingsDetail(){return !!$('pageSettings')?.classList.contains('ratib-settings-detail');}
function resetSettingsDetail(){
 const page=$('pageSettings');if(!page||!isSettingsDetail())return;
 page.classList.remove('ratib-settings-detail','ratib-security-detail');
 for(const c of page.querySelectorAll('.settings-accordion-card')){
  c.classList.remove('ratib-settings-current');c.removeAttribute('aria-hidden');setCardOpen(c,false);
 }
 const label=$('backToMenuBtn')?.querySelector('span');
 if(label?.dataset.ratibOriginalBackLabel)label.textContent=label.dataset.ratibOriginalBackLabel;
 try{window.scrollTo?.({top:0,behavior:'auto'});}catch(_){}
}
function focusSetting(key,makeHistory){
 const page=$('pageSettings');if(!page)return;
 reorder();
 const main=getCard(key);if(!main)return;
 if(makeHistory&&!isSettingsDetail()&&typeof window.rememberAppView==='function')window.rememberAppView();
 for(const c of page.querySelectorAll('.settings-accordion-card')){setCardOpen(c,false);c.classList.remove('ratib-settings-current');c.removeAttribute('aria-hidden');}
 for(const c of page.querySelectorAll(':scope > .settings-accordion-card')){
  if(c===main)c.classList.add('ratib-settings-current');else c.setAttribute('aria-hidden','true');
 }
 page.classList.add('ratib-settings-detail');page.classList.toggle('ratib-security-detail',key==='security');
 openCard(main);
 // The independent security card opens directly.
 const label=$('backToMenuBtn')?.querySelector('span');
 if(label){if(!label.dataset.ratibOriginalBackLabel)label.dataset.ratibOriginalBackLabel=label.textContent;label.textContent='↪️ رجوع إلى الإعدادات';}
 requestAnimationFrame(()=>{main.scrollIntoView({behavior:'auto',block:'start'});});
}
function installSettingsNavigation(){
 const page=$('pageSettings'),back=$('backToMenuBtn');if(!page||page.dataset.ratibSinglePanel==='1')return;
 page.dataset.ratibSinglePanel='1';
 page.addEventListener('click',event=>{
  const h=event.target.closest('.settings-accordion-header');
  if(!h||!page.contains(h))return;
  const card=h.closest('.settings-accordion-card'),key=card&&(keyFor(card)||card.dataset.ratibCreated);
  if(!key)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(isSettingsDetail()&&page.classList.contains('ratib-security-detail')&&key==='identity')return;
  if(isSettingsDetail()&&page.querySelector('.ratib-settings-current')===card)return;
  focusSetting(key,true);
 },true);
 page.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key))return;
  const h=event.target.closest('.settings-accordion-header');if(!h||!page.contains(h))return;
  event.preventDefault();event.stopImmediatePropagation();h.click();
 },true);
 back?.addEventListener('click',event=>{
  if(!isSettingsDetail()||page.classList.contains('hidden'))return;
  event.preventDefault();event.stopImmediatePropagation();
  resetSettingsDetail();
  if(typeof window.goBackInApp==='function')window.goBackInApp();
 },true);
 window.addEventListener('popstate',()=>{
  if(!isSettingsDetail()||$('appSidebar')?.classList.contains('show')||document.querySelector('.modal-overlay.show'))return;
  resetSettingsDetail();
 },true);
 new MutationObserver(()=>{
  if(page.classList.contains('hidden')&&isSettingsDetail())resetSettingsDetail();
 }).observe(page,{attributes:true,attributeFilter:['class']});
}
function openSetting(key){
 window.closeRatibSidebar?.();
 const page=$('pageSettings');
 if(!page)return;
 if(typeof window.navigateToTab==='function')window.navigateToTab('pageSettings',true);
 // Application navigation can finish asynchronously while history is being restored.
 // Focusing a hidden page would immediately be undone by the settings observer.
 let attempts=0;
 const display=()=>{
  if(page.classList.contains('hidden')||!getCard(key)){
   if(++attempts<80)setTimeout(display,25);
   return;
  }
  focusSetting(key,true);
 };
 display();
}
window.RatibSettingsOpen=openSetting;
function installSettingsFinder(){
 const page=$('pageSettings');if(!page||$('ratibSettingsFinder'))return;
 const box=document.createElement('section');box.id='ratibSettingsFinder';box.className='ratib-settings-finder no-print';
 box.innerHTML='<label for="ratibSettingsSearch">ابحث عن الإعداد</label>'+
  '<input type="search" id="ratibSettingsSearch" autocomplete="off" placeholder="اسم الإعداد، مثل العملات أو الطباعة">'+
  '<div class="ratib-settings-finder-actions"><button type="button" id="ratibSettingsShowAll" aria-pressed="false">عرض جميع الإعدادات</button>'+
  '<span class="ratib-settings-count" id="ratibSettingsCount" aria-live="polite"></span></div>';
 page.prepend(box);
 const search=$('ratibSettingsSearch'),allButton=$('ratibSettingsShowAll'),count=$('ratibSettingsCount');
 const main=new Set(['tree','budget','defaults','currencies','backupsettings','security','calendar']);
 let showAll=false;
 const norm=s=>String(s||'').normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/[\u064B-\u065F\u0670]/g,'').toLowerCase();
 function render(){
  const query=norm(search.value.trim());
  const cards=[...page.querySelectorAll(':scope > .settings-accordion-card')];
  let shown=0;
  for(const card of cards){
   const key=keyFor(card),name=title(card);
   const visible=query?norm(name).includes(query):showAll||!key||main.has(key);
   if(card.classList.contains('ratib-settings-list-hidden')===visible)card.classList.toggle('ratib-settings-list-hidden',!visible);
   if(visible)shown++;
  }
  count.textContent=shown+' من '+cards.length+' إعداد';
  allButton.setAttribute('aria-pressed',String(showAll));
  allButton.textContent=showAll?'عرض الإعدادات الأساسية':'عرض جميع الإعدادات';
 }
 search.addEventListener('input',render);
 allButton.addEventListener('click',()=>{showAll=!showAll;render();});
 // Cards inserted by delayed modules remain discoverable, including advanced cards.
 let queued=false;
 new MutationObserver(()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;render();});
 }).observe(page,{childList:true,subtree:false});
 render();
}
function buildSidebar(){
 const aside=$('appSidebar'),nav=aside?.querySelector('.sidebar-nav');if(!aside||!nav||aside.dataset.ratibApproved==='1')return;
 css();reorder();installSettingsNavigation();installSettingsFinder();
 // Preserve the existing header button and theme; change only its glyph and accessible name.
 const menuGear=$('sidebarMenuBtn');
 if(menuGear){
  const glyph=icon('settings');glyph.style.width='22px';glyph.style.height='22px';glyph.style.verticalAlign='middle';
  menuGear.replaceChildren(glyph);
  menuGear.title='الإعدادات';menuGear.setAttribute('aria-label','فتح الإعدادات');
 }
 const existing={};for(const action of ['home','accounts','settings','license','backup','restore','drive','about','exit'])existing[action]=aside.querySelector('[data-sidebar-action="'+action+'"]');
 const oldBackupGroup=$('sidebarBackupTitle')?.closest('.sidebar-group');const backupExtras=[...(oldBackupGroup?.querySelectorAll(':scope > button')||[])].filter(el=>!['backup','restore','drive'].includes(el.dataset.sidebarAction));
 const contact=$('sidebarContactMenu');
 // Display all ten current settings as first-level entries above backup, activation and help.
 // Everyday tasks are visible; secondary preferences live in one optional group.
 const settingsMenu=expandGroup('الإعدادات','settings'),root=settingsMenu.children;
 const caption=document.createElement('p');caption.className='ratib-settings-menu-caption';caption.textContent='الإعدادات الأساسية';root.append(caption);
 const essential=['tree','budget','defaults','currencies','calendar','backupsettings','security'];
 for(const key of essential){
  const item=settings.find(row=>row[0]===key);
  root.append(make(key==='security'?'الأمان وقفل الحماية':item[1],key==='security'?'lock':item[2],()=>openSetting(key)));
 }
 const more=document.createElement('div'),details=document.createElement('div');
 details.className='ratib-menu-subchildren';details.hidden=true;details.id='ratibMoreSettingsLinks';
 const moreButton=make('خيارات إضافية','settings',()=>{
  details.hidden=!details.hidden;moreButton.setAttribute('aria-expanded',String(!details.hidden));
 },true);
 moreButton.classList.add('ratib-settings-more-toggle');moreButton.setAttribute('aria-controls',details.id);moreButton.setAttribute('aria-expanded','false');
 for(const key of ['identity','printing','buttonsize','palette','favorites','voice','sound']){
  const item=settings.find(row=>row[0]===key);
  details.append(make(item[1],item[2],()=>openSetting(key)));
 }
 more.append(moreButton,details);root.append(more);
 const backup=expandGroup('النسخ المحلي والسحابي','cloud');
 const relabel=(el,label)=>{const span=el?.querySelector('span');if(span)span.textContent=label;return el;};
 if(existing.backup)backup.children.append(relabel(existing.backup,'حفظ نسخة احتياطية محلية'));
 if(existing.restore)backup.children.append(relabel(existing.restore,'استعادة نسخة احتياطية محلية'));
 if(existing.drive)backup.children.append(relabel(existing.drive,'النسخ عبر Google Drive'));
 backup.children.append(
   make('نسخ سحابي الآن','up',()=>{window.closeRatibSidebar?.();const b=$('cloudRunNowBtn');if(b&&b.style.display!=='none'&&!b.disabled)b.click();else existing.drive?.click();}),
   make('استعادة نسخة سحابية','down',()=>{window.closeRatibSidebar?.();const b=$('cloudRestoreBtn');if(b&&b.style.display!=='none'&&!b.disabled)b.click();else existing.drive?.click();})
 );
 for(const ex of backupExtras)backup.children.append(ex);
 const license=existing.license||make('إدخال كود التفعيل','key',()=>{window.closeRatibSidebar?.();window.RatibLicense?.showActivation?.({manual:true});});relabel(license,'إدخال كود التفعيل');
 const help=expandGroup('المساعدة','help');if(contact)help.children.append(contact);if(existing.about)help.children.append(existing.about);
 const oldAnchors=document.createElement('div');oldAnchors.hidden=true;
 for(const name of ['home','accounts','settings'])if(existing[name])oldAnchors.append(existing[name]);
 nav.replaceChildren(settingsMenu.section,backup.section,license,help.section);
 if(existing.exit){relabel(existing.exit,'خروج');nav.append(existing.exit);}
 nav.append(oldAnchors);
 const footer=aside.querySelector('.sidebar-footer');
 if(footer){
  footer.replaceChildren();
  const version=document.createElement('small');version.id='sidebarCurrentVersion';
  version.className='ratib-sidebar-release';footer.append(version);
  syncSidebarVersion();
 }
 aside.dataset.ratibApproved='1';
 let queued=false;new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.classList?.contains('settings-accordion-card')))||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reorder();});}).observe($('pageSettings'),{childList:true});
}
function ratibTrialVersion(){
 return String(window.ratibCurrentTrialVersion?.()||(typeof RATIB_RELEASE!=='undefined'?RATIB_RELEASE.version:'')||window.RatibCommerce?.version||'').trim();
}
function syncSidebarVersion(){
 const v=ratibTrialVersion();if(!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(v))return;
 const label='الإصدار '+v+' (تجريبية)';
 const footer=$('sidebarCurrentVersion');if(footer)footer.textContent=label;
 const header=$('appVersionLabel');if(header)header.textContent=label;
 const about=document.querySelector('.ratib-about-version');if(about)about.textContent=label;
}
function money(el){
 if(!(el instanceof HTMLInputElement)||el.disabled||el.readOnly||el.type==='hidden')return false;
 // Account search controls are TEXT, even when their IDs contain Debit/Credit.
 // Never turn a customer's Arabic account name into digits by the amount sanitizer.
 if(el.matches('input.searchable-input')||el.closest('.searchable-select-wrap'))return false;
 if(el.matches('.number-formatted,.multi-line-amount,.voucher-cat-amt-input,#ratibHeaderAmount,.spend-line-quote'))return true;
 if(['date','time','password','email','tel','search','checkbox','radio','file'].includes(el.type)||el.id==='financialCalcExpression')return false;
 const desc=[el.id,el.name,el.className,el.getAttribute('aria-label')||'',el.placeholder||''].join(' ');
 return /(?:amount|debit|credit|balance|opening|مبلغ|المبلغ|رصيد|قيمة|عمولة)/i.test(desc)&&!/(?:account-name|account-id|code|اسم|رقم الحساب|الحساب المقابل)/i.test(desc);
}
function normalize(v){return String(v).replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x6f0)).replace(/٫/g,'.').replace(/٬/g,',');}
function acceptable(v){const n=normalize(v);return /^-?[\d,.]*$/.test(n)&&n.split('.').length<=2&&!(n.split('.')[1]||'').includes(',');}
document.addEventListener('beforeinput',e=>{const el=e.target;if(!money(el)||e.isComposing||e.inputType?.startsWith('delete')||!e.data)return;const a=el.selectionStart??el.value.length,b=el.selectionEnd??a;if(!acceptable(el.value.slice(0,a)+e.data+el.value.slice(b)))e.preventDefault();},true);
document.addEventListener('paste',e=>{if(money(e.target)&&!acceptable(e.clipboardData?.getData('text')||''))e.preventDefault();},true);
document.addEventListener('paste',e=>{const el=e.target;if(e.defaultPrevented||!money(el)||el.type!=='number')return;const raw=e.clipboardData?.getData('text')||'';if(!acceptable(raw))return;e.preventDefault();const value=normalize(raw).replace(/,/g,'');if(el.type==='number'){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));return;}const a=el.selectionStart??el.value.length,b=el.selectionEnd??a;el.value=el.value.slice(0,a)+value+el.value.slice(b);el.dispatchEvent(new Event('input',{bubbles:true}));},true);
document.addEventListener('input',e=>{const el=e.target;if(!money(el)||e.isComposing)return;const old=el.value;let v=normalize(old).replace(/[^\d,.\-]/g,'');v=(v.startsWith('-')?'-':'')+v.replace(/-/g,'');const p=v.indexOf('.');if(p>=0)v=v.slice(0,p+1)+v.slice(p+1).replace(/[.,]/g,'');else v=v.replace(/,{2,}/g,',');if(v===old)return;const at=el.selectionStart??old.length;const prefix=normalize(old.slice(0,at)).replace(/[^\d,.]/g,'');el.value=v;try{el.setSelectionRange(Math.min(prefix.length,v.length),Math.min(prefix.length,v.length));}catch(_){}},true);
document.addEventListener('blur',e=>{const el=e.target;if(!money(el)||el.type==='number')return;const v=normalize(el.value);if(v.includes(',')&&!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(v))el.value=v.replace(/,/g,'');},true);
// Never override native text selection or caret placement when the user taps a field.
// Commerce's number input is still temporarily made editable text while focused,
// so the existing numeric sanitizer continues to validate the typed digits.
function ratibPrepareEditableNumber(el){
 if(!(el instanceof HTMLInputElement)||el.disabled||el.readOnly)return;
 if(el.type==='number'&&el.closest('#pageCommerce')){
  el.dataset.ratibNumericSelect='1';
  el.dataset.ratibPriorInputMode=el.getAttribute('inputmode')||'';
  el.type='text';el.setAttribute('inputmode','decimal');
 }
}
// On entering a filled field, select its complete text once. A second tap keeps
// the browser's native caret/partial selection, so users can replace or edit words.
// A long press/drag never triggers a second forced selection after the gesture.
function ratibEditableText(el){
 if(!el||el.disabled||el.readOnly)return false;
 if(el instanceof HTMLTextAreaElement)return true;
 return el instanceof HTMLInputElement&&
  ['text','search','tel','email','url'].includes(el.type);
}
function ratibSelectInitialValue(el){
 if(!ratibEditableText(el)||!el.value)return;
 // Android WebView: programmatic selection opens Copy/Select all/Web search instead of the keyboard.
 // In settings retain native caret, keyboard entry and long-press selection.
 if(el.closest('#pageSettings'))return;
  // Do not force Android cut/copy selection on account input; preserve manual selection.
  if(el.matches?.('input.searchable-input,input.rit-search,input#accountsPagerSearchInput,input[id^="rc-search-"],input#rc-partyName,input#ratibQuickAccountName,input#ratibQuickParentSearch'))return;
 // Do not summon Android's floating selection toolbar on a normal tap
 // within incoming/outgoing commerce documents; long-press remains native.
 if(el.closest('#pageCommerce .rc-app[data-rc-mode="in"], #pageCommerce .rc-app[data-rc-mode="out"]'))return;
 try{el.select();}catch(_){}
}
let ratibNewFocusPointer=null;
document.addEventListener('pointerdown',e=>{
 const el=e.target;
 const incoming=ratibEditableText(el)||(el instanceof HTMLInputElement&&el.type==='number'&&el.closest('#pageCommerce'));
 ratibNewFocusPointer=incoming&&document.activeElement!==el?
  {el,time:Date.now(),x:e.clientX||0,y:e.clientY||0,moved:false}:null;
},true);
document.addEventListener('pointermove',e=>{
 const p=ratibNewFocusPointer;
 if(p&&(Math.abs((e.clientX||0)-p.x)>8||Math.abs((e.clientY||0)-p.y)>8))p.moved=true;
},true);
document.addEventListener('pointercancel',()=>{ratibNewFocusPointer=null;},true);
document.addEventListener('focusin',e=>{
 ratibPrepareEditableNumber(e.target);
 ratibSelectInitialValue(e.target);
},true);
document.addEventListener('click',e=>{
 const p=ratibNewFocusPointer;ratibNewFocusPointer=null;
 if(!p||p.el!==e.target||p.moved||Date.now()-p.time>550)return;
 if(document.activeElement===p.el)ratibSelectInitialValue(p.el);
},false);
document.addEventListener('focusout',e=>{
 const el=e.target;
 if(!(el instanceof HTMLInputElement)||el.dataset.ratibNumericSelect!=='1')return;
 delete el.dataset.ratibNumericSelect;
 const previousMode=el.dataset.ratibPriorInputMode||'';
 delete el.dataset.ratibPriorInputMode;
 try{el.type='number';}catch(_){}
 if(previousMode)el.setAttribute('inputmode',previousMode);else el.removeAttribute('inputmode');
},true);
if(document.readyState==='complete'){buildSidebar();syncSidebarVersion();}else window.addEventListener('load',()=>{buildSidebar();syncSidebarVersion();},{once:true});
})();