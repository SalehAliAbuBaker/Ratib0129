'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.107');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.107","build":"p10701"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.107","build":"p10701"'));
assert(sw.includes('v201-official-statement-marks-3.6.107'));
assert(!html.includes('الإصدار 3.6.107 (تجريبية)'));
assert(html.includes("const RATIB_RESUME_VIEW_KEY='ratib_ui_resume_view_v1'"));
assert(html.includes('ratibRestoreBackgroundView();\n  ratibBindBackgroundView();'));
assert(html.includes('restoreAppView(saved.view)'));
assert(html.includes('store.remove(RATIB_RESUME_VIEW_KEY);\n      await flushStorage();const cfg=getSecurityConfig()'));
assert(html.includes('if(document.hidden){ratibRememberBackgroundView();clearTimeout(_reminderTimer);flushStorage().catch(()=>{});}'));
assert(html.includes("if (!interactive) throw new Error('يحتاج النسخ السحابي إلى تسجيل الدخول"));
assert(html.includes("client.requestAccessToken({ prompt: cfg.email ? '' : 'select_account' })"));
assert(html.includes('const deadline = setTimeout(() => settle('));
assert(html.includes('if (!uploaded || !uploaded.id || uploaded.name !== name)'));
assert(html.includes("showToast('حُفظت إعدادات السحابة. لم تُرفع نسخة"));
assert(html.includes("cfg.lastError ? '⚠️ لم يكتمل آخر نسخ سحابي'"));
assert(html.includes("if (_cloudOriginOk() && navigator.onLine !== false) loadGis().catch(() => {});"));
assert(!html.includes("client.requestAccessToken({ prompt: interactive ? '' : 'none' })"));
const start=html.indexOf('async function getDriveToken(interactive) {');
const end=html.indexOf('async function driveFetch(',start);
assert(start>0&&end>start);
const source=html.slice(start,end);
function fixture(options={}){
 const counters={requests:0,clients:0,timers:new Set()};
 const google={accounts:{oauth2:{initTokenClient(cfg){counters.clients++;return {requestAccessToken(){
  counters.requests++;
  if(options.fail)cfg.error_callback({type:'popup_failed_to_open'});
  else cfg.callback({access_token:'FAKE_TOKEN',expires_in:3600});
 }};}}}};
 const build=new Function('window','google','getCloudCfg','_cloudOriginOk','loadGis','setTimeout','clearTimeout',
 'let _cloudToken=null,_cloudTokenExp=0,_gisPromise=null;const DRIVE_SCOPE="scope";'+source+
 ';return {getDriveToken,withToken(v){_cloudToken=v;_cloudTokenExp=Date.now()+3600000;}}');
 const obj=build({google},google,()=>({clientId:'test-id'}),()=>true,async()=>{},
 fn=>{counters.timers.add(fn);return fn;},ref=>counters.timers.delete(ref));
 return {...obj,counters};
}
(async()=>{
 const unauth=fixture();
 await assert.rejects(unauth.getDriveToken(false),/يحتاج النسخ السحابي/);
 assert.equal(unauth.counters.requests,0,'background may not open Google login');
 const remembered=fixture();remembered.withToken('EXISTING');
 assert.equal(await remembered.getDriveToken(false),'EXISTING');
 assert.equal(remembered.counters.requests,0,'valid token reused without popup');
 const success=fixture();
 assert.equal(await success.getDriveToken(true),'FAKE_TOKEN');
 assert.equal(success.counters.requests,1);
 assert.equal(success.counters.timers.size,0);
 const blocked=fixture({fail:true});
 await assert.rejects(blocked.getDriveToken(true),/لم تُفتح نافذة Google/);
 assert.equal(blocked.counters.timers.size,0);
 console.log('PASS official 3.6.107 background screen and Google Drive auth regression (no trial release or automatic popup)');
})().catch(err=>{console.error(err);process.exitCode=1;});
