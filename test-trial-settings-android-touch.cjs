'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const sidebar=fs.readFileSync('ratib-sidebar-3.6.124.js','utf8');
const sizes=fs.readFileSync('ratib-global-button-size-3.6.146.js','utf8');
const dom=new JSDOM(`<!doctype html><html lang="ar"><body>
  <div id="pageSettings"><div class="settings-accordion-card"><div class="settings-accordion-body">
    <input id="ratibCurrencyName" type="text" value="دولار أمريكي">
    <input id="currencyRate" type="text" value="412" data-reference-currency="SAR">
    <input id="ratibCurrencyCode" type="text" value="AED">
    <select id="ratibGlobalButtonSize"><option value="medium">متوسط</option><option value="large">كبير</option><option value="xlarge">كبير جدًا</option></select>
    <select id="ratibGlobalFontSize"><option value="medium">متوسط</option><option value="large">كبير</option></select>
    <p id="ratibSizeSaveStatus"></p>
  </div></div></div>
  <input id="ordinaryAccountNote" type="text" value="بيان">
</body></html>`,{url:'https://ratib.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window,d=w.document;
let legacyWrites=0;
w.store={get:(k,f)=>f,set:()=>legacyWrites++};
w.eval(sidebar);
const currencyName=d.getElementById('ratibCurrencyName');
const rate=d.getElementById('currencyRate');
const currencyCode=d.getElementById('ratibCurrencyCode');
const outside=d.getElementById('ordinaryAccountNote');
for(const field of [currencyName,rate,currencyCode,outside]){
 let selected=0;
 field.select=()=>{selected++};
 field.dispatchEvent(new w.FocusEvent('focusin',{bubbles:true}));
 assert.equal(selected,field===outside?1:0,'settings must not call select() and trigger Android text toolbar: '+field.id);
}
for(const [field,char] of [[currencyName,'ع'],[currencyCode,'A'],[rate,'4']]){
 const event=new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,data:char,inputType:'insertText'});
 field.dispatchEvent(event);
 assert.equal(event.defaultPrevented,false,'settings input should remain editable: '+field.id);
}
w.eval(sizes);
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const button=d.getElementById('ratibGlobalButtonSize');
const font=d.getElementById('ratibGlobalFontSize');
button.value='xlarge';
button.dispatchEvent(new w.Event('input',{bubbles:true}));
button.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.documentElement.dataset.ratibButtonSize,'xlarge');
assert.equal(w.localStorage.getItem('ratib_ui_button_size_v1'),'xlarge');
assert.equal(legacyWrites,1,'input followed by change must not duplicate the button setting write');
assert.match(d.getElementById('ratibSizeSaveStatus').textContent,/تم حفظ/);
font.value='large';
font.dispatchEvent(new w.Event('input',{bubbles:true}));
font.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.documentElement.dataset.ratibFontSize,'large');
assert.equal(w.localStorage.getItem('ratib_ui_font_size_v1'),'large');
assert.match(d.getElementById('ratibSizeSaveStatus').textContent,/تم حفظ/);
assert.match(sidebar,/if\(el.closest\('#pageSettings'\)\)return;/);
assert.match(sidebar,/#pageSettings \.settings-accordion-body select\{cursor:pointer!important;touch-action:manipulation/);
dom.window.close();
console.log('PASS trial mobile settings: native keyboard focus, currency editing, font/button picker input+change and status');
