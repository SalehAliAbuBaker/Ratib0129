'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const tree=fs.readFileSync('ratib-interactive-tree-3.6.105.05.js','utf8');
const onboarding=fs.readFileSync('ratib-first-run-3.6.105.11.js','utf8');
const currency=fs.readFileSync('ratib-country-currency-3.6.151.js','utf8');
const a=html.indexOf('const CANONICAL_ACCOUNT_CATALOG = [');
const b=html.indexOf('function canonicalTreeProjection(',a);
assert(a>=0&&b>a);
const saved={};
const ctx={store:{get:(key,fallback)=>Object.hasOwn(saved,key)?saved[key]:fallback,set:(key,value)=>{saved[key]=structuredClone(value);}}};
const extra=[
"function getCanonicalCatalog(){return store.get('account_catalog',CANONICAL_ACCOUNT_CATALOG)}",
"function seed(){if(!store.get('account_catalog',null))store.set('account_catalog',CANONICAL_ACCOUNT_CATALOG)}",
"this.read=()=>getCanonicalCatalog();this.seed=seed;"
].join('\n');
vm.runInNewContext(html.slice(a,b)+'\n'+extra,ctx);
const catalog=ctx.read();
assert.equal(catalog.length,6,'six internal accounting paths for five visible groups');
const names=Array.from(catalog.flatMap(r=>r.details.map(d=>d[1])));
assert.deepEqual(names,['صندوق النقدية','العمقي للصرافة','زيد بن عمر','عثمان بن بكر','الوظيفة','الدخل الآخر','المصاريف العامة','مصاريف السيارة']);
assert.equal(new Set(names).size,8);
assert.deepEqual(Array.from(new Set(catalog.map(r=>r.mainCode))),['1','2','4','5']);
assert(tree.includes("['cashbox',null],['bank',null]"));
assert(tree.includes('/بنك|بنوك|مصرف|صراف|bank/'));
assert(currency.includes("const DEFAULT='YER'")&&currency.includes("{code:'YE',name:'اليمن',currency:'YER'}"));
assert(onboarding.includes("country.value=saved?.country||suggest?.code||'YE'"));
ctx.seed();const first=JSON.stringify(ctx.read());ctx.seed();
assert.equal(JSON.stringify(ctx.read()),first,'re-entry may not create duplicate accounts');
saved.account_catalog=[{main:'حساب المستخدم',details:[['55','حساب محفوظ']]}];ctx.seed();
assert.equal(ctx.read()[0].main,'حساب المستخدم','existing chart must never be overwritten');
console.log('PASS 3.6.109.14 starter: five groups, eight children, Yemen/YER, old records preserved');
