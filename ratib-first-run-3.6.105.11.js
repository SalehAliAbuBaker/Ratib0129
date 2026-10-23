/* Ratib 3.6.105.11 — one-time first-use setup. No existing data migration. */
(function(global){
'use strict';
const DONE='ratib_first_run_done_v1',PROGRESS='ratib_first_run_progress_v1';
const COUNTRIES=[['YE','اليمن','YER'],['SA','السعودية','SAR'],['AE','الإمارات','AED'],['OM','سلطنة عُمان','OMR'],['QA','قطر','QAR'],['KW','الكويت','KWD'],['BH','البحرين','BHD'],['JO','الأردن','JOD'],['EG','مصر','EGP'],['IQ','العراق','IQD'],['MA','المغرب','MAD'],['GB','المملكة المتحدة','GBP'],['US','الولايات المتحدة','USD'],['OTHER','دولة أخرى','']];
const CURRENCIES=[['YER','ريال يمني'],['SAR','ريال سعودي'],['AED','درهم إماراتي'],['OMR','ريال عُماني'],['QAR','ريال قطري'],['KWD','دينار كويتي'],['BHD','دينار بحريني'],['JOD','دينار أردني'],['EGP','جنيه مصري'],['IQD','دينار عراقي'],['MAD','درهم مغربي'],['GBP','جنيه إسترليني'],['USD','دولار أمريكي'],['EUR','يورو']];
const $=id=>document.getElementById(id);
let pending=false,opened=false,busy=false,step=0,modal=null;
function progress(){return store.get(PROGRESS,null);}
function workspaceExists(){
 try{
  if(typeof getSecurityConfig==='function'&&getSecurityConfig().enabled)return true;
  return ['header_config','country_currency_settings_v1','account_catalog','account_tree','plan','history','commerce_v1','default_accounts','reminders','cats','account_codes','account_subgroup_parents','account_currencies','import_currencies'].some(k=>store.get(k,null)!==null);
 }catch(_){return true;}
}
function prepare(){
 if(pending)return true;
 try{
  if(store.get(DONE,null))return false;
  const saved=progress();
  if(saved&&saved.version===1){pending=true;step=Math.max(0,Math.min(3,Number(saved.step)||0));return true;}
  if(workspaceExists())return false;
  // Save the first-use marker before the built-in account chart creates defaults.
  store.set(PROGRESS,{version:1,step:0,startedAt:new Date().toISOString()});
  pending=true;step=0;return true;
 }catch(e){console.warn('First-use detection:',e);return false;}
}
function isActive(){return pending;}
function style(){
 if($('ratibFirstRunCss'))return;
 const el=document.createElement('style');el.id='ratibFirstRunCss';
 el.textContent=[
 '#ratibFirstRunOverlay[hidden]{display:none!important}',
 '#ratibFirstRunOverlay{position:fixed;inset:0;background:rgba(8,20,25,.70);z-index:25000;display:grid;place-items:center;padding:12px;direction:rtl}',
 '#ratibFirstRunOverlay .rfr-dialog{width:min(100%,490px);max-height:94dvh;overflow-y:auto;background:var(--card,#fff);color:var(--text,#1d2731);border:1px solid var(--border,#d0d9dd);border-radius:15px;padding:18px;box-shadow:0 16px 44px rgba(0,0,0,.3);font-family:inherit}',
 '#ratibFirstRunOverlay h2{font-size:1.23rem;line-height:1.5;margin:0 0 8px;color:var(--accent,var(--text))}',
 '#ratibFirstRunOverlay .rfr-counter{font-weight:700;color:var(--muted,#64748b);margin:0 0 10px}',
 '#ratibFirstRunOverlay .rfr-note{font-size:.95rem;line-height:1.8;margin:0 0 13px}',
 '#ratibFirstRunOverlay .rfr-fields{display:grid;gap:11px}',
 '#ratibFirstRunOverlay label{font-weight:700;display:grid;gap:5px;font-size:.94rem}',
 '#ratibFirstRunOverlay input:not([type="checkbox"]),#ratibFirstRunOverlay select{box-sizing:border-box;width:100%;background:var(--bg,#fff);color:var(--text,#222);min-height:44px;border:1px solid var(--border,#bbc);border-radius:8px;padding:8px 10px;font:inherit;font-size:16px}',
 '#ratibFirstRunOverlay .rfr-check{display:flex;gap:10px;align-items:center}',
 '#ratibFirstRunOverlay .rfr-check input{width:20px;height:20px;flex-shrink:0;margin:0}',
 '#ratibFirstRunOverlay .rfr-hint{font-size:.83rem;line-height:1.65;color:var(--muted,#64748b)}',
 '#ratibFirstRunOverlay .rfr-actions{display:flex;gap:9px;margin-top:16px}',
 '#ratibFirstRunOverlay .rfr-actions button{flex:1;min-height:44px;padding:7px;font-size:.95rem}',
 '#ratibFirstRunOverlay .rfr-error{min-height:16px;color:var(--danger,#b91c1c);line-height:1.55;margin:7px 0}',
 '#ratibFirstRunOverlay button:disabled{opacity:.6;cursor:wait}',
 '@media print{#ratibFirstRunOverlay{display:none!important}}'
 ].join('\n');
 document.head.append(el);
}
function create(){
 style();modal=$('ratibFirstRunOverlay');if(modal)return;
 modal=document.createElement('div');modal.id='ratibFirstRunOverlay';modal.className='no-print';modal.hidden=true;
 modal.innerHTML='<section class="rfr-dialog" role="dialog" aria-modal="true" aria-labelledby="rfrTitle"><p class="rfr-counter" id="rfrCounter"></p><h2 id="rfrTitle"></h2><p class="rfr-note" id="rfrDescription"></p><div class="rfr-fields" id="rfrFields"></div><p class="rfr-error" id="rfrError" role="alert"></p><div class="rfr-actions"><button type="button" class="btn btn-ghost" id="rfrBack">السابق</button><button type="button" class="btn btn-primary" id="rfrNext">حفظ ومتابعة</button></div></section>';
 document.body.append(modal);
 $('rfrBack').addEventListener('click',()=>{if(busy||step===0)return;step--;void saveProgress().then(draw).catch(report);});
 $('rfrNext').addEventListener('click',()=>{void next();});
}
function report(error){$('rfrError').textContent=String(error?.message||error||'تعذر الحفظ، أعد المحاولة.');console.warn('Ratib setup:',error);}
function draw(){
 create();
 const titles=['اسم الشركة أو صاحب الحساب','الدولة والعملة الافتراضية','الإملاء الصوتي','الأمان وقفل الحماية'];
 const notes=['هذا الاسم سيظهر في ترويسة التقارير والمستندات. يمكن استخدام اسم مؤسسة أو اسم شخصي.','اختر دولة الاستخدام والعملة الأساسية للعمليات الجديدة فقط.','اختر إظهار زر الميكروفون ولغة الإملاء. لن يعمل التسجيل تلقائيًا.','يمكن تفعيل التشفير برقم سري، أو اختيار التشغيل بدون قفل الآن.'];
 $('rfrCounter').textContent='الإعداد الأولي — '+(step+1)+' من 4';
 $('rfrTitle').textContent=titles[step];$('rfrDescription').textContent=notes[step];
 $('rfrError').textContent='';$('rfrBack').hidden=step===0;
 $('rfrNext').textContent=step===3?'اعتماد وفتح شجرة الحسابات':'حفظ ومتابعة';
 $('rfrFields').replaceChildren();
 if(step===0){
  $('rfrFields').innerHTML='<label>اسم الشركة / الاسم الشخصي<input type="text" id="rfrName" maxlength="140" placeholder="اكتب الاسم" required></label><label>العنوان أو بيانات التواصل (اختياري)<input type="text" id="rfrDetails" maxlength="250" placeholder="المدينة — الهاتف — التفاصيل"></label><label class="rfr-check"><input type="checkbox" id="rfrHeader" checked><span>إظهار الترويسة في المطبوعات</span></label>';
  const cfg=getHeaderConfig(),previous=store.get('header_config',null);
  $('rfrName').value=previous?cfg.name:'';$('rfrDetails').value=cfg.details||'';$('rfrHeader').checked=cfg.show!==false;
  $('rfrName').focus({preventScroll:true});
 }else if(step===1){
  $('rfrFields').innerHTML='<label>دولة الاستخدام<select id="rfrCountry"></select></label><label>العملة الأساسية<select id="rfrCurrency"></select></label><p class="rfr-hint">اقتراح الدولة يعتمد على لغة الجهاز، وليس على تحديد الموقع. يمكن تغييره في أي وقت من الإعدادات.</p>';
  const country=$('rfrCountry'),currency=$('rfrCurrency');
  COUNTRIES.forEach(([code,name])=>country.add(new Option(name,code)));
  CURRENCIES.forEach(([code,name])=>currency.add(new Option(name+' ('+code+')',code)));
  const saved=global.RatibCountryCurrency?.read?.(),suggest=global.RatibCountryCurrency?.localeSuggestion?.();
  country.value=saved?.country||suggest?.code||'YE';
  currency.value=saved?.currency||COUNTRIES.find(c=>c[0]===country.value)?.[2]||'YER';
  country.addEventListener('change',()=>{const code=COUNTRIES.find(c=>c[0]===country.value)?.[2];if(code)currency.value=code;});
 }else if(step===2){
  const cfg=global.RatibVoiceDictation?.values?.()||{visible:false,language:'ar-SA'};
  $('rfrFields').innerHTML='<label class="rfr-check"><input type="checkbox" id="rfrVoice"><span>إظهار زر الإملاء الصوتي في الحقول</span></label><label>لغة الإملاء<select id="rfrLanguage"><option value="ar-SA">العربية</option><option value="ar-YE">العربية — اليمن</option><option value="ar-EG">العربية — مصر</option></select></label><button type="button" class="btn btn-ghost" id="rfrMicTest">فحص إذن الميكروفون (اختياري)</button><p class="rfr-hint" id="ratibFirstRunMicStatus" role="status">قد تحتاج خدمة التعرف على الصوت إلى الإنترنت. يُطلب الإذن عند الضغط على زر الفحص فقط.</p>';
  $('rfrVoice').checked=!!cfg.visible;$('rfrLanguage').value=cfg.language||'ar-SA';
  $('rfrMicTest').addEventListener('click',()=>{void global.RatibVoiceDictation?.requestMicrophoneAccess?.('ratibFirstRunMicStatus');});
 }else{
  $('rfrFields').innerHTML='<label class="rfr-check"><input type="checkbox" id="rfrSecurity"><span>تفعيل قفل التطبيق برقم سري</span></label><div id="rfrPinArea" hidden><label>رقم سري من 4 إلى 8 أرقام<input id="rfrPin" type="password" maxlength="8" inputmode="numeric" autocomplete="new-password"></label><label>تأكيد الرقم السري<input id="rfrPinConfirm" type="password" maxlength="8" inputmode="numeric" autocomplete="new-password"></label></div><p class="rfr-hint">تنبيه: نسيان رمز تشفير البيانات قد يمنع استرجاعها. يمكن تفعيل البصمة لاحقًا على أجهزة أندرويد المدعومة.</p>';
  $('rfrSecurity').addEventListener('change',()=>{$('rfrPinArea').hidden=!$('rfrSecurity').checked;});
 }
}
async function saveProgress(){
 store.set(PROGRESS,{version:1,step,startedAt:progress()?.startedAt||new Date().toISOString()});
 await flushStorage();
}
async function next(){
 if(busy)return;busy=true;$('rfrNext').disabled=true;$('rfrBack').disabled=true;$('rfrError').textContent='';
 try{
  if(step===0){
   const name=$('rfrName').value.trim(),details=$('rfrDetails').value.trim(),show=$('rfrHeader').checked;
   if(!name)throw Error('أدخل اسم الشركة أو صاحب الحساب.');
   saveHeaderConfig({name,details,show});await flushStorage();
   if($('settingOrgName'))$('settingOrgName').value=name;
   if($('settingOrgDetails'))$('settingOrgDetails').value=details;
   if($('settingShowHeader'))$('settingShowHeader').checked=show;
  }else if(step===1){
   const service=global.RatibCountryCurrency;
   if(!service?.saveChoice)throw Error('إعداد العملات غير جاهز. أعد فتح التطبيق.');
   if(await service.saveChoice($('rfrCountry').value,$('rfrCurrency').value)!==true)throw Error('تعذر تثبيت العملة. أعد المحاولة.');
  }else if(step===2){
   const service=global.RatibVoiceDictation;
   if(!service?.configure)throw Error('إعداد الإملاء الصوتي غير جاهز. أعد فتح التطبيق.');
   service.configure({visible:$('rfrVoice').checked,language:$('rfrLanguage').value});
  }else{
   if($('rfrSecurity').checked){
    const pin=$('rfrPin').value;
    if(!/^[0-9]{4,8}$/.test(pin))throw Error('الرقم السري يجب أن يكون من 4 إلى 8 أرقام.');
    if(pin!==$('rfrPinConfirm').value)throw Error('الرقمان السريان غير متطابقين.');
    await enableVaultEncryption(pin);
    $('rfrPin').value='';$('rfrPinConfirm').value='';
   }
   store.set(DONE,{version:1,finishedAt:new Date().toISOString()});store.remove(PROGRESS);
   await flushStorage();pending=false;opened=false;modal.hidden=true;modal.setAttribute('aria-hidden','true');
   try{global.localStorage.setItem('ratib-account-tree-simple-view','1');}catch(_){}
   global.RatibInteractiveTree?.setSimple?.(true);
   global.RatibSettingsOpen?.('tree');
   if(typeof showToast==='function')showToast('اكتمل الإعداد الأولي. هذه شجرة الحسابات المبسطة.','success');
   return;
  }
  step++;await saveProgress();draw();
 }catch(error){report(error);}
 finally{busy=false;if($('rfrNext'))$('rfrNext').disabled=false;if($('rfrBack'))$('rfrBack').disabled=false;}
}
function start(){
 if(!pending||opened)return;opened=true;create();modal.hidden=false;modal.removeAttribute('aria-hidden');draw();
}
global.RatibFirstRunSetup=Object.freeze({prepare,start,isActive});
})(window);
