/* ============================================================================
   storage.js — backend-ready persistence layer for the MO Playbook authoring tool
   ----------------------------------------------------------------------------
   The editor never talks to a storage mechanism directly. It talks to a single
   StorageAdapter interface, so you can swap the local-file/localStorage
   implementation for a real backend (Supabase, Azure Blob + a small API, etc.)
   without touching editor.js.

   StorageAdapter interface (all methods return Promises):
     load()              -> PLAYBOOK object | null      (the "current" doc)
     save(playbook)      -> void                        (persist current doc)
     saveAutosnapshot(p) -> void                        (cheap, frequent backup)
     loadAutosnapshot()  -> PLAYBOOK | null
     clearAutosnapshot() -> void
     exportFile(pb,name) -> void   (download a .json the user can keep/share)
     importFile()        -> PLAYBOOK   (open a .json chosen by the user)

   See HOW-TO.md -> "Connecting a backend later" for a Supabase/Azure adapter.
   ============================================================================ */
(function (global) {
  'use strict';

  var AUTOSAVE_KEY = 'mo_playbook_autosave_v1';
  var CURRENT_KEY = 'mo_playbook_current_v1';

  // In-memory fallback store. Some hosting contexts (e.g. a sandboxed preview
  // iframe without the 'allow-same-origin' flag) throw a SecurityError on ANY
  // localStorage access — not just when quota is exceeded. In that case we
  // still keep the current doc + autosnapshot safe in memory for the rest of
  // this page session, so editing/Publish keep working; only "restore after a
  // real page reload" is unavailable, and we tell the user that plainly
  // instead of a scary hard failure.
  var memFallback = { current: null, autosave: null, blocked: false };

  function isBlockedStorageError(e) {
    return !!e && (e.name === 'SecurityError' || /sandboxed|localStorage/i.test(e.message || ''));
  }

  /* ---- LocalFileAdapter --------------------------------------------------
     - "current" document + autosnapshot live in IndexedDB (hundreds of MB of
       quota — localStorage's ~5MB cap silently dropped saves for any
       playbook carrying a real video), so a page reload always restores
       work-in-progress, video included. One-time migration moves any
       existing localStorage copies across.
     - The authoritative, portable copy is still the .json file the author
       saves to disk via exportFile()/importFile().
     - Falls back to in-memory storage if IndexedDB is unavailable (sandboxed
       iframe), so editing/Publish keep working within the session.
     ---------------------------------------------------------------------- */
  var IDB_NAME = 'mo_playbook_store';
  var IDB_STORE = 'kv';
  var dbPromise = null;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(IDB_NAME, 1); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = function (e) { e.target.result.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function idbGet(key) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var rq = d.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        rq.onsuccess = function () { resolve(rq.result || null); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }

  function idbSet(key, val) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var rq = d.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(val, key);
        rq.onsuccess = function () { resolve(); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }

  function idbDel(key) {
    return db().then(function (d) {
      return new Promise(function (resolve) {
        var rq = d.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key);
        rq.onsuccess = function () { resolve(); };
        rq.onerror = function () { resolve(); };
      });
    });
  }

  // One-time migration: move a legacy localStorage value into IndexedDB,
  // then free the localStorage quota.
  function migrate(legacyKey, idbKey, parse) {
    return idbGet(idbKey).then(function (val) {
      if (val) return val;
      var raw = null;
      try { raw = global.localStorage.getItem(legacyKey); } catch (e) { /* blocked */ }
      if (!raw) return null;
      var parsed = null;
      try { parsed = parse ? JSON.parse(raw) : raw; } catch (e) { return null; }
      return idbSet(idbKey, parsed).then(function () {
        try { global.localStorage.removeItem(legacyKey); } catch (e) {}
        return parsed;
      });
    });
  }

  // Drafts are namespaced per playbook slug ('current:<slug>' /
  // 'autosave:<slug>'), so switching between playbooks never replaces
  // another playbook's draft. Legacy single-slot records migrate forward.
  var currentSlug = null;

  function keyFor(base) { return currentSlug ? base + ':' + currentSlug : base; }

  function namespacedGet(base, parse) {
    return idbGet(keyFor(base)).then(function (val) {
      if (val) return val;
      // Namespace miss: fall back to the bare legacy key (single-slot era).
      return migrate(base === 'current' ? CURRENT_KEY : AUTOSAVE_KEY, base, parse);
    });
  }

  function LocalFileAdapter() {}

  LocalFileAdapter.prototype.storageBlocked = function () { return memFallback.blocked; };

  LocalFileAdapter.prototype.setSlug = function (slug) {
    currentSlug = slug || null;
    return idbSet('last_slug', currentSlug || '').catch(function () {});
  };

  LocalFileAdapter.prototype.getSlug = function () {
    if (currentSlug) return Promise.resolve(currentSlug);
    return idbGet('last_slug').then(function (v) { currentSlug = v || null; return currentSlug; });
  };

  LocalFileAdapter.prototype.load = function () {
    return namespacedGet('current', true)
      .catch(function () { memFallback.blocked = true; return memFallback.current; });
  };

  LocalFileAdapter.prototype.save = function (playbook) {
    memFallback.current = playbook;
    return idbSet(keyFor('current'), playbook)
      .then(function () { return { persisted: true }; })
      .catch(function () { memFallback.blocked = true; return { persisted: false, blocked: true }; });
  };

  LocalFileAdapter.prototype.saveAutosnapshot = function (playbook) {
    var rec = { at: Date.now(), playbook: playbook };
    memFallback.autosave = rec;
    return idbSet(keyFor('autosave'), rec).catch(function () { memFallback.blocked = true; });
  };

  LocalFileAdapter.prototype.loadAutosnapshot = function () {
    return namespacedGet('autosave', true)
      .catch(function () { memFallback.blocked = true; return memFallback.autosave; });
  };

  LocalFileAdapter.prototype.clearAutosnapshot = function () {
    memFallback.autosave = null;
    return idbDel('autosave').then(function () {
      try { global.localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
    });
  };

  // Download a portable .json (images embedded as data URLs in PLAYBOOK.assets).
  LocalFileAdapter.prototype.exportFile = function (playbook, filename) {
    return new Promise(function (resolve) {
      var blob = new Blob([JSON.stringify(playbook, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'playbook.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      resolve();
    });
  };

  // Open a .json chosen by the user via a hidden file input.
  LocalFileAdapter.prototype.importFile = function () {
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) { reject(new Error('No file selected')); return; }
        var r = new FileReader();
        r.onload = function () {
          try { resolve(JSON.parse(r.result)); }
          catch (e) { reject(new Error('That file is not a valid playbook (.json).')); }
        };
        r.onerror = function () { reject(new Error('Could not read the file.')); };
        r.readAsText(f);
      };
      input.click();
    });
  };

  global.PlaybookStorage = {
    LocalFileAdapter: LocalFileAdapter,
    // The editor uses whatever is assigned here. To go to a backend later,
    // assign a different adapter instance (see HOW-TO.md).
    adapter: new LocalFileAdapter(),
    keys: { AUTOSAVE_KEY: AUTOSAVE_KEY, CURRENT_KEY: CURRENT_KEY }
  };
})(window);
