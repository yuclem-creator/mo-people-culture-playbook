/* ============================================================================
   publish.js — Supabase login gate + Publish/Draft flows for MO Playbook Studio
   ----------------------------------------------------------------------------
   Two lanes over one shared upload pipeline:

     Publish (live)  -> published/<slug>/...   The Remote SCORM shell and the
                        Library's live entries read from here. This is the
                        only lane the LMS ever sees.

     Save (draft)    -> drafts/<slug>/...      Work-in-progress. Listed in the
                        Library with a "Draft" badge and openable in the web
                        player (?stage=draft), but never touches the LMS.

   A tiny public index (published/index.json) is maintained on every write so
   the Library hub can list playbooks automatically, with a status flag:
   'published' | 'draft'. A draft never downgrades an already-published entry.

   Public surface (attached to window.PlaybookPublish):
     slugify(title)              -> url-safe kebab-case slug
     slugFor(pb)                 -> pb.meta.slug if set, else slugify(title)
     getSession()                -> Promise<Supabase session|null>
     signIn(email, password)     -> Promise (throws with .message on failure)
     signOut()                   -> Promise
     onAuthChange(fn)            -> subscribe to sign-in/out (fn(session))
     publish(pb, {onProgress})   -> Promise<{slug, contentUrl, assetCount}>
     saveDraft(pb, {onProgress}) -> Promise<{slug, contentUrl, assetCount}>
   ============================================================================ */
