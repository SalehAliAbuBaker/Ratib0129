// Ratib 3.1.9: cache identity is unique to this app's scope.
const CACHE_VERSION='v83-deleted-accounts-3.6.57';
const APP_RELEASE={"version":"3.6.57","changes":["تصحيح مصدر ظهور الحسابات المحذوفة في ميزان المراجعة: اعتماد الدليل الحالي واستبعاد المحذوف المصفّر دون أثر على الأعمدة أو التقييمات.","حماية الحركات التاريخية والتقييمات متعددة العملات وإظهار تنبيه مراجعة لأي حساب خارج الدليل له أثر محاسبي، دون تعديل السندات أو الأرصدة.","توحيد الإصدار 3.6.57 بين النسختين الرسمية والتجريبية، مع بقاء بيانات كل نسخة مستقلة.","إظهار أيقونة الطباعة بعد اكتمال تهيئة سندات القبض والصرف والقيد المركب، وإزالة أشرطة المشاركة المكررة.","إضافة المعاينة والطباعة وتنزيل PDF والمشاركة واتجاه A4 للقيد البسيط دون حفظه أو استهلاك رقمه.","ترتيب أدوات ميزان المراجعة في شريط متجاور يلتف على الشاشات الصغيرة، مع إبقاء تصدير Excel واضحاً دون فراغات كبيرة.","إصلاح طبقة التعتيم التي كانت تمنع النقر على أدوات كشف الحساب، ومطابقة مقاسات الخط والأيقونات للقائمة الأساسية.","فصل المعاينة والطباعة وتنزيل PDF والمشاركة في كشف الحساب والميزانية وميزان المراجعة والسندات.","توحيد اتجاه A4 وحفظ فلاتر التقارير والعملات، والإبقاء على قالب الطباعة حتى انتهاء أمر الطباعة.","مطابقة أزرار التقارير الأربعة لتنسيق الرئيسية، مع الأيقونة أعلى النص وكلاهما في الوسط.","تعبئة زر الرجوع بالأخضر الغامق والنص والأيقونة بالأبيض في الواجهات والنماذج.","توسيع المفضلة بوظائف مباشرة مصنفة وقابلة للبحث وإضافة الوظيفة المفتوحة وإزالة الاختصارات وترتيبها.","تحميل ملفات الواجهة الجديدة بأسماء مستقلة لتجنب إعادة استخدام ملفات الواجهة القديمة من التخزين المؤقت.","ترتيب خيارات التقارير الأربعة في شبكة ٢×٢ وتوسيط نصوص الأزرار مع محاذاة العناوين يمينًا.","توحيد واجهتي الحسابات وكشف الحساب بالثيم الأخضر، مع أيقونات رجوع زرقاء دون تغيير قوالب الطباعة.","تخصيص المفضلة باختصارات مباشرة للوظائف والسندات والتقارير وأقسام الإعدادات بدل القوائم العامة.","توحيد الواجهات والنماذج باللون الأخضر مع تفاصيل ذهبية وتحذيرات حمراء، وخط Tajawal وأيقونات خطية متناسقة.","تحسين اتساق الحقول والأزرار والوضع الليلي والعرض المدمج للجوال، مع إبقاء منطق الأوامر وقوالب الطباعة.","عرض حالة تفعيل الجهاز في نافذة إدخال الكود، مع مدة الترخيص أو تاريخ انتهائه، وتاريخ التفعيل إن كان محفوظًا، وآخر تحقق ومعرّف الجهاز، وإخفاء معظم كود التفعيل.","توحيد بحث قائمة الحسابات الرئيسية مع حقول اختيار الحساب: اقتراحات بالاسم والرقم، وإكمال تلقائي للنتيجة الوحيدة مع تحديد الجزء المُكمل، دون اختيار حساب ملتبس.","إضافة خيار «إدخال كود التفعيل» في القائمة الجانبية لفتح نافذة الترخيص مبكرًا دون انتظار استنفاد العمليات المجانية.","استخدام نافذة التفعيل الحالية وآلية التحقق نفسها مع توضيح مختلف عند الفتح الاختياري، دون تغيير شروط الترخيص أو الرصيد المجاني.","وضع كشف الحساب في القائمة الجانبية قبل شجرة الحسابات، وإظهار شجرة الحسابات تحته مباشرة.","إلغاء أي إشعار مستقل عن مطابقة الرصيد في الشاشة والطباعة وPDF، والاكتفاء بعلامة ✓ وتظليل خانة الرصيد المطابق.","إصلاح عرض حسابات غير تابعة للسند أثناء تعديله باستعادة الحسابات من حركات السند المحفوظة، وعدم استبدال الاسم تلقائيًا بسبب رقم حساب قديم أو متعارض.","اختصار إثبات المطابقة أسفل كشف الحساب في الشاشة والطباعة وPDF إلى «✓ مطابق» فقط، دون شرح إضافي عند صحة المطابقة.","استعادة الحسابات المحفوظة بمعرّفاتها الأصلية في تعديل سندات القبض والصرف والقيود البسيطة والمركبة؛ اعتماد الاسم فقط عند التطابق الفريد ومنع اختيار حساب ملتبس.","تحسين ترتيب التقارير بوضع الإغلاق السنوي في الأسفل وترتيب إجراءات كشف الحساب 2×2.","إظهار زر رجوع في سجل العمليات وتوضيح اتجاه A4 العمودي والأفقي للكشف والطباعة وPDF.","عرض إثبات مطابقة الرصيد تحت جدول العمليات دون إطار أو خلفية ملونة، مع إبقاء ✓ مطابق داخل الرصيد.","فصل مشاركة PDF عن تنزيله لكشوف الحساب وميزان المراجعة والميزانية والسندات، مع تنبيه واضح عند عدم دعم المشاركة.","تحسين فحص التذكيرات أثناء فتح الويب وعند العودة إليه، مع توضيح حدود إشعارات الخلفية.","توحيد النسخة الرسمية والتجريبية في الإصدار 3.6.44.","الإغلاق السنوي وأرشيف السنوات وترحيل الأرصدة وإعادة فتح السنوات للتصحيح بسجل مراجعة.","تضمين حركات السنة المالية السابقة في كشف الحساب عند الطلب.","علامة ✓ مطابق وتظليل الرصيد في كشف الحساب والطباعة والاستعراض وPDF.","الرصيد الحالي حسب العملة أسفل الحساب المختار.","تفقيط المبالغ في سند القيد البسيط والمركب.","زر العودة بجانب قبض وصرف.","حفظ تاريخ مطابقة الحساب وإظهار العلامة في الكشف.","عرض تقرير شامل للحسابات المستوردة القابلة للاستعادة والمتعارضة دون توقف عند أول تعارض.","إدارة حسابات وأرصدة دفعات الاستيراد السابقة انتقائيًا.","إخفاء الحساب المستورد من الشجرة دون حذف قيوده.","استعادة حسابات مستوردة محذوفة إلى مساراتها المحفوظة مع كشف تعارض الأرقام.","منع حذف الأرصدة المستوردة إن كان الحذف يخل بتوازن القيد الافتتاحي.","نسخة احتياطية ومعاينة قبل أي حذف أو تعديل."]};
const CACHE_PREFIX=`ratib:${self.registration.scope}:`;
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const APP_SHELL=[
  "./",
  "./index.html",
  "./manifest.json",
  "./Icons/icon-192.png",
  "./Icons/icon-512.png",
  "./Icons/icon-192-maskable.png",
  "./Icons/icon-512-maskable.png",
  "./Icons/apple-touch-icon.png",
  "./vendor/tajawal.css",
  "./ratib-theme.css",
  "./ratib-navigation-v3.css",
  "./ratib-theme.js",
  "./ratib-navigation-v3.js",
  "./ratib-license-draft.js",
  "./ratib-ui-v3.6.37.js",
  "./ratib-annual-close.js",
  "./ratib-fiscal-ledger.js",
  "./ratib-statement-prior-year.js",
  "./ratib-reconciliation-print.js",
  "./ratib-favorites-v3.js",
  "./ratib-import-manager.js",
  "./ratib-unified-output.js",
  "./vendor/chart.umd.min.js",
  "./vendor/chartjs-plugin-datalabels.min.js",
  "./vendor/xlsx.full.min.js",
  "./assets/ratib-accounts-template.xlsx",
  "./vendor/tajawal-1.woff2",
  "./vendor/tajawal-10.woff2",
  "./vendor/tajawal-2.woff2",
  "./vendor/tajawal-3.woff2",
  "./vendor/tajawal-4.woff2",
  "./vendor/tajawal-5.woff2",
  "./vendor/tajawal-6.woff2",
  "./vendor/tajawal-7.woff2",
  "./vendor/tajawal-8.woff2",
  "./vendor/tajawal-9.woff2"
];
const SHELL_URLS=new Set(APP_SHELL.map(path=>new URL(path,self.registration.scope).href));

