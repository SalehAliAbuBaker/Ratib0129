/* Ratib voice: first field tap dictates, second tap types when enabled; never autosaves vouchers. */
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
'#ratibVoiceButton{position:fixed;left:0;top:0;right:auto;bottom:auto;z-index:9200;display:flex;align-items:center;justify-content:center;width:32px;height:32px;min-width:32px;min-height:32px;padding:3px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:var(--text,#0f172a);font-family:inherit;font-size:17px;line-height:1;cursor:pointer;box-shadow:0 2px 5px #0002;margin:0;touch-action:manipulation}',
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
let positioning=false,keyboardEditing=false,keyboardField=null,paddedField=null,paddedStyle=null;
let voiceField=null,voiceMode=false,originalMode=null,fieldTap=null;
let baselineHeight=Math.max(window.innerHeight||0,window.visualViewport?.height||0,400);
function micTarget(){
 const current=eligible(document.activeElement);
 if(!current)return null;
 // Do not dictate into protected settings, inert windows or inactive overlays.
 if(current.closest('#ratibVoiceSettingsCard,#ratibFavoritesPanel,#ratibCenterFavoritesMenu'))return null;
 if(current.closest('.hidden,[hidden],[inert]'))return null;
 return current;
}
function fieldHasInlineMic(target){
 if(!target||target.matches?.('select,input[type="date"],input[type="time"]'))return false;
 if(target.closest?.('#financialCalculatorModal'))return false;
 return !!(target.matches?.('textarea,input')||target.isContentEditable);
}
function keyboardIsOpen(){
 const visual=window.visualViewport?.height;
 if(!visual)return false;
 const height=window.innerHeight||baselineHeight;
 return (baselineHeight-visual>Math.max(130,baselineHeight*.22))||(height-visual>130);
}
function releaseFieldPadding(){
 if(!paddedField)return;
 if(paddedStyle?.value)paddedField.style.setProperty('padding-inline-start',paddedStyle.value,paddedStyle.priority);
 else paddedField.style.removeProperty('padding-inline-start');
 paddedField=null;paddedStyle=null;
}
function reserveMicSpace(target){
 if(paddedField===target)return;
 releaseFieldPadding();
 paddedStyle={value:target.style.getPropertyValue('padding-inline-start'),priority:target.style.getPropertyPriority('padding-inline-start')};
 const current=Number.parseFloat(window.getComputedStyle(target).paddingInlineStart)||0;
 target.style.setProperty('padding-inline-start',Math.max(current,MIC_SIZE+MIC_GAP*2+2)+'px','important');
 paddedField=target;
}
function hideVoiceIcon(){
 releaseFieldPadding();button.hidden=true;button.style.display='none';
}
function updateVoicePosition(){
 const target=micTarget();
 if(!visible||!target){hideVoiceIcon();return;}
 const rect=target.getBoundingClientRect();
 const width=window.innerWidth||document.documentElement.clientWidth||360;
 const height=window.visualViewport?.height||window.innerHeight||720;
 if(rect.width<MIC_SIZE+MIC_GAP*2||rect.height<MIC_SIZE||rect.bottom<0||rect.top>height||rect.right<0||rect.left>width){
  hideVoiceIcon();return;
 }
 // The single microphone is located WITHIN the editable field, never in the
 // calculator column or in a neighboring field. RTL uses the field's right edge.
 const rtl=window.getComputedStyle(target).direction!=='ltr';
 const x=rtl?rect.right-MIC_SIZE-MIC_GAP:rect.left+MIC_GAP;
 const y=rect.top+Math.max(0,(Math.min(rect.height,48)-MIC_SIZE)/2);
 button.style.left=Math.round(Math.max(4,Math.min(width-MIC_SIZE-4,x)))+'px';
 button.style.top=Math.round(Math.max(4,Math.min(height-MIC_SIZE-4,y)))+'px';
 const calculatorOpen=!!document.querySelector('#financialCalculatorModal.show');
 if(!fieldHasInlineMic(target)||calculatorOpen||keyboardEditing||keyboardIsOpen()){
  hideVoiceIcon();return;
 }
 reserveMicSpace(target);
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
 if(!visible)releaseVoiceField();
 if(!visible){button.hidden=true;button.style.display='none';}
 else scheduleVoicePosition();
}
// Programmatic focus and Tab remain keyboard actions. Only a completed field
// tap starts dictation; scrolling and canceled gestures never record.
document.addEventListener('focusin',event=>{
 if(event.target!==keyboardField){keyboardEditing=false;keyboardField=event.target;}
 scheduleVoicePosition();
},true);
document.addEventListener('focusout',event=>{
 if(event.target===keyboardField){keyboardEditing=false;keyboardField=null;}
 scheduleVoicePosition();
},true);
document.addEventListener('keydown',event=>{
 if(eligible(event.target)&&!event.ctrlKey&&!event.metaKey&&event.key!=='Tab'&&event.key!=='Shift'&&event.key!=='Escape'){
  keyboardEditing=true;keyboardField=event.target;scheduleVoicePosition();
 }
},true);
document.addEventListener('beforeinput',event=>{
 if(eligible(event.target)&&!listening){keyboardEditing=true;keyboardField=event.target;scheduleVoicePosition();}
},true);
document.addEventListener('input',event=>{
 if(eligible(event.target)&&!listening){keyboardEditing=true;keyboardField=event.target;scheduleVoicePosition();}
},true);
window.addEventListener('resize',()=>{
 if(!eligible(document.activeElement))baselineHeight=Math.max(window.innerHeight||0,window.visualViewport?.height||0,400);
 scheduleVoicePosition();
});
window.visualViewport?.addEventListener?.('resize',scheduleVoicePosition);
window.visualViewport?.addEventListener?.('scroll',scheduleVoicePosition);
applyVoiceVisibility();

