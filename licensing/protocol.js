/* Public protocol only. This file contains no issuer private keys or admin credentials. */
(function(root){
 'use strict';
 const enc=new TextEncoder(),dec=new TextDecoder(),VERSION=1,AUDIENCE='ratib';
 function b64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function bytes(s){if(typeof s!=='string'||!s||s.length>16000||!/^[\w-]+$/.test(s))throw Error('INVALID_ENCODING');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
 function pack(value){return b64(enc.encode(JSON.stringify(value)));}
 function unpack(value){return JSON.parse(dec.decode(bytes(value)));}
 function publicJwk(j){if(!j||j.kty!=='EC'||j.crv!=='P-256'||typeof j.x!=='string'||typeof j.y!=='string'||j.d)throw Error('INVALID_PUBLIC_KEY');return {kty:'EC',crv:'P-256',x:j.x,y:j.y};}
 async function deviceId(j,cryptoApi=root.crypto){return b64(await cryptoApi.subtle.digest('SHA-256',enc.encode(JSON.stringify(publicJwk(j)))));}
 async function makeRequest(identity,email='',cryptoApi=root.crypto,licenseId=null){
  const body={v:VERSION,aud:AUDIENCE,device:identity.device,publicKey:publicJwk(identity.publicKey),email:String(email).trim().toLowerCase(),nonce:b64(cryptoApi.getRandomValues(new Uint8Array(24))),licenseId};
  const data=pack(body),sig=await cryptoApi.subtle.sign({name:'ECDSA',hash:'SHA-256'},identity.privateKey,enc.encode('RATIBREQ1.'+data));
  return 'RATIBREQ1.'+data+'.'+b64(sig);
 }
 async function verifyRequest(code,cryptoApi=root.crypto){
  if(typeof code!=='string'||code.length>10000)throw Error('INVALID_REQUEST');
  const parts=code.trim().split('.');if(parts.length!==3||parts[0]!=='RATIBREQ1')throw Error('INVALID_REQUEST');
  const body=unpack(parts[1]);if(body.v!==VERSION||body.aud!==AUDIENCE||!body.nonce||typeof body.email!=='string'||body.email.length>254||body.device!==await deviceId(body.publicKey,cryptoApi))throw Error('INVALID_REQUEST');
  const key=await cryptoApi.subtle.importKey('jwk',publicJwk(body.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await cryptoApi.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(parts[2]),enc.encode(parts[0]+'.'+parts[1])))throw Error('INVALID_REQUEST_SIGNATURE');
  return body;
 }
 async function signToken(claims,key,kid,cryptoApi=root.crypto){const header=pack({v:VERSION,alg:'ES256',kid}),body=pack(claims),message='RATIB1.'+header+'.'+body;return message+'.'+b64(await cryptoApi.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(message)));}
 async function verifyToken(code,config,device,cryptoApi=root.crypto){
  if(typeof code!=='string'||code.length>16000)throw Error('INVALID_TOKEN');
  const p=code.trim().split('.');if(p.length!==4||p[0]!=='RATIB1')throw Error('INVALID_TOKEN');
  const h=unpack(p[1]);if(h.v!==VERSION||h.alg!=='ES256'||typeof h.kid!=='string'||!Object.hasOwn(config.publicKeys,h.kid))throw Error('UNKNOWN_SIGNING_KEY');
  const key=await cryptoApi.subtle.importKey('jwk',publicJwk(config.publicKeys[h.kid]),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await cryptoApi.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(p[3]),enc.encode(p.slice(0,3).join('.'))))throw Error('INVALID_SIGNATURE');
  const c=unpack(p[2]);
  if(c.v!==VERSION||c.aud!==AUDIENCE||c.iss!==config.issuer||c.device!==device||typeof c.id!=='string'||!['trial','annual','permanent','custom'].includes(c.kind)||!['active','revoked'].includes(c.status)||!['device','email','both'].includes(c.binding))throw Error('INVALID_CLAIMS');
  for(const field of ['issuedAt','serverAt','startsAt','revision'])if(!Number.isSafeInteger(c[field])||c[field]<0)throw Error('INVALID_CLAIMS');
  if(c.serverAt!==c.issuedAt||c.startsAt>c.issuedAt||!Number.isInteger(c.maxDevices)||c.maxDevices<1||c.maxDevices>100)throw Error('INVALID_CLAIMS');
  if(c.kind==='permanent'){if(c.expiresAt!==null)throw Error('INVALID_CLAIMS');}else if(!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=c.startsAt)throw Error('INVALID_CLAIMS');
  if(c.binding!=='device'&&(!c.email||!c.emailVerified))throw Error('EMAIL_NOT_VERIFIED');
  return c;
 }
 function status(claims,now,rollback=false){if(!claims)return {writable:false,state:'unactivated',days:0};if(claims.status==='revoked')return {writable:false,state:'revoked',days:0};if(rollback)return {writable:false,state:'clock',days:0};if(now<claims.startsAt)return {writable:false,state:'clock',days:0};if(claims.expiresAt!==null&&now>=claims.expiresAt)return {writable:false,state:'expired',days:0};return {writable:true,state:claims.kind,days:claims.expiresAt===null?null:Math.ceil((claims.expiresAt-now)/86400000)};}
 root.RatibLicenseProtocol=Object.freeze({VERSION,AUDIENCE,b64,bytes,pack,unpack,publicJwk,deviceId,makeRequest,verifyRequest,signToken,verifyToken,status});
})(typeof globalThis!=='undefined'?globalThis:this);
