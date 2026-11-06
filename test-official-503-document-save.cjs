// Full official Ratib voucher form / local accounting storage under a simulated
// licensing Worker 503 and subsequent recovery. All data and licenses are fake,
// and no real network, real customer store, Cloudflare binding or Worker is used.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');

const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const licenseSource=fs.readFileSync(path.join(__dirname,'ratib-license-draft.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=Date.now(), DAY=86400000;
let serverStatus=503;
const requests=[],errors=[];
const seed={
  code:'LIC-INTEGRATION-FAKE-ONLY',deviceId:'integration-test-only-device',
  verifiedAt:now-2*3600000,checkedAt:now-2*3600000,
  expiryDate:new Date(now+30*DAY).toISOString(),used:50
};
const vconsole=new VirtualConsole();
vconsole.on('jsdomError',e=>errors.push(String(e.message)));
const dom=new JSDOM(html,{
  url:'https://ratib-integration.invalid/Ratib0129/',
  runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vconsole,
  beforeParse(w){
    w.localStorage.setItem('ratib_license_client_v2',JSON.stringify(seed));
    const idb=new IDBFactory();
    Object.defineProperty(w,'indexedDB',{value:idb});
    Object.defineProperty(w,'crypto',{value:webcrypto});
    w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
    w.structuredClone=structuredClone;w.Blob=Blob;w.File=File;
    w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'test-only-pin';
    w.close=()=>{};w.scrollTo=()=>{};
    w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.HTMLElement.prototype.scrollTo=()=>{};
    const blobs=new Map();
    w.URL.createObjectURL=blob=>{const key='blob:fake-'+blobs.size;blobs.set(key,blob);return key;};
    w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>({
      font:'',textAlign:'right',direction:'rtl',fillRect(){},strokeRect(){},
      beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},
      measureText(s){return {width:String(s).length*10}},fillText(){}
    });
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,/9j/2Q==';
    w.fetch=async (url,options)=>{
      const target=String(url);
      assert(target.endsWith('/api/license/verify'),'No unexpected network request: '+target);
      assert.equal(options?.method,'POST');
      requests.push({url:target,status:serverStatus});
      const status=serverStatus;
      return {ok:status===200,status,json:async()=>({
        valid:status===200,expiry_date:new Date(now+30*DAY).toISOString(),
        error:status===503?'Simulated D1/Worker outage (sandbox only)':'Rejected'
      })};
    };
  }
});
const w=dom.window,d=w.document;
const code=s=>w.eval(s);
function input(el,value){
  assert(el,'Voucher account field exists');
  el.value=value;
  el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
}
async function boot(){
  let ok=false;
  for(let i=0;i<500;i++){
    try{ok=code('typeof selDebitAcc!=="undefined" && !!selDebitAcc && typeof ledgerNeedsRender!=="undefined"');}catch{}
    if(ok)break;
    await sleep(10);
  }
  assert(ok,'Original official accounting UI boots');
  await sleep(50);
  assert.deepEqual(errors,[],'No jsdom boot errors');
  // External scripts are not loaded by jsdom; load the actual production
  // licensing module, rather than mocking RatibLicense.beforeCreate.
  w.eval(licenseSource);
  assert.equal(typeof w.RatibLicense.beforeCreate,'function');
}
async function saveVoucher(mode,expectedStatus){
  serverStatus=expectedStatus;
  const before=code('getAllTransactions().length');
  const priorUsed=JSON.parse(w.localStorage.getItem('ratib_license_client_v2')).used;
  code('multiVoucherLines=[];multiVoucherDraftId="";selectVoucherTypeDirect('+JSON.stringify(mode)+');');
  const name=code('getMultiAccountItems()[0].text');
  code('addMultiVoucherLine()');
  let inputs=[...d.querySelectorAll('#multiVoucherLinesBody .voucher-account-search input')];
  assert(inputs.length>=2,'Multiple voucher lines visible');
  input(inputs[0],name);
  inputs=[...d.querySelectorAll('#multiVoucherLinesBody .voucher-account-search input')];
  input(inputs[1],name);
  input(d.getElementById('inpMultiSourceAcc'),name);
  code('multiVoucherLines[0].amount="10";multiVoucherLines[1].amount="20";document.getElementById("ratibHeaderAmount").value="30";syncMultiAutoBalance()');
  assert.equal(code('validateMultiVoucher()'),'','Original form validation passes');
  const beforeCalls=requests.length;
  await code('commitMultiVoucher()');
  await code('flushStorage()');
  const after=code('getAllTransactions().length');
  const state=JSON.parse(w.localStorage.getItem('ratib_license_client_v2'));
  assert(after>before,mode+' saves real voucher/accounting rows despite '+expectedStatus);
  assert.equal(requests.length,beforeCalls+1,mode+' requests license verification once');
  assert.equal(requests.at(-1).status,expectedStatus);
  assert(state.verifiedAt>0,'Prior activation proof preserved');
  assert.equal(state.used,priorUsed+1,'Actual form save increments licensed document counter');
  return {mode,serverStatus:expectedStatus,createdRows:after-before,used:state.used};
}
async function run(){
  try{
    await boot();
    const scenarios=[];
    scenarios.push(await saveVoucher('spend',503));
    scenarios.push(await saveVoucher('income',200));
    assert.equal(requests.length,2,'Exactly one verification per voucher save');
    assert.equal(code('getAllTransactions().length')>0,true,'Journal remains readable');
    console.log('PASS official voucher UI + real accounting save: payment under 503, receipt after recovery 200, verified license and persisted local data');
    return scenarios;
  }finally{w.close();}
}
module.exports={run};
if(require.main===module)run().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
