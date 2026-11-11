'use strict';
// Synthetic timer regression. No real financial records are stored or uploaded.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
const begin=source.indexOf('let _autoBackupTimer = null;');
const end=source.indexOf('// ===== نسخ احتياطية مؤرشفة',begin);
assert(begin>=0&&end>begin,'Expected archive-aware auto backup scheduler');
const snippet=source.slice(begin,end);
const now=Date.parse('2026-11-11T19:00:00+03:00');
let enabled=false,rows=22100,last='',delay=null,calls=0,cancels=0;
const DateClock=class extends Date{static now(){return now}static parse(x){return Date.parse(x)}};
const ctx={store:{get:(name,def)=>name==='auto_backup_enabled'?enabled:
name==='auto_backup_last_time'?last:def},_memStore:{},
_largeArchiveRows:()=>rows,clearTimeout:()=>{cancels++},
setTimeout:(callback,ms)=>{delay=ms;return callback},
writeAutoBackup:()=>{calls++},Date:DateClock,Math,Number};
vm.runInNewContext(snippet+'\nthis.schedule=scheduleAutoBackup;this.pending=()=>_autoBackupTimer;',ctx);
ctx.schedule();assert.equal(delay,null,'Disabled backups never schedule work');
enabled=true;
ctx.schedule();assert.equal(delay,1500,'First backup occurs promptly even with large ledger');
last=new Date(now).toISOString();ctx.schedule();
assert.equal(delay,300000,'Multiple updates do not reserialize archive before five-minute window');
const pendingTimer=ctx.pending();
assert.equal(typeof pendingTimer,'function');
pendingTimer();assert.equal(calls,1,'Scheduled backup still executes');
last=new Date(now-360000).toISOString();ctx.schedule();
assert.equal(delay,1500,'After five minutes, next save is prompt');
rows=10;last=new Date(now).toISOString();ctx.schedule();
assert.equal(delay,1500,'Small ledger retains original backup cadence');
assert(cancels>=3);
assert(snippet.includes('writeAutoBackup();')&&snippet.includes('auto_backup_last_time'));
console.log('PASS archive-auto-backup: 22,100 legs delay repeated snapshots without skipping durable saves; first due and small-ledger saves unchanged');
