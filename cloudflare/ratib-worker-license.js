// Ratib licensing administration – Cloudflare Worker (D1 binding: DB)
// This release manages license records and validates online device-bound license activations.
const baseHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY'
};
const json = (data, status = 200) => Response.json(data, { status, headers: baseHeaders });

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
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
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
          'Content-Security-Policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"
        }
      });
    }
    // Public license verification, isolated from the administrator API.
    if (path === '/api/license/activate' || path === '/api/license/verify') {
      const origin = request.headers.get('Origin');
      const permitted = origin === 'https://salehaliabubaker.github.io';
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
        if (!/^LIC-[0-9a-f-]{30,50}$/i.test(license) || !/^[a-zA-Z0-9_-]{8,120}$/.test(device)) {
          return reply({ valid: false, error: 'صيغة الترخيص أو معرّف التثبيت غير صحيحة.' }, 400);
        }
        if (email && !validEmail(email)) return reply({ valid: false, error: 'البريد الإلكتروني غير صحيح.' }, 400);
        const row = await env.DB.prepare('SELECT * FROM licenses WHERE id=? LIMIT 1').bind(license).first();
        if (!row) return reply({ valid: false, error: 'رقم الترخيص غير موجود.' }, 404);
        if (row.status !== 'active') return reply({ valid: false, error: 'تم إيقاف الترخيص.' }, 403);
        const expiry = row.expiry_date ? Date.parse(String(row.expiry_date).replace(' ', 'T')+'Z') : null;
        if (row.expiry_date && (!Number.isFinite(expiry) || expiry <= Date.now())) {
          return reply({ valid: false, error: 'انتهت صلاحية الترخيص.' }, 403);
        }
        if (row.binding_type !== 'device' && (!email || String(row.email || '').toLowerCase() !== email.toLowerCase())) {
          return reply({ valid: false, error: 'البريد الإلكتروني لا يطابق الترخيص.' }, 403);
        }
        const existing = await env.DB.prepare('SELECT status FROM license_devices WHERE license_id=? AND device_id=?').bind(license, device).first();
        if (existing?.status === 'revoked') return reply({ valid: false, error: 'تم إيقاف هذا الجهاز.' }, 403);
        if (!existing) {
          if (path !== '/api/license/activate') return reply({ valid: false, error: 'لم يُفعّل الترخيص على هذا الجهاز.' }, 403);
          const result = await env.DB.prepare(`INSERT INTO license_devices
            (id,license_id,device_id,device_name,status,last_seen_at)
            SELECT ?,?,?,NULL,'active',CURRENT_TIMESTAMP
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
      if (path === '/api/admin/licenses' && request.method === 'GET') {
        const result = await env.DB.prepare(`
          SELECT l.*, (SELECT COUNT(*) FROM license_devices d WHERE d.license_id = l.id AND d.status = 'active') AS active_devices
          FROM licenses l ORDER BY l.created_at DESC, l.id DESC LIMIT 500
        `).all();
        return json({ success: true, licenses: result.results || [] });
      }
      if (path === '/api/admin/licenses' && request.method === 'POST') {
        const body = await getBody(request);
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
          (id,license_type,email,binding_type,max_devices,start_date,expiry_date,status)
          VALUES (?,?,?,?,?,?,?,'active')`).bind(id, type, email || null, binding, max, start, expiry).run();
        return json({ success: true, id }, 201);
      }
      const match = /^\/api\/admin\/licenses\/([A-Za-z0-9-]{1,100})$/.exec(path);
      if (match && request.method === 'PATCH') {
        const id = match[1];
        const body = await getBody(request);
        const existing = await env.DB.prepare('SELECT id,status,max_devices FROM licenses WHERE id=?').bind(id).first();
        if (!existing) return json({ error: 'الترخيص غير موجود.' }, 404);
        const status = body.status === undefined ? existing.status : body.status;
        if (!['active', 'revoked'].includes(status)) return json({ error: 'الحالة غير صحيحة.' }, 400);
        const max = body.max_devices === undefined ? existing.max_devices : Number(body.max_devices);
        if (!Number.isInteger(max) || max < 1 || max > 100) return json({ error: 'عدد الأجهزة غير صحيح.' }, 400);
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
          await env.DB.prepare('UPDATE licenses SET status=?, max_devices=?, expiry_date=? WHERE id=?').bind(status, max, utcDate(from), id).run();
        } else {
          await env.DB.prepare('UPDATE licenses SET status=?,max_devices=? WHERE id=?').bind(status, max, id).run();
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
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>راتب | إدارة التراخيص</title>
<style nonce="__NONCE__">
*{box-sizing:border-box}body{margin:0;padding:20px;background:#f3f7f5;color:#193a2c;font:15px Tahoma,Arial,sans-serif}main{max-width:1150px;margin:auto}section{background:#fff;padding:22px;border-radius:12px;margin:18px 0;box-shadow:0 2px 12px #0000000a}h1{margin:12px 0;color:#146042}h2{font-size:19px}label{display:block;margin:8px 0 5px;font-weight:bold}input,select{width:100%;padding:11px;border:1px solid #bdcdc4;border-radius:7px;font:inherit}button{cursor:pointer;background:#146042;color:white;border:0;border-radius:7px;padding:11px 17px;font:inherit;margin:5px 0}button:disabled{opacity:.5;cursor:wait}.sub{background:#e8f2ec;color:#164532}#message{min-height:25px;white-space:pre-wrap}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e0e8e3;text-align:right;padding:10px;white-space:nowrap}th{background:#eaf2ee}td.id{max-width:180px;overflow:hidden;text-overflow:ellipsis}small{color:#586c62}button.danger{background:#9b3030}button.renew{background:#366b88}
</style></head><body><main><h1>إدارة تراخيص راتب</h1><p>لوحة خاصة بالمالك. التراخيص هنا سجلات إدارية، ولم يُفعّل بعد إصدار رموز العمل دون إنترنت.</p>
<section><label for="adminKey">مفتاح الإدارة السري</label><input type="password" id="adminKey" autocomplete="off" placeholder="أدخل المفتاح السري"><button id="load" type="button">عرض التراخيص</button><button id="logout" class="sub" type="button">مسح المفتاح</button><p id="message" role="status"></p></section>
<section><h2>إصدار ترخيص جديد</h2><div class="row"><div><label for="kind">نوع الترخيص</label><select id="kind"><option value="trial">تجريبي – 3 أيام</option><option value="annual">سنوي</option><option value="permanent">دائم</option><option value="custom">مدة مخصصة</option></select></div><div id="customBox" hidden><label for="days">عدد الأيام</label><input id="days" type="number" min="1" max="3650" value="30"></div><div><label for="binding">طريقة الربط</label><select id="binding"><option value="device">جهاز فقط – بدون بريد</option><option value="both">بريد وجهاز</option><option value="email">بريد إلكتروني</option></select></div><div><label for="email">البريد (اختياري للجهاز)</label><input id="email" type="email" maxlength="254"></div><div><label for="max">الحد الأقصى للأجهزة</label><input id="max" type="number" min="1" max="100" value="1"></div></div><button id="create" type="button">إنشاء الترخيص</button><small>لا تُنشأ تراخيص عند فتح الصفحة؛ يجب الضغط على زر الإنشاء وتأكيد العملية.</small></section>
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
function effectiveStatus(l){if(l.status==='revoked')return 'revoked';if(l.expiry_date&&Date.parse(l.expiry_date.replace(' ','T')+'Z')<=Date.now())return 'expired';return l.status}
async function refresh(){
 const data=await api('/api/admin/licenses');const items=data.licenses;const result=el('result');result.replaceChildren();
 if(!items.length){result.textContent='الاتصال ناجح، لكن لا توجد تراخيص.';msg('تم الاتصال.');return}
 const table=document.createElement('table'),head=document.createElement('tr');
 for(const name of ['رقم الترخيص','النوع','البريد','طريقة الربط','الأجهزة','البداية (UTC)','النهاية (UTC)','الحالة','الإجراءات']){const cell=document.createElement('th');cell.textContent=name;head.append(cell)}
 table.append(head);
 for(const l of items){
  const row=document.createElement('tr');
  const fields=[l.id,types[l.license_type]||l.license_type,l.email||'—',l.binding_type,(l.active_devices||0)+' / '+l.max_devices,l.start_date||'—',l.expiry_date||'دائم',status[effectiveStatus(l)]||l.status];
  for(let i=0;i<fields.length;i++){const td=document.createElement('td');td.textContent=fields[i];if(i===0){td.className='id';td.title=l.id}row.append(td)}
  const actions=document.createElement('td');
  const toggle=document.createElement('button');toggle.type='button';toggle.className=l.status==='revoked'?'renew':'danger';toggle.textContent=l.status==='revoked'?'إعادة التنشيط':'إيقاف';
  toggle.addEventListener('click',async()=>{const next=l.status==='revoked'?'active':'revoked';if(!confirm('تأكيد تغيير حالة الترخيص؟'))return;await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{status:next});await refresh()})});
  const change=document.createElement('button');change.type='button';change.className='sub';change.textContent='تعديل الأجهزة';
  change.addEventListener('click',async()=>{const amount=prompt('العدد الأقصى للأجهزة (1 إلى 100)',String(l.max_devices));if(amount===null)return;const n=Number(amount);if(!Number.isInteger(n)||n<1||n>100){msg('أدخل عددًا صحيحًا من 1 إلى 100.');return}await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{max_devices:n});await refresh()})});
  actions.append(toggle,document.createTextNode(' '),change);
  if(l.license_type!=='permanent'){
    const extend=document.createElement('button');extend.type='button';extend.className='renew';extend.textContent='تمديد';
    extend.addEventListener('click',async()=>{const amount=prompt('عدد أيام تمديد الترخيص', '365');if(amount===null)return;const n=Number(amount);if(!Number.isInteger(n)||n<1||n>3650){msg('أدخل عدد أيام صحيحًا.');return}if(!confirm('تأكيد تمديد تاريخ الانتهاء؟'))return;await run(async()=>{await api('/api/admin/licenses/'+encodeURIComponent(l.id),'PATCH',{extend_days:n});await refresh()})});
    actions.append(document.createTextNode(' '),extend);
  }
  row.append(actions);table.append(row);
 }
 result.append(table);msg('تم تحميل '+items.length+' ترخيص.');
}
async function run(fn){for(const id of ['load','create'])el(id).disabled=true;try{await fn()}catch(err){msg(err.message)}finally{for(const id of ['load','create'])el(id).disabled=false}}
el('load').addEventListener('click',()=>run(refresh));
el('create').addEventListener('click',()=>run(async()=>{
 const body={license_type:el('kind').value,binding_type:el('binding').value,email:el('email').value.trim(),max_devices:Number(el('max').value),custom_days:Number(el('days').value)};
 if(!confirm('هل تريد إنشاء هذا الترخيص الآن؟'))return;
 const data=await api('/api/admin/licenses','POST',body);
 await refresh();msg('تم إنشاء الترخيص بنجاح: '+data.id);
}));
</script></body></html>`;