'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('ratib-cash-reference-3.6.148.js','utf8');
const css=fs.readFileSync('ratib-cash-reference-3.6.148.css','utf8');
const worker=fs.readFileSync('sw.js','utf8');
assert.doesNotThrow(()=>new Function(source));
const mock=new JSDOM('<html><body>'+['pvOrgName','pvOrgDetails','pvVoucherTitle','pvRecipientLabel','pvRecipientSignLabel','pvRecipientName','pvRecipientRow','pvRecipientSignRow','pvTableBox'].map(id=>'<div id="'+id+'"></div>').join('')+'</body></html>');
const calls=[],positions=[];
const fakeCanvas=()=>{
 const canvas={width:0,height:0,_ratibTemporary:false};
 const x={font:'',fillStyle:'',strokeStyle:'',lineWidth:1,direction:'rtl',textAlign:'right',
  measureText(text){return {width:String(text).length*9};},
  fillText(value,x,y){calls.push(String(value));positions.push({value:String(value),x,y,align:this.textAlign});},fillRect(){},strokeRect(){},save(){},restore(){},clearRect(){}};
 canvas.getContext=()=>x;return canvas;
};
const actualCreate=mock.window.document.createElement.bind(mock.window.document);
mock.window.document.createElement=tag=>tag==='canvas'?fakeCanvas():actualCreate(tag);
const wrap=(ctx,v,maxW)=>{
 const width=Math.max(1,Math.floor(maxW/9)),text=String(v??'');
 const lines=[];for(const part of text.split(/\s+/)){if(!part)continue;
  if(part.length>width){for(let j=0;j<part.length;j+=width)lines.push(part.slice(j,j+width));continue;}
  const previous=lines[lines.length-1];if(previous&&(previous+' '+part).length<=width)lines[lines.length-1]+=' '+part;
  else lines.push(part);
 }
 return lines.length?lines:[''];
};
const signed=[];
const sig={height:()=>103,drawCanvas:(ctx,key)=>{signed.push('pdf:'+key);ctx.fillText('المحاسب / المدير',600,1300);return 103;},fillVoucher:key=>signed.push('html:'+key)};
const ctx={document:mock.window.document,window:{RatibSignatureSettings:sig,RatibPrintLogo:{syncPrint(){}}},
  getCats:()=>[{id:'b1',name:'مساعدات نقدية'},{id:'general',name:'عام'}],
  getAccountCode:name=>name==='التمويل / التنمية التعليمية المتنوعة'?'41020007':'—',
  accountCurrencyLabel:c=>({SAR:'ريال سعودي',YER:'ريال يمني',USD:'دولار أمريكي'})[c]||c,
  tafqitAccountCurrency:()=> 'ألف ريال سعودي',
  ratibStatementDateHtml:date=>'<span class="primary-date">26 ربيع الأول 1448هـ</span><small>'+date+'</small>',
  ratibCanvasDateParts:date=>({primary:'26 ربيع الأول 1448هـ',secondary:date}),
  wrapCanvasText:wrap,getHeaderConfig:()=>({show:true,name:'مؤسسة الرأفة',details:'للتنمية التعليمية والاجتماعية'}),
  ratibVoucherShowPrintEquation:()=>false,spendSavedEquation:()=>'',buildPdfFromCanvases:pages=>[...pages],
  cashVoucherTitle:mode=>mode==='income'?'سند قبض':'سند صرف',
  entryprepareMultiVoucherPrint:()=>{},console};
vm.createContext(ctx);vm.runInContext(source,ctx);
const api=ctx.window.RatibCashReference;
assert(api,'Cash output helper must load');
const receipt={mode:'income',seq:3203,date:'2026-09-06',baseCurrency:'SAR',baseTotal:1000,
 beneficiary:'فاعل خير بواسطة صالح علي الخطيب',sourceAccount:'صندوق الإدارة',
 note:'قيمة 1000 ريال سعودي مورد مبارك مساعدات نقدية للمعلمين والعاملين بدار المصطفى',
 lines:[{account:'التمويل / التنمية التعليمية المتنوعة',amount:1000,currency:'SAR',
  budgetId:'b1',note:'مساعدة تعليمية للعاملين',notes:''},{account:'صندوق آخر',amount:0,currency:'SAR',budgetId:'general',note:''},
  {account:'قيد موازنة داخلي',amount:0,currency:'USD',autoBalance:true}]};
const before=JSON.stringify(receipt);
const m=api.model(receipt);
assert.equal(m.title,'سند قبض');assert.equal(m.currencyName,'ريال سعودي');
assert.equal(m.cashAccount,'صندوق الإدارة');assert.equal(m.rows.length,2);
assert.equal(m.rows[0].accountCode,'41020007');assert.equal(m.rows[0].amount,'1,000.00');
assert.equal(m.rows[0].budget,'مساعدات نقدية');assert.equal(m.rows[1].notes,'');
const markup=api.html(receipt),dom=new JSDOM(markup).window.document;
const headers=[...dom.querySelectorAll('.ratib-cash-grid thead th')].map(el=>el.textContent);
assert.deepEqual(headers,['الحساب','المبلغ','العملة','ملاحظات','بند الميزانية']);
assert.equal(dom.querySelectorAll('.ratib-cash-grid tbody tr').length,2);
assert.equal(dom.querySelector('.ratib-cash-head-title').textContent,'سند قبض');
assert.equal(dom.querySelector('.ratib-cash-head-right .ratib-cash-money').textContent,'1,000.00');
const metaRight=[...dom.querySelectorAll('.ratib-cash-head-right .ratib-cash-pair')].map(el=>el.textContent.trim());
assert(metaRight[1].includes('المبلغ:')&&metaRight[2].includes('العملة: ريال سعودي'),'Currency sits immediately after voucher amount');
assert(!dom.querySelector('.ratib-cash-head-left').textContent.includes('العملة:'),'Left header no longer duplicates currency');
assert(dom.querySelector('.ratib-cash-head-left').textContent.includes('صندوق الإدارة'));
assert(dom.querySelector('.ratib-cash-narrative').textContent.includes('فاعل خير بواسطة صالح علي الخطيب'));
assert(dom.querySelector('.ratib-cash-narrative').textContent.includes('ألف ريال سعودي'));
assert(dom.querySelector('.ratib-cash-head-left .primary-date'),'Hijri date remains visible');
assert(dom.querySelector('.ratib-cash-grid').textContent.includes('41020007'));
assert.equal(dom.querySelectorAll('.ratib-cash-grid tbody tr:last-child td').length,5,'Empty values retain fixed table cell locations');
const blank={...receipt,mode:'spend',seq:1234,beneficiary:'',note:'',sourceAccount:'',lines:[]};
const blankDoc=new JSDOM(api.html(blank)).window.document;
assert.equal(blankDoc.querySelector('.ratib-cash-head-title').textContent,'سند صرف');
assert.equal(blankDoc.querySelectorAll('.ratib-cash-grid tbody tr td').length,5,'Empty voucher retains all columns');
assert(blankDoc.querySelector('.ratib-cash-head-right').textContent.includes('العملة: ريال سعودي'),'Payment mode retains currency beneath amount');
const hostile={...receipt,note:'<script>alert(1)</script>',lines:[{...receipt.lines[0],account:'<img src=x onerror=alert(1)>'}]};
const hostileHtml=api.html(hostile);
assert(!hostileHtml.includes('<script>alert(1)</script>'));
assert(!hostileHtml.includes('<img src=x onerror=alert(1)>'));
const pages=api.pdf(receipt);
assert(pages.length>=1,'PDF canvas pages are generated');
assert(calls.includes('سند قبض')&&calls.includes('1,000.00'));
const pdfAmount=positions.find(p=>p.value==='المبلغ: 1,000.00');
const pdfCurrency=positions.find(p=>p.value==='العملة: ريال سعودي');
assert(pdfAmount&&pdfCurrency&&pdfAmount.x===pdfCurrency.x&&pdfCurrency.y>pdfAmount.y&&pdfCurrency.y-pdfAmount.y<40,'PDF currency is directly below amount in right header');
assert(!positions.some(p=>p.value==='العملة: ريال سعودي'&&p.align==='left'),'PDF left header does not retain the currency');
assert(calls.includes('بند الميزانية')&&calls.includes('ملاحظات'));
assert(calls.includes('فاعل خير بواسطة صالح علي الخطيب'));
assert(signed.includes('pdf:receipt'),'PDF uses existing signatures');
assert.equal(JSON.stringify(receipt),before,'Display-only transformation must not mutate financial record');
const tooLong={...receipt,note:'بيان '.repeat(1800),lines:[{...receipt.lines[0],notes:'تفاصيل '.repeat(1500)}]};
const longPages=api.pdf(tooLong);
assert(longPages.length>1,'Long narrative and table details paginate rather than clipping');
const a=html.indexOf('function prepareMultiVoucherPrint(d){');
const b=html.indexOf('async function printSpendData(d){',a);
assert(a>0&&b>a);
vm.runInContext(html.slice(a,b),ctx);
ctx.prepareMultiVoucherPrint(receipt);
assert(mock.window.document.querySelector('#pvTableBox .ratib-cash-reference'),'Native print/preview uses reference template');
assert(signed.includes('html:receipt'),'Original receipt signatures used');
ctx.prepareMultiVoucherPrint(blank);
assert(signed.includes('html:payment'),'Original payment signatures used');
assert(Array.isArray(ctx.buildMultiVoucherPdf(receipt)),'PDF and share use same renderer');
assert(html.includes('ratib-cash-reference-3.6.148.js?v=3.6.162'));
assert(html.includes('ratib-cash-reference-3.6.148.css?v=3.6.162'));
assert(worker.includes('ratib-cash-reference-3.6.148.js'));
assert(worker.includes('ratib-cash-reference-3.6.148.css'));
assert(css.includes('grid-template-areas:"right title left"'));
const unifiedColors=fs.readFileSync('ratib-voucher-colors-totals-3.6.152.css','utf8');
assert(unifiedColors.includes('.ratib-cash-reference .ratib-cash-grid th'));
assert(unifiedColors.includes('background:#e0f0e8!important'));
assert(unifiedColors.includes('border-bottom:2px solid #c5a64b!important'));
assert(source.includes("ctx.fillStyle='#e2f3e9'"),'PDF cash title uses the green/gold palette');
assert(!source.includes("ctx.fillStyle='#edf4fd'"),'Old blue background removed from PDF');
assert(css.includes('grid-template-columns:130px minmax(0,1fr)'));
assert(!markup.includes('البيان</th>')&&!markup.includes('المشروع</th>'));
console.log('PASS 3.6.148: receipt/payment reference layout, 5 columns, blank cells, Hijri date, safe notes, PDF pagination, existing signatures, preview/print/share reuse.');
