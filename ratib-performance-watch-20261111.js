/* Ratib diagnostic 2026-11-11. Opt-in with ?ratib_perf=1.
 * Collects timing numbers only. No ledger, names, storage, network, or telemetry.
 */
(function ratibPerformanceWatch(global){
  'use strict';
  let enabled=false;
  try{enabled=new URLSearchParams(global.location.search).get('ratib_perf')==='1';}catch(_){}
  if(!enabled)return;
  const now=()=>global.performance?.now?.()||0;
  const started=now(),longTasks=[],interactions=[],navigation=[];
  const maxSamples=60,round=n=>Math.round(Number(n||0)*10)/10;
  const keep=(arr,row)=>{arr.push(row);if(arr.length>maxSamples)arr.shift();};
  const percentile=(items,p)=>{
    if(!items.length)return 0;
    const a=items.slice().sort((x,y)=>x-y);
    return round(a[Math.max(0,Math.min(a.length-1,Math.ceil(a.length*p)-1))]);
  };
  if(typeof global.PerformanceObserver==='function'){
    try{
      const watch=new global.PerformanceObserver(list=>{
        for(const entry of list.getEntries())keep(longTasks,round(entry.duration));
      });
      watch.observe({entryTypes:['longtask']});
    }catch(_){}
    try{
      const watch=new global.PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(!['click','pointerup','keydown'].includes(entry.name))continue;
          const inputDelay=Math.max(0,Number(entry.processingStart||0)-Number(entry.startTime||0));
          keep(interactions,{kind:entry.name,delayMs:round(inputDelay),durationMs:round(entry.duration)});
        }
      });
      watch.observe({type:'event',durationThreshold:16,buffered:true});
    }catch(_){}
  }
  const selectors='.main-menu-btn,[data-sidebar-action],.ratib-bottom-nav-item,.bottom-nav-btn,#backToMenuBtn';
  const document=global.document;
  document?.addEventListener?.('click',event=>{
    let node=null;try{node=event.target?.closest?.(selectors);}catch(_){}
    if(!node)return;
    const clickAt=now();
    const measure=()=>keep(navigation,round(now()-clickAt));
    if(typeof global.requestAnimationFrame==='function')global.requestAnimationFrame(()=>{
      if(typeof global.setTimeout==='function')global.setTimeout(measure,0);
      else measure();
    });
  },true);
  function summary(){
    const long=longTasks.slice(),input=interactions.map(x=>x.delayMs),nav=navigation.slice();
    return {
      diagnostic:'Ratib opt-in timings only',
      secondsObserved:round((now()-started)/1000),
      longTasks:{count:long.length,maxMs:long.length?Math.max(...long):0,p95Ms:percentile(long,.95)},
      inputDelays:{count:input.length,maxMs:input.length?Math.max(...input):0,p95Ms:percentile(input,.95)},
      navigationPaint:{count:nav.length,maxMs:nav.length?Math.max(...nav):0,p95Ms:percentile(nav,.95)},
      note:'Only recent timing samples are retained in memory. No transaction/account data is recorded.'
    };
  }
  global.RatibPerfWatch=Object.freeze({summary});
})(window);
