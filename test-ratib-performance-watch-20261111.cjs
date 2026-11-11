'use strict';
// Privacy and timing regression; zero accounting records or connected storage.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const file=fs.readFileSync('ratib-performance-watch-20261111.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('<script src="./ratib-performance-watch-20261111.js?v=opt-in-1" defer></script>'));
assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|navigator\.sendBeacon/.test(file));
assert(!/getAllTransactions|getCanonicalCatalog|accountName|transactionSearchText/.test(file));
let listeners={},observers=[],clock=0;
class PO{
 constructor(fn){this.fn=fn;observers.push(this)}
 observe(){ }
}
const win={
 location:{search:'?ratib_perf=1'},URLSearchParams,
 performance:{now:()=>clock},
 PerformanceObserver:PO,
 requestAnimationFrame:f=>{clock+=16;f();},
 setTimeout:f=>{clock+=2;f();},
 document:{addEventListener:(name,fn)=>{listeners[name]=fn;}}
};
vm.runInNewContext(file,{window:win,URLSearchParams,Math,Number,Array,Object,String});
assert.equal(typeof win.RatibPerfWatch?.summary,'function');
assert.equal(observers.length,2);
observers[0].fn({getEntries:()=>[{duration:95},{duration:246}]});
observers[1].fn({getEntries:()=>[{name:'click',processingStart:155,startTime:18,duration:171}]});
listeners.click({target:{closest:()=>({id:'financial-no-private-data'})}});
const s=win.RatibPerfWatch.summary();
assert.equal(s.longTasks.maxMs,246);
assert.equal(s.inputDelays.maxMs,137);
assert.equal(s.navigationPaint.maxMs,18);
assert.equal(JSON.stringify(s).includes('financial-no-private-data'),false,'No targets or account data in report');
const disabled={location:{search:''},document:{addEventListener(){throw Error('Probe must be disabled by default')}}};
vm.runInNewContext(file,{window:disabled,URLSearchParams});
assert.equal(disabled.RatibPerfWatch,undefined,'Normal app does not collect timing events');
console.log('PASS: browser performance probe opt-in only; timing-only output, no storage/network or financial data');
