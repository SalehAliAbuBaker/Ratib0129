'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=x=>fs.readFileSync(x,'utf8'),html=read('index.html'),alt=read('trial/index.html'),fav=read('ratib-favorites-v3.js'),sw=read('sw.js');
const d=new JSDOM(html,{runScripts:'outside-only',url:'https://ratibtrial.pages.dev/'}),doc=d.window.document;
const options=[...doc.querySelectorAll('#ledgerVoucherTypeFilter [data-ledger-voucher-type]')].map(x=>x.dataset.ledgerVoucherType);
assert.deepEqual(options,['receipt','payment','simple','compound','opening'],'only five accounting voucher types are selectable');
assert.equal(doc.getElementById('ledgerVoucherTypeSummary').textContent.trim(),'نوع المستند: الكل (5)');
assert.equal(doc.querySelector('[data-ledger-voucher-type="commerce"]'),null);
assert(!doc.body.textContent.includes('مستندات تجارية سابقة'));
assert.equal(doc.getElementById('pageCommerce'),null,'old inventory screen deleted');
assert.equal(doc.getElementById('ratibCommerceDefaults'),null,'inventory account defaults removed');
assert(!html.includes('ratib-commerce-3.6.131.js')&&!html.includes('ratib-commerce-3.6.131.css'));
assert(!sw.includes('ratib-commerce-3.6.131.js')&&!sw.includes('ratib-commerce-3.6.131.css'));
assert(!html.includes('data-commerce-ledger=')&&!html.includes('RatibCommerce?.documentAction'));
assert(!html.includes('ratibCommerceStatementName('),'active document type resolver does not include commerce names');
assert(!fav.includes('const commerceFavorites='));
assert(!fav.includes("'المخزون','الوارد','الصادر'"),'retired inventory groups cannot be registered as new favorites');
for(const p of ['index.html','trial/index.html']){
 const source=read(p);
 for(const s of ['function ratibIsRetiredCommerceTransaction(t)','function ratibActiveAccountingTransactions(txs)','ratibActiveAccountingTransactions(getAllTransactions())'])assert(source.includes(s),p+' must filter archived inventory entries before display/export');
 const body=source.slice(source.indexOf('const RATIB_ACTIVE_VOUCHER_TYPES='),source.indexOf('function transactionSearchText(t)'));
 if(p==='index.html'){
  const mock={};vm.runInNewContext(body+';this.check={classify:ratibLedgerVoucherType,exclude:ratibActiveAccountingTransactions,types:RATIB_ACTIVE_VOUCHER_TYPES};',mock);
  const keep=[{id:'R',voucherMode:'income'},{id:'P',voucherMode:'spend'},{id:'J',voucherMode:'entry'},{id:'M',isMultiVoucher:true},{id:'O',isOpeningBalance:true}];
  const retire=[{id:'A',commerceId:'inv-1',voucherMode:'multi-entry'},{id:'B',multiVoucherId:'com_7',voucherMode:'multi-entry'},{id:'C',type:'فاتورة مبيعات رقم 14',voucherMode:'multi-entry'}];
  assert.deepEqual(JSON.parse(JSON.stringify(mock.check.types)),['receipt','payment','simple','compound','opening']);
  assert.deepEqual(keep.map(v=>mock.check.classify(v)),['receipt','payment','simple','compound','opening']);
  assert(retire.every(v=>mock.check.classify(v)===null));
  const all=[...keep,...retire],original=JSON.stringify(all);
  assert.deepEqual(mock.check.exclude(all).map(v=>v.id),['R','P','J','M','O']);
  assert.equal(JSON.stringify(all),original,'filter must never mutate financial storage');
 }
}
assert(html.includes("return current.concat(..."),'financial journal remains intact');
assert(html.includes("store.get('commerce_v1',null)"),'historic source data must remain recoverable in backups');
assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"));
assert(html.includes("const CLOUD_CFG_KEY = 'cloud_backup_cfg'"));
assert(sw.match(/const CACHE_VERSION='([^']+)'/)?.[1].endsWith('-'+JSON.parse(html.match(/const RATIB_RELEASE=(\{[^;]+\});/)[1]).version));
d.window.close();
console.log('PASS trial retired commerce: no active catalog, ledger, search, Excel, runtime or mutation');