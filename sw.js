// ===== Service Worker لتطبيق "راتب" =====
// الاستراتيجية: Stale-While-Revalidate لكل الموارد (القشرة + الخطوط + مكتبات CDN).
// يعني: يُعرض فوراً ما هو مخزّن في الكاش (سرعة فورية + يعمل بلا إنترنت بعد أول زيارة)،
// وبالتوازي يُطلب من الشبكة نسخة أحدث لتحديث الكاش تلقائياً للمرة القادمة — دون انتظار
// المستخدم لأي تحميل. هذا هو التوازن الأمثل بين "Offline First" وبين وصول التحديثات.
//
// ⚠️ مهم عند كل تعديل تنشره على index.html: غيّر رقم CACHE_VERSION أدناه (مثلاً من
// 'v1' إلى 'v2'). هذا يُنشئ كاشاً جديداً بالكامل ويحذف القديم تلقائياً، فيضمن أن
// المستخدمين يحصلون على التحديث عوضاً عن البقاء عالقين على نسخة قديمة مخزّنة إلى الأبد.
const CACHE_VERSION = 'v5-ratib-features'
const CACHE_NAME = `ratib-cache-${CACHE_VERSION}`;

// قائمة "القشرة" الأساسية التي تُخزَّن فور أول تثبيت، لضمان عمل التطبيق بالكامل دون
// إنترنت من أول لحظة (بدل انتظار زيارة كل صفحة/مورد على حدة قبل تخزينه).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './Icons/icon-192.png',
  './Icons/icon-512.png',
  './Icons/icon-192-maskable.png',
  './Icons/icon-512-maskable.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', (event) => {
  // يُفعّل نسخة الـ Service Worker الجديدة فوراً بدل انتظار إغلاق كل تبويبات التطبيق
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll تفشل كاملة لو تعذّر مورد واحد فقط؛ نستخدم محاولات فردية بدلها حتى لو
      // فشل تخزين مورد واحد (مثلاً بسبب انقطاع مؤقت) يستمر تخزين البقية بنجاح
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // لا نتدخل إلا في طلبات GET (طلبات الحفظ ونحوها ليست جزءاً من الكاش)
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cachedResponse) => {
        const networkFetch = fetch(req)
          .then((networkResponse) => {
            // نخزّن فقط الاستجابات الناجحة الحقيقية (200) أو الموارد المتاحة عبر CDN
            // بإعدادات CORS تسمح بالقراءة (type 'cors' أو 'basic')
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => undefined); // لا إنترنت الآن — لا بأس، سنعتمد على النسخة المخزّنة

        // الأهم: نرجّع النسخة المخزّنة فوراً إن وُجدت (لا ننتظر الشبكة إطلاقاً)،
        // وإلا ننتظر نتيجة الشبكة (أول زيارة فعلية لمورد لم يُخزَّن بعد)
        return cachedResponse || networkFetch;
      })
    )
  );
});
