/* Ratib trial 3.6.105.13 — shared, display-only account groups. No ledger writes. */
(function(global){
 'use strict';
 const KEY='ratib-account-tree-simple-view';
 const GROUPS=Object.freeze([
  Object.freeze({id:'cash',label:'الصناديق والبنوك',hint:'الأموال النقدية والحسابات البنكية'}),
  Object.freeze({id:'clients',label:'أموال لي عند الآخرين',hint:'العملاء والمبالغ المستحقة لي'}),
  Object.freeze({id:'suppliers',label:'أموال عليّ للآخرين',hint:'الموردون والمبالغ المطلوب سدادها'}),
  Object.freeze({id:'income',label:'الدخل والإيرادات',hint:'الراتب ومصادر الدخل'}),
  Object.freeze({id:'expenses',label:'المصروفات',hint:'المصروفات الشخصية والمنزلية'}),
  Object.freeze({id:'other',label:'حسابات أخرى',hint:'بقية الحسابات المحفوظة، بما فيها الأصول والالتزامات الأخرى'})
 ]);
 const norm=v=>String(v==null?'':v).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim().toLocaleLowerCase('ar');
 function isSimple(){return true;} // The simplified tree is the only trial UI.
 function setSimple(value){
  const simple=true; // Retire accounting-tree switching without modifying account data.
  try{global.localStorage.setItem(KEY,simple?'1':'0');}catch(_){}
  try{global.dispatchEvent(new CustomEvent('ratib:account-view-change',{detail:{simple}}));}catch(_){}
  return simple;
 }
 // All classifiers use actual catalog parent codes; nothing is renamed, moved or posted.
 // Restrict cost of goods sold and stock purchases even when their parent is Expenses.
 function classify(row){
  const mainCode=String(row?.mainCode??''),groupCode=String(row?.groupCode??''),subCode=String(row?.subCode??'');
  const main=norm(row?.main),branch=norm([row?.group,row?.sub].filter(Boolean).join(' '));
  const asset=mainCode==='1'||/^(الاصول|الموجودات)$/.test(main);
  const liability=mainCode==='2'||/^(الالتزامات|الخصوم)$/.test(main);
  if(asset){
   if(subCode==='1101'||/نقد|صندوق|صناديق|بنك|بنوك|مصرف|خزين/.test(branch))return 'cash';
   if(subCode==='1102'||/عملاء|مدينون|ذمم مدين|ديون لي/.test(branch))return 'clients';
  }
  if(liability&&(subCode==='2101'||/مورد|دائنون|ذمم دائن|ديون علي/.test(branch)))return 'suppliers';
  if(mainCode==='4'||/^(الايرادات|الدخل|الايرادات والدخل)$/.test(main))return 'income';
  if(mainCode==='5'||/^(المصروفات|المصاريف|النفقات)$/.test(main)){
   if(groupCode==='51'||subCode.startsWith('5101')||/تكلفه البضاعه|تكلفه المبيعات|بضاعه مباعه|مشتريات مخزنيه|مشتريات البضاعه/.test(branch))return '';
   return 'expenses';
  }
  return '';
 }
 function groupOf(row){return GROUPS.find(g=>g.id===classify(row))||null;}
 function displayGroupOf(row){return groupOf(row)||GROUPS.find(g=>g.id==='other');}
 // Display-only parents: the option value is the exact persisted catalog path.
 // The six visible groups are virtual; no accounts, transactions or parents are moved.
 function parentCatalogOptions(catalog){
  const rows=[],seen=new Set();
  for(const row of Array.isArray(catalog)?catalog:[]){
   if(!row||!row.main||!row.group||!row.sub)continue;
   const value=[row.main,row.group,row.sub].join('|||');
   if(seen.has(value))continue;
   seen.add(value);
   const category=displayGroupOf(row),code=String(row.subCode??'');
   rows.push({value,code,sub:String(row.sub),categoryId:category.id,categoryLabel:category.label,
    label:'['+code+'] '+String(row.sub)});
  }
  return rows;
 }
 function fillParentSelect(select,catalog,selectedValue='',query=''){
  if(!select||!isSimple())return false;
  const doc=select.ownerDocument,entries=parentCatalogOptions(catalog);
  const words=norm(query).split(/\s+/).filter(Boolean);
  select.replaceChildren();
  const placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent='اختر الحساب الأب...';select.appendChild(placeholder);
  for(const category of GROUPS){
   const members=entries.filter(entry=>entry.categoryId===category.id&&
    words.every(word=>norm([entry.categoryLabel,entry.label,entry.sub,entry.code].join(' ')).includes(word)));
   if(!members.length)continue;
   const group=doc.createElement('optgroup');group.label=category.label;
   for(const entry of members){
    const option=doc.createElement('option');option.value=entry.value;option.textContent=entry.label;
    group.appendChild(option);
   }
   select.appendChild(group);
  }
  // A missing or filtered parent is not silently replaced by another parent.
  select.value=[...select.options].some(option=>option.value===selectedValue)?selectedValue:'';
  return true;
 }
 function matches(value,query){
  const haystack=norm(value),words=norm(query).split(/\s+/).filter(Boolean);
  return words.every(word=>haystack.includes(word));
 }
 global.RatibSimpleAccounts=Object.freeze({KEY,GROUPS,isSimple,setSimple,classify,groupOf,displayGroupOf,parentCatalogOptions,fillParentSelect,matches});
})(window);
