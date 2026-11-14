// Regression retained from 3.6.192; 3.6.198 expands its date/session coverage.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.198');
assert.match(html,/الإصدار 3\.6\.198/);
assert.match(sw,/smart-account-search-reset-3\.6\.192/);
assert.match(sw,/account-font-plus2-search-back-context-3\.6\.197/);
assert.match(html,/const choose=item=>\{if\(!item\)return;clearTimeout\(timer\);hide\(\);openAccountFromPager\(item.name,\[item.name\]\);\};/);
assert.match(html,/function openDocumentDetailsModal\(item\) \{[\s\S]{0,180}ratibClearTextSearchAfterTargetOpen\(\)/);
assert.match(html,/function openTxModal\(item\) \{item=ratibCurrentVoucherDocument\(item\);if\(!item\)return;ratibClearTextSearchAfterTargetOpen\(\);/);
assert.match(html,/window\.RatibResetSearchAfterTargetOpen=ratibClearTextSearchAfterTargetOpen/);
function get(name){const p=html.indexOf('function '+name+'(');assert(p>=0,name);let a=html.indexOf('{',p),d=0;
 for(let i=a;i<html.length;i++){if(html[i]==='{')d++;else if(html[i]==='}'&&!--d)return html.slice(p,i+1);}
 throw Error('Unclosed '+name);
}
const ctx=vm.createContext({window:{RatibSimpleAccounts:{isSimple:()=>true,groupOf:()=>null}},
 getCanonicalCatalog:()=>[{main:'الأصول',group:'الصندوق',sub:'النقدية',details:[['1','مؤسسة الرحمة'],['2','مدرسة الأمانة']]}]});
for(const n of ['ratibSearchFold','normalizeParentQuery','ratibAccountSearchMatch','accountsPagerCandidates'])vm.runInContext(get(n),ctx);
for(const [x,y] of [['مؤسسة','مؤسسه'],['مدرسة','مدرسه'],['أمانة','امانه'],['صدقة','صدقه']]){
 assert.equal(ctx.ratibSearchFold(x),ctx.ratibSearchFold(y));
 assert.equal(ctx.ratibAccountSearchMatch(x,y),true);
}
assert.equal(vm.runInContext("accountsPagerCandidates('مؤسسه').length",ctx),1);
assert.equal(vm.runInContext("accountsPagerCandidates('الصندوق').length",ctx),0,'no aggregate by path');
console.log('Ratib 3.6.198: Arabic search + post-open reset contract — PASS');
