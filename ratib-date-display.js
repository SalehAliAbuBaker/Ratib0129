/* Shared date presentation; preserves native picker, values and events. */
(()=>{'use strict';
const dateStyle=document.createElement('style');dateStyle.textContent=`
.ratib-native-date-wrap{display:grid!important;grid-template-columns:minmax(0,1fr);width:100%;max-width:100%;min-width:0;position:relative;box-sizing:border-box}
.ratib-native-date-wrap>input{grid-area:1/1;min-width:0!important;width:100%!important;color:transparent!important;-webkit-text-fill-color:transparent!important}
.ratib-native-date-label{position:absolute;inset:0 32px;display:flex;align-items:center;min-width:0;overflow:hidden;box-sizing:border-box;z-index:1;pointer-events:none;direction:ltr!important;unicode-bidi:isolate!important;text-align:left!important;padding:0;color:var(--text)!important;font:400 14px/1.5 system-ui,sans-serif!important;white-space:nowrap}
@media print{.ratib-native-date-label{display:none!important}.ratib-native-date-wrap>input{color:inherit!important;-webkit-text-fill-color:currentColor!important}}
`;document.head.append(dateStyle);
const latinDateFields=()=>document.querySelectorAll('input[type="date"],input[type="time"],input[type="month"]').forEach(input=>{
 input.lang='en-CA-u-nu-latn';input.dir='ltr';
 if(input.type!=='date')return;
 if(input.dataset.nativeDateDisplay){const existing=input._ratibDateWrapper;if(existing&&input.parentElement!==existing){input.before(existing);existing.prepend(input);}return;}
 input.dataset.nativeDateDisplay='1';
 const wrapper=document.createElement('span');wrapper.className='ratib-native-date-wrap';
 const label=document.createElement('span');label.className='ratib-native-date-label';label.setAttribute('aria-hidden','true');
 input._ratibDateWrapper=wrapper;input.before(wrapper);wrapper.append(input,label);
 const sync=()=>{const value=input.value;const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);const text=match?match[1]+'/'+match[2]+'/'+match[3]:'YYYY/MM/DD';if(label.textContent!==text)label.textContent=text;};
 const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
 Object.defineProperty(input,'value',{configurable:true,get(){return descriptor.get.call(this)},set(value){descriptor.set.call(this,value);sync()}});
 input.addEventListener('input',sync);input.addEventListener('change',sync);input.form?.addEventListener('reset',()=>setTimeout(sync,0));sync();
});
latinDateFields();
new MutationObserver(latinDateFields).observe(document.body,{childList:true,subtree:true});

})();