self.addEventListener('install',event=>{
  // All essential resources must be available before this version can replace the previous worker.
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
});
self.addEventListener('message',event=>{
  if(event.data?.type==='GET_UPDATE_DETAILS')event.source?.postMessage({type:'UPDATE_DETAILS',release:APP_RELEASE});
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME),ready=(await Promise.all([...SHELL_URLS].map(url=>cache.match(url)))).every(Boolean);event.source?.postMessage({type:ready?'OFFLINE_READY':'OFFLINE_UNAVAILABLE',version:CACHE_VERSION,release:APP_RELEASE});})());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    // Old releases shared an unscoped cache. Remove only this app's own URLs from it.
    for(const name of names.filter(name=>name.startsWith('ratib-cache-'))){
      const cache=await caches.open(name),requests=await cache.keys();
      await Promise.all(requests.filter(req=>req.url.startsWith(self.registration.scope)).map(req=>cache.delete(req)));
    }
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)if(client.url.startsWith(self.registration.scope))client.postMessage({type:'OFFLINE_READY',version:CACHE_VERSION,release:APP_RELEASE});
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!req.url.startsWith(self.registration.scope))return;
  const navigation=req.mode==='navigate';
  // Versioned scripts can reuse precached unversioned assets when offline.
  const shellBase=url.origin+url.pathname;
  if(!navigation&&!SHELL_URLS.has(req.url)&&!SHELL_URLS.has(shellBase))return;
  const cachePromise=caches.open(CACHE_NAME);
  const network=(async()=>{
    try{
      const response=await fetch(req);
      if(response.status===200&&(response.type==='basic'||response.type==='default')){
        try{const cache=await cachePromise;await cache.put(req,response.clone());}catch(_){/* A full cache must not discard a successful online response. */}
      }
      return response;
    }catch(_){return null;}
  })();
  event.waitUntil(network.then(()=>{}));
  event.respondWith((async()=>{
    const cache=await cachePromise;
    // Navigation must prefer the published HTML. This prevents an old index.html
    // from running with newer external UI scripts on desktop browsers.
    if(navigation||url.searchParams.has('v')){
      const response=await network;
      if(response?.ok)return response;
      if(navigation){const cached=await cache.match(req)||await cache.match(new URL('./index.html',self.registration.scope).href);if(cached)return cached;}
    }
    const cached=await cache.match(req)||await cache.match(shellBase);
    if(cached)return cached;
    const response=await network;
    if(response?.ok)return response;
    if(navigation){
      const shell=await cache.match(new URL('./index.html',self.registration.scope).href);
      if(shell)return shell;
      return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>راتب</title><p>لم يكتمل تجهيز التطبيق للعمل دون الإنترنت. افتحه مرة مع اتصال بالإنترنت ثم أعد المحاولة.</p></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
    return response||new Response('',{status:503,statusText:'Offline resource unavailable'});
  })());
});

