'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('ratib-report-menu-3.6.176.css','utf8');
const nav=fs.readFileSync('ratib-navigation-v3.6.149.js','utf8');
new vm.Script(nav);
assert.equal(require('./package.json').version,'3.6.180');
assert(html.includes('"version":"3.6.180","build":"p18000"'));
assert(sw.includes('"version":"3.6.180","build":"p18000"'));
assert(html.includes('ratib-report-menu-3.6.176.css?v=3.6.178'));
assert(sw.includes('./ratib-report-menu-3.6.176.css'));
assert(!html.includes('<script src="./ratib-report-tiles-3.6.175.js'),'Conflicting reparenting script MUST NOT execute');
assert(!html.includes('<link rel="stylesheet" href="./ratib-report-tiles-3.6.175.css'),'Conflicting stylesheet MUST NOT apply');
assert(!sw.includes('./ratib-report-tiles-3.6.175.js'),'Offline cache must no longer prefetch conflicting script');
assert(css.includes('#pageReports #ratibReportMenu.ratib-report-menu'),'Style the actual existing menu, not a second invented menu');
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'Two columns by default for phones');
assert(css.includes('@media screen and (min-width:680px)'),'Three columns only on wider layouts');
assert(css.includes('grid-auto-rows:minmax(112px,auto)!important'),'Rows grow only as needed to avoid clipped labels');
for(const p of ['min-height:112px!important','height:auto!important','max-height:none!important','padding:11px 5px!important','gap:7px!important','border-radius:15px!important','width:43px!important','height:43px!important','width:25px!important','height:25px!important'])assert(css.includes(p),p);
assert(css.includes('overflow-wrap:break-word!important'),'Arabic names must wrap naturally');
assert(css.includes('@media print {#ratibReportMenu{display:none!important}}'));
const items=[
 ['reportsGroupBudgetHeader','بنود الميزانية'],['reportsGroupTrialHeader','ميزان المراجعة'],
 ['reportsGroupMovementHeader','حركة الحسابات'],['reportsGroupPositionHeader','المركز المالي']
];
const body='<div id="pageReports">'+
 '<div id="reportsGroupStatementHeader" class="acc-accordion-header hidden" style="display:none!important">كشف الحساب</div>'+
 items.map(([id,label])=>'<div class="acc-accordion-header" id="'+id+'">'+label+'</div><div id="'+id.replace('Header','Body')+'"></div>').join('')+
 '</div>';
(async()=>{
 const dom=new JSDOM('<html><body>'+body+'</body></html>',{runScripts:'outside-only',url:'https://ratib.test/',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 let opens=0;
 const budget=d.getElementById('reportsGroupBudgetHeader');
 budget.addEventListener('click',()=>opens++);
 w.eval(nav);
 const menu=d.getElementById('ratibReportMenu');
 assert(menu,'Legacy navigation module creates exactly one authoritative report menu');
 assert.equal(d.querySelectorAll('#ratibReportMenu').length,1);
 for(const [id,label] of items){const el=d.getElementById(id);assert.equal(el.parentElement,menu,'Original button remains in the single menu: '+id);assert(el.querySelector('.ratib-report-icon svg'),'Icon present: '+label);assert(el.textContent.includes(label),'Label present: '+label);}
 const annual=documentSafeCreate(d);d.getElementById('pageReports').append(annual);
 await new Promise(ok=>setTimeout(ok,25));
 assert.equal(annual.parentElement,menu,'Year closure gets joined to the real menu after dynamic insertion');
 assert(annual.querySelector('.ratib-report-icon svg'),'Year closure icon exists');
 assert.equal(menu.querySelectorAll('.ratib-report-tile').length,6,'Five visible choices plus the hidden statement control');
 assert.equal(d.querySelectorAll('.ratib-report-menu').length,1,'No extra competing report menu');
 budget.click();assert.equal(opens,1,'Original report event listeners remain active');
 dom.window.close();
 console.log('PASS Ratib 3.6.177 hotfix: responsive report grid, original click handlers and icons');
})().catch(e=>{console.error(e);process.exitCode=1;});
function documentSafeCreate(d){const button=d.createElement('button');button.id='yearToolOpen';button.textContent='الإغلاق السنوي';return button;}
