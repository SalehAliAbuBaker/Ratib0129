/* Ratib 3.6.108.01: favorites catalog, retained settings and release coherence. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),fav=fs.readFileSync('ratib-favorites-v3.js','utf8'),sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.108.01');
assert(html.includes('const RATIB_RELEASE={"version":"'+pkg.version+'"'));
assert(sw.includes('const APP_RELEASE={"version":"'+pkg.version+'"'));
assert(sw.includes("v211-trial-favorites-"+pkg.version));
assert(html.includes('ratib-favorites-v3.js?v='+pkg.version));
assert(html.includes('الإصدار '+pkg.version));
for(const [label,fragment] of [
 ['المركز المالي',"'position-report'"],['حركة الحسابات',"'movement-report'"],
 ['الأمان',"'security'"],['التخزين',"'backupsettings'"],
 ['المستندات',"'مستند جديد — الوارد'"],['المبيعات',"'مستند جديد — الصادر'"],
 ['الاختصارات القديمة',"'اختصار قديم لم يعد متاحًا'"],
 ['الاكتشاف الديناميكي',"function discoverSettings()"],
 ['التقارير الديناميكية',"function discoverReports()"],
 ['واجهة التسجيل',"register:registerFavorite"]
])assert(fav.includes(fragment),label+' must remain in favorites catalog');
assert(fav.includes("window.RatibSettingsOpen('favorites')"));
assert(fav.includes("localStorage.getItem(KEY)"));
assert(!fav.includes("filter(id=>byId[id])];}catch(_){}"),'must preserve custom saved favorites until validated');
new vm.Script(fav);new vm.Script(sw);
console.log('PASS trial '+pkg.version+': favorites coverage, saved choices, settings routes, report discovery, release and script syntax');
