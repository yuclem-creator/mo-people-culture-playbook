/* ============================================================================
   SCORM 1.2 Runtime Wrapper — Mandarin Oriental People & Culture Playbook
   ----------------------------------------------------------------------------
   Completion model: the learner must VIEW ALL PAGES (all seven chapters of the
   interactive magazine). Once every chapter has been opened, the course reports
   cmi.core.lesson_status = "completed" to the LMS.

   This wrapper is deliberately self-contained (no external dependencies) so the
   package runs inside any SCORM 1.2-conformant LMS.
   ============================================================================ */
(function (global) {
  'use strict';

  // The set of "pages" that must be viewed for completion.
  // These mirror the CHAPTERS ids in app.js (the cover + six chapters).
  var REQUIRED_PAGES = ['cover', 'ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5', 'ch-6'];

  var api = null;          // discovered LMS API object
  var initialised = false; // LMSInitialize succeeded
  var finished = false;    // LMSFinish already called
  var viewed = {};         // map of pageId -> true
  var completed = false;   // completion already reported

  /* ---- API discovery (SCORM 1.2 standard search) ------------------------ */
  function findAPIInWindow(win) {
    var tries = 0;
    while (win.API == null && win.parent != null && win.parent !== win && tries < 500) {
      tries++;
      win = win.parent;
    }
    return win.API || null;
  }

  function getAPI() {
    var theAPI = null;
    try {
      if (global.parent && global.parent !== global) {
        theAPI = findAPIInWindow(global.parent);
      }
      if (theAPI == null && global.opener != null) {
        theAPI = findAPIInWindow(global.opener);
      }
      if (theAPI == null) {
        theAPI = findAPIInWindow(global);
      }
    } catch (e) {
      theAPI = null;
    }
    return theAPI;
  }

  /* ---- Persisted view state via suspend_data --------------------------- */
  function loadState() {
    if (!api) return;
    try {
      var raw = api.LMSGetValue('cmi.core.lesson_status') || '';
      if (raw === 'completed' || raw === 'passed') { completed = true; }
      var suspend = api.LMSGetValue('cmi.suspend_data') || '';
      if (suspend) {
        var parts = suspend.split(',');
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i].trim();
          if (p) viewed[p] = true;
        }
      }
    } catch (e) { /* no-op */ }
  }

  function saveState() {
    if (!api || !initialised) return;
    try {
      var seen = [];
      for (var k in viewed) { if (viewed.hasOwnProperty(k)) seen.push(k); }
      api.LMSSetValue('cmi.suspend_data', seen.join(','));
      api.LMSCommit('');
    } catch (e) { /* no-op */ }
  }

  function allViewed() {
    for (var i = 0; i < REQUIRED_PAGES.length; i++) {
      if (!viewed[REQUIRED_PAGES[i]]) return false;
    }
    return true;
  }

  function progress() {
    var n = 0;
    for (var i = 0; i < REQUIRED_PAGES.length; i++) {
      if (viewed[REQUIRED_PAGES[i]]) n++;
    }
    return { viewed: n, total: REQUIRED_PAGES.length };
  }

  function reportCompletion() {
    if (completed || !api || !initialised) return;
    try {
      api.LMSSetValue('cmi.core.lesson_status', 'completed');
      // Score is not meaningful for a "viewed" completion model, but many LMSs
      // display a raw score; report 100 for a fully-viewed course.
      api.LMSSetValue('cmi.core.score.raw', '100');
      api.LMSSetValue('cmi.core.score.min', '0');
      api.LMSSetValue('cmi.core.score.max', '100');
      api.LMSCommit('');
      completed = true;
    } catch (e) { /* no-op */ }
  }

  /* ---- Public tracker --------------------------------------------------- */
  var SCORM = {
    init: function () {
      api = getAPI();
      if (!api) {
        // Not running inside an LMS (e.g. local preview) — operate silently.
        return false;
      }
      try {
        var ok = api.LMSInitialize('');
        initialised = (ok === 'true' || ok === true);
      } catch (e) {
        initialised = false;
      }
      if (initialised) {
        loadState();
        // If the course had already been completed in a prior attempt, keep it.
        if (!completed) {
          try {
            var status = api.LMSGetValue('cmi.core.lesson_status');
            if (!status || status === 'not attempted' || status === '') {
              api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
              api.LMSCommit('');
            }
          } catch (e) { /* no-op */ }
        }
      }
      return initialised;
    },

    // Record that a page/chapter has been viewed.
    markViewed: function (pageId) {
      if (!pageId) return;
      if (viewed[pageId]) { /* already seen */ }
      viewed[pageId] = true;
      saveState();
      if (allViewed()) reportCompletion();
      SCORM._notify();
    },

    getProgress: progress,
    isComplete: function () { return completed; },

    finish: function () {
      if (!api || !initialised || finished) return;
      try {
        api.LMSCommit('');
        api.LMSFinish('');
      } catch (e) { /* no-op */ }
      finished = true;
    },

    // Optional UI hook: overwrite window.__scormProgress to receive updates.
    _notify: function () {
      if (typeof global.__onScormProgress === 'function') {
        try { global.__onScormProgress(progress(), completed); } catch (e) {}
      }
    }
  };

  global.SCORM = SCORM;

  // Initialise as early as possible.
  SCORM.init();

  // Ensure the session is closed cleanly when the learner leaves.
  var closed = false;
  function closeOut() {
    if (closed) return;
    closed = true;
    SCORM.finish();
  }
  global.addEventListener('beforeunload', closeOut);
  global.addEventListener('unload', closeOut);
  global.addEventListener('pagehide', closeOut);

})(window);
