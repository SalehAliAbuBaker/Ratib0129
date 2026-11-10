/* Ratib 3.6.169 — selected transaction totals must not rewrite booked balances. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-statement-search-totals-3.6.160.js','utf8');
const html=`<div id="accountOperationsStandalonePanel">
<section class="account-currency-page" data-currency="YER">
<div class="account-operations-head"><small>3 عملية</small></div>
<div class="account-statement-row" data-tx-id="1" data-ratib-movement-text="ايجار 70">إيجار 70</div>
<div class="account-statement-row" data-tx-id="2" data-ratib-movement-text="خدمه 100">خدمة 100</div>
<div class="account-statement-row" data-tx-id="3" data-ratib-movement-text="ايجار 55">إيجار 55</div>
<div class="statement-grand-total">
<span class="statement-total-label">إجمالي العمليات (شامل الرصيد السابق)</span>
<span class="debit">125</span><span class="credit">1,100</span><span class="balance">975 YER دائن</span>
</div><div class="ratib-statement-words">الرصيد المتبقي لكم</div>
</section></div>
<div id="ratibAccountMovementSearchCount"></div>`;
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'});
const w=dom.window,doc=w.document;
const transactions=[
 {id:'1',amount:70,side:'debit',note:'إيجار'},
 {id:'2',amount:100,side:'credit',note:'خدمة'},
 {id:'3',amount:55,side:'debit',note:'إيجار'}];
w.accountOpsState={accountName:'الصندوق',scopeNames:['الصندوق'],movementSearch:''};
w.ratibAccountMovementNormalize=s=>String(s||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').trim();
w.getAllTransactions=()=>transactions;
w.getAccountEntry=t=>({side:t.side,foreignAmount:t.amount,line:{note:t.note}});
w.getAccountDisplayAmount=e=>e.foreignAmount;
w.getAccountOpsDate=()=> '2026-11-09';
w.ratibStatementText=(s,f)=>s||f;
w.ratibStatementDateHtml=s=>s;
w.ratibStatementDocumentLabel=()=> 'قيد';
w.ratibAggregateOwner=()=> '';
w.getTransactionDisplayType=()=> 'قيد';
w.ratibAccountMovementSearchCorpus=(t,e,visible)=>w.ratibAccountMovementNormalize([visible,t.note,t.amount].join(' '));
w.getAccountRunningBalances=(rows,scope,opening)=>{
 let n=opening;const result=new Map();
 for(const t of rows){n+=t.side==='debit'?-t.amount:t.amount;result.set(t,n);}
 return result;
};
w.getAccountCurrencyReportData=()=>({currency:'YER',rows:transactions,opening:1000,totalDebit:125,totalCredit:100,closing:975});
w.renderAccountOperations=()=>true;
w.ratibApplyAccountMovementSearch=()=>{
 const query=w.ratibAccountMovementNormalize(w.accountOpsState.movementSearch);
 doc.querySelectorAll('[data-tx-id]').forEach(row=>row.classList.toggle('ratib-movement-hidden',!!query&&!row.dataset.ratibMovementText.includes(query)));
};
w.ratibStatementTotalsTitle=()=> 'إجمالي العمليات';
w.accountPeriodTitle=()=> 'نوفمبر';
w.ratibStatementClosingText=()=> 'الرصيد المتبقي';
w.tafqitAccountCurrency=n=> 'مبلغ '+n;
w.roundAccountingAmount=n=>Number(n.toFixed(6));
w.accountExportRows=()=>{
 const data=w.getAccountCurrencyReportData('YER'),out=[['date','doc','note','debit','credit','balance','side']];
 let running=data.opening;
 for(const tx of data.rows){running+=tx.side==='debit'?-tx.amount:tx.amount;out.push(['','','',tx.side==='debit'?tx.amount:'',tx.side==='credit'?tx.amount:'',Math.abs(running),running>0?'دائن':'مدين']);}
 out.push(['','','إجمالي',data.totalDebit,data.totalCredit,data.closing,'']);
 return out;
};
w.eval(source);
const panel=doc.querySelector('.account-currency-page');
const sel=s=>panel.querySelector(s).textContent;
w.accountOpsState.movementSearch='ايجار';
w.ratibApplyAccountMovementSearch();
assert.equal(sel('.debit'),'125');
assert.equal(sel('.credit'),'0');
assert(sel('.balance').includes('صافي النتائج: 125'));
assert(sel('.statement-total-label').includes('نتائج البحث'));
assert.equal(doc.querySelectorAll('.ratib-movement-hidden').length,1);
let filtered=w.getAccountCurrencyReportData('YER');
assert.deepEqual(filtered.rows.map(x=>x.id),['1','3']);
assert.equal(filtered.opening,0);
assert.equal(filtered.closing,-125);
const book=w.getAccountRunningBalances(filtered.rows,w.accountOpsState.scopeNames,filtered.opening);
assert.equal(book.get(transactions[0]),930);
assert.equal(book.get(transactions[2]),975);
assert.equal(w.accountExportRows('YER')[2][5],975);
assert(w.accountPeriodTitle().includes('مفلتر'));
assert(w.ratibStatementClosingText(-125,'YER').includes('صافي نتائج البحث'));
w.accountOpsState.movementSearch='100';w.ratibApplyAccountMovementSearch();
filtered=w.getAccountCurrencyReportData('YER');
assert.equal(filtered.rows.length,1);
assert.equal(filtered.totalCredit,100);
assert.equal(filtered.totalDebit,0);
w.accountOpsState.movementSearch='مفقود';w.ratibApplyAccountMovementSearch();
filtered=w.getAccountCurrencyReportData('YER');
assert.equal(filtered.rows.length,0);
assert.equal(filtered.closing,0);
w.accountOpsState.movementSearch='';w.ratibApplyAccountMovementSearch();
assert.equal(sel('.credit'),'1,100');
assert.equal(sel('.balance'),'975 YER دائن');
assert.equal(w.getAccountCurrencyReportData('YER').closing,975);
assert(!w.accountPeriodTitle().includes('مفلتر'));
dom.window.close();
console.log('PASS 3.6.169: search totals, document output, CSV, booked balances and reset');