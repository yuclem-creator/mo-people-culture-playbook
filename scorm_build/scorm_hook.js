/* ============================================================================
   SCORM view-tracking hook — Mandarin Oriental P&C Playbook
   ----------------------------------------------------------------------------
   Wraps the application's goTo() navigation so that every chapter the learner
   opens is reported to the SCORM runtime. Also renders a small, unobtrusive
   completion indicator in the top bar and marks the landing chapter as viewed.
   Loaded AFTER app.js so window.goTo already exists.
   ============================================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    // --- Wrap goTo to record each viewed chapter -------------------------
    if (typeof window.goTo === 'function') {
      var origGoTo = window.goTo;
      window.goTo = function (chapterId, subId) {
        var r = origGoTo.apply(this, arguments);
        if (window.SCORM && chapterId && chapterId !== 'menu') {
          window.SCORM.markViewed(chapterId);
        }
        return r;
      };
    }

    // --- Mark the chapter that is visible on load ------------------------
    function markInitial() {
      var current = document.querySelector('.chapter.on');
      var id = current ? current.id : 'cover';
      if (window.SCORM) window.SCORM.markViewed(id || 'cover');
    }
    // app init runs on DOMContentLoaded too; defer slightly so it has run.
    setTimeout(markInitial, 600);

    // --- Progress indicator in the top bar -------------------------------
    var chip = document.createElement('div');
    chip.id = 'scormProgress';
    chip.setAttribute('aria-live', 'polite');
    chip.style.cssText = [
      'position:fixed', 'left:50%', 'transform:translateX(-50%)', 'bottom:16px', 'z-index:60',
      'font-family:\'Avenir Next LT Pro\', sans-serif', 'font-size:0.62rem',
      'letter-spacing:0.14em', 'text-transform:uppercase',
      'color:#6b625a', 'background:rgba(249,247,243,0.96)',
      'border:1px solid #C9A879', 'border-radius:20px',
      'padding:7px 14px', 'box-shadow:0 2px 10px rgba(0,0,0,0.06)',
      'pointer-events:none', 'transition:opacity 0.3s'
    ].join(';');
    document.body.appendChild(chip);

    window.__onScormProgress = function (p, complete) {
      if (complete) {
        chip.textContent = '\u2713 Playbook Complete';
        chip.style.color = '#8f6d3f';
        chip.style.borderColor = '#8f6d3f';
      } else {
        chip.textContent = 'Pages viewed ' + p.viewed + ' / ' + p.total;
      }
    };

    // Render initial state.
    if (window.SCORM && window.SCORM.getProgress) {
      window.__onScormProgress(window.SCORM.getProgress(), window.SCORM.isComplete());
    }
  });
})();
