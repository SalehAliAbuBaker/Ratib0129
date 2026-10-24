'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const html=fs.readFileSync('index.html','utf8');
const excerpt=(first,last)=>{const a=html.indexOf(first),b=html.indexOf(last,a);assert(a>=0&&b>a,'Missing security function boundary: '+first);return html.slice(a,b);};
const saved=new Map(),alerts=[];
let cfg={enabled:true,salt:null,bioCredentialId:null};
const sessionStorage={
 setItem:(k,v)=>saved.set(k,String(v)),
 getItem:k=>saved.has(k)?saved.get(k):null,
 removeItem:k=>saved.delete(k)
};
const context={
 crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,
 sessionStorage,localStorage:{length:0,getItem:()=>null},structuredClone,
 console:{log(){},warn(){},error(){}},navigator:{credentials:{}},
 window:{PublicKeyCredential:class Credential{}},Date,JSON,
 alert:message=>alerts.push(message),showToast:()=>{},
 refreshBioSettingsUI:()=>{},unlockAppScreen:()=>{context.unlockCalls++},
 proceedAppInit:()=>{context.initCalls++},
 flushStorage:async()=>{context.flushCalls++},
 unlockCalls:0,initCalls:0,flushCalls:0
};
vm.createContext(context);
const setup=[
 "const APP_STORAGE_PREFIX='masar_', APP_SCHEMA_VERSION=3, SESSION_KEY_CACHE='masar_session_key_v1';",
 "const _storageInternalKeys=new Set([SESSION_KEY_CACHE]);",
 "let _memStore=Object.create(null), _vaultUnlocked=true, _vaultCryptoKey=null, _vaultBlob=null;",
 "function _snapshotMemStore(){return Object.assign(Object.create(null),_memStore);}",
 "function getSecurityConfig(){return securityConfig();}",
 "function saveSecurityConfigRaw(next){setSecurityConfig(next);}",
 "async function _readVaultBlob(){return _vaultBlob;}",
 "async function _finishVaultUnlock(key,blob){",
 " const data=await decryptVaultBlob(key,blob);",
 " _memStore=Object.assign(Object.create(null),data);",
 " _vaultCryptoKey=key;_vaultUnlocked=true;return true;",
 "}"
].join('\n');
context.securityConfig=()=>cfg;
context.setSecurityConfig=next=>{cfg=next;};
vm.runInContext(setup+
 excerpt('function _b64(bytes){','function _snapshotMemStore(){')+
 excerpt('const VAULT_BIO_SESSION_MAX_AGE_MS','function saveSecurityConfigRaw(cfg){')+
 excerpt('async function tryUnlockVaultWithSessionKey(){','function getDefaultAccountsConfig()')+
 excerpt('async function registerBiometricCredential() {','// إيقاف البصمة:')+
 excerpt('function disableBiometricCredential() {','// عند فتح التطبيق:')+
 excerpt('async function authenticateBiometric() {','function toggleSettingsCard(')+
 excerpt('async function buildBackupPayload() {','async function exportBackupFile(){')+
 '\nthis.__security={deriveVaultKey,encryptVaultBlob,decryptVaultBlob,cacheVaultKeyForBiometrics,clearVaultBiometricSession,readVaultBiometricSession,tryUnlockVaultWithSessionKey,registerBiometricCredential,disableBiometricCredential,authenticateBiometric,buildBackupPayload,setKey:(value)=>{_vaultCryptoKey=value;_vaultUnlocked=!!value;},setBlob:value=>{_vaultBlob=value;},setStore:value=>{_memStore=Object.assign(Object.create(null),value);}};',
 context);