(function (global) {
  'use strict';

  var sb = global.SUPABASE || null;
  var cfg = global.SUPABASE_CONFIG || {};

  // ---- slug helpers (shared with export-remote.js) ------------------------
  function slugify(s) {
    return String(s || 'playbook')
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'playbook';
  }
  function slugFor(pb) {
    var explicit = pb && pb.meta && pb.meta.slug;
    if (explicit && String(explicit).trim()) return slugify(explicit);
    return slugify(pb && pb.meta && pb.meta.title);
  }

  // ---- auth -----------------------------------------------------------------
  function getSession() {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) { return (r.data && r.data.session) || null; });
  }

  function signIn(email, password) {
    if (!sb) return Promise.reject(new Error('Supabase client is not available (check your connection and reload).'));
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Sign-in failed.');
      return r.data.session;
    });
  }

  function signOut() {
    if (!sb) return Promise.resolve();
    return sb.auth.signOut();
  }

  function onAuthChange(fn) {
    if (!sb) return;
    sb.auth.onAuthStateChange(function (_event, session) { fn(session); });
  }

  // Resolve a usable authenticated session. In embedded/iframe contexts the
  // Supabase client often cannot persist its session to browser storage, so
  // we PREFER a session object passed in directly (opts.session) and only
  // fall back to the persisted one.
  function resolveSession(opts) {
    opts = opts || {};
    if (opts.session && opts.session.access_token) return Promise.resolve(opts.session);
    return getSession().then(function (session) {
      if (!session) return null;
      var now = Math.floor(Date.now() / 1000);
      var exp = session.expires_at || 0;
      if (exp - now < 300) {
        return sb.auth.refreshSession().then(function (r) {
          return (r.error || !r.data || !r.data.session) ? null : r.data.session;
        }).catch(function () { return null; });
      }
      return session;
    });
  }

  function uploadClientFor(session) {
    return (global.supabase && global.supabase.createClient)
      ? global.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: 'Bearer ' + session.access_token } }
        })
      : sb;
  }

  /* ---- shared upload pipeline ---------------------------------------------
     Uploads playbook-data.json + decoded assets + version.json to
     <bucket>/<basePath> (e.g. published/<slug>/ or drafts/<slug>/).
  -------------------------------------------------------------------------- */
  function uploadPackage(pb, basePath, session, onProgress) {
    onProgress = onProgress || function () {};
    var sbUpload = uploadClientFor(session);
    var email = session.user && session.user.email;
    var bucket = cfg.bucket || 'playbook-content';
    var slug = slugFor(pb);
    var stage = basePath.indexOf('drafts/') === 0 ? 'draft' : 'published';

    var helpers = global.__scormExportHelpers;
    if (!helpers || !helpers.externalizeAssets) {
      return Promise.reject(new Error('Internal error: export helpers not loaded.'));
    }

    var ext = helpers.externalizeAssets(pb);
    var assetPaths = Object.keys(ext.extraFiles); // e.g. "img/foo.jpg"

    // Bundled media referenced by path (e.g. "video/intro.mp4").
    var bundledRefs = [];
    (function scan(node) {
      if (node == null) return;
      if (typeof node === 'string') {
        if (/^(img|video)\/[A-Za-z0-9_\-.]+\.(jpg|jpeg|png|webp|gif|svg|mp4|webm)$/.test(node)) bundledRefs.push(node);
        return;
      }
      if (Array.isArray(node)) { node.forEach(scan); return; }
      if (typeof node === 'object') { Object.keys(node).forEach(function (k) { scan(node[k]); }); }
    })(ext.playbook);
    var seenRef = {};
    var bundledPaths = bundledRefs.filter(function (p) {
      if (seenRef[p] || ext.extraFiles[p]) return false;
      seenRef[p] = true; return true;
    });

    var total = assetPaths.length + bundledPaths.length + 2; // + playbook-data.json + version.json
    var done = 0;
    function tick() { done++; onProgress(done, total); }

    // Rewrite asset references to PUBLIC URLs for this lane's assets/ folder.
    var publicBase = cfg.url + '/storage/v1/object/public/' + bucket + '/' + basePath + 'assets/';
    var playbookForUpload = JSON.parse(JSON.stringify(ext.playbook));
    playbookForUpload.__remoteAssetBase = publicBase;

    onProgress(0, total);

    // Media uploads are ISOLATED per file: one failure (e.g. a video over the
    // storage limit) never blocks the rest of the package — that was how a
    // published playbook once ended up with every image and video silently
    // 404-ing. Failures are collected and reported at the end so the author
    // can repair (Settings → Optimise media) and save again.
    var failedAssets = [];
    var ASSET_HARD_LIMIT = 48 * 1024 * 1024;

    var uploadAssets = assetPaths.reduce(function (chain, path) {
      return chain.then(function () {
        var info = ext.extraFiles[path];
        var mime = guessMime(path);
        var blob = base64ToBlob(info.base64, mime);
        if (blob.size > ASSET_HARD_LIMIT) {
          failedAssets.push({ path: path, reason: Math.round(blob.size / 1048576) + 'MB — over the 50MB cloud limit. Run Settings → Optimise media, then save again.' });
          tick();
          return;
        }
        return sbUpload.storage.from(bucket).upload(basePath + 'assets/' + path.replace(/^(img|video)\//, ''), blob, {
          upsert: true, contentType: mime
        }).then(function (r) {
          if (r.error) failedAssets.push({ path: path, reason: r.error.message });
          tick();
        }, function (e) {
          failedAssets.push({ path: path, reason: (e && e.message) || String(e) });
          tick();
        });
      });
    }, Promise.resolve());

    var uploadBundled = bundledPaths.reduce(function (chain, path) {
      return chain.then(function () {
        return fetch('preview-engine/' + path).then(function (res) {
          if (!res.ok) { console.warn('[publish] bundled media not found locally, skipped:', path); return; }
          return res.blob().then(function (blob) {
            if (blob.size > ASSET_HARD_LIMIT) {
              failedAssets.push({ path: path, reason: Math.round(blob.size / 1048576) + 'MB — over the 50MB cloud limit. Run Settings → Optimise media, then save again.' });
              tick();
              return;
            }
            var mime = guessMime(path);
            return sbUpload.storage.from(bucket).upload(basePath + 'assets/' + path.replace(/^(img|video)\//, ''), blob, {
              upsert: true, contentType: mime
            }).then(function (r) {
              if (r.error) failedAssets.push({ path: path, reason: r.error.message });
              tick();
            }, function (e) {
              failedAssets.push({ path: path, reason: (e && e.message) || String(e) });
              tick();
            });
          });
        });
      });
    }, Promise.resolve());

    return uploadAssets
      .then(function () { return uploadBundled; })
      .then(function () {
        var blob = new Blob([JSON.stringify(playbookForUpload)], { type: 'application/json' });
        return sbUpload.storage.from(bucket).upload(basePath + 'playbook-data.json', blob, {
          upsert: true, contentType: 'application/json'
        });
      })
      .then(function (r) {
        if (r.error) throw new Error('Upload failed (playbook-data.json): ' + r.error.message);
        tick();
        var version = { publishedAt: new Date().toISOString(), publishedBy: email || null, stage: stage };
        var blob = new Blob([JSON.stringify(version)], { type: 'application/json' });
        return sbUpload.storage.from(bucket).upload(basePath + 'version.json', blob, {
          upsert: true, contentType: 'application/json'
        });
      })
      .then(function (r) {
        if (r.error) throw new Error('Upload failed (version.json): ' + r.error.message);
        tick();
        recordVersion(playbookForUpload, slug, stage, session); // best-effort, non-blocking
        var contentUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/' + basePath + 'playbook-data.json';
        return { slug: slug, contentUrl: contentUrl, assetCount: assetPaths.length, publishedBy: email, failedAssets: failedAssets };
      });
  }

  /* ---- public library index ------------------------------------------------ */
  function updateLibraryIndex(pb, slug, stage, session) {
    var sbUpload = uploadClientFor(session);
    var bucket = cfg.bucket || 'playbook-content';
    var idxPublicUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/published/index.json';
    return fetch(idxPublicUrl + '?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : { playbooks: [] }; })
      .catch(function () { return { playbooks: [] }; })
      .then(function (idx) {
        var list = (idx && Array.isArray(idx.playbooks)) ? idx.playbooks : [];
        var existing = null;
        list = list.filter(function (p) {
          if (p && p.slug === slug) { existing = p; return false; }
          return true;
        });
        var status = stage === 'published'
          ? 'published'
          : (existing && existing.status === 'published' ? 'published' : 'draft');
        list.push({
          slug: slug,
          title: (pb.meta && pb.meta.title) || slug,
          department: (pb.meta && pb.meta.department) || (existing && existing.department) || '',
          edition: (pb.meta && pb.meta.edition) || (existing && existing.edition) || '',
          description: (existing && existing.description) || '',
          status: status,
          updatedAt: new Date().toISOString()
        });
        var blob = new Blob([JSON.stringify({ playbooks: list }, null, 2)], { type: 'application/json' });
        return sbUpload.storage.from(bucket).upload('published/index.json', blob, {
          upsert: true, contentType: 'application/json'
        });
      })
      .catch(function (e) { console.warn('[publish] library index update skipped:', e && e.message); });
  }

  /* ---- cloud version history -------------------------------------------------
     Every draft save / publish also writes a timestamped snapshot of the
     playbook JSON to versions/<slug>/<timestamp>.json and maintains a capped
     index at versions/<slug>/index.json (newest 30 kept). Best-effort: a
     version-history failure never fails the save itself.
  -------------------------------------------------------------------------- */
  var VERSIONS_KEEP = 30;

  function recordVersion(playbookForUpload, slug, stage, session, opts) {
    opts = opts || {};
    try {
      var sbUpload = uploadClientFor(session);
      var bucket = cfg.bucket || 'playbook-content';
      var email = (session && session.user && session.user.email) || null;
      var now = new Date();
      var file = now.toISOString().replace(/:/g, '-') + '.json';
      var entry = {
        file: file,
        at: now.toISOString(),
        by: email,
        stage: stage,
        autosave: !!opts.autosave,
        title: (playbookForUpload.meta && playbookForUpload.meta.title) || slug
      };
      var body = new Blob([JSON.stringify(playbookForUpload)], { type: 'application/json' });
      return sbUpload.storage.from(bucket).upload('versions/' + slug + '/' + file, body, {
        upsert: true, contentType: 'application/json'
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        var idxUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/versions/' + slug + '/index.json';
        return fetch(idxUrl + '?t=' + Date.now())
          .then(function (res) { return res.ok ? res.json() : { versions: [] }; })
          .catch(function () { return { versions: [] }; });
      }).then(function (idx) {
        var list = (idx && Array.isArray(idx.versions)) ? idx.versions : [];
        list.push(entry);
        list.sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
        var overflow = list.slice(0, Math.max(0, list.length - VERSIONS_KEEP));
        list = list.slice(-VERSIONS_KEEP);
        var idxBlob = new Blob([JSON.stringify({ versions: list }, null, 2)], { type: 'application/json' });
        return sbUpload.storage.from(bucket).upload('versions/' + slug + '/index.json', idxBlob, {
          upsert: true, contentType: 'application/json'
        }).then(function () {
          if (overflow.length) {
            return sbUpload.storage.from(bucket)
              .remove(overflow.map(function (e) { return 'versions/' + slug + '/' + e.file; }))
              .catch(function () {});
          }
        });
      }).catch(function (e) { console.warn('[publish] version history skipped:', e && e.message); });
    } catch (e) {
      console.warn('[publish] version history skipped:', e && e.message);
      return Promise.resolve();
    }
  }

  // Public read of the version index (no session needed — the bucket's reads
  // are public). Returns [] when no history exists yet.
  function listVersions(slug) {
    var bucket = cfg.bucket || 'playbook-content';
    var idxUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/versions/' + slug + '/index.json';
    return fetch(idxUrl + '?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : { versions: [] }; })
      .then(function (idx) { return (idx && Array.isArray(idx.versions)) ? idx.versions : []; })
      .catch(function () { return []; });
  }

  function versionUrl(slug, file) {
    var bucket = cfg.bucket || 'playbook-content';
    return cfg.url + '/storage/v1/object/public/' + bucket + '/versions/' + slug + '/' + file;
  }

  /* ---- lanes ----------------------------------------------------------------- */
  function publish(pb, opts) {
    opts = opts || {};
    return runLane(pb, 'published/', opts);
  }

  function saveDraft(pb, opts) {
    opts = opts || {};
    return runLane(pb, 'drafts/', opts);
  }

  // Light draft-lane refresh: playbook-data.json + version.json only, no asset
  // uploads. Used by the Studio's periodic cloud autosave when no new media
  // has been added since the last full save (assets are upserted there).
  function saveDraftJson(pb, opts) {
    opts = opts || {};
    if (!sb) return Promise.reject(new Error('Supabase client is not available (check your connection and reload).'));
    return resolveSession(opts).then(function (session) {
      if (!session || !session.access_token) return Promise.reject(new Error('NOT_AUTHENTICATED'));
      var slug = slugFor(pb);
      var sbUpload = uploadClientFor(session);
      var bucket = cfg.bucket || 'playbook-content';
      var helpers = global.__scormExportHelpers;
      if (!helpers || !helpers.externalizeAssets) return Promise.reject(new Error('export helpers not loaded'));
      var ext = helpers.externalizeAssets(pb);
      var playbookForUpload = JSON.parse(JSON.stringify(ext.playbook));
      playbookForUpload.__remoteAssetBase = cfg.url + '/storage/v1/object/public/' + bucket + '/drafts/' + slug + '/assets/';
      var blob = new Blob([JSON.stringify(playbookForUpload)], { type: 'application/json' });
      return sbUpload.storage.from(bucket).upload('drafts/' + slug + '/playbook-data.json', blob, {
        upsert: true, contentType: 'application/json'
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        var version = { publishedAt: new Date().toISOString(),
          publishedBy: (session.user && session.user.email) || null, stage: 'draft', autosave: true };
        return sbUpload.storage.from(bucket).upload('drafts/' + slug + '/version.json',
          new Blob([JSON.stringify(version)], { type: 'application/json' }),
          { upsert: true, contentType: 'application/json' });
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        recordVersion(playbookForUpload, slug, 'draft', session, { autosave: true }); // best-effort
        return { slug: slug, failedAssets: [] };
      });
    });
  }

  // Remove a stale library-index entry left behind when a playbook's slug
  // changes (e.g. after the collision guard re-derives it), AND the orphaned
  // DRAFT lane at the old slug — otherwise the other playbook that rightfully
  // owns that slug would load this playbook's draft when opened. Safety: both
  // the index entry and the draft content are only touched when their stored
  // TITLE matches — proving they belonged to this playbook.
  function removeIndexEntry(slug, expectedTitle, session) {
    var sbUpload = uploadClientFor(session);
    var bucket = cfg.bucket || 'playbook-content';
    var idxPublicUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/published/index.json';
    return fetch(idxPublicUrl + '?t=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : { playbooks: [] }; })
      .catch(function () { return { playbooks: [] }; })
      .then(function (idx) {
        var list = (idx && Array.isArray(idx.playbooks)) ? idx.playbooks : [];
        var kept = list.filter(function (p) {
          if (!p || p.slug !== slug) return true;
          return (p.title || '') !== (expectedTitle || ''); // remove only ours
        });
        if (kept.length === list.length) return;
        var blob = new Blob([JSON.stringify({ playbooks: kept }, null, 2)], { type: 'application/json' });
        return sbUpload.storage.from(bucket).upload('published/index.json', blob, {
          upsert: true, contentType: 'application/json'
        });
      })
      .then(function () {
        // Orphaned draft lane at the old slug: remove only if its content is
        // this playbook's (title match) — never another playbook's draft.
        var draftUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/drafts/' + slug + '/playbook-data.json';
        return fetch(draftUrl + '?t=' + Date.now()).then(function (r) {
          if (!r.ok) return;
          return r.json().then(function (pb) {
            var t = pb && pb.meta && pb.meta.title;
            if (t !== expectedTitle) return;
            return sbUpload.storage.from(bucket).remove([
              'drafts/' + slug + '/playbook-data.json',
              'drafts/' + slug + '/version.json'
            ]).then(function () {
              console.log('[publish] removed orphaned draft lane at old slug:', slug);
            });
          });
        }).catch(function () { /* no orphaned draft — fine */ });
      })
      .catch(function (e) { console.warn('[publish] stale index entry cleanup skipped:', e && e.message); });
  }

  function runLane(pb, lanePrefix, opts) {
    var onProgress = opts.onProgress || function () {};
    if (!sb) return Promise.reject(new Error('Supabase client is not available (check your connection and reload).'));
    return resolveSession(opts).then(function (session) {
      if (!session || !session.access_token) return Promise.reject(new Error('NOT_AUTHENTICATED'));
      var slug = slugFor(pb);
      return uploadPackage(pb, lanePrefix + slug + '/', session, onProgress)
        .then(function (result) {
          var stage = lanePrefix === 'drafts/' ? 'draft' : 'published';
          return updateLibraryIndex(pb, slug, stage, session).then(function () { return result; });
        });
    }).catch(function (e) {
      if (e && e.message === 'NOT_AUTHENTICATED') throw e;
      // A stale/expired session is silently treated as anonymous, so the server
      // returns an RLS violation. Translate that into a clear, actionable message.
      if (e && /row-level security|Unauthorized|JWT|expired/i.test(e.message || '')) {
        var friendly = new Error('Your sign-in session expired. Please sign out and sign in again, then try again.');
        friendly.code = 'SESSION_EXPIRED';
        throw friendly;
      }
      throw e;
    });
  }

  function guessMime(path) {
    var m = /\.([a-z0-9]+)$/i.exec(path);
    var ext = m ? m[1].toLowerCase() : '';
    var map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm' };
    return map[ext] || 'application/octet-stream';
  }

  function base64ToBlob(base64, mime) {
    var byteChars = atob(base64);
    var byteNumbers = new Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    return new Blob([new Uint8Array(byteNumbers)], { type: mime });
  }

  global.PlaybookPublish = {
    slugify: slugify,
    slugFor: slugFor,
    getSession: getSession,
    signIn: signIn,
    signOut: signOut,
    onAuthChange: onAuthChange,
    publish: publish,
    saveDraft: saveDraft,
    saveDraftJson: saveDraftJson,
    listVersions: listVersions,
    versionUrl: versionUrl,
    removeIndexEntry: removeIndexEntry
  };
})(window);
