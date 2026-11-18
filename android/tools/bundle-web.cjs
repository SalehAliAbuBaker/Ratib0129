'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dest=path.join(root,'android/app/src/main/assets/www');
fs.mkdirSync(dest,{recursive:true});
const files=[...fs.readdirSync(root).filter(f=>/\.(html|js|css)$/.test(f)&&f!=='sw.js'),'manifest.json','favicon.ico'];
const adapters=['ratib-native-bridge.js','ratib-native-adapter.js','ratib-native-services.js','ratib-biometric.js'];
// This directory holds generated assets only. Remove obsolete top-level web
// files (e.g. the replaced favorites module) without touching source files.
for(const entry of fs.readdirSync(dest,{withFileTypes:true}))if(entry.isFile()&&/\.(html|js|css)$/.test(entry.name)&&!files.includes(entry.name)&&!adapters.includes(entry.name))fs.unlinkSync(path.join(dest,entry.name));
for(const dir of ['vendor','Icons','assets'])fs.cpSync(path.join(root,dir),path.join(dest,dir),{recursive:true});
for(const file of files)if(file!=='index.html'){const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
html=html.replace('<script src="./ratib-biometric.js" defer></script>','');
html=html.replaceAll('.toLocaleString()',".toLocaleString('en-US')").replaceAll(".toLocaleString('ar-EG')",".toLocaleString('ar-EG-u-nu-latn')").replaceAll(".toLocaleTimeString('ar'",".toLocaleTimeString('ar-u-nu-latn'");
function patch(from,to){const hits=typeof from==='string'?html.split(from).length-1:[...html.matchAll(new RegExp(from.source,from.flags.includes('g')?from.flags:from.flags+'g'))].length;if(hits===0&&typeof to==='string'&&html.includes(to)){console.log('Upstream already includes Android hook');return;}if(hits!==1)throw Error('Android compatibility hook changed upstream: '+String(from).slice(0,100)+' (matches '+hits+')');html=html.replace(from,to);}
patch('window.ratibCurrentTrialVersionLabel=()=>`الإصدار ${RATIB_RELEASE.version}`;',"window.ratibCurrentTrialVersionLabel=()=>\"الإصدار 3.6.217 Android\";");
patch('let _storageTimer=null,', 'let androidStorageRead=null;\nlet _storageTimer=null,');
patch('selfHealStorageFromIdb().then(boot)', 'androidStorageRead=selfHealStorageFromIdb();\nandroidStorageRead.then(boot)');
patch('async function _persistPending(){', 'async function _persistPending(){\n  if(androidStorageRead)await androidStorageRead;');
patch('if(!_securityConfigCache.enabled){for(const [key,value] of Object.entries(source))if(!_storageInternalKeys.has(key))_memStore[key]=value;}', `if(!_securityConfigCache.enabled){
    for(const [key,value] of Object.entries(source)){
      // Initial UI defaults may have been queued while the full archive was loading.
      _pendingWrites.delete(key);
      if(!_storageInternalKeys.has(key))_memStore[key]=value;
    }
  }`);

patch('let androidStorageRead=null;', 'let androidStorageRead=null; let androidBackupRevision=0;');
patch('const key=APP_STORAGE_PREFIX+k;_memStore[key]=v;_pendingWrites.set(key,v);', "const key=APP_STORAGE_PREFIX+k;if(k!=='auto_backup_last_time'&&(k!=='ratib_ui_resume_view_v1'||backup))androidBackupRevision++;_memStore[key]=v;_pendingWrites.set(key,v);");
patch('const key=APP_STORAGE_PREFIX+k;delete _memStore[key];', 'const key=APP_STORAGE_PREFIX+k;androidBackupRevision++;delete _memStore[key];');
patch("const show=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:6});","const show=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});");
patch("function trialNumber(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:6});}","function trialNumber(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:2});}");
patch("if(period==='current')txs=txs.filter(t=>String(t.isoDate||'').startsWith(monthKey()+'-'));","if(period==='current'){const prefix=monthKey()+'-';txs=txs.filter(t=>String(t.isoDate||'').startsWith(prefix));}");
patch("const groups=new Set(),out=[];\n for(const t of txs){if(!t.isOpeningBalance||['deleted','reversed'].includes(t.status)){out.push(t);continue;}const key=importedOpeningKey(t);if(groups.has(key))continue;groups.add(key);out.push(importedOpeningDocument(t,txs));}","const groups=new Map(),out=[];\n for(const t of txs){\n   if(!t.isOpeningBalance||t.status==='deleted'||t.status==='reversed')continue;\n   const key=importedOpeningKey(t);\n   if(!groups.has(key))groups.set(key,[]);\n   groups.get(key).push(t);\n }\n for(const t of txs){\n   if(!t.isOpeningBalance||t.status==='deleted'||t.status==='reversed'){out.push(t);continue;}\n   const key=importedOpeningKey(t),rows=groups.get(key);\n   if(rows){out.push(importedOpeningDocument(t,rows));groups.delete(key);}\n }");
patch("if(currentActiveTab!=='pageLedger'&&!force){ledgerNeedsRender=true;updateProDashboard();return;}","if(currentActiveTab!=='pageLedger'&&!force){ledgerNeedsRender=true;if(currentActiveTab==='pageDashboard')ratibRefreshDashboardAfterPaint();return;}");
patch("function updateProDashboard(){","let androidHomeSummaryKey=null;\nfunction updateProDashboard(){\n  if(currentActiveTab!=='pageDashboard')return;\n  const period=document.getElementById('dashboardPeriod')?.value||'all';\n  const key=[androidBackupRevision,getGlobalCurrency(),period,Math.floor(Date.now()/60000)].join('|');\n  if(androidHomeSummaryKey===key&&window.__ratibProceedInitialized)return;\n  androidHomeSummaryKey=null;\n  androidComputeDashboard();\n  androidHomeSummaryKey=key;\n}\nfunction androidComputeDashboard(){");
const csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://ratib.saleh0129.workers.dev https://www.googleapis.com; frame-src 'none'; object-src 'none'";
// Preserve Android's recovery for partially initialized voucher screens.
patch('setVoucherFormHistory(mode);configureVoucherMode(mode);resetMultiVoucherForm();',"if(!document.getElementById('spendHeaderBudget'))setupMultiVoucherFeature();setVoucherFormHistory(mode);configureVoucherMode(mode);resetMultiVoucherForm();");
patch("function selectMultiVoucherType(){configureVoucherMode('multi-entry');", "function selectMultiVoucherType(){if(!document.getElementById('spendHeaderBudget'))setupMultiVoucherFeature();configureVoucherMode('multi-entry');");
patch("document.getElementById('cashDirectionSwitch').checked=mode==='income';document.getElementById('cashDirectionSwitch').setAttribute('aria-label',mode==='income'?'قبض: الحساب العلوي مدين':'صرف: الحساب العلوي دائن');", "const directionSwitch=document.getElementById('cashDirectionSwitch');if(directionSwitch){directionSwitch.checked=mode==='income';directionSwitch.setAttribute('aria-label',mode==='income'?'قبض: الحساب العلوي مدين':'صرف: الحساب العلوي دائن');}");
patch("document.getElementById('cashDirectionControl').classList.toggle('hidden',!spend);", "document.getElementById('cashDirectionControl')?.classList.toggle('hidden',!spend);");
patch("document.getElementById('cashLineHeading').textContent=", "const lineHeading=document.getElementById('cashLineHeading');if(lineHeading)lineHeading.textContent=");
patch("card.querySelector('.multi-voucher-table thead').innerHTML=", "const header=card.querySelector('.multi-voucher-table thead')||card.querySelector('.multi-voucher-table')?.createTHead();if(header)header.innerHTML=");
patch('<meta charset="UTF-8">','<meta charset="UTF-8">\n<meta http-equiv="Content-Security-Policy" content="'+csp+'">\n<script src="./ratib-native-bridge.js"></script>');
patch("if('serviceWorker' in navigator){","if('serviceWorker' in navigator && !window.RatibAndroid){");
// The source also contains </body> inside its Excel HTML-export string.
// Insert only at the document's final closing body, never into inline JS.
// Android-only restore safety hooks. Persistence, encryption and accounting
// remain the original implementation; the checkpoint must finish first.
patch('const payload=JSON.parse(content);','const payload=RatibAndroid.parseBackupText(content); RatibAndroid.validateBackupEnvelope(payload);');
patch('const count=validateRestoredData(restored),months=history.length;', 'RatibAndroid.validateBackupRecords(restored); const count=validateRestoredData(restored),months=history.length;');
patch('async function importBackupFile(file,options={}){','async function importBackupFile(file,options={}){ let releaseRestore=()=>{};');
patch('if(archiveRecovery){\n      // Boot was blocked','releaseRestore=RatibAndroid.blockRestoreUI();\n    if(archiveRecovery){\n      // Boot was blocked');
patch("downloadBackupPayload(rollback,'ratib-before-restore-'+backupStamp()+'.json');", 'await RatibAndroid.sendFile(new Blob([JSON.stringify(rollback)],{type:"application/json"}),"before-restore.json","checkpoint");');
patch('سيُنزَّل ملف أمان أولاً.', 'ستُحفظ نسخة تراجع داخل التطبيق أولاً.');
patch('setTimeout(()=>location.reload(),500);return true;', 'releaseRestore=()=>{}; setTimeout(()=>location.reload(),500);return true;');
patch("'error',12000);return false;}\n}", "'error',12000);return false;}finally{releaseRestore();}\n}");
patch(/<\/body>\s*<\/html>\s*$/, '<script src="./ratib-native-adapter.js" defer></script>\n<script src="./ratib-native-services.js" defer></script>\n<script src="./ratib-biometric.js" defer></script>\n</body>\n</html>');
fs.writeFileSync(path.join(dest,'index.html'),html);
for(const name of adapters)fs.copyFileSync(path.join(root,'android/web',name),path.join(dest,name));
const licensePath=path.join(dest,'ratib-license-draft.js');
fs.writeFileSync(licensePath,fs.readFileSync(licensePath,'utf8').replace("if (!response.ok) throw new Error('تعذر التحقق من الترخيص');","if (!response.ok) { const rejected=await response.json().catch(()=>({})); throw new Error(/[\\u0600-\\u06ff]/.test(rejected.error||'')?rejected.error:'تعذر التحقق من الترخيص (رمز '+response.status+'). أعد المحاولة أو تواصل مع الدعم.'); }"));
fs.mkdirSync(path.join(root,'android/app/src/main/res/drawable'),{recursive:true});
fs.copyFileSync(path.join(root,'Icons/icon-512.png'),path.join(root,'android/app/src/main/res/drawable/ratib_icon.png'));
const manifest={source:'SalehAliAbuBaker/Ratib0129',baseCommit:process.env.RATIB_SOURCE_COMMIT||'b72222ff2f23de52720767fca6abe322194da541',version:require(path.join(root,'package.json')).version,androidVersionCode:Number(fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8').match(/versionCode\s+(\d+)/)[1]),files:{}};
for(const name of files)manifest.files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
fs.writeFileSync(path.join(dest,'source-manifest.json'),JSON.stringify(manifest,null,2));
console.log('Bundled Ratib web assets',files.length);

// Keep the existing Android speech-permission adapter in generated assets only.
// All field parsing and accounting behavior remain upstream code.
{
 const p=path.join(dest,'ratib-voice-dictation-3.6.117.js');
 let voice=fs.readFileSync(p,'utf8');
 const previous=fs.readFileSync(path.join(root,'android/web/previous-voice.js'),'utf8').replace(/\r\n/g,'\n');
 const branch=previous.slice(previous.indexOf(' if(window.RatibAndroid){\n'),previous.indexOf(' if(!window.isSecureContext)'));
 if(!branch||voice.split(' if(!window.isSecureContext)').length!==2)throw Error('Android voice hook changed upstream');
 voice=voice.replace(' if(!window.isSecureContext)',branch+' if(!window.isSecureContext)');
 const hint=previous.split('\n').find(line=>line.startsWith(' if(window.RatibAndroid){card.querySelector'));
 if(!hint||voice.split(' parent.prepend(card);').length!==2)throw Error('Android voice settings hook changed upstream');
 voice=voice.replace(' parent.prepend(card);',hint+'\n parent.prepend(card);');
 const recognition='const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;';
 if(voice.split(recognition).length!==2)throw Error('Android recognition entry changed upstream');
 voice=voice.replace(recognition,`class AndroidRecognition {
  start(){
   const run={};this.run=run;
   RatibAndroid.request('voiceStart',{lang:this.lang}).then(text=>{
    if(this.run!==run)return;
    const result=[{transcript:String(text||'')}];result.isFinal=true;
    if(text)this.onresult?.({resultIndex:0,results:[result]});
   },error=>{
    if(this.run!==run||error?.name==='AbortError')return;
    notify(String(error?.message||error||'تعذر تشغيل خدمة الكلام في أندرويد'),'warn');
   }).finally(()=>{if(this.run===run){this.run=null;this.onend?.();}});
  }
  stop(){this.run=null;RatibAndroid.request('voiceCancel',{}).catch(()=>{});this.onend?.();}
 }
 const Recognition=window.RatibAndroid?AndroidRecognition:(window.SpeechRecognition||window.webkitSpeechRecognition);`);
 fs.writeFileSync(p,voice);
}

// User-requested Android display name, independent of the source release/build code.
for(const [name,from,to] of [
 ['ratib-sidebar-3.6.124.js',"const label='الإصدار '+v;","const label='الإصدار 3.6.217 Android';"],
]){const file=path.join(dest,name),text=fs.readFileSync(file,'utf8');if(text.split(from).length!==2)throw Error('Display hook changed: '+name);fs.writeFileSync(file,text.replace(from,to));}



function adaptAsset(name,from,to){
 const file=path.join(dest,name),source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(source.includes(to))return;if(source.split(from).length!==2)throw Error('Android asset hook changed: '+name+' from='+from);
 fs.writeFileSync(file,source.replace(from,()=>to));
}
adaptAsset('ratib-adhkar-20261111.js',"if(!home)return;", "if(!home||!home.getClientRects().length)return;");
adaptAsset('ratib-adhkar-20261111.js',"requestAnimationFrame(homeBanner);\n }","const page=byId('pageDashboard');\n   if(page)new MutationObserver(()=>requestAnimationFrame(homeBanner)).observe(page,{attributes:true,attributeFilter:['class','hidden','style']});\n   requestAnimationFrame(homeBanner);\n }");
adaptAsset('ratib-home-3.6.168.js','pulseNumbers();dhikr();','pulseNumbers();');
adaptAsset('ratib-fiscal-ledger.js','maximumFractionDigits:6','maximumFractionDigits:2');
adaptAsset('ratib-cash-pulse.js','const accounts=cashAccounts();renderCashDirectory();','const accounts=cashAccounts();if(expanded)renderCashDirectory();');
for(const name of ['ratib-accounting-3.6.59.js','ratib-interactive-tree-3.6.105.05.js','ratib-cash-reference-3.6.148.js','ratib-special-reports-3.6.102.js','ratib-reconciliation-print.js','ratib-journal-layout-3.6.90.js']){
 const file=path.join(dest,name);
 const source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(!source.includes('maximumFractionDigits:6')&&source.includes('maximumFractionDigits:2'))continue;if(!source.includes('maximumFractionDigits:6'))throw Error('Amount format changed in '+name);
 fs.writeFileSync(file,source.replaceAll('maximumFractionDigits:6','maximumFractionDigits:2'));
}

adaptAsset('ratib-global-button-size-3.6.146.js','document.documentElement.dataset.ratibFontSize=setting;',`document.documentElement.dataset.ratibFontSize=setting;
  window.RatibAndroid?.request('interfaceFont',{size:setting}).catch(console.warn);`);
adaptAsset('ratib-global-button-size-3.6.146.js',"if(typeof store!=='undefined'&&typeof store.set==='function')store.set(LEGACY,setting);","if(typeof store!=='undefined'&&typeof store.set==='function'&&store.get(LEGACY,null)!==setting)store.set(LEGACY,setting);");
fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen {
 html[data-ratib-font-size="xsmall"] {font-size:13px!important;-webkit-text-size-adjust:100%;text-size-adjust:100%;}
 html[data-ratib-font-size="small"] {font-size:15px!important;}
 html[data-ratib-button-size="xsmall"] {--rb-action-height:32px;--rb-menu-height:36px;--rb-tile-height:56px;--rb-tile-icon:17px;}
 html[data-ratib-button-size="xsmall"] #dashboardHomeContent .main-menu-grid .main-menu-btn,
 html[data-ratib-button-size="xsmall"] #dashboardHomeContent .ratib-home-voucher-shortcuts .main-menu-btn,
 html[data-ratib-button-size="xsmall"] #dashboardHomeContent .ratib-commerce-shortcut {
   min-height:56px!important;padding:4px!important;gap:2px!important;
 }
 html[data-ratib-button-size="xsmall"] #ratibHomeBottomNav .ratib-bottom-choice {min-height:38px!important;padding-block:3px!important;}
}
`);

adaptAsset('ratib-cash-pulse.js',"const legs=typeof trialTransactionLegs==='function'?trialTransactionLegs(t):[];",`const relevant=name=>cashNames.has(name)&&(isAll||name===account);
  if(!relevant(t.debitAccount)&&!relevant(t.creditAccount)&&!relevant(t.openingBalance?.account))continue;
  const legs=typeof trialTransactionLegs==='function'?trialTransactionLegs(t):[];`);
fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen {
 :root[data-ratib-font-size="medium"], :root[data-ratib-font-size="large"] {font-size:13px!important;--ratib-font-scale:.82;}
 :root[data-ratib-font-size="small"] {font-size:12px!important;--ratib-font-scale:.81;}
 :root[data-ratib-font-size="xsmall"] {font-size:11px!important;--ratib-font-scale:.8;}
 :root[data-ratib-button-size="medium"] {--rb-action-height:38px;--rb-action-font:.75rem;--rb-action-icon:17px;--rb-menu-height:40px;--rb-tile-height:72px;--rb-tile-icon:20px;--rb-com-gap:4px;}
 :root[data-ratib-button-size="small"] {--rb-action-height:35px;--rb-action-font:.73rem;--rb-action-icon:16px;--rb-menu-height:38px;--rb-tile-height:63px;--rb-tile-icon:18px;--rb-com-gap:4px;}
 html:is([data-ratib-button-size="small"],[data-ratib-button-size="medium"]) #dashboardHomeContent :is(.main-menu-grid,.ratib-home-voucher-shortcuts) .main-menu-btn,
 html:is([data-ratib-button-size="small"],[data-ratib-button-size="medium"]) #dashboardHomeContent .ratib-commerce-shortcut {
   min-height:var(--rb-tile-height)!important;padding:5px!important;gap:3px!important;
 }
}
`);

adaptAsset('ratib-ui-v3.6.37.js','bar.append(label,save,clear,help,status);',`if(panel.id==='accountOperationsStandalonePanel'){
     const options=document.createElement('details'),title=document.createElement('summary'),fields=document.createElement('div');
     options.className='ratib-match-options';title.textContent='مطابقة الرصيد';
     fields.className='ratib-match-fields';fields.append(label,save,clear,help);
     options.append(title,fields);bar.append(options,status);
     if(!saved){fields.append(status);}
   }else bar.append(label,save,clear,help,status);`);
fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen and (max-width:700px){
 #mainWrap:has(#pageAccountOperations:not(.hidden)) #ratibPageNav #backToMenuBtn {
   min-height:36px!important;height:auto!important;width:auto!important;flex-direction:row!important;padding:3px 10px!important;
 }
 #mainWrap #pageAccountOperations .account-operations-screen-head {display:grid!important;grid-template-columns:1fr!important;gap:6px!important;padding:6px 0!important;}
 #pageAccountOperations #accountOperationsScreenTitle {line-height:1.35!important;overflow-wrap:anywhere;}
 #mainWrap #pageAccountOperations .account-operations-head-actions {grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;}
 #mainWrap #pageAccountOperations .account-operations-head-actions>.account-inline-actions {display:none!important;}
 #mainWrap #pageAccountOperations :is(#accountAddOperationBtn,#accountScreenMenuToggle){flex-direction:row!important;gap:6px!important;height:auto!important;min-height:36px!important;padding:4px 8px!important;font-size:1rem!important;}
 #pageAccountOperations .account-operations-head{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;flex-direction:row!important;margin:5px 0!important;padding:3px 0!important;}
 #pageAccountOperations .account-operations-head small{margin:0!important;}
 #pageAccountOperations .ratib-reconcile-bar:has(.ratib-match-options){display:block!important;padding:0!important;margin:4px 0!important;}
 #pageAccountOperations .ratib-match-options>summary{padding:8px 10px;cursor:pointer;font-weight:650;}
 #pageAccountOperations .ratib-match-fields{display:flex;flex-wrap:wrap;align-items:center;padding:4px 8px 8px;gap:6px;}
 #pageAccountOperations .ratib-match-fields label{flex:1 1 100%;display:flex;align-items:center;gap:8px;}
 #pageAccountOperations .ratib-match-fields button:not([hidden]){flex:1 1 auto;min-width:0!important;margin:0!important;}
 #pageAccountOperations .ratib-match-fields [hidden]{display:none!important;}
 #pageAccountOperations #ratibAccountMovementSearchBar{padding:5px 7px!important;margin:5px 0!important;}
 #pageAccountOperations #ratibAccountMovementSearchBar:has(input:placeholder-shown) #ratibAccountMovementSearchCount{display:none!important;}
 #pageAccountOperations #ratibAccountMovementSearchClear:disabled{display:none!important;}
 #pageAccountOperations #ratibAccountMovementSearchInput{height:37px!important;min-height:37px!important;}
 #pageAccountOperations .ratib-statement-page-tools{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding:6px!important;gap:5px 8px!important;margin:6px 0!important;}
 #pageAccountOperations .ratib-statement-page-tools>label{display:grid!important;grid-template-columns:1fr!important;gap:2px!important;font-size:.88rem!important;line-height:1.3!important;}
 #pageAccountOperations .ratib-statement-page-tools select {width:100%!important;min-height:32px!important;height:32px!important;padding:2px 5px!important;}
 #pageAccountOperations .ratib-statement-page-actions{grid-column:1/-1;display:grid!important;grid-template-columns:auto 1fr auto;align-items:center;gap:4px!important;}
 #pageAccountOperations .ratib-statement-page-actions>span{text-align:center;font-size:.86rem!important;}
 #pageAccountOperations .ratib-statement-page-actions button{min-height:32px!important;height:auto!important;padding:4px 8px!important;}
}
`);fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen and (max-width:700px){
 #mainWrap #pageAccountOperations .account-operations-head-actions>#accountAddOperationBtn {grid-column:1!important;}
 #mainWrap #pageAccountOperations .account-operations-head-actions>.account-screen-menu-wrap {grid-column:2!important;}
 #mainWrap #pageAccountOperations .account-operations-head-actions #accountAddOperationBtn,
 #mainWrap #pageAccountOperations .account-operations-head-actions #accountScreenMenuToggle {height:38px!important;min-height:38px!important;max-height:38px!important;width:100%!important;box-sizing:border-box!important;line-height:1.2!important;}
}
`);

fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen {
 html:is([data-ratib-font-size="xxsmall"],[data-ratib-font-size="xxlarge"],[data-ratib-font-size="xsmall"],[data-ratib-font-size="small"],[data-ratib-font-size="medium"],[data-ratib-font-size="large"],[data-ratib-font-size="xlarge"]) {
   font-size:13px!important;--ratib-font-scale:.82!important;-webkit-text-size-adjust:100%;text-size-adjust:100%;
 }
}
`);

// Preserve Android's compact default while covering all seven official size steps.
fs.appendFileSync(path.join(dest,'ratib-interface-font-3.6.148.css'),`
@media screen {
`+
 [
 ['xxsmall',28,'.68rem',14,32,50,15,3],
 ['xsmall',32,'.71rem',15,35,56,17,3],
 ['small',35,'.73rem',16,38,63,18,4],
 ['medium',38,'.75rem',17,40,72,20,4],
 ['large',42,'.81rem',19,44,80,22,5],
 ['xlarge',46,'.92rem',22,49,89,25,8],
 ['xxlarge',50,'1rem',24,53,98,27,9]
 ].map(([size,height,font,icon,menu,tile,tileIcon,gap])=>
 `:root[data-ratib-button-size="${size}"]{--rb-action-height:${height}px;--rb-action-font:${font};--rb-action-icon:${icon}px;--rb-menu-height:${menu}px;--rb-tile-height:${tile}px;--rb-tile-icon:${tileIcon}px;--rb-com-gap:${gap}px;}`
 ).join('\n')+`
}
`);
