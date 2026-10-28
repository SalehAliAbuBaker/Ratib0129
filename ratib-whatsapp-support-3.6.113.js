/* Ratib official web 3.6.113 — opt-in WhatsApp support, no accounting data transfer. */
(()=>{'use strict';
 const dialog=document.getElementById('ratibWhatsappSupportDialog');
 const form=document.getElementById('ratibWhatsappSupportForm');
 const message=document.getElementById('ratibWhatsappMessage');
 const error=document.getElementById('ratibWhatsappError');
 if(!dialog||!form||!message||!error)return;
 const number='967734915588';
 let returnFocus=null;
 function openSupport(){
  window.closeRatibSidebar?.();
  if(dialog.open)return;
  returnFocus=document.activeElement;
  error.textContent='';
  if(typeof dialog.showModal==='function')dialog.showModal();
  else {dialog.setAttribute('open','');dialog.classList.add('ratib-dialog-fallback');}
  message.focus({preventScroll:true});
 }
 function closeSupport(){
  if(typeof dialog.close==='function'&&dialog.open)dialog.close();
  else {dialog.removeAttribute('open');dialog.classList.remove('ratib-dialog-fallback');}
  returnFocus?.focus?.({preventScroll:true});
 }
 window.RatibSupportOpen=openSupport;
 document.getElementById('ratibWhatsappHelpBtn')?.addEventListener('click',openSupport);
 document.getElementById('ratibWhatsappSupportClose')?.addEventListener('click',closeSupport);
 document.getElementById('ratibWhatsappCancel')?.addEventListener('click',closeSupport);
 dialog.addEventListener('close',()=>{returnFocus?.focus?.({preventScroll:true});});
 message.addEventListener('input',()=>{error.textContent='';});
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const details=message.value.trim();
  if(!details){error.textContent='اكتب تفاصيل المشكلة أو المقترح أولًا.';message.focus();return;}
  const selection=form.querySelector('input[name="ratibWhatsappType"]:checked');
  const kind=selection?.value==='مقترح تطوير'?'مقترح تطوير':'مشكلة فنية';
  const version=String(document.getElementById('appVersionLabel')?.textContent||'').trim();
  const body=['مرحبًا، رسالة من تطبيق راتب', 'نوع الرسالة: '+kind,version, 'التفاصيل:',details].filter(Boolean).join('\n');
  const url='https://wa.me/'+number+'?text='+encodeURIComponent(body);
  /* Sending requires the user to explicitly press Send in WhatsApp. */
  window.open(url,'_blank','noopener,noreferrer');
 });
})();
