/* Ratib 3.6.170 — user-customizable bottom navigation.
 * Layout preferences only: never edit saved vouchers, posting or accounts. */
(()=>{'use strict';
const ID='ratibHomeBottomNav',KEY='ratib.ui.bottom-nav.v1',MAX=8;
const DEFINITIONS=[
 ['home','⌂','الرئيسية'],['operations','▤','العمليات'],['favorites','♡','مفضلتي'],
 ['reports','▥','التقارير'],['settings','⚙','الإعدادات'],['accounts','♙','الحسابات'],
 ['statement','▧','كشف الحساب'],['voucher','⇄','قبض وصرف'],['entry','▤','قيد بسيط'],
 ['multi','▣','قيد مركب'],['opening','▥','قيد افتتاحي'],['stock','▦','المخزون'],
 ['incoming','↧','الوارد'],['outgoing','↥','الصادر'],['pulse','◉','نبض الصندوق'],
 ['help','ⓘ','المساعدة']
];
const DEFAULT=['home','operations','favorites','reports','settings'];
const by=id=>document.getElementById(id),catalog=new Map(DEFINITIONS.map(v=>[v[0],v]));
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function validate(a){return Array.isArray(a)?[...new Set(a.filter(x=>typeof x==='string'&&catalog.has(x)))].slice(0,MAX):DEFAULT.slice();}
function load(){try{const saved=localStorage.getItem(KEY);return saved===null?DEFAULT.slice():validate(JSON.parse(saved));}catch(_){return DEFAULT.slice();}}
let chosen=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(chosen));}catch(e){console.warn('تعذر حفظ تخصيص الشريط',e);}}
function navigate(page){if(typeof window.navigateToTab==='function')window.navigateToTab(page,true);}
function go(kind){
 if(kind==='favorites'){(window.RatibQuickFavorites?.openQuick||window.RatibQuickFavorites?.open)?.();return;}
 if(['home','operations','reports','settings','accounts'].includes(kind)){navigate(({home:'pageDashboard',operations:'pageLedger',reports:'pageReports',settings:'pageSettings',accounts:'pageAccountsTree'})[kind]);return;}
 if(kind==='statement'){navigate('pageReports');if(typeof openAccountStatementSearch==='function')openAccountStatementSearch(false);return;}
 if(['voucher','entry','multi','opening'].includes(kind)){if(typeof window.openDashboardVoucher==='function')window.openDashboardVoucher(({voucher:'spend',entry:'entry',multi:'multi',opening:'opening'})[kind]);return;}
 if(['stock','incoming','outgoing'].includes(kind)){window.RatibCommerce?.open?.(({stock:'stock',incoming:'in',outgoing:'out'})[kind]);return;}
 if(kind==='pulse'){
  navigate('pageDashboard');
  const fold=by('dashboardCarousel'),foldBtn=by('ratibDashboardFoldToggle');
  if(fold?.dataset.ratibCollapsed==='true')foldBtn?.click();
  const t=by('ratibPulseToggle'),b=by('ratibPulseBody');if(b?.hidden)t?.click();
  requestAnimationFrame(()=>fold?.scrollIntoView({behavior:'smooth',block:'start'}));return;
 }
 if(kind==='help'){if(typeof window.RatibSupportOpen==='function')window.RatibSupportOpen();}
}
function openSettings(){
 navigate('pageSettings');
 requestAnimationFrame(()=>{
  const details=by('ratibBottomNavSettings170');if(!details)return;
  details.open=true;details.scrollIntoView({behavior:'smooth',block:'center'});details.querySelector('summary')?.focus({preventScroll:true});
 });
}
function button(kind){
 const opt=catalog.get(kind),b=el('button','ratib-bottom-choice');b.type='button';b.dataset.ratibPage=kind;b.setAttribute('aria-label',opt[2]);
 b.append(el('span','ratib-bottom-icon',opt[1]),el('small','',opt[2]));
 b.addEventListener('click',()=>go(kind));return b;
}
let nav,original=new Map(),newButtons=new Map(),editor,recovery,editShortcut;
function active(){
 const pages=['pageDashboard','pageLedger','pageReports','pageSettings','pageAccountsTree','pageCommerce','pageExpenses','pageAccountOperations'];
 const page=pages.find(p=>by(p)&&!by(p).classList.contains('hidden'));
 const current=({pageDashboard:'home',pageLedger:'operations',pageReports:'reports',pageSettings:'settings',pageAccountsTree:'accounts',pageCommerce:'stock'})[page]||'';
 for(const b of nav.querySelectorAll('.ratib-bottom-choice')){
  const yes=b.dataset.ratibPage===current;b.classList.toggle('active',yes);
  if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
}
function renderNav(){
 if(!nav)return;
 const nodes=[];
 for(const key of chosen){
  const b=original.get(key)||newButtons.get(key)||button(key);
  if(!original.has(key))newButtons.set(key,b);
  nodes.push(b);
 }
 if(!chosen.includes('settings')||!chosen.length){
  if(!editShortcut){editShortcut=el('button','ratib-bottom-manage','＋');editShortcut.type='button';editShortcut.setAttribute('aria-label','إضافة أو تعديل اختصارات الشريط');editShortcut.title='تخصيص شريط التنقل';editShortcut.addEventListener('click',openSettings);}
  nodes.push(editShortcut);
 }
 nav.replaceChildren(...nodes);
 nav.style.setProperty('--ratib-nav-vis',String(Math.min(Math.max(chosen.length+(nodes.includes(editShortcut)?1:0),1),5)));
 nav.dataset.ratibCustomizable='1';
 active();if(recovery)recovery.hidden=chosen.length!==0;
}
function renderEditor(){
 if(!editor)return;const list=editor.querySelector('.ratib-bottom-editor-list');list.replaceChildren();
 const ordered=[...chosen,...DEFINITIONS.map(x=>x[0]).filter(k=>!chosen.includes(k))];
 for(const key of ordered){
  const opt=catalog.get(key),isVisible=chosen.includes(key);
  const row=el('div','ratib-bottom-editor-row'),label=el('label','ratib-bottom-editor-option');
  const checked=el('input');checked.type='checkbox';checked.checked=isVisible;checked.setAttribute('aria-label','إظهار '+opt[2]);
  checked.addEventListener('change',()=>{
   if(checked.checked){if(chosen.length>=MAX){checked.checked=false;editor.querySelector('.ratib-bottom-editor-note').textContent='الحد الأقصى '+MAX+' اختصارات؛ احذف اختصارًا أولًا.';return;}chosen.push(key);}
   else chosen=chosen.filter(v=>v!==key);
   save();renderNav();renderEditor();
  });
  label.append(checked,el('span','ratib-bottom-editor-ico',opt[1]),el('span','',opt[2]));row.append(label);
  if(isVisible){
   const idx=chosen.indexOf(key),reorder=el('div','ratib-bottom-reorder');
   for(const [step,sign,title] of [[-1,'↑','تقديم'],[1,'↓','تأخير']]){
    const b=el('button','ratib-bottom-move',sign);b.type='button';b.disabled=idx+step<0||idx+step>=chosen.length;b.setAttribute('aria-label',title+' '+opt[2]);
    b.addEventListener('click',()=>{
     const now=chosen.indexOf(key),other=now+step;if(other<0||other>=chosen.length)return;
     [chosen[now],chosen[other]]=[chosen[other],chosen[now]];
     save();renderNav();renderEditor();
    });reorder.append(b);
   }row.append(reorder);
  }list.append(row);
 }
 editor.querySelector('.ratib-bottom-editor-note').textContent='اختر ما يظهر في الشريط، وغيّر ترتيبه بالسهمين. يمكن إزالة كل أيقونة بما فيها مفضلتي والإعدادات.';
}
function addEditor(){
 const host=by('pageSettings');if(!host)return;
 editor=by('ratibBottomNavSettings170');
 if(!editor){
  editor=el('details','ratib-bottom-editor no-print');editor.id='ratibBottomNavSettings170';
  const summary=el('summary','ratib-bottom-editor-heading','⚙️ تخصيص شريط التنقل السفلي');
  summary.tabIndex=0;
  const body=el('div','ratib-bottom-editor-body');
  body.append(el('p','ratib-bottom-editor-description','أضف أو احذف أو بدّل أي اختصار، بما في ذلك الرئيسية ومفضلتي والإعدادات. يظهر آخر اختيارك عند تشغيل التطبيق.'),
   el('div','ratib-bottom-editor-note',''),el('div','ratib-bottom-editor-list'));
  const reset=el('button','ratib-bottom-reset','استعادة الترتيب الافتراضي');reset.type='button';
  reset.addEventListener('click',()=>{chosen=DEFAULT.slice();save();renderNav();renderEditor();});
  body.append(reset);editor.append(summary,body);host.append(editor);
 }
 renderEditor();
 const home=by('dashboardHomeContent');
 if(home&&!by('ratibBottomNavRecovery170')){
  recovery=el('button','ratib-bottom-recovery no-print','＋ إضافة اختصارات إلى الشريط');recovery.id='ratibBottomNavRecovery170';recovery.type='button';recovery.addEventListener('click',openSettings);home.append(recovery);
 }else recovery=by('ratibBottomNavRecovery170');
 if(recovery)recovery.hidden=chosen.length!==0;
}
function mount(){
 nav=by(ID);if(!nav||nav.dataset.ratibCustomizable==='1')return;
 for(const b of nav.querySelectorAll('button[data-ratib-page]'))original.set(b.dataset.ratibPage,b);
 renderNav();addEditor();
 const pages=['pageDashboard','pageLedger','pageReports','pageSettings','pageAccountsTree','pageCommerce','pageExpenses','pageAccountOperations'];
 const observer=new MutationObserver(active);for(const id of pages)if(by(id))observer.observe(by(id),{attributes:true,attributeFilter:['class']});
 window.RatibBottomNav=Object.freeze({get:()=>chosen.slice(),set:keys=>{chosen=validate(keys);save();renderNav();renderEditor();},reset:()=>{chosen=DEFAULT.slice();save();renderNav();renderEditor();},openEditor:openSettings});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();