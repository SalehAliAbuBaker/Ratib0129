/* Ratib 3.6.162 — budget ring shows verified figures only, isolated from other modules. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const script=fs.readFileSync('ratib-cash-pulse-dual-ring-3.6.162.js','utf8');
const styles=fs.readFileSync('ratib-cash-pulse-dual-ring-3.6.162.css','utf8');
const sourcePulse=fs.readFileSync('ratib-cash-pulse.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(require('./package.json').version,'3.6.174');
assert(sw.includes('ratib-cash-pulse-dual-ring-3.6.162.js'));
assert(sw.includes('ratib-cash-pulse-dual-ring-3.6.162.css'));
assert(html.includes('ratib-cash-pulse-dual-ring-3.6.162.js?v=3.6.174'));
assert(html.includes('ratib-cash-pulse-dual-ring-3.6.162.css?v=3.6.174'));
assert(sourcePulse.includes('RatibCashPulseViz?.update?.({'),'Original engine feeds dashboard');
assert(sourcePulse.includes('openDetails:details'),'Original receipt/payment details must remain callable');
assert(styles.includes('#ratibCashPulse'),'All CSS scoped to Cash Pulse');
assert(styles.includes('prefers-reduced-motion:reduce'),'Reduced motion support');
assert(styles.includes('ratib-dual-ready>.ratib-pulse-visual'),'Old chart hidden only when new panel mounts');
assert(!script.includes('store.set(')&&!script.includes('flushStorage('),'Visualization must never write accounting storage');
assert(!script.includes('setInterval('),'No periodic polling is introduced');
assert.doesNotThrow(()=>new Function(script));
const dom=new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><section id="ratibCashPulse"><div id="ratibPulseReadout"><div class="ratib-pulse-visual" id="oldCashChart">Original</div></div></section></body></html>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,doc=w.document;
let writes=0,details=[];
w.DEFAULT_CATS=[
 {id:'food_home',name:'الغذاء والاحتياجات المنزلية',color:'#f59e0b',pct:15},
 {id:'health_treatment',name:'الصحة والعلاج',color:'#ef4444',pct:10},
 {id:'general',name:'عام',color:'#64748b',pct:75}
];
w.store={get:(name)=>name==='cats'?[
 {id:'food_home',name:'الغذاء والاحتياجات المنزلية',color:'#f59e0b',pct:20},
 {id:'health_treatment',name:'الصحة والعلاج',color:'#ef4444',pct:10},
 {id:'general',name:'عام',color:'#64748b',pct:70}
]:null,set:()=>writes++};
w.RatibCashPulse={refresh:()=>{},openDetails:side=>details.push(side)};
w.eval(script);
const spend={id:'sp_1',multiVoucherId:'MV1',isMultiVoucher:true,multiVoucher:{mode:'spend',baseCurrency:'YER',lines:[
 {side:'debit',budgetId:'food_home',base:120},
 {side:'debit',budgetId:'health_treatment',base:80},
 {side:'credit',budgetId:'general',base:200,autoBalance:true}
]}};
const simple={id:'simple_1',voucherMode:'entry',distribution:{food_home:{amount:50}},amount:50};
const unclassified={id:'transfer_1',voucherMode:'entry',distribution:{general:{amount:55}},amount:55};
const receipt={id:'rec_1',voucherMode:'income'};
const otherCurrency={id:'sar_1',voucherMode:'spend',distribution:{food_home:{amount:900}},amount:900};
const entries=[
 {t:spend,currency:'YER',side:'credit',amount:200},
 {t:simple,currency:'YER',side:'credit',amount:50},
 {t:unclassified,currency:'YER',side:'credit',amount:55},
 {t:receipt,currency:'YER',side:'debit',amount:300},
 {t:otherCurrency,currency:'SAR',side:'credit',amount:900},
 {t:{id:'opening',distribution:{food_home:{amount:1000}}},currency:'YER',side:'credit',amount:1000,opening:true}
];
const model=w.RatibCashPulseViz.buildBudgetModel(entries,w.DEFAULT_CATS,'YER');
const food=model.rows.find(x=>x.id==='food_home'),health=model.rows.find(x=>x.id==='health_treatment');
assert.equal(model.payments,305);
assert.equal(model.classified,250);
assert.equal(model.unclassified,55);
assert.equal(food.spent,170);
assert.equal(food.count,2);
assert.equal(health.spent,80);
assert.equal(model.totalDocuments,3);
assert.equal(model.classifiedDocuments,2);
assert.equal(model.rows.reduce((a,x)=>a+x.spent,0),250);
const before=w.RatibCashPulseViz.buildBudgetModel(entries,w.DEFAULT_CATS,'SAR');
assert.equal(before.payments,900,'Currency cannot leak from YER into SAR');
assert.equal(before.classified,900);
w.RatibCashPulseViz.update({account:'صندوق النقدية',accountLabel:'صندوق النقدية',currency:'YER',receipts:300,payments:305,closing:-5,beginning:0,entries});
assert(doc.getElementById('ratibPulseReadout').classList.contains('ratib-dual-ready'));
assert(doc.getElementById('oldCashChart'),'Old chart DOM must stay intact');
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id]').length,2,'Only categories with booked spending appear');
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,2);
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-callout').length,2,'Pointers show category and spending next to the ring');
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id="general"]').length,0,'Unused general category must not be shown');
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-flow').length,2);
assert(doc.getElementById('ratibDualCenterBalance').textContent.includes('-5'));
assert.equal(doc.getElementById('ratibDualStatus').textContent,'رصيد سالب');
assert(doc.getElementById('ratibDualSummary').textContent.includes('55'));
const foodChoice=doc.querySelector('#ratibDualLegend [data-budget-id="food_home"]');
assert(foodChoice.textContent.includes('170'),'Legend shows actual amount instead of configured 20%');
assert(!foodChoice.textContent.includes('20%'),'No configured percentages in legend');
foodChoice.click();
assert(doc.getElementById('ratibDualDetail').textContent.includes('170'),'Click should show actual classified spend');
assert(doc.getElementById('ratibDualDetail').textContent.includes('68%'),'Actual is a share of 250 classified expenses');
assert(!doc.getElementById('ratibDualDetail').textContent.includes('النسبة المعتمدة'),'No reference weights in details');
const flowBtn=doc.querySelector('[data-flow="credit"]');
flowBtn.click();
assert.deepEqual(details,['credit'],'Existing flow drilldown remains connected');
const generalSpend={id:'gen_expense',voucherMode:'spend',distribution:{general:{amount:60}},amount:60};
const generalEntries=[{t:generalSpend,currency:'YER',side:'credit',amount:60}];
w.RatibCashPulseViz.update({account:'صندوق النقدية',currency:'YER',receipts:0,payments:60,closing:10,entries:generalEntries});
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id]').length,1,'General alone shows exactly one slice');
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,1);
assert(doc.querySelector('#ratibDualLegend [data-budget-id="general"]').textContent.includes('60'));
const bothEntries=[...generalEntries, ...entries];
w.RatibCashPulseViz.update({account:'صندوق النقدية',currency:'YER',receipts:300,payments:365,closing:20,entries:bothEntries});
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id]').length,3,'General and other used categories appear once each');
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id="general"]').length,1,'Repeated general is grouped into one category');
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,3);
w.RatibCashPulseViz.update({account:'صندوق النقدية',currency:'YER',receipts:0,payments:0,closing:0,entries:[]});
assert.equal(doc.querySelectorAll('#ratibDualSvg .ratib-dual-sector').length,0,'No fabricated budget slices with no spending');
assert.equal(doc.querySelectorAll('#ratibDualLegend [data-budget-id]').length,0,'No unused category legends');
assert.equal(writes,0,'No settings or financial writes');
w.RatibCashPulseViz.clear();
assert(!doc.getElementById('ratibPulseDual'));
assert(doc.getElementById('oldCashChart'),'Fallback remains');
assert(!doc.getElementById('ratibPulseReadout').classList.contains('ratib-dual-ready'));
dom.window.close();
console.log('PASS Ratib 3.6.162: reliable movement, classified budgets, currency separation, interaction, no writes and fallback');