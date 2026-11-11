/* Ratib: selectable 7-second remembrance banner, shared by lock and home.
   Deliberately no reads/writes of transactions or financial totals. */
(()=>{'use strict';
 const CONFIG_KEY='ratib_public_adhkar_v1';
 const ROTATION_KEY='ratib_adhkar_next_v1';
 const STORAGE_KEY='adhkar_messages_v1';
 const DEFAULTS=[
   'لا تنس ذكر الله والصلاة والسلام على رسول الله صلى الله عليه وآله وصحبه',
   'سبحان الله وبحمده، سبحان الله العظيم',
   'أستغفر الله العظيم وأتوب إليه'
 ];
 const byId=id=>document.getElementById(id);
 const clean=data=>Array.isArray(data)?Array.from({length:3},(_,i)=>String(data[i]??'').trim().slice(0,350)):DEFAULTS.slice();
 const active=list=>list.filter(Boolean);
 const publicRead=()=>{
   try{const raw=localStorage.getItem(CONFIG_KEY);return raw===null?null:clean(JSON.parse(raw));}
   catch(_){return null;}
 };
 const savedRead=()=>{
   try{
     if(typeof store==='undefined'||!window.__ratibProceedInitialized)return null;
     const saved=store.get(STORAGE_KEY,null);
     return Array.isArray(saved)?clean(saved):null;
   }catch(_){return null;}
 };
 let messages=publicRead()||DEFAULTS.slice(),chosen='',started=false;
 const cycle=()=>{
   const values=active(messages);
   if(!values.length){chosen='';return;}
   let previous=-1;try{const saved=localStorage.getItem(ROTATION_KEY);if(saved!==null){previous=Number(saved);if(!Number.isSafeInteger(previous)||previous<0)previous=-1;}}catch(_){}
   const next=(previous+1)%values.length;
   chosen=values[next];
   try{localStorage.setItem(ROTATION_KEY,String(next));}catch(_){}
 };
 cycle(); // Exactly once per full page load, never on tab/page navigation.
 function banner(surface,id){
   if(!surface)return null;
   let el=byId(id);
   if(!el){el=document.createElement('p');el.id=id;el.className='ratib-adhkar-banner no-print';surface.append(el);}
   el.classList.add('ratib-adhkar-banner');
   el.setAttribute('aria-label','ذكر');
   // Replace the old home banner node, detaching legacy 5-second event handlers.
   if(id==='ratibHomeDhikr'&&el.dataset.ratibAdhkar20261111!=='1'){
     const clone=el.cloneNode(false);el.replaceWith(clone);el=clone;
   }
   el.dataset.ratibAdhkar20261111='1';
   return el;
 }
 function write(el){
   if(!el)return;
   el.replaceChildren();
   if(!chosen){el.hidden=true;el.classList.remove('ratib-dhikr-visible');return;}
   const line=document.createElement('span');line.className='ratib-dhikr-text';line.textContent=chosen;
   el.append(line);
   el.hidden=false;el.classList.add('ratib-dhikr-visible');
 }
 function loginBanner(){
   const screen=byId('lockScreen'),content=screen?.querySelector('.lock-content');
   if(!content)return;
   const el=banner(content,'ratibLoginDhikr');write(el);
   if(chosen&&el){
     const hide=()=>{el.classList.remove('ratib-dhikr-visible');el.hidden=true;};
     el.querySelector('.ratib-dhikr-text')?.addEventListener('animationend',hide,{once:true});
     setTimeout(hide,7000);
   }
 }
 function homeBanner(){
   if(started||!window.__ratibProceedInitialized)return;
   const lock=byId('lockScreen');
   if(lock&&getComputedStyle(lock).display!=='none')return;
   const home=byId('dashboardHomeContent');
   if(!home)return;
   started=true;
   const el=banner(home,'ratibHomeDhikr');
   home.prepend(el);
   write(el);
   if(!chosen)return;
   let finished=false;
   const hide=()=>{
     if(finished)return;finished=true;
     el.classList.remove('ratib-dhikr-visible');el.hidden=true;
   };
   el.querySelector('.ratib-dhikr-text')?.addEventListener('animationend',hide,{once:true});
   setTimeout(hide,7000);
 }
 function refreshSettings(){
   const saved=savedRead(),next=saved||publicRead()||messages;
   if(saved){
     messages=clean(saved);
     try{localStorage.setItem(CONFIG_KEY,JSON.stringify(messages));}catch(_){}
     // Login and home must always use the same selected message in this session.
     if(!active(messages).includes(chosen))chosen=active(messages)[0]||'';
   }else messages=clean(next);
   for(let i=0;i<3;i++){
     const input=byId('ratibAdhkarText'+(i+1));
     if(input&&document.activeElement!==input)input.value=messages[i];
   }
 }
 async function save(){
   const inputs=[1,2,3].map(i=>byId('ratibAdhkarText'+i));
   if(inputs.some(x=>!x))return;
   const proposed=clean(inputs.map(x=>x.value));
   const status=byId('ratibAdhkarSaveStatus'),button=byId('ratibAdhkarSaveBtn');
   if(button)button.disabled=true;
   try{
     if(typeof store==='undefined'||!window.__ratibProceedInitialized)throw Error('التطبيق لم يفتح بياناته بعد');
     store.set(STORAGE_KEY,proposed);
     await flushStorage(); // Mirror to public login config ONLY after protected save succeeds.
     messages=proposed;
     try{localStorage.setItem(CONFIG_KEY,JSON.stringify(messages));}catch(_){}
     if(!active(messages).includes(chosen))chosen=active(messages)[0]||'';
     if(status)status.textContent='تم حفظ الأذكار. سيُعرض ذكر واحد عند كل فتح أو تحديث للتطبيق.';
     if(typeof showToast==='function')showToast('حُفظت خيارات الأذكار','success');
   }catch(e){
     if(status)status.textContent='تعذّر حفظ الأذكار. أعد المحاولة.';
     if(typeof showToast==='function')showToast('تعذّر حفظ الأذكار','error');
   }finally{if(button)button.disabled=false;}
 }
 function init(){
   loginBanner();
   refreshSettings();
   byId('ratibAdhkarSaveBtn')?.addEventListener('click',save);
   window.addEventListener('ratib:app-ready',()=>{refreshSettings();requestAnimationFrame(homeBanner);});
   const lock=byId('lockScreen');
   if(lock)new MutationObserver(()=>requestAnimationFrame(homeBanner)).observe(lock,{attributes:true,attributeFilter:['style','class','hidden']});
   requestAnimationFrame(homeBanner);
 }
 window.RatibAdhkar={loadSettings:refreshSettings,getSelected:()=>chosen,getMessages:()=>messages.slice()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();