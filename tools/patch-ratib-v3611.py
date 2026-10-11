from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
assert '"version":"3.6.10"' in s and 'ratib-v3611' not in s
old="other=debit?(t.creditAccount||'طرف آخر'):(t.debitAccount||'طرف آخر')"
assert s.count(old)==1
s=s.replace(old,"other=ratibResolveCounterpart(t,scope)")
old="""const entry=getAccountEntry(t,Array.from(names));
  const side=entry?.side;
  const name=side==='debit'?t.creditAccount:t.debitAccount;
  return name||'طرف آخر';"""
assert s.count(old)==1
s=s.replace(old,"return ratibResolveCounterpart(t,Array.from(names));")
old="function accountCurrencyLabel(currency){return currency==='YER'?'ريال يمني':currency==='SAR'?'ريال سعودي':currency==='USD'?'دولار أمريكي':currency;}"
assert s.count(old)==1
s=s.replace(old,"function accountCurrencyLabel(currency){return (typeof ratibCurrencyName==='function'&&ratibCurrencyName(currency))||(currency==='YER'?'ريال يمني':currency==='SAR'?'ريال سعودي':currency==='USD'?'دولار أمريكي':currency);}")
old="function multiCurrencyLabel(c){return c==='SAR'?'ريال سعودي SAR':c==='USD'?'دولار USD':'ريال يمني YER';}"
assert s.count(old)==1
s=s.replace(old,"function multiCurrencyLabel(c){return accountCurrencyLabel(c)+' '+c;}")
js=r"""
/* ratib-v3611: currency catalog, actual journal counterparts, and multi-entry edit actions. */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const base=[{code:'YER',name:'ريال يمني',decimals:2,active:true},{code:'SAR',name:'ريال سعودي',decimals:2,active:true},{code:'USD',name:'دولار أمريكي',decimals:2,active:true}];
function catalog(){
 try{
  const list=store.get('currency_catalog_v1',[]);
  const map=new Map(base.map(x=>[x.code,{...x}]));
  if(Array.isArray(list))for(const x of list)if(x&&/^[A-Z]{3}$/.test(x.code))map.set(x.code,x);
  const imported=store.get('import_currencies',[]);
  if(Array.isArray(imported))for(const code of imported)if(/^[A-Z]{3}$/.test(code)&&!map.has(code))map.set(code,{code,name:code,decimals:2,active:true});
  for(const code of KNOWN_CURRENCIES)if(!map.has(code))map.set(code,{code,name:code,decimals:2,active:true});
  return [...map.values()];
 }catch(e){console.warn('Currency catalog read error',e);return base.map(x=>({...x}));}
}
window.ratibCurrencyName=code=>catalog().find(x=>x.code===code)?.name||'';
function saveCatalog(list){
 try{
  store.set('currency_catalog_v1',list);
  const imported=new Set(store.get('import_currencies',[]));
  for(const x of list){imported.add(x.code);KNOWN_CURRENCIES.add(x.code);}
  store.set('import_currencies',[...imported]);
  return true;
 }catch(e){console.error('Currency catalog save error',e);showToast('تعذر حفظ العملات','error');return false;}
}
function sync(){
 try{
  const data=catalog();
  data.forEach(x=>KNOWN_CURRENCIES.add(x.code));
  document.querySelectorAll('select').forEach(sel=>{
   if(sel.closest('#ratibCurrencyManager'))return;
   const existing=[...sel.options];
   if(!existing.some(o=>KNOWN_CURRENCIES.has(o.value)))return;
   const selected=sel.value;
   for(const c of data){
    let opt=[...sel.options].find(o=>o.value===c.code);
    if(!opt){opt=document.createElement('option');opt.value=c.code;sel.append(opt);}
    opt.textContent=c.name+' ('+c.code+')';
    opt.disabled=c.active===false&&c.code!==selected;
   }
   if(selected)sel.value=selected;
  });
 }catch(e){console.error('Currency synchronizer error',e);}
}
// The opposite side of a multi-entry journal may contain several distinct accounts.
window.ratibResolveCounterpart=function(t,scope){
 try{
  const names=Array.isArray(scope)?scope:[scope];
  const entry=getAccountEntry(t,names);
  if(!entry)return '';
  const opp=entry.side==='debit'?'credit':'debit';
  const lines=t?.multiVoucher?.lines;
  if(Array.isArray(lines)&&lines.length){
   const otherSide=entry.line?.side==='debit'?'credit':entry.line?.side==='credit'?'debit':opp;
   const others=[...new Set(lines.filter(x=>x&&x.side===otherSide&&x.account).map(x=>x.account))];
   if(others.length)return others.join('، ');
  }
  const direct=entry.side==='debit'?t.creditAccount:t.debitAccount;
  if(direct)return String(direct);
  return t.debitAccount&&t.creditAccount?String(t.debitAccount===names[0]?t.creditAccount:t.debitAccount):'';
 }catch(e){console.warn('Counterpart resolver error',e);return '';}
};
// First focus or pointer selection selects all. A second click allows cursor placement.
const accountField=el=>el?.matches?.('input')&&!el.readOnly&&!el.disabled&&
 (Boolean(el.closest('.searchable-select-wrap'))||/account|acc/i.test(el.id||'')||/multi-line-account/.test(el.className||''))&&el.type!=='hidden';
document.addEventListener('focusin',e=>{const el=e.target;if(accountField(el))try{el.select();}catch(_){}},true);
document.addEventListener('pointerdown',e=>{const el=e.target;if(accountField(el)&&document.activeElement!==el)el.dataset.ratibSelectNext='1';},true);
document.addEventListener('click',e=>{const el=e.target;if(accountField(el)&&el.dataset.ratibSelectNext==='1'){delete el.dataset.ratibSelectNext;try{el.select();}catch(_){}}},true);
function currenciesUi(){
 const settings=get('pageSettings');if(!settings||get('ratibCurrencyManager'))return;
 const card=document.createElement('div');card.id='ratibCurrencyManager';card.className='card settings-accordion-card';
 card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>💱 إدارة العملات</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><p style="color:var(--muted)">العملات المرتبطة بقيود قديمة لا تُحذف، ويمكن تعطيل استخدامها في القيود الجديدة. الريال اليمني العملة الافتراضية.</p><div id="ratibCurrencyItems"></div><div class="ratib-currency-inputs"><input id="ratibCurrencyCode" maxlength="3" placeholder="رمز ISO مثل AED"><input id="ratibCurrencyName" placeholder="اسم العملة"><input id="ratibCurrencyDecimals" type="number" min="0" max="4" value="2" title="منازل عشرية"><button id="ratibAddCurrency" type="button" class="btn btn-primary">إضافة عملة</button></div></div>';
 settings.prepend(card);
 const header=card.querySelector('.settings-accordion-header'),body=card.querySelector('.settings-accordion-body');
 const toggle=()=>{const v=body.classList.toggle('open');header.setAttribute('aria-expanded',String(v));header.querySelector('.accordion-arrow').textContent=v?'▲':'▼';};
 header.onclick=toggle;header.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
 function render(){
  const list=get('ratibCurrencyItems');list.replaceChildren();
  for(const c of catalog()){
   const row=document.createElement('div');row.className='ratib-currency-item';
   const symbol=document.createElement('strong');symbol.textContent=c.code;
   const name=document.createElement('input');name.value=c.name||c.code;name.setAttribute('aria-label','اسم '+c.code);
   const active=document.createElement('input');active.type='checkbox';active.checked=c.active!==false;active.disabled=c.code==='YER';
   const label=document.createElement('label');label.append(active,document.createTextNode(' متاحة'));
   const btn=document.createElement('button');btn.type='button';btn.className='btn btn-ghost';btn.textContent='حفظ';
   btn.onclick=()=>{const value=name.value.trim();if(!value){showToast('اكتب اسم العملة','warn');return;}const all=catalog(),item=all.find(x=>x.code===c.code);if(!item)return;item.name=value;item.active=c.code==='YER'?true:active.checked;if(saveCatalog(all)){sync();render();showToast('تم تعديل العملة','success');}};
   row.append(symbol,name,label,btn);list.append(row);
  }
 }
 get('ratibAddCurrency').onclick=()=>{
  const code=get('ratibCurrencyCode').value.trim().toUpperCase(),name=get('ratibCurrencyName').value.trim(),decimals=Number(get('ratibCurrencyDecimals').value);
  if(!/^[A-Z]{3}$/.test(code)||!name||!Number.isInteger(decimals)||decimals<0||decimals>4){showToast('أدخل رمزًا من ثلاثة أحرف واسمًا ومنازل عشرية صحيحة','warn');return;}
  const all=catalog();if(all.some(x=>x.code===code)){showToast('هذه العملة موجودة','warn');return;}
  all.push({code,name,decimals,active:true});if(saveCatalog(all)){get('ratibCurrencyCode').value='';get('ratibCurrencyName').value='';sync();render();showToast('تمت إضافة العملة','success');}
 };
 render();sync();
}
function multiEditPrint(){
 const card=get('multiVoucherCard');if(!card||get('ratibMultiEditPrint'))return;
 const bar=document.createElement('div');bar.id='ratibMultiEditPrint';bar.className='ratib-multi-edit-actions';
 const print=document.createElement('button');print.type='button';print.className='btn btn-ghost';print.textContent='🖨 طباعة القيد المركب';
 const pdf=document.createElement('button');pdf.type='button';pdf.className='btn btn-ghost';pdf.textContent='↗ مشاركة PDF';
 bar.append(print,pdf);
 const buttons=card.querySelector('.multi-voucher-actions');if(buttons)buttons.before(bar);else card.append(bar);
 const prepare=()=>{
  if(multiVoucherMode!=='multi-entry')return null;
  try{const error=validateMultiVoucher();if(error){showToast(error,'warn');return null;}return buildMultiVoucherData('draft');}
  catch(e){console.error(e);showToast('تعذر تجهيز معاينة السند','error');return null;}
 };
 print.onclick=()=>{const d=prepare();if(!d)return;try{prepareMultiVoucherPrint(d);document.body.classList.add('printing-voucher');setTimeout(()=>{try{window.print();}finally{document.body.classList.remove('printing-voucher');}},50);}catch(e){console.error(e);showToast('تعذر تجهيز الطباعة','error');}};
 pdf.onclick=async()=>{
  const d=prepare();if(!d)return;
  try{if(document.fonts)await document.fonts.ready;const blob=buildMultiVoucherPdf(d),file=new File([blob],'قيد-مركب-'+d.seq+'-معاينة.pdf',{type:'application/pdf'});
   if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title:'معاينة قيد مركب'});
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  }catch(e){if(e.name!=='AbortError'){console.error(e);showToast('تعذر مشاركة PDF','error');}}
 };
 const visibility=()=>{bar.style.display=multiVoucherMode==='multi-entry'?'flex':'none';};
 const old=configureVoucherMode;
 configureVoucherMode=function(...args){const result=old.apply(this,args);visibility();return result;};
 visibility();
}
try{currenciesUi();multiEditPrint();sync();}catch(e){console.error('Ratib 3.6.11 initialization',e);}
})();
"""
css="""<style id="ratib-v3611">
@media screen {
#ratibCurrencyManager .ratib-currency-item{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid var(--border);padding:7px 0}
#ratibCurrencyManager .ratib-currency-item input:not([type=checkbox]){flex:1 1 135px;min-width:0}
#ratibCurrencyManager .ratib-currency-inputs{display:grid;grid-template-columns:1fr 2fr 70px auto;gap:8px;margin:12px 0}
#ratibCurrencyManager .ratib-currency-inputs input{min-width:0;width:100%}
#ratibMultiEditPrint{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
#ratibMultiEditPrint .btn{flex:1 1 135px;width:auto;margin:0}
}
@media(max-width:600px){#ratibCurrencyManager .ratib-currency-inputs{grid-template-columns:1fr 1fr}}
</style>"""
s=s.replace('</head>',css+'\n</head>',1)
pos=s.rfind('</script>');assert pos>0;s=s[:pos]+js+'\n'+s[pos:]
s=s.replace('الإصدار 3.6.10','الإصدار 3.6.11')
a=s.index('const RATIB_RELEASE=');b=s.index(';',a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.11","changes":["إصلاح عرض الحساب المقابل الحقيقي من طرف القيد وبنود القيد المركب.","إضافة إدارة العملات وربطها بقوائم الإدخال مع الحفاظ على البيانات القديمة.","إتاحة طباعة ومشاركة PDF للقيد المركب أثناء التعديل دون حفظ جديد.","تحديد اسم الحساب كاملًا تلقائيًا عند فتح حقله."]}'+s[b:]
assert '"version":"3.6.11"' in s and 'ratib-v3611' in s
p.write_text(s,encoding='utf-8')