/* Keep the active text field visible above Android's software keyboard.
   Uses the visual viewport rather than assuming window.innerHeight shrinks.
   Only moves the page after keyboard detection, never on each typed letter. */
const keyboardFocusCss=document.createElement('style');
keyboardFocusCss.textContent=[
 '@media screen and (max-width:900px){',
 'html.ratib-keyboard-open #ratibHomeBottomNav{display:none!important}',
 'html.ratib-keyboard-open #ratibSmartResults{max-height:max(90px,calc(var(--ratib-keyboard-view-height,330px) - 145px))!important;overflow-y:auto!important}',
 '}',
 '@media print{#ratibKeyboardFocusReserve{display:none!important}}'
].join('\n');
document.head.appendChild(keyboardFocusCss);
const keyboardReserve=document.createElement('div');
keyboardReserve.id='ratibKeyboardFocusReserve';
keyboardReserve.hidden=true;
keyboardReserve.setAttribute('aria-hidden','true');
keyboardReserve.style.cssText='height:0;pointer-events:none;visibility:hidden;flex:none;';
document.body.appendChild(keyboardReserve);
let keyboardFocusTarget=null,keyboardFocusFrame=0,keyboardFocusTimer=0;
function isKeyboardTextField(el){
 if(!el||!el.isConnected||el.disabled||el.readOnly||el.closest?.('[inert],[hidden],.hidden'))return false;
 if(el.matches?.('textarea,[contenteditable="true"],[contenteditable="plaintext-only"]'))return true;
 return el.matches?.('input')&&/^(text|search|tel|email|url|number|password)$/.test((el.type||'text').toLowerCase());
}
function keyboardVisibleForFocusedField(){
 const vv=window.visualViewport;
 if(!vv||!keyboardFocusTarget||!isKeyboardTextField(keyboardFocusTarget))return false;
 const baseline=Math.max(baselineHeight,window.innerHeight||0);
 return baseline-vv.height>Math.max(145,baseline*.22);
}
function stopKeyboardFocusAdjustment(){
 document.documentElement.classList.remove('ratib-keyboard-open');
 document.documentElement.style.removeProperty('--ratib-keyboard-view-height');
 keyboardReserve.hidden=true;
 keyboardReserve.style.height='0';
}
function scrollInputInLocalPanels(target,desiredTop,visibleBottom){
 let node=target.parentElement;
 while(node&&node!==document.body&&node!==document.documentElement){
  const cs=window.getComputedStyle(node);
  if(/auto|scroll|overlay/.test(cs.overflowY||'')&&node.scrollHeight>node.clientHeight+8){
   const limit=node.getBoundingClientRect();
   const current=target.getBoundingClientRect();
   const top=Math.max(limit.top+12,desiredTop);
   const bottom=Math.min(limit.bottom-12,visibleBottom-12);
   if(bottom>top&&current.top>top+12)node.scrollTop+=current.top-top;
   else if(bottom>top&&current.bottom>bottom)node.scrollTop+=current.bottom-bottom;
   else if(current.top<limit.top+8)node.scrollTop+=current.top-limit.top-8;
  }
  node=node.parentElement;
 }
}
function alignKeyboardFocusedField(){
 keyboardFocusFrame=0;
 const field=keyboardFocusTarget;
 if(!field||document.activeElement!==field||!keyboardVisibleForFocusedField()){
  stopKeyboardFocusAdjustment();return;
 }
 const vv=window.visualViewport;
 const viewportTop=vv.offsetTop||0,viewportBottom=viewportTop+vv.height;
 const targetTop=viewportTop+Math.min(100,Math.max(64,vv.height*.21));
 document.documentElement.classList.add('ratib-keyboard-open');
 document.documentElement.style.setProperty('--ratib-keyboard-view-height',Math.round(vv.height)+'px');
 // Ensure there is room to raise fields near the bottom of short pages.
 keyboardReserve.hidden=false;
 keyboardReserve.style.height=Math.round(Math.max(130,Math.min(260,vv.height*.55)))+'px';
 scrollInputInLocalPanels(field,targetTop,viewportBottom);
 const rect=field.getBoundingClientRect();
 const needsLift=rect.top>targetTop+16||rect.bottom>viewportBottom-12;
 const needsRecover=rect.top<viewportTop+8;
 if(!needsLift&&!needsRecover)return;
 // Fixed dialogs should scroll their own content only; never move the page behind them.
 if(field.closest('[role="dialog"],.modal.show,.modal.active,#financialCalculatorModal.show'))return;
 const delta=rect.top-targetTop;
 if(Math.abs(delta)>8){
  try{window.scrollBy({left:0,top:delta,behavior:'instant'});}
  catch(_){window.scrollBy(0,delta);}
 }
}
function scheduleKeyboardFocusAdjustment(){
 if(keyboardFocusFrame)return;
 keyboardFocusFrame=(window.requestAnimationFrame||window.setTimeout)(alignKeyboardFocusedField);
}
document.addEventListener('focusin',e=>{
 if(!isKeyboardTextField(e.target))return;
 keyboardFocusTarget=e.target;
 scheduleKeyboardFocusAdjustment();
 // Some Android browsers report the reduced viewport after focusin.
 clearTimeout(keyboardFocusTimer);
 keyboardFocusTimer=setTimeout(scheduleKeyboardFocusAdjustment,240);
},true);
document.addEventListener('focusout',e=>{
 if(e.target!==keyboardFocusTarget)return;
 keyboardFocusTarget=null;
 clearTimeout(keyboardFocusTimer);
 scheduleKeyboardFocusAdjustment();
},true);
window.visualViewport?.addEventListener?.('resize',scheduleKeyboardFocusAdjustment);
window.visualViewport?.addEventListener?.('scroll',scheduleKeyboardFocusAdjustment);
window.addEventListener('resize',scheduleKeyboardFocusAdjustment);

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
  /^(decimal|numeric)$/.test(originalInputMode(target)||''));
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
 if(listening){pendingButtonTarget=null;stop();return;}
 const target=micTarget()||pendingButtonTarget;
 pendingButtonTarget=null;
 if(!target){notify('اختر أولًا حقلًا قابلًا للإدخال.','warn');return;}
 startSpeech(target);
});

