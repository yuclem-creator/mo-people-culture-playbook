/* ============================================================================
   editor.js — MO Playbook authoring tool
   Left outline tree · center live preview (iframe) · right inspector.
   Edits window state PLAYBOOK (content only) and pushes it to the renderer.
   ============================================================================ */
(function () {
  'use strict';

  var STORE = window.PlaybookStorage.adapter;

  // ---- Global state -------------------------------------------------------
  var PB = null;            // the working PLAYBOOK
  var SEL = null;           // current selection { kind, ... }
  var previewReady = false;
  var pendingPush = false;
  var dirty = false;
  var collapsed = {};       // outline collapse state by node key

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };

  // ---- Chapter type registry ---------------------------------------------
  // Maps the simple chapter TYPES the spec asks us to expose to how they behave.
  var CHAPTER_TYPES = {
    'cover':       { label: 'Cover',              prose: 'cover',  body: null },
    'intro-video': { label: 'Welcome film',       prose: 'intro',  body: null },
    'letter':      { label: 'Foreword / letter',  prose: 'letter', body: null },
    'standard':    { label: 'Standard chapter',   prose: null,     body: 'sections' },
    'lifecycle':   { label: 'Lifecycle (wheel)',  prose: null,     body: 'lifecycle' },
    'directory':   { label: 'People directory',   prose: null,     body: 'people' },
    'sections-list':{label: 'Sections list',      prose: null,     body: 'sections' }
  };

  var ITEM_SYMBOLS = [
    { v: 'policy', l: 'Policy' }, { v: 'guide', l: 'Guideline' },
    { v: 'kit', l: 'Toolkit' }, { v: 'xref', l: 'Cross-reference' }
  ];

  // =========================================================================
  // Boot
  // =========================================================================
  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.type === 'preview-boot' || d.type === 'preview-ready') {
      previewReady = true;
      if (pendingPush) { pendingPush = false; pushPreview(); }
    } else if (d.type === 'preview-error') {
      toast('Preview error: ' + d.message, 'err');
    }
  });

  function boot() {
    wireTopbar();
    // Restore: autosnapshot > saved current > seed
    STORE.loadAutosnapshot().then(function (snap) {
      if (snap && snap.playbook) {
        setPlaybook(snap.playbook);
        toast('Restored your last autosaved work', 'ok');
        return;
      }
      STORE.load().then(function (cur) {
        if (cur) { setPlaybook(cur); return; }
        loadSeed();
      });
    });
  }

  function loadSeed() {
    fetch('seed-playbook.json').then(function (r) { return r.json(); }).then(function (seed) {
      setPlaybook(seed);
    }).catch(function () {
      setPlaybook(blankPlaybook());
      toast('Could not load the seed playbook; started blank.', 'err');
    });
  }

  function setPlaybook(pb) {
    PB = normalize(pb);
    SEL = null;
    $('#docName').value = (PB.meta && PB.meta.title) || 'Untitled Playbook';
    renderTree();
    renderInspector();
    pushPreview();
    markSaved();
  }

  function normalize(pb) {
    pb = pb || {};
    pb.meta = pb.meta || {};
    pb.meta.scorm = pb.meta.scorm || { identifier: 'MO_PLAYBOOK_MANIFEST', title: pb.meta.title || 'Playbook', masteryScore: 100 };
    pb.meta.completion = pb.meta.completion || { mode: 'open-each-chapter', requiredChapterIds: [] };
    pb.chapters = pb.chapters || [];
    pb.lifecycle = pb.lifecycle || [];
    pb.journey = pb.journey || [];
    pb.seniorMgmt = pb.seniorMgmt || [];
    pb.pcLeaders = pb.pcLeaders || [];
    pb.beliefs = pb.beliefs || [];
    pb.menuDesc = pb.menuDesc || {};
    pb.lifecycleContent = pb.lifecycleContent || {};
    pb.ch4 = pb.ch4 || { sections: [] };
    pb.ch5 = pb.ch5 || { sections: [] };
    pb.prose = pb.prose || {};
    pb.assets = pb.assets || {};
    return pb;
  }

  // =========================================================================
  // Preview bridge
  // =========================================================================
  function pushPreview(keep) {
    if (!previewReady) { pendingPush = true; return; }
    var frame = $('#preview');
    var msg = { type: 'set-playbook', playbook: PB };
    if (keep) { msg.chapter = keep.chapter; msg.sub = keep.sub; }
    else if (SEL && SEL.chapter) { msg.chapter = SEL.chapter; msg.sub = SEL.sub; }
    frame.contentWindow.postMessage(msg, '*');
  }
  var pushTimer = null;
  function pushPreviewDebounced(keep) {
    markDirty();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushPreview(keep); scheduleAutosave(); }, 220);
  }
  function gotoPreview(chapter, sub) {
    if (!previewReady) return;
    $('#preview').contentWindow.postMessage({ type: 'goto', chapter: chapter, sub: sub }, '*');
  }

  // =========================================================================
  // Outline tree
  // =========================================================================
  function chapterType(ch) {
    if (ch.type) return ch.type;
    if (ch.id === 'cover') return 'cover';
    if (ch.id === 'intro') return 'intro-video';
    if (ch.id === 'ch-1') return 'letter';         // ch-1 hosts the foreword/letter set-pieces
    if (ch.hasSubs) return 'lifecycle';
    if (ch.id === 'ch-2') return 'directory';
    return 'standard';
  }

  function renderTree() {
    var tree = $('#tree');
    tree.innerHTML = '';
    PB.chapters.forEach(function (ch) {
      var type = chapterType(ch);
      var key = 'ch:' + ch.id;
      var hasKids = type === 'lifecycle';
      var row = treeNode({
        key: key, label: ch.label, num: ch.numeral || '',
        badge: CHAPTER_TYPES[type] ? CHAPTER_TYPES[type].label : type,
        hasKids: hasKids,
        onSelect: function () { select({ kind: 'chapter', id: ch.id, type: type, chapter: ch.id }); },
        onToggle: hasKids ? function () { collapsed[key] = !collapsed[key]; renderTree(); } : null
      });
      tree.appendChild(row);
      if (hasKids) {
        var kids = el('div', { class: 'kids' + (collapsed[key] ? ' collapsed' : '') });
        PB.lifecycle.forEach(function (sub) {
          kids.appendChild(treeNode({
            key: 'sub:' + sub.id, label: (sub.letter ? sub.letter + '. ' : '') + sub.label,
            onSelect: function () { select({ kind: 'lifecycle-sub', id: sub.id, chapter: ch.id, sub: sub.id }); }
          }));
        });
        tree.appendChild(kids);
      }
    });
    // reflect current selection
    if (SEL) highlightTree();
  }

  function treeNode(o) {
    var tw = el('span', { class: 'tw' + (o.hasKids ? '' : ' empty') },
      [o.hasKids ? (collapsed[o.key] ? '▸' : '▾') : '·']);
    if (o.onToggle) tw.addEventListener('click', function (e) { e.stopPropagation(); o.onToggle(); });
    var node = el('div', { class: 'node', 'data-key': o.key, onclick: o.onSelect }, [
      tw,
      el('span', { class: 'lbl', text: o.label }),
      o.badge ? el('span', { class: 'badge', text: o.badge }) : null,
      o.num ? el('span', { class: 'num', text: o.num }) : null
    ]);
    return node;
  }

  function highlightTree() {
    var key = SEL.kind === 'lifecycle-sub' ? 'sub:' + SEL.id
      : SEL.kind === 'chapter' ? 'ch:' + SEL.id : null;
    document.querySelectorAll('.tree .node').forEach(function (n) {
      n.classList.toggle('sel', n.getAttribute('data-key') === key);
    });
  }

  // =========================================================================
  // Selection + inspector routing
  // =========================================================================
  function select(sel) {
    SEL = sel;
    highlightTree();
    renderInspector();
    if (sel.chapter) gotoPreview(sel.chapter, sel.sub);
  }

  function renderInspector() {
    var box = $('#inspector');
    box.innerHTML = '';
    if (!SEL) {
      box.appendChild(el('div', { class: 'empty', text: 'Select an item in the outline to edit its content.' }));
      return;
    }
    if (SEL.kind === 'settings') return renderSettings(box);
    if (SEL.kind === 'chapter') return renderChapterInspector(box, SEL);
    if (SEL.kind === 'lifecycle-sub') return renderLifecycleSub(box, SEL);
    if (SEL.kind === 'section') return renderSection(box, SEL);
    if (SEL.kind === 'item') return renderItem(box, SEL);
  }

  function inspTitle(box, title, crumb, back) {
    if (back) box.appendChild(el('button', { class: 'back-link', onclick: back }, ['‹ Back']));
    box.appendChild(el('div', { class: 'insp-title', text: title }));
    if (crumb) box.appendChild(el('div', { class: 'insp-crumb', text: crumb }));
  }

  // ---- Chapter inspector --------------------------------------------------
  function renderChapterInspector(box, sel) {
    var ch = PB.chapters.filter(function (c) { return c.id === sel.id; })[0];
    var type = sel.type;
    inspTitle(box, ch.label || ch.id, (ch.numeral ? 'Chapter ' + ch.numeral + ' · ' : '') + (CHAPTER_TYPES[type] ? CHAPTER_TYPES[type].label : type));

    // Chapter label + card description
    box.appendChild(sectionLabel('Chapter'));
    box.appendChild(textField('Title', ch.label || '', function (v) { ch.label = v; touch(); renderTree(); }, 'Shown in the menu, rail and navigation.'));
    if (ch.id !== 'cover' && ch.id !== 'intro') {
      box.appendChild(textField('Contents-card description', PB.menuDesc[ch.id] || '', function (v) { PB.menuDesc[ch.id] = v; touch(); }, 'One line under the card on the Contents page.', true));
    }

    // Prose group for this chapter (openers, headings, paragraphs, quotes...)
    var prefix = prosePrefixFor(ch, type);
    if (prefix) {
      var keys = proseKeysWithPrefix(prefix);
      if (keys.length) {
        box.appendChild(sectionLabel('Text & images'));
        renderProseFields(box, keys);
      }
    }

    // Body content by type
    if (type === 'lifecycle') {
      box.appendChild(sectionLabel('Lifecycle stages'));
      box.appendChild(el('div', { class: 'note', text: 'The wheel is a fixed design. Edit each stage’s label and summary below or open a stage in the outline for its policies.' }));
      renderRepeatable(box, PB.lifecycle, {
        nameOf: function (s) { return (s.letter ? s.letter + '. ' : '') + s.label; },
        subOf: function (s) { return s.lede || ''; },
        open: function (s) { select({ kind: 'lifecycle-sub', id: s.id, chapter: ch.id, sub: s.id }); },
        addLabel: 'Add lifecycle stage',
        make: function () { return { id: uid('sub'), letter: '', label: 'New stage', img: '', lede: '' }; },
        onChange: function () { renderTree(); }
      });
    } else if (type === 'directory') {
      box.appendChild(sectionLabel('Senior management'));
      renderPeople(box, PB.seniorMgmt);
      box.appendChild(sectionLabel('P&C leaders'));
      renderPeople(box, PB.pcLeaders);
      box.appendChild(sectionLabel('Vision · Mission · Values'));
      renderBeliefs(box);
    } else if (type === 'standard' || type === 'sections-list') {
      var body = bodyForChapter(ch);
      if (body) {
        box.appendChild(sectionLabel('Sections'));
        renderSectionsList(box, body, ch.id);
      }
    }
  }

  function prosePrefixFor(ch, type) {
    if (type === 'cover') return 'cover';
    if (type === 'intro-video') return 'intro';
    if (ch.id === 'ch-1') return 'ch1';
    var m = /^ch-(\d+)$/.exec(ch.id);
    return m ? 'ch' + m[1] : null;
  }

  function bodyForChapter(ch) {
    if (ch.id === 'ch-4') return PB.ch4;
    if (ch.id === 'ch-5') return PB.ch5;
    return null;
  }

  // ---- Prose fields -------------------------------------------------------
  function proseKeysWithPrefix(prefix) {
    return Object.keys(PB.prose).filter(function (k) { return k === prefix || k.indexOf(prefix + '.') === 0; }).sort();
  }

  function renderProseFields(box, keys) {
    keys.forEach(function (k) {
      var val = PB.prose[k];
      var lastSeg = k.split('.').pop();
      var human = humanizeProseKey(k);
      if (/^(bg|img|portrait)$/.test(lastSeg)) {
        box.appendChild(imageField(human, val, function (fn) { PB.prose[k] = fn; touch(); }));
      } else if (lastSeg === 'video') {
        box.appendChild(videoField(human, val, function (fn) { PB.prose[k] = fn; touch(); }));
      } else if (Array.isArray(val)) {
        box.appendChild(textField(human, val.join('\n\n'), function (v) { PB.prose[k] = v.split(/\n\n+/); touch(); }, 'Each blank line starts a new paragraph.', true));
      } else {
        var long = (val || '').length > 60 || /p\d$|body|lede|sub|intro|text|para|quote|desc|foot|statement/.test(lastSeg);
        box.appendChild(textField(human, val || '', function (v) { PB.prose[k] = v; touch(); }, allowsHtml(val) ? 'HTML allowed (e.g. <em>, <br/>).' : '', long));
      }
    });
  }

  function humanizeProseKey(k) {
    var seg = k.split('.').slice(1);
    return seg.map(function (s) {
      return s.replace(/([A-Z])/g, ' $1').replace(/^\w/, function (c) { return c.toUpperCase(); })
        .replace(/\bP(\d)\b/i, 'Paragraph $1').replace(/\bS(\d\d)\b/, 'Section $1');
    }).join(' · ') || k;
  }
  function allowsHtml(v) { return typeof v === 'string' && /[<&]/.test(v); }

  // =========================================================================
  // Lifecycle sub-chapter
  // =========================================================================
  function renderLifecycleSub(box, sel) {
    var sub = PB.lifecycle.filter(function (s) { return s.id === sel.id; })[0];
    var content = PB.lifecycleContent[sel.id] || (PB.lifecycleContent[sel.id] = { sections: [] });
    inspTitle(box, (sub.letter ? sub.letter + '. ' : '') + sub.label, 'Lifecycle stage',
      function () { select({ kind: 'chapter', id: sel.chapter, type: 'lifecycle', chapter: sel.chapter }); });

    box.appendChild(sectionLabel('Stage'));
    box.appendChild(textField('Letter', sub.letter || '', function (v) { sub.letter = v; touch(); renderTree(); }, 'Single letter on the wheel (e.g. A).'));
    box.appendChild(textField('Label', sub.label || '', function (v) { sub.label = v; touch(); renderTree(); }));
    box.appendChild(textField('Summary (lede)', sub.lede || '', function (v) { sub.lede = v; touch(); }, '', true));
    box.appendChild(imageField('Hero image', sub.img || '', function (fn) { sub.img = fn; touch(); }));
    box.appendChild(textField('Tagline (optional)', content.tagline || '', function (v) { content.tagline = v; touch(); }, 'Overrides the hero tagline.'));
    box.appendChild(paraArrayField('Intro paragraphs', content.intro || [], function (arr) { content.intro = arr; touch(); }));

    box.appendChild(sectionLabel('Policy sections'));
    renderSectionsList(box, content, null, sel.id);
  }

  // =========================================================================
  // Sections list (used by lifecycle content, ch4, ch5)
  // =========================================================================
  function renderSectionsList(box, container, chapterId, subId) {
    container.sections = container.sections || [];
    renderRepeatable(box, container.sections, {
      nameOf: function (s) { return (s.num ? s.num + '. ' : '') + (s.title || 'Untitled section'); },
      subOf: function (s) { return (s.items ? s.items.length : 0) + ' item(s)'; },
      open: function (s, i) { select({ kind: 'section', ref: { container: container, index: i }, chapter: chapterId || SEL.chapter, sub: subId || SEL.sub, backSel: SEL }); },
      addLabel: 'Add section',
      make: function () { return { num: String(container.sections.length + 1), title: 'New section', items: [] }; }
    });
  }

  function renderSection(box, sel) {
    var sec = sel.ref.container.sections[sel.ref.index];
    inspTitle(box, sec.title || 'Section', 'Section', function () { SEL = sel.backSel; renderInspector(); });

    box.appendChild(sectionLabel('Section'));
    box.appendChild(textField('Number', sec.num || '', function (v) { sec.num = v; touch(); }));
    box.appendChild(textField('Title', sec.title || '', function (v) { sec.title = v; touch(); }));
    if ('blurb' in sec || true) box.appendChild(textField('Lead sentence (optional)', sec.blurb || '', function (v) { sec.blurb = v; touch(); }, '', true));
    if ('transition' in sec) box.appendChild(textField('Closing sentence (optional)', sec.transition || '', function (v) { sec.transition = v; touch(); }, '', true));

    if (sec.highlights) {
      box.appendChild(sectionLabel('Highlights'));
      box.appendChild(textField('Highlights heading', sec.highlights_eyebrow || '', function (v) { sec.highlights_eyebrow = v; touch(); }));
      renderRepeatable(box, sec.highlights, {
        nameOf: function (h) { return h.label || '(highlight)'; }, subOf: function (h) { return h.text || ''; },
        open: null, inlineEdit: function (h, wrap) { inlineHighlight(h, wrap); },
        addLabel: 'Add highlight', make: function () { return { icon: '', label: 'New', text: '' }; }
      });
    }

    box.appendChild(sectionLabel('Items (' + (sec.items ? sec.items.length : 0) + ')'));
    sec.items = sec.items || [];
    renderRepeatable(box, sec.items, {
      nameOf: function (it) { return it.name || '(item)'; },
      subOf: function (it) { return symbolLabel(it.s) + (it.blurb ? ' · ' + it.blurb : ''); },
      open: function (it, i) { select({ kind: 'item', ref: { arr: sec.items, index: i }, chapter: sel.chapter, sub: sel.sub, backSel: SEL }); },
      addLabel: 'Add item',
      make: function () { return { s: 'policy', name: 'New item', blurb: '', url: '' }; }
    });
  }

  function inlineHighlight(h, wrap) {
    wrap.appendChild(textField('Label', h.label || '', function (v) { h.label = v; touch(); }));
    wrap.appendChild(textField('Text', h.text || '', function (v) { h.text = v; touch(); }, '', true));
    wrap.appendChild(textField('Icon key (optional)', h.icon || '', function (v) { h.icon = v; touch(); }, 'Built-in icon name.'));
  }

  function renderItem(box, sel) {
    var it = sel.ref.arr[sel.ref.index];
    inspTitle(box, it.name || 'Item', 'Resource / policy item', function () { SEL = sel.backSel; renderInspector(); });
    box.appendChild(sectionLabel('Item'));
    box.appendChild(selectField('Type', it.s || 'policy', ITEM_SYMBOLS, function (v) { it.s = v; touch(); }));
    box.appendChild(textField('Name', it.name || '', function (v) { it.name = v; touch(); }));
    box.appendChild(textField('Description', it.blurb || '', function (v) { it.blurb = v; touch(); }, '', true));
    box.appendChild(linkField('Link (URL)', it.url || '', function (v) { it.url = v; touch(); }));
  }

  function symbolLabel(s) {
    var m = ITEM_SYMBOLS.filter(function (x) { return x.v === s; })[0];
    return m ? m.l : (s || 'Item');
  }

  // =========================================================================
  // People + beliefs editors
  // =========================================================================
  function renderPeople(box, arr) {
    renderRepeatable(box, arr, {
      nameOf: function (p) { return p.name || '(name)'; }, subOf: function (p) { return p.role || ''; },
      open: null,
      inlineEdit: function (p, wrap) {
        wrap.appendChild(textField('Name', p.name || '', function (v) { p.name = v; touch(); }));
        wrap.appendChild(textField('Role', p.role || '', function (v) { p.role = v; touch(); }));
        wrap.appendChild(imageField('Photo', p.img || '', function (fn) { p.img = fn; touch(); }));
      },
      addLabel: 'Add person', make: function () { return { name: 'New person', role: '', img: '' }; }
    });
  }

  function renderBeliefs(box) {
    PB.beliefs.forEach(function (b) {
      box.appendChild(el('div', { class: 'chip', text: b.tab || b.key }));
    });
    renderRepeatable(box, PB.beliefs, {
      nameOf: function (b) { return b.tab || b.key; }, subOf: function (b) { return (b.items ? b.items.length : 0) + ' items'; },
      open: null,
      inlineEdit: function (b, wrap) {
        wrap.appendChild(textField('Tab label', b.tab || '', function (v) { b.tab = v; touch(); }));
        wrap.appendChild(textField('Eyebrow', b.eyebrow || '', function (v) { b.eyebrow = v; touch(); }));
        wrap.appendChild(textField('Statement', b.statement || '', function (v) { b.statement = v; touch(); }, 'HTML allowed (<em> for emphasis).', true));
        wrap.appendChild(sectionLabel('Items'));
        b.items = b.items || [];
        renderRepeatable(wrap, b.items, {
          nameOf: function (it) { return it.label || '(item)'; }, subOf: function (it) { return it.text || ''; }, open: null,
          inlineEdit: function (it, w2) {
            w2.appendChild(textField('Label', it.label || '', function (v) { it.label = v; touch(); }));
            w2.appendChild(textField('Text', it.text || '', function (v) { it.text = v; touch(); }, '', true));
            w2.appendChild(textField('Icon key', it.icon || '', function (v) { it.icon = v; touch(); }));
          },
          addLabel: 'Add item', make: function () { return { icon: '', label: 'New', text: '' }; }
        });
      },
      addLabel: null, make: null
    });
  }

  // =========================================================================
  // Generic repeatable-list renderer (SortableJS reorder, add/remove, open/inline)
  // =========================================================================
  function renderRepeatable(box, arr, opts) {
    var list = el('ul', { class: 'rep-list' });
    arr.forEach(function (item, i) { list.appendChild(repItem(arr, item, i, opts, list, box)); });
    box.appendChild(list);
    if (opts.addLabel && opts.make) {
      box.appendChild(el('button', { class: 'btn add-btn', onclick: function () {
        arr.push(opts.make());
        touch(); if (opts.onChange) opts.onChange();
        renderInspector();
      } }, ['＋ ' + opts.addLabel]));
    }
    // SortableJS
    if (window.Sortable) {
      Sortable.create(list, {
        handle: '.drag', animation: 150, ghostClass: 'sortable-ghost',
        onEnd: function (e) {
          if (e.oldIndex === e.newIndex) return;
          var moved = arr.splice(e.oldIndex, 1)[0];
          arr.splice(e.newIndex, 0, moved);
          touch(); if (opts.onChange) opts.onChange();
          renderInspector();
        }
      });
    }
  }

  function repItem(arr, item, i, opts, list, box) {
    var main = el('div', { class: 'rep-main' }, [
      el('div', { class: 'rep-name', text: opts.nameOf(item) }),
      opts.subOf ? el('div', { class: 'rep-sub', text: opts.subOf(item) }) : null
    ]);
    var right = [];
    if (opts.open) {
      right.push(el('button', { class: 'btn ghost rep-open', title: 'Edit', onclick: function () { opts.open(item, i); } }, ['Edit ›']));
    }
    right.push(el('button', { class: 'icon-btn', title: 'Delete', onclick: function () {
      if (!confirm('Delete “' + opts.nameOf(item) + '”?')) return;
      arr.splice(i, 1); touch(); if (opts.onChange) opts.onChange(); renderInspector();
    } }, ['✕']));

    var row = el('li', { class: 'rep-item' }, [
      el('span', { class: 'drag', title: 'Drag to reorder', html: '⋮⋮' }),
      main
    ].concat(right));

    if (opts.inlineEdit) {
      main.style.cursor = 'pointer';
      main.addEventListener('click', function () {
        var open = row.querySelector('.inline-wrap');
        if (open) { open.remove(); return; }
        var wrap = el('div', { class: 'inline-wrap', style: 'flex-basis:100%;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)' });
        opts.inlineEdit(item, wrap);
        row.appendChild(wrap);
      });
    }
    return row;
  }

  // =========================================================================
  // Field builders
  // =========================================================================
  function sectionLabel(t) { return el('div', { class: 'section-label', text: t }); }

  function textField(label, value, onInput, tip, multiline) {
    var input = multiline
      ? el('textarea', { onchange: function (e) { onInput(e.target.value); }, oninput: function (e) { onInput(e.target.value); } })
      : el('input', { type: 'text', value: value, onchange: function (e) { onInput(e.target.value); }, oninput: function (e) { onInput(e.target.value); } });
    if (multiline) input.value = value;
    return el('div', { class: 'field' }, [
      el('label', {}, [label, tip ? el('span', { class: 'tip', text: tip }) : null]),
      input
    ]);
  }

  function paraArrayField(label, arr, onChange) {
    return textField(label, (arr || []).join('\n\n'), function (v) {
      onChange(v.trim() ? v.split(/\n\n+/) : []);
    }, 'Each blank line starts a new paragraph.', true);
  }

  function selectField(label, value, opts, onChange) {
    var sel = el('select', { onchange: function (e) { onChange(e.target.value); } },
      opts.map(function (o) { return el('option', { value: o.v, selected: o.v === value ? 'selected' : null }, [o.l]); }));
    return el('div', { class: 'field' }, [el('label', {}, [label]), sel]);
  }

  function linkField(label, value, onChange) {
    return el('div', { class: 'field' }, [
      el('label', {}, [label, el('span', { class: 'tip', text: 'Opens in a new tab.' })]),
      el('input', { type: 'text', value: value, placeholder: 'https://…',
        oninput: function (e) { onChange(e.target.value.trim()); } })
    ]);
  }

  function imageField(label, current, onPick) {
    var url = assetPreview(current);
    var thumb = el('div', { class: 'thumb', style: url ? 'background-image:url(' + cssUrl(url) + ')' : '' });
    var fn = el('div', { class: 'fn', text: current || '(none)' });
    var pick = el('button', { class: 'btn', onclick: function () { chooseImage(function (dataUrl, name) {
      var virtual = 'img/upload_' + Date.now() + '_' + safeName(name);
      PB.assets[virtual] = dataUrl;
      onPick(virtual.replace(/^img\//, ''));   // renderer prefixes img/
      thumb.style.backgroundImage = 'url(' + cssUrl(dataUrl) + ')';
      fn.textContent = virtual;
      touch();
    }); } }, ['Upload…']);
    return el('div', { class: 'field' }, [
      el('label', {}, [label]),
      el('div', { class: 'img-field' }, [thumb, el('div', { class: 'img-actions' }, [pick, fn])])
    ]);
  }

  function videoField(label, current, onPick) {
    var fn = el('div', { class: 'fn', text: current || '(none)' });
    var pick = el('button', { class: 'btn', onclick: function () { chooseFile('video/*', function (dataUrl, name) {
      var virtual = 'video/upload_' + Date.now() + '_' + safeName(name);
      PB.assets[virtual] = dataUrl;
      onPick(virtual.replace(/^video\//, ''));
      fn.textContent = virtual;
      touch();
    }); } }, ['Upload video…']);
    return el('div', { class: 'field' }, [
      el('label', {}, [label]),
      el('div', { class: 'img-field' }, [el('div', { class: 'img-actions' }, [pick, fn])])
    ]);
  }

  function assetPreview(name) {
    if (!name) return null;
    var a = PB.assets;
    if (a['img/' + name]) return a['img/' + name];
    if (a[name]) return a[name];
    return 'preview-engine/img/' + name;   // original bundled image
  }
  function cssUrl(u) { return "'" + u.replace(/'/g, "\\'") + "'"; }
  function safeName(n) { return (n || 'file').replace(/[^\w.\-]+/g, '_'); }

  function chooseImage(cb) { chooseFile('image/*', cb); }
  function chooseFile(accept, cb) {
    var input = el('input', { type: 'file', accept: accept });
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { cb(r.result, f.name); };
      r.readAsDataURL(f);
    };
    input.click();
  }

  // =========================================================================
  // Settings: meta, completion rules, SCORM manifest inspector
  // =========================================================================
  function renderSettings(box) {
    inspTitle(box, 'Playbook settings', 'Metadata · completion · SCORM');
    var m = PB.meta;
    box.appendChild(sectionLabel('General'));
    box.appendChild(textField('Playbook title', m.title || '', function (v) { m.title = v; $('#docName').value = v; touch(); }));
    box.appendChild(textField('Wordmark (cover)', m.wordmark || '', function (v) { m.wordmark = v; touch(); }));
    box.appendChild(textField('Edition line', m.edition || '', function (v) { m.edition = v; touch(); }));

    box.appendChild(sectionLabel('SCORM package'));
    m.scorm = m.scorm || {};
    box.appendChild(textField('Manifest identifier', m.scorm.identifier || '', function (v) { m.scorm.identifier = v; touch(); }, 'Written into imsmanifest.xml.'));
    box.appendChild(textField('Course title (LMS)', m.scorm.title || '', function (v) { m.scorm.title = v; touch(); }));
    box.appendChild(textField('Mastery score', String(m.scorm.masteryScore != null ? m.scorm.masteryScore : 100), function (v) { m.scorm.masteryScore = parseInt(v, 10) || 0; touch(); }));

    box.appendChild(sectionLabel('Completion rule'));
    renderCompletion(box);

    box.appendChild(sectionLabel('SCORM manifest inspector'));
    renderManifestInspector(box);
  }

  function realChapters() {
    return PB.chapters.filter(function (c) { return c.id !== 'menu'; });
  }

  function renderCompletion(box) {
    var comp = PB.meta.completion = PB.meta.completion || { mode: 'open-each-chapter', requiredChapterIds: [] };
    var view = el('div', { class: 'sub-view' });
    var modes = [
      { v: 'open-each-chapter', l: 'Open each required chapter', d: 'Learner must open every chapter you tick below.' },
      { v: 'open-all', l: 'Open all chapters', d: 'Learner must open every chapter in the playbook.' },
      { v: 'open-n', l: 'Open at least N chapters', d: 'Learner must open a minimum number of chapters.' }
    ];
    modes.forEach(function (mo) {
      var r = el('input', { type: 'radio', name: 'compmode', checked: comp.mode === mo.v ? 'checked' : null,
        onchange: function () { comp.mode = mo.v; touch(); renderInspector(); } });
      view.appendChild(el('label', { class: 'radio-row' }, [r, el('div', {}, [
        el('div', { class: 'r-lbl', text: mo.l }), el('div', { class: 'r-desc', text: mo.d })
      ])]));
    });

    if (comp.mode === 'open-n') {
      view.appendChild(textField('Minimum chapters (N)', String(comp.n || 1), function (v) { comp.n = Math.max(1, parseInt(v, 10) || 1); touch(); }));
    }
    if (comp.mode === 'open-each-chapter') {
      view.appendChild(el('h3', { text: 'Required chapters' }));
      var ul = el('ul', { class: 'check-list' });
      comp.requiredChapterIds = comp.requiredChapterIds || [];
      realChapters().forEach(function (c) {
        var on = comp.requiredChapterIds.indexOf(c.id) >= 0;
        var cb = el('input', { type: 'checkbox', checked: on ? 'checked' : null, onchange: function (e) {
          var i = comp.requiredChapterIds.indexOf(c.id);
          if (e.target.checked && i < 0) comp.requiredChapterIds.push(c.id);
          else if (!e.target.checked && i >= 0) comp.requiredChapterIds.splice(i, 1);
          touch();
        } });
        ul.appendChild(el('li', {}, [cb, (c.numeral ? c.numeral + '. ' : '') + c.label + '  (' + c.id + ')']));
      });
      view.appendChild(ul);
    }

    view.appendChild(el('div', { class: 'note', text: 'On export, this becomes window.SCORM_REQUIRED_PAGES, which scorm_api.js reads to decide completion — the SCORM file itself is never modified.' }));
    box.appendChild(view);
  }

  function computeRequiredPages() {
    var comp = PB.meta.completion || {};
    var chs = realChapters().map(function (c) { return c.id; });
    if (comp.mode === 'open-all') return chs;
    if (comp.mode === 'open-n') return chs.slice(0, Math.min(comp.n || 1, chs.length));
    var req = (comp.requiredChapterIds || []).filter(function (id) { return chs.indexOf(id) >= 0; });
    return req.length ? req : chs;
  }

  function renderManifestInspector(box) {
    var m = PB.meta;
    var req = computeRequiredPages();
    var rows = [
      ['Manifest identifier', (m.scorm && m.scorm.identifier) || '—'],
      ['Course title', (m.scorm && m.scorm.title) || m.title || '—'],
      ['SCORM version', '1.2'],
      ['Mastery score', String((m.scorm && m.scorm.masteryScore) != null ? m.scorm.masteryScore : 100)],
      ['Launch file', 'index.html (at zip root)'],
      ['Completion', m.completion ? m.completion.mode : 'open-each-chapter'],
      ['Required pages', req.join(', ')]
    ];
    var wrap = el('div', {});
    rows.forEach(function (r) {
      wrap.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: r[0] }), el('span', { class: 'v', text: r[1] })]));
    });
    box.appendChild(wrap);
  }

  // =========================================================================
  // Topbar actions: New / Open / Save / Export
  // =========================================================================
  function wireTopbar() {
    $('#docName').addEventListener('input', function (e) { PB.meta.title = e.target.value; touch(); });
    $('#btnSettings').addEventListener('click', function () { SEL = { kind: 'settings' }; highlightTree(); renderInspector(); });
    $('#btnNew').addEventListener('click', openNewModal);
    $('#btnOpen').addEventListener('click', doOpen);
    $('#btnSave').addEventListener('click', doSave);
    $('#btnExport').addEventListener('click', doExport);
    $('#pvDesktop').addEventListener('click', function () { setPreviewWidth(false); });
    $('#pvMobile').addEventListener('click', function () { setPreviewWidth(true); });
  }

  function setPreviewWidth(mobile) {
    $('#preview').classList.toggle('mobile', mobile);
    $('#pvMobile').classList.toggle('on', mobile);
    $('#pvDesktop').classList.toggle('on', !mobile);
  }

  function doOpen() {
    STORE.importFile().then(function (pb) {
      setPlaybook(pb);
      toast('Playbook opened', 'ok');
    }).catch(function (e) { toast(e.message || 'Open failed', 'err'); });
  }

  function doSave() {
    var name = safeName(PB.meta.title || 'playbook').toLowerCase() + '.json';
    STORE.save(PB).then(function () { return STORE.exportFile(PB, name); }).then(function () {
      markSaved(); STORE.clearAutosnapshot(); toast('Saved ' + name, 'ok');
    }).catch(function (e) { toast('Save failed: ' + (e.message || e), 'err'); });
  }

  // ---- New playbook flows -------------------------------------------------
  function openNewModal() {
    var body = el('div', {});
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); newFromSeed(); } }, [
      el('div', {}, [el('div', { class: 'nc-title', text: 'Duplicate the P&C seed' }),
        el('div', { class: 'nc-desc', text: 'Start from a full copy of the current People & Culture playbook and edit from there.' })])
    ]));
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); newBlankModal(); } }, [
      el('div', {}, [el('div', { class: 'nc-title', text: 'Blank playbook' }),
        el('div', { class: 'nc-desc', text: 'Choose which chapter types to include and build up from empty templates.' })])
    ]));
    showModal('Start a new playbook', body, [
      { label: 'Cancel', onClick: closeModal }
    ]);
  }

  function newFromSeed() {
    fetch('seed-playbook.json').then(function (r) { return r.json(); }).then(function (seed) {
      seed = JSON.parse(JSON.stringify(seed));
      seed.meta = seed.meta || {};
      seed.meta.title = 'Copy of ' + (seed.meta.title || 'Playbook');
      setPlaybook(seed);
      touch();
      toast('Duplicated the seed playbook', 'ok');
    });
  }

  function newBlankModal() {
    var picks = {};
    var order = ['cover', 'intro-video', 'letter', 'standard', 'lifecycle', 'directory', 'sections-list'];
    var body = el('div', {});
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Playbook title']),
      el('input', { type: 'text', id: 'newTitle', value: 'New Playbook' })]));
    body.appendChild(el('div', { class: 'note', text: 'Tick the chapters to include. You can add, rename or reorder content later.' }));
    var ul = el('ul', { class: 'check-list' });
    order.forEach(function (t, idx) {
      var def = t === 'cover' || t === 'standard';
      picks[t] = def;
      var cb = el('input', { type: 'checkbox', checked: def ? 'checked' : null, onchange: function (e) { picks[t] = e.target.checked; } });
      ul.appendChild(el('li', {}, [cb, CHAPTER_TYPES[t].label]));
    });
    body.appendChild(ul);
    showModal('Blank playbook', body, [
      { label: 'Cancel', onClick: closeModal },
      { label: 'Create', primary: true, onClick: function () {
        var title = ($('#newTitle') && $('#newTitle').value) || 'New Playbook';
        closeModal();
        buildBlank(title, order.filter(function (t) { return picks[t]; }));
      } }
    ]);
  }

  function buildBlank(title, types) {
    var pb = blankPlaybook();
    pb.meta.title = title;
    var romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    var n = 0;
    types.forEach(function (t) {
      if (t === 'cover') pb.chapters.push({ id: 'cover', numeral: '', label: 'Cover', type: 'cover', opener: '' });
      else if (t === 'intro-video') pb.chapters.push({ id: 'intro', numeral: '', label: 'Welcome', type: 'intro-video', isVideo: true, opener: '' });
      else {
        n++;
        var id = 'ch-' + n;
        var label = CHAPTER_TYPES[t].label;
        var ch = { id: id, numeral: romans[n - 1] || String(n), label: label, type: t, opener: '' };
        if (t === 'lifecycle') { ch.hasSubs = true; }
        pb.chapters.push(ch);
        if (t === 'lifecycle') {
          pb.lifecycle.push({ id: uid('sub'), letter: 'A', label: 'Stage one', img: '', lede: '' });
          pb.lifecycleContent[pb.lifecycle[pb.lifecycle.length - 1].id] = { sections: [] };
        }
        if (t === 'standard' || t === 'sections-list') {
          if (id === 'ch-4') pb.ch4 = { sections: [] };
          else if (id === 'ch-5') pb.ch5 = { sections: [] };
        }
      }
    });
    pb.meta.completion = { mode: 'open-all', requiredChapterIds: realChaptersOf(pb).map(function (c) { return c.id; }) };
    setPlaybook(pb);
    touch();
    toast('Blank playbook created', 'ok');
  }
  function realChaptersOf(pb) { return pb.chapters.filter(function (c) { return c.id !== 'menu'; }); }

  function blankPlaybook() {
    return {
      meta: { title: 'New Playbook', wordmark: 'Mandarin Oriental', edition: 'Edition',
        scorm: { identifier: 'MO_PLAYBOOK_MANIFEST', title: 'New Playbook', masteryScore: 100 },
        completion: { mode: 'open-all', requiredChapterIds: [] } },
      chapters: [], lifecycle: [], journey: [], seniorMgmt: [], pcLeaders: [], beliefs: [],
      menuDesc: {}, lifecycleContent: {}, ch4: { sections: [] }, ch5: { sections: [] }, prose: {}, assets: {}
    };
  }

  // =========================================================================
  // Dirty / autosave
  // =========================================================================
  function touch() { pushPreviewDebounced(); }
  function markDirty() { dirty = true; setAutosave('dirty', 'Editing…'); }
  function markSaved() { dirty = false; setAutosave('saved', 'All changes saved'); }
  function setAutosave(cls, txt) {
    var a = $('#autosave'); a.className = 'autosave ' + cls; $('.txt', a).textContent = txt;
  }
  var autosaveTimer = null;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      STORE.saveAutosnapshot(PB).then(function () { setAutosave('saved', 'Autosaved'); dirty = false; });
    }, 1200);
  }

  // =========================================================================
  // Modal + toast
  // =========================================================================
  function showModal(title, bodyEl, buttons) {
    closeModal();
    var foot = el('div', { class: 'm-foot' }, (buttons || []).map(function (b) {
      return el('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: b.onClick }, [b.label]);
    }));
    var modal = el('div', { class: 'modal' }, [
      el('div', { class: 'm-head', text: title }),
      el('div', { class: 'm-body' }, [bodyEl]),
      foot
    ]);
    var back = el('div', { class: 'modal-back', onclick: function (e) { if (e.target === back) closeModal(); } }, [modal]);
    $('#modalRoot').appendChild(back);
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }

  function toast(msg, kind) {
    var t = el('div', { class: 'toast ' + (kind || ''), text: msg });
    $('#toasts').appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 250); }, 3200);
  }

  function busy(on, msg) {
    var ex = $('#busy');
    if (on) {
      if (ex) return;
      document.body.appendChild(el('div', { class: 'busy', id: 'busy' }, [
        el('div', { class: 'spinner' }), el('div', { text: msg || 'Working…' })
      ]));
    } else if (ex) { ex.remove(); }
  }

  function uid(p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 8); }

  // =========================================================================
  // SCORM 1.2 export  (implemented in export.js; attached to window)
  // =========================================================================
  function doExport() {
    busy(true, 'Building SCORM package…');
    window.buildScormPackage(PB, computeRequiredPages(), {
      toast: toast,
      done: function () { busy(false); },
      fail: function (e) { busy(false); toast('Export failed: ' + (e.message || e), 'err'); }
    });
  }

  // expose a couple of helpers for export.js
  window.__editor = { assetPreview: assetPreview };

  boot();
})();
