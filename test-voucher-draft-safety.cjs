const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const code=html.slice(html.indexOf('async function ratibGestureDraftCheck(){'),html.indexOf('function ratibGestureDashboard('));
async function check(choice,multi=false,fail=false,prior=null){
 const dom=new JSDOM(`<div id="cashFlowCard" class="${multi?'hidden':''}"></div><div id="multiVoucherCard" class="${multi?'':'hidden'}"></div><input id="voucherAmountInput" value="123"><input id="voucherRecipientInput" value="test"><input id="voucherNoteInput" value="draft">`);
 const ledger=[{id:'posted',amount:99}],data={plan:ledger,multi_voucher_drafts:[{id:'other',amount:77}],single_voucher_draft_v1:{amount:123}},writes=[];
 let resets=0;const c={document:dom.window.document,window:{},currentActiveTab:'pageExpenses',hasUnsavedChanges:true,_draftTimer:null,_ratibSingleDraftPrior:prior,multiVoucherDraftId:null,clearTimeout,cloneData:structuredClone,showToast(){},ratibAskDraftExit:async()=>choice,store:{get:(k,d)=>data[k]??d,set:(k,v)=>{writes.push(k);data[k]=v},remove:k=>{writes.push(k);delete data[k]}},flushStorage:async()=>{if(fail)throw Error('disk failure')},captureSingleDraft:()=>({amount:123}),updateDraftButton(){},buildMultiVoucherData:()=>({id:'draft-new',amount:123}),resetMultiVoucherForm(){resets++},selDebitAcc:{setValue(){}},selCreditAcc:{setValue(){}}};
 vm.createContext(c);vm.runInContext(code,c);const result=await c.ratibGestureDraftCheck();
 assert.equal(data.plan,ledger);assert(writes.every(k=>['multi_voucher_drafts','single_voucher_draft_v1'].includes(k)));
 if(choice==='stay'){assert.equal(result,false);assert.equal(writes.length,0);assert(c.hasUnsavedChanges)}
 else if(fail){assert.equal(result,false);assert(c.hasUnsavedChanges);assert.equal(c.document.getElementById('voucherAmountInput').value,'123')}
 else {assert.equal(result,true);assert.equal(c.hasUnsavedChanges,false);if(choice==='save'&&multi){assert.equal(data.multi_voucher_drafts.length,2);assert.equal(data.multi_voucher_drafts[0].id,'other')}if(choice==='discard'){if(multi)assert.equal(resets,1);else {assert.equal(c.document.getElementById('voucherAmountInput').value,'');if(prior?.exists)assert.deepEqual(data.single_voucher_draft_v1,prior.value);else if(prior)assert(!('single_voucher_draft_v1' in data))}}}
 dom.window.close();
}
(async()=>{for(const multi of [false,true])for(const choice of ['stay','save','discard'])await check(choice,multi);await check('save',false,true);await check('save',true,true);await check('discard',false,false,{exists:true,value:{amount:55}});await check('discard',false,false,{exists:false,value:null});await check('discard',false,true,{exists:true,value:{amount:55}});console.log('PASS 11 actual draft-exit safety cases: cancel, save, discard, failed storage, prior draft preservation, posted ledger untouched');})().catch(e=>{console.error(e);process.exitCode=1});
