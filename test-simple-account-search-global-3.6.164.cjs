'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tree=fs.readFileSync('ratib-interactive-tree-3.6.105.05.js','utf8');
const helper=fs.readFileSync('ratib-simple-accounts-3.6.105.13.js','utf8');
assert.doesNotThrow(()=>new Function(tree));
const dom=new JSDOM('<!doctype html><html lang="ar"><body><section id="pageSettings"><div id="accountSettings"><div id="chartOfAccountsView"></div><button id="openAddAccountDialogBtn">إضافة</button></div></section></body></html>',{url:'https://ratib.example',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:false});
const make=(mainCode,main,groupCode,group,subCode,sub,code,name)=>({mainCode,main,groupCode,group,subCode,sub,details:[[code,name]]});
const catalog=[
 make('1','الأصول','11','الأصول المتداولة','1101','الصناديق والبنوك','110101','صندوق النقدية'),
 make('1','الأصول','12','الأصول الثابتة','1201','الأجهزة والمعدات','120101','الآلات والمعدات'),
 make('1','الأصول','11','الأصول المتداولة','1103','المخزون','110301','المخزون الرئيسي'),
 make('2','الالتزامات','21','الالتزامات المتداولة','2101','الموردون','210101','عثمان'),
 make('5','المصروفات','51','تكلفة البضاعة','5101','تكلفة المبيعات','510101','تكلفة البضاعة المباعة'),
 make('4','الإيرادات','41','إيرادات النشاط','4101','العمل','410101','الوظيفة'),
 make('5','المصروفات','52','المصروفات الإدارية','5201','مصاريف السيارة','520101','الوقود'),
];
w.getCanonicalCatalog=()=>catalog;w.computeAccountTreeBalanceSummary=()=>new Map();
w.getSubgroupParents=()=>({});w.getAllTransactions=()=>[];
w.getAccountDetailParents=()=>({});w.getAccountEntry=()=>null;
w.eval(helper);w.eval(tree);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const mount=d.querySelector('#ratibInteractiveAccountsTree');
assert(mount,'tree initialized in Settings');
const search=mount.querySelector('.rit-search'),list=mount.querySelector('.rit-tree');
assert.equal(mount.querySelector('[data-rit="simple"]').getAttribute('aria-pressed'),'true','simple remains default');
assert.equal(w.RatibSimpleAccounts.isSimple(),true);
assert(!list.textContent.includes('الآلات والمعدات'),'unclassified asset hidden in regular simple presentation');
assert(!list.textContent.includes('تكلفة البضاعة المباعة'),'cost of goods hidden in regular simple presentation');
function query(q){search.value=q;search.dispatchEvent(new w.Event('input',{bubbles:true}));return list.textContent;}
assert(query('الآلات').includes('الآلات والمعدات'),'find fixed assets outside simplified five groups');
assert(list.textContent.includes('الأصول الثابتة'),'show accounting path for search result');
assert(query('510101').includes('تكلفة البضاعة المباعة'),'find cost-of-goods by account number despite being excluded from simple everyday expense group');
assert(query('مخزون').includes('المخزون الرئيسي'),'find inventory accounts');
assert(query('صندوق').includes('صندوق النقدية'),'still find simplified accounts');
assert(query('الأصول الثابتة').includes('الآلات والمعدات'),'search includes parent path when account itself has a different name');
assert(query('الات').includes('الآلات والمعدات'),'search tolerates Arabic hamza variants');
assert(query('غير موجود').includes('لم يُعثر'),'clear no-match message');
query('الآلات');
const found=[...list.querySelectorAll('[data-rit="select"]')].find(x=>x.textContent.includes('الآلات والمعدات'));
found.click();assert(mount.querySelector('.rit-detail-panel').textContent.includes('الآلات والمعدات'),'search result can still open real canonical account details');
assert.equal(mount.querySelector('[data-rit="simple"]').getAttribute('aria-pressed'),'true','search must not switch to accounting mode');
assert.equal(w.localStorage.getItem('ratib-account-tree-simple-view'),null,'search does not overwrite a saved account display preference');
query('');assert(!list.textContent.includes('الآلات والمعدات'),'clearing search restores simplified presentation');
w.RatibSimpleAccounts.setSimple(false);
assert.equal(mount.querySelector('[data-rit="full"]').getAttribute('aria-pressed'),'true','existing manual full-mode preference remains supported');
w.close();
console.log('PASS Ratib 3.6.164 pending: simplified search finds all accounts while retaining default, path and drilldown');
