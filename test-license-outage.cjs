// Regression checks for Ratib licensing during Cloudflare Worker / D1 interruptions.
// Run: node test-license-outage.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const files=['ratib-license-draft.js','trial/ratib-license-draft.js'];
const DAY=24*60*60*1000;

function fixture(file, initial, fetchImpl, onLine=true) {
  const key=file.startsWith('trial/')?'ratib_trial_license_client_v2':'ratib_license_client_v2';
  const store=new Map([[key,JSON.stringify(initial)]]);
  const localStorage={
    getItem(k){return store.get(k)||null;},
    setItem(k,value){store.set(k,String(value));}
  };
  const window={navigator:{onLine},crypto:{randomUUID:()=> 'existing-test-device'}};
  const document={getElementById:()=>null,addEventListener:()=>{}};
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  vm.runInNewContext(source,{window,localStorage,document,fetch:fetchImpl,Date,Set,TypeError,console},{filename:file});
  return {license:window.RatibLicense,state:()=>JSON.parse(store.get(key))};
}

async function main() {
  let total=0;
  for(const file of files) {
    const now=Date.now();
    const state=()=>({code:'LIC-previously-verified',deviceId:'existing-test-device',
      verifiedAt:now-7200000,checkedAt:now-7200000,
      expiryDate:new Date(now+DAY).toISOString()});
    const scenarios=[
      ['D1 503',503,false,true,true],
      ['Worker 500',500,false,true,true],
      ['rate limit 429',429,false,true,true],
      ['expired or revoked 403',403,false,false,false],
      ['license not found 404',404,false,false,false],
      ['valid',200,true,true,true],
      ['invalid payload',200,false,false,false]
    ];
    for(const [label,status,valid,want,preserve] of scenarios) {
      const request=async()=>({ok:status>=200&&status<300,status,
        json:async()=>({valid,expiry_date:new Date(now+DAY).toISOString(),
          error:valid?undefined:'Rejected'})});
      const f=fixture(file,state(),request);
      assert.equal(await f.license.licensed(),want,file+': '+label);
      assert.equal(Number(f.state().verifiedAt)>0,preserve,file+': preservation '+label);
      total++;
    }
    const failed=fixture(file,state(),async()=>{throw new TypeError('network unavailable');});
    assert.equal(await failed.license.licensed(),true,file+': network failure');
    assert.ok(failed.state().verifiedAt>0);
    total++;

    const offline=fixture(file,state(),async()=>{throw new Error('must not connect');},false);
    assert.equal(await offline.license.licensed(),true,file+': offline verified user');
    total++;

    const expired=fixture(file,{...state(),expiryDate:new Date(now-DAY).toISOString()},
      async()=>{throw new Error('must not connect');},false);
    assert.equal(await expired.license.licensed(),false,file+': expired offline license');
    total++;

    const neverVerified=fixture(file,{...state(),verifiedAt:0,checkedAt:0},
      async()=>({ok:false,status:503,json:async()=>({valid:false})}));
    assert.equal(await neverVerified.license.licensed(),false,file+': never verified user');
    total++;

    const renewed=fixture(file,{...state(),expiryDate:new Date(now-DAY).toISOString()},
      async()=>({ok:true,status:200,json:async()=>({valid:true,
        expiry_date:new Date(now+DAY).toISOString()})}));
    assert.equal(await renewed.license.licensed(),true,file+': server extended license');
    total++;
  }
  console.log('PASS 24 Ratib official/trial license outage and rejection cases');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
