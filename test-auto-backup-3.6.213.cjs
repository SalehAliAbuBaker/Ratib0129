'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const fn=name=>{const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);const end=html.indexOf('\n}',start);return html.slice(start,end+2);};
const stamp=d=>d.toISOString().slice(0,19).replace('T','_').replace(/:/g,'-');
async function cloud(){
 const files=Array.from({length:104},(_,i)=>({id:'f'+i,name:'ratib-cloud-'+stamp(new Date(Date.UTC(2026,0,1,0,i)))+'.json.gz',createdTime:new Date(Date.UTC(2026,0,1,0,i)).toISOString()}));
 const removed=[];let due=true,runs=0;
 const cfg={enabled:true,lastFileId:'f103',cleanupPending:false};
 const context=vm.createContext({BACKUP_MAX_FILES:100,listCloudBackups:async(t,folder)=>{assert.equal(folder,'selected-folder');return files.slice();},driveFetch:async(url,options)=>{assert.equal(options.method,'DELETE');const id=url.split('/').pop();removed.push(id);const i=files.findIndex(f=>f.id===id);if(i>=0)files.splice(i,1);},window:{__ratibProceedInitialized:false},navigator:{onLine:true},_appExited:false,_cloudBusy:false,Date,console,getCloudCfg:()=>cfg,cloudBackupDue:()=>due,dismissCloudDueCard(){},saveCloudCfg:patch=>Object.assign(cfg,patch),refreshCloudBackupUI(){},runCloudBackup:async(interactive,destination)=>{assert.equal(interactive,false);assert.equal(destination,'official');runs++;due=false;return true;},getDriveToken:async interactive=>{assert.equal(interactive,false);return 'authorized-token';},findDriveFolder:async()=> 'selected-folder',CLOUD_FOLDER_NAME:'Ratib Backups',flushStorage:async()=>{}});
 vm.runInContext(fn('pruneCloudBackups')+'\nlet _cloudAutoRetryAt=0;\n'+fn('checkCloudBackupDue')+'\nthis.api={pruneCloudBackups,checkCloudBackupDue};',context);
 await context.api.pruneCloudBackups('token','selected-folder','f103');assert.equal(files.length,100);assert.deepEqual(removed,['f0','f1','f2','f3']);assert(files.some(f=>f.id==='f103'));
 removed.length=0;await assert.rejects(()=>context.api.pruneCloudBackups('token','selected-folder','absent'));assert.equal(removed.length,0,'missing new backup prevents all deletions');
 await context.api.checkCloudBackupDue();assert.equal(runs,0,'locked app never starts upload');context.window.__ratibProceedInitialized=true;context.navigator.onLine=false;await context.api.checkCloudBackupDue();assert.equal(runs,0);assert.equal(cfg.lastStatus,'offline');
 context.navigator.onLine=true;await context.api.checkCloudBackupDue();assert.equal(runs,1);await context.api.checkCloudBackupDue();assert.equal(runs,1,'one confirmed backup per due date');
 files.push({id:'newer-extra',name:'ratib-cloud-2099.json',createdTime:'2099'});cfg.cleanupPending=true;await context.api.checkCloudBackupDue();assert.equal(files.length,100);assert.equal(cfg.cleanupPending,false);
 due=true;context._cloudBusy=true;await context.api.checkCloudBackupDue();assert.equal(runs,1,'active upload excludes duplicate');context._cloudBusy=false;
 vm.runInContext('runCloudBackup=async()=>{return false;}',context);await context.api.checkCloudBackupDue();const retry=vm.runInContext('_cloudAutoRetryAt',context);assert(retry>Date.now());await context.api.checkCloudBackupDue();assert.equal(vm.runInContext('_cloudAutoRetryAt',context),retry,'failed silent requests back off');
}
async function local(failure=false){
 const old=Array.from({length:103},(_,i)=>'ratib-auto-'+stamp(new Date(Date.UTC(2026,0,1,0,i)))+'.json.gz'),names=old.slice(),removed=[];let closed=false;
 const handle={async *entries(){for(const name of names)yield [name,{kind:'file'}];},async removeEntry(name){removed.push(name);names.splice(names.indexOf(name),1);},async getFileHandle(name){names.push(name);return {async createWritable(){return {async write(){},async close(){closed=true;}};},async getFile(){return {size:failure?1:123};}};}};
 const saved={},context=vm.createContext({Date,console:{warn(){}},_browserAutoBackupRunning:false,getAutoBackupHandle:async()=>handle,buildBackupPayload:async()=>({app:'ratib'}),ratibPackBackup:async()=>({blob:{size:123},extension:'.json.gz'}),AUTO_BACKUP_PREFIX:'ratib-auto-',AUTO_BACKUP_NAME_RE:/^ratib-auto-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json(?:\.gz)?$/,BACKUP_MAX_FILES:100,LOCAL_NEW_FILE_MIN_INTERVAL_MS:10800000,backupStamp:stamp,store:{get:()=>0,_setSilent:(k,v)=>saved[k]=v},refreshAutoBackupUI(){},scheduleAutoBackup(){}});
 vm.runInContext(fn('listLocalBackups')+'\n'+fn('pruneLocalBackups')+'\n'+fn('writeAutoBackup')+'\nthis.save=writeAutoBackup;',context);
 assert.equal(await context.save(),!failure);assert(closed);
 if(failure){assert.equal(names.length,103);assert.deepEqual(names,old,'incomplete new copy cannot remove a previous backup');assert(!saved.auto_backup_last_time);}else{assert.equal(names.length,100);assert.deepEqual(removed,old.slice(0,4));assert(saved.auto_backup_last_time);}
}
(async()=>{await cloud();await local();await local(true);console.log('PASS automatic backups: silent due execution, lock/offline/concurrency/backoff, retain 100 oldest-first, protect verified latest, incomplete local copy preserves all old backups');})().catch(e=>{console.error(e);process.exitCode=1;});
