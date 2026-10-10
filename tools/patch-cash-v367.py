from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.6"' in s and 'ratib-cash-v367' not in s
css="""<style id="ratib-cash-v367">
/* 3.6.7: wide account inputs with compact neighboring actions and no mobile wrap. */
@media screen {
#multiVoucherCard.spend-voucher .multi-voucher-table tbody td:nth-child(2),
#multiVoucherCard.spend-voucher .multi-voucher-source-row{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:5px!important;min-width:0!important}
#multiVoucherCard.spend-voucher .multi-voucher-table tbody td:nth-child(2)>.multi-line-account,
#multiVoucherCard.spend-voucher .multi-voucher-source-row .searchable-select-wrap{flex:1 1 0%!important;min-width:0!important;width:100%!important}
#multiVoucherCard.spend-voucher :is(#ratibLockSource,#ratibLockCounter){flex:0 0 34px!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:38px!important}
#multiVoucherCard.spend-voucher #ratibHeaderSide{flex:0 0 45px!important;min-width:45px!important;width:45px!important;text-align:center!important;font-weight:700!important;font-size:16px!important;padding:4px!important}
#multiVoucherCard.spend-voucher #ratibReverseSide{flex:0 0 40px!important;width:40px!important;min-width:40px!important;padding:4px!important;font-size:23px!important;line-height:1!important}
#multiVoucherCard.spend-voucher #ratibCounterSide{display:inline-flex!important;align-items:center;justify-content:center;flex:0 0 32px;width:32px;height:34px;border:1px solid var(--border);border-radius:8px;font-weight:700;color:var(--text);background:var(--card)}
#multiVoucherCard.spend-voucher .ratib-side-choice{flex-wrap:nowrap!important;white-space:nowrap!important;gap:5px!important}
#ratibNarrationSuggestions{position:fixed;display:none;z-index:10050;max-height:min(230px,38vh);overflow-y:auto;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);direction:rtl}
#ratibNarrationSuggestions.open{display:block}
#ratibNarrationSuggestions .ratib-history-row{display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border)}
#ratibNarrationSuggestions .ratib-history-row:last-child{border-bottom:0}
#ratibNarrationSuggestions button{border:0;background:transparent;color:var(--text);padding:9px 10px;cursor:pointer}
#ratibNarrationSuggestions .ratib-history-use{flex:1;text-align:right;white-space:normal;overflow-wrap:anywhere}
#ratibNarrationSuggestions .ratib-history-delete{flex:0 0 36px;color:var(--danger);font-size:17px}
}
</style>"""
s=s.replace("</head>",css+"\n</head>",1)
js=r"""
/* Ratib 3.6.7: concise side indicators and successful-post narration memory. */
(function(){
 'use strict';
 const STORE_KEY='ratib_narration_history_v1';
 const $=id=>document.getElementById(id);
 const cash=()=>typeof cashVoucherMode==='function'&&cashVoucherMode();
 const maxItems=120;
 const normalize=v=>String(v??'').trim().replace(/\s+/g,' ');
 function readHistory(){
  try{const v=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.text==='string'):[];}catch(e){return [];}
 }
 function rememberPosted(d){
  const incoming=[d?.note,...(Array.isArray(d?.lines)?d.lines.map(line=>line.note):[])].map(normalize).filter(Boolean);
  if(!incoming.length)return;
  const now=Date.now(),history=readHistory();
  for(const phrase of new Set(incoming)){
   const existing=history.find(x=>x.text===phrase);
   if(existing){existing.count=(existing.count||1)+1;existing.at=now;}
   else history.push({text:phrase,count:1,at:now});
  }
  history.sort((a,b)=>b.at-a.at||b.count-a.count);
  try{localStorage.setItem(STORE_KEY,JSON.stringify(history.slice(0,maxItems)));}catch(e){console.warn('Narration history storage unavailable',e)}
 }
 // Wrapper preserves existing save behavior; only records narration after successful financial completion.
 const previousCommit=commitMultiVoucher;
 commitMultiVoucher=function(afterSuccess=null){
  return previousCommit(function(d){
   rememberPosted(d);
   if(typeof afterSuccess==='function')return afterSuccess(d);
  });
 };
 function abbreviateSides(){
  const select=$('ratibHeaderSide'),swap=$('ratibReverseSide'),counter=$('ratibCounterSide');
  if(!select||!swap||!counter)return;
  for(const opt of select.options){opt.textContent=opt.value==='credit'?'د':'م';opt.title=opt.value==='credit'?'دائن':'مدين';}
  select.title='د = دائن، م = مدين';select.setAttribute('aria-label','طرف الحساب العلوي: دائن أو مدين');
  swap.textContent='⇄';swap.title='عكس طرفي القيد (مدين / دائن)';swap.setAttribute('aria-label',swap.title);
  counter.hidden=false;counter.textContent=select.value==='credit'?'م':'د';
 }
 // Re-synchronize side badges after the existing toggle action, without changing ledger data values.
 const previousSetup=setupMultiVoucherFeature;
 setupMultiVoucherFeature=function(){const result=previousSetup();abbreviateSides();return result;};
 document.addEventListener('change',e=>{if(e.target?.id==='ratibHeaderSide')queueMicrotask(abbreviateSides);},true);
 document.addEventListener('click',e=>{if(e.target?.closest('#ratibReverseSide'))queueMicrotask(abbreviateSides);},true);
 const priorConfigure=configureVoucherMode;
 configureVoucherMode=function(mode){const out=priorConfigure(mode);queueMicrotask(abbreviateSides);return out;};
 // Floating suggestions keep all existing form dimensions and mobile layout intact.
 const panel=document.createElement('div');panel.id='ratibNarrationSuggestions';panel.setAttribute('role','listbox');panel.setAttribute('aria-label','عبارات البيان السابقة');
 let current=null;
 const isNarration=el=>el?.matches?.('#multiVoucherNote, #multiVoucherCard.spend-voucher .multi-line-note');
 function position(){
  if(!current||!current.isConnected)return;
  const r=current.getBoundingClientRect();
  panel.style.left=Math.max(8,r.left)+'px';panel.style.width=Math.min(r.width,innerWidth-16)+'px';
  panel.style.top=Math.min(innerHeight-50,r.bottom+3)+'px';
 }
 function close(){panel.classList.remove('open');current=null;}
 function show(){
  if(!current||!cash())return close();
  const needle=normalize(current.value).toLocaleLowerCase();
  const hits=readHistory().filter(x=>x.text.toLocaleLowerCase().includes(needle))
    .sort((a,b)=>b.at-a.at||b.count-a.count).slice(0,8);
  panel.replaceChildren();
  for(const item of hits){
   const row=document.createElement('div');row.className='ratib-history-row';
   const use=document.createElement('button');use.type='button';use.className='ratib-history-use';use.textContent=item.text;use.title=item.text;
   use.addEventListener('pointerdown',e=>e.preventDefault());
   use.addEventListener('click',()=>{if(current?.isConnected){current.value=item.text;current.dispatchEvent(new Event('input',{bubbles:true}));current.dispatchEvent(new Event('change',{bubbles:true}));current.focus();}close();});
   const remove=document.createElement('button');remove.type='button';remove.className='ratib-history-delete';remove.textContent='×';remove.title='حذف هذا الاقتراح';remove.setAttribute('aria-label','حذف الاقتراح');
   remove.addEventListener('pointerdown',e=>e.preventDefault());
   remove.addEventListener('click',()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(readHistory().filter(x=>x.text!==item.text)));}catch(e){}show();});
   row.append(use,remove);panel.append(row);
  }
  position();panel.classList.toggle('open',hits.length>0);
 }
 document.addEventListener('focusin',e=>{if(isNarration(e.target)&&cash()){current=e.target;show();}else if(!panel.contains(e.target))close();});
 document.addEventListener('input',e=>{if(e.target===current)show();});
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&e.target!==current)close();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 window.addEventListener('resize',()=>{if(panel.classList.contains('open'))position();});
 window.addEventListener('scroll',()=>{if(panel.classList.contains('open'))position();},true);
 document.body.append(panel);
})();
"""
s=s.replace("</script>",js+"\n</script>",1)
s=s.replace("الإصدار 3.6.6","الإصدار 3.6.7")
a=s.index("const RATIB_RELEASE=");b=s.index(";",a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.7","changes":["توسيع حقول الحسابات مع الحفاظ على الأزرار المصغرة في سطر واحد.","اختصار الطرفين إلى د للدائن وم للمدين مع زر تبديل ⇄.","اقتراح البيانات السابقة مع حذف الاقتراحات وحفظها عند نجاح ترحيل السند فقط.","المحافظة على إصلاحات التفقيط والفواصل الألفية."]}'+s[b:]
assert '"version":"3.6.7"' in s and 'ratib-cash-v367' in s and 'ratibNarrationSuggestions' in s
p.write_text(s,encoding="utf-8")
