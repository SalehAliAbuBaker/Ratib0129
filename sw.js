// Ratib 3.1.9: cache identity is unique to this app's scope.
// Retired cache for compatibility checks: v261-trial-muyassar-ui-3.6.109.04
const CACHE_VERSION='v262-trial-hijri-first-20261030-3.6.109.05';
const APP_RELEASE={"version":"3.6.109.05","highlights":["ÊæÍíÏ ÎØæØ ÇáæÇÌåÉ Úáì 14 æÊßÈíÑ ÃíÞæäÉ ãÝÖáÊí","ÊäÙíã ÍÞæá ÇáÊÇÑíÎ æÇáÞíÏ ÇáãÑßÈ æÇáÇÝÊÊÇÍí","ÅÕáÇÍ ÈÞÇÁ ÇáæÇÌåÉ ãÚØáÉ ÈÚÏ ÅÛáÇÞ ÇáÞíÏ ÇáÇÝÊÊÇÍí æãäÚ ÊßÑÇÑ ÊÍÏíË ÚäÇÕÑ ÇáØÈÇÚÉ"],"changes":["ÊæÍíÏ ÎØæØ ÇáæÇÌåÉ Úáì 14 æÊßÈíÑ ÃíÞæäÉ ãÝÖáÊí","ÊäÙíã ÍÞæá ÇáÊÇÑíÎ æÇáÞíÏ ÇáãÑßÈ æÇáÇÝÊÊÇÍí","ÅÕáÇÍ ÈÞÇÁ ÇáæÇÌåÉ ãÚØáÉ ÈÚÏ ÅÛáÇÞ ÇáÞíÏ ÇáÇÝÊÊÇÍí æãäÚ ÊßÑÇÑ ÊÍÏíË ÚäÇÕÑ ÇáØÈÇÚÉ","Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù…Ù† Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ø³Ù†Ø¯Ø§Øª ÙŠØ¹ÙŠØ¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¥Ù„Ù‰ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ø¯ÙˆÙ† Ø´Ø§Ø´Ø© Ø§Ø®ØªÙŠØ§Ø± Ù…ÙƒØ±Ø±Ø©","ÙØªØ­ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ø¨Ø³ÙŠØ· Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù†Ø¯ Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ ØµÙØ­Ø© Ø§Ù„Ø³Ù†Ø¯Ø§Øª Ù…Ù† Ø£ÙŠ Ø±Ø§Ø¨Ø· Ø¹Ø§Ù…","Ø§Ù„Ø¥Ø¨Ù‚Ø§Ø¡ Ø¹Ù„Ù‰ Ø²Ø± Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø³ÙˆØ¯Ø© Ø®Ø§Ø±Ø¬ Ø´Ø§Ø´Ø© Ø§Ù„Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ù„ØºØ§Ø©","Ø¥ØµÙ„Ø§Ø­ ØªØ­Ù…ÙŠÙ„ ØªÙ†Ø³ÙŠÙ‚ Ù†Ø¨Ø¶ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ù„Ù…Ù†Ø¹ Ø§Ù„Ø¯Ø§Ø¦Ø±Ø© Ø§Ù„Ø³ÙˆØ¯Ø§Ø¡","Ø¥Ø¯Ø±Ø§Ø¬ Ø¬Ù…ÙŠØ¹ Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© ÙˆØ§Ù„Ø¨Ù†ÙˆÙƒ ÙˆØªØµØ­ÙŠØ­ ØµØ§ÙÙŠ Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ© Ø¯ÙˆÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª","Ø¥ØªØ§Ø­Ø© Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙÙŠ Ù†Ø¨Ø¶ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ù…Ø¹ Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„Ù†Ø§Ù‚ØµØ© Ø¯ÙˆÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£Ø±ØµØ¯Ø©","Ø²Ø± Ø³Ù†Ø¯ ØµØ±Ù / Ù‚Ø¨Ø¶ ÙŠÙØªØ­ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„ØµØ±Ù Ù…Ø¨Ø§Ø´Ø±Ø© Ø¯ÙˆÙ† Ù†Ø§ÙØ°Ø© Ø§Ø®ØªÙŠØ§Ø± ÙˆØ³ÙŠØ·Ø©","ØªÙˆØ­ÙŠØ¯ Ù‚Ø§Ø¦Ù…Ø© Ù†Ø¨Ø¶ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ù…Ø¹ Ø­Ø³Ø§Ø¨Ø§Øª Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ø³ØªÙˆØ±Ø¯Ø©","Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªØ®Ø·ÙŠØ· Ø§Ù„Ù…Ù†ÙØµÙ„ Ù„Ø³Ù†Ø¯ Ø§Ù„ØµØ±Ù ÙˆØ§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ Ù†ÙØ³ Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø£ØµÙ„ÙŠ Ù„Ø³Ù†Ø¯ Ø§Ù„Ù‚Ø¨Ø¶","Ø§Ù„Ø¥Ø¨Ù‚Ø§Ø¡ Ø¹Ù„Ù‰ Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ§Ù„Ù…Ø¨Ù„Øº ÙˆØ§Ù„Ø¹Ù…Ù„Ø© ÙˆØ³Ø¹Ø± Ø§Ù„ØµØ±Ù ÙˆØ§Ù„Ø¨ÙŠØ§Ù† ÙˆØ§Ù„Ø­ÙØ¸ ÙˆØ§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ù…ÙˆØ­Ø¯Ø©","ØªØµÙÙŠØ© Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø·Ø±Ù Ø§Ù„Ø¯Ø§Ø¦Ù† ÙÙŠ Ø³Ù†Ø¯ Ø§Ù„ØµØ±Ù Ø¥Ù„Ù‰ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ ÙˆØ§Ù„Ø¨Ù†ÙˆÙƒ Ø§Ù„Ù…ØµÙ†ÙØ© Ø¶Ù…Ù† Ø§Ù„Ø£ØµÙˆÙ„","ØªØ±Ùƒ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ© Ù…ØªØ§Ø­Ø© Ù„Ù„Ø·Ø±Ù Ø§Ù„Ù…Ø¯ÙŠÙ† Ø¯ÙˆÙ† ØªÙ‚ÙŠÙŠØ¯Ù‡Ø§ Ø¨Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø£Ùˆ Ø§Ù„Ø¨Ù†ÙˆÙƒ","Ø±ÙØ¶ Ø­ÙØ¸ Ø³Ù†Ø¯ Ø§Ù„ØµØ±Ù Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¯Ø§Ø¦Ù† ØºÙŠØ± Ù†Ù‚Ø¯ÙŠ Ø£Ùˆ Ø¨Ù†ÙƒÙŠ","Ù…Ù†Ø¹ Ø¹ÙƒØ³ Ø§ØªØ¬Ø§Ù‡ Ø³Ù†Ø¯ Ø§Ù„ØµØ±Ù Ø¥Ù„Ù‰ Ù‚ÙŠØ¯ ÙŠØ¬Ø¹Ù„ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø£Ùˆ Ø§Ù„Ø¨Ù†Ùƒ Ù…Ø¯ÙŠÙ†Ù‹Ø§","Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ù†ØµÙˆØµ Ø¨ÙŠØ§Ù† Ø§Ù„Ù…Ø¯ÙŠÙ† Ù…ØªØ¹Ø¯Ø¯Ø© Ø§Ù„Ø£Ø³Ø·Ø± ÙÙŠ Ø§Ù„Ø³Ù†Ø¯Ø§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø© Ø¯ÙˆÙ† ÙÙ‚Ø¯Ø§Ù†Ù‡Ø§","ØªØ±ØªÙŠØ¨ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¯Ø§Ø¦Ù† ÙˆØ§Ù„Ù…Ø³ØªÙÙŠØ¯ Ø§Ù„Ø§Ø®ØªÙŠØ§Ø±ÙŠ ÙˆØ§Ù„Ø¨ÙŠØ§Ù† Ø§Ù„Ø¹Ø§Ù… ÙÙŠ Ø³Ù†Ø¯ Ø§Ù„ØµØ±Ù","Ø§Ø®ØªÙŠØ§Ø± Ø«ÙŠÙ…Ø§Øª Ø±Ø§ØªØ¨ Ø§Ù„Ø£Ø±Ø¨Ø¹Ø©: Ø§Ù„Ø£Ø®Ø¶Ø± ÙˆØ§Ù„Ø°Ù‡Ø¨ÙŠ ÙˆØ§Ù„Ø£Ø²Ø±Ù‚ ÙˆØ§Ù„Ø²Ù…Ø±Ø¯ÙŠ","Ø¥ØµÙ„Ø§Ø­ Ø§Ø®ØªÙØ§Ø¡ Ø§Ø®ØªØµØ§Ø± Ø£Ù„ÙˆØ§Ù† ÙˆØ§Ø¬Ù‡Ø© Ø±Ø§ØªØ¨ Ø¨Ø¹Ø¯ Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚","Ø¥ØµÙ„Ø§Ø­ Ø§Ù„Ø±Ø¬ÙˆØ¹ Ø¨Ø¹Ø¯ Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø¥Ù„Ù‰ Ù†ÙØ³ Ø§Ù„Ø´Ø§Ø´Ø© ÙˆØ§Ù„Ø¨Ø­Ø« ÙˆØ§Ù„ÙÙ„Ø§ØªØ±ØŒ Ø¯ÙˆÙ† Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©","Ù†Ø¨Ø¶ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚: Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ù†Ù‚Ø¯ÙŠÙ‹Ø§ Ø£Ùˆ Ø¨Ù†ÙƒÙŠÙ‹Ø§ ÙŠØ¯ÙˆÙŠÙ‹Ø§ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŒ Ø¯ÙˆÙ† Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ø¬Ù…Ø¯Ø©ØŒ Ù…Ø¹ Ø¹Ø±Ø¶ Ø­Ø³Ø§Ø¨ ÙˆØ§Ø­Ø¯ Ø£Ùˆ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© ÙˆØ­ÙØ¸ Ø§Ù„Ø§Ø®ØªÙŠØ§Ø±","Ø¥ØµÙ„Ø§Ø­ ÙÙ‚Ø¯ Ø§Ù„ØªØ±ÙƒÙŠØ² ÙˆØ¥ØºÙ„Ø§Ù‚ Ù‚ÙˆØ§Ø¦Ù… Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¨Ø³Ø¨Ø¨ ØªÙƒØ±Ø§Ø± Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¨Ø·Ø§Ù‚Ø§Øª","Ø­ÙØ¸ Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ø¹Ù…Ù„Ø§Øª Ø¯ÙˆÙ† ÙÙ‚Ø¯ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª ØºÙŠØ± Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø© ÙÙŠ Ø§Ù„ØµÙÙˆÙ Ø§Ù„Ø£Ø®Ø±Ù‰","Ø¥ØªØ§Ø­Ø© Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø­Ø§ÙˆÙ„Ø© ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¹Ù†Ø¯ ØªØ¹Ø«Ø± Ø§Ù„ØªÙØ¹ÙŠÙ„"]};
const CACHE_PREFIX=`ratib:${self.registration.scope}:`;
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const APP_SHELL=[
  "./ratib-cash-pulse.css",
  "./ratib-cash-pulse.js",
  "./ratib-trial-home-polish.css",
  "./ratib-trial-home-polish.js",
  "./ratib-date-display.js",
  "./ratib-gold.css",
  "./ratib-gold-icon.svg",
  "./ratib-opening.js",
  "./ratib-simple-accounts-3.6.105.13.js",
"./ratib-first-run-3.6.105.11.js",
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
  "./ratib-interactive-tree-3.6.105.05.js",
  "./ratib-interactive-tree-3.6.105.05.css",
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
  "./ratib-statement-marks-3.6.106.05.js",
  "./ratib-reconciliation-print.js",
  "./ratib-favorites-v3.js",
  "./ratib-voice-dictation-3.6.117.js",
  "./ratib-account-archive-compat.js",
  "./ratib-unified-output.js",
  "./vendor/chart.umd.min.js",
  "./vendor/chartjs-plugin-datalabels.min.js",
  "./vendor/xlsx.full.min.js",
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
      if (navigation) return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>Ø±Ø§ØªØ¨</title><p>Ù„Ù… ÙŠÙƒØªÙ…Ù„ ØªØ¬Ù‡ÙŠØ² Ø±Ø§ØªØ¨ Ù„Ù„Ø¹Ù…Ù„ Ø¯ÙˆÙ† Ø¥Ù†ØªØ±Ù†Øª. Ø§ÙØªØ­ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© Ø¨Ø§ØªØµØ§Ù„ Ø«Ø§Ø¨Øª ÙˆØ§Ù†ØªØ¸Ø± Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø¬Ø§Ù‡Ø²ÙŠØ©ØŒ Ø«Ù… Ø¬Ø±Ù‘Ø¨ Ù…Ø¬Ø¯Ø¯Ù‹Ø§.</p></html>', {
        status:503,headers:{'Content-Type':'text/html; charset=utf-8'}
      });
      return new Response('',{status:503,statusText:'Offline resource unavailable'});
    }
  })());
});