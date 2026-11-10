/* Ratib 3.6.172: safe standalone statement selection.
 * Intercepts the previous shortcut before its listener can open an uninitialized
 * account-operations screen. Uses the already established accounts page instead.
 * No transaction, account or settings writes. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const norm=value=>String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').toLocaleLowerCase('ar').trim();
const node=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x;};
let origin='pageDashboard',chooser=null,input=null,results=null,accounts=[],watcher=null;
function readAccounts(){
 const found=new Map();
 try{
  const catalog=typeof window.getCanonicalCatalog==='function'?window.getCanonicalCatalog():[];
  for(const group of (Array.isArray(catalog)?catalog:[])){
   for(const detail of (Array.isArray(group.details)?group.details:[])){
    const name=String(detail?.[1]||'').trim(),code=String(detail?.[0]||'').trim();
    if(name&&!found.has(name))found.set(name,{name,code,branch:[group.main,group.group,group.sub].filter(Boolean).join(' / ')});
   }
  }
 }catch(error){console.warn('تعذر تجهيز اختيار كشف الحساب',error);}
 return [...found.values()];
}
function render(){
 if(!input||!results)return;
 const q=norm(input.value);
 const subset=accounts.filter(a=>!q||norm(a.name+' '+a.code+' '+a.branch).includes(q)).slice(0,50);
 results.replaceChildren();
 if(!accounts.length){results.append(node('p','ratib-statement-empty','لا توجد حسابات متاحة حتى الآن.'));return;}
 if(!subset.length){results.append(node('p','ratib-statement-empty','لا توجد حسابات مطابقة.'));return;}
 for(const a of subset){
  const b=node('button','ratib-statement-account');b.type='button';
  b.append(node('strong','',a.name),node('small','',a.code+(a.branch?' · '+a.branch:'')));
  b.addEventListener('click',()=>select(a.name));results.append(b);
 }
}
function clearMode(){
 const page=$('pageAccountsTree');
 if(page?.classList.contains('ratib-statement-pick-mode'))page.classList.remove('ratib-statement-pick-mode');
 if(chooser)chooser.hidden=true;
}
function close(){
 const page=$('pageAccountsTree');
 if(!page?.classList.contains('ratib-statement-pick-mode'))return;
 clearMode();
 const destination=origin==='pageAccountsTree'?'pageDashboard':origin;
 if(typeof window.navigateToTab==='function')window.navigateToTab(destination,true);
}
function select(name){
 if(typeof window.openAccountFromPager!=='function'){console.warn('كشف الحساب غير جاهز');return;}
 clearMode();
 try{
  window.openAccountFromPager(name,[name],null,false);
  // The original statement renderer normally returns to the account tree;
  // restore the shortcut's true origin for Back and gesture navigation.
  if(typeof accountOperationsReturnTab!=='undefined')accountOperationsReturnTab=origin==='pageAccountsTree'?'pageDashboard':origin;
 }catch(error){
  console.error('تعذر فتح كشف الحساب',error);
  window.navigateToTab?.('pageAccountsTree',false);
 }
}
function mount(){
 const page=$('pageAccountsTree');if(!page)return false;
 if(chooser&&chooser.isConnected)return true;
 chooser=node('section','ratib-statement-chooser no-print');chooser.id='ratibDirectStatementChooser172';chooser.hidden=true;
 const heading=node('div','ratib-statement-heading');
 const back=node('button','ratib-statement-back','↩ رجوع');back.type='button';back.setAttribute('aria-label','العودة من اختيار كشف الحساب');back.addEventListener('click',close);
 heading.append(node('h3','','كشف الحساب'),back);
 chooser.append(heading,node('p','','ابحث عن الحساب باسمه أو رقمه، ثم اضغط عليه لعرض كشفه.'));
 input=node('input','ratib-statement-search');input.type='search';input.id='ratibStatementSearch172';input.autocomplete='off';input.placeholder='اسم الحساب أو رقمه';input.setAttribute('aria-label','ابحث عن حساب لعرض كشفه');
 input.addEventListener('input',render);
 results=node('div','ratib-statement-results');results.id='ratibStatementResults172';
 chooser.append(input,results);page.prepend(chooser);
 // Only react to actual transitions away from the picker. The 3.6.171
 // watcher removed a class unconditionally and could retrigger indefinitely.
 watcher?.disconnect();watcher=new MutationObserver(()=>{
  if(page.classList.contains('hidden')&&page.classList.contains('ratib-statement-pick-mode'))clearMode();
 });
 watcher.observe(page,{attributes:true,attributeFilter:['class']});
 return true;
}
function open(){
 if(typeof window.navigateToTab!=='function'||!mount())return;
 const page=$('pageAccountsTree');
 origin=typeof currentActiveTab==='string'&&currentActiveTab!=='pageAccountOperations'?currentActiveTab:'pageDashboard';
 if(origin==='pageAccountsTree')origin='pageDashboard';
 accounts=readAccounts();
 window.navigateToTab('pageAccountsTree',true);
 const show=()=>{
  if(page.classList.contains('hidden'))return;
  page.classList.add('ratib-statement-pick-mode');chooser.hidden=false;
  input.value='';render();
  requestAnimationFrame(()=>input.focus({preventScroll:true}));
 };
 if(!page.classList.contains('hidden'))show();
 else{
  // Navigation can be deferred by an existing leave-confirmation dialog.
  // Do not expose a picker inside a hidden screen or enter a busy loop.
  const once=new MutationObserver(()=>{
   if(page.classList.contains('hidden'))return;
   once.disconnect();show();
  });once.observe(page,{attributes:true,attributeFilter:['class']});
 }
}
function clickCapture(e){
 const target=e.target?.closest?.('button');if(!target)return;
 const isHome=target.matches('#dashboardHomeContent .ratib-statement-tile');
 const isNav=target.matches('#ratibHomeBottomNav [data-ratib-page="statement"]');
 if(!isHome&&!isNav)return;
 e.preventDefault();e.stopImmediatePropagation();open();
}
document.addEventListener('click',clickCapture,true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&$('pageAccountsTree')?.classList.contains('ratib-statement-pick-mode')){e.preventDefault();close();}
});
window.RatibStatementSafe172=Object.freeze({open,close});
})();
