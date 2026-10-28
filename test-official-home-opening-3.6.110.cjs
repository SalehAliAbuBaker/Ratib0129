'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert(html.includes('ratib-home-main-grid'));
assert(!html.includes('class="main-menu-btn" onclick="navigateToTab(\'pageExpenses\', true)"'));
for(const type of ['spend','entry','multi','opening'])assert(html.includes('openDashboardVoucher(\''+type+'\')'),type);
assert(html.includes('function openManualOpeningVoucher()'));
assert(html.includes('function openDashboardVoucher(type)'));
assert(html.includes('id="importedOpeningDescription"'));
assert(html.includes('isManualOpeningBalance:!!state.manual'));
assert(html.includes('state.manual?state.key:current[0].importBatchId'));
assert(html.includes('importedOpeningExactTotals(updated)'));
assert(html.includes('if(outsidePairs.has(pair)'));
assert(html.includes('if(state.manual&&state.rows.length<2)'));
assert(html.includes('state.manual&&current.some'));
for(const action of ["RatibCommerce.open('stock')","RatibCommerce.open('in')","RatibCommerce.open('out')"])assert(html.includes(action));
assert(html.includes('id="dashboardCarousel"'));
const {JSDOM}=require('jsdom');
const doc=new JSDOM(html).window.document;
const homeGrid=doc.querySelector('#dashboardHomeContent .ratib-home-main-grid');
assert(homeGrid,'home buttons grid exists');
const primary=homeGrid.querySelector('.ratib-home-voucher-shortcuts');
assert.equal(primary.querySelectorAll(':scope > .main-menu-btn').length,4,'four direct-entry buttons');
assert.equal(homeGrid.querySelectorAll('.main-menu-btn').length,8,'eight home buttons');
const allLabels=[...homeGrid.querySelectorAll('.main-menu-btn')].map(b=>b.textContent.trim());
for(const label of ['سند قبض/صرف','قيد بسيط','قيد مركب','قيد افتتاحي','سجل العمليات','التقارير','الحسابات','الإعدادات'])assert(allLabels.includes(label),label);
assert.equal(homeGrid.querySelector('[onclick="navigateToTab(\'pageSettings\', true)"]').textContent.trim(),'الإعدادات');
const homeStyles=doc.querySelector('#ratib-official-home-entry-grid')?.textContent||'';
assert(homeStyles.includes('min-height:76px!important'),'compact mobile buttons');
assert(homeStyles.includes('min-height:82px!important'),'compact desktop buttons');
assert(homeStyles.includes('.ratib-home-main-grid .main-menu-btn'),'only home tiles resized');
assert.equal(doc.querySelectorAll('.ratib-commerce-shortcut').length,3,'commerce row remains intact');
assert(sw.includes('v223-official-home-eight-compact-3.6.110'));
const start=html.indexOf('function buildImportedOpeningVoucher(state,data){');
const end=html.indexOf('async function saveImportedOpeningVoucher()',start);
assert(start>0&&end>start);
const decimal=value=>{
 const str=String(value??'0').trim(),match=str.match(/^(\d+)(?:\.(\d{1,6}))?$/);
 if(!match)throw Error('مبلغ غير صالح');
 return {raw:str,value:Number(str),precision:(match[2]||'').length,units:BigInt(match[1])*1000000n+BigInt((match[2]||'').padEnd(6,'0'))};
};
const ctx={
 document:{getElementById:id=>({value:'42'})},
 APP_STORAGE_PREFIX:'masar_',
 importedOpeningKey:t=>t.importVoucherId||t.importBatchId||t.id,
 getCanonicalCatalog:()=>[{details:[['101','Cash'],['202','Capital']]}],
 importedRecordCurrencies:()=>['YER','SAR','USD'],
 importedRecordDecimal:decimal,
 importedOpeningExactTotals:rows=>{const sums=new Map();for(const t of rows){const o=t.openingBalance,c=o.baseCurrency;if(!sums.has(c))sums.set(c,{debit:0n,credit:0n});sums.get(c).debit+=decimal(o.baseDebit).units;sums.get(c).credit+=decimal(o.baseCredit).units;}return sums;},
 getLocalTodayISO:()=> '2026-10-28',
 cloneData:value=>structuredClone(value),Date,Map,Set,Number,JSON,BigInt,String,Error
};
vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
const row=(account,debit,credit)=>({id:'',isoDate:'2026-10-28',openingBalance:{account,currency:'YER',baseCurrency:'YER',debit:String(debit),credit:String(credit),baseDebit:String(debit),baseCredit:String(credit),note:'',sourceRef:'إدخال يدوي'}});
const state={key:'manual_opening_test',manual:true,before:'[]',rows:[row('Cash',125,0),row('Capital',0,125)]};
const snapshot={masar_plan:{month:'2026-10',transactions:[]},masar_history:[],masar_account_currencies:{}};
const result=ctx.buildImportedOpeningVoucher(state,structuredClone(snapshot));
assert.equal(result.records.length,2);
assert.equal(result.data.masar_plan.transactions.length,2);
assert(result.records.every(t=>t.isOpeningBalance&&t.isManualOpeningBalance&&t.status==='posted'&&t.importVoucherId===state.key&&t.importBatchId===state.key));
assert.deepEqual(Array.from(result.records,t=>t.openingBalance.account),['Cash','Capital']);
assert.equal(snapshot.masar_plan.transactions.length,0);
assert.throws(()=>ctx.buildImportedOpeningVoucher({...state,rows:[row('Cash',125,0),row('Capital',0,124)]},structuredClone(snapshot)),/غير متوازن/);
assert.throws(()=>ctx.buildImportedOpeningVoucher({...state,rows:[row('Cash',125,0)]},structuredClone(snapshot)),/بندين/);
assert.throws(()=>ctx.buildImportedOpeningVoucher({...state,rows:[row('Cash',125,0),row('Cash',0,125)]},structuredClone(snapshot)),/تكرر الحساب/);
assert.throws(()=>ctx.buildImportedOpeningVoucher(state,structuredClone(result.data)),/تغير القيد/);
const other=structuredClone(snapshot);other.masar_plan.transactions=[{...result.records[0],id:'other',importBatchId:'other',importVoucherId:'other'}];
assert.throws(()=>ctx.buildImportedOpeningVoucher(state,other),/رقم القيد الافتتاحي مستخدم/);
other.masar_plan.transactions[0].seqNum=41;
assert.throws(()=>ctx.buildImportedOpeningVoucher(state,other),/رصيد افتتاحي آخر/);
console.log('PASS original Ratib homepage entry shortcuts and safe balanced manual opening creation');
