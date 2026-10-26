'use strict';
// Regression: the simple tree is a display projection; parent values remain canonical catalog keys.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('ratib-simple-accounts-3.6.105.13.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const quick=fs.readFileSync('ratib-quick-account-3.6.87.js','utf8');
const saved=new Map();
const win={localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},dispatchEvent(){}};
vm.runInNewContext(script,{window:win,CustomEvent:class{constructor(){} }});
const api=win.RatibSimpleAccounts;
const catalog=[
 {mainCode:'1',main:'الأصول',groupCode:'11',group:'الأصول المتداولة',subCode:'1101',sub:'النقدية وما في حكمها',details:[['110101','بنك الكريمي']]},
 {mainCode:'1',main:'الأصول',groupCode:'11',group:'الأصول المتداولة',subCode:'1102',sub:'العملاء والمدينون',details:[['110201','حساب العملاء']]},
 {mainCode:'2',main:'الالتزامات',groupCode:'21',group:'التزامات متداولة',subCode:'2101',sub:'الموردون والدائنون',details:[]},
 {mainCode:'4',main:'الإيرادات',groupCode:'41',group:'إيرادات النشاط',subCode:'4101',sub:'المبيعات',details:[]},
 {mainCode:'5',main:'المصروفات',groupCode:'52',group:'النفقات',subCode:'5201',sub:'مصاريف الموظفين',details:[]},
 {mainCode:'3',main:'حقوق الملكية',groupCode:'31',group:'رأس المال',subCode:'3101',sub:'رأس المال المدفوع',details:[]}
];
const before=JSON.stringify(catalog);
const rows=api.parentCatalogOptions(catalog);
assert.deepEqual(Array.from(rows,x=>x.categoryLabel),[
 'الصناديق والبنوك','أموال لي عند الآخرين','أموال عليّ للآخرين',
 'الدخل والإيرادات','المصروفات','حسابات أخرى'
]);
assert.equal(rows[0].value,'الأصول|||الأصول المتداولة|||النقدية وما في حكمها');
assert.deepEqual(Array.from(api.parentCatalogOptions([...catalog,catalog[0]]),x=>x.value),Array.from(rows,x=>x.value),
  'the same accounting parent must not be duplicated');
function el(tag){
 return {tag,children:[],value:'',label:'',textContent:'',
  appendChild(item){this.children.push(item);},
  replaceChildren(){this.children=[];},
  get options(){return this.children.flatMap(child=>child.tag==='optgroup'?child.children:child.tag==='option'?[child]:[]);}
 };
}
function select(){
 const e=el('select');e.ownerDocument={createElement:el};
 let value='';
 Object.defineProperty(e,'value',{get(){return value;},set(v){value=e.options.some(o=>o.value===v)?v:'';}});
 return e;
}
const add=select(),edit=select(),unmatched=select();
assert.equal(api.fillParentSelect(add,catalog),true);
assert.deepEqual(add.children.filter(n=>n.tag==='optgroup').map(n=>n.label),[
 'الصناديق والبنوك','أموال لي عند الآخرين','أموال عليّ للآخرين',
 'الدخل والإيرادات','المصروفات','حسابات أخرى'
]);
assert.equal(add.value,'','the account parent must be selected explicitly');
assert.equal(add.options.length,7,'one placeholder and six canonical parents');
assert(!add.options.some(x=>x.textContent.includes('الأصول ←')),'hide the old full-chart path from the simple selector');
assert.equal(api.fillParentSelect(edit,catalog,rows[3].value),true);
assert.equal(edit.value,rows[3].value,'edit keeps the exact canonical parent');
assert.equal(api.fillParentSelect(unmatched,catalog,rows[0].value,'مورد'),true);
assert.equal(unmatched.options.length,2,'search filters by the current account label');
assert.equal(unmatched.value,'','a filtered-out parent is never silently replaced');
assert.equal(unmatched.options[1].value,rows[2].value);
assert.equal(JSON.stringify(catalog),before,'display logic never mutates the catalog');
api.setSimple(false);
const full=select();full.appendChild({tag:'option',value:'legacy',textContent:'legacy'});
assert.equal(api.fillParentSelect(full,catalog),false,'advanced mode keeps its original parent selector');
assert.equal(full.options[0].value,'legacy');
assert(html.includes('if(window.RatibSimpleAccounts?.fillParentSelect?.(sel,cat))return;'),
  'main account create dialog uses shared simple parent projection');
assert(html.includes("if(window.RatibSimpleAccounts?.fillParentSelect?.(sel,cat,selectedKey||''))return;"),
  'edit account dialog uses shared simple parent projection');
assert(quick.includes('window.RatibSimpleAccounts?.fillParentSelect?.(box,getCanonicalCatalog(),previous,search)'),
  'voucher quick-create uses the same simple parent projection');
assert(html.includes('mainTab.hidden=simple;mainTab.disabled=simple'),
  'simple mode must not create accounting parents under guessed legacy groups');
assert(!/store\.(set|remove)\s*\(/.test(script),'simple display module has no ledger writes');
console.log('PASS simple account parent selection: six groups, stable account keys, edit/quick sync and no data mutation');
