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

const ICON_PATHS=Object.freeze({
 home:'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
 operations:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h6',
 favorites:'M20.8 4.6a5.3 5.3 0 0 0-7.5 0L12 5.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5z',
 reports:'M3 21h18M6 17v-6M11 17V7M16 17V3M21 17V12',
 settings:'M4 7h16M4 17h16M9 4v6M15 14v6',
 accounts:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM18 8a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9',
 statement:'M7 3h8l4 4v14H7zM15 3v5h4M10 12h6M10 16h6',
 voucher:'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
 entry:'M6 3h9l4 4v14H6zM15 3v5h4M9 14h7M12.5 10.5v7',
 multi:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 opening:'M4 4h7a4 4 0 0 1 4 4v13H8a4 4 0 0 0-4 0zM20 4h-5a4 4 0 0 0-4 4v13h5a4 4 0 0 1 4 0z',
 stock:'M3 7 12 3l9 4v11l-9 4-9-4zM3 7l9 5 9-5M12 12v10',
 incoming:'M3 9v10h18V9M12 2v13m-4-4 4 4 4-4',
 outgoing:'M3 9v10h18V9M12 16V3m-4 4 4-4 4 4',
 pulse:'M3 12h4l3-7 4 14 3-7h4',
 help:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 4M12 17h.01'
});
function svgIcon(kind){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
 svg.setAttribute('focusable','false');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',ICON_PATHS[kind]||ICON_PATHS.help);svg.append(path);
 return svg;
}
function paintIcon(button,kind){
 let host=button.querySelector('.ratib-bottom-icon');
 if(!host){host=el('span','ratib-bottom-icon');button.prepend(host);}
 if(host.dataset.ratibSvgIcon===kind)return;
 host.replaceChildren(svgIcon(kind));
 host.dataset.ratibSvgIcon=kind;
 host.setAttribute('aria-hidden','true');
}

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
 b.append(el('span','ratib-bottom-icon'),el('small','',opt[2]));
 paintIcon(b,kind);
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
  paintIcon(b,key); // Retain existing button handlers; replace only the decorative glyph.
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
  const editorIcon=el('span','ratib-bottom-editor-ico');editorIcon.append(svgIcon(key));editorIcon.setAttribute('aria-hidden','true');
  label.append(checked,editorIcon,el('span','',opt[2]));row.append(label);
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
 // Keep the customization editor immediately before Help & Administration.
 const help=by('ratibSettingsHelp168');
 if(help?.parentElement===host&&editor.nextElementSibling!==help)host.insertBefore(editor,help);
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