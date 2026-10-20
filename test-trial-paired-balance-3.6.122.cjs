'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/<select id="trialMode"><option value="paired" selected>/,'paired view must be the default');
assert.match(html,/<option value="approved" selected>حسب الإدخال ثم أسعار التقييم المعتمدة/,'saved approvals must be reused by default');
assert.match(html,/const balanced=\['equivalent','paired'\]\.includes\(filters\.mode\)\?balancedBase/,'paired mode must use evaluated balance');
assert.match(html,/function\* renderTrialPdfPages\(model\)\{\s*const cols=trialColumns\(model\.filters\),labels=trialReportLabels\(model\)/,'PDF needs the same seven headings as display');
assert.match(html,/function exportTrialExcel\(\).*trialReportLabels\(model\)/s,'Excel needs the same headings');
const start=html.indexOf('function trialReportLabels(model)');
const end=html.indexOf('function trialReportRows(model)',start);
assert(start>=0&&end>start,'paired production functions must be present');
const path=[
 {code:'1',name:'الأصول'},
 {code:'11',name:'الصناديق'},
 {code:'110',name:'النقدية'},
 {code:'1101',name:'صندوق سعودي'}
];
const descriptors=new Map([
 ['صندوق سعودي',{path}],
 ['صندوق سعودي آخر',{path}],
 ['محمد',{path:[{code:'2',name:'الالتزامات'},{code:'21',name:'الدائنون'}]}]
]);
const context={
 trialColumns:()=>[],
 trialAccountDescriptors:()=>descriptors,
 trialNumber:n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:6}),
 accountCurrencyLabel:c=>({SAR:'سعودي',YER:'ريال يمني',USD:'دولار'}[c]||c),
 trialBalanceDifference:n=>Math.abs(n)<0.000001?0:n
};
const {trialReportLabels,trialPairedReportRows}=vm.runInNewContext(html.slice(start,end)+'\n({trialReportLabels,trialPairedReportRows})',context);
const model={filters:{mode:'paired'},accounts:[
 {code:'1101',name:'صندوق سعودي',main:'الأصول',currencies:[{currency:'SAR',native:{closingDebit:100,closingCredit:0},equivalent:{closingDebit:41300,closingCredit:0},missing:0}]},
 {code:'1102',name:'صندوق سعودي آخر',main:'الأصول',currencies:[{currency:'SAR',native:{closingDebit:50,closingCredit:0},equivalent:{closingDebit:20600,closingCredit:0},missing:0}]},
 {code:'2101',name:'محمد',main:'الالتزامات',currencies:[{currency:'YER',native:{closingDebit:0,closingCredit:61900},equivalent:{closingDebit:0,closingCredit:61900},missing:0}]}
 ],base:{closingDebit:61900,closingCredit:61900,missing:0}};
const headings=JSON.parse(JSON.stringify(trialReportLabels(model)));
assert.deepEqual(headings,['رمز الحساب','الحساب','العملة','مدين ريال يمني','دائن ريال يمني','مدين أجنبي','دائن أجنبي']);
const rows=trialPairedReportRows(model);
const row=n=>rows.find(x=>x.values[1]===n)?.values;
assert.deepEqual(JSON.parse(JSON.stringify(row('صندوق سعودي'))),['1101','صندوق سعودي','سعودي','41,300','0','100','0'],'effective rate 413 must be retained');
assert.deepEqual(JSON.parse(JSON.stringify(row('صندوق سعودي آخر'))),['1102','صندوق سعودي آخر','سعودي','20,600','0','50','0'],'different effective rate 412 must also be retained');
assert.deepEqual(JSON.parse(JSON.stringify(row('محمد'))),['2101','محمد','ريال يمني','0','61,900','0','0'],'local currency must not be double-counted as foreign');
assert.equal(row('إجمالي المعادل بالريال اليمني')[3],'61,900');
assert.equal(row('إجمالي المعادل بالريال اليمني')[4],'61,900');
assert.equal(row('الفارق بالريال اليمني')[3],'0');
assert.equal(row('الصناديق')[3],'61,900','group subtotal must net documentary YER equivalents');
model.base.missing=1;
model.accounts[0].currencies[0].missing=1;
const incomplete=trialPairedReportRows(model);
assert.equal(incomplete.find(x=>x.values[1]==='صندوق سعودي').values[3],'—');
assert.equal(incomplete.find(x=>x.values[1]==='الصناديق').values[3],'—');
assert.equal(incomplete.at(-1).values[3],'—','an incomplete equivalent must never report a zero difference');
console.log('PASS updated paired trial balance with mandatory codes, different transaction FX rates, groups, totals, PDF/Excel headers, missing equivalents');

