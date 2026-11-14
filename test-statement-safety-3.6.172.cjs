'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-statement-safety-3.6.172.js','utf8'),css=fs.readFileSync('ratib-statement-safety-3.6.172.css','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
new vm.Script(js);
assert.equal(require('./package.json').version,'3.6.196');
for(const f of ['ratib-statement-safety-3.6.172.js','ratib-statement-safety-3.6.172.css']){
 assert(html.includes(f+'?v=3.6.196'),f+' included in HTML');
 assert(sw.includes('./'+f),f+' cached offline');
}
assert.match(css,/@keyframes ratib-dhikr-pass\s*\{\s*from\{transform:translateX\(-100%\)\}\s*to\{transform:translateX\(100%\)\}/);
const fixture='<div id="dashboardHomeContent"><button class="ratib-statement-tile">كشف حساب</button></div>'+
 '<nav id="ratibHomeBottomNav"><button data-ratib-page="statement">كشف الحساب</button></nav>'+
 '<div id="pageDashboard"></div><div id="pageAccountsTree" class="hidden"><div id="accountsPagerCard">الحسابات</div></div>'+
 '<div id="pageAccountOperations" class="hidden"></div>';
const dom=new JSDOM(fixture,{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,accounts=d.getElementById('pageAccountsTree'),ops=d.getElementById('pageAccountOperations');
let routes=[],opened='',previousCalled=0;
w.navigateToTab=id=>{routes.push(id);for(const p of [d.getElementById('pageDashboard'),accounts,ops])p.classList.toggle('hidden',p.id!==id);};
w.getCanonicalCatalog=()=>[{main:'الصندوق',group:'السيولة',sub:'الحسابات',details:[['100','صندوق النقدية'],['101','العمقي للصرافة']]}];
w.openAccountFromPager=name=>{opened=name;w.navigateToTab('pageAccountOperations');};
d.querySelector('.ratib-statement-tile').addEventListener('click',()=>{previousCalled++;});
w.eval(js);
d.querySelector('.ratib-statement-tile').click();
assert.equal(routes.at(-1),'pageAccountsTree','Picker must use stable account catalog screen');
assert.equal(previousCalled,0,'Old frozen shortcut must not run');
assert.equal(ops.classList.contains('hidden'),true,'Never navigate to empty statement detail');
assert(accounts.classList.contains('ratib-statement-pick-mode'));
const field=d.getElementById('ratibStatementSearch172');assert(field);
field.value='النقدية';field.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(d.querySelectorAll('#ratibStatementResults172 button').length,1);
d.querySelector('#ratibStatementResults172 button').click();
assert.equal(opened,'صندوق النقدية');assert.equal(routes.at(-1),'pageAccountOperations');
d.querySelector('[data-ratib-page="statement"]').click();
assert.equal(routes.at(-1),'pageAccountsTree');
d.querySelector('#ratibDirectStatementChooser172 .ratib-statement-back').click();
assert.equal(routes.at(-1),'pageDashboard','Explicit back returns home');
d.querySelector('.ratib-statement-tile').click();
assert.equal(routes.at(-1),'pageAccountsTree');
w.navigateToTab('pageDashboard'); // user gestures back without pressing picker close
Promise.resolve().then(()=>{
 assert(!accounts.classList.contains('ratib-statement-pick-mode'),'Back gesture must clear picker');
 assert(d.getElementById('ratibDirectStatementChooser172').hidden,'Chooser hidden when navigating away');
 dom.window.close();console.log('PASS Ratib 3.6.177 no freeze: direct pick, search, account open, button/back gesture, reversed banner');
}).catch(e=>{console.error(e);process.exitCode=1;});
