'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const root=path.resolve(__dirname,'../..'),assets=path.join(root,'android/app/src/main/assets/www');
const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');
const results=[],fixtures=[];const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture({idb=new IDBFactory(),seed={},assetRoot=assets}={}){
 const calls=[],files=new Map(),errors=[],toasts=[],confirmations=[],fault={checkpoint:false,persist:false,license:null,google:false},state={picked:null};
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
 const dom=new JSDOM(fs.readFileSync(path.join(assetRoot,'index.html'),'utf8').replace('androidStorageRead.then(boot)', 'androidStorageRead.then((function(original){return function(){const value=original();window.__fixtureBootComplete=true;return value;};})(boot))'),{url:'https://app.ratib.local/index.html',runScripts:'dangerously',pretendToBeVisual:true,resources:new class extends ResourceLoader{fetch(url){const u=new URL(url);if(u.hostname!=='app.ratib.local')return null;const file=path.join(assetRoot,decodeURIComponent(u.pathname));return fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}}(),virtualConsole:vc,beforeParse(w){
  w.Blob=Blob;w.File=File;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Response=Response;w.structuredClone=structuredClone;w.fetch=fetch;
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w,'indexedDB',{value:idb});
  for(const [k,v]of Object.entries(seed))w.localStorage.setItem(k,v);
  w.alert=()=>{};w.confirm=text=>{confirmations.push(text);return state.confirm!==false;};w.prompt=()=>state.pin||'fixture-pin';
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.close=()=>{};
  w.URL.createObjectURL=()=>`blob:test-${Math.random()}`;w.URL.revokeObjectURL=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>({measureText:s=>({width:String(s).length*8}),fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},drawImage(){}});
  w.RatibNative={capabilities:()=>JSON.stringify({biometric:false,notifications:false,androidVersion:32}),beginFile(id,name,mime,action){files.set(id,{name,mime,action,chunks:[]});return '';},appendFile(id,b64){files.get(id).chunks.push(Buffer.from(b64,'base64'));return '';},abortFile(id){files.delete(id);},request(id,method,json){const args=JSON.parse(json);calls.push({method,args});queueMicrotask(()=>{let ok=true,value=true;
   if(method==='treeStatus')value={available:false};
   if(method==='finishFile'&&files.get(args.fileId).action==='checkpoint'){if(fault.checkpoint){ok=false;value='تعذر حفظ نسخة التراجع';}else state.checkpoint=Buffer.concat(files.get(args.fileId).chunks).toString();}
   if(method==='chooseBackup'){if(state.cancel){ok=false;value={name:'AbortError',message:'أُلغي الاختيار'};}else value={name:'ratib-fixture.json',readId:'test-reader',size:Buffer.byteLength(state.picked)};}
   if(method==='readBackupChunk')value=Buffer.from(state.picked).subarray(args.offset,args.offset+49152).toString('base64');
   if(method==='licenseRequest'){if(fault.license==='network'){ok=false;value={name:'TypeError',message:'تعذر الاتصال بخادم التراخيص'};}else value={status:fault.license==='rejected'?403:200,body:JSON.stringify(fault.license==='rejected'?{valid:false,error:'تم إيقاف الترخيص.'}:{valid:true,expiry_date:null})};}
   if(method==='googleAuthorize'){if(fault.google){ok=false;value='إعداد Google لأندرويد غير مكتمل';}else value={email:args.email||'fixture@example.test'};}
   if(method==='driveRequest'){
    let body;
    if(args.url.includes('/about'))body={user:{emailAddress:'fixture@example.test'}};
    else if(args.url.includes('/upload/')&&args.method==='POST'){
     const sections=args.body.split('\r\n\r\n'),meta=JSON.parse(sections[1].split('\r\n')[0]),content=sections[2].split('\r\n--')[0];
     state.driveFile={id:'fixture-upload',name:meta.name,parents:meta.parents,mimeType:meta.mimeType,trashed:false,size:String(Buffer.byteLength(content))};body={id:state.driveFile.id,name:state.driveFile.name};
    }else if(args.url.includes('/files/fixture-upload?'))body=state.driveFile;
    else body=args.method==='POST'?{id:'fixture-folder',name:JSON.parse(args.body||'{}').name}:{files:[]};
    value={status:200,body:JSON.stringify(body)};
   }
   w.__ratibNativeResult(id,ok,value);
  });}};
 }});
 const w=dom.window;

 const deadline=Date.now()+60000;while(Date.now()<deadline){try{if(w.__fixtureBootComplete)break;}catch{}await pause(10);}
 assert(w.eval('typeof store==="object"'));assert(w.__fixtureBootComplete,'App initialization timeout');w.showToast=(text)=>toasts.push(text);
 while(!w.document.getElementById('restoreCheckpointBtn')&&Date.now()<deadline)await pause(10);
 const f={dom,w,idb,calls,files,errors,toasts,confirmations,fault,state};fixtures.push(f);await pause(300);return f;
}
const evalIn=(f,s)=>f.w.eval(s);
const snapshot=f=>evalIn(f,'JSON.stringify(_snapshotMemStore())');
const backup=f=>evalIn(f,'buildBackupPayload()');
const put=(f,k,v)=>{f.w.__fixture=v;evalIn(f,`store.set(${JSON.stringify(k)},__fixture)`);};
const importFile=(f,p)=>f.w.importBackupFile(new File([typeof p==='string'?p:JSON.stringify(p)],'ratib-test.json',{type:'application/json'}));
const test=async(name,fn)=>{await fn();results.push({name,status:'passed'});console.log('PASS',name);};

(async()=>{const f=await fixture();assert.equal(f.w.RATIB_RELEASE?.version||f.w.eval('RATIB_RELEASE.version'),'3.6.216');assert(f.w.__ratibProceedInitialized);assert(f.w.document.getElementById('ratibSettingsDirectory211'));assert(f.w.document.getElementById('ratibSmartUserGuide'));assert.equal(f.w.document.getElementById('pageDashboard').classList.contains('hidden'),false);assert.equal(f.errors.length,0,JSON.stringify(f.errors));console.log('PASS Android 3.6.216 packaged startup, home, native adapters and no script errors');})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fixtures.forEach(f=>f.dom.window.close());setTimeout(()=>process.exit(process.exitCode||0),100);});
