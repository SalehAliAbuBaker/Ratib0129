const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const labels=[
 'إدارة شجرة الحسابات والأسقف','إدارة بنود الميزانية / التكاليف',
 'الهوية والبيانات الشخصية','إعدادات الطباعة',
 'إعدادات الحسابات الافتراضية للسندات','حجم الأزرار','إدارة العملات',
 'النسخ الاحتياطي','مفضلتي','الإدخال الصوتي','أصوات التنبيهات والتذكيرات'
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
assert.equal(doc.getElementById('sidebarCurrentVersion')?.textContent,'الإصدار 3.6.139','sidebar footer uses live release');
assert.equal(doc.getElementById('appVersionLabel')?.textContent,'الإصدار 3.6.139','header release matches sidebar');
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
const entries=[...groups[0].querySelector('.ratib-menu-children').children];
assert.equal(entries.length,11);
for(let i=0;i<11;i++)assert(entries[i].textContent.includes(labels[i]),'Settings menu order: '+labels[i]);
groups[1].querySelector('button').click();
assert.equal(groups[0].querySelector('.ratib-menu-children').hidden,true,'other menu folds when another opens');
groups[0].querySelector('button').click();
entries[0].click();
assert.equal(visits,1);
assert.equal(history,1,'detail has one return entry');
assert(page.classList.contains('ratib-settings-detail'));
assert.equal(page.querySelectorAll(':scope > .ratib-settings-current').length,1);
assert(page.querySelector('.ratib-settings-current').textContent.includes(labels[0]));
assert.equal(doc.getElementById('backToMenuBtn').textContent.includes('الإعدادات'),true);
doc.getElementById('backToMenuBtn').click();
assert(!page.classList.contains('ratib-settings-detail'),'single back restores settings list');
assert.equal(backs,1,'one app back');
assert.equal(page.querySelectorAll(':scope > .settings-accordion-card').length,12);
const currencyCard=[...page.querySelectorAll(':scope > .settings-accordion-card')].find(c=>c.textContent.includes('إدارة العملات'));
currencyCard.querySelector('.settings-accordion-header').click();
assert(page.classList.contains('ratib-settings-detail'));
assert.equal(page.querySelector('.ratib-settings-current'),currencyCard);
doc.getElementById('backToMenuBtn').click();
const identityEntry=entries[2];
identityEntry.querySelector('button').click();
const sec=[...identityEntry.querySelectorAll('button')].find(b=>b.textContent.includes('إعدادات الأمان'));
sec.click();
assert(page.classList.contains('ratib-security-detail'));
assert(page.querySelector('.ratib-settings-current').textContent.includes('إعدادات الأمان'));
doc.getElementById('backToMenuBtn').click();
assert(!page.classList.contains('ratib-security-detail'));
console.log('PASS trial 3.6.127 five main groups, exclusive detail, direct back, identity/security');
dom.window.close();
