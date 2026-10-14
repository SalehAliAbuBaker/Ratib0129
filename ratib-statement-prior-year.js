(function ratibPriorYearStatement(){
"use strict";
const scopes=new Map();
const closings=()=>store.get("annual_closures_v1",{})||{};
const activeClosures=()=>Object.keys(closings()).filter(y=>/^\d{4}$/.test(y)).sort((a,b)=>b.localeCompare(a));
const yearOf=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))?String(s).slice(0,4):"";
const panelId=()=>accountOpsUi?.panelId||"accountOperationsStandalonePanel";
const keyFor=id=>id==="reportAccountOpsPanel"?"reportAccountOpsPanel":"accountOperationsStandalonePanel";
function fiscalContext(){
 const from=accountOpsState?.from||"",to=accountOpsState?.to||"",years=activeClosures();
 if(!years.length||!accountOpsState?.accountName)return null;
 const current=yearOf(from)||yearOf(to)||String(Number(years[0])+1);
 const prior=years.filter(y=>Number(y)<Number(current));
 return prior.length?{year:current,prior}:null;
}
function viewState(){
 const id=keyFor(panelId()),account=accountOpsState?.accountName||"";
 let state=scopes.get(id);
 if(!state||state.account!==account){
  state={account,enabled:false,selected:""};scopes.set(id,state);
 }
 return state;
}
function effectiveFrom(input){
 const original=String(input||"");
 const context=fiscalContext();
 if(!context)return original;
 const v=viewState();
 if(v.enabled){
  const year=context.prior.includes(v.selected)?v.selected:context.prior[0];
  // Include the selected closed year and any intervening years, without a second opening posting.
  const requested=year+"-01-01";
  return original&&original<requested?original:requested;
 }
 // An unfiltered statement in a later financial year begins with the rolled-forward balance.
 // Explicit user date filters, including historical periods, are respected verbatim.
 if(original)return original;
 return context.year+"-01-01";
}
window.ratibStatementEffectiveFrom=effectiveFrom;
function buildControls(account,ui){
 const context=fiscalContext(),id=keyFor(ui?.panelId||panelId());
 const host=document.getElementById(id);
 if(!host)return;
 host.querySelectorAll(".ratib-prior-controls").forEach(n=>n.remove());
 if(!context)return;
 const state=viewState();
 const bar=document.createElement("section");bar.className="ratib-prior-controls no-print";
 bar.setAttribute("aria-label","إظهار حركات السنوات المالية السابقة");
 bar.style.cssText="margin:0 0 9px;padding:9px 10px;border:1px solid var(--border);background:var(--card);border-radius:10px;direction:rtl;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";
 const label=document.createElement("label");label.style.cssText="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;font-size:12px;";
 const input=document.createElement("input");input.type="checkbox";input.checked=!!state.enabled;input.setAttribute("aria-label","تضمين حركات سنة مالية مغلقة سابقة");input.style.cssText="width:18px;height:18px;flex:0 0 18px;margin:0;";
 const txt=document.createElement("span");txt.textContent="تضمين حركات سنة مالية مغلقة سابقة";
 label.append(input,txt);
 const select=document.createElement("select");select.setAttribute("aria-label","اختيار السنة المالية المغلقة المطلوب تضمينها");
 select.style.cssText="width:auto;min-height:36px;max-width:100%;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:8px;padding:5px 9px;font-size:12px;";
 for(const y of context.prior){
  const option=document.createElement("option");option.value=y;option.textContent="من سنة "+y+" حتى "+context.year;
  select.appendChild(option);
 }
 if(!context.prior.includes(state.selected))state.selected=context.prior[0];
 select.value=state.selected;select.disabled=!state.enabled;
 const note=document.createElement("small");note.style.cssText="flex:1 1 100%;font-size:11px;color:var(--muted);line-height:1.5";
 const updateNote=()=>{
  const from=effectiveFrom(accountOpsState?.from||"");
  note.textContent=state.enabled
    ?`تُعرض الحركات من ${from} إلى نهاية الفترة المحددة، وتشمل السنوات المغلقة للقراءة فقط. الرصيد السابق محسوب مرة واحدة دون قيد افتتاحي مكرر.`
    :`الكشف يبدأ من ${from} ويعرض الرصيد السابق المُدوّر تلقائيًا. فعّل الخيار لاستعراض الحركات التاريخية أيضًا.`;
 };
 const rerender=()=>{
  if(accountOpsState?.accountName!==account)return;
  renderAccountOperations(account,accountOpsState.scopeNames,ui);
 };
 input.addEventListener("change",()=>{
  state.enabled=input.checked;state.selected=select.value||context.prior[0];select.disabled=!state.enabled;
  rerender();
 });
 select.addEventListener("change",()=>{
  state.selected=select.value;state.enabled=true;rerender();
 });
 updateNote();bar.append(label,select,note);
 host.prepend(bar);
}
const previousRender=renderAccountOperations;
renderAccountOperations=function(accountName,scopeNames=null,ui=null){
 const result=previousRender.apply(this,arguments);
 if(accountName)buildControls(accountName,ui);
 return result;
};
})();
