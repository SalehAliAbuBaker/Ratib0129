from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.5"' in s and 'ratib-cash-v366' not in s
old="document.getElementById('ratibHeaderMoney').append(tafqit);"
new="""// 3.6.6: the top amount control is created by a later setup wrapper.
  // Defer placement until ALL setup wrappers have completed.
  queueMicrotask(()=>{const money=document.getElementById('ratibHeaderMoney');if(money)money.append(tafqit);});"""
assert s.count(old)==1
s=s.replace(old,new,1)
s=s.replace("الإصدار 3.6.5","الإصدار 3.6.6")
a=s.index("const RATIB_RELEASE=");b=s.index(";",a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.6","changes":["إصلاح خطأ بدء التشغيل الناتج عن نقل التفقيط قبل إنشاء مبلغ الحساب العلوي.","إظهار التفقيط أسفل مبلغ الحساب العلوي بعد تهيئة الحقول.","الحفاظ على الأيقونات وفواصل الآلاف وعمليات الحفظ."]}'+s[b:]
s=s.replace("</head>",'<meta name="ratib-cash-v366" content="setup-order-hotfix">\n</head>',1)
assert '"version":"3.6.6"' in s
p.write_text(s,encoding="utf-8")
