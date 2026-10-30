const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const labels=[
 'إدارة شجرة الحسابات والأسقف','إدارة بنود الميزانية / التكاليف',
 'الهوية والبيانات الشخصية','إعدادات الطباعة',
 'إعدادات الحسابات الافتراضية للسندات','حجم الأزرار','إدارة العملات','التاريخ والتقويم',
 'النسخ الاحتياطي','مفضلتي','الإدخال الصوتي','أصوات حفظ المستندات والتنبيهات'
];
const markup='<html lang="ar"><head></head><body>'+
 '<button id="sidebarMenuBtn">☰</button><button id="backToMenuBtn"><span>الرجوع إلى الشاشة السابقة</span></button>'+
 '<aside id="appSidebar"><div class="sidebar-nav"><button data-sidebar-action="exit"><span>خروج</span></button></div><div class="sidebar-footer"></div></aside><small id="appVersionLabel"></small><section id="pageSettings"></section><section id="pageCommerce"><input type="number" id="rc-amount" value="12345"><input type="text" id="rc-note" value="نص تجريبي"></section></body></html>';
const dom=new JSDOM(markup,{runScripts:'outside-only',url:'https://ratib.test/',pretendToBeVisual:true});
const w=dom.window,doc=w.document;
w.RatibCommerce={version:'3.6.139'};
w.HTMLElement.prototype.scrollIntoView=function(){};
w.scrollTo=()=>{};w.closeRatibSidebar=()=>{};
let visits=0,backs=0,history=0;
w.navigateToTab=()=>{visits++;};
w.rememberAppView=()=>{history++;};
w.goBackInApp=()=>{backs++;};
for(const label of [...labels,'إعدادات الأمان وقفل الحماية']){
 const card=doc.createElement('div');card.className='settings-accordion-card';
 card.innerHTML='<div class="settings-accordion-header"><span></span></div><div class="settings-accordion-body"></div>';
 card.querySelector('.settings-accordion-header span').textContent=label;
 doc.getElementById('pageSettings').append(card);
}
w.eval(fs.readFileSync(require('node:path').join(__dirname,'ratib-sidebar-3.6.124.js'),'utf8'));
w.dispatchEvent(new w.Event('load'));
const nav=doc.querySelector('#appSidebar .sidebar-nav'),page=doc.getElementById('pageSettings');
const visibleEntries=[...nav.children].filter(n=>!n.hidden);
assert.equal(visibleEntries.length,5,'five visible top-level menu entries; hidden legacy anchors are not menu items');
assert.equal(doc.getElementById('sidebarCurrentVersion')?.textContent,'الإصدار 3.6.139 (تجريبية)','sidebar footer uses live release');
assert.equal(doc.getElementById('appVersionLabel')?.textContent,'الإصدار 3.6.139 (تجريبية)','header release matches sidebar');
const commerceNumber=doc.getElementById('rc-amount'),commerceText=doc.getElementById('rc-note');
commerceNumber.focus();
assert.equal(commerceNumber.type,'text','numeric commerce control becomes selectable only while focused');
assert.equal(commerceNumber.selectionStart,0);
assert.equal(commerceNumber.selectionEnd,5,'numeric amount selected in full');
commerceText.focus();
assert.equal(commerceNumber.type,'number','numeric type restored when focus changes');
assert.equal(commerceText.selectionStart,0);
assert.equal(commerceText.selectionEnd,commerceText.value.length,'text selected in full');

