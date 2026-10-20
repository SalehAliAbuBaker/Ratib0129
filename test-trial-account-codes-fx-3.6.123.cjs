'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pack=require('./package.json');
const release=sw.match(/const APP_RELEASE=\{"version":"(3\.6\.\d+)"/)?.[1];
assert.ok(release, 'SW must declare trial release version');
assert.equal(pack.version,release);
assert.ok(html.includes('الإصدار '+release), 'Visible release must match package and worker');
assert.match(html,/function trialPairedReportRows\(model\)/);
assert.match(html,/\?\['رمز الحساب','الحساب','العملة','مدين ريال يمني','دائن ريال يمني','مدين أجنبي','دائن أجنبي'\]/);
assert.match(html,/const cols=trialColumns\(model\.filters\),labels=trialReportLabels\(model\)/);
assert.match(html,/sheet\['!cols'\]=model\.filters\.mode==='paired'\?\[\{wch:15\},\{wch:38\}/);
assert.match(html,/trialDatedCurrencyReference\(leg,filters\.base\)/);
assert.match(html,/const ref=\/تعارض\|مختلفة\/\.test/,'conflicting FX prices must not be silently replaced');
assert.match(html,/const balancedBase=!base\.missing&&!base\.reference/);
assert.ok(sw.includes(release), 'SW must carry current version');
const start=html.indexOf('function trialDatedCurrencyReference(');
const end=html.indexOf('function trialFxRateEvidence(',start);
assert(start>0&&end>start);
let published={code:'SAR',reportRateYer:412,reportRateYerUpdatedAt:'2026-10-19T09:20:00'};
const store={get:(key)=>key==='currency_catalog_v1'?[published]:[]};
const context={store};
const {trialDatedCurrencyReference}=vm.runInNewContext(html.slice(start,end)+'\n({trialDatedCurrencyReference})',context);
const leg={date:'2026-10-20',baseCurrency:'SAR'};
const a=trialDatedCurrencyReference(leg,'YER');
assert.equal(a.rate,412,'valid historical quote may be used for report display only');
assert.equal(a.reference,true);
assert.equal(trialDatedCurrencyReference({...leg,date:'2026-10-18'},'YER'),null,'future rates cannot be applied retroactively');
published={...published,reportRateYerUpdatedAt:''};
assert.equal(trialDatedCurrencyReference(leg,'YER'),null,'an undated current rate is not a historical rate');
published={...published,reportRateYerUpdatedAt:'2026-10-19',reportRateYer:0};
assert.equal(trialDatedCurrencyReference(leg,'YER'),null,'invalid rate must not be used');
const p0=html.indexOf('function trialPairedReportRows('),p1=html.indexOf('function trialReportRows(',p0);
const ctx={
 trialAccountDescriptors:()=>new Map([['الصندوق',{code:'00109',path:[{code:'001',name:'الأصول'},{code:'0010',name:'الصناديق'}]}]]),
 trialNumber:n=>String(n),accountCurrencyLabel:c=>c,
 trialBalanceDifference:n=>n
};
const {trialPairedReportRows}=vm.runInNewContext(html.slice(p0,p1)+'\n({trialPairedReportRows})',ctx);
const example={accounts:[{code:'00109',name:'الصندوق',main:'الأصول',
 currencies:[{currency:'SAR',native:{closingDebit:100,closingCredit:0},equivalent:{closingDebit:41200,closingCredit:0},missing:0}]}],
 base:{closingDebit:41200,closingCredit:41200,missing:0,reference:1}};
const result=trialPairedReportRows(example);
assert.equal(result.find(r=>r.values[1]==='الصندوق').values[0],'00109','code must be copied with leading zeros');
assert.equal(result.find(r=>r.values[1]==='الصناديق').values[0],'0010','group code must be preserved');
assert.equal(result.find(r=>r.values[1]==='الفارق بالريال اليمني').values[3],'—','provisional rate cannot claim a zero difference');
example.accounts[0].currencies[0].missing=1;example.base.missing=1;example.base.reference=0;
const missing=trialPairedReportRows(example);
assert(missing.every(r=>!r.values.includes('غير مكتمل')),'no incomplete wording in paired table');
assert.equal(missing.find(r=>r.values[1]==='الصندوق').values[3],'—');
console.log('PASS trial 3.6.123 codes, date-bounded currency settings, provisional difference, missing-value dash and output formatting');
