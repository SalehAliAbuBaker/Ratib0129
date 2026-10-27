/* Ratib trial 3.6.159: voice + manual input coverage across the application. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-voice-dictation-3.6.117.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
assert.doesNotThrow(()=>new Function(source));
const trial=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert(trial&&worker.includes('"version":"'+trial+'"'),'Application and offline worker releases should match');
assert(html.includes('الإصدار '+trial),'Trial banner must show release');
assert(worker.includes(trial),'Cache identifier must contain release');
assert(html.includes('ratib-voice-dictation-3.6.117.js?v='+trial),'Original voice implementation must remain linked');
assert.doesNotMatch(source,/saveVoucher\(|saveTransaction\(|submitVoucher\(/);

async function main(){
 const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><head></head><body>'+
  '<div id="pageSettings"></div>'+
  '<div id="editModal" role="dialog"><input id="modalName" type="text">'+
  '<textarea id="modalNote"></textarea>'+
  '<input id="modalRate" type="text" inputmode="decimal">'+
  '<input id="ledgerDate" type="date"><input id="reminderTime" type="time">'+
  '<select id="currency"><option value="">اختر العملة</option><option value="YER">🇾🇪 ر.ي</option><option value="SAR">🇸🇦 ر.س</option><option value="USD">USD</option></select>'+
  '<input id="accountSearch" type="search" list="accounts">'+
  '<datalist id="accounts"><option>صندوق أحمد</option></datalist></div>'+
  '<input id="pin" type="password" value="secret">'+
  '<input id="disabled" type="text" disabled>'+
  '<input id="readonly" type="text" readonly>'+
  '<input id="file" type="file">'+
  '<input id="hidden" type="hidden">'+
  '<input id="checkbox" type="checkbox">'+
  '</body></html>',{url:'https://ratibtrial.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
 const win=dom.window,d=win.document;
 let instances=[],started=0;
 class SpeechMock{start(){started++;}stop(){this.onend?.();}}
 win.SpeechRecognition=function(){const engine=new SpeechMock();instances.push(engine);return engine;};
 win.eval(source);
 const mic=d.getElementById('ratibVoiceButton'),check=d.getElementById('ratibVoiceVisible');
 assert(check&&!check.checked);
 check.checked=true;check.dispatchEvent(new win.Event('change',{bubbles:true}));
 const field=id=>d.getElementById(id);
 const say=(id,transcript)=>{
  const node=field(id);node.focus();const before=started;
  mic.click();assert.equal(started,before+1,'microphone starts for '+id);
  instances.at(-1).onresult({resultIndex:0,results:[{0:{transcript},isFinal:true}]});
  mic.click();
 };
 say('modalName','شركة المدى');
 assert.equal(field('modalName').value,'شركة المدى','Modal text field accepts direct dictation');
 say('modalNote','ملاحظات السند');
 assert.equal(field('modalNote').value,'ملاحظات السند','Modal textarea supports voice typing');
 let count=0;field('modalRate').addEventListener('input',()=>count++);
 say('modalRate','١٬٢٣٤٫٥');
 assert.equal(field('modalRate').value,'1234.5','Decimal text fields parse Arabic figures');
 assert.equal(count,1,'Amount triggers normal input handlers');
 say('modalRate','١٢,٥٠');
 assert.equal(field('modalRate').value,'1234.5','Ambiguous comma must not corrupt an amount');
 say('ledgerDate','٢٢ ١٠ ٢٠٢٦');
 assert.equal(field('ledgerDate').value,'2026-10-22','Valid Arabic-digit date');
 say('ledgerDate','٣١ ٠٢ ٢٠٢٦');
 assert.equal(field('ledgerDate').value,'2026-10-22','Invalid date cannot overwrite valid date');
 say('reminderTime','الساعة ١٤:٣٠');
 assert.equal(field('reminderTime').value,'14:30','Valid 24-hour time');
 say('currency','ريال سعودي');
 assert.equal(field('currency').value,'SAR','A unique currency voice match selects correct option');
 say('currency','درهم');
 assert.equal(field('currency').value,'SAR','Unknown option must not change selection');
 say('accountSearch','صندوق أحمد');
 assert.equal(field('accountSearch').value,'صندوق أحمد','Dynamic account datalist can take voice');
 for(const id of ['pin','disabled','readonly','file','hidden','checkbox']){
  field(id).focus();const before=started;
  mic.click();assert.equal(started,before,'Voice cannot target '+id);
 }
 assert.equal(field('pin').value,'secret','PIN is never edited by speech');
 dom.window.close();
 console.log('PASS trial 3.6.159: modal, note, accounting numbers, dates, times, unique selects, datalist and protected inputs');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
