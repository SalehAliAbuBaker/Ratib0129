// Ratib 3.1.9: cache identity is unique to this app's scope.
const CACHE_VERSION='v23-ratib-3.2.1';
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
  "./vendor/chart.umd.min.js",
  "./vendor/chartjs-plugin-datalabels.min.js",
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
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME),ready=(await Promise.all([...SHELL_URLS].map(url=>cache.match(url)))).every(Boolean);event.source?.postMessage({type:ready?'OFFLINE_READY':'OFFLINE_UNAVAILABLE',version:CACHE_VERSION});})());
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
    for(const client of clients)if(client.url.startsWith(self.registration.scope))client.postMessage({type:'OFFLINE_READY',version:CACHE_VERSION});
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!req.url.startsWith(self.registration.scope))return;
  const navigation=req.mode==='navigate';
  if(!navigation&&!SHELL_URLS.has(req.url))return;
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
    const cache=await cachePromise,cached=await cache.match(req);
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
