(function(){
 'use strict';
 const P=window.RatibLicenseProtocol,C=window.RATIB_LICENSE_CONFIG,DB='ratib_license_v1';
 let identity=null,record={},claims=null,failure='',maintenance=0,db=null,busy=false,saveQueue=Promise.resolve(),anchorPerf=performance.now(),anchorTime=Date.now(),lastSync=0;
 const protectedKey=k=>['plan','history','cats','account_tree','account_catalog','account_codes','account_ceilings','default_accounts','legacy_import_batches','legacy_import_rollback','opening_imports'].includes(k)||/^legacy_import_/.test(k);
 function configured(){return !!C.endpoint&&!!C.issuer&&Object.keys(C.publicKeys).length>0;}
 function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore('state');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('LICENSE_STORAGE_BLOCKED'));});}
 function read(key){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),q=tx.objectStore('state').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
 function write(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value,key);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('LICENSE_STORAGE_FAILED'));});}
 async function getIdentity(){
  const existing=await read('identity');if(existing)return existing;
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const publicKey=P.publicJwk(await crypto.subtle.exportKey('jwk',pair.publicKey)),newIdentity={publicKey,privateKey:pair.privateKey,device:await P.deviceId(publicKey)};
  // Generate outside the transaction, then resolve competing tabs with an atomic read/write.
  return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),q=store.get('identity');let result;q.onsuccess=()=>{result=q.result||newIdentity;if(!q.result)store.put(result,'identity');};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error);});
 }
 function elapsedNow(){const wall=Date.now(),trusted=record.trustedAt||wall,checkpoint=record.wallAt??wall;return Math.max(record.effectiveAt||0,trusted+Math.max(0,wall-checkpoint),anchorTime+Math.max(0,performance.now()-anchorPerf));}
 function rollback(){return !!record.maxWall&&Date.now()+C.clockToleranceMs<record.maxWall;}
 function current(){if(!configured())return {writable:false,state:'setup',days:0};if(failure)return {writable:false,state:'error',days:0};return P.status(claims,elapsedNow(),rollback());}
 async function persist(){if(!db)return;const now=elapsedNow();record={...record,effectiveAt:now,maxWall:Math.max(record.maxWall||0,Date.now())};const snapshot=structuredClone(record);saveQueue=saveQueue.catch(()=>{}).then(()=>write('license',snapshot));try{await saveQueue;}catch(e){failure='تعذر حفظ حالة التفعيل. بيانات المحاسبة لم تُحذف.';render();throw e;}}
 async function accept(token,online=false){
  const next=await P.verifyToken(token,C,identity.device),old=record.highWater?.[next.id];
  if(old&&(next.revision<old.revision||next.issuedAt<old.issuedAt||(old.revoked&&next.revision===old.revision&&next.status!=='revoked')))throw Error('STALE_ACTIVATION_TOKEN');
  if(next.issuedAt>Date.now()+C.clockToleranceMs&&!online)throw Error('CHECK_DEVICE_CLOCK_OR_SYNC');
  const now=Date.now();
  // An offline token never moves the previous trusted clock backwards.
  const effective=online?next.serverAt:Math.max(elapsedNow(),next.serverAt);
  const updated={...record,token,highWater:{...(record.highWater||{}),[next.id]:{revision:next.revision,issuedAt:next.issuedAt,revoked:next.status==='revoked'}},trustedAt:effective,wallAt:now,effectiveAt:effective,maxWall:online?now:Math.max(record.maxWall||0,now)};
  // Persist before unlocking edits. If the write fails, keep the previous license authoritative.
  await write('license',updated);record=updated;claims=next;failure='';anchorPerf=performance.now();anchorTime=effective;render();return current();
 }
 async function requestCode(email,licenseId=null){if(!identity)throw Error('DEVICE_NOT_READY');return P.makeRequest(identity,email,crypto,licenseId);}
 async function network(path,data){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(C.endpoint+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store',credentials:'omit',signal:controller.signal});const body=await response.json();if(!response.ok||!body.token)throw Error(body.error||'LICENSE_CONNECTION_FAILED');return body.token;}finally{clearTimeout(timer);}}
 async function sync(){if(busy||!configured()||!identity||navigator.onLine===false)return;busy=true;try{await saveQueue;const code=await requestCode(claims?.email||'',claims?.id||null);await accept(await network(claims?'/api/sync':'/api/trial',{requestCode:code}),true);lastSync=Date.now();message(claims.kind==='trial'?'تم التحقق من التجربة بتوقيت الخادم.':'تم تحديث حالة الترخيص.');}catch(e){message('تعذر الاتصال بخدمة التراخيص. الترخيص الموقّع السابق يظل خاضعًا لمدته؛ بياناتك متاحة للعرض والتصدير.');}finally{busy=false;render();}}
 const labels={trial:'تجريبي',annual:'سنوي',permanent:'دائم',custom:'مخصص',unactivated:'لم يُفعّل',expired:'منتهٍ',revoked:'موقوف',clock:'تحتاج ساعة الجهاز إلى التحقق',setup:'إعداد التراخيص التجريبي غير مكتمل',error:'تعذر التحقق من التفعيل'};
 const $=id=>document.getElementById(id),message=text=>{if($('licenseMessage'))$('licenseMessage').textContent=text;};
 function render(){const s=current();if(!$('licenseStatus'))return;$('licenseStatus').textContent=labels[s.state]||s.state;$('licenseTrialDays').textContent=claims?.kind==='trial'?('المتبقي من التجربة: '+s.days+' يوم؛ دون حد لعدد السندات.'):'مدة الترخيص: '+(claims?.expiresAt?new Date(claims.expiresAt).toLocaleDateString('ar'):(claims?.kind==='permanent'?'دائم':'غير مفعّل'));$('licenseDetails').textContent=claims?('النوع: '+labels[claims.kind]+' — '+(claims.binding==='device'?'جهاز دون بريد':'مرتبط بالبريد: '+claims.email)):'تبدأ تجربة الأيام الثلاثة عند أول اتصال موثوق أو إدخال رمز تجريبي موقّع.';$('licenseReadOnly').hidden=s.writable;$('licenseReadOnly').textContent=s.state==='setup'?'هذه نسخة مراجعة؛ يلزم ربط البيئة التجريبية ومفتاح التحقق العام قبل تشغيل التراخيص.':s.state==='clock'?'لوحظ تراجع ساعة الجهاز. اتصل للتحقق من الوقت؛ البيانات والتصدير متاحان.':s.state==='error'?failure:'الإضافة والتعديل متوقفان حتى التفعيل؛ جميع البيانات متاحة للعرض والتصدير.';const note=$('licenseReadOnlyBanner');note.hidden=s.writable;note.textContent=$('licenseReadOnly').textContent;}
 function open(){const section=$('ratibLicenseModal');if(!section)return;window.closeRatibSidebar?.();section.hidden=false;section.removeAttribute('inert');section.setAttribute('aria-hidden','false');window.activateRatibOverlay?.(section,$('openRatibLicenseBtn'));render();$('licenseClose').focus();}
 function close(){const section=$('ratibLicenseModal');window.releaseRatibOverlay?.(section);section.hidden=true;section.setAttribute('inert','');section.setAttribute('aria-hidden','true');}
 function requireWrite(){if(current().writable)return true;render();window.showToast?.('يلزم ترخيص صالح للإضافة أو التعديل. بياناتك والتصدير متاحان.','warn',6000);open();return false;}
 const mutationSelector='#commitVoucherBtn,#commitMultiVoucherBtn,#saveTxExecutionBtn,#saveAndAddVoucherBtn,#deleteDocBtn,#clearAllTxsBtn,.single-del-btn,#saveEditedAccountBtn,#savePctsBtn,#addCatBtn,#saveNewAccountTreeBtn,#saveNewParentCategoryBtn,#applyLegacyImportBtn,#undoLegacyImportBtn';
 function bind(){
  $('openRatibLicenseBtn').onclick=open;$('licenseClose').onclick=close;$('licenseRefresh').onclick=sync;
  $('licenseEmail').oninput=()=>{$('licenseRequestCode').value='';};
  $('licenseMakeRequest').onclick=async()=>{try{$('licenseRequestCode').value=await requestCode($('licenseEmail').value);message('انسخ الطلب وأرسله إلى مالك النظام. يمكن إدخال رمز الاستجابة دون إنترنت.');}catch(e){message('تعذر إنشاء الطلب؛ تحقق من دعم التخزين والتشفير في المتصفح.');}};
  $('licenseCopyRequest').onclick=async()=>{try{if(!$('licenseRequestCode').value)throw Error();await navigator.clipboard.writeText($('licenseRequestCode').value);message('تم نسخ طلب التفعيل.');}catch(e){message('حدد رمز الطلب وانسخه يدويًا.');}};
  $('licenseActivate').onclick=async()=>{const button=$('licenseActivate');button.disabled=true;try{await saveQueue;await accept($('licenseToken').value.trim());$('licenseToken').value='';message(current().writable?'تم التفعيل والتحقق من التوقيع وحفظه على هذا الجهاز.':'الرمز صحيح، لكن الترخيص منتهٍ أو موقوف.');}catch(e){const messages={STALE_ACTIVATION_TOKEN:'الرمز أقدم من آخر حالة موثوقة لهذا الترخيص.',CHECK_DEVICE_CLOCK_OR_SYNC:'تحقق من تاريخ الجهاز أو اتصل بخدمة التراخيص.'};message(messages[e.message]||'تعذر التفعيل. تحقق من الرمز ومطابقته لهذا الجهاز ومفتاح التحقق.');}finally{button.disabled=false;render();}};
  document.addEventListener('click',event=>{const target=event.target.closest?.(mutationSelector);if(target&&!requireWrite()){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{if(!$('ratibLicenseModal').hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}},true);
  window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){render();if(Date.now()-lastSync>C.syncIntervalMs)sync();}else persist().catch(()=>{});});
  window.addEventListener('pagehide',()=>persist().catch(()=>{}));
  setInterval(()=>{render();persist().catch(()=>{});if(Date.now()-lastSync>C.syncIntervalMs)sync();},60000);
 }
 async function init(){try{db=await openDb();identity=await getIdentity();record=await read('license')||{};if(record.token&&configured())claims=await P.verifyToken(record.token,C,identity.device);anchorTime=Math.max(record.effectiveAt||Date.now(),record.trustedAt||0);anchorPerf=performance.now();await persist();}catch(e){failure='تعذر الوصول إلى حالة الترخيص أو التحقق منها. بيانات المحاسبة تبقى محفوظة.';}bind();render();if(configured())sync();}
 window.RatibLicense=Object.freeze({ready:new Promise(resolve=>document.addEventListener('DOMContentLoaded',()=>init().finally(resolve),{once:true})),current,requireWrite,open,close,sync,requestCode,accept,checkpoint:persist,
  protectedKey,allowWrite:()=>maintenance>0||current().writable,
  copyRead:(k,value)=>protectedKey(k)&&maintenance===0&&!current().writable&&value&&typeof value==='object'?structuredClone(value):value,
  maintenance:fn=>{maintenance++;try{return fn();}finally{maintenance--;}}
 });
})();
