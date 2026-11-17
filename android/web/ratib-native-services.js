/* Android services only: original accounting, vault and persistence functions. */
(()=>{'use strict';if(!window.RatibAndroid)return;const native=RatibAndroid,$=id=>document.getElementById(id);
const dateFieldSelector='input[type="date"],input[type="time"],input[type="month"]';
function formatDateField(input){input.lang='en-CA-u-nu-latn';input.dir='ltr';}
document.querySelectorAll(dateFieldSelector).forEach(formatDateField);
document.addEventListener('focusin',event=>{
  if(event.target.matches?.(dateFieldSelector))formatDateField(event.target);
});
native.parseBackupText=text=>{try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch(_){throw Error('تعذر قراءة النسخة الاحتياطية: الملف تالف أو ليس بصيغة JSON الصحيحة. لم تُغيّر بياناتك.');}};
native.validateBackupEnvelope=function(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('ملف النسخة الاحتياطية غير صالح.');
 if(p.encrypted){if(typeof p.salt!=='string'||!p.salt||!p.blob||typeof p.blob!=='object')throw Error('النسخة المشفرة ناقصة أو تالفة.');}
 else if(!p.data||typeof p.data!=='object'||Array.isArray(p.data)||!Object.keys(p.data).length)throw Error('لا يحتوي الملف على بيانات نسخة احتياطية صالحة؛ لم تُغيّر بياناتك.');
};
native.validateBackupRecords=function(data){
 if(!Object.keys(data).some(k=>['masar_plan','masar_history','masar_account_tree','masar_account_catalog'].includes(k)))throw Error('لا توجد حسابات أو دفاتر راتب في هذا الملف؛ لم تُغيّر بياناتك.');
 if(data.masar_account_tree&&(typeof data.masar_account_tree!=='object'||Array.isArray(data.masar_account_tree)))throw Error('بنية دليل الحسابات غير صالحة.');
 if(data.masar_account_catalog&&!Array.isArray(data.masar_account_catalog))throw Error('بنية سجل الحسابات غير صالحة.');
};
native.backupAccountCount=data=>Array.isArray(data.masar_account_catalog)?data.masar_account_catalog.length:Object.values(data.masar_account_tree||{}).reduce((n,g)=>n+(Array.isArray(g)?g.length:(g.accounts||[]).length+Object.values(g.subGroups||{}).reduce((sum,a)=>sum+(Array.isArray(a)?a.length:0),0)),0);
native.blockRestoreUI=()=>{const overlay=document.createElement('div');overlay.id='ratibRestoreProgress';overlay.tabIndex=-1;overlay.setAttribute('role','alertdialog');overlay.textContent='جارٍ حفظ نسخة التراجع واستعادة البيانات…';overlay.style='position:fixed;inset:0;z-index:2147483647;background:#0f172ae8;color:white;display:grid;place-items:center;font-size:18px;padding:20px';document.body.append(overlay);const previous=document.activeElement;previous?.blur();overlay.focus();const block=e=>{if(e.target!==overlay){e.preventDefault();e.stopImmediatePropagation();}};document.addEventListener('keydown',block,true);return()=>{overlay.remove();document.removeEventListener('keydown',block,true);previous?.focus();};};
let restoreBusy=false;
restoreFromAutoBackupFolder=()=>chooseRestore('backupLatest');
async function chooseRestore(method){if(restoreBusy)return;restoreBusy=true;try{const picked=await native.request(method),chunks=[];try{for(let offset=0;offset<picked.size;offset+=49152){const chunk=await native.request('readBackupChunk',{readId:picked.readId,offset});chunks.push(Uint8Array.from(atob(chunk),c=>c.charCodeAt(0)));}await importBackupFile(new File(chunks,picked.name,{type:picked.name.endsWith('.gz')?'application/gzip':'application/json'}));}finally{await native.request('releaseBackup',{readId:picked.readId});}}catch(e){if(e.name!=='AbortError')showToast(e.message,'error',7000);}finally{restoreBusy=false;}}
$('importDataBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();chooseRestore('chooseBackup');},true);
if($('importDataBtn')){const button=document.createElement('button');button.type='button';button.className=$('importDataBtn').className;button.id='restoreCheckpointBtn';button.textContent='العودة إلى بيانات ما قبل آخر استعادة';button.addEventListener('click',()=>chooseRestore('restoreCheckpointRead'));$('importDataBtn').after(button);}
// Await the Android document write so success is never shown on cancellation.
downloadBackupPayload=async(payload,name)=>{const packed=await ratibPackBackup(payload);return native.sendFile(packed.blob,name.replace(/\.json(?:\.gz)?$/i,'')+packed.extension);};
exportBackupFile=async function(){try{await flushStorage();await downloadBackupPayload(await buildBackupPayload(),`ratib-backup-${backupStamp()}.json`);showToast('حُفظت النسخة الاحتياطية بنجاح','success');}catch(e){if(e.name!=='AbortError')showToast('تعذر حفظ النسخة: '+e.message,'error');}};
getDriveToken=async function(interactive){const cfg=getCloudCfg();const account=await native.request('googleAuthorize',{interactive:!!interactive,email:cfg.email||''});if(cfg.email!==account.email||!cfg.androidAccountVerified)saveCloudCfg({email:account.email,androidAccountVerified:true},true);_cloudToken='native-drive-session';_cloudTokenExp=Date.now()+3300000;return _cloudToken;};
driveFetch=async function(url,opts={}){
 const args={url,method:opts.method||'GET',contentType:opts.headers?.['Content-Type']||'application/json'};
 const r=opts.body instanceof Blob
   ?await native.sendFile(opts.body,'drive-upload.bin','driveUpload',args)
   :await native.request('driveRequest',{...args,body:opts.body||''});
 if(r.status===401){_cloudToken=null;_cloudTokenExp=0;}
 if(r.status<200||r.status>=300){
   let detail='';try{detail=JSON.parse(r.body||'{}').error?.message||'';}catch(_){}
   const message=r.status===401?'انتهى إذن Google؛ اربط الحساب من جديد.':r.status===403?'رفض Google الطلب. تحقق من صلاحيات الحساب وتفعيل Drive API.':'تعذر تنفيذ طلب Drive (رمز '+r.status+').'+(detail?' '+detail:'');
   const error=Error(message);error.status=r.status;throw error;
 }
 if(r.readId){
   const chunks=[];
   try{
     for(let offset=0;offset<r.size;offset+=49152){
       const encoded=await native.request('readBackupChunk',{readId:r.readId,offset});
       chunks.push(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
     }
     return new Response(new Blob(chunks,{type:r.mime||'application/octet-stream'}),{status:r.status});
   }finally{await native.request('releaseBackup',{readId:r.readId});}
 }
 return new Response(r.body||null,{status:r.status,headers:{'Content-Type':'application/json'}});
};
// Verify Google's account before enabling a backup destination. The existing
// backup payload and upload/retention/restore implementation is reused.
$('cloudSaveBtn')?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const btn=$('cloudSaveBtn');if(btn.disabled)return;btn.disabled=true;const previous={...getCloudCfg()};try{
 const email=($('cloudEmailInput')?.value||'').trim().toLowerCase(),time=$('cloudTimeInput')?.value||'21:00';
 if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('صيغة البريد الإلكتروني غير صحيحة.');
 const account=await native.request('googleAuthorize',{interactive:true,email});
 saveCloudCfg({enabled:true,email:account.email,time,lastError:'',androidAccountVerified:true});refreshCloudBackupUI();
 if(!await runCloudBackup(true))throw Error(getCloudCfg().lastError||'لم تُحفظ أول نسخة على Google Drive.');
 showToast('تم ربط حساب '+account.email+' وحفظ نسخة على Google Drive','success',7000);
}catch(err){saveCloudCfg({...previous,lastError:err.name==='AbortError'?'أُلغي ربط Google':err.message});refreshCloudBackupUI();if(err.name!=='AbortError')showToast(err.message,'error',8000);}finally{btn.disabled=false;}},true);
const webCloudUI=refreshCloudBackupUI;
refreshCloudBackupUI=function(){webCloudUI();const cfg=getCloudCfg();if(!$('cloudBackupStatus')||_cloudBusy)return;$('cloudBackupStatus').textContent=cfg.enabled?(cfg.androidAccountVerified?`حساب Google المعتمد: ${cfg.email} — يومياً ${cfg.time}`:'يلزم التحقق من حساب Google لأندرويد — اضغط ربط الحساب'):'غير مفعّل';};
$('cloudDisableBtn')?.addEventListener('click',()=>{setTimeout(()=>{if(!getCloudCfg().enabled){saveCloudCfg({androidAccountVerified:false},true);native.request('googleDisconnect').catch(()=>{});}},0);});
// Upstream now separates PDF sharing from downloading. Its original handlers
// call navigator.share directly, which already reaches the native bridge.
// Expose the existing activation dialog without creating or altering a voucher.
if($('importDataBtn')){const button=document.createElement('button');button.type='button';button.className=$('importDataBtn').className;button.id='androidLicenseBtn';button.textContent='تفعيل ترخيص راتب';button.addEventListener('click',()=>window.RatibLicense.showActivation({manual:true}));$('restoreCheckpointBtn').after(button);}
if($('appVersionLabel')){const label=$('appVersionLabel'),version=label.textContent.match(/3\.\d+\.\d+/)?.[0]||'3.6.62',build=Number(native.capabilities()?.androidVersion)||9;label.textContent='الإصدار 3.6.177 Android';}
refreshCloudBackupUI();
})();
