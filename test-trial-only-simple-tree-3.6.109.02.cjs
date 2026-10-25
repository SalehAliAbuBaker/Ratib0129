'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const simple=fs.readFileSync('ratib-simple-accounts-3.6.105.13.js','utf8');
const tree=fs.readFileSync('ratib-interactive-tree-3.6.105.05.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.109.05');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://ratibtrial.pages.dev/',runScripts:'outside-only'});
const w=dom.window;
w.localStorage.setItem('ratib-account-tree-simple-view','0');
w.eval(simple);
const api=w.RatibSimpleAccounts;
assert.equal(api.isSimple(),true,'old accounting-mode preference cannot restore discarded UI');
assert.equal(api.setSimple(false),true,'attempting to select old accounting view stays simplified');
assert.equal(w.localStorage.getItem(api.KEY),'1','only saved preference, not ledger, is normalized');
assert.equal(api.GROUPS.length,6,'five everyday account groups plus catch-all');
assert(api.GROUPS.some(x=>x.id==='other'&&x.label==='حسابات أخرى'));
for(const row of [
 {mainCode:'1',main:'الأصول',subCode:'1103',sub:'مخزون البضائع الجاهزة'},
 {mainCode:'3',main:'حقوق الملكية',groupCode:'31',subCode:'3101',sub:'رأس المال'},
 {mainCode:'5',main:'المصروفات',groupCode:'51',subCode:'510101',sub:'تكلفة البضاعة المباعة'}
]){
 assert.equal(api.classify(row),'','classification semantics of old ledger types do not change');
 assert.equal(api.displayGroupOf(row).id,'other','uncategorized account must remain visible in simplified tree');
}
assert.equal(api.displayGroupOf({mainCode:'1',main:'الأصول',subCode:'1101',sub:'البنوك'}).id,'cash');
assert.equal(api.displayGroupOf({mainCode:'4',main:'الإيرادات'}).id,'income');
assert(tree.includes("{key:'other',title:'حسابات أخرى'"),'account manager shows the catch-all group');
assert(tree.includes("return classification||'other';"),'all account leaf nodes have a visible group');
assert(tree.includes('<h2>شجرة الحسابات المبسطة</h2>'),'single clear tree title');
assert(!tree.includes('data-rit="full">محاسبية</button>'),'no accounting-tree mode option');
assert(!tree.includes('data-rit="simple">مبسطة</button>'),'no redundant simple-mode option');
assert(tree.includes('data-rit="add"'),'new account creation preserved');
assert(tree.includes('data-rit="edit"'),'account editing preserved');
assert(tree.includes('data-rit="delete"'),'account deletion protections preserved');
assert(html.includes('simpleApi.displayGroupOf(x).id===group.id'),'account browser includes OTHER classification');
assert(html.includes('simpleApi.displayGroupOf(x).id===main.mainCode'),'account slides use same classification');
assert(html.includes('RatibSimpleAccounts.displayGroupOf(x)'),'statement search does not lose unclassified accounts');
assert(html.includes('function getCanonicalCatalog()'),'original account catalog remains unchanged');
assert(html.includes("const APP_STORAGE_PREFIX = 'masar_'"),'accounting storage prefix unchanged');
assert(html.includes('function renderChartOfAccounts()'),'existing create/edit and ledger support remains available');
assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"),'trial backup isolation unchanged');
for(const [name,src] of [['simple',simple],['interactive',tree]])assert.doesNotThrow(()=>new Function(src),name+' module must parse');
dom.window.close();
console.log('PASS trial 3.6.109.03: one simplified account tree, every account accessible, legacy financial storage intact');
