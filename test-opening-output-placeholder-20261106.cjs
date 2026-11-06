'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-cash-actions-3.6.135.css','utf8');
const start=html.indexOf('function manualOpeningSourceRef(o){');
const end=html.indexOf('let importedOpeningEdit=null;',start);
assert(start>0&&end>start,'Manual opening output helpers must exist');
const mock=new JSDOM('<body>'+['pvOrgName','pvOrgDetails','pvVoucherTitle','pvDate','pvAmount','pvDebit','pvCredit','pvTafqit','pvNote','pvRecipientRow','pvRecipientSignRow','pvTableBox'].map(id=>'<div id="'+id+'"></div>').join('')+'</body>');
const docEl=mock.window.document;
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const str=String(v??'');const n=Number(str.replace(/,/g,''));return Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:6}):str;};
let outputCall=null,signatures=0;
const local={isoDate:'2026-11-06',isManualOpeningBalance:true,openingBalance:{
 account:'رأس مال الشركاء والمؤسسين للمشروع الذي يحمل اسمًا طويلًا',currency:'YER',
 debit:'0',credit:'30000',baseCurrency:'YER',baseDebit:'0',baseCredit:'30000',
 sourceRef:'إدخال يدوي',note:'المبلغ الافتتاحي حسب اتفاق الإدارة مع التفاصيل الطويلة'}};
const foreign={isoDate:'2026-11-06',isManualOpeningBalance:true,openingBalance:{
 account:'حساب البنك بالدولار الأمريكي',currency:'USD',debit:'100.5',credit:'0',
 baseCurrency:'YER',baseDebit:'157885.5',baseCredit:'0',exchangeRate:'1571',
 sourceRef:'السعر المعلن في الصرافة',note:'هذا بيان مستقل لا ينبغي دمجه مع السعر أو المصدر'}};
const object={isManualOpeningVoucher:true,type:'قيد افتتاحي يدوي',seqNum:112,
 isoDate:'2026-11-06',records:[local,foreign],
 totals:[{currency:'YER',debit:157885.5,credit:30000}],
 debitAccount:foreign.openingBalance.account,creditAccount:local.openingBalance.account};
const before=JSON.stringify(object);
const ctx={document:docEl,window:{RatibSignatureSettings:{fillVoucher:()=>signatures++}},
 importedOpeningDocument:()=>object,importedOpeningOutputRows:()=>[['legacy']],
 getHeaderConfig:()=>({show:true,name:'راتب',details:''}),getAccountCode:name=>name===local.openingBalance.account?'301':'101',
 ratibStatementDateHtml:d=>escapeHtml(d),openingDisplayAmount:num,trialNumber:num,esc:escapeHtml,
 buildPdfFromCanvases:output=>output,renderPagedReportTable:(...args)=>{outputCall=args;return args;},
 console,Set,String,Number,Object,Array};
vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
assert.equal(ctx.manualOpeningSourceRef(local.openingBalance),'');
assert.equal(ctx.manualOpeningSourceRef(foreign.openingBalance),'السعر المعلن في الصرافة');
const entry=ctx.manualOpeningPrintEntries(object);
assert.equal(entry.length,2);assert(entry.every(row=>row.length===8),'One pair of debit/credit columns; no duplicated valuation columns');
assert.equal(entry[0][0],'1');assert.equal(entry[0][1],'301');assert.equal(entry[1][1],'101');
assert.equal(entry[0][5],'30,000');assert.equal(entry[0][4],'—');assert.equal(entry[0][6],'YER');
assert.equal(entry[1][4],'100.5');assert.equal(entry[1][6],'USD');assert.equal(entry[1][7],'1,571');
assert(entry[1][3].includes('التقييم: 157,885.5 YER'),'Foreign valuation is visible in note cell');
assert(entry[1][3].includes('المرجع: السعر المعلن في الصرافة'),'Reference not lost');
assert(entry[1][3].includes('هذا بيان مستقل'),'Long statement not lost');
const pdfRows=ctx.manualOpeningPdfRows(object);
assert.equal(pdfRows.length,5,'Two records, one section heading, two currency totals');
assert(pdfRows.every(row=>row.length===8),'PDF respects approved eight-column layout');
assert.equal(pdfRows[2][2],'الإجماليات حسب العملة');
assert.deepEqual(Array.from(pdfRows.slice(3).map(row=>row[6])),['YER','USD']);
assert.equal(pdfRows[3][5],'30,000');assert.equal(pdfRows[4][4],'100.5');
const printed=ctx.manualOpeningPrintTable(object),tree=new JSDOM(printed).window.document;
const headings=[...tree.querySelectorAll('table.opening-manual-print th')].map(x=>x.textContent);
assert.deepEqual(headings,['م','رقم الحساب','الحساب','البيان','مدين','دائن','العملة','سعر التقييم']);
assert.equal(tree.querySelectorAll('table.opening-manual-print col').length,8);
assert.equal(tree.querySelectorAll('tr.opening-ledger-line').length,2);
assert.equal(tree.querySelectorAll('.opening-ledger-meta').length,0,'No extra crowded metadata subrows');
assert.equal(tree.querySelectorAll('table.opening-currency-totals tr.opening-ledger-total').length,2);
assert.equal(tree.querySelector('table.opening-manual-print tbody tr:nth-child(2) td:nth-child(8)').textContent,'1,571');
assert(tree.querySelector('table.opening-manual-print tbody tr:nth-child(2) td:nth-child(4)').textContent.includes('التقييم: 157,885.5 YER'));
assert(tree.querySelector('.opening-summary-title').textContent.includes('الإجماليات حسب العملة'));
assert(printed.includes('opening-valuation-footnote'),'Valuation footnote remains available');
ctx.importedOpeningPrint(local,[local,foreign]);
assert(docEl.getElementById('pvTableBox').innerHTML.includes('opening-print-layout'));
assert(docEl.getElementById('pvVoucherTitle').textContent.includes('سند قيد افتتاحي'));
assert.equal(signatures,1,'Existing signatures are retained');
ctx.importedOpeningPdf(local,[local,foreign]);
assert.equal(outputCall[2].length,8,'PDF has the same eight columns');
assert.deepEqual(Array.from(outputCall[2]),headings);
assert.equal(outputCall[4].length,5);
assert.deepEqual(Array.from(outputCall[4][1]),Array.from(entry[1]));
assert.equal(JSON.stringify(object),before,'Rendering never mutates posted data');
const triple=structuredClone(object);
triple.records.push({isoDate:'2026-11-06',isManualOpeningBalance:true,openingBalance:{
 account:'مصرف سعودي',currency:'SAR',debit:'10',credit:'0',
 baseCurrency:'YER',baseDebit:'100',baseCredit:'0',note:'مثال'}});
const tripleTotals=ctx.manualOpeningCurrencyTotals(triple);
assert.deepEqual(Array.from(tripleTotals.map(x=>x.currency)),['YER','USD','SAR']);
assert.equal(ctx.manualOpeningPdfRows(triple).length,7,'Three records, one heading, three original-currency totals');
assert.equal((new JSDOM(ctx.manualOpeningPrintTable(triple))).window.document.querySelectorAll('table.opening-currency-totals tbody tr').length,3);
const split=structuredClone(object);
split.records.push({isoDate:'2026-10-30',openingBalance:{account:'مصرف آخر',currency:'USD',debit:'20',credit:'0',baseCurrency:'SAR',baseDebit:'75',baseCredit:'0'}});
assert.equal(ctx.manualOpeningCurrencyTotals(split)[1].valuations.length,2,'Distinct valuation currencies are not mixed');
assert(ctx.manualOpeningPrintEntries(split)[2][3].includes('تاريخ البند: 2026-10-30'),'Mixed dates remain visible');
assert.equal(ctx.manualOpeningPdfRows(split).length,6,'Original currency appears once in totals despite multiple valuations');
const malicious=structuredClone(object);
malicious.records[1].openingBalance.note='<img src=x onerror=alert(1)>';
assert(!ctx.manualOpeningPrintTable(malicious).includes('<img src=x'),'User content escaped in print');
assert(css.includes('.opening-print-layout .opening-manual-print'),'Scoped print layout must exist');
assert(css.includes('.opening-currency-totals'),'Separate currency table styling must exist');
assert(css.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px'),'Delete button is compact');
assert(html.includes("del.textContent='×'"),'Saved and new line delete/zero button uses compact glyph');
console.log('PASS 3.6.141 opening: reference 8 columns, no duplicate valuation columns, original/valuation amounts, grouped currency summaries, long notes, mixed dates, print/PDF parity, X, safe escaped data');
