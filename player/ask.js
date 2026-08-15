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
        var body = sectionBodies[ch.id] || (ch.id === 'ch-4' ? ch4 : ch.id === 'ch-5' ? ch5 : { sections: [] });
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

  /* ---- multilingual entry (Phase 1) -----------------------------------------
     When the playbook declares languages (meta.languages) the entry overlay
     shows a language row. Switching reloads the player with ?lang=<code>
     (the loader then merges playbook-data.<code>.json over English); inside
     the Studio preview iframe it asks the parent editor to re-push instead.
     Entry strings below cover the languages we ship UI text for; content
     strings come from the overlay JSON itself.
     -------------------------------------------------------------------------- */
  var ENTRY_I18N = {
    'zh-CN': {
      langLabel: '语言',
      title: '您想如何使用本手册？',
      sub: '两种方式任选其一，您可以随时切换。',
      askTitle: '查询手册',
      askDesc: '描述您在酒店遇到的人员情况，我们将为您指引手册中适用的政策原文。',
      readTitle: '阅读手册',
      readDesc: '按章节完整浏览本手册。',
      fab: '查询手册',
      panelTitle: '查询手册',
      askBtn: '查询',
      qwPlaceholder: '描述您遇到的情况——例如“同事经常迟到”',
      hint: '答案均<b>直接引自本手册</b>，并附上相应章节。请在上方输入您遇到的人员情况或主题。<br><br>内容绝不虚构——如果手册未涵盖，我们会如实告知。',
      footer: '如遇敏感或紧急情况，请务必联系您的人力资源总监。所示指引均直接引自本手册。',
      noCover: '<b>手册未直接涵盖此情况。</b><br><br>未找到与“%Q%”相符的内容。请尝试其他措辞（例如“试用期”、“申诉”、“交接”），或咨询您的人力资源总监——他们可以就手册以外的情况提供建议。',
      openSection: '打开此章节',
      sectionFallback: '章节'
    }
  };

  var ASK_EN = {
    fab: 'Ask the Playbook',
    panelTitle: 'Query the Playbook',
    askBtn: 'Ask',
    qwPlaceholder: 'Describe the situation — e.g. \u201ccolleague keeps arriving late\u201d',
    hint: 'Answers come <b>verbatim from this playbook</b>, with the section to read. Type a people situation or topic above.<br><br>Nothing here is invented — if the playbook doesn\u2019t cover it, we\u2019ll say so.',
    footer: 'For sensitive or urgent situations, always speak with your P&C Director. Guidance shown is quoted directly from this playbook.',
    noCover: '<b>The playbook doesn\u2019t cover this directly.</b><br><br>Nothing matched \u201c%Q%\u201d. Try different words (e.g. \u201cprobation\u201d, \u201cgrievance\u201d, \u201chandover\u201d), or speak with your P&C Director — they can advise on situations beyond the playbook.',
    openSection: 'Open this section',
    sectionFallback: 'Section'
  };
  function askStrings() {
    var t = ENTRY_I18N[currentLang()] || {};
    var out = {};
    for (var k in ASK_EN) out[k] = ASK_EN[k];
    for (var k2 in t) out[k2] = t[k2];
    return out;
  }

  function currentLang() {
    if (global.MO_PB_LANG) return global.MO_PB_LANG;
    try {
      var q = new URLSearchParams(global.location.search).get('lang');
      if (q) return q;
    } catch (e) {}
    try {
      var saved = global.localStorage.getItem('mo_pb_lang');
      if (saved) return saved;
    } catch (e) {}
    return '';
  }

  function entryStrings() {
    var d = {
      langLabel: 'Language',
      title: 'How would you like to use the playbook?',
      sub: 'Two ways in — pick one. You can switch anytime.',
      askTitle: 'Query the Playbook',
      askDesc: 'Ask about a people situation in your hotel — get pointed to the exact policy passages that apply.',
      readTitle: 'Read the Playbook',
      readDesc: 'Browse the full playbook cover to cover, chapter by chapter.'
    };
    var t = ENTRY_I18N[currentLang()];
    if (t) Object.keys(t).forEach(function (k) { d[k] = t[k]; });
    return d;
  }

  function playbookLanguages() {
    var langs = (PB && PB.meta && PB.meta.languages) || [];
    var out = [{ code: 'en', label: 'English' }];
    langs.forEach(function (l) { if (l && l.code && l.code !== 'en') out.push(l); });
    return out;
  }

  function switchLang(code) {
    try { global.localStorage.setItem('mo_pb_lang', code); } catch (e) {}
    if (global.parent && global.parent !== global) {
      // Inside the Studio preview iframe — let the editor re-push the merged playbook.
      try { global.parent.postMessage({ type: 'preview-lang', lang: code }, '*'); } catch (e) {}
      return;
    }
    try {
      var u = new URL(global.location.href);
      u.searchParams.set('lang', code);
      global.location.href = u.toString();
    } catch (e) { global.location.reload(); }
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
  '#mo-ask-entry .langs{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 22px}' +
  '#mo-ask-entry .langs-label{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#a89f92;margin-right:4px}' +
  '#mo-ask-entry .lang-btn{border:1px solid #E5E2DA;background:#fff;color:#4a443f;border-radius:999px;padding:7px 16px;font:600 11.5px/1 system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;transition:border-color .2s,background .2s}' +
  '#mo-ask-entry .lang-btn:hover{border-color:#C9A879}' +
  '#mo-ask-entry .lang-btn.on{border-color:#B59060;background:#B59060;color:#fff}' +
  '#mo-ask-entry .opts{display:flex;gap:14px}' +
  '#mo-ask-entry .opt{flex:1;text-align:left;border:1px solid #E5E2DA;background:#fff;border-radius:4px;padding:20px 18px;cursor:pointer;font:inherit;transition:border-color .2s,transform .2s}' +
  '#mo-ask-entry .opt:hover{border-color:#B59060;transform:translateY(-2px)}' +
  '#mo-ask-entry .opt h3{font-family:Georgia,serif;font-weight:400;font-size:18px;color:#0d0b08;margin:0 0 6px}' +
  '#mo-ask-entry .opt p{font-size:12.5px;color:#6b625a;margin:0;line-height:1.6}' +
  '#mo-ask-fab{position:fixed;right:22px;bottom:84px;z-index:80;border:1px solid #C9A879;background:#fff;color:#8f6d3f;border-radius:999px;padding:11px 20px;font:600 12px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 6px 20px rgba(13,11,8,.14)}' +
  '#mo-ask-fab:hover{background:#B59060;color:#fff}' +
  '#mo-ask-backdrop{position:fixed;inset:0;z-index:1400;background:rgba(13,11,8,.35)}' +
  '#mo-ask-panel{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);z-index:1500;background:#FAF9F6;border-left:1px solid #E5E2DA;box-shadow:-16px 0 48px rgba(13,11,8,.18);display:flex;flex-direction:column}' +
  '#mo-ask-panel .hd{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #E5E2DA}' +
  '#mo-ask-panel .hd b{font-family:Georgia,serif;font-weight:400;font-size:19px;color:#0d0b08}' +
  '#mo-ask-panel .x{border:1px solid #E5E2DA;background:#F0EDE6;font-size:20px;line-height:1;color:#4a443f;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}' +
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

  var entryEl = null, panelEl = null, fabEl = null, backdropEl = null;

  function h(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function buildUI() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    fabEl = h('<button id="mo-ask-fab" type="button"></button>');
    fabEl.textContent = askStrings().fab;
    fabEl.addEventListener('click', openAsk);
    document.body.appendChild(fabEl);

    var seen = false;
    try { seen = global.sessionStorage.getItem('mo_ask_seen') === '1'; } catch (e) {}
    if (!seen) showEntry();
  }

  function showEntry() {
    if (entryEl) return;
    var T = entryStrings();
    var langs = playbookLanguages();
    var cur = currentLang() || 'en';
    var langRow = '';
    if (langs.length > 1) {
      langRow = '<div class="langs"><span class="langs-label">' + esc(T.langLabel) + '</span>' +
        langs.map(function (l) {
          return '<button class="lang-btn' + (l.code === cur ? ' on' : '') + '" type="button" data-lang="' + esc(l.code) + '">' + esc(l.label) + '</button>';
        }).join('') + '</div>';
    }
    entryEl = h(
      '<div id="mo-ask-entry">' +
        '<div class="ask-card-box">' +
          '<div class="eyebrow">Mandarin Oriental</div>' +
          langRow +
          '<h2>' + esc(T.title) + '</h2>' +
          '<p class="sub">' + esc(T.sub) + '</p>' +
          '<div class="opts">' +
            '<button class="opt" type="button" data-k="ask">' +
              '<h3>' + esc(T.askTitle) + '</h3>' +
              '<p>' + esc(T.askDesc) + '</p>' +
            '</button>' +
            '<button class="opt" type="button" data-k="read">' +
              '<h3>' + esc(T.readTitle) + '</h3>' +
              '<p>' + esc(T.readDesc) + '</p>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>');
    entryEl.querySelector('[data-k="ask"]').addEventListener('click', function () { dismissEntry(); openAsk(); });
    entryEl.querySelector('[data-k="read"]').addEventListener('click', dismissEntry);
    entryEl.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-lang');
        if (code === cur) return;
        switchLang(code);
      });
    });
    document.body.appendChild(entryEl);
  }

  function dismissEntry() {
    if (entryEl) { entryEl.remove(); entryEl = null; }
    try { global.sessionStorage.setItem('mo_ask_seen', '1'); } catch (e) {}
  }

  function onEscKey(e) {
    if (e.key === 'Escape') closeAsk();
  }

  function openAsk() {
    if (panelEl) { panelEl.querySelector('input').focus(); return; }
    backdropEl = h('<div id="mo-ask-backdrop"></div>');
    backdropEl.addEventListener('click', closeAsk);
    document.body.appendChild(backdropEl);
    document.addEventListener('keydown', onEscKey);
    var as = askStrings();
    panelEl = h(
      '<div id="mo-ask-panel" role="dialog" aria-label="' + esc(as.panelTitle) + '">' +
        '<div class="hd"><b></b><button class="x" type="button" aria-label="Close">×</button></div>' +
        '<div class="qw"><input type="text" /><button class="go" type="button"></button></div>' +
        '<div class="rs"><div class="hint">' + as.hint + '</div></div>' +
        '<div class="ft"></div>' +
      '</div>');
    panelEl.querySelector('.hd b').textContent = as.panelTitle;
    panelEl.querySelector('.qw input').setAttribute('placeholder', as.qwPlaceholder);
    panelEl.querySelector('.qw .go').textContent = as.askBtn;
    panelEl.querySelector('.ft').textContent = as.footer;
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
    if (backdropEl) { backdropEl.remove(); backdropEl = null; }
    document.removeEventListener('keydown', onEscKey);
  }

  function runQuery(q) {
    var rs = panelEl && panelEl.querySelector('.rs');
    if (!rs) return;
    q = (q || '').trim();
    if (!q) return;
    var out = query(q);
    if (!out.results.length) {
      rs.innerHTML = '<div class="hint">' + askStrings().noCover.replace('%Q%', esc(q)) + '</div>';
      return;
    }
    rs.innerHTML = '';
    out.results.forEach(function (r) {
      var card = h(
        '<div class="res">' +
          '<div class="crumb">' + esc(r.p.chapterLabel || '') + (r.p.subLabel ? ' · ' + esc(r.p.subLabel) : '') + '</div>' +
          '<h4>' + esc(r.p.title || askStrings().sectionFallback) + '</h4>' +
          '<p class="ex">' + excerpt(r.p, out.tokens) + '</p>' +
          '<button class="jump" type="button"></button>' +
        '</div>');
      card.querySelector('.jump').textContent = askStrings().openSection;
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
      if (d.lang) { try { global.MO_PB_LANG = d.lang === 'en' ? '' : d.lang; } catch (e) {} }
      setTimeout(function () {
        buildIndex(global.PLAYBOOK);
        // The Studio preview pushes the real playbook AFTER this script boots
        // with shell defaults — rebuild the entry overlay so its language row
        // and strings reflect the pushed playbook.
        if (entryEl) { entryEl.remove(); entryEl = null; showEntry(); }
      }, 0);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
