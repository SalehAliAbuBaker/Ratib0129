// Tests actual Ratib licensing modules against a sandbox Worker and in-memory D1.
// Deliberately replaces fetch: NO network calls or production IDs/keys.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from './worker.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const testKey='LIC-test-only-20261105-ratib';
const day=86400000;
let cases=0;

for (const [filename,limit,storageKey] of [
  ['ratib-license-draft.js',50,'ratib_license_client_v2'],
  ['trial/ratib-license-draft.js',20,'ratib_trial_license_client_v2']
]) {
  const records=new Map();
  const db={prepare(sql){
    return {
      bind(...p){return {
        async first(){return records.get(p[0]+'|'+p[1])||null;},
        async run(){const k=p[0]+'|'+p[1];if(!records.has(k))records.set(k,{expires_at:p[2]});return {success:true};}
      };},
      async first(){return {ok:1};}
    };
  }};
  const env={DB:db,OUTAGE_MODE:'none'};
  const store=new Map();
  const localStorage={
    getItem:k=>store.get(k)||null,
    setItem:(k,v)=>store.set(k,String(v))
  };
  const win={navigator:{onLine:true},crypto:{randomUUID:()=> 'sandboxdevice001'}};
  const document={getElementById:()=>null,addEventListener:()=>{}};
  const proxyFetch=async(url,opts)=>{
    assert.match(String(url),/^https:\/\/ratib\.saleh0129\.workers\.dev\/api\/license\//);
    // Isolated replacement for the HTTP endpoint in this test only.
    const request=new Request(String(url).replace(
      'https://ratib.saleh0129.workers.dev','https://sandbox.invalid'),opts);
    return worker.fetch(request,env);
  };
  const source=fs.readFileSync(path.join(root,filename),'utf8');
  vm.runInNewContext(source,{window:win,localStorage,document,fetch:proxyFetch,
    Date,Set,TypeError,console,crypto:win.crypto},{filename});
  await win.RatibLicense.activate(testKey); // Only sandbox D1.
  let state=JSON.parse(store.get(storageKey));
  assert.ok(state.verifiedAt>0);
  const verified=Date.now()-2*3600000;
  state.verifiedAt=verified;
  state.checkedAt=verified;
  store.set(storageKey,JSON.stringify(state));
  env.OUTAGE_MODE='503'; // Internet stays on, Worker rejects verification.
  const fakeDocuments=Array.from({length:limit},(_,i)=>({id:'test-'+i}));
  assert.equal(await win.RatibLicense.beforeCreate(fakeDocuments),true);
  state=JSON.parse(store.get(storageKey));
  assert.equal(state.verifiedAt,verified);
  win.RatibLicense.recordCreated();
  assert.ok(JSON.parse(store.get(storageKey)).used>=limit+1);
  cases++;
  // Once sandbox recovers, the same synthetic device verifies normally.
  env.OUTAGE_MODE='none';
  assert.equal(await win.RatibLicense.licensed(),true);
  cases++;
}
console.log('PASS '+cases+' synthetic Ratib voucher-save-guard/outage+recovery integration cases');
