'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),dates=fs.readFileSync('ratib-date-display.js','utf8');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const start=html.indexOf('function ratibCompactCashVoucherLayout(){');
const end=html.indexOf('\nfunction configureVoucherMode(mode){',start);
assert(start>0&&end>start,'Shared receipt/payment original-field layout must exist');
assert(html.includes('ratibCompactCashVoucherLayout();'),'Native voucher entry/edit renders must use the shared header');
assert(html.includes('id="ratib-trial-voucher-original-fields-v308"'),'Live CSS must be part of the HTML head');
assert(html.indexOf('id="ratib-trial-voucher-original-fields-v308"')<html.indexOf('</head>'));
assert(sidebar.includes("['calendar','التاريخ والتقويم','settings']"),'Calendar must appear in main settings');
assert(sidebar.includes("const essential=['tree','budget','defaults','currencies','calendar'"),'Calendar must be a primary sidebar option');
const fixture='<html lang="ar"><head></head><body>'+
 '<section id="pageSettings"></section>'+
 '<div id="reportAccountOpsPanel">حركة 2026-10-30</div>'+
 '<section id="multiVoucherCard" class="spend-voucher"><div class="multi-voucher-grid">'+
 '<label class="spend-only spend-sequence">رقم المستند<input id="spendSeqInput" readonly></label>'+
 '<label>التاريخ<input id="multiVoucherDate" type="date" value="2026-10-30"></label>'+
 '<label>المستفيد<input id="multiVoucherBeneficiary" placeholder="اسم المستفيد"></label>'+
 '<label>العملة<select id="multiVoucherBaseCurrency"><option>ريال يمني</option></select></label>'+
 '<label>الميزانية<select id="spendHeaderBudget"><option>عام</option></select></label>'+
 '</div><label>البيان العام<textarea id="multiVoucherNote"></textarea></label>'+
 '<span id="multiVoucherSeqBadge">رقم: 1047</span></section></body></html>';
const dom=new JSDOM(fixture,{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.eval('var multiVoucherMode="spend";');
w.eval(html.slice(start,end)+';window.testCashHeader=ratibCompactCashVoucherLayout;');
w.testCashHeader();
const top=d.getElementById('ratibCashVoucherHeader');
assert(top,'Cash voucher gets a dedicated visible date and number header');
assert.equal(top.querySelectorAll('#multiVoucherDate').length,1,'Original date is reused');
assert.equal(top.querySelectorAll('#spendSeqInput').length,1,'Original number field is reused');
assert.equal(d.getElementById('spendSeqInput').value,'1047','New receipt/payment displays its sequence number');
assert.equal(d.getElementById('multiVoucherDate').value,'2026-10-30','Moving the date does not change accounting date');
assert.equal(d.getElementById('multiVoucherBaseCurrency').closest('label').firstChild.textContent,'','Currency redundant caption is removed');
assert.equal(d.getElementById('multiVoucherBeneficiary').closest('label').firstChild.textContent,'','Beneficiary redundant caption is removed');
assert.equal(d.getElementById('multiVoucherNote').closest('label').firstChild.textContent,'','Narration redundant caption is removed');
d.getElementById('multiVoucherSeqBadge').textContent='رقم: 583';
w.testCashHeader();
assert.equal(d.getElementById('spendSeqInput').value,'583','Opening an existing voucher updates the displayed number');
assert.equal(d.querySelectorAll('#spendSeqInput').length,1,'No duplicate voucher number created');
w.eval("multiVoucherMode='multi-entry';");
d.getElementById('multiVoucherCard').classList.remove('spend-voucher');w.testCashHeader();
assert.equal(d.getElementById('spendSeqInput').closest('.multi-voucher-grid')!==null,true,'Compound entry restores original placement');
d.getElementById('multiVoucherCard').classList.add('spend-voucher');
w.eval("multiVoucherMode='income';");w.testCashHeader();
assert.equal(d.getElementById('spendSeqInput').value,'583','Receipt shares the same visible number behavior');
w.eval(dates);d.dispatchEvent(new w.Event('DOMContentLoaded'));
assert(d.getElementById('rhSettingsCard'),'Calendar settings card must actually render');
assert(d.getElementById('rhSettingsMain')&&d.getElementById('rhSettingsGregorian')&&d.getElementById('rhSettingsOther'));
assert(!d.getElementById('rhSettingsCalendar'),'Old calendar-method selector must be removed');
assert.equal(d.getElementById('rhSettingsMain').value,'h','Hijri is default');
assert.equal(w.RatibHijriFirst.calendar,'umalqura','Umm al-Qura is the only Hijri calendar');
assert(d.getElementById('rhSettingsExample').textContent.includes('هـ'),'Settings give a visible Hijri preview');
const gregPreview=d.getElementById('rhSettingsGregorian');
gregPreview.value='2026-10-30';gregPreview.dispatchEvent(new w.Event('change'));
assert(d.getElementById('rhSettingsExample').textContent.includes('2026-10-30'),'Gregorian date drives the combined calendar preview');
assert(d.getElementById('reportAccountOpsPanel').textContent.includes('هـ'),'Account statement defaults to Hijri');
const display=w.RatibHijriFirst.markup('2026-10-30');
assert(display.includes('هـ')&&display.includes('<small>2026-10-30</small>'),'Account statement direct markup has Hijri and small Gregorian');
const select=d.getElementById('rhSettingsMain');select.value='g';select.dispatchEvent(new w.Event('change'));
assert.equal(w.RatibHijriFirst.markup('2026-10-30').includes('<span>2026-10-30</span>'),true,'Gregorian choice changes statement output');
select.value='h';select.dispatchEvent(new w.Event('change'));
assert(d.getElementById('reportAccountOpsPanel').textContent.includes('هـ'),'Switching back to Hijri refreshes existing statement');
const second=d.getElementById('rhSettingsOther');second.checked=false;second.dispatchEvent(new w.Event('change'));
assert(!w.RatibHijriFirst.markup('2026-10-30').includes('<small>'),'Opposite date can be hidden');
// Allow the calendar's queued requestAnimationFrame DOM decoration to settle in jsdom.
// Closing the window before that callback runs causes a jsdom-specific null-document error.
console.log('PASS live vouchers and statements: exclusively Umm al-Qura, Gregorian calendar replacement, dates, editable number, compact captions');
