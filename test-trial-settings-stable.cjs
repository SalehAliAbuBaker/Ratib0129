'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),vm=require('vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const dom=new JSDOM('<div id="pageSettings"></div>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const records={currency_catalog_v1:[{code:'YER',name:'ريال',active:true},{code:'SAR',name:'سعودي',active:true,reportRateYer:412},{code:'USD',name:'دولار',active:true,reportRateYer:1500}]};
 w.KNOWN_CURRENCIES=new Set(['YER','SAR','USD']);w.store={get:(k,d)=>records[k]??d,set:(k,v)=>{assert(['currency_catalog_v1','import_currencies'].includes(k));records[k]=JSON.parse(JSON.stringify(v));}};
 w.flushStorage=async()=>{};w.showToast=()=>{};w.getAllTransactions=()=>[];
 const start=html.indexOf('/* ratib-v3611: currency catalog');w.eval(html.slice(start,html.indexOf('</script>',start)));
 const row=c=>w.document.querySelector('[data-currency-code="'+c+'"]'),field=c=>row(c).querySelector('[data-reference-currency]');
 const sar=field('SAR');sar.value='499';sar.focus();
 row('USD').querySelector('button').click();await tick();
 assert.equal(field('SAR'),sar);assert.equal(sar.value,'499');assert.equal(w.document.activeElement,sar);assert(row('SAR').hasCurrencyEdits());
 w.ratibCurrencyManagerRefresh();assert.equal(field('SAR'),sar);assert.equal(sar.value,'499');
 row('SAR').querySelector('button').click();await tick();assert.equal(records.currency_catalog_v1.find(c=>c.code==='SAR').reportRateYer,499);assert(!row('SAR').hasCurrencyEdits());
 assert.equal(row('SAR').querySelector('button').disabled,false);
 // Edits made during persistence must survive the completion callback.
 let release;w.flushStorage=()=>new Promise(r=>release=r);sar.value='510';row('SAR').querySelector('button').click();sar.value='520';release();await tick();assert.equal(sar.value,'520');assert(row('SAR').hasCurrencyEdits());
 dom.window.close();
 const win={},events={},timers=[],button={disabled:false,textContent:'',classList:{remove(){}},addEventListener(t,f){this[t]=f}},banner={dataset:{},classList:{remove(){}}},message={};let reloads=0;
 const worker={postMessage(){}},reg={waiting:worker,active:null,addEventListener(){},update:async()=>{}};
 const context={window:{addEventListener:(t,f)=>win[t]=f},navigator:{serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg),controller:{},addEventListener:(t,f)=>events[t]=f}},document:{body:{appendChild(){}},getElementById:id=>({appUpdateBanner:banner,applyAppUpdateBtn:button,appUpdateMessage:message})[id]||null,querySelector:()=>null,addEventListener(){}},location:{reload(){reloads++}},sessionStorage:{setItem(){},getItem(){},removeItem(){}},localStorage:{getItem(){},setItem(){}},_briefAppNoticeTimer:null,clearTimeout(){},setTimeout(f){timers.push(f);return timers.length;},_pendingFinancialCompletion:false,currentActiveTab:'pageSettings',flushStorage:async()=>{},showAppReleaseDetails(){},showTransientAppNotice(){},showToast(){},Date,_appExited:false};
 const block=html.slice(html.indexOf("if('serviceWorker' in navigator){"),html.indexOf('// ===== تشخيص بيئة التشغيل'));vm.createContext(context);vm.runInContext(block,context);win.load();await tick();await button.click();assert(button.disabled);timers.at(-1)();assert(!button.disabled);assert.match(message.textContent,/لم يكتمل/);
 events.controllerchange();assert.equal(reloads,0,'another tab cannot force reload');assert.equal(banner.dataset.pending,'true');reg.waiting=null;await button.click();assert.equal(reloads,1,'explicit approval reloads after storage flush');
 console.log('PASS stable currency DOM, unsaved edits, async save edits, persisted values, update timeout and cross-tab approval');
})().catch(e=>{console.error(e);process.exitCode=1});
