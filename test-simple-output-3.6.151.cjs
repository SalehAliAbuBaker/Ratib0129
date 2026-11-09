'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('ratib-simple-output-3.6.151.js','utf8');
const css=fs.readFileSync('ratib-simple-output-3.6.151.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.doesNotThrow(()=>new Function(src));
assert.equal(pkg.version,'3.6.155');
const doc=new JSDOM('<!doctype html><html><body><div id="printVoucherContainer"><div class="pv-header"><h1 id="pvOrgName"></h1><p id="pvOrgDetails"></p></div><div class="pv-title" id="pvVoucherTitle"></div><div class="pv-grid"><span id="pvDate"></span><span id="pvAmount"></span></div>'+
 ['pvDebit','pvCredit','pvTafqit','pvNote','pvTableBox','pvRecipientRow','pvRecipientSignRow'].map(id=>'<div id="'+id+'"></div>').join('')+'<div class="pv-signatures"></div></div></body></html>');
const texts=[],sigs=[],landscape=[],logo=[];
const originalCreate=doc.window.document.createElement.bind(doc.window.document);
function canvas(){
 const c={width:0,height:0,_ratibTemporary:false};
 const ctx={fillStyle:'',strokeStyle:'',font:'',lineWidth:1,direction:'rtl',textAlign:'right',save(){},restore(){},
  beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},
  measureText(v){return {width:String(v).length*8}},
  fillText(v,x,y){texts.push({text:String(v),x,y})}};
 c.getContext=()=>ctx;return c;
}
doc.window.document.createElement=function(t){return t==='canvas'?canvas():originalCreate(t)};
const wrap=(context,v,width)=>{
 const max=Math.max(1,Math.floor(width/8)),res=[];
 for(const part of String(v??'').split(/\s+/)){
  if(part.length>max){for(let i=0;i<part.length;i+=max)res.push(part.slice(i,i+max));continue;}
  if(res.length&&res[res.length-1].length+part.length+1<=max)res[res.length-1]+=' '+part;
  else if(part)res.push(part);
 }
 return res.length?res:[''];
};
const v={
 voucherMode:'entry',seqNum:37,isoDate:'2026-11-06',amount:125000,currency:'YER',
 debitAccount:'الصندوق',creditAccount:'رأس المال',isOpeningBalance:false,
 distribution:{general:{id:'general',name:'المصاريف العامة',amount:75000,pct:60,excluded:false},
  tools:{id:'tools',name:'شراء المعدات',amount:50000,pct:40,excluded:false}},
 execution:{general:{note:'صرف للمستلزمات'},tools:{note:'شراء معدات جديدة'}}
};
const storedBefore=JSON.stringify(v);
const settings={height:k=>k==='journal'?103:0,fillVoucher:k=>sigs.push('html:'+k),
 drawCanvas:(ctx,k)=>{sigs.push('pdf:'+k);ctx.fillText('المعد',500,1090);return 103}};
