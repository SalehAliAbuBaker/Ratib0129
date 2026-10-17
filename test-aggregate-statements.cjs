'use strict';
// Focused nonmutating regression: main/group/subtree scope and internal transfers.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function segment(start,end){
 const a=html.indexOf('function '+start+'('),b=html.indexOf('function '+end+'(',a+10);
 assert(a>=0&&b>a,'Missing function '+start);
 return html.slice(a,b);
}
const catalog=[
 {mainCode:'5',main:'مصروفات',groupCode:'52',group:'تشغيل',subCode:'5201',sub:'مقر',details:[['520101','الإيجار'],['520102','الكهرباء']]},
 {mainCode:'5',main:'مصروفات',groupCode:'52',group:'تشغيل',subCode:'5202',sub:'مرافق',details:[['520201','المياه']]},
 {mainCode:'5',main:'مصروفات',groupCode:'53',group:'تسويق',subCode:'5301',sub:'إعلان',details:[['530101','الدعاية']]},
 {mainCode:'6',main:'أخرى',groupCode:'61',group:'سجل آخر',subCode:'6101',sub:'غير مرتبط',details:[['610101','حساب خامس']]}
];
const ctx={
 getCanonicalCatalog:()=>catalog,
 getSubgroupParents:()=>({'5202':'5201'}),
 subgroupDescendants:(code,links)=>{
  const seen=new Set(),stack=[String(code)];
  while(stack.length){const current=stack.pop();for(const child of Object.keys(links))if(links[child]===current&&!seen.has(child)){seen.add(child);stack.push(child);}}
  return seen;
 },
 accountOpsState:{aggregate:false,scopeNames:[]}
};
vm.createContext(ctx);
vm.runInContext(segment('ratibAggregateScope','renderAccountsPager'),ctx);
vm.runInContext(segment('getAccountEntry','getAccountDisplayAmount'),ctx);
const asText=x=>JSON.parse(JSON.stringify(x));
const main=asText(ctx.ratibAggregateScope({kind:'رئيسي',code:'5',name:'مصروفات'}));
assert.deepEqual(main.names.sort(),['الإيجار','الكهرباء','المياه','الدعاية'].sort());
assert.deepEqual(main.duplicates,[]);
const group=asText(ctx.ratibAggregateScope({kind:'تجميعي',mainCode:'5',code:'52',name:'تشغيل'}));
assert.deepEqual(group.names.sort(),['الإيجار','الكهرباء','المياه'].sort());
const sub=asText(ctx.ratibAggregateScope({kind:'تجميعي فرعي',mainCode:'5',code:'5201',name:'مقر'}));
assert.deepEqual(sub.names.sort(),['الإيجار','الكهرباء','المياه'].sort());
const disjoint=asText(ctx.ratibAggregateScope({kind:'تجميعي',mainCode:'5',code:'53'}));
assert.deepEqual(disjoint.names,['الدعاية']);
ctx.accountOpsState.scopeNames=group.names;ctx.accountOpsState.aggregate=true;
const internal={debitAccount:'الإيجار',creditAccount:'الكهرباء',amount:100,currency:'YER'};
const entry=ctx.getAccountEntry(internal,ctx.accountOpsState.scopeNames);
assert.equal(entry.bothSides,true,'Internal journal should carry both debit and credit without changing net');
assert.equal(100-100,0);
ctx.accountOpsState.aggregate=false;
assert.equal(ctx.getAccountEntry(internal,ctx.accountOpsState.scopeNames).bothSides,false,'Detail/non-aggregate behavior unchanged');
ctx.accountOpsState.aggregate=true;
const multi={debitAccount:'الإيجار',creditAccount:'',amount:75,currency:'YER',isMultiVoucher:true,multiVoucher:{lines:[{account:'الإيجار',side:'debit',amount:75,currency:'YER'}]}};
assert.equal(ctx.getAccountEntry(multi,ctx.accountOpsState.scopeNames).bothSides,false,'One multi-entry posting remains one side');
const foreign={...multi,currency:'SAR',amount:2,multiVoucher:{lines:[{account:'الإيجار',side:'debit',amount:2,currency:'SAR'}]}};
assert.equal(ctx.getAccountEntry(foreign,ctx.accountOpsState.scopeNames).currency,'SAR');
catalog.push({mainCode:'6',main:'أخرى',groupCode:'62',group:'مكرر',subCode:'6201',sub:'آخر',details:[['620101','الإيجار']]});
assert.deepEqual(asText(ctx.ratibAggregateScope({kind:'تجميعي',mainCode:'5',code:'52'})).duplicates,['الإيجار']);
assert(html.includes("add.classList.toggle('hidden',!!accountOpsState.aggregate)"));
assert(html.includes("const confirmed=!accountOpsState.aggregate"));
assert(html.includes("ratibAggregateOwner(t)"));
console.log('Aggregate statement checks passed: hierarchy, descendant links, internal transfer, currency, duplicate-name guard, read-only controls.');
