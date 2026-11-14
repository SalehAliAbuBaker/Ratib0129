'use strict';
/* Ratib 3.6.185: downward swipe never refreshes to Home and only changes display currency. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('index.html','utf8');
const style=fs.readFileSync('ratib-statement-layout-3.6.178.css','utf8');
const sw=fs.readFileSync('sw.js','utf8'),pkg=require('./package.json');
assert.equal(pkg.version,'3.6.198');
assert(source.includes('const RATIB_RELEASE={"version":"3.6.198"'));
assert(sw.includes('const APP_RELEASE={"version":"3.6.198"'));
assert(sw.includes('currency-pull-homefix-3.6.184'));
assert(style.includes('html:has(#pageAccountOperations:not(.hidden))'));
assert(style.includes('overscroll-behavior-y:none!important'));
assert(source.includes("window.scrollTo({top:0,behavior:'auto'});"),'New account opens from top rather than old list scroll position');
const start=source.indexOf('function ratibBindCurrencyPullToRefresh(){');
const end=source.indexOf('// Screen-only pager.',start);
assert(start>0&&end>start);
const gesture=source.slice(start,end);
new vm.Script(gesture);
assert(!gesture.includes('store.set(')&&!gesture.includes('flushStorage('),'Gesture never changes financial storage');
const doc='<html><body><div id="pageDashboard" class="hidden"></div>'+
 '<div id="pageAccountOperations"><div class="account-operations-screen">'+
 '<nav id="accountCurrencyTabs"><button data-currency="YER">YER</button><button data-currency="USD">USD</button></nav>'+
 '<div id="accountOperationsStandalonePanel"><div class="account-currency-track">'+
 '<section class="account-currency-page" data-currency="YER"><div class="account-statement-row" id="row">Entry</div></section>'+
 '<section class="account-currency-page" data-currency="USD"></section>'+
 '</div></div></div></div><select id="accountOpsCurrencyFilter"><option value="ALL">ALL</option><option value="YER">YER</option></select></body></html>';
const dom=new JSDOM(doc,{url:'https://ratib.test',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window,d=w.document;
let clock=1000,switched=[],nav=0,rendered=0;
w.Date.now=()=>clock;
w.scrollTo=()=>{};
w.navigateToTab=()=>nav++;
w.setAccountCurrencyPage=c=>{switched.push(c);w.accountOpsState.activeCurrency=c;};
w.accountOpsState={currency:'ALL',accountName:'صندوق المؤسسة',scopeNames:['صندوق المؤسسة'],activeCurrency:'YER'};
w.getAccountCurrencies=()=>['YER','USD'];
w.renderAccountOperations=()=>{
 rendered++;
 const tabs=d.getElementById('accountCurrencyTabs');
 tabs.innerHTML='<button data-currency="YER">YER</button><button data-currency="USD">USD</button>';
};
w.eval(gesture);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const row=d.getElementById('row'),screen=d.getElementById('pageAccountOperations');
function touch(target,type,x,y){
 const e=new w.Event(type,{bubbles:true,cancelable:true});
 const touches=[{clientX:x,clientY:y}];
 Object.defineProperty(e,type==='touchend'?'changedTouches':'touches',{value:touches});
 target.dispatchEvent(e);return e;
}
function pull(fromY=100,toY=215,dx=1){
 touch(row,'touchstart',160,fromY);
 const move=touch(row,'touchmove',160+dx,fromY+88);
 const end=touch(row,'touchend',160+dx,toY);
 clock+=500;return {move,end};
}
let result=pull();
assert.equal(result.move.defaultPrevented,true,'Prevent native mobile refresh once downward intent starts');
assert.deepEqual(switched,['USD'],'Changes current account to USD instead of navigating Home');
assert.equal(result.end.defaultPrevented,true,'No click/refresh after completing gesture');
result=pull();assert.deepEqual(switched,['USD','YER'],'Second pull returns to first currency');
assert.equal(nav,0,'No navigation to dashboard');
touch(row,'touchstart',160,110);
touch(row,'touchmove',240,117);
touch(row,'touchend',260,119);clock+=500;
assert.equal(switched.length,2,'Horizontal scroll never changes currency');
d.documentElement.scrollTop=120;
touch(row,'touchstart',160,110);
const scrolling=touch(row,'touchmove',160,180);
touch(row,'touchend',160,235);clock+=500;
assert.equal(scrolling.defaultPrevented,false,'Ordinary downward scrolling away from top stays native');
assert.equal(switched.length,2);
d.documentElement.scrollTop=0;
d.getElementById('accountCurrencyTabs').innerHTML='<button data-currency="YER">YER</button>';
w.accountOpsState.currency='ALL';
pull();assert.equal(switched.length,2,'One-currency account remains in the same account');
w.accountOpsState.currency='YER';
w.accountOpsState.activeCurrency='YER';
pull();
assert.equal(rendered,1,'A deliberately filtered statement reveals the same account other currencies');
assert.equal(w.accountOpsState.currency,'ALL');
assert.equal(switched.at(-1),'USD');
screen.classList.add('hidden');pull();
assert.equal(switched.length,3,'Hidden account screen does not switch');
assert.equal(nav,0,'Swipe does not route to Home in any case');
w.close();
console.log('PASS Ratib 3.6.185: swipe currencies, filtered statement, one currency, scroll isolation, no refresh or Home navigation');