const api=context.__security,pin='462986',wrong='1246',data={'masar_plan':{transactions:[{id:'secret-entry',amount:173.5,currency:'YER'}]},'masar_account_tree':{'حساب سري':{accounts:['خزينة']}}};
(async()=>{
 const {key,saltB64}=await api.deriveVaultKey(pin);
 cfg.salt=saltB64;
 api.setKey(key);api.setStore(data);
 const before=JSON.parse(JSON.stringify(data));
 const encrypted=await api.buildBackupPayload();
 assert.equal(encrypted.encrypted,true,'Enabled PIN must always produce encrypted backups');
 assert(!('data' in encrypted),'Encrypted backup must not expose plaintext data');
 assert(!JSON.stringify(encrypted).includes('secret-entry'),'Encrypted backup must hide transactions');
 const restoreKey=(await api.deriveVaultKey(pin,saltB64)).key;
 assert.deepEqual(JSON.parse(JSON.stringify(await api.decryptVaultBlob(restoreKey,encrypted.blob))),before);
 await assert.rejects(api.decryptVaultBlob((await api.deriveVaultKey(wrong,saltB64)).key,encrypted.blob),'Wrong PIN must fail');
 api.setKey(null);
 await assert.rejects(api.buildBackupPayload(),/مقفلة/,'Locked vault must fail closed, never export plaintext');
 api.setKey(key);

 saved.set('masar_session_key_v1','legacy-stale-raw-key');
 assert.equal(await api.cacheVaultKeyForBiometrics(key),false);
 assert.equal(saved.has('masar_session_key_v1'),false);

 const rawId=new Uint8Array([13,37,51,66,79,92]);
 const b64=Buffer.from(rawId).toString('base64');
 context.navigator.credentials.create=async()=>({type:'public-key',rawId});
 assert.equal(await api.registerBiometricCredential(),true);
 assert.equal(cfg.bioCredentialId,b64);
 assert(context.flushCalls>=1,'Biometric credential configuration must be durable');
 const stored=JSON.parse(sessionStorage.getItem('masar_session_key_v1'));
 assert.equal(stored.version,2);
 assert.equal(stored.credentialId,b64);
 assert.equal(stored.salt,saltB64);
 assert(stored.expiresAt>Date.now()&&stored.expiresAt<=Date.now()+86400000);
 assert(api.readVaultBiometricSession());
 api.setBlob(encrypted.blob);api.setKey(null);
 context.navigator.credentials.get=async()=>({type:'public-key',rawId:new Uint8Array(rawId)});
 await api.authenticateBiometric();
 assert.equal(context.unlockCalls,1);
 assert.equal(context.initCalls,1);
 assert.equal(api.readVaultBiometricSession().credentialId,b64);
 assert.equal((await api.buildBackupPayload()).encrypted,true);

 const initial=context.unlockCalls;
 context.navigator.credentials.get=async()=>({type:'public-key',rawId:new Uint8Array([1,2,3])});
 await api.authenticateBiometric();
 assert.equal(context.unlockCalls,initial);
 assert(alerts.some(message=>String(message).includes('البصمة')));

 let entry=JSON.parse(sessionStorage.getItem('masar_session_key_v1'));
 entry.expiresAt=Date.now()-10;sessionStorage.setItem('masar_session_key_v1',JSON.stringify(entry));
 assert.equal(api.readVaultBiometricSession(),null);
 assert.equal(saved.has('masar_session_key_v1'),false);
 await api.cacheVaultKeyForBiometrics(restoreKey);
 entry=JSON.parse(sessionStorage.getItem('masar_session_key_v1'));
 cfg.bioCredentialId='other-credential';
 assert.equal(api.readVaultBiometricSession(),null);
 assert.equal(saved.has('masar_session_key_v1'),false);
 cfg.bioCredentialId=b64;
 sessionStorage.setItem('masar_session_key_v1',entry.key);
 assert.equal(api.readVaultBiometricSession(),null);
 assert.equal(saved.has('masar_session_key_v1'),false);

 await api.cacheVaultKeyForBiometrics(restoreKey);
 api.disableBiometricCredential();
 assert.equal(cfg.bioCredentialId,null);
 assert.equal(saved.has('masar_session_key_v1'),false);
 cfg={enabled:false,salt:null,bioCredentialId:null};
 const open=await api.buildBackupPayload();
 assert.equal(open.encrypted,false);
 assert.deepEqual(JSON.parse(JSON.stringify(open.data)),before);
 const sw=fs.readFileSync('sw.js','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 assert.equal(pkg.version,'3.6.107.09');
 assert(html.includes('const RATIB_RELEASE={"version":"3.6.107.09"'));
 assert(sw.includes('v210-trial-unlimited-budget-3.6.107.09'));
 assert(!html.includes("sessionStorage.setItem(SESSION_KEY_CACHE,_b64(await crypto.subtle.exportKey('raw',key)))"));
 for(const inline of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(inline);
 console.log('PASS 3.6.107.09: encrypted backup roundtrip/wrong PIN, fail-closed locked backup, biometric-bound expiring cache, credential check, cache invalidation, unchanged accounting');
})().catch(e=>{console.error(e);process.exitCode=1;});
