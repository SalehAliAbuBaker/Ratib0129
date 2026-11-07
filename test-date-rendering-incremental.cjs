const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const root=__dirname;const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<main><section id="pageSettings"></section><section id="pageLedger"></section><aside id="other"></aside><div id="printPreviewBody"></div></main>',{url:'https://ratib.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 for(let i=0;i<100;i++)d.querySelector('#pageLedger').insertAdjacentHTML('beforeend','<div class="tx-log-item"><span class="tx-date-line">2026-11-07</span><span>سند تجريبي</span></div>');
 let visits=0,walkers=0;const orig=d.createTreeWalker.bind(d);d.createTreeWalker=(...args)=>{walkers++;const o=orig(...args);const next=o.nextNode.bind(o);o.nextNode=()=>{const n=next();if(n)visits++;return n};return o};
 w.eval(fs.readFileSync(path.join(root,'ratib-date-display.js'),'utf8'));await pause(250);
 visits=0;walkers=0;
 for(let i=0;i<6;i++){d.querySelector('#other').textContent='تنبيه '+i;await pause(60)}
 const unrelated={visits,walkers};visits=0;walkers=0;
 d.querySelector('#pageLedger').insertAdjacentHTML('beforeend','<div class="tx-log-item">2026-11-08</div>');await pause(120);
 const addition={visits,walkers};d.querySelector('#printPreviewBody').textContent='تاريخ السند 2026-11-09';w.dispatchEvent(new w.Event('beforeprint'));
 if(!d.querySelector('#printPreviewBody [data-iso="2026-11-09"]')||!d.querySelector('#pageLedger [data-iso="2026-11-08"]'))throw Error('Date did not render');
 if(unrelated.visits!==0||addition.visits>4)throw Error('An unrelated change scanned existing ledger dates');
 const dynamic=d.createElement('div');dynamic.innerHTML='<form><input type="date" value="2026-11-12"></form>';
 d.body.append(dynamic);await pause(90);const field=dynamic.querySelector('input');
 if(!field.closest('.ratib-native-date-wrap'))throw Error('Dynamic field missing date control');
 field.value='2026-12-01';field.form.reset();await pause(60);
 if(field.value!=='2026-11-12')throw Error('Reset failed');
 const note=d.createTextNode('2026-11-09');d.querySelector('#printPreviewBody').replaceChildren(note);
 note.nodeValue='2026-11-10';await pause(90);
 if(!d.querySelector('#printPreviewBody [data-iso="2026-11-10"]'))throw Error('Updated print date is missing');
 console.log('PASS incremental date rendering, dynamic field reset, and print formatting');process.exit(0);
})().catch(e=>{console.error(e);process.exitCode=1});
