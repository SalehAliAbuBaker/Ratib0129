/* Ratib 3.6.195 — account favorites are a presentation shortcut, never a ledger mutation.
 * Persist in the app store so encrypted/ordinary backups and restore keep the chosen accounts. */
(()=>{'use strict';
const KEY='account_favorites_v1';
const $=id=>document.getElementById(id);
const make=(tag,cls,label)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e;};
let expanded=false,host,grid,status,expandBtn,statementStar;
function ready(){return !!window.__ratibProceedInitialized&&typeof store!=='undefined'&&typeof getCanonicalCatalog==='function';}
function catalog(){
 if(!ready())return [];
 try{
  const result=[],seen=new Set();
  for(const group of getCanonicalCatalog()||[])for(const detail of group.details||[]){
   const name=String(detail?.[1]||'').trim(),code=String(detail?.[0]||'').trim();
   if(!name||seen.has(name))continue;
   seen.add(name);result.push({name,code});
  }
  return result;
 }catch(error){console.warn('تعذر عرض الحسابات المفضلة',error);return [];}
}
function saved(){
 if(!ready())return [];
 try{
  const value=store.get(KEY,[]);
  if(!Array.isArray(value))return [];
  const seen=new Set();
  return value.filter(x=>x&&typeof x==='object').map(x=>({name:String(x.name||'').trim(),code:String(x.code||'').trim()}))
   .filter(x=>{const key=x.code||x.name;if(!x.name||seen.has(key))return false;seen.add(key);return true;});
 }catch(_){return [];}
}
function keyOf(account){return String(account?.code||'').trim()||String(account?.name||'').trim();}
function resolve(entry,accounts){
 // Prefer exact name/code; allow a unique, unchanged code to survive account renaming.
 return accounts.find(a=>a.name===entry.name&&(!entry.code||!a.code||a.code===entry.code))
  ||(entry.code&&accounts.filter(a=>a.code===entry.code).length===1?accounts.find(a=>a.code===entry.code):null);
}
function all(){
 const accounts=catalog(),used=new Set(),out=[];
 for(const entry of saved()){const a=resolve(entry,accounts);if(!a||used.has(keyOf(a)))continue;used.add(keyOf(a));out.push(a);}
 return out;
}
function has(account){return all().some(x=>keyOf(x)===keyOf(account)||x.name===account?.name);}
function persist(list){
 if(!ready())return false;
 try{
  store.set(KEY,list.map(x=>({name:x.name,code:x.code})));
  window.dispatchEvent(new CustomEvent('ratib:account-favorites-updated'));
  return true;
 }catch(error){console.warn('تعذر حفظ الحسابات المفضلة',error);window.showToast?.('تعذر حفظ المفضلة. تأكد من فتح القفل وسلامة التخزين.','warn');return false;}
}
function toggle(account){
 const found=catalog().find(x=>x.name===account?.name&&(!account?.code||x.code===account.code))
  ||(account?.code?catalog().find(x=>x.code===account.code):null);
 if(!found)return false;
 const list=all(),i=list.findIndex(x=>keyOf(x)===keyOf(found));
 if(i>=0)list.splice(i,1);else list.push(found);
 return persist(list);
}
function move(account,step){
 const list=all(),i=list.findIndex(x=>keyOf(x)===keyOf(account)),j=i+step;
 if(i<0||j<0||j>=list.length)return false;
 [list[i],list[j]]=[list[j],list[i]];return persist(list);
}
function open(account){
 const current=catalog().find(x=>x.name===account?.name&&(!account?.code||account.code===x.code));
 if(!current||typeof openAccountFromPager!=='function'){window.showToast?.('الحساب غير متاح في الدليل الحالي.','warn');return false;}
 openAccountFromPager(current.name,[current.name]);
 if(typeof accountOperationsReturnTab!=='undefined')accountOperationsReturnTab='pageDashboard';
 return true;
}
function addFromSearch(){
 const scope=$('ratibSmartScope'),input=$('ratibSmartInput');
 if(!scope||!input)return;
 if(scope.value!=='accounts'){scope.value='accounts';scope.dispatchEvent(new Event('change',{bubbles:true}));}
 input.scrollIntoView?.({block:'center',behavior:'smooth'});
 input.focus({preventScroll:true});
}
function render(){
 if(!host)return;
 const list=all();grid.replaceChildren();
 if(!list.length){
  const empty=make('p','ratib-account-fav-empty',ready()?'لا توجد حسابات مفضلة بعد. أضف حسابًا من البحث الذكي.':'تظهر الحسابات المفضلة بعد فتح بيانات راتب.');
  grid.append(empty);
 }else{
  for(const [index,a] of list.entries()){
   if(!expanded&&index>=3)break;
   const tile=make('div','ratib-account-fav-tile');
   const link=make('button','ratib-account-fav-link',a.name);link.type='button';link.title='فتح كشف حساب '+a.name;link.addEventListener('click',()=>open(a));
   tile.append(link);
   if(expanded){
    const actions=make('div','ratib-account-fav-actions');
    for(const [label,step] of [['↑',-1],['↓',1]]){
     const b=make('button','ratib-account-fav-action',label);b.type='button';
     b.disabled=step<0?index===0:index===list.length-1;
     b.setAttribute('aria-label',(step<0?'تقديم ':'تأخير ')+a.name);
     b.addEventListener('click',()=>move(a,step));actions.append(b);
    }
    const remove=make('button','ratib-account-fav-action','☆');remove.type='button';
    remove.title='إزالة من المفضلة';remove.setAttribute('aria-label','إزالة '+a.name+' من المفضلة');
    remove.addEventListener('click',()=>toggle(a));actions.append(remove);tile.append(actions);
   }
   grid.append(tile);
  }
 }
 status.textContent=list.length?list.length+' حسابات مفضلة':'حساباتك الأكثر استخدامًا';
 expandBtn.hidden=list.length<=3;expandBtn.textContent=expanded?'عرض ثلاثة فقط':'عرض جميع المفضلة ('+list.length+')';
 expandBtn.setAttribute('aria-expanded',String(expanded));
 updateStatementStar();
}
function updateStatementStar(){
 if(!statementStar||typeof accountOpsState==='undefined')return;
 const page=$('pageAccountOperations'),name=String(accountOpsState?.accountName||'');
 const account=catalog().find(x=>x.name===name);
 statementStar.hidden=!account||page?.classList.contains('hidden');
 if(!account)return;
 const pinned=has(account);
 statementStar.textContent=pinned?'★':'☆';
 statementStar.title=pinned?'إزالة الحساب من المفضلة':'إضافة الحساب إلى المفضلة';
 statementStar.setAttribute('aria-label',statementStar.title);
 statementStar.setAttribute('aria-pressed',String(pinned));
 statementStar.onclick=()=>toggle(account);
}
function mount(){
 const inventory=$('ratibHomeInventory'),home=$('dashboardHomeContent');
 if(!home||host)return;
 host=make('section','ratib-account-favorites no-print');host.id='ratibAccountFavorites';host.setAttribute('aria-label','الحسابات المفضلة');
 const head=make('div','ratib-account-fav-head');
 const title=make('strong','ratib-account-fav-heading','☆ الحسابات المفضلة');
 const add=make('button','ratib-account-fav-add','＋ إضافة حساب');add.type='button';add.addEventListener('click',addFromSearch);
 head.append(title,add);grid=make('div','ratib-account-fav-grid');grid.id='ratibAccountFavoritesGrid';
 const foot=make('div','ratib-account-fav-footer');status=make('small','ratib-account-fav-status');
 expandBtn=make('button','ratib-account-fav-expand');expandBtn.type='button';expandBtn.addEventListener('click',()=>{expanded=!expanded;render();});
 foot.append(status,expandBtn);host.append(head,grid,foot);
 if(inventory)inventory.after(host);else home.append(host);
 const titleEl=$('accountOperationsScreenTitle');
 if(titleEl&&!$('ratibAccountStatementFavorite')){
  statementStar=make('button','ratib-statement-fav-star no-print','☆');
  statementStar.type='button';statementStar.id='ratibAccountStatementFavorite';
  titleEl.after(statementStar);
  const page=$('pageAccountOperations');
  if(page)new MutationObserver(updateStatementStar).observe(page,{attributes:true,attributeFilter:['class']});
 }
 render();
 window.addEventListener('ratib:app-ready',render);
 window.addEventListener('ratib:account-favorites-updated',render);
 window.addEventListener('focus',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
}
window.RatibAccountFavorites=Object.freeze({all,has,toggle,move,open,refresh:render});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();