/* Ratib Trial 3.6.146: one UI button-size preference for all interactive views.
   Presentation only; deliberately never changes accounting inputs or vouchers. */
(()=>{'use strict';
 const KEY='ratib_ui_button_size_v1',LEGACY='commerce_button_size_v1',FONT_KEY='ratib_ui_font_size_v1';
 const FONT_CHOICES=['xsmall','small','medium','large','xlarge'];
 const report=(msg)=>{const s=document.getElementById('ratibSizeSaveStatus');if(s)s.textContent=msg;};
 const readBack=(key,expected)=>{
  try{return localStorage.getItem(key)===expected;}catch(_){return false;}
 };
 const normalizeFont=x=>x==='normal'?'medium':FONT_CHOICES.includes(x)?x:'medium';
 const fontPref=()=>{
  try{const value=localStorage.getItem(FONT_KEY);return normalizeFont(value);}catch(_){return 'medium';}
 };
 const applyFont=(value,persist=true)=>{
  const setting=normalizeFont(value);
  document.documentElement.dataset.ratibFontSize=setting;
  if(persist){
   try{localStorage.setItem(FONT_KEY,setting);}catch(_){}
   report(readBack(FONT_KEY,setting)?'تم حفظ حجم الخط وتطبيقه على الواجهة.':'تغير حجم الخط مؤقتًا، لكن تعذر حفظه.');
  }
  const picker=document.getElementById('ratibGlobalFontSize');
  if(picker&&picker.value!==setting)picker.value=setting;
  return setting;
 };
 const choices=['xsmall','small','medium','large','xlarge'];
 const valid=x=>choices.includes(x)?x:null;
 const pref=()=>{
   try{return valid(localStorage.getItem(KEY))||valid(typeof store!=='undefined'?store.get(LEGACY,'medium'):localStorage.getItem(LEGACY))||'medium';}
   catch(_){return 'medium';}
 };
 function apply(next,persist=true){
   const size=valid(next)||'medium';
   document.documentElement.setAttribute('data-ratib-button-size',size);
   if(persist){
    try{localStorage.setItem(KEY,size);}catch(_){}
    try{if(typeof store!=='undefined'&&typeof store.set==='function')store.set(LEGACY,size);}catch(_){}
    report(readBack(KEY,size)?'تم حفظ حجم الأزرار وتطبيقه على الواجهة.':'تغير حجم الأزرار مؤقتًا، لكن تعذر حفظه.');
   }
   for(const el of document.querySelectorAll('#pageCommerce .rc-app,.ratib-commerce-shortcuts'))el.setAttribute('data-rc-button-size',size);
   const current=document.getElementById('ratibGlobalButtonSize');
   if(current&&current.value!==size)current.value=size;
   window.dispatchEvent(new CustomEvent('ratib:button-size',{detail:{size}}));
   return size;
 }
 function bind(){
   apply(pref(),false);
   applyFont(fontPref(),false);
   // The setting card is created by the approved sidebar; event delegation works
   // regardless of the order in which its other modules finish initializing.
   const onSizeChoice=event=>{
      const picker=event.target;
      if(picker?.id==='ratibGlobalButtonSize'){
        const chosen=valid(picker.value)||'medium';
        if(pref()!==chosen||document.documentElement.dataset.ratibButtonSize!==chosen)apply(chosen,true);
      }
      if(picker?.id==='ratibGlobalFontSize'){
        const chosen=normalizeFont(picker.value);
        if(fontPref()!==chosen||document.documentElement.dataset.ratibFontSize!==chosen)applyFont(chosen,true);
      }
   };
   // Android Chromium may emit input when a native picker commits before change.
   // Both events are supported, while unchanged values avoid duplicate persistence.
   document.addEventListener('input',onSizeChoice,true);
   document.addEventListener('change',onSizeChoice,true);
 }
 window.RatibButtonSizing={get:pref,set:apply,getFont:fontPref,setFont:applyFont};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();