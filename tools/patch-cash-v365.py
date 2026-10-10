from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.4"' in s and 'id="ratib-cash-v365"' not in s
# Keep thousand separators unchanged.
# Update pin appearance to one accent color; distinguish on/off by inner icon only.
old="b.textContent=locked?'🔒':'🔓';"
new="b.innerHTML=locked?'<span aria-hidden=\"true\">&#128274;</span>':'<span aria-hidden=\"true\">&#128275;</span>';"
assert s.count(old)==1
s=s.replace(old,new,1)
# Show tafqit from the entry in the top amount field, not a calculated line total.
old="document.getElementById('spendTafqit').textContent=total>0&&!invalid?tafqitAccountCurrency(total,base):'';"
new="const typedTopAmount=getCleanNumber(document.getElementById('ratibHeaderAmount')?.value);document.getElementById('spendTafqit').textContent=Number.isFinite(typedTopAmount)&&typedTopAmount>0?tafqitAccountCurrency(typedTopAmount,base):'';"
assert s.count(old)==1
s=s.replace(old,new,1)
# Move after the header money row. Preserve the same DOM node and calculation.
old="const actions=card.querySelector('.multi-voucher-actions');actions.before(tafqit);"
new="const actions=card.querySelector('.multi-voucher-actions');document.getElementById('ratibHeaderMoney').append(tafqit);"
assert s.count(old)==1
s=s.replace(old,new,1)
style="""<style id="ratib-cash-v365">
/* Ratib 3.6.5: unify icon button colors without replacing their symbols. */
@media screen {
#multiVoucherCard.spend-voucher .ratib-icon-tools button,
#multiVoucherCard.spend-voucher .ratib-icon-tools button:nth-child(n),
#multiVoucherCard.spend-voucher :is(#ratibLockSource,#ratibLockCounter) {
 background:var(--accent)!important;color:#fff!important;
 border:1px solid var(--accent)!important;box-shadow:none!important;
}
#multiVoucherCard.spend-voucher :is(#ratibLockSource,#ratibLockCounter) {
 font-family:system-ui,sans-serif!important;font-size:20px!important;
 opacity:1!important;filter:none!important;
}
#multiVoucherCard.spend-voucher :is(#ratibLockSource,#ratibLockCounter)[aria-pressed="true"] {
 outline:2px solid var(--accent)!important;outline-offset:2px!important;
}
#multiVoucherCard.spend-voucher #ratibHeaderMoney #spendTafqit {
 display:block!important;position:static!important;width:100%!important;
 margin:4px 0 0!important;padding:0 3px!important;
 background:transparent!important;border:0!important;box-shadow:none!important;
 color:var(--muted)!important;font-size:12px!important;font-weight:500!important;
 text-align:right!important;line-height:1.5!important;
}
#multiVoucherCard.spend-voucher #ratibHeaderMoney #spendTafqit:empty{display:none!important}
}
</style>"""
s=s.replace("</head>",style+"\n</head>",1)
s=s.replace("الإصدار 3.6.4","الإصدار 3.6.5")
a=s.index("const RATIB_RELEASE=");b=s.index(";",a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.5","changes":["توحيد لون خلفيات أيقونات سند القبض والصرف مع إبقاء الرموز المختلفة.","توضيح مفاتيح تثبيت الحسابات بلون موحد وحالة تثبيت ظاهرة.","عرض التفقيط كنص صغير تحت مبلغ الحساب العلوي مباشرة.","الحفاظ على إصلاح الفواصل الألفية وجميع معادلات السند."]}'+s[b:]
assert '"version":"3.6.5"' in s
p.write_text(s,encoding="utf-8")
