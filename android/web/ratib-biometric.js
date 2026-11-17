/* Persistent biometric unlock: store only a wrapped vault key, never a PIN. */
(()=>{'use strict';
const native=window.RatibAndroid;
const bytes=()=>crypto.getRandomValues(new Uint8Array(32));
const aad=salt=>new TextEncoder().encode('ratib-biometric-v1|'+location.origin+'|'+salt);
const valid=cfg=>cfg.enabled&&cfg.bioEnvelope?.version===1&&cfg.bioEnvelope.salt===cfg.salt&&cfg.bioEnvelope.kind===(native?'android':'prf');
let busy=false;
function update(){
 const cfg=getSecurityConfig(),ready=valid(cfg);
 const btn=document.getElementById('bioUnlockBtn');if(btn)btn.style.display=ready?'block':'none';
 const hint=document.getElementById('bioHint');if(hint)hint.textContent=ready?'يفتح القفل بعد إغلاق التطبيق أيضًا. يبقى الرقم السري خيارًا احتياطيًا.':'افتح بالرقم السري ثم فعّل البصمة مجددًا. يحتاج المتصفح دعم تشفير مفاتيح المرور (PRF).';
}
const oldRefresh=refreshBioSettingsUI;
refreshBioSettingsUI=function(){oldRefresh();update();};
const oldBoot=boot;boot=function(){oldBoot();update();};
async function prfCredential(id,salt){
 const credential=await navigator.credentials.get({publicKey:{challenge:bytes(),allowCredentials:[{id:_fromB64(id),type:'public-key'}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:_fromB64(salt)}}}}});
 if(!credential||_b64(credential.rawId)!==id)throw Error('تعذر التحقق من مفتاح المرور المسجل');
 const result=credential.getClientExtensionResults()?.prf?.results?.first;
 if(!result)throw Error('هذا المتصفح أو مفتاح المرور لا يدعم فتح البيانات المشفرة بالبصمة. استخدم الرقم السري.');
 return crypto.subtle.importKey('raw',result,'AES-GCM',false,['encrypt','decrypt']);
}
registerBiometricCredential=async function(){
 if(busy)return false;busy=true;
 let raw;
 try{
  const cfg=getSecurityConfig();
  if(!cfg.enabled||!_vaultUnlocked||!_vaultCryptoKey)throw Error('افتح التطبيق بالرقم السري أولًا');
  await flushStorage();raw=new Uint8Array(await crypto.subtle.exportKey('raw',_vaultCryptoKey));
  let envelope;
  if(native){const wrapped=await native.request('biometricWrap',{key:_b64(raw),aad:_b64(aad(cfg.salt))});envelope={...wrapped,kind:'android',salt:cfg.salt,version:1};}
  else{
   if(!navigator.credentials||!window.PublicKeyCredential)throw Error('المتصفح لا يدعم مفاتيح المرور؛ استخدم الرقم السري');
   const credential=await navigator.credentials.create({publicKey:{challenge:bytes(),rp:{name:'راتب'},user:{id:bytes(),name:'ratib-local',displayName:'راتب'},pubKeyCredParams:[{alg:-7,type:'public-key'},{alg:-257,type:'public-key'}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required'},timeout:60000,extensions:{prf:{}}}});
   if(!credential?.getClientExtensionResults()?.prf?.enabled)throw Error('مفتاح المرور لا يدعم تشفير البيانات (PRF). بقي الرقم السري فعالًا.');
   const id=_b64(credential.rawId),prfSalt=_b64(bytes()),key=await prfCredential(id,prfSalt),iv=crypto.getRandomValues(new Uint8Array(12));
   const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(cfg.salt)},key,raw);
   envelope={version:1,kind:'prf',id,prfSalt,iv:_b64(iv),data:_b64(encrypted),salt:cfg.salt};
  }
  // Do not overwrite a changed PIN configuration while the system prompt was open.
  if(getSecurityConfig().salt!==cfg.salt||!_vaultUnlocked)throw Error('تغيرت حالة القفل؛ أعد المحاولة');
  saveSecurityConfigRaw({...cfg,bioCredentialId:envelope.id,bioEnvelope:envelope});await flushStorage();
  if(native&&cfg.bioEnvelope?.kind==='android')await native.request('biometricDelete',{id:cfg.bioEnvelope.id}).catch(()=>{});
  update();return true;
 }catch(e){showToast(e.name==='NotAllowedError'?'أُلغي التحقق أو انتهت مهلته؛ يمكنك استخدام الرقم السري':e.message,'warn');return false;}
 finally{raw?.fill(0);busy=false;}
};
authenticateBiometric=async function(){
 if(busy)return;busy=true;let raw;
 try{
  const cfg=getSecurityConfig();if(!valid(cfg))throw Error('افتح بالرقم السري ثم أعد تفعيل البصمة من الإعدادات');
  const envelope=cfg.bioEnvelope;
  if(native)raw=new Uint8Array(_fromB64(await native.request('biometricUnwrap',{...envelope,aad:_b64(aad(cfg.salt))})));
  else{const key=await prfCredential(envelope.id,envelope.prfSalt);raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:_fromB64(envelope.iv),additionalData:aad(cfg.salt)},key,_fromB64(envelope.data)));}
  if(getSecurityConfig().salt!==cfg.salt)throw Error('تغيرت إعدادات الحماية؛ استخدم الرقم السري');
  const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',true,['encrypt','decrypt']);
  const blob=await _readVaultBlob();if(!blob)throw Error('تعذر قراءة البيانات المشفرة');
  await _finishVaultUnlock(key,blob);unlockAppScreen();proceedAppInit();
  showToast('تم فتح البيانات بالبصمة','success');
 }catch(e){showToast('تعذر فتح القفل بالبصمة. استخدم الرقم السري؛ يمكنك إعادة تفعيل البصمة من الإعدادات.','warn');}
 finally{raw?.fill(0);busy=false;}
};
disableBiometricCredential=async function(){
 const cfg=getSecurityConfig();saveSecurityConfigRaw({...cfg,bioCredentialId:null,bioEnvelope:null});await flushStorage();
 if(native&&cfg.bioEnvelope?.kind==='android')await native.request('biometricDelete',{id:cfg.bioEnvelope.id}).catch(()=>{});
 refreshBioSettingsUI();showToast('تم إيقاف الدخول بالبصمة','warn');
};
// A PIN change/disable must not leave a usable envelope for the previous vault key.
for(const name of ['enableVaultEncryption','disableVaultEncryption']){
 const original=window[name];window[name]=async function(...args){await disableBiometricCredential();return original(...args);};
}
document.addEventListener('DOMContentLoaded',update);
})();
