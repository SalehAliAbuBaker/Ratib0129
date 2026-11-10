/* Ratib Arabic Alef-equivalence search regression, display/search only. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=fs.readFileSync('index.html','utf8');
const commerce=fs.readFileSync('ratib-commerce-3.6.131.js','utf8');
const pulse=fs.readFileSync('ratib-cash-pulse.js','utf8');
function extract(source,name){
 const i=source.indexOf('function '+name+'(');assert.ok(i>=0,name+' is defined');
 const open=source.indexOf('{',i);let level=0;
 for(let k=open;k<source.length;k++){if(source[k]==='{')level++;else if(source[k]==='}'&&!--level)return source.slice(i,k+1);}
 throw Error('Unbalanced '+name);
}
const context=vm.createContext({_transactionSearchCache:new WeakMap()});
for(const name of ['ratibSearchFold','normalizeParentQuery','ratibAccountSearchMatch','transactionSearchText']){
 vm.runInContext(extract(root,name),context);
}
const pairs=[['أحمد','احمد'],['إبراهيم','ابراهيم'],['آمنة','أمنة'],['الأمانة','الامانة'],['أمين','إمين']];
for(const [a,b] of pairs){
 assert.equal(context.ratibSearchFold(a),context.ratibSearchFold(b),a+' / '+b);
 assert.ok(context.ratibAccountSearchMatch('الحساب: '+a,b),a+' / '+b);
 assert.ok(context.ratibAccountSearchMatch('الحساب: '+b,a),b+' / '+a);
 const entry={updatedAt:'T1',note:a};
 assert.ok(context.transactionSearchText(entry).includes(context.ratibSearchFold(b)));
}
assert.equal(context.normalizeParentQuery('إيصال ١٢٣'),context.normalizeParentQuery('ايصال 123'));
assert.ok(root.includes('currentLedgerSearchQuery = ratibSearchFold(e.target.value.trim())'));
assert.ok(root.includes('currentStatementSearchQuery = ratibSearchFold(e.target.value.trim())'));
assert.ok(root.includes("return ratibSearchFold([t.seqNum, t.date, noteStr, otherAcc, t.amount]"));
vm.runInContext(extract(commerce,'commerceNormalize'),context);
for(const [a,b] of pairs)assert.equal(context.commerceNormalize(a),context.commerceNormalize(b));
assert.ok(commerce.includes('commerceNormalize(p.name).includes(term)'));
assert.ok(commerce.includes('commerceNormalize(query)'));
const pulseLine=pulse.split(String.fromCharCode(10)).find(line=>line.startsWith('const pulseSearchFold='));
assert.ok(pulseLine);vm.runInContext(pulseLine+';this.pulseSearchFold=pulseSearchFold',context);
for(const [a,b] of pairs)assert.equal(context.pulseSearchFold(a),context.pulseSearchFold(b));
console.log('Arabic Alef equivalence: accounts, ledger, statements, commerce, cash pulse — OK');
