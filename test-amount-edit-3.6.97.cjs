/* Regression tests for trial 3.6.97 monetary field editor; no DOM dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const events=new Map();
class Input {
  constructor(value='',type='text'){
    this.value=value;this.type=type;this.disabled=false;this.readOnly=false;
    this.selectionStart=0;this.selectionEnd=0;this.selectionDirection='none';this.selectCount=0;
    this.inputmode='decimal';this.matchesSelector=true;this.events=[];
  }
  matches(){return this.matchesSelector}
  closest(){return null}
  select(){this.selectionStart=0;this.selectionEnd=this.value.length;this.selectCount++}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}
  dispatchEvent(event){this.events.push(event.type);events.get(event.type)?.({target:this})}
}
const document={activeElement:null,addEventListener:(name,fn)=>events.set(name,fn)};
vm.runInNewContext(fs.readFileSync(require.resolve('./ratib-amount-edit-3.6.97.js'),'utf8'),{
  document,HTMLInputElement:Input,WeakSet,Event:class{constructor(type){this.type=type}}
});
const emit=(name,target,extras={})=>events.get(name)({target,...extras});
const a=new Input('1,000,000');
emit('pointerdown',a);document.activeElement=a;emit('focusin',a);emit('click',a);
assert.deepEqual([a.selectionStart,a.selectionEnd],[0,9],'first tap selects the complete existing amount');
const selected=a.selectCount;
a.setSelectionRange(3,3);emit('pointerdown',a);emit('click',a);
assert.equal(a.selectCount,selected,'second tap must not reselect');
assert.equal(a.selectionStart,3,'native caret position remains');
a.value='1,050,000';a.setSelectionRange(4,4);emit('input',a);
assert.equal(a.value,'1,050,000');
assert.equal(a.selectionStart,4);
a.value='1000000';a.setSelectionRange(7,7);emit('input',a);
assert.equal(a.value,'1,000,000');
assert.equal(a.selectionStart,9);
a.value='١٠٥٠٠٠٠';a.setSelectionRange(7,7);emit('input',a);
assert.equal(a.value,'1,050,000');
assert.equal(a.selectionStart,9);
a.value='1,050,000';a.setSelectionRange(2,2);
let prevented=false;emit('keydown',a,{key:'Backspace',preventDefault(){prevented=true}});
assert.ok(prevented);
assert.equal(a.value,'050,000','separator deletion removes digit rather than re-adding comma');
assert.ok(a.events.includes('input'),'existing financial listeners receive the edit');
const b=new Input('4.567');document.activeElement=b;emit('focusin',b);
assert.deepEqual([b.selectionStart,b.selectionEnd],[0,5]);
b.value='4.567';b.setSelectionRange(3,3);emit('input',b);
assert.equal(b.value,'4.567','fractional exchange rates are retained');
const skip=new Input('123','number');document.activeElement=skip;emit('focusin',skip);
assert.equal(skip.selectCount,0,'native number inputs are not changed');
console.log('PASS 3.6.97 amount/rate first tap, caret, thousands, Arabic digits, separator deletion, rates, isolation');
