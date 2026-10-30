/* Ratib trial date interface — dates stored by the ledger remain ISO/Gregorian. */
(function(){
'use strict';
var KEY='ratib-hijri-first-trial', MONTHS=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
var pref={main:'h',showOther:true};
try{var old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){pref.main=old.main==='g'?'g':'h';pref.showOther=old.showOther!==false;}}catch(e){}
// Existing non-Umm-al-Qura preferences are retired; only the Hijri/Gregorian display choice survives.
save();
function save(){try{localStorage.setItem(KEY,JSON.stringify(pref));}catch(e){}}
var umalqura=null;
try{var fmt=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'});if(fmt.resolvedOptions().calendar==='islamic-umalqura')umalqura=fmt;}catch(e){}
if(!umalqura){console.warn('تقويم أم القرى غير مدعوم في هذا المتصفح؛ لم يتم استخدام تقويم هجري بديل.');return;}
function valid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'));}
function epoch(s){return Math.floor(Date.parse(s+'T12:00:00Z')/86400000);}
function iso(day){return new Date(day*86400000).toISOString().slice(0,10);}
function plus(s,n){return iso(epoch(s)+n);}
function today(){var d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function month(y,m,delta){var index=y*12+(m-1)+delta;return {y:Math.floor(index/12),m:index%12+1};}
function base(s){var p=umalqura.formatToParts(new Date(s+'T12:00:00Z'));function v(k){return Number(p.find(function(x){return x.type===k;}).value);}return {y:v('year'),m:v('month'),d:v('day')};}
var baseStarts={};
function baseStart(y,m){var key=y+'-'+m;if(baseStarts[key])return baseStarts[key];var l=epoch('1900-01-01'),r=epoch('2100-12-31'),found=null;while(l<=r){var mid=Math.floor((l+r)/2),h=base(iso(mid)),c=(h.y-y)*12+h.m-m;if(c>=0){if(c===0)found=iso(mid);r=mid-1;}else l=mid+1;}baseStarts[key]=found;return found;}
function start(y,m){return baseStart(y,m);}
function hdate(s){return valid(s)?base(s):null;}
function formatted(s){var h=hdate(s);return h&&h.m>=1&&h.m<=12?String(h.d)+' '+MONTHS[h.m-1]+' '+h.y+' هـ':s;}
function first(s){return pref.main==='h'?formatted(s):s;}
function second(s){return pref.main==='h'?s:formatted(s);}
function reverse(y,m,d){var st=start(y,m),nx=month(y,m,1),end=start(nx.y,nx.m);if(!st||!end||d<1||d>epoch(end)-epoch(st))return null;return plus(st,d-1);}
var css=document.createElement('style');css.textContent=[
'.ratib-native-date-wrap{position:relative;display:block!important;width:100%;min-height:44px;box-sizing:border-box;min-width:0}',
'.ratib-native-date-wrap>input[type=date]{height:44px!important;min-height:44px!important;width:100%!important;opacity:0!important;pointer-events:none!important}',
'.ratib-native-date-button{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;width:100%;box-sizing:border-box;border:1px solid var(--border,#bbb);border-radius:8px;background:var(--card,#fff);color:var(--text,#222);font:700 13px/1.3 Tajawal,system-ui,sans-serif;text-align:right;direction:rtl;cursor:pointer;padding:3px 8px;overflow:hidden;white-space:nowrap}',
'.ratib-native-date-button>span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
'.ratib-native-date-button small,.ratib-hijri-text small{display:block;font:400 10px/1.35 Tajawal,system-ui,sans-serif!important;color:var(--muted,#777)!important;direction:ltr;text-align:right}',
'.ratib-hijri-text{display:inline-flex;flex-direction:column;vertical-align:middle;direction:rtl;align-items:flex-start;line-height:1.4}',
'.ratib-hijri-text small{font-size:10px!important}',
'#ratib-hijri-dialog[hidden]{display:none!important}',
'#ratib-hijri-dialog{position:fixed;inset:0;z-index:2147483000;background:#0008;display:flex;justify-content:center;align-items:flex-end;padding:10px;box-sizing:border-box;direction:rtl}',
'#ratib-hijri-dialog .h-box{width:min(430px,100%);max-height:calc(100dvh - 20px);overflow-y:auto;padding:13px;border-radius:14px;background:var(--card,#fff);color:var(--text,#222);font:14px Tajawal,system-ui,sans-serif;box-sizing:border-box}',
'#ratib-hijri-dialog .h-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:9px 0}',
'#ratib-hijri-dialog label{display:flex;flex-direction:column;gap:3px;color:var(--muted,#777);min-width:0}',
'#ratib-hijri-dialog select,#ratib-hijri-dialog input,#ratib-hijri-dialog button{font:inherit;border:1px solid var(--border,#bbb);border-radius:8px;background:var(--card,#fff);color:var(--text,#222);padding:7px;min-height:39px;box-sizing:border-box}',
'#ratib-hijri-dialog select,#ratib-hijri-dialog input{width:100%}',
'#rhSettingsGregorian{width:100%;min-height:43px;border:1px solid var(--border,#bbb);border-radius:8px;padding:8px;background:var(--card,#fff);color:var(--text,#222);box-sizing:border-box;margin:4px 0 10px}',
'#ratib-hijri-dialog .h-bar{display:grid;grid-template-columns:43px 1fr 72px 43px;gap:4px;margin:7px 0}',
'#ratib-hijri-dialog .h-days,#ratib-hijri-dialog .h-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}',
'#ratib-hijri-dialog .h-week{font-size:10px;color:var(--muted,#777)}',
'#ratib-hijri-dialog .h-days button{min-width:0;padding:4px 0}',
'#ratib-hijri-dialog .h-days button[aria-pressed=true]{background:var(--accent,#067451);color:white}',
'#ratib-hijri-dialog .h-actions{display:flex;gap:7px;justify-content:space-between;margin-top:9px}',
'#ratib-hijri-dialog .h-note{font-size:11px;line-height:1.5;color:var(--muted,#777);margin-top:8px}',
'.ratib-hijri-settings{border:1px solid var(--border,#bbb);border-radius:8px;background:var(--card,#fff);color:var(--accent,#067451);padding:8px 12px;margin:7px 0;cursor:pointer;font:700 13px Tajawal,system-ui,sans-serif}',
  '#rhSettingsCard .settings-accordion-body select{width:100%;min-height:43px;border:1px solid var(--border,#bbb);border-radius:8px;padding:8px;background:var(--card,#fff);color:var(--text,#222);margin:4px 0 10px}',
  '#rhSettingsCard .settings-accordion-body>label{display:block;font-weight:700}',
'@media(min-width:650px){#ratib-hijri-dialog{align-items:center}}',
'@media print{#ratib-hijri-dialog,.ratib-hijri-settings{display:none!important}.ratib-native-date-wrap>input[type=date]{display:none!important}}'
].join('');document.head.appendChild(css);
var $=function(id){return document.getElementById(id);},dialog=null,target=null,view=null,lastFocus=null,dialogDate=null;
function draw(){
 if(!dialog)return;
 $('rhMain').value=pref.main;$('rhOther').checked=pref.showOther;
 $('rhHijri').hidden=pref.main!=='h';
 $('rhMonth').value=String(view.m);$('rhYear').value=String(view.y);
 var current=target&&valid(target.value)?target.value:(valid(dialogDate)?dialogDate:today());
 $('rhGregorianDate').value=current;
 $('rhResult').textContent='التاريخ المحدد: '+formatted(current)+' — '+current;
 var days=$('rhDays');days.replaceChildren();
 if(pref.main==='g')return;
 var firstDay=start(view.y,view.m),next=month(view.y,view.m,1),nextDay=start(next.y,next.m);
 if(!firstDay||!nextDay){days.textContent='التاريخ خارج نطاق التقويم';return;}
 var lead=new Date(firstDay+'T12:00:00Z').getUTCDay();
 for(var k=0;k<lead;k++)days.appendChild(document.createElement('span'));
 var length=epoch(nextDay)-epoch(firstDay);
 for(var day=1;day<=length;day++){(function(day){var b=document.createElement('button');b.type='button';b.textContent=String(day);var value=plus(firstDay,day-1);b.setAttribute('aria-pressed',String(value===current));b.setAttribute('aria-label',day+' '+MONTHS[view.m-1]+' '+view.y+' هجري');b.onclick=function(){if(target){setDate(target,value);close();}else{dialogDate=value;draw();}};days.appendChild(b);})(day);}
}
function close(){if(!dialog)return;dialog.hidden=true;target=null;if(lastFocus&&lastFocus.isConnected)lastFocus.focus({preventScroll:true});lastFocus=null;}
function ensure(){
 if(dialog)return;dialog=document.createElement('div');dialog.id='ratib-hijri-dialog';dialog.hidden=true;
 dialog.innerHTML='<div class="h-box" role="dialog" aria-modal="true" aria-label="اختيار التاريخ" dir="rtl"><div style="display:flex;align-items:center;justify-content:space-between"><strong style="font-size:17px;color:var(--accent,#067451)">التاريخ (الهجري: أم القرى)</strong><button id="rhClose" type="button">إغلاق ✕</button></div><div class="h-row"><label>التقويم الأساسي<select id="rhMain"><option value="h">هجري – أم القرى</option><option value="g">ميلادي</option></select></label><label>التقويم الميلادي<input id="rhGregorianDate" type="date"></label></div><label style="flex-direction:row;align-items:center;margin:7px 0"><input type="checkbox" id="rhOther" style="width:18px;min-height:18px">إظهار التاريخ المقابل بخط صغير</label><div id="rhHijri"><div class="h-bar"><button type="button" id="rhPrev">‹</button><select id="rhMonth"></select><input id="rhYear" type="number" min="1350" max="1550" aria-label="السنة الهجرية"><button id="rhNext" type="button">›</button></div><div class="h-week"><span>أحد</span><span>إثنين</span><span>ثلاثاء</span><span>أربعاء</span><span>خميس</span><span>جمعة</span><span>سبت</span></div><div class="h-days" id="rhDays"></div></div><div id="rhResult" class="h-note"></div><div class="h-actions"><button id="rhToday" type="button">اليوم</button><button id="rhDone" type="button">إغلاق</button></div><p class="h-note">التقويم الهجري المعتمد هو أم القرى فقط. التاريخ الميلادي المقابل من اليوم نفسه. لا تتغير تواريخ القيود لمجرد تغيير طريقة العرض.</p></div>';
 document.body.appendChild(dialog);
 MONTHS.forEach(function(name,i){var opt=document.createElement('option');opt.value=String(i+1);opt.textContent=name;$('rhMonth').appendChild(opt);});
 $('rhClose').onclick=close;$('rhDone').onclick=close;dialog.onclick=function(e){if(e.target===dialog)close();};dialog.onkeydown=function(e){if(e.key==='Escape')close();};
 $('rhMain').onchange=function(e){pref.main=e.target.value;save();refresh();draw();};
 $('rhGregorianDate').onchange=function(e){var date=e.target.value;if(!valid(date))return;dialogDate=date;view=hdate(date);if(target){setDate(target,date);close();}else draw();};
 $('rhOther').onchange=function(e){pref.showOther=e.target.checked;save();refresh();draw();};
 $('rhMonth').onchange=function(e){view.m=Number(e.target.value);draw();};
 $('rhYear').onchange=function(e){var y=Number(e.target.value);if(y>=1350&&y<=1550){view.y=y;draw();}};
 $('rhPrev').onclick=function(){view=month(view.y,view.m,-1);draw();};
 $('rhNext').onclick=function(){view=month(view.y,view.m,1);draw();};
 $('rhToday').onclick=function(){dialogDate=today();if(target){setDate(target,dialogDate);close();}else{view=hdate(dialogDate);draw();}};
}
function open(input){ensure();target=input||null;lastFocus=document.activeElement;dialogDate=target&&valid(target.value)?target.value:today();view=hdate(dialogDate);draw();dialog.hidden=false;$('rhClose').focus({preventScroll:true});}
var fields=new Set(),marker=new WeakSet(),descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
function sync(input){
 var b=input._ratibDateButton;if(!b)return;var s=valid(input.value)?input.value:'';
 var title=s?first(s):'اختر التاريخ',other=s&&pref.showOther?second(s):'';
 if(b._title===title&&b._other===other)return;b._title=title;b._other=other;
 b.replaceChildren();var strong=document.createElement('span');strong.textContent=title;b.appendChild(strong);
 if(other){var sm=document.createElement('small');sm.textContent=other;b.appendChild(sm);}
 b.setAttribute('aria-label',title+(other?' الموافق '+other:'')+', اضغط لاختيار تاريخ');
}
function wrap(input){
 if(marker.has(input))return;marker.add(input);fields.add(input);
 var host=document.createElement('span');host.className='ratib-native-date-wrap';
 var b=document.createElement('button');b.className='ratib-native-date-button';b.type='button';
 input.before(host);host.append(input,b);input._ratibDateWrapper=host;input._ratibDateButton=b;
 b.onclick=function(e){e.preventDefault();open(input);};
 try{Object.defineProperty(input,'value',{configurable:true,get:function(){return descriptor.get.call(this);},set:function(v){descriptor.set.call(this,v);sync(input);}});}catch(e){}
 input.addEventListener('input',function(){sync(input);});input.addEventListener('change',function(){sync(input);});if(input.form)input.form.addEventListener('reset',function(){setTimeout(function(){sync(input);},0);});sync(input);
}
function setDate(input,s){input.value=s;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));sync(input);decorate();}
var scopes=['#reportAccountOpsPanel','#pageAccountOperations','#statementBody','#printStatementContainer','#printPreviewBody','#pvDate','.tx-date-line','.tx-log-item','.global-result'];
var pattern=/\b(?:19\d\d|20\d\d|2100)[-\/](?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12]\d|3[01])\b/g;
function spanDate(s){var el=document.createElement('span');el.className='ratib-hijri-text';el.dataset.iso=s;renderSpan(el);return el;}
function dateMarkup(s){
 if(!valid(s))return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
 var primary=first(s),secondary=pref.showOther?second(s):'';
 return '<span class="ratib-hijri-text" data-iso="'+s+'"><span>'+primary+'</span>'+(secondary?'<small>'+secondary+'</small>':'')+'</span>';
}
function dateForExport(s){if(!valid(s))return String(s||'');return first(s)+(pref.showOther?' / '+second(s):'');}

