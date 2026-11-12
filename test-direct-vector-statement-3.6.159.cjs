/* Ratib 3.6.159: real vector Arabic PDF, direct export/share, and offline assets. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const pdfEngine=require('./vendor/ratib-pdfmake-rtl-0.2.23.js');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const src=fs.readFileSync('ratib-statement-direct-pdf-3.6.159.js','utf8');
const pkg=require('./package.json');
const fontRegular=path.join(__dirname,'vendor/ratib-tajawal-regular.ttf');
const fontBold=path.join(__dirname,'vendor/ratib-tajawal-bold.ttf');
const bundle=path.join(__dirname,'vendor/ratib-pdfmake-rtl-0.2.23.js');
assert.equal(pkg.version,'3.6.188');
assert.equal(pkg.devDependencies.pdfmake,'0.2.23');
assert(fs.statSync(bundle).size>400000,'Offline PDF engine must be vendored');
assert(fs.statSync(fontRegular).size>40000,'Full Arabic regular font must be vendored');
assert(fs.statSync(fontBold).size>40000,'Full Arabic bold font must be vendored');
for(const asset of ['ratib-statement-direct-pdf-3.6.159.js','vendor/ratib-pdfmake-rtl-0.2.23.js',
 'vendor/ratib-tajawal-regular.ttf','vendor/ratib-tajawal-bold.ttf'])
 assert(sw.includes('"./'+asset+'"'),'Service worker must cache '+asset);
assert(sw.includes('"version":"3.6.188"'));
assert(html.includes('ratib-statement-direct-pdf-3.6.159.js?v=3.6.188'));
assert(html.includes('new File([await buildAccountOperationsPdf(choice,currencies)]'));
assert(html.includes('downloadFinancialFile(await buildAccountOperationsPdf(choice,currencies)'));
assert(html.includes('window.RatibStatementVector.markup(data)'));
assert(!/toDataURL|drawImage|image\/jpeg|buildPdfFromCanvases/.test(src),'PDF engine must not rasterize the statement pages');
assert(!/window\.print|printRatibDocument/.test(src),'Direct export must not launch print dialog');
const dom=new JSDOM('<html><head></head><body></body></html>',{
 url:'https://example.test/Ratib0129/',runScripts:'outside-only'
});
const win=dom.window;
win.eval(src);
const h=[
'<section class="ratib-vector-sheet" dir="rtl">',
'<div class="ratib-vector-organization"><strong>مؤسسة الرأفة</strong><span>حضرموت</span></div>',
'<h2>كشف حساب: الصندوق — YER</h2>',
'<div class="ratib-vector-details"><span>ربيع الآخر 1448</span></div>',
'<table class="ratib-vector-table"><thead><tr><th>التاريخ</th><th>المستند</th><th>البيان</th>',
'<th>مدين (عليكم)</th><th>دائن (لكم)</th><th>الرصيد</th></tr></thead><tbody>',
'<tr><td><span class="ratib-vector-hijri">١ ربيع الآخر</span><small class="ratib-vector-gregorian">2026-11-02</small></td>',
'<td>سند 23</td><td>مصاريف الإصلاح</td><td>75</td><td></td><td>75 مدين</td></tr>',
'<tr class="ratib-vector-total"><td colspan="3">إجمالي العمليات</td>',
'<td>75</td><td>0</td><td>75 مدين</td></tr></tbody></table>',
'<div class="ratib-vector-footer"><p class="ratib-vector-words">الرصيد المتبقي عليكم: خمسة وسبعون ريالًا</p>',
'<p class="ratib-vector-notice">يعتبر الكشف صحيحًا ما لم تتم المراجعة خلال 14 يومًا</p></div></section>'
].join('');
const model=win.RatibDirectVectorPdf.documentDefinition(h,'landscape');
assert.equal(model.pageOrientation,'landscape');
const body=model.content.find(x=>x.table).table.body;
assert.equal(body.length,3);
assert.equal(body[0][0],'الرصيد');
assert.equal(body[0][5],'التاريخ');
assert(body[1][5].text.includes('ربيع الآخر'));
assert(body[1][5].text.includes('2026-11-02'));
assert.equal(body[2][3].colSpan,3,'RTL total label must span from left to right');
assert.equal(body[2][3].text,'إجمالي العمليات');
assert(model.content.some(x=>x.text?.includes('خمسة وسبعون')));
assert(model.content.some(x=>x.text?.includes('14 يومًا')));
const three=h+h.replace('الصندوق','المصرف').replace('YER','SAR');
assert(win.RatibDirectVectorPdf.documentDefinition(three).content.some(x=>x.pageBreak==='before'),'Multiple currencies must be separated');
pdfEngine.vfs={'normal.ttf':fs.readFileSync(fontRegular).toString('base64'),'bold.ttf':fs.readFileSync(fontBold).toString('base64')};
pdfEngine.fonts={Tajawal:{normal:'normal.ttf',bold:'bold.ttf',italics:'normal.ttf',bolditalics:'bold.ttf'}};
async function pdfBuffer(def){return new Promise(resolve=>pdfEngine.createPdf(def).getBuffer(resolve));}
async function pdfPages(def){return new Promise(resolve=>pdfEngine.createPdf(def)._getPages({},resolve));}
(async()=>{
 // Assert visual word positions, not merely a valid PDF/font header.
 const pages=await pdfPages({defaultStyle:{font:'Tajawal'},content:[
  {text:'كشف حساب عمر حسين الراقي',alignment:'right'},
  {text:'الرصيد 300,000 دائن بتاريخ \u200e2026-11-12\u200e',alignment:'right'},
  {text:'\u200e2026-11-12\u200e',alignment:'right'},
  {columns:[{width:100,text:'هذه جملة عربية طويلة لاختبار ترتيب الكلمات عندما يلتف البيان إلى أكثر من سطر',alignment:'right'}]}
 ]});
 const lines=pages.flatMap(p=>p.items.filter(i=>i.type==='line').map(i=>i.item.inlines));
 assert.deepEqual(lines[0].map(i=>i.text.trim()).filter(Boolean),['الراقي','حسين','عمر','حساب','كشف'],'Arabic words must run right to left');
 assert(lines[1].some(i=>i.text==='300,000'),'Amount digits retain their order');
 assert(lines[1].some(i=>i.text==='2026-11-12'),'Mixed ISO date retains its order');
 assert.equal(lines[2].map(i=>i.text).join(''),'2026-11-12','Standalone ISO date has no painted direction controls');
 assert(lines.length>5,'Long Arabic text must wrap into several lines');
 const wrapped=lines.slice(3).map(line=>line.map(i=>i.text.trim()).filter(Boolean).reverse().join(' ')).join(' ');
 assert.equal(wrapped,'هذه جملة عربية طويلة لاختبار ترتيب الكلمات عندما يلتف البيان إلى أكثر من سطر','Logical word sequence survives line wrapping');
 const marked=h.replace('<td>75 مدين</td>','<td class="ratib-vector-matched">٧٥٬٠٠٠ مدين (مطابق)</td>');
 const balance=win.RatibDirectVectorPdf.documentDefinition(marked).content.find(x=>x.table).table.body[1][0];
 assert.equal(balance.fillColor,'#DCFCE7');assert.equal(balance.text,'75,000 مدين (مطابق)');
 assert.equal(body[1][0].fillColor,undefined,'Unverified balance stays unhighlighted');
 const buf=await pdfBuffer(model);
 assert(buf.subarray(0,8).toString().startsWith('%PDF-'),'Must generate valid PDF');
 assert(buf.length>12000,'Embedded Arabic font should be present');
 const binary=buf.toString('latin1');
 assert(binary.includes('/FontFile2'),'TrueType Arabic font should be embedded');
 assert(binary.includes('/ToUnicode'),'Text extraction should have a Unicode mapping');
 assert(!binary.includes('/DCTDecode'),'Statement must not be a JPEG page');
 assert(!binary.includes('/Subtype /Image'),'Statement must contain no rasterized text pages');
 let requested=0,created=0;
 win.fetch=async url=>{
  requested++;
  const bytes=fs.readFileSync(path.join(__dirname,url.replace(/^\.\//,'')));
  return {ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
 };
 win.pdfMake={
  vfs:{},fonts:{},
  createPdf:def=>{created++;assert.equal(def.pageSize,'A4');return {getBlob:cb=>cb(new win.Blob(['%PDF-1.4 test'],{type:'application/pdf'}))};}
 };
 const blob=await win.RatibDirectVectorPdf.make(h,'portrait');
 assert.equal(blob.type,'application/pdf');
 assert.equal(requested,2,'Fetch two local Arabic font assets once');
 assert.equal(created,1);
 assert(win.pdfMake.vfs['ratib-tajawal-regular.ttf'].length>40000);
 assert(win.pdfMake.vfs['ratib-tajawal-bold.ttf'].length>40000);
 await win.RatibDirectVectorPdf.make(h);
 assert.equal(requested,2,'Reuse already loaded fonts');
 console.log('PASS Ratib 3.6.159: actual embedded Arabic/ToUnicode vector PDF + direct browser engine + RTL totals + offline assets');
 dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
