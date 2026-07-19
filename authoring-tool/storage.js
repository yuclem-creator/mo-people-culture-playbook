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

  /* ---- LocalFileAdapter --------------------------------------------------
     - "current" document + autosnapshot live in localStorage so a page reload
       restores work-in-progress.
     - The authoritative, portable copy is the .json file the author saves to
       disk (with images embedded as data URLs) via exportFile()/importFile().
     ---------------------------------------------------------------------- */
  function LocalFileAdapter() {}

  LocalFileAdapter.prototype.load = function () {
    return new Promise(function (resolve) {
      try {
        var raw = global.localStorage.getItem(CURRENT_KEY);
        resolve(raw ? JSON.parse(raw) : null);
      } catch (e) { resolve(null); }
    });
  };

  LocalFileAdapter.prototype.save = function (playbook) {
    return new Promise(function (resolve, reject) {
      try {
        global.localStorage.setItem(CURRENT_KEY, JSON.stringify(playbook));
        resolve();
      } catch (e) { reject(e); }
    });
  };

  LocalFileAdapter.prototype.saveAutosnapshot = function (playbook) {
    return new Promise(function (resolve) {
      try {
        global.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
          at: Date.now(), playbook: playbook
        }));
      } catch (e) { /* quota — ignore, autosave is best-effort */ }
      resolve();
    });
  };

  LocalFileAdapter.prototype.loadAutosnapshot = function () {
    return new Promise(function (resolve) {
      try {
        var raw = global.localStorage.getItem(AUTOSAVE_KEY);
        resolve(raw ? JSON.parse(raw) : null);
      } catch (e) { resolve(null); }
    });
  };

  LocalFileAdapter.prototype.clearAutosnapshot = function () {
    return new Promise(function (resolve) {
      try { global.localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
      resolve();
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
