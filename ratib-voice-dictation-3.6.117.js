/* Ratib trial 3.6.117: user-initiated speech input, never autosaves vouchers. */
(()=>{'use strict';
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const LANG_KEY='ratib.voice.language.v1',LANGUAGES=['ar-SA','ar-YE','ar-EG'];
let language='ar-SA';
const VISIBLE_KEY='ratib.voice.visible.v1';let visible=false;try{visible=localStorage.getItem(VISIBLE_KEY)==='true';}catch(_){}
try{const saved=localStorage.getItem(LANG_KEY);if(LANGUAGES.includes(saved))language=saved;}catch(_){}
let lastTarget=null,lastSelection=null,engine=null,listening=false,lastResult=-1;
function eligible(el){
 if(!el||!el.isConnected)return null;
 const rich=el.closest?.('[contenteditable="true"],[contenteditable="plaintext-only"]');
 if(rich&&!rich.closest('[inert],[hidden]'))return rich;
 if(!el.matches?.('input,textarea')||el.disabled||el.readOnly||el.closest('[inert],[hidden]'))return null;
 if(el.matches('textarea'))return el;
 return /^(text|search|tel|url|email|number)$/.test((el.type||'text').toLowerCase())?el:null;
}
function selectionAt(el){
 if(el.isContentEditable){
  const sel=window.getSelection?.();
  if(sel?.rangeCount&&el.contains(sel.anchorNode))return sel.getRangeAt(0).cloneRange();
  return null;
 }
 try{return {start:el.selectionStart,end:el.selectionEnd};}catch(_){return null;}
}
function remember(element){
 const el=eligible(element);if(!el)return;
 if(lastTarget!==el)lastSelection=null;
 lastTarget=el;lastSelection=selectionAt(el)||lastSelection;
}
document.addEventListener('focusin',e=>remember(e.target),true);
document.addEventListener('selectionchange',()=>{if(eligible(document.activeElement))remember(document.activeElement);});
document.addEventListener('keyup',e=>{if(eligible(e.target))remember(e.target);},true);
document.addEventListener('mouseup',e=>{if(eligible(e.target))remember(e.target);},true);
const css=document.createElement('style');
css.textContent=[
'#ratibVoiceButton{position:fixed;left:0;top:0;right:auto;bottom:auto;z-index:9200;display:flex;align-items:center;justify-content:center;width:32px;height:32px;min-width:32px;min-height:32px;padding:3px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:var(--text,#0f172a);font-family:inherit;font-size:17px;line-height:1;cursor:pointer;box-shadow:0 2px 8px #0002;margin:0}',
'#ratibVoiceButton[data-listening="true"]{background:#a12727;color:#fff;border-color:#a12727}',
'#ratibVoiceButton:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}',
'#ratibVoiceStatus{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important;padding:0!important;margin:-1px!important;border:0!important}',
'#ratibVoiceSettingsCard .ratib-voice-hint{font-size:.89rem;line-height:1.7;color:var(--muted)}',
'@media print{#ratibVoiceButton,#ratibVoiceStatus,#ratibVoiceSettingsCard{display:none!important}}'
].join('\n');
document.head.appendChild(css);
const button=document.createElement('button');
button.type='button';button.id='ratibVoiceButton';button.className='icon-btn no-print';
button.textContent='🎙️';button.title='الإملاء الصوتي في الحقل المحدد';button.setAttribute('aria-label','ابدأ الكتابة بالصوت في الحقل المحدد');
button.setAttribute('aria-pressed','false');button.dataset.listening='false';
const status=document.createElement('div');
status.id='ratibVoiceStatus';status.className='no-print';status.hidden=true;
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
document.body.append(button,status);
const MIC_SIZE=32,MIC_GAP=6;
let positioning=false;
function micTarget(){
 const current=eligible(document.activeElement);
 if(!current)return null;
 if(current.closest('#ratibVoiceSettingsCard,#ratibFavoritesPanel,#ratibCenterFavoritesMenu,[role="dialog"],[aria-modal="true"]'))return null;
 if(current.closest('.hidden,[hidden],[inert]'))return null;
 return current;
}
function updateVoicePosition(){
 const target=micTarget();
 if(!visible||!target){
  button.hidden=true;button.style.display='none';
  return;
 }
 const rect=target.getBoundingClientRect();
 const width=window.innerWidth||document.documentElement.clientWidth||360;
 const height=window.visualViewport?.height||window.innerHeight||720;
 if(rect.width<12||rect.height<12||rect.bottom<0||rect.top>height||rect.right<0||rect.left>width){
  button.hidden=true;button.style.display='none';return;
 }
 let x,y;
 const preferRight=window.getComputedStyle(target).direction!=='ltr';
 if(preferRight&&rect.right+MIC_GAP+MIC_SIZE<=width-4)x=rect.right+MIC_GAP;
 else if(rect.left-MIC_SIZE-MIC_GAP>=4)x=rect.left-MIC_SIZE-MIC_GAP;
 else if(rect.right+MIC_GAP+MIC_SIZE<=width-4)x=rect.right+MIC_GAP;
 else x=Math.max(4,Math.min(width-MIC_SIZE-4,preferRight?rect.right-MIC_SIZE:rect.left));
 // Outside the input and above its dropdown whenever possible.
 if(rect.left-MIC_SIZE-MIC_GAP<4&&rect.right+MIC_GAP+MIC_SIZE>width-4){
  if(rect.top>=MIC_SIZE+MIC_GAP+4)y=rect.top-MIC_SIZE-MIC_GAP;
  else y=rect.bottom+MIC_GAP;
 }else y=rect.top+Math.max(0,(rect.height-MIC_SIZE)/2);
 y=Math.max(4,Math.min(height-MIC_SIZE-4,y));
 button.style.left=Math.round(x)+'px';
 button.style.top=Math.round(y)+'px';
 button.hidden=false;button.style.display='flex';
}
function scheduleVoicePosition(){
 if(positioning)return;
 positioning=true;
 const raf=window.requestAnimationFrame||((fn)=>window.setTimeout(fn,0));
 raf(()=>{positioning=false;updateVoicePosition();});
}
function applyVoiceVisibility(){
 if(!visible&&listening)stop();
 if(!visible){button.hidden=true;button.style.display='none';}
 else scheduleVoicePosition();
}
document.addEventListener('focusin',scheduleVoicePosition,true);
document.addEventListener('focusout',scheduleVoicePosition,true);
document.addEventListener('scroll',scheduleVoicePosition,true);
window.addEventListener('resize',scheduleVoicePosition);
window.visualViewport?.addEventListener?.('resize',scheduleVoicePosition);
window.visualViewport?.addEventListener?.('scroll',scheduleVoicePosition);
applyVoiceVisibility();
function notify(message,kind='info'){
 if(typeof window.showToast==='function')window.showToast(message,kind,4500);
 else{status.hidden=false;status.textContent=message;setTimeout(()=>{if(!listening)status.hidden=true;},3500);}
}
function active(value){
 listening=value;button.dataset.listening=String(value);button.setAttribute('aria-pressed',String(value));
 button.textContent=value?'⏹️':'🎙️';
 scheduleVoicePosition();
 button.title=value?'إيقاف الإملاء الصوتي':'ابدأ الإملاء الصوتي في الحقل المحدد';
 button.setAttribute('aria-label',button.title);
 status.hidden=!value;status.textContent=value?'🎙️ جارٍ الاستماع… تحدث الآن':'';
}
function parseNumber(spoken){
 const s=String(spoken||'').trim()
  .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776))
  .replace(/(?:فاصلة|فاصله|نقطة|نقطه|٫)/g,'.')
  .replace(/[٬,\s]/g,'');
 return /^-?\d+(?:\.\d+)?$/.test(s)?s:null;
}
function insert(spoken){
 const current=eligible(document.activeElement),target=current||eligible(lastTarget);
 if(!target){notify('ضع المؤشر أولًا داخل حقل قابل للكتابة.','warn');return;}
 const raw=String(spoken||'').trim();if(!raw)return;
 const numeric=target.matches?.('input[type="number"]');
 const content=numeric?parseNumber(raw):raw;
 if(content===null){notify('الكلام لم ينتج مبلغًا رقميًا واضحًا؛ راجع المبلغ وأعد المحاولة.','warn');return;}
 try{
  target.focus({preventScroll:true});
  if(target.isContentEditable){
   const sel=window.getSelection();
   let range=lastSelection&&lastSelection.cloneRange?lastSelection.cloneRange():null;
   if(range&&!target.contains(range.commonAncestorContainer))range=null;
   if(!range&&sel?.rangeCount&&target.contains(sel.anchorNode))range=sel.getRangeAt(0).cloneRange();
   if(!range){range=document.createRange();range.selectNodeContents(target);range.collapse(false);}
   const node=document.createTextNode(content);
   range.deleteContents();range.insertNode(node);range.setStartAfter(node);range.collapse(true);
   sel.removeAllRanges();sel.addRange(range);lastSelection=range.cloneRange();
  }else if(numeric){
   target.value=content; // numeric inputs do not expose a selectable text caret
  }else{
   const selected=target===lastTarget&&typeof lastSelection?.start==='number'?lastSelection:null;
   const start=typeof target.selectionStart==='number'?target.selectionStart:(selected?.start??target.value.length);
   const end=typeof target.selectionEnd==='number'?target.selectionEnd:(selected?.end??start);
   const spacer=start>0&&/[\p{L}\p{N}]$/u.test(target.value.slice(0,start))?' ':'';
   const trailing=end<target.value.length&&/[\p{L}\p{N}]/u.test(target.value.charAt(end))?' ':'';
   target.setRangeText(spacer+content+trailing,start,end,'end');
   lastSelection=selectionAt(target);
  }
  lastTarget=target;
  target.dispatchEvent(new Event('input',{bubbles:true}));
 }catch(error){console.warn('Ratib voice input error',error);notify('تعذر إدخال النص في هذا الحقل.','error');}
}
function stop(){
 if(engine){try{engine.stop();}catch(_){}}
 active(false);
}
button.addEventListener('pointerdown',e=>{
 if(eligible(document.activeElement))remember(document.activeElement);
 e.preventDefault(); // Keep the target field's caret while tapping the adjacent mic.
});
button.addEventListener('mousedown',e=>e.preventDefault());
button.addEventListener('click',()=>{
 if(listening){stop();return;}
 if(!Recognition){notify('متصفحك لا يدعم الإملاء الصوتي؛ يمكن استخدام ميكروفون لوحة المفاتيح.','warn');return;}
 if(!micTarget()){notify('حدد حقل كتابة ثم اضغط زر الميكروفون.','warn');return;}
 if(eligible(document.activeElement))remember(document.activeElement);
 engine=new Recognition();
 engine.lang=language;engine.continuous=true;engine.interimResults=false;engine.maxAlternatives=1;lastResult=-1;
 engine.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(i<=lastResult||!e.results[i].isFinal)continue;lastResult=i;insert(e.results[i][0]?.transcript||'');}};
 engine.onerror=e=>{
  const messages={'not-allowed':'الميكروفون محظور لهذا الموقع. في Chrome افتح إعدادات الموقع ← الميكروفون ← سماح، ثم أعد المحاولة.','service-not-allowed':'خدمة التعرف على الصوت غير متاحة.',network:'تعذر الاتصال بخدمة التعرف على الصوت.','audio-capture':'لم يُعثر على ميكروفون.','no-speech':'لم أسمع كلامًا واضحًا.'};
  notify(messages[e.error]||'تعذر التعرف على الكلام: '+e.error,'warn');
 };
 engine.onend=()=>{active(false);engine=null;};
 try{engine.start();active(true);}catch(error){engine=null;active(false);notify('تعذر تشغيل الميكروفون: '+error.message,'warn');}
});
window.addEventListener('pagehide',stop);