const ctx={console,document:doc.window.document,window:{RatibSignatureSettings:settings,RatibPrintLogo:{syncPrint:()=>logo.push('logo')}},
 getHeaderConfig:()=>({show:true,name:'مؤسسة الرأفة للتنمية',details:'حضرموت - اليمن'}),
 getCats:()=>[{id:'general',name:'المصاريف العامة'},{id:'tools',name:'شراء المعدات'}],
 getAccountCode:name=>name==='الصندوق'?'181':name==='رأس المال'?'301':'—',
 tafqitAccountCurrency:()=> 'مائة وخمسة وعشرون ألف ريال يمني',
 ratibStatementDateHtml:x=>'<span class="ratib-hijri-text"><span>26 جمادى الأولى 1448هـ</span><small>'+x+'</small></span>',
 ratibCanvasDateParts:x=>({primary:'26 جمادى الأولى 1448هـ',secondary:x}),wrapCanvasText:wrap,
 buildPdfFromCanvases:(pages,size)=>{landscape.push(Array.from(size));return [...pages];}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=ctx.window.RatibSimpleOutput;assert(api&&api.model&&api.prepare&&api.pdf);
const m=api.model(v);
assert.equal(m.title,'سند قيد بسيط');assert.equal(m.rows.length,2);assert.equal(m.budgetRows.length,2);
assert.equal(m.rows[0].debit,125000);assert.equal(m.rows[0].credit,null);
assert.equal(m.rows[1].debit,null);assert.equal(m.rows[1].credit,125000);
assert.equal(m.balanced,true);assert.equal(m.baseDebit,m.baseCredit);
assert.equal(m.rows[0].accountCode,'181');assert.equal(m.rows[1].accountCode,'301');
assert.equal(m.rows[0].budget,'بنود متعددة');assert.equal(m.description,'صرف للمستلزمات — شراء معدات جديدة');
assert.equal(m.amountWords,'مائة وخمسة وعشرون ألف ريال يمني');
assert.deepEqual(Array.from(api.COLUMN_TITLES),['م','الحساب','مدين','دائن','العملة','بند الميزانية','البيان']);
const out=api.html(v),dom=new JSDOM(out).window.document;
assert.equal(dom.querySelectorAll('.ratib-smp-out-table thead th').length,7);
assert.equal(dom.querySelectorAll('.ratib-smp-out-table tbody tr').length,2);
assert.equal(dom.querySelectorAll('.ratib-smp-out-budget tbody tr').length,2);
assert(dom.querySelector('.ratib-smp-out-words').textContent.includes('مائة وخمسة وعشرون ألف'));
const footer=dom.querySelector('.ratib-smp-out-table tfoot tr');
assert(footer,'Simple totals inside the same table as debit and credit entries');
const cells=footer.querySelectorAll('td');
assert.equal(cells.length,6);assert.equal(cells[5].colSpan,2);
assert.equal(cells[1].textContent,'إجمالي YER');
assert.equal(cells[2].textContent,'125,000');
assert.equal(cells[3].textContent,'125,000');
assert(dom.querySelector('.ratib-smp-out-summary').textContent.includes('القيد متوازن'));
assert(dom.querySelector('.ratib-hijri-text'));
api.prepare(v);
assert(doc.window.document.querySelector('#pvTableBox .ratib-simple-reference'));
assert.equal(doc.window.document.getElementById('pvOrgName').textContent,'مؤسسة الرأفة للتنمية');
assert.equal(doc.window.document.getElementById('pvRecipientRow').style.display,'none');
assert(sigs.includes('html:journal'));
assert(logo.length===1);
const pages=api.pdf(v);
assert.equal(pages.length,1,'Short simple voucher fits one page');
assert.deepEqual(landscape[0],[842,595]);assert.equal(pages[0].width,1684);assert.equal(pages[0].height,1190);
assert(texts.some(x=>x.text==='سند قيد بسيط'));
const pdfSimpleTotal=texts.find(x=>x.text==='إجمالي YER');
assert(pdfSimpleTotal,'PDF simple totals must use footer columns');
const pdfSimpleAmounts=texts.filter(x=>x.y===pdfSimpleTotal.y&&x.text==='125,000');
assert(pdfSimpleAmounts.some(x=>x.x===1684-58-56-380-205/2),'Simple PDF debit footer aligns with debit');
assert(pdfSimpleAmounts.some(x=>x.x===1684-58-56-380-205-205/2),'Simple PDF credit footer aligns with credit');
assert(texts.some(x=>x.text==='توزيع المبلغ على بنود الميزانية'));
assert(texts.some(x=>x.text.includes('المبلغ كتابة')));
assert(sigs.includes('pdf:journal'));
assert.equal(JSON.stringify(v),storedBefore,'No financial source mutation');
const single=structuredClone(v);single.distribution={general:{id:'general',name:'عام',amount:125000,pct:100}};
const simpleDom=new JSDOM(api.html(single)).window.document;
assert.equal(simpleDom.querySelector('.ratib-smp-out-budget'),null,'No unnecessary table for one budget');
const malicious=structuredClone(v);malicious.debitAccount='<img src=x onerror=alert(1)>';malicious.execution.general.note='<script>alert(1)</script>';
assert(!api.html(malicious).includes('<img src=x')&&!api.html(malicious).includes('<script>alert(1)</script>'));
const long=structuredClone(v);long.execution.general.note=('توضيح طويل ').repeat(700);
assert(api.pdf(long).length>1,'Long note paginates without cutting text');
assert.throws(()=>api.model({...v,voucherMode:'income'}));
assert.throws(()=>api.model({...v,isOpeningBalance:true}));
assert.throws(()=>api.model({...v,isMultiVoucher:true}));
assert(html.includes("return window.RatibSimpleOutput.prepare(tx);"));
assert(html.includes("return window.RatibSimpleOutput.pdf(tx);"));
assert(html.includes(".ratib-compound-reference,#pvTableBox .ratib-simple-reference"));
assert(html.includes("ratib-simple-output-3.6.151.js?v=3.6.155"));
assert(html.includes("ratib-simple-output-3.6.151.css?v=3.6.155"));
assert(sw.includes('"./ratib-simple-output-3.6.151.js"'));
assert(sw.includes('"./ratib-simple-output-3.6.151.css"'));
assert(css.includes('#printVoucherContainer:has(.ratib-simple-reference)'));
assert(!css.includes('#cashFlowCard'));
console.log('PASS simple 3.6.151: seven-column output, debit/credit, exact budget split, amount words, HTML and landscape PDF, journal signatures, pagination, XSS and strict isolation');
