/* Local document zoom: never changes report data, printed HTML or exported PDF. */
(()=>{'use strict';
const ids=['printPreviewBody','trialPreviewContent','ratibSpecialPreviewPages'];
function install(host){
 if(!host||host.dataset.ratibPreviewZoom)return;host.dataset.ratibPreviewZoom='1';
 const tools=document.createElement('div');tools.className='ratib-preview-zoom-tools no-print';tools.setAttribute('role','group');tools.setAttribute('aria-label','تكبير المعاينة');
 const viewport=document.createElement('div');viewport.className='ratib-preview-zoom-viewport';viewport.dir='ltr';viewport.tabIndex=0;viewport.setAttribute('aria-label','المستند؛ اسحب للتنقل بعد التكبير');
 const extent=document.createElement('div');extent.className='ratib-preview-zoom-extent';
 host.before(tools,viewport);viewport.append(extent);extent.append(host);host.classList.add('ratib-preview-zoom-content');host.dir='rtl';
 let scale=1,baseWidth=0,frame=0,pinch=null;
 const output=document.createElement('output');output.setAttribute('aria-live','polite');
 function button(text,label,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;}
 const minus=button('−','تصغير المعاينة',()=>zoom(scale-.25)),plus=button('+','تكبير المعاينة',()=>zoom(scale+.25)),fit=button('ملاءمة','ملاءمة المعاينة للشاشة',()=>{zoom(Math.min(1,viewport.clientWidth/Math.max(host.scrollWidth,baseWidth,1)));viewport.scrollTop=0;viewport.scrollLeft=0;});
 tools.append(minus,output,plus,fit);
 function render(){
  frame=0;const width=viewport.clientWidth;if(width>0)baseWidth=width;if(!baseWidth)return;
  const w=baseWidth+'px';if(host.style.width!==w)host.style.width=w;
  host.style.transform='scale('+scale+')';
  const contentWidth=Math.max(baseWidth,host.scrollWidth);
  // RTL tables overflow toward the left. Keep that entire area inside the scroll extent.
  host.style.left=Math.max(0,contentWidth-baseWidth)*scale+'px';
  extent.style.width=Math.ceil(contentWidth*scale)+'px';extent.style.height=Math.ceil(Math.max(host.scrollHeight,host.offsetHeight,1)*scale)+'px';
  output.textContent=Math.round(scale*100)+'%';minus.disabled=scale<=.25;plus.disabled=scale>=4;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 function zoom(value){scale=Math.max(.25,Math.min(4,Math.round(value*100)/100));render();}
 function distance(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
 viewport.addEventListener('touchstart',event=>{if(event.touches.length===2){pinch={distance:distance(event.touches),scale};if(event.cancelable)event.preventDefault();}},{passive:false});
 viewport.addEventListener('touchmove',event=>{if(pinch&&event.touches.length===2){if(event.cancelable)event.preventDefault();if(pinch.distance>0)zoom(pinch.scale*distance(event.touches)/pinch.distance);}},{passive:false});
 const end=event=>{if(event.touches.length<2)pinch=null;};viewport.addEventListener('touchend',end,{passive:true});viewport.addEventListener('touchcancel',()=>{pinch=null;},{passive:true});
 host.addEventListener('load',schedule,true);
 new MutationObserver(()=>{scale=1;schedule();}).observe(host,{childList:true,subtree:true});
 if(window.ResizeObserver){const observer=new ResizeObserver(schedule);observer.observe(host);observer.observe(viewport);}
 window.addEventListener('resize',schedule,{passive:true});schedule();
}
function mount(){for(const id of ids)install(document.getElementById(id));
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.id==='ratibSpecialPreview')))install(document.getElementById('ratibSpecialPreviewPages'));}).observe(document.body,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
