'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
new vm.Script(js);
assert.equal(require('./package.json').version,'3.6.179');
assert(html.includes('"version":"3.6.179","build":"p17900"'));
assert(sw.includes('"version":"3.6.179","build":"p17900"'));
assert(sw.includes('./ratib-sidebar-3.6.124.js'));
assert(!js.includes('#pageSettings #exportDataBtn,#pageSettings #importDataBtn'),'Do not hide native backup controls');
const ids=['exportDataBtn','importDataBtn','importFileInput','autoBackupFolderBtn','restoreFromAutoBackupBtn','cloudSaveBtn','cloudRunNowBtn','cloudRestoreBtn'];
for(const id of ids)assert(html.includes('id="'+id+'"'),'Original backup control kept: '+id);
assert(html.includes('إنشاء نسخة احتياطية محلية')&&html.includes('استعادة نسخة احتياطية محلية'));
assert(html.includes('النسخ السحابية والاستعادة'));
assert(html.includes("document.getElementById('exportDataBtn')?.addEventListener('click'"));
assert(html.includes("document.getElementById('importDataBtn')?.addEventListener('click'"));
assert(html.includes("$('cloudRunNowBtn')?.addEventListener('click'"));
assert(html.includes("$('cloudRestoreBtn')?.addEventListener('click'"));
assert(html.includes("downloadBackupPayload(rollback,'ratib-before-restore-'")||html.includes("downloadBackupPayload(rollback,`ratib-before-restore-"),'Restore still saves rollback backup');
assert(html.includes("if(!confirm('سيتم استبدال بيانات راتب الرسمي.")||html.includes("if(!confirm(`سيتم استبدال جميع البيانات الحالية"),'Restore still explicitly confirms data replacement');
const fixture='<html lang="ar"><head></head><body>'+
 '<button id="sidebarMenuBtn">⚙</button><button id="backToMenuBtn"></button>'+
 '<aside id="appSidebar"><nav class="sidebar-nav"></nav><div class="sidebar-footer"></div></aside>'+
 '<small id="appVersionLabel"></small><div id="pageSettings">'+
 '<details id="ratibBottomNavSettings170"><summary>تخصيص شريط التنقل السفلي</summary></details>'+
 '<section id="ratibSettingsHelp168">المساعدة والإدارة</section>'+
 '<div class="card settings-accordion-card"><div class="settings-accordion-header"><span>📁 النسخ الاحتياطي</span></div>'+
 '<div class="settings-accordion-body"><button id="exportDataBtn">نسخ محلي</button><button id="importDataBtn">استعادة محلية</button><button id="restoreFromAutoBackupBtn">استعادة تلقائية</button><button id="cloudRunNowBtn">نسخ سحابي</button><button id="cloudRestoreBtn">استعادة سحابية</button></div></div>'+
 '<div class="card settings-accordion-card"><div class="settings-accordion-header"><span>إعدادات الأمان وقفل الحماية</span></div><div class="settings-accordion-body"></div></div>'+
 '</div></body></html>';
const dom=new JSDOM(fixture,{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.RatibCommerce={version:'3.6.178'};w.HTMLElement.prototype.scrollIntoView=function(){};
w.scrollTo=()=>{};w.RatibButtonSizing={get:()=> 'medium',getFont:()=> 'medium'};
w.eval(js);w.dispatchEvent(new w.Event('load'));
const card=d.getElementById('ratibBackupSettingsCard'),editor=d.getElementById('ratibBottomNavSettings170'),help=d.getElementById('ratibSettingsHelp168');
assert(card&&editor&&help,'Backup card and both following settings sections exist');
assert.equal(card.nextElementSibling,editor,'Backup card immediately precedes navigation customization');
assert.equal(editor.nextElementSibling,help,'Navigation customization remains before help');
assert(card.querySelector('.settings-accordion-header').textContent.includes('النسخ الاحتياطي والاستعادة'));
const injected=d.getElementById('ratibApprovedSidebarStyle')?.textContent||'';
assert(!injected.includes('exportDataBtn')&&!injected.includes('cloudRestoreBtn'));
for(const id of ['exportDataBtn','importDataBtn','restoreFromAutoBackupBtn','cloudRunNowBtn','cloudRestoreBtn']){
 assert(d.getElementById(id),'The actual preexisting control remains attached to original card: '+id);
}
dom.window.close();
console.log('PASS Ratib 3.6.177: native local/cloud backup and restore visible, settings order and safety');
