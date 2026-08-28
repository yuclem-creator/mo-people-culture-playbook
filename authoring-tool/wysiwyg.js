/* ============================================================================
   Playbook Studio — WYSIWYG click-to-edit (Level 1)
   ----------------------------------------------------------------------------
   Studio-side ONLY: loaded by authoring-tool/index.html, never by the player
   or the SCORM exports. Attaches click-to-edit behaviour INSIDE the preview
   iframe and writes edits back into the same playbook model the inspector
   forms use, then reuses the existing touch() → pushPreview → autosave path.

   Scope (Level 1): section titles + blurbs, item headings (.pb-item-head),
   s:'heading', s:'text' paragraphs (with **bold**), checklist labels, table
   header + cells, and compare (IS / IS NOT) column labels, titles and items.
   Everything else shows a hover ✎ button that opens the existing Studio form.

   Safety guards: a chapter maps DOM→model only when element counts match and
   section titles line up; rich-text fields containing [links](…) or
   [img]/[vid] figures fall back to the form; disabled for non-English preview
   languages (edits would hit the wrong overlay).
   ============================================================================ */
window.MO_WYSIWYG = (function () {
  'use strict';

  var bridge = null;      // MO_WYSIWYG_BRIDGE from editor.js
  var doc = null;         // iframe document
  var editing = null;     // { el, commit(), cancel() }
  var editedKeys = {};    // field keys edited this session → gold dot
  var toolbar = null;
  var itemEls = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;  // item object → canvas root
  var secEls = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;   // section object → canvas block

  var CSS = ''
    + '.mo-wys-ed{cursor:text;border-radius:3px;transition:box-shadow .15s,background .15s;}'
    + '.mo-wys-ed:hover{box-shadow:0 0 0 1.5px #d8c6a5;background:#fffdf6;}'
    + '.mo-wys-editing{outline:none;box-shadow:0 0 0 2px #B59060 !important;background:#fffdf6 !important;min-width:48px;min-height:1.2em;display:inline-block;caret-color:#1E1C18;}'
    + '.mo-wys-editing:empty::before{content:"Type here\\2026";color:#a89f8f;pointer-events:none;}'
    + '.mo-wys-ed:empty{min-height:2.2em;min-width:120px;display:block;cursor:text;}'
    + '.mo-wys-ed:empty::after{content:"Click to type\\2026";color:#B59060;font-size:12.5px;font-style:italic;pointer-events:none;}'
    + '.mo-wys-emptyhost{min-height:2.2em;min-width:120px;cursor:text;}'
    + '.mo-wys-emptyhost:not(.mo-wys-editing)::after{content:"Click to type\\2026";color:#B59060;font-size:12.5px;font-style:italic;pointer-events:none;}'
    + '.mo-wys-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#B59060;margin-left:7px;vertical-align:middle;}'
    + '.mo-wys-formbtn{position:absolute;top:6px;right:6px;z-index:30;border:1px solid #d8c6a5;background:#fdfcf9;color:#8a8272;'
    + 'font:500 10px/1 "Avenir Next LT Pro",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;'
    + 'padding:6px 10px;border-radius:999px;cursor:pointer;opacity:0;transition:opacity .15s;}'
    + '.mo-wys-host{position:relative;}'
    + '.mo-wys-host:hover > .mo-wys-formbtn{opacity:1;}'
    + '.mo-wys-add{position:absolute;left:6px;top:6px;z-index:31;width:22px;height:22px;border-radius:50%;border:1px solid #d8c6a5;background:#fdfcf9;color:#B59060;'
    + 'font:600 15px/20px system-ui,sans-serif;text-align:center;padding:0;cursor:pointer;opacity:.35;transition:opacity .15s,transform .15s,background .15s;}'
    + '.mo-wys-add-end{top:auto;bottom:6px;}'
    + '.mo-wys-host:hover > .mo-wys-add{opacity:1;}'
    + '.mo-wys-add:hover{background:#B59060;color:#fff;transform:scale(1.1);}'
    + '.mo-wys-del{position:absolute;left:32px;top:6px;z-index:31;width:22px;height:22px;border-radius:50%;border:1px solid #d8c6a5;background:#fdfcf9;color:#a05548;'
    + 'font:600 14px/20px system-ui,sans-serif;text-align:center;padding:0;cursor:pointer;opacity:.35;transition:opacity .15s,transform .15s,background .15s;}'
    + '.mo-wys-host:hover > .mo-wys-del{opacity:1;}'
    + '.mo-wys-del:hover{background:#a05548;color:#fff;transform:scale(1.1);}'
    + '.mo-wys-move{position:absolute;left:58px;top:6px;z-index:31;width:22px;height:22px;border-radius:50%;border:1px solid #d8c6a5;background:#fdfcf9;color:#8a8272;'
    + 'font:600 12px/20px system-ui,sans-serif;text-align:center;padding:0;cursor:grab;opacity:.35;transition:opacity .15s,transform .15s,background .15s;}'
    + '.mo-wys-host:hover > .mo-wys-move{opacity:1;}'
    + '.mo-wys-move:hover{background:#8a8272;color:#fff;transform:scale(1.1);}'
    + '.mo-wys-move:active{cursor:grabbing;}'
    + '.mo-wys-dragging{opacity:.45;}'
    + '.mo-wys-dropline{height:0;border-top:3px solid #B59060;border-radius:2px;margin:2px 0;pointer-events:none;}'
    + '.mo-wys-flash{outline:3px solid rgba(181,144,96,.55) !important;outline-offset:3px;border-radius:6px;}'
    + '.mo-wys-gap{position:absolute;left:50%;top:-11px;transform:translateX(-50%);z-index:32;height:22px;padding:0 12px;'
    + 'display:flex;align-items:center;justify-content:center;cursor:ns-resize;opacity:.35;transition:opacity .15s;}'
    + '.mo-wys-gap span{display:block;width:44px;height:6px;border-radius:3px;background:#d8c6a5;border:1px solid #B59060;}'
    + '.mo-wys-host:hover > .mo-wys-gap{opacity:1;}'
    + '.mo-wys-gap:hover span{background:#B59060;}'
    + '.mo-wys-formbtn:hover{border-color:#B59060;color:#B59060;}'
    + '.mo-wys-bar{position:absolute;z-index:40;display:none;gap:4px;background:#26221c;border-radius:6px;padding:5px;box-shadow:0 8px 24px rgba(0,0,0,.25);}'
    + '.mo-wys-bar.show{display:flex;}'
    + '.mo-wys-bar button{border:none;background:transparent;color:#e9e2d2;font:600 12px/1 "Avenir Next LT Pro",system-ui,sans-serif;'
    + 'padding:6px 9px;border-radius:4px;cursor:pointer;}'
    + '.mo-wys-bar button:hover{background:#3a352b;}';

  // ---------- helpers ----------
  function frame() { return document.getElementById('preview'); }
  function log() { try { console.log.apply(console, ['[wysiwyg]'].concat([].slice.call(arguments))); } catch (e) {} }

  function injectStyle() {
    if (doc.getElementById('mo-wys-style')) return;
    var st = doc.createElement('style');
    st.id = 'mo-wys-style';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  function hasRichSyntax(raw) {
    // Fields rendered via inlineRichHTML: bail to the form when the raw text
    // carries links or media figures we cannot round-trip through the DOM.
    return /\[(img|vid)[\s:\]]|\[g:[^\]]*\||\[[^\]\n]+\]\(https?:\/\//.test(raw || '');
  }

  // DOM → raw text for s:'text' paragraphs: <strong>/<b> → **, <br> → \n.
  function paraFromDOM(el) {
    var out = '';
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { out += c.nodeValue; continue; }
        var tag = (c.tagName || '').toLowerCase();
        if (tag === 'br') { out += '\n'; continue; }
        if (tag === 'strong' || tag === 'b') { out += '**' + c.textContent + '**'; continue; }
        walk(c);
      }
    })(el);
    return out.replace(/\u00a0/g, ' ');
  }
  function plainFromDOM(el) {
    return (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+\n/g, '\n').trim();
  }

  // ---------- edit session ----------
  function stopEditing(commit) {
    if (!editing) return;
    var s = editing; editing = null;
    hideBar();
    s.el.classList.remove('mo-wys-editing');
    s.el.contentEditable = 'false';
    if (commit) s.commit(); else s.cancel();
  }

  function startEdit(el, opts) {
    // opts: { get(), set(raw), fromDOM(el), key, rich, multiline, onCommitted }
    if (editing && editing.el === el) return;
    stopEditing(true);
    el.contentEditable = 'true';
    el.classList.add('mo-wys-editing');
    el.focus();
    try {
      var range = doc.createRange(); range.selectNodeContents(el); range.collapse(false);
      var sel = doc.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    } catch (e) {}
    if (opts.rich) showBar(el);

    var committed = false;
    editing = {
      el: el,
      commit: function () {
        if (committed) return; committed = true;
        var raw = (opts.fromDOM || plainFromDOM)(el).trim();
        var orig = String(opts.get() == null ? '' : opts.get()).trim();
        // Delete-on-empty: clearing an array-backed entry (intro paragraph,
        // blurb line, "## " heading) removes the entry entirely — this is the
        // on-canvas way to delete a heading or paragraph you added in place.
        if (raw === '' && orig !== '' && typeof opts.onEmpty === 'function') {
          opts.onEmpty();
          editedKeys[opts.key] = true;
          bridge.touch();
          if (bridge.toast) bridge.toast('Removed — saved to draft', 'ok');
          return;
        }
        if (raw !== orig) {
          opts.set(raw);
          editedKeys[opts.key] = true;
          bridge.touch();
          if (bridge.toast) bridge.toast('Edited in preview — saved to draft', 'ok');
        }
      },
      cancel: function () {
        if (committed) return; committed = true;
        renderOriginal(el, opts);
      }
    };

    el.addEventListener('blur', function () { stopEditing(true); }, { once: true });
    // NOT once:true — the first keydown may be a modifier (Ctrl/Cmd) and would
    // consume the listener before Escape/Enter ever arrives.
    el.addEventListener('keydown', function (ev) {
      if (!editing || editing.el !== el) return;
      if (ev.key === 'Escape') { ev.preventDefault(); stopEditing(false); el.blur(); }
      else if (ev.key === 'Enter' && !opts.multiline) { ev.preventDefault(); el.blur(); }
    });
  }

  function renderOriginal(el, opts) {
    // Best-effort visual restore after Esc; the next preview push repaints anyway.
    var raw = String(opts.get() == null ? '' : opts.get());
    if (opts.rich) {
      el.innerHTML = '';
      raw.split('\n').forEach(function (line, i) {
        if (i) el.appendChild(doc.createElement('br'));
        // **bold** markers back to <strong>
        var parts = line.split(/\*\*([^*]+)\*\*/g);
        parts.forEach(function (p, pi) {
          if (pi % 2) { var st = doc.createElement('strong'); st.textContent = p; el.appendChild(st); }
          else el.appendChild(doc.createTextNode(p));
        });
      });
    } else {
      el.textContent = raw;
    }
  }

  // ---------- mini toolbar (bold, for s:'text') ----------
  function ensureBar() {
    if (toolbar) return toolbar;
    toolbar = doc.createElement('div');
    toolbar.className = 'mo-wys-bar';
    var b = doc.createElement('button');
    b.innerHTML = '<b>B</b>';
    b.addEventListener('mousedown', function (ev) {
      ev.preventDefault(); // keep the selection in the editable element
      doc.execCommand('bold', false, null);
    });
    toolbar.appendChild(b);
    doc.body.appendChild(toolbar);
    return toolbar;
  }
  function showBar(el) {
    var bar = ensureBar();
    var r = el.getBoundingClientRect();
    bar.style.left = Math.max(8, r.left) + 'px';
    bar.style.top = (r.top - 44 < 8 ? r.bottom + 8 : r.top - 44) + 'px';
    bar.classList.add('show');
  }
  function hideBar() { if (toolbar) toolbar.classList.remove('show'); }

  // ---------- field attachers ----------
  function markEditable(el, opts) {
    el.classList.add('mo-wys-ed');
    el.setAttribute('data-wys', opts.key);
    if (editedKeys[opts.key] && !el.querySelector('.mo-wys-dot')) {
      var d = doc.createElement('span'); d.className = 'mo-wys-dot'; el.appendChild(d);
    }
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      startEdit(el, opts);
    });
  }

  function markFormFallback(hostEl, chId, arr, index, label) {
    if (hostEl.querySelector(':scope > .mo-wys-formbtn')) return;
    hostEl.classList.add('mo-wys-host');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'mo-wys-formbtn';
    btn.textContent = '✎ Edit ' + (label || 'element');
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      bridge.openItem(chId, arr, index);
    });
    hostEl.appendChild(btn);
  }

  // ---------- add-element handles ----------
  // Hover "+" on an item root inserts a new element at that position via the
  // Studio picker. Appended INSIDE the item root (never as a .policy-list
  // child) so the DOM↔model count guards keep passing.
  function addInsertHandle(hostEl, chId, arr, index, where) {
    if (!bridge.addElement) return;
    if (hostEl.querySelector(':scope > .mo-wys-add[data-idx="' + index + '"]')) return;
    hostEl.classList.add('mo-wys-host');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'mo-wys-add' + (where === 'end' ? ' mo-wys-add-end' : '');
    btn.setAttribute('data-idx', String(index));
    btn.title = 'Add element here';
    btn.textContent = '+';
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      stopEditing(true);
      bridge.addElement(chId, arr, index);
    });
    hostEl.appendChild(btn);
  }

  // Hover "×" on an item root deletes the whole element (with a confirm on
  // the Studio side). Sits next to the "+" insert handle.
  function addDeleteHandle(hostEl, arr, index) {
    if (!bridge.deleteElement) return;
    if (hostEl.querySelector(':scope > .mo-wys-del')) return;
    hostEl.classList.add('mo-wys-host');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'mo-wys-del';
    btn.title = 'Delete this element';
    btn.textContent = '×';
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      stopEditing(false);
      bridge.deleteElement(arr, index);
    });
    hostEl.appendChild(btn);
  }

  // Hover grip at the element's top edge: drag vertically to change the
  // space ABOVE this element (model: it.gap, px; clamped −80…240, positive
  // opens space, negative closes white space). Double-click resets to 0.
  // Live-updates the canvas during the drag, commits to the model on release.
  function addGapHandle(hostEl, it, arr, index) {
    if (!it || typeof it !== 'object') return;  // plain string items can't carry gap
    if (hostEl.querySelector(':scope > .mo-wys-gap')) return;
    hostEl.classList.add('mo-wys-host');
    var g = doc.createElement('div');
    g.className = 'mo-wys-gap';
    g.title = 'Drag to adjust the space above this element · double-click to reset';
    g.appendChild(doc.createElement('span'));
    function applyGap(elx, v) {
      if (v >= 0) { elx.style.marginTop = ''; elx.style.paddingTop = v + 'px'; }
      else { elx.style.paddingTop = ''; elx.style.marginTop = v + 'px'; }
    }
    g.addEventListener('click', function (ev) { ev.stopPropagation(); ev.preventDefault(); });
    g.addEventListener('dblclick', function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      it.gap = 0; bridge.touch();
      if (bridge.toast) bridge.toast('Spacing reset to default', 'ok');
    });
    g.addEventListener('mousedown', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      stopEditing(true);
      var startY = ev.clientY;
      var startGap = (typeof it.gap === 'number') ? it.gap : 0;
      var val = startGap, moved = false;
      function mv(e) {
        val = Math.max(-80, Math.min(240, Math.round(startGap + (e.clientY - startY))));
        moved = true;
        applyGap(hostEl, val);
      }
      function up() {
        doc.removeEventListener('mousemove', mv);
        doc.removeEventListener('mouseup', up);
        if (!moved) return;
        it.gap = val;
        bridge.touch();
        if (bridge.toast) bridge.toast(val ? 'Space above: ' + val + 'px' : 'Spacing reset to default', 'ok');
      }
      doc.addEventListener('mousemove', mv);
      doc.addEventListener('mouseup', up);
    });
    hostEl.appendChild(g);
  }

  // Hover "⠿" grip next to the × / + handles: drag vertically to reorder the
  // element within its own list. A gold drop-line shows the landing spot while
  // dragging; the model is updated on release (the preview then re-renders, so
  // every handle rebinds to the fresh indices). Elements move within their own
  // section only — moving across sections stays a panel job.
  function addMoveHandle(hostEl, arr, index) {
    if (!bridge.moveElement) return;
    if (hostEl.querySelector(':scope > .mo-wys-move')) return;
    hostEl.classList.add('mo-wys-host');
    var g = doc.createElement('button');
    g.type = 'button';
    g.className = 'mo-wys-move';
    g.title = 'Drag to move this element up or down';
    g.textContent = '⠿';
    g.addEventListener('click', function (ev) { ev.stopPropagation(); ev.preventDefault(); });
    g.addEventListener('mousedown', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      stopEditing(true);
      var parent = hostEl.parentElement;
      if (!parent) return;
      var sibs = [].slice.call(parent.children).filter(function (n) {
        return n.classList && n.classList.contains('mo-wys-item');
      });
      var from = sibs.indexOf(hostEl);
      if (from === -1 || sibs.length < 2) return;
      var rects = sibs.map(function (n) { return n.getBoundingClientRect(); });
      var line = doc.createElement('div');
      line.className = 'mo-wys-dropline';
      var to = from, moved = false;
      hostEl.classList.add('mo-wys-dragging');
      function placeLine(t) {
        if (line.parentNode) line.parentNode.removeChild(line);
        if (t >= sibs.length) {
          var last = sibs[sibs.length - 1];
          last.parentNode.insertBefore(line, last.nextSibling);
        } else {
          parent.insertBefore(line, sibs[t]);
        }
      }
      function mv(e) {
        moved = true;
        var t = sibs.length;
        for (var i = 0; i < sibs.length; i++) {
          var mid = rects[i].top + rects[i].height / 2;
          if (e.clientY < mid) { t = i; break; }
        }
        to = t;
        placeLine(t);
      }
      function up() {
        doc.removeEventListener('mousemove', mv);
        doc.removeEventListener('mouseup', up);
        hostEl.classList.remove('mo-wys-dragging');
        if (line.parentNode) line.parentNode.removeChild(line);
        if (!moved) return;
        if (to === from || to === from + 1) return;  // dropped back in place
        var target = (to > from) ? to - 1 : to;  // removal shifts later indices down
        bridge.moveElement(arr, from, target);
      }
      doc.addEventListener('mousemove', mv);
      doc.addEventListener('mouseup', up);
    });
    hostEl.appendChild(g);
  }

  // ---------- item mapping ----------
  // Inline text editing for the common interactive elements — click the text
  // in the canvas and type. Structure/lists stay in the Studio form via the
  // "Edit interaction" button, which is still added below.
  function attachIxInline(body, it2, chId, arr, index, keyBase) {
    if (it2.kind === 'flipcards') {
      var fcards = Array.isArray(it2.cards) ? it2.cards : [];
      var cardEls = body.querySelectorAll('.ixfc-card');
      if (cardEls.length !== fcards.length) return;
      for (var fi = 0; fi < cardEls.length; fi++) {
        (function (cardEl, c, ii) {
          if (!c || typeof c !== 'object') return;
          var t = cardEl.querySelector('.ixfc-title');
          if (t) markEditable(t, { key: keyBase + ':fc' + ii + 't', rich: false, multiline: false,
            get: function () { return c.title || ''; }, set: function (v) { c.title = v; } });
          var bl = cardEl.querySelector('.ixfc-backlabel');
          if (bl) markEditable(bl, { key: keyBase + ':fc' + ii + 'bl', rich: false, multiline: false,
            get: function () { return c.backLabel || ''; }, set: function (v) { c.backLabel = v; } });
          var bk = cardEl.querySelector('.ixfc-backtext');
          if (bk) markEditable(bk, { key: keyBase + ':fc' + ii + 'b', rich: false, multiline: true,
            get: function () { return c.back || ''; }, set: function (v) { c.back = v; } });
        })(cardEls[fi], fcards[fi], fi);
      }
      return;
    }
    if (it2.kind === 'processflow') {
      var psteps = Array.isArray(it2.steps) ? it2.steps : [];
      var pills = body.querySelectorAll('.ixpf-step');
      var dets = body.querySelectorAll('.ixpf-detail');
      if (pills.length !== psteps.length) return;
      for (var pi = 0; pi < psteps.length; pi++) {
        (function (c, ii) {
          if (!c || typeof c !== 'object') return;
          var pill = pills[ii], det = dets[ii];
          var nm = pill && pill.querySelector('.ixpf-step-name');
          if (nm) markEditable(nm, { key: keyBase + ':pf' + ii + 'l', rich: false, multiline: false,
            get: function () { return c.label || ''; }, set: function (v) { c.label = v; } });
          var ps = pill && pill.querySelector('.ixpf-step-sub');
          if (ps) markEditable(ps, { key: keyBase + ':pf' + ii + 's', rich: false, multiline: false,
            get: function () { return c.sub || ''; }, set: function (v) { c.sub = v; } });
          var dt = det && det.querySelector('.ixpf-d-title');
          if (dt) markEditable(dt, { key: keyBase + ':pf' + ii + 't', rich: false, multiline: false,
            get: function () { return c.title || c.label || ''; }, set: function (v) { c.title = v; } });
          var dx = det && det.querySelector('.ixpf-d-text');
          if (dx) markEditable(dx, { key: keyBase + ':pf' + ii + 'x', rich: false, multiline: true,
            get: function () { return c.text || ''; }, set: function (v) { c.text = v; } });
        })(psteps[pi], pi);
      }
      return;
    }
    if (it2.kind === 'stagebar') {
      var sbStages = Array.isArray(it2.stages) ? it2.stages : [];
      var ticks = body.querySelectorAll('.ixsb-stage');
      var subHead = body.querySelector('.ixsb-sub-head');
      if (subHead) markEditable(subHead, { key: keyBase + ':sb:sub', rich: false, multiline: false,
        get: function () { return it2.sub || ''; }, set: function (v) { it2.sub = v; } });
      if (ticks.length !== sbStages.length) return;
      for (var si = 0; si < ticks.length; si++) {
        (function (c, ii) {
          if (!c || typeof c !== 'object') return;
          var lb = ticks[ii].querySelector('.ixsb-lbl');
          if (lb) markEditable(lb, { key: keyBase + ':sb' + ii + 'l', rich: false, multiline: false,
            get: function () { return c.label || ''; }, set: function (v) { c.label = v; } });
          var du = ticks[ii].querySelector('.ixsb-dur');
          if (du) markEditable(du, { key: keyBase + ':sb' + ii + 'd', rich: false, multiline: false,
            get: function () { return c.dur || ''; }, set: function (v) { c.dur = v; } });
          var tx = ticks[ii].querySelector('.ixsb-sub');
          if (tx) markEditable(tx, { key: keyBase + ':sb' + ii + 't', rich: false, multiline: false,
            get: function () { return c.text || ''; }, set: function (v) { c.text = v; } });
        })(sbStages[si], si);
      }
      return;
    }
    if (it2.kind === 'stepper') {
      var stSteps = Array.isArray(it2.steps) ? it2.steps : [];
      var card = body.querySelector('.ix2st-card');
      if (card) {
        var sIdx = parseInt(card.getAttribute('data-step-i') || '0', 10) || 0;
        var cs = stSteps[sIdx];
        if (cs && typeof cs === 'object') {
          var stT = card.querySelector('.ix2st-t');
          if (stT) markEditable(stT, { key: keyBase + ':st' + sIdx + 't', rich: false, multiline: false,
            get: function () { return cs.t || ''; }, set: function (v) { cs.t = v; } });
          var stD = card.querySelector('.ix2st-d');
          if (stD) markEditable(stD, { key: keyBase + ':st' + sIdx + 'd', rich: false, multiline: true,
            get: function () { return cs.d || ''; }, set: function (v) { cs.d = v; } });
        }
      }
      // Previous / Next re-renders the card — re-attach inline editing to the
      // fresh card once the new step is drawn.
      var navBtns = body.querySelectorAll('.ix2st-nav .ix2st-btn');
      for (var nb = 0; nb < navBtns.length; nb++) {
        if (navBtns[nb].getAttribute('data-wys-reattach')) continue;
        navBtns[nb].setAttribute('data-wys-reattach', '1');
        navBtns[nb].addEventListener('click', function () {
          setTimeout(function () { attachItem(body, { s: 'ix', kind: 'stepper', steps: stSteps, name: it2.name, head: it2.head, sub: it2.sub }, chId, arr, index, keyBase); }, 90);
        });
      }
      return;
    }
  }

  function attachItem(rootEl, it, chId, arr, index, keyBase) {
    if (!it || typeof it !== 'string' && !it.s) return;
    var it2 = typeof it === 'string' ? { s: 'policy', text: it } : it;
    rootEl.classList.add('mo-wys-item');
    addDeleteHandle(rootEl, arr, index);
    addGapHandle(rootEl, it, arr, index);
    addMoveHandle(rootEl, arr, index);
    // Panel 2.1: register for panel→canvas flash; clicking the element's
    // chrome (non-editable area) opens its form in the panel. Editable text
    // and the +/×/↕ handles stopPropagation, so they never reach this.
    if (it && typeof it === 'object' && itemEls) itemEls.set(it, rootEl);
    rootEl.addEventListener('click', function (ev) {
      if (ev.defaultPrevented) return;
      // Editable text starts editing instead (its click stops propagation;
      // this guard also covers the case where rootEl itself is the surface).
      if (ev.target.closest && ev.target.closest('.mo-wys-ed, .mo-wys-editing, input, textarea, select, video, audio, a, button')) return;
      stopEditing(true);
      bridge.openItem(chId, arr, index);
    });

    // Optional element heading (.pb-item-head wraps the body in .pb-item).
    var head = rootEl.querySelector(':scope > .pb-item-head');
    if (head && !Array.isArray(it2.head)) {
      (function (h) {
        markEditable(h, {
          key: keyBase + ':head', rich: false, multiline: false,
          get: function () { return it2.head || ''; },
          set: function (v) { it2.head = v; }
        });
      })(head);
    }
    var body = head ? rootEl : rootEl; // body root is the same element either way

    if (it2.s === 'heading') {
      var h2 = body.querySelector('.pb-heading-text');
      if (h2) markEditable(h2, {
        key: keyBase + ':text', rich: false, multiline: false,
        get: function () { return it2.text || ''; },
        set: function (v) { it2.text = v; }
      });
      var sub = body.querySelector('.pb-heading-sub');
      if (sub) markEditable(sub, {
        key: keyBase + ':sub', rich: false, multiline: false,
        get: function () { return it2.sub || ''; },
        set: function (v) { it2.sub = v; }
      });
      return;
    }

    if (it2.s === 'text') {
      var paras = String(it2.text || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      var ps = body.querySelectorAll('.pb-text > p');
      if (!paras.length) {
        // Empty text element: the whole host becomes a click-to-type surface.
        // fromDOM strips the overlay buttons ("+", form button) that live on
        // the same node so their labels never leak into the content.
        var emptyText = (body.matches && body.matches('.pb-text')) ? body : body.querySelector('.pb-text');
        if (emptyText) markEditable(emptyText, {
          key: keyBase + ':text', rich: false, multiline: true,
          fromDOM: function (el) {
            var c = el.cloneNode(true);
            [].slice.call(c.querySelectorAll('.mo-wys-add, .mo-wys-formbtn, .mo-wys-dot, .mo-wys-del, .mo-wys-move, .mo-wys-gap')).forEach(function (n) { n.parentNode.removeChild(n); });
            return (c.textContent || '').replace(/\u00a0/g, ' ').trim();
          },
          get: function () { return String(it2.text || ''); },
          set: function (v) { if (typeof it === 'string') arr[index] = v; else it2.text = v; }
        });
        if (emptyText) emptyText.classList.add('mo-wys-emptyhost');
        return;
      }
      if (ps.length === paras.length) {
        for (var i = 0; i < ps.length; i++) {
          (function (pEl, pi) {
            markEditable(pEl, {
              key: keyBase + ':p' + pi, rich: true, multiline: true,
              fromDOM: paraFromDOM,
              get: function () { return paras[pi]; },
              set: function (v) {
                paras[pi] = v;
                it2.text = paras.join('\n\n');
              }
            });
          })(ps[i], i);
        }
      }
      return;
    }

    if (it2.s === 'callout') {
      // Note box / knowledge tip: label + rich text, both editable in place.
      var cLabel = body.querySelector('.pb-callout-label');
      if (cLabel) markEditable(cLabel, {
        key: keyBase + ':label', rich: false, multiline: false,
        get: function () { return it2.label || ''; },
        set: function (v) { it2.label = v; }
      });
      var cText = body.querySelector('.pb-callout-text');
      if (cText && !hasRichSyntax(String(it2.text || ''))) {
        markEditable(cText, {
          key: keyBase + ':text', rich: true, multiline: true,
          fromDOM: paraFromDOM,
          get: function () { return String(it2.text || ''); },
          set: function (v) { it2.text = v; }
        });
      }
      return;
    }

    if (it2.s === 'checklist') {
      var rows = body.querySelectorAll('.pb-check');
      var items = Array.isArray(it2.items) ? it2.items : [];
      if (rows.length === items.length) {
        for (var ci = 0; ci < rows.length; ci++) {
          (function (row, c, ii) {
            if (!c || typeof c !== 'object' || c.url || c.note) return; // links/notes stay in the form
            var label = row.querySelector('.pb-check-text > span');
            if (!label) return;
            markEditable(label, {
              key: keyBase + ':item' + ii, rich: false, multiline: false,
              get: function () { return c.label || ''; },
              set: function (v) { c.label = v; }
            });
          })(rows[ci], items[ci], ci);
        }
      }
      return;
    }

    if (it2.s === 'table') {
      var ths = body.querySelectorAll('.pb-table thead th');
      var heads = Array.isArray(it2.head) ? it2.head : [];
      if (ths.length === heads.length) {
        for (var hi = 0; hi < ths.length; hi++) {
          (function (cell, i) {
            if (hasRichSyntax(heads[i])) return;
            markEditable(cell, {
              key: keyBase + ':th' + i, rich: false, multiline: false,
              get: function () { return heads[i] || ''; },
              set: function (v) { heads[i] = v; }
            });
          })(ths[hi], hi);
        }
      }
      var trs = body.querySelectorAll('.pb-table tbody tr');
      var rows2 = Array.isArray(it2.rows) ? it2.rows : [];
      if (trs.length === rows2.length) {
        for (var r = 0; r < trs.length; r++) {
          var tds = trs[r].querySelectorAll('td');
          var rowArr = Array.isArray(rows2[r]) ? rows2[r] : [rows2[r]];
          if (tds.length !== rowArr.length) continue;
          for (var c2 = 0; c2 < tds.length; c2++) {
            (function (cell, ra, ri, cj) {
              if (hasRichSyntax(String(ra[cj] || ''))) return;
              markEditable(cell, {
                key: keyBase + ':r' + ri + 'c' + cj, rich: false, multiline: true,
                get: function () { return String(ra[cj] == null ? '' : ra[cj]); },
                set: function (v) { ra[cj] = v; }
              });
            })(tds[c2], rowArr, r, c2);
          }
        }
      }
      return;
    }

    if (it2.s === 'ix' && it2.kind === 'compare') {
      var cols = Array.isArray(it2.cols) ? it2.cols : [];
      var colEls = body.querySelectorAll('.ixcp-col');
      if (colEls.length === Math.min(cols.length, 2) && cols.length) {
        for (var k = 0; k < colEls.length; k++) {
          (function (colEl, col, kk) {
            var eb = colEl.querySelector('.ixcp-eyebrow');
            if (eb) markEditable(eb, {
              key: keyBase + ':col' + kk + 'label', rich: false, multiline: false,
              get: function () { return col.label || ''; },
              set: function (v) { col.label = v; }
            });
            var tt = colEl.querySelector('.ixcp-title');
            if (tt) markEditable(tt, {
              key: keyBase + ':col' + kk + 'title', rich: false, multiline: false,
              get: function () { return col.title || ''; },
              set: function (v) { col.title = v; }
            });
            var lis = colEl.querySelectorAll('.ixcp-item');
            var citems = Array.isArray(col.items) ? col.items : [];
            if (lis.length === citems.length) {
              for (var li = 0; li < lis.length; li++) {
                (function (liEl, ii) {
                  var raw = typeof citems[ii] === 'string' ? citems[ii] : (citems[ii] && citems[ii].text) || '';
                  if (hasRichSyntax(raw)) return;
                  var span = liEl.querySelector('span:last-child');
                  if (!span) return;
                  markEditable(span, {
                    key: keyBase + ':col' + kk + 'item' + ii, rich: false, multiline: false,
                    get: function () { return raw; },
                    set: function (v) {
                      if (typeof citems[ii] === 'string') citems[ii] = v;
                      else if (citems[ii] && typeof citems[ii] === 'object') citems[ii].text = v;
                    }
                  });
                })(lis[li], li);
              }
            }
          })(colEls[k], cols[k], k);
        }
      }
      return;
    }

    if (it2.s === 'tasklist') {
      // Rows map 1:1 to it.items (the gate row carries data-gate-row and is
      // excluded). Action text + note edit in place; the row's expand-on-tap
      // behaviour is suppressed on the editable spans via stopPropagation.
      var trows = body.querySelectorAll('.pb-task:not([data-gate-row])');
      var titems = Array.isArray(it2.items) ? it2.items : [];
      if (trows.length === titems.length) {
        for (var ti = 0; ti < trows.length; ti++) {
          (function (row, c, ii) {
            if (!c || typeof c !== 'object') return;
            var act = row.querySelector('.pb-task-act');
            if (act && !hasRichSyntax(String(c.text || ''))) {
              markEditable(act, {
                key: keyBase + ':task' + ii, rich: true, multiline: false,
                fromDOM: paraFromDOM,
                get: function () { return String(c.text || ''); },
                set: function (v) { c.text = v; }
              });
            }
            var note = row.querySelector('.pb-task-note');
            if (note && !hasRichSyntax(String(c.note || ''))) {
              markEditable(note, {
                key: keyBase + ':tasknote' + ii, rich: true, multiline: true,
                fromDOM: paraFromDOM,
                get: function () { return String(c.note || ''); },
                set: function (v) { c.note = v; }
              });
            }
          })(trows[ti], titems[ti], ti);
        }
      }
      // Sign-off gate line (plain text) edits in place too.
      var gate = body.querySelector('.pb-task[data-gate-row] .pb-task-act');
      if (gate && String(it2.gateText || '').indexOf('<') === -1 && String(it2.gateText || '').trim()) {
        markEditable(gate, {
          key: keyBase + ':gate', rich: false, multiline: false,
          get: function () { return it2.gateText || ''; },
          set: function (v) { it2.gateText = v; }
        });
      }
      return;
    }

    // Interactive elements: wire click-to-edit text on the canvas first…
    if (it2.s === 'ix') attachIxInline(body, it2, chId, arr, index, keyBase);
    // …and keep the hover shortcut to the full Studio form for everything.
    markFormFallback(body, chId, arr, index, labelFor(it2));
  };

  function labelFor(it) {
    if (it.s === 'ix') return 'interaction';
    if (it.s === 'video') return 'video';
    if (it.s === 'image') return 'image';
    return 'element';
  }

  // ---------- chapter mapping ----------
  // Attach one rendered .policy-section block to its model section
  // (title + blurb paragraphs + items), with title/count guards.
  function attachSectionBlock(secEl, sec, keyBase, chId) {
    if (sec && typeof sec === 'object' && secEls) secEls.set(sec, secEl);
    var h3 = secEl.querySelector('.policy-section-header h3');
    if (h3) markEditable(h3, {
      key: keyBase + ':title', rich: false, multiline: false,
      get: function () { return sec.title || ''; },
      set: function (v) { sec.title = v; }
    });

    // Blurb paragraphs AND "## " heading lines (skip ones with links/figures;
    // note chunked layouts interleave quotes/grids — paragraph ORDER is still
    // source order). Headings render as h4.pb-para-h, so count both.
    var blurbArr = Array.isArray(sec.blurb) ? sec.blurb : (sec.blurb && String(sec.blurb).trim() ? [String(sec.blurb)] : []);
    var bps = secEl.querySelectorAll('.policy-section-blurb > p, .policy-section-blurb > h4.pb-para-h');
    if (bps.length === blurbArr.length) {
      for (var bi = 0; bi < bps.length; bi++) {
        (function (pEl, pi) {
          if (hasRichSyntax(blurbArr[pi])) return;
          var isH = /^##\s+/.test(String(blurbArr[pi]));
          if (isH && !pEl.classList.contains('pb-para-h')) return;
          if (!isH && pEl.tagName !== 'P') return;
          markEditable(pEl, {
            key: keyBase + ':blurb' + pi, rich: false, multiline: !isH,
            get: function () { return isH ? String(blurbArr[pi]).replace(/^##\s+/, '') : blurbArr[pi]; },
            set: function (v) {
              var nv = isH ? '## ' + v : v;
              if (Array.isArray(sec.blurb)) sec.blurb[pi] = nv;
              else sec.blurb = nv;
              blurbArr[pi] = nv;
            },
            onEmpty: function () {
              if (Array.isArray(sec.blurb)) { sec.blurb.splice(pi, 1); blurbArr.splice(pi, 1); }
              else { sec.blurb = ''; blurbArr = []; }
            }
          });
        })(bps[bi], bi);
      }
    }

    // Items: .policy-list children map 1:1 to sec.items. A section with NO
    // items yet (intro-only) still gets an insert handle on the section block
    // itself, so a first element (e.g. a heading) can be added on-canvas.
    var list = secEl.querySelector('.policy-list');
    if (!Array.isArray(sec.items)) sec.items = [];
    var items = sec.items;
    if (!list || !items.length) {
      addInsertHandle(secEl, chId, items, 0, 'end');
      return;
    }
    var kids = [].slice.call(list.children);
    if (kids.length !== items.length) return;
    kids.forEach(function (kid, ii) {
      addInsertHandle(kid, chId, items, ii);
      attachItem(kid, items[ii], chId, items, ii, keyBase + ':it' + ii);
    });
    addInsertHandle(kids[kids.length - 1], chId, items, items.length, 'end');
  }

  // Map a set of rendered .policy-section blocks to a model sections array;
  // returns true when alignment was verified and blocks were attached.
  // Section / sub intro paragraphs (body.intro — strings or {text,size,font}
  // objects) editable in place. Rendered paragraphs are matched to entries by
  // their text so the lead/bullet regrouping in subIntroHTML can't break the map.
  function attachIntro(introEl, bodyObj, keyBase) {
    if (!introEl || !bodyObj) return;
    var entries = Array.isArray(bodyObj.intro) ? bodyObj.intro : [];
    if (!entries.length) return;
    var nodes = [].slice.call(introEl.querySelectorAll('p, li, h4.pb-para-h'));
    var used = [];
    entries.forEach(function (entry, ei) {
      var raw = String(entry && typeof entry === 'object' ? (entry.text || '') : entry);
      var isH = typeof entry === 'string' && /^##\s+/.test(entry);
      var txt = (isH ? raw.replace(/^##\s+/, '') : raw).trim();
      if (!txt) return;
      var node = null, nodeIdx = -1;
      for (var ni = 0; ni < nodes.length; ni++) {
        if (used.indexOf(ni) !== -1) continue;
        if (isH !== (nodes[ni].tagName === 'H4')) continue;
        if (nodes[ni].textContent.trim() === txt) { node = nodes[ni]; nodeIdx = ni; break; }
      }
      if (!node) return;
      used.push(nodeIdx);
      markEditable(node, {
        key: keyBase + ':intro' + ei, rich: false, multiline: !isH,
        get: function () { return isH ? raw.replace(/^##\s+/, '') : raw; },
        set: function (v) {
          if (!isH && entry && typeof entry === 'object') entry.text = v;
          else entries[ei] = isH ? '## ' + v : v;
        },
        onEmpty: function () { entries.splice(ei, 1); }
      });
    });
  }

  function attachSectionSet(secEls, sections, keyPrefix, chId) {
    if (secEls.length !== sections.length) return false;
    for (var v = 0; v < secEls.length; v++) {
      var h3 = secEls[v].querySelector('.policy-section-header h3');
      var want = String(sections[v].title || '').trim();
      if (h3 && want && h3.textContent.trim() !== want) return false;
    }
    secEls.forEach(function (secEl, si) {
      attachSectionBlock(secEl, sections[si], keyPrefix + si, chId);
    });
    return true;
  }

  function attachChapter(chEl) {
    var chId = chEl.id;
    if (!chId) return;
    var pb = bridge.pb();
    var ch = (pb.chapters || []).filter(function (c) { return c.id === chId; })[0];
    if (!ch) return;
    var body = bridge.bodyForChapter(ch);
    var sections = Array.isArray(body.sections) ? body.sections : [];
    var subs = Array.isArray(ch.subs) ? ch.subs : [];
    var isPart = subs.length > 0;

    // Section blocks, in render order. On part chapters, blocks nested inside
    // a sub spread (.part-section/.part-topic/.part-sub) belong to that sub's
    // own body, not to the chapter body — split the two sets apart.
    var allSecEls = [].slice.call(chEl.querySelectorAll('.policy-section'));
    var secEls = isPart
      ? allSecEls.filter(function (el) { return !el.closest('.part-section, .part-topic, .part-sub'); })
      : allSecEls;
    if (!isPart && secEls.length !== sections.length) return; // bespoke layout — bail
    attachSectionSet(secEls, sections, chId + ':sec', chId);
    var chIntro = [].slice.call(chEl.querySelectorAll('.sub-intro'))
      .filter(function (el) { return !el.closest('.part-section, .part-topic, .part-sub'); })[0];
    attachIntro(chIntro, body, chId);
    // Chapter-intro add handle: inserts into the chapter body's top-level
    // items, created lazily so intro-only chapters stay clean. Part chapters
    // get it too — their chapter body (intro + items + sections) renders
    // above the sub-topic spreads.
    if (chIntro) {
      addInsertHandle(chIntro, chId, function () {
        if (!Array.isArray(body.items)) body.items = [];
        return body.items;
      }, 0);
    }

    // Part chapter: each sub renders as its own anchored spread
    // (div.spread.tight.part-*#subId) holding the sub's body sections.
    if (isPart) {
      subs.forEach(function (sub, ui) {
        var subEl = null;
        try { subEl = chEl.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(sub.id) : sub.id)); } catch (e) { subEl = doc.getElementById(sub.id); }
        if (!subEl) return;
        var sBody = bridge.bodyForChapter({ id: sub.id });
        var sSections = Array.isArray(sBody.sections) ? sBody.sections : [];
        var sEls = [].slice.call(subEl.querySelectorAll('.policy-section'));
        attachSectionSet(sEls, sSections, chId + ':' + sub.id + ':sec', chId);
        attachIntro(subEl.querySelector('.sub-intro'), sBody, chId + ':' + sub.id);
        // Add-element handle on the sub's intro/eyebrow area: inserts at the
        // start of the sub's first section, lazily creating that section only
        // if the author actually adds something (subs with intro text only
        // previously had no way to add elements on-canvas at all).
        var subHost = subEl.querySelector('.sub-intro') || subEl.querySelector('.section-eyebrow');
        if (subHost) {
          addInsertHandle(subHost, chId, function () {
            var b = bridge.bodyForChapter({ id: sub.id });
            b.sections = Array.isArray(b.sections) ? b.sections : (b.sections = []);
            if (!b.sections.length) b.sections.push({ num: '', title: '', items: [] });
            if (!Array.isArray(b.sections[0].items)) b.sections[0].items = [];
            return b.sections[0].items;
          }, 0);
        }
        // Sub label in the eyebrow is editable in place.
        var lbl = subEl.querySelector('.section-eyebrow .txt');
        if (lbl) markEditable(lbl, {
          key: chId + ':sub' + ui + ':label', rich: false, multiline: false,
          get: function () { return sub.label || ''; },
          set: function (v) { sub.label = v; }
        });
      });
    }

    // Chapter opener header: title / sub / eyebrow edit in place. Each value
    // may come from a PB.prose override (ch{n}.opener.*) or from the chapter
    // fields — write back to whichever source the renderer actually used.
    // Values containing markup (e.g. <br>-formatted titles) are skipped.
    (function () {
      var prefix = chId.replace('ch-', 'ch');
      var prose = (pb && pb.prose) || {};
      function srcOf(suffix, chapterVal) {
        var k = prefix + '.opener.' + suffix;
        var has = prose[k] !== undefined && prose[k] !== null && String(prose[k]).trim() !== '';
        return { key: k, prose: has, val: has ? String(prose[k]) : String(chapterVal == null ? '' : chapterVal) };
      }
      function markOpener(sel, suffix, chapterVal, keyName) {
        var elx = chEl.querySelector(sel);
        if (!elx) return;
        var s = srcOf(suffix, chapterVal);
        if (!s.val.trim() || s.val.indexOf('<') !== -1) return;
        markEditable(elx, {
          key: chId + ':opener:' + keyName, rich: false, multiline: false,
          get: function () { return s.val; },
          set: function (v) {
            if (s.prose) prose[s.key] = v;
            else if (keyName === 'title') ch.label = v;
            else if (keyName === 'sub') ch.opener = v;
            else prose[s.key] = v;
            s.val = v;
          }
        });
      }
      markOpener('.opener-title', 'title', ch.label, 'title');
      markOpener('.opener-sub', 'sub', ch.opener, 'sub');
      markOpener('.opener-eyebrow', 'eyebrow', '', 'eyebrow');
    })();

    // Chapter-level content elements: item roots are the element children of
    // the spread that precede the first .policy-section (after the intro).
    // A chapter with NO chapter-level items yet still offers an insert handle
    // on the spread (not on part chapters — their content lives in the subs).
    var items0 = Array.isArray(body.items) ? body.items : (body.items = []);
    if (!items0.length && !isPart) {
      var spread0 = secEls.length ? secEls[0].parentElement : chEl.querySelector('.spread');
      if (spread0 && !spread0.classList.contains('part-section') && !spread0.classList.contains('part-topic') && !spread0.classList.contains('part-sub')) {
        addInsertHandle(spread0, chId, items0, 0, 'end');
      }
    }
    if (items0.length) {
      var spread = secEls.length ? secEls[0].parentElement
        : chEl.querySelector('.spread');
      if (spread) {
        var stopAt = secEls.length ? secEls[0] : null;
        var before = [];
        for (var n = spread.firstElementChild; n && n !== stopAt; n = n.nextElementSibling) {
          if (isPart && /(^|\s)part-(section|topic|sub)(\s|$)/.test(n.className || '')) break;
          before.push(n);
        }
        if (!stopAt && !isPart) before = [].slice.call(spread.children);
        var roots = before.slice(before.length - items0.length);
        if (roots.length === items0.length) {
          roots.forEach(function (kid, ii) {
            addInsertHandle(kid, chId, items0, ii);
            attachItem(kid, items0[ii], chId, items0, ii, chId + ':citem' + ii);
          });
          addInsertHandle(roots[roots.length - 1], chId, items0, items0.length, 'end');
        }
      }
    }
  }

  // ---------- public ----------
  var _retries = 0;
  var _wipeObserver = null;
  var _wipeTimer = null;
  function armWipeWatch() {
    // Any full re-render wipes our data-wys bindings. Most renders announce
    // themselves via preview-ready, but not all paths do on slow loads — so
    // watch the DOM: if every binding disappears while chapters exist,
    // re-attach (debounced; the guard makes it loop-safe).
    if (_wipeObserver) _wipeObserver.disconnect();
    if (typeof MutationObserver === 'undefined' || !doc || !doc.body) return;
    _wipeObserver = new MutationObserver(function () {
      if (_wipeTimer) return;
      _wipeTimer = setTimeout(function () {
        _wipeTimer = null;
        try {
          if (!doc || !doc.querySelectorAll) return;
          if (doc.querySelectorAll('section.chapter').length &&
              doc.querySelectorAll('[data-wys]').length === 0) {
            log('bindings wiped — re-attaching');
            reattach();
          }
        } catch (e) {}
      }, 800);
    });
    _wipeObserver.observe(doc.body, { childList: true, subtree: true });
  }
  function reattach(br) {
    bridge = br || bridge;
    if (!bridge) return;
    if (bridge.previewLang && bridge.previewLang() !== 'en') return; // overlays: form-only
    var f = frame();
    if (!f || !f.contentDocument) return;
    doc = f.contentDocument;
    toolbar = null;
    injectStyle();
    var chapters = doc.querySelectorAll('section.chapter');
    for (var i = 0; i < chapters.length; i++) {
      try { attachChapter(chapters[i]); } catch (e) { log('attach failed for', chapters[i].id, e); }
    }
    log('attached to', chapters.length, 'chapters');
    // A late re-render (cloud load, second push) can wipe the bindings after
    // this attach without another preview-ready reaching us. If nothing bound,
    // retry a few times — cheap and idempotent.
    var marks = doc.querySelectorAll('[data-wys]').length;
    if (marks === 0 && chapters.length && _retries < 4) {
      _retries++;
      setTimeout(function () { reattach(); }, 1200);
    } else if (marks > 0) {
      _retries = 0;
    }
    armWipeWatch();
  }

  // Panel ↔ canvas sync: flash the canvas block a panel selection is editing.
  function flashEl(elx) {
    if (!elx || !elx.scrollIntoView) return;
    try { elx.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    elx.classList.add('mo-wys-flash');
    setTimeout(function () { elx.classList.remove('mo-wys-flash'); }, 1400);
  }
  window.MO_WYS_FLASH_ITEM = function (it) { if (it && itemEls) flashEl(itemEls.get(it)); };
  window.MO_WYS_FLASH_SEC = function (sec) { if (sec && secEls) flashEl(secEls.get(sec)); };

  return { reattach: reattach };
})();
