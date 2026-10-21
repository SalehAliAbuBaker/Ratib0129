/* Ratib Trial 3.6.149 — feedback audio, visible toasts, actionable reminders.
   Presentation and user-triggered reminders only. All financial writes remain unchanged. */
(function(){
'use strict';
const KEY='ratib_feedback_preferences_v1';
const DEFAULTS={master:true,save:true,reminder:true,warning:true,error:true,volume:'medium',style:'balanced'};
const LEVELS={low:.48,medium:.7,high:1},STYLES=['soft','balanced','clear'];
const $=id=>document.getElementById(id);
const safeText=value=>String(value==null?'':value);
let audio=null;
const lastPlayed=new Map();
const read=()=>{
 let source={};
 try{source=typeof store!=='undefined'&&typeof store.get==='function'?store.get(KEY,{})||{}:JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}
 const cfg={...DEFAULTS,...source};
 for(const name of ['master','save','reminder','warning','error'])cfg[name]=cfg[name]!==false;
 if(!Object.prototype.hasOwnProperty.call(LEVELS,cfg.volume))cfg.volume='medium';
 if(!STYLES.includes(cfg.style))cfg.style='balanced';
 return cfg;
};
function write(patch){
 const value={...read(),...patch};
 try{
  if(typeof store!=='undefined'&&typeof store.set==='function')store.set(KEY,value);
  else localStorage.setItem(KEY,JSON.stringify(value));
 }catch(error){console.warn('Ratib feedback preference not saved',error);return false;}
 syncUI();return true;
}
function muteReminders(){try{return typeof store!=='undefined'&&typeof store.get==='function'&&store.get('notification_sound_enabled',true)===false}catch(_){return false}}
function availableAudio(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{audio=audio||new AC();return audio}catch(error){console.warn('Ratib WebAudio unavailable',error);return null}}
function unlock(){
 if(!read().master||muteReminders()&&read().save===false)return;
 const ctx=availableAudio();
 if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
}
const PATTERNS={
 save:[[0,523,.13],[.125,784,.21]],
 reminder:[[0,587,.17],[.21,740,.18],[.44,988,.31]],
 urgent:[[0,659,.13],[.18,659,.13],[.38,988,.26]],
 critical:[[0,740,.16],[.21,740,.16],[.43,932,.21],[.68,1174,.28]],
 warning:[[0,494,.14],[.22,392,.24]],
 error:[[0,370,.15],[.17,294,.24]]
};
function play(kind='reminder',priority='',test=false){
 const cfg=read();
 if(!cfg.master||LEVELS[cfg.volume]<=0)return false;
 const category=kind==='critical'||kind==='urgent'?'reminder':kind;
 if(cfg[category]===false||(category==='reminder'&&muteReminders()))return false;
 const now=Date.now(),id=kind+':'+priority;
 if(!test&&now-(lastPlayed.get(id)||0)<(category==='reminder'?1800:category==='save'?650:1000))return false;
 const ctx=availableAudio();if(!ctx)return false;
 const steps=PATTERNS[kind]||PATTERNS.reminder;
 const makeSound=()=>{
  if(ctx.state!=='running')return;
  const base=ctx.currentTime+.025;
  const gainScale=(cfg.style==='soft'?.12:cfg.style==='clear'?.21:.16)*LEVELS[cfg.volume];
  try{
   steps.forEach(([offset,frequency,duration],i)=>{
    const osc=ctx.createOscillator(),env=ctx.createGain();
    osc.type=cfg.style==='clear'?'triangle':'sine';
    osc.frequency.setValueAtTime(frequency,base+offset);
    env.gain.setValueAtTime(.0001,base+offset);
    env.gain.exponentialRampToValueAtTime(gainScale*(i===steps.length-1?1:.82),base+offset+.018);
    env.gain.exponentialRampToValueAtTime(.0001,base+offset+duration);
    osc.connect(env);env.connect(ctx.destination);
    osc.start(base+offset);osc.stop(base+offset+duration+.018);
   });
  }catch(error){console.warn('Ratib audio playback issue',error);}
 };
 if(ctx.state==='suspended')ctx.resume().then(makeSound).catch(()=>{});
 else makeSound();
 lastPlayed.set(id,now);return true;
}
const isReminderMessage=message=>/تذكير مستحق|حان موعد التذكير/.test(message);
const isSaveMessage=message=>/تم (?:حفظ|الحفظ)|حُفظ|حفظ .* بنجاح|تمت (?:إضافة|عملية الحفظ)/.test(message);
const isSaveError=message=>/حفظ|نسخ احتياطي|فشل|تعذ[ّْ]?ر/.test(message);
let noticeId=0;
function toast(message,type='info',timeout=3200,options={}){
 const stack=$('toastStack');if(!stack)return false;
 const body=safeText(message),category=options.kind||(isReminderMessage(body)?'reminder':type==='success'?'success':type==='error'?'error':type==='warn'?'warning':'info');
 const persistent=type==='error'&&isSaveError(body);
 const duration=persistent?0:category==='reminder'?Math.max(10000,Math.min(12000,Number(timeout)||12000)):Math.max(2400,Math.min(12000,Number(timeout)||3200));
 // A burst of events should not cover the entire screen.
 const prior=[...stack.querySelectorAll('.ratib-feedback-notice')];
 if(prior.length>=3){
  const disposable=prior.find(el=>el.dataset.persistent!=='true');
  if(disposable)disposable.remove();
 }
 if(category!=='reminder'&&!options.silent){
  if(type==='success'&&isSaveMessage(body))play('save');
  else if(type==='error'&&isSaveError(body))play('error');
  else if(type==='warn'&&/تعذ|فشل|متأخر|عاجل|تحذير/.test(body))play('warning');
 }
 const icon={success:'✓',reminder:'♬',warning:'!',error:'×',info:'i'}[category]||'i';
 const heading={success:'تمت العملية بنجاح',reminder:'حان موعد التذكير',warning:'تنبيه مهم',error:'تعذر تنفيذ العملية',info:'إشعار'}[category]||'إشعار';
 const el=document.createElement('section');el.className='ratib-feedback-notice ratib-feedback-'+category;el.setAttribute('role',category==='error'||category==='reminder'?'alert':'status');
 el.dataset.persistent=String(persistent);el.dataset.noticeId=String(++noticeId);
 const mark=document.createElement('span');mark.className='ratib-feedback-symbol';mark.textContent=icon;mark.setAttribute('aria-hidden','true');
 const text=document.createElement('div');text.className='ratib-feedback-copy';
 const head=document.createElement('strong');head.textContent=heading;
 const detail=document.createElement('span');detail.textContent=body;text.append(head,detail);
 const close=document.createElement('button');close.type='button';close.className='ratib-feedback-close';close.setAttribute('aria-label','إغلاق التنبيه');close.textContent='×';
 const destroy=()=>{if(!el.isConnected)return;el.classList.add('ratib-feedback-exit');el.addEventListener('animationend',()=>el.remove(),{once:true});setTimeout(()=>el.remove(),350);};
 close.addEventListener('click',destroy);el.append(mark,text,close);
 if(options.actions?.length){
  const actions=document.createElement('div');actions.className='ratib-feedback-actions';
  for(const action of options.actions){
   if(typeof action?.run!=='function')continue;
   const button=document.createElement('button');button.type='button';button.textContent=safeText(action.label);button.addEventListener('click',()=>{destroy();action.run();});
   actions.append(button);
  }
  text.append(actions);
 }
 if(duration){
  const track=document.createElement('div');track.className='ratib-feedback-track';
  const bar=document.createElement('span');bar.style.animationDuration=duration+'ms';track.append(bar);el.append(track);
  setTimeout(destroy,duration);
 }
 stack.append(el);
 let start=0;
 el.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;start=e.clientX||0;});
 el.addEventListener('pointerup',e=>{if(e.target.closest('button')||!start)return;if(Math.abs((e.clientX||0)-start)>75)destroy();start=0;});
 return true;
}
function localDateParts(date){
 const n=x=>String(x).padStart(2,'0');
 return {date:date.getFullYear()+'-'+n(date.getMonth()+1)+'-'+n(date.getDate()),time:n(date.getHours())+':'+n(date.getMinutes())};
}
function reminder(reminder,findReminder,saveReminders,openReminderModal,renderRemindersList,updateProDashboard){
 const r=reminder||{},severity=r.priority==='حرجة جداً'?'critical':r.priority==='عاجلة'?'urgent':'reminder';
 const active=()=>{
  const i=findReminder();return i>=0?i:-1;
 };
 const snooze=()=>{
  const i=active();if(i<0){toast('لم يعد التذكير موجودًا.','info');return;}
  // Postpone only after the user presses the action; normal notification never edits due times.
  const list=window.RatibFeedback.getCurrentReminders?.()||[];
  if(!list[i])return;
  const value=localDateParts(new Date(Date.now()+10*60000));
  list[i]={...list[i],date:value.date,time:value.time};
  saveReminders(list);
  renderRemindersList?.();updateProDashboard?.();
  toast('تم تأجيل التذكير عشر دقائق.','info',3500);
 };
 const open=()=>{const i=active();if(i<0){toast('لم يعد التذكير موجودًا.','info');return;}openReminderModal(i);};
 toast('⏰ تذكير مستحق: '+safeText(r.title),'warn',12000,{kind:'reminder',silent:true,actions:[{label:'فتح التذكير',run:open},{label:'تأجيل 10 دقائق',run:snooze}]});
 play(severity,r.priority||'');
}
function syncUI(){
 const card=$('ratibFeedbackSettings');if(!card)return;
 const cfg=read();
 for(const k of ['master','save','reminder','warning','error']){
  const input=card.querySelector('[data-feedback-toggle="'+k+'"]');if(input)input.checked=cfg[k];
 }
 for(const k of ['volume','style']){const select=card.querySelector('[data-feedback-select="'+k+'"]');if(select)select.value=cfg[k];}
 const status=$('notificationSoundStatus');
 if(status)status.textContent=!cfg.master?'مكتوم بالكامل':muteReminders()?'التذكيرات مكتومة':'مفعّل';
}
function install(){
 const parent=$('notificationSoundCard')?.querySelector('.settings-accordion-body');
 if(!parent||$('ratibFeedbackSettings'))return;
 const box=document.createElement('section');box.id='ratibFeedbackSettings';box.className='ratib-feedback-settings';
 box.innerHTML='<h3>🎶 أصوات الحفظ والتذكير والتنبيه</h3><p>أصوات مختلفة قصيرة، ومرتبطة بنجاح العملية الفعلي. يمكنك كتمها أو تغيير وضوحها.</p>'+
 '<label class="ratib-feedback-setting-row"><span>تفعيل جميع الأصوات</span><input type="checkbox" data-feedback-toggle="master"></label>'+
 '<label class="ratib-feedback-setting-row"><span>صوت نجاح الحفظ</span><input type="checkbox" data-feedback-toggle="save"></label>'+
 '<label class="ratib-feedback-setting-row"><span>أصوات التذكيرات</span><input type="checkbox" data-feedback-toggle="reminder"></label>'+
 '<label class="ratib-feedback-setting-row"><span>أصوات التحذيرات</span><input type="checkbox" data-feedback-toggle="warning"></label>'+
 '<label class="ratib-feedback-setting-row"><span>صوت الأخطاء</span><input type="checkbox" data-feedback-toggle="error"></label>'+
 '<div class="ratib-feedback-select-row"><label for="ratibFeedbackVolume">مستوى الصوت</label><select id="ratibFeedbackVolume" data-feedback-select="volume"><option value="low">منخفض</option><option value="medium">متوسط</option><option value="high">واضح</option></select></div>'+
 '<div class="ratib-feedback-select-row"><label for="ratibFeedbackStyle">طابع النغمة</label><select id="ratibFeedbackStyle" data-feedback-select="style"><option value="soft">هادئ</option><option value="balanced">متوازن</option><option value="clear">واضح</option></select></div>'+
 '<div class="ratib-feedback-try"><button type="button" data-feedback-test="save">تجربة الحفظ</button><button type="button" data-feedback-test="reminder">تجربة التذكير</button><button type="button" data-feedback-test="urgent">تجربة العاجل</button><button type="button" data-feedback-test="error">تجربة الخطأ</button></div>'+
 '<button type="button" id="ratibFeedbackDefaults" class="btn btn-ghost">استعادة إعدادات الصوت الافتراضية</button>'+
 '<p class="ratib-feedback-guidance">قد يحتاج المتصفح إلى لمسة أولى لتفعيل الصوت. تنبيهات نسخة الويب تعمل أثناء فتح التطبيق، ولا تضمن إصدار صوت بعد إغلاقه.</p>';
 parent.append(box);
 for(const input of box.querySelectorAll('[data-feedback-toggle]'))input.addEventListener('change',()=>write({[input.dataset.feedbackToggle]:input.checked}));
 for(const select of box.querySelectorAll('[data-feedback-select]'))select.addEventListener('change',()=>write({[select.dataset.feedbackSelect]:select.value}));
 for(const btn of box.querySelectorAll('[data-feedback-test]'))btn.addEventListener('click',()=>{
  const key=btn.dataset.feedbackTest;
  if(!play(key,'',true))toast('الصوت مكتوم أو لم يمنح المتصفح إذن تشغيله. تأكد من التفعيل.', 'info',4500,{silent:true});
 });
 $('ratibFeedbackDefaults')?.addEventListener('click',()=>{write(DEFAULTS);toast('عادت إعدادات الأصوات الافتراضية.','info',3000,{silent:true});});
 syncUI();
}
window.RatibFeedback={toast,play,reminder,read,write,syncUI,install,getCurrentReminders:null};
document.addEventListener('pointerdown',unlock,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();