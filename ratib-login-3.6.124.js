/* Ratib trial 3.6.124 — password + prominent fingerprint sign-in.
 * Presentation only: original encrypted PIN and WebAuthn handlers remain authoritative.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function install(){
 const screen=$('lockScreen'),content=screen?.querySelector('.lock-content'),pin=$('pinInput');
 if(!screen||!content||!pin||screen.dataset.ratibLogin124==='1')return;
 screen.dataset.ratibLogin124='1';
 screen.classList.add('ratib-login124');
 const top=document.createElement('div');top.className='ratib-login-top';
 const logo=document.createElement('img');logo.src='Icons/icon-192.png';logo.alt='';
 const appName=document.createElement('span');appName.textContent='راتب للتنظيم والتدبير المالي';
 top.append(logo,appName);content.prepend(top);
 const title=$('lockTitle');if(title)title.textContent='تسجيل الدخول';
 const desc=$('lockDesc');if(desc)desc.textContent='كلمة المرور';
 pin.placeholder='كلمة المرور';pin.setAttribute('aria-label','كلمة المرور');
 const group=pin.closest('.form-group');
 if(group){
   group.classList.add('ratib-lock-form');
   const field=document.createElement('div');field.className='ratib-password-field';
   const key=document.createElement('span');key.className='ratib-password-icon';key.setAttribute('aria-hidden','true');
   key.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 2 2-2 2 1 2-2 2-2-2-4 4"/></svg>';
   const eye=document.createElement('button');eye.type='button';eye.className='ratib-password-eye';eye.setAttribute('aria-label','إظهار كلمة المرور');eye.setAttribute('aria-pressed','false');
   const iconShow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
   const iconHide='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A11.2 11.2 0 0 1 12 5c6 0 10 7 10 7a13.2 13.2 0 0 1-3.2 3.8M6.5 6.4C3.7 8.4 2 12 2 12s4 7 10 7c1.4 0 2.8-.4 4-1.1"/><path d="M10 10a3 3 0 0 0 4 4"/></svg>';
   eye.innerHTML=iconHide;
   eye.addEventListener('click',()=>{const showing=pin.type==='text';pin.type=showing?'password':'text';eye.innerHTML=showing?iconHide:iconShow;eye.setAttribute('aria-label',showing?'إظهار كلمة المرور':'إخفاء كلمة المرور');eye.setAttribute('aria-pressed',String(!showing));pin.focus({preventScroll:true});});
   field.append(key,pin,eye);group.append(field);
 }
 // Keep the existing security explanation; no recovery or decryption bypass is introduced.
 let forgot=$('forgotPinLink');
 if(!forgot){forgot=document.createElement('button');forgot.type='button';forgot.id='forgotPinLink';forgot.textContent='نسيت الرقم السري؟';}
 forgot.classList.add('ratib-forgot-pin');
 forgot.removeAttribute('style');forgot.removeAttribute('onclick');
 forgot.addEventListener('click',()=>{if(typeof window.showForgotPinInfo==='function'){window.showForgotPinInfo();return;}alert('لا توجد طريقة لاسترجاع الرقم السري وفك تشفير البيانات بدونه. هذا أمان حقيقي، ولا يوجد باب خلفي حتى لنا.');});
 const actionBox=[...content.querySelectorAll('button')].find(b=>b.getAttribute('onclick')?.includes('verifyPinLock'))?.parentElement;
 if(actionBox)actionBox.append(forgot);
 const nativeBio=$('bioUnlockBtn');
 const submit=[...content.querySelectorAll('button')].find(btn=>btn.getAttribute('onclick')?.includes('verifyPinLock'));
 if(submit){submit.textContent='تسجيل الدخول';submit.classList.add('ratib-login-submit');submit.type='button';}
 const bioArea=document.createElement('div');bioArea.className='ratib-login-fingerprint';
 const bio=document.createElement('button');bio.type='button';bio.className='ratib-fingerprint-trigger';bio.setAttribute('aria-label','الدخول ببصمة الإصبع');bio.title='الدخول ببصمة الإصبع';
 bio.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 12c5-7 16-8 22-1M9 18c3-14 27-18 35-5M5 24c0-13 8-22 20-22M12 29c-1-8 1-15 8-18 7-3 15 1 17 8 2 7-1 17-4 23M19 42c-5-8-6-15-4-22 2-7 13-10 18-3 4 5 3 14 0 21M25 44c-4-7-6-15-4-21 2-5 8-4 9 1 1 4 0 11-2 15M9 34c-2-7-2-13 0-19M40 25c0 6-1 12-4 18"/></svg>';
 const label=document.createElement('div');label.className='ratib-fingerprint-label';label.textContent='الدخول بالبصمة';
 const info=document.createElement('div');info.className='ratib-fingerprint-info';info.setAttribute('role','status');
 bio.addEventListener('click',()=>{
   if(nativeBio&&nativeBio.style.display!=='none'&&typeof window.authenticateBiometric==='function'){window.authenticateBiometric();return;}
   info.textContent='البصمة غير متاحة حاليًا؛ استخدم كلمة المرور أو فعّلها من إعدادات الأمان في الجهاز المدعوم.';
 });
 bioArea.append(bio,label,info);content.append(bioArea);
 const version=document.createElement('small');version.className='ratib-login-version';version.textContent=window.ratibCurrentTrialVersionLabel?.()||$('appVersionLabel')?.textContent?.trim()||'إصدار تجريبي';content.append(version);
 window.ratibSyncTrialVersion?.();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();