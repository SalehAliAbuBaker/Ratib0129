'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),sharp=require('sharp');
(async()=>{
 const raw=async p=>sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const original=await raw('branding/ratib-approved-original.png'),cutout=await raw('Icons/icon.png');
 assert.equal(cutout.info.width,1254);assert.equal(cutout.info.height,1254);
 assert.equal(original.info.width,cutout.info.width);assert.equal(original.info.height,cutout.info.height);
 let green=0,teal=0;
 for(let i=0;i<cutout.data.length;i+=4){const [r,g,b,a]=cutout.data.subarray(i,i+4);if(a===255){assert.deepEqual(cutout.data.subarray(i,i+3),original.data.subarray(i,i+3));if(g>80&&g>r*1.4&&g>b*1.2)green++;if(b>50&&g>r*1.4&&b>r*1.4&&g<140)teal++;}}
 assert(green>50000&&teal>50000,'Approved green and teal artwork retained');
 for(const [x,y] of [[0,0],[1253,0],[0,1253],[1253,1253]])assert.equal(cutout.data[(y*1254+x)*4+3],0);
 for(const n of [16,32,48,192,512]){const a=await raw('Icons/icon-'+n+'.png');assert.equal(a.info.width,n);assert.equal(a.info.height,n);assert.equal(a.data[3],0);}
 for(const n of [192,512]){const a=await raw('Icons/icon-'+n+'-maskable.png');for(let i=3;i<a.data.length;i+=4)assert.equal(a.data[i],255);}
 for(const [density,n] of [['mdpi',108],['hdpi',162],['xhdpi',216],['xxhdpi',324],['xxxhdpi',432]]){const a=await raw('android/app/src/main/res/mipmap-'+density+'/ic_launcher_foreground.png');assert.equal(a.info.width,n);for(let i=3;i<a.data.length;i+=4){if(a.data[i]<200)continue;const p=(i-3)/4;assert(Math.hypot(p%n+.5-n/2,Math.floor(p/n)+.5-n/2)<n*33/108,'Artwork inside Android safe circle');}}
 const logo=await raw('Icons/ratib-logo-horizontal.png');assert(logo.info.width>logo.info.height);assert.equal(logo.data[3],0);
 const ico=fs.readFileSync('favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 const sw=fs.readFileSync('sw.js','utf8');for(const p of ['favicon.ico','Icons/icon-32.png','Icons/icon-192.png','Icons/icon-512-maskable.png'])assert(sw.includes('./'+p));
 const worker=fs.readFileSync('cloudflare/ratib-worker-license.js','utf8').match(/const appIconBase64 = '([^']+)'/)[1];assert.deepEqual(Buffer.from(worker,'base64'),fs.readFileSync('Icons/icon-192.png'));
 console.log('PASS Ratib green/teal branding, transparency, safe zones, horizontal logo and licensing icon');
})().catch(e=>{console.error(e);process.exitCode=1});
