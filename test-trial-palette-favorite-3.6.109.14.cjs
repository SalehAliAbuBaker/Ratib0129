'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ratib-favorites-v3.js','utf8');
const KEY='ratib.quickFavorites.v2',ICONS='ratib.quickFavorites.icons.v1';
function fixture(seed={},withPaletteCard=false){
 const card=withPaletteCard?'<div id="ratibPaletteSettingsCard" class="settings-accordion-card"><div class="settings-accordion-header"><span>ألوان واجهة راتب</span></div><div class="settings-accordion-body"></div></div>':'';
 const dom=new JSDOM('<html lang="ar"><head></head><body><section id="pageSettings">'+card+'</section></body></html>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,opened=[];
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
 w.RatibSettingsOpen=key=>opened.push(key);
 w.navigateToTab=()=>{};
 for(const [key,val] of Object.entries(seed))w.localStorage.setItem(key,val);
 w.eval(source);
 return {w,d,dom,opened};
}
(async()=>{
 let f=fixture({finance_ledger:'unchanged'});
 try{
  f.w.RatibQuickFavorites.open();
  const add=f.d.querySelector('[data-add="settings:palette"]');
  assert(add,'Palette favorite must be selectable even before palette Settings card is created');
  add.click();
  assert.deepEqual(JSON.parse(f.w.localStorage.getItem(KEY)),['settings:palette']);
  assert(f.d.querySelector('[data-go="settings:palette"]'),'Added favorite appears immediately');
  const saved=f.w.localStorage.getItem(KEY);
  f.dom.window.close();
  f=fixture({[KEY]:saved,finance_ledger:'unchanged'});
  f.w.RatibQuickFavorites.open();
  assert(f.d.querySelector('[data-go="settings:palette"]'),'Favorite stays visible after restart without the Settings card');
  f.d.querySelector('[data-go="settings:palette"]').click();
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(f.opened,['palette'],'Favorite opens exact palette Settings');
  assert.equal(f.w.localStorage.getItem('finance_ledger'),'unchanged');
  f.dom.window.close();
  const old='setting:ratibPaletteSettingsCard';
  f=fixture({[KEY]:JSON.stringify(['ledger',old,'settings:budget']),
     [ICONS]:JSON.stringify({[old]:'⚙️'}),finance_ledger:'untouched'},true);
  const expected=['ledger','settings:palette','settings:budget'];
  assert.deepEqual(JSON.parse(f.w.localStorage.getItem(KEY)),expected,'Old palette ID is automatically migrated in-place');
  assert.equal(f.d.querySelectorAll('[data-add="setting:ratibPaletteSettingsCard"]').length,0,'No duplicate legacy shortcut is offered');
  f.w.RatibQuickFavorites.open();
  assert(f.d.querySelector('[data-go="settings:palette"]'),'Migrated favorite is visible');
  assert.equal(f.w.localStorage.getItem('finance_ledger'),'untouched');
  const afterMigration=f.w.localStorage.getItem(KEY);
  f.dom.window.close();
  f=fixture({[KEY]:afterMigration,finance_ledger:'untouched'});
  f.w.RatibQuickFavorites.open();
  assert(f.d.querySelector('[data-go="settings:palette"]'),'Migrated shortcut remains visible without palette card after reopening');
  f.d.querySelector('[data-go="settings:palette"]').click();
  await Promise.resolve();await Promise.resolve();
  assert.equal(f.opened.at(-1),'palette');
  f.d.querySelector('[data-remove="settings:palette"]').click();
  assert(!JSON.parse(f.w.localStorage.getItem(KEY)).includes('settings:palette'),'Removal of canonical favorite works');
  assert.equal(f.w.localStorage.getItem('finance_ledger'),'untouched');
  console.log('PASS trial 3.6.109.14 palette favorite add, persistent reload, legacy migration, stable route and accounting safety');
 }finally{f.dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
