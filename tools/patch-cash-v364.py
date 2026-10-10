from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.3"' in s and 'id="ratib-cash-v364"' not in s, "Unexpected Ratib version"
old="""  const n=getCleanNumber(source);
  if(!Number.isFinite(n))return source;
  const raw=source.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٫/g,'.').replace(/٬/g,',').replace(/,/g,'');
  const parts=raw.split('.');
  const integer=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return parts.length>1?integer+'.'+parts[1]:integer;"""
new="""  // 3.6.4 FIX: strip old grouping commas BEFORE checking/reformatting.
  // This converts 1,20000 into 120,000 and preserves incomplete decimals.
  const raw=source.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٫/g,'.').replace(/٬/g,',').replace(/,/g,'');
  if(!/^[+-]?(?:\d+)?(?:\.\d*)?$/.test(raw))return source;
  const parts=raw.split('.');
  const integer=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return parts.length>1?integer+'.'+parts[1]:integer;"""
assert s.count(old)==1
s=s.replace(old,new)
css="""<style id="ratib-cash-v364">
/* 3.6.4: tafqit as unobtrusive text above voucher save/print/share actions. */
@media screen {
#multiVoucherCard.spend-voucher #spendTafqit {
 display:block!important;position:static!important;box-sizing:border-box;
 width:100%!important;max-width:100%!important;margin:10px 0 8px!important;
 padding:0 4px!important;border:0!important;box-shadow:none!important;
 border-radius:0!important;background:transparent!important;color:var(--muted)!important;
 text-align:center!important;font-size:12px!important;font-weight:500!important;line-height:1.6!important;
}
#multiVoucherCard.spend-voucher #spendTafqit:empty{display:none!important}
}
</style>"""
s=s.replace("</head>",css+"\n</head>",1)
# Move existing tafqit element above action buttons at setup time; keep same element and calculation.
needle="const actions=card.querySelector('.multi-voucher-actions');const convert=document.createElement('button');"
assert s.count(needle)==1
s=s.replace(needle,"const actions=card.querySelector('.multi-voucher-actions');actions.before(tafqit);const convert=document.createElement('button');",1)
# Remove old important display:none rule for tafqit only (preserve other visibility rules).
s=s.replace("#multiVoucherCard.spend-voucher #multiVoucherSummary,#multiVoucherCard.spend-voucher #spendTafqit,#multiVoucherCard.spend-voucher #spendFxButton{display:none!important}","#multiVoucherCard.spend-voucher #multiVoucherSummary,#multiVoucherCard.spend-voucher #spendFxButton{display:none!important}")
s=s.replace("الإصدار 3.6.3","الإصدار 3.6.4")
start=s.index('const RATIB_RELEASE=')
end=s.index(';',start)
s=s[:start]+'const RATIB_RELEASE={"version":"3.6.4","changes":["تصحيح فواصل الآلاف أثناء الكتابة؛ 120000 تظهر 120,000.","عرض التفقيط كنص بسيط فوق أزرار الحفظ والطباعة والمشاركة.","إزالة مربع التفقيط دون التأثير في الاتزان أو حفظ البيانات."]}'+s[end:]
assert s.count('id="ratib-cash-v364"')==1 and '"version":"3.6.4"' in s
p.write_text(s,encoding="utf-8")
