'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('ratib-interface-font-3.6.148.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.111');
assert(html.includes('ratib-interface-font-3.6.148.css?v=3.6.111'));
assert(css.includes('--ratib-input-font-size:clamp(12px,calc(14px * var(--ratib-font-scale)),18px)'));
assert(css.includes('@layer ratib-official-field-type'));
assert(css.includes('font-weight:400!important'));
for(const kind of ['input:not([type="hidden"])','select','textarea'])assert(css.includes(kind),kind+' must be covered');
for(const excluded of ['checkbox','radio','hidden','file','color','range','submit','reset','button','image'])assert(css.includes('not([type="'+excluded+'"])'));
for(const [name,scale,expected] of [['xsmall',.82,12],['small',.9,12.6],['normal',1,14],['large',1.1,15.4],['xlarge',1.2,16.8]]){
 assert(css.includes('--ratib-font-scale:'+String(scale).replace(/^0\./,'.')) || css.includes('--ratib-font-scale:'+scale),'existing '+name+' preference must remain');
 assert(Math.abs(Math.max(12,Math.min(18,14*scale))-expected)<.001,name);
}
assert(css.includes('@media print'),'print reset must remain');
console.log('PASS official field typography: 14px normal weight, Settings scale, excluded controls and print');
