/* Ratib 3.6.189 — statement-only, customizable bottom tools.
 * Presentation and routing only. All reconciliation, posting, export and mark
 * mutations delegate to existing Ratib handlers. */
(()=>{'use strict';
const PAGE='pageAccountOperations', KEY='ratib.ui.statement-nav.v1';
const DEF=[
 ['accounts','الحسابات','accounts'],['receipt','قبض','receipt'],['payment','صرف','payment'],
 ['simple','قيد بسيط','simple'],['compound','قيد مركب','compound'],
 ['search','بحث متقدم','search'],['match','تثبيت المطابقة','match'],
 ['clear','إزالة العلامات','clear'],['more','المزيد','more']
], OPTIONS=DEF.slice(1,-1), names=new Map(DEF.map(x=>[x[0],x]));
const paths={
 accounts:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2zM17 6a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/>',
 receipt:'<path d="M12 3v14m-5-5 5 5 5-5M4 20h16"/>',
 payment:'<path d="M12 21V7m-5 5 5-5 5 5M4 4h16"/>',
 simple:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
 compound:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
 match:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-13 5 2 2 5-5"/>',
 clear:'<path d="m4 15 10-11 6 6-10 11H5l-2-2 1-4zM11 21h10"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 settings:'<path d="M4 7h16M4 17h16M9 4v6M15 14v6"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>'
};
const $=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const svg=kind=>{const el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('viewBox','0 0 24 24');el.setAttribute('fill','none');el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width','1.8');el.setAttribute('stroke-linecap','round');el.setAttribute('stroke-linejoin','round');el.setAttribute('aria-hidden','true');el.innerHTML=paths[kind]||paths.more;return el;};
function defaultPrefs(){return OPTIONS.map(x=>x[0]);}
function validate(value){
 if(!Array.isArray(value))return defaultPrefs();
 return [...new Set(value.filter(k=>typeof k==='string'&&OPTIONS.some(x=>x[0]===k)))];
}
let prefs=defaultPrefs();
try{const raw=localStorage.getItem(KEY);if(raw!==null)prefs=validate(JSON.parse(raw));}catch(e){console.warn('تعذر استعادة إعداد شريط كشف الحساب',e);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(e){console.warn('تعذر حفظ إعداد الشريط',e);}}
function pageVisible(){const p=$(PAGE);return !!p&&!p.classList.contains('hidden')&&window.getComputedStyle(p).display!=='none';}
let nav,sheet,editorInSettings,searchInput,fromInput,toInput,sourceObserver=null;
function pill(kind){
 const item=names.get(kind),b=make('button','ratib-stmt-nav-button');
 b.type='button';b.dataset.statementTool=kind;b.setAttribute('aria-label',item[1]);b.title=item[1];
 b.append(svg(item[2]),make('small','',item[1]));
 b.addEventListener('click',()=>action(kind));
 return b;
}
function renderNav(){
 if(!nav)return;
 const selected=['accounts',...prefs,'more'];
 nav.replaceChildren(...selected.map(pill));
 nav.setAttribute('aria-label','شريط أدوات كشف الحساب');
 if(sheet&&!sheet.hidden){nav.querySelectorAll('[data-statement-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.statementTool===sheet.dataset.mode)));}
}
function close(){if(!sheet||sheet.hidden)return false;sheet.hidden=true;sheet.dataset.mode='';renderNav();return true;}
function open(mode,title){
 sheet.replaceChildren();
 sheet.hidden=false;sheet.dataset.mode=mode;
 const head=make('div','ratib-stmt-sheet-head');
 head.append(make('strong','',title));
 const dismiss=make('button','ratib-stmt-sheet-close','×');dismiss.type='button';dismiss.title='إغلاق';dismiss.setAttribute('aria-label','إغلاق اللوحة');dismiss.onclick=close;
 head.append(dismiss);sheet.append(head);renderNav();
}
function labelDate(placeholder,value=''){
 const wrap=make('div','ratib-stmt-date');
 const hint=make('span','ratib-stmt-date-hint',placeholder),input=make('input','ratib-stmt-date-control');
 input.type='date';input.lang='en-CA';input.dir='ltr';input.value=value||'';
 input.setAttribute('aria-label',placeholder);input.setAttribute('autocomplete','off');
 const update=()=>wrap.classList.toggle('ratib-stmt-date-filled',!!input.value);
 input.addEventListener('input',update);input.addEventListener('change',update);
 wrap.append(hint,input);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target===hint){try{input.showPicker?.();}catch(_){input.focus();}}});
 update();return {wrap,input};
}
function sourceField(){return $('ratibAccountMovementSearchInput');}
function setSearch(value){
 const field=sourceField();if(!field)return;
 if(field.value!==value){field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}
}
function openSearch(){
 open('search','البحث المتقدم');
 const input=make('input','ratib-stmt-query');input.type='search';
 input.placeholder='ابحث عن اسم أو بيان أو كلمة أو عملة...';
 input.setAttribute('aria-label',input.placeholder);
 input.autocomplete='off';input.value=sourceField()?.value||'';
 input.addEventListener('input',()=>setSearch(input.value));searchInput=input;
 const dates=make('div','ratib-stmt-date-row');
 const from=labelDate('من تاريخ',typeof accountOpsState==='object'?(accountOpsState.from||''):'');
 const to=labelDate('إلى تاريخ',typeof accountOpsState==='object'?(accountOpsState.to||''):'');
 from.input.max=to.input.value||'';to.input.min=from.input.value||'';
 from.input.addEventListener('change',()=>{to.input.min=from.input.value||'';if(to.input.value&&from.input.value&&to.input.value<from.input.value){to.input.value='';to.input.dispatchEvent(new Event('input'));}});
 to.input.addEventListener('change',()=>{from.input.max=to.input.value||'';});
 dates.append(from.wrap,to.wrap);fromInput=from.input;toInput=to.input;
 const controls=make('div','ratib-stmt-sheet-actions');
 const reset=make('button','ratib-stmt-secondary','مسح البحث');reset.type='button';
 reset.onclick=()=>{
  input.value='';setSearch('');
  from.input.value='';to.input.value='';from.input.dispatchEvent(new Event('input'));to.input.dispatchEvent(new Event('input'));
  const f=$('accountOpsFromDate'),t=$('accountOpsToDate');if(f)f.value='';if(t)t.value='';
  $('clearAccountOpsFilterBtn')?.click();
 };
 const apply=make('button','ratib-stmt-primary','عرض النتائج');apply.type='button';
 apply.onclick=()=>{
  const f=from.input.value,t=to.input.value;
  if(f&&t&&f>t){window.showToast?.('تاريخ البداية يجب أن يسبق تاريخ النهاية','warn');return;}
  const sourceFrom=$('accountOpsFromDate'),sourceTo=$('accountOpsToDate'),currency=$('accountOpsCurrencyFilter');
  if(sourceFrom)sourceFrom.value=f;if(sourceTo)sourceTo.value=t;if(currency)currency.value='ALL';
  setSearch(input.value);
  const real=$('applyAccountOpsFilterBtn');
  if(real){real.click();close();}
  else window.showToast?.('تعذر الوصول إلى خيارات بحث الحساب','error');
 };
 controls.append(reset,apply);
 const count=make('small','ratib-stmt-search-results');
 count.textContent=$('ratibAccountMovementSearchCount')?.textContent||'';
 sheet.append(input,dates,controls,count);
 if(sourceObserver)sourceObserver.disconnect();
 const originalCount=$('ratibAccountMovementSearchCount');
 if(originalCount){
  sourceObserver=new MutationObserver(()=>{if(count.isConnected)count.textContent=originalCount.textContent;});
  sourceObserver.observe(originalCount,{childList:true,characterData:true,subtree:true});
 }
 requestAnimationFrame(()=>input.focus({preventScroll:true}));
}
function activeCurrencyPage(){
 const p=$('accountOperationsStandalonePanel');
 const curr=typeof accountOpsState==='object'?accountOpsState.activeCurrency:'';
 return [...(p?.querySelectorAll('.account-currency-page')||[])].find(x=>x.dataset.currency===curr)||p?.querySelector('.account-currency-page')||null;
}
function realReconcileButtons(){
 const bar=activeCurrencyPage()?.querySelector('.ratib-reconcile-bar');
 const fields=bar?.querySelector('.ratib-match-fields')||bar;
 return {input:fields?.querySelector('input[type="date"]'),save:fields?.querySelector('button.btn-primary'),clear:fields?.querySelector('button.btn-ghost')};
}
function openMatch(){
 const real=realReconcileButtons();
 if(!real.input||!real.save){window.showToast?.('تعذر العثور على أدوات مطابقة الرصيد؛ افتح كشف الحساب من جديد.','warn');return;}
 const currency=activeCurrencyPage()?.dataset.currency||'';
 open('match','تثبيت مطابقة الرصيد — '+currency);
 const explanatory=make('p','ratib-stmt-hint','تسجّل المطابقة مراجعة الرصيد حتى التاريخ المختار، دون تعديل أي حركة أو سند.');
 const date=labelDate('تاريخ المطابقة',real.input.value||'');
 date.input.max=typeof getLocalTodayISO==='function'?getLocalTodayISO():'';
 const actions=make('div','ratib-stmt-sheet-actions');
 const cancel=make('button','ratib-stmt-secondary','إلغاء');cancel.type='button';cancel.onclick=close;
 const accept=make('button','ratib-stmt-primary','تأكيد المطابقة');accept.type='button';
 accept.onclick=()=>{
  if(!date.input.value){window.showToast?.('اختر تاريخ المطابقة','warn');return;}
  if(date.input.max&&date.input.value>date.input.max){window.showToast?.('لا يمكن تثبيت مطابقة في تاريخ مستقبلي','warn');return;}
  const live=realReconcileButtons();
  if(!live.input||!live.save)return;
  live.input.value=date.input.value;live.save.click();close();
 };
 actions.append(cancel,accept);
 sheet.append(explanatory,date.wrap,actions);
 if(real.clear&&!real.clear.hidden){
  const clear=make('button','ratib-stmt-danger','إلغاء المطابقة المحفوظة');clear.type='button';
  clear.onclick=()=>{if(!confirm('إلغاء تثبيت مطابقة الرصيد لهذه العملة؟ لن تُحذف أي حركة.'))return;realReconcileButtons().clear?.click();close();};
  sheet.append(clear);
 }
}
function openClear(){
 const count=window.RatibStatementMarks?.count?.()||0;
 open('clear','إزالة علامات المراجعة');
 sheet.append(make('p','ratib-stmt-hint',count?'عدد العلامات في هذا الحساب: '+count+'. لن تُحذف أي حركة محاسبية.':'لا توجد علامات مراجعة في هذا الحساب.'));
 const actions=make('div','ratib-stmt-sheet-actions');
 const cancel=make('button','ratib-stmt-secondary','رجوع');cancel.type='button';cancel.onclick=close;
 const execute=make('button','ratib-stmt-danger','إزالة العلامات');execute.type='button';execute.disabled=!count;
 execute.onclick=()=>{
  const btn=activeCurrencyPage()?.querySelector('[data-statement-mark-action="clear"]')
    ||$('accountOperationsStandalonePanel')?.querySelector('[data-statement-mark-action="clear"]');
  if(!btn){window.showToast?.('تعذر العثور على أدوات العلامات','warn');return;}
  btn.click();close();
 };
 actions.append(cancel,execute);sheet.append(actions);
}
function voucher(kind){
 if(typeof accountOpsState==='object'&&accountOpsState.aggregate){window.showToast?.('اختر حسابًا تفصيليًا لإضافة سند','warn');return;}
 if(kind==='receipt'||kind==='payment'){
  if(typeof createVoucherFromCurrentAccount==='function')createVoucherFromCurrentAccount(kind==='receipt'?'income':'spend');
  return;
 }
 if(typeof rememberQuickVoucherOrigin==='function')rememberQuickVoucherOrigin('pageAccountOperations');
 if(typeof accountOpsState==='object')preferredDebitAccountForNewVoucher=accountOpsState.accountName||'';
 if(typeof multiVoucherReturnTab!=='undefined')multiVoucherReturnTab='pageAccountOperations';
 if(typeof openDashboardVoucher==='function')openDashboardVoucher(kind==='simple'?'entry':'multi');
}
function action(kind){
 if(kind==='search')return sheet?.dataset.mode==='search'&&!sheet.hidden?close():openSearch();
 if(kind==='match')return sheet?.dataset.mode==='match'&&!sheet.hidden?close():openMatch();
 if(kind==='clear')return sheet?.dataset.mode==='clear'&&!sheet.hidden?close():openClear();
 if(kind==='more'){close();return $('accountScreenMenuToggle')?.click();}
 close();
 if(kind==='accounts'){if(typeof navigateToTab==='function')navigateToTab('pageAccountsTree',true);return;}
 if(['receipt','payment','simple','compound'].includes(kind))voucher(kind);
}
function renderEditor(host){
 if(!host)return;
 host.replaceChildren();
 host.append(make('p','ratib-stmt-hint','اختر الاختصارات التي تظهر أسفل كشف الحساب، وقدّمها أو أخّرها بالسهمين. الحسابات والمزيد ثابتان.'));
 const list=make('div','ratib-stmt-editor-list');
 const ordered=[...prefs,...OPTIONS.map(x=>x[0]).filter(x=>!prefs.includes(x))];
 for(const k of ordered){
  const opt=names.get(k),shown=prefs.includes(k),row=make('div','ratib-stmt-editor-row');
  const label=make('label','ratib-stmt-editor-option'),check=make('input');
  check.type='checkbox';check.checked=shown;check.setAttribute('aria-label','إظهار '+opt[1]);
  check.addEventListener('change',()=>{
   prefs=check.checked?[...prefs,k]:prefs.filter(x=>x!==k);
   save();renderNav();renderEditor(host);
   if(editorInSettings&&host!==editorInSettings)renderEditor(editorInSettings);
  });
  label.append(check,svg(opt[2]),make('span','',opt[1]));row.append(label);
  if(shown){
   const i=prefs.indexOf(k);
   for(const [delta,txt] of [[-1,'↑'],[1,'↓']]){
    const btn=make('button','ratib-stmt-order',txt);btn.type='button';btn.disabled=i+delta<0||i+delta>=prefs.length;
    btn.setAttribute('aria-label',(delta<0?'تقديم ':'تأخير ')+opt[1]);
    btn.addEventListener('click',()=>{
     const j=prefs.indexOf(k),other=j+delta;if(other<0||other>=prefs.length)return;
     [prefs[j],prefs[other]]=[prefs[other],prefs[j]];
     save();renderNav();renderEditor(host);
     if(editorInSettings&&host!==editorInSettings)renderEditor(editorInSettings);
    });row.append(btn);
   }
  }
  list.append(row);
 }
 host.append(list);
 const reset=make('button','ratib-stmt-secondary','استعادة الترتيب الافتراضي');reset.type='button';
 reset.onclick=()=>{prefs=defaultPrefs();save();renderNav();renderEditor(host);if(editorInSettings&&host!==editorInSettings)renderEditor(editorInSettings);};
 host.append(reset);
}
function openCustomize(){open('customize','تخصيص شريط كشف الحساب');const area=make('div','ratib-stmt-customize');sheet.append(area);renderEditor(area);}
function installSettings(){
 const page=$('pageSettings');if(!page)return;
 if($('ratibStatementNavSettings189'))return;
 const details=make('details','ratib-stmt-settings no-print');details.id='ratibStatementNavSettings189';
 details.append(make('summary','','تخصيص شريط كشف الحساب'));
 editorInSettings=make('div','ratib-stmt-customize');details.append(editorInSettings);
 const before=$('ratibBottomNavSettings170')||$('ratibSettingsHelp168');
 if(before?.parentElement===page)page.insertBefore(details,before);else page.append(details);
 details.addEventListener('toggle',()=>{if(details.open)renderEditor(editorInSettings);});
 renderEditor(editorInSettings);
}
function installMore(){
 const menu=$('accountScreenMenu');if(!menu||menu.querySelector('[data-statement-customize]'))return;
 const btn=make('button','ratib-stmt-customize-menu','⚙ تخصيص شريط كشف الحساب');
 btn.type='button';btn.dataset.statementCustomize='1';btn.setAttribute('role','menuitem');
 btn.addEventListener('click',()=>{close();openCustomize();});
 menu.append(btn);
}
function mount(){
 if(!$('pageAccountOperations')||nav)return;
 nav=make('nav','ratib-stmt-nav no-print');nav.id='ratibStmtNav189';
 sheet=make('section','ratib-stmt-sheet no-print');sheet.id='ratibStmtSheet189';sheet.hidden=true;
 sheet.setAttribute('aria-label','أدوات كشف الحساب');
 document.body.append(nav,sheet);
 renderNav();installMore();installSettings();
 const page=$(PAGE),observer=new MutationObserver(sync);
 observer.observe(page,{attributes:true,attributeFilter:['class','style']});
 window.addEventListener('pageshow',sync);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden){e.preventDefault();e.stopPropagation();close();}},true);
 sync();
 window.RatibStatementToolbar=Object.freeze({close,openCustomize,get:()=>prefs.slice(),set:keys=>{prefs=validate(keys);save();renderNav();renderEditor(editorInSettings);},reset:()=>{prefs=defaultPrefs();save();renderNav();renderEditor(editorInSettings);}});
}
function sync(){
 if(!nav)return;const visible=pageVisible();
 nav.hidden=!visible;
 if(!visible)close();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();