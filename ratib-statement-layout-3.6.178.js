/* Statement toolbar, screen-only. */
(()=>{'use strict';
 function refresh(){
  const panel=document.getElementById('accountOperationsStandalonePanel');
  const actions=document.querySelector('#pageAccountOperations .account-operations-head-actions');
  if(!panel||!actions||typeof accountOpsState==='undefined')return;
  const page=[...panel.querySelectorAll('.account-currency-page')].find(p=>p.dataset.currency===accountOpsState.activeCurrency);
  let meta=actions.querySelector('.ratib-statement-meta');
  if(!meta){meta=document.createElement('div');meta.className='ratib-statement-meta';meta.setAttribute('aria-live','polite');actions.append(meta);}
  const head=page?.querySelector('.account-operations-head');
  const count=head?.querySelector('small')?.textContent?.match(/[0-9,]+\s*(?:عملية|حركة)/)?.[0]||'';
  const text=page?[page.dataset.currency,count].filter(Boolean).join(' · '):'';
  if(meta.textContent!==text)meta.textContent=text;
 }
 for(const name of ['renderAccountOperations','setAccountCurrencyPage','ratibApplyAccountMovementSearch']){
  const original=window[name];
  if(typeof original==='function')window[name]=function(){const value=original.apply(this,arguments);refresh();return value;};
 }
 refresh();
})();