function originalInputMode(target){return target===voiceField?originalMode:target.getAttribute('inputmode');}
function releaseVoiceField(){
 if(voiceField){
  if(originalMode===null)voiceField.removeAttribute('inputmode');
  else voiceField.setAttribute('inputmode',originalMode);
 }
 voiceField=null;voiceMode=false;originalMode=null;fieldTap=null;
}
function fieldForTap(target){
 const field=eligible(target);
 if(!visible||!field||!fieldHasInlineMic(field))return null;
 if(field.closest('#ratibVoiceSettingsCard,#ratibFavoritesPanel,#ratibCenterFavoritesMenu'))return null;
 return field;
}
document.addEventListener('pointerdown',event=>{
 if(event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;
 const field=fieldForTap(event.target);
 if(!field)return;
 if(field===voiceField){
  // Restore inputmode before the native click so Android can open its keyboard.
  if(voiceMode){stop();releaseVoiceField();voiceField=field;originalMode=field.getAttribute('inputmode');voiceMode=false;}
  keyboardEditing=true;keyboardField=field;scheduleVoicePosition();return;
 }
 if(listening)stop();
 releaseVoiceField();voiceField=field;originalMode=field.getAttribute('inputmode');voiceMode=true;
 field.setAttribute('inputmode','none');
 fieldTap={field,id:event.pointerId,x:event.clientX||0,y:event.clientY||0};
 // Suppress the keyboard while keeping the field focusable and selectable.
 event.preventDefault();field.focus({preventScroll:true});remember(field);
 keyboardEditing=false;keyboardField=field;scheduleVoicePosition();
},true);
document.addEventListener('pointermove',event=>{
 if(fieldTap&&Math.hypot((event.clientX||0)-fieldTap.x,(event.clientY||0)-fieldTap.y)>10)releaseVoiceField();
},{capture:true,passive:true});
document.addEventListener('pointercancel',()=>{if(fieldTap)releaseVoiceField();},true);
document.addEventListener('pointerup',event=>{
 const tap=fieldTap;if(!tap||tap.id!==event.pointerId)return;
 fieldTap=null;
 if(Math.hypot((event.clientX||0)-tap.x,(event.clientY||0)-tap.y)>10){releaseVoiceField();return;}
 if(!fieldForTap(tap.field)){releaseVoiceField();return;}
 remember(tap.field);startSpeech(tap.field);
},true);
window.RatibVoiceFirstAccountActive=field=>visible&&voiceMode&&voiceField===field;
window.addEventListener('pagehide',()=>{stop();releaseVoiceField();});


async function requestMicrophoneAccess(targetId){
 const statusText=document.getElementById(typeof targetId==='string'?targetId:'ratibVoiceMicPermissionStatus');
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
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>🎙️ الإملاء الصوتي</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><label style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span>تفعيل الإدخال الصوتي</span><input type="checkbox" id="ratibVoiceVisible" style="width:22px;height:22px"></label><p class="ratib-voice-hint">عند تفعيل الإدخال الصوتي، المس حقل النص أو المبلغ مرة لبدء الإملاء، والمس الحقل نفسه ثانية للكتابة بلوحة المفاتيح. ويمكن بدء الإملاء من أيقونة الميكروفون داخل الحقل. يمكن إملاء المبلغ بالأرقام أو بالكلمات العربية، مثل ستة وثلاثين ألفًا ومئة واثنين وخمسين. تتاح الكتابة بالصوت للنص والمبلغ والتاريخ والوقت وخيارات القوائم عند تطابق اسم الخيار؛ لن يُحفظ مستند تلقائيًا. أمّا الرقم السري والملفات فمستثناة.</p><label for="ratibVoiceLanguage">لغة التعرف على الصوت</label><select id="ratibVoiceLanguage"><option value="ar-SA">العربية</option><option value="ar-YE">العربية — اليمن</option><option value="ar-EG">العربية — مصر</option></select><button type="button" id="ratibVoiceMicPermissionBtn" class="btn" style="margin:8px 0 4px;min-height:42px">فحص إذن الميكروفون والسماح به</button><p id="ratibVoiceMicPermissionStatus" class="ratib-voice-hint" role="status" aria-live="polite"></p><p class="ratib-voice-hint">قد يحتاج التعرف على الصوت إلى الإنترنت وخدمة المتصفح. لا يعمل الميكروفون إلا بلمس الحقل عند تفعيل الخيار أو بالضغط على أيقونته، وقد تُعالج الخدمة الصوت وفق سياسة المتصفح.</p></div>';
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
 // One contextual microphone serves every editable text field. Remove
 // historical fixed duplicate buttons without affecting the account selectors.
 document.querySelectorAll('.ratib-simple-account-mic').forEach(m=>m.remove());
}
addAccountMicrophones();
window.RatibVoiceDictation=Object.freeze({
 values:()=>({visible,language}),
 configure:({visible:requested,language:lang})=>{
  if(!LANGUAGES.includes(lang))throw Error('لغة الإملاء غير معتمدة.');
  try{localStorage.setItem(VISIBLE_KEY,String(Boolean(requested)));localStorage.setItem(LANG_KEY,lang);}catch(e){throw Error('تعذر حفظ تفضيلات الإملاء الصوتي.');}
  visible=Boolean(requested);language=lang;
  const checkbox=document.getElementById('ratibVoiceVisible'),select=document.getElementById('ratibVoiceLanguage');
  if(checkbox)checkbox.checked=visible;
  if(select)select.value=language;
  applyVoiceVisibility();
 },
 requestMicrophoneAccess
});
})();
