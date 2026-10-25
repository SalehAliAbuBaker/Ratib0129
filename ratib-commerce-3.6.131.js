/* Ratib commerce 3.6.131 — trial only. Preserve commerce_v1 and original journal. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fresh=()=>({products:[],warehouses:[{id:'main',name:'المخزن الرئيسي'}],people:[],invoices:[],accounts:{cash:'',receivable:'',payable:'',inventory:'',sales:'',cogs:'',adjust:''}});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(String(v??'').replace(/,/g,'')),rnd=(v,decimals=2)=>{const factor=10**decimals;return Math.round((Number(v)+Number.EPSILON)*factor)/factor;};
const moneyDecimals=currency=>window.RatibCountryCurrency?.digits?.(currency)??(currency==='OMR'?3:2);
const f=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:3});
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const today=()=>new Date().toLocaleDateString('en-CA');
let mode='stock',view='products',draft=null,editingDocId='',loading=false,editingProduct=null,query='',detailId='',previewId='',pendingImport=null,editingWarehouse=null,previewDraft=null;
let catalogSearch='',catalogGroup='',catalogSearchVisible=false,catalogGroupVisible=false;
let newMenuOpen=false;
const draftBaselines=new WeakMap(),approvedDepartures=new WeakMap();
const draftSignature=value=>JSON.stringify(value,(_key,v)=>typeof v==='number'?String(v):v);
function hasUnsavedDraft(){
 if(!['new','return'].includes(view)||!draft)return false;
 syncInvoice();
 return !!editingDocId||draftSignature(draft)!==draftBaselines.get(draft);
}
function requestLeave(){
 if(!hasUnsavedDraft())return true;
 const signature=draftSignature(draft);
 if(approvedDepartures.get(draft)===signature)return true;
 if(!window.confirm('توجد تغييرات غير محفوظة في المستند. مغادرة الشاشة قد تفقدها. هل تريد المتابعة؟'))return false;
 approvedDepartures.set(draft,signature);return true;
}
function captureView(){
 if(['new','return'].includes(view))syncInvoice();
 return JSON.parse(JSON.stringify({format:1,mode,view,draft,editingDocId,detailId,query,newMenuOpen,
  baseline:draft?draftBaselines.get(draft):null,catalogSearch,catalogGroup,catalogSearchVisible,catalogGroupVisible}));
}
function restoreView(snapshot){
 if(!snapshot||snapshot.format!==1||!['stock','in','out'].includes(snapshot.mode)||
  !['products','warehouses','movements','summary','accounts','new','return','records','people','detail','adjust','transfer'].includes(snapshot.view))return false;
 const state=JSON.parse(JSON.stringify(snapshot));
 if(state.draft&&(!Array.isArray(state.draft.lines)||!['purchase','sale','purchase_return','sale_return'].includes(state.draft.kind)))return false;
 mode=state.mode;view=state.view;draft=state.draft||null;editingDocId=state.editingDocId||'';
 detailId=state.detailId||'';query=state.query||'';newMenuOpen=!!state.newMenuOpen;
 catalogSearch=state.catalogSearch||'';catalogGroup=state.catalogGroup||'';
 catalogSearchVisible=!!state.catalogSearchVisible;catalogGroupVisible=!!state.catalogGroupVisible;
 if(draft)draftBaselines.set(draft,state.baseline||'');
 paint();return true;
}

function data(){const base=fresh(),v=store.get('commerce_v1',null);if(!v||typeof v!=='object')return base;const x=JSON.parse(JSON.stringify(v));return {...base,...x,products:Array.isArray(x.products)?x.products:[],warehouses:Array.isArray(x.warehouses)?x.warehouses:base.warehouses,people:Array.isArray(x.people)?x.people:[],invoices:Array.isArray(x.invoices)?x.invoices:[],accounts:{...base.accounts,...(x.accounts||{})}};}
function save(x){store.set('commerce_v1',x);}
function notify(t,k='info'){if(typeof showToast==='function')showToast(t,k);else alert(t);}
function positive(v,label,allowZero=false){const d=label==='سعر الوحدة'||label==='الإجمالي'?moneyDecimals(draft?.currency||'YER'):2;if(!Number.isFinite(v)||v<0||(!allowZero&&v===0)||rnd(v,d)!==v)throw Error('راجع '+label);}
function sel(id,items,selected=''){return '<select id="rc-'+id+'"><option value="">اختر</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';}
function inp(id,type='text',val='',extra=''){return '<input type="'+type+'" id="rc-'+id+'" value="'+esc(val)+'" '+extra+'>';}
function fld(label,ctl){return '<label class="rc-field"><span class="rc-field-label">'+esc(label)+'</span>'+ctl+'</label>';}
function commerceInlineField(label,ctl){return '<label class="rc-field rc-inline-field"><span class="rc-inline-label">'+esc(label)+'</span>'+ctl+'</label>';}
function wrap(t,c){return '<section class="rc-card"><h3>'+t+'</h3>'+c+'</section>';}
function table(labels,rows){return '<div class="rc-scroll"><table><thead><tr>'+labels.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const types={in:['أمر توريد','توريد مخزني','فاتورة مشتريات'],out:['أمر صرف','صرف مخزني','فاتورة مبيعات']};
const inboundNumbers={'أمر توريد':'PO','توريد مخزني':'GR','فاتورة مشتريات':'PI'};
const outboundNumbers={'أمر صرف':'SO','صرف مخزني':'GI','فاتورة مبيعات':'SI'};
const COMMERCE_CURRENCIES=[{id:'YER',name:'ريال يمني (YER)'},{id:'SAR',name:'ريال سعودي (SAR)'},{id:'AED',name:'درهم إماراتي (AED)'},{id:'OMR',name:'ريال عُماني (OMR)'},{id:'USD',name:'دولار أمريكي (USD)'}];
function commerceValidFx(currency,rate){
 if(!COMMERCE_CURRENCIES.some(c=>c.id===currency))throw Error('عملة المستند غير معتمدة.');
 const actual=Number(rate);
 if(currency==='YER')return 1;
 if(!Number.isFinite(actual)||actual<=0||actual>1e9)throw Error('أدخل سعر الصرف المعتمد: كم ريال يمني يقابل وحدة واحدة من '+currency);
 return actual;
}
function commerceBaseTotal(amount,currency,rate){
 const fx=commerceValidFx(currency,rate);
 const value=rnd(Number(amount)*fx);
 if(!Number.isFinite(value)||value>1e14)throw Error('المعادل اليمني غير صالح؛ راجع العملة والسعر.');
 return value;
}
const dir=()=>mode==='in'?'purchase':'sale';
const docName=d=>d?.title||({purchase:'فاتورة مشتريات',sale:'فاتورة مبيعات',purchase_return:'مرتجع مشتريات',sale_return:'مرتجع مبيعات',transfer:'تحويل مخزني',adjust:'تسوية مخزنية'}[d?.kind]||'مستند مخزني');
const pMain=p=>String(p?.unitMain||p?.unit||'حبة').trim();
const pSub=p=>String(p?.unitSub||'').trim();
const pUnit=(p,val)=>String(val||pMain(p)).trim();
const lineUnit=(db,l)=>pUnit(db.products.find(p=>p.id===l.product),l.unit);
const unitList=p=>[pMain(p),pSub(p)].filter((x,i,a)=>x&&a.indexOf(x)===i);

const COMMERCE_BUTTON_SIZES=['small','medium','large'];
const commerceButtonSize=()=>{const x=store.get('commerce_button_size_v1','medium');return COMMERCE_BUTTON_SIZES.includes(x)?x:'medium';};
const commerceTabIcons={products:'📦',warehouses:'🏬',movements:'↔️',summary:'📊',accounts:'🧾',new:'➕',return:'↩️',records:'📋',people:'👥'};
const commerceDocIcons={'أمر توريد':'📝','توريد مخزني':'📥','فاتورة مشتريات':'🧾','أمر صرف':'📤','صرف مخزني':'📦','فاتورة مبيعات':'🛒'};
function commercePostingSides(db,d){
 const name=k=>db.accounts[k]||'لم يحدد الحساب بعد',inventory=db.warehouses.find(w=>w.id===d.warehouse)?.accountId||name('inventory');
 const accountParty=d.partyAccount||db.accounts[mode==='in'?'payable':'receivable']||'لم يحدد الحساب بعد';
 const counter=d.payment==='cash'?name('cash'):accountParty;
 const debit=d.debitAccount||(mode==='in'?inventory:counter),credit=d.creditAccount||(mode==='in'?counter:name('sales'));
 if(mode==='in')return [{debit,credit,note:'قيمة الوارد'}];
 if(mode==='out')return [{debit,credit,note:'قيمة الصادر'},{debit:name('cogs'),credit:inventory,note:'تكلفة البضاعة باليمني'}];
 return [];
}
function commerceSidesMarkup(db,d){
 return '<div class="rc-posting-preview rc-full" id="rc-posting-preview" aria-label="الحسابات المدينة والدائنة">'+commercePostingSides(db,d).map(x=>
 '<div class="rc-posting-pair"><span class="rc-posting-note">'+esc(x.note)+'</span><div class="rc-posting-account rc-posting-debit"><b>م — مدين</b><span>'+esc(x.debit)+'</span></div><div class="rc-posting-account rc-posting-credit"><b>د — دائن</b><span>'+esc(x.credit)+'</span></div></div>').join('')+'</div>';
}
function commerceMovementSidesMarkup(db,transfer,direction,warehouse,to){
 const account=w=>db.warehouses.find(x=>x.id===w)?.accountId||db.accounts.inventory||'لم يحدد الحساب بعد';
 const adjust=db.accounts.adjust||'لم يحدد حساب التسويات';
 const entries=transfer?[{debit:account(to),credit:account(warehouse),note:'نقل بين المخازن'}]:
  direction==='in'?[{debit:account(warehouse),credit:adjust,note:'تسوية إضافة مخزون'}]:
  [{debit:adjust,credit:account(warehouse),note:'تسوية إخراج مخزون'}];
 return '<div class="rc-posting-preview rc-full" id="rc-movement-posting-preview">'+entries.map(x=>
 '<div class="rc-posting-pair"><span class="rc-posting-note">'+esc(x.note)+'</span><div class="rc-posting-account rc-posting-debit"><b>م — مدين</b><span>'+esc(x.debit)+'</span></div><div class="rc-posting-account rc-posting-credit"><b>د — دائن</b><span>'+esc(x.credit)+'</span></div></div>').join('')+'</div>';
}
function commerceSmartAccount(id,items,selected,placeholder='ابحث برقم الحساب أو اسمه'){
 const current=items.find(x=>String(x.id)===String(selected));
 return '<div class="rc-smart-account">'+
  '<input type="search" id="rc-search-'+esc(id)+'" list="rc-account-list-'+esc(id)+'" autocomplete="off" value="'+esc(current?.name||'')+'" placeholder="'+esc(placeholder)+'" aria-label="'+esc(placeholder)+'">'+
  '<input type="hidden" id="rc-'+esc(id)+'" value="'+esc(current?.id||'')+'">'+
  '<datalist id="rc-account-list-'+esc(id)+'">'+items.map(x=>'<option value="'+esc(x.name)+'"></option><option value="'+esc(x.id)+'"></option>').join('')+'</datalist>'+
  '<button type="button" id="rc-add-account-'+esc(id)+'" data-rc-create-account="'+esc(id)+'" class="btn btn-ghost rc-create-account-btn" hidden style="display:none;width:auto;margin-top:5px;padding:6px 10px;font-size:.85rem">＋ إضافة حساب جديد</button></div>';
}
let commerceAccountPane=null;
function commerceAccountMatch(value,query){
 const words=commerceNormalize(query).split(/\s+/).filter(Boolean),text=commerceNormalize(value);
 return words.every(w=>text.includes(w));
}
function commerceAccountResults(input,matches){
 if(commerceAccountPane){commerceAccountPane.remove();commerceAccountPane=null;}
 if(!input||matches.length<2)return;
 const pane=document.createElement('div');
 pane.setAttribute('role','listbox');
 pane.style.cssText='position:fixed;z-index:15000;max-height:230px;overflow-y:auto;background:var(--card,#fff);color:var(--text,#222);border:1px solid var(--border,#ccc);border-radius:9px;box-shadow:0 10px 25px rgba(0,0,0,.16);direction:rtl;';
 const rect=input.getBoundingClientRect(),height=window.visualViewport?.height||window.innerHeight;
 const room= Math.min(230,matches.length*43);
 const top=rect.bottom+room+8>height?Math.max(4,rect.top-room-5):rect.bottom+4;
 pane.style.top=Math.round(top)+'px';pane.style.left=Math.round(rect.left)+'px';pane.style.width=Math.round(rect.width)+'px';
 matches.slice(0,30).forEach(account=>{
   const item=document.createElement('button');item.type='button';item.setAttribute('role','option');
   item.style.cssText='display:block;width:100%;text-align:right;padding:10px 12px;background:transparent;color:inherit;border:0;border-bottom:1px solid var(--border,#ddd);font-size:15px;cursor:pointer;';
   item.textContent=account.name;
   item.addEventListener('pointerdown',e=>e.preventDefault());
   item.addEventListener('click',()=>{
     input.value=account.name;pane.remove();if(commerceAccountPane===pane)commerceAccountPane=null;
     input.dispatchEvent(new Event('input',{bubbles:true}));
     input.focus({preventScroll:true});
     try{input.setSelectionRange(input.value.length,input.value.length);}catch(_){}
   });
   pane.appendChild(item);
 });
 document.body.appendChild(pane);commerceAccountPane=pane;
}
document.addEventListener('pointerdown',event=>{
 if(commerceAccountPane&&!commerceAccountPane.contains(event.target)&&!event.target.closest?.('#pageCommerce .rc-smart-account input,#ratibCommerceDefaults .rc-smart-account input')){
   commerceAccountPane.remove();commerceAccountPane=null;
 }
},true);
function commerceResolveAccount(input,event){
 const key=input?.id?.slice('rc-search-'.length),element=$('rc-'+key),create=$('rc-add-account-'+key);
 if(!key||!element)return;
 const q=commerceNormalize(input.value),items=leaf();
 const set=matched=>{element.value=matched?.id||'';};
 const offer=visible=>{
  if(!create)return;
  create.hidden=!visible;
  create.style.display=visible?'inline-flex':'none';
  if(visible)create.textContent='＋ إضافة حساب جديد «'+input.value.trim().slice(0,60)+'»';
 };
 if(!q){set(null);offer(false);commerceAccountResults(input,[]);return;}
 // Account choices appear as "number — name" while their canonical IDs are names.
 // Match both forms, including direct Arabic name entry in purchase/sales party accounts.
 const parts=x=>({code:String(x.name).split(' — ')[0],name:String(x.id)});
 const aliases=x=>{const p=parts(x);return [x.name,p.code,p.name];};
 const matches=items.filter(x=>aliases(x).some(v=>commerceNormalize(v)===q));
 if(matches.length===1){
  commerceAccountResults(input,[]);
  const account=matches[0],p=parts(account);
  set(account);
  // A complete account number must display the resolved account as well.
  if(q===commerceNormalize(p.code)){
   commerceAutocomplete(input,[{value:account.name,aliases:[{search:p.code,fill:account.name}]}],event);
  }
  offer(false);return;
 }
 const possible=items.filter(x=>aliases(x).some(v=>commerceAccountMatch(v,q)));
 if(possible.length===1&&q.length>1){
  commerceAccountResults(input,[]);
  const account=possible[0],partsOfAccount=parts(account);
  commerceAutocomplete(input,[{value:account.name,aliases:[
   {search:partsOfAccount.name,fill:partsOfAccount.name},
   {search:partsOfAccount.code,fill:account.name},
   {search:account.name,fill:account.name}
  ]}],event,true);
  // Only retain the posting account once the field is actually completed.
  // A partially erased or manually edited term must not silently pick an account.
  const completed=[account.name,partsOfAccount.name].some(v=>commerceNormalize(v)===commerceNormalize(input.value));
  set(completed?account:null);
  offer(false);return;
 }
 set(null);
 commerceAccountResults(input,possible);
 offer(possible.length===0&&q.length>1&&/[\p{L}]/u.test(input.value));
}
function commerceChosenAccount(id,label,required=false){
 const textInput=$('rc-search-'+id),selected=$('rc-'+id)?.value||'';
 if(textInput?.value?.trim()&&!selected)throw Error('الحساب غير موجود أو غير فرعي في شجرة الحسابات: '+label);
 const account=validatedAccount(selected,label);
 if(required&&!account)throw Error('اختر حسابًا فرعيًا من شجرة الحسابات: '+label);
 return account;
}
function commerceNormalize(value){return String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').trim().toLocaleLowerCase('ar');}
function commerceProductLabel(p){return String(p.sku||'')+' — '+p.name;}
function commerceFindProduct(products,value){
 const q=commerceNormalize(value);
 if(!q)return null;
 const exact=products.filter(p=>[commerceProductLabel(p),p.name,p.sku].some(v=>commerceNormalize(v)===q));
 if(exact.length===1)return exact[0];
 const prefix=products.filter(p=>[commerceProductLabel(p),p.name,p.sku].some(v=>commerceNormalize(v).startsWith(q)));
 return prefix.length===1?prefix[0]:null;
}
function commerceProductInput(i,products,selected){
 const p=products.find(x=>x.id===selected);
 const label=p?commerceProductLabel(p):'';
 return '<input type="text" id="rc-product-search-'+i+'" class="rc-product-search" value="'+esc(label)+'" list="rc-product-options-'+i+'" placeholder="ابحث باسم الصنف أو رقمه" autocomplete="off">'+
  '<input type="hidden" id="rc-product-'+i+'" value="'+esc(selected||'')+'">'+
  '<datalist id="rc-product-options-'+i+'">'+products.map(x=>'<option value="'+esc(commerceProductLabel(x))+'"></option><option value="'+esc(x.name)+'"></option>').join('')+'</datalist>';
}
function commerceAutocomplete(input,values,event,matchAnywhere=false){
 if(!input||input.dataset.composing==='1'||!input.id||event?.isComposing)return;
 const typed=commerceNormalize(input.value),existingId=input.getAttribute('list');
 // Each candidate is counted once, even if both its name and code match.
 // The inserted text follows what the user typed (name OR code), never replaces it
 // with a different prefix. This also works for stock items displayed as CODE — NAME.
 const suggestions=typed.length<2?[]:values.map(item=>{
  const value=String((typeof item==='string'?item:item?.value)||'').trim();
  if(!value)return null;
  const aliases=(typeof item==='string'?[value]:item.aliases||[value]);
  const found=aliases.map(alias=>typeof alias==='string'?{search:alias,fill:alias}:alias)
   .find(alias=>matchAnywhere?commerceAccountMatch(alias.search,typed):commerceNormalize(alias.search).startsWith(typed)&&commerceNormalize(alias.fill).startsWith(typed));
  return found?{value,fill:String(found.fill)}:null;
 }).filter(Boolean);
 if(!existingId||existingId.startsWith('ratib-commerce-suggest-')){
  let list=existingId?document.getElementById(existingId):null;
  if(!list&&suggestions.length){
   list=document.createElement('datalist');
   list.id='ratib-commerce-suggest-'+input.id.replace(/[^a-zA-Z0-9_-]/g,'-');
   input.setAttribute('list',list.id);input.after(list);
  }
  if(list)list.replaceChildren(...suggestions.slice(0,25).map(item=>{
   const option=document.createElement('option');option.value=item.fill;return option;
  }));
 }
 const kind=String(event?.inputType||'');
 if(kind.startsWith('delete')||(kind&&!kind.startsWith('insert')))return;
 if(document.activeElement!==input||input.selectionStart!==input.selectionEnd||
   input.selectionEnd!==input.value.length||suggestions.length!==1)return;
 const before=input.value,match=suggestions[0].fill;
 if((!matchAnywhere&&!commerceNormalize(match).startsWith(commerceNormalize(before)))||match.length<=before.length)return;
 input.value=match;
 try{const prefix=commerceNormalize(match).startsWith(commerceNormalize(before));input.setSelectionRange(window.RatibVoiceFirstAccountActive?.(input)?match.length:(prefix?before.length:match.length),match.length);}catch(_){}
}

function commerceResolveProduct(index){
 if(!draft)return;
 const input=$('rc-product-search-'+index),hidden=$('rc-product-'+index);
 if(!input||!hidden||!draft.lines[index])return;
 const list=mode==='in'||mode==='out'?data().products:[];
 const p=commerceFindProduct(list,input.value);
 hidden.value=p?.id||'';
 const old=draft.lines[index].product||'';
 draft.lines[index].product=hidden.value;
 if(p&&old!==p.id){
  draft.lines[index].unit=pMain(p);
  draft.lines[index].price=mode==='out'&&(draft.currency||'YER')==='YER'?Number(p.price)||0:0;
  const unit=$('rc-unit-'+index),price=$('rc-price-'+index);
  if(unit)unit.innerHTML=unitList(p).map(v=>'<option value="'+esc(v)+'"'+(v===draft.lines[index].unit?' selected':'')+'>'+esc(v)+'</option>').join('');
  if(price)price.value=draft.lines[index].price;
 }
 if(!p){draft.lines[index].unit='';draft.lines[index].price=0;}
 refreshTotals();
}
function leafAccount(value){return leaf().some(a=>a.id===value);}
function validatedAccount(v,label){if(v&&!leafAccount(v))throw Error('الحساب المحدد غير موجود أو غير تفصيلي: '+label);return v||'';}
function warehouseAccount(db,wid){const w=db.warehouses.find(x=>x.id===wid);return w?.accountId||db.accounts.inventory||'';}
function partyAccount(db,doc){return doc.partyAccount||db.people.find(p=>p.name===doc.partyName&&p.type===(['purchase','purchase_return'].includes(doc.kind)?'vendor':'client'))?.accountId||(doc.kind==='purchase'||doc.kind==='purchase_return'?db.accounts.payable:db.accounts.receivable);}
function productRows(db){return db.products.map(p=>[p.sku,p.name,p.group||'',pMain(p),pSub(p),p.price||0,p.minimum||0]);}

function commerceAmountWords(amount,currency='YER'){
 if(typeof tafqitAccountCurrency==='function')return tafqitAccountCurrency(amount,currency);
 if(typeof tafqit==='function'&&currency==='YER')return tafqit(amount);
 return '';
}
function commerceCurrencyName(code){
 return ({YER:'ريال يمني',SAR:'ريال سعودي',AED:'درهم إماراتي',OMR:'ريال عُماني',USD:'دولار أمريكي'})[code]||code;
}
function commerceSignatureLabels(d){
 const labels={
  'أمر توريد':['معدّ الطلب','المراجع','المعتمد'],
  'توريد مخزني':['المسلّم','أمين المخزن المستلم','الفاحص','المعتمد'],
  'فاتورة مشتريات':['مسؤول المشتريات','مراجع الحسابات','المعتمد'],
  'أمر صرف':['طالب الصرف','المراجع','المعتمد'],
  'صرف مخزني':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد'],
  'فاتورة مبيعات':['محرّر الفاتورة','المحاسب','المعتمد','العميل / المستلم'],
  'مرتجع الوارد':['المسلّم','أمين المخزن المستلم','المراجع','المعتمد'],
  'مرتجع الصادر':['أمين المخزن المسلّم','المستلم','المراجع','المعتمد']
 };
 return (window.RatibSignatureSettings?.get?.(docName(d))?.people||labels[docName(d)]?.map(label=>({label}))||[{label:'المعدّ'},{label:'المستلم'},{label:'المراجع'},{label:'المعتمد'}]).map(p=>p.label);
}
function commerceSignatureHtml(d){
 return window.RatibSignatureSettings?.html?.(docName(d))||'';
}
function printHeading(title,info=''){
 const cfg=typeof getHeaderConfig==='function'?getHeaderConfig():{name:'راتب للتنظيم والتدبير المالي',details:'',show:true};
 return (cfg.show?'<header class="rc-paper-head"><strong>'+esc(cfg.name||'راتب للتنظيم والتدبير المالي')+'</strong>'+(cfg.details?'<div class="rc-paper-header-details">'+esc(cfg.details)+'</div>':'')+'</header>':'')+
 '<h2 class="rc-document-title">'+esc(title)+'</h2>'+(info?'<p class="rc-paper-subtitle">'+esc(info)+'</p>':'');
}
function guideMarkup(db,selected){
 const title=selected?'بطاقة الصنف':'دليل الأصناف',subtitle=selected?selected.sku+' — '+selected.name:'إجمالي الأصناف: '+db.products.length;
 const heads=['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'];
 return '<article class="rc-paper rc-guide-paper" dir="rtl">'+printHeading(title,subtitle)+
 '<table class="rc-document-table"><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
 productRows(selected?{products:[selected]}:db).map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></article>';
}
function* productGuideCanvases(db,selected){
 const title=selected?'بطاقة الصنف':'دليل الأصناف',subtitle=selected?selected.sku+' — '+selected.name:'عدد الأصناف: '+db.products.length;
 const heads=['رقم الصنف','اسم الصنف','المجموعة','الرئيسية','الفرعية','سعر YER','حد التنبيه'];
 const widths=[130,260,190,150,140,120,100];
 let number=1,page=reportCanvasPage(title,subtitle,number);
 const draw=(layout,color)=>drawReportTableRow(page,layout,widths,color);
 const header=()=>draw(reportTableLayout(page.ctx,heads,widths,18),'#e2e8f0');
 header();
 for(const values of productRows(selected?{products:[selected]}:db)){
  const layout=reportTableLayout(page.ctx,values.map(x=>String(x??'')),widths,18);
  if(page.y+layout.height>1530){yield page.canvas;page=reportCanvasPage(title,subtitle,++number);header();}
  draw(layout,'#fff');
 }
 yield page.canvas;
}
async function productOutput(action,productId=''){
 const db=data(),selected=productId?db.products.find(p=>p.id===productId):null;
 if(productId&&!selected)throw Error('الصنف المحدد لم يعد موجودًا.');
 const filename=selected?'بطاقة-صنف-'+selected.sku+'.pdf':'دليل-الأصناف-راتب.pdf';
 if(action==='preview'){const modal=ensurePreview();modal.querySelector('#rc-preview-content').innerHTML=guideMarkup(db,selected);previewId=selected?'__product__:'+selected.id:'__products__';modal.querySelector('#rc-preview-print').disabled=false;window.RatibPrintLogo?.syncPrint?.();modal.classList.add('show');return;}
 if(action==='print'){let host=$('ratibCommercePrintHost');if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}host.innerHTML=guideMarkup(db,selected);window.RatibPrintLogo?.syncPrint?.();if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');else window.print();return;}
 if(action==='pdf'||action==='share'){
  await window.RatibPrintLogo?.whenReady?.();
  const pdf=buildPdfFromCanvases(productGuideCanvases(db,selected));
  if(action==='pdf')downloadFinancialFile(pdf,filename);
  else await shareRatibDocumentFile(new File([pdf],filename,{type:'application/pdf'}),'راتب — '+(selected?'بطاقة الصنف '+selected.name:'دليل الأصناف'));
  return;
 }
 if(action==='export'||action==='template'){if(typeof XLSX==='undefined')throw Error('مكتبة Excel غير متاحة.');const rows=action==='template'?[]:productRows(db);const sheet=XLSX.utils.aoa_to_sheet([['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'],...rows]);sheet['!cols']=[12,38,25,19,19,20,16].map(wch=>({wch}));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'الأصناف');XLSX.writeFile(book,action==='template'?'نموذج-استيراد-أصناف-راتب.xlsx':'راتب-دليل-الأصناف.xlsx',{compression:true});return;}
 if(action==='import'){$('rc-import-file')?.click();return;}
}

function stageProducts(rows,db){if(!Array.isArray(rows)||rows.length===0)throw Error('ملف Excel فارغ.');if(rows.length>10000)throw Error('قسّم الملف إلى دفعات لا تتجاوز 10000 صنف.');
 const seen=new Set(),existing=new Set(db.products.map(x=>String(x.sku).trim())),out=[];
 for(let i=0;i<rows.length;i++){const r=rows[i];if(!Array.isArray(r)||r.every(x=>x==null||String(x).trim()===''))continue;
 let [sku,name,group,main,sub,price,minimum]=r.map(x=>String(x??'').trim());sku=sku||String(i+1).padStart(6,'0');
 if(!sku||!name||!group||!main)throw Error('سطر '+(i+2)+': الرقم والاسم والمجموعة والوحدة الرئيسية مطلوبة.');
 if(main===sub&&sub)throw Error('سطر '+(i+2)+': الوحدة الفرعية تطابق الرئيسية.');
 if(seen.has(sku)||existing.has(sku))throw Error('رقم صنف مكرر في الملف أو الدليل: '+sku+' (سطر '+(i+2)+')');
 if(!/^\d+(?:\.\d+)?$/.test(price||'0')||!/^\d+(?:\.\d+)?$/.test(minimum||'0'))throw Error('سطر '+(i+2)+': السعر أو الحد ليس رقمًا موجبًا.');
 const p=Number(price||0),m=Number(minimum||0);if(!Number.isFinite(p)||!Number.isFinite(m)||p>1e12||m>1e12)throw Error('قيمة غير صالحة في السطر '+(i+2));
 seen.add(sku);out.push({id:id(),sku,name,group,unitMain:main,unitSub:sub,unit:main,price:p,minimum:m});
 }if(!out.length)throw Error('لا توجد أصناف صالحة للاستيراد.');return out;
}
function stageImportFile(file){if(!file)return;const reader=new FileReader();reader.onerror=()=>notify('تعذر قراءة ملف Excel','error');reader.onload=()=>{try{
 if(typeof XLSX==='undefined')throw Error('مكتبة Excel غير متاحة.');const wb=XLSX.read(reader.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];
 if(!ws)throw Error('لا توجد ورقة Excel صالحة.');
 const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
 const head=(rows[0]||[]).map(x=>String(x).trim());const expected=['رقم الصنف','اسم الصنف','المجموعة','الوحدة الرئيسية','الوحدة الفرعية','سعر البيع YER','حد التنبيه'];
 if(expected.some((h,i)=>head[i]!==h))throw Error('ترتيب الأعمدة مختلف؛ نزّل نموذج الاستيراد واستخدم عناوينه.');
 pendingImport=stageProducts(rows.slice(1),data());paint();
 }catch(e){pendingImport=null;notify(e.message||'تعذر تحليل ملف الاستيراد','error');}};reader.readAsArrayBuffer(file);}
async function confirmProductImport(){if(!pendingImport?.length)throw Error('لا يوجد استيراد قيد المراجعة.');const db=data(),p=pendingImport;
 const exists=new Set(db.products.map(x=>x.sku));if(p.some(x=>exists.has(x.sku)))throw Error('ظهرت أرقام متكررة أثناء المراجعة؛ أعد قراءة الملف.');
 db.products.push(...p);save(db);await flushStorage();pendingImport=null;paint();notify('تم استيراد '+p.length+' صنف دون تعديل الأصناف السابقة','success');
}

function nextSku(db){const used=new Set(db.products.map(p=>String(p.sku)));let no=Math.max(0,...db.products.map(p=>/^\d+$/.test(p.sku)?Number(p.sku):0));let val;do{val=String(++no).padStart(6,'0')}while(used.has(val));return val;}
function nextNumber(db,kind,title=''){
 const groups=kind==='purchase'?inboundNumbers:kind==='sale'?outboundNumbers:null;
 const prefix=groups?(groups[title]||(kind==='purchase'?'IN':'OUT')):'OUT';
 const docs=db.invoices.filter(x=>x.kind===kind&&(!groups||(groups[title]?x.title===title:!groups[x.title])));
 const max=docs.reduce((m,x)=>Math.max(m,Number(String(x.number).match(/(\d+)$/)?.[1]||0)),0);
 const used=new Set(db.invoices.filter(x=>x.kind===kind).map(x=>String(x.number)));
 let count=max+1,number=prefix+'-'+String(count).padStart(5,'0');
 while(used.has(number)){number=prefix+'-'+String(++count).padStart(5,'0');}
 return number;
}
function move(x,l,wid){
 if(x.kind==='transfer')return x.from===wid?-l.qty:x.to===wid?l.qty:0;
 if(x.warehouse!==wid)return 0;
 return ['purchase','sale_return'].includes(x.kind)?l.qty:['sale','purchase_return'].includes(x.kind)?-l.qty:x.kind==='adjust'?(x.direction==='in'?l.qty:-l.qty):0;
}

function qty(db,pid,wid,unit){
 return rnd(db.invoices.reduce((a,x)=>a+(x.lines||[]).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((sum,l)=>sum+move(x,l,wid),0),0));
}
function average(db,pid,wid,unit){
 let balanceQty=0,balanceValue=0;
 for(const x of db.invoices)for(const l of x.lines||[])if(l.product===pid&&(!unit||lineUnit(db,l)===unit)){
  const delta=move(x,l,wid);if(!delta)continue;
  if(delta>0){balanceQty=rnd(balanceQty+delta);balanceValue=rnd(balanceValue+Number(l.cost||0));}
  else {balanceQty=rnd(balanceQty+delta);balanceValue=rnd(balanceValue-Number(l.cost||0));}
 }
 return balanceQty>0?Math.max(0,rnd(balanceValue/balanceQty)):0;
}
function leaf(){
 // Detail rows are posting accounts. Main, group, and subgroup headings are not selectable.
 const chosen=new Map();
 for(const node of getCanonicalCatalog()){
  for(const item of node.details||[]){
   const code=String(item[0]||'').trim(),name=String(item[1]||'').trim();
   if(code&&name&&!chosen.has(name))chosen.set(name,{id:name,name:code+' — '+name});
  }
 }
 return [...chosen.values()];
}
function paint(){
 if(view==='accounts'){if($('pageCommerce'))$('pageCommerce').innerHTML='';openAccountDefaults();return;}
 const db=data(),panels=mode==='stock'?[['products','بطاقة الصنف'],['warehouses','المخازن'],['movements','حركة المخزون'],['summary','تقارير المخزون']]:[['new','مستند جديد'],['return','مرتجعات'],['records','سجل المستندات'],['people',mode==='in'?'الموردون':'العملاء'],['summary','التقارير']];
 let body='';
 if(view==='products')body=products(db);if(view==='warehouses')body=warehouses(db);if(view==='people')body=people(db);if(view==='accounts')body=accounts(db);
 if(['new','return'].includes(view))body=invoice(db);
 if(['adjust','transfer'].includes(view))body=movementForm(db);
 if(view==='movements')body=movements(db);if(view==='records')body=records(db);if(view==='summary')body=summary(db);
 if(view==='detail')body=showDocument(db);
 const renderTab=x=>{
 const button='<button type="button" class="'+(view===x[0]?'active':'')+'" data-rc-view="'+x[0]+'"><span class="rc-tab-icon" aria-hidden="true">'+(commerceTabIcons[x[0]]||'◉')+'</span><span>'+x[1]+'</span></button>';
 if(x[0]!=='new')return button;
 const toggle=button.replace('data-rc-view="new"','data-rc-toggle-new="1" aria-haspopup="menu" aria-expanded="'+(newMenuOpen?'true':'false')+'"');
 return '<div class="rc-new-menu-wrap">'+toggle+'<div class="rc-new-menu" role="menu" '+(newMenuOpen?'':'hidden')+'>'+types[mode].map(title=>'<button type="button" role="menuitem" data-rc-direct-type="'+esc(title)+'"><span aria-hidden="true">'+(commerceDocIcons[title]||'▣')+'</span> '+esc(title)+'</button>').join('')+'</div></div>';
};
const tabMarkup=mode==='stock'?panels.map(renderTab).join(''):
 panels.filter(x=>['new','records'].includes(x[0])).map(renderTab).join('')+
 '<details class="rc-tab-more"><summary>⋮ المزيد</summary><div class="rc-tab-more-menu">'+panels.filter(x=>!['new','records'].includes(x[0])).map(renderTab).join('')+'</div></details>';
const header=mode==='stock'?'المخزون':mode==='in'?'الوارد':'الصادر';
 $('pageCommerce').innerHTML='<div class="rc-app" data-rc-mode="'+mode+'" data-rc-button-size="'+commerceButtonSize()+'"><div class="rc-head"><h2>'+({'stock':'📦 ','in':'📥 ','out':'📤 '}[mode]||'')+header+'</h2>'+(view==='detail'?'':'<button type="button" class="btn btn-ghost" data-rc-back="1" aria-label="الرجوع">← <span class="rc-back-label">رجوع</span></button>')+'</div><div class="rc-tabs">'+tabMarkup+'</div>'+body+'</div>';
 orderCommerceAccounts();
}
function filteredCatalogProducts(db){
 const term=catalogSearch.trim().toLocaleLowerCase();
 return db.products.filter(p=>(!term||String(p.name||'').toLocaleLowerCase().includes(term)||String(p.sku||'').toLocaleLowerCase().includes(term))&&(!catalogGroup||p.group===catalogGroup));
}
function catalogListMarkup(db){
 const items=filteredCatalogProducts(db);
 const rows=items.length?items.map(p=>[esc(p.sku),esc(p.name),esc(p.group||'—'),esc(pMain(p)),esc(pSub(p)||'—'),'<button type="button" data-rc-edit-product="'+esc(p.id)+'">تعديل</button> <button type="button" data-rc-products="preview" data-rc-item="'+esc(p.id)+'">معاينة</button> <button type="button" data-rc-products="pdf" data-rc-item="'+esc(p.id)+'">PDF</button> <button type="button" data-rc-products="share" data-rc-item="'+esc(p.id)+'">مشاركة</button>']):[['لا توجد أصناف مطابقة','','','','','']];
 return '<div class="rc-catalog-count" aria-live="polite">عرض '+items.length+' من '+db.products.length+' صنف</div>'+table(['الرقم','الصنف','المجموعة','الرئيسية','الفرعية',''],rows);
}
function refreshCatalogListing(){
 const host=$('rc-catalog-results');
 if(host)host.innerHTML=catalogListMarkup(data());
}
function products(db){
 const p=db.products.find(x=>x.id===editingProduct),exists=!!p;
 const form='<form id="rc-product-form" class="rc-grid">'+
 fld('رقم الصنف (تلقائي وقابل للتعديل)',inp('sku','text',p?.sku||nextSku(db),'required maxlength="30"'))+
 fld('اسم الصنف',inp('name','text',p?.name||'','required maxlength="120"'))+
 fld('المجموعة',inp('group','text',p?.group||'','required list="rc-group-list" maxlength="80"')+
 '<datalist id="rc-group-list">'+[...new Set(db.products.map(p=>p.group).filter(Boolean))].map(g=>'<option value="'+esc(g)+'"></option>').join('')+'</datalist>')+
 fld('الوحدة الرئيسية',inp('unitMain','text',pMain(p||{unit:'حبة'}),'required maxlength="30"'))+
 fld('الوحدة الفرعية',inp('unitSub','text',pSub(p),'maxlength="30" placeholder="اختياري"'))+
 fld('سعر البيع الافتراضي YER',inp('price','number',p?.price||0,'min="0" step="0.01"'))+
 fld('حد تنبيه المخزون',inp('minimum','number',p?.minimum||0,'min="0" step="0.01"'))+
 '<div class="rc-full rc-actions"><button class="btn btn-primary" type="submit">'+(exists?'حفظ تعديل الصنف':'حفظ الصنف')+'</button>'+(exists?'<button type="button" class="btn btn-ghost" data-rc-edit-product="">إلغاء التعديل</button>':'')+'</div></form>';
 const toolbar='<div class="rc-guide-actions no-print">'+[['preview','◉','المعاينة'],['print','▤','الطباعة'],['pdf','▣','PDF'],['share','⇧','المشاركة'],['export','⇩','تصدير Excel'],['template','▦','نموذج Excel'],['import','⇧','استيراد Excel']].map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-products="'+action+'"><span class="rc-guide-tool-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('')+'<input id="rc-import-file" type="file" accept=".xlsx,.xls" hidden></div>';
 const itemActions=exists?'<div class="rc-guide-actions no-print">'+[['preview','المعاينة'],['print','الطباعة'],['pdf','PDF'],['share','المشاركة']].map(([action,label])=>'<button type="button" class="rc-doc-action" data-rc-products="'+action+'" data-rc-item="'+esc(p.id)+'">'+label+'</button>').join('')+'</div>':'';
 const review=pendingImport?'<div class="rc-import-review"><h4>معاينة قبل الاستيراد: '+pendingImport.length+' صنف</h4>'+table(['رقم','الصنف','المجموعة','الرئيسية','الفرعية'],pendingImport.slice(0,25).map(x=>[x.sku,x.name,x.group,x.unitMain,x.unitSub].map(esc)))+'<p>المعروض أول 25 صنفًا فقط؛ سيُحفظ الإجمالي بعد الموافقة.</p><button type="button" class="btn btn-primary" data-rc-confirm-import="1">تأكيد الاستيراد</button><button type="button" class="btn btn-ghost" data-rc-cancel-import="1">إلغاء</button></div>':'';
 return wrap('بطاقة الصنف',form+itemActions+'<p class="rc-note">الوحدتان تعريفان مستقلان للصنف؛ لا يُطبّق التحويل بينهما حتى اعتماد نسب التحويل لاحقًا.</p>')+
 '<section class="rc-card rc-products-guide">'+
 '<div class="rc-guide-heading no-print"><h3>دليل الأصناف</h3><div class="rc-catalog-buttons">'+
 '<button type="button" class="rc-catalog-toggle'+(catalogSearchVisible?' is-active':'')+'" data-rc-catalog-toggle="search" aria-expanded="'+catalogSearchVisible+'" aria-controls="rc-catalog-search-field"><span aria-hidden="true">⌕</span> بحث الصنف</button>'+
 '<button type="button" class="rc-catalog-toggle'+(catalogGroupVisible?' is-active':'')+'" data-rc-catalog-toggle="group" aria-expanded="'+catalogGroupVisible+'" aria-controls="rc-catalog-group-field"><span aria-hidden="true">▦</span> فلترة المجموعة</button>'+
 '</div></div>'+
 ((catalogSearchVisible||catalogGroupVisible)?'<div class="rc-catalog-filter-fields no-print">'+
  (catalogSearchVisible?'<label id="rc-catalog-search-field"><span>البحث باسم الصنف أو رقمه</span><input type="search" id="rc-catalog-search" value="'+esc(catalogSearch)+'" placeholder="اكتب اسم الصنف أو رقمه" autocomplete="off"></label>':'')+
  (catalogGroupVisible?'<label id="rc-catalog-group-field"><span>اختيار المجموعة</span><select id="rc-catalog-group"><option value="">جميع المجموعات</option>'+[...new Set(db.products.map(p=>p.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(g=>'<option value="'+esc(g)+'" '+(g===catalogGroup?'selected':'')+'>'+esc(g)+'</option>').join('')+'</select></label>':'')+
 '</div>':'')+
 toolbar+review+'<div id="rc-catalog-results">'+catalogListMarkup(db)+'</div></section>';
}
function warehouses(db){
 const w=db.warehouses.find(x=>x.id===editingWarehouse),opts=leaf();
 return wrap('إدارة المخازن','<p class="rc-note">كل مخزن مرتبط بحساب تفصيلي من شجرة راتب؛ الاسم المستعار للعرض فقط. لا يُعدل ربط مستندات قديمة.</p><form id="rc-warehouse-form" class="rc-grid">'+
 fld('الحساب الفرعي المرتبط بالمخزن',commerceSmartAccount('warehouse-account',opts,w?.accountId||''))+
 fld('الاسم المستعار (اختياري)',inp('name','text',w?.alias||'','maxlength="100" placeholder="يستخدم اسم الحساب تلقائيًا عند تركه فارغًا"'))+
 '<button class="btn btn-primary" type="submit">'+(w?'حفظ التعديل':'إضافة مخزن')+'</button></form>')+
 wrap('المخازن',table(['اسم المخزن','الحساب الفرعي',''],db.warehouses.map(w=>[esc(w.alias||w.name),esc(w.accountId||'غير مرتبط بعد'),'<button type="button" data-rc-edit-warehouse="'+esc(w.id)+'">تعديل الربط</button>'])));
}
function people(db){const type=mode==='in'?'vendor':'client';return wrap('إدارة '+(type==='vendor'?'الموردين':'العملاء'),'<form id="rc-person-form" class="rc-grid">'+
 fld('الحساب الفرعي '+(type==='vendor'?'للمورد':'للعميل'),commerceSmartAccount('person-account',leaf(),''))+
 fld('الاسم المستعار (اختياري)',inp('name','text','','maxlength="120"'))+
 fld('رقم الهاتف',inp('phone','tel'))+'<button class="btn btn-primary">حفظ</button></form>')+
 wrap('السجل',table(['الاسم','الحساب الفرعي','الهاتف'],db.people.filter(p=>p.type===type).map(p=>[esc(p.name),esc(p.accountId||'—'),esc(p.phone||'—')])));}

function refreshDefaults(){
 const host=$('ratibCommerceDefaults');if(host)host.innerHTML=accounts(data());
}
function openAccountDefaults(){
 if(!requestLeave())return false;
 refreshDefaults();
 if(window.RatibSettingsOpen)window.RatibSettingsOpen('defaults');
 else if(typeof navigateToTab==='function')navigateToTab('pageSettings',true);
}
function orderCommerceAccounts(){
 const host=document.querySelector?.('#pageCommerce .rc-account-fields');if(!host||host.querySelector('#rc-debitAccount'))return;
 const warehouse=$('rc-warehouse')?.closest('.rc-wide-account'),party=$('rc-partyAccount')?.closest('.rc-wide-account');
 if(!warehouse||!party)return;
 const stockDebit=(mode==='in')!==(view==='return');
 warehouse.dataset.accountSide=stockDebit?'debit':'credit';party.dataset.accountSide=stockDebit?'credit':'debit';
 const first=stockDebit?warehouse:party,last=stockDebit?party:warehouse;
 host.append(first,last);
 const account=$('rc-search-partyAccount');if(account)account.setAttribute('aria-label','حساب الطرف الآخر — '+(stockDebit?'دائن':'مدين')+' (للتسوية الآجلة)');
}
function accounts(db){
 const names={cash:'الصندوق / البنك',receivable:'ذمم العملاء (الصادر الآجل)',payable:'ذمم الموردين (الوارد الآجل)',inventory:'حساب المخزون',sales:'إيرادات المبيعات',cogs:'تكلفة البضاعة المباعة',adjust:'فروق وتسويات المخزون'};
 return wrap('حسابات الفواتير والمخزون','<p class="rc-note">اختر حسابًا فرعيًا تفصيليًا من شجرة الحسابات بالبحث بالرقم أو الاسم. الربط قابل للتغيير، ولا يُسمح بالحسابات الرئيسية أو التجميعية. تعديل الربط لا يغيّر المستندات المحفوظة.</p><form id="rc-accounts-form" class="rc-grid">'+Object.keys(names).map(k=>fld(names[k],commerceSmartAccount('acc-'+k,leaf(),db.accounts[k]))).join('')+'<button class="btn btn-primary">حفظ الربط</button></form>');
}
function records(db){
 const docs=db.invoices.filter(d=>mode==='in'?['purchase','purchase_return'].includes(d.kind):['sale','sale_return'].includes(d.kind));
 const filtered=docs.filter(d=>!query||[d.number,docName(d),d.partyName,d.date,d.note].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 const cards=filtered.slice().reverse().map(x=>'<article class="rc-record-item">'+
  '<header class="rc-record-heading"><strong>'+esc(docName(x))+'</strong><span>'+esc(x.number)+'</span></header>'+
  '<div class="rc-record-meta"><span><b>التاريخ:</b> '+esc(x.date)+'</span><span><b>الطرف:</b> '+esc(x.partyName||'—')+'</span>'+
  '<span><b>الإجمالي:</b> '+f(x.total)+' '+esc(x.currency||'YER')+'</span><span><b>المعادل YER:</b> '+f(x.baseTotal??x.total)+'</span></div>'+
  '<div class="rc-record-buttons no-print"><button type="button" class="btn btn-ghost" data-rc-detail="'+esc(x.id)+'">مشاهدة</button>'+
  '<details class="rc-record-more"><summary>⋮ إجراءات</summary><div class="rc-record-more-menu">'+
  [['edit','تعديل'],['clone','استنساخ'],['delete','حذف']].map(([action,label])=>'<button type="button" class="btn btn-ghost" data-rc-doc-op="'+action+'" data-doc="'+esc(x.id)+'">'+label+'</button>').join('')+
  '</div></details></div></article>').join('');
 return wrap('سجل مستندات '+(mode==='in'?'الوارد':'الصادر'),'<div class="rc-search no-print">'+inp('query','search',query,'placeholder="ابحث برقم المستند أو التاريخ أو الطرف..."')+'<button type="button" class="btn btn-ghost" data-rc-search="1">🔎 بحث</button></div>'+
 '<p class="rc-record-count">عدد المستندات: '+filtered.length+'</p><div class="rc-record-list">'+(cards||'<p class="rc-note">لا توجد مستندات مطابقة.</p>')+'</div>');
}
function summary(db){
 const sum=k=>db.invoices.filter(d=>d.kind===k).reduce((a,d)=>a+Number(d.baseTotal??d.total??0),0);
 const sales=rnd(sum('sale')-sum('sale_return')),purchases=rnd(sum('purchase')-sum('purchase_return'));
 const cost=rnd(db.invoices.filter(d=>d.kind==='sale').reduce((a,d)=>a+Number(d.cost||0),0)-db.invoices.filter(d=>d.kind==='sale_return').reduce((a,d)=>a+Number(d.cost||0),0));
 const rows=db.products.flatMap(p=>db.warehouses.flatMap(w=>unitList(p).map(u=>{
  const q=qty(db,p.id,w.id,u);return [esc(p.name),esc(p.group||'—'),esc(w.name),esc(u),f(q),f(q*average(db,p.id,w.id,u)),q<=Number(p.minimum||0)?'منخفض':'متاح'];
 })));
 return wrap('ملخص مالي ومخزني (YER)','<div class="rc-kpis"><div>صافي المبيعات<strong>'+f(sales)+'</strong></div><div>صافي المشتريات<strong>'+f(purchases)+'</strong></div><div>مجمل الربح<strong>'+f(sales-cost)+'</strong></div></div>')+
 wrap('كميات الأصناف وتقييمها',table(['الصنف','المجموعة','المخزن','الوحدة','الرصيد','القيمة','الحالة'],rows));
}
function movementForm(db){
 const transfer=view==='transfer';
 return wrap(transfer?'تحويل بين المخازن':'إدخال وإخراج مخزني','<form id="rc-movement-form" class="rc-grid">'+
 fld('التاريخ',inp('date','date',today(),'required'))+
 fld('الصنف',sel('product',db.products))+
 fld('الوحدة',sel('unit',unitList(db.products[0]||{unit:'حبة'}).map(x=>({id:x,name:x}))))+
 (transfer?fld('المخزن الوجهة (مدين)',sel('target',db.warehouses)):'')+
 fld(transfer?'المخزن المصدر (دائن)':'المخزن',sel('warehouse',db.warehouses))+
 (transfer?'':fld('اتجاه التسوية','<select id="rc-direction"><option value="in">وارد</option><option value="out">صادر</option></select>'))+
 fld('الكمية',inp('qty','number',1,'min="0.01" step="0.01"'))+
 (transfer?'':fld('تكلفة الوحدة عند الإدخال (YER)',inp('cost','number',0,'min="0" step="0.01"')))+
 '<button type="submit" class="btn btn-primary">اعتماد الحركة</button></form>');
}
function movements(db){
 const rows=db.invoices.slice().reverse().flatMap(d=>(d.lines||[]).flatMap(l=>db.warehouses.filter(w=>move(d,l,w.id)!==0).map(w=>[esc(d.date),esc(docName(d)),esc(db.products.find(p=>p.id===l.product)?.name||'—'),esc(w.name),esc(lineUnit(db,l)),f(move(d,l,w.id))])));
 return wrap('حركة الأصناف',table(['التاريخ','المستند','الصنف','المخزن','الوحدة','الكمية'],rows));
}
function newDraft(){
 const db=data(),kind=view==='return'?(mode==='in'?'purchase_return':'sale_return'):dir(),title=view==='return'?'مرتجع':types[mode]?.[0]||'مرتجع';
 const preferred=window.RatibCountryCurrency?.base?.()||'YER';
 const currency=COMMERCE_CURRENCIES.some(x=>x.id===preferred)?preferred:'YER';
 return {kind,title,number:nextNumber(db,kind,title),date:today(),warehouse:db.warehouses[0]?.id||'main',partyName:'',displayPartyName:'',partyAccount:'',payment:'credit',currency,exchangeRate:currency==='YER'?1:'',note:'',origin:'',lines:[{id:id(),product:'',unit:'',qty:1,price:0}]};
}
function leftToReturn(db,origin,pid,unit){
 const x=db.invoices.find(t=>t.id===origin);
 const original=(x?.lines||[]).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((a,l)=>a+Number(l.qty||0),0);
 const returned=db.invoices.filter(t=>t.origin===origin).flatMap(t=>t.lines).filter(l=>l.product===pid&&(!unit||lineUnit(db,l)===unit)).reduce((a,l)=>a+Number(l.qty||0),0);
 return rnd(original-returned);
}
function commerceSimpleInvoice(title){return title==='فاتورة مشتريات'||title==='فاتورة مبيعات';}
function commerceInvoiceDebitDefault(db,d){
 return ['purchase','purchase_return'].includes(d.kind)?warehouseAccount(db,d.warehouse):
  d.payment==='cash'?db.accounts.cash:(d.partyAccount||db.accounts.receivable);
}
function commerceInvoiceCreditDefault(db,d){
 return ['purchase','purchase_return'].includes(d.kind)?
  (d.payment==='cash'?db.accounts.cash:(d.partyAccount||db.accounts.payable)):db.accounts.sales;
}
function commerceNameSuggestions(db){
 return [...new Set(db.invoices.map(x=>String(x.displayPartyName||'').trim()).filter(Boolean))].slice(-120).reverse();
}
function invoice(db){
 const kind=view==='return'?(mode==='in'?'purchase_return':'sale_return'):dir(),ret=view==='return';
 if(!draft||draft.kind!==kind){draft=newDraft();editingDocId='';}
 if(!draftBaselines.has(draft))draftBaselines.set(draft,draftSignature(draft));
 const orig=db.invoices.find(x=>x.id===draft.origin);
 if(ret&&orig){draft.currency=orig.currency||'YER';draft.exchangeRate=orig.exchangeRate||1;}
 const simpleInvoice=commerceSimpleInvoice(draft.title)&&!ret;
 if(simpleInvoice){
  if(draft.debitAccount===undefined)draft.debitAccount=commerceInvoiceDebitDefault(db,draft)||'';
  if(draft.creditAccount===undefined)draft.creditAccount=commerceInvoiceCreditDefault(db,draft)||'';
 }
 const originals=ret?db.invoices.filter(d=>d.kind===dir()&&(d.id===draft.origin||(d.lines||[]).some(l=>leftToReturn(db,d.id,l.product,lineUnit(db,l))>0))):[];
 const partySuggestions=[...db.people.map(p=>p.name),...leaf().map(x=>x.id)];
 const form='<form id="rc-invoice-form"><div class="rc-grid rc-invoice-fields">'+
 (ret?fld('نوع المستند','<strong>مرتجع '+(mode==='in'?'الوارد':'الصادر')+'</strong>'):'')+
 fld('رقم المستند / الفاتورة',inp('number','text',draft.number,'required maxlength="40"'))+
 fld('التاريخ',inp('date','date',draft.date,'required'))+
 (simpleInvoice?(
 '<div class="rc-full rc-optional-supplier">'+commerceInlineField('اكتب اسم',inp('displayPartyName','text',draft.displayPartyName||'','maxlength="140" autocomplete="off" placeholder="اكتب اسم" list="rc-free-names"'))+
 '<datalist id="rc-free-names">'+commerceNameSuggestions(db).map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist></div>'+
 '<div class="rc-full rc-account-fields">'+
 '<div class="rc-wide-account">'+commerceInlineField('حساب الطرف المدين',commerceSmartAccount('debitAccount',leaf(),draft.debitAccount,'حساب الطرف المدين'))+'</div>'+
 '<div class="rc-wide-account">'+commerceInlineField('حساب الطرف الدائن',commerceSmartAccount('creditAccount',leaf(),draft.creditAccount,'حساب الطرف الدائن'))+'</div>'+
 '<div class="rc-wide-account">'+commerceInlineField('المخزن',sel('warehouse',db.warehouses,draft.warehouse).replace('<option value="">اختر</option>','<option value="">المخزن</option>'))+'</div>'+
 '</div>'):(
 '<div class="rc-full rc-optional-supplier">'+commerceInlineField('اسم '+(mode==='in'?'المورد':'العميل')+' على الفاتورة (اختياري)',inp('displayPartyName','text',draft.displayPartyName||'','maxlength="140" autocomplete="off" placeholder="اكتب اسمًا أو اترك الحقل فارغًا" list="rc-parties"'))+'</div>'+
 '<div class="rc-full rc-account-fields">'+
 '<div class="rc-wide-account">'+commerceInlineField('المخزن',sel('warehouse',db.warehouses,draft.warehouse).replace('<option value="">اختر</option>','<option value="">المخزن</option>'))+'</div>'+
 '<div class="rc-wide-account">'+commerceInlineField(mode==='in'?'المورد أو صاحب الحساب':'العميل أو صاحب الحساب',inp('partyName','text',draft.partyName,'required maxlength="140" autocomplete="off" placeholder="'+(mode==='in'?'المورد أو صاحب الحساب':'العميل أو صاحب الحساب')+'" list="rc-parties"')+'<datalist id="rc-parties">'+[...new Set(partySuggestions)].map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist>')+'</div>'+
 '<div class="rc-wide-account">'+commerceInlineField('حساب الطرف الآخر',commerceSmartAccount('partyAccount',leaf(),draft.partyAccount||db.accounts[mode==='in'?'payable':'receivable'],'حساب الطرف الآخر'))+'</div>'+
 '</div>'))+
 (ret?'<div class="rc-full">'+fld('المستند الأصلي',sel('origin',originals.map(x=>({id:x.id,name:x.number+' — '+docName(x)})),draft.origin))+'</div>':'')+
'<div class="rc-full rc-section-title">العملة والتسوية</div>'+
 fld('طريقة التسوية','<select id="rc-payment"><option value="credit" '+(draft.payment==='credit'?'selected':'')+'>آجل / على الحساب</option><option value="cash" '+(draft.payment==='cash'?'selected':'')+'>نقدي</option></select>')+
 fld('عملة المستند',ret?'<strong>'+esc(commerceCurrencyName(draft.currency||'YER'))+' (عملة المستند الأصلي)</strong>':sel('currency',COMMERCE_CURRENCIES,draft.currency||'YER'))+
 (draft.currency!=='YER'?fld('سعر الصرف (ريال يمني لكل 1 '+esc(draft.currency)+')',ret?'<strong>'+esc(draft.exchangeRate)+'</strong>':inp('exchangeRate','number',draft.exchangeRate||'','required min="0.000001" step="any" inputmode="decimal"')):'')+
 (draft.currency!=='YER'?'<div class="rc-full rc-note">أدخل أسعار الأصناف بعملة المستند المحددة، وأدخل سعر صرف موثقًا بالريال اليمني؛ لا تُحوّل أسعار بطاقة الصنف تلقائيًا.</div><div class="rc-full rc-fx-preview" id="rc-fx-preview">الإجمالي بالعملة الأصلية: <b>'+f(draft.lines.reduce((v,l)=>v+n(l.qty)*n(l.price),0))+' '+esc(draft.currency)+'</b> · المعادل اليمني: <b>'+((Number.isFinite(n(draft.exchangeRate))&&n(draft.exchangeRate)>0)?f(rnd(draft.lines.reduce((v,l)=>v+n(l.qty)*n(l.price),0)*n(draft.exchangeRate))):'حدّد سعر الصرف')+' YER</b></div>':'')+
 '<details class="rc-full rc-notes-fold"><summary>الملاحظات (اختياري)</summary>'+fld('البيان / الملاحظات','<textarea id="rc-note" rows="2" placeholder="ملاحظة المستند">'+esc(draft.note)+'</textarea>')+'</details></div>'+
 '<div class="rc-section-title rc-items-title">الأصناف</div><div class="rc-scroll rc-items-scroll"><table class="rc-lines"><thead><tr><th>الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th><th></th></tr></thead><tbody>'+
 draft.lines.map((l,i)=>{
  const available=ret?(orig?.lines||[]).filter(x=>
    leftToReturn(db,orig.id,x.product,lineUnit(db,x))>0||
    !!(editingDocId&&draft.lines.some(entry=>entry.product===x.product&&entry.unit===lineUnit(db,x)))
   ).map(x=>({id:x.product,name:db.products.find(p=>p.id===x.product)?.name||''})):db.products;
  const p=db.products.find(p=>p.id===l.product);
  const units=p?unitList(p).map(x=>({id:x,name:x})):[];
  return '<tr><td>'+commerceProductInput(i,available,l.product)+'</td><td>'+sel('unit-'+i,units,l.unit)+'</td><td>'+inp('qty-'+i,'number',l.qty,'min="0" step="0.01" inputmode="decimal"')+'</td><td>'+inp('price-'+i,'number',l.price,'min="0" step="0.01" inputmode="decimal" '+(ret?'readonly':''))+'</td><td class="rc-line-total" data-total="'+i+'">'+f(n(l.qty)*n(l.price))+'</td><td><button type="button" class="btn btn-ghost rc-clear-line" data-rc-remove="'+i+'" aria-label="تفريغ سطر الصنف" title="تفريغ بيانات هذا السطر">⌫</button></td></tr>';
 }).join('')+'</tbody></table></div>'+
 '<div class="rc-actions no-print"><button type="button" class="btn btn-ghost" data-rc-add="1">＋ إضافة صنف</button>'+
 '<strong class="rc-grand">الإجمالي: <span id="rc-grand">'+f(draft.lines.reduce((a,l)=>a+n(l.qty)*n(l.price),0))+'</span> '+esc(draft.currency||'YER')+'</strong></div>'+
 '<div class="rc-actions rc-invoice-save rc-final-actions no-print">'+
  '<button type="submit" class="btn btn-primary">'+(editingDocId?'💾 حفظ تعديل المستند':'💾 حفظ واعتماد المستند')+'</button>'+
  '<details class="rc-action-more rc-final-more"><summary>⋮ الإجراءات</summary><div class="rc-action-more-menu">'+
  [['preview','◉','المعاينة'],['view','◉','المشاهدة'],['print','▤','الطباعة'],['pdf','▣','PDF'],['share','⇧','المشاركة'],['search','⌕','البحث'],['back','↪','الرجوع']].map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-draft-action="'+action+'"><span class="rc-tool-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('')+
  (editingDocId?'<button type="button" class="rc-doc-action" data-rc-cancel-edit="1">إلغاء التعديل</button>':'<button type="submit" class="rc-doc-action rc-save-next" data-rc-save-next="1">حفظ واعتماد وفتح مستند جديد</button>')+
  '</div></details></div></form><div id="rc-draft-view"></div>'+
'<details class="rc-invoice-help no-print"><summary>تعليمات المستند</summary><p class="rc-note">جميع البنود بسعرها وإجماليها؛ لا يوجد تحويل تلقائي بين الوحدة الرئيسية والفرعية قبل اعتماده. يمنع الحفظ غير المتوازن أو صرف كمية غير متاحة.</p></details>';
 const headings='<h3 class="rc-document-selected-name">'+esc(ret?'مرتجع مخزني — '+(mode==='in'?'الوارد':'الصادر'):draft.title)+'</h3>';
 return '<section class="rc-card rc-invoice-card">'+headings+form+'</section>';
}
function currentDraftDocument(){
 syncInvoice();if(!draft)throw Error('لا يوجد مستند قيد الإدخال.');
 const db=data(),lines=draft.lines.filter(l=>l.product&&n(l.qty)>0).map(l=>{
  const p=db.products.find(x=>x.id===l.product);if(!p)throw Error('اختر صنفًا معتمدًا.');
  const unit=pUnit(p,l.unit);if(!unitList(p).includes(unit))throw Error('اختر وحدة معتمدة للصنف '+p.name);
  const amount=rnd(n(l.qty)*n(l.price),moneyDecimals(draft.currency));return {product:l.product,unit,qty:n(l.qty),price:n(l.price),subtotal:amount};
 });
 if(!lines.length)throw Error('أدخل صنفًا واحدًا بكمية موجبة للعرض أو المعاينة.');
 const currency=draft.currency||'YER',exchangeRate=commerceValidFx(currency,draft.exchangeRate);const total=rnd(lines.reduce((sum,l)=>sum+l.subtotal,0),moneyDecimals(currency));
 return {...draft,isDraft:true,currency,exchangeRate,lines,total,baseTotal:commerceBaseTotal(total,currency,exchangeRate)};
}
async function draftOutput(action){
 if(['search','back'].includes(action)){
  if(typeof window.confirm==='function'&&!window.confirm('البيانات غير المحفوظة في المستند ستُفقد. هل تريد المتابعة؟'))return;
  draft=null;view='records';
  if(action==='back'&&typeof goBackInApp==='function'){goBackInApp();return;}
  paint();if(action==='search')$('rc-query')?.focus();return;
 }
 const doc=currentDraftDocument();
 if(action==='view'){const host=$('rc-draft-view');if(host)host.innerHTML='<div class="rc-draft-view-head"><b>مشاهدة المستند قبل اعتماده</b><button type="button" class="btn btn-ghost" data-rc-close-draft-view="1">إغلاق</button></div>'+documentHtml(data(),doc);return;}
 if(action==='preview'){previewDocument('',doc);return;}
 if(action==='print'){printDocument('',doc);return;}
 if(action==='pdf'||action==='share'){
  const blob=await pdfFor(doc),filename=docName(doc)+'-'+doc.number+'-معاينة.pdf';
  if(action==='pdf')downloadFinancialFile(blob,filename);
  else await shareRatibDocumentFile(new File([blob],filename,{type:'application/pdf'}),'معاينة '+docName(doc)+' '+doc.number);
 }
}
function syncInvoice(){
 if(!draft)return;
 for(const key of ['doctype','number','date','warehouse','origin','partyName','displayPartyName','partyAccount','payment','currency','exchangeRate','note']){
  const element=$('rc-'+key);if(element)draft[key==='doctype'?'title':key]=element.value;
 }
 draft.lines.forEach((l,i)=>{
  for(const k of ['product','unit','qty','price']){const e=$('rc-'+k+'-'+i);if(e)l[k]=e.value;}
 });
}
function refreshTotals(){
 if(!draft)return;
 let total=0;draft.lines.forEach((l,i)=>{const amount=rnd(n(l.qty)*n(l.price),moneyDecimals(draft.currency));total+=amount;const cell=document.querySelector('[data-total="'+i+'"]');if(cell)cell.textContent=f(amount);});
 if($('rc-grand'))$('rc-grand').textContent=Number(total).toLocaleString('en-US',{maximumFractionDigits:moneyDecimals(draft.currency)});
 const box=$('rc-fx-preview');if(box){const rate=n($('rc-exchangeRate')?.value||draft.exchangeRate);box.innerHTML='الإجمالي بالعملة الأصلية: <b>'+f(total)+' '+esc(draft.currency)+'</b> · المعادل اليمني: <b>'+(Number.isFinite(rate)&&rate>0?f(rnd(total*rate)):'حدّد سعر الصرف')+' YER</b>';}
}
function changeOrigin(){
 const db=data(),origin=db.invoices.find(x=>x.id===draft.origin);
 draft.lines=origin?(origin.lines||[]).filter(l=>leftToReturn(db,origin.id,l.product,lineUnit(db,l))>0).map(l=>({id:id(),product:l.product,unit:lineUnit(db,l),qty:0,price:l.price})):[{id:id(),product:'',unit:'',qty:0,price:0}];
 if(origin){draft.warehouse=origin.warehouse;draft.partyName=origin.partyName;draft.displayPartyName=origin.displayPartyName||'';draft.partyAccount=origin.partyAccount||'';draft.payment=origin.payment;draft.currency=origin.currency||'YER';draft.exchangeRate=origin.exchangeRate||1;}
 paint();
}
function commerceInvoiceKind(kind){
 return ['purchase','sale','purchase_return','sale_return'].includes(kind);
}
function commerceOpenInvoice(docId,clone=false){
 const source=data().invoices.find(x=>x.id===docId);
 if(!source||!commerceInvoiceKind(source.kind))throw Error('مستند الوارد أو الصادر غير موجود.');
 if(open(['purchase','purchase_return'].includes(source.kind)?'purchase':'sale')===false)return false;
 view=source.kind.endsWith('_return')?'return':'new';
 editingDocId=clone?'':source.id;
 draft={
  ...JSON.parse(JSON.stringify(source)),
  lines:(source.lines||[]).map(l=>({...l,id:id(),product:l.product,unit:l.unit,qty:l.qty,price:l.price})),
  currency:source.currency||'YER',exchangeRate:source.exchangeRate??1,
  displayPartyName:source.displayPartyName||'',
  date:clone?today():source.date,
  number:clone?nextNumber(data(),source.kind,source.title):source.number
 };
 if(clone){delete draft.id;delete draft.createdAt;delete draft.updatedAt;delete draft.baseTotal;delete draft.total;delete draft.cost;draft.status='draft';}
 paint();
}
function commerceSameStock(first,second){
 if(!first||!second)return false;
 const keys=d=>(d.lines||[]).map(l=>[
  d.warehouse||'',l.product||'',l.unit||'',Number(l.qty||0),Number(l.cost||0)
 ]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return first.kind===second.kind&&first.warehouse===second.warehouse&&
  JSON.stringify(keys(first))===JSON.stringify(keys(second));
}
function commerceTouches(first,second,db){
 const attrs=d=>(d.lines||[]).flatMap(l=>{
  const wh=d.kind==='transfer'?[d.from,d.to]:[d.warehouse];
  return wh.map(w=>w+'|'+l.product+'|'+lineUnit(db,l));
 });
 const set=new Set(attrs(first));
 return attrs(second).some(x=>set.has(x));
}
function commerceValidateRevision(db,before,after){
 if(!before)return;
 const originalIndex=db.invoices.findIndex(d=>d.id===before.id);
 if(originalIndex<0)throw Error('المستند الأصلي غير موجود.');
 const altersStock=!commerceSameStock(before,after);
 const returns=db.invoices.filter(d=>d.origin===before.id&&d.id!==before.id);
 if(returns.length&&after&&(Number(before.total)!==Number(after.total)||(before.currency||'YER')!==(after.currency||'YER')||
  Number(before.exchangeRate||1)!==Number(after.exchangeRate||1)||before.number!==after.number||
  before.partyName!==after.partyName||before.date!==after.date))
  throw Error('للمستند مرتجعات مرتبطة؛ لا يمكن تغيير القيمة أو العملة أو الطرف أو التاريخ أو الرقم قبل معالجة المرتجعات.');
 if(!altersStock)return;
 if(returns.length)
  throw Error('لا يمكن تغيير الأصناف أو الكميات أو التكلفة لهذا المستند لوجود مرتجعات مرتبطة؛ يمكن تعديل البيانات الوصفية.');
 const later=db.invoices.slice(originalIndex+1).find(d=>commerceTouches(before,d,db)||after&&commerceTouches(after,d,db));
 if(later)throw Error('توجد حركة لاحقة لنفس الصنف والمخزن ('+later.number+'). لحماية تقييم المخزون والقيود، لا يمكن تغيير الأصناف أو الكميات أو التكلفة حتى معالجة الحركة اللاحقة. يمكن تعديل البيانات الوصفية.');
}
function commercePostedPlan(doc){
 if(!doc||!commerceInvoiceKind(doc.kind))throw Error('نوع المستند غير قابل لهذا الإجراء.');
 const plan=getMasterPlan();
 const current=(plan.transactions||[]).filter(t=>t.commerceId===doc.id);
 const all=getAllTransactions().filter(t=>t.commerceId===doc.id);
 if(!current.length||current.length!==all.length||all.some(t=>t.status!=='posted'))
  throw Error('هذا المستند لا يملك جميع قيوده في السنة المحاسبية الحالية، أو سبق إلغاء أحدها. لا يمكن تعديل أو حذف المستند دون تسوية وضعه أولًا.');
 if(!current.every(t=>t.multiVoucherId==='com_'+doc.id||t.multiVoucher?.id==='com_'+doc.id))
  throw Error('تعذر مطابقة القيود الأصلية للمستند. لا يمكن تغييره حفاظًا على سلامة الحسابات.');
 return {plan,current};
}
async function commerceReplaceOrDelete(before,after){
 if(loading)throw Error('هناك حفظ سابق قيد التنفيذ.');
 if(typeof _pendingFinancialCompletion!=='undefined'&&_pendingFinancialCompletion)throw Error('أكمل حفظ راتب السابق.');
 const db=data(),existing=db.invoices.find(d=>d.id===before.id);
 if(!existing)throw Error('المستند الأصلي غير موجود.');
 if(!after&&db.invoices.some(d=>d.origin===existing.id))
  throw Error('لا يمكن حذف المستند لوجود مرتجعات مرتبطة به؛ عالج المرتجعات أولًا.');
 commerceValidateRevision(db,existing,after);
 const {plan,current}=commercePostedPlan(existing),work=JSON.parse(JSON.stringify(plan));
 const prevPlan=JSON.parse(JSON.stringify(plan)),prevDb=JSON.parse(JSON.stringify(db));
 const beforeArchive=store.get('commerce_archive_v1',[]);
 const archive=Array.isArray(beforeArchive)?beforeArchive.slice():[];
 const beforeTx=current.map(x=>JSON.parse(JSON.stringify(x)));
 const existingIndex=db.invoices.findIndex(d=>d.id===existing.id);
 const seq=current[0].seqNum;
 const nextDb=JSON.parse(JSON.stringify(db));
 if(after)nextDb.invoices[existingIndex]=JSON.parse(JSON.stringify(after));
 else nextDb.invoices.splice(existingIndex,1);
 let replacement=[];
 if(after){
  replacement=makeJournal(after,nextDb).map(t=>{
   t.seqNum=seq;
   t.multiVoucher.seq=seq;
   return t;
  });
 }
 const txIndices=work.transactions.map((t,i)=>t.commerceId===existing.id?i:-1).filter(i=>i>=0),insertAt=txIndices[0];
 work.transactions=work.transactions.filter(t=>t.commerceId!==existing.id);
 work.transactions.splice(insertAt,0,...replacement);
 archive.push({action:after?'edit':'delete',date:new Date().toISOString(),before:JSON.parse(JSON.stringify(existing)),after:after?JSON.parse(JSON.stringify(after)):null,transactions:beforeTx});
 loading=true;
 try{
  store.set('commerce_archive_v1',archive.slice(-100));
  store.set('commerce_v1',nextDb);
  store.set('plan',work);
  await flushStorage();
 }catch(error){
  store.set('commerce_v1',prevDb);store.set('plan',prevPlan);store.set('commerce_archive_v1',beforeArchive);
  try{await flushStorage();}catch(_){}
  throw Error('تعذر حفظ التعديل؛ أُعيدت البيانات السابقة. '+(error.message||''));
 }finally{loading=false;}
 try{if(typeof audit==='function')audit(after?'COMMERCE_EDIT':'COMMERCE_DELETE',existing.id,existing,after||null);}catch(error){console.warn('Commerce audit',error);}
 if(typeof renderAllData==='function')renderAllData();
 if(typeof updateProDashboard==='function')updateProDashboard();
 editingDocId='';draft=null;detailId='';view='records';paint();
 notify(after?'تم تحديث الفاتورة والقيد المرتبط بها':'تم حذف الفاتورة وقيدها المحاسبي مع حفظ نسخة في سجل الاسترجاع','success');
 return true;
}
async function commerceDocumentOperation(action,docId){
 const doc=data().invoices.find(x=>x.id===docId);
 if(!doc||!commerceInvoiceKind(doc.kind))throw Error('المستند غير موجود أو نوعه غير معتمد.');
 if(action==='clone'){commerceOpenInvoice(docId,true);return;}
 if(action==='edit'){commercePostedPlan(doc);commerceOpenInvoice(docId);return;}
 if(action==='delete'){
  commercePostedPlan(doc);
  if(!window.confirm||!window.confirm('حذف '+docName(doc)+' رقم '+doc.number+' سيحذف القيد المحاسبي المرتبط به وحركة المخزون. هل تعتمد الحذف؟'))return;
  await commerceReplaceOrDelete(doc,null);return;
 }
 throw Error('إجراء غير معروف.');
}
function makeJournal(doc,db){
 if(doc.kind==='transfer')return [];
 const a=db.accounts,accounts=leaf(),valid=new Set(accounts.map(x=>x.id)),lines=[];
 const currency=doc.currency||'YER',exchangeRate=commerceValidFx(currency,doc.exchangeRate??(currency==='YER'?1:0));
 const baseTotal=doc.baseTotal==null?commerceBaseTotal(doc.total,currency,exchangeRate):rnd(doc.baseTotal);
 if(Math.abs(baseTotal-commerceBaseTotal(doc.total,currency,exchangeRate))>0.011)throw Error('المعادل اليمني لا يطابق سعر الصرف المعتمد؛ لن يتم الترحيل.');
 const post=(side,key,sum,foreign=false)=>{
  sum=rnd(sum);if(sum<=0)return;
  const selected=key==='inventory'?warehouseAccount(db,doc.warehouse):
   (key==='payable'||key==='receivable')?partyAccount(db,doc):a[key];
  if(!selected||!valid.has(selected))throw Error('ربط الحساب التفصيلي غير مكتمل: '+key);
  lines.push({side,account:selected,amount:sum,foreign:!!foreign&&currency!=='YER'});
 };
 if(doc.kind==='sale'||doc.kind==='sale_return'){
  const sign=doc.kind==='sale';
  post(sign?'debit':'credit',doc.payment==='cash'?'cash':'receivable',baseTotal,true);
  post(sign?'credit':'debit','sales',baseTotal,true);
  post(sign?'debit':'credit','cogs',doc.cost);
  post(sign?'credit':'debit','inventory',doc.cost);
 }else if(doc.kind==='purchase'||doc.kind==='purchase_return'){
  const sign=doc.kind==='purchase';
  post(sign?'debit':'credit','inventory',baseTotal);
  post(sign?'credit':'debit',doc.payment==='cash'?'cash':'payable',baseTotal,true);
 }else if(doc.kind==='adjust'){
  const sign=doc.direction==='in';
  post(sign?'debit':'credit','inventory',baseTotal);
  post(sign?'credit':'debit','adjust',baseTotal);
 }
 const debit=rnd(lines.filter(x=>x.side==='debit').reduce((sum,x)=>sum+x.amount,0)),
       credit=rnd(lines.filter(x=>x.side==='credit').reduce((sum,x)=>sum+x.amount,0));
 if(!lines.length||debit!==credit)throw Error('القيد غير متوازن؛ لن يتم الحفظ.');
 const codes=new Map(accounts.map(x=>[x.id,x.name.split(' — ')[0]])),vid='com_'+doc.id,seq=getNextMultiVoucherNumber();
 const multi={id:vid,seq,date:doc.date,mode:'multi-entry',baseCurrency:'YER',baseTotal:debit,
  note:docName(doc)+' رقم '+doc.number,beneficiary:doc.partyName,
  lines:lines.map(l=>({side:l.side,account:l.account,accountId:codes.get(l.account)||'',
   currency:l.foreign?currency:'YER',amount:l.foreign?rnd(doc.total,moneyDecimals(currency)):l.amount,base:l.amount,
   rate:l.foreign?exchangeRate:1,exchangeRate:l.foreign?exchangeRate:1,
   equivalentCurrency:'YER',budgetId:'general',note:doc.note||doc.number}))};
 return lines.map((l,i)=>({id:vid+'_'+i,multiVoucherId:vid,commerceId:doc.id,
  isMultiVoucher:true,voucherMode:'multi-entry',seqNum:seq,date:doc.date,isoDate:doc.date,
  timestamp:new Date(doc.date+'T12:00:00').getTime(),amount:l.amount,currency:'YER',
  debitAccount:l.side==='debit'?l.account:'',creditAccount:l.side==='credit'?l.account:'',
  debitAccountId:l.side==='debit'?codes.get(l.account)||'':'',
  creditAccountId:l.side==='credit'?codes.get(l.account)||'':'',
  multiVoucher:multi,type:docName(doc)+' '+doc.number,recipient:doc.partyName,
  distribution:{},execution:{},status:'posted',schemaVersion:APP_SCHEMA_VERSION,updatedAt:Date.now()}));
}
async function persistDoc(doc,db){
 if(loading)throw Error('هناك حفظ سابق قيد التنفيذ.');
 if(typeof _pendingFinancialCompletion!=='undefined'&&_pendingFinancialCompletion)throw Error('أكمل حفظ راتب السابق.');
 if(db.invoices.some(x=>x.id===doc.id)||getAllTransactions().some(x=>x.commerceId===doc.id))throw Error('المستند مكرر.');
 const lines=makeJournal(doc,db);
 if(window.RatibLicense?.beforeCreate&&!(await window.RatibLicense.beforeCreate(getAllTransactions())))return false;
 loading=true;
 try{
  const plan=lines.length?getMasterPlan():null;
  if(plan)plan.transactions.push(...lines);
  db.invoices.push(doc);save(db);if(plan)store.set('plan',plan);
  if(typeof audit==='function')audit('COMMERCE_POST',doc.id,null,doc);
  await flushStorage();
  window.RatibLicense?.recordCreated?.();
  if(typeof renderAllData==='function')renderAllData();
  if(typeof updateProDashboard==='function')updateProDashboard();
  draft=null;view=mode==='stock'?'movements':'records';paint();notify('تم اعتماد المستند وحفظه','success');
  return true;
 }finally{loading=false;}
}
async function saveInvoice(openNext=false){
 if($('rc-search-partyAccount'))commerceChosenAccount('partyAccount','حساب الطرف');
 syncInvoice();const db=data(),d=draft;if(!d)throw Error('لا يوجد مستند قيد التحرير.');
 const kind=d.kind,ret=kind.endsWith('_return'),originalDoc=editingDocId?db.invoices.find(x=>x.id===editingDocId):null;
 if(editingDocId&&(!originalDoc||originalDoc.kind!==kind))throw Error('المستند الأصلي غير موجود أو تغير نوعه.');
 if(originalDoc&&ret&&originalDoc.origin!==d.origin)throw Error('لا يمكن تغيير المستند الأصلي لمرتجع محفوظ؛ استنسخ المرتجع لإنشاء مستند مرتبط بمصدر آخر.');
 const validationDb=originalDoc?{...db,invoices:db.invoices.filter(x=>x.id!==editingDocId)}:db;
 const origin=db.invoices.find(x=>x.id===d.origin);
 if(!d||!db.warehouses.some(w=>w.id===d.warehouse))throw Error('اختر مخزنًا صحيحًا.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date)))throw Error('تاريخ المستند غير صحيح.');
 if(!String(d.number||'').trim())throw Error('أدخل رقم المستند.');
 if(db.invoices.some(x=>x.number===d.number&&x.kind===kind&&x.id!==editingDocId))throw Error('رقم المستند مستخدم مسبقًا ضمن نفس النوع.');
 if(!String(d.partyName||'').trim())throw Error('حدد المورد أو العميل أو صاحب الحساب المحاسبي.');
 if(d.partyAccount)validatedAccount(d.partyAccount,'الحساب المقابل');
 if(!['cash','credit'].includes(d.payment))throw Error('طريقة التسوية غير صالحة.');
 const currency=ret?(origin?.currency||'YER'):(d.currency||'YER');
 const exchangeRate=commerceValidFx(currency,ret?(origin?.exchangeRate||1):d.exchangeRate);
 if(ret&&origin&&(currency!==(origin.currency||'YER')||exchangeRate!==(origin.exchangeRate||1)))throw Error('عملة المرتجع وسعر الصرف يجب أن يطابقا المستند الأصلي.');
 if(!ret&&!types[mode].includes(d.title))throw Error('اختر نوع مستند معتمد.');
 if(ret&&(!origin||origin.kind!==dir()||origin.warehouse!==d.warehouse))throw Error('اختر مستندًا أصليًا من نفس اتجاه الحركة والمخزن.');
 const selected=d.lines.filter(l=>l.product&&n(l.qty)>0),pending=new Map();
 if(d.lines.some(l=>l.product&&(!Number.isFinite(n(l.qty))||n(l.qty)<=0)))throw Error('تأكد من كمية جميع الأصناف.');
 if(!selected.length)throw Error('أدخل صنفًا واحدًا بكمية موجبة على الأقل.');
 let total=0,totalCost=0;
 const items=selected.map(l=>{
  const p=db.products.find(x=>x.id===l.product);if(!p)throw Error('اختر صنفًا معتمدًا.');
  const unit=pUnit(p,l.unit);
  if(!unitList(p).includes(unit))throw Error('الوحدة غير معرفة في بطاقة الصنف: '+p.name);
  const quantity=n(l.qty);positive(quantity,'الكمية');
  if(!Number.isFinite(quantity)||quantity>1e9)throw Error('الكمية غير صالحة.');
  const key=p.id+'|'+unit;pending.set(key,rnd((pending.get(key)||0)+quantity));
  if(ret&&pending.get(key)>leftToReturn(validationDb,origin.id,p.id,unit))throw Error('المرتجع يتجاوز كمية المستند الأصلي.');
  if(['sale','purchase_return'].includes(kind)&&pending.get(key)>qty(validationDb,p.id,d.warehouse,unit))throw Error('الرصيد غير كاف للصنف '+p.name+' بوحدة '+unit);
  let price=n(l.price),cost;
  if(ret){
   const originals=origin.lines.filter(x=>x.product===p.id&&lineUnit(db,x)===unit);
   if(!originals.length)throw Error('الصنف والوحدة لا يتبعان المستند الأصلي.');
   const base=originals.reduce((a,x)=>a+Number(x.qty||0),0);
   price=rnd(originals.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||0),0)/base,moneyDecimals(currency));
   cost=rnd(quantity*originals.reduce((a,x)=>a+Number(x.cost||0),0)/base);
  }else{
   positive(price,'سعر الوحدة',true);
   const previousLine=originalDoc?.lines.find(x=>x.product===p.id&&lineUnit(db,x)===unit&&Number(x.qty)===quantity);
    cost=rnd(quantity*(kind==='purchase'?price*exchangeRate:previousLine&&['sale','sale_return'].includes(kind)?Number(previousLine.cost||0)/quantity:average(validationDb,p.id,d.warehouse,unit)));
  }
  const lineSum=rnd(price*quantity,moneyDecimals(currency));positive(lineSum,'الإجمالي');
  total=rnd(total+lineSum,moneyDecimals(currency));totalCost=rnd(totalCost+cost);
  return {product:p.id,unit,qty:quantity,price,subtotal:lineSum,cost};
 });
 positive(total,'الإجمالي');
 const baseTotal=commerceBaseTotal(total,currency,exchangeRate);
 if(kind==='purchase'||kind==='purchase_return'){
  // Reconcile line-level YER rounding with document-level exchange rate, without altering foreign totals.
  const diff=rnd(baseTotal-totalCost);
  const last=items[items.length-1];
  if(last&&rnd(last.cost+diff)>=0){last.cost=rnd(last.cost+diff);totalCost=rnd(totalCost+diff);}
  else throw Error('فرق التقريب في تكلفة الوارد غير صالح.');
 }
 const prefix={purchase:'IN',sale:'OUT',purchase_return:'IR',sale_return:'OR'}[kind];
 const doc={id:originalDoc?.id||id(),kind,title:ret?'مرتجع '+(mode==='in'?'الوارد':'الصادر'):d.title,number:String(d.number).trim(),date:d.date,warehouse:d.warehouse,partyName:String(d.partyName).trim(),partyAccount:d.payment==='credit'?validatedAccount(d.partyAccount,'الحساب المقابل'):'',payment:d.payment,note:String(d.note||''),origin:ret?origin.id:'',currency,exchangeRate,baseTotal,displayPartyName:String(d.displayPartyName||'').trim(),total:rnd(total,moneyDecimals(currency)),cost:rnd(totalCost),lines:items,status:'posted',createdAt:originalDoc?.createdAt||new Date().toISOString(),...(originalDoc?{updatedAt:new Date().toISOString()}: {})};
 if(originalDoc)await commerceReplaceOrDelete(originalDoc,doc);
 else {
  const saved=await persistDoc(doc,db);
  if(saved&&openNext){
   view=ret?'return':'new';editingDocId='';draft=newDraft();
   if(!ret){draft.title=doc.title;draft.number=nextNumber(data(),doc.kind,doc.title);}
   paint();
  }
 }
}
async function saveMovement(){
 const db=data(),transfer=view==='transfer',product=$('rc-product')?.value,warehouse=$('rc-warehouse')?.value,to=$('rc-target')?.value,direction=$('rc-direction')?.value,units=n($('rc-qty')?.value),dateValue=$('rc-date')?.value;
 if(!db.products.some(p=>p.id===product)||!db.warehouses.some(w=>w.id===warehouse))throw Error('اختر صنفًا ومخزنًا.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)||!Number.isFinite(Date.parse(dateValue)))throw Error('التاريخ غير صحيح.');
 positive(units,'الكمية');
 if(transfer&&(!to||to===warehouse||!db.warehouses.some(w=>w.id===to)))throw Error('المخزن الهدف غير صالح.');
 if((transfer||direction==='out')&&qty(db,product,warehouse)<units)throw Error('كمية المخزون غير كافية.');
 if(!transfer&&!['in','out'].includes(direction))throw Error('نوع الحركة غير معروف.');
 const unitCost=transfer||direction==='out'?average(db,product,warehouse):n($('rc-cost')?.value);
 positive(rnd(unitCost),'تكلفة الوحدة');
 const total=rnd(units*unitCost),kind=transfer?'transfer':'adjust';
 const doc={id:id(),kind,number:(transfer?'TR':'AD')+'-'+String(db.invoices.filter(x=>x.kind===kind).length+1).padStart(5,'0'),date:dateValue,warehouse,from:warehouse,to:to||'',direction:direction||'',payment:'cash',party:'',partyName:'',total,cost:total,lines:[{product,qty:units,price:unitCost,cost:total}],status:'posted'};
 await persistDoc(doc,db);
}
function documentLines(db,d){
 return (d.lines||[]).map((l,i)=>{
  const p=db.products.find(p=>p.id===l.product);
  return [String(i+1),esc(p?.name||'—'),esc(lineUnit(db,l)),f(l.qty),f(l.price),f(Number(l.subtotal??l.qty*l.price))];
 });
}

function commerceInvoiceRecipientLabel(d){
 const title=docName(d);
 return title==='فاتورة مبيعات'?'مباع على / صادر إلى':title==='فاتورة مشتريات'?'مُشترى من / وارد من':'';
}
function commerceInvoiceRecipientRow(d){
 const label=commerceInvoiceRecipientLabel(d),name=String(d.displayPartyName||'').trim();
 if(!label||!name)return '';
 return '<div class="rc-invoice-party-row" dir="rtl"><div class="rc-invoice-recipient"><b>'+esc(label)+':</b> <span>'+esc(name)+'</span></div></div>';
}
function documentHtml(db,d){
 const rows=documentLines(db,d),invoiceLabel=commerceInvoiceRecipientLabel(d);
 const tableHtml='<table class="rc-document-table"><thead><tr><th>#</th><th>اسم الصنف</th><th>الوحدة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 return '<article class="rc-paper rc-document-paper" dir="rtl">'+printHeading((d.isDraft?'مسودة غير معتمدة — ':'')+docName(d))+
 (invoiceLabel?'<div class="rc-document-meta rc-invoice-meta"><span><b>التاريخ:</b> '+esc(d.date||'—')+'</span><span>رقم الفاتورة: <b>'+esc(d.number)+'</b></span><span>المخزن: <b>'+esc(db.warehouses.find(w=>w.id===d.warehouse)?.name||'—')+'</b></span><span>عملة المستند: <b>'+esc(commerceCurrencyName(d.currency||'YER'))+'</b></span></div>':
 '<div class="rc-document-meta"><span>رقم المستند: <b>'+esc(d.number)+'</b></span><span>التاريخ: <b>'+esc(d.date)+'</b></span><span>المخزن: <b>'+esc(db.warehouses.find(w=>w.id===d.warehouse)?.name||'—')+'</b></span><span>الطرف: <b>'+esc(d.partyName||'—')+'</b></span></div>')+
 commerceInvoiceRecipientRow(d)+
 tableHtml+'<div class="rc-document-footer"><div class="rc-paper-total">الإجمالي: '+f(d.total)+' '+esc(commerceCurrencyName(d.currency||'YER'))+'</div>'+
 (d.currency&&d.currency!=='YER'?'<p class="rc-paper-equivalent"><b>المعادل اليمني:</b> '+f(d.baseTotal??commerceBaseTotal(d.total,d.currency,d.exchangeRate))+' YER <span>(1 '+esc(d.currency)+' = '+esc(d.exchangeRate)+' YER)</span></p>':'')+
 '<p class="rc-paper-tafqit"><b>التفقيط:</b> '+esc(commerceAmountWords(d.total,d.currency||'YER'))+'</p>'+
 (String(d.note||'').trim()?'<p class="rc-paper-note"><b>ملاحظات:</b> '+esc(d.note)+'</p>':'')+commerceSignatureHtml(d)+'</div></article>';
}
function documentToolbar(db,d){
 const actions=[['view','eye','المشاهدة'],['preview','scan-eye','المعاينة'],['print','printer','الطباعة'],['pdf','file-down','PDF'],['share','share-2','المشاركة'],['search','search','البحث'],['back','corner-up-left','الرجوع']];
 const pictures={eye:'◉','scan-eye':'▣',printer:'▤','file-down':'▣','share-2':'⇧',search:'⌕','corner-up-left':'↪'};
 return '<div class="rc-document-actions no-print">'+actions.map(([action,icon,label])=>'<button type="button" class="rc-doc-action" data-rc-action="'+action+'" data-doc="'+esc(d.id)+'"><span class="rc-tool-icon" aria-hidden="true">'+pictures[icon]+'</span><small>'+label+'</small></button>').join('')+'</div>';
}
function commerceOperationToolbar(doc){return '<div class="rc-record-tools no-print" aria-label="إجراءات المستند">'+[['edit','تعديل'],['clone','استنساخ'],['delete','حذف']].map(([action,label])=>'<button type="button" class="btn btn-ghost" data-rc-doc-op="'+action+'" data-doc="'+esc(doc.id)+'">'+label+'</button>').join('')+'</div>';}
function showDocument(db){
 const doc=db.invoices.find(d=>d.id===detailId);
 return doc?documentToolbar(db,doc)+commerceOperationToolbar(doc)+documentHtml(db,doc):wrap('المستند','المستند غير موجود في البيانات الحالية.');
}
function ensurePreview(){
 let modal=$('rc-preview-modal');
 if(modal)return modal;
 modal=document.createElement('div');modal.id='rc-preview-modal';modal.className='modal-overlay no-print';
 modal.innerHTML='<div class="modal-content rc-preview-modal-body" role="dialog" aria-modal="true" aria-label="معاينة المستند"><h3>معاينة المستند قبل الطباعة</h3><div id="rc-preview-content"></div><div class="rc-actions"><button type="button" class="btn btn-primary" id="rc-preview-print">🖨️ طباعة</button><button type="button" class="btn btn-ghost" id="rc-preview-close">إغلاق</button></div></div>';
 document.body.appendChild(modal);
 modal.querySelector('#rc-preview-close').addEventListener('click',()=>modal.classList.remove('show'));
 modal.querySelector('#rc-preview-print').addEventListener('click',()=>{const chosen=previewId;modal.classList.remove('show');if(chosen==='__products__')productOutput('print');else if(chosen?.startsWith('__product__:'))productOutput('print',chosen.slice(12));else if(chosen==='__draft__'&&previewDraft)Promise.resolve(printDocument('',previewDraft)).catch(e=>notify(e.message,'error'));else Promise.resolve(printDocument(chosen)).catch(e=>notify(e.message,'error'));});
 return modal;
}
function previewDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 previewId=docId||'__draft__';previewDraft=docId?null:JSON.parse(JSON.stringify(d));const modal=ensurePreview();modal.querySelector('#rc-preview-print').disabled=false;modal.querySelector('#rc-preview-content').innerHTML=documentHtml(db,d);window.RatibPrintLogo?.syncPrint();
 modal.classList.add('show');
}
async function printDocument(docId,derivedDoc){
 const db=data(),d=derivedDoc||db.invoices.find(x=>x.id===docId);if(!d)throw Error('تعذّر العثور على المستند.');
 let host=$('ratibCommercePrintHost');
 if(!host){host=document.createElement('div');host.id='ratibCommercePrintHost';document.body.appendChild(host);}
 host.innerHTML=documentHtml(db,d);
 await window.RatibPrintLogo?.whenReady?.();
 window.RatibPrintLogo?.syncPrint?.();
 await Promise.all(Array.from(host.querySelectorAll('img')).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));
 if(typeof printRatibDocument==='function')printRatibDocument('printing-commerce');
 else window.print();
}
function commerceCanvasPage(db,d,pageNumber){
 const title=(d.isDraft?'مسودة غير معتمدة — ':'')+docName(d);
 const warehouse=db.warehouses.find(w=>w.id===d.warehouse)?.name||'—';
 const label=commerceInvoiceRecipientLabel(d),recipient=String(d.displayPartyName||'').trim();
 const subtitle=label?'':'رقم: '+d.number+' — التاريخ: '+d.date+' — المخزن: '+warehouse+' — الطرف: '+(d.partyName||'—');
 // reportCanvasPage renders the single personal heading and a generic issuance date.
 const page=reportCanvasPage(title,subtitle,pageNumber);
 if(label){
  const ctx=page.ctx;
  ctx.save();
  // Erase only the generic "تاريخ الإصدار" row at y=181, then put document date at y=150.
  // For invoices, the base subtitle is empty; metadata is laid out as one compact RTL row.
  ctx.fillStyle='#ffffff';ctx.fillRect(755,156,389,37);
  ctx.direction='rtl';ctx.textAlign='right';ctx.fillStyle='#182231';
  ctx.font="bold 18px 'Tajawal',sans-serif";
  ctx.fillText('التاريخ: '+(d.date||'—'),1140,150,250);
  ctx.font="17px 'Tajawal',sans-serif";
  ctx.fillText('رقم الفاتورة: '+d.number+' — المخزن: '+warehouse+' — عملة المستند: '+(d.currency||'YER'),856,150,720);
  if(recipient){
   ctx.font="bold 19px 'Tajawal',sans-serif";
   ctx.fillText(label+': '+recipient,1140,197,1030);
  }
  ctx.restore();
  // Keep the recipient separated from the table without an outline or filler panel.
  page.y=recipient?242:222;
 }
 window.RatibPrintLogo?.drawCanvas?.(page.canvas);
 return page;
}
function commerceCanvasSignatures(page,d){
 const height=window.RatibSignatureSettings?.drawCanvas?.(page.ctx,docName(d),page.canvas.width,page.y+20)||0;
 page.y+=height?height+24:0;
}
function* documentCanvases(db,d){
 let pageNumber=1,page=commerceCanvasPage(db,d,pageNumber);
 const widths=[70,340,150,140,170,220],headers=['#','اسم الصنف','الوحدة','العدد','السعر','الإجمالي'],maxY=1480;
 const draw=(vals,color,layout)=>drawReportTableRow(page,layout||reportTableLayout(page.ctx,vals,widths,19),widths,color||'#fff');
 const heading=()=>draw(headers,'#e2e8f0');
 const nextPage=()=>{page=commerceCanvasPage(db,d,++pageNumber);heading();};
 heading();
 for(const row of documentLines(db,d)){
  const vals=row.map(r=>r.replace(/&amp;|&quot;|&#39;|&lt;|&gt;/g,m=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[m])));
  const layout=reportTableLayout(page.ctx,vals,widths,19);
  if(page.y+layout.height>maxY){yield page.canvas;nextPage();}
  draw(vals,'#fff',reportTableLayout(page.ctx,vals,widths,19));
 }
 const curr=d.currency||'YER',total=['','الإجمالي',curr,'','',f(d.total)],totalLayout=reportTableLayout(page.ctx,total,widths,19);
 const fxLine=curr==='YER'?'':'المعادل اليمني: '+f(d.baseTotal??commerceBaseTotal(d.total,curr,d.exchangeRate))+' YER — سعر الصرف: 1 '+curr+' = '+d.exchangeRate+' YER';
 const spelled=commerceAmountWords(d.total,curr),note=String(d.note||'').trim();
 // One unboxed notes section, including long paragraphs, not a new table row for each fragment.
 const measure=(value,width)=>typeof wrapCanvasText==='function'?wrapCanvasText(page.ctx,value,width):String(value).match(/.{1,55}/gu)||[''];
 const words=spelled?measure('التفقيط: '+spelled,970):[];
 const lines=note?note.split(/\r?\n/).flatMap(para=>measure(para||' ',970)):[];
 const preliminary=totalLayout.height+(words.length+(fxLine?2:0)+Math.min(lines.length,5))*31+166;
 if(page.y+preliminary>maxY&&preliminary<maxY-300){yield page.canvas;nextPage();}
 if(page.y+totalLayout.height>maxY){yield page.canvas;nextPage();}
 draw(total,'#ecfdf5',reportTableLayout(page.ctx,total,widths,19));
 const prose=[...(fxLine?measure(fxLine,970):[]),...words,...(lines.length?['ملاحظات:',...lines]:[])];
 for(let i=0;i<prose.length;i++){
  if(page.y+32+116>maxY){yield page.canvas;nextPage();}
  page.ctx.save();page.ctx.fillStyle='#182231';page.ctx.textAlign='right';page.ctx.direction='rtl';
  page.text(prose[i],1130,page.y+23,18,i===0||prose[i]==='ملاحظات:'?'700':'500');
  page.ctx.restore();page.y+=31;
 }
 if(prose.length)page.y+=12;
 const signatureHeight=window.RatibSignatureSettings?.height?.(docName(d))||0;
 if(signatureHeight&&page.y+signatureHeight+45>maxY){yield page.canvas;nextPage();}
 commerceCanvasSignatures(page,d);
 yield page.canvas;
}
async function pdfFor(d){
 await window.RatibPrintLogo?.whenReady?.();
 const db=data();return buildPdfFromCanvases(documentCanvases(db,d));
}
async function documentOutput(action,docId){
 const db=data(),d=db.invoices.find(x=>x.id===docId);if(!d)throw Error('المستند غير موجود.');
 if(action==='view'){detailId=d.id;view='detail';paint();return;}
 if(action==='preview'){previewDocument(d.id);return;}
 if(action==='print'){printDocument(d.id);return;}
 if(['pdf','share'].includes(action)){
  const blob=await pdfFor(d),name=docName(d)+'-'+d.number+'.pdf';
  if(action==='pdf')downloadFinancialFile(blob,name);
  else await shareRatibDocumentFile(new File([blob],name,{type:'application/pdf'}),docName(d)+' '+d.number);
  return;
 }
 if(action==='search'){view='records';paint();$('rc-query')?.focus();return;}
 if(action==='back'){view='records';paint();}
}

function open(target='stock'){
 if(!requestLeave())return false;
 mode=target==='purchase'?'in':target==='sale'?'out':['stock','in','out'].includes(target)?target:'stock';
 view=mode==='stock'?'products':'records';newMenuOpen=false;draft=null;editingDocId='';editingProduct=null;query='';detailId='';catalogSearch='';catalogGroup='';catalogSearchVisible=false;catalogGroupVisible=false;
 navigateToTab('pageCommerce',true);paint();
}
function openFavorite(target,screen='products'){
 const source=target==='purchase'?'in':target==='sale'?'out':target==='stock'?'stock':null;
 if(!source)throw Error('قسم غير معروف في مفضلتي.');
 const key=String(screen||'').trim();
 if(key==='accounts')return openAccountDefaults();
 const available=source==='stock'?['products','warehouses','movements','summary','accounts']:
  ['return','records','people','summary','accounts','new'];
 const [pageTitle,...rest]=key.split(':');
 const directTitle=rest.join(':');
 if(!available.includes(pageTitle))throw Error('وظيفة المفضلة غير متاحة.');
 if(directTitle&&(!['in','out'].includes(source)||pageTitle!=='new'||!types[source].includes(directTitle)))throw Error('نوع المستند غير صحيح.');
 if(open(target)===false)return false;
 view=pageTitle;
 if(pageTitle==='new'&&!directTitle){view='records';newMenuOpen=true;}
 if(directTitle){editingDocId='';draft=newDraft();draft.title=directTitle;draft.number=nextNumber(data(),draft.kind,directTitle);}
 paint();
}
function bind(root=$('pageCommerce')){
 if(!root||root.dataset?.ratibCommerceBound)return;
 if(root.dataset)root.dataset.ratibCommerceBound='1';
 document.querySelector('.ratib-commerce-shortcuts')?.setAttribute('data-rc-button-size',commerceButtonSize());
 root.addEventListener('click',event=>{
  const hit=selector=>event.target.closest(selector);
  try{
   const newAccount=hit('[data-rc-create-account]');
   if(newAccount){
    const key=newAccount.dataset.rcCreateAccount,input=$('rc-search-'+key);
    if(!input||!/[\p{L}]/u.test(input.value))return;
    const q=commerceNormalize(input.value);
    if(leaf().some(a=>[a.id,a.name].some(v=>commerceNormalize(v)===q))){
     commerceResolveAccount(input);notify('الحساب موجود بالفعل؛ اختره من نتائج البحث.','warn');return;
    }
    const opened=window.ratibQuickAccount?.openForExternalInput(input,item=>{
     const linked=$('rc-'+key),fresh=leaf().find(a=>a.id===item.id);
     if(!linked||!fresh)throw Error('تعذر ربط الحساب الجديد بالحقل.');
     input.value=fresh.name;
     linked.value=fresh.id;
     commerceResolveAccount(input);
     linked.dispatchEvent(new Event('change',{bubbles:true}));
    });
    if(!opened)notify('تعذر فتح إضافة الحساب؛ حاول مجددًا.','error');
    return;
   }
   const catalogToggle=hit('[data-rc-catalog-toggle]');if(catalogToggle){
     const kind=catalogToggle.dataset.rcCatalogToggle;
     if(kind==='search'){catalogSearchVisible=!catalogSearchVisible;if(!catalogSearchVisible)catalogSearch='';}
     if(kind==='group'){catalogGroupVisible=!catalogGroupVisible;if(!catalogGroupVisible)catalogGroup='';}
     const productForm=$('rc-product-form');const unsavedFields=productForm?Array.from(productForm.querySelectorAll('input,select,textarea')).filter(el=>el.id).map(el=>[el.id,el.value]):[];
     paint();for(const [fieldId,value] of unsavedFields){const field=$(fieldId);if(field)field.value=value;}
     $(kind==='search'?'rc-catalog-search':'rc-catalog-group')?.focus();return;
    }
   const draftAction=hit('[data-rc-draft-action]');if(draftAction){Promise.resolve(draftOutput(draftAction.dataset.rcDraftAction)).catch(e=>notify(e.message||'تعذر إعداد المستند','error'));return;}
   if(hit('[data-rc-close-draft-view]')){const host=$('rc-draft-view');if(host)host.innerHTML='';return;}
    const productAction=hit('[data-rc-products]');if(productAction){Promise.resolve(productOutput(productAction.dataset.rcProducts,productAction.dataset.rcItem||'')).catch(e=>notify(e.message||'تعذّر تجهيز دليل الأصناف','error'));return;}
   if(hit('[data-rc-confirm-import]')){confirmProductImport().catch(e=>notify(e.message,'error'));return;}
   if(hit('[data-rc-cancel-import]')){pendingImport=null;paint();return;}
   const warehouseEdit=hit('[data-rc-edit-warehouse]');if(warehouseEdit){editingWarehouse=warehouseEdit.dataset.rcEditWarehouse;paint();return;}
   if(hit('[data-rc-cancel-edit]')){if(!requestLeave())return;editingDocId='';draft=null;view='records';paint();return;}
    const docOperation=hit('[data-rc-doc-op]');if(docOperation){Promise.resolve(commerceDocumentOperation(docOperation.dataset.rcDocOp,docOperation.dataset.doc)).catch(e=>notify(e.message||'تعذر إجراء العملية','error'));return;}
    if(hit('[data-rc-back]')){if(view==='detail'){view='records';paint();}else if(typeof goBackInApp==='function')goBackInApp();return;}
   if(hit('[data-rc-toggle-new]')){
    if(view==='new'&&draft)syncInvoice();
    newMenuOpen=!newMenuOpen;paint();return;
   }
   const requested=hit('[data-rc-direct-type]');
   if(requested){
    const chosen=requested.dataset.rcDirectType;
    if(!types[mode]?.includes(chosen))throw Error('نوع المستند غير معتمد.');
    if(view==='new'&&draft)syncInvoice();
    if(editingDocId&&view==='new'&&draft?.title!==chosen){notify('لا يمكن تغيير نوع المستند أثناء التعديل؛ استنسخه في النوع المطلوب.','warn');return;}
    if(view==='new'&&draft?.title===chosen){newMenuOpen=false;paint();return;}
    if(!requestLeave())return;
    view='new';draft=newDraft();draft.title=chosen;draft.number=nextNumber(data(),draft.kind,chosen);
    editingDocId='';newMenuOpen=false;paint();return;
   }
   const v=hit('[data-rc-view]');if(v){if(v.dataset.rcView!==view&&!requestLeave())return;if(v.dataset.rcView===view)return;newMenuOpen=false;view=v.dataset.rcView;draft=null;editingDocId='';editingProduct=null;query='';paint();return;}
   const d=hit('[data-rc-detail]');if(d){detailId=d.dataset.rcDetail;view='detail';paint();return;}
   const edit=hit('[data-rc-edit-product]');if(edit){editingProduct=edit.dataset.rcEditProduct||null;paint();return;}
   const add=hit('[data-rc-add]');if(add){syncInvoice();draft.lines.push({id:id(),product:'',unit:'',qty:1,price:0});paint();return;}
   const del=hit('[data-rc-remove]');if(del){syncInvoice();const index=Number(del.dataset.rcRemove);if(!draft||!Number.isInteger(index)||index<0||index>=draft.lines.length)return;draft.lines[index]={id:draft.lines[index].id||id(),product:'',unit:'',qty:1,price:0};paint();return;}
   if(hit('[data-rc-search]')){query=$('rc-query')?.value.trim()||'';paint();$('rc-query')?.focus();return;}
   const action=hit('[data-rc-action]');if(action){Promise.resolve(documentOutput(action.dataset.rcAction,action.dataset.doc)).catch(e=>notify(e.message||'تعذر إخراج المستند','error'));return;}
   if(hit('[data-rc-draft-preview]')){syncInvoice();const db=data(),d=draft;const lines=d.lines.filter(l=>l.product&&n(l.qty)>0).map(l=>({product:l.product,unit:l.unit,qty:n(l.qty),price:n(l.price),subtotal:rnd(n(l.qty)*n(l.price))}));if(!lines.length)throw Error('أدخل صنفًا لمعاينته.');previewDocument('',{kind:d.kind,title:d.title,number:d.number,date:d.date,warehouse:d.warehouse,partyName:d.partyName,note:d.note,lines,total:rnd(lines.reduce((a,l)=>a+l.subtotal,0))});return;}
  }catch(e){notify(e.message||'تعذر فتح الأمر','error');}
 });
 root.addEventListener('change',e=>{
    if(e.target.id.startsWith('rc-acc-')||['rc-partyAccount','rc-payment','rc-warehouse-account','rc-person-account'].includes(e.target.id)||(e.target.id==='rc-warehouse'&&draft)){
   const search=$('rc-search-'+e.target.id.slice(3));if(search){const match=leaf().find(x=>x.id===e.target.value);search.value=match?.name||'';}
   if(draft&&['rc-partyAccount','rc-payment','rc-warehouse'].includes(e.target.id)){
    syncInvoice();const element=$('rc-posting-preview');
    if(element){const tmp=document.createElement('div');tmp.innerHTML=commerceSidesMarkup(data(),draft);element.innerHTML=tmp.firstElementChild?.innerHTML||'';}
   }
   return;
  }
  if(['rc-direction','rc-warehouse','rc-target'].includes(e.target.id)&&['adjust','transfer'].includes(view)){
   const host=$('rc-movement-posting-preview');
   if(host){
    const transfer=view==='transfer';
    const tmp=document.createElement('div');
    tmp.innerHTML=commerceMovementSidesMarkup(data(),transfer,$('rc-direction')?.value||'in',$('rc-warehouse')?.value,$('rc-target')?.value);
    host.innerHTML=tmp.firstElementChild?.innerHTML||'';
   }
   return;
  }
  if(e.target.id==='rc-currency'&&draft){
   const previous=draft.currency||'YER';syncInvoice();draft.currency=e.target.value;
   if(previous!==draft.currency){draft.exchangeRate=draft.currency==='YER'?1:'';
    if(previous==='YER'&&draft.currency!=='YER'&&draft.lines.some(l=>n(l.price)>0))notify('تنبيه: الأسعار المدخلة كانت بالريال اليمني؛ راجع سعر كل صنف بالعملة الجديدة قبل الحفظ.','warn');}
   paint();return;
  }
  if(e.target.id==='rc-catalog-group'){catalogGroup=e.target.value;refreshCatalogListing();return;}if(e.target.id==='rc-partyName'){const p=data().people.find(p=>p.name===e.target.value);if(p&&$('rc-partyAccount')){const account=leaf().find(x=>x.id===p.accountId);$('rc-partyAccount').value=account?.id||'';if($('rc-search-partyAccount'))$('rc-search-partyAccount').value=account?.name||'';}}if(e.target.id==='rc-import-file'){stageImportFile(e.target.files?.[0]);e.target.value='';return;}if(e.target.id==='rc-person-account'){const input=$('rc-name');if(input&&!input.value.trim())input.value=e.target.value;}});
 let commercePointerFocus=null;
 root.addEventListener('pointerdown',e=>{commercePointerFocus=e.target.closest('#pageCommerce form input, #pageCommerce form textarea');},true);
 root.addEventListener('focusin',e=>{
  const field=e.target;
   const pointerFocus=field===commercePointerFocus;
   commercePointerFocus=null;
   if(pointerFocus)return; // Normal taps must not auto-select text or open Android's floating menu.
  if(!(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement)||
     !field.closest('#pageCommerce form')||field.disabled||field.readOnly||
     ['hidden','file','date','checkbox','radio'].includes(field.type)||!field.value)return;
  const value=field.value;
  requestAnimationFrame(()=>{
   if(field.isConnected&&document.activeElement===field&&field.value===value){
    try{field.select();}catch(_){}
   }
  });
 });
 // Android keyboards and inline dictation may finalize text at compositionend
 // without emitting an additional ordinary input event.
 root.addEventListener('compositionstart',e=>{
  if(e.target.id?.startsWith('rc-search-'))e.target.dataset.composing='1';
 });
 root.addEventListener('compositionend',e=>{
  const field=e.target;
  if(!field.id?.startsWith('rc-search-'))return;
  field.dataset.composing='0';
  requestAnimationFrame(()=>{if(field.isConnected)commerceResolveAccount(field,{inputType:'insertText'});});
 });
 root.addEventListener('input',e=>{
  if(e.target.id.startsWith('rc-search-')){commerceResolveAccount(e.target,e);return;}
  if(['rc-group','rc-name'].includes(e.target.id)&&!e.isComposing){
   const db=data();
   const suggestions=e.target.id==='rc-group'?db.products.map(p=>p.group):view==='products'?db.products.map(p=>p.name):view==='warehouses'?db.warehouses.map(w=>w.alias||w.name):db.people.map(p=>p.name);
   commerceAutocomplete(e.target,suggestions,e);return;
  }
  if(e.target.id==='rc-catalog-search'){catalogSearch=e.target.value;refreshCatalogListing();return;}
  const productInput=e.target.id.match(/^rc-product-search-(\d+)$/);
  if(productInput&&draft){
   const k=Number(productInput[1]);commerceResolveProduct(k);
   if(!e.isComposing&&!e.target.value.includes(' — ')){
    const matches=data().products.map(p=>({value:commerceProductLabel(p),aliases:[
     {search:commerceProductLabel(p),fill:commerceProductLabel(p)},
     {search:p.name,fill:p.name},
     {search:p.sku,fill:commerceProductLabel(p)}
    ]}));
    commerceAutocomplete(e.target,matches,e);
    commerceResolveProduct(k);
   }
   return;
  }
  if(e.target.id==='rc-exchangeRate'&&draft){draft.exchangeRate=e.target.value;refreshTotals();return;}
  if(['rc-partyName','rc-displayPartyName'].includes(e.target.id)){
   if(!e.isComposing)commerceAutocomplete(e.target,data().people.filter(p=>p.type===(mode==='in'?'vendor':'client')).map(p=>p.name),e);
   if(e.target.id==='rc-partyName'){
    const p=data().people.find(p=>commerceNormalize(p.name)===commerceNormalize(e.target.value));
    if(p&&$('rc-partyAccount'))$('rc-partyAccount').value=p.accountId||'';
   }
   return;
  }
  if(/^rc-(qty|price)-\d+$/.test(e.target.id)){syncInvoice();refreshTotals();}
 });
 root.addEventListener('change',e=>{
  if(e.target.id==='rc-origin'&&draft){syncInvoice();changeOrigin();return;}
  const prod=e.target.id.match(/^rc-product-(\d+)$/);
  if(prod&&draft){syncInvoice();const i=Number(prod[1]),db=data(),p=db.products.find(p=>p.id===draft.lines[i].product);draft.lines[i].unit=pMain(p||{unit:'حبة'});if(view==='return'){const o=db.invoices.find(x=>x.id===draft.origin);draft.lines[i].price=o?.lines.find(x=>x.product===p?.id)?.price||0;}else if(mode==='out')draft.lines[i].price=(draft.currency||'YER')==='YER'?(p?.price||0):0;paint();return;}
  const unit=e.target.id.match(/^rc-unit-(\d+)$/);
  if(unit&&draft){syncInvoice();const i=Number(unit[1]),db=data(),o=db.invoices.find(x=>x.id===draft.origin),l=draft.lines[i];if(view==='return')l.price=o?.lines.find(x=>x.product===l.product&&lineUnit(db,x)===l.unit)?.price||0;refreshTotals();return;}
  if(e.target.id==='rc-product'&&['adjust','transfer'].includes(view)){const p=data().products.find(x=>x.id===e.target.value),input=$('rc-unit');if(input)input.innerHTML=unitList(p||{unit:'حبة'}).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');}
 });
 root.addEventListener('submit',async event=>{
  if(!event.target.id?.startsWith('rc-'))return;event.preventDefault();if(loading)return;
  try{
   const db=data(),form=event.target.id;
   if(form==='rc-product-form'){
    const sku=$('rc-sku').value.trim(),name=$('rc-name').value.trim(),group=$('rc-group').value.trim(),unitMain=$('rc-unitMain').value.trim(),unitSub=$('rc-unitSub').value.trim(),price=n($('rc-price').value),minimum=n($('rc-minimum').value);
    positive(price,'السعر',true);positive(minimum,'حد المخزون',true);
    if(!sku||!name||!group||!unitMain)throw Error('أكمل رقم واسم الصنف والمجموعة والوحدة الرئيسية.');
    if(unitSub===unitMain)throw Error('الوحدة الفرعية لا تساوي الوحدة الرئيسية.');
    if(db.products.some(p=>p.sku===sku&&p.id!==editingProduct))throw Error('رقم الصنف مستخدم.');
    if(editingProduct){const old=db.products.find(p=>p.id===editingProduct);if(!old)throw Error('الصنف غير موجود.');if(db.invoices.some(x=>x.lines.some(l=>l.product===old.id))&&(pMain(old)!==unitMain||pSub(old)!==unitSub))throw Error('الوحدات مستخدمة في مستندات سابقة؛ لا يمكن تعديلها.');Object.assign(old,{sku,name,group,unitMain,unitSub,unit:unitMain,price,minimum});}
    else db.products.push({id:id(),sku,name,group,unitMain,unitSub,unit:unitMain,price,minimum});
    save(db);await flushStorage();editingProduct=null;paint();notify('تم حفظ بطاقة الصنف','success');
   }else if(form==='rc-warehouse-form'){const accountId=commerceChosenAccount('warehouse-account','حساب المخزن',true),alias=$('rc-name').value.trim();if(!accountId)throw Error('اختر الحساب الفرعي أولًا.');if(db.warehouses.some(w=>w.id!==editingWarehouse&&w.accountId===accountId))throw Error('الحساب مرتبط بمخزن آخر.');const name=alias||accountId;const existing=db.warehouses.find(w=>w.id===editingWarehouse);if(existing)Object.assign(existing,{accountId,alias,name});else db.warehouses.push({id:id(),accountId,alias,name});save(db);await flushStorage();editingWarehouse=null;paint();}
   else if(form==='rc-person-form'){const accountId=commerceChosenAccount('person-account','حساب المورد أو العميل',true),name=$('rc-name').value.trim()||accountId;if(!accountId)throw Error('اختر حساب الطرف من شجرة الحسابات.');if(db.people.some(p=>p.accountId===accountId&&p.type===(mode==='in'?'vendor':'client')))throw Error('هذا الطرف مسجل مسبقًا.');db.people.push({id:id(),accountId,name,phone:$('rc-phone')?.value||'',type:mode==='in'?'vendor':'client'});save(db);await flushStorage();paint();}
   else if(form==='rc-accounts-form'){for(const key of Object.keys(db.accounts))db.accounts[key]=commerceChosenAccount('acc-'+key,key);save(db);await flushStorage();notify('تم حفظ ربط الحسابات','success');refreshDefaults();}
   else if(form==='rc-invoice-form')await saveInvoice(event.submitter?.hasAttribute('data-rc-save-next')===true);
   else if(form==='rc-movement-form')await saveMovement();
  }catch(error){console.error('Ratib commerce',error);notify(error.message||'تعذر الحفظ','error');}
 });
}
function commerceOpenDocument(docId){
 const doc=data().invoices.find(d=>d.id===docId);
 if(!doc)throw Error('المستند التجاري غير موجود؛ قد يكون محذوفًا.');
 if(open(['purchase','purchase_return'].includes(doc.kind)?'purchase':'sale')===false)return false;
 detailId=doc.id;view='detail';paint();
}
window.RatibCommerce={open,openFavorite,openDocument:commerceOpenDocument,documentAction:commerceDocumentOperation,render:paint,version:window.ratibCurrentTrialVersion?.()||'3.6.149'};
window.RatibCommerce.hasUnsavedDraft=hasUnsavedDraft;
window.RatibCommerce.requestLeave=requestLeave;
window.RatibCommerce.captureView=captureView;
window.RatibCommerce.restoreView=restoreView;
window.RatibCommerce.refreshDefaults=refreshDefaults;
window.RatibCommerce.openAccountDefaults=openAccountDefaults;
function bindAll(){bind();bind($('ratibCommerceDefaults'));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAll,{once:true});else bindAll();
})();