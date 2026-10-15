/* Presentation-only icons: preserve textContent, element identity, events and all values. */
(function(){
'use strict';
const paths={
 user:'M4 21v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 sound:'M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',
 mute:'M3 9h4l5-5v16l-5-5H3ZM16 9l6 6M22 9l-6 6',
 music:'M9 18V5l12-2v13M9 10l12-2M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 cloud:'M6 19a5 5 0 1 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12Z',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 2',
 add:'M12 5v14M5 12h14',
 save:'M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-7h8v7',
 delete:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 edit:'m4 16-1 5 5-1L20 8l-4-4ZM14 6l4 4',
 file:'M14 2H4v20h16V8ZM14 2v6h6M8 12h8M8 16h6',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 print:'M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6ZM17 12h1',
 lock:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
 unlock:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8-1M12 14v3',
 back:'M15 5l-7 7 7 7M8 12h13',
 refresh:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
 bell:'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4',
 chart:'M4 3v18h17M8 17v-5M13 17V7M18 17V4',
 folder:'M3 6h7l2 3h9v12H3ZM3 6V3h7l2 3h9v3',
 check:'m4 12 5 5L20 6',close:'m6 6 12 12M18 6 6 18',
 moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
 menu:'M3 6h18M3 12h18M3 18h18',
 settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
 share:'M12 16V3m-4 4 4-4 4 4M5 12H3v9h18v-9h-2',
 info:'M12 11v6M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 wallet:'M3 5h17v16H3ZM3 9h17M15 12h6v5h-6Z'
};
const icons=new Map();
for(const [key,glyphs] of Object.entries({user:'👤👥',sound:'🔊🔉',mute:'🔇',music:'🎵🎶',cloud:'☁️',clock:'⏰🕒',add:'➕＋',save:'💾',delete:'🗑️🗑',edit:'✏️✍️📝',file:'📄📑🧾📋',search:'🔍🔎⌕',print:'🖨️🖨',lock:'🔐🔒🔑',unlock:'🔓',back:'⬅️↩️←↩',refresh:'🔄🔁♻️',bell:'🔔',chart:'📊📈🧮⚖️',folder:'📂📁',check:'✅',close:'❌✖',moon:'🌙',sun:'☀️☀',menu:'☰',settings:'⚙️⚙',share:'📤📥↗',info:'⚡💡📌ℹ️',wallet:'💰💵💳'})){
 for(const g of glyphs.match(/\p{Extended_Pictographic}\uFE0F?|[＋⌕☰←↩]/gu)||[])icons.set(g,key);
}
const pattern=new RegExp([...icons.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
const target='button,h1,h2,h3,summary,label,.acc-accordion-header,.ledger-page-title,.search-icon,.voucher-type-icon,.main-menu-icon,.open-tasks-cta';
const excluded='script,style,textarea,option,svg,table,[contenteditable],.ratib-ui-glyph,.print-header-banner,.ps-sheet';
function decorate(root){
 if(root.nodeType!==1||root.closest(excluded))return;
 const nodes=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const n=walker.currentNode,el=n.parentElement;
  if(!el||el.closest(excluded)||!el.closest(target))continue;
  if(el.closest('#accountStatementCard,#budgetReportCard,#trialBalanceCard')&&!el.closest('.no-print'))continue;
  pattern.lastIndex=0;if(pattern.test(n.data))nodes.push(n);
 }
 for(const n of nodes){
  const fragment=document.createDocumentFragment();let start=0;pattern.lastIndex=0;
  for(const m of n.data.matchAll(pattern)){
   fragment.append(document.createTextNode(n.data.slice(start,m.index)));
   const span=document.createElement('span');span.className='ratib-ui-glyph';span.dataset.icon=icons.get(m[0]);
   const original=document.createElement('span');original.className='ratib-ui-original';original.textContent=m[0];
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','ratib-ui-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
   const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[icons.get(m[0])]);svg.append(path);span.append(original,svg);fragment.append(span);start=m.index+m[0].length;
  }
  fragment.append(document.createTextNode(n.data.slice(start)));n.replaceWith(fragment);
 }
}
function start(){
 decorate(document.body);
 const observer=new MutationObserver(records=>{
  const roots=new Set();for(const r of records){if(r.type==='characterData')roots.add(r.target.parentElement);else for(const node of r.addedNodes)roots.add(node.nodeType===1?node:node.parentElement);}
  for(const root of roots)if(root&&root.isConnected)decorate(root);
 });
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
