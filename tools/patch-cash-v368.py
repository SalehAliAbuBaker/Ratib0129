from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.7"' in s and 'ratib-menu-hotfix-368' not in s
start=s.index('/* Ratib 3.6.7: concise side indicators')
end=s.index('})();',start)+len('})();')
# The injected IIFE contains no '})();' before its true end? detect via closing anchor
anchor=' document.body.append(panel);\n abbreviateSides();\n})();'
end=s.index(anchor,start)+len(anchor)
block=s[start:end]
# Remove from Excel export literal, restoring the original closing script text.
s=s[:start]+s[end:]
# Restore the Excel HTML string exactly: remove injected script wrapper too.
bad='<script>\n\n</script>\n</body></html>'
if bad in s:
 s=s.replace(bad,'</body></html>',1)
else:
 s=s.replace('<script>\n\n</script>\n</body></html>','</body></html>',1)
needle='\n</script>\n</body>'
assert s.count(needle)==1, 'expected final script close'
s=s.replace(needle,'\n/* ratib-menu-hotfix-368: narration script moved outside Excel export template */\n'+block+needle,1)
s=s.replace('الإصدار 3.6.7','الإصدار 3.6.8')
a=s.index('const RATIB_RELEASE=');b=s.index(';',a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.8","changes":["إصلاح عدم فتح القوائم بعد تحديث 3.6.7.","تصحيح موقع كود الاقتراحات خارج قالب تصدير Excel.","الإبقاء على بقية تحسينات السند دون تغيير البيانات."]}'+s[b:]
assert '"version":"3.6.8"' in s
p.write_text(s,encoding="utf-8")
