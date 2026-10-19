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
'#ratibVoiceButton{position:static!important;left:auto!important;bottom:auto!important;z-index:auto!important;display:inline-flex;flex:none;align-items:center;justify-content:center;width:40px;height:40px;min-width:40px;min-height:40px;padding:6px;border-radius:12px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:var(--text,#0f172a);font-family:inherit;font-size:20px;line-height:1;cursor:pointer;box-shadow:none;margin:0}',
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
const headerActions=document.querySelector('header .header-actions');
const sidebarToggle=document.getElementById('sidebarMenuBtn');
if(headerActions&&sidebarToggle&&sidebarToggle.parentElement===headerActions)
 headerActions.insertBefore(button,sidebarToggle.nextSibling);
else if(headerActions)headerActions.append(button);
else document.body.append(button);
document.body.append(status);
function applyVoiceVisibility(){button.hidden=!visible;button.style.display=visible?'flex':'none';if(!visible&&listening)stop();}
applyVoiceVisibility();
function notify(message,kind='info'){
 if(typeof window.showToast==='function')window.showToast(message,kind,4500);
 else{status.hidden=false;status.textContent=message;setTimeout(()=>{if(!listening)status.hidden=true;},3500);}
}
function active(value){
 listening=value;button.dataset.listening=String(value);button.setAttribute('aria-pressed',String(value));
 button.textContent=value?'⏹️':'🎙️';
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
 e.preventDefault(); // retains the caret in the currently edited field
});
button.addEventListener('click',()=>{
 if(listening){stop();return;}
 if(!Recognition){notify('متصفحك لا يدعم الإملاء الصوتي؛ يمكن استخدام ميكروفون لوحة المفاتيح.','warn');return;}
 if(!eligible(document.activeElement)&&!eligible(lastTarget)){notify('حدد حقل كتابة ثم اضغط زر الميكروفون.','warn');return;}
 if(eligible(document.activeElement))remember(document.activeElement);
 engine=new Recognition();
 engine.lang=language;engine.continuous=true;engine.interimResults=false;engine.maxAlternatives=1;lastResult=-1;
 engine.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(i<=lastResult||!e.results[i].isFinal)continue;lastResult=i;insert(e.results[i][0]?.transcript||'');}};
 engine.onerror=e=>{
  const messages={'not-allowed':'يلزم السماح باستخدام الميكروفون من إعدادات الموقع.','service-not-allowed':'خدمة التعرف على الصوت غير متاحة.',network:'تعذر الاتصال بخدمة التعرف على الصوت.','audio-capture':'لم يُعثر على ميكروفون.','no-speech':'لم أسمع كلامًا واضحًا.'};
  notify(messages[e.error]||'تعذر التعرف على الكلام: '+e.error,'warn');
 };
 engine.onend=()=>{active(false);engine=null;};
 try{engine.start();active(true);}catch(error){engine=null;active(false);notify('تعذر تشغيل الميكروفون: '+error.message,'warn');}
});
window.addEventListener('pagehide',stop);
function settings(){
 const parent=document.getElementById('pageSettings');
 if(!parent||document.getElementById('ratibVoiceSettingsCard'))return;
 const card=document.createElement('div');card.id='ratibVoiceSettingsCard';card.className='card settings-accordion-card no-print';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>🎙️ الإملاء الصوتي</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><label style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span>إظهار زر الإملاء الصوتي</span><input type="checkbox" id="ratibVoiceVisible" style="width:22px;height:22px"></label><p class="ratib-voice-hint">حدد حقل الكتابة ثم اضغط زر الميكروفون. الإملاء يضيف النص عند المؤشر فقط ولا يحفظ السند تلقائيًا.</p><label for="ratibVoiceLanguage">لغة التعرف على الصوت</label><select id="ratibVoiceLanguage"><option value="ar-SA">العربية</option><option value="ar-YE">العربية — اليمن</option><option value="ar-EG">العربية — مصر</option></select><p class="ratib-voice-hint">قد يحتاج التعرف على الصوت إلى الإنترنت وخدمة المتصفح. لا يتم تشغيل الميكروفون تلقائيًا، وقد تُعالج الخدمة الصوت وفق سياسة المتصفح.</p></div>';
 parent.prepend(card);
 const head=card.querySelector('.settings-accordion-header'),body=card.querySelector('.settings-accordion-body');
 const toggle=()=>{const opened=body.classList.toggle('open');head.setAttribute('aria-expanded',String(opened));head.querySelector('.accordion-arrow').textContent=opened?'▲':'▼';};
 head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 const visibility=card.querySelector('#ratibVoiceVisible');visibility.checked=visible;visibility.addEventListener('change',()=>{visible=visibility.checked;try{localStorage.setItem(VISIBLE_KEY,String(visible));}catch(_){}applyVoiceVisibility();});
 const select=card.querySelector('select');select.value=language;select.addEventListener('change',e=>{
  if(!LANGUAGES.includes(e.target.value))return;
  language=e.target.value;try{localStorage.setItem(LANG_KEY,language);}catch(_){}
 });
}
settings();
})();