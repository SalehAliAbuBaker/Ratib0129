/* Ratib 3.6.159: direct vector PDF export and sharing, Arabic Tajawal embedded.
 * pdfmake 0.2.23 (MIT) uses PDFKit/FontKit for shaped Arabic and text/vector drawing.
 * The JPEG-backed legacy PDF remains untouched for other report formats.
 */
(()=>{
 'use strict';
 const LIB='./vendor/ratib-pdfmake-rtl-0.2.23.js';
 const FONT_NORMAL='./vendor/ratib-tajawal-regular.ttf';
 const FONT_BOLD='./vendor/ratib-tajawal-bold.ttf';
 let enginePromise=null,fontsPromise=null;
 async function loadEngine(){
  if(window.pdfMake?.createPdf)return window.pdfMake;
  if(enginePromise)return enginePromise;
  enginePromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=LIB;script.async=true;script.dataset.ratibPdfmake='1';
   script.onload=()=>window.pdfMake?.createPdf?resolve(window.pdfMake):reject(Error('تعذّر تشغيل محرك PDF النصي'));
   script.onerror=()=>reject(Error('محرك PDF النصي غير متاح؛ تأكد من اكتمال تحديث التطبيق'));
   document.head.appendChild(script);
  }).catch(e=>{enginePromise=null;throw e;});
  return enginePromise;
 }
 function encodeBase64(bytes){
  // Chunked conversion avoids stack overflow on larger font binaries.
  let binary='';for(let i=0;i<bytes.length;i+=16384)
   binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+16384));
  return btoa(binary);
 }
 async function fonts(){
  if(fontsPromise)return fontsPromise;
  fontsPromise=Promise.all([FONT_NORMAL,FONT_BOLD].map(async file=>{
   const response=await fetch(file,{cache:'force-cache'});
   if(!response.ok)throw Error('ملف خط PDF مفقود: '+file);
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.length<10000||bytes[0]!==0||bytes[1]!==1||bytes[2]!==0||bytes[3]!==0)
    throw Error('ملف خط PDF غير صالح: '+file);
   return encodeBase64(bytes);
  })).then(([regular,bold])=>({
   'ratib-tajawal-regular.ttf':regular,
   'ratib-tajawal-bold.ttf':bold
  })).catch(error=>{fontsPromise=null;throw error;});
  return fontsPromise;
 }
 const plain=value=>String(value??'').replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,'').replace(/[٠-٩۰-۹]/g,ch=>String(ch.charCodeAt(0)-(ch<='٩'?0x660:0x6f0))).replace(/٬/g,',').replace(/٫/g,'.').replace(/\s+/g,' ').trim().replace(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}(?::\d{2})?)\b/g,text=>'‎'+text+'‎');
 function cellText(cell){
  const copy=cell.cloneNode(true),lines=[];
  copy.querySelectorAll('.ratib-vector-hijri,.ratib-vector-gregorian').forEach(child=>{
   lines.push(plain(child.textContent));child.remove();
  });
  const rest=plain(copy.textContent);
  if(rest)lines.push(rest);
  return lines.filter(Boolean).join('\n');
 }
 function tableDefinition(table){
  const head=[...table.querySelectorAll('thead tr th')].map(cellText).reverse();
  const body=[head];
  for(const tr of table.querySelectorAll('tbody tr')){
   const row=[],merged=[];
   for(const td of tr.querySelectorAll(':scope > td')){
    const span=Math.max(1,Number(td.getAttribute('colspan'))||1);
    const entry={text:cellText(td),bold:tr.classList.contains('ratib-vector-total'),
      fillColor:td.classList.contains('ratib-vector-matched')?'#DCFCE7':tr.classList.contains('ratib-vector-total')?'#E2E8F0':tr.classList.contains('ratib-vector-opening')?'#F8FAFC':undefined,
      alignment:'right'};
    row.push(entry);
    for(let i=1;i<span;i++)row.push({text:''});
    if(span>1)merged.push({start:row.length-span,span,entry});
   }
   if(row.length!==head.length)throw Error('اختلاف عدد أعمدة كشف الحساب: '+row.length+'/'+head.length);
   row.reverse();
   // pdfmake colSpan grows left-to-right. Place the merged label on the
   // leftmost cell of its area after reversing the Arabic table columns.
   for(const {start,span,entry} of merged){
    const left=head.length-(start+span);
    row[left]={...entry,colSpan:span};
    for(let j=left+1;j<left+span;j++)row[j]={text:''};
   }
   body.push(row);
  }
  // Widths are visual left-to-right: after reversing, the final (date) cell
  // is on the far right. The descriptive column has extra space.
  const widths=table.querySelectorAll('thead th').length===4
   ?['*','*','*','*']
   :head.map(h=>/البيان|الحساب المقابل/.test(h)?'*':/التاريخ/.test(h)?76:/المستند/.test(h)?59:65);
  return {
   table:{headerRows:1,widths,body,dontBreakRows:false,keepWithHeaderRows:1},
   margin:[0,8,0,9],
   layout:{
    hLineColor:()=> '#9DA9B7',vLineColor:()=> '#9DA9B7',
    hLineWidth:()=>.45,vLineWidth:()=>.45,
    paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>4,paddingBottom:()=>4,
    fillColor:(row)=>row===0?'#E2E8F0':null
   },
   fontSize:8
  };
 }
 function documentDefinition(html,orientation='portrait',logo=''){
  const host=document.createElement('div');
  host.innerHTML=html;
  const sheets=[...host.querySelectorAll('.ratib-vector-sheet')];
  if(!sheets.length)throw Error('كشف الحساب النصي فارغ');
  const content=[];
  sheets.forEach((sheet,index)=>{
   if(index)content.push({text:'',pageBreak:'before',margin:0});
   const org=sheet.querySelector('.ratib-vector-organization');
   if(org?.textContent.trim()||logo){
    const name=plain(org?.querySelector('strong')?.textContent);
    const details=plain(org?.querySelector('span')?.textContent);
    const header=[];
    if(name)header.push({text:name,fontSize:14,bold:true,alignment:'right',margin:[0,0,0,2]});
    if(details)header.push({text:details,fontSize:9,alignment:'right',margin:[0,0,0,4]});
    if(logo&&/^data:image\/(?:png|jpeg);base64,/.test(logo))
     content.push({columns:[{image:logo,width:48,fit:[48,48]},{stack:header,width:'*'}],columnGap:10,margin:[0,0,0,8]});
    else content.push({stack:header,margin:[0,0,0,8]});
    content.push({canvas:[{type:'line',x1:0,y1:0,x2:orientation==='landscape'?758:511,y2:0,lineColor:'#B8C3CE',lineWidth:.6}],margin:[0,0,0,8]});
   }
   const title=plain(sheet.querySelector('h2')?.textContent);
   content.push({text:title,fontSize:14,bold:true,alignment:'center',color:'#111827',
    margin:[0,4,0,8],fillColor:'#F1F5F9'});
   const info=sheet.querySelector('.ratib-vector-details');
   if(info){
    const fields=[...info.children].map(field=>{
     const copy=field.cloneNode(true);
     copy.querySelectorAll('.ratib-vector-hijri,.ratib-vector-gregorian').forEach(date=>date.append(' '));
     return plain(copy.textContent);
    });
    content.push({text:fields.length?fields.join(' | '):plain(info.textContent),fontSize:8,alignment:'right',margin:[0,0,0,5],color:'#374151'});
   }
   const table=sheet.querySelector('.ratib-vector-table');
   if(table)content.push(tableDefinition(table));
   const footer=sheet.querySelector('.ratib-vector-footer');
   if(footer){
    const words=plain(footer.querySelector('.ratib-vector-words')?.textContent);
    const note=plain(footer.querySelector('.ratib-vector-notice')?.textContent);
    if(words)content.push({text:words,fontSize:9.4,bold:true,alignment:'right',margin:[0,6,0,6]});
    if(note)content.push({text:note,fontSize:8.5,alignment:'right',margin:[0,0,0,4]});
   }
  });
  return {
   pageSize:'A4',pageOrientation:orientation,
   pageMargins:[42,32,42,42],
   defaultStyle:{font:'Tajawal',fontSize:9,color:'#101827',alignment:'right',lineHeight:1.16},
   styles:{},
   info:{title:'كشف حساب — راتب',subject:'كشف حساب محاسبي نصي',creator:'راتب – للتنظيم والتدبير المالي'},
   footer:(page,count)=>({text:'صفحة '+page+' من '+count,fontSize:8,alignment:'center',margin:[0,9,0,0],color:'#64748B'}),
   content
  };
 }
 async function make(html,orientation='portrait',logo=''){
  const pdf=await loadEngine(),vfs=await fonts();
  pdf.vfs={...(pdf.vfs||{}),...vfs};
  pdf.fonts={...(pdf.fonts||{}),Tajawal:{
   normal:'ratib-tajawal-regular.ttf',bold:'ratib-tajawal-bold.ttf',
   italics:'ratib-tajawal-regular.ttf',bolditalics:'ratib-tajawal-bold.ttf'
  }};
  const definition=documentDefinition(html,orientation,logo);
  const blob=await new Promise((resolve,reject)=>{
   try{pdf.createPdf(definition).getBlob(blob=>blob?.size?resolve(blob):reject(Error('لم يتم إنشاء ملف PDF')));}
   catch(e){reject(e);}
  });
  if(blob.type!=='application/pdf'&&blob.size<100)throw Error('نتيجة PDF غير صالحة');
  return blob;
 }
 window.RatibDirectVectorPdf={make,documentDefinition,tableDefinition,engine:loadEngine};
})();
