'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const js=fs.readFileSync('ratib-compound-output-3.6.150.js','utf8');
const css=fs.readFileSync('ratib-compound-output-3.6.150.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.doesNotThrow(()=>new Function(js));
const doc=new JSDOM('<html><body><div id="printVoucherContainer"><div class="pv-header"><h1 id="pvOrgName"></h1><p id="pvOrgDetails"></p></div><div class="pv-title" id="pvVoucherTitle"></div><div class="pv-grid"><span id="pvDate"></span><span id="pvAmount"></span></div>'+
 ['pvDebit','pvCredit','pvTafqit','pvNote','pvTableBox','pvRecipientRow','pvRecipientSignRow'].map(id=>'<div id="'+id+'"></div>').join('')+'<div class="pv-signatures"></div></div></body></html>');
const texts=[],signatures=[],logo=[],widths=[];
const canvas=()=>{
 const c={width:0,height:0,_ratibTemporary:false};
 const ctx={font:'',fillStyle:'',strokeStyle:'',lineWidth:0,textAlign:'right',direction:'rtl',
  fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},restore(){},
  measureText(t){return {width:String(t).length*9};},
  fillText(t,x,y){texts.push({text:String(t),x,y});}};
 c.getContext=()=>ctx;return c;
};
const create=doc.window.document.createElement.bind(doc.window.document);
doc.window.document.createElement=function(tag){return tag==='canvas'?canvas():create(tag)};
const wrap=(ctx,value,maxWidth)=>{
 const chars=Math.max(1,Math.floor(maxWidth/9)),lines=[];
 for(const part of String(value??'').split(/\s+/)){
  if(part.length>chars){for(let j=0;j<part.length;j+=chars)lines.push(part.slice(j,j+chars));continue;}
  const last=lines[lines.length-1]||'';
  if(last&&last.length+part.length+1<=chars)lines[lines.length-1]=last+' '+part;
  else if(part)lines.push(part);
 }
 return lines.length?lines:[''];
};
const sample={
 mode:'multi-entry',seq:217,date:'2026-11-06',baseCurrency:'YER',baseTotal:100000,
 note:'تسجيل معاملات المشروع في القيد المركب',party:'',
 lines:[
  {side:'debit',account:'الصندوق',amount:50000,currency:'YER',rate:1,base:50000,budgetId:'general',note:'رصيد نقدي'},
  {side:'debit',account:'معدات خارجية',amount:1000,currency:'USD',rate:50,base:50000,budgetId:'equipment',note:'قيمة المعدات بالعملة الأجنبية'},
  {side:'credit',account:'رأس مال الشركاء',amount:100000,currency:'YER',rate:1,base:100000,budgetId:'general',note:'مصدر التمويل'}
 ]};
const signaturesStub={height:key=>key==='compound'?103:0,drawCanvas:(ctx,key)=>{signatures.push('pdf:'+key);ctx.fillText('المعدّ',600,1080);return 103},fillVoucher:key=>signatures.push('html:'+key)};
const ctx={document:doc.window.document,window:{RatibSignatureSettings:signaturesStub,RatibPrintLogo:{syncPrint:()=>logo.push(1)}},
 getHeaderConfig:()=>({show:true,name:'مؤسسة الرأفة للتنمية',details:'وادي حضرموت - اليمن'}),
 getCats:()=>[{id:'general',name:'عام'},{id:'equipment',name:'أصول ثابتة'}],
 getAccountCode:name=>name==='الصندوق'?'181':name==='معدات خارجية'?'205':'—',
 ratibStatementDateHtml:date=>'<span class="hijri">26 جمادى الأولى 1448هـ</span><small>'+date+'</small>',
 ratibCanvasDateParts:date=>({primary:'26 جمادى الأولى 1448هـ',secondary:date}),
 wrapCanvasText:wrap,buildPdfFromCanvases:(iter,paper)=>{const output=[...iter];widths.push(paper);return output;},console};
