/* Ratib 3.6.168: visual refinements; reuse the existing accounting pulse and favorite actions. */
(()=>{'use strict';
const $=id=>document.getElementById(id),make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;};
function appearance(){
 const head=document.querySelector('#mainWrap>header.ratib-home-app-header'),btn=$('themeBtn');if(!head||!btn||$('ratibAppearanceMenu'))return;
 const gear=$('sidebarMenuBtn');if(gear){gear.hidden=true;gear.setAttribute('tabindex','-1');}
 const hideContact=()=>{for(const el of head.querySelectorAll('button,a')){if(el===btn||el===gear)continue;const text=[el.id,el.title,el.getAttribute('aria-label'),el.textContent].join(' ');if(/تواصل|واتساب|اتصال|الدعم|whatsapp|contact|support/i.test(text))el.hidden=true;}};
 hideContact();new MutationObserver(hideContact).observe(head,{childList:true,subtree:true});
 btn.dataset.ratibAppearanceHub='1';btn.textContent='🎨';btn.title='المظهر وألوان واجهة راتب';btn.setAttribute('aria-label','المظهر وألوان واجهة راتب');btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded','false');
 const panel=make('div','ratib-appearance-menu no-print');panel.id='ratibAppearanceMenu';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','المظهر وألوان واجهة راتب');
 const title=make('div','ratib-appearance-heading');title.append(make('strong','', 'المظهر وألوان واجهة راتب'));
 const close=make('button','ratib-appearance-close','×');close.type='button';close.setAttribute('aria-label','إغلاق');title.append(close);panel.append(title,make('p','ratib-appearance-caption','اختر وضع العرض ولون الواجهة. لا تتغير ألوان الطباعة أو القيم المحاسبية.'));
 const modes=make('div','ratib-appearance-modes');
 for(const [value,label,icon] of [['light','فاتح','☀️'],['dark','ليلي','🌙']]){
  const option=make('button','ratib-mode-option',icon+' '+label);option.type='button';option.dataset.ratibMode=value;
  option.addEventListener('click',()=>{document.documentElement.dataset.theme=value;try{if(window.__ratibProceedInitialized&&typeof store!=='undefined'&&typeof store.set==='function')store.set('theme',value);else localStorage.setItem('theme',JSON.stringify(value));}catch(error){console.warn('تعذر حفظ المظهر',error);}update();});modes.append(option);
 }
 panel.append(modes,make('strong','ratib-appearance-label','لون الواجهة'));
 const palettes=make('div','ratib-appearance-colors');
 const colors=[['green','#0d5b45','الأخضر'],['gold','#8a6323','الذهبي'],['blue','#1e4e86','الأزرق'],['emerald','#047857','الزمردي']];
 for(const [value,color,label] of colors){
  const option=make('button','ratib-color-option');option.type='button';option.dataset.ratibColor=value;option.title=label;option.setAttribute('aria-label',label);
  const swatch=make('span','ratib-color-swatch');swatch.style.backgroundColor=color;option.append(swatch,make('small','',label));
  option.addEventListener('click',()=>{window.RatibPalette?.set?.(value);update();});palettes.append(option);
 }panel.append(palettes);
 document.body.append(panel);
 function update(){const dark=document.documentElement.dataset.theme==='dark',color=window.RatibPalette?.get?.()||document.documentElement.dataset.ratibPalette||'green';for(const x of modes.children)x.setAttribute('aria-pressed',String(x.dataset.ratibMode===(dark?'dark':'light')));for(const x of palettes.children)x.setAttribute('aria-pressed',String(x.dataset.ratibColor===color));}
 function dismiss(){panel.hidden=true;btn.setAttribute('aria-expanded','false');}
 function toggle(){const next=panel.hidden;panel.hidden=!next;btn.setAttribute('aria-expanded',String(next));if(next){const r=btn.getBoundingClientRect();panel.style.top=Math.min(r.bottom+8,innerHeight-310)+'px';panel.style.left=Math.max(8,Math.min(r.left,innerWidth-302))+'px';update();close.focus({preventScroll:true});}}
 btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true);
 close.addEventListener('click',()=>{dismiss();btn.focus({preventScroll:true});});
 document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&e.target!==btn)dismiss();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();dismiss();btn.focus({preventScroll:true});}});
}
function quickFavorites(){
 const b=document.querySelector('#ratibHomeBottomNav [data-ratib-page="favorites"]');if(!b)return;
 b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const quick=window.RatibQuickFavorites?.openQuick;if(typeof quick==='function')quick();else window.RatibQuickFavorites?.open?.();},true);
}
function help(){
 const page=$('pageSettings');if(!page||$('ratibSettingsHelp168'))return;
 const box=make('section','ratib-settings-help no-print');box.id='ratibSettingsHelp168';box.append(make('strong','','المساعدة والإدارة'));
 const help=make('button','ratib-settings-help-btn','المساعدة والتواصل');help.type='button';help.addEventListener('click',()=>{if(typeof window.RatibSupportOpen==='function')window.RatibSupportOpen();else $('ratibWhatsappHelpBtn')?.click();});
 const more=make('button','ratib-settings-help-btn','إدارة التطبيق والخيارات الأخرى');more.type='button';more.addEventListener('click',()=>window.openRatibSidebar?.());box.append(help,more);page.append(box);
}
function pulseNumbers(){
 const quick=$('ratibPulseQuick');if(!quick||quick.dataset.ratib168)return;quick.dataset.ratib168='1';
 const values=[];for(const cell of quick.querySelectorAll('.ratib-pulse-stat')){const number=make('strong','ratib-pulse-actual','—');number.setAttribute('dir','ltr');cell.append(number);values.push(number);}
 const hint=quick.nextElementSibling;
 function reset(message){for(const n of values)n.textContent='—';if(hint&&hint.classList.contains('ratib-pulse-hint'))hint.textContent=message||'اختر حسابًا نقديًا لعرض الأرصدة';}
 function show(e){const d=e.detail||{};const code=String(d.currency||'').trim();if(!/^[A-Z]{3}$/.test(code))return;
 const fmt=x=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(Number(x)||0)+' '+code;
 for(const [i,x] of [d.closing,d.receipts,d.payments].entries())values[i].textContent=fmt(x);
 if(hint&&hint.classList.contains('ratib-pulse-hint'))hint.textContent=(d.accountLabel||'الحسابات المختارة')+' · '+(d.periodLabel||'الفترة الحالية')+' · '+code;
 }
 window.addEventListener('ratib:pulse-summary',show);
 window.addEventListener('ratib:pulse-summary-empty',()=>reset('اختر حسابًا نقديًا لعرض أرصدة فعلية'));
 reset('سيظهر الملخص بعد فتح البيانات المحاسبية');
 if(window.__ratibProceedInitialized)window.RatibCashPulse?.refresh?.();
}
function dhikr(){
 const msg=$('ratibHomeDhikr'),home=$('dashboardHomeContent');if(!msg||!home||msg.dataset.ratib168)return;
 msg.dataset.ratib168='1';msg.classList.add('ratib-dhikr-marquee');const text=msg.textContent;
 const inner=make('span','ratib-dhikr-text',text);msg.replaceChildren(inner);home.prepend(msg);
 let started=false;
 function run(){
  if(started||!window.__ratibProceedInitialized)return;
  const lock=$('lockScreen');if(lock&&getComputedStyle(lock).display!=='none')return;
  started=true;msg.classList.add('ratib-dhikr-visible');
  const hide=()=>{msg.remove();};
  msg.addEventListener('animationend',hide,{once:true});setTimeout(hide,5000);
 }
 window.addEventListener('ratib:app-ready',()=>requestAnimationFrame(run),{once:true});
 const lock=$('lockScreen');if(lock)new MutationObserver(run).observe(lock,{attributes:true,attributeFilter:['class','style','hidden']});
 requestAnimationFrame(run);
}
function init(){const home=$('dashboardHomeContent');if(!home||home.dataset.ratibHome168)return;home.dataset.ratibHome168='1';
 appearance();quickFavorites();help();pulseNumbers();dhikr();
 const label=$('appVersionLabel');if(label)label.textContent='الإصدار 3.6.168';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();