'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),source=path.join(root,'Icons/icon.png'),green='#ffffff';
const write=async(file,buffer)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,buffer);};
async function resize(size){return sharp(source).resize(size,size,{kernel:'lanczos3'}).png().toBuffer();}
async function padded(size,ratio,opaque){const side=Math.round(size*ratio),offset=Math.floor((size-side)/2);return sharp({create:{width:size,height:size,channels:4,background:opaque?green:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await resize(side),left:offset,top:offset}]).png().toBuffer();}
async function generate(){
 for(const n of [16,32,48,192,512])await write('Icons/icon-'+n+'.png',await resize(n));
 for(const n of [192,512])await write('Icons/icon-'+n+'-maskable.png',await padded(n,.72,true));
 await write('Icons/apple-touch-icon.png',await padded(180,1,true));
 const sizes=[16,32,48],images=await Promise.all(sizes.map(resize));
 const ico=Buffer.alloc(6+16*sizes.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(sizes.length,4);let offset=ico.length;
 images.forEach((b,i)=>{const p=6+i*16;ico[p]=ico[p+1]=sizes[i];ico.writeUInt16LE(1,p+4);ico.writeUInt16LE(32,p+6);ico.writeUInt32LE(b.length,p+8);ico.writeUInt32LE(offset,p+12);offset+=b.length;});
 await write('favicon.ico',Buffer.concat([ico,...images]));
 await write('android/app/src/main/res/drawable/ratib_icon.png',await resize(512));
 await write('android/app/src/main/res/drawable/ratib_splash_icon.png',await padded(288,.64,false));
 for(const [density,size,foreground]of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
  for(const name of ['ic_launcher','ic_launcher_round'])await write('android/app/src/main/res/mipmap-'+density+'/'+name+'.png',await resize(size));
  await write('android/app/src/main/res/mipmap-'+density+'/ic_launcher_foreground.png',await padded(foreground,.56,false));
 }
 // Existing licensing administration embeds its app icon for offline routing.
 const worker=path.join(root,'cloudflare/ratib-worker-license.js');
 fs.writeFileSync(worker,fs.readFileSync(worker,'utf8').replace(/const appIconBase64 = '[^']+';/,"const appIconBase64 = '"+(await resize(192)).toString('base64')+"';"));
 console.log('Generated web, PWA, favicon, Android launcher, adaptive and splash assets from the approved cutout.');
}
if(require.main===module)generate().catch(e=>{console.error(e);process.exitCode=1});
module.exports={generate};
