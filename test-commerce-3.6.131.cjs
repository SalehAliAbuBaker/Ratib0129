const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.js'),'utf8'),mark="window.RatibCommerce={open,openFavorite,openDocument:commerceOpenDocument,documentAction:commerceDocumentOperation,render:paint,version:'3.6.142'};";
assert(source.includes(mark));assert(source.includes("['pdf','PDF'],['share','المشاركة']"));
const code=source.replace(mark,"window.__test={data,products,guideMarkup,documentHtml,productOutput,productGuideCanvases,filteredCatalogProducts,setCatalogFilter:(term,group)=>{catalogSearch=term;catalogGroup=group;},nextNumber,invoice,currentDraftDocument,draftOutput,commerceSignatureLabels,commerceCanvasPage,commerceInvoiceRecipientLabel,commerceInvoiceRecipientRow,commerceProductLabel,commerceFindProduct,leaf,commerceSmartAccount,commerceResolveAccount,commerceChosenAccount,accounts,commerceAmountWords,commerceBaseTotal,commerceValidFx,makeJournal,openFavorite,commerceOpenInvoice,commerceReplaceOrDelete,commerceValidateRevision,commerceDocumentOperation,saveInvoice,getDraft:()=>draft,setInbound:()=>{mode='in';view='new';draft=null;},setOutbound:()=>{mode='out';view='new';draft=null;},setDraft:x=>{draft=x;}};"+mark);
const memory={},store={get:(k,d)=>memory[k]??d,set:(k,v)=>memory[k]=v},capture=[],rows=[],headerDraws=[],plan={transactions:[]};
const window={RatibPrintLogo:{whenReady:async()=>true,syncPrint(){},drawCanvas(){return true;}}},document={readyState:'loading',addEventListener(){},getElementById(id){return id==='pageCommerce'?{innerHTML:''}:null;}};
class File{constructor(parts,name,opts){this.name=name;this.type=opts.type;}}
const state={
 window,document,File,store,console,
 getCanonicalCatalog:()=>[{details:[['1','مخزون'],['2','صندوق'],['3','عملاء'],['4','موردون'],['5','مبيعات'],['6','تكلفة'],['7','تسويات']]}],
 getNextMultiVoucherNumber:()=>(memory.plan||plan).transactions.length+1,getAllTransactions:()=>(memory.plan||plan).transactions,getMasterPlan:()=>memory.plan||plan,
 APP_SCHEMA_VERSION:3,flushStorage:async()=>{},showToast(){},audit(){},renderAllData(){},updateProDashboard(){},navigateToTab(){},
 getHeaderConfig:()=>({name:'الجهة من إعدادات الترويسة',details:'العنوان من الإعدادات',show:true}),
 tafqitAccountCurrency:(v,c)=>'تفقيط '+v+' '+c+' فقط لا غير',
 wrapCanvasText:(_,words)=>words.match(/.{1,42}/gu)||[''],
 reportCanvasPage:(title,subtitle,page)=>{
  const ctx={save(){},restore(){},fillRect(){},strokeRect(){},fillText(text){headerDraws.push(String(text));}};
  ctx.fillText('الجهة من إعدادات الترويسة');
  return {canvas:{title,subtitle,page,width:1200,height:1590},ctx,y:210,text:(value)=>{headerDraws.push(String(value));}};
 },
 reportTableLayout:(_,values)=>({values,height:48}),
 drawReportTableRow:(page,layout)=>{page.y+=layout.height;rows.push(layout.values);},
 buildPdfFromCanvases:generator=>({pages:[...generator].map(x=>x.title)}),
 downloadFinancialFile:(blob,name)=>capture.push({action:'pdf',blob,name}),
 shareRatibDocumentFile:async(file,title)=>capture.push({action:'share',file,title})
};
vm.runInNewContext(code,state,{filename:'ratib-commerce-3.6.131.js'});
const T=window.__test,d=T.data();
d.products=[{id:'a',sku:'000001',name:'صنف أ',group:'مواد',unitMain:'حبة',unitSub:'باكت',price:5},{id:'b',sku:'000002',name:'صنف ب',group:'مواد',unitMain:'كرتون',price:6}];
d.warehouses=[{id:'main',name:'المخزن الرئيسي'}];store.set('commerce_v1',d);
(async()=>{
 const layout=T.products(d),full=T.guideMarkup(d),single=T.guideMarkup(d,d.products[0]);
 assert(layout.includes('data-rc-catalog-toggle="search"')&&layout.includes('data-rc-catalog-toggle="group"'));
 assert(layout.includes('rc-guide-tool-icon')&&layout.includes('rc-catalog-results'));
 T.setCatalogFilter('000002','');assert.deepEqual(Array.from(T.filteredCatalogProducts(d),p=>p.id),['b']);
 T.setCatalogFilter('صنف أ','مواد');assert.deepEqual(Array.from(T.filteredCatalogProducts(d),p=>p.id),['a']);
 T.setCatalogFilter('صنف أ','مستلزمات');assert.equal(T.filteredCatalogProducts(d).length,0);
 T.setCatalogFilter('','');
 for(const val of ['data-rc-products="pdf"','data-rc-products="share"','data-rc-item="a"'])assert(layout.includes(val),val);
 assert(full.includes('الجهة من إعدادات الترويسة'));
 assert(full.includes('العنوان من الإعدادات'));
 assert(full.includes('دليل الأصناف'));
 assert(single.includes('بطاقة الصنف'));
 assert(single.includes('صنف أ')&&!single.includes('صنف ب'));
 await T.productOutput('pdf');
 await T.productOutput('share');
 await T.productOutput('pdf','a');
 await T.productOutput('share','a');
 assert.equal(capture.length,4);
 assert.equal(capture[0].blob.pages[0],'دليل الأصناف');
 assert.equal(capture[2].blob.pages[0],'بطاقة الصنف');
 assert(capture[2].name.includes('000001'));
 assert(capture[3].title.includes('صنف أ'));
 const inboundTitles=['أمر توريد','توريد مخزني','فاتورة مشتريات'];
 T.setInbound();
 const inboundLayout=T.invoice(d);
 for(const title of inboundTitles)assert(inboundLayout.includes('<option value="'+title+'"'),title);
 for(const action of ['view','preview','print','pdf','share','search','back'])assert(inboundLayout.includes('data-rc-draft-action="'+action+'"'),action);
 assert(inboundLayout.includes('id="rc-doctype"'),'inbound should use original text-only document dropdown');
 d.invoices.push({kind:'purchase',title:'أمر توريد',number:'IN-00007'},
 {kind:'purchase',title:'توريد مخزني',number:'IN-00003'},
 {kind:'purchase',title:'فاتورة مشتريات',number:'IN-00020'});
 assert.equal(T.nextNumber(d,'purchase','أمر توريد'),'PO-00008');
 assert.equal(T.nextNumber(d,'purchase','توريد مخزني'),'GR-00004');
 assert.equal(T.nextNumber(d,'purchase','فاتورة مشتريات'),'PI-00021');
 assert.notEqual(T.nextNumber(d,'purchase','توريد مخزني'),T.nextNumber(d,'purchase','أمر توريد'));
 store.set('commerce_v1',d);
 T.setDraft({kind:'purchase',title:'توريد مخزني',number:'GR-00004',date:'2026-10-20',warehouse:'main',partyName:'مورد',note:'مراجعة',
  lines:[{product:'a',unit:'حبة',qty:2,price:5}]});
 const before=d.invoices.length;
 await T.draftOutput('pdf');await T.draftOutput('share');
 assert.equal(T.data().invoices.length,before,'draft output must not save accounting documents');
 assert.equal(capture.at(-2).blob.pages[0],'مسودة غير معتمدة — توريد مخزني');
 assert.equal(capture.at(-1).action,'share');
 const outboundTitles=['أمر صرف','صرف مخزني','فاتورة مبيعات'];
 T.setOutbound();
 const outboundLayout=T.invoice(d);
 for(const title of outboundTitles)assert(outboundLayout.includes('<option value="'+title+'"'),title);
 for(const action of ['view','preview','print','pdf','share','search','back'])assert(outboundLayout.includes('data-rc-draft-action="'+action+'"'),action);
 assert(outboundLayout.includes('id="rc-doctype"'),'outbound titles use simple text dropdown');
 assert(!outboundLayout.includes('rc-type-symbol'),'no decorative document icons in previous dropdown');
 d.invoices.push({kind:'sale',title:'أمر صرف',number:'OUT-00004'},
 {kind:'sale',title:'صرف مخزني',number:'OUT-00012'},
 {kind:'sale',title:'فاتورة مبيعات',number:'OUT-00020'},
 {kind:'sale',title:'صرف مخزني',number:'SO-00005'});
 assert.equal(T.nextNumber(d,'sale','أمر صرف'),'SO-00006','avoid collision with a legacy/custom prefix');
 assert.equal(T.nextNumber(d,'sale','صرف مخزني'),'GI-00013');
 assert.equal(T.nextNumber(d,'sale','فاتورة مبيعات'),'SI-00021');
 assert.equal(T.nextNumber(d,'sale_return','مرتجع'),'OUT-00001','do not modify return sequences');
 store.set('commerce_v1',d);
 T.setDraft({kind:'sale',title:'فاتورة مبيعات',number:'SI-00021',date:'2026-10-20',warehouse:'main',partyName:'عميل',note:'مسودة صادر',lines:[{product:'b',unit:'كرتون',qty:1,price:6}]});
 const beforeOut=T.data().invoices.length;
 await T.draftOutput('pdf');await T.draftOutput('share');
 assert.equal(T.data().invoices.length,beforeOut,'outbound draft must not post or alter saved documents');
 assert.equal(capture.at(-2).blob.pages[0],'مسودة غير معتمدة — فاتورة مبيعات');
 assert.equal(capture.at(-1).action,'share');
 // The PDF base canvas already prints the personal header; commerce must not paint it twice.
 headerDraws.length=0;
 const paperDoc={kind:'purchase',title:'فاتورة مشتريات',number:'PI-00002',date:'2026-10-20',
  warehouse:'main',partyName:'مورد',note:'مراجعة',total:540,
  lines:[{product:'a',unit:'حبة',qty:6,price:90}]};
 T.commerceCanvasPage(d,paperDoc,1);
 assert.equal(headerDraws.filter(x=>x==='الجهة من إعدادات الترويسة').length,1,'personal header is drawn once');
 assert(!headerDraws.includes('بسم الله الرحمن الرحيم'),'no second added header after base canvas');
 for(const [type,count] of [['أمر توريد',3],['توريد مخزني',4],['فاتورة مشتريات',3],
  ['أمر صرف',3],['صرف مخزني',4],['فاتورة مبيعات',4]]){
  assert.equal(T.commerceSignatureLabels({title:type}).length,count,'signature count for '+type);
 }
 // Sales/purchase invoices: one date on the right at metadata height, plain optional party aligned right.
 const purchaseInvoice={kind:'purchase',title:'فاتورة مشتريات',number:'PI-00045',
  date:'2026-10-20',warehouse:'main',partyName:'المورد المحاسبي',displayPartyName:'مؤسسة الفجر للتوريدات',total:600,lines:[]};
 const salesInvoice={kind:'sale',title:'فاتورة مبيعات',number:'SI-00032',
  date:'2026-10-20',warehouse:'main',partyName:'حساب العميل',displayPartyName:'شركة النور للتجارة العامة',total:500,lines:[]};
 for(const [doc,label,name] of [[purchaseInvoice,'مُشترى من / وارد من','مؤسسة الفجر للتوريدات'],
  [salesInvoice,'مباع على / صادر إلى','شركة النور للتجارة العامة']]){
  const html=T.documentHtml(d,doc);
  assert(html.includes('rc-invoice-meta'),doc.title+' compact invoice metadata');
  assert.equal((html.match(/التاريخ:/g)||[]).length,1,doc.title+' date only once');
  assert(!html.includes('تاريخ الإصدار:'),doc.title+' old duplicate date label removed');
  assert(html.includes('rc-invoice-party-row')&&html.includes(label+':'),doc.title+' recipient label');
  assert(html.includes(name),doc.title+' party name');
  assert(html.indexOf('rc-invoice-party-row')<html.indexOf('rc-document-table'),doc.title+' party above table');
  assert(!html.includes('الطرف: <b>'),doc.title+' no generic repeated party');
  assert(!html.includes('rc-invoice-issue-date'),'no second date row');
  headerDraws.length=0;
  T.commerceCanvasPage(d,doc,1);
  assert.equal(headerDraws.filter(x=>x==='الجهة من إعدادات الترويسة').length,1,'one personal header');
  assert(headerDraws.some(x=>x==='التاريخ: 2026-10-20'),doc.title+' document date on right');
  assert(headerDraws.some(x=>x.includes(label+': '+name)),doc.title+' recipient in PDF');
  assert(!headerDraws.some(x=>x.includes('تاريخ الإصدار')),'no second added date header');
  const unnamed={...doc,displayPartyName:''};
  const blankHtml=T.documentHtml(d,unnamed);
  assert(!blankHtml.includes('rc-invoice-party-row'),'empty recipient does not print');
  headerDraws.length=0;
  T.commerceCanvasPage(d,unnamed,1);
  assert(!headerDraws.some(x=>x.includes(label)),'empty name omits recipient on PDF');
 }
 const other=T.documentHtml(d,{kind:'sale',title:'صرف مخزني',number:'GI-00001',
  date:'2026-10-20',warehouse:'main',partyName:'العميل',total:0,lines:[]});
 assert(!other.includes('rc-invoice-party-row'),'noninvoice layout unchanged');
 assert.equal(T.commerceInvoiceRecipientLabel({title:'صرف مخزني'}),'');
 T.setInbound();
 T.setDraft({kind:'purchase',title:'فاتورة مشتريات',number:'PI-00099',date:'2026-10-20',
  warehouse:'main',partyName:'',payment:'credit',note:'',lines:[{product:'a',unit:'حبة',qty:1,price:5}]});
 const editableInvoice=T.invoice(d);
 assert(/<input[^>]*id="rc-partyName"[^>]*\srequired(?:\s|>)/.test(editableInvoice),'accounting party still required');
 assert(editableInvoice.includes('id="rc-displayPartyName"')&&!/id="rc-displayPartyName"[^>]*\srequired/.test(editableInvoice),'separate optional printed recipient');
 T.setDraft({kind:'purchase',title:'أمر توريد',number:'PO-00099',date:'2026-10-20',
  warehouse:'main',partyName:'',payment:'credit',note:'',lines:[{product:'a',unit:'حبة',qty:1,price:5}]});
 assert(/<input[^>]*id="rc-partyName"[^>]*\srequired(?:\s|>)/.test(T.invoice(d)),'other vouchers still require a party');
 const css=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.css'),'utf8');
 assert(css.includes('grid-auto-flow:column!important'),'signatures remain in one printed row');
 assert(css.includes('.rc-invoice-party-row')&&css.includes('text-align:right!important'),'invoice party right-aligned');
 assert(!css.includes('border:2px solid #dc2626'),'no red recipient frame');
 assert(css.includes('.rc-document-type-row')&&css.includes('restore familiar, unpadded fields'));
 assert(css.includes('.rc-invoice-card .rc-grid')&&css.includes('repeat(2,minmax(0,1fr))'));
 // Foreign currency accounting: carry the original amount on financial journal lines,
 // with all debit and credit postings balanced by YER equivalent and purchase costs in YER.
 const accounts={cash:'صندوق',receivable:'عملاء',payable:'موردون',inventory:'مخزون',
  sales:'مبيعات',cogs:'تكلفة',adjust:'تسويات'};
 Object.assign(d.accounts,accounts);
 const originalSale={id:'sale-fx-1',kind:'sale',title:'فاتورة مبيعات',number:'SI-00044',
  date:'2026-10-20',warehouse:'main',partyName:'عميل',payment:'credit',
  currency:'SAR',exchangeRate:410,total:100,baseTotal:41000,cost:17000,
  note:'عملية اختبار سعر الصرف',lines:[{product:'a',unit:'حبة',qty:10,price:10,subtotal:100,cost:17000}]};
 const saleJournal=T.makeJournal(originalSale,d);
 assert.equal(saleJournal.length,4,'sale journal has customer, sales, cost and inventory');
 assert.equal(saleJournal.filter(t=>t.debitAccount).reduce((v,t)=>v+t.amount,0),58000);
 assert.equal(saleJournal.filter(t=>t.creditAccount).reduce((v,t)=>v+t.amount,0),58000);
 assert.equal(saleJournal[0].multiVoucher.lines[0].currency,'SAR');
 assert.equal(saleJournal[0].multiVoucher.lines[0].amount,100);
 assert.equal(saleJournal[0].multiVoucher.lines[0].base,41000);
 assert.equal(saleJournal[0].multiVoucher.lines[0].rate,410);
 assert.equal(saleJournal[2].multiVoucher.lines[2].currency,'YER','cost line remains YER');
 assert.equal(saleJournal[0].currency,'YER','transaction amounts are YER equivalent for reports');
 const originalPurchase={id:'purchase-fx-1',kind:'purchase',title:'فاتورة مشتريات',number:'PI-00044',
  date:'2026-10-20',warehouse:'main',partyName:'مورد',payment:'credit',
  currency:'USD',exchangeRate:2150,total:20,baseTotal:43000,cost:43000,
  note:'اختبار',lines:[{product:'a',unit:'حبة',qty:2,price:10,subtotal:20,cost:43000}]};
 const purchaseJournal=T.makeJournal(originalPurchase,d);
 assert.equal(purchaseJournal.length,2);
 assert.equal(purchaseJournal[0].amount,43000);
 assert.equal(purchaseJournal[1].amount,43000);
 assert.equal(purchaseJournal[0].multiVoucher.lines[0].currency,'YER','inventory in YER');
 assert.equal(purchaseJournal[0].multiVoucher.lines[1].currency,'USD','supplier account in USD');
 assert.equal(purchaseJournal[0].multiVoucher.lines[1].amount,20);
 const reversedPurchase=T.makeJournal({...originalPurchase,id:'return-purchase',kind:'purchase_return',title:'مرتجع الوارد'},d);
 assert.equal(reversedPurchase.length,2);
 assert.equal(reversedPurchase[0].amount,43000);
 assert.equal(reversedPurchase[0].creditAccount,'مخزون');
 assert.equal(reversedPurchase[1].debitAccount,'موردون');
 assert.equal(reversedPurchase[0].multiVoucher.lines[1].currency,'USD');
 const reversedSale=T.makeJournal({...originalSale,id:'return-sale',kind:'sale_return',title:'مرتجع الصادر'},d);
 assert.equal(reversedSale.filter(x=>x.debitAccount).reduce((a,x)=>a+x.amount,0),58000);
 assert.equal(reversedSale.filter(x=>x.creditAccount).reduce((a,x)=>a+x.amount,0),58000);
 assert.equal(reversedSale[0].multiVoucher.lines[0].currency,'SAR');
 assert.equal(reversedSale[0].multiVoucher.lines[0].amount,100);
 assert.equal(T.commerceBaseTotal(100,'SAR',410),41000);
 assert.throws(()=>T.commerceValidFx('USD',0),/سعر الصرف/);
 assert.throws(()=>T.commerceValidFx('USD',''),/سعر الصرف/);
 assert.throws(()=>T.makeJournal({...originalSale,baseTotal:100},d),/المعادل اليمني/);
 const journalHTML=T.documentHtml(d,originalPurchase);
 assert(journalHTML.includes('20 دولار أمريكي')||journalHTML.includes('20')&&journalHTML.includes('دولار أمريكي'));
 assert(journalHTML.includes('43,000')&&journalHTML.includes('المعادل اليمني'),'FX print equivalent');
 const savedCount=T.data().invoices.length;
 assert.equal(T.data().invoices.length,savedCount,'pure journal must not post data');
 // End-to-end posting: retain document currency, YER equivalent, actual journal records and stock cost.
 T.setInbound();
 T.setDraft({kind:'purchase',title:'فاتورة مشتريات',number:'PI-FX-001',date:'2026-10-20',
  warehouse:'main',partyName:'مورد',partyAccount:'موردون',payment:'credit',
  currency:'SAR',exchangeRate:410,displayPartyName:'البائع',note:'ترحيل صرف',
  lines:[{id:'line-fx-1',product:'a',unit:'حبة',qty:10,price:10}]});
 const docsBefore=T.data().invoices.length,txBefore=plan.transactions.length;
 await T.saveInvoice();
 assert.equal(T.data().invoices.length,docsBefore+1,'foreign purchase saved once');
 const saved=T.data().invoices.find(x=>x.number==='PI-FX-001');
 assert.equal(saved.currency,'SAR');
 assert.equal(saved.exchangeRate,410);
 assert.equal(saved.total,100);
 assert.equal(saved.baseTotal,41000);
 assert.equal(saved.cost,41000);
 assert.equal(saved.lines[0].cost,41000,'YER stock valuation retained');
 assert.equal(plan.transactions.length,txBefore+2,'two balanced journal sides');
 assert.equal(plan.transactions[txBefore].multiVoucher.lines[1].currency,'SAR');
 assert.equal(plan.transactions[txBefore].multiVoucher.lines[1].amount,100);
 assert.equal(plan.transactions[txBefore].amount,41000);
 // A real edit must preserve document ID and sequence and replace—not duplicate—the journal.
 const oldFinancial=(memory.plan||plan).transactions.filter(x=>x.commerceId===saved.id);
 T.commerceOpenInvoice(saved.id);
 const loaded=T.getDraft();
 assert.equal(loaded.number,'PI-FX-001','load original invoice');
 assert.equal(loaded.currency,'SAR','preserve currency');
 loaded.note='ملاحظة معدلة';
 loaded.partyName='مورد آخر';
 loaded.displayPartyName='اسم المشتري اختياري';
 loaded.lines[0].price=11;
 const oldLength=T.data().invoices.length;
 await T.saveInvoice();
 const updated=T.data().invoices.find(x=>x.id===saved.id);
 assert.equal(updated.total,110);
 assert.equal(updated.baseTotal,45100);
 assert.equal(updated.cost,45100);
 assert.equal(updated.note,'ملاحظة معدلة');
 assert.equal(T.data().invoices.length,oldLength,'edit must not append a second invoice');
 const updateTx=(memory.plan||plan).transactions.filter(t=>t.commerceId===saved.id);
 assert.equal(updateTx.length,2,'edit still has two financial sides');
 assert.equal(updateTx[0].seqNum,oldFinancial[0].seqNum,'sequence number retained');
 assert.equal(updateTx[0].multiVoucher.lines[1].amount,110,'updated original SAR');
 assert.equal(updateTx[0].amount,45100,'updated YER journal amount');
 const trail=store.get('commerce_archive_v1',[]);
 assert.equal(trail.at(-1).action,'edit','previous version archived');
 assert.equal(trail.at(-1).before.total,100);
 // Clone creates a new document in memory without posting until saved.
 T.commerceOpenInvoice(saved.id,true);
 const clone=T.getDraft();
 assert.equal(clone.currency,'SAR');
 assert.notEqual(clone.number,updated.number);
 assert.equal(T.data().invoices.length,oldLength,'opening clone does not post');
 await T.saveInvoice();
 const cloned=T.data().invoices.find(x=>x.number===clone.number);
 assert(cloned&&cloned.id!==saved.id,'clone gets own ID');
 assert.equal(T.data().invoices.length,oldLength+1);
 const linkedTx=(memory.plan||plan).transactions.filter(t=>t.commerceId===cloned.id);
 assert.equal(linkedTx.length,2,'clone has own financial journal');
 await assert.rejects(()=>T.commerceReplaceOrDelete(updated,null),/حركة لاحقة/);
 await T.commerceReplaceOrDelete(cloned,null);
 assert(!T.data().invoices.some(x=>x.id===cloned.id),'deleted clone leaves commerce storage');
 assert(!(memory.plan||plan).transactions.some(x=>x.commerceId===cloned.id),'deleted clone financial entries removed');
 assert(store.get('commerce_archive_v1',[]).at(-1).action==='delete','deleted document archive preserved');
 // Editing a complete return must keep its original SKU visible even when nothing remains.
 T.setInbound();
 T.setDraft({kind:'purchase_return',title:'مرتجع الوارد',number:'IR-RET-1',date:'2026-10-20',
  warehouse:'main',origin:updated.id,partyName:'مورد آخر',partyAccount:'موردون',
  payment:'credit',currency:'SAR',exchangeRate:410,note:'مرتجع كامل',
  lines:[{product:'a',unit:'حبة',qty:10,price:11}]});
 await T.saveInvoice();
 const savedReturn=T.data().invoices.find(x=>x.number==='IR-RET-1');
 assert(savedReturn&&savedReturn.origin===updated.id,'return saved against original');
 T.commerceOpenInvoice(savedReturn.id);
 const returnView=T.invoice(T.data());
 assert(returnView.includes('id="rc-product-search-0"'),'return item input exists');
 assert(returnView.includes('value="a"'),'existing return SKU remains selectable');
 assert.equal(T.getDraft().origin,updated.id);
 T.getDraft().note='مرتجع معدل';
 await T.saveInvoice();
 assert.equal(T.data().invoices.find(x=>x.id===savedReturn.id).note,'مرتجع معدل');
 await assert.rejects(()=>T.commerceReplaceOrDelete(updated,null),/مرتجعات/);
 await T.commerceReplaceOrDelete(T.data().invoices.find(x=>x.id===savedReturn.id),null);
 assert(!T.data().invoices.some(x=>x.id===savedReturn.id),'returned invoice may be safely deleted when unlinked');
 const print=T.documentHtml(T.data(),updated);
 assert(!print.includes('بسم الله الرحمن الرحيم'),'personal heading omits basmala');
 // New account and print controls in all commerce sections.
 const accountMarkup=T.invoice(T.data());
 assert(!accountMarkup.includes('rc-posting-debit')&&!accountMarkup.includes('rc-posting-credit'),'no colored debit/credit cards in invoices');
 assert(accountMarkup.includes('rc-displayPartyName'),'optional printed client/supplier name retained');
 assert(accountMarkup.includes('rc-search-partyAccount'),'account name/number lookup');
 // The single visible account control must come exclusively from chart-detail (posting) accounts.
 const options=T.leaf();
 assert(options.length>=7&&options.every(x=>x.id&&/^\d+ — /.test(x.name)),'only detailed chart accounts with codes');
 const choice=T.commerceSmartAccount('acc-cash',options,'صندوق');
 assert(choice.includes('id="rc-search-acc-cash"')&&choice.includes('id="rc-acc-cash"'));
 assert(!choice.includes('<select'),'no duplicate account dropdown');
 assert(choice.includes('type="hidden"'),'posted account reference is stored separately');
 const mapping=T.accounts(T.data());
 assert(mapping.includes('rc-search-acc-sales')&&mapping.includes('rc-search-acc-inventory'),'link accounts are searchable and editable');
 const fake={value:'صندوق',dataset:{},setSelectionRange(){}};
 const hidden={value:'صندوق'};
 const originalLookup=state.document.getElementById;
 state.document.getElementById=id=>id==='rc-search-acc-cash'?fake:id==='rc-acc-cash'?hidden:originalLookup(id);
 fake.id='rc-search-acc-cash';fake.value='2';
 T.commerceResolveAccount(fake);
 assert.equal(hidden.value,'صندوق','search by exact account number');
 fake.value='اسم غير موجود في الشجرة';
 T.commerceResolveAccount(fake);
 assert.equal(hidden.value,'','unrecognized account must never retain old ID');
 assert.equal(fake.value,'اسم غير موجود في الشجرة','user text stays unchanged when no match');
 assert.throws(()=>T.commerceChosenAccount('acc-cash','الصندوق'),/الحساب غير موجود/);
 state.document.getElementById=originalLookup;
 const commerceCode=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.js'),'utf8');
 assert(commerceCode.includes("commerceTabIcons={products:'📦'"),'semantic icons for commerce menus');
 assert(commerceCode.includes('commerce_button_size_v1'),'size preference stored');
 assert(commerceCode.includes("data-rc-button-size"),'size applies to internal commerce controls');
 const style=fs.readFileSync(path.join(__dirname,'ratib-commerce-3.6.131.css'),'utf8');
 assert(style.includes('.ratib-commerce-shortcuts[data-rc-button-size="large"]'),'main commerce launch controls resizable');
 const sidebarScript=fs.readFileSync(path.join(__dirname,'ratib-sidebar-3.6.124.js'),'utf8');
 assert(sidebarScript.includes("function syncSidebarVersion()")&&sidebarScript.includes("footer.append(version)"),'visible sidebar footer bound to current release');
 assert(sidebarScript.includes("document.addEventListener('focusin',e=>ratibSelectField"),'focus selects the full editable text');
 const ledger=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 assert(ledger.includes("return record?record.title+' — '+record.number")||ledger.includes("const commercial=ratibCommerceStatementName(t);if(commercial"),'ledger displays actual invoice name');
 assert(ledger.includes('const mode=ratibStatementDocumentLabel(t);'),'account statement UI uses real invoice names');
 assert(ledger.includes('doc=ratibStatementDocumentLabel(t);'),'print/PDF also uses real invoice names');
 assert(ledger.includes('<small id="appVersionLabel" class="app-version">الإصدار 3.6.141'),'visible trial version matches new account-linking release');
 assert(ledger.includes('data-commerce-ledger="edit"')&&ledger.includes('data-commerce-ledger="clone"')&&ledger.includes('data-commerce-ledger="delete"'),'ledger offers operations');
 assert(ledger.includes('data-ledger-voucher-type="commerce"')&&ledger.includes("if(t.commerceId)return 'commerce'"),'commercial invoices have their own ledger filter, not compound type');
 const failBefore=T.data().invoices.length;
 T.setInbound();
 T.setDraft({kind:'purchase',title:'فاتورة مشتريات',number:'PI-FX-002',date:'2026-10-20',
  warehouse:'main',partyName:'مورد',partyAccount:'موردون',payment:'credit',
  currency:'USD',exchangeRate:'',lines:[{id:'line-fx-2',product:'a',unit:'حبة',qty:2,price:5}]});
 await assert.rejects(()=>T.saveInvoice(),/سعر الصرف/);
 assert.equal(T.data().invoices.length,failBefore,'missing FX rate must not save document');
 const fav=fs.readFileSync(path.join(__dirname,'ratib-favorites-v3.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(fav),'favorites source parses');
 assert(fav.includes('commerceFavorites=')&&fav.includes('المخزون')&&fav.includes('الوارد')&&fav.includes('الصادر'));
 assert(fav.includes('<details class="fav-settings-group"')&&fav.includes('fav-settings-compact'),'grouped favorite detail panels');
 assert(fav.includes("ratib.quickFavorites.v2"),'existing favorites key unchanged');
 // Favorite navigation should accept only approved sections/types.
 assert.throws(()=>T.openFavorite('sale','new:أمر توريد'),/نوع المستند/);
 assert.throws(()=>T.openFavorite('unknown','records'),/قسم/);
const doc=T.documentHtml(d,{kind:'purchase',title:'فاتورة مشتريات',number:'IN-1',date:'2026-10-20',warehouse:'main',partyName:'مورد',total:10,lines:[]});
 assert(doc.includes('الجهة من إعدادات الترويسة')&&doc.includes('فاتورة مشتريات'));
 assert(doc.includes('عملة المستند')&&doc.includes('ريال يمني'),'currency explicit on invoice');
 assert(doc.includes('التفقيط:')&&doc.includes('تفقيط 10 YER'),'amount words printed');
 assert(T.commerceFindProduct(d.products,'000002')?.id==='b','product by sku');
 assert(T.commerceFindProduct(d.products,'صنف أ')?.id==='a','product by name');
 assert(T.commerceFindProduct(d.products,'000001 — صنف أ')?.id==='a','product by suggestion');
 T.setInbound();
 const inputs=T.invoice(d);
 assert(inputs.includes('rc-product-search-0')&&inputs.includes('rc-product-options-0'),'smart product autocomplete in invoice');
 assert(inputs.includes('rc-parties'),'party suggestions');
 const commentDoc={kind:'purchase',title:'فاتورة مشتريات',number:'PI-1234',date:'2026-10-20',currency:'YER',warehouse:'main',partyName:'المحاسبي',displayPartyName:'المطبوع',total:540,
  lines:[{product:'a',unit:'حبة',qty:3,price:180,subtotal:540}],note:'ملاحظة واحدة طويلة يمكن كتابتها في المستند بشكل مطول ومتكامل بحيث لا يتحول كل سطر إلى خانة ملاحظات جديدة أو إلى عمود الوحدة كما كان يحدث من قبل'};
 const plain=T.documentHtml(d,commentDoc);
 assert.equal((plain.match(/ملاحظات:/g)||[]).length,1,'one HTML note label');
 headerDraws.length=0;rows.length=0;
 T.setDraft({...commentDoc,lines:[{product:'a',unit:'حبة',qty:3,price:180}]});
 await T.draftOutput('pdf');
 assert.equal(headerDraws.filter(t=>t==='ملاحظات:').length,1,'long PDF note has single heading');
 assert(headerDraws.some(t=>t.includes('التفقيط:')),'Arabic amount spelling in PDF');
 assert(!rows.some(r=>r.includes('ملاحظات')),'notes are not repeated table rows');
 console.log('PASS 3.6.141: leaf-only searchable account linking, no duplicate dropdown, preserved free text, plain invoice menu and balanced journal');
})().catch(error=>{console.error(error);process.exitCode=1;});
