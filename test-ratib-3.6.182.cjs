'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(name,'utf8');
const index=read('index.html'),commerce=read('ratib-commerce-3.6.131.js'),pulse=read('ratib-cash-pulse.js');
const sidebar=read('ratib-sidebar-3.6.124.js'),buttons=read('ratib-global-button-size-3.6.146.js');
const buttonCss=read('ratib-global-button-size-3.6.146.css'),fontCss=read('ratib-interface-font-3.6.148.css');
const sw=read('sw.js');
function extract(src,name){
 const start=src.indexOf('function '+name+'(');assert(start>=0,'missing '+name);
 const brace=src.indexOf('{',start);let depth=0;
 for(let i=brace;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'&&!--depth)return src.slice(start,i+1);}
 throw Error('unbalanced '+name);
}
const context=vm.createContext({});
vm.runInContext(extract(index,'ratibSearchFold')+'; this.fold=ratibSearchFold;',context);
vm.runInContext(extract(commerce,'commerceNormalize')+'; this.commerceFold=commerceNormalize;',context);
const foldLine=pulse.split('\n').find(line=>line.startsWith('const pulseSearchFold='));
assert(foldLine);vm.runInContext(foldLine+'; this.pulseFold=pulseSearchFold;',context);
for(const [a,b] of [['مؤسسة الرأفة','مؤسسه الرأفه'],['مدرسة الإيمان','مدرسه الايمان'],['عهدة الموظف','عهده الموظف']]){
 for(const name of ['fold','commerceFold','pulseFold'])assert.equal(context[name](a),context[name](b),name+' '+a);
}
assert(index.includes('function ratibBindCurrencyPullToRefresh()'));
assert(index.includes('setAccountCurrencyPage(currencies[(active+1)%currencies.length])'));
assert(index.includes('if(currencies.length<2)return;'));
assert(index.includes('if(dy<70||dy<Math.abs(dx)*1.3)return;'));
assert(index.includes('if(event.cancelable)event.preventDefault();'));
const html='<html><body><div id="pageCommerce"><div class="rc-app"></div></div><div class="ratib-commerce-shortcuts"></div>'+
 '<input type="range" id="ratibGlobalFontSize" min="1" max="7" step="1" value="4"><output id="ratibGlobalFontSizeValue"></output>'+
 '<input type="range" id="ratibGlobalButtonSize" min="1" max="7" step="1" value="4"><output id="ratibGlobalButtonSizeValue"></output></body></html>';
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://ratib.test/'});
const w=dom.window,d=w.document;
w.localStorage.setItem('ratib_ui_button_size_v1','xlarge');
w.localStorage.setItem('ratib_ui_font_size_v1','small');
w.eval(buttons);d.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(d.documentElement.dataset.ratibButtonSize,'xlarge');
assert.equal(d.getElementById('ratibGlobalButtonSize').value,'6');
assert.equal(d.getElementById('ratibGlobalFontSize').value,'3');
d.getElementById('ratibGlobalButtonSize').value='7';
d.getElementById('ratibGlobalButtonSize').dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(w.localStorage.getItem('ratib_ui_button_size_v1'),'xxlarge');
d.getElementById('ratibGlobalFontSize').value='1';
d.getElementById('ratibGlobalFontSize').dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(w.localStorage.getItem('ratib_ui_font_size_v1'),'xxsmall');
assert.match(d.getElementById('ratibGlobalFontSizeValue').textContent,/1 من 7/);
assert(sidebar.includes('type="range" id="ratibGlobalFontSize"'));
assert(sidebar.includes('type="range" id="ratibGlobalButtonSize"'));
assert(buttonCss.includes('[data-ratib-button-size="xxlarge"]'));
assert(fontCss.includes('[data-ratib-font-size="xxlarge"]'));
assert(index.includes('RATIB_RELEASE={"version":"3.6.193"'));
assert(sw.includes('APP_RELEASE={"version":"3.6.193"'));
new Function(buttons);new Function(sidebar);
dom.window.close();
console.log('PASS 3.6.185: Arabic equivalence, account currency pull guard, seven slider levels and legacy preferences');