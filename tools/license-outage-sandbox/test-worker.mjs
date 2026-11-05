import assert from 'node:assert/strict';
import worker from './worker.mjs';

const records = new Map();
const db = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.startsWith('SELECT expires_at'))
              return records.get(params[0]+'|'+params[1]) || null;
            return { ok:1 };
          },
          async run() {
            if (!sql.startsWith('INSERT OR IGNORE')) throw Error('Unexpected SQL');
            const k=params[0]+'|'+params[1];
            if (!records.has(k)) records.set(k,{expires_at:params[2]});
            return {success:true};
          }
        };
      },
      async first() { if (sql==='SELECT 1 AS ok') return {ok:1}; throw Error('Unexpected SQL'); }
    };
  }
};
const key='LIC-test-only-20261105-ratib', id='testdevice0001';
const call=(action,env={DB:db,OUTAGE_MODE:'none'},body={license_key:key,device_id:id})=>
  worker.fetch(new Request('https://sandbox.invalid/api/license/'+action, {
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
  }),env);
const verify=async(res,status,valid)=>{
  assert.equal(res.status,status);
  assert.equal((await res.json()).valid,valid);
};
await verify(await call('verify'),403,false);
await verify(await call('activate'),200,true);
await verify(await call('verify'),200,true);
for (const error of ['429','500','503'])
  await verify(await call('verify',{DB:db,OUTAGE_MODE:error}),Number(error),false);
await verify(await call('verify',{OUTAGE_MODE:'none'}),503,false);
await verify(await call('verify',{DB:db,OUTAGE_MODE:'none'},{license_key:'LIC-REAL-LICENSE',device_id:id}),403,false);
await verify(await call('verify'),200,true); // Recovery with same D1 record.
const health=await worker.fetch(new Request('https://sandbox.invalid/health'),{DB:db});
assert.equal(health.status,200);
assert.equal((await health.json()).database,'connected');
console.log('PASS 10 isolated D1 sandbox smoke assertions');
