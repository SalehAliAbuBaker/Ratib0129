(function trialBackupImporter(){
'use strict';
const banner=document.getElementById('ratibTrialBanner');
if(!banner)return;
const action=document.createElement('button');action.type='button';action.textContent='📥 نسخ بيانات الرسمية للتجربة';action.style.cssText='display:inline-block;margin:5px 8px;padding:6px 9px;border:1px solid #b58532;background:white;border-radius:7px;color:#643c00;font-weight:700;font-size:12px;cursor:pointer';
banner.appendChild(action);
const dialog=document.createElement('div');dialog.style.cssText='display:none;position:fixed;inset:0;z-index:100011;background:#0009;align-items:center;justify-content:center;padding:15px;direction:rtl';
dialog.innerHTML=`<div style="background:white;color:#1e293b;border-radius:13px;padding:18px;max-width:520px;width:100%;max-height:85vh;overflow:auto;text-align:right">
<h2 style="font-size:17px;margin:0 0 8px">نسخ بيانات «راتب» الرسمية إلى التجريبية</h2>
<p style="font-size:13px;line-height:1.8">من التطبيق الرسمي: الإعدادات ← النسخ الاحتياطي ← تنزيل نسخة JSON. اختر الملف هنا لاستيراد الحسابات والسندات وأرصدة البداية إلى <b>التجريبية فقط</b>. لا توجد مزامنة تلقائية، ولا يتغير التطبيق الرسمي. لا تُنقل كلمات المرور أو رموز الترخيص أو إعدادات Google Drive.</p>
<input id="trialImportFile" type="file" accept=".json,application/json" style="max-width:100%;margin:9px 0" aria-label="نسخة بيانات راتب الرسمي">
<p id="trialImportStatus" style="font-size:13px;line-height:1.6"></p>
<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" id="trialImportBackup" class="btn btn-ghost" style="width:auto">1. نسخة احتياطية للتجريبية</button><button type="button" id="trialImportApply" class="btn btn-primary" style="width:auto">2. نسخ البيانات</button><button type="button" id="trialImportCancel" class="btn btn-ghost" style="width:auto">إغلاق</button></div>
</div>`;
document.body.append(dialog);
const get=id=>dialog.querySelector('#'+id),status=(message,error=false)=>{get('trialImportStatus').textContent=message;get('trialImportStatus').style.color=error?'#b91c1c':'#15803d';};
let backedUp=false;
action.onclick=()=>{backedUp=false;status('');dialog.style.display='flex';};
get('trialImportCancel').onclick=()=>{dialog.style.display='none';};
get('trialImportBackup').onclick=async()=>{try{await flushStorage();backedUp=await exportBackupFile();status(backedUp?'جهزنا نسخة التجريبية الحالية. احتفظ بها قبل الاستيراد.':'فشل تجهيز نسخة الأمان.',!backedUp);}catch(e){backedUp=false;status(e.message,true);}};
get('trialImportApply').onclick=async()=>{
 if(!backedUp){status('يجب تجهيز نسخة أمان من البيانات التجريبية أولًا.',true);return;}
 if(Object.keys(store.get('annual_closures_v1',{})||{}).length){status('أعد فتح السنوات المقفلة في التجريبية أولًا، ثم حاول الاستيراد.',true);return;}
 const input=get('trialImportFile'),file=input.files?.[0];
 if(!file){status('اختر ملف JSON المصدر من النسخة الرسمية.',true);return;}
 const apply=get('trialImportApply');apply.disabled=true;
 try{
  if(file.size>40*1024*1024)throw Error('الملف أكبر من 40 ميجابايت.');
  const payload=JSON.parse(await file.text());
  if(payload.app!=='ratib'||payload.encrypted||!payload.data)throw Error('النسخة مشفرة أو ليست نسخة JSON عادية. استخدم نسخة غير مشفرة صادرة من راتب الرسمي، أو اطلب دعم استيراد النسخ المشفرة.');
  const data=payload.data,plan=data.masar_plan,history=data.masar_history;
  if(!plan||!Array.isArray(plan.transactions)||!Array.isArray(history)||history.some(x=>!Array.isArray(x.transactions)))throw Error('ملف رسمي بلا سجلات سليمة أو أرشيف صالح.');
  const docs=[...plan.transactions,...history.flatMap(h=>h.transactions)];
  const existing=[...(store.get('plan',null)?.transactions||[]),...(store.get('history',[])||[]).flatMap(h=>h.transactions||[])];
  if(!confirm(`سيُستبدل دفتر التجريبية الحالي (${existing.length} سطر) بالبيانات الرسمية الواردة في الملف (${docs.length} سطر). التطبيق الرسمي لن يُعدّل. هل توافق؟`))return;
  const selected=[];
  const allowed=new Set(['plan','history','account_catalog','account_tree','account_codes','account_currencies','import_currencies','legacy_import_batches','cats','currency_metadata','account_subgroup_parents','default_accounts','rollover_amount','ledger','accounts_list','account_parent_codes','account_sub_codes','budget','import_decimal_precision']);
  for(const [raw,value] of Object.entries(data)){
   if(!raw.startsWith('masar_'))continue;
   const name=raw.slice(6);
   if(allowed.has(name)||/^tracker_\d{4}-\d{2}$/.test(name))selected.push([name,structuredClone(value)]);
  }
  // Historical imports must not exhaust the trial's 20 newly created documents.
  const licKey='ratib_trial_license_client_v2';
  let license={};try{license=JSON.parse(localStorage.getItem(licKey)||'{}')||{};}catch(_){}
  const baseline=new Set(Array.isArray(license.importedDocumentIds)?license.importedDocumentIds:[]);
  for(const tx of docs){if(!tx||tx.isOpeningBalance||tx.ratibAnnualClosingYear)continue;const id=tx.multiVoucherId||tx.id;if(id!==undefined&&id!==null)baseline.add(String(id));}
  if(selected.length===0)throw Error('لا توجد مفاتيح مالية معروفة في الملف.');
  for(const [name,value] of selected)store.set(name,value);
  license.importedDocumentIds=[...baseline];localStorage.setItem(licKey,JSON.stringify(license));
  await flushStorage();
  status('✓ نُسخت '+docs.length+' سطرًا وبيانات الحسابات إلى التجريبية. سيُعاد فتح النسخة التجريبية الآن.');
  location.reload();
 }catch(e){status('تعذّر الاستيراد: '+e.message,true);}
 finally{apply.disabled=false;}
};
})();
