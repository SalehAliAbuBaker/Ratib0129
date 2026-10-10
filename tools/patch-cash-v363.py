from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.2"' in s and 'id="ratib-cash-v363"' not in s
css='''<style id="ratib-cash-v363">
/* Ratib 3.6.3: mirror simple-entry theme without moving voucher fields. */
@media screen {
#multiVoucherCard.spend-voucher{box-shadow:none!important;border:0!important;width:100%!important;max-width:100%!important;background:var(--card)!important;color:var(--text)!important}
#multiVoucherCard.spend-voucher :is(input,select,textarea),#multiVoucherCard.spend-voucher .searchable-select-wrap{background:var(--card)!important;color:var(--text)!important;border-color:var(--border)!important}
#multiVoucherCard.spend-voucher :is(input,select,textarea):focus-visible{outline:2px solid var(--accent)}
#multiVoucherCard.spend-voucher .multi-voucher-table-wrap,#multiVoucherCard.spend-voucher .multi-voucher-table tbody tr{border-color:var(--border)!important;box-shadow:none!important}
#multiVoucherCard.spend-voucher .multi-voucher-table th{background:var(--bg)!important;color:var(--text)!important}
#multiVoucherCard.spend-voucher :is(#ratibLockSource,#ratibLockCounter){display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 42px!important;width:42px!important;min-width:42px!important;max-width:42px!important;height:42px!important;position:static!important;align-self:center!important;margin:0!important;padding:0!important;border:2px solid var(--border)!important;border-radius:10px!important;background:var(--card)!important;color:var(--text)!important;font-size:1.2rem!important;box-shadow:none!important}
#multiVoucherCard.spend-voucher .multi-voucher-table tbody td:nth-child(2){display:flex!important;flex-flow:row nowrap!important;align-items:center!important;gap:8px!important;min-width:0!important}
#multiVoucherCard.spend-voucher .multi-voucher-table tbody td:nth-child(2)>.multi-line-account{flex:1 1 auto!important;width:auto!important;min-width:0!important}
#multiVoucherCard.spend-voucher .multi-voucher-source-row{display:flex!important;align-items:center!important;gap:8px!important}
#multiVoucherCard.spend-voucher .multi-voucher-source-row .searchable-select-wrap{flex:1 1 auto!important;min-width:0!important}
#multiVoucherCard.spend-voucher :is(.multi-line-amount,.spend-line-quote,#ratibHeaderAmount,#ratibHeaderRate){direction:ltr;text-align:right;font-variant-numeric:tabular-nums}
#multiVoucherCard.spend-voucher .multi-voucher-actions .btn-primary{background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important}
}
</style>'''
s=s.replace('</head>',css+'\n</head>',1)
s=s.replace('الإصدار 3.6.2','الإصدار 3.6.3').replace('class="ratib-about-version">الإصدار 3.6.0','class="ratib-about-version">الإصدار 3.6.3')
start=s.index('const RATIB_RELEASE=')
end=s.index(';',start)
s=s[:start]+'const RATIB_RELEASE={"version":"3.6.3","changes":["توحيد ثيم سند القبض والصرف مع القيد البسيط.","محاذاة قفلي الحسابات مع الحقول.","إزالة الظل الجانبي وتوسيع عرض السند.","الحفاظ على عمليات المبالغ والمصارفة والفواصل الألفية."]}'+s[end:]
assert '"version":"3.6.3"' in s
p.write_text(s,encoding="utf-8")

# Publication triggered by source update.
