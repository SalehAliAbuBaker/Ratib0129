'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('ratib-statement-grid-alignment.css','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert(html.includes('ratib-statement-grid-alignment.css?v=3.6.178'));
assert(sw.includes('"./ratib-statement-grid-alignment.css"'));
assert(css.includes('var(--ratib-statement-aligned-columns'));
assert(css.includes('white-space:nowrap!important'));
const start=html.indexOf(' function updateScreen(root){'),end=html.indexOf(' const oldRender=renderAccountOperations;',start);
assert(start>=0&&end>start,'Original account statement display updater');
const functionCode=html.slice(start,end);
const dom=new JSDOM('<div id="app"><div class="account-statement-grid"><div class="account-statement-row header"><span>التاريخ</span><span>المستند</span><span>البيان</span><span>مدين</span><span>دائن</span><span>الرصيد</span></div><div class="account-statement-row" data-tx-id="test"><span>التاريخ</span><span>مستند</span><span>البيان</span><span class="debit">125</span><span class="credit"></span><span class="balance">125 YER</span></div><div class="account-statement-row total statement-grand-total"><span class="statement-total-label">إجمالي العمليات</span><span class="debit">125</span><span class="credit">0</span><span class="balance">125 YER</span></div></div></div>');
const doc=dom.window.document,grid=doc.querySelector('.account-statement-grid');
const run=new Function('root','read','getAllTransactions','accountOpsState','counter','document','console',functionCode+';updateScreen(root);');
for(const [showDoc,showOther,count] of [[false,false,5],[true,false,6],[false,true,6],[true,true,7]]){
 run(doc.querySelector('#app'),()=>({document:showDoc,counterpart:showOther}),()=>[{id:'test'}],{scopeNames:['أ']},()=> 'حساب مقابل',doc,console);
 assert.equal(grid.dataset.statementVisibleColumns,String(count));
 const cols=grid.style.getPropertyValue('--ratib-statement-aligned-columns');
 assert(cols.startsWith('145px')&&cols.includes('minmax(145px,1.2fr)'));
 const total=grid.querySelector('.statement-grand-total');
 assert.equal(total.children[0].style.gridColumn,'1 / '+(count-2));
 assert.equal(total.children[1].style.gridColumn,(count-2)+' / '+(count-1));
 assert.equal(total.children[2].style.gridColumn,(count-1)+' / '+count);
 assert.equal(total.children[3].style.gridColumn,count+' / '+(count+1));
 const row=grid.querySelector('[data-tx-id]');
 assert.equal(row.children[1].style.display,showDoc?'':'none');
 assert.equal(row.querySelector('[data-statement-col="counterpart"]').style.display,showOther?'':'none');
}

/* Header labels align with the already centered financial numbers; only labels change. */
const {JSDOM:Dom}=require('jsdom');
const mini=new Dom('<div id="reportAccountOpsPanel"><div class="account-statement-row header"><span>التاريخ</span><span>المستند</span><span>البيان</span><span>مدين</span><span>دائن</span><span>الرصيد</span></div><div class="account-statement-row"><span class="debit">500</span><span class="credit">300</span><span class="balance">800 YER</span></div></div>');
const heading=mini.window.document.querySelector('.account-statement-row.header');
assert.deepEqual(Array.from(heading.querySelectorAll('span:nth-last-child(-n+3)'),el=>el.textContent),['مدين','دائن','الرصيد']);
assert.match(css,/account-statement-row\.header>span:nth-last-child\(-n\+3\)/);
assert.match(css,/text-align:center!important/);
assert.match(css,/justify-self:stretch!important/);
assert.equal(mini.window.document.querySelector('.account-statement-row:not(.header) .debit').textContent,'500');
mini.window.close();

dom.window.close();
console.log('PASS: ledger 5/6/7 displayed columns; debit/credit/balance align with statement totals');
