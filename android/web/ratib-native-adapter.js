(()=>{'use strict';if(!window.RatibAndroid)return;
const native=window.RatibAndroid;
// Account exports previously used CSV and the ledger used HTML named .xls.
// Keep the same report rows and store genuine XLSX workbooks on Android.
downloadCsv=function(rows,name){const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(rows);book.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(book,sheet,'كشف الحساب');return native.sendFile(new Blob([XLSX.write(book,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name.replace(/\.csv$/i,'.xlsx')).catch(e=>showToast(e.message,'error'));};
window.showDirectoryPicker=async()=>{throw Error('استخدم زر مجلد النسخ الاحتياطي داخل راتب');};
chooseAutoBackupFolder=async function(){try{await native.request('chooseTree');store.set('auto_backup_enabled',true);savedRevision=-1;if(!await writeAutoBackup())return;await refreshAutoBackupUI();showToast('تم تفعيل النسخ الاحتياطي في مجلد أندرويد','success');}catch(e){if(e.name!=='AbortError')showToast(e.message,'warn');}};
disableAutoBackupFolder=async function(){await native.request('disableTree');store.set('auto_backup_enabled',false);await refreshAutoBackupUI();};
getAutoBackupHandle=async function(){return (await native.request('treeStatus')).available?{native:true}:null;};
let savedRevision = -1;
let backupTask = null;
let backupAgain = false;
async function saveCurrentBackup(){
  await androidStorageRead;
  if(_ratibArchiveRecoveryRequired || !store.get('auto_backup_enabled',false)) return;
  const revision = androidBackupRevision;
  if(savedRevision === revision) return;
  const folder = await native.request('treeStatus');
  if(!folder.available) throw Error('اختر مجلد النسخ التلقائية مجددًا لمنح إذن الكتابة.');
  const payload = await buildBackupPayload();
  const packed = await ratibPackBackup(payload);
  await native.sendFile(packed.blob,'ratib-auto-'+backupStamp()+packed.extension,'autoBackup');
  savedRevision = revision;
  store._setSilent('auto_backup_last_time',new Date().toISOString());
  await refreshAutoBackupUI();
}
writeAutoBackup = function(){
  if(backupTask){backupAgain=true;return backupTask;}
  backupTask = (async()=>{
    try {
      do {backupAgain=false;await saveCurrentBackup();} while(backupAgain);
      return true;
    } catch(e) {
      console.warn(e);
      showToast('تعذر حفظ النسخة التلقائية: '+e.message,'warn');
      return false;
    } finally {backupTask=null;}
  })();
  return backupTask;
};
refreshAutoBackupUI=async function(){
 const status=await native.request('treeStatus'),enabled=store.get('auto_backup_enabled',false)&&status.available;
 const el=id=>document.getElementById(id);
 if(el('autoBackupStatus'))el('autoBackupStatus').textContent=enabled?'✅ النسخ التلقائي مفعّل: '+status.name:'اختر مجلداً لحفظ النسخ تلقائياً';
 if(el('autoBackupLastTime'))el('autoBackupLastTime').textContent=enabled&&store.get('auto_backup_last_time',null)?'آخر نسخة: '+new Date(store.get('auto_backup_last_time')).toLocaleString('ar-EG-u-nu-latn'):'';
 for(const [id,visible] of [['autoBackupFolderBtn',!enabled],['changeAutoBackupFolderBtn',enabled],['autoBackupDisableBtn',enabled],['restoreFromAutoBackupBtn',enabled],['reauthorizeBackupFolderBtn',false]])if(el(id))el(id).style.display=visible?'inline-block':'none';
};
registerBiometricCredential=async function(){try{const id=await native.request('biometric',{register:true});saveSecurityConfigRaw({...getSecurityConfig(),bioCredentialId:id});return true;}catch(e){showToast(e.message,'warn');return false;}};
authenticateBiometric=async function(){try{await native.request('biometric',{credential:getSecurityConfig().bioCredentialId});const ok=await tryUnlockVaultWithSessionKey();if(ok){unlockAppScreen();proceedAppInit();showToast('تم التحقق ببصمة أندرويد','success');}else showToast('أدخل الرقم السري أولاً لفتح هذه الجلسة','warn');}catch(e){showToast(e.message,'warn');}};
const originalDisable=disableBiometricCredential;
disableBiometricCredential=function(){native.request('disableBiometric').catch(console.warn);return originalDisable();};
refreshAutoBackupUI().catch(console.warn);
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushStorage().catch(console.warn);if(store.get('auto_backup_enabled',false))writeAutoBackup();}});
})();
