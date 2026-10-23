/* Ratib trial 3.6.106.05 — account statement reference bookmarks, UI only. */
(function(){
'use strict';
const STORE_KEY='ratib_statement_card_marks_v1';
const ROW='.account-statement-row[data-tx-id]';
const PANEL='#accountOperationsStandalonePanel,#reportAccountOpsPanel,#accountOperationsPanel,#accountOpsPanel';
const WAIT=520,TOL=13;
let marks=new Set(),loaded=false,mode=false,lastAccount='',press=null,suppress=null,scheduled=false;
const account=()=>typeof accountOpsState==='object'&&accountOpsState?String(accountOpsState.accountName||'').trim():'';
const idFor=row=>JSON.stringify([account(),String(row.dataset.txId)]);
function load(){
 if(loaded)return true;
 if(!window.__ratibProceedInitialized)return false;
 try{
  const raw=store.get(STORE_KEY,[]);
  marks=new Set(Array.isArray(raw)?raw.filter(x=>typeof x==='string').slice(0,5000):[]);
  loaded=true;lastAccount=account();return true;
 }catch(e){console.warn('Statement reference marks unavailable',e);return false;}
}
function count(){
 let n=0;
 for(const item of marks){try{if(JSON.parse(item)[0]===account())n++;}catch(e){}}
 return n;
}
function persist(){
 try{store._setSilent(STORE_KEY,[...marks]);return true;}
 catch(e){console.warn('Statement mark persistence',e);if(typeof showToast==='function')showToast('تعذّر حفظ علامة البطاقة','error');return false;}
}
function repaint(){
 if(!load())return;
 if(lastAccount!==account()){mode=false;lastAccount=account();stopPress();}
 const total=count();
 for(const panel of document.querySelectorAll(PANEL)){
  const cards=panel.querySelectorAll(ROW);
  if(!cards.length)continue;
  for(const row of cards){
   const selected=marks.has(idFor(row));
   row.classList.toggle('ratib-statement-marked',selected);
   row.classList.toggle('ratib-statement-mark-mode',mode);
   row.setAttribute('aria-pressed',String(selected));
   row.setAttribute('role','button');
   if(!row.hasAttribute('tabindex'))row.tabIndex=0;
   row.title=selected?'معلّمة للمراجعة — اضغط مطولًا لإزالة العلامة':'اضغط مطولًا لتعليم البطاقة للمراجعة';
  }
  let bar=panel.querySelector(':scope > .ratib-statement-markbar');
  if(!bar){
   bar=document.createElement('div');bar.className='ratib-statement-markbar no-print';
   bar.innerHTML='<span class="ratib-statement-mark-summary" aria-live="polite"></span><div class="ratib-statement-mark-buttons"><button type="button" data-statement-mark-action="mode"></button><button type="button" data-statement-mark-action="clear">إزالة العلامات</button></div>';
   panel.prepend(bar);
  }
  bar.hidden=!mode&&!total;
  const label=bar.querySelector('.ratib-statement-mark-summary');
  const message=(mode?'وضع التعليم: المس البطاقة لإضافة العلامة أو إزالتها. ':'')+'البطاقات المعلّمة: '+total;
  if(label.textContent!==message)label.textContent=message;
  const button=bar.querySelector('[data-statement-mark-action="mode"]');
  const name=mode?'إنهاء التعليم':'تعليم المزيد';
  if(button.textContent!==name)button.textContent=name;
  bar.querySelector('[data-statement-mark-action="clear"]').hidden=total===0;
 }
}
function schedule(){
 if(scheduled)return;scheduled=true;
 queueMicrotask(()=>{scheduled=false;repaint();});
}
function toggle(row){
 if(!load()||!account()||!row?.dataset?.txId)return false;
 const id=idFor(row),had=marks.has(id);
 if(had)marks.delete(id);else marks.add(id);
 if(!persist()){if(had)marks.add(id);else marks.delete(id);return false;}
 repaint();return true;
}
function stopPress(){if(press){clearTimeout(press.timer);press=null;}}
function longPress(row){
 if(!row?.isConnected)return;
 mode=true;
 if(toggle(row))suppress={id:idFor(row),expires:Date.now()+750};
 else{mode=false;repaint();}
}
function excluded(e){return !!e.target.closest?.('button,a,input,select,textarea,summary,[contenteditable="true"]');}
function init(){
 if(window.RatibStatementMarks)return;
 const style=document.createElement('style');style.id='ratib-statement-reference-marks-css';
 style.textContent=[
  '@media screen {',
  '.account-statement-row[data-tx-id]{-webkit-touch-callout:none;touch-action:auto}',
  '.account-statement-row[data-tx-id].ratib-statement-marked{background:color-mix(in srgb,#f6d46b 28%,var(--card))!important;border-inline-start:5px solid #bf8b15!important;box-shadow:inset 0 0 0 1px #d1a72f66!important}',
  '.account-statement-row[data-tx-id].ratib-statement-marked::after{content:"★ معلّمة";display:block;grid-column:1/-1;text-align:right;font-size:.74rem;font-weight:800;color:#926713}',
  '.account-statement-row[data-tx-id].ratib-statement-mark-mode{cursor:crosshair;user-select:none;-webkit-user-select:none}',
  '.ratib-statement-markbar{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:5px 0 9px;padding:9px;border-radius:9px;border:1px solid #c5a447;background:color-mix(in srgb,#f5d985 16%,var(--card));font-size:.83rem;font-weight:750}',
  '.ratib-statement-markbar[hidden],.ratib-statement-markbar button[hidden]{display:none!important}',
  '.ratib-statement-mark-buttons{display:flex;gap:6px;flex-wrap:wrap}',
  '.ratib-statement-mark-buttons button{width:auto!important;min-height:35px!important;margin:0!important;padding:5px 10px!important;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:7px;font:inherit}',
  '}'
 ].join('\n');
 document.head.append(style);
 document.addEventListener('pointerdown',e=>{
  const row=e.target.closest?.(ROW);
  if(!row||!row.closest(PANEL)||excluded(e)||e.button!==undefined&&e.button!==0||!load())return;
  stopPress();
  const pending={row,x:e.clientX||0,y:e.clientY||0,id:e.pointerId,fired:false,timer:null};
  pending.timer=setTimeout(()=>{if(press!==pending)return;pending.fired=true;longPress(row);},WAIT);
  press=pending;
 },true);
 document.addEventListener('pointermove',e=>{
  if(press&&!press.fired&&e.pointerId===press.id&&Math.hypot((e.clientX||0)-press.x,(e.clientY||0)-press.y)>TOL)stopPress();
 },true);
 document.addEventListener('pointerup',stopPress,true);
 document.addEventListener('pointercancel',stopPress,true);
 window.addEventListener('scroll',stopPress,true);
 document.addEventListener('contextmenu',e=>{
  const row=e.target.closest?.(ROW);
  if(!row||!row.closest(PANEL)||excluded(e))return;
  e.preventDefault();
  if(!(suppress&&suppress.id===idFor(row)&&Date.now()<suppress.expires)&&!press?.fired)longPress(row);
  stopPress();
 },true);
 document.addEventListener('click',e=>{
  const action=e.target.closest?.('[data-statement-mark-action]')?.dataset.statementMarkAction;
  if(action){
   e.preventDefault();e.stopImmediatePropagation();
   if(!load())return;
   if(action==='mode'){mode=!mode;repaint();}
   if(action==='clear'){
    const total=count(),current=account();
    if(!total||total>1&&!confirm('إزالة جميع علامات هذا الحساب فقط؟'))return;
    const old=new Set(marks);
    for(const item of marks){try{if(JSON.parse(item)[0]===current)marks.delete(item);}catch(_){}}
    if(!persist())marks=old;
    mode=false;repaint();
   }
   return;
  }
  const row=e.target.closest?.(ROW);
  if(!row||!row.closest(PANEL)||excluded(e)||!load())return;
  if(suppress&&suppress.id===idFor(row)&&Date.now()<suppress.expires){
   suppress=null;e.preventDefault();e.stopImmediatePropagation();return;
  }
  suppress=null;
  if(mode){e.preventDefault();e.stopImmediatePropagation();toggle(row);}
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const row=e.target.closest?.(ROW);
  if(!row||!row.closest(PANEL)||excluded(e)||!load())return;
  e.preventDefault();
  if(mode)toggle(row);else row.click();
 },true);
 const observer=new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.account-currency-track,.account-statement-row[data-tx-id]')||node.querySelector?.(ROW)))))schedule();
 });
 document.querySelectorAll('#pageAccountOperations,#pageReports,#pageAccountsTree').forEach(root=>observer.observe(root,{childList:true,subtree:true}));
 window.addEventListener('pageshow',schedule);
 window.RatibStatementMarks={refresh:schedule,count:()=>load()?count():0,isMarked:id=>load()&&marks.has(JSON.stringify([account(),String(id)])),isSelectionMode:()=>mode};
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();