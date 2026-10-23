/* Ratib 3.6.105.04 — unified account-tree display, mobile details sheet.
   Uses canonical account catalog and existing financial calculations. No transaction mutations. */
(function(){
 'use strict';
 const ID='ratibInteractiveAccountsTree';
 let root=null, mount=null, shell=null,treeBox=null,detailsBox=null,detailsPanel=null,statsBox=null,searchBox=null,filterBox=null;
 let model=[],nodes=new Map(),selected='',openNodes=new Set(),lastQuery='',lastFilter='all',initialized=false,ready=false;
 function norm(s){return String(s==null?'':s).normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').trim().toLocaleLowerCase('ar');}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
 function money(n){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:6});}
 function mk(kind,code,name,path,parent){
  const node={kind:kind,code:String(code||''),name:String(name||''),path:path||[],parent:parent||null,children:[],key:kind+':'+String(code||'')+':'+(path||[]).join('|')};
  nodes.set(node.key,node);return node;
 }
 function catalog(){
  let rows=getCanonicalCatalog();
  if(typeof window.ratibImportVisibleCatalog==='function')rows=window.ratibImportVisibleCatalog(rows);
  if(typeof sortAccountCatalogForTreeDisplay==='function')rows=sortAccountCatalogForTreeDisplay(rows);
  return rows||[];
 }
 function build(){
  nodes=new Map();const mains=new Map(),groups=new Map(),subs=new Map(),seenAccounts=new Set();
  const lines=catalog(),links=typeof getSubgroupParents==='function'?getSubgroupParents():{};
  for(const x of lines){
   const mainKey=String(x.mainCode)+'|'+x.main;
   let main=mains.get(mainKey);
   if(!main){main=mk('main',x.mainCode,x.main,[x.main],null);mains.set(mainKey,main);}
   const groupKey=mainKey+'|'+String(x.groupCode)+'|'+x.group;
   let group=groups.get(groupKey);
   if(!group){group=mk('group',x.groupCode,x.group,[x.main,x.group],main);groups.set(groupKey,group);main.children.push(group);}
   const subKey=groupKey+'|'+String(x.subCode)+'|'+x.sub;
   let sub=subs.get(subKey);
   if(!sub){sub=mk('sub',x.subCode,x.sub,[x.main,x.group,x.sub],group);subs.set(subKey,sub);group.children.push(sub);}
   for(const d of x.details||[]){
    const code=String(d[0]||''),name=String(d[1]||'');
    if(!name||seenAccounts.has(code+'|'+name))continue;
    seenAccounts.add(code+'|'+name);
    sub.children.push(mk('detail',code,name,[x.main,x.group,x.sub,name],sub));
   }
  }
  const subByCode=new Map();
  for(const sub of subs.values())if(!subByCode.has(sub.code))subByCode.set(sub.code,sub);
  // Reproduce existing subgroup links only where both nodes already belong to the same parent group.
  for(const sub of subs.values()){
   const parent=subByCode.get(String(links[sub.code]||''));
   if(!parent||parent===sub||sub.parent!==parent.parent)continue;
   let p=parent,cyclic=false;
   while(p){if(p===sub){cyclic=true;break;}p=p.parent;}
   if(cyclic)continue;
   sub.parent.children=sub.parent.children.filter(n=>n!==sub);
   sub.parent=parent;parent.children.push(sub);
  }
  model=[...mains.values()];
  let summary=new Map();
  try{summary=computeAccountTreeBalanceSummary()||new Map();}
  catch(error){console.warn('Ratib interactive tree: balance summary unavailable',error);}
  const buildSums=(n)=>{
   const names=new Set();
   (function visit(node){if(node.kind==='detail'){names.add(node.name);return;}node.children.forEach(visit);})(n);
   n.leafNames=[...names];
   const byCurrency=new Map();
   for(const name of names){
    const balance=summary.get(name);
    if(!balance)continue;
    for(const [currency,sums] of balance){
     const row=byCurrency.get(currency)||{debit:0,credit:0};
     row.debit+=Number(sums.debit)||0;row.credit+=Number(sums.credit)||0;
     byCurrency.set(currency,row);
    }
   }
   n.sums=byCurrency;
   n.children.forEach(buildSums);
  };
  model.forEach(buildSums);
  if(!nodes.has(selected)){
   const first=[...nodes.values()].find(n=>n.kind==='detail')||model[0];
   selected=first?first.key:'';
  }
 }
 function balanceHtml(n){
  if(!n.sums||!n.sums.size)return '<span class="rit-muted">لا توجد حركات</span>';
  return [...n.sums].map(function(row){
   const cur=row[0],value=(row[1].credit||0)-(row[1].debit||0),abs=Math.abs(value);
   const label=abs<0.0000005?'متوازن':value<0?'مدين':'دائن';
   return '<span class="rit-currency">'+esc(cur)+' <b>'+money(abs)+'</b> '+label+'</span>';
  }).join('');
 }
 function pathText(n){return (n.path||[]).join(' ← ');}
 function isGroup(n){return n.kind!=='detail';}
 function searched(n,q){return norm(n.code+' '+n.name+' '+pathText(n)).includes(q);}
 function match(n,q,type,ancestorMatch){
  const allow=type==='all'||(type==='detail'?n.kind==='detail':isGroup(n));
  const own=(ancestorMatch||!q||searched(n,q))&&allow;
  return own||n.children.some(x=>match(x,q,type,ancestorMatch||!!(q&&searched(n,q))));
 }
 function renderNode(n,depth,q,type,ancestorMatch){
  if(!match(n,q,type,ancestorMatch))return '';
  const rawMatch=!!q&&searched(n,q);
  const children=n.children.filter(x=>match(x,q,type,ancestorMatch||rawMatch));
  const opened=!!q||openNodes.has(n.key),has=children.length>0;
  const sel=selected===n.key;
  const labels={main:'رئيسي',group:'تجميعي',sub:'تجميعي فرعي',detail:'حساب حركة'};
  const toggle=has?'<button type="button" class="rit-caret" data-rit="toggle" data-key="'+esc(n.key)+'" aria-label="'+(opened?'طي':'توسيع')+' '+esc(n.name)+'" aria-expanded="'+opened+'">'+(opened?'⌄':'‹')+'</button>':'<span class="rit-caret rit-none"></span>';
  const ico=isGroup(n)?'▣':'◉';
  const row='<div class="rit-node'+(sel?' selected':'')+'" style="--rit-depth:'+Math.min(depth,12)+'">'+toggle+
   '<button type="button" class="rit-node-main" data-rit="select" data-key="'+esc(n.key)+'" aria-pressed="'+sel+'">'+
   '<span class="rit-node-icon">'+ico+'</span><span class="rit-node-label"><b>'+esc(n.name)+'</b><small>'+esc(n.code)+' · '+labels[n.kind]+'</small></span></button>'+
   '<span class="rit-node-balance">'+balanceHtml(n)+'</span></div>';
  return '<div class="rit-branch">'+row+(has&&opened?'<div class="rit-children">'+children.map(x=>renderNode(x,depth+1,q,type,ancestorMatch||rawMatch)).join('')+'</div>':'')+'</div>';
 }
 function makeStats(){
  const list=[...nodes.values()],leaf=list.filter(n=>n.kind==='detail');
  const currencies=new Set();
  leaf.forEach(n=>{if(n.sums)for(const cur of n.sums.keys())currencies.add(cur);});
  const items=[['الحسابات',list.length],['حسابات الحركة',leaf.length],['التجميعية',list.length-leaf.length],['عملات بها حركات',currencies.size]];
  statsBox.innerHTML=items.map(x=>'<div class="rit-stat"><b>'+money(x[1])+'</b><small>'+x[0]+'</small></div>').join('');
 }
 function activity(name){
  if(typeof effectiveTransactions!=='function'||typeof getAccountEntry!=='function')return [];
  let transactions=[];
  try{transactions=effectiveTransactions()||[];}catch(e){return [];}
  const result=[];
  for(const t of transactions){
   const entry=getAccountEntry(t,[name]);if(!entry)continue;
   const amount=typeof getAccountDisplayAmount==='function'?getAccountDisplayAmount(entry):(entry.foreignAmount||entry.amount||0);
   const date=typeof getAccountOpsDate==='function'?getAccountOpsDate(t):String(t.isoDate||t.date||'');
   result.push({date:date,note:String(entry.line?.note||t.note||t.description||t.type||'حركة مالية'),amount:amount,currency:entry.currency||t.currency||'YER',side:entry.bothSides?'مدين ودائن':(entry.side==='debit'?'مدين':'دائن')});
  }
  result.sort((a,b)=>b.date.localeCompare(a.date));
  return result.slice(0,5);
 }
 function renderDetails(){
  const n=nodes.get(selected);
  if(!n){detailsBox.innerHTML='<p class="rit-muted">اختر حسابًا لعرض تفاصيله.</p>';return;}
  const isLeaf=n.kind==='detail';
  const kinds={main:'حساب رئيسي',group:'حساب تجميعي',sub:'حساب تجميعي فرعي',detail:'حساب حركة'};
  let html='<div class="rit-detail-head"><span class="rit-detail-symbol">'+(isLeaf?'◉':'▣')+'</span><span><h3>'+esc(n.name)+'</h3><small>['+esc(n.code)+'] · '+kinds[n.kind]+'</small></span></div>'+
    '<div class="rit-detail-item"><small>المسار المحاسبي</small><strong>'+esc(pathText(n))+'</strong></div>'+
    '<div class="rit-detail-item"><small>'+(isLeaf?'رصيد الحساب حسب العملة':'إجمالي أرصدة الحسابات التابعة حسب العملة')+'</small><div class="rit-detail-balances">'+balanceHtml(n)+'</div></div>';
  if(!isLeaf){
   html+='<div class="rit-detail-item"><small>الحسابات التفصيلية التابعة</small><strong>'+money(n.leafNames?.length||0)+' حساب</strong></div>';
  }else{
   const relations=typeof getAccountDetailParents==='function'?getAccountDetailParents():{};
   if(relations[n.name])html+='<div class="rit-detail-item"><small>يرتبط بالحساب الأب</small><strong>'+esc(relations[n.name])+'</strong></div>';
   const entries=activity(n.name);
   html+='<div class="rit-detail-item"><small>آخر الحركات</small>'+(entries.length?entries.map(t=>'<div class="rit-movement"><span><b>'+esc(t.note).slice(0,95)+'</b><small>'+esc(t.date||'بدون تاريخ')+'</small></span><span>'+money(t.amount)+' '+esc(t.currency)+'<small>'+esc(t.side)+'</small></span></div>').join(''):'<p class="rit-muted">لا توجد حركات مسجلة لهذا الحساب.</p>')+'</div>';
  }
  html+='<div class="rit-detail-actions">';
  if(isLeaf){
   html+='<button type="button" class="rit-btn rit-primary" data-rit="statement">كشف الحساب</button><button type="button" class="rit-btn" data-rit="edit">تعديل الحساب</button>';
  }else if(n.kind==='sub'){
   html+='<button type="button" class="rit-btn rit-primary" data-rit="add-child">＋ إضافة حساب تحته</button>';
  }
  html+='</div>';
  detailsBox.innerHTML=html;
 }
 function renderView(){
  if(!ready)return;
  const q=norm(searchBox.value),type=filterBox.value;
  treeBox.innerHTML=model.filter(n=>match(n,q,type,false)).map(n=>renderNode(n,0,q,type,false)).join('')||
    '<div class="rit-empty">لم يُعثر على حساب مطابق. جرّب اسمًا أو رقمًا مختلفًا.</div>';
  renderDetails();makeStats();
 }
 function refresh(){
  if(!ready)return;
  const previousSelected=selected,prior=new Set(openNodes);
  build();openNodes=prior;selected=nodes.has(previousSelected)?previousSelected:selected;
  renderView();
 }
 function onMobile(){return window.matchMedia('(max-width:840px)').matches;}
 function dismissDetails(restoreFocus=true){
  if(!mount||!detailsPanel)return;
  const wasOpen=mount.classList.contains('rit-details-open');
  mount.classList.remove('rit-details-open');
  detailsPanel.removeAttribute('role');
  detailsPanel.removeAttribute('aria-modal');
  detailsPanel.removeAttribute('aria-label');
  if(wasOpen&&restoreFocus&&onMobile()){
   const button=[...mount.querySelectorAll('[data-rit="select"]')].find(el=>el.dataset.key===selected);
   if(button?.isConnected){try{button.focus({preventScroll:true});}catch(e){button.focus();}}
  }
 }
 function revealDetails(){
  if(!onMobile()||!detailsPanel)return;
  mount.classList.add('rit-details-open');
  detailsPanel.setAttribute('role','dialog');
  detailsPanel.setAttribute('aria-modal','true');
  detailsPanel.setAttribute('aria-label','تفاصيل الحساب المختار');
  const close=detailsPanel.querySelector('[data-rit="dismiss-details"]');
  if(close)close.focus({preventScroll:true});
 }
 function openAccountModal(n){
  if(typeof openAddAccountModal!=='function')return;
  const path=n&&n.kind==='sub'?[n.path[0],n.path[1],n.name].join('|||'):'';
  openAddAccountModal(path);
 }
 function click(event){
  const btn=event.target.closest('[data-rit]');if(!btn||!mount.contains(btn))return;
  const action=btn.dataset.rit,key=btn.dataset.key,n=nodes.get(key||selected);
  if(action==='dismiss-details'){dismissDetails();return;}
  if(action==='expand'||action==='collapse'){
   openNodes=action==='collapse'?new Set():new Set([...nodes.values()].filter(node=>node.children.length).map(node=>node.key));
   renderView();return;
  }
  if(action==='reset'){searchBox.value='';filterBox.value='all';openNodes=new Set(model.map(n=>n.key));renderView();return;}
  if(action==='refresh'){refresh();return;}
  if(action==='toggle'&&n){
   if(openNodes.has(n.key))openNodes.delete(n.key);else openNodes.add(n.key);renderView();return;
  }
  if(action==='select'&&n){selected=n.key;renderView();revealDetails();return;}
  if(action==='add'){openAccountModal(null);return;}
  if(action==='add-child'&&n){dismissDetails(false);openAccountModal(n);return;}
  if(action==='edit'&&n&&n.kind==='detail'&&typeof openEditAccountModal==='function'){dismissDetails(false);openEditAccountModal(n.name);return;}
  if(action==='statement'&&n&&n.kind==='detail'&&typeof openAccountFromPager==='function'){
   dismissDetails(false);
   const currency=n.sums?.size===1?[...n.sums.keys()][0]:null;
   openAccountFromPager(n.name,[n.name],currency||null);return;
  }
 }
 function install(){
  if(initialized)return;
  root=document.getElementById('pageAccountsTree');if(!root)return;
  initialized=true;
  mount=document.createElement('section');mount.id=ID;mount.setAttribute('aria-label','شجرة الحسابات');
  mount.innerHTML=
   '<div class="rit-shell"><div class="rit-head"><div><h2>دليل الحسابات</h2><small>البيانات والأرصدة من شجرة راتب الفعلية</small></div><button type="button" class="rit-btn rit-primary" data-rit="add">＋ حساب جديد</button></div>'+
   '<div class="rit-stats"></div><div class="rit-workspace"><div class="rit-panel"><div class="rit-panel-head"><b>الحسابات</b><div><button type="button" class="rit-btn" data-rit="expand">توسيع الكل</button><button type="button" class="rit-btn" data-rit="collapse">طي الكل</button></div></div>'+
   '<div class="rit-filter"><input type="search" class="rit-search" placeholder="ابحث بالاسم أو رقم الحساب..." aria-label="البحث في الشجرة"><select class="rit-kind" aria-label="تصفية نوع الحساب"><option value="all">كل الحسابات</option><option value="detail">حسابات حركة</option><option value="group">حسابات تجميعية</option></select><small class="rit-mobile-hint">اضغط على اسم الحساب لعرض تفاصيله، وعلى السهم للطي والتوسيع.</small></div>'+
   '<div class="rit-tree"></div><div class="rit-panel-foot"><button type="button" class="rit-btn" data-rit="reset">إعادة ضبط العرض</button><button type="button" class="rit-btn" data-rit="refresh">تحديث الأرصدة</button></div></div>'+
   '<aside class="rit-panel rit-detail-panel" aria-label="تفاصيل الحساب"><div class="rit-panel-head"><b>تفاصيل الحساب</b><button type="button" class="rit-btn rit-close-details" data-rit="dismiss-details" aria-label="إغلاق تفاصيل الحساب">✕ إغلاق</button></div><div class="rit-details"></div></aside></div>'+
   '<p class="rit-footnote">تُعرض الحسابات والأرصدة من بيانات راتب دون تغيير القيود أو إعدادات العملات.</p></div><button type="button" class="rit-mobile-backdrop" data-rit="dismiss-details" aria-label="إغلاق تفاصيل الحساب" tabindex="-1"></button>';
  root.insertBefore(mount,root.firstChild);
  shell=mount.querySelector('.rit-shell');treeBox=mount.querySelector('.rit-tree');detailsBox=mount.querySelector('.rit-details');detailsPanel=mount.querySelector('.rit-detail-panel');
  statsBox=mount.querySelector('.rit-stats');searchBox=mount.querySelector('.rit-search');filterBox=mount.querySelector('.rit-kind');
  mount.addEventListener('click',click);
  searchBox.addEventListener('input',renderView);
  filterBox.addEventListener('change',renderView);
  ready=true;openNodes=new Set();
  try{
   build();openNodes=new Set(model.map(n=>n.key));renderView();
   // Keep the prior DOM only as a silent technical fallback if initialization fails.
   root.classList.add('rit-mode');
  }catch(e){
   console.error('Ratib account tree:',e);ready=false;mount.remove();
   return;
  }
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&mount?.classList.contains('rit-details-open')){
    event.preventDefault();dismissDetails();
   }
  });
  window.addEventListener('resize',()=>{if(!onMobile())dismissDetails(false);},{passive:true});
  // Refresh on re-entry, without changing accounting forms or navigation.
  new MutationObserver(function(){
   if(root.classList.contains('hidden'))dismissDetails(false);
   else if(root.classList.contains('rit-mode'))refresh();
  }).observe(root,{attributes:true,attributeFilter:['class']});
  const chart=document.getElementById('chartOfAccountsView');
  if(chart)new MutationObserver(function(){
   if(!root.classList.contains('hidden'))refresh();
  }).observe(chart,{childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.RatibInteractiveTree={refresh:function(){if(ready)refresh();},version:'3.6.105.04'};
})();