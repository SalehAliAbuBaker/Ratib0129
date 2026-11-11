'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');

// Synthetic test only. Financial records and source backups must not enter Git.
const html=fs.readFileSync('index.html','utf8');
const snippet=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert(a>=0&&b>a,'Missing implementation boundary: '+start);
  return html.slice(a,b);
};
const gzip=snippet('async function ratibGzipBlob(input)','function _snapshotMemStore()');
const archive=snippet('function ratibIsPackedArchive(v)','async function _readShadowRecords()');
const context={
  Blob,Response,CompressionStream,DecompressionStream,TextEncoder,TextDecoder,
  crypto:webcrypto,Buffer,Uint8Array,ArrayBuffer,JSON,Promise,Number,Object,Array,
  APP_STORAGE_PREFIX:'masar_',Error,
};
vm.runInNewContext(
  'function _b64(v){return Buffer.from(v).toString("base64")}\\n'+
  'function _fromB64(v){return Uint8Array.from(Buffer.from(v,"base64"))}\\n'+
  gzip+'\\n'+archive+'\\n'+
  'this.codec={ratibPackBackup,ratibGzipBlob,ratibGunzipText,ratibEncodeArchive,ratibDecodeArchive,ratibIsPackedArchive,encryptVaultBlob,decryptVaultBlob};',context
);
const codec=context.codec;
const history=Array.from({length:53},(_,i)=>({
  month:'2022-'+String(i%12+1).padStart(2,'0'),
  transactions:Array.from({length:i===52?260:420},(_,j)=>({
    id:'fixture-'+i+'-'+j,multiVoucherId:'voucher-'+i+'-'+Math.floor(j/2),
    isoDate:'2024-08-23',account:'Synthetic / 1001',amount:j+0.25,
    currency:'YER',description:'بيانات عربية تجريبية غير حقيقية',
    legacySource:{sourceRows:[String(i*500+j)],system:'Synthetic'}
  }))
}));
const rows=history.reduce((n,h)=>n+h.transactions.length,0);
assert(rows>20000);
async function main(){
  const raw=JSON.stringify(history);
  const packed=await codec.ratibEncodeArchive(history);
  assert.equal(packed.__ratibArchiveGzip,1,'Huge archive uses compact durable format');
  assert.equal(packed.rows,rows,'Archive guard still knows exact row count');
  assert.equal(packed.periods,53);
  assert(packed.blob.size<new Blob([raw]).size*0.5,'Archive compresses materially');
  const decoded=await codec.ratibDecodeArchive(packed);
  assert.equal(JSON.stringify(decoded),raw,'Lossless roundtrip preserves every ledger field');
  const small=[{month:'2026-11',transactions:[{id:'one'}]}];
  assert.equal(await codec.ratibEncodeArchive(small),small,'Small archives retain legacy format');

  const payload={app:'ratib',schema:3,encrypted:false,
    data:{masar_plan:{month:'2026-11',transactions:[]},masar_history:history}};
  const zip=await codec.ratibPackBackup(payload);
  assert.equal(zip.extension,'.json.gz');
  assert.equal(zip.mime,'application/gzip');
  assert(zip.blob.size<zip.rawBytes*0.5,'Export is materially smaller');
  const original=JSON.stringify(payload);
  assert.equal(await codec.ratibGunzipText(zip.blob),original,'Exported JSON decompresses exactly');
  const legacyPack=await codec.ratibPackBackup({app:'ratib',schema:3,data:{x:1}});
  assert(['.json','.json.gz'].includes(legacyPack.extension));

  const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const encrypted=await codec.encryptVaultBlob(key,payload.data);
  assert.equal(encrypted.compression,'gzip','Large vault is compressed before encryption');
  assert.equal(JSON.stringify(await codec.decryptVaultBlob(key,encrypted)),JSON.stringify(payload.data),
    'Encrypted compact vault decrypts losslessly');
  // Preserve support for encrypted data saved before adding compression.
  const iv=webcrypto.getRandomValues(new Uint8Array(12));
  const oldCipher=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(original));
  const old={iv:Buffer.from(iv).toString('base64'),data:Buffer.from(oldCipher).toString('base64')};
  assert.equal(JSON.stringify(await codec.decryptVaultBlob(key,old)),original,
    'Existing AES-GCM backup remains readable');
  await assert.rejects(codec.ratibDecodeArchive({...packed,blob:new Blob(['not-gzip'])}));
  assert(html.includes("const compressed=/\\.gz$/i.test(file.name||'');"),'Legacy importer accepts gzip');
  assert(html.includes("file.mimeType !== (/\\.gz$/i.test(item.name)?'application/gzip':'application/json')"),
    'Cloud upload integrity checks correct MIME');
  assert(html.includes("ratibCompactExistingArchive()"),'Existing archived data is compacted');
  console.log('PASS: 53 months, '+rows+' transactions, lossless GZIP, legacy JSON/AES and cloud checks');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
