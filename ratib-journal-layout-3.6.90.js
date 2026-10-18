/* Ratib trial 3.6.90: compact simple/compound journal presentation.
   Moves existing DOM nodes only. No posting or accounting math is replaced. */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  let budgetWired=false,compoundObserver=null;
  function arrangeSimple(){
    const card=el('cashFlowCard'),grid=card?.querySelector('.simple-journal-grid');
    const date=el('voucherDateInput')?.closest('.form-group');
    const input=el('voucherAmountInput'),currency=el('voucherCurrencySelect');
    const debit=el('wrapDebitAcc')?.closest('.form-group');
    const credit=el('wrapCreditAcc')?.closest('.form-group');
    const note=el('voucherNoteInput')?.closest('.form-group');
    const party=el('voucherRecipientGroup');
    if(!grid||!date||!input||!currency||!debit||!credit||!note||!party)return false;
    // Make one concrete, stable row containing THE ORIGINAL amount and currency controls.
    // Do not depend on the inherited voucher wrapper, whose children can be rearranged
    // by older cash-entry scripts. Their names, values and input event listeners stay.
    const moneyField=input.parentElement,currencyField=currency.parentElement;
    const oldMoneyRow=moneyField?.parentElement;
    const oldCurrencyRow=currencyField?.parentElement;
    if(!moneyField||!currencyField)return false;
    let row=el('ratibJournalAmountCurrencyRow');
    if(!row){row=document.createElement('div');row.id='ratibJournalAmountCurrencyRow';row.className='journal-amount-row';}
    row.append(moneyField,currencyField);
    for(const possible of [oldMoneyRow,oldCurrencyRow]){
      if(possible&&possible!==row&&possible!==grid&&!possible.children.length&&possible.parentElement===grid)possible.remove();
    }
    for(const node of [date,row,debit,credit,note,party])grid.append(node);
    // TAFQIT is textual feedback, never a field occupying the currency column.
    const tafqit=el('tafqitDisplayBox');
    if(tafqit)row.after(tafqit);
    const information=el('entryCurrencyConvertHint');
    if(information&&information.parentElement===card){
      let disclosure=el('ratibSimpleCurrencyDisclosure');
      if(!disclosure){
        disclosure=document.createElement('details');disclosure.id='ratibSimpleCurrencyDisclosure';
        const summary=document.createElement('summary');
        summary.textContent='القيد البسيط بعملة واحدة • تعليمات العملات المتعددة';
        disclosure.append(summary);
      }
      disclosure.append(information);
      grid.after(disclosure);
    }
    const swap=el('swapAccountsBtn');
    if(swap&&!credit.querySelector('.ratib-simple-account-heading')){
      const label=credit.querySelector('#lblCreditAcc')||credit.querySelector('label');
      if(label){
        const heading=document.createElement('div');heading.className='ratib-simple-account-heading';
        label.before(heading);heading.append(label,swap);
        swap.textContent='⇄';
        swap.title='تبديل الحسابات (عكس المدين والدائن)';
        swap.setAttribute('aria-label',swap.title);
      }
    }
    const oldSwap=grid.querySelector('.journal-swap-row');
    if(oldSwap&&!oldSwap.children.length)oldSwap.remove();
    for(const id of ['addNewDebitAccBtn','addNewCreditAccBtn']){
      const btn=el(id);if(btn){btn.hidden=true;btn.setAttribute('aria-hidden','true');btn.tabIndex=-1;}
    }
    arrangeSimpleExtras(card,note,party);
    const extra=el('ratibSimpleExtraBtn');
    if(extra&&extra.previousElementSibling!==note)note.after(extra);
    // Idempotent order: date, money/currency, tafqit, debit, credit, note.
    if(tafqit&&tafqit.previousElementSibling!==row)row.after(tafqit);
    return true;
  }
  function arrangeSimpleExtras(card,note,party){
    if(!el('ratibSimpleExtraBtn')){
      const toggle=document.createElement('button');toggle.id='ratibSimpleExtraBtn';toggle.type='button';
      toggle.className='btn btn-ghost ratib-simple-extra-toggle';
      toggle.textContent='تفاصيل إضافية (المستلم / المستفيد) ▾';
      toggle.setAttribute('aria-controls','voucherRecipientGroup');
      toggle.addEventListener('click',()=>{
        const collapsed=party.classList.toggle('ratib-simple-recipient-collapsed');
        toggle.setAttribute('aria-expanded',String(!collapsed));
      });
      note.after(toggle);
      const collapsed=!el('voucherRecipientInput')?.value?.trim();
      party.classList.toggle('ratib-simple-recipient-collapsed',collapsed);
      toggle.setAttribute('aria-expanded',String(!collapsed));
    }
    if(budgetWired)return;
    const panel=el('voucherSplitContainer'),button=el('toggleSplitBoxBtn');
    if(!panel||!button)return;
    const heading=button.parentElement;
    const overview=document.createElement('div');overview.id='ratibSimpleBudgetOverview';
    overview.className='ratib-simple-budget-overview';overview.setAttribute('role','status');
    heading.after(overview);
    const detail=document.createElement('button');detail.type='button';detail.id='ratibSimpleBudgetDetail';
    detail.className='btn btn-ghost ratib-budget-detail-btn';detail.textContent='تفاصيل التوزيع ▾';
    detail.setAttribute('aria-controls','voucherSplitContainer');
    overview.after(detail);
    detail.addEventListener('click',()=>{
      if(panel.classList.contains('hidden')){button.click();}
      panel.classList.toggle('ratib-budget-collapsed');
      updateBudgetOverview();
    });
    button.addEventListener('click',()=>queueMicrotask(updateBudgetOverview));
    document.addEventListener('input',event=>{
      if(event.target?.closest?.('#voucherSplitContainer')||event.target?.id==='voucherAmountInput')queueMicrotask(updateBudgetOverview);
    });
    document.addEventListener('change',event=>{
      if(event.target?.closest?.('#voucherSplitContainer')||event.target?.id==='voucherAmountInput')queueMicrotask(updateBudgetOverview);
    });
    const allocated=el('voucherAllocatedSum'),remaining=el('voucherRemainingSum');
    if(allocated&&remaining){
      const observer=new MutationObserver(updateBudgetOverview);
      observer.observe(allocated,{childList:true,subtree:true,characterData:true});
      observer.observe(remaining,{childList:true,subtree:true,characterData:true});
    }
    panel.classList.add('ratib-budget-collapsed');budgetWired=true;updateBudgetOverview();
  }
  function updateBudgetOverview(){
    const panel=el('voucherSplitContainer'),overview=el('ratibSimpleBudgetOverview'),detail=el('ratibSimpleBudgetDetail');
    if(!panel||!overview||!detail)return;
    const enabled=!panel.classList.contains('hidden');
    const allocated=el('voucherAllocatedSum')?.textContent?.trim()||'0';
    const remaining=el('voucherRemainingSum')?.textContent?.trim()||'0';
    const raw=remaining.replace(/[,،\s]/g,'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
    const pending=Number(raw);
    const unbalanced=enabled&&(!Number.isFinite(pending)||Math.abs(pending)>0.000001);
    if(unbalanced)panel.classList.remove('ratib-budget-collapsed');
    overview.textContent=enabled?'الموزع: '+allocated+' • المتبقي: '+remaining:'توزيع الميزانية غير مفعل';
    overview.classList.toggle('ratib-budget-warning',unbalanced);
    detail.hidden=!enabled;
    detail.setAttribute('aria-expanded',String(enabled&&!panel.classList.contains('ratib-budget-collapsed')));
    detail.textContent=panel.classList.contains('ratib-budget-collapsed')?'تفاصيل التوزيع ▾':'إخفاء تفاصيل التوزيع ▴';
  }
  function arrangeCompound(){
    const card=el('multiVoucherCard'),grid=card?.querySelector('.multi-voucher-grid');
    const date=el('multiVoucherDate')?.closest('label');
    const base=el('multiVoucherBaseCurrency')?.closest('label');
    if(!grid||!date||!base)return;
    let amount=el('ratibCompoundAmountReadout');
    if(!amount){
      amount=document.createElement('div');amount.id='ratibCompoundAmountReadout';
      amount.className='ratib-compound-amount-readout';
      amount.setAttribute('role','status');
      amount.innerHTML='<span>إجمالي المدين (محسوب)</span><output id="ratibCompoundAmountValue">0.00</output>';
      date.after(amount);
    }
    if(base.previousElementSibling!==amount)amount.after(base);
    const summary=el('multiVoucherBalance');
    const sync=()=>{
      if(card.classList.contains('spend-voucher'))return;
      const n=Number(summary?.dataset.base);
      const output=el('ratibCompoundAmountValue');
      if(output)output.textContent=Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:6}):'—';
    };
    if(summary&&!compoundObserver){
      compoundObserver=new MutationObserver(sync);
      compoundObserver.observe(summary,{attributes:true,attributeFilter:['data-base']});
      el('multiVoucherBaseCurrency')?.addEventListener('change',()=>queueMicrotask(sync));
    }
    sync();
  }
  function init(){
    arrangeSimple();arrangeCompound();
    const selector=el('voucherSelectorCard');
    if(selector&&!selector.dataset.ratibJournalArrange){
      selector.dataset.ratibJournalArrange='1';
      selector.addEventListener('click',()=>queueMicrotask(()=>{arrangeSimple();arrangeCompound();}));
    }
    window.addEventListener('pageshow',()=>{arrangeSimple();arrangeCompound();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}());