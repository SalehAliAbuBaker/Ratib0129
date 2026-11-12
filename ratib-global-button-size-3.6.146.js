/* Ratib 3.6.182: seven-step font and button sliders.
   UI-only preferences: older five values remain mapped; accounting and print are untouched. */
(()=>{'use strict';
 const KEY='ratib_ui_button_size_v1',LEGACY='commerce_button_size_v1',FONT_KEY='ratib_ui_font_size_v1';
 const choices=['xxsmall','xsmall','small','medium','large','xlarge','xxlarge'];
 const labels=['صغير للغاية','صغير جدًا','صغير','متوسط','كبير','كبير جدًا','كبير للغاية'];
 const normalize=value=>value==='normal'?'medium':choices.includes(value)?value:'medium';
 const fromStep=step=>choices[Math.max(0,Math.min(6,(Number(step)||4)-1))];
 const stepOf=value=>choices.indexOf(normalize(value))+1;
 const fontPref=()=>{try{return normalize(localStorage.getItem(FONT_KEY));}catch(_){return 'medium';}};
 const pref=()=>{
  try{
   const saved=localStorage.getItem(KEY);
   if(choices.includes(saved))return saved;
   const legacy=typeof store!=='undefined'?store.get(LEGACY,'medium'):localStorage.getItem(LEGACY);
   return normalize(legacy);
  }catch(_){return 'medium';}
 };
 function syncSlider(id,value){
  const step=stepOf(value),slider=document.getElementById(id);
  if(slider){
   if(slider.value!==String(step))slider.value=String(step);
   slider.setAttribute('aria-valuetext',labels[step-1]);
  }
  const output=document.getElementById(id+'Value');
  if(output)output.textContent='المستوى '+step+' من 7 — '+labels[step-1];
 }
 function sync(){syncSlider('ratibGlobalFontSize',fontPref());syncSlider('ratibGlobalButtonSize',pref());}
 function applyFont(value,persist=true){
  const setting=normalize(value);
  document.documentElement.dataset.ratibFontSize=setting;
  if(persist)try{localStorage.setItem(FONT_KEY,setting);}catch(_){}
  syncSlider('ratibGlobalFontSize',setting);
  return setting;
 }
 function apply(value,persist=true){
  const setting=normalize(value);
  document.documentElement.dataset.ratibButtonSize=setting;
  if(persist)try{localStorage.setItem(KEY,setting);}catch(_){}
  if(persist)try{if(typeof store!=='undefined'&&typeof store.set==='function')store.set(LEGACY,setting);}catch(_){}
  document.querySelectorAll('#pageCommerce .rc-app,.ratib-commerce-shortcuts').forEach(el=>el.setAttribute('data-rc-button-size',setting));
  syncSlider('ratibGlobalButtonSize',setting);
  window.dispatchEvent(new CustomEvent('ratib:button-size',{detail:{size:setting}}));
  return setting;
 }
 function bind(){
  apply(pref(),false);applyFont(fontPref(),false);
  const change=event=>{
   if(event.target?.id==='ratibGlobalButtonSize')apply(fromStep(event.target.value));
   if(event.target?.id==='ratibGlobalFontSize')applyFont(fromStep(event.target.value));
  };
  document.addEventListener('input',change,true);
  document.addEventListener('change',change,true);
 }
 window.RatibButtonSizing={get:pref,set:apply,getFont:fontPref,setFont:applyFont,level:stepOf,sync};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();