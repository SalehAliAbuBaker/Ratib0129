// Ratib licensing administration – Cloudflare Worker (D1 binding: DB)
// This release manages license records and validates online device-bound license activations.
const baseHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY'
};
const json = (data, status = 200) => Response.json(data, { status, headers: baseHeaders });
const appIconBase64 = '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';

async function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || !env.ADMIN_API_KEY) return false;
  const candidate = header.slice(7);
  if (!candidate) return false;
  const hash = async x => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)));
  const [a, b] = await Promise.all([hash(env.ADMIN_API_KEY), hash(candidate)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
function utcDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
function startEnd(kind, days) {
  const now = new Date();
  if (kind === 'permanent') return [utcDate(now), null];
  const end = new Date(now);
  if (kind === 'annual') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCDate(end.getUTCDate() + (kind === 'trial' ? 3 : days));
  return [utcDate(now), utcDate(end)];
}
async function getBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('JSON_REQUIRED');
  const raw = await request.text();
  if (raw.length > 8000) throw new Error('TOO_LARGE');
  return JSON.parse(raw);
}
function errorMessage(err) {
  if (err.message === 'JSON_REQUIRED') return json({ error: 'أرسل بيانات JSON.' }, 415);
  if (err.message === 'TOO_LARGE') return json({ error: 'حجم الطلب كبير.' }, 413);
  if (err instanceof SyntaxError) return json({ error: 'بيانات الطلب غير صحيحة.' }, 400);
  console.error('Admin operation failed', err);
  return json({ error: 'تعذر تنفيذ العملية. تحقق من إعدادات قاعدة البيانات.' }, 500);
}
function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
// Add nullable owner metadata to existing licenses without resetting D1 data.
async function ensureLicenseOwnerColumn(env) {
  const result = await env.DB.prepare('PRAGMA table_info(licenses)').all();
  if ((result.results || []).some(c => c.name === 'owner_name')) return;
  try {
    await env.DB.prepare('ALTER TABLE licenses ADD COLUMN owner_name TEXT').run();
  } catch (error) {
    const latest = await env.DB.prepare('PRAGMA table_info(licenses)').all();
    if (!(latest.results || []).some(c => c.name === 'owner_name')) throw error;
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/app-icon.png') {
      const bytes = Uint8Array.from(atob(appIconBase64), ch => ch.charCodeAt(0));
      return new Response(bytes, { headers: { ...baseHeaders, 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800' } });
    }
    if (path === '/manifest.webmanifest') {
      return json({ name: 'إدارة تراخيص راتب', short_name: 'تراخيص راتب', start_url: '/admin', scope: '/', display: 'standalone', background_color: '#f3f7f5', theme_color: '#146042', icons: [{ src: '/app-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' }] });
    }
    if (path === '/health') {
      try {
        if (!env.DB) throw new Error('D1 binding missing');
        await env.DB.prepare('SELECT 1 FROM licenses LIMIT 1').first();
        await env.DB.prepare('SELECT 1 FROM license_devices LIMIT 1').first();
        return json({ success: true, database: 'connected', tables: 'accessible' });
      } catch (err) {
        console.error('Health check failed', err);
        return json({ success: false, database: 'connection_error' }, 500);
      }
    }
    if (path === '/admin') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const nonce = crypto.randomUUID().replaceAll('-', '');
      return new Response(adminPage.replaceAll('__NONCE__', nonce), {
        headers: {
          ...baseHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; img-src 'self'; manifest-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"
        }
      });
    }
    // Public license verification, isolated from the administrator API.
    if (path === '/api/license/activate' || path === '/api/license/verify') {
      const origin = request.headers.get('Origin');
      // Restrict browser activation to the official app and the trial app.
      // Cloudflare Pages uses its own origin, even when both apps share this Worker.
      const permittedOrigins = new Set([
        'https://salehaliabubaker.github.io',
        'https://ratibtrial.pages.dev'
      ]);
      const permitted = permittedOrigins.has(origin);
      const cors = {
        ...baseHeaders,
        ...(permitted ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {})
      };
      const reply = (data, status = 200) => Response.json(data, { status, headers: cors });
      if (request.method === 'OPTIONS') {
        if (!permitted) return new Response(null, { status: 403, headers: baseHeaders });
        return new Response(null, { status: 204, headers: { ...cors,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '3600'
        } });
      }
      if (request.method !== 'POST') return reply({ valid: false, error: 'Method not allowed' }, 405);
      if (origin && !permitted) return reply({ valid: false, error: 'Origin not allowed' }, 403);
      if (!env.DB) return reply({ valid: false, error: 'Database unavailable' }, 503);
      try {
        const body = await getBody(request);
        const license = String(body.license_key || '').trim();
        const device = String(body.device_id || '').trim();
        const email = String(body.email || '').trim();
        if (!/^(?:LIC|TRIAL)-[0-9a-z-]{10,100}$/i.test(license) || !/^[a-zA-Z0-9_-]{8,120}$/.test(device)) {
          return reply({ valid: false, error: 'صيغة الترخيص أو معرّف التثبيت غير صحيحة.' }, 400);
        }
        if (email && !validEmail(email)) return reply({ valid: false, error: 'البريد الإلكتروني غير صحيح.' }, 400);
        const row = await env.DB.prepare('SELECT * FROM licenses WHERE id=? LIMIT 1').bind(license).first();
        if (!row) return reply({ valid: false, error: 'رقم الترخيص غير موجود.' }, 404);
        if (row.status !== 'active') return reply({ valid: false, error: 'تم إيقاف الترخيص.' }, 403);
        const expiry = row.expiry_date ? Date.parse(String(row.expiry_date).replace(' ', 'T')+'Z') : null;
        const start = row.start_date ? Date.parse(String(row.start_date).replace(' ', 'T')+'Z') : null;
        if (row.start_date && (!Number.isFinite(start) || start > Date.now())) {
          return reply({ valid: false, error: 'لم تبدأ صلاحية الترخيص بعد.' }, 403);
        }
        if (row.expiry_date && (!Number.isFinite(expiry) || expiry <= Date.now())) {
          return reply({ valid: false, error: 'انتهت صلاحية الترخيص.' }, 403);
        }
        if (row.binding_type !== 'device' && (!email || String(row.email || '').toLowerCase() !== email.toLowerCase())) {
          return reply({ valid: false, error: 'البريد الإلكتروني لا يطابق الترخيص.' }, 403);
        }
        const existing = await env.DB.prepare('SELECT status FROM license_devices WHERE license_id=? AND device_id=?').bind(license, device).first();
        if (existing && existing.status !== 'active') return reply({ valid: false, error: 'تم إيقاف هذا الجهاز.' }, 403);
        if (!existing) {
          if (path !== '/api/license/activate') return reply({ valid: false, error: 'لم يُفعّل الترخيص على هذا الجهاز.' }, 403);
          const result = await env.DB.prepare(`INSERT INTO license_devices
            (id,license_id,device_id,device_name,activated_at,last_seen_at,status)
            SELECT ?,?,?,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'active'
            WHERE (SELECT COUNT(*) FROM license_devices WHERE license_id=? AND status='active') < ?`)
            .bind('DEV-'+crypto.randomUUID(),license,device,license,Number(row.max_devices)).run();
          if (!result.meta?.changes) return reply({ valid: false, error: 'اكتمل عدد الأجهزة المسموح بها.' }, 409);
        } else {
          await env.DB.prepare('UPDATE license_devices SET last_seen_at=CURRENT_TIMESTAMP WHERE license_id=? AND device_id=? AND status=\'active\'')
            .bind(license,device).run();
        }
        return reply({ valid: true, license_type: row.license_type, expiry_date: row.expiry_date || null });
      } catch (err) {
        const bad = err.message === 'JSON_REQUIRED' ? 415 : err.message === 'TOO_LARGE' ? 413 : err instanceof SyntaxError ? 400 : 500;
        if (bad === 500) console.error('License validation failure', err);
        return reply({ valid: false, error: bad === 500 ? 'تعذر فحص الترخيص.' : 'بيانات الطلب غير صحيحة.' }, bad);
      }
    }
    if (!path.startsWith('/api/admin/')) return new Response('Not Found', { status: 404, headers: baseHeaders });
    if (!env.DB) return json({ error: 'Database unavailable' }, 503);
    if (!(await authorized(request, env))) return json({ error: 'Unauthorized' }, 401);
    if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) {
      return json({ error: 'Invalid request origin' }, 403);
    }
    try {
      if (path.startsWith('/api/admin/licenses')) await ensureLicenseOwnerColumn(env);
      if (path === '/api/admin/licenses' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT l.*, (SELECT COUNT(*) FROM license_devices d WHERE d.license_id = l.id AND d.status = 'active') AS active_devices
          FROM licenses l ORDER BY l.created_at DESC, l.id DESC LIMIT 500
        `).all();
        return json({ success: true, licenses: result.results || [] });
      }
      if (path === '/api/admin/licenses' && request.method === 'POST') {
        const body = await getBody(request);
        const ownerName = typeof body.owner_name === 'string' ? body.owner_name.trim() : '';
        if (body.owner_name !== undefined && (!ownerName || ownerName.length > 120)) return json({ error: 'اسم صاحب الترخيص مطلوب وبحد أقصى 120 حرفًا.' }, 400);
        const type = body.license_type;
        if (!['trial', 'annual', 'permanent', 'custom'].includes(type)) return json({ error: 'نوع الترخيص غير صحيح.' }, 400);
        const binding = body.binding_type;
        if (!['device', 'email', 'both'].includes(binding)) return json({ error: 'نوع الربط غير صحيح.' }, 400);
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if ((binding !== 'device' && !validEmail(email)) || (email && !validEmail(email))) return json({ error: 'تحقق من البريد الإلكتروني.' }, 400);
        const max = Number(body.max_devices);
        if (!Number.isInteger(max) || max < 1 || max > 100) return json({ error: 'عدد الأجهزة يجب أن يكون من 1 إلى 100.' }, 400);
        const days = Number(body.custom_days);
        if (type === 'custom' && (!Number.isInteger(days) || days < 1 || days > 3650)) return json({ error: 'المدة المخصصة من 1 إلى 3650 يومًا.' }, 400);
        const [start, expiry] = startEnd(type, days);
        const id = 'LIC-' + crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO licenses
          (id,owner_name,license_type,email,binding_type,max_devices,start_date,expiry_date,status)
          VALUES (?,?,?,?,?,?,?,?,'active')`).bind(id, ownerName || null, type, email || null, binding, max, start, expiry).run();
        return json({ success: true, id }, 201);
      }
      const match = /^\/api\/admin\/licenses\/([A-Za-z0-9-]{1,100})$/.exec(path);
      if (match && request.method === 'PATCH') {
        const id = match[1];
        const body = await getBody(request);
        const existing = await env.DB.prepare('SELECT id,status,max_devices,owner_name FROM licenses WHERE id=?').bind(id).first();
        if (!existing) return json({ error: 'الترخيص غير موجود.' }, 404);
        const status = body.status === undefined ? existing.status : body.status;
        if (!['active', 'revoked'].includes(status)) return json({ error: 'الحالة غير صحيحة.' }, 400);
        const max = body.max_devices === undefined ? existing.max_devices : Number(body.max_devices);
        if (!Number.isInteger(max) || max < 1 || max > 100) return json({ error: 'عدد الأجهزة غير صحيح.' }, 400);
        const ownerName = body.owner_name === undefined ? existing.owner_name : (typeof body.owner_name === 'string' ? body.owner_name.trim() : '');
        if (body.owner_name !== undefined && (!ownerName || ownerName.length > 120)) return json({ error: 'اسم صاحب الترخيص مطلوب وبحد أقصى 120 حرفًا.' }, 400);
        const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM license_devices WHERE license_id=? AND status='active'").bind(id).first();
        if (status === 'active' && max < Number(count?.n || 0)) return json({ error: 'عدد الأجهزة أقل من عدد الأجهزة المفعّلة.' }, 409);
        if (body.extend_days !== undefined) {
          const extra = Number(body.extend_days);
          if (!Number.isInteger(extra) || extra < 1 || extra > 3650) return json({ error: 'مدة التمديد غير صحيحة.' }, 400);
          const original = await env.DB.prepare('SELECT license_type,expiry_date FROM licenses WHERE id=?').bind(id).first();
          if (original.license_type === 'permanent') return json({ error: 'الترخيص الدائم لا يحتاج إلى تجديد.' }, 400);
          const now = new Date();
          const previous = original.expiry_date ? new Date(original.expiry_date.replace(' ', 'T') + 'Z') : now;
          const from = previous > now ? previous : now;
          from.setUTCDate(from.getUTCDate() + extra);
          await env.DB.prepare('UPDATE licenses SET status=?, max_devices=?, expiry_date=?, owner_name=? WHERE id=?').bind(status, max, utcDate(from), ownerName, id).run();
        } else {
          await env.DB.prepare('UPDATE licenses SET status=?,max_devices=?,owner_name=? WHERE id=?').bind(status, max, ownerName, id).run();
        }
        return json({ success: true });
      }
      return json({ error: 'Method not allowed / Not found' }, 404);
    } catch (err) {
      return errorMessage(err);
    }
  }
};

const adminPage = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>راتب | إدارة التراخيص</title><meta name="theme-color" content="#146042"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="تراخيص راتب"><link rel="icon" type="image/png" sizes="192x192" href="/app-icon.png"><link rel="apple-touch-icon" href="/app-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<style nonce="__NONCE__">
*{box-sizing:border-box}body{margin:0;padding:20px;background:#f3f7f5;color:#193a2c;font:15px Tahoma,Arial,sans-serif}main{max-width:1150px;margin:auto}section{background:#fff;padding:22px;border-radius:12px;margin:18px 0;box-shadow:0 2px 12px #0000000a}h1{margin:12px 0;color:#146042}h2{font-size:19px}label{display:block;margin:8px 0 5px;font-weight:bold}input,select{width:100%;padding:11px;border:1px solid #bdcdc4;border-radius:7px;font:inherit}button{cursor:pointer;background:#146042;color:white;border:0;border-radius:7px;padding:11px 17px;font:inherit;margin:5px 0}button:disabled{opacity:.5;cursor:wait}.sub{background:#e8f2ec;color:#164532}#message{min-height:25px;white-space:pre-wrap}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e0e8e3;text-align:right;padding:10px;white-space:nowrap}th{background:#eaf2ee}td.id{min-width:220px;white-space:normal;overflow-wrap:anywhere;word-break:break-word}.license-value{display:block;direction:ltr;text-align:left;user-select:text;-webkit-user-select:text;font:13px ui-monospace,Consolas,monospace;overflow-wrap:anywhere;word-break:break-all;padding:8px;background:#f5faf7;border-radius:7px}.copy-license{padding:7px 12px;min-height:38px;margin-top:7px}.actions-cell{min-width:180px}.brand-head{display:flex;align-items:center;gap:14px;margin:12px 0}.brand-head img{width:68px;height:68px;object-fit:contain;border-radius:16px;flex:none}.brand-head h1{margin:0}small{color:#586c62}button.danger{background:#9b3030}button.renew{background:#366b88}
@media(max-width:720px){body{padding:10px;font-size:15px}main{min-width:0}section{padding:14px;margin:12px 0}h1{font-size:23px}.tablewrap{overflow:visible}table,tbody,tr,td{display:block;width:100%;max-width:100%;min-width:0}thead{display:none!important}tbody>tr{margin:0 0 15px;padding:9px;border:1px solid #d9e8df;border-radius:11px;background:#fff}td{white-space:normal;overflow-wrap:anywhere;padding:9px 6px}td::before{content:attr(data-label);display:block;font-weight:bold;color:#396650;margin-bottom:5px}td.id{min-width:0;max-width:100%}.license-value{max-width:100%}td.actions-cell{min-width:0}td.actions-cell button{min-height:42px;margin:4px 4px 4px 0}}
</style></head><body><main><div class="brand-head"><img src="/app-icon.png" width="68" height="68" alt="أيقونة تراخيص راتب"><h1>إدارة تراخيص راتب</h1></div><p>لوحة خاصة بالمالك. التراخيص هنا سجلات إدارية، ولم يُفعّل بعد إصدار رموز العمل دون إنترنت.</p>
<section><label for="adminKey">مفتاح الإدارة السري</label><input type="password" id="adminKey" autocomplete="off" placeholder="أدخل المفتاح السري"><button id="load" type="button">عرض التراخيص</button><button id="logout" class="sub" type="button">مسح المفتاح</button><p id="message" role="status"></p></section>
<section><h2>إصدار ترخيص جديد</h2><div class="row"><div><label for="kind">نوع الترخيص</label><select id="kind"><option value="trial">تجريبي – 3 أيام</option><option value="annual">سنوي</option><option value="permanent">دائم</option><option value="custom">مدة مخصصة</option></select></div><div id="customBox" hidden><label for="days">عدد الأيام</label><input id="days" type="number" min="1" max="3650" value="30"></div><div><label for="binding">طريقة الربط</label><select id="binding"><option value="device">جهاز فقط – بدون بريد</option><option value="both">بريد وجهاز</option><option value="email">بريد إلكتروني</option></select></div><div><label for="owner">اسم صاحب الترخيص</label><input id="owner" type="text" maxlength="120" autocomplete="name" required placeholder="اسم الشخص أو الجهة"></div><div><label for="email">البريد (اختياري للجهاز)</label><input id="email" type="email" maxlength="254"></div><div><label for="max">الحد الأقصى للأجهزة</label><input id="max" type="number" min="1" max="100" value="1"></div></div><button id="create" type="button">إنشاء الترخيص</button><small>لا تُنشأ تراخيص عند فتح الصفحة؛ يجب الضغط على زر الإنشاء وتأكيد العملية.</small></section>
<section><h2>التراخيص المسجلة</h2><div id="result" class="tablewrap">أدخل المفتاح واضغط «عرض التراخيص».</div></section>
</main><script nonce="__NONCE__">
const el=id=>document.getElementById(id), msg=t=>el('message').textContent=t;
let apiKey='';
el('kind').addEventListener('change',()=>{el('customBox').hidden=el('kind').value!=='custom'});
el('logout').addEventListener('click',()=>{apiKey='';el('adminKey').value='';el('result').textContent='تم مسح المفتاح من الجلسة.';msg('');});
function key(){if(el('adminKey').value)apiKey=el('adminKey').value;return apiKey}
async function api(path,method='GET',body){
 if(!key())throw new Error('أدخل مفتاح الإدارة أولًا.');
 const options={method,headers:{Authorization:'Bearer '+apiKey},cache:'no-store'};
 if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 const response=await fetch(path,options);const data=await response.json();
 if(!response.ok)throw new Error(response.status===401?'المفتاح السري غير صحيح.':(data.error||'تعذر تنفيذ الطلب'));
 return data;
}
const types={trial:'تجريبي',annual:'سنوي',permanent:'دائم',custom:'مخصص'},status={active:'نشط',revoked:'موقوف',expired:'منتهٍ'};
async function copyLicense(value){
 try{
  if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
  else {
   const input=document.createElement('textarea');input.value=value;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();input.setSelectionRange(0,value.length);
   const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Copy unavailable');
  }
  msg('تم نسخ رقم الترخيص كاملًا.');
 }catch(e){window.prompt('انسخ رقم الترخيص كاملًا:',value)}
}
function effectiveStatus(l){if(l.status==='revoked')return 'revoked';if(l.expiry_date&&Date.parse(l.expiry_date.replace(' ','T')+'Z')<=Date.now())return 'expired';return l.status}
async function refresh(){
 const data=await api('/api/admin/licenses');const items=data.licenses;const result=el('result');result.replaceChildren();
 if(!items.length){result.textContent='الاتصال ناجح، لكن لا توجد تراخيص.';msg('تم الاتصال.');return}
 const table=document.createElement('table'),tableHead=document.createElement('thead'),head=document.createElement('tr'),tableBody=document.createElement('tbody');
 const labels=['رقم الترخيص','اسم صاحب الترخيص','النوع','البريد','طريقة الربط','الأجهزة','البداية (UTC)','النهاية (UTC)','الحالة','الإجراءات'];
 for(const name of labels){const cell=document.createElement('th');cell.textContent=name;head.append(cell)}
 tableHead.append(head);table.append(tableHead,tableBody);
 for(const l of items){
  const row=document.createElement('tr');
  const fields=[l.id,l.owner_name||'—',types[l.license_type]||l.license_type,l.email||'—',l.binding_type,(l.active_devices||0)+' / '+l.max_devices,l.start_date||'—',l.expiry_date||'دائم',status[effectiveStatus(l)]||l.status];
  for(let i=0;i<fields.length;i++){
   const td=document.createElement('td');td.dataset.label=labels[i];
   if(i===0){
    td.className='id';
    const value=document.createElement('span');value.className='license-value';value.textContent=l.id;
    const copy=document.createElement('button');copy.type='button';copy.className='sub copy-license';copy.textContent='نسخ الرقم كاملًا';copy.addEventListener('click',()=>copyLicense(l.id));
    td.append(value,copy);
   }else td.textContent=fields[i];
   row.append(td);
  }
  const actions=document.createElement('td');actions.className='actions-cell';actions.dataset.label=labels[labels.length-1];
  const toggle=document.createElement('button');toggle.type='button';toggle.className=l.status==='revoked'?'renew':'danger';toggle.textContent=l.status==='revoked'?'إعادة التنشيط':'إيقاف';
  toggle.addEventListener('click',async()=>{const next=l.status==='revoked'?'active':'revoked';if(!confirm('تأكيد تغيير حالة الترخيص؟'))return;await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{status:next});await refresh()})});
  const change=document.createElement('button');change.type='button';change.className='sub';change.textContent='تعديل الأجهزة';
  change.addEventListener('click',async()=>{const amount=prompt('العدد الأقصى للأجهزة (1 إلى 100)',String(l.max_devices));if(amount===null)return;const n=Number(amount);if(!Number.isInteger(n)||n<1||n>100){msg('أدخل عددًا صحيحًا من 1 إلى 100.');return}await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{max_devices:n});await refresh()})});
  const editOwner=document.createElement('button');editOwner.type='button';editOwner.className='sub';editOwner.textContent='تعديل الاسم';
  editOwner.addEventListener('click',async()=>{const next=prompt('اسم صاحب الترخيص',l.owner_name||'');if(next===null)return;const name=next.trim();if(!name||name.length>120){msg('أدخل اسمًا صحيحًا بحد أقصى 120 حرفًا.');return}await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{owner_name:name});await refresh()})});
  actions.append(toggle,document.createTextNode(' '),change,document.createTextNode(' '),editOwner);
  if(l.license_type!=='permanent'){
    const extend=document.createElement('button');extend.type='button';extend.className='renew';extend.textContent='تمديد';
    extend.addEventListener('click',async()=>{const amount=prompt('عدد أيام تمديد الترخيص', '365');if(amount===null)return;const n=Number(amount);if(!Number.isInteger(n)||n<1||n>3650){msg('أدخل عدد أيام صحيحًا.');return}if(!confirm('تأكيد تمديد تاريخ الانتهاء؟'))return;await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{extend_days:n});await refresh()})});
    actions.append(document.createTextNode(' '),extend);
  }
  row.append(actions);tableBody.append(row);
 }
 result.append(table);msg('تم تحميل '+items.length+' ترخيص.');
}
async function run(fn){for(const id of ['load','create'])el(id).disabled=true;try{await fn()}catch(err){msg(err.message)}finally{for(const id of ['load','create'])el(id).disabled=false}}
el('load').addEventListener('click',()=>run(refresh));
el('create').addEventListener('click',()=>run(async()=>{
 const owner=el('owner').value.trim();if(!owner){msg('أدخل اسم صاحب الترخيص قبل الإنشاء.');el('owner').focus();return}
 const body={owner_name:owner,license_type:el('kind').value,binding_type:el('binding').value,email:el('email').value.trim(),max_devices:Number(el('max').value),custom_days:Number(el('days').value)};
 if(!confirm('هل تريد إنشاء هذا الترخيص الآن؟'))return;
 const data=await api('/api/admin/licenses','POST',body);
 await refresh();msg('تم إنشاء الترخيص بنجاح: '+data.id);
}));
</script></body></html>`;