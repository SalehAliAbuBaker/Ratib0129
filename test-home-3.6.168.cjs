'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),source=fs.readFileSync('ratib-home-3.6.168.js','utf8'),styles=fs.readFileSync('ratib-home-3.6.168.css','utf8'),fav=fs.readFileSync('ratib-favorites-v3.js','utf8'),pulse=fs.readFileSync('ratib-cash-pulse.js','utf8'),pkg=require('./package.json');
assert.doesNotThrow(()=>new vm.Script(source));assert.doesNotThrow(()=>new vm.Script(fav));assert.doesNotThrow(()=>new vm.Script(pulse));
assert.equal(pkg.version,'3.6.194');assert(html.includes('"version":"3.6.194","build":"p19400"'));assert(sw.includes('"version":"3.6.194","build":"p19400"'));
for(const file of ['ratib-home-3.6.168.js','ratib-home-3.6.168.css']){assert(html.includes(file+'?v=3.6.194'));assert(sw.includes(file));}
assert(html.includes('ratib-home-3.6.167.js?v=3.6.194'),'Keep existing home integration');
assert(fav.includes('openQuick')&&fav.includes('choice.run()'),'Quick favorites must execute original saved action');
assert(source.includes('RatibQuickFavorites?.openQuick'),'New bottom shortcut calls direct favorites');
assert(source.includes('RatibPalette?.set?.(')&&source.includes('dataset.ratibColor'),'Header theme selection reuses approved palette');
assert(source.includes("ratib:dhi")===false,'No misspelled notification event');
assert(source.includes('ratib:app-ready')&&source.includes('5000'),'Transient reminder lasts five seconds after unlock');
assert(source.includes('ratib:pulse-summary')&&pulse.includes("CustomEvent('ratib:pulse-summary'"),'Read actual cash pulse values');
assert(!source.includes('getAllTransactions('),'Summary never recategorizes or recalculates accounting data');
assert(!pulse.includes('store.set('),'Pulse remains accounting read-only');
assert(styles.includes('#mainWrap>header #sidebarMenuBtn{display:none!important}'),'Remove redundant header gear');
console.log('PASS Ratib 3.6.170 home refinement and read-only financial summary');
