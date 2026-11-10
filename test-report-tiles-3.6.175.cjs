'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-report-tiles-3.6.175.js','utf8');
const css=fs.readFileSync('ratib-report-tiles-3.6.175.css','utf8');
const homeCss=fs.readFileSync('ratib-home-3.6.167.css','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
new vm.Script(src);
assert.equal(require('./package.json').version,'3.6.175');
assert(html.includes('ratib-report-tiles-3.6.175.js?v=3.6.175'));
assert(html.includes('ratib-report-tiles-3.6.175.css?v=3.6.175'));
assert(sw.includes('./ratib-report-tiles-3.6.175.js')&&sw.includes('./ratib-report-tiles-3.6.175.css'));
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'),'three-column reports grid must match home');
assert(homeCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
for(const x of ['min-height:100px!important','padding:11px 5px!important','gap:7px!important','border-radius:15px!important','width:43px!important','height:43px!important','width:25px!important','height:25px!important'])assert(css.includes(x),'home dimensions: '+x);
assert(css.includes('@media print{#ratibReportsTiles175{display:none!important}}'));
const keys=[['reportsGroupBudgetHeader','reportsGroupBudgetBody'],['reportsGroupMovementHeader','reportsGroupMovementBody'],['reportsGroupPositionHeader','reportsGroupPositionBody'],['reportsGroupTrialHeader','reportsGroupTrialBody']];
const fixture='<div id="pageReports">'+
 '<div id="reportsGroupStatementBody" class="hidden"></div>'+
 keys.map(([head,body])=>'<div class="acc-accordion-header" id="'+head+'">عنوان التقرير</div><div class="acc-accordion-body" id="'+body+'">بيانات التقرير</div>').join('')+
 '</div>';
const dom=new JSDOM(fixture,{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
let clicks=0;
const nodes=keys.map(([h,b])=>[d.getElementById(h),d.getElementById(b)]);
for(const [h,b] of nodes)h.addEventListener('click',()=>{
 clicks++;
 const open=b.classList.contains('open');
 for(const [otherH,otherB] of nodes){otherH.classList.remove('open');otherB.classList.remove('open');}
 if(!open){h.classList.add('open');b.classList.add('open');}
});
w.eval(src);d.dispatchEvent(new w.Event('DOMContentLoaded'));
const menu=d.getElementById('ratibReportsTiles175');assert(menu,'primary report menu inserted');
assert.equal(menu.children.length,4,'exactly four original report categories');
assert.equal(d.getElementById('pageReports').querySelectorAll('.acc-accordion-header').length,4,'no duplicate report controls');
for(let i=0;i<4;i++){
 assert.strictEqual(menu.children[i],nodes[i][0],'original report element moved without cloning, retaining listeners');
 assert.equal(menu.children[i].getAttribute('role'),'button');
 assert.equal(menu.children[i].getAttribute('tabindex'),'0');
 assert(menu.children[i].querySelector('.ratib-report-primary-icon svg'));
}
menu.children[0].click();
Promise.resolve().then(()=>{
 assert.equal(clicks,1);
 assert.equal(nodes[0][1].classList.contains('open'),true);
 assert.equal(menu.children[0].getAttribute('aria-expanded'),'true');
 const enter=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
 menu.children[1].dispatchEvent(enter);
 return Promise.resolve();
}).then(()=>{
 assert.equal(clicks,2);
 assert.equal(nodes[0][1].classList.contains('open'),false);
 assert.equal(nodes[1][1].classList.contains('open'),true);
 assert.equal(menu.children[1].getAttribute('aria-expanded'),'true');
 menu.children[1].click();
 return Promise.resolve();
}).then(()=>{
 assert.equal(clicks,3);
 assert.equal(nodes[1][1].classList.contains('open'),false);
 assert.equal(menu.children[1].getAttribute('aria-expanded'),'false');
 w.close();console.log('PASS Ratib 3.6.175: report-category tiles match home dimensions and original report actions remain intact');
}).catch(error=>{console.error(error);process.exitCode=1;});
