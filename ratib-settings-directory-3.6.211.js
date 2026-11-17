/* Settings directory. Existing controls, handlers and saved values stay in place. */
(()=>{'use strict';
const $=id=>document.getElementById(id),groups=[
 ['appearance','المظهر وسهولة الاستخدام','الخطوط، الأزرار، الإدخال والتنقل','◐'],
 ['finance','الحسابات والسندات','الحسابات والعملات والخيارات الافتراضية','▤'],
 ['identity','الهوية والطباعة','الاسم والشعار ومخرجات التقارير','▧'],
 ['safety','النسخ الاحتياطي والأمان','حماية البيانات والنسخ المحلي والسحابي','◇'],
 ['management','المساعدة وإدارة التطبيق','الدليل والتفعيل ومعلومات الإصدار','ⓘ']
];
const clean=value=>String(value||'').normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim();
let root,page,search,empty,items=[],signature=[],queued=false;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function describe(card){
 if(card.querySelector('#settingOrgName'))return ['identity','الهوية والشعار والترويسة','الاسم والشعار وبيانات الجهة في الواجهة والتقارير'];
 const title=(card.querySelector(':scope > .settings-accordion-header span,:scope > summary')?.textContent.trim()||'خيارات إضافية').replace(/^[^\p{L}\p{N}]+/u,'');
 const text=clean(title+' '+card.id+' '+card.dataset.ratibCreated);
 const descriptions=[
  [/خطوط|ازرار|buttonsize/,'اضبط حجم النص والأزرار كلًا على حدة'],[/الوان|palette/,'اختر لون واجهة التطبيق'],
  [/تقويم|تواريخ/,'التقويم الهجري والميلادي وعرض التاريخ'],[/مفضل/,'اختصاراتك وأيقوناتك المفضلة'],
  [/ادخال.*صوتي/,'إملاء الحقول والتبديل إلى لوحة المفاتيح'],[/اذكار|adhkar/,'إظهار الأذكار وسلوك تمريرها'],
  [/اصوات|تذكير/,'النغمة وتنبيهات التذكير'],[/nav|شريط/,'اختر الاختصارات ورتّبها'],
  [/شجره/,'إضافة الحسابات وتصنيفها والأسقف'],[/بنود|ميزانيه/,'بنود التكلفة والميزانية والنسب'],
  [/افتراضيه|default/,'حسابات السندات عند بدء الإدخال'],[/عملات|currenc/,'العملات والمنازل والأسعار المرجعية'],
  [/نسخ|backup/,'الحفظ التلقائي والاستعادة والنسخ السحابي'],[/امان|حمايه|security/,'قفل التطبيق والرمز السري والبصمة']
 ];
 const description=descriptions.find(([pattern])=>pattern.test(text))?.[1];
 if(/نسخ|backup|امان|حمايه|security/.test(text))return ['safety',title,description||'إعدادات الحفظ والحماية'];
 if(/هويه|ترويس|طباع|شعار|print|logo|كشف الحساب/.test(text))return ['identity',title,description||'خيارات عرض كشف الحساب والتقارير'];
 if(/شجره|بنود|ميزانيه|عملات|افتراضيه|currenc|default/.test(text))return ['finance',title,description||'خيارات الحسابات والسندات'];
 if(/خطوط|ازرار|الوان|تقويم|تواريخ|مفضل|صوت|اصوات|تذكير|اذكار|adhkar|nav|palette|buttonsize/.test(text))return ['appearance',title,description||'تخصيص الاستخدام على هذا الجهاز'];
 return ['management',title,'خيارات التطبيق'];
}
function openCard(card){window.closeRatibSidebar?.();window.RatibSettingsOpenCard?.(card);}
function about(guide=false){
 window.closeRatibSidebar?.();
 if(typeof window.showAboutRatib==='function')window.showAboutRatib();else $('appSidebar')?.querySelector('[data-sidebar-action="about"]')?.click();
 if(guide){const details=$('ratibSmartUserGuide');if(details){details.open=true;details.scrollIntoView?.({block:'nearest',behavior:'auto'});}}
}
function organizeSidebar(){
 const nav=$('appSidebar')?.querySelector('.sidebar-nav');if(!nav)return;
 const settings=nav.querySelector(':scope > .sidebar-group .ratib-menu-children');
 if(settings&&!settings.dataset.settingsDirectory){
  const buckets=new Map(groups.map(([key])=>[key,[]]));
  for(const child of [...settings.children]){
   const value=clean(child.querySelector('button span')?.textContent||child.textContent);
   const group=/نسخ|امان|حمايه/.test(value)?'safety':/هويه|طباع/.test(value)?'identity':/حساب|بنود|عملات/.test(value)?'finance':'appearance';
   buckets.get(group).push(child);
  }
  const fragment=document.createDocumentFragment();
  for(const [key,title] of groups){const links=buckets.get(key);if(!links.length)continue;fragment.append(node('h3','ratib-sidebar-settings-category',title),...links);}
  settings.replaceChildren(fragment);settings.dataset.settingsDirectory='1';
 }
 const help=[...nav.querySelectorAll(':scope > .sidebar-group')].find(g=>g.querySelector(':scope > button span')?.textContent.includes('المساعدة'))?.querySelector('.ratib-menu-children');
 if(help&&!$('ratibSidebarGuide211')){const b=node('button','','دليل الاستخدام الذكي');b.type='button';b.id='ratibSidebarGuide211';b.addEventListener('click',()=>about(true));help.prepend(b);}
}
function entry(title,description,action,keywords=''){
 const b=node('button','ratib-setting-link');b.type='button';
 const label=node('span','ratib-setting-label');label.append(node('strong','',title),node('small','',description));
 const arrow=node('span','ratib-setting-arrow','‹');arrow.setAttribute('aria-hidden','true');b.append(label,arrow);b.addEventListener('click',action);
 items.push({button:b,text:clean(title+' '+description+' '+keywords)});return b;
}
function filter(){
 const words=clean(search.value).split(/\s+/).filter(Boolean);let count=0;
 for(const item of items){const show=words.every(w=>item.text.includes(w));item.button.hidden=!show;if(show)count++;}
 for(const section of root.querySelectorAll('.ratib-setting-group'))section.hidden=![...section.querySelectorAll('.ratib-setting-link')].some(b=>!b.hidden);
 empty.hidden=count>0;
}
function refresh(){
 const cards=[...page.querySelectorAll(':scope > .settings-accordion-card,:scope > details')];
 if(cards.length===signature.length&&cards.every((c,i)=>c===signature[i]))return;
 signature=cards;items=[];
 const content=node('div','ratib-settings-groups'),sections=new Map();
 for(const [key,title,subtitle,glyph] of groups){
  const section=node('section','ratib-setting-group');section.dataset.settingsGroup=key;
  const head=node('div','ratib-setting-group-head'),badge=node('span','ratib-setting-badge',glyph);badge.setAttribute('aria-hidden','true');
  const text=node('div');text.append(node('h3','',title),node('p','',subtitle));head.append(badge,text);
  section.append(head);content.append(section);sections.set(key,section);
 }
 for(const card of cards){const [key,title,description]=describe(card);sections.get(key).append(entry(title,description,()=>openCard(card)));}
 const manage=sections.get('management');
 manage.append(
  entry('دليل الاستخدام الذكي','شرح الخطوات والبحث في موضوعات التطبيق',()=>about(true),'تعليمات مساعدة شرح'),
  entry('حول التطبيق','معلومات راتب والإصدار الحالي',()=>about(),String(window.ratibCurrentTrialVersion?.()||'')),
  entry('الترخيص والتفعيل','إدخال كود التفعيل أو مراجعة الترخيص',()=>window.RatibLicense?.showActivation?.({manual:true})),
  entry('المساعدة والتواصل','إرسال مشكلة أو مقترح للدعم',()=>{if(window.RatibSupportOpen)window.RatibSupportOpen();else $('ratibWhatsappHelpBtn')?.click();}),
  entry('إدارة التطبيق والخيارات الأخرى','النسخ المحلي والسحابي وأدوات التطبيق',()=>window.openRatibSidebar?.(),'drive استيراد نسخه استعادة')
 );
 const old=root.querySelector('.ratib-settings-groups');if(old)old.replaceWith(content);else root.insertBefore(content,empty);
 filter();
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
function install(){
 page=$('pageSettings');if(!page||$('ratibSettingsDirectory211'))return;
 root=node('section','ratib-settings-directory no-print');root.id='ratibSettingsDirectory211';
 const head=node('div','ratib-settings-intro');head.append(node('h2','','الإعدادات'),node('p','','كل خيارات راتب في مكان واحد'));
 const label=node('label','ratib-settings-search-label','ابحث عن إعداد');label.htmlFor='ratibSettingsSearch211';
 search=node('input','ratib-settings-search');search.id=label.htmlFor;search.type='search';search.placeholder='مثل: الخط، النسخ، التفعيل، الطباعة';search.autocomplete='off';search.addEventListener('input',filter);
 empty=node('p','ratib-settings-empty','لم نجد إعدادًا مطابقًا. جرّب اسمًا آخر.');empty.setAttribute('role','status');empty.hidden=true;
 root.append(head,label,search,empty);page.prepend(root);page.classList.add('ratib-settings-directory-ready');refresh();
 // Observe only direct additions: typing and changing values never rebuild the directory.
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.classList?.contains('settings-accordion-card')||n.matches?.('details')))))schedule();}).observe(page,{childList:true});
 window.RatibSettingsDirectory=Object.freeze({refresh:schedule});
 organizeSidebar();
 const aboutCard=$('ratibAboutModal')?.querySelector('.ratib-about-card'),guide=$('ratibSmartUserGuide'),close=$('closeRatibAboutBtn');
 if(aboutCard){aboutCard.classList.add('ratib-about-organized');if(guide&&close?.parentElement===aboutCard)aboutCard.insertBefore(guide,close);}
}
if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});
})();
