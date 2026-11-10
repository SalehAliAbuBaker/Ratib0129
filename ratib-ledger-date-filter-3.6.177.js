/* Ratib 3.6.177 — date search in operations across current + archived journals.
 * Read-only UI filtering. The application continues to own the transactions,
 * accounting groups, fiscal views and all edit/print handlers. */
(()=>{'use strict';
  const START='ledgerDateFrom177',END='ledgerDateTo177',CLEAR='ledgerDateClear177',NOTICE='ledgerDateHint177';
  const $=id=>document.getElementById(id);
  const date=tx=>{
    const raw=String(tx?.isoDate||tx?.date||'').trim();
    const match=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\b|T)/.exec(raw);
    if(!match)return '';
    const normalized=match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0');
    const parsed=new Date(normalized+'T12:00:00Z');
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===normalized?normalized:'';
  };
  const values=()=>({from:$(START)?.value||'',to:$(END)?.value||''});
  const matches=(tx,r=values())=>{
    const {from,to}=r;
    if(!from&&!to)return true;
    if(from&&to&&from>to)return false;
    const stamp=date(tx);
    if(!stamp)return false;
    if(from&&!to)return stamp===from; // one selected date = one specific day
    if(from&&stamp<from)return false;
    if(to&&stamp>to)return false;
    return true;
  };
  function hint(){
    const {from,to}=values(),node=$(NOTICE);
    if(node){
      const invalid=!!(from&&to&&from>to);
      node.textContent=invalid?'تاريخ النهاية يسبق تاريخ البداية؛ راجع الفترة.':
        from&&to?(from===to?'عرض مستندات اليوم المحدد فقط.':'عرض المستندات ضمن الفترة المحددة، شاملًا الطرفين.'):
        from?'عرض مستندات هذا اليوم فقط.':
        to?'عرض العمليات حتى التاريخ المحدد.':
        'اختر تاريخًا واحدًا للبحث في ذلك اليوم، وأضف «إلى تاريخ» للبحث خلال فترة.';
      node.classList.toggle('ratib-ledger-date-error',invalid);
    }
    const clear=$(CLEAR);
    if(clear)clear.disabled=!from&&!to;
  }
  function refresh(){
    hint();
    // The fiscal selector defaults to a single year after an annual close.
    // Date searches must include historical transactions without changing the
    // user's accounting records. The built-in "all" option is read-only.
    const {from,to}=values(),year=$('ratibFiscalLedgerYear');
    if((from||to)&&year&&year.value!=='all'&&year.querySelector('option[value="all"]')){
      year.value='all';
      year.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    document.dispatchEvent(new Event('ratib:ledger-date-render'));
  }
  function clear(render=true){
    const from=$(START),to=$(END);
    if(from)from.value='';
    if(to)to.value='';
    hint();
    if(render)document.dispatchEvent(new Event('ratib:ledger-date-render'));
  }
  function bind(){
    if(!$(START)||!$(END))return;
    for(const id of [START,END])$(id).addEventListener('change',refresh);
    $(CLEAR)?.addEventListener('click',()=>clear());
    hint();
  }
  window.RatibLedgerDateFilter177={date,values,matches,clear,refresh,version:'3.6.177'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();