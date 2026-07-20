/* ============================================================================
   remote-loader.js — runtime bootstrapper for "Export SCORM (remote)" packages
   ----------------------------------------------------------------------------
   Ships INSIDE the remote SCORM zip (not used by the authoring tool itself).
   Runs before the renderer boots. Responsibilities (see REMOTE_SCORM_SPEC.md
   Part 4):
     1. Fetch REMOTE_CONFIG.contentUrl (cache-busted, ~8s timeout).
     2. On success: set window.PLAYBOOK, cache it to localStorage (namespaced
        by slug) as the new "last known good", then boot the renderer.
     3. On failure/timeout/CORS/offline: fall back to (a) the localStorage
        last-known-good copy, else (b) the BUNDLED fallback-playbook-data.js
        snapshot — so the course still fully works with no network.
     4. Completion rules come from the fetched/fallback PLAYBOOK (meta.completion
        -> SCORM_REQUIRED_PAGES), not hardcoded in the shell.
   Logs which path was used to the console. Shows a tiny, non-blocking corner
   note only when running on a fallback.
   ============================================================================ */
(function (global) {
  'use strict';

  var CFG = global.REMOTE_CONFIG || {};
  var SLUG = CFG.slug || 'playbook';
  var LS_KEY = 'mo_playbook_remote_cache_v1_' + SLUG;
  var TIMEOUT_MS = 8000;

  function log(path, detail) {
    try { console.log('[remote-loader] source: ' + path + (detail ? ' — ' + detail : '')); } catch (e) {}
  }

  function fetchWithTimeout(url, ms) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var timer = setTimeout(function () {
        xhr.abort();
        reject(new Error('Timed out after ' + ms + 'ms fetching ' + url));
      }, ms);
      xhr.open('GET', url, true);
      xhr.onload = function () {
        clearTimeout(timer);
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('Invalid JSON from ' + url)); }
        } else {
          reject(new Error('HTTP ' + xhr.status + ' fetching ' + url));
        }
      };
      xhr.onerror = function () { clearTimeout(timer); reject(new Error('Network error fetching ' + url)); };
      xhr.onabort = function () { /* handled by timeout branch */ };
      xhr.send();
    });
  }

  function readCache() {
    try {
      var raw = global.localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw).playbook : null;
    } catch (e) { return null; }
  }
  function writeCache(pb) {
    try { global.localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), playbook: pb })); }
    catch (e) { /* quota or unavailable — best effort only */ }
  }

  function showFallbackNote() {
    try {
      document.addEventListener('DOMContentLoaded', function () {
        var note = document.createElement('div');
        note.className = 'fallback-note';
        note.textContent = 'Showing last saved version';
        document.body.appendChild(note);
        setTimeout(function () { note.style.transition = 'opacity .6s'; note.style.opacity = '0'; }, 6000);
      });
    } catch (e) {}
  }

  // Resolve asset filenames relative to __remoteAssetBase (set by publish.js
  // when it uploaded the content) so <img>/<video> tags served by the shell's
  // renderer resolve to the public bucket URLs instead of a local img/ folder
  // that does not exist in the remote package.
  function rewriteAssetBase(pb) {
    var base = pb.__remoteAssetBase;
    if (!base) return pb; // fallback snapshot already ships its own fallback-assets/
    // The renderer resolves bare "img/foo.jpg"/"video/foo.mp4" via relative
    // paths; we rewrite those to absolute URLs everywhere in the JSON payload
    // (cheapest safe approach given the renderer has no other asset hook).
    var json = JSON.stringify(pb);
    json = json.replace(/img\/([A-Za-z0-9_\-.]+\.(jpg|jpeg|png|webp|gif|svg))/g, function (m, fname) {
      return base + fname;
    });
    json = json.replace(/video\/([A-Za-z0-9_\-.]+\.(mp4|webm))/g, function (m, fname) {
      return base + fname;
    });
    return JSON.parse(json);
  }

  function computeRequiredPages(pb) {
    var comp = (pb.meta && pb.meta.completion) || {};
    var chs = (pb.chapters || []).filter(function (c) { return c.id !== 'menu'; }).map(function (c) { return c.id; });
    if (comp.mode === 'open-all') return chs;
    if (comp.mode === 'open-n') return chs.slice(0, Math.min(comp.n || 1, chs.length));
    var req = (comp.requiredChapterIds || []).filter(function (id) { return chs.indexOf(id) >= 0; });
    return req.length ? req : chs;
  }

  function loadScriptsSequentially(paths, cb) {
    var i = 0;
    function next() {
      if (i >= paths.length) { cb(); return; }
      var path = paths[i++];
      var s = document.createElement('script');
      s.src = path;
      s.onload = function () {
        // app.js normally boots itself via `document.addEventListener(
        // 'DOMContentLoaded', init)`. Because we inject it dynamically, that
        // event has very likely already fired by the time it loads — so call
        // init() ourselves in that case (same pattern scorm_hook.js already
        // uses for its own DOMContentLoaded guard).
        if (path === 'app.js' && document.readyState !== 'loading' && typeof window.init === 'function') {
          try { window.init(); } catch (e) { console.error('[remote-loader] init() failed:', e); }
        }
        next();
      };
      s.onerror = function () { console.error('[remote-loader] failed to load ' + s.src); next(); };
      document.head.appendChild(s);
    }
    next();
  }

  function boot(pb, sourceLabel) {
    global.PLAYBOOK = rewriteAssetBase(pb);
    global.SCORM_REQUIRED_PAGES = computeRequiredPages(global.PLAYBOOK);
    log(sourceLabel);
    if (sourceLabel !== 'network') showFallbackNote();
    // Load the rest of the app chain in the same order the offline export
    // uses: scorm_api.js (needs SCORM_REQUIRED_PAGES already set) -> renderer
    // (playbook-content.js + app.js) -> scorm_hook.js.
    loadScriptsSequentially(['scorm_api.js', 'playbook-content.js', 'app.js', 'scorm_hook.js'], function () {
      log('boot-complete');
    });
  }

  function fallbackChain() {
    var cached = readCache();
    if (cached) { boot(cached, 'localStorage-cache'); return; }
    if (global.FALLBACK_PLAYBOOK) { boot(global.FALLBACK_PLAYBOOK, 'bundled-fallback'); return; }
    console.error('[remote-loader] No network content, no cache, and no bundled fallback available. The course cannot start.');
  }

  if (!CFG.contentUrl) {
    console.warn('[remote-loader] REMOTE_CONFIG.contentUrl missing; using fallback chain immediately.');
    fallbackChain();
  } else {
    var url = CFG.contentUrl + (CFG.contentUrl.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    fetchWithTimeout(url, TIMEOUT_MS).then(function (pb) {
      writeCache(pb);
      boot(pb, 'network');
    }).catch(function (err) {
      console.warn('[remote-loader] network fetch failed (' + err.message + '); falling back.');
      fallbackChain();
    });
  }
})(window);
