/* Ratib 3.6.161 — state/accessibility adapter for the approved unified account-lock design.
   Do not replace buttons, child elements, click listeners, stored locks or voucher calculations. */
(function(){
 'use strict';
 const selector='#lockDebitAccBtn,#lockCreditAccBtn,#ratibLockSource,#ratibLockCounter,.ratib-account-lock';
 let pending=false;
 function simpleState(button){
  if(button.id==='lockDebitAccBtn'&&typeof voucherDebitLocked==='boolean')return voucherDebitLocked;
  if(button.id==='lockCreditAccBtn'&&typeof voucherCreditLocked==='boolean')return voucherCreditLocked;
  // Fallback for older screens: glyphs may already be decorated by ratib-theme.js.
  return !!button.querySelector('.ratib-ui-glyph[data-icon="lock"]')||
   /🔒|🔐/.test(button.textContent||'');
 }
 function sync(){
  const root=document.getElementById('pageExpenses');
  if(!root)return;
  root.querySelectorAll(selector).forEach(button=>{
   if(button.tagName!=='BUTTON')return;
   const simple=button.id==='lockDebitAccBtn'||button.id==='lockCreditAccBtn';
   const pressed=simple?simpleState(button):button.getAttribute('aria-pressed')==='true';
   if(simple&&button.getAttribute('aria-pressed')!==String(pressed))
    button.setAttribute('aria-pressed',String(pressed));
   if(simple){
    const label=button.title||(pressed?'إلغاء تثبيت الحساب':'تثبيت الحساب');
    if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
   }
  });
 }
 function schedule(){
  if(pending)return;
  pending=true;
  queueMicrotask(()=>{pending=false;sync();});
 }
 function install(){
  const root=document.getElementById('pageExpenses');
  if(!root)return;
  sync();
  const observer=new MutationObserver(schedule);
  observer.observe(root,{
   childList:true,subtree:true,characterData:true,attributes:true,
   attributeFilter:['aria-pressed','title']
  });
  window.addEventListener('pageshow',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 }
 window.RatibUnifiedAccountLocks={sync};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
