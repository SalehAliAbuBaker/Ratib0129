// Ratib 3.1.9: cache identity is unique to this app's scope.
const CACHE_VERSION='v261-date-render-r1-v260-opening-mobile-clean-3.6.139-compound-compact-auto-signature-tafqit-cash-reference-amount-currency-compound-ref-simple-ref-totals-cash-colors-cash-preview-return-3.6.162-active-budget-callouts-r1-receipt-payment-separation-voucher-routing-3.6.165-alef-search-3.6.166-home-3.6.167-home-refine-3.6.168-fold-theme-dates-3.6.169-nav-custom-3.6.170-report-compact-direct-statement-header-safe-statement-dhikr-home-reports-settings-backup-controls-settings-report-tiles-home-size-report-single-grid-fix-ledger-date-filter-report-mobile-2col-footer-svg-hotfix-01-archive-safety-20261111-r2-recovery-statement-fastlookup-20261111-current-year-lazy-search-decimals-r1-statement-page50-v1-20261111-home-firstpaint-r1-20261111-adhkar7-warmaccounts-20261111-r1-3.6.177-statement-layout-r4-3.6.178-compact-archive-fast-nav-r2-3.6.179-save-flow-r3-3.6.180-rtl-statement-3.6.181-search-currency-sliders-3.6.182-currency-pull-homefix-3.6.184-compound-edit-search-home-3.6.184-compound-archive-search-focus-3.6.185-note-r1-3.6.185-3.6.186-imported-archive-compact-r1-3.6.187-shared-archives-r1-compound-state-editor-3.6.188-statement-context-nav-3.6.189-reconciliation-layout-3.6.190-voucher-back-search-top-hide-3.6.191-smart-account-search-reset-3.6.192-direct-leaf-typeahead-date-search-reset-3.6.193-account-font-plus2-search-back-context-3.6.194-account-favorites-3.6.195-account-font-plus2-search-back-context-3.6.195-account-font-plus2-search-back-context-3.6.197-home-folded-favorites-uniform-tiles-3.6.196-compact-search-favorites-3.6.197-default-account-menu-cash-post-balance-3.6.198';
const APP_RELEASE={"version":"3.6.198","build":"p19800","highlights":["إصلاح القائمة المنسدلة للحسابات الافتراضية حتى لا تغطي زر الحفظ","إظهار الرصيد بعد سند القبض أو الصرف أسفل الطباعة وPDF والمشاركة","الإبقاء على عرض الرصيد الحالي عند اختيار حساب السند دون تغيير"],"changes":["وضع نتائج الحسابات الافتراضية داخل مسار النموذج مع تمرير مستقل، ليظل زر الحفظ ظاهرًا ومتاحًا","إضافة سطر صغير لرصيد الحساب بعد السند المحفوظ في معاينة الطباعة والطباعة وتنزيل ومشاركة PDF بما فيها واتساب","عدم تغيير الأرصدة المسجلة أو إعادة ترحيل سند؛ وتظل شاشة اختيار الحساب وعرض رصيده كما كانت"]};
const CACHE_PREFIX=`ratib:${self.registration.scope}:`;
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const APP_SHELL=[
 "./ratib-home-uniform-3.6.196.css",
 "./ratib-account-favorites-3.6.195.js",
 "./ratib-account-favorites-3.6.195.css",
 "./ratib-statement-toolbar-3.6.189.js",
 "./ratib-statement-toolbar-3.6.189.css",
 "./ratib-performance-watch-20261111.js",
 "./ratib-statement-layout-3.6.178.css",
 "./ratib-statement-layout-3.6.178.js",
  "./ratib-adhkar-20261111.js",
  "./ratib-adhkar-20261111.css",
  "./ratib-ledger-date-filter-3.6.177.js",
  "./ratib-ledger-date-filter-3.6.177.css",
  "./ratib-report-menu-3.6.176.css",
  "./ratib-statement-safety-3.6.172.js",
  "./ratib-statement-safety-3.6.172.css",
  "./ratib-home-3.6.171.js",
  "./ratib-home-3.6.171.css",
  "./ratib-bottom-nav-3.6.170.js",
  "./ratib-bottom-nav-3.6.170.css",
  "./ratib-home-3.6.169.js",
  "./ratib-home-3.6.169.css",
  "./ratib-home-3.6.168.js",
  "./ratib-home-3.6.168.css",
  "./ratib-home-3.6.167.js",
  "./ratib-home-3.6.167.css",
  "./ratib-cash-pulse-dual-ring-3.6.162.js",
  "./ratib-cash-pulse-dual-ring-3.6.162.css",
  "./ratib-account-lock-unified-3.6.161.css",
  "./ratib-account-lock-unified-3.6.161.js",
  "./ratib-statement-search-totals-3.6.160.js",
  "./ratib-statement-direct-pdf-3.6.159.js",
  "./vendor/ratib-pdfmake-rtl-0.2.23.js",
  "./vendor/ratib-tajawal-regular.ttf",
  "./vendor/ratib-tajawal-bold.ttf",
  "./ratib-statement-vector-3.6.158.js",
  "./ratib-statement-vector-3.6.158.css",
  "./ratib-statement-footer-opening-3.6.157.css",
  "./ratib-ui-fixes-3.6.156.css",
  "./ratib-ui-unification-3.6.155.css",
  "./ratib-simple-accounts-3.6.105.13.js",
"./ratib-first-run-3.6.105.11.js",
"./ratib-country-currency-3.6.151.js",
"./ratib-country-currency-3.6.151.css",
"./ratib-global-button-size-3.6.146.js",
"./ratib-interface-font-3.6.148.css",
  "./ratib-whatsapp-support-3.6.113.js",
  "./ratib-whatsapp-support-3.6.113.css",
  "./ratib-account-movement-search-3.6.114.css",
  "./ratib-statement-compact-3.6.119.css",
  "./ratib-statement-compact-3.6.119.js",
  "./ratib-display-separation-3.6.122.js",
  "./ratib-trial-voucher-statement-3.6.125.js",
  "./ratib-trial-voucher-statement-3.6.125.css",
"./ratib-receipt-payer-3.6.115.css",
"./ratib-date-display.js",
"./ratib-umalqura-output-3.6.116.css",
"./ratib-voucher-polish-3.6.117.css",
"./ratib-opening-leave-3.6.118.css",
"./ratib-mobile-vouchers-3.6.111.css",
"./ratib-official-responsive-3.6.112.css",
"./ratib-document-signatures-3.6.148.js",
"./ratib-cash-reference-3.6.148.js",
  "./ratib-compound-output-3.6.150.js",
  "./ratib-simple-output-3.6.151.js",
  "./ratib-simple-output-3.6.151.css",
  "./ratib-voucher-colors-totals-3.6.152.css",
  "./ratib-compound-output-3.6.150.css",
"./ratib-cash-reference-3.6.148.css",
"./ratib-feedback-3.6.149.js",
  "./ratib-mobile-edge-back-3.6.128.js",
"./ratib-feedback-3.6.149.css",
"./ratib-global-button-size-3.6.146.css",
  "./ratib-dashboard-finance-3.6.144.css",
  "./ratib-cash-pulse.css",
  "./ratib-cloud-due-3.6.130.css",
  "./ratib-cash-pulse.js",
  "./ratib-dashboard-finance-3.6.144.js",
  "./ratib-trial-ui-3.6.143.css",
  "./ratib-trial-ui-3.6.143.js",
  "./",
  "./index.html",
  "./ratib-cash-actions-3.6.135.css",
  "./ratib-cash-actions-3.6.135.js",
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
  "./ratib-compound-layout-3.6.142.css",
  "./ratib-compound-layout-3.6.142.js",
  "./ratib-amount-edit-3.6.97.js",
  "./ratib-cash-layout-3.6.83.js",
  "./ratib-annual-close.js",
  "./ratib-fiscal-ledger.js",
  "./ratib-statement-prior-year.js",
  "./ratib-statement-marks-3.6.106.05.js",
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