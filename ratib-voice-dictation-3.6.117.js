/* Ratib trial 3.6.117: user-initiated speech input, never autosaves vouchers. */
(()=>{'use strict';
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const LANG_KEY='ratib.voice.language.v1',LANGUAGES=['ar-SA','ar-YE','ar-EG'];
let language='ar-SA';
const VISIBLE_KEY='ratib.voice.visible.v1';let visible=false;try{visible=localStorage.getItem(VISIBLE_KEY)==='true';}catch(_){}
try{const saved=localStorage.getItem(LANG_KEY);if(LANGUAGES.includes(saved))language=saved;}catch(_){}
let lastTarget=null,lastSelection=null,engine=null,listening=false,lastResult=-1,speechTarget=null;
function eligible(el){
 if(!el||!el.isConnected)return null;
 const rich=el.closest?.('[contenteditable="true"],[contenteditable="plaintext-only"]');
 if(rich&&!rich.closest('[inert],[hidden]'))return rich;
 if(!el.matches?.('input,textarea,select')||el.disabled||el.readOnly||el.closest('[inert],[hidden],.hidden'))return null;
 if(el.matches('textarea,select'))return el;
 return /^(text|search|tel|url|email|number|date|time)$/.test((el.type||'text').toLowerCase())?el:null;
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
 // Inputs inside editing / quick account dialogs are editable too. Protected types
 // (password, PIN, file, hidden, readonly) never receive voice transcription.
 if(current.closest('#ratibVoiceSettingsCard,#ratibFavoritesPanel,#ratibCenterFavoritesMenu'))return null;
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
 document.querySelectorAll('.ratib-simple-account-mic').forEach(m=>{
  m.dataset.listening=String(value);m.setAttribute('aria-pressed',String(value));
  m.textContent=value?'⏹️':'🎙️';
 });
 button.textContent=value?'⏹️':'🎙️';
 scheduleVoicePosition();
 button.title=value?'إيقاف الإملاء الصوتي':'ابدأ الإملاء الصوتي في الحقل المحدد';
 button.setAttribute('aria-label',button.title);
 status.hidden=!value;status.textContent=value?'🎙️ جارٍ الاستماع… تحدث الآن':'';
}
function westernDigits(raw){
 return String(raw||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776));
}
// Parse Arabic spoken numbers only when every word has a unique numeric meaning.
function parseArabicWordNumber(spoken){
 const ones={'صفر':0,'واحد':1,'واحده':1,'احد':1,'احدي':1,
  'اثنين':2,'اثنان':2,'اثنتين':2,'اثنتان':2,'اثنا':2,'اتنين':2,'ثنين':2,'ثنتين':2,
  'ثلاثه':3,'ثلاث':3,'تلاته':3,'اربعه':4,'اربع':4,'خمسه':5,'خمس':5,
  'سته':6,'ست':6,'سبعه':7,'سبع':7,'ثمانيه':8,'ثمان':8,'تسعه':9,'تسع':9};
 const values={...ones,'عشره':10,'عشر':10,'عشرين':20,'ثلاثين':30,
  'اربعين':40,'خمسين':50,'ستين':60,'سبعين':70,'ثمانين':80,'تسعين':90,
  'احدعشر':11,'احدعشره':11,'اثناعشر':12,'اثنيعشر':12,
  'اثناعشره':12,'اثنيعشره':12,'اثنتاعشره':12,
  'ميه':100,'مئه':100,'مائه':100,'مايه':100,
  'ميتين':200,'مئتين':200,'مائتين':200,'مئتان':200,'مائتان':200,
  'ثلاثميه':300,'ثلاثمئه':300,'ثلاثمائه':300,
  'اربعميه':400,'اربعميه':400,'اربعمئه':400,'اربعمائه':400,
  'خمسميه':500,'خمسمئه':500,'خمسمائه':500,
  'ستميه':600,'ستمئه':600,'ستمائه':600,
  'سبعميه':700,'سبعمئه':700,'سبعمائه':700,
  'ثمانميه':800,'ثمانمئه':800,'ثمانمائه':800,
  'تسعميه':900,'تسعمئه':900,'تسعمائه':900};
 const scales={'الف':1000,'الفا':1000,'الاف':1000,'الافا':1000,
  'الفين':2000,'الفان':2000,'مليون':1000000,'مليونا':1000000,
  'ملايين':1000000,'مليونين':2000000,
  'مليار':1000000000,'مليارا':1000000000,'مليارات':1000000000,'مليارين':2000000000};
 const currency=new Set(['ريال','ريالات','ريالا','ريالين','يمني','يمنيه',
  'سعودي','سعوديه','درهم','دراهم','اماراتي','اماراتيه',
  'عماني','عمانيه','دولار','دولارات','مبلغ','المبلغ','فقط','الاجمالي','اجمالي']);
 const separators=new Set(['فاصله','نقطه']);
 const normalized=westernDigits(spoken).normalize('NFKC').toLocaleLowerCase('ar')
  .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا')
  .replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/[٫.]/g,' فاصله ').replace(/[،؛!?؟:()]/g,' ')
  .replace(/\s+/g,' ').trim();
 if(!normalized||/[^\p{Script=Arabic}\d\s-]/u.test(normalized))return null;
 const tokens=[];let joined=false;
 for(const original of normalized.split(' ')){
  if(original==='و'){joined=true;continue;}
  let word=original;
  if(!(word in values)&&!(word in scales)&&!currency.has(word)&&!separators.has(word)&&
   !/^\d+$/.test(word)&&word.startsWith('و')){
   const suffix=word.slice(1);
   if((suffix in values)||(suffix in scales)||currency.has(suffix)||
      separators.has(suffix)||/^\d+$/.test(suffix)){word=suffix;joined=true;}
  }
  if(currency.has(word))continue;
  if(!(word in values)&&!(word in scales)&&!separators.has(word)&&!/^\d+$/.test(word))return null;
  tokens.push({word,joined});joined=false;
 }
 const breaks=tokens.flatMap((t,i)=>separators.has(t.word)?[i]:[]);
 if(!tokens.length||breaks.length>1)return null;
 const intTokens=breaks.length?tokens.slice(0,breaks[0]):tokens;
 const fracTokens=breaks.length?tokens.slice(breaks[0]+1):null;
 if(!intTokens.length||fracTokens&&fracTokens.length===0)return null;
 function parsePart(part,allowScale){
  if(!part.length)return null;
  // "واحد اثنين ثلاثة" dictates digits, not an arithmetic sum.
  if(part.length>1&&part.every(t=>t.word in ones&&!t.joined)){
   const digits=part.map(t=>String(ones[t.word])).join('');
   return {value:Number(digits),digits};
  }
  let total=0,group=0,previous=null;
  for(const token of part){
   const word=token.word;
   if(word in scales){
    if(!allowScale)return null;
    const dual=/^(الفين|الفان|مليونين|مليارين)$/.test(word);
    if(dual&&group!==0)return null;
    total+=(dual?1:(group||1))*scales[word];group=0;
   }else{
    const n=/^\d+$/.test(word)?Number(word):values[word];
    if(!Number.isSafeInteger(n))return null;
    const prev=previous&&(previous.word in values?values[previous.word]:/^\d+$/.test(previous.word)?Number(previous.word):null);
    // "خمسة وثلاثين أربعة" is not a valid single number.
    if(n>0&&n<10&&prev>=20&&prev<=90)return null;
    if(n===100&&group>=1&&group<=9&&previous&&!token.joined&&previous.word in ones)
     group*=100; // "ثلاثة مئة" -> 300; "ثلاثة ومئة" -> 103.
    else group+=n;
   }
   if(!Number.isSafeInteger(total+group))return null;
   previous=token;
  }
  const value=total+group;
  return Number.isSafeInteger(value)?{value,digits:String(value)}:null;
 }
 const integer=parsePart(intTokens,true);
 if(!integer)return null;
 if(!fracTokens)return String(integer.value);
 const fraction=parsePart(fracTokens,false);
 if(!fraction||fraction.digits.length>6)return null;
 return String(integer.value)+'.'+fraction.digits;
}
// Spoken numbers are accepted only if their value is unambiguous. Never invent a
// replacement amount when speech recognition returns an unclear transcript.
function parseNumber(spoken){
 const original=westernDigits(spoken).trim();
 let digits=original.replace(/(?:فاصلة|فاصله|نقطة|نقطه|٫)/g,'.')
  .replace(/−/g,'-').replace(/[٬،]/g,',').replace(/\s+/g,'');
 if(/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(digits))digits=digits.replace(/,/g,'');
 else if(/\d,\d/.test(digits))return null;
 if(/^-?\d+(?:\.\d+)?$/.test(digits))return digits;
 // "١٢,٥٠" could mean 1250 or 12.50; reject instead of guessing.
 if(/[\d][,\u066C\u060C][\d]/.test(original))return null;
 const negative=/^(?:سالب|ناقص)\s+/.test(original);
 const phrase=negative?original.replace(/^(?:سالب|ناقص)\s+/,''):original;
 const result=parseArabicWordNumber(phrase);
 return result===null?null:(negative&&Number(result)!==0?'-':'')+result;
}
function parseDate(spoken){
 const value=westernDigits(spoken).trim().replace(/\s*(?:\/|\-|\.|\s)\s*/g,'-');
 let y,m,d,match;
 if((match=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [,y,m,d]=match;
 else if((match=value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) [,d,m,y]=match;
 else return null;
 const yy=+y,mm=+m,dd=+d;
 const utc=new Date(Date.UTC(yy,mm-1,dd));
 if(yy<1900||yy>2200||utc.getUTCFullYear()!==yy||utc.getUTCMonth()!==mm-1||utc.getUTCDate()!==dd)return null;
 return [String(yy).padStart(4,'0'),String(mm).padStart(2,'0'),String(dd).padStart(2,'0')].join('-');
}
function parseTime(spoken){
 const cleaned=westernDigits(spoken).trim().replace(/^الساعة\s*/,'').replace(/[٫.]/g,':');
 const m=cleaned.match(/^(\d{1,2})\s*(?::|و)\s*(\d{1,2})$/);
 if(!m||+m[1]>23||+m[2]>59)return null;
 return m[1].padStart(2,'0')+':'+m[2].padStart(2,'0');
}
function normalizeChoice(text){
 return westernDigits(text).normalize('NFKC').toLocaleLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي')
  .replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]/gu,' ').trim().replace(/\s+/g,' ');
}
function chooseByVoice(select,spoken){
 const query=normalizeChoice(spoken);
 if(!query)return false;
 const aliases={'ريال يمني':'YER','ريال سعودي':'SAR','دولار':'USD','درهم اماراتي':'AED','ريال عماني':'OMR'};
 const alias=aliases[query];
 const options=[...select.options].filter(o=>!o.disabled&&o.value!=='');
 const matches=options.filter(o=>{
  const label=normalizeChoice(o.textContent),value=normalizeChoice(o.value);
  return label===query||value===query||(alias&&value===normalizeChoice(alias));
 });
 if(matches.length!==1)return false;
 select.value=matches[0].value;
 select.dispatchEvent(new Event('input',{bubbles:true}));
 select.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
function insert(spoken){
 // A mobile speech service may shift DOM focus. Keep transcription attached to
 // the exact field whose microphone was tapped, never to an incidental focus.
 const target=eligible(speechTarget); // Only the user-chosen field can receive transcripts.
 if(!target){notify('ضع المؤشر أولًا داخل حقل قابل للكتابة.','warn');return;}
 const raw=String(spoken||'').trim();if(!raw)return;
 const type=String(target.type||'').toLowerCase();
 // Invoice quantities, exchange rates and voucher amounts can be text inputs
 // whose inputmode is decimal/numeric; they must not accept arbitrary words.
 const numeric=type==='number'||(target.matches?.('input')&&
  /^(decimal|numeric)$/.test(target.getAttribute('inputmode')||''));
 const content=numeric?parseNumber(raw):raw;
 if(content===null){notify('لم أتعرف على مبلغ واضح. انطقه بالأرقام أو بالكلمات؛ لم تتغير القيمة.','warn');return;}
 try{
  if(target.matches?.('select')){
   if(!chooseByVoice(target,raw))notify('لم أجد خيارًا واحدًا مطابقًا. اختر من القائمة أو انطق الاسم الكامل.','warn');
   return;
  }
  if(type==='date'||type==='time'){
   const normalized=type==='date'?parseDate(raw):parseTime(raw);
   if(!normalized){notify(type==='date'?'انطق التاريخ بالأرقام: يوم شهر سنة، أو سنة شهر يوم.':'انطق الوقت بالأرقام مثل 14:30.','warn');return;}
   target.value=normalized;
   target.dispatchEvent(new Event('input',{bubbles:true}));
   target.dispatchEvent(new Event('change',{bubbles:true}));
   return;
  }
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
  }else if(target.matches?.('.searchable-input,input[list]')){
   // Account dictation searches by a complete spoken name, not by splicing
   // words into the middle of a previously selected account label.
   target.value=content.replace(/[.،؛!?؟]+$/g,'').trim();
   lastSelection=selectionAt(target);
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
 active(false);speechTarget=null;
}
let pendingButtonTarget=null;
button.addEventListener('pointerdown',e=>{
 pendingButtonTarget=micTarget();
 if(pendingButtonTarget)remember(pendingButtonTarget);
 e.preventDefault(); // Keep the target field's caret while tapping the adjacent mic.
});
button.addEventListener('mousedown',e=>e.preventDefault());
function startSpeech(target){
 if(listening){stop();return;}
 if(!Recognition){notify('متصفحك لا يدعم الإملاء الصوتي داخل التطبيق؛ يمكن استخدام ميكروفون لوحة المفاتيح.','warn');return;}
 const chosen=eligible(target);
 if(!chosen){notify('حدد حقل كتابة ثم اضغط زر الميكروفون.','warn');return;}
 remember(chosen);
 speechTarget=chosen;
 engine=new Recognition();
 engine.lang=language;engine.continuous=true;engine.interimResults=false;engine.maxAlternatives=1;lastResult=-1;
 engine.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(i<=lastResult||!e.results[i].isFinal)continue;lastResult=i;insert(e.results[i][0]?.transcript||'');}};
 engine.onerror=e=>{
  const messages={'not-allowed':'الميكروفون محظور لهذا الموقع. في Chrome افتح إعدادات الموقع ← الميكروفون ← سماح، ثم أعد المحاولة.','service-not-allowed':'خدمة التعرف على الصوت غير متاحة.',network:'تعذر الاتصال بخدمة التعرف على الصوت.','audio-capture':'لم يُعثر على ميكروفون.','no-speech':'لم أسمع كلامًا واضحًا.'};
  notify(messages[e.error]||'تعذر التعرف على الكلام: '+e.error,'warn');
 };
 engine.onend=()=>{active(false);engine=null;speechTarget=null;};
 try{engine.start();active(true);}catch(error){engine=null;speechTarget=null;active(false);notify('تعذر تشغيل الميكروفون: '+error.message,'warn');}
}
button.addEventListener('click',()=>{
 const target=micTarget()||pendingButtonTarget;
 pendingButtonTarget=null;
 if(!target){notify('اختر أولًا حقلًا قابلًا للإدخال.','warn');return;}
 startSpeech(target);
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
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>🎙️ الإملاء الصوتي</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><label style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span>إظهار زر الإملاء الصوتي</span><input type="checkbox" id="ratibVoiceVisible" style="width:22px;height:22px"></label><p class="ratib-voice-hint">حدد الحقل ثم اضغط زر الميكروفون. يمكن إملاء المبلغ بالأرقام أو بالكلمات العربية، مثل ستة وثلاثين ألفًا ومئة واثنين وخمسين. تتاح الكتابة بالصوت للنص والمبلغ والتاريخ والوقت وخيارات القوائم عند تطابق اسم الخيار؛ لن يُحفظ مستند تلقائيًا. أمّا الرقم السري والملفات فمستثناة.</p><label for="ratibVoiceLanguage">لغة التعرف على الصوت</label><select id="ratibVoiceLanguage"><option value="ar-SA">العربية</option><option value="ar-YE">العربية — اليمن</option><option value="ar-EG">العربية — مصر</option></select><button type="button" id="ratibVoiceMicPermissionBtn" class="btn" style="margin:8px 0 4px;min-height:42px">فحص إذن الميكروفون والسماح به</button><p id="ratibVoiceMicPermissionStatus" class="ratib-voice-hint" role="status" aria-live="polite"></p><p class="ratib-voice-hint">قد يحتاج التعرف على الصوت إلى الإنترنت وخدمة المتصفح. لا يتم تشغيل الميكروفون تلقائيًا، وقد تُعالج الخدمة الصوت وفق سياسة المتصفح.</p></div>';
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
function addAccountMicrophones(){
 for(const [inputId,buttonId,title] of [
  ['inpDebitAcc','ratibSimpleVoiceDebit','إملاء اسم الحساب المدين'],
  ['inpCreditAcc','ratibSimpleVoiceCredit','إملاء اسم الحساب الدائن']
 ]){
  const input=document.getElementById(inputId),wrap=input?.closest('.searchable-select-wrap');
  const row=wrap?.parentElement;
  if(!input||!wrap||!row||document.getElementById(buttonId))continue;
  const direct=document.createElement('button');
  direct.type='button';direct.id=buttonId;
  direct.className='icon-btn ratib-simple-account-mic no-print';
  direct.textContent='🎙️';direct.title=title;
  direct.setAttribute('aria-label',title);direct.setAttribute('aria-pressed','false');
  direct.style.cssText='flex:0 0 40px;width:40px;min-width:40px;height:44px;padding:4px;margin:0;border-radius:9px';
  direct.addEventListener('pointerdown',e=>{remember(input);e.preventDefault();});
  direct.addEventListener('mousedown',e=>e.preventDefault());
  direct.addEventListener('click',e=>{
   e.stopPropagation();
   // Preserve the intended field even when Android moves focus to the button.
   remember(input);
   startSpeech(input);
  });
  wrap.after(direct);
 }
}
addAccountMicrophones();
})();