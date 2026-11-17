'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const calls=[],files=new Map();let failSave=false;
const consoleView=new VirtualConsole();consoleView.on('jsdomError',e=>{throw e;});
const dom=new JSDOM('<!doctype html><html dir="rtl"><head><style>@media print{.hide{display:none}}</style></head><body class="printing-voucher"><input value="old"><div id="printVoucherContainer">اختبار راتب</div></body></html>',{url:'https://app.ratib.local/index.html',runScripts:'outside-only',virtualConsole:consoleView,beforeParse(win){
 win.Blob=Blob;win.File=File;win.TextEncoder=TextEncoder;win.TextDecoder=TextDecoder;Object.defineProperty(win,'crypto',{value:webcrypto});
 win.FileReader=class {readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload?.();}).catch(error=>{this.error=error;this.onerror?.();});}};
 win.URL.createObjectURL=()=>`blob:ratib-${files.size}-${Math.random()}`;win.URL.revokeObjectURL=()=>{};
 win.RatibNative={capabilities:()=>JSON.stringify({biometric:true,notifications:true}),
 beginFile(id,name,mime,action){files.set(id,{name,mime,action,chunks:[]});return '';},
 appendFile(id,chunk){files.get(id).chunks.push(Buffer.from(chunk,'base64'));return '';},abortFile(id){files.delete(id);},
 request(id,method,json){const args=JSON.parse(json);calls.push({method,args});queueMicrotask(()=>win.__ratibNativeResult(id,!(failSave&&method==='finishFile'),method==='notificationPermission'?'granted':true));}};
}});
const w=dom.window;
w.eval(fs.readFileSync(path.join(root,'android/web/ratib-native-bridge.js'),'utf8'));
async function run(){
 let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
 const bytes=webcrypto.getRandomValues(new Uint8Array(65536));
 const blob=new Blob([bytes,bytes,bytes,bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 await w.RatibAndroid.sendFile(blob,'ميزان المراجعة.xlsx');
 let file=[...files.values()].at(-1);
 check('Native chunked export keeps every byte across chunk boundaries',()=>assert.deepEqual(Buffer.concat(file.chunks),Buffer.concat([Buffer.from(bytes),Buffer.from(bytes),Buffer.from(bytes),Buffer.from(bytes)])));
 check('Excel filename and MIME passed to Android unchanged',()=>{assert.equal(file.name,'ميزان المراجعة.xlsx');assert.equal(file.mime,blob.type);assert.equal(file.action,'save');});
 await w.navigator.share({files:[new File(['%PDF-1.4\nاختبار'],'تقرير.pdf',{type:'application/pdf'})]});
 check('Sharing uses native share operation with real PDF bytes',()=>{file=[...files.values()].at(-1);assert.equal(file.action,'share');assert(Buffer.concat(file.chunks).toString().startsWith('%PDF-1.4'));});
 const anchor=w.document.createElement('a');anchor.href=w.URL.createObjectURL(new Blob(['{"app":"ratib","data":{}}'],{type:'application/json'}));anchor.download='backup.json';anchor.click();w.URL.revokeObjectURL(anchor.href);
 await new Promise(r=>setTimeout(r,20));
 check('Immediate URL revocation does not truncate asynchronous backup save',()=>{file=[...files.values()].at(-1);assert.equal(file.name,'backup.json');assert.equal(JSON.parse(Buffer.concat(file.chunks).toString()).app,'ratib');});
 w.document.querySelector('input').value='new';w.document.documentElement.classList.add('ratib-print-landscape');let finished=false;w.addEventListener('afterprint',()=>finished=true);w.print();await new Promise(r=>setTimeout(r,10));
 check('Native print captures report class, input state and landscape before cleanup',()=>{const call=calls.find(x=>x.method==='print');assert.equal(call.args.landscape,true);assert(call.args.html.includes('printing-voucher'));assert(call.args.html.includes('value="new"'));assert(!call.args.html.includes('<script'));assert(finished);});
 check('Notification permission routes to Android',()=>assert.equal(w.Notification.permission,'granted'));
 assert.equal(await w.Notification.requestPermission(),'granted');checks++;
 failSave=true;await assert.rejects(w.RatibAndroid.sendFile(new Blob(['123']),'cancel.json'));checks++;failSave=false;
 await assert.rejects(w.RatibAndroid.sendFile({size:129*1024*1024},'oversize.json'));checks++;
 check('Native credentials do not expose a vault key or PIN',()=>assert(!calls.some(x=>/pin|vault|key/i.test(JSON.stringify(x.args)))));
 console.log(JSON.stringify({passed:checks,failed:0}));w.close=()=>{};dom.window.close();
}
run().catch(e=>{console.error(e);process.exitCode=1;});
