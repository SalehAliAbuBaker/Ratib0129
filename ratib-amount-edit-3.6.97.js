/* Ratib trial 3.6.97 — amount and exchange-rate caret editing.
   Presentation/input selection only. No posting, balancing or persisted data logic. */
(function(){
  'use strict';
  const firstPointerFocus=new WeakSet();
  const isMoneyInput=node=>{
    if(!(node instanceof HTMLInputElement)||node.disabled||node.readOnly)return false;
    if(!['text','search','tel'].includes(node.type))return false;
    if(!node.matches('input[inputmode="decimal"],input.number-formatted'))return false;
    return !node.closest('#financialCalculatorModal');
  };
  const normalize=text=>String(text)
    .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660))
    .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0))
    .replace(/٫/g,'.').replace(/٬/g,',');
  const group=text=>{
    const raw=normalize(text),clean=raw.replace(/,/g,'');
    if(!/^[+-]?\d*(?:\.\d*)?$/.test(clean))return raw;
    const sign=/^[+-]/.test(clean)?clean[0]:'';
    const value=sign?clean.slice(1):clean;
    const decimal=value.indexOf('.');
    const whole=decimal===-1?value:value.slice(0,decimal);
    const fraction=decimal===-1?'':value.slice(decimal);
    return sign+whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+fraction;
  };
  const digitOffset=(text,pos)=>[...text.slice(0,pos)].filter(c=>c!==',').length;
  const displayOffset=(text,logical)=>{
    if(logical<=0)return 0;
    let offset=0,units=0;
    for(const char of text){
      offset+=char.length;
      if(char!==',')units++;
      if(units>=logical)break;
    }
    return offset;
  };
  const tidy=input=>{
    const before=input.value,after=group(before);
    if(before===after)return;
    const start=input.selectionStart,end=input.selectionEnd,dir=input.selectionDirection;
    const mappedStart=start===null?null:displayOffset(after,digitOffset(normalize(before),start));
    const mappedEnd=end===null?null:displayOffset(after,digitOffset(normalize(before),end));
    input.value=after;
    if(mappedStart!==null&&mappedEnd!==null){
      try{input.setSelectionRange(mappedStart,mappedEnd,dir||'none')}catch(_){}
    }
  };
  const selectAll=input=>{
    if(!isMoneyInput(input))return;
    try{input.select()}catch(_){}
  };
  // First tap selects the entire amount. A second tap uses the native caret.
  document.addEventListener('pointerdown',event=>{
    const input=event.target;
    if(!isMoneyInput(input))return;
    if(document.activeElement===input)firstPointerFocus.delete(input);
    else firstPointerFocus.add(input);
  },true);
  document.addEventListener('focusin',event=>{
    if(isMoneyInput(event.target))selectAll(event.target);
  },true);
  document.addEventListener('click',event=>{
    const input=event.target;
    if(!isMoneyInput(input)||!firstPointerFocus.has(input))return;
    firstPointerFocus.delete(input);
    selectAll(input);
  },false);
  document.addEventListener('pointercancel',event=>{
    if(isMoneyInput(event.target))firstPointerFocus.delete(event.target);
  },true);
  // Group digits while preserving the logical caret and selection boundaries.
  document.addEventListener('input',event=>{
    const input=event.target;
    if(!isMoneyInput(input)||event.isComposing||document.activeElement!==input)return;
    tidy(input);
  },true);
  // Make Backspace/Delete at a thousands comma remove an adjacent digit.
  document.addEventListener('keydown',event=>{
    const input=event.target;
    if(!isMoneyInput(input)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
    if(event.key!=='Backspace'&&event.key!=='Delete')return;
    const start=input.selectionStart,end=input.selectionEnd,value=input.value;
    if(start===null||end===null||start!==end)return;
    const comma=event.key==='Backspace'?start-1:start;
    if(value[comma]!==',')return;
    const digit=event.key==='Backspace'?comma-1:comma+1;
    if(digit<0||digit>=value.length||!/\d/.test(value[digit]))return;
    event.preventDefault();
    const logical=digitOffset(value,digit);
    input.value=value.slice(0,digit)+value.slice(digit+1);
    const grouped=group(input.value);
    input.value=grouped;
    const caret=displayOffset(grouped,logical);
    try{input.setSelectionRange(caret,caret)}catch(_){}
    input.dispatchEvent(new Event('input',{bubbles:true}));
  },true);
})();