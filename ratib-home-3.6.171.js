/* Ratib 3.6.171 — direct account-statement shortcut and stable header version.
 * Presentation and navigation only; never mutate accounting records. */
(()=>{'use strict';
const by=id=>document.getElementById(id);
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').toLocaleLowerCase('ar').trim();
let returnTab='pageDashboard',chooser,search,results;
function version(){
 const head=document.querySelector('#mainWrap>header.no-print'),logo=head?.querySelector('.logo');if(!logo)return;
 let brand=logo.querySelector('.ratib-home-brand');
 if(!brand){
  brand=el('span','ratib-home-brand');
  brand.append(el('span','ratib-brand-name','راتب'),el('span','ratib-brand-sub','للتنظيم والتدبير المالي'));
  for(const n of [...logo.children])if(n.tagName!=='IMG')n.remove();
  logo.append(brand);
 }
 let label=by('appVersionLabel');
 if(!label){label=el('small','app-version');label.id='appVersionLabel';}
 brand.append(label);
 label.textContent=window.ratibCurrentTrialVersionLabel?.()||'الإصدار 3.6.171';
 label.hidden=false;label.removeAttribute('aria-hidden');
}
function listAccounts(){
 try{
  const data=typeof window.getCanonicalCatalog==='function'?window.getCanonicalCatalog():[];
  if(!Array.isArray(data))return [];
  const found=new Map();
  for(const x of data)for(const d of x.details||[]){
   const name=String(d?.[1]||'').trim(),code=String(d?.[0]||'').trim();
   if(name&&!found.has(name))found.set(name,{name,code,group:[x.main,x.group,x.sub].filter(Boolean).join(' / ')});
  }
  return [...found.values()];
 }catch(e){console.warn('تعذر قراءة أسماء الحسابات',e);return [];}
}
function draw(){
 if(!results||!search)return;
 const phrase=normalize(search.value),accounts=listAccounts();
 const matches=accounts.filter(a=>!phrase||normalize(a.name+' '+a.code+' '+a.group).includes(phrase)).slice(0,30);
 results.replaceChildren();
 if(!accounts.length){results.append(el('p','ratib-statement-empty','لا توجد حسابات متاحة. تحقق من فتح بيانات راتب أولًا.'));return;}
 if(!matches.length){results.append(el('p','ratib-statement-empty','لا توجد حسابات مطابقة.'));return;}
 for(const a of matches){
  const b=el('button','ratib-statement-account');b.type='button';b.setAttribute('role','option');
  b.append(el('strong','',a.name),el('small','',a.code+(a.group?' · '+a.group:'')));
  b.addEventListener('click',()=>choose(a.name));results.append(b);
 }
}
function mountChooser(){
 const page=by('pageAccountOperations');if(!page)return false;
 chooser=by('ratibDirectStatementChooser');
 if(chooser){search=by('ratibDirectStatementSearch');results=by('ratibDirectStatementResults');return true;}
 chooser=el('section','ratib-statement-chooser no-print');chooser.id='ratibDirectStatementChooser';
 chooser.setAttribute('aria-label','اختيار الحساب لعرض كشفه');
 chooser.append(el('h3','','كشف الحساب'),el('p','','اختر حسابًا لعرض حركاته ورصيده وطباعته.'));
 search=el('input','ratib-statement-search');search.id='ratibDirectStatementSearch';search.type='search';search.autocomplete='off';
 search.placeholder='ابحث باسم الحساب أو رقمه';search.setAttribute('aria-label','بحث عن حساب لعرض كشفه');
 results=el('div','ratib-statement-results');results.id='ratibDirectStatementResults';results.setAttribute('role','listbox');
 search.addEventListener('input',draw);
 chooser.append(search,results);page.querySelector('.account-operations-screen')?.prepend(chooser);
 const watcher=new MutationObserver(()=>{if(page.classList.contains('hidden')){page.classList.remove('ratib-statement-pick-mode');chooser.hidden=true;}});
 watcher.observe(page,{attributes:true,attributeFilter:['class']});
 return true;
}
function choose(name){
 const page=by('pageAccountOperations');
 if(!name||typeof window.openAccountFromPager!=='function')return;
 page?.classList.remove('ratib-statement-pick-mode');if(chooser)chooser.hidden=true;
 window.openAccountFromPager(name,[name],null,false);
 // The shortcut started from the dashboard (or a user-selected tab), not the account tree.
 if(typeof accountOperationsReturnTab!=='undefined')accountOperationsReturnTab=returnTab;
}
function open(){
 if(typeof window.navigateToTab!=='function'||!mountChooser())return;
 returnTab=typeof currentActiveTab==='string'&&currentActiveTab!=='pageAccountOperations'?currentActiveTab:'pageDashboard';
 window.navigateToTab('pageAccountOperations',true);
 const page=by('pageAccountOperations');page.classList.add('ratib-statement-pick-mode');
 by('accountOperationsScreenTitle').textContent='كشف الحساب — اختر حسابًا';
 chooser.hidden=false;search.value='';draw();
 if(typeof accountOperationsReturnTab!=='undefined')accountOperationsReturnTab=returnTab;
 requestAnimationFrame(()=>search.focus({preventScroll:true}));
}
function wire(){
 version();
 const tile=document.querySelector('#dashboardHomeContent .ratib-statement-tile');
 if(tile&&!tile.dataset.ratibStatementDirect171){
  tile.dataset.ratibStatementDirect171='1';
  tile.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();open();},true);
 }
 const nav=by('ratibHomeBottomNav');
 if(nav&&!nav.dataset.ratibStatementDirect171){
  nav.dataset.ratibStatementDirect171='1';
  nav.addEventListener('click',event=>{
   const target=event.target?.closest?.('button[data-ratib-page="statement"]');
   if(!target||!nav.contains(target))return;
   event.preventDefault();event.stopImmediatePropagation();open();
  },true);
 }
}
window.RatibDirectStatement171=Object.freeze({open,version});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
window.addEventListener('ratib:app-ready',version);
})();
