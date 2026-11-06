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
let outputCall=null;
let signatureCount=0;
const local={
 isoDate:'2026-11-06',isManualOpeningBalance:true,
 openingBalance:{
  account:'رأس مال الشركاء والمؤسسين للمشروع الذي يحمل اسمًا طويلًا',
  currency:'YER',debit:'0',credit:'30000',
  baseCurrency:'YER',baseDebit:'0',baseCredit:'30000',
  sourceRef:'إدخال يدوي',note:'المبلغ الافتتاحي حسب اتفاق الإدارة مع التفاصيل الطويلة'
 }
};
const foreign={
 isoDate:'2026-11-06',isManualOpeningBalance:true,
 openingBalance:{
  account:'حساب البنك بالدولار الأمريكي',
  currency:'USD',debit:'100.5',credit:'0',
  baseCurrency:'YER',baseDebit:'157885.5',baseCredit:'0',
  exchangeRate:'1571',sourceRef:'السعر المعلن في الصرافة',note:'هذا بيان مستقل لا ينبغي دمجه مع السعر أو المصدر'
 }
};
const object={isManualOpeningVoucher:true,type:'قيد افتتاحي يدوي',seqNum:112,
 isoDate:'2026-11-06',records:[local,foreign],totals:[{currency:'YER',debit:157885.5,credit:30000}],
 debitAccount:foreign.openingBalance.account,creditAccount:local.openingBalance.account};
const before=JSON.stringify(object);
const ctx={
 document:docEl,window:{RatibSignatureSettings:{fillVoucher:()=>signatureCount++}},
 importedOpeningDocument:()=>object,importedOpeningOutputRows:()=>[['legacy']],
 getHeaderConfig:()=>({show:true,name:'راتب',details:''}),
 ratibStatementDateHtml:d=>escapeHtml(d),openingDisplayAmount:num,trialNumber:num,esc:escapeHtml,
 buildPdfFromCanvases:output=>output,
 renderPagedReportTable:(...args)=>{outputCall=args;return args;},
 console,Set,String,Number,Object,Array
};
vm.createContext(ctx);
vm.runInContext(html.slice(start,end),ctx);
assert.equal(ctx.manualOpeningSourceRef(local.openingBalance),'');
assert.equal(ctx.manualOpeningSourceRef(foreign.openingBalance),'السعر المعلن في الصرافة');
const pdfRows=ctx.manualOpeningPdfRows(object);
assert.equal(pdfRows.length,4,'Two original currencies require two separate PDF total rows');
assert.equal(pdfRows[0].length,10);
assert.equal(pdfRows[0][1],'YER');
assert.equal(pdfRows[0][8],'','Default local source is not mistaken for a real reference');
assert.equal(pdfRows[0][9],local.openingBalance.note);
assert.equal(pdfRows[1][1],'USD','Original foreign currency is preserved');
assert.equal(pdfRows[1][2],'100.5','Original debit amount remains in its own currency');
assert.equal(pdfRows[1][5],'157,885.5','Valuation remains separate');
assert.equal(pdfRows[1][7],'1,571','Exchange rate has its own field');
assert.equal(pdfRows[1][8],foreign.openingBalance.sourceRef);
assert.equal(pdfRows[1][9],foreign.openingBalance.note);
assert.deepEqual(Array.from(pdfRows.slice(2).map(r=>r[1])),['YER','USD']);
assert.equal(pdfRows[2][3],'30,000');
assert.equal(pdfRows[2][6],'30,000');
assert.equal(pdfRows[3][2],'100.5');
assert.equal(pdfRows[3][5],'157,885.5');
assert(!pdfRows.slice(2).some(r=>r[2]==='100.5'&&r[1]==='YER'));
const printed=ctx.manualOpeningPrintTable(object);
const tree=new JSDOM(printed).window.document;
assert.equal(tree.querySelectorAll('table.opening-manual-print col').length,7);
assert.equal(tree.querySelectorAll('tr.opening-ledger-line').length,2);
assert.equal(tree.querySelectorAll('tr.opening-ledger-meta').length,2);
const lines=[...tree.querySelectorAll('tr.opening-ledger-line')];
assert.equal(lines[0].querySelector('.opening-account-cell').textContent,local.openingBalance.account);
assert.equal(lines[1].querySelectorAll('td')[1].textContent,'USD');
assert.equal(lines[1].querySelectorAll('td')[5].textContent,'157,885.5');
const groupedTotals=[...tree.querySelectorAll('tr.opening-ledger-total')];
assert.equal(groupedTotals.length,2,'Printed totals are grouped by original currency');
assert.equal(groupedTotals[0].querySelectorAll('td')[1].textContent,'YER');
assert.equal(groupedTotals[1].querySelectorAll('td')[1].textContent,'USD');
assert.equal(groupedTotals[0].querySelectorAll('td')[3].textContent,'30,000');
assert.equal(groupedTotals[1].querySelectorAll('td')[2].textContent,'100.5');
const notes=[...tree.querySelectorAll('tr.opening-ledger-meta')];
assert.equal(notes[0].querySelectorAll('.opening-print-field').length,3,'Local currency has no false exchange-rate metadata');
assert.equal(notes[1].querySelectorAll('.opening-print-field').length,4,'Foreign rate, reference and statement are distinct');
assert(notes[1].textContent.includes('السعر المعلن في الصرافة'));
assert(notes[1].textContent.includes('هذا بيان مستقل'));
const noteTexts=[...notes[1].querySelectorAll('.opening-print-field')].map(e=>e.textContent.trim());
assert(noteTexts.some(s=>s.startsWith('المرجع:')&&s.includes('السعر المعلن')));
assert(noteTexts.some(s=>s.startsWith('البيان:')&&s.includes('هذا بيان')));
ctx.importedOpeningPrint(local,[local,foreign]);
assert(docEl.getElementById('pvTableBox').innerHTML.includes('opening-manual-print'));
assert.equal(signatureCount,1,'Existing signatures are retained');
ctx.importedOpeningPdf(local,[local,foreign]);
assert.equal(outputCall[2].length,10,'PDF has separate 10 columns');
assert.equal(outputCall[2][8],'المرجع');
assert.equal(outputCall[2][9],'البيان');
assert.equal(outputCall[4][1][1],'USD');
assert.equal(outputCall[4][1][7],'1,571');
assert.equal(outputCall[4][1][8],foreign.openingBalance.sourceRef);
assert.equal(outputCall[4][1][9],foreign.openingBalance.note);
assert.equal(outputCall[4].length,4);
assert.equal(JSON.stringify(object),before,'Rendering never mutates posted data');
const triple=structuredClone(object);
triple.records.push({isoDate:'2026-11-06',isManualOpeningBalance:true,openingBalance:{account:'مصرف سعودي',currency:'SAR',debit:'10',credit:'0',baseCurrency:'YER',baseDebit:'100',baseCredit:'0',note:'مثال'}});
const tripleTotals=ctx.manualOpeningCurrencyTotals(triple);
assert.deepEqual(Array.from(tripleTotals.map(x=>x.currency)),['YER','USD','SAR']);
assert.equal(tripleTotals[0].credit,30000);
assert.equal(tripleTotals[1].debit,100.5);
assert.equal(tripleTotals[2].debit,10);
const beforeTriple=JSON.stringify(triple);
assert.equal(ctx.manualOpeningPdfRows(triple).length,6);
assert.equal((new JSDOM(ctx.manualOpeningPrintTable(triple))).window.document.querySelectorAll('tr.opening-ledger-total').length,3);
assert.equal(JSON.stringify(triple),beforeTriple,'Grouping does not mutate financial records');
const oneCurrency=structuredClone(object);oneCurrency.records=[local];
assert.equal(ctx.manualOpeningPdfRows(oneCurrency).length,2);
const splitBase=structuredClone(object);
splitBase.records.push({isoDate:'2026-11-06',openingBalance:{account:'قيد آخر',currency:'USD',debit:'20',credit:'0',baseCurrency:'SAR',baseDebit:'75',baseCredit:'0'}});
const splitTotals=ctx.manualOpeningCurrencyTotals(splitBase);
assert.equal(splitTotals.length,2,'One original currency remains one group');
assert.equal(splitTotals[1].valuations.length,2,'Distinct valuation currencies are never mixed');
assert.equal(ctx.manualOpeningPdfRows(splitBase).length,6,'Three records plus three separate original/valuation subtotal rows');
const mixed=structuredClone(object);mixed.records[1].isoDate='2026-10-30';
ctx.importedOpeningDocument=()=>mixed;
ctx.importedOpeningPdf(local,mixed.records);
assert.equal(outputCall[2].length,11,'Mixed-date historic entries retain a date column');
assert.equal(outputCall[4][1][10],'2026-10-30');
assert(!html.includes("id=\"importedOpeningSeq\" type=\"number\""),'Document sequence remains compatible with its original input');
assert(html.includes("seqField.placeholder='رقم القيد'"));
assert(html.includes("if(hints[key])el.placeholder=hints[key]"));
assert(html.includes('class="opening-inline-field"><span class="opening-field-caption">سعر الصرف</span>'));
assert(css.includes('/* Official 3.6.140 — single caption source per editable opening field.'));
assert(css.includes('content:none!important;display:none!important;visibility:hidden!important'));
assert(css.includes('.opening-manual-print .opening-account-cell'));
assert(css.includes('overflow-wrap:anywhere!important'));
assert(css.includes('.opening-manual-print .opening-print-details'));
const invalid=structuredClone(object);invalid.records[1].openingBalance.note='<img src=x onerror=alert(1)>';
const safe=ctx.manualOpeningPrintTable(invalid);
assert(!safe.includes('<img src=x'), 'Printed user data is escaped');
console.log('PASS opening journal manual output: original/valuation separation, long account wrapping, rate/reference/note, mixed dates, in-field hints, old ledger protected');
