/* Reserve the actual bottom bar height, including larger fonts and safe areas. */
(()=>{'use strict';
let bars=[],frame=0,last=-1;
function update(){
 frame=0;
 const height=Math.max(0,...bars.filter(nav=>nav.isConnected).map(nav=>{
  const rect=nav.getBoundingClientRect(),style=getComputedStyle(nav);
  return nav.hidden||style.display==='none'||style.visibility==='hidden'?0:Math.ceil(Math.max(0,rect.height));
 }));
 if(height===last)return;last=height;
 document.documentElement.style.setProperty('--ratib-bottom-obstruction',height+'px');
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
function mount(){
 bars=['ratibHomeBottomNav','ratibStmtNav189'].map(id=>document.getElementById(id)).filter(Boolean);if(!bars.length)return;update();
 const resize=window.ResizeObserver?new ResizeObserver(schedule):null,changes=new MutationObserver(schedule);
 for(const nav of bars){resize?.observe(nav);changes.observe(nav,{attributes:true,attributeFilter:['hidden','class','style'],childList:true});}
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class','data-ratib-font-size','data-ratib-button-size']});
 window.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
