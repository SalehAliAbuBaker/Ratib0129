/* Opening vouchers: explicit zeroing of saved rows remains auditable and balanced. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('index.html','utf8');
const a=source.indexOf('function buildImportedOpeningVoucher(state,data){');
const b=source.indexOf('async function saveImportedOpeningVoucher(){',a);
assert(a>0&&b>a);
const body=source.slice(a,b);
assert(body.includes("draft._openingZeroed===true||savedZero"));
assert(body.includes('preserveZeroedSavedLine'));
const d=new JSDOM('<input id="importedOpeningSeq" value="1">').window.document;
const fmt=n=>String(Number(n||0));
const money=raw=>{
 let str=String(raw??0).replace(/,/g,'').trim();
 assert(/^\d+(\.\d{1,6})?$/.test(str),'test amount syntax '+str);
 const [a,b='']=str.split('.');
 return {raw:fmt(str),units:BigInt(a)*1000000n+BigInt(b.padEnd(6,'0')),precision:b.length};
};
const context={
 document:d,APP_STORAGE_PREFIX:'t_',Date,Number,BigInt,Map,Set,JSON,String,Error,console,
 cloneData:x=>JSON.parse(JSON.stringify(x)),
 importedOpeningKey:t=>t.importVoucherId,
 getCanonicalCatalog:()=>[{details:[['101','أصل أول'],['102','خصم أول'],['103','أصل ثان'],['104','خصم ثان']]}],
 importedRecordCurrencies:s=>[...new Set(['YER','USD','SAR',...s])],
 importedRecordDecimal:money,
 openingFormRate:s=>Number(s)||NaN,
 importedRecordOriginal:t=>({openingBalance:t.openingBalance,creditAccount:t.creditAccount,debitAccount:t.debitAccount}),
 importedOpeningExactTotals:rows=>{
  const map=new Map();
  for(const t of rows){
   const o=t.openingBalance,c=o.baseCurrency;
   if(!map.has(c))map.set(c,{debit:0n,credit:0n});
   const total=map.get(c);
   total.debit+=money(o.baseDebit).units;
   total.credit+=money(o.baseCredit).units;
  }
  return map;
 },
 getLocalTodayISO:()=> '2026-11-15'
};
vm.createContext(context);
vm.runInContext(body,context);
const entry=(id,account,side,amount,currency='YER',baseCurrency='YER',rate)=>({
 id,importVoucherId:'opening-1',isOpeningBalance:true,isManualOpeningBalance:true,
 seqNum:1,status:'posted',isoDate:'2026-11-15',date:'2026-11-15',
 debitAccount:side==='debit'?account:'',creditAccount:side==='credit'?account:'',
 openingBalance:{account,currency,baseCurrency,
  debit:side==='debit'?String(amount):'0',credit:side==='credit'?String(amount):'0',
  baseDebit:side==='debit'?String(amount*(rate||1)):'0',
  baseCredit:side==='credit'?String(amount*(rate||1)):'0',
  sourceRef:rate?'سعر بتاريخ القيد':'إدخال يدوي',
  ...(rate?{exchangeRate:String(rate)}:{}),note:'افتتاحي'}
});
const original=[
 entry('a','أصل أول','debit',100),
 entry('b','خصم أول','credit',100),
 entry('c','أصل ثان','debit',30),
 entry('d','خصم ثان','credit',30)
];
const clone=x=>JSON.parse(JSON.stringify(x));
const scenario=()=>{
 const data={t_plan:{transactions:clone(original)},t_history:[]};
 const state={key:'opening-1',manual:true,before:JSON.stringify(data.t_plan.transactions),
  rows:clone(data.t_plan.transactions)};
 return {data,state};
};
function zero(row){
 for(const key of ['debit','credit','baseDebit','baseCredit'])row.openingBalance[key]='0';
 row._openingZeroed=true;
}
{
 const {data,state}=scenario(),oldIds=data.t_plan.transactions.map(t=>t.id);
 zero(state.rows[0]);zero(state.rows[1]);
 const updated=context.buildImportedOpeningVoucher(state,data);
 const rows=updated.records;
 assert.equal(rows.length,4,'Saved voucher preserves the four historical records');
 assert.deepEqual(rows.map(t=>t.id),oldIds,'Saved line IDs remain stable');
 assert.equal(rows[0].openingBalance.debit,'0','Explicitly zeroed debit is accepted');
 assert.equal(rows[1].openingBalance.credit,'0','Explicitly zeroed credit is accepted');
 assert.equal(rows[1].creditAccount,'خصم أول','Previously credit line retains its side');
 assert.equal(rows[2].openingBalance.debit,'30','Other debit remains intact');
 assert.equal(rows[3].openingBalance.credit,'30','Other credit remains intact');
 assert(rows[0].importEditHistory?.length===1,'Zeroing has an audit trail');
 assert.equal(rows[0].status,'posted');
}
{
 const {data,state}=scenario();
 zero(state.rows[0]);
 assert.throws(()=>context.buildImportedOpeningVoucher(state,data),/غير متوازن/,'One-sided zero must be rejected');
 assert.deepEqual(data.t_plan.transactions,original,'Failed balancing never mutates original data');
}
{
 const {data,state}=scenario();
 for(const key of ['debit','credit','baseDebit','baseCredit'])state.rows[0].openingBalance[key]='0';
 assert.throws(()=>context.buildImportedOpeningVoucher(state,data),/موجب/,'Manually blanked saved row without explicit action is rejected');
}
{
 const {data,state}=scenario();
 state.rows.push({...clone(state.rows[0]),id:'',openingBalance:{...clone(state.rows[0].openingBalance),account:'خصم ثان'}});
 zero(state.rows.at(-1));
 assert.throws(()=>context.buildImportedOpeningVoucher(state,data),/موجب/,'Blank new row is never allowed');
}
{
 const {data,state}=scenario();
 zero(state.rows[0]);zero(state.rows[1]);
 state.rows[0].openingBalance.currency='USD';
 assert.throws(()=>context.buildImportedOpeningVoucher(state,data),/موجب|سعر/,'Changing original currency cannot bypass blank validation');
}
{
 const {data,state}=scenario();
 zero(state.rows[0]);zero(state.rows[1]);
 const next=context.buildImportedOpeningVoucher(state,data);
 const reopen={key:'opening-1',manual:true,before:JSON.stringify(next.records),rows:clone(next.records)};
 const saveAgain=context.buildImportedOpeningVoucher(reopen,{t_plan:{transactions:clone(next.records)},t_history:[]});
 assert.equal(saveAgain.records[0].openingBalance.debit,'0','Previously zeroed saved record can be reopened and saved');
}
d.defaultView?.close();
console.log('PASS opening history: zero saved lines, identity and side preservation, balance validation and no changes on errors');