/* Ratib 3.6.158: native, text/vector statement print route.
   Existing JPEG/PDF download and accounting calculations remain unchanged.
   In Chromium, selecting "Save as PDF" produces real text/table rules,
   not a page-sized JPEG. Native-print support is device/browser dependent. */
(function(){
 'use strict';
 const escapeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const money=value=>Number(value||0).toLocaleString();
 const signed=value=>money(Math.abs(value))+' '+(value===0?'صفر':value>0?'دائن':'مدين');
 const dateHtml=value=>{
  try{
   const p=ratibCanvasDateParts(String(value||''));
   return '<span class="ratib-vector-hijri">'+escapeText(p.primary||'—')+'</span>'+(p.secondary?'<small class="ratib-vector-gregorian">'+escapeText(p.secondary)+'</small>':'');
  }catch(_){return escapeText(value||'—');}
 };
 const td=(value,kind='')=>'<td'+(kind?' class="'+kind+'"':'')+'>'+escapeText(value??'')+'</td>';
 function sheet(data){
  const opts=ratibStatementSettings(),scope=accountOpsState.scopeNames,
    code=data.currency,cols=5+Number(opts.document)+Number(opts.counterpart),
    started=window.ratibStatementEffectiveFrom?.(accountOpsState.from||'')??(accountOpsState.from||''),
    numberCols=opts.document?1:0,counterCols=opts.counterpart?1:0;
  const balanceMap=getAccountRunningBalances(data.rows,scope,data.opening);
  const totals=ratibStatementInclusiveTotals(data);
  const cfg=getHeaderConfig(),logo=document.querySelector('#printStatementContainer .ps-header .ratib-user-print-logo');
  const logoSrc=logo?.getAttribute('src')||'';
  const logoHtml=logoSrc?'<img class="ratib-vector-logo" src="'+escapeText(logoSrc)+'" alt="شعار جهة الإصدار">':'';
  const labels=['التاريخ',...(opts.document?['المستند']:[]),'البيان',...(opts.counterpart?['الحساب المقابل']:[]),'مدين (عليكم)','دائن (لكم)','الرصيد'];
  const headers=labels.map(v=>'<th scope="col">'+escapeText(v)+'</th>').join('');
  const opening=started&&data.opening!==0
   ?'<tr class="ratib-vector-opening"><td>'+dateHtml(started)+'</td>'+(opts.document?td('—'):'')+
      td('الرصيد السابق قبل بداية الفترة')+(opts.counterpart?td(''):'')+
      td(data.opening<0?money(-data.opening):'','ratib-vector-number')+
      td(data.opening>0?money(data.opening):'','ratib-vector-number')+
      td(signed(data.opening),'ratib-vector-number')+'</tr>':'';
  let lastMatched=-1;
  const proof=!accountOpsState.aggregate?window.ratibReconciliationEvidence?.(accountOpsState.accountName,code,started,accountOpsState.to||''):null;
  if(proof?.stable&&proof.inPeriod&&!proof.dateAfterPeriod&&opts.reconciliation!==false)
   data.rows.forEach((t,i)=>{if(getAccountOpsDate(t)<=proof.date)lastMatched=i;});
  const rows=data.rows.map((tx,i)=>{
   const entry=getAccountEntry(tx,scope),amount=getAccountDisplayAmount(entry),
     debit=entry.side==='debit',credit=entry.side==='credit'||entry.bothSides,
     balance=balanceMap.get(tx),note=ratibStatementText(
       [ratibAggregateOwner(tx),entry.line?.note||tx.execution?.[Object.keys(tx.execution||{})[0]]?.note||'بدون بيان'].filter(Boolean).join(' — '),'بدون بيان'),
     doc=ratibStatementDocumentLabel(tx);
   const matched=i===lastMatched?' (مطابق)':'';
   return '<tr><td>'+dateHtml(getAccountOpsDate(tx))+'</td>'+
      (opts.document?td(doc):'')+td(note)+(opts.counterpart?td(ratibResolveCounterpart(tx,scope)):'')+
      td(debit?money(amount):'','ratib-vector-number')+
      td(credit?money(amount):'','ratib-vector-number')+
      td(signed(balance)+matched,'ratib-vector-number'+(i===lastMatched?' ratib-vector-matched':''))+'</tr>';
  }).join('');
  const total='<tr class="ratib-vector-total"><td colspan="'+(cols-3)+'">'+escapeText(ratibStatementTotalsTitle(started,accountOpsState.to,data.opening!==0))+'</td>'+
   td(money(totals.debit),'ratib-vector-number')+td(money(totals.credit),'ratib-vector-number')+td(signed(data.closing),'ratib-vector-number')+'</tr>';
  const notice=ratibStatementNoticeText();
  return '<section class="ratib-vector-sheet" dir="rtl" data-currency="'+escapeText(code)+'">'+
   '<div class="ratib-vector-letterhead">'+logoHtml+
   '<div class="ratib-vector-organization">'+(cfg.show?'<strong>'+escapeText(cfg.name||'')+'</strong><span>'+escapeText(cfg.details||'')+'</span>':'')+'</div></div>'+
   '<h2>كشف حساب: '+escapeText(ratibStatementText(accountOpsState.accountName,'حساب غير محدد'))+' — '+escapeText(accountCurrencyLabel(code))+'</h2>'+
   '<div class="ratib-vector-details"><span>'+escapeText(ratibCanvasPeriodText(accountPeriodTitle()))+'</span>'+
   '<span>عدد الحركات: '+data.rows.length+'</span>'+
   '<span>تاريخ الإصدار: '+dateHtml(getLocalTodayISO())+'</span></div>'+
   '<table class="ratib-vector-table"><thead><tr>'+headers+'</tr></thead><tbody>'+opening+rows+total+'</tbody></table>'+
   '<div class="ratib-vector-footer"><p class="ratib-vector-words">'+escapeText(ratibStatementClosingText(data.closing,code))+'</p>'+
   (notice?'<p class="ratib-vector-notice">'+escapeText(notice)+'</p>':'')+'</div></section>';
 }
 function summary(datas){
  if(datas.length<=1)return '';
  const cfg=getHeaderConfig();
  const tr=datas.map(d=>{
    const total=ratibStatementInclusiveTotals(d);
    return '<tr>'+td(accountCurrencyLabel(d.currency))+td(money(total.credit),'ratib-vector-number')+
      td(money(total.debit),'ratib-vector-number')+td(signed(d.closing),'ratib-vector-number')+'</tr>';
  }).join('');
  return '<section class="ratib-vector-sheet ratib-vector-summary" dir="rtl">'+
    '<div class="ratib-vector-letterhead"><div class="ratib-vector-organization">'+
    (cfg.show?'<strong>'+escapeText(cfg.name||'')+'</strong><span>'+escapeText(cfg.details||'')+'</span>':'')+
    '</div></div><h2>خلاصة كشف الحساب متعدد العملات — '+escapeText(accountOpsState.accountName)+'</h2>'+
    '<div class="ratib-vector-details">'+escapeText(ratibCanvasPeriodText(accountPeriodTitle()))+'</div>'+
    '<table class="ratib-vector-table"><thead><tr><th>العملة</th><th>دائن (لكم)</th><th>مدين (عليكم)</th><th>الرصيد</th></tr></thead><tbody>'+tr+'</tbody></table></section>';
 }
 function markup(datas){return datas.map(sheet).join('')+summary(datas);}
 function printStatement(choice,currencies){
  try{
   if(!accountOpsState?.accountName){showToast('اختر حسابًا محددًا','warn');return false;}
   const selected=choice==='ALL'?(currencies||printableAccountCurrencies()):[choice];
   if(!selected.length)throw Error('لم يتم تحديد العملة');
   window.RatibPrintLogo?.syncPrint();
   const host=document.getElementById('ratibVectorStatementHost')||document.createElement('div');
   host.id='ratibVectorStatementHost';
   host.setAttribute('aria-hidden','true');
   host.innerHTML=markup(selected.map(getAccountCurrencyReportData));
   if(!host.isConnected)document.body.append(host);
   if(document.fonts?.ready)document.fonts.ready.catch(()=>{});
   // Browser PDF print preserves glyph vectors; image-based download remains
   // available separately for devices with no native printing.
   const done=printRatibDocument('printing-vector-statement');
   if(done)showToast('لحفظ كشف حساب نصي واضح: اختر «حفظ بتنسيق PDF» من نافذة الطباعة.','info',8000);
   return done;
  }catch(error){showToast('تعذر تجهيز كشف الحساب النصي: '+(error?.message||'خطأ غير معروف'),'error',6500);return false;}
 }
 window.RatibStatementVector={sheet,summary,markup,printStatement};
 window.ratibVectorStatementPrint=printStatement;
})();
