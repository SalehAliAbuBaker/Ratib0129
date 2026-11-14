/* Ratib 3.6.155: non-destructive screen-only UI unification regression. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ratib-ui-unification-3.6.155.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
assert.equal(pkg.version,'3.6.198');
assert.match(html,/const RATIB_RELEASE=\{"version":"3\.6\.198"/);
assert.match(sw,/const APP_RELEASE=\{"version":"3\.6\.198"/);
assert(sw.includes('./ratib-ui-unification-3.6.155.css'),'UI sheet must be cached for offline opening');
assert(html.includes('ratib-ui-unification-3.6.155.css?v=3.6.198'),'New stylesheet must be linked to the live app');
assert(css.startsWith('/* Ratib 3.6.155'));
assert(css.includes('@media screen')&&!css.includes('@media print'),'Accounting print/PDF must not be styled');
for(const id of ['ratibPageNav','ratibVoucherHeading','ratibVoucherSequence','importedOpeningVoucherModal','pageLedger','pageAccountOperations','cashFlowCard','multiVoucherCard','lockDebitAccBtn','lockCreditAccBtn','ratibLockSource','ratibLockCounter']){
  assert(css.includes(id),'Scoped UI contract missing '+id);
}
assert(css.includes('.ratib-native-date-button>small'),'Gregorian date must have separate smaller typography');
assert(css.includes('data-icon="lock"')&&css.includes('data-icon="unlock"'),'Lock appearance must follow original state');
const dom=new JSDOM(html);
const d=dom.window.document;
const account=d.querySelector('#dashboardHomeContent .main-menu-btn[onclick*="pageAccountsTree"]');
assert(account,'Accounts shortcut must retain existing route');
assert.equal(account.querySelector(':scope > span:last-child')?.textContent.trim(),'الحسابات');
const symbol=account.querySelector('.main-menu-icon svg');
assert(symbol,'Accounts tile must remain an SVG icon');
assert(symbol.querySelectorAll('path,rect,circle').length>=5,'Accounts icon should depict a branching chart');
assert.equal(account.getAttribute('onclick'),"navigateToTab('pageAccountsTree', true)");
for(const id of ['lockDebitAccBtn','lockCreditAccBtn']){
 const button=d.getElementById(id);assert(button,'Original lock button '+id+' must be preserved');
 assert(button.textContent.includes('🔓'),'Initial unlocked state should not be rewritten');
}
assert(d.getElementById('ratibPageNav')?.querySelector('#backToMenuBtn'),'Shared nav must preserve the original Back action');
assert.equal(d.getElementById('backToMenuBtn').getAttribute('onclick'),'goBackInApp()');
for(const id of ['voucherDateInput','multiVoucherDate'])assert(d.getElementById(id)?.type==='date','Date storage control changed: '+id);
dom.window.close();
console.log('PASS 3.6.155: official version, common headers, account tree icon, state-bound locks, date and original handlers');
