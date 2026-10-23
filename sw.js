// Ratib 3.1.9: cache identity is unique to this app's scope.
const CACHE_VERSION='v191-official-promoted-p10509-3.6.105';
const APP_RELEASE={"version":"3.6.105","highlights":["شجرة حسابات مبسطة بأربع مجموعات، وتحسين الإدراج الذكي في الفواتير."],"changes":["تصحيح الأخطاء في بعض الأجهزة"]};
const CACHE_PREFIX=`ratib:${self.registration.scope}:`;
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const APP_SHELL=[
"./ratib-country-currency-3.6.151.js",
"./ratib-country-currency-3.6.151.css",
"./ratib-global-button-size-3.6.146.js",
"./ratib-interface-font-3.6.148.css",
"./ratib-document-signatures-3.6.148.js",
"./ratib-feedback-3.6.149.js",
"./ratib-feedback-3.6.149.css",
"./ratib-global-button-size-3.6.146.css",
  "./ratib-dashboard-finance-3.6.144.css",
  "./ratib-dashboard-finance-3.6.144.js",
  "./ratib-trial-ui-3.6.143.css",
  "./ratib-trial-ui-3.6.143.js",
  "./",
  "./index.html",
  "./ratib-trial-home-sidebar-3.6.143.js",
  "./ratib-trial-home-sidebar-3.6.143.css",
  "./ratib-sidebar-3.6.124.js",
  "./ratib-commerce-3.6.131.js",
  "./ratib-interactive-tree-3.6.105.05.js",
  "./ratib-interactive-tree-3.6.105.05.css",
  "./ratib-commerce-3.6.131.css",
  "./ratib-login-3.6.124.js",
  "./ratib-login-3.6.124.css",
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
  "./ratib-navigation-v3.6.149.js",
  "./ratib-accounting-3.6.59.js",
  "./ratib-special-reports-3.6.102.js",
  "./ratib-fx-autofill-3.6.105.js",
  "./ratib-report-buttons-3.6.106.js",
  "./ratib-report-buttons-3.6.106.css",
  "./ratib-print-logo-3.6.108.js",
  "./ratib-print-logo-3.6.108.css",
  "./ratib-special-reports-3.6.102.css",
  "./ratib-doc-actions-3.6.100.css",
  "./ratib-license-draft.js",
  "./ratib-ui-v3.6.37.js",
  "./ratib-cash-layout-3.6.83.css",
  "./ratib-cash-layout-3.6.84.css",
  "./ratib-cash-layout-3.6.85.css",
  "./ratib-quick-account-3.6.87.js",
  "./ratib-quick-account-3.6.87.css",
  "./ratib-journal-layout-3.6.90.css",
  "./ratib-journal-layout-3.6.90.js",
  "./ratib-amount-edit-3.6.97.js",
  "./ratib-cash-layout-3.6.83.js",
  "./ratib-annual-close.js",
  "./ratib-fiscal-ledger.js",
  "./ratib-statement-prior-year.js",
  "./ratib-reconciliation-print.js",
  "./ratib-favorites-v3.js",
  "./ratib-voice-dictation-3.6.117.js",
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
// Serve the installed, versioned app shell locally first. The browser independently
// checks sw.js for updates, and each new worker installs a complete fresh cache.
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const scope = self.registration.scope;
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(scope)) return;
  const navigation = req.mode === 'navigate';
  const shellBase = url.origin + url.pathname;
  if (!navigation && !SHELL_URLS.has(req.url) && !SHELL_URLS.has(shellBase)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Query parameters are used for cache busting by the HTML. In each release
    // the shell and HTML are installed atomically, so ignoring the query is safe.
    const cached = await cache.match(req, {ignoreSearch:true})
      || await cache.match(shellBase)
      || (navigation ? await cache.match(new URL('./index.html',scope).href) : null);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response.ok && (response.type === 'basic' || response.type === 'default')) {
        try { await cache.put(req,response.clone()); } catch (_) {}
      }
      return response;
    } catch (_) {
      if (navigation) return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>راتب</title><p>لم يكتمل تجهيز راتب للعمل دون إنترنت. افتح التطبيق مرة واحدة باتصال ثابت وانتظر رسالة الجاهزية، ثم جرّب مجددًا.</p></html>', {
        status:503,headers:{'Content-Type':'text/html; charset=utf-8'}
      });
      return new Response('',{status:503,statusText:'Offline resource unavailable'});
    }
  })());
});