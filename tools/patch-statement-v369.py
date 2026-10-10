from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert '"version":"3.6.8"' in s and "ratib-statement-369" not in s
old="return ad.localeCompare(bd)||(Number(a.timestamp)||0)-(Number(b.timestamp)||0)||(Number(a.seqNum)||0)-(Number(b.seqNum)||0);"
new="return ad.localeCompare(bd)||(Number(a.seqNum)||0)-(Number(b.seqNum)||0)||String(a.id||'').localeCompare(String(b.id||''));"
assert s.count(old)==1
s=s.replace(old,new)
# PDF canvas: project the original six columns into the configured dynamic columns.
old="const col=[margin,margin+180,margin+340,margin+500,margin+950,margin+1130,width-margin],labels=['التاريخ','رقم القيد / المستند','البيان (التفاصيل)','مدين (عليكم)','دائن (لكم)','الرصيد بعد الحركة'];"
new="""const opt=ratibStatementSettings(),labels=['التاريخ',...(opt.document?['رقم القيد / المستند']:[]),'البيان (التفاصيل)',...(opt.counterpart?['الحساب المقابل']:[]),'مدين (عليكم)','دائن (لكم)','الرصيد بعد الحركة'];
  const weights=[140,...(opt.document?[185]:[]),340,...(opt.counterpart?[200]:[]),150,150,175];
  const col=[margin],weightSum=weights.reduce((a,b)=>a+b,0);
  for(const w of weights)col.push(col[col.length-1]+(width-2*margin)*w/weightSum);"""
