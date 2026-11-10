/* Ratib 3.6.169 — initial dashboard fold, unified appearance in settings, Latin date digits. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function migrateAppearance(){
 const button=$('themeBtn'),panel=$('ratibAppearanceMenu'),card=$('ratibPaletteSettingsCard');
 if(button){button.hidden=true;button.tabIndex=-1;button.setAttribute('aria-hidden','true');}
 if(!panel||!card)return false;
 const holder=card.querySelector('.ratib-palette-settings')||card.querySelector('.settings-accordion-body');
 if(!holder)return false;
 if(panel.parentElement!==holder){holder.prepend(panel);panel.classList.add('ratib-appearance-inline');panel.removeAttribute('role');panel.setAttribute('aria-label','الوضع الفاتح والليلي');panel.style.removeProperty('top');panel.style.removeProperty('left');}
 panel.hidden=false;panel.removeAttribute('aria-hidden');
 const buttons=panel.querySelectorAll('[data-ratib-mode]'),dark=document.documentElement.dataset.theme==='dark';
 for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.ratibMode===(dark?'dark':'light')));
 return true;
}
function initAppearance(){
 if(migrateAppearance())return;
 const host=$('pageSettings');if(!host)return;
 const observer=new MutationObserver(()=>{if(migrateAppearance())observer.disconnect();});
 observer.observe(host,{childList:true,subtree:true});
 window.addEventListener('ratib:app-ready',()=>{if(migrateAppearance())observer.disconnect();},{once:true});
}
function dateCheck(){
 // RatibHijriFirst already formats its date fields, statements and PDFs with Latin digits.
 // Update the header using the same Umalqura calendar and explicit Latin numbering system.
 const clock=()=>{const now=new Date(),h=$('ratibHomeHijri'),g=$('ratibHomeGregorian');
  if(h){try{const f=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{year:'numeric',month:'long',day:'numeric'});h.textContent=f.resolvedOptions().calendar==='islamic-umalqura'?f.format(now).replace(/\s*هـ\s*$/,'هـ'):'التاريخ الهجري غير متاح';}catch(_){}}
  if(g){try{g.textContent=new Intl.DateTimeFormat('ar-YE-u-ca-gregory-nu-latn',{year:'numeric',month:'long',day:'numeric'}).format(now);}catch(_){}}
 };
 clock();window.addEventListener('focus',clock);document.addEventListener('visibilitychange',()=>{if(!document.hidden)clock();});
}
function init(){initAppearance();dateCheck();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
