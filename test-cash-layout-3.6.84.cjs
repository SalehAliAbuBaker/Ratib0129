'use strict';
/* Regression contract for the approved Ratib cash voucher mobile layout. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-cash-layout-3.6.84.css','utf8');
const js=fs.readFileSync('ratib-cash-layout-3.6.83.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert(Number(pkg.version.split('.').at(-1)) >= 84, 'Voucher regressions must remain valid after subsequent releases');
assert.match(html,/id="multiVoucherCard"/);
assert.match(html,/id="inpMultiSourceAcc"/);
assert.match(html,/id="multiVoucherLinesBody"/);
assert.match(html,/ratib-cash-layout-3\.6\.83\.js\?v=3\.6\.83/);
assert.match(html,/ratib-cash-layout-3\.6\.84\.css\?v=3\.6\.84/);
assert(html.indexOf('ratib-cash-layout-3.6.83.css')<html.indexOf('ratib-cash-layout-3.6.84.css'),'The correction must override the previous styles');
assert.match(js,/row\.append\(side\)/);
assert.match(js,/row\.append\(amount\)/);
assert.match(js,/source\.after\(tafqit\)/);
const source=/\.multi-voucher-grid\s*>\s*\.multi-voucher-source-row\s*\{([^}]*)\}/.exec(css)?.[1]||'';
const counter=/\.multi-voucher-table tbody tr\s*>\s*td:nth-child\(2\)\s*\{([^}]*)\}/.exec(css)?.[1]||'';
const accountBalance=/\.multi-voucher-source-row\s*>\s*\.ratib-multi-source-balance\s*\{([^}]*)\}/.exec(css)?.[1]||'';
const counterBalance=/\.multi-voucher-table tbody tr\s*>\s*td:nth-child\(2\)\s*>\s*\.ratib-current-balance\s*\{([^}]*)\}/.exec(css)?.[1]||'';
for(const [label,rule] of [['Main account row',source],['Counterpart account row',counter]]){
 assert.match(rule,/display:grid!important/,`${label} must use grid rather than conflicting nowrap flex`);
 assert.match(rule,/grid-template-columns:minmax\(0,1fr\) 40px!important/,`${label} must reserve lock-button width`);
}
for(const [label,rule] of [['Main balance',accountBalance],['Counterpart balance',counterBalance]]){
 assert.match(rule,/grid-column:1\/-1!important/,`${label} must span both columns`);
 assert.match(rule,/grid-row:2!important/,`${label} must occupy its own row`);
}
assert.match(css,/td:nth-child\(2\)\s*>\s*:is\(\.searchable-select-wrap,\.multi-line-account\)/);
assert.match(css,/td:nth-child\(2\)\s*>\s*#ratibLockCounter/);
assert.match(css,/\.multi-voucher-source-row\s*>\s*#ratibLockSource/);
assert.match(sw,/const CACHE_VERSION='v\\d+-[^']+'/);
assert(sw.includes('ratib-cash-layout-3.6.84.css'));
assert.match(sw,/const APP_RELEASE=\\{"version":"3\\.6\\.\\d+"/);
console.log('Ratib cash voucher 3.6.84 layout regression checks passed');
