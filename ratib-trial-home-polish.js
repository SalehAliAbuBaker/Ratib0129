/* Ratib Al-Muyassar — visual-only home normalization for trial deployment.
   Keep original buttons, event handlers, favorite IDs and financial state. */
(function ratibTrialHomePolish(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const paths={
    receipt:'M12 3v11m-4-4 4 4 4-4M4 17v3h16v-3M5 7h4M15 7h4',
    payment:'M12 17V6m-4 4 4-4 4 4M4 17v3h16v-3M5 6h3M16 6h3',
    simple:'M8 4h11v16H8zM5 8h.01M5 13h.01M5 18h.01M11 8h5M11 13h5M11 18h5',
    compound:'M4 5h6v6H4zM14 4h6v6h-6zM9 16h6v5H9zM10 8h4M7 11v4h5M17 10v5h-5',
    opening:'M3 19h18M5 16V5h14v11M8 8h8M8 12h8M12 3v2',
    favorite:'m12 2 3.1 6.35 7 1-5.05 4.9 1.2 7.05L12 16.9l-6.25 3.45 1.2-7.05L1.9 9.35l7-1L12 2Z'
  };
  function icon(kind){
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.8');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('focusable','false');
    svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(NS,'path');
    path.setAttribute('d',paths[kind]||paths.simple);
    svg.append(path);
    return svg;
  }
  function brand(){
    const target=document.querySelector('#mainWrap > header .logo > span');
    if(!target)return;
    if(target.querySelector('strong')?.textContent==='راتب الميسر'&&target.querySelector('small')?.textContent==='للتنظيم والتدبير المالي')return;
    const strong=document.createElement('strong'),small=document.createElement('small');
    strong.textContent='راتب الميسر';
    small.textContent='للتنظيم والتدبير المالي';
    target.replaceChildren(strong,small);
    target.setAttribute('aria-label','راتب الميسر — للتنظيم والتدبير المالي');
  }
  function voucherButtons(){
    const grid=document.querySelector('#dashboardHomeContent .ratib-quick-entry-grid');
    if(!grid)return;
    for(const button of grid.querySelectorAll(':scope > button')){
      if(button.dataset.ratibVoucherIcon)return;
      const label=button.textContent.replace(/\s+/g,' ').trim();
      const kind=label.includes('افتتاح')?'opening':label.includes('قبض')?'receipt':label.includes('صرف')?'payment':label.includes('مركب')?'compound':'simple';
      const wrap=document.createElement('span');wrap.className='ratib-quick-voucher-icon';wrap.setAttribute('aria-hidden','true');wrap.append(icon(kind));
      const text=document.createElement('span');text.className='ratib-quick-voucher-label';text.textContent=label;
      button.replaceChildren(wrap,text);
      button.dataset.ratibVoucherIcon=kind;
      button.setAttribute('aria-label',label);
    }
  }
  function homeTiles(){
    const grid=document.querySelector('#dashboardHomeContent .main-menu-grid');
    if(!grid)return;
    const opening=document.getElementById('ratibOpeningLaunch');
    if(opening&&!opening.dataset.ratibTileIcon){
      const span=opening.querySelector('.main-menu-icon')||document.createElement('span');
      span.classList.add('main-menu-icon');span.setAttribute('aria-hidden','true');span.replaceChildren(icon('opening'));
      if(!span.parentElement)opening.prepend(span);
      opening.dataset.ratibTileIcon='1';
    }
    const favorite=document.getElementById('ratibCenterFavorites');
    if(favorite){
      // The original floating ★ shortcut retains its click handler, preferences,
      // idle timeout and existing menu. Undo only last release's card styling/markup.
      if(favorite.dataset.ratibCardReady || favorite.classList.contains('main-menu-btn')){
        favorite.replaceChildren(document.createTextNode('★'));
        favorite.classList.remove('main-menu-btn');
        delete favorite.dataset.ratibCardReady;
      }
      favorite.title='اختصاراتي';
      favorite.setAttribute('aria-label','فتح قائمة اختصاراتي');
      const menu=document.getElementById('ratibCenterFavoritesMenu');
      if(menu && favorite.nextElementSibling!==menu)grid.insertBefore(favorite,menu);
    }
    grid.classList.remove('ratib-approved-home-row');
  }
  let pending=false;
  function update(){pending=false;brand();voucherButtons();homeTiles();}
  function schedule(){if(pending)return;pending=true;queueMicrotask(update);}
  function start(){
    update();
    const container=document.getElementById('dashboardHomeContent');
    if(container){
      const observer=new MutationObserver(records=>{
        if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1 && (n.matches?.('#ratibOpeningLaunch,#ratibCenterFavorites,.ratib-quick-entry-grid > button,.main-menu-grid > button')||n.querySelector?.('#ratibOpeningLaunch,#ratibCenterFavorites')))))schedule();
      });
      observer.observe(container,{subtree:true,childList:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  // The older home-sidebar initializer runs on load and may replace the brand title.
  window.addEventListener('load',brand);
})();
