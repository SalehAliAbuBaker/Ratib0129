// Ratib D1 outage sandbox — NEVER deploy as the production license Worker.
// Accepts ONLY the synthetic key below; never connects to an existing database.
const TEST_KEY = 'LIC-test-only-20261105-ratib';
const DAY = 86400000;
const HEADERS = {
  'Access-Control-Allow-Origin': '*', // Synthetic credentials only; no personal data.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const reply = (payload, status=200) => Response.json(payload, {status, headers:HEADERS});

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:HEADERS});
    if (pathname === '/health') {
      if (!env.DB) return reply({sandbox:true, database:'missing'},503);
      try {
        await env.DB.prepare('SELECT 1 AS ok').first();
        return reply({sandbox:true, database:'connected'});
      } catch (_) { return reply({sandbox:true, database:'unavailable'},503); }
    }
    if (pathname !== '/api/license/activate' && pathname !== '/api/license/verify')
      return reply({sandbox:true, error:'Not found'},404);
    if (request.method !== 'POST') return reply({valid:false,error:'Method not allowed'},405);
    let input;
    try { input = await request.json(); } catch (_) { return reply({valid:false,error:'JSON required'},400); }
    const key=String(input?.license_key||'');
    const deviceId=String(input?.device_id||'');
    if (key !== TEST_KEY || !/^[a-zA-Z0-9_-]{8,120}$/.test(deviceId))
      return reply({valid:false,error:'Only synthetic sandbox license/device allowed'},403);
    // OUTAGE_MODE is an isolated configuration setting, never an admin endpoint.
    const outage=String(env.OUTAGE_MODE||'none');
    if (pathname === '/api/license/verify' && ['429','500','503'].includes(outage))
      return reply({valid:false,error:'Simulated D1/Worker outage (sandbox only)'},Number(outage));
    if (!env.DB) return reply({valid:false,error:'Sandbox D1 unavailable'},503);
    try {
      const lookup=() => env.DB.prepare(
        'SELECT expires_at FROM sandbox_activations WHERE license_key=? AND device_id=?'
      ).bind(key,deviceId).first();
      let record=await lookup();
      if (pathname.endsWith('/activate') && !record) {
        const expiry=new Date(Date.now()+30*DAY).toISOString();
        await env.DB.prepare(
          'INSERT OR IGNORE INTO sandbox_activations(license_key,device_id,expires_at) VALUES(?,?,?)'
        ).bind(key,deviceId,expiry).run();
        record=await lookup();
      }
      if (!record) return reply({valid:false,error:'Sandbox device not activated'},403);
      if (!Number.isFinite(Date.parse(record.expires_at)) || Date.parse(record.expires_at)<=Date.now())
        return reply({valid:false,error:'Sandbox license expired'},403);
      return reply({valid:true,expiry_date:record.expires_at,sandbox:true});
    } catch (_) { return reply({valid:false,error:'Sandbox database failure'},503); }
  }
};
