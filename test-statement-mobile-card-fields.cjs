'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const version=html.match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
assert(['3.6.106','3.6.107.01'].includes(version));
assert(sw.includes('const APP_RELEASE={"version":"'+version+'"'));
const css=html.match(/<style id="ratib-compact-mobile-3\.6\.98">([\s\S]*?)<\/style>/)?.[1];
assert(css,'Mobile statement card stylesheet missing');
const selector='#pageAccountOperations .account-statement-row[data-tx-id]>span';
assert(css.includes(selector+'[data-statement-col="counterpart"]{'));
assert(css.includes('grid-column:1/-1!important'),'Counterpart gets its own full-width row');
for(const [field,label] of [['debit','مدين'],['credit','دائن'],['balance','الرصيد']]){
 assert(css.includes(selector+'.'+field+'::before{content:\''+label+'\'!important}'),field+' label not semantic');
}
for(const n of [4,5,6])assert(!css.includes(selector+':nth-child('+n+'):before'),'Positional label '+n+' must be removed');
assert(css.includes(selector+'.debit:empty::after'));
assert(css.includes(selector+'.credit:empty::after'));
assert(html.includes('const runningBalances=getAccountRunningBalances(txs,scope,opening)'));
assert(html.includes('balance=runningBalances.get(t)'));
assert(sw.includes(version==='3.6.106'?'v198-official-statement-mobile-cols-3.6.106':'v202-trial-safe-text-3.6.107.01'));
for(const source of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(source);
new Function(sw);
console.log('PASS mobile statement debit/credit/balance cards with optional counterpart — '+version);
