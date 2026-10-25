'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=x=>fs.readFileSync(x,'utf8');
const html=read('index.html'),home=read('ratib-trial-home-sidebar-3.6.143.js'),fav=read('ratib-favorites-v3.js'),feedback=read('ratib-feedback-3.6.149.js'),worker=read('sw.js'),currency=read('ratib-country-currency-3.6.151.js'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.109.03');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.109.03"'));
assert(worker.includes('v223-trial-quick-entry-lazy-excel-3.6.109.03'));
assert(worker.includes('"version":"3.6.109.03"'));
const dom=new JSDOM(html,{url:'https://ratibtrial.pages.dev',runScripts:'outside-only'}),d=dom.window.document;
const dashboard=d.getElementById('dashboardHomeContent');assert(dashboard);
assert.deepEqual([...dashboard.querySelectorAll('.main-menu-btn')].map(x=>x.textContent.trim()),['إضافة','سجل العمليات','التقارير','الحسابات']);
for(const id of ['dashboardCarousel','proDashboardCard','pageDashboardKpi','pageReminders','remindersChart','reminderModal','notificationSoundStatus','openAddReminderModalBtn','remindersBadge','dashboardPeriod'])assert.equal(d.getElementById(id),null,id+' must be removed');
assert.equal(d.querySelectorAll('#dashboardHomeContent .ratib-commerce-shortcuts').length,0);
assert(!fav.includes("addChoice('new-reminder'")&&!fav.includes("addChoice('reminders-list'"),'no favorite task/notification commands');
assert(!fav.includes('<option>التذكيرات</option>'),'no reminder group option');
assert(fav.includes("!['new-reminder','reminders-list'].includes(id)"),'old pinned reminder shortcuts are removed');
assert(!home.includes('ratibDashboardFoldToggle'),'old dashboard folding removed');
assert(d.getElementById('ratibFavoritesSettingsCard')===null,'favorite settings are installed at runtime, not hardcoded');
// All financial forms, currencies, reports and document history remain.
for(const id of ['pageExpenses','pageLedger','pageReports','pageAccountsTree','currency','budgetReportCurrency','multiVoucherBaseCurrency'])assert(d.getElementById(id),id+' retained');
assert(d.getElementById('currency').hidden,'old dashboard currency control retained only as invisible reporting state');
assert(html.includes("store.get('preferred_currency','YER')"),'existing selected currency preference preserved');
assert(html.includes("function getGlobalCurrency()"),'currency state remains readable by reports');
assert(html.includes("function getAllTransactions()"),'report inputs remain accounting documents');
assert(html.includes("function getBudgetReportCurrency()"),'budget reports remain currency-selectable');
assert(currency.includes('country_currency_settings_v1')&&currency.includes("currency:'OMR'")&&currency.includes("currency:'AED'"),'country currencies including OMR and AED retained');
assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"),'trial backup destination unchanged');
assert(html.includes("store.get('commerce_v1',null)"),'historic commerce records untouched');
assert(html.includes("const RATIB_RESUME_VIEW_KEY='ratib_ui_resume_view_v1'"));
assert(!html.includes("function scheduleReminderCheck()"),'retired reminders cannot notify in background');
assert(!html.includes("function getReminders()"),'retired reminder records cannot be read as a feature');
assert(!feedback.includes('data-feedback-toggle="reminder"'),'reminder audio removed');
assert(!feedback.includes('data-feedback-test="urgent"'),'task priority sounds removed');
assert(feedback.includes('data-feedback-toggle="save"')&&feedback.includes('data-feedback-toggle="error"'),'document saving and error sounds retained');
// Exercise actual cleanup on a mock protected Ratib store. The financial plan, history,
// foreign-currency settings, and documents must not be removed or modified.
const before={
 reminders:[{title:'old task',date:'2026-01-01'}],notifiedReminderKeys:['old task'],
 notification_sound_enabled:true,ratib_feedback_preferences_v1:{master:true,reminder:true,save:false,error:true},
 plan:{transactions:[{amount:120,currency:'USD',account:'USD receivable'}]},history:[{transactions:[{amount:520,currency:'SAR'}]}],
 currency_catalog_v1:[{code:'OMR',name:'ريال عماني'}],
 commerce_v1:{invoices:[{kind:'purchase',number:'P-01',currency:'USD'}]},
 preferred_currency:'SAR',country_currency_settings_v1:{base:'OMR'}
};
const original=JSON.parse(JSON.stringify(before)),removed=[];
const store={get:(key,fallback)=>Object.hasOwn(before,key)?before[key]:fallback,remove:key=>{removed.push(key);delete before[key];},set:(key,value)=>{before[key]=value;}};
const start=html.indexOf('function ratibPurgeObsoleteTasks(){'),end=html.indexOf('\nfunction openGlobalSearch()',start);
assert(start>=0&&end>start);
vm.runInNewContext(html.slice(start,end)+'\nratibPurgeObsoleteTasks();',{store});
assert.deepEqual(removed.sort(),['notifiedReminderKeys','notification_sound_enabled','reminders'].sort());
assert(!Object.hasOwn(before.ratib_feedback_preferences_v1,'reminder'));
for(const key of ['plan','history','commerce_v1','currency_catalog_v1','preferred_currency','country_currency_settings_v1'])assert.deepEqual(before[key],original[key],key+' unchanged');
for(const [name,code] of [['feedback',feedback],['favorites',fav],['home',home],['worker',worker]])assert.doesNotThrow(()=>new vm.Script(code),name+' syntax');
dom.window.close();
console.log('PASS trial 3.6.109.03: removed dashboard/tasks, purged reminder keys, preserved all financial documents/currencies/reports');
