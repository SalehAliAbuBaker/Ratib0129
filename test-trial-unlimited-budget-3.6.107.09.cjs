'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
assert.match(pkg.version,/^3\.6\.\d+(?:\.\d+)?$/);
assert(html.includes('const RATIB_RELEASE={"version":"'+pkg.version+'"'));
assert(worker.includes("const CACHE_VERSION='")&&worker.includes(pkg.version));
assert(worker.includes('const APP_RELEASE={"version":"'+pkg.version+'"'));
assert(!html.includes('MAX_BUDGET_CATS'));
assert(!html.includes('slice(0, 2).map(c'));
assert(!html.includes('بنود الميزانية هو 12'));
assert(html.includes('يمكن إضافة أي عدد من بنود الميزانية الجديدة دون حد أقصى'));
assert(html.includes('مجموع النسب يجب أن يساوي 100%'),'Percentage integrity remains mandatory');
assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"));
assert(html.includes("const RATIB_GOOGLE_CLIENT_ID = '127962228897-k19m5nstjaun38k38348er1c9cf8vemb.apps.googleusercontent.com'"));
const defStart=html.indexOf('const DEFAULT_CATS = [');
const defEnd=html.indexOf('const DEFAULT_ACCOUNT_TREE',defStart);
const fnStart=html.indexOf('function getCats(){',defEnd);
const fnEnd=html.indexOf('let draftCats = [];',fnStart);
assert(defStart>0&&defEnd>defStart&&fnStart>defEnd&&fnEnd>fnStart);
const memory={};
const store={get:(k,fallback)=>Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:fallback,set:(k,v)=>{memory[k]=v;}};
const context={store,console};
vm.runInNewContext(html.slice(defStart,defEnd)+html.slice(fnStart,fnEnd)+'\nglobalThis.getCats=getCats;globalThis.coreCats=DEFAULT_CATS;',context);
assert.equal(context.coreCats.length,10);
assert.equal(context.coreCats.reduce((n,c)=>n+c.pct,0),100);
const custom=Array.from({length:75},(_,i)=>({id:'custom_saved_'+i,name:'بند محفوظ '+i,description:'وصف '+i,color:'#3b82f6',pct:0}));
memory.cats=[...context.coreCats.map(x=>({...x})),...custom];
const normalized=context.getCats();
assert.equal(normalized.length,85,'Do not truncate existing 75 custom items');
assert.deepEqual(Array.from(normalized.slice(10),x=>x.name),custom.map(x=>x.name));
assert.equal(memory.cats.length,85,'Reading categories must not discard saved items');
assert.equal(context.getCats().length,85,'Repeated reads retain full catalogue');
assert.equal(new Set(normalized.map(x=>x.id)).size,85);
const listeners={};
let prompts=0,rendered=0,alerts=[],notice=[];
const fake={
 addCatBtn:{addEventListener:(event,cb)=>{listeners.add=cb;}},
 savePctsBtn:{addEventListener:(event,cb)=>{listeners.save=cb;}},
 resetPctsBtn:{addEventListener:(event,cb)=>{listeners.reset=cb;}}
};
const uiContext={
 ...context, draftCats:normalized.map(x=>({...x})),PALETTE:['#000','#111','#222'],
 document:{getElementById:id=>fake[id]},
 renderCategoryRows:()=>{rendered++},alert:s=>alerts.push(s),
 prompt:q=>q.includes('اسم البند')?'بند جديد '+(++prompts):'وصف إضافي',
 showToast:s=>notice.push(s),Date,Math
};
const listenerStart=html.indexOf("document.getElementById('savePctsBtn')?.addEventListener('click'");
const listenerEnd=html.indexOf('const DEFAULT_ACCOUNT_CODES',listenerStart);
assert(listenerStart>0&&listenerEnd>listenerStart);
vm.runInNewContext(html.slice(listenerStart,listenerEnd),uiContext);
for(let i=0;i<45;i++)listeners.add();
assert.equal(uiContext.draftCats.length,130,'New additions must remain unlimited');
assert.equal(new Set(uiContext.draftCats.map(c=>c.id)).size,130,'New item IDs must not collide');
assert.equal(uiContext.draftCats.at(-1).name,'بند جديد 45');
assert.equal(rendered,45);
assert.equal(alerts.length,0,'No maximum-count alert');
listeners.save();
assert.equal(memory.cats.length,130,'Save all 130 budget categories');
assert.equal(context.getCats().length,130,'Persist/reload all 130 categories');
assert.equal(context.getCats().at(-1).name,'بند جديد 45');
uiContext.draftCats[0].pct=9.5;
listeners.save();
assert.equal(memory.cats.length,130,'Rejected invalid totals cannot overwrite saved categories');
assert.equal(alerts.length,1);
assert(alerts[0].includes('100%'));
assert(html.includes('const { targetTxs, periodTitle } = getFilteredTransactions(), cats = getCats();'),'Reports read the full category list');
assert(html.includes("const cats = getCats(), container = document.getElementById('voucherCatsList')"),'Voucher distribution uses the full list');
assert(html.includes("const cats=new Map(getCats().map(c=>[c.id,c.name]))"),'Voucher print uses all names');
assert(html.includes('function* renderBudgetCanvases()'),'Budget PDF generator remains present');
for(const code of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(code);
new Function(worker);
console.log('PASS trial 3.6.107.09: add/save/reload 130 categories, preserve 100% rule, full report/voucher paths, OAuth and syntax');