assert s.count(old)==1
s=s.replace(old,new)
old="if(opening!==0)bodyRows.push({vals:[accountOpsState.from,'—','الرصيد السابق (افتتاحي الفترة)','','',"
new="if(opening!==0)bodyRows.push({vals:[accountOpsState.from,...(opt.document?['—']:[]),'الرصيد السابق (افتتاحي الفترة)',...(opt.counterpart?['']:[]),'','',"
assert s.count(old)==1
s=s.replace(old,new)
old="bodyRows.push({vals:[getAccountOpsDate(t)||'-',doc,note,d?d.toLocaleString():'',c?c.toLocaleString():'',"
new="bodyRows.push({vals:[getAccountOpsDate(t)||'-',...(opt.document?[doc]:[]),note,...(opt.counterpart?[other]:[]),d?d.toLocaleString():'',c?c.toLocaleString():'',"
assert s.count(old)==1
s=s.replace(old,new)
old="(col[6-i]-col[5-i])-20"
assert s.count(old)==1
s=s.replace(old,"(col[col.length-1-i]-col[col.length-2-i])-20")
old="const fmtN=n=>Number(n).toLocaleString(),xR=col[6],xBody=col[3],xDebit=col[2],xCredit=col[1],xBal=col[0];"
assert s.count(old)==1
s=s.replace(old,"const fmtN=n=>Number(n).toLocaleString(),xR=col[col.length-1],xBody=col[3],xDebit=col[2],xCredit=col[1],xBal=col[0];")
# New statement settings implementation placed at the end of the main script, never inside a template.
feature=r"""
/* ratib-statement-369: non-invasive statement display/print/PDF preferences. */
(function(){
 'use strict';
 const KEY='ratib_statement_columns_v1';
 const defaults={document:true,counterpart:true};
 function read(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return {document:v?.document!==false,counterpart:v?.counterpart!==false};}
  catch(e){console.warn('statement preferences unavailable',e);return {...defaults};}
 }
 function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){console.warn('statement preferences could not be saved',e);}}
 window.ratibStatementSettings=read;
 const clean=(t)=>String(t||'');
 const counter=(t,scope)=>{
  const names=new Set(Array.isArray(scope)?scope:[scope]);
  const entry=getAccountEntry(t,Array.from(names));
  const side=entry?.side;
  const name=side==='debit'?t.creditAccount:t.debitAccount;
  return name||'طرف آخر';
 };
 function updateScreen(root){
  try{
   const v=read(),panels=[...root.querySelectorAll('.account-statement-grid')];
   for(const grid of panels){
    const rows=grid.querySelectorAll(':scope > .account-statement-row');
    const count=5+Number(v.document)+Number(v.counterpart);
    for(const row of rows){
     const cells=Array.from(row.children);
     if(row.classList.contains('header')){
      if(!row.querySelector('[data-statement-col="counterpart"]')){
       const c=document.createElement('span');c.dataset.statementCol='counterpart';c.textContent='الحساب المقابل';cells[2]?.after(c);
      }
     }else if(row.hasAttribute('data-tx-id')){
      if(!row.querySelector('[data-statement-col="counterpart"]')){
       const tx=getAllTransactions().find(t=>String(t.id)===row.dataset.txId);
       const c=document.createElement('span');c.dataset.statementCol='counterpart';c.textContent=tx?counter(tx,accountOpsState.scopeNames):'—';cells[2]?.after(c);
      }
     }
     if(row.classList.contains('header')||row.hasAttribute('data-tx-id')){
      const all=Array.from(row.children);
      if(all[1])all[1].style.display=v.document?'':'none';
      const opposite=row.querySelector('[data-statement-col="counterpart"]');
      if(opposite)opposite.style.display=v.counterpart?'':'none';
     }else if(row.classList.contains('opening')){
      // Opening balances have no document or counterpart; preserve their accounting amount.
      cells.forEach((c,i)=>{if(i!==0&&i!==2&&i!==5)c.style.display='none';});
      if(cells[2])cells[2].style.gridColumn='2 / -2';
      if(cells[5])cells[5].style.gridColumn='-2 / -1';
     }else if(row.classList.contains('total')){
      if(cells.length===4){
       cells[0].style.gridColumn='1 / '+(count-2);
       for(let i=1;i<4;i++)cells[i].style.gridColumn=(count-3+i)+' / '+(count-2+i);
      }else if(cells.length===2){
       cells[0].style.gridColumn='1 / '+count;
       cells[1].style.gridColumn=count+' / '+(count+1);
      }
     }
    }
    const widths=[110,...(v.document?['minmax(115px,1fr)']:[]),'minmax(180px,2fr)',...(v.counterpart?['minmax(140px,1.2fr)']:[]),'minmax(90px,1fr)','minmax(90px,1fr)','minmax(110px,1.1fr)'];
    grid.querySelectorAll('.account-statement-row').forEach(row=>{row.style.gridTemplateColumns=widths.join(' ');});
    grid.style.minWidth=Math.max(620,110+(v.document?115:0)+180+(v.counterpart?140:0)+90+90+110)+'px';
   }
  }catch(e){console.error('statement display options:',e);}
 }
 const oldRender=renderAccountOperations;
 renderAccountOperations=function(...args){
  const result=oldRender.apply(this,args);
  const root=document.getElementById((args[2]||accountOpsUi)?.panelId||'reportAccountOpsPanel');
  if(root)updateScreen(root);
  return result;
 };
 function updatePrint(){
  try{
   const t=document.querySelector('#printStatementContainer .ps-table');
   if(!t)return;
   const v=read(),tr=t.tHead?.rows[0],body=t.tBodies[0];
   if(!tr||!body)return;
   // The existing document column is toggled, not duplicated.
   if(!tr.querySelector('[data-statement-col="counterpart"]')){
    const th=document.createElement('th');th.dataset.statementCol='counterpart';th.textContent='الحساب المقابل';
    tr.cells[2]?.after(th);
   }
   tr.cells[1].style.display=v.document?'':'none';
   const otherHead=tr.querySelector('[data-statement-col="counterpart"]');if(otherHead)otherHead.style.display=v.counterpart?'':'none';
   const rows=Array.from(body.rows),amountColumns=3,columnCount=5+Number(v.document)+Number(v.counterpart);
   for(const row of rows){
    if(row.classList.contains('ps-total-row')){
     if(row.cells[0])row.cells[0].colSpan=columnCount-amountColumns;
    }else if(row.cells.length>=6&&row.cells[0].colSpan===1){
     const cell=row.cells[1];if(cell)cell.style.display=v.document?'':'none';
     if(!row.querySelector('[data-statement-col="counterpart"]')){
      const td=document.createElement('td');td.dataset.statementCol='counterpart';td.textContent=row.dataset.statementCounterpart||'—';row.cells[2]?.after(td);
     }
     const c=row.querySelector('[data-statement-col="counterpart"]');if(c)c.style.display=v.counterpart?'':'none';
    }else if(row.cells[0]?.colSpan>1)row.cells[0].colSpan=columnCount-1;
   }
  }catch(e){console.error('statement print options:',e);}
 }
 const oldPrint=preparePrintStatementTemplate;
 preparePrintStatementTemplate=function(accountName,txs,...rest){
  const result=oldPrint.call(this,accountName,txs,...rest);
  try{
   const rows=Array.from(document.querySelectorAll('#psTableBody tr:not(.ps-total-row)')).filter(r=>r.cells.length===6&&r.cells[0].colSpan===1);
   const selected=accountName==='ALL'?txs:txs.filter(t=>t.debitAccount===accountName||t.creditAccount===accountName);
   rows.forEach((row,i)=>{const t=selected[i];if(t)row.dataset.statementCounterpart=counter(t,[accountName]);});
  }catch(e){console.warn('statement counterpart mapping:',e);}
  updatePrint();
  return result;
 };
 function refresh(){
  try{
   document.querySelectorAll('#reportAccountOpsPanel,#accountOperationsPanel,#accountOpsPanel').forEach(updateScreen);
   document.querySelectorAll('.account-currency-viewport').forEach(updateScreen);
   updatePrint();
   const acc=accountOpsState?.accountName;
   if(acc&&document.getElementById('accountOperationsScreenTitle'))renderAccountOperations(acc,accountOpsState.scopeNames,accountOpsUi);
  }catch(e){console.warn('statement refresh:',e);}
 }
 function init(){
  const settings=document.getElementById('pageSettings');
  if(!settings)return;
  const card=document.createElement('div');
  card.className='card settings-accordion-card';
  card.id='ratibStatementOptions';
  card.innerHTML='<div class="settings-accordion-header" role="button" tabindex="0" aria-expanded="false"><span>🖨️ خيارات عرض وطباعة كشف الحساب</span><span class="accordion-arrow">▼</span></div><div class="settings-accordion-body"><p style="color:var(--muted);font-size:.92rem;margin-bottom:10px">تُطبَّق الاختيارات على كشف الحساب والطباعة وPDF.</p><label style="display:flex;gap:9px;align-items:center;margin:10px 0"><input type="checkbox" data-statement-setting="document" style="width:20px;height:20px"> رقم القيد / المستند</label><label style="display:flex;gap:9px;align-items:center;margin:10px 0"><input type="checkbox" data-statement-setting="counterpart" style="width:20px;height:20px"> الحساب المقابل (مدين / دائن)</label></div>';
  settings.prepend(card);
  const header=card.querySelector('.settings-accordion-header');
  header.addEventListener('click',()=>{
   const body=card.querySelector('.settings-accordion-body'),open=body.classList.toggle('open');
   header.setAttribute('aria-expanded',String(open));header.querySelector('.accordion-arrow').textContent=open?'▲':'▼';
  });
  header.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();header.click();}});
  const state=read();
  card.querySelectorAll('[data-statement-setting]').forEach(input=>{
   input.checked=state[input.dataset.statementSetting];
   input.addEventListener('change',()=>{
    const next=read();next[input.dataset.statementSetting]=input.checked;save(next);refresh();
   });
  });
 }
 try{init();}catch(e){console.error('statement preferences setup:',e);}
})();
"""
# global accessor must be declared in script scope (rather than assigned to window only)
feature=feature.replace(" window.ratibStatementSettings=read;"," window.ratibStatementSettings=read;")
# PDF code uses global accessor resolved through window global object.
pos=s.rfind("</script>")
assert pos>0
s=s[:pos]+feature+"\n"+s[pos:]
s=s.replace("الإصدار 3.6.8","الإصدار 3.6.9")
a=s.index("const RATIB_RELEASE=");b=s.index(";",a)
s=s[:a]+'const RATIB_RELEASE={"version":"3.6.9","changes":["خيارات إظهار رقم القيد والمستند والحساب المقابل في كشف الحساب والطباعة وPDF.","حفظ خيارات الكشف محلياً مع حماية القراءة والكتابة.","ترتيب الحركات حسب تاريخ المستند ثم تسلسل القيد دون تأثير وقت التعديل."]}'+s[b:]
assert '"version":"3.6.9"' in s
p.write_text(s,encoding="utf-8")
