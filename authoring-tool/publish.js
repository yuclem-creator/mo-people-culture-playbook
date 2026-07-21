/* ============================================================================
   publish.js — Supabase login gate + Publish flow for MO Playbook Studio
   ----------------------------------------------------------------------------
   Adds cloud publishing on top of the existing local-only editor without
   touching storage.js/export.js's existing behaviour. Reuses the exact same
   asset-decode logic export.js already uses for the offline SCORM export
   (via window.__scormExportHelpers.externalizeAssets) instead of duplicating
   it — per REMOTE_SCORM_SPEC.md Part 3.

   Public surface (attached to window.PlaybookPublish):
     slugify(title)              -> url-safe kebab-case slug
     slugFor(pb)                 -> pb.meta.slug if set, else slugify(title)
     getSession()                -> Promise<Supabase session|null>
     signIn(email, password)     -> Promise (throws with .message on failure)
     signOut()                   -> Promise
     onAuthChange(fn)            -> subscribe to sign-in/out (fn(session))
     publish(pb, {onProgress})   -> Promise<{slug, contentUrl, assetCount}>
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

  // ---- publish ---------------------------------------------------------------
  // Uploads playbook-data.json + decoded assets + version.json to
  // playbook-content/published/<slug>/... using upsert semantics (re-publish
  // overwrites cleanly, no versioning needed for "auto-update").
  function publish(pb, opts) {
    opts = opts || {};
    var onProgress = opts.onProgress || function () {};
    if (!sb) return Promise.reject(new Error('Supabase client is not available (check your connection and reload).'));

    // Resolve a usable authenticated session. In embedded/iframe contexts the
    // Supabase client often cannot persist its session to browser storage, so
    // getSession()/refreshSession() come back empty even right after a
    // successful sign-in. To be robust we PREFER a session object passed in
    // directly from the sign-in call (opts.session), which always holds a fresh
    // access_token in memory, and only fall back to the persisted session.
    function resolveSession() {
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

    return resolveSession().then(function (session) {
      if (!session || !session.access_token) return Promise.reject(new Error('NOT_AUTHENTICATED'));
      var email = session.user && session.user.email;

      // Build a storage client that explicitly carries THIS session's access
      // token on every request, instead of relying on the shared client reading
      // a (possibly unpersisted) session back from storage. This is what makes
      // the upload reliably run as `authenticated` in an iframe.
      var sbUpload = (global.supabase && global.supabase.createClient)
        ? global.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: 'Bearer ' + session.access_token } }
          })
        : sb;
      var helpers = global.__scormExportHelpers;
      if (!helpers || !helpers.externalizeAssets) {
        return Promise.reject(new Error('Internal error: export helpers not loaded.'));
      }

      var slug = slugFor(pb);
      var basePath = 'published/' + slug + '/';
      var bucket = cfg.bucket || 'playbook-content';

      // Reuse export.js's asset-decode logic exactly (no duplication): it
      // returns a clone of PLAYBOOK with data-URL assets removed and a map of
      // relative path -> { base64 } for every image/video that needs writing.
      var ext = helpers.externalizeAssets(pb);
      var assetPaths = Object.keys(ext.extraFiles); // e.g. "img/foo.jpg"
      var total = assetPaths.length + 2; // + playbook-data.json + version.json
      var done = 0;
      function tick() { done++; onProgress(done, total); }

      // Rewrite asset references in playbook-data.json to PUBLIC bucket URLs
      // so the remote shell can fetch them directly with no auth, per spec.
      var publicBase = cfg.url + '/storage/v1/object/public/' + bucket + '/' + basePath + 'assets/';
      var playbookForUpload = JSON.parse(JSON.stringify(ext.playbook));
      // The externalized clone's `assets` map is already emptied by
      // externalizeAssets (real files now), and any prose/struct fields were
      // already rewritten to the new bare filenames. We only need to make
      // those bare "img/xxx.jpg" / "video/xxx.mp4" references resolvable by
      // an absolute URL for a shell that has no bundled img/ folder. We do
      // this the same way the renderer resolves assets: by exposing a base
      // URL the remote loader prefixes onto bare filenames.
      playbookForUpload.__remoteAssetBase = publicBase;

      onProgress(0, total);

      // 1. Upload each decoded asset file.
      var uploadAssets = assetPaths.reduce(function (chain, path) {
        return chain.then(function () {
          var info = ext.extraFiles[path];
          var mime = guessMime(path);
          var blob = base64ToBlob(info.base64, mime);
          return sbUpload.storage.from(bucket).upload(basePath + 'assets/' + path.replace(/^(img|video)\//, ''), blob, {
            upsert: true, contentType: mime
          }).then(function (r) {
            if (r.error) throw new Error('Asset upload failed (' + path + '): ' + r.error.message);
            tick();
          });
        });
      }, Promise.resolve());

      return uploadAssets
        .then(function () {
          // 2. Upload playbook-data.json
          var blob = new Blob([JSON.stringify(playbookForUpload)], { type: 'application/json' });
          return sbUpload.storage.from(bucket).upload(basePath + 'playbook-data.json', blob, {
            upsert: true, contentType: 'application/json'
          });
        })
        .then(function (r) {
          if (r.error) throw new Error('Upload failed (playbook-data.json): ' + r.error.message);
          tick();
          // 3. Upload version.json
          var version = { publishedAt: new Date().toISOString(), publishedBy: email || null };
          var blob = new Blob([JSON.stringify(version)], { type: 'application/json' });
          return sbUpload.storage.from(bucket).upload(basePath + 'version.json', blob, {
            upsert: true, contentType: 'application/json'
          });
        })
        .then(function (r) {
          if (r.error) throw new Error('Upload failed (version.json): ' + r.error.message);
          tick();
          var contentUrl = cfg.url + '/storage/v1/object/public/' + bucket + '/' + basePath + 'playbook-data.json';
          return { slug: slug, contentUrl: contentUrl, assetCount: assetPaths.length, publishedBy: email };
        });
    }).catch(function (e) {
      if (e && e.message === 'NOT_AUTHENTICATED') throw e;
      // A stale/expired session is silently treated as anonymous, so the server
      // returns an RLS violation. Translate that into a clear, actionable message
      // instead of the raw Postgres error.
      if (e && /row-level security|Unauthorized|JWT|expired/i.test(e.message || '')) {
        var friendly = new Error('Your sign-in session expired. Please sign out and sign in again, then Publish.');
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
    publish: publish
  };
})(window);
