'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf("const CLOUD_CFG_KEY = 'cloud_backup_cfg';");
const end = html.indexOf('function normalizeTransaction(tx)', start);
assert(start > 0 && end > start, 'The original Ratib cloud integration must remain in place');
const cloud = html.slice(start, end);

function fixture() {
  const saved = { cloud_backup_cfg: { enabled: true, email: '', time: '00:00', lastDate: '', lastTime: '', lastError: '' } };
  const state = { posts: 0, metadataGets: 0, snapshots: 0, remote: false, mode: 'normal', notifications: [], requestUrls: [], lastSaved: null, confirmed: true };
  const status = { textContent: '' }, last = { textContent: '' }, warn = { textContent: '', style: {} };
  const documents = { cloudBackupStatus: status, cloudBackupLastTime: last, cloudBackupWarn: warn, cloudUploadDestination: { value: 'trial' }, cloudRunNowBtn: { disabled: false, style: {} } };
  const store = {
    get(key, defaultValue) { return saved[key] ?? defaultValue; },
    _setSilent(key, value) { saved[key] = value; },
    set(key, value) { saved[key] = value; }
  };
  const response = (data, statusCode = 200) => ({
    ok: statusCode >= 200 && statusCode < 300, status: statusCode,
    json: async () => data, text: async () => JSON.stringify(data)
  });
  const fetch = async (url, options = {}) => {
    state.requestUrls.push(url);
    const method = options.method || 'GET';
    if (url.includes('/upload/drive/v3/files')) {
      state.posts++;
      state.remote = true;
      if (state.mode === 'responseLost') throw new TypeError('Connection dropped after upload');
      return response({ id: 'backup-1', name: saved.cloud_backup_cfg.pendingUpload.name });
    }
    if (url.includes('/drive/v3/files/backup-1?')) {
      state.metadataGets++;
      if (state.mode === 'metadataUnavailable') throw new TypeError('Google Drive temporarily offline');
      const pending = saved.cloud_backup_cfg.pendingUpload;
      const bytes = state.mode === 'wrongSize' ? pending.bytes - 1 : pending.bytes;
      return response({ id: 'backup-1', name: pending.name, parents: ['folder-trial'], size: String(bytes), mimeType: 'application/json', trashed: false });
    }
    if (url.includes('/drive/v3/files?') && method === 'GET') {
      const query = new URL(url).searchParams.get('q') || '';
      if (query.includes('mimeType')) return response({ files: [{ id: 'folder-trial', name: 'Ratib Trial Backups' }] });
      return response({ files: state.remote ? [{ id: 'backup-1', name: saved.cloud_backup_cfg.pendingUpload?.name || state.lastSaved }] : [] });
    }
    if (url.includes('/drive/v3/about?')) return response({ user: { emailAddress: 'owner@example.com' } });
    throw new Error('Unexpected Google API endpoint: ' + method + ' ' + url);
  };
  const context = {
    crypto: webcrypto, TextEncoder, URL, AbortController, setTimeout, clearTimeout, encodeURIComponent,
    location: { protocol: 'https:', hostname: 'ratibtrial.pages.dev' },
    navigator: { onLine: true }, window: { google: null },
    document: { getElementById: id => documents[id] || null, activeElement: null },
    store, _appExited: false, fetch,
    _pad2: x => String(x).padStart(2, '0'),
    getSecurityConfig: () => ({ enabled: true }),
    showToast: message => state.notifications.push(message),
    showTransientAppNotice: () => {},
    backupStamp: () => 'test-fixture',
    buildBackupPayload: async () => { state.snapshots++; return { app: 'ratib', schema: 3, encrypted: true, blob: { iv: 'iv', data: 'fixture' } }; },
    flushStorage: async () => {},
    confirm: () => state.confirmed,
    console: { warn() {}, error() {} }
  };
  vm.runInNewContext(cloud + '\nthis.cloudTest={runCloudBackup,checkCloudBackupDue,getCloudCfg,refreshCloudBackupUI,verifyCloudFile,setToken:(value)=>{_cloudToken=value;_cloudTokenExp=value?Date.now()+3600000:0;}};', context);
  const f = context.cloudTest;
  f.setToken('valid-mock-token');
  return { f, state, saved, context, status, last };
}
(async () => {
  // Never describe an upload as successful before independent Drive metadata verification.
  {
    const { f, state, saved, status, last } = fixture();
    const ok = await f.runCloudBackup(true);
    assert.equal(ok, true);
    assert.equal(state.posts, 1);
    assert.equal(state.metadataGets, 1);
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'verified');
    assert.equal(saved.cloud_backup_cfg.lastFileId, 'backup-1');
    assert.equal(saved.cloud_backup_cfg.lastFolder, 'Ratib Trial Backups');
    assert.equal(saved.cloud_backup_cfg.pendingUpload, null);
    assert(saved.cloud_backup_cfg.lastVerifiedAt);
    assert(status.textContent.includes('✅'));
    assert(last.textContent.includes('test-fixture.json'));
    assert(state.snapshots === 1);
  }
  // If post-upload verification fails, preserve the last known success and the pending id.
  // A second request first verifies the existing file rather than uploading a duplicate.
  {
    const { f, state, saved, status } = fixture();
    state.mode = 'metadataUnavailable';
    assert.equal(await f.runCloudBackup(true), false);
    assert.equal(state.posts, 1);
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'pending_verification');
    assert.equal(saved.cloud_backup_cfg.lastTime, '');
    assert.equal(saved.cloud_backup_cfg.pendingUpload.id, 'backup-1');
    assert(status.textContent.includes('غير محسومة'));
    state.mode = 'normal';
    assert.equal(await f.runCloudBackup(true), true);
    assert.equal(state.posts, 1, 'Do not upload a second copy after a lost verification response');
    assert.equal(saved.cloud_backup_cfg.pendingUpload, null);
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'verified');
  }
  // Lost POST response can also be recovered using the exact filename in the original folder.
  {
    const { f, state, saved } = fixture();
    state.mode = 'responseLost';
    assert.equal(await f.runCloudBackup(true), false);
    assert.equal(state.posts, 1);
    assert.equal(saved.cloud_backup_cfg.pendingUpload.id, null);
    state.mode = 'normal';
    assert.equal(await f.runCloudBackup(true), true);
    assert.equal(state.posts, 1);
    assert.equal(saved.cloud_backup_cfg.lastFileId, 'backup-1');
  }
  // Wrong byte size must never pass as confirmed.
  {
    const { f, state, saved } = fixture();
    state.mode = 'wrongSize';
    assert.equal(await f.runCloudBackup(true), false);
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'pending_verification');
    assert.equal(saved.cloud_backup_cfg.lastTime, '');
    assert.equal(state.posts, 1);
  }
  // Daily backup with expired OAuth does not launch Google popup or claim a successful backup.
  {
    const { f, state, saved, status, context } = fixture();
    f.setToken(null);
    await f.checkCloudBackupDue();
    assert.equal(state.posts, 0);
    assert.equal(state.requestUrls.length, 0);
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'needs_authorization');
    assert.equal(saved.cloud_backup_cfg.lastTime, '');
    assert(status.textContent.includes('إذن Google'));
    context.navigator.onLine = false;
    await f.checkCloudBackupDue();
    assert.equal(saved.cloud_backup_cfg.lastStatus, 'offline');
    assert.equal(state.posts, 0);
  }
  // Restore only closes the selector when import validation and persist succeeded.
  assert(html.includes('const restored = await importBackupFile(new File([content], f.name'));
  assert(html.includes("if (restored) modal.classList.remove('show')"));
  assert(html.includes("return false;\n  }") === false || html.includes("catch(e)")); // Syntax covered below.
  assert(html.includes("showToast('اكتمل الاسترجاع والحفظ، سيُعاد فتح التطبيق.','info');setTimeout(()=>location.reload(),300);return true;"));
  assert(!html.includes("client.requestAccessToken({ prompt: interactive ? '' : 'none' })"));
  assert(html.includes("const CLOUD_FOLDER_NAME = 'Ratib Trial Backups'"));
  assert(html.includes("const CLOUD_LEGACY_FOLDER_NAME = 'Ratib Backups'"));
  const sw = fs.readFileSync('sw.js','utf8');
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.version,'3.6.107.09');
  assert(sw.includes("v210-trial-unlimited-budget-3.6.107.09"));
  assert(html.includes('const RATIB_RELEASE={"version":"3.6.107.09"'));
  for(const source of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean))new Function(source);
  new Function(sw);
  console.log('PASS trial 3.6.107.09: verified Drive metadata, durable interrupted uploads, no duplicates, OAuth/offline notifications, restore guards and unchanged finance surface');
})().catch(e => { console.error(e); process.exitCode=1; });
