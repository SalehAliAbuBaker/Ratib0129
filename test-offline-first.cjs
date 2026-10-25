// Offline-first PWA smoke tests: run with node test-offline-first.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = __dirname;
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw = fs.readFileSync(path.join(root,'sw.js'),'utf8');
const license = fs.readFileSync(path.join(root,'ratib-license-draft.js'),'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));

assert.match(html, /<link\s+rel="manifest"\s+href="\.\/manifest\.json">/);
const publishedVersion = sw.match(/const APP_RELEASE=\{"version":"(3\.6\.\d+(?:\.\d+)?)"/)?.[1];
assert.ok(publishedVersion, 'app release must expose its current numeric version');
assert.ok(html.includes('الإصدار '+publishedVersion), 'visible version must match offline release');
assert.ok(sw.includes('CACHE_VERSION=') && sw.includes(publishedVersion), 'cache version must identify current release');
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'./');
const shellMatch = sw.match(/const APP_SHELL=(\[[\s\S]*?\]);/);
assert.ok(shellMatch,'worker must define an explicit shell');
const shell = JSON.parse(shellMatch[1]);
for (const name of shell) {
  if (name === './') continue;
  assert.ok(name.startsWith('./'), 'shell files must be same-origin relative paths');
  assert.ok(fs.existsSync(path.join(root,name.slice(2))), 'missing precached asset: '+name);
}

async function requestWithNoNetwork(url,mode) {
  const scope='https://ratib.example/Ratib0129/';
  const handlers={};
  let attemptedNetwork=0, handled;
  const cache={
    async match(request) {
      const target=new URL(typeof request==='string'?request:request.url,scope);
      if (target.pathname === '/Ratib0129/trial/index.html') return new Response('CACHED TRIAL INDEX');
      if (target.pathname === '/Ratib0129/' || target.pathname.endsWith('/index.html'))
        return new Response('CACHED INDEX');
      if (target.pathname.endsWith('/ratib-theme.js'))
        return new Response('CACHED JS');
      return null;
    },
    async put() { throw Error('Must not fetch when the shell is locally cached'); }
  };
  const self={
    location:new URL(scope),
    registration:{scope},
    addEventListener(name,fn){handlers[name]=fn;}
  };
  vm.runInNewContext(sw,{self,URL,Response,Set,console,
    caches:{open:async()=>cache},
    fetch:async()=>{attemptedNetwork++;throw Error('Network disabled');}});
  const req={url:new URL(url,scope).href,method:'GET',mode};
  handlers.fetch({request:req,respondWith(p){handled=p;},waitUntil(){}});
  assert.ok(handled,'service worker must handle local request');
  const response=await handled;
  return {text:await response.text(),attemptedNetwork};
}

async function testLicence() {
  const now=Date.now(), month=30*24*3600*1000;
  const state={code:'ACTIVATED-TEST',verifiedAt:now-2*month,checkedAt:now-2*month,
    expiryDate:new Date(now+month).toISOString()};
  const memory=new Map([['ratib_license_client_v2',JSON.stringify(state)]]);
  const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
  let networkCalls=0;
  const client={navigator:{onLine:false},crypto:{randomUUID:()=> 'test-id'}};
  vm.runInNewContext(license,{window:client,localStorage:storage,Date,Set,console,TypeError,
    fetch:async()=>{networkCalls++;throw new TypeError('offline');}});
  assert.equal(client.RatibLicense.TRIAL_LIMIT,50,'preserve free-trial limit');
  assert.equal(await client.RatibLicense.licensed(),true,
    'previously verified unexpired licence must remain valid offline');
  assert.equal(networkCalls,0,'offline access must not call the licensing API');
  memory.set('ratib_license_client_v2',JSON.stringify({...state,expiryDate:new Date(now-month).toISOString()}));
  assert.equal(await client.RatibLicense.licensed(),false,'expired licences still expire locally');
}

(async()=>{
  const page=await requestWithNoNetwork('./','navigate');
  assert.equal(page.text,'CACHED INDEX');
  assert.equal(page.attemptedNetwork,0,'offline page opening must use cache');
  const trialPage=await requestWithNoNetwork('./trial/','navigate');
  assert.equal(trialPage.text,'CACHED TRIAL INDEX','trial navigation must not display official application');
  assert.equal(trialPage.attemptedNetwork,0);
  const script=await requestWithNoNetwork('./ratib-theme.js?v='+publishedVersion,'cors');
  assert.equal(script.text,'CACHED JS');
  assert.equal(script.attemptedNetwork,0,'offline JS must use installed assets');
  await testLicence();
  console.log('PASS Ratib '+publishedVersion+': app shell, offline navigation, versioned JS, and unexpired local licence');
})().catch(e=>{console.error(e);process.exitCode=1;});
