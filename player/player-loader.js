/* ============================================================================
   player-loader.js — web player bootstrapper for published playbooks
   ----------------------------------------------------------------------------
   Non-SCORM sibling of authoring-tool/remote-loader.js. Used by the Playbook
   Library hub: opens any playbook published from Playbook Studio to Supabase
   Storage, by slug:

     player/index.html?slug=people-culture-playbook

   How it works:
     1. Builds the public content URL:
          PLAYER_CONFIG.contentBase + <slug>/playbook-data.json
        (the bucket is public by design — no sign-in needed to READ a
         published playbook; publishing still requires Studio sign-in + RLS).
     2. Fetches it (cache-busted, ~8s timeout).
     3. On success: rewrites asset paths to the bucket, sets window.PLAYBOOK,
        caches "last known good" to localStorage, boots the data-driven
        renderer (playbook-content.js + app.js).
     4. On failure: falls back to the localStorage last-known-good copy, so a
        playbook a colleague opened before still works offline.
     5. If nothing is available: shows a branded error with a link back to
        the library hub.
   ============================================================================ */
(function (global) {
  'use strict';

  var CFG = global.PLAYER_CONFIG || {};
  var CONTENT_BASE = CFG.contentBase ||
    'https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content/published/';
  var HUB_URL = CFG.hubUrl || '../index.html';
  var TIMEOUT_MS = 8000;

  var params = new URLSearchParams(global.location.search);
  var SLUG = (params.get('slug') || '').trim();
  var SRC = (params.get('src') || '').trim(); // optional full contentUrl override
  var LS_KEY = 'mo_player_cache_v1_' + (SLUG || SRC);

  function log(path, detail) {
    try { console.log('[player] source: ' + path + (detail ? ' — ' + detail : '')); } catch (e) {}
  }

  function contentUrl() {
    if (SRC) return SRC;
    return CONTENT_BASE + encodeURIComponent(SLUG) + '/playbook-data.json';
  }

  function fetchWithTimeout(url, ms) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var timer = setTimeout(function () {
        xhr.abort();
        reject(new Error('Timed out after ' + ms + 'ms'));
      }, ms);
      xhr.open('GET', url, true);
      xhr.onload = function () {
        clearTimeout(timer);
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('Invalid JSON')); }
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = function () { clearTimeout(timer); reject(new Error('Network error')); };
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

  function showNote(text) {
    try {
      document.addEventListener('DOMContentLoaded', function () {
        var note = document.createElement('div');
        note.className = 'fallback-note';
        note.textContent = text;
        document.body.appendChild(note);
        setTimeout(function () { note.style.transition = 'opacity .6s'; note.style.opacity = '0'; }, 6000);
      });
    } catch (e) {}
  }

  // Same rewrite as remote-loader.js: bare "img/foo.jpg"/"video/foo.mp4"
  // paths become absolute public-bucket URLs via pb.__remoteAssetBase (set by
  // publish.js when the content was uploaded).
  function rewriteAssetBase(pb) {
    var base = pb.__remoteAssetBase;
    if (!base) return pb;
    var json = JSON.stringify(pb);
    json = json.replace(/img\/([A-Za-z0-9_\-.]+\.(jpg|jpeg|png|webp|gif|svg))/g, function (m, fname) {
      return base + fname;
    });
    json = json.replace(/video\/([A-Za-z0-9_\-.]+\.(mp4|webm))/g, function (m, fname) {
      return base + fname;
    });
    return JSON.parse(json);
  }

  function loadScriptsSequentially(paths, cb) {
    var i = 0;
    function next() {
      if (i >= paths.length) { cb(); return; }
      var path = paths[i++];
      var s = document.createElement('script');
      s.src = path;
      s.onload = function () {
        // app.js normally boots itself on DOMContentLoaded, which has already
        // fired by the time we inject it — call init() ourselves then.
        if (path === 'app.js' && document.readyState !== 'loading' && typeof window.init === 'function') {
          try { window.init(); } catch (e) { console.error('[player] init() failed:', e); showError(); }
        }
        next();
      };
      s.onerror = function () { console.error('[player] failed to load ' + path); showError(); };
      document.head.appendChild(s);
    }
    next();
  }

  function showError() {
    var msg = SLUG
      ? 'We couldn\u2019t load the playbook \u201C' + SLUG + '\u201D. It may not be published yet, or your connection is offline.'
      : 'No playbook was specified.';
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAF9F6;font-family:\'Avenir Next LT Pro\',system-ui,sans-serif;">' +
        '<div style="max-width:420px;text-align:center;padding:40px 24px;">' +
          '<div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#B59060;margin-bottom:18px;">Mandarin Oriental</div>' +
          '<h1 style="font-family:Georgia,\'Times New Roman\',serif;font-weight:400;font-size:26px;color:#0d0b08;margin:0 0 14px;">Playbook unavailable</h1>' +
          '<p style="color:#6b625a;font-size:14px;line-height:1.7;margin:0 0 26px;">' + msg + '</p>' +
          '<a href="' + HUB_URL + '" style="display:inline-block;border:1px solid #B59060;color:#8f6d3f;text-decoration:none;padding:11px 26px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">Back to Library</a>' +
        '</div>' +
      '</div>';
  }

  function boot(pb, sourceLabel) {
    global.PLAYBOOK = rewriteAssetBase(pb);
    try {
      var t = (pb.meta && pb.meta.title) || SLUG;
      if (t) document.title = 'Mandarin Oriental · ' + t;
    } catch (e) {}
    log(sourceLabel);
    if (sourceLabel !== 'network') showNote('Showing last saved version');
    loadScriptsSequentially(['playbook-content.js', 'app.js'], function () {
      log('boot-complete');
    });
  }

  function start() {
    if (!SLUG && !SRC) {
      // Nothing requested — send people back to the library.
      global.location.replace(HUB_URL);
      return;
    }
    var url = contentUrl() + (contentUrl().indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    fetchWithTimeout(url, TIMEOUT_MS).then(function (pb) {
      writeCache(pb);
      boot(pb, 'network');
    }).catch(function (err) {
      console.warn('[player] network fetch failed (' + err.message + '); trying cache.');
      var cached = readCache();
      if (cached) { boot(cached, 'localStorage-cache'); return; }
      showError();
    });
  }

  start();
})(window);
