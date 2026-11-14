/* One licensed identity for screen, reports and every output path. */
(()=>{'use strict';
 const NAME='راتب للتنظيم والتدبير المالي',LOGO='Icons/icon-192.png';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=(key,fallback)=>{try{return store.get(key,fallback);}catch(_){return fallback;}};
 const licensed=()=>window.RatibLicense?.isLocallyLicensed?.()===true;
 function get(){
  const active=licensed(),saved=read('header_config',{}),logo=read('user_print_logo_v1',null);
  const name=active&&String(saved?.name||'').trim();
  const customName=name&&name!=='مؤسسة خيرية'&&name!==NAME?name:'';
  const customLogo=active&&logo?.enabled!==false&&/^data:image\/(?:png|jpeg|webp);base64,/.test(logo?.data||'')?logo.data:'';
  return {name:customName||NAME,details:active?String(saved?.details||'').replace('العنوان: حضرموت - تريم | هاتف: 700000000',''):'',show:active?saved?.show!==false:true,logo:customLogo||LOGO,licensed:active,custom:!!(customName||customLogo)};
 }
 function header(){const {name,details,show}=get();return {name,details,show};}
 function logo(){const b=get();return {data:b.logo,enabled:true,bytes:0,builtin:b.logo===LOGO};}
 function html(){const b=get();if(!b.show)return '';return '<div class="ratib-identity-header" dir="rtl"><img src="'+escape(b.logo)+'" alt="شعار جهة الإصدار"><div><strong>'+escape(b.name)+'</strong>'+(b.details?'<span>'+escape(b.details)+'</span>':'')+'</div></div>';}
 const dataCache=new Map();
 async function logoData(){const source=get().logo;if(source.startsWith('data:'))return source;
  if(!dataCache.has(source))dataCache.set(source,fetch(source,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('تعذر تحميل شعار الترويسة');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);})).catch(e=>{dataCache.delete(source);throw e;}));
  return dataCache.get(source);
 }
 function refresh(){
  const b=get();if(!globalThis.document?.documentElement)return b;const name=b.custom?b.name:'راتب';
  document.documentElement.dataset.ratibCustomBrand=b.custom?'1':'0';
  const main=document.querySelector('header .logo'),image=main?.querySelector('img'),label=main?.querySelector('.ratib-brand-name'),sub=main?.querySelector('.ratib-brand-sub');
  if(image&&image.getAttribute('src')!==b.logo)image.setAttribute('src',b.logo);
  if(label&&label.textContent!==name)label.textContent=name;
  if(sub){sub.hidden=b.custom;if(!b.custom&&sub.textContent!=='للتنظيم والتدبير المالي')sub.textContent='للتنظيم والتدبير المالي';}
  for(const root of document.querySelectorAll('.ratib-login-top')){
   const img=root.querySelector('img'),span=root.querySelector('span');
   if(img&&img.getAttribute('src')!==b.logo)img.setAttribute('src',b.logo);
   if(span&&span.textContent!==b.name)span.textContent=b.name;
  }
  for(const root of document.querySelectorAll('.ratib-identity-header')){
   root.hidden=!b.show;const img=root.querySelector('img'),strong=root.querySelector('strong');
   if(img&&img.getAttribute('src')!==b.logo)img.setAttribute('src',b.logo);
   if(strong&&strong.textContent!==b.name)strong.textContent=b.name;
   let details=root.querySelector('span');
   if(b.details){if(!details){details=document.createElement('span');(strong?.parentElement||root).append(details);}if(details.textContent!==b.details)details.textContent=b.details;}
   else details?.remove();
  }
  document.title=b.custom?b.name:NAME+' — دفتر الميزانية الآمن';
  window.RatibPrintLogo?.syncPrint?.();
  return b;
 }
 let queued=false;
 function queue(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}
 function init(){
  refresh();
  setInterval(refresh,60000);
  const observer=new MutationObserver(queue);
  for(const root of [document.querySelector('header .logo'),document.getElementById('lockScreen')])if(root)observer.observe(root,{childList:true,subtree:true});
  window.RatibLicense?.licensed?.().then(refresh).catch(()=>refresh());
 }
 window.RatibBranding=Object.freeze({get,header,logo,html,logoData,refresh});
 window.addEventListener('ratib:license-changed',queue);
 window.addEventListener('storage',queue);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();window.RatibLicense?.licensed?.().then(refresh).catch(()=>{});}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
