/* Local synthetic preview only. No production connection or user financial data. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import worker from '../cloudflare/src/worker.mjs';
import {TestD1} from './d1-test-adapter.mjs';
const port=Number(process.env.PORT||8797),origin='http://127.0.0.1:'+port,root=fileURLToPath(new URL('../',import.meta.url));
const env={DB:new TestD1(),ADMIN_API_KEY:crypto.randomUUID()+crypto.randomUUID(),SIGNING_KEY_ENCRYPTION_KEY:crypto.randomUUID()+crypto.randomUUID(),LICENSE_ISSUER:'https://ratib-license-local-test.invalid',ALLOWED_APP_ORIGINS:JSON.stringify([origin])};
const adminCall=async p=>worker.fetch(new Request('https://local.test'+p,{method:p.endsWith('/init')?'POST':'GET',headers:{Authorization:'Bearer '+env.ADMIN_API_KEY,'Content-Type':'application/json'},...(p.endsWith('/init')?{body:'{}'}:{})}),env);
await adminCall('/api/admin/signing/init');const publicKeys=(await (await adminCall('/api/admin/signing/public')).json()).publicKeys;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,origin);if(u.pathname.startsWith('/api/')||u.pathname==='/admin'){
  if(u.pathname.startsWith('/api/admin/')){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'LOCAL_PREVIEW_ADMIN_DISABLED'}));return;}
  const chunks=[];for await(const b of req)chunks.push(b);const reply=await worker.fetch(new Request('https://local.test'+u.pathname,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env);
  res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));return;
 }
 if(u.pathname==='/licensing/config.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end('window.RATIB_LICENSE_CONFIG='+JSON.stringify({endpoint:origin,issuer:env.LICENSE_ISSUER,publicKeys,clockToleranceMs:300000,syncIntervalMs:900000})+';');return;}
 const target=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(404);res.end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log('Synthetic license preview:',origin));
