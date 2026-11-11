'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-home-3.6.171.js','utf8'),css=fs.readFileSync('ratib-home-3.6.171.css','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
new vm.Script(src);
assert.equal(require('./package.json').version,'3.6.179');
assert(html.includes('ratib-home-3.6.171.js?v=3.6.178')&&html.includes('ratib-home-3.6.171.css?v=3.6.178'));
assert(sw.includes('./ratib-home-3.6.171.js')&&sw.includes('./ratib-home-3.6.171.css'));
assert(css.includes('--rb-action-height')&&css.includes('#pageReports .ratib-report-action'),'Report buttons must use the same density variables');
const fixture='<div id="mainWrap"><header class="no-print ratib-home-app-header"><div class="logo"><img src="a"><span class="ratib-home-brand"><span class="ratib-brand-name">راتب</span><span class="ratib-brand-sub">للتنظيم والتدبير المالي</span></span></div><div class="header-tools"><small id="appVersionLabel">الإصدار قديم</small></div></header></div>'+
 '<div id="dashboardHomeContent"><button class="ratib-statement-tile">كشف حساب</button></div>'+
 '<nav id="ratibHomeBottomNav"><button data-ratib-page="statement">كشف حساب</button></nav>'+
 '<div id="pageAccountOperations" class="hidden"><div class="account-operations-screen"><div id="accountOperationsScreenTitle"></div><div id="accountOperationsStandalonePanel"></div></div></div>';
const dom=new JSDOM(fixture,{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
let target='',opened='';
w.ratibCurrentTrialVersionLabel=()=> 'الإصدار 3.6.178';
w.getCanonicalCatalog=()=>[{main:'رئيسي',group:'مجموعة',sub:'فرعي',details:[['100','صندوق النقدية'],['101','العمقي للصرافة']]}];
w.navigateToTab=page=>{target=page;d.getElementById('pageAccountOperations').classList.remove('hidden');};
w.openAccountFromPager=name=>{opened=name;};
w.eval(src);d.dispatchEvent(new w.Event('DOMContentLoaded'));
const label=d.getElementById('appVersionLabel');assert.equal(label.textContent,'الإصدار 3.6.178');
assert.equal(label.parentElement.className,'ratib-home-brand','Release appears immediately under subtitle');
d.querySelector('.ratib-statement-tile').click();
assert.equal(target,'pageAccountOperations','Home must route to standalone account statement, not reports');
const input=d.getElementById('ratibDirectStatementSearch');assert(input);
input.value='صندوق';input.dispatchEvent(new w.Event('input',{bubbles:true}));
const choice=d.querySelector('.ratib-statement-account');assert(choice);choice.click();
assert.equal(opened,'صندوق النقدية');
d.querySelector('[data-ratib-page="statement"]').click();assert.equal(target,'pageAccountOperations');
dom.window.close();console.log('PASS Ratib 3.6.177 compact report buttons, persistent header release and direct statement navigation');
