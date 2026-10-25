'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-favorites-v3.js','utf8');
const key='ratib.quickFavorites.v2',icons='ratib.quickFavorites.icons.v1';
const labels=[['budget','إدارة بنود الميزانية / التكاليف'],['security','إعدادات الأمان وقفل الحماية'],['printing','إعدادات الطباعة']];
function fixture(seed={}){
 const cards=labels.map(([id,label])=>`<div id="${id}Card" class="settings-accordion-card"><div class="settings-accordion-header"><span>${label}</span></div><div class="settings-accordion-body"></div></div>`).join('');
 const dom=new JSDOM(`<html><head></head><body><div id="pageSettings">${cards}<div id="customCard" class="settings-accordion-card"><div class="settings-accordion-header"><span>إعداد إضافي</span></div><div class="settings-accordion-body"></div></div></div></body></html>`,{url:'https://ratib.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document,calls=[];w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,v);
 w.RatibSettingsOpen=id=>calls.push(id);w.navigateToTab=()=>{};
 d.querySelectorAll('.settings-accordion-header').forEach(h=>h.addEventListener('click',()=>h.nextElementSibling.classList.add('open')));
 w.eval(source);
 return {dom,w,d,calls};
}
(async()=>{
 let f=fixture({[key]:JSON.stringify(['ledger','setting:budgetCard','obsolete']),[icons]:JSON.stringify({ledger:'📊','setting:budgetCard':'💰'}),financial_data:'untouched'});
 try{
  const {w,d}=f;
  for(const [id] of labels){
   d.querySelectorAll('.settings-accordion-body').forEach(b=>b.classList.remove('open'));
   d.querySelector('#'+id+'Card .settings-accordion-body').classList.add('open');
   w.RatibQuickFavorites.open();
   const pin=d.getElementById('ratibPinCurrent');assert(!pin.hidden,id+' current setting must be pinnable');
   assert.equal(pin.dataset.pin,'settings:'+id);pin.click();
   assert(JSON.parse(w.localStorage.getItem(key)).includes('settings:'+id));
   d.querySelector('[data-go="settings:'+id+'"]').click();await Promise.resolve();await Promise.resolve();
   assert.equal(f.calls.at(-1),id,'canonical favorite must call exact setting route');
  }
  assert.deepEqual(JSON.parse(w.localStorage.getItem(key)).slice(0,3),['ledger','setting:budgetCard','obsolete'],'retain prior order and unresolved IDs');
  w.RatibQuickFavorites.open();
  d.querySelector('[data-go="setting:budgetCard"]').click();await Promise.resolve();await Promise.resolve();
  assert(d.querySelector('#budgetCard .settings-accordion-body').classList.contains('open'),'legacy shortcut remains usable');
  d.querySelectorAll('.settings-accordion-body').forEach(b=>b.classList.remove('open'));
  d.querySelector('#customCard .settings-accordion-body').classList.add('open');w.RatibQuickFavorites.open();
  assert.equal(d.getElementById('ratibPinCurrent').dataset.pin,'setting:customCard','unknown settings retain dynamic fallback');
  const saved=w.localStorage.getItem(key),savedIcons=w.localStorage.getItem(icons);
  assert.equal(w.localStorage.getItem('financial_data'),'untouched');
  f.dom.window.close();f=fixture({[key]:saved,[icons]:savedIcons});f.w.RatibQuickFavorites.open();
  assert.equal(f.w.localStorage.getItem(key),saved,'reload preserves selected IDs and order');
  assert.equal(f.w.localStorage.getItem(icons),savedIcons,'reload preserves icons');
  assert(f.d.querySelector('[data-go="setting:budgetCard"]').textContent.includes('💰'));
  assert(f.d.querySelector('[data-go="settings:budget"]'),'new canonical selection survives reload');
  f.d.querySelector('[data-remove="settings:budget"]').click();
  assert(!JSON.parse(f.w.localStorage.getItem(key)).includes('settings:budget'));
  assert(JSON.parse(f.w.localStorage.getItem(key)).includes('setting:budgetCard'),'removing canonical favorite retains legacy favorite');
  console.log('PASS current-setting pin, exact routes, legacy/dynamic shortcuts, add/remove, order/icons after reload and untouched financial storage');
 }finally{f.dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