vm.createContext(ctx);vm.runInContext(js,ctx);
const api=ctx.window.RatibCompoundOutput;
assert(api&&api.model&&api.html&&api.prepare&&api.pdf&&api.pages,'Compound output module is complete');
const original=JSON.stringify(sample),m=api.model(sample);
assert.equal(m.rows.length,3);assert.equal(m.rows[1].currency,'USD');
assert.equal(m.rows[1].rate,'50');assert.equal(m.rows[1].valuationText,'50,000');
assert.equal(m.rows[0].accountCode,'181');
assert.equal(m.baseDebit,100000);assert.equal(m.baseCredit,100000);assert.equal(m.balanced,true);
assert.deepEqual(Array.from(m.byCurrency.map(x=>x.currency)),['YER','USD']);
assert.equal(m.byCurrency[0].debit,50000);assert.equal(m.byCurrency[0].credit,100000);
assert.equal(m.byCurrency[1].debit,1000);assert.equal(m.byCurrency[1].credit,0);
assert.equal(api.COLUMN_TITLES.length,9);
const markup=api.html(sample),tree=new JSDOM(markup).window.document;
assert.deepEqual([...tree.querySelectorAll('.ratib-cmp-out-table th')].map(x=>x.textContent),['م','الحساب','مدين','دائن','العملة','سعر الصرف','مبلغ التقييم','بند الميزانية','البيان']);
assert.equal(tree.querySelectorAll('.ratib-cmp-out-line').length,3);
assert.equal(tree.querySelectorAll('.ratib-cmp-out-total-table tbody tr').length,2);
assert(tree.querySelector('.ratib-cmp-out-summary').textContent.includes('القيد متوازن'));
assert(tree.querySelector('.hijri'),'Hijri date stays primary');
assert(tree.querySelector('.ratib-cmp-out-table').textContent.includes('أصول ثابتة'));
assert(tree.querySelector('.ratib-cmp-out-table').textContent.includes('50,000'));
api.prepare(sample);
assert(doc.window.document.querySelector('#pvTableBox .ratib-compound-reference'));
assert.equal(doc.window.document.getElementById('pvOrgName').textContent,'مؤسسة الرأفة للتنمية');
assert.equal(doc.window.document.getElementById('pvRecipientRow').style.display,'none');
assert(signatures.includes('html:compound'));
assert(logo.length===1);
const pages=api.pdf(sample);assert(pages.length===1,'Short compound voucher stays on one landscape A4 sheet');
assert.deepEqual(widths[0],[842,595]);assert.equal(pages[0].width,1684);assert.equal(pages[0].height,1190);
assert(signatures.includes('pdf:compound'));
assert(texts.some(x=>x.text==='سند قيد مركب')&&texts.some(x=>x.text==='الإجماليات حسب العملة'));
assert(texts.some(x=>x.text==='مدين: 100,000')&&texts.some(x=>x.text==='دائن: 100,000'));
assert.equal(JSON.stringify(sample),original,'Read-only output may not modify posted amounts');
const noRates=structuredClone(sample);delete noRates.lines[1].base;noRates.lines[1].rate=0;
assert.equal(api.model(noRates).balanced,false);assert.equal(api.model(noRates).missingRate,true);
assert(api.html(noRates).includes('راجع أسعار الصرف'));
const fresh=structuredClone(sample);delete fresh.lines[1].base;
assert.equal(api.model(fresh).rows[1].valuation,50000,'Draft with no base amount displays derived equivalent without storage modification');
const empty={mode:'multi-entry',seq:2,date:'',baseCurrency:'YER',lines:[],note:''};
assert.equal(new JSDOM(api.html(empty)).window.document.querySelectorAll('.ratib-cmp-out-table tbody tr td').length,9);
const hostile=structuredClone(sample);hostile.note='<img src=x onerror=alert(1)>';hostile.lines[0].account='<script>alert(1)</script>';
assert(!api.html(hostile).includes('<img src=x')&&!api.html(hostile).includes('<script>alert(1)</script>'));
const long=structuredClone(sample);long.lines[0].note=('ملاحظة طويلة ').repeat(1500);
long.note=('شرح طويل ').repeat(1000);
assert(api.pdf(long).length>1,'Long vouchers paginate instead of clipping rows or notes');
assert(html.includes("window.RatibCompoundOutput.prepare(d)"));
assert(html.includes("window.RatibCompoundOutput.pdf(d)"));
assert(html.includes("return prepareMultiVoucherPrint(tx.multiVoucher)"));
assert(html.includes("return buildMultiVoucherPdf(tx.multiVoucher)"));
assert(html.includes("compoundOutput||ratibPaperLandscape()?'landscape':'portrait'"),'Compound print is landscape only');
assert(html.includes('ratib-compound-output-3.6.150.js?v=3.6.150'));
assert(html.includes('ratib-compound-output-3.6.150.css?v=3.6.150'));
assert(sw.includes('./ratib-compound-output-3.6.150.js')&&sw.includes('./ratib-compound-output-3.6.150.css'));
assert(css.includes('#printVoucherContainer:has(.ratib-compound-reference)'));
assert(!css.includes('#cashFlowCard'),'Cash and receipt screens remain unchanged');
console.log('PASS 3.6.150 compound: 9 columns, stored base and FX, original currency totals, green/gold scoped preview, landscape multi-page PDF, unchanged ledger data and signatures');
