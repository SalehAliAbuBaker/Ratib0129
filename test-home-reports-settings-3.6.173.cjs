'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(name,'utf8');
const home=read('ratib-home-3.6.167.js'),nav=read('ratib-bottom-nav-3.6.170.js'),safety=read('ratib-statement-safety-3.6.172.js');
const html=read('index.html'),sw=read('sw.js');
assert.equal(require('./package.json').version,'3.6.177');
assert(html.includes('"version":"3.6.177","build":"p17700"'));
assert(sw.includes('"version":"3.6.177","build":"p17700"'));
assert(home.includes("main-menu-btn ratib-reports-tile")&&!home.includes("main-menu-btn ratib-statement-tile"));
assert(nav.includes("host.insertBefore(editor,help)"));
for(const source of [home,nav,safety])new vm.Script(source);
const voucher=['قبض وصرف','قيد بسيط','قيد مركب','قيد افتتاحي'].map(s=>'<button class="main-menu-btn"><span class="main-menu-icon">◉</span><span>'+s+'</span></button>').join('');
const fixture='<div id="mainWrap"><header class="no-print"><div class="logo"><img src="icon.png"><small id="appVersionLabel">إصدار</small></div></header>'+
 '<div id="pageDashboard"><div id="dashboardHomeContent"><div class="main-menu-grid ratib-home-main-grid">'+
 '<div class="ratib-home-voucher-shortcuts">'+voucher+'</div>'+
 '<button class="main-menu-btn"><span>سجل العمليات</span></button>'+
 '<button class="main-menu-btn"><span>التقارير</span></button>'+
 '<button class="main-menu-btn"><span>الحسابات</span></button>'+
 '<button class="main-menu-btn"><span>الإعدادات</span></button>'+
 '</div></div></div>'+
 '<div id="pageSettings" class="hidden"><section id="ratibSettingsHelp168">المساعدة والإدارة</section></div>'+
 '<div id="pageLedger" class="hidden"></div><div id="pageReports" class="hidden"></div>'+
 '<div id="pageAccountsTree" class="hidden"></div><div id="pageAccountOperations" class="hidden"></div></div>';
const dom=new JSDOM(fixture,{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
let route='';
w.navigateToTab=id=>{route=id;};
w.eval(home);w.eval(nav);w.eval(safety);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const grid=d.querySelector('.ratib-home-main-grid');
const visible=[...grid.querySelectorAll('.main-menu-btn')].filter(b=>!b.classList.contains('ratib-hidden-home-tile'));
assert.equal(visible.length,6,'Exactly six main home shortcuts');
assert.equal(visible[4].textContent.trim(),'الحسابات');
assert.equal(visible[5].textContent.trim(),'▥التقارير');
assert(visible[5].classList.contains('ratib-reports-tile'));
visible[5].click();
assert.equal(route,'pageReports','Sixth button should open Reports only, not statement picker');
assert.equal(d.querySelectorAll('.ratib-statement-tile').length,0);
assert.equal(d.querySelectorAll('#ratibDirectStatementChooser172').length,0);
const editor=d.getElementById('ratibBottomNavSettings170'),help=d.getElementById('ratibSettingsHelp168');
assert(editor&&help,'Both customization and help sections exist');
assert.equal(editor.nextElementSibling,help,'Navigation customization precedes help and administration');
assert(d.querySelector('.ratib-bottom-editor-list')?.textContent.includes('كشف الحساب'),'Statement remains configurable from navigation');
dom.window.close();
console.log('PASS Ratib 3.6.177: sixth shortcut opens reports, editor before help, statement unaffected');
