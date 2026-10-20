const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const labels=[
 'إدارة شجرة الحسابات والأسقف',
 'إدارة بنود الميزانية / التكاليف',
 'الهوية والبيانات الشخصية',
 'إعدادات الطباعة',
 'إعدادات الحسابات الافتراضية للسندات',
 'إدارة العملات',
 'النسخ الاحتياطي',
 'مفضلتي',
 'الإدخال الصوتي',
 'صوت إشعارات التذكيرات'
];
const markup='<html lang="ar"><head></head><body><button id="sidebarMenuBtn" aria-label="فتح القائمة الجانبية">☰</button><aside id="appSidebar"><div class="sidebar-nav"></div></aside><section id="pageSettings"></section></body></html>';
const dom=new JSDOM(markup,{runScripts:'outside-only',url:'https://ratib.test/'});
const {window:w}=dom,doc=w.document;
w.HTMLElement.prototype.scrollIntoView=function(){};
w.closeRatibSidebar=()=>{};w.navigateToTab=()=>{};
for(const label of labels){
 const card=doc.createElement('div');card.className='settings-accordion-card';
 card.innerHTML='<div class="settings-accordion-header"><span></span></div><div class="settings-accordion-body"></div>';
 card.querySelector('.settings-accordion-header span').textContent=label;
 doc.getElementById('pageSettings').append(card);
}
w.eval(fs.readFileSync(require('node:path').join(__dirname,'ratib-sidebar-3.6.124.js'),'utf8'));
w.dispatchEvent(new w.Event('load'));
const nav=doc.querySelector('#appSidebar .sidebar-nav');
assert.equal(doc.getElementById('sidebarMenuBtn').getAttribute('aria-label'),'فتح الإعدادات');
assert(doc.getElementById('sidebarMenuBtn').querySelector('svg.sidebar-icon'));
const firstTen=[...nav.children].slice(0,10);
assert.equal(firstTen.length,10);
for(let i=0;i<10;i++)assert(firstTen[i].textContent.includes(labels[i]),'Menu order: '+labels[i]);
assert(nav.textContent.includes('النسخ المحلي والسحابي'));
assert(nav.textContent.includes('إدخال كود التفعيل'));
assert(nav.textContent.includes('المساعدة'));
firstTen[0].click();
assert.equal(doc.querySelectorAll('#pageSettings > .settings-accordion-card').length,10);
for(const c of doc.querySelectorAll('#pageSettings > .settings-accordion-card'))assert.equal(c.hidden,false,'Settings remain visible');
assert.equal(doc.querySelector('#ratibSettingsBack125'),null);
assert.equal(doc.getElementById('pageSettings').classList.contains('ratib-single-setting'),false);
console.log('PASS trial sidebar gear + ten direct settings + preserved settings cards');
dom.window.close();
