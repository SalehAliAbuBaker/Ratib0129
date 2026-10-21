/* Ratib 3.6.143 (trial): small home icons, quiet dhikr footer and secure login presentation.
   The authentication, encryption and biometric verification handlers are left unchanged. */
(()=>{'use strict';
 const d=document,byId=id=>d.getElementById(id);
 const dhikr='لاتنس ذكر الله والصلاة والسلام على رسول الله صلى الله عليه وآله وصحبه';
 function addDhikr(){
   const home=byId('dashboardHomeContent');
   if(!home||byId('ratibHomeDhikr'))return;
   const line=d.createElement('p');line.id='ratibHomeDhikr';line.className='ratib-home-dhikr no-print';
   line.textContent=dhikr;
   home.append(line);
 }
 function refineLogin(){
   const screen=byId('lockScreen'),content=screen?.querySelector('.lock-content');
   if(!screen||!content||screen.dataset.ratib143==='1')return;
   screen.dataset.ratib143='1';screen.classList.add('ratib-login143');
   const heading=byId('lockTitle'),desc=byId('lockDesc'),pin=byId('pinInput');
   if(heading){heading.textContent='مرحبًا بك مجددًا';heading.removeAttribute('style');}
   if(desc){desc.textContent='رمز الدخول';desc.removeAttribute('style');}
   if(pin){pin.placeholder='أدخل رمز الدخول';pin.setAttribute('aria-label','رمز الدخول');}
   const submit=content.querySelector('.ratib-login-submit');
   if(submit)submit.textContent='فتح راتب';
   const version=content.querySelector('.ratib-login-version');
   if(version)version.textContent='الإصدار 3.6.146 (تجريبية)';
   const top=content.querySelector('.ratib-login-top');
   if(top&&!top.querySelector('.ratib-login-name')){
     const text=top.querySelector('span');
     if(text){text.classList.add('ratib-login-name');text.replaceChildren(
       Object.assign(d.createElement('strong'),{textContent:'راتب'}),
       Object.assign(d.createElement('small'),{textContent:'للتنظيم والتدبير المالي'})
     );}
   }
   const nativeBio=byId('bioUnlockBtn'),bioArea=content.querySelector('.ratib-login-fingerprint');
   const bioIcon=bioArea?.querySelector('.ratib-fingerprint-trigger svg');
   if(bioIcon){
     bioIcon.setAttribute('viewBox','0 0 24 24');
     bioIcon.innerHTML='<path d="M12 11a2.5 2.5 0 0 0-2.5 2.5c0 2.4-.1 4.6-1 6.5M12 7a6.5 6.5 0 0 1 6.5 6.5c0 2.6-.3 5-1.4 7M5.5 13.5a6.5 6.5 0 0 1 13 0M8 5.2a10 10 0 0 1 13 8.3M3 13.5A9 9 0 0 1 6 6.9M13.8 13.5c0 3.3-.4 6.1-1.3 8"/>';
   }
   // A visual fingerprint option must never appear when the original authenticator is unavailable.
   // The existing native button remains the sole authority; no fabricated biometric fallback.
   if(bioArea&&nativeBio){
     const refresh=()=>{const ready=nativeBio.style.display!=='none'&&!nativeBio.disabled;
       bioArea.hidden=!ready;bioArea.setAttribute('aria-hidden',String(!ready));};
     refresh();
     new MutationObserver(refresh).observe(nativeBio,{attributes:true,attributeFilter:['style','disabled']});
     new MutationObserver(refresh).observe(screen,{attributes:true,attributeFilter:['style']});
   }else if(bioArea){bioArea.hidden=true;}
 }
 function boot(){addDhikr();refineLogin();}
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
 window.addEventListener('load',boot,{once:true});
})();