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
    assert.match(neverVerified.state().lastCheckError,/خدمة التراخيص/,file+': server error diagnostic');
    total++;

    // Existing users whose previous version already erased verifiedAt must see
    // the actual reason for failed re-verification, not a misleading renewal prompt.
    const deviceNotRecognized=fixture(file,{...state(),verifiedAt:0,checkedAt:0},
      async()=>({ok:false,status:403,
        json:async()=>({valid:false,error:'لم يُفعّل الترخيص على هذا الجهاز.'})}));
    assert.equal(await deviceNotRecognized.license.licensed(),false,file+': device mismatch');
    assert.match(deviceNotRecognized.state().lastCheckError,/لم يُفعّل/,file+': device-specific error');
    total++;

    const renewed=fixture(file,{...state(),expiryDate:new Date(now-DAY).toISOString()},
      async()=>({ok:true,status:200,json:async()=>({valid:true,
        expiry_date:new Date(now+DAY).toISOString()})}));
    assert.equal(await renewed.license.licensed(),true,file+': server extended license');
    total++;

    // Exercise the actual creation gate after the free quota is exhausted.
    // The simulated 503 is a transient verification failure; it must not
    // prevent creation for a previously verified, unexpired license.
    // This test never writes accounting documents or calls a live Worker.
    {
      let status=503;
      let calls=0;
      const request=async()=>{
        calls++;
        return {ok:status===200,status,json:async()=>({
          valid:status===200,
          expiry_date:new Date(now+DAY).toISOString(),
          error:status===503?'Simulated D1/Worker outage (sandbox only)':undefined
        })};
      };
      const initialUsed=file.startsWith('trial/')?20:50;
      const f=fixture(file,{...state(),used:initialUsed},request);
      assert.equal(await f.license.beforeCreate([]),true,file+': creation allowed during simulated 503');
      assert.ok(f.state().verifiedAt>0,file+': activation proof retained during 503');
      assert.equal(f.license.recordCreated(),initialUsed+1,file+': creation accounting after 503');
      assert.equal(f.state().used,initialUsed+1,file+': creation count persisted');

      status=200;
      assert.equal(await f.license.beforeCreate([]),true,file+': creation allowed after recovery');
      assert.ok(f.state().checkedAt>now-60000,file+': successful re-verification persisted');
      assert.equal(f.license.recordCreated(),initialUsed+2,file+': creation accounting after recovery');
      assert.equal(f.state().used,initialUsed+2,file+': recovered creation count persisted');
      assert.equal(calls,2,file+': 503 and recovery both attempted verification');
      total+=2;
    }
  }
  console.log('PASS 30 Ratib official/trial license outage, save-gate and rejection cases');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
