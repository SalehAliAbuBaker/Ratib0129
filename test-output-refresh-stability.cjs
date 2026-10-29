const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('index.html','utf8');
const code=source.slice(source.indexOf('function ratibUpdatePaperOrientation('),source.indexOf('function ratibTogglePaperOrientation('));
const dom=new JSDOM('<button id="ratibStatementOrientationBtn"></button><button id="ratibAccountOrientationBtn"><small id="ratibAccountOrientationLabel"></small></button>',{runScripts:'outside-only'}),w=dom.window;let landscape=false;w.ratibPaperLandscape=()=>landscape;w.showToast=()=>{};w.eval(code);
w.ratibUpdatePaperOrientation();const observer=new w.MutationObserver(()=>{});observer.observe(w.document.body,{childList:true,subtree:true});
for(let i=0;i<200;i++)w.ratibUpdatePaperOrientation();assert.equal(observer.takeRecords().length,0,'Unchanged orientation must not regenerate DOM');
landscape=true;w.ratibUpdatePaperOrientation();assert.equal(w.document.getElementById('ratibStatementOrientationBtn').textContent,'A4 أفقي');assert.equal(observer.takeRecords().length,2);
for(let i=0;i<200;i++)w.ratibUpdatePaperOrientation();assert.equal(observer.takeRecords().length,0);
observer.disconnect();console.log('PASS 400 unchanged refreshes cause no child mutations; orientation change updates both labels');
