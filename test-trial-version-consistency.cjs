/* Regression: all visible Ratib trial release badges must read one release source. */
'use strict';
require('./tools/assert-release.cjs')();
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const html=file('index.html'),sw=file('sw.js');
const m=html.match(/const RATIB_RELEASE=\{"version":"(\d+\.\d+\.\d+(?:\.\d+)?)"/);
const work=sw.match(/const APP_RELEASE=\{"version":"(\d+\.\d+\.\d+(?:\.\d+)?)"/);
assert(m&&work,'Both trial release manifests must declare versions');
const version=m[1],label='الإصدار '+version;
assert.equal(work[1],version,'Service worker and application versions must match');
assert(html.includes('id="appVersionLabel" class="app-version">'+label),'Top bar must match release');
assert(html.includes('class="ratib-about-version">'+label),'About screen must match release');
assert(html.includes('window.ratibCurrentTrialVersionLabel=()=>'),'Central version label must exist');
assert(html.includes("document.addEventListener('DOMContentLoaded',window.ratibSyncTrialVersion)"),'Version sync must run at startup');
assert(file('ratib-sidebar-3.6.124.js').includes('window.ratibCurrentTrialVersion?.()'),'Sidebar must read primary release instead of commerce module metadata');
assert(file('ratib-commerce-3.6.131.js').includes('window.ratibCurrentTrialVersion?.()'),'Commerce metadata must use primary release');
for(const moduleName of [
 'ratib-login-3.6.124.js',
 'ratib-trial-ui-3.6.143.js',
 'ratib-dashboard-finance-3.6.144.js'
]){
 const code=file(moduleName);
 assert(code.includes('window.ratibCurrentTrialVersionLabel?.()'),moduleName+' must read the unified release');
 assert(!/\.textContent\s*=\s*['"]الإصدار \d+\.\d+\.\d+/.test(code),moduleName+' must not hardcode a displayed version');
 const suffix=moduleName.replace(/^ratib-/,'');
 assert(html.includes(moduleName+'?v='+version),moduleName+' must use current cache-busting version');
 new Function(code);
}
for(const code of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim()))new Function(code);
new Function(sw);
console.log('OK: trial release '+version+' is consistent across app, menu, login, about, and offline cache.');
