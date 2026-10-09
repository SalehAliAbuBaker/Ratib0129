import '../../licensing/protocol.js';
import {adminPage} from './admin.mjs';
const P=globalThis.RatibLicenseProtocol,TE=new TextEncoder();
const baseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
class ApiError extends Error{constructor(code,status=400){super(code);this.status=status;}}
const fail=(code,status=400)=>{throw new ApiError(code,status);};
const emailOk=x=>typeof x==='string'&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const utc=ms=>new Date(ms).toISOString().slice(0,19).replace('T',' ');
const parseUTC=s=>s?Date.parse(s.includes('T')?s:s.replace(' ','T')+'Z'):null;
const changes=r=>Number(r?.meta?.changes||0);
function durations(kind,days,now){if(!['trial','annual','permanent','custom'].includes(kind))fail('INVALID_LICENSE_TYPE');if(kind==='permanent')return null;if(kind==='annual'){const d=new Date(now);d.setUTCFullYear(d.getUTCFullYear()+1);return d.getTime();}const n=kind==='trial'?3:Number(days);if(!Number.isInteger(n)||n<1||n>3650)fail('INVALID_DURATION');return now+n*86400000;}
async function body(req){if(!req.headers.get('content-type')?.includes('application/json'))fail('JSON_REQUIRED',415);if(Number(req.headers.get('content-length')||0)>24000)fail('REQUEST_TOO_LARGE',413);const text=await req.text();if(text.length>24000)fail('REQUEST_TOO_LARGE',413);try{const b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))fail('INVALID_JSON');return b;}catch(e){if(e instanceof ApiError)throw e;fail('INVALID_JSON');}}
async function hash(value){return P.b64(await crypto.subtle.digest('SHA-256',TE.encode(value)));}
async function authorized(req,env){if(!env.ADMIN_API_KEY||!req.headers.get('Authorization')?.startsWith('Bearer '))return false;const [a,b]=await Promise.all([hash(env.ADMIN_API_KEY),hash(req.headers.get('Authorization').slice(7))]);let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function stmt(db,sql,...args){return db.prepare(sql).bind(...args);}
function auditStatement(db,action,id=null,device=null,details={}){return stmt(db,'INSERT INTO ratib_license_audit(id,created_at,action,license_id,device_id,details) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),Date.now(),action,id,device,JSON.stringify(details));}
async function meta(db,id){return await stmt(db,'SELECT * FROM ratib_license_meta WHERE license_id=?',id).first()||{revision:1,email_verified:0};}
async function bump(db,id,extra=[]){return db.batch([stmt(db,'INSERT INTO ratib_license_meta(license_id,revision,email_verified,updated_at) VALUES(?,2,0,?) ON CONFLICT(license_id) DO UPDATE SET revision=revision+1,updated_at=excluded.updated_at',id,Date.now()),...extra]);}
async function rate(req,env,scope,limit){
 const bucket=Math.floor(Date.now()/60000),ip=req.headers.get('CF-Connecting-IP')||'unknown';
 const key=await hash(scope+'\n'+ip+'\n'+(env.ADMIN_API_KEY||'ratib-public-rate'));
 const row=await stmt(env.DB,'INSERT INTO ratib_license_rate_limits(rate_key,bucket,hits) VALUES(?,?,1) ON CONFLICT(rate_key) DO UPDATE SET hits=CASE WHEN bucket=excluded.bucket THEN hits+1 ELSE 1 END,bucket=excluded.bucket RETURNING hits',key,bucket).first();
 if(Number(row.hits)>limit)fail('RATE_LIMITED',429);
}
async function wrapKey(env){if(typeof env.SIGNING_KEY_ENCRYPTION_KEY!=='string'||env.SIGNING_KEY_ENCRYPTION_KEY.length<32)fail('SIGNING_WRAP_SECRET_REQUIRED',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',TE.encode('ratib/signing-wrap/v1\n'+env.SIGNING_KEY_ENCRYPTION_KEY)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function initializeSigner(env){
 const exists=await env.DB.prepare("SELECT kid,public_jwk FROM ratib_signing_keys WHERE status='active'").first();if(exists)return {kid:exists.kid,publicKey:JSON.parse(exists.public_jwk)};
 const wrap=await wrapKey(env),pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKey=P.publicJwk(await crypto.subtle.exportKey('jwk',pair.publicKey)),privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),kid=crypto.randomUUID(),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:TE.encode(kid)},wrap,TE.encode(JSON.stringify(privateKey)));
 // Unique partial index makes initialization race-safe: no active key is replaced.
 try{await env.DB.batch([stmt(env.DB,"INSERT INTO ratib_signing_keys(kid,public_jwk,wrapped_private_jwk,iv,created_at,status) VALUES(?,?,?,?,?,'active')",kid,JSON.stringify(publicKey),P.b64(cipher),P.b64(iv),Date.now()),auditStatement(env.DB,'INITIALIZE_SIGNING_KEY',null,null,{kid})]);}catch(e){const winner=await env.DB.prepare("SELECT kid,public_jwk FROM ratib_signing_keys WHERE status='active'").first();if(!winner)throw e;return {kid:winner.kid,publicKey:JSON.parse(winner.public_jwk)};}
 return {kid,publicKey};
}
async function signer(env){const row=await env.DB.prepare("SELECT * FROM ratib_signing_keys WHERE status='active'").first();if(!row)fail('SIGNING_KEY_NOT_INITIALIZED',503);const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:P.bytes(row.iv),additionalData:TE.encode(row.kid)},await wrapKey(env),P.bytes(row.wrapped_private_jwk));const key=await crypto.subtle.importKey('jwk',JSON.parse(new TextDecoder().decode(raw)),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);return {key,kid:row.kid};}
async function license(env,id){const row=await stmt(env.DB,'SELECT * FROM licenses WHERE id=?',id).first();if(!row)fail('LICENSE_NOT_FOUND',404);return row;}
async function issue(env,l,device,status=null){const m=await meta(env.DB,l.id),now=Date.now(),s=await signer(env);return P.signToken({v:1,aud:'ratib',iss:env.LICENSE_ISSUER,id:l.id,device,kind:l.license_type,binding:l.binding_type,email:l.email||'',emailVerified:!!m.email_verified,maxDevices:l.max_devices,startsAt:parseUTC(l.start_date),expiresAt:parseUTC(l.expiry_date),issuedAt:now,serverAt:now,revision:m.revision,status:status||l.status},s.key,s.kid);}
function validateLicense(b){const binding=b.binding_type||'device',max=Number(b.max_devices??1),email=String(b.email||'').trim().toLowerCase();if(!['device','email','both'].includes(binding))fail('INVALID_BINDING');if(!Number.isInteger(max)||max<1||max>100)fail('INVALID_DEVICE_LIMIT');if((binding!=='device'||email)&&!emailOk(email))fail('INVALID_EMAIL');if(binding!=='device'&&b.email_verified!==true)fail('OWNER_EMAIL_VERIFICATION_REQUIRED');return {binding,max,email};}
async function activateDevice(env,l,request,confirmed){
 if(l.status!=='active')fail('LICENSE_REVOKED',403);if(l.expiry_date&&parseUTC(l.expiry_date)<=Date.now())fail('LICENSE_EXPIRED',403);
 const m=await meta(env.DB,l.id);if(l.binding_type!=='device'&&(request.email!==String(l.email).toLowerCase()||(!m.email_verified&&!confirmed)))fail('EMAIL_MISMATCH_OR_UNVERIFIED',403);
 const now=Date.now();
 // One conditional write serializes competing requests in D1. Legacy active devices consume slots too.
 const reservation=stmt(env.DB,`INSERT INTO ratib_signed_devices(license_id,device_id,public_key,status,first_activated_at,updated_at)
 SELECT ?,?,?,'active',?,? WHERE EXISTS(SELECT 1 FROM licenses WHERE id=? AND status='active' AND (expiry_date IS NULL OR expiry_date>?))
 AND ((SELECT COUNT(*) FROM ratib_signed_devices WHERE license_id=? AND status='active' AND device_id<>?)+(SELECT COUNT(*) FROM license_devices WHERE license_id=? AND status='active')) < (SELECT max_devices FROM licenses WHERE id=?)
 ON CONFLICT(license_id,device_id) DO UPDATE SET status='active',updated_at=excluded.updated_at,public_key=excluded.public_key`,l.id,request.device,JSON.stringify(request.publicKey),now,now,l.id,utc(now),l.id,request.device,l.id,l.id);
 const results=await env.DB.batch([reservation,auditStatement(env.DB,'DEVICE_ACTIVATION_REQUEST',l.id,request.device,{emailVerifiedByOwner:!!confirmed})]);
 if(!changes(results[0]))fail('DEVICE_LIMIT_REACHED',409);
 if(confirmed&&l.binding_type!=='device')await stmt(env.DB,'INSERT INTO ratib_license_meta(license_id,revision,email_verified,updated_at) VALUES(?,1,1,?) ON CONFLICT(license_id) DO UPDATE SET email_verified=1,updated_at=excluded.updated_at',l.id,now).run();
 const latest=await license(env,l.id);const token=await issue(env,latest,request.device);await auditStatement(env.DB,'ISSUE_SIGNED_TOKEN',l.id,request.device).run();return {success:true,token};
}
async function trial(env,req){
 const request=await P.verifyRequest(req.requestCode);const now=Date.now(),id='TRIAL-'+request.device,start=utc(now),end=utc(now+3*86400000);
 await signer(env); // Fail before creating any records when signing is not configured.
 await env.DB.batch([
  stmt(env.DB,"INSERT OR IGNORE INTO licenses(id,license_type,email,binding_type,max_devices,start_date,expiry_date,status) VALUES(?,'trial',NULL,'device',1,?,?,'active')",id,start,end),
  stmt(env.DB,'INSERT OR IGNORE INTO ratib_trial_starts(device_id,license_id,started_at) VALUES(?,?,?)',request.device,id,now)
 ]);
 const l=await license(env,id);if(l.status!=='active'||parseUTC(l.expiry_date)<=now)return {success:true,token:await issue(env,l,request.device)};
 return activateDevice(env,l,request,false);
}
async function sync(env,b){const req=await P.verifyRequest(b.requestCode);if(typeof req.licenseId!=='string')fail('LICENSE_ID_REQUIRED');const l=await license(env,req.licenseId),device=await stmt(env.DB,'SELECT status FROM ratib_signed_devices WHERE license_id=? AND device_id=?',l.id,req.device).first();if(!device)fail('DEVICE_NOT_REGISTERED',403);if(l.binding_type!=='device'&&req.email!==String(l.email).toLowerCase())fail('EMAIL_MISMATCH',403);return {success:true,token:await issue(env,l,req.device,device.status==='revoked'?'revoked':l.status)};}
async function admin(req,env,path){
 if(path==='/api/admin/signing/init'&&req.method==='POST')return {success:true,...await initializeSigner(env)};
 if(path==='/api/admin/signing/public'&&req.method==='GET'){const rows=await env.DB.prepare('SELECT kid,public_jwk,status FROM ratib_signing_keys').all();return {success:true,issuer:env.LICENSE_ISSUER,publicKeys:Object.fromEntries(rows.results.map(r=>[r.kid,JSON.parse(r.public_jwk)]))};}
 if(path==='/api/admin/schema'&&req.method==='GET'){return {success:true,licenses:(await env.DB.prepare('PRAGMA table_info(licenses)').all()).results,license_devices:(await env.DB.prepare('PRAGMA table_info(license_devices)').all()).results};}
 if(path==='/api/admin/audit'&&req.method==='GET')return {success:true,events:(await env.DB.prepare('SELECT * FROM ratib_license_audit ORDER BY created_at DESC LIMIT 500').all()).results};
 if(path==='/api/admin/licenses'&&req.method==='GET'){const rows=await env.DB.prepare("SELECT l.*,(SELECT COUNT(*) FROM license_devices d WHERE d.license_id=l.id AND d.status='active')+(SELECT COUNT(*) FROM ratib_signed_devices s WHERE s.license_id=l.id AND s.status='active') AS active_devices FROM licenses l ORDER BY l.created_at DESC,l.id DESC LIMIT 500").all();return {success:true,licenses:rows.results};}
 if(path==='/api/admin/licenses'&&req.method==='POST'){const b=await body(req),v=validateLicense(b),now=Date.now(),expiry=durations(b.license_type,b.custom_days,now),id='LIC-'+crypto.randomUUID();await env.DB.batch([stmt(env.DB,"INSERT INTO licenses(id,license_type,email,binding_type,max_devices,start_date,expiry_date,status) VALUES(?,?,?,?,?,?,?,'active')",id,b.license_type,v.email||null,v.binding,v.max,utc(now),expiry===null?null:utc(expiry)),stmt(env.DB,'INSERT INTO ratib_license_meta(license_id,revision,email_verified,updated_at) VALUES(?,1,?,?)',id,v.binding==='device'?0:1,now),auditStatement(env.DB,'CREATE_LICENSE',id,null,{kind:b.license_type,binding:v.binding,maxDevices:v.max})]);return {success:true,id};}
 const match=/^\/api\/admin\/licenses\/([A-Za-z0-9_-]{1,100})(?:\/(devices|issue|device))?$/.exec(path);if(!match)fail('NOT_FOUND',404);const id=match[1],l=await license(env,id);
 if(!match[2]&&req.method==='PATCH'){
  const b=await body(req),next={...l};if(b.status!==undefined){if(!['active','revoked'].includes(b.status))fail('INVALID_STATUS');next.status=b.status;}
  if(b.max_devices!==undefined){next.max_devices=Number(b.max_devices);if(!Number.isInteger(next.max_devices)||next.max_devices<1||next.max_devices>100)fail('INVALID_DEVICE_LIMIT');}
  if(b.license_type!==undefined){next.license_type=b.license_type;next.start_date=utc(Date.now());const end=durations(next.license_type,b.custom_days,Date.now());next.expiry_date=end===null?null:utc(end);}
  if(b.extend_days!==undefined){if(l.license_type==='permanent')fail('PERMANENT_NEEDS_NO_RENEWAL');const n=Number(b.extend_days);if(!Number.isInteger(n)||n<1||n>3650)fail('INVALID_DURATION');next.expiry_date=utc(Math.max(Date.now(),parseUTC(l.expiry_date)||0)+n*86400000);}
  const result=await env.DB.batch([stmt(env.DB,`UPDATE licenses SET status=?,max_devices=?,license_type=?,start_date=?,expiry_date=? WHERE id=? AND (SELECT COUNT(*) FROM license_devices WHERE license_id=? AND status='active')+(SELECT COUNT(*) FROM ratib_signed_devices WHERE license_id=? AND status='active')<=?`,next.status,next.max_devices,next.license_type,next.start_date,next.expiry_date,id,id,id,next.max_devices)]);if(!changes(result[0]))fail('LIMIT_BELOW_ACTIVE_DEVICES',409);
  await bump(env.DB,id,[auditStatement(env.DB,'UPDATE_LICENSE',id,null,{status:next.status,maxDevices:next.max_devices,kind:next.license_type,expiry:next.expiry_date})]);return {success:true};
 }
 if(match[2]==='devices'&&req.method==='GET')return {success:true,devices:(await stmt(env.DB,'SELECT device_id,status,first_activated_at,updated_at FROM ratib_signed_devices WHERE license_id=?',id).all()).results,legacyDevices:(await stmt(env.DB,'SELECT * FROM license_devices WHERE license_id=?',id).all()).results};
 if(match[2]==='issue'&&req.method==='POST'){const b=await body(req);await signer(env);return activateDevice(env,l,await P.verifyRequest(b.requestCode),b.email_verified===true);}
 if(match[2]==='device'&&req.method==='PATCH'){
  const b=await body(req);if(typeof b.device_id!=='string'||b.device_id.length>150||!['active','revoked'].includes(b.status))fail('INVALID_DEVICE');
  if(b.legacy){if(b.status!=='revoked')fail('LEGACY_REACTIVATION_REQUIRES_SIGNED_REQUEST');const columns=(await env.DB.prepare('PRAGMA table_info(license_devices)').all()).results;const column=columns.some(x=>x.name==='device_id')?'device_id':columns.some(x=>x.name==='id')?'id':null;if(!column)fail('LEGACY_SCHEMA_REVIEW_REQUIRED',409);const r=await stmt(env.DB,`UPDATE license_devices SET status='revoked' WHERE license_id=? AND ${column}=?`,id,b.device_id).run();if(!changes(r))fail('DEVICE_NOT_FOUND',404);}
  else {if(b.status==='active')fail('REACTIVATION_REQUIRES_SIGNED_REQUEST');const r=await stmt(env.DB,"UPDATE ratib_signed_devices SET status='revoked',updated_at=? WHERE license_id=? AND device_id=?",Date.now(),id,b.device_id).run();if(!changes(r))fail('DEVICE_NOT_FOUND',404);}
  await bump(env.DB,id,[auditStatement(env.DB,'REVOKE_DEVICE',id,b.device_id,{legacy:!!b.legacy})]);return {success:true};
 }
 fail('METHOD_NOT_ALLOWED',405);
}
export default {async fetch(req,env,ctx){
 const u=new URL(req.url),origin=req.headers.get('Origin'),path=u.pathname;
 let allowed=[];try{allowed=JSON.parse(env.ALLOWED_APP_ORIGINS||'[]');}catch{};
 const cors=origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{};
 const respond=(value,status=200)=>Response.json(value,{status,headers:{...baseHeaders,...cors,...(status===429?{'Retry-After':'60'}:{})}});
 try{
  if(req.method==='OPTIONS'){if(!origin||!allowed.includes(origin))return respond({error:'ORIGIN_NOT_ALLOWED'},403);return new Response(null,{status:204,headers:{...baseHeaders,...cors,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});}
  if(path==='/admin'&&req.method==='GET'){const nonce=crypto.randomUUID().replaceAll('-','');return new Response(adminPage.replaceAll('__NONCE__',nonce),{headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`}});}
  if(!env.DB)fail('DATABASE_UNAVAILABLE',503);
  if(path==='/health'&&req.method==='GET'){await env.DB.prepare('SELECT 1 FROM licenses LIMIT 1').first();await env.DB.prepare('SELECT 1 FROM license_devices LIMIT 1').first();await env.DB.prepare('SELECT 1 FROM ratib_license_meta LIMIT 1').first();return respond({success:true,database:'connected',signedLicensing:true});}
  if(path.startsWith('/api/admin/')){await rate(req,env,'admin',30);if(!await authorized(req,env))fail('UNAUTHORIZED',401);if(req.method!=='GET'&&origin&&origin!==u.origin)fail('INVALID_ADMIN_ORIGIN',403);return respond(await admin(req,env,path));}
  if(['/api/trial','/api/sync'].includes(path)&&req.method==='POST'){if(origin&&!allowed.includes(origin))fail('ORIGIN_NOT_ALLOWED',403);await rate(req,env,'public',30);if(!env.LICENSE_ISSUER||!env.LICENSE_ISSUER.startsWith('https://'))fail('ISSUER_NOT_CONFIGURED',503);const b=await body(req);return respond(path==='/api/trial'?await trial(env,b):await sync(env,b));}
  fail('NOT_FOUND',404);
 }catch(e){const known=e instanceof ApiError;const protocol=/^(INVALID_|UNKNOWN_|EMAIL_)/.test(e.message||'');return respond({success:false,error:known||protocol?e.message:'SERVICE_ERROR'},known?e.status:protocol?400:500);}
 finally {if(ctx?.waitUntil&&env.DB)ctx.waitUntil(stmt(env.DB,'DELETE FROM ratib_license_rate_limits WHERE bucket<?',Math.floor(Date.now()/60000)-10).run().catch(()=>{}));}
}};
