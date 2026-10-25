const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=function assertRelease(){
 const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
 const html=read('index.html'),sw=read('sw.js'),version=JSON.parse(read('package.json')).version;
 assert.match(version,/^3\.6\.\d+(?:\.\d+)?$/);
 for(const [source,name] of [[html,'RATIB_RELEASE'],[sw,'APP_RELEASE']]){
  const raw=source.match(new RegExp('const '+name+'=(\\{[^;]+\\});'))?.[1];
  assert(raw,name+' must declare a release');
  assert.equal(JSON.parse(raw).version,version,name+' must match package.json');
 }
 const cache=sw.match(/const CACHE_VERSION=['"]([^'"]+)['"]/)?.[1];
 assert(cache?.endsWith('-'+version),'Offline cache must use the complete current release');
 assert(html.includes('الإصدار '+version),'Visible release must match package.json');
 return version;
};
