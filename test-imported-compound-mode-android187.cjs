const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf("function entrybuildMultiVoucherData(status='draft'){"),b=html.indexOf('\nfunction entryopenMultiVoucherEditor(',a);
const values={multiVoucherDate:{value:'2026-10-07'},multiVoucherSeqBadge:{textContent:'رقم: 10222'},multiVoucherBeneficiary:{value:''},multiVoucherNote:{value:''}};
const ctx={document:{getElementById:id=>values[id]},updateMultiVoucherSummary:()=>({base:'YER',baseTotal:30000}),multiVoucherDraftId:'imported-voucher',multiVoucherLines:[{side:'debit',account:'customer',amount:'30000',currency:'YER'},{side:'credit',account:'cash',amount:'30000',currency:'YER'}],getCleanNumber:Number,multiLineRate:()=>1,roundAccountingAmount:n=>n,multiToday:()=>'',getNextMultiVoucherNumber:()=>1};
vm.runInNewContext(html.slice(a,b)+';this.build=entrybuildMultiVoucherData;',ctx);
for(const status of ['posted','draft']){
 const doc=ctx.build(status);
 assert.equal(doc.mode,'multi-entry','The actual screen builder must classify compound vouchers before archive routing');
 assert.equal(doc.id,'imported-voucher');assert.equal(doc.lines.length,2);assert.equal(doc.lines.reduce((n,l)=>n+(l.side==='debit'?l.base||30000:-(l.base||30000)),0),0);
}
console.log('PASS actual compound screen builder classifies posted and draft imported vouchers');
