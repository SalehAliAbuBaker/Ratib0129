/* Ratib licensing integration – staged, not enabled in production.
 * Configuration must match the existing Cloudflare Worker API before activation.
 * Never store an administrator secret in this public file.
 */
(function (global) {
  'use strict';
  const TRIAL_LIMIT = 20;
  const KEY = 'ratib_license_client_v1';
  const WHATSAPP = '967734915588';
  const safeRead = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const safeWrite = value => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {} };
  const randomId = () => global.crypto && crypto.randomUUID ? crypto.randomUUID() :
    'rtb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const deviceId = () => { const data=safeRead(); if(data.deviceId)return data.deviceId;data.deviceId=randomId();safeWrite(data);return data.deviceId; };
  function documentIds(transactions) {
    const ids = new Set();
    for (const tx of transactions || []) {
      if (!tx || tx.status === 'deleted' || tx.status === 'reversed' || tx.isOpeningBalance || tx.importBatchId) continue;
      const id = tx.multiVoucherId || tx.id;
      if (id != null) ids.add(String(id));
    }
    return ids;
  }
  function requestText(name='',email='') {
    return ['السلام عليكم، أرغب في الحصول على ترخيص لتطبيق راتب للتنظيم والتدبير المالي.',
      'معرف الجهاز: '+deviceId(),name?'الاسم: '+name:'',email?'البريد الإلكتروني: '+email:''].filter(Boolean).join('\n');
  }
  function whatsappUrl(name='',email='') {
    return 'https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(requestText(name,email));
  }
  async function verifyLicense({endpoint,code,email=''}) {
    if (!endpoint || !/^https:\/\//i.test(endpoint)) throw new Error('عنوان التحقق من الترخيص غير مضبوط');
    // This request contract MUST be reconciled with the existing Worker before enabling.
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({license_key:code,device_id:deviceId(),email})});
    if (!response.ok) throw new Error('تعذر التحقق من الترخيص');
    const result=await response.json();
    if(result.valid!==true)throw new Error(result.message||'الترخيص غير صالح');
    return result;
  }
  global.RatibLicenseDraft=Object.freeze({
    TRIAL_LIMIT,deviceId,documentIds,
    usedCount: txs => documentIds(txs).size,
    canCreate: txs => documentIds(txs).size < TRIAL_LIMIT,
    requestText,whatsappUrl,verifyLicense
  });
})(window);
