'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),sharp=require('sharp');
(async()=>{
 const raw=async p=>sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const original=await raw('branding/ratib-approved-original.png'),cutout=await raw('Icons/icon.png');
 assert.equal(cutout.info.width,1254);assert.equal(cutout.info.height,1254);
 let gold=0;
 for(let i=0;i<original.data.length;i+=4){const [r,g,b]=original.data.subarray(i,i+3);if(r>100&&g>b*1.3&&r>g*.95&&b<200){assert.equal(cutout.data[i+3],255,'Every gold detail remains opaque');assert.deepEqual(cutout.data.subarray(i,i+3),original.data.subarray(i,i+3),'Approved gold pixels are unchanged');gold++;}}
 assert(gold>50000,'The approved gold wallet and chart remain present');
 let green=0;for(let i=0;i<original.data.length;i+=4){const [r,g,b]=original.data.subarray(i,i+3);if(g>30&&r<g*.65&&b<g*.95){assert.equal(cutout.data[i+3],255);assert.deepEqual(cutout.data.subarray(i,i+3),original.data.subarray(i,i+3),'Approved green lettering and arrow pixels are unchanged');green++;}}assert(green>50000);
 for(const [x,y]of [[0,0],[1253,0],[0,1253],[1253,1253]])assert.equal(cutout.data[(y*1254+x)*4+3],0,'External white corners must be transparent');
 for(const size of [16,32,48,192,512]){const image=await raw('Icons/icon-'+size+'.png');assert.equal(image.info.width,size);assert.equal(image.info.height,size);assert.equal(image.data[3],0);}
 for(const [file,radius]of [['Icons/icon-512-maskable.png',.4],['android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',33/108]]){
  const image=await raw(file),size=image.info.width;let count=0;
  for(let i=0;i<image.data.length;i+=4){const [r,g,b,a]=image.data.subarray(i,i+4);if(a>240&&r>100&&g>b*1.3&&r>g*.95&&b<200){const x=(i/4)%size+.5-size/2,y=Math.floor(i/4/size)+.5-size/2;assert(Math.hypot(x,y)<size*radius,'Gold artwork remains inside the mask safe circle');count++;}}
  assert(count>1000);
 }
 for(const size of [192,512]){const image=await raw('Icons/icon-'+size+'-maskable.png');for(let i=3;i<image.data.length;i+=4)assert.equal(image.data[i],255,'Maskable canvas is fully opaque');}
 const ico=fs.readFileSync('favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 const sw=fs.readFileSync('sw.js','utf8');for(const p of ['favicon.ico','Icons/icon-32.png','Icons/icon-192.png','Icons/icon-512-maskable.png'])assert(sw.includes('./'+p));
 const worker=fs.readFileSync('cloudflare/ratib-worker-license.js','utf8').match(/const appIconBase64 = '([^']+)'/)[1];assert.deepEqual(Buffer.from(worker,'base64'),fs.readFileSync('Icons/icon-192.png'));
 console.log('PASS approved artwork: '+gold+' original gold pixels preserved; transparent corners, favicon sizes, offline assets, maskable/adaptive safe zones and licensing icon');
})().catch(e=>{console.error(e);process.exitCode=1});
