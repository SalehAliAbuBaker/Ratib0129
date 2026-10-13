/* Ratib — management of imported accounts and opening balances.
   Never deletes ordinary vouchers; every change requires a reviewed preview and backup. */
(()=>{
'use strict';
const ID='ratibImportedAccountsManager';
let busy=false,approved=null;
const $=id=>document.getElementById(id);
const str=v=>String(v??'').trim();
const safe=s=>str(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const dataNow=()=>legacyCurrentData();
const batchList=()=>store.get('legacy_import_batches',[]);
const allTx=data=>(data.masar_plan?.transactions||[]).concat(...(data.masar_history||[]).map(h=>h.transactions||[]));
const accountKey=a=>str(a.matchCode||a.preferredCode)+'|'+str(a.matchName||a.name);
const items=b=>(b?.payload?.accounts||b?.accounts||[]).filter(a=>a&&str(a.id));
const removedIds=b=>new Set(b?.importManagerRemoved||[]);
const dates=b=>{const m=/^legacy_(\d{13})_/.exec(b.id||'');return m?new Date(Number(m[1])).toLocaleDateString('ar'):'';};
function origins(b,data){
 const deleted=removedIds(b),txs=allTx(data),archive=new Set(data.masar_import_archived_accounts||[]);
 return items(b).map(a=>{
   const code=str(a.matchCode||a.preferredCode),name=str(a.matchName||a.name);
   const active=(data.masar_account_catalog||[]).some(r=>(r.details||[]).some(d=>str(d[0])===code&&d[1]===name));
   const openings=txs.filter(t=>t.isOpeningBalance&&t.importBatchId===b.id&&str(t.openingBalance?.sourceAccountId)===str(a.id));
   return {source:a,code,name,active,openings,archived:archive.has(accountKey(a)),removed:deleted.has(a.id)};
 });
}
function decimalUnits(raw){
 const s=str(raw||'0');
 if(!/^\d+(?:\.\d{1,6})?$/.test(s))throw Error('مبلغ افتتاحي غير صالح أو يتجاوز 6 منازل عشرية: '+s);
 const parts=s.split('.');
 return BigInt(parts[0])*1000000n+BigInt((parts[1]||'').padEnd(6,'0'));
}
function displayUnits(value){
 const sign=value<0n?'-':'';
 const abs=value<0n?-value:value;
 const frac=str(abs%1000000n).padStart(6,'0').replace(/0+$/,'');
 return sign+str(abs/1000000n)+(frac?'.'+frac:'');
}
function referenced(tx,name){
 if(tx.debitAccount===name||tx.creditAccount===name||tx.openingBalance?.account===name)return true;
 const complex=tx.multiVoucher||tx.lines||[];
 return JSON.stringify(complex).includes(JSON.stringify(name));
}
function inFinancialDrafts(data,name){
 const values=[data.masar_multi_voucher_drafts,data.masar_single_voucher_draft_v1,data.masar_default_accounts];
 return values.some(v=>v&&JSON.stringify(v).includes(JSON.stringify(name)));
}
function nextNumber(cat){
 const used=new Set();
 cat.forEach(r=>{['mainCode','groupCode','subCode'].forEach(k=>used.add(str(r[k])));(r.details||[]).forEach(d=>used.add(str(d[0])))});
 let n=900000;while(used.has(str(n)))n++;
 return str(n);
}
function catalogOwners(cat){
 const out=[];
 cat.forEach(r=>{
   ['main','group','sub'].forEach(level=>out.push({name:r[level],code:str(r[level+'Code']),level}));
   (r.details||[]).forEach(d=>out.push({name:d[1],code:str(d[0]),level:'detail'}));
 });
 return out;
}
function restoreOne(cat,a){
 const code=str(a.matchCode||a.preferredCode),name=str(a.matchName||a.name);
 if(!code||!/^\d+$/.test(code)||!name)throw Error('لا يتوفر رقم أصلي صالح لاستعادة الحساب: '+(name||a.name));
 const owners=catalogOwners(cat);
 if(owners.some(o=>o.code===code&&o.name===name&&o.level==='detail'))return false;
 const byNumber=owners.find(o=>o.code===code);
 if(byNumber)throw Error('لا يمكن استعادة ['+code+'] '+name+'؛ الرقم مشغول بالحساب «'+byNumber.name+'».');
 const byName=owners.find(o=>o.name===name);
 if(byName)throw Error('يوجد حساب آخر باسم «'+name+'». يجب مراجعته قبل الاستعادة.');
 const rawPath=a.targetPath||a.path?.slice(0,-1);
 if(!Array.isArray(rawPath)||!rawPath.length)throw Error('لم يُحفظ المسار السابق للحساب '+name+'. لا يمكن تخمين الحساب الأب.');
 const path=rawPath.map(str);
 if(path.some(s=>!s||s.length>250))throw Error('مسار الحساب غير مكتمل: '+name);
 const main=path[0],group=path[1]||main,sub=path.slice(2).join(' ← ')||group;
 let row=cat.find(r=>r.main===main&&r.group===group&&r.sub===sub);
 if(!row){
   const mainRows=cat.filter(r=>r.main===main);
   const groupRows=cat.filter(r=>r.main===main&&r.group===group);
   const priorGroup=cat.find(r=>r.group===group&&r.main!==main);
   const priorSub=cat.find(r=>r.sub===sub&&!(r.main===main&&r.group===group));
   if(priorGroup||priorSub)throw Error('المسار «'+main+' ← '+group+' ← '+sub+'» يتعارض مع تصنيف موجود. أعد الحساب الأب يدويًا أولًا.');
   const mainCode=mainRows.length?str(mainRows[0].mainCode):nextNumber(cat);
   const groupCode=groupRows.length?str(groupRows[0].groupCode):nextNumber(cat.concat([{mainCode,groupCode:mainCode,subCode:mainCode,details:[]}]));
   const subCode=nextNumber(cat.concat([{mainCode,groupCode,subCode:groupCode,details:[]}]));
   row={main,mainCode,group,groupCode,sub,subCode,details:[]};
   if([mainCode,groupCode,subCode].includes(code))throw Error('رقم الحساب التفصيلي يتعارض مع أحد المستويات العليا.');
   cat.push(row);
 }
 row.details.push([code,name]);
 return true;
}
function prepare(batchId,ids,action,removeEmpty){
 const original=dataNow(),data=cloneData(original),batch=(data.masar_legacy_import_batches||[]).find(b=>b.id===batchId);
 if(!batch)throw Error('تعذر تحديد دفعة الاستيراد.');
 const selected=origins(batch,data).filter(x=>ids.includes(str(x.source.id)));
 if(!selected.length||selected.length!==ids.length)throw Error('اختر حسابًا واحدًا على الأقل من الدفعة.');
 const meta={count:selected.length,openings:0,accounts:0,archived:0,restored:0,balances:[],warnings:[]};
 const savedArchive=new Set(data.masar_import_archived_accounts||[]);
 if(action==='archive'||action==='show'){
   for(const row of selected){
     if(!row.active){meta.warnings.push('الحساب «'+row.name+'» غير موجود في الدليل الحالي.');continue;}
     if(action==='archive')savedArchive.add(accountKey(row.source));
     else savedArchive.delete(accountKey(row.source));
     meta.archived++;
   }
   if(!meta.archived)throw Error('لا توجد حسابات نشطة لتنفيذ هذا الإجراء.');
   data.masar_import_archived_accounts=[...savedArchive];
 }else if(action==='restore'){
   for(const row of selected){
     if(restoreOne(data.masar_account_catalog,row.source))meta.restored++;
     savedArchive.delete(accountKey(row.source));
   }
   if(!meta.restored)throw Error('الحسابات المحددة موجودة بالفعل؛ لا تحتاج إلى استعادة.');
   data.masar_import_archived_accounts=[...savedArchive];
   data.masar_account_tree=canonicalTreeProjection(data.masar_account_catalog);
   const codes={...(data.masar_account_codes||{})};
   data.masar_account_catalog.forEach(r=>{
     ['main','group','sub'].forEach(level=>{codes[r[level]]=str(r[level+'Code'])});
     (r.details||[]).forEach(d=>{codes[d[1]]=str(d[0])});
   });
   data.masar_account_codes=codes;
   meta.warnings.push('تُستعاد الحسابات إلى الدليل فقط؛ لا تُعاد الأرصدة التي حُذفت سابقًا إلا من النسخة الاحتياطية أو باستيراد جديد بعد المراجعة.');
 }else if(action==='remove'){
   const toRemove=new Set(),delta=new Map();
   for(const row of selected)for(const tx of row.openings){
     if(toRemove.has(tx.id))throw Error('رصيد افتتاحي مكرر في الدفعة؛ راجع السجل أولًا.');
     toRemove.add(tx.id);
     const o=tx.openingBalance||{},cur=str(o.baseCurrency||tx.currency||'YER');
     delta.set(cur,(delta.get(cur)||0n)+decimalUnits(o.baseDebit)-decimalUnits(o.baseCredit));
   }
   for(const [cur,balance] of delta){
     meta.balances.push(cur+': الفرق '+displayUnits(balance));
     if(balance!==0n)throw Error('لا يمكن حذف هذه الأرصدة منفردة؛ سيختل القيد الافتتاحي بعملة '+cur+' بمقدار '+displayUnits(balance)+'. اختر الحسابات المقابلة المتوازنة معها.');
   }
   const sourceIds=new Set(selected.map(row=>str(row.source.id)));
   const erase=list=>list.filter(t=>!(t.isOpeningBalance&&t.importBatchId===batch.id&&toRemove.has(t.id)&&sourceIds.has(str(t.openingBalance?.sourceAccountId))));
   if(data.masar_plan?.transactions)data.masar_plan.transactions=erase(data.masar_plan.transactions);
   for(const h of data.masar_history||[])h.transactions=erase(h.transactions||[]);
   meta.openings=toRemove.size;
   if(removeEmpty){
     const allLeft=allTx(data),cat=data.masar_account_catalog||[],codes={...(data.masar_account_codes||{})};
     for(const row of selected){
       if(!row.active){meta.warnings.push('الحساب '+row.name+' غير موجود في الشجرة.');continue;}
       if(allLeft.some(tx=>referenced(tx,row.name))||inFinancialDrafts(data,row.name)){
         meta.warnings.push('أُزيل الرصيد فقط من «'+row.name+'»؛ بقي الحساب لأنه مرتبط بمستند أو مسودة أخرى.');
         continue;
       }
       let found=false;
       for(const r of cat){const before=r.details.length;r.details=r.details.filter(d=>!(str(d[0])===row.code&&d[1]===row.name));if(r.details.length!==before)found=true;}
       if(found){
         meta.accounts++;
         if(str(codes[row.name])===row.code)delete codes[row.name];
         delete data.masar_account_currencies?.[row.name];
         savedArchive.delete(accountKey(row.source));
       }
     }
     data.masar_account_codes=codes;
     data.masar_import_archived_accounts=[...savedArchive];
     data.masar_account_tree=canonicalTreeProjection(cat);
   }
   const gone=new Set(batch.importManagerRemoved||[]);
   for(const row of selected)gone.add(row.source.id);
   batch.importManagerRemoved=[...gone];
   if(!meta.openings&&!meta.accounts)throw Error('لا يوجد رصيد أو حساب قابل للحذف في العناصر المحددة.');
   meta.warnings.push('لا تُمس أي سندات أو قيود أخرى؛ تظل معلومات دفعة الاستيراد محفوظة للرجوع إليها.');
 }else throw Error('الإجراء المطلوب غير معروف.');
 delete data.masar_legacy_import_undo;
 data.masar_import_manager_actions=[...(data.masar_import_manager_actions||[]),{
   at:new Date().toISOString(),batchId,action,sourceIds:ids,count:meta.count,
   removedOpeningCount:meta.openings,removedAccountCount:meta.accounts
 }].slice(-300);
 return {data,meta,fingerprint:legacyFinancialFingerprint(original)};
}
function optionsSignature(){
 return JSON.stringify([$('ratibImportBatch').value,
 [...document.querySelectorAll('.ratib-import-check:checked')].map(x=>x.value).sort(),
 $('ratibImportAction').value,$('ratibRemoveEmpty').checked]);
}
function renderRows(){
 approved=null;$('ratibImportCommit').disabled=true;$('ratibImportReview').textContent='';
 const b=batchList().find(x=>x.id===$('ratibImportBatch').value);
 const tbody=$('ratibImportRows');
 if(!b){tbody.textContent='لا توجد دفعات استيراد محفوظة في هذا الجهاز.';return;}
 const rows=origins(b,dataNow());
 tbody.innerHTML=rows.map(r=>{
   const status=r.active?(r.archived?'مؤرشف':'نشط'):'غير ظاهر';
   const removed=r.removed?'؛ حُذف رصيد مستورد سابقًا':'';
   return '<label class="ratib-import-row"><input type="checkbox" class="ratib-import-check" value="'+safe(r.source.id)+'"><span><b>['+safe(r.code||'—')+'] '+safe(r.name)+'</b><small>'+safe(status+removed)+' · '+r.openings.length+' رصيد مستورد</small></span></label>';
 }).join('')||'لا توجد حسابات في الدفعة.';
 tbody.querySelectorAll('input').forEach(el=>el.onchange=invalidate);
}
function invalidate(){approved=null;$('ratibImportCommit').disabled=true;$('ratibImportReview').textContent='';}
function review(){
 try {
   const signature=optionsSignature(),args=JSON.parse(signature);
   const plan=prepare(args[0],args[1],args[2],args[3]);
   const m=plan.meta;
   $('ratibImportReview').textContent='المعاينة: '+m.count+' حساب محدد؛ '+m.openings+' رصيد سيُحذف؛ '+m.accounts+' حساب سيُزال من الشجرة؛ '+m.archived+' حالة إخفاء/إظهار؛ '+m.restored+' حساب سيُستعاد.'+
     (m.balances.length?'\nميزان الأرصدة المختارة: '+m.balances.join('، '):'')+
     (m.warnings.length?'\n'+m.warnings.join('\n'):'')+
     '\nلن يتغير شيء حتى تضغط «تأكيد التنفيذ».';
   approved={signature,fingerprint:plan.fingerprint};
   $('ratibImportCommit').disabled=false;
 }catch(error){$('ratibImportReview').textContent='تعذرت المعاينة: '+error.message;invalidateExceptMessage();}
}
function invalidateExceptMessage(){approved=null;$('ratibImportCommit').disabled=true;}
async function commit(){
 if(busy||!approved||approved.signature!==optionsSignature())return;
 if(!confirm('ستُنشأ نسخة احتياطية أولًا. هل تؤكد تنفيذ الإجراء الذي راجعته؟'))return;
 busy=true;$('ratibImportCommit').disabled=true;
 try{
   await flushStorage();
   if(typeof _pendingFinancialCompletion!=='undefined'&&_pendingFinancialCompletion)throw Error('أكمل حفظ السند الجاري أولًا.');
   const args=JSON.parse(approved.signature),plan=prepare(args[0],args[1],args[2],args[3]);
   if(plan.fingerprint!==approved.fingerprint)throw Error('تغيرت بيانات راتب بعد المعاينة. أعد المعاينة قبل التنفيذ.');
   const backup=await buildBackupPayload();
   downloadBackupPayload(backup,'ratib-before-import-management-'+Date.now()+'.json');
   await legacyPersistSnapshot(plan.data);
   $('ratibImportReview').textContent='تم الحفظ بنجاح مع تنزيل نسخة احتياطية. سيعاد تحميل التطبيق لتحديث الشجرة والكشوف.';
   setTimeout(()=>location.reload(),600);
 }catch(error){$('ratibImportReview').textContent='لم يُنفذ الإجراء: '+error.message;approved=null;}
 finally{busy=false;}
}
function open(){
 if(typeof getSecurityConfig==='function'&&getSecurityConfig().enabled&&!_vaultCryptoKey){
   showToast('افتح قفل البيانات المالية أولًا.','warn');return;
 }
 const batches=batchList(),select=$('ratibImportBatch');
 select.innerHTML=batches.map(b=>'<option value="'+safe(b.id)+'">'+safe(b.sourceLabel||'مصدر خارجي')+' — تاريخ البيانات '+safe(b.cutoff||'غير محدد')+(dates(b)?' — أُدخلت '+safe(dates(b)):'')+'</option>').join('');
 if(batches.length)select.value=batches.at(-1).id;
 $('ratibImportAction').value='archive';$('ratibRemoveEmpty').checked=false;
 renderRows();
 $('ratibImportModal').style.display='flex';
}
function close(){if(busy)return;$('ratibImportModal').style.display='none';}
function boot(){
 if(!document.getElementById('legacyImportModal'))return;
 const style=document.createElement('style');style.textContent=
 '#ratibImportModal{position:fixed;inset:0;z-index:100010;display:none;align-items:center;justify-content:center;background:#0009;padding:12px;direction:rtl}' +
 '#ratibImportModal .rim-box{background:var(--card,#fff);color:var(--text,#111);border-radius:14px;width:min(700px,100%);max-height:94vh;overflow:auto;padding:16px}' +
 '#ratibImportModal .rim-head{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
 '#ratibImportModal .rim-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}' +
 '#ratibImportModal .rim-options label{display:block;font-weight:600}#ratibImportModal select{width:100%;min-height:42px}' +
 '#ratibImportRows{max-height:39vh;overflow:auto;border:1px solid var(--border,#ccc);border-radius:8px}' +
 '#ratibImportRows .ratib-import-row{display:flex;align-items:center;gap:10px;padding:9px;border-bottom:1px solid var(--border,#ddd);cursor:pointer}' +
 '#ratibImportRows .ratib-import-row input{width:20px;height:20px;flex:none}' +
 '#ratibImportRows small{display:block;color:var(--muted,#666)}#ratibImportReview{white-space:pre-line;padding:10px;margin:10px 0;background:var(--bg,#fafafa);border-radius:9px}' +
 '#ratibImportModal .rim-actions{display:flex;gap:7px;flex-wrap:wrap}#ratibImportModal button{min-height:42px}' +
 '@media(max-width:560px){#ratibImportModal .rim-options{grid-template-columns:1fr}}@media print{#ratibImportModal{display:none!important}}';
 document.head.appendChild(style);
 const button=document.createElement('button');button.type='button';button.className='btn btn-ghost';button.textContent='إدارة الحسابات والأرصدة المستوردة';
 $('loadLegacyImportBtn').after(button);
 button.onclick=()=>{closeLegacyImport();open();};
 const launch=document.createElement('button');launch.type='button';launch.className='btn btn-ghost';launch.textContent='إدارة الحسابات المستوردة';launch.style.cssText='margin:8px 0;width:100%';
 const entry=$('legacyImportSidebarBtn');entry.after(launch);launch.onclick=open;
 const modal=document.createElement('div');modal.id='ratibImportModal';modal.className='no-print';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','إدارة الحسابات والأرصدة المستوردة');
 modal.innerHTML='<div class="rim-box"><div class="rim-head"><strong>إدارة الحسابات والأرصدة المستوردة</strong><button id="ratibImportClose" type="button" class="btn btn-ghost">إغلاق ×</button></div>'+
 '<p>اختر الدفعة والحسابات. الحذف لا يمس السندات اللاحقة، ولا يُنفذ إذا اختل توازن الأرصدة المختارة.</p>'+
 '<label>دفعة الاستيراد<select id="ratibImportBatch"></select></label>'+
 '<div class="rim-options"><label>الإجراء<select id="ratibImportAction"><option value="archive">إخفاء من الشجرة دون حذف البيانات</option><option value="show">إظهار حسابات مؤرشفة</option><option value="remove">إزالة أرصدة افتتاحية مختارة</option><option value="restore">استعادة حسابات محذوفة إلى مسارها</option></select></label>'+
 '<label><input id="ratibRemoveEmpty" type="checkbox"> عند حذف الرصيد، احذف الحساب من الشجرة إذا لم يعد مرتبطًا بأي حركة أو مسودة</label></div>'+
 '<div class="rim-actions"><button type="button" id="ratibImportAll" class="btn btn-ghost">تحديد الكل</button><button type="button" id="ratibImportNone" class="btn btn-ghost">إلغاء التحديد</button></div>'+
 '<div id="ratibImportRows"></div><div id="ratibImportReview" role="status"></div>'+
 '<div class="rim-actions"><button type="button" id="ratibImportPreview" class="btn btn-ghost">معاينة الأثر</button><button type="button" id="ratibImportCommit" class="btn btn-primary" disabled>تأكيد التنفيذ بعد نسخة احتياطية</button></div></div>';
 document.body.appendChild(modal);
 $('ratibImportClose').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 $('ratibImportBatch').onchange=renderRows;
 $('ratibImportAction').onchange=()=>{$('ratibRemoveEmpty').disabled=$('ratibImportAction').value!=='remove';invalidate();};
 $('ratibRemoveEmpty').onchange=invalidate;
 $('ratibImportRemoveDummy')?.remove();
 $('ratibImportAll').onclick=()=>{document.querySelectorAll('.ratib-import-check').forEach(x=>x.checked=true);invalidate();};
 $('ratibImportNone').onclick=()=>{document.querySelectorAll('.ratib-import-check').forEach(x=>x.checked=false);invalidate();};
 $('ratibImportPreview').onclick=review;$('ratibImportCommit').onclick=commit;
 $('ratibRemoveEmpty').disabled=true;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.style.display==='flex')close();});
}
window.ratibImportVisibleCatalog=function(catalog){
 const hidden=new Set(store.get('import_archived_accounts',[]));
 if(!hidden.size)return catalog;
 return catalog.map(r=>({...r,details:(r.details||[]).filter(d=>!hidden.has(str(d[0])+'|'+str(d[1])))}));
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
