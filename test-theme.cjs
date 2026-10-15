const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM(`<body><button id="save">💾 حفظ <b>السند</b></button><button id="state">🔓</button><input value="محمد"><select><option>💵 دولار</option></select><div id="accountStatementCard"><h2>📑 كشف الحساب</h2><button class="no-print">🖨️ طباعة</button></div><table><tr><td>💰 مبلغ</td></tr></table></body>`,{runScripts:'outside-only'});
 const w=dom.window,d=w.document,button=d.querySelector('#save'),text=button.textContent;let clicks=0;
 button.addEventListener('click',()=>clicks++);
 w.eval(fs.readFileSync('ratib-theme.js','utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,10));
 assert.equal(d.querySelector('#save'),button);assert.equal(button.textContent,text);assert.ok(button.querySelector('b'));button.click();assert.equal(clicks,1);
 assert.equal(d.querySelector('input').value,'محمد');assert.equal(d.querySelector('option').textContent,'💵 دولار');
 assert.equal(d.querySelector('table .ratib-ui-icon'),null);assert.equal(d.querySelector('#accountStatementCard h2 .ratib-ui-icon'),null);assert.ok(d.querySelector('#accountStatementCard button .ratib-ui-icon'));
 const state=d.querySelector('#state');state.textContent='🔒';await new Promise(r=>setTimeout(r,10));assert.ok(state.querySelector('.ratib-ui-icon'));assert.equal(state.textContent,'🔒');
 const count=d.querySelectorAll('.ratib-ui-icon').length;await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelectorAll('.ratib-ui-icon').length,count);
 const newButton=d.createElement('button');newButton.textContent='➕ جديد';d.body.append(newButton);await new Promise(r=>setTimeout(r,10));assert.ok(newButton.querySelector('.ratib-ui-icon'));assert.equal(newButton.textContent,'➕ جديد');
 dom.window.close();console.log('PASS theme preserves handlers, nodes, text, input values, options, report content; updates dynamic controls without recursion');
})();
