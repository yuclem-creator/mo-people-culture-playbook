/* ============================================================================
   ask.js — "Query the Playbook" (retrieval-only)
   ----------------------------------------------------------------------------
   Adds an entry screen with two paths — Query the Playbook / Read the
   Playbook — and an on-device query panel for the SCORM output (also used by
   the web player and Studio preview, since they share this renderer).

   Retrieval-only by design:
     · Every answer is a verbatim passage from THIS playbook, with its
       chapter/section citation and a "jump to section" link.
     · No AI, no network calls, nothing leaves the learner's machine.
     · If nothing matches, it says so and points to the P&C Director —
       it never improvises HR advice.

   Set window.MO_ASK = false before this script loads to disable it entirely.
   ============================================================================ */
(function (global) {
  'use strict';
  if (global.MO_ASK === false) return;

  var STOPWORDS = ('a an the is are was were be been being am do does did done have has had having ' +
    'i we you he she it they them their his her its our your my me us him who whom whose what which ' +
    'when where why how should would could can will shall may might must of to in on at by for with ' +
    'about against between into through during before after above below under over and or but if ' +
    'then than so such as not no nor too very just only own same this that these those there here ' +
    'any all both each few more most other some one two also tell know need want get give take make').split(' ');

  var STOP = {};
  STOPWORDS.forEach(function (w) { STOP[w] = true; });

  var INDEX = [];
  var PB = null;

  /* ---- indexing ---------------------------------------------------------- */

  function txt(v) { return Array.isArray(v) ? v.map(itemText).join(' ') : itemText(v); }

  function looksLikeFile(s) { return /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm)$/i.test(String(s || '').trim()); }

  // Items may be plain strings or resource objects like { s, name, url }.
  function itemText(it) {
    if (it == null) return '';
    if (typeof it === 'string') return looksLikeFile(it) ? '' : it;
    if (typeof it === 'object') {
      var parts = [];
      ['name', 'h', 'b', 't', 'd', 'title', 'text', 'label', 'desc', 'quote', 'by'].forEach(function (k) {
        if (typeof it[k] === 'string' && it[k] && !looksLikeFile(it[k])) parts.push(it[k]);
      });
      if (!parts.length) {
        Object.keys(it).forEach(function (k) {
          var v = it[k];
          if (typeof v === 'string' && v && k !== 'url' && k !== 's' && !looksLikeFile(v)) parts.push(v);
        });
      }
      return parts.join(' ');
    }
    return String(it);
  }

  function addPassage(p) {
    if (!p || !p.title && !p.body) return;
    p.searchTitle = (p.title || '').toLowerCase();
    p.searchBody = (p.body || '').toLowerCase();
    INDEX.push(p);
  }

  function addSections(chapterId, chapterLabel, subId, subLabel, sections) {
    (sections || []).forEach(function (sec, i) {
      addPassage({
        chapterId: chapterId, chapterLabel: chapterLabel,
        subId: subId || null, subLabel: subLabel || null,
        secIndex: i,
        title: (sec.num ? sec.num + ' ' : '') + (sec.title || ''),
        body: [txt(sec.blurb), txt(sec.intro), txt(sec.transition_pre), txt(sec.transition_body),
               txt(sec.items), txt(sec.feature_quote)].join(' '),
        excerptFrom: (sec.items && sec.items.length ? txt(sec.items) : txt(sec.blurb)) || sec.title
      });
    });
  }

  function buildIndex(pb) {
    INDEX = [];
    PB = pb || {};
    var chapters = PB.chapters || [];
    var lcContent = PB.lifecycleContent || global.LIFECYCLE_CONTENT || {};
    var ch4 = PB.ch4 || global.CH4_CONTENT || { sections: [] };
    var ch5 = PB.ch5 || global.CH5_CONTENT || { sections: [] };
    var sectionBodies = PB.sectionBodies || {};
    var menuDesc = PB.menuDesc || {};
    var prose = PB.prose || {};

    chapters.forEach(function (ch) {
      if (ch.id === 'cover' || ch.id === 'intro' || ch.id === 'menu') return;
      var prefix = String(ch.id).replace('ch-', 'ch');
      var openerText = looksLikeFile(ch.opener) ? '' : (ch.opener || '');
      addPassage({
        chapterId: ch.id, chapterLabel: ch.label, subId: null, secIndex: -1,
        title: (ch.numeral ? 'Chapter ' + ch.numeral + ' — ' : '') + (ch.label || ''),
        body: [openerText, menuDesc[ch.id] || '', prose[prefix + '.opener.title'] || '',
               prose[prefix + '.opener.sub'] || '', prose[prefix + '.opener.eyebrow'] || ''].join(' '),
        excerptFrom: openerText || menuDesc[ch.id] || ch.label
      });

      var type = ch.type || (ch.hasSubs ? 'lifecycle' : (ch.id === 'ch-2' ? 'directory' : 'standard'));
      if (type === 'lifecycle') {
        (PB.lifecycle || []).forEach(function (sub) {
          var lc = lcContent[sub.id] || { sections: [] };
          addPassage({
            chapterId: ch.id, chapterLabel: ch.label, subId: sub.id, subLabel: sub.label, secIndex: -1,
            title: (sub.letter ? sub.letter + '. ' : '') + (sub.label || ''),
            body: txt(sub.lede), excerptFrom: txt(sub.lede) || sub.label
          });
          addSections(ch.id, ch.label, sub.id, sub.label, lc.sections);
        });
      } else if (type === 'directory') {
        (PB.seniorMgmt || []).concat(PB.pcLeaders || []).forEach(function (p) {
          addPassage({
            chapterId: ch.id, chapterLabel: ch.label, subId: null, secIndex: -1,
            title: p.name + ' — ' + (p.role || ''), body: p.role || '', excerptFrom: p.name + ', ' + (p.role || '')
          });
        });
        (PB.beliefs || []).forEach(function (b, i) {
          addPassage({
            chapterId: ch.id, chapterLabel: ch.label, subId: null, secIndex: i,
            title: b.label || '', body: [txt(b.blurb), txt(b.detail)].join(' '),
            excerptFrom: txt(b.blurb) || b.label
          });
        });
      } else {
        var body = ch.id === 'ch-4' ? ch4 : ch.id === 'ch-5' ? ch5 : (sectionBodies[ch.id] || { sections: [] });
        addSections(ch.id, ch.label, null, null, body.sections);
      }
    });
  }

  /* ---- retrieval ----------------------------------------------------------- */

  function tokens(q) {
    return (q.toLowerCase().match(/[a-z0-9&'-]+/g) || []).filter(function (t) {
      return t.length > 1 && !STOP[t];
    });
  }

  function occurrences(hay, needle) {
    var n = 0, i = hay.indexOf(needle);
    while (i >= 0) { n++; i = hay.indexOf(needle, i + needle.length); }
    return n;
  }

  // Inverse document frequency per token, so words that appear everywhere
  // ("colleague", "work") count for less than distinctive ones ("probation").
  function idfWeights(ts) {
    var N = Math.max(1, INDEX.length);
    var w = {};
    ts.forEach(function (t) {
      if (w[t] != null) return;
      var df = 0;
      INDEX.forEach(function (p) {
        if (p.searchTitle.indexOf(t) >= 0 || p.searchBody.indexOf(t) >= 0) df++;
      });
      w[t] = Math.log(1 + N / (1 + df));
    });
    return w;
  }

  function query(q) {
    var ts = tokens(q);
    if (!ts.length) return { results: [], tokens: [] };
    var idf = idfWeights(ts);
    var scored = INDEX.map(function (p) {
      var s = 0;
      ts.forEach(function (t) {
        var w = idf[t];
        s += occurrences(p.searchTitle, t) * 4 * w;
        s += occurrences(p.searchBody, t) * 1 * w;
      });
      if (p.searchBody.indexOf(q.toLowerCase().trim()) >= 0) s += 6; // phrase bonus
      return { p: p, s: s };
    }).filter(function (r) { return r.s > 0; });
    scored.sort(function (a, b) { return b.s - a.s; });
    var top = scored[0] ? scored[0].s : 0;
    return {
      results: scored.filter(function (r) { return r.s >= Math.max(2, top * 0.25); }).slice(0, 4),
      tokens: ts
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function excerpt(p, ts) {
    var src = p.excerptFrom || p.body || '';
    var low = src.toLowerCase();
    var at = -1;
    for (var i = 0; i < ts.length; i++) { at = low.indexOf(ts[i]); if (at >= 0) break; }
    var start = at > 90 ? at - 90 : 0;
    var snip = src.slice(start, start + 300);
    if (start > 0) snip = '… ' + snip;
    if (start + 300 < src.length) snip += ' …';
    var out = esc(snip);
    ts.forEach(function (t) {
      out = out.replace(new RegExp('(' + escapeRe(t) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }

  /* ---- navigation ------------------------------------------------------------ */

  function goToPassage(p) {
    closeAsk();
    dismissEntry();
    if (typeof global.goTo !== 'function') return;
    global.goTo(p.chapterId);
    setTimeout(function () {
      var target = null;
      var ch = document.getElementById(p.chapterId);
      if (!ch) return;
      if (p.subId) {
        target = document.getElementById(p.subId);
      } else if (p.secIndex >= 0) {
        var secs = ch.querySelectorAll('.policy-section');
        target = secs[p.secIndex] || null;
      }
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var prev = target.style.outline;
        target.style.outline = '2px solid #B59060';
        target.style.outlineOffset = '4px';
        setTimeout(function () { target.style.outline = prev; }, 2400);
      }
    }, 120);
  }

  /* ---- UI -------------------------------------------------------------------- */

  var CSS = '' +
  '#mo-ask-entry{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(13,11,8,.45);backdrop-filter:blur(3px)}' +
  '#mo-ask-entry .ask-card-box{background:#FAF9F6;border:1px solid #E5E2DA;border-radius:6px;max-width:640px;width:calc(100% - 40px);padding:44px 40px 36px;box-shadow:0 24px 64px rgba(13,11,8,.25)}' +
  '#mo-ask-entry .eyebrow{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#B59060;margin-bottom:14px;text-align:center}' +
  '#mo-ask-entry h2{font-family:Georgia,serif;font-weight:400;font-size:28px;color:#0d0b08;margin:0 0 8px;text-align:center}' +
  '#mo-ask-entry .sub{color:#6b625a;font-size:13.5px;text-align:center;margin:0 0 26px}' +
  '#mo-ask-entry .opts{display:flex;gap:14px}' +
  '#mo-ask-entry .opt{flex:1;text-align:left;border:1px solid #E5E2DA;background:#fff;border-radius:4px;padding:20px 18px;cursor:pointer;font:inherit;transition:border-color .2s,transform .2s}' +
  '#mo-ask-entry .opt:hover{border-color:#B59060;transform:translateY(-2px)}' +
  '#mo-ask-entry .opt h3{font-family:Georgia,serif;font-weight:400;font-size:18px;color:#0d0b08;margin:0 0 6px}' +
  '#mo-ask-entry .opt p{font-size:12.5px;color:#6b625a;margin:0;line-height:1.6}' +
  '#mo-ask-fab{position:fixed;right:22px;bottom:84px;z-index:80;border:1px solid #C9A879;background:#fff;color:#8f6d3f;border-radius:999px;padding:11px 20px;font:600 12px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 6px 20px rgba(13,11,8,.14)}' +
  '#mo-ask-fab:hover{background:#B59060;color:#fff}' +
  '#mo-ask-panel{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);z-index:95;background:#FAF9F6;border-left:1px solid #E5E2DA;box-shadow:-16px 0 48px rgba(13,11,8,.18);display:flex;flex-direction:column}' +
  '#mo-ask-panel .hd{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #E5E2DA}' +
  '#mo-ask-panel .hd b{font-family:Georgia,serif;font-weight:400;font-size:19px;color:#0d0b08}' +
  '#mo-ask-panel .x{border:0;background:none;font-size:20px;color:#6b625a;cursor:pointer;padding:4px 8px}' +
  '#mo-ask-panel .qw{padding:16px 22px;border-bottom:1px solid #E5E2DA;display:flex;gap:8px}' +
  '#mo-ask-panel input{flex:1;border:1px solid #E5E2DA;background:#fff;padding:12px 14px;font:inherit;font-size:14px;border-radius:3px;outline:none}' +
  '#mo-ask-panel input:focus{border-color:#C9A879}' +
  '#mo-ask-panel .go{border:1px solid #C9A879;background:#B59060;color:#fff;border-radius:3px;padding:0 18px;font:600 12px system-ui;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}' +
  '#mo-ask-panel .rs{flex:1;overflow:auto;padding:16px 22px}' +
  '#mo-ask-panel .hint{color:#a89f92;font-size:13px;line-height:1.7;padding:18px 4px}' +
  '#mo-ask-panel .res{border:1px solid #E5E2DA;background:#fff;border-radius:4px;padding:16px 18px;margin-bottom:12px}' +
  '#mo-ask-panel .res .crumb{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#B59060;margin-bottom:6px}' +
  '#mo-ask-panel .res h4{font-family:Georgia,serif;font-weight:400;font-size:17px;color:#0d0b08;margin:0 0 8px}' +
  '#mo-ask-panel .res .ex{font-size:13px;color:#4a443f;line-height:1.7;margin:0 0 12px}' +
  '#mo-ask-panel .res .ex mark{background:rgba(181,144,96,.22);color:inherit;padding:0 1px}' +
  '#mo-ask-panel .res .jump{border:1px solid #C9A879;background:none;color:#8f6d3f;border-radius:3px;padding:8px 14px;font:600 11px system-ui;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}' +
  '#mo-ask-panel .res .jump:hover{background:#B59060;color:#fff}' +
  '#mo-ask-panel .ft{padding:12px 22px;border-top:1px solid #E5E2DA;font-size:11.5px;color:#a89f92;line-height:1.6}' +
  '@media(max-width:640px){#mo-ask-entry .opts{flex-direction:column}#mo-ask-panel{width:100%}}';

  var entryEl = null, panelEl = null, fabEl = null;

  function h(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function buildUI() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    fabEl = h('<button id="mo-ask-fab" type="button">Ask the Playbook</button>');
    fabEl.addEventListener('click', openAsk);
    document.body.appendChild(fabEl);

    var seen = false;
    try { seen = global.sessionStorage.getItem('mo_ask_seen') === '1'; } catch (e) {}
    if (!seen) showEntry();
  }

  function showEntry() {
    if (entryEl) return;
    entryEl = h(
      '<div id="mo-ask-entry">' +
        '<div class="ask-card-box">' +
          '<div class="eyebrow">Mandarin Oriental</div>' +
          '<h2>How would you like to use the playbook?</h2>' +
          '<p class="sub">Two ways in — pick one. You can switch anytime.</p>' +
          '<div class="opts">' +
            '<button class="opt" type="button" data-k="ask">' +
              '<h3>Query the Playbook</h3>' +
              '<p>Ask about a people situation in your hotel — get pointed to the exact policy passages that apply.</p>' +
            '</button>' +
            '<button class="opt" type="button" data-k="read">' +
              '<h3>Read the Playbook</h3>' +
              '<p>Browse the full playbook cover to cover, chapter by chapter.</p>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>');
    entryEl.querySelector('[data-k="ask"]').addEventListener('click', function () { dismissEntry(); openAsk(); });
    entryEl.querySelector('[data-k="read"]').addEventListener('click', dismissEntry);
    document.body.appendChild(entryEl);
  }

  function dismissEntry() {
    if (entryEl) { entryEl.remove(); entryEl = null; }
    try { global.sessionStorage.setItem('mo_ask_seen', '1'); } catch (e) {}
  }

  function openAsk() {
    if (panelEl) { panelEl.querySelector('input').focus(); return; }
    panelEl = h(
      '<div id="mo-ask-panel" role="dialog" aria-label="Query the Playbook">' +
        '<div class="hd"><b>Query the Playbook</b><button class="x" type="button" aria-label="Close">×</button></div>' +
        '<div class="qw"><input type="text" placeholder="Describe the situation — e.g. “colleague keeps arriving late”" /><button class="go" type="button">Ask</button></div>' +
        '<div class="rs"><div class="hint">Answers come <b>verbatim from this playbook</b>, with the section to read. Type a people situation or topic above.<br><br>Nothing here is invented — if the playbook doesn’t cover it, we’ll say so.</div></div>' +
        '<div class="ft">For sensitive or urgent situations, always speak with your P&C Director. Guidance shown is quoted directly from this playbook.</div>' +
      '</div>');
    panelEl.querySelector('.x').addEventListener('click', closeAsk);
    var input = panelEl.querySelector('input');
    var run = function () { runQuery(input.value); };
    panelEl.querySelector('.go').addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    document.body.appendChild(panelEl);
    input.focus();
  }

  function closeAsk() {
    if (panelEl) { panelEl.remove(); panelEl = null; }
  }

  function runQuery(q) {
    var rs = panelEl && panelEl.querySelector('.rs');
    if (!rs) return;
    q = (q || '').trim();
    if (!q) return;
    var out = query(q);
    if (!out.results.length) {
      rs.innerHTML = '<div class="hint"><b>The playbook doesn’t cover this directly.</b><br><br>' +
        'Nothing matched “' + esc(q) + '”. Try different words (e.g. “probation”, “grievance”, “handover”), or speak with your P&C Director — they can advise on situations beyond the playbook.</div>';
      return;
    }
    rs.innerHTML = '';
    out.results.forEach(function (r) {
      var card = h(
        '<div class="res">' +
          '<div class="crumb">' + esc(r.p.chapterLabel || '') + (r.p.subLabel ? ' · ' + esc(r.p.subLabel) : '') + '</div>' +
          '<h4>' + esc(r.p.title || 'Section') + '</h4>' +
          '<p class="ex">' + excerpt(r.p, out.tokens) + '</p>' +
          '<button class="jump" type="button">Open this section</button>' +
        '</div>');
      card.querySelector('.jump').addEventListener('click', function () { goToPassage(r.p); });
      rs.appendChild(card);
    });
  }

  /* ---- boot ----------------------------------------------------------------- */

  function init() {
    buildIndex(global.PLAYBOOK);
    buildUI();
  }

  // Re-index whenever a new playbook is pushed in (Studio preview / remote boot).
  global.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.type === 'set-playbook') {
      setTimeout(function () { buildIndex(global.PLAYBOOK); }, 0);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