async function requestMicrophoneAccess(){
 const statusText=document.getElementById('ratibVoiceMicPermissionStatus');
 const report=(message,good=false)=>{if(statusText){statusText.textContent=message;statusText.style.color=good?'var(--accent-strong,var(--text))':'var(--text)';}};
 if(!window.isSecureContext){report('يتطلب فحص الميكروفون فتح الموقع عبر HTTPS.');return;}
 if(!navigator.mediaDevices?.getUserMedia){report('هذا المتصفح لا يوفر فحص الميكروفون. افتح التطبيق عبر Chrome.');return;}
 report('جارٍ طلب إذن الميكروفون من المتصفح…');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  stream.getTracks().forEach(track=>track.stop());
  report('الميكروفون مسموح. ارجع إلى حقل الكتابة واضغط أيقونة الإملاء.',true);
 }catch(error){
  const code=error?.name||'';
  const message=(code==='NotAllowedError'||code==='PermissionDeniedError')
   ?'الميكروفون محظور. افتح Chrome ← إعدادات الموقع ← الميكروفون ← سماح؛ وتحقق من إذن الميكروفون لتطبيق Chrome في إعدادات الهاتف.'
   :code==='NotFoundError'?'لا يوجد ميكروفون متاح على هذا الجهاز.'
   :code==='NotReadableError'?'الميكروفون مشغول؛ أغلق أي تطبيق يستخدمه ثم أعد المحاولة.'
   :'تعذر فحص الميكروفون: '+(error?.message||code||'سبب غير معروف');
  report(message);
 }
}
function settings(){
 const parent=document.getElementById('pageSettings');
 if(!parent||document.getElementById('ratibVoiceSettingsCard'))return;
 const card=document.createElement('div');card.id='ratibVoiceSettingsCard';card.className='card settings-accordion-card no-print';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>🎙️ الإملاء الصوتي</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><label style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span>إظهار زر الإملاء الصوتي</span><input type="checkbox" id="ratibVoiceVisible" style="width:22px;height:22px"></label><p class="ratib-voice-hint">حدد حقل الكتابة ثم اضغط زر الميكروفون. الإملاء يضيف النص عند المؤشر فقط ولا يحفظ السند تلقائيًا.</p><label for="ratibVoiceLanguage">لغة التعرف على الصوت</label><select id="ratibVoiceLanguage"><option value="ar-SA">العربية</option><option value="ar-YE">العربية — اليمن</option><option value="ar-EG">العربية — مصر</option></select><button type="button" id="ratibVoiceMicPermissionBtn" class="btn" style="margin:8px 0 4px;min-height:42px">فحص إذن الميكروفون والسماح به</button><p id="ratibVoiceMicPermissionStatus" class="ratib-voice-hint" role="status" aria-live="polite"></p><p class="ratib-voice-hint">قد يحتاج التعرف على الصوت إلى الإنترنت وخدمة المتصفح. لا يتم تشغيل الميكروفون تلقائيًا، وقد تُعالج الخدمة الصوت وفق سياسة المتصفح.</p></div>';
 parent.prepend(card);
 const head=card.querySelector('.settings-accordion-header'),body=card.querySelector('.settings-accordion-body');
 const toggle=()=>{const opened=body.classList.toggle('open');head.setAttribute('aria-expanded',String(opened));head.querySelector('.accordion-arrow').textContent=opened?'▲':'▼';};
 head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 card.querySelector('#ratibVoiceMicPermissionBtn')?.addEventListener('click',requestMicrophoneAccess);
 const visibility=card.querySelector('#ratibVoiceVisible');visibility.checked=visible;visibility.addEventListener('change',()=>{visible=visibility.checked;try{localStorage.setItem(VISIBLE_KEY,String(visible));}catch(_){}applyVoiceVisibility();});
 const select=card.querySelector('select');select.value=language;select.addEventListener('change',e=>{
  if(!LANGUAGES.includes(e.target.value))return;
  language=e.target.value;try{localStorage.setItem(LANG_KEY,language);}catch(_){}
 });
}
settings();
})();