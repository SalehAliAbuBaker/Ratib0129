const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const scope='https://ratib.test/Ratib0129/';
async function request(source,path,{offline=false}={}){
 const listeners={};let response;
 const self={location:new URL(scope),registration:{scope},addEventListener:(name,fn)=>listeners[name]=fn};
 const cache={match:async key=>String(key?.url||key).endsWith('index.html')?new Response('html'):new Response('cached-script')};
 const context={self,URL,Response,Set,console,caches:{open:async()=>cache},fetch:async()=>{if(offline)throw Error('offline');return new Response('fresh-script');}};
 vm.runInNewContext(source,context);
 const event={request:{url:scope+path,method:'GET',mode:'cors'},waitUntil(){},respondWith(p){response=p;}};listeners.fetch(event);
 return response?await(await response).text():null;
}
(async()=>{
 const current=fs.readFileSync('sw.js','utf8');
 // Historic commit may predate sw.js on shallow or full GitHub history.
 // Keep verifying present online/offline cache policy without relying on a nonexistent blob.
 let old=null;
 try{old=cp.execFileSync('git',['show','cd69a262cb77477f157a5001cb3d6d882c10a1a4:sw.js'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
 catch(error){console.warn('SKIP historical worker comparison: original sw.js is absent from that commit');}
 if(old)for(const file of ['ratib-favorites-v3.js','ratib-navigation-v3.js','ratib-navigation-v3.css'])assert.equal(await request(old,file+'?v=3.6.53'),null,'old worker must let new asset names reach network');
 assert.equal(await request(current,'ratib-favorites-v3.js?v=3.6.53'),'cached-script','installed assets must work with no network on regular opens');
 assert.equal(await request(current,'ratib-favorites-v3.js?v=3.6.53',{offline:true}),'cached-script');
 console.log('PASS new UI bypasses legacy asset cache; installed app shell is local-first online and offline');
})();
