// JSDOM does not decode image assets. Canvas integration tests model readiness explicitly.
module.exports=function installTestImages(window){
 window.Image=class TestImage{
  constructor(){this.naturalWidth=192;this.naturalHeight=192;this.complete=false;}
  set src(value){this._src=value;this.complete=true;queueMicrotask(()=>{if(window.document)this.onload?.();});}
  get src(){return this._src||'';}
 };
};
