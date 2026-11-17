'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html dir="rtl"><head></head><body><button id="backToMenuBtn"></button><aside id="appSidebar"><nav class="sidebar-nav"><button data-sidebar-action="about"><span>حول التطبيق</span></button></nav></aside><div id="pageSettings"></div><details id="ratibSmartUserGuide"></details></body></html>',{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,page=d.getElementById('pageSettings');let history=0,about=0;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.rememberAppView=()=>history++;w.showAboutRatib=()=>about++;
w.toggleSettingsCard=c=>c.querySelector('.settings-accordion-body').classList.toggle('open');
const cards=[];
for(const [id,title] of [['font','الخطوط والأزرار'],['voice','الإدخال الصوتي'],['currency','إدارة العملات'],['backup','النسخ الاحتياطي'],['identity','الهوية والبيانات الشخصية'],['extra','خيار إضافي']]){
 const c=d.createElement('div');c.className='settings-accordion-card';c.id=id;c.innerHTML='<div class="settings-accordion-header"><span>'+title+'</span></div><div class="settings-accordion-body"><input value="قيمة محفوظة"></div>';page.append(c);cards.push(c);
}
const editor=d.createElement('details');editor.id='ratibBottomNavSettings170';editor.innerHTML='<summary>تخصيص شريط التنقل</summary><input value="اختصارات محفوظة">';page.append(editor);
w.eval(fs.readFileSync('ratib-sidebar-3.6.124.js','utf8'));w.eval(fs.readFileSync('ratib-settings-directory-3.6.211.js','utf8'));w.dispatchEvent(new w.Event('load'));
const pause=ms=>new Promise(r=>w.setTimeout(r,ms));
(async()=>{
 const root=d.getElementById('ratibSettingsDirectory211');assert(root);assert.equal(root.querySelectorAll('.ratib-setting-group').length,5);
 assert.equal(root.querySelectorAll('.ratib-setting-link').length,12,'all original cards, editor and four management actions');
 assert.equal(root.querySelectorAll('.ratib-settings-intro,.ratib-settings-search-label,.ratib-setting-label small').length,0,'no duplicate title or explanatory rows');
 assert.equal(d.getElementById('ratibSettingsSearch211').placeholder,'كل خيارات راتب في مكان واحد');
 assert(![...root.querySelectorAll('.ratib-setting-link')].some(b=>b.textContent.includes('الخيارات الأخرى')),'backup is not repeated under management');
 const search=d.getElementById('ratibSettingsSearch211');search.value='اِدخال صوتي';search.dispatchEvent(new w.Event('input'));assert.equal([...root.querySelectorAll('.ratib-setting-link')].filter(b=>!b.hidden).length,1,'Arabic search ignores marks and alef variants');
 search.value='لا يوجد';search.dispatchEvent(new w.Event('input'));assert(!root.querySelector('.ratib-settings-empty').hidden);
 search.value='';search.dispatchEvent(new w.Event('input'));
 const button=text=>[...root.querySelectorAll('.ratib-setting-link')].find(b=>b.textContent.includes(text));
 button('الإدخال الصوتي').click();assert(page.classList.contains('ratib-settings-detail'));assert.equal(page.querySelector('.ratib-settings-current'),cards[1]);assert.equal(history,1);assert.equal(cards[1].querySelector('input').value,'قيمة محفوظة');
 w.ratibResetSettingsDetail();assert(!page.classList.contains('ratib-settings-detail'));
 button('تخصيص شريط التنقل').click();assert(editor.open);assert(editor.classList.contains('ratib-settings-current'));w.ratibResetSettingsDetail();assert(!editor.open);assert(!editor.classList.contains('ratib-settings-current'));
 button('خيار إضافي').click();assert(cards[5].classList.contains('ratib-settings-current'),'unknown future settings remain reachable');w.ratibResetSettingsDetail();
 button('حول التطبيق').click();button('دليل الاستخدام الذكي').click();assert.equal(about,2);assert(d.getElementById('ratibSmartUserGuide').open);
 let rebuilds=0;const observer=new w.MutationObserver(()=>rebuilds++);observer.observe(root,{childList:true,subtree:true});cards[0].querySelector('input').value='نص جديد';cards[0].querySelector('input').dispatchEvent(new w.Event('input',{bubbles:true}));await pause(60);assert.equal(rebuilds,0,'value changes never rebuild the directory');observer.disconnect();
 const late=d.createElement('div');late.className='settings-accordion-card';late.innerHTML='<div class="settings-accordion-header"><span>خيار أضيف لاحقًا</span></div><div class="settings-accordion-body"></div>';page.append(late);await pause(100);assert(button('خيار أضيف لاحقًا'));
 assert.equal(new Set([...d.querySelectorAll('[id]')].map(n=>n.id)).size,d.querySelectorAll('[id]').length,'no duplicate control IDs');
 console.log('PASS settings directory: categories, Arabic search, original handlers/values, details and Back, editor, dynamic settings, About/guide and no rebuild on input');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
