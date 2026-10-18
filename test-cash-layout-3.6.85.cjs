'use strict';
/* Structural regression tests for compact, matching cash voucher account rows. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('ratib-cash-layout-3.6.85.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('package.json','utf8'));
const source=sel=>css.slice(css.indexOf(sel));
assert.equal(manifest.version,'3.6.85');
assert.match(html,/ratib-cash-layout-3\.6\.85\.css\?v=3\.6\.85/);
assert(html.indexOf('ratib-cash-layout-3.6.84.css')<html.indexOf('ratib-cash-layout-3.6.85.css'),'New stylesheet must override previous release');
assert.match(css,/\.multi-voucher-grid\s*>\s*\.ratib-approved-head-row\s*\{\s*grid-column:1\/-1!important;\s*grid-row:2!important;/);
for(const selector of [
  '.multi-voucher-grid > label:has(#multiVoucherBaseCurrency)',
  '.multi-voucher-grid > #ratibHeaderFx',
  '.multi-voucher-grid > .spend-budget-header'
])assert.match(source(selector).slice(0,160),/grid-row:3!important/,'Top currency/equivalent/budget must follow amount');
assert.match(source('.multi-voucher-grid > .multi-voucher-source-row').slice(0,170),/grid-row:4!important/,'Top account must follow currency');
assert.match(source('.multi-voucher-grid > #spendTafqit').slice(0,155),/grid-row:5!important/,'Tafqit should follow top account');
for(const [column,row] of [['(3)',1],['(4)',2],['(6)',2],['(2)',3],['(7)',4]]) {
  const token='tbody tr > td:nth-child'+column;
  assert.match(source(token).slice(0,170),new RegExp('grid-row:'+row+'!important'),token+' is in the wrong counterpart row');
}
assert.match(css,/grid-template-columns:minmax\(0,1fr\) 40px!important/g);
assert.match(css,/\.searchable-select-wrap\s*>\s*\.searchable-input\s*\{/,'Both account selectors must share an input style');
assert.match(css,/#ratibLockSource/);
assert.match(css,/#ratibLockCounter/);
assert.match(css,/grid-row:2!important;[\s\S]*?overflow-wrap:anywhere!important/);
assert.match(sw,/v92-cash-fields-3\.6\.85/);
assert.match(sw,/ratib-cash-layout-3\.6\.85\.css/);
assert.match(sw,/const APP_RELEASE=\{"version":"3\.6\.85"/);
console.log('Ratib 3.6.85 approved account row parity and currency order regression: PASS');
