'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dest=path.resolve(__dirname,'../build/support');fs.mkdirSync(dest,{recursive:true});
const dependencies=[
 ['androidx/webkit/webkit/1.12.1/webkit-1.12.1.aar','18a0a51ad129e0c8563f031d46c8a7e61169f56ae84e562a0d75686941262111'],
 ['androidx/core/core/1.1.0/core-1.1.0.aar','76c7cfbe596fe3c09a6983bf1c89e889299c08ac9a3b52ce5182a088d056647e'],
 ['androidx/annotation/annotation-jvm/1.8.1/annotation-jvm-1.8.1.jar','9aab326d9492800991854360ac248f493ce7f7c3183519309b78ace9e240f6f6'],
 ['androidx/annotation/annotation-experimental/1.4.1/annotation-experimental-1.4.1.aar','6bd4c7c7476f8260cd3bdbb81183583e93fc9f790c27dea7dc314181cbf87aa0']
];
(async()=>{for(const [artifact,hash]of dependencies){const file=path.join(dest,path.basename(artifact));if(!fs.existsSync(file)){const response=await fetch('https://dl.google.com/dl/android/maven2/'+artifact);if(!response.ok)throw Error('Dependency download failed '+response.status);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));}if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Dependency checksum mismatch: '+path.basename(artifact));}console.log('AndroidX downloads verified');})().catch(e=>{console.error(e.message);process.exitCode=1;});
