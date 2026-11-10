'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-bottom-nav-3.6.170.js','utf8'),css=fs.readFileSync('ratib-bottom-nav-3.6.170.css','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
new vm.Script(js);
assert.equal(require('./package.json').version,'3.6.177');assert(html.includes('"version":"3.6.177","build":"p17700"'));assert(sw.includes('"version":"3.6.177","build":"p17700"'));
for(const asset of ['ratib-bottom-nav-3.6.170.js','ratib-bottom-nav-3.6.170.css']){assert(html.includes(asset+'?v=3.6.177'));assert(sw.includes(asset));}
assert(css.includes('overflow-x:auto'),'Overflowed navigation must scroll horizontally');
assert(js.includes('ratib.ui.bottom-nav.v1'),'Navigation preference persisted separately');
assert(js.includes('ratibBottomNavSettings170'));
assert(js.includes("['home','⌂','الرئيسية']")&&js.includes("['favorites','♡','مفضلتي']"));
const fixture='<div id="mainWrap"><nav id="ratibHomeBottomNav">'+[['home','الرئيسية'],['operations','العمليات'],['favorites','مفضلتي'],['reports','التقارير'],['settings','الإعدادات']].map(([key,label])=>'<button class="ratib-bottom-choice" data-ratib-page="'+key+'">'+label+'</button>').join('')+'</nav></div><div id="dashboardHomeContent"></div><div id="pageDashboard"></div><div id="pageSettings" class="hidden"></div><div id="pageLedger" class="hidden"></div><div id="pageReports" class="hidden"></div><div id="pageAccountsTree" class="hidden"></div>';
const dom=new JSDOM(fixture,{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document;let route='';
w.navigateToTab=target=>{route=target;};w.RatibQuickFavorites={openQuick:()=>{route='favorites';}};
w.eval(js);d.dispatchEvent(new w.Event('DOMContentLoaded'));
const bar=d.getElementById('ratibHomeBottomNav'),editor=d.getElementById('ratibBottomNavSettings170'),api=w.RatibBottomNav;
assert(editor&&api);assert.deepEqual([...api.get()],['home','operations','favorites','reports','settings']);
assert(css.includes('.ratib-bottom-choice.active .ratib-bottom-icon'),'Active icon must have a distinct background');
assert(css.includes('min-height:56px!important'),'Touch target must be at least 44px high');
assert(css.includes('env(safe-area-inset-bottom)'),'Bottom safe area must be retained');
assert(css.includes('.ratib-bottom-icon svg'),'Use uniform SVG styling instead of font glyphs');
for(const key of ['home','operations','favorites','reports','settings']){
 const b=bar.querySelector('[data-ratib-page="'+key+'"]');
 assert(b?.querySelector('.ratib-bottom-icon svg path'),'Existing button displays an SVG: '+key);
 assert.equal(b.querySelector('.ratib-bottom-icon').getAttribute('aria-hidden'),'true');
 assert(b.querySelector('small').textContent,'Visible caption remains for '+key);
}
assert.equal(bar.querySelector('[data-ratib-page="home"]').getAttribute('aria-current'),'page');

function choose(id,value){const row=[...editor.querySelectorAll('.ratib-bottom-editor-row')].find(r=>r.querySelector('input')?.getAttribute('aria-label')==='إظهار '+id);assert(row,'editor row '+id);const cb=row.querySelector('input');cb.checked=value;cb.dispatchEvent(new w.Event('change',{bubbles:true}));}
choose('مفضلتي',false);assert(!api.get().includes('favorites'));assert(!bar.querySelector('[data-ratib-page="favorites"]'));
choose('الإعدادات',false);assert(!api.get().includes('settings'));assert(bar.querySelector('.ratib-bottom-manage'),'Recovery control when settings icon removed');
choose('الحسابات',true);assert(api.get().includes('accounts'));bar.querySelector('[data-ratib-page="accounts"]').click();assert.equal(route,'pageAccountsTree');
assert(bar.querySelector('[data-ratib-page="accounts"] .ratib-bottom-icon svg path'),'Added shortcut has an SVG');
assert(editor.querySelector('.ratib-bottom-editor-ico svg'),'Editor displays the same vector icon system');
choose('مفضلتي',true);assert(api.get().includes('favorites'));
const btn=bar.querySelector('[data-ratib-page="favorites"]');assert(btn); // The original favorite button and its existing listeners are preserved.
const saved=[...api.get()];assert.equal(JSON.parse(w.localStorage.getItem('ratib.ui.bottom-nav.v1')).join('|'),saved.join('|'));
api.set([]);assert.equal(api.get().length,0);assert(bar.querySelector('.ratib-bottom-manage'));assert.equal(d.getElementById('ratibBottomNavRecovery170').hidden,false);
bar.querySelector('.ratib-bottom-manage').click();assert.equal(route,'pageSettings');api.reset();assert.deepEqual(Array.from(api.get()),['home','operations','favorites','reports','settings']);
dom.window.close();console.log('PASS Ratib 3.6.170 customizable footer, saved config, favorite removal and recovery');
