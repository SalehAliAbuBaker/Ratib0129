/* Ratib licensing integration – staged, not enabled in production.
 * Configuration must match the existing Cloudflare Worker API before activation.
 * Never store an administrator secret in this public file.
 */
(function (global) {
  'use strict';
  const TRIAL_LIMIT = 50;
  const KEY = 'ratib_license_outage_sandbox_v1';
  const TEST_ONLY_KEY = 'LIC-test-only-20261105-ratib';
  const WHATSAPP = '967734915588';
  const safeRead = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const safeWrite = value => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {} };
  const randomId = () => global.crypto && crypto.randomUUID ? crypto.randomUUID() :
    'rtb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const deviceId = () => { const data=safeRead(); if(data.deviceId)return data.deviceId;data.deviceId=randomId();safeWrite(data);return data.deviceId; };
  function documentIds(transactions) {
    const ids = new Set();
    for (const tx of transactions || []) {
      if (!tx || tx.status === 'deleted' || tx.status === 'reversed' || tx.isOpeningBalance) continue;
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
    if (!endpoint.startsWith('https://ratib-license-outage-sandbox-20261105.saleh0129.workers.dev/api/license/')) throw new Error('حظر الاتصال بأي خدمة تراخيص غير تجريبية');
    if (/^(?:salehaliabubaker\.github\.io|ratibtrial\.pages\.dev)$/i.test(global.location?.hostname||'')) throw new Error('الاختبار محظور على العناوين الرسمية');
    // This request contract MUST be reconciled with the existing Worker before enabling.
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({license_key:code,device_id:deviceId(),email})});
    let result;
    try { result=await response.json(); }
    catch (_) {
      const error=new Error('تعذر قراءة رد خدمة التراخيص.');
      error.transient=true;
      throw error;
    }
    if (!response.ok || result?.valid!==true) {
      const error=new Error(result?.error||result?.message||'تعذر التحقق من الترخيص');
      // A 4xx device/license denial is definitive. A 5xx/408/429 response
      // indicates a temporary service fault and must not revoke local activation.
      error.transient=response.status===408||response.status===429||response.status>=500;
      error.httpStatus=response.status;
      throw error;
    }
    return result;
  }

  // Give the user an actionable, non-secret diagnostic; never echo a license key.
  function licenseCheckMessage(error) {
    if (Number(error?.httpStatus)>=500)
      return 'خدمة التراخيص غير متاحة حاليًا. لا حاجة لتجديد الترخيص، ويمكن إعادة المحاولة عند عودة الخدمة.';
    if (error?.httpStatus===429 || error?.httpStatus===408 || error instanceof TypeError)
      return 'تعذر الاتصال بخدمة التراخيص مؤقتًا. لا يلزم تجديد الترخيص.';
    if (error?.httpStatus===403 || error?.httpStatus===404 || error?.httpStatus===409)
      return String(error.message||'تعذر التحقق من بيانات الترخيص.').slice(0,180);
    return 'تعذر التحقق من خدمة التراخيص. يرجى مراجعة الاتصال والمحاولة مجددًا.';
  }
  // Activation is deliberately tied to the EXISTING Worker, not to the admin secret.
  const API = 'https://ratib-license-outage-sandbox-20261105.saleh0129.workers.dev/api/license/';
  const CHECK_INTERVAL = 60 * 60 * 1000;
  // A previously verified license remains locally valid through its expiry,
  // even after extended periods without connectivity.
  // Count previously saved accounting documents the first time this release is used.
  // Do not reset the counter when transactions are deleted or backups are restored.
  function getUsed(transactions) {
    const state = safeRead();
    const recorded = Math.max(0, Number(state.used) || 0);
    const actual = Array.isArray(transactions) ? documentIds(transactions).size : 0;
    const count = Math.max(recorded, actual);
    if (count !== recorded) { state.used = count; safeWrite(state); }
    return count;
  }
  function recordCreated() {
    const s = safeRead();
    s.used = Math.max(0, Number(s.used) || 0) + 1;
    safeWrite(s);
    return s.used;
  }
  function validExpiry(value) {
    if (!value) return true;
    const n = Date.parse(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z'));
    return Number.isFinite(n) && n > Date.now();
  }
  async function activate(code, email='') {
    code = String(code || '').trim();
    if (code !== TEST_ONLY_KEY) throw new Error('هذه النسخة تقبل مفتاح الاختبار الوهمي فقط.');
    const result = await verifyLicense({ endpoint: API+'activate', code, email });
    const s = safeRead();
    Object.assign(s, { code, email, expiryDate: result.expiry_date || null,
      activatedAt: Date.now(), checkedAt: Date.now(), verifiedAt: Date.now(), lastTransientCheckAt: 0, lastCheckError: '', lastCheckAt: Date.now() });
    safeWrite(s);
    return result;
  }
  async function licensed() {
    const s = safeRead();
    if (!s.code) return false;
    const unexpired=validExpiry(s.expiryDate);
    const priorVerified=Number(s.verifiedAt||0)>0;
    if (unexpired && priorVerified && Date.now()-Number(s.checkedAt||0)>=0 && Date.now()-Number(s.checkedAt||0)<CHECK_INTERVAL) return true;
    // An expired local date can be renewed on the server; retry when online,
    // but never grant access offline using an expired cached entitlement.
    if (global.navigator?.onLine===false) return unexpired && priorVerified;
    try {
      const result = await verifyLicense({endpoint:API+'verify',code:s.code,email:s.email||''});
      Object.assign(s,{verifiedAt:Date.now(),checkedAt:Date.now(),expiryDate:result.expiry_date||null,lastTransientCheckAt:0});
      s.lastCheckError='';s.lastCheckAt=Date.now();
      safeWrite(s);
      return true;
    } catch(err) {
      const transient=err?.transient===true || err instanceof TypeError;
      s.lastCheckError=licenseCheckMessage(err);
      s.lastCheckAt=Date.now();
      // Preserve a previously server-verified, still-unexpired license only
      // for connection/service errors, never for explicit invalid/revoked responses.
      if (transient && priorVerified && unexpired) {
        s.lastTransientCheckAt=Date.now();
        safeWrite(s);
        return true;
      }
      if (!transient) {
        s.verifiedAt=0;s.checkedAt=0;s.lastTransientCheckAt=0;
      }
      // Persist the diagnostic even if an earlier release erased verifiedAt.
      safeWrite(s);
      return false;
    }
  }
  function licenseDate(value) {
    if (!value) return 'غير محدد من خدمة التراخيص';
    const str=String(value),date=new Date(str);
    if (!Number.isFinite(date.getTime())) return str.slice(0,30);
    return str.length===10&&str[4]==='-'&&str[7]==='-'?str:date.toLocaleString('ar',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  async function refreshLicenseStatus(dialog) {
    const title=dialog.querySelector('#ratibLicenseStatusTitle'),details=dialog.querySelector('#ratibLicenseStatusDetails');
    if(!title||!details)return;
    const panel=dialog.querySelector('#ratibLicenseStatusPanel');
    const generation=Number(dialog.dataset.statusGeneration||0)+1;
    dialog.dataset.statusGeneration=String(generation);
    panel.hidden=false;panel.style.display='block';
    const init=safeRead();
    if(!init.code){
      title.textContent='الجهاز غير مفعل حتى الآن';
      details.textContent='يمكنك إدخال كود ترخيص صالح دون انتظار انتهاء العمليات المجانية.';
      return;
    }
    title.textContent='جارٍ التحقق من حالة تفعيل الجهاز...';
    details.textContent='';
    let active=false;
    try{active=await licensed();}catch(_){active=false;}
    if(dialog.style.display==='none'||dialog.dataset.statusGeneration!==String(generation))return;
    const s=safeRead(),expired=!!s.code&&!validExpiry(s.expiryDate);
    const offlineGrace=active&&Number(s.verifiedAt||0)>0&&Date.now()-Number(s.checkedAt||0)>=CHECK_INTERVAL;
    const lines=[
      'معرّف الجهاز: '+deviceId(),
      'كود الترخيص: '+(s.code?'•••• '+String(s.code).slice(-4):'غير مسجل'),
      ...(s.email?['البريد المرتبط: '+s.email]:[]),
      'تاريخ التفعيل: '+(s.activatedAt?licenseDate(new Date(s.activatedAt).toISOString()):'غير مسجل للتراخيص السابقة'),
      'تاريخ الانتهاء: '+licenseDate(s.expiryDate),
      'آخر تحقق ناجح: '+(s.verifiedAt?licenseDate(new Date(s.verifiedAt).toISOString()):'لم يعد محفوظًا على هذا الجهاز')
    ];
    if(s.expiryDate&&Number.isFinite(Date.parse(s.expiryDate))){
      lines.push('المدة المتبقية: '+Math.max(0,Math.ceil((Date.parse(s.expiryDate)-Date.now())/86400000))+' يوم');
    }else if(!s.expiryDate){
      lines.push('لم يحدد الخادم مدة انتهاء؛ وهذا لا يعني أن الترخيص دائم.');
    }
    title.textContent=active?(offlineGrace?'✓ الجهاز مفعل — جارٍ إعادة التحقق عند عودة الخدمة':'✓ الجهاز مفعل — الترخيص سارٍ'):(expired?'انتهت صلاحية ترخيص الجهاز':'تعذر تأكيد تفعيل الجهاز');
    if(!active && s.lastCheckError) lines.push('سبب تعذر التحقق: '+s.lastCheckError);
    if(!active && !s.verifiedAt) lines.push('تاريخ انتهاء الترخيص وحده لا يثبت ارتباطه بهذا الجهاز.');
    details.textContent=lines.join(String.fromCharCode(10));
    panel.style.borderColor=active?'var(--ok,#168653)':'var(--border,#94a3b8)';
  }
  function showActivation(options={}) {
    let dlg = document.getElementById('ratibLicenseDialog');
    if (!dlg) {
      dlg = document.createElement('div');dlg.id='ratibLicenseDialog';
      dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');
      dlg.style.cssText='position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(15,23,42,.8);direction:rtl';
      dlg.innerHTML = '<div style="background:var(--card,#fff);color:var(--text,#111);padding:20px;border-radius:14px;max-width:440px;width:100%;max-height:95vh;overflow:auto;font-family:inherit;text-align:right">'
      +'<h2 style="margin:0 0 12px">🔐 تفعيل تطبيق راتب</h2>'
      +'<p id="ratibLicenseIntro" style="line-height:1.8">اكتملت الخمسون عملية المجانية دون حد زمني. ستبقى بياناتك وتقاريرك متاحة. لإنشاء عملية جديدة أدخل رقم الترخيص.</p>'
      +'<section id="ratibLicenseStatusPanel" aria-live="polite" style="display:none;border:1px solid var(--border,#94a3b8);border-radius:9px;padding:10px 12px;margin:10px 0;background:var(--bg,#fff)"><strong id="ratibLicenseStatusTitle" style="display:block;margin-bottom:5px"></strong><div id="ratibLicenseStatusDetails" style="white-space:pre-line;font-size:.88rem;line-height:1.85;overflow-wrap:anywhere"></div></section>'
      +'<label style="display:block;margin:12px 0 5px">رقم الترخيص</label><input id="ratibLicenseCode" dir="ltr" placeholder="LIC-..." style="width:100%;padding:11px;border:1px solid #aaa;border-radius:8px;background:var(--bg,#fff);color:inherit;font:inherit">'
      +'<label style="display:block;margin:12px 0 5px">الاسم (اختياري)</label><input id="ratibLicenseName" placeholder="الاسم" style="width:100%;padding:11px;border:1px solid #aaa;border-radius:8px;background:var(--bg,#fff);color:inherit;font:inherit">'
      +'<label style="display:block;margin:12px 0 5px">البريد الإلكتروني (اختياري إلا عند ربط الترخيص بالبريد)</label><input id="ratibLicenseEmail" type="email" dir="ltr" placeholder="name@gmail.com" style="width:100%;padding:11px;border:1px solid #aaa;border-radius:8px;background:var(--bg,#fff);color:inherit;font:inherit">'
      +'<p style="font-size:.85rem;margin:10px 0;overflow-wrap:anywhere">معرّف تثبيت التطبيق: <span id="ratibLicenseDevice"></span></p>'
      +'<p id="ratibLicenseFeedback" role="status" style="min-height:22px;color:var(--danger,#b91c1c)"></p>'
      +'<div style="display:flex;flex-wrap:wrap;gap:8px"><button id="ratibLicenseActivate" type="button" style="padding:12px;border:0;border-radius:8px;background:var(--accent,#0284c7);color:#fff;font:inherit">تفعيل الترخيص</button>'
      +'<button id="ratibLicenseWhatsapp" type="button" style="padding:12px;border:0;border-radius:8px;background:#168653;color:#fff;font:inherit">طلب ترخيص عبر واتساب</button>'
      +'<button id="ratibLicenseClose" type="button" style="padding:12px;border:1px solid #aaa;border-radius:8px;background:transparent;color:inherit;font:inherit">إغلاق</button></div></div>';
      document.body.appendChild(dlg);
      const $ = id => dlg.querySelector('#'+id);
      $('ratibLicenseActivate').addEventListener('click',async()=>{
        const btn=$('ratibLicenseActivate'),msg=$('ratibLicenseFeedback');
        if(btn.disabled)return;btn.disabled=true;msg.textContent='جارٍ التحقق من الترخيص...';
        try {
          await activate($('ratibLicenseCode').value,$('ratibLicenseEmail').value.trim());
          msg.style.color='var(--ok,#168653)';msg.textContent='تم التفعيل بنجاح.';
          $('ratibLicenseCode').value='';
          await refreshLicenseStatus(dlg);
          if(dlg.dataset.manual!=='1')setTimeout(()=>{dlg.style.display='none';msg.textContent='';msg.style.color='var(--danger,#b91c1c)'},1000);
        } catch(e) { msg.textContent=licenseCheckMessage(e); } finally {btn.disabled=false;}
      });
      $('ratibLicenseWhatsapp').addEventListener('click',()=>{
        global.open(whatsappUrl($('ratibLicenseName').value,$('ratibLicenseEmail').value),'_blank','noopener,noreferrer');
      });
      $('ratibLicenseClose').addEventListener('click',()=>{dlg.style.display='none';});
    }
    const manual=options?.manual===true;
    dlg.dataset.manual=manual?'1':'0';
    const intro=dlg.querySelector('#ratibLicenseIntro');
    if(intro)intro.textContent=manual
      ?'يمكنك إدخال كود التفعيل الآن دون انتظار انتهاء العمليات المجانية. سيُتحقق من الكود عبر خدمة التراخيص الحالية.'
      :'اكتملت الخمسون عملية المجانية دون حد زمني. ستبقى بياناتك وتقاريرك متاحة. لإنشاء عملية جديدة أدخل رقم الترخيص.';
    const feedback=dlg.querySelector('#ratibLicenseFeedback');
    if(feedback){feedback.textContent='';feedback.style.color='var(--danger,#b91c1c)';}
    dlg.querySelector('#ratibLicenseDevice').textContent=deviceId();
    dlg.style.display='flex';
    void refreshLicenseStatus(dlg);
    dlg.querySelector('#ratibLicenseCode').focus();
  }
  async function beforeCreate(transactions) {
    if (getUsed(transactions) < TRIAL_LIMIT) return true;
    if (await licensed()) return true;
    showActivation();return false;
  }

  // Isolated outage lab: no real account, license or customer data is needed.
  function setupOutageLabPanel(){
    if (!document.body || document.getElementById('ratibOutageLab')) return;
    const wrap=document.createElement('details');
    wrap.id='ratibOutageLab';wrap.open=true;
    wrap.dir='rtl';
    wrap.style.cssText='position:fixed;z-index:2147483640;top:8px;left:8px;max-width:min(390px,calc(100vw - 16px));background:#162536;color:#fff;padding:10px;border:2px solid #f5c542;border-radius:10px;font:14px/1.7 Tajawal,Arial,sans-serif;box-shadow:0 5px 22px #0005';
    wrap.innerHTML='<summary style="cursor:pointer;font-weight:700">🧪 راتب — بيئة فحص التراخيص 503 (بيانات وهمية فقط)</summary>'+
      '<p style="margin:8px 0">هذه ليست النسخة الرسمية. لا تُدخل أي بيانات أو تراخيص حقيقية ولا تستخدم النسخ السحابية.</p>'+
      '<div style="display:flex;gap:5px;flex-wrap:wrap">'+
      '<button type="button" id="ratibSandboxActivate">1. تفعيل المفتاح الوهمي</button>'+
      '<button type="button" id="ratibSandboxForce">2. إبطال وقت آخر فحص فقط</button>'+
      '<button type="button" id="ratibSandboxVerify">3. تحقق من الخادم الآن</button></div>'+
      '<div id="ratibSandboxReport" role="status" aria-live="polite" style="margin-top:8px;white-space:pre-wrap"></div>';
    document.body.append(wrap);
    const out=wrap.querySelector('#ratibSandboxReport');
    const forbidden=/^(?:salehaliabubaker\.github\.io|ratibtrial\.pages\.dev)$/i.test(global.location?.hostname||'');
    const report=msg=>{out.textContent=msg;};
    if(forbidden){wrap.querySelectorAll('button').forEach(b=>b.disabled=true);report('توقف آمن: لا يجوز تشغيل معمل التراخيص على النطاق الرسمي أو نطاق التجريب القائم.');return;}
    wrap.querySelectorAll('button').forEach(b=>{b.style.cssText='background:#fff;color:#122436;border:0;padding:6px;border-radius:6px;font:inherit;cursor:pointer';});
    const stateText=()=>{
      const s=safeRead();
      return 'إثبات تفعيل سابق: '+(Number(s.verifiedAt||0)>0?'نعم':'لا')+
        ' | عدد السندات المحتسب: '+Number(s.used||0)+
        (s.lastCheckError?' | آخر خطأ: '+s.lastCheckError:'');
    };
    report('خادم الاختبار وحده متصل. '+stateText());
    wrap.querySelector('#ratibSandboxActivate').addEventListener('click',async()=>{
      try{
        await activate(TEST_ONLY_KEY,'');
        const s=safeRead();s.used=Math.max(50,Number(s.used)||0);safeWrite(s);
        report('نجح تفعيل ترخيص وهمي مع حد 50 سندًا لضمان تشغيل فحص الترخيص عند الحفظ. '+stateText());
      }catch(e){report('فشل تفعيل المعمل: '+String(e.message||e));}
    });
    wrap.querySelector('#ratibSandboxForce').addEventListener('click',()=>{
      const s=safeRead();
      if(!Number(s.verifiedAt||0)){report('فعّل المفتاح الوهمي أولًا.');return;}
      s.checkedAt=0;s.lastTransientCheckAt=0;safeWrite(s);
      report('جاهز: سيُجبر الحفظ القادم على طلب التحقق من Worker. '+stateText());
    });
    wrap.querySelector('#ratibSandboxVerify').addEventListener('click',async()=>{
      const s=safeRead();
      if(!Number(s.verifiedAt||0)){report('فعّل المفتاح الوهمي أولًا.');return;}
      s.checkedAt=0;safeWrite(s);
      try{
        const ok=await licensed(),state=safeRead();
        report('نتيجة التحقق: '+(ok?'مسموح رغم حالة الخادم':'غير مسموح')+
          ' | خطأ خدمة: '+(state.lastCheckError||'لا يوجد')+' | '+stateText());
      }catch(e){report('فشل الاتصال: '+String(e.message||e));}
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupOutageLabPanel);
  else setupOutageLabPanel();

  global.RatibLicense = Object.freeze({
    TRIAL_LIMIT,deviceId,requestText,whatsappUrl,recordCreated,used:getUsed,
    remaining:()=>Math.max(0,TRIAL_LIMIT-getUsed()),activate,licensed,beforeCreate,showActivation
  });
})(window);
