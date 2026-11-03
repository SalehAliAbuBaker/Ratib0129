/* Ratib trial 3.6.109.17 — explicit backup due card. No background OAuth popups. */
(function(global){
 'use strict';
 const KEY='ratib_backup_reminder_postpone_until_v1';
 const POSTPONE_MS=60*60*1000;
 const LOCAL_DUE_MS=3*60*60*1000;
 let busy=false;
 const el=id=>document.getElementById(id);
 function localDue(now=Date.now()){
  if(!store.get('auto_backup_enabled',false))return false;
  const last=Date.parse(store.get('auto_backup_last_time','')||'');
  return !Number.isFinite(last)||now-last>=LOCAL_DUE_MS;
 }
 function currentDue(){
  return {cloud:typeof cloudBackupDue==='function'&&cloudBackupDue(),
          local:localDue()};
 }
 function create(){
  const existing=el('ratibBackupDueCard');
  if(existing)return existing;
  if(!document.body)return null;
  const card=document.createElement('aside');
  card.id='ratibBackupDueCard';
  card.className='ratib-backup-due-card no-print';
  card.setAttribute('role','region');
  card.setAttribute('aria-labelledby','ratibBackupDueTitle');
  card.hidden=true;
  card.innerHTML='<h2 id="ratibBackupDueTitle">💾 حان موعد النسخ الاحتياطي</h2>'+
    '<p id="ratibBackupDueMessage"></p>'+
    '<p id="ratibBackupDueFeedback" role="status" aria-live="polite"></p>'+
    '<div class="ratib-backup-due-actions">'+
    '<button type="button" class="btn btn-primary" id="ratibBackupDueSave">حفظ النسخ الآن</button>'+
    '<button type="button" class="btn btn-ghost" id="ratibBackupDueLater">تأجيل</button></div>';
  document.body.appendChild(card);
  el('ratibBackupDueSave').addEventListener('click',()=>{void saveDue();});
  el('ratibBackupDueLater').addEventListener('click',postpone);
  return card;
 }
 function hide(){const card=el('ratibBackupDueCard');if(card)card.hidden=true;}
 function check(){
  if(busy)return;
  if(typeof _appExited!=='undefined'&&_appExited)return hide();
  if(document.hidden||global.RatibFirstRunSetup?.isActive?.())return hide();
  const due=currentDue();
  if(!due.cloud&&!due.local)return hide();
  const until=Number(store.get(KEY,0))||0;
  if(Date.now()<until)return hide();
  const card=create();if(!card)return;
  el('ratibBackupDueMessage').textContent=due.cloud&&due.local
    ? 'النسخ السحابي والمحلي مستحقان. احفظهما الآن، أو أجّل التذكير لمدة ساعة.'
    : due.cloud
      ? 'النسخة السحابية على Google Drive مستحقة. يمكن حفظها الآن أو تأجيل التذكير ساعة.'
      : 'النسخة المحلية في المجلد الذي اخترته مستحقة. يمكن حفظها الآن أو تأجيل التذكير ساعة.';
  card.hidden=false;
 }
 function postpone(){
  if(busy)return;
  store.set(KEY,Date.now()+POSTPONE_MS);
  try{Promise.resolve(flushStorage()).catch(error=>console.warn('Backup reminder postpone save:',error));}catch(error){console.warn('Backup postpone:',error);}
  const feedback=el('ratibBackupDueFeedback');if(feedback)feedback.textContent='';
  hide();
  if(typeof showToast==='function')showToast('تم تأجيل تذكير النسخ الاحتياطي لمدة ساعة.','info');
 }
 async function saveDue(){
  if(busy)return;
  const due=currentDue();
  if(!due.cloud&&!due.local){hide();return;}
  busy=true;
  const save=el('ratibBackupDueSave'),later=el('ratibBackupDueLater');
  if(save){save.disabled=true;save.textContent='جارٍ حفظ النسخ…';}
  if(later)later.disabled=true;
  const feedback=el('ratibBackupDueFeedback');
  if(feedback)feedback.textContent='يجري حفظ النسخ المطلوبة والتحقق من النتيجة.';
  try{
   // Start Google OAuth synchronously within this explicit tap; never from an interval.
   const cloudTask=due.cloud?runCloudBackup(true,'trial'):null;
   const localTask=due.local?writeAutoBackup():null;
   const results=await Promise.all([
    cloudTask?cloudTask.catch(error=>{console.warn('Manual cloud backup:',error);return false;}):Promise.resolve(true),
    localTask?localTask.catch(error=>{console.warn('Manual local backup:',error);return false;}):Promise.resolve(true)
   ]);
   const okCloud=results[0]===true,okLocal=results[1]===true;
   if(okCloud&&okLocal){
    if(feedback)feedback.textContent='';
    hide();
    if(typeof showToast==='function')showToast('تم حفظ النسخ الاحتياطية المستحقة بنجاح.','success');
   }else{
    if(feedback)feedback.textContent=(due.cloud&&!okCloud?'لم يتم تأكيد النسخة السحابية. تحقق من الإنترنت وإذن Google. ':'')+
     (due.local&&!okLocal?'لم تكتمل النسخة المحلية. راجع إذن المجلد من إعدادات النسخ الاحتياطي.':'');
    if(typeof showToast==='function')showToast('لم تكتمل جميع النسخ؛ لم يُسجّل نجاح غير مؤكد.','warn');
   }
  }finally{
   busy=false;
   if(save){save.disabled=false;save.textContent='حفظ النسخ الآن';}
   if(later)later.disabled=false;
   check();
  }
 }
 global.RatibBackupDueCard=Object.freeze({check,currentDue,postpone,saveDue});
 // If the app was already unlocked before deferred scripts ran, the existing
 // cloud-check timer will still perform the scheduled due check.
})(window);