assert.deepEqual(visibleEntries.map(n=>(n.matches('.sidebar-group')?n.querySelector(':scope > button'):n).textContent.trim()),[
 'الإعدادات','النسخ المحلي والسحابي','إدخال كود التفعيل','المساعدة','خروج'
]);
assert.equal(doc.getElementById('sidebarMenuBtn').getAttribute('aria-label'),'فتح الإعدادات');
const groups=nav.querySelectorAll(':scope > .sidebar-group');
assert.equal(groups.length,3);
groups[0].querySelector('button').click();
assert.equal(groups[0].querySelector('.ratib-menu-children').hidden,false);
const settingsRoot=groups[0].querySelector('.ratib-menu-children');
const entries=[...settingsRoot.children];
assert.equal(entries.length,9,'seven essential settings including calendar, caption and advanced toggle');
assert.equal(entries[0].textContent.trim(),'الإعدادات الأساسية');
const essentials=['إدارة شجرة الحسابات والأسقف','إدارة بنود الميزانية / التكاليف','إعدادات الحسابات الافتراضية للسندات','إدارة العملات','التاريخ والتقويم','النسخ الاحتياطي','الأمان وقفل الحماية'];
for(let i=0;i<essentials.length;i++)assert(entries[i+1].textContent.includes(essentials[i]));
const extra=settingsRoot.querySelector('#ratibMoreSettingsLinks');
assert(extra?.hidden,'advanced preferences hidden until requested');
assert.equal(extra.querySelectorAll(':scope > button').length,7);
groups[1].querySelector('button').click();
assert(groups[0].querySelector('.ratib-menu-children').hidden,'other menu folds when another opens');
groups[0].querySelector('button').click();
entries[1].click();
assert.equal(visits,1);
assert.equal(history,1,'detail has one return entry');
assert(page.classList.contains('ratib-settings-detail'));
assert.equal(page.querySelectorAll(':scope > .ratib-settings-current').length,1);
assert(page.querySelector('.ratib-settings-current').textContent.includes(essentials[0]));
doc.getElementById('backToMenuBtn').click();
assert(!page.classList.contains('ratib-settings-detail'),'single back restores settings list');
assert.equal(backs,1,'one app back');
assert.equal(page.querySelectorAll(':scope > .settings-accordion-card').length,14);
assert(doc.getElementById('ratibSettingsFinder'),'search control injected');
const count=doc.getElementById('ratibSettingsCount');
assert(count.textContent.includes('من 14'),'all card count reported');
const search=doc.getElementById('ratibSettingsSearch');
search.value='الطباعة';search.dispatchEvent(new w.Event('input',{bubbles:true}));
const printCard=[...page.querySelectorAll(':scope > .settings-accordion-card')].find(c=>c.textContent.includes('إعدادات الطباعة'));
assert(printCard&&!printCard.classList.contains('ratib-settings-list-hidden'),'search reveals advanced settings');
search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));
const allButton=doc.getElementById('ratibSettingsShowAll');
assert(printCard.classList.contains('ratib-settings-list-hidden'),'advanced card hidden in default list');
allButton.click();
assert(!printCard.classList.contains('ratib-settings-list-hidden'),'show-all reveals advanced card');
assert.equal(allButton.getAttribute('aria-pressed'),'true');
allButton.click();
const currencyCard=[...page.querySelectorAll(':scope > .settings-accordion-card')].find(c=>c.textContent.includes('إدارة العملات'));
currencyCard.querySelector('.settings-accordion-header').click();
assert(page.classList.contains('ratib-settings-detail'));
assert.equal(page.querySelector('.ratib-settings-current'),currencyCard);
doc.getElementById('backToMenuBtn').click();
entries[5].click();
assert(page.querySelector('.ratib-settings-current')?.textContent.includes('التاريخ والتقويم'),'Calendar opens from essential settings');
doc.getElementById('backToMenuBtn').click();
entries.at(-1).querySelector('button').click();
assert(!extra.hidden,'advanced group can expand');
const printEntry=[...extra.querySelectorAll('button')].find(b=>b.textContent.includes('إعدادات الطباعة'));
printEntry.click();
assert(page.classList.contains('ratib-settings-detail'));
assert(page.querySelector('.ratib-settings-current').textContent.includes('إعدادات الطباعة'));
doc.getElementById('backToMenuBtn').click();
entries[7].click();
assert(page.classList.contains('ratib-security-detail'));
assert(page.querySelector('.ratib-settings-current').textContent.includes('إعدادات الأمان'));
doc.getElementById('backToMenuBtn').click();
assert(!page.classList.contains('ratib-security-detail'));
console.log('PASS trial simplified settings: essential links, advanced options, search, accessibility and direct back');
dom.window.close();