function renderSpan(el){var s=el.dataset.iso;if(!valid(s))return;var p=first(s),q=pref.showOther?second(s):'';if(el._p===p&&el._q===q)return;el._p=p;el._q=q;el.replaceChildren();var title=document.createElement('span');title.textContent=p;el.appendChild(title);if(q){var sm=document.createElement('small');sm.textContent=q;el.appendChild(sm);}}
function decorate(){
 var nodes=document.querySelectorAll(scopes.join(','));nodes.forEach(function(root){
  var walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),matches=[],node;
  while((node=walk.nextNode())){if(!node.parentElement||node.parentElement.closest('.ratib-hijri-text,script,style,button,textarea,select'))continue;
   pattern.lastIndex=0;if(pattern.test(node.nodeValue))matches.push(node);if(matches.length>=500)break;
  }
  matches.forEach(function(t){var str=t.nodeValue,frag=document.createDocumentFragment(),prev=0,m;pattern.lastIndex=0;
   while((m=pattern.exec(str))){var s=m[0].replace(/\//g,'-');if(!valid(s))continue;
    if(m.index>prev)frag.appendChild(document.createTextNode(str.slice(prev,m.index)));frag.appendChild(spanDate(s));prev=m.index+m[0].length;}
   if(prev){if(prev<str.length)frag.appendChild(document.createTextNode(str.slice(prev)));t.replaceWith(frag);}
  });
 });
 document.querySelectorAll('.ratib-hijri-text[data-iso]').forEach(renderSpan);
}
function syncSettingsControls(){
 var main=$('rhSettingsMain'),greg=$('rhSettingsGregorian'),other=$('rhSettingsOther'),example=$('rhSettingsExample');
 if(main&&main.value!==pref.main)main.value=pref.main;
 if(greg&&!valid(greg.value))greg.value=today();
 if(other&&other.checked!==pref.showOther)other.checked=pref.showOther;
 if(example){
  var s=greg&&valid(greg.value)?greg.value:today(),primary=first(s),secondary=pref.showOther?second(s):'';
  var stamp=primary+'|'+secondary;
  if(example.dataset.stamp!==stamp){
   example.dataset.stamp=stamp;example.replaceChildren();
   var title=document.createElement('strong');title.textContent=primary;example.append(title);
   if(secondary){var small=document.createElement('small');small.textContent=secondary;example.append(small);}
  }
 }
}
function refresh(){fields.forEach(function(input){if(input.isConnected)sync(input);});decorate();syncSettingsControls();}
function scan(){document.querySelectorAll('input[type=date]').forEach(function(input){if(input.closest('#ratib-hijri-dialog'))return;if(!marker.has(input))wrap(input);else if(input._ratibDateWrapper&&input.parentNode!==input._ratibDateWrapper){input.before(input._ratibDateWrapper);input._ratibDateWrapper.prepend(input);}});}
function addSettings(){
 var host=$('pageSettings');if(!host||$('rhSettingsCard'))return;
 var card=document.createElement('section');card.id='rhSettingsCard';
 card.className='card settings-accordion-card no-print';card.dataset.ratibCreated='calendar';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0"><span>☾ التاريخ والتقويم</span><span class="accordion-arrow">▼</span></div>'+
 '<div class="settings-accordion-body" onclick="event.stopPropagation()" style="display:none">'+
 '<p style="color:var(--muted);margin:0 0 10px">التاريخ الأساسي يظهر في السندات وكشف الحساب والطباعة، والتاريخ المقابل تحته بخط أصغر حسب اختيارك. لا تتغير تواريخ القيود المحفوظة.</p>'+
 '<label for="rhSettingsMain">التقويم الأساسي</label><select id="rhSettingsMain"><option value="h">هجري – أم القرى</option><option value="g">ميلادي</option></select>'+
 '<label for="rhSettingsGregorian">التقويم الميلادي (للمعاينة)</label><input id="rhSettingsGregorian" type="date" aria-label="اختر التاريخ الميلادي للمعاينة">'+
 '<label for="rhSettingsOther" style="display:flex;align-items:center;gap:8px;margin:12px 0"><input id="rhSettingsOther" type="checkbox" style="width:20px;height:20px;flex:0 0 20px">إظهار التاريخ المقابل بخط صغير</label>'+
 '<div style="border:1px solid var(--border);border-radius:9px;padding:10px;margin:8px 0"><div style="font-size:.78rem;color:var(--muted)">معاينة التاريخ الحالي</div><div id="rhSettingsExample" class="ratib-hijri-text" style="margin-top:5px"></div></div>'+
 '<button type="button" id="rhSettingsButton" class="ratib-hijri-settings">فتح التقويم وتجربة اختيار التاريخ</button></div>';
 host.append(card);
 $('rhSettingsMain').onchange=function(e){pref.main=e.target.value==='g'?'g':'h';save();refresh();};
 $('rhSettingsGregorian').onchange=function(){syncSettingsControls();};
 $('rhSettingsOther').onchange=function(e){pref.showOther=e.target.checked;save();refresh();};
 $('rhSettingsButton').onclick=function(e){e.stopPropagation();open(null);};
 syncSettingsControls();
}
var pending=false;function queue(){if(pending)return;pending=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16);})(function(){pending=false;scan();addSettings();decorate();});}
function init(){scan();addSettings();decorate();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});window.addEventListener('beforeprint',decorate);window.RatibHijriFirst={format:formatted,toISO:reverse,refresh:refresh,open:open,markup:dateMarkup,exportText:dateForExport,calendar:'umalqura'};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();