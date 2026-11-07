/* Ratib official 3.6.134 — reliable touch Back gesture fallback.
   Keep native Android/browser Back handling in charge when it receives the gesture.
   Completed in-app edge gestures invoke Ratib's guarded goBackInApp().
   Never modify browser history here or intercept vertical / horizontal scrollers. */
(function(){
 'use strict';
 let start=null,lastBack=0,nativeBackCount=0;
 const ignored='input,textarea,select,[contenteditable="true"],[role="slider"],.account-currency-track,.accounts-pager-track,.carousel-track,.multi-voucher-table-wrap,.ratib-feedback-notice,[data-ratib-edge-back-ignore]';
 const now=()=>Date.now();
 function eligible(event){
  if(!event.touches||event.touches.length!==1||window.innerWidth>950)return false;
  if(event.target?.closest?.(ignored))return false;
  if(document.getElementById('lockScreen')?.style.display==='flex')return false;
  return true;
 }
 function begin(event){
  start=null;
  if(!eligible(event))return;
  const finger=event.touches[0],width=window.innerWidth;
  const edge=Math.max(38,Math.min(58,width*.14));
  const side=finger.clientX<=edge?'left':finger.clientX>=width-edge?'right':null;
  if(!side)return;
  start={side,x:finger.clientX,y:finger.clientY,time:now(),claimed:false,nativeBackCount};
 }
 function move(event){
  const candidate=start;
  if(!candidate||!event.touches||event.touches.length!==1){start=null;return;}
  const dx=event.touches[0].clientX-candidate.x,dy=event.touches[0].clientY-candidate.y;
  const inward=candidate.side==='left'?dx>0:dx<0;
  if(Math.abs(dy)>24&&Math.abs(dy)>Math.abs(dx)*1.15){start=null;return;}
  if(!inward&&Math.abs(dx)>15){start=null;return;}
  if(inward&&Math.abs(dx)>=24&&Math.abs(dx)>=Math.abs(dy)*1.3){
   candidate.claimed=true;
   if(event.cancelable)event.preventDefault();
  }
 }
 function cancel(){start=null;}
 function end(event){
  const candidate=start;start=null;
  if(!candidate||!event.changedTouches?.length||candidate.nativeBackCount!==nativeBackCount)return;
  const dx=event.changedTouches[0].clientX-candidate.x;
  const dy=event.changedTouches[0].clientY-candidate.y;
  const inward=candidate.side==='left'?dx:-dx;
  if(inward<55||Math.abs(dx)<Math.abs(dy)*1.3||now()-candidate.time>1800)return;
  if(event.cancelable)event.preventDefault();
  if(now()-lastBack<380)return;
  lastBack=now();
  try{
   const back=typeof window.goBackInApp==='function'?window.goBackInApp:
     (typeof goBackInApp==='function'?goBackInApp:null);
   if(back)Promise.resolve(back()).catch(error=>console.warn('Ratib edge Back failed',error));
  }catch(error){console.warn('Ratib edge Back unavailable',error);}
 }
 // Android may dispatch its native callback for the same completed touch.
 window.ratibNativeBack=function(){
  start=null;
  if(now()-lastBack<380)return;
  window.goBackInApp();
 };
 // Browser/system Back already handled the gesture: never trigger a second Back.
 window.addEventListener('popstate',()=>{nativeBackCount++;start=null;},true);
 document.addEventListener('touchstart',begin,{passive:true,capture:true});
 document.addEventListener('touchmove',move,{passive:false,capture:true});
 document.addEventListener('touchend',end,{passive:false,capture:true});
 document.addEventListener('touchcancel',cancel,{passive:true,capture:true});
})();