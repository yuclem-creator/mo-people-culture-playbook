/* ============================================================================
   versions.js — Supabase version-history snapshots for MO Playbook Studio
   ----------------------------------------------------------------------------
   Additive companion to publish.js. It does NOT change the Remote SCORM latest
   publish path. It writes version metadata + a playbook JSON snapshot to the
   public.playbook_versions table created in Supabase.

   Storage model:
     - table row: public.playbook_versions (metadata + data jsonb snapshot)
     - published files: Storage bucket playbook-content under published/<slug>/
       (latest path remains stable; immutable asset snapshots can be added later
       without changing this table's contract)

   All functions accept opts.session so writes can carry the exact access token
   from the sign-in flow even when the browser blocks Supabase session storage
   inside an embedded preview/iframe.
   ============================================================================ */
(function (global) {
  'use strict';

  var sb = global.SUPABASE || null;
  var cfg = global.SUPABASE_CONFIG || {};
  var TABLE = 'playbook_versions';

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function clientFor(session) {
    if (session && session.access_token && global.supabase && typeof global.supabase.createClient === 'function') {
      return global.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: 'Bearer ' + session.access_token } }
      });
    }
    return sb;
  }

  function unavailable() {
    return new Error('Supabase client is not available (check your connection and reload).');
  }

  function friendlyTableError(e) {
    var msg = (e && e.message) || String(e || 'Unknown error');
    if (/relation .*playbook_versions.* does not exist|42P01/i.test(msg) || /Could not find the table/i.test(msg)) {
      return new Error('The Supabase table public.playbook_versions is missing. Run the Version History Table SQL first.');
    }
    if (/row-level security|Unauthorized|JWT|expired/i.test(msg)) {
      return new Error('Your sign-in session expired or cannot write version history. Please sign out and sign in again.');
    }
    return e instanceof Error ? e : new Error(msg);
  }

  function assetManifest(pb) {
    var assets = (pb && pb.assets) || {};
    return Object.keys(assets).map(function (key) {
      var value = assets[key];
      var embedded = typeof value === 'string' && value.indexOf('data:') === 0;
      var bytes = 0;
      if (typeof value === 'string') {
        if (embedded) {
          var comma = value.indexOf(',');
          bytes = Math.max(0, Math.round((value.length - comma - 1) * 3 / 4));
        } else {
          bytes = value.length;
        }
      }
      return { path: key, embedded: embedded, bytes: bytes };
    });
  }

  function slugFor(pb) {
    if (global.PlaybookPublish && typeof global.PlaybookPublish.slugFor === 'function') {
      return global.PlaybookPublish.slugFor(pb);
    }
    return (pb && pb.meta && pb.meta.slug) || 'playbook';
  }

  function saveSnapshot(pb, opts) {
    opts = opts || {};
    var db = clientFor(opts.session);
    if (!db) return Promise.reject(unavailable());
    var id = opts.id || uuid();
    var slug = opts.slug || slugFor(pb);
    var row = {
      id: id,
      slug: slug,
      title: (pb && pb.meta && pb.meta.title) || slug,
      department: (pb && pb.meta && pb.meta.department) || null,
      data: pb,
      asset_manifest: opts.assetManifest || assetManifest(pb),
      storage_prefix: opts.storagePrefix || ('local-json/' + slug + '/' + id + '/'),
      published_by: opts.publishedBy || (opts.session && opts.session.user && opts.session.user.email) || null,
      note: opts.note || null,
      source: opts.source || 'manual-save'
    };
    return db.from(TABLE).insert(row).then(function (r) {
      if (!r.error) return row;
      // Graceful degradation: if the table predates the department column
      // (PostgREST PGRST204), retry once without it so the version still saves.
      var msg = (r.error && r.error.message) || '';
      if (row.department != null && /department/i.test(msg) && /column|schema cache/i.test(msg)) {
        var rowNoDept = {};
        Object.keys(row).forEach(function (k) { if (k !== 'department') rowNoDept[k] = row[k]; });
        return db.from(TABLE).insert(rowNoDept).then(function (r2) {
          if (r2.error) throw friendlyTableError(r2.error);
          return row;
        });
      }
      throw friendlyTableError(r.error);
    }).catch(function (e) { throw friendlyTableError(e); });
  }

  function listVersions(slug, opts) {
    opts = opts || {};
    var db = clientFor(opts.session);
    if (!db) return Promise.reject(unavailable());
    return db.from(TABLE)
      .select('id,slug,title,department,published_by,published_at,note,source,storage_prefix')
      .eq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(100)
      .then(function (r) {
        if (r.error) throw friendlyTableError(r.error);
        return r.data || [];
      }).catch(function (e) { throw friendlyTableError(e); });
  }

  function listAllVersions(opts) {
    opts = opts || {};
    var db = clientFor(opts.session);
    if (!db) return Promise.reject(unavailable());
    return db.from(TABLE)
      .select('id,slug,title,department,published_by,published_at,note,source,storage_prefix')
      .order('published_at', { ascending: false })
      .limit(500)
      .then(function (r) {
        if (r.error) throw friendlyTableError(r.error);
        return r.data || [];
      }).catch(function (e) { throw friendlyTableError(e); });
  }

  function getVersion(id, opts) {
    opts = opts || {};
    var db = clientFor(opts.session);
    if (!db) return Promise.reject(unavailable());
    return db.from(TABLE).select('*').eq('id', id).single().then(function (r) {
      if (r.error) throw friendlyTableError(r.error);
      return r.data;
    }).catch(function (e) { throw friendlyTableError(e); });
  }

  global.PlaybookVersions = {
    saveSnapshot: saveSnapshot,
    listVersions: listVersions,
    listAllVersions: listAllVersions,
    getVersion: getVersion,
    assetManifest: assetManifest
  };
})(window);
