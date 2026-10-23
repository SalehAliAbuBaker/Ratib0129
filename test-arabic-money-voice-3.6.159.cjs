/* Trial 3.6.159: Arabic voice amounts are never guessed or autosaved. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),vm=require('node:vm');
const source=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const amountSource=fs.readFileSync('ratib-amount-edit-3.6.97.js','utf8');
assert.doesNotThrow(()=>new vm.Script(source));
assert.doesNotThrow(()=>new vm.Script(amountSource));

async function run(){
 const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
  '<div id="pageSettings"></div><input id="amount" type="text" inputmode="decimal" value="36,152">'+
  '<input id="nativeNumber" type="number" value="50">'+
  '<input id="unitPrice" type="text" inputmode="decimal" value="12.5">'+
  '<textarea id="note">ملاحظة محفوظة</textarea></body></html>',
  {url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,transcripts=[],warnings=[],instances=[];
 class SpeechMock{start(){} stop(){this.onend?.();}}
 w.SpeechRecognition=function(){const recognition=new SpeechMock();instances.push(recognition);return recognition;};
 w.showToast=(msg,kind)=>{if(kind==='warn')warnings.push(msg);};
 w.eval(amountSource);w.eval(source);
 const mic=d.getElementById('ratibVoiceButton');
 const enable=d.getElementById('ratibVoiceVisible');enable.checked=true;enable.dispatchEvent(new w.Event('change',{bubbles:true}));
 let inputEvents=0;const amount=d.getElementById('amount');amount.addEventListener('input',()=>inputEvents++);
 const say=(id,phrase)=>{
  const target=d.getElementById(id);target.focus();const previous=instances.length;
  mic.click();assert.equal(instances.length,previous+1,'start microphone for '+id);
  instances.at(-1).onresult({resultIndex:0,results:[{0:{transcript:phrase},isFinal:true}]});
  transcripts.push(phrase);mic.click();
  return target.value;
 };
 assert.equal(say('amount','ستة وثلاثين ألفًا ومئة واثنين وخمسين'),'36,152','Arabic words produce correctly grouped voucher amount');
 assert.equal(say('amount','٣٦٬١٥٢'),'36,152','Arabic thousands separator remains valid');
 assert.equal(say('amount','٣٦,١٥٢'),'36,152','Western comma with Arabic digits is accepted');
 assert.equal(say('amount','ستة وثلاثين ألف ومية واثنين وخمسين'),'36,152','Yemeni colloquial hundred form is understood');
 assert.equal(say('amount','١٢,٥٠'),'36,152','Ambiguous comma cannot replace last valid amount');
 assert.equal(say('amount','خمسة وثلاثين أربعة'),'36,152','Ill-formed expression cannot replace valid amount');
 assert.equal(say('nativeNumber','ثلاثة آلاف ومئتين وخمسين'),'3250','HTML number inputs receive plain decimal digits');
 assert.equal(say('unitPrice','مئة فاصلة خمسة وعشرين'),'100.25','Spoken fractions are parsed precisely');
 assert.equal(say('unitPrice','خمسة فاصلة صفر خمسة'),'5.05','Leading fractional zero is preserved');
 assert.equal(say('unitPrice','خمسة فاصلة'),'5.05','Incomplete decimals cannot overwrite price');
 assert.equal(say('note','بند إضافي').includes('بند إضافي'),true,'Dictation still supports ordinary text');
 assert(inputEvents>=4,'Standard input events reach existing voucher formatting and validators');
 assert(warnings.length>=3&&warnings.some(x=>x.includes('لم تتغير القيمة')),'Invalid amounts have a concise preservation warning');
 assert(!/saveVoucher\(|saveTransaction\(|submitVoucher\(/.test(source),'Voice module cannot post transactions');
 dom.window.close();
 console.log('PASS 3.6.159: Arabic words, colloquial phrasing, grouped digits, fractional currency, invalid-amount safeguards, existing input events');
}
run().catch(err=>{console.error(err);process.exitCode=1;});
