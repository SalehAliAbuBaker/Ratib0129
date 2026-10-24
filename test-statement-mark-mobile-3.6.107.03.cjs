'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const marker=fs.readFileSync('ratib-statement-marks-3.6.106.05.js','utf8');
const mobileStyle=html.match(/<style id="ratib-compact-mobile-3\.6\.98">([\s\S]*?)<\/style>/)?.[1];
assert(mobileStyle,'Existing mobile statement design must stay intact');
const base='#pageAccountOperations .account-statement-row[data-tx-id]';
assert(mobileStyle.includes(base+'{'),'The mobile row base style is required');
assert(mobileStyle.includes('background:var(--card)!important'),'Mobile CSS conflict should be covered');
assert(marker.includes("'@media screen and (max-width: 760px) {'"),'Responsive mark style missing');
const target=base+'.ratib-statement-marked';
assert(marker.includes("'"+target+"{background:#fbf0c9!important;background:color-mix(in srgb,#f6d46b 28%,var(--card))!important;"),'Marked card must have a stronger gold background and compatibility fallback');
assert(marker.includes("border-inline-start:5px solid #bf8b15!important"),'Keep desktop gold marker bar');
assert(marker.includes('★ معلّمة'),'Keep explicit marked label');
assert(!marker.includes('touch-action:pan-y'),'Currency swipe must remain functional');
assert(!marker.includes('touch-action:none'),'Do not block mobile scrolling');
const specificity=selector=>({
  ids:(selector.match(/#[\w-]+/g)||[]).length,
  classes:(selector.match(/\.[\w-]+|\[[^\]]+\]/g)||[]).length
});
const oldWeight=specificity(base),newWeight=specificity(target);
assert(newWeight.ids>=oldWeight.ids && (newWeight.ids>oldWeight.ids||newWeight.classes>oldWeight.classes),'Mobile mark specificity must beat !important white background');

const dom=new JSDOM('<!doctype html><html><head></head><body><div id="pageAccountOperations"><div id="accountOperationsStandalonePanel"><div class="account-statement-row" data-tx-id="a">A</div><div class="account-statement-row" data-tx-id="b">B</div></div></div></body></html>',{
  url:'https://ratibtrial.pages.dev/',runScripts:'outside-only'
});
const w=dom.window,m=new Map();
w.accountOpsState={accountName:'الحساب'};w.__ratibProceedInitialized=true;
w.store={get:(key,d)=>m.get(key)??d,_setSilent:(key,v)=>m.set(key,v)};
w.showToast=()=>{};w.confirm=()=>true;
w.eval(marker);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
(async()=>{
  await new Promise(resolve=>w.setTimeout(resolve,0));
  const css=w.document.getElementById('ratib-statement-reference-marks-css');
  assert(css,'Statement mark styles must be mounted');
  assert(css.textContent.includes(target));
  assert(css.sheet&&[...css.sheet.cssRules].some(rule=>rule.cssText.includes('max-width: 760px')),'Mobile media query should be valid CSS');
  const cards=[...w.document.querySelectorAll('.account-statement-row')];
  const pointer=(row,type)=>{
    const e=new w.Event(type,{bubbles:true,cancelable:true});
    Object.defineProperties(e,{button:{value:0},pointerId:{value:1},clientX:{value:0},clientY:{value:0}});
    row.dispatchEvent(e);
  };
  pointer(cards[0],'pointerdown');
  await new Promise(resolve=>w.setTimeout(resolve,565));
  pointer(cards[0],'pointerup');cards[0].click();
  assert(cards[0].classList.contains('ratib-statement-marked'));
  assert(!cards[1].classList.contains('ratib-statement-marked'));
  assert.equal(w.RatibStatementMarks.count(),1);
  cards[1].click();
  assert(cards[1].classList.contains('ratib-statement-marked'));
  assert.equal(w.RatibStatementMarks.count(),2);
  pointer(cards[0],'pointerdown');
  await new Promise(resolve=>w.setTimeout(resolve,565));
  pointer(cards[0],'pointerup');cards[0].click();
  assert(!cards[0].classList.contains('ratib-statement-marked'),'Long press again removes a mark');
  assert(cards[1].classList.contains('ratib-statement-marked'),'Other marked cards remain marked');
  assert.equal(w.RatibStatementMarks.count(),1);
  assert(html.includes('const RATIB_RELEASE={"version":"3.6.107.08"'));
  assert(fs.readFileSync('sw.js','utf8').includes("v209-trial-navigation-guard-3.6.107.08"));
  w.close();
  console.log('PASS mobile yellow marked cards override white CSS, preserve two-card selection, long-press removal and currency swipe');
})().catch(error=>{console.error(error);process.exitCode=1;});
