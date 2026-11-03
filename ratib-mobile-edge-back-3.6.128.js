/* Ratib official 3.6.128 — conservative, touch-only edge Back fallback.
   Use Ratib's existing Back action and unsaved-voucher confirmation.
   Let browser/system navigation take precedence when it consumes the gesture.
   Never intercept ordinary vertical scrolling or horizontal account/currency carousels. */
(function(){
 'use strict';
 let start=null,lastBack=0;
 const ignored='input,textarea,select,[contenteditable="true"],[role="slider"],.account-currency-track,.accounts-pager-track,.carousel-slide,.carousel-track,.multi-voucher-table-wrap,.ratib-feedback-notice';
 function eligible(event){
  if(!event.touches||event.touches.length!==1||innerWidth>950)return false;
  if(event.target?.closest?.(ignored))return false;
  if(document.querySelector('#lockScreen[style*="flex"],.modal-overlay.show'))return false;
  return true;
 }
 function begin(event){
  start=null;
  if(!eligible(event))return;
  const finger=event.touches[0],edge=Math.max(18,Math.min(28,innerWidth*.07));
  const side=finger.clientX<=edge?'left':finger.clientX>=innerWidth-edge?'right':null;
  if(!side)return;
  start={side,x:finger.clientX,y:finger.clientY,time:Date.now(),claimed:false};
 }
 function move(event){
  if(!start||!event.touches||event.touches.length!==1){start=null;return;}
  const dx=event.touches[0].clientX-start.x,dy=event.touches[0].clientY-start.y;
  const inward=start.side==='left'?dx>0:dx<0;
  if(Math.abs(dy)>30&&Math.abs(dy)>Math.abs(dx)*1.1){start=null;return;}
  if(inward&&Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.7){
   start.claimed=true;
   if(event.cancelable)event.preventDefault();
  }
 }
 function cancel(){start=null;}
 function end(event){
  const candidate=start;start=null;
  if(!candidate||!candidate.claimed||!event.changedTouches?.length)return;
  const x=event.changedTouches[0].clientX-candidate.x;
  const y=event.changedTouches[0].clientY-candidate.y;
  if((candidate.side==='left'?x<90:x>-90)||Math.abs(y)>Math.abs(x)*.6||Date.now()-candidate.time>950)return;
  if(Date.now()-lastBack<1050)return;
  lastBack=Date.now();
  // Back invokes the established unsaved-edit modal and browser-history guard.
  try{
   if(typeof window.goBackInApp==='function')Promise.resolve(window.goBackInApp()).catch(()=>{});
   else if(typeof goBackInApp==='function')Promise.resolve(goBackInApp()).catch(()=>{});
  }catch(error){console.warn('Ratib edge-back unavailable',error);}
 }
 document.addEventListener('touchstart',begin,{passive:true,capture:true});
 document.addEventListener('touchmove',move,{passive:false,capture:true});
 document.addEventListener('touchend',end,{passive:true,capture:true});
 document.addEventListener('touchcancel',cancel,{passive:true,capture:true});
})();