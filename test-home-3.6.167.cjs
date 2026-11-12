'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),src=fs.readFileSync('ratib-home-3.6.167.js','utf8'),css=fs.readFileSync('ratib-home-3.6.167.css','utf8');
assert.doesNotThrow(()=>new vm.Script(src));assert.equal(require('./package.json').version,'3.6.183');
for(const f of ['ratib-home-3.6.167.js','ratib-home-3.6.167.css']){assert(html.includes(f+'?v=3.6.183'));assert(sw.includes(f));}
for(const x of ['ratibHomeWeekday','ratibHomeHijri','ratibHomeGregorian','ratibHomeSmartSearch','ratibHomeInventory','ratibHomeBottomNav','RatibQuickFavorites','getAllTransactions','getCanonicalCatalog','ratibPulseToggle'])assert(src.includes(x),x);
assert(src.includes('islamic-umalqura'));assert(!src.includes('store.set('));assert(css.includes('repeat(3,minmax(0,1fr))'));assert(html.includes("onclick=\"openDashboardVoucher('spend')\""));
console.log('PASS Ratib 3.6.170 home layout and release wiring');