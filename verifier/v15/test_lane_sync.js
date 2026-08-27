/* v15 — publish.js lane-sync: bare upload_* refs with no in-memory dataURL must
   be copied draft lane -> published lane on Publish (never on Save draft).
   Run: node verifier/v15/test_lane_sync.js                                   */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'authoring-tool', 'publish.js'), 'utf8');

let failures = 0;
function check(id, cond, detail) {
  if (cond) { console.log('PASS ' + id + (detail ? ' — ' + detail : '')); }
  else { failures++; console.log('FAIL ' + id + (detail ? ' — ' + detail : '')); }
}

/* ---- stubs --------------------------------------------------------------- */
const uploads = [];   // {bucket, key, size, contentType}
const fetchCalls = [];

const tinyPngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

global.SUPABASE_CONFIG = { url: 'https://stub.supabase.co', anonKey: 'stub-key', bucket: 'playbook-content' };
global.SUPABASE = { auth: {
  getSession: () => Promise.resolve({ data: { session: { access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 't@e.st' } } } }),
  refreshSession: () => Promise.resolve({ data: { session: null } })
} };
global.supabase = {
  createClient: () => ({
    storage: {
      from: (bucket) => ({
        upload: (key, blob, opts) => {
          uploads.push({ bucket, key, size: blob.size, contentType: opts && opts.contentType });
          return Promise.resolve({ error: null });
        },
        remove: () => Promise.resolve({ error: null })
      })
    }
  })
};
global.__scormExportHelpers = {
  // Mimic export.js externalizeAssets for: assets {} + one dataURL asset.
  externalizeAssets: (pb) => {
    const clone = JSON.parse(JSON.stringify(pb));
    const extraFiles = {};
    Object.keys(clone.assets || {}).forEach((k) => {
      const v = clone.assets[k];
      if (typeof v === 'string' && v.indexOf('data:') === 0) {
        const b64 = v.split(',')[1];
        extraFiles[k + (k.endsWith('.png') ? '' : '.png')] = { base64: b64 };
      }
    });
    clone.assets = {};
    return { playbook: clone, extraFiles };
  }
};
global.fetch = (url) => {
  fetchCalls.push(String(url));
  const u = String(url);
  if (u.indexOf('/drafts/test-playbook/assets/upload_ok.jpg') >= 0 ||
      u.indexOf('/drafts/test-playbook/assets/upload_ok2.mp4') >= 0) {
    return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob(['x'.repeat(128)])) });
  }
  if (u.indexOf('/drafts/test-playbook/assets/upload_missing.png') >= 0) {
    return Promise.resolve({ ok: false, status: 404, blob: () => Promise.resolve(new Blob([''])) });
  }
  // index.json, version probes etc.
  return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), blob: () => Promise.resolve(new Blob([''])) });
};

/* ---- load publish.js into this context ----------------------------------- */
global.window = global;
eval(SRC);
const PP = global.PlaybookPublish;
if (!PP) { console.log('FAIL L0 — PlaybookPublish not exported'); process.exit(1); }

const pb = {
  meta: { title: 'Test Playbook', slug: 'test-playbook' },
  assets: { 'img/upload_covered': 'data:image/png;base64,' + tinyPngB64 },
  prose: {
    'cover.bg': 'upload_ok.jpg',
    'intro.video': 'upload_ok2.mp4',
    'ch1.opener.bg': 'upload_missing.png',
    'ch2.opener.bg': 'upload_covered.png' // bare ref to the dataURL asset -> covered, no lane-sync
  },
  chapters: []
};

(async () => {
  /* ---- Publish lane ------------------------------------------------------ */
  uploads.length = 0; fetchCalls.length = 0;
  const res = await PP.publish(pb, { session: { access_token: 'tok', user: { email: 't@e.st' } } });

  const pubKeys = uploads.map(u => u.key);
  check('L1', pubKeys.includes('published/test-playbook/assets/upload_ok.jpg'),
    'draft-lane image copied to published lane');
  check('L2', pubKeys.includes('published/test-playbook/assets/upload_ok2.mp4'),
    'draft-lane video copied to published lane');
  check('L3', (res.failedAssets || []).some(f => f.path === 'upload_missing.png' && /not found in the draft lane/.test(f.reason)),
    'missing asset reported, not silently dropped');
  check('L4', pubKeys.includes('published/test-playbook/playbook-data.json') &&
            pubKeys.includes('published/test-playbook/version.json'),
    'data + version still uploaded');
  check('L5', fetchCalls.some(u => u.indexOf('/drafts/test-playbook/assets/upload_ok.jpg') >= 0) &&
            fetchCalls.some(u => u.indexOf('/drafts/test-playbook/assets/upload_ok2.mp4') >= 0),
    'draft lane fetched as copy source');
  check('L6', !fetchCalls.some(u => u.indexOf('/drafts/test-playbook/assets/upload_covered') >= 0) &&
            uploads.some(u => u.key === 'published/test-playbook/assets/upload_covered.png'),
    'in-memory dataURL asset uploaded directly, never lane-synced');
  check('L7', !pubKeys.includes('published/test-playbook/assets/upload_missing.png'),
    'missing asset never fake-uploaded');

  /* ---- Draft lane: no lane-sync ------------------------------------------ */
  uploads.length = 0; fetchCalls.length = 0;
  await PP.saveDraft(pb, { session: { access_token: 'tok', user: { email: 't@e.st' } } });
  check('L8', !fetchCalls.some(u => u.indexOf('/drafts/test-playbook/assets/upload_') >= 0),
    'draft save never lane-syncs (nothing to copy from)');
  check('L9', uploads.some(u => u.key === 'drafts/test-playbook/assets/upload_covered.png'),
    'draft save still uploads in-memory assets');

  console.log(failures ? ('\n' + failures + ' FAILURES') : '\nALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.log('FAIL LX — ' + (e && e.message)); process.exit(1); });
