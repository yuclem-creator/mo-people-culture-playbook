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
    'sections-list':{label: 'Sections list',      prose: null,     body: 'sections' },
    'tile-menu':   { label: 'Tile menu',          prose: null,     body: 'tilemenu' },
    'part':        { label: 'Part with sub-topics', prose: null,   body: 'part' },
    'card-track':  { label: 'Card track diagram',  prose: null,    body: 'cardtrack' }
  };

  var ITEM_SYMBOLS = [
    { v: 'policy', l: 'Policy' }, { v: 'guide', l: 'Guideline' },
    { v: 'kit', l: 'Toolkit' }, { v: 'xref', l: 'Cross-reference' },
    { v: 'image', l: 'Image' }, { v: 'video', l: 'Video' }, { v: 'tabs', l: 'Tabbed group' },
    { v: 'timeline', l: 'Timeline' }, { v: 'checklist', l: 'Checklist' },
    { v: 'table', l: 'Table' }, { v: 'callout', l: 'Callout' }
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
    } else if (d.type === 'studio-select' && d.id) {
      // A menu tile (or the menu header) was clicked in the preview — open the
      // matching chapter's inspector so the editor follows the preview.
      var ch = PB.chapters.filter(function (c) { return c.id === d.id; })[0];
      if (ch) {
        var t = ch.type || (ch.id === 'ch-1' ? 'letter' : ch.id === 'ch-2' ? 'directory' :
          ch.hasSubs ? 'lifecycle' : ch.id === 'intro' ? 'intro-video' : ch.id === 'cover' ? 'cover' : 'standard');
        // Open the editor for the chapter WITHOUT navigating the preview —
        // the user stays on the menu page and edits tiles from the side panel.
        select({ kind: 'chapter', id: ch.id, type: t, chapter: ch.id }, { noNav: true });
      }
    }
  });

  function armPreviewHandshake() {
    var frame = $('#preview');
    if (!frame) return;
    var ping = function () {
      try { if (frame.contentWindow) frame.contentWindow.postMessage({ type: 'editor-ping' }, '*'); } catch (err) {}
    };
    frame.addEventListener('load', function () { previewReady = false; ping(); });
    ping(); // the iframe may have finished before this listener attached
    var tries = 0;
    var timer = setInterval(function () {
      if (previewReady || ++tries > 12) { clearInterval(timer); return; }
      ping();
    }, 800);
  }

  function boot() {
    wireTopbar();
    armPreviewHandshake();
    pendingCreate = readCreateParam();
    pendingEdit = readEditParam();
    // Per-slug drafts: open the slot for the playbook being entered (edit
    // link), or the last one used; restore autosnapshot > saved current >
    // published (edit link) > seed.
    var bootSlugPromise = pendingEdit
      ? STORE.setSlug(pendingEdit)
      : STORE.getSlug().then(function (s) { return STORE.setSlug(s || ''); });
    bootSlugPromise.then(function () {
      return STORE.loadAutosnapshot();
    }).then(function (snap) {
      if (snap && snap.playbook) {
        setPlaybook(snap.playbook);
        toast('Restored your last autosaved work', 'ok');
        maybeEnterFromLibrary();
        return;
      }
      STORE.load().then(function (cur) {
        if (cur) { setPlaybook(cur); maybeEnterFromLibrary(); return; }
        if (pendingEdit) { var editSlug = pendingEdit; pendingEdit = null; loadPublishedForEdit(editSlug); stripLibraryParams(); return; }
        loadSeed().then(maybeEnterFromLibrary);
      });
    });
  }

  function loadSeed() {
    return fetch('seed-playbook.json').then(function (r) { return r.json(); }).then(function (seed) {
      setPlaybook(seed);
    }).catch(function () {
      setPlaybook(blankPlaybook());
      toast('Could not load the seed playbook; started blank.', 'err');
    });
  }

  // ---- Create-from-library flow ------------------------------------------
  // The Playbook Library hub links here as:
  //   authoring-tool/?create=<department-id>&dept=<department name>
  // We open the New-playbook dialog automatically and tag the created
  // playbook's meta.department so Publish can suggest the right folder.
  var pendingCreate = null;
  function readCreateParam() {
    try {
      var q = new URLSearchParams(window.location.search);
      var id = (q.get('create') || '').trim();
      if (!id) return null;
      return { id: id, name: (q.get('dept') || id).trim() };
    } catch (e) { return null; }
  }
  function maybePromptCreate() {
    if (!pendingCreate) return;
    openNewModal();
  }

  // ---- Edit-from-library flow --------------------------------------------
  // Library playbook cards link here as authoring-tool/?edit=<slug>.
  // The published content is public, so loading works without sign-in;
  // sign-in is only needed to Save versions / Publish.
  var pendingEdit = null;
  function readEditParam() {
    try {
      var q = new URLSearchParams(window.location.search);
      var s = (q.get('edit') || '').trim();
      return s || null;
    } catch (e) { return null; }
  }
  function stripLibraryParams() {
    try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
  }
  function maybeEnterFromLibrary() {
    if (pendingEdit) { maybeLoadEditParam(); return; }
    maybePromptCreate();
  }
  function maybeLoadEditParam() {
    var slug = pendingEdit;
    var curSlug = window.PlaybookPublish ? window.PlaybookPublish.slugFor(PB) : (PB.meta && PB.meta.slug);
    if (curSlug && curSlug === slug) {
      // The restored local draft IS this playbook and is always the freshest
      // copy (autosave runs on every edit) — never re-fetch from storage on a
      // refresh, or newer unsaved/pending changes would be silently lost.
      pendingEdit = null;
      stripLibraryParams();
      return;
    }
    // Different playbook: drafts live in per-slug slots, so switching is
    // always safe and silent — no 'will be replaced' prompt, ever. If this
    // slug has a draft, use it; otherwise load the published/draft copy.
    STORE.setSlug(slug).then(function () { return STORE.loadAutosnapshot(); }).then(function (snap) {
      if (snap && snap.playbook) {
        setPlaybook(snap.playbook);
        toast('Opened \u201C' + ((snap.playbook.meta && snap.playbook.meta.title) || slug) + '\u201D — your other drafts are kept per playbook.', 'ok');
      } else {
        loadPublishedForEdit(slug);
      }
      pendingEdit = null;
      stripLibraryParams();
    });
  }
  function loadPublishedForEdit(slug) {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url) { toast('Supabase is not configured here.', 'err'); pendingEdit = null; return; }
    // Drafts first if the Library flagged stage=draft; always fall back to the
    // other lane — an entry may only exist in one of them.
    var params = new URLSearchParams(window.location.search);
    var preferDraft = params.get('stage') === 'draft';
    var lanes = preferDraft ? ['drafts', 'published'] : ['published', 'drafts'];
    toast('Loading playbook\u2026');
    (function tryLane(i) {
      if (i >= lanes.length) {
        toast('Could not load the playbook: not found in published or draft storage.', 'err');
        pendingEdit = null;
        stripLibraryParams();
        return;
      }
      var url = String(cfg.url).replace(/\/$/, '') + '/storage/v1/object/public/playbook-content/' + lanes[i] + '/' +
        encodeURIComponent(slug) + '/playbook-data.json?t=' + Date.now();
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (pb) {
        pb.meta = pb.meta || {};
        if (!pb.meta.slug) pb.meta.slug = slug;
        setPlaybook(pb);
        markSaved();
        var lane = lanes[i] === 'drafts' ? 'draft' : 'published version';
        toast('Loaded \u201C' + ((pb.meta && pb.meta.title) || slug) + '\u201D — you are editing the ' + lane + '.', 'ok');
        pendingEdit = null;
        stripLibraryParams();
      }).catch(function () { tryLane(i + 1); });
    })(0);
  }
  function applyPendingCreate(pb) {
    if (!pendingCreate) return;
    pb.meta = pb.meta || {};
    pb.meta.department = pendingCreate.id;
    toast('Tagged to department folder: ' + pendingCreate.name, 'ok');
    try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
    pendingCreate = null;
  }

  function setPlaybook(pb) {
    PB = normalize(pb);
    SEL = null;
    $('#docName').value = (PB.meta && PB.meta.title) || 'Untitled Playbook';
    // Keep the draft slot pointed at THIS playbook (per-slug drafts — each
    // playbook keeps its own draft, so switching never replaces anything).
    if (window.PlaybookPublish && window.PlaybookStorage && window.PlaybookStorage.adapter) {
      window.PlaybookStorage.adapter.setSlug(window.PlaybookPublish.slugFor(PB));
    }
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
    var hadSlug = !!pb.meta.slug;
    if (!hadSlug) pb.meta.slug = window.PlaybookPublish ? window.PlaybookPublish.slugify(pb.meta.title) : '';
    // Slug ownership: derived slugs are "auto" — they follow the title on
    // renames — until the author edits the Publish slug field by hand. This
    // is what stops a renamed playbook keeping a stale slug that collides
    // with another playbook's lane (a renamed duplicate once saved "Masters
    // of Craft" over the People & Culture slug).
    if (pb.meta.slugAuto === undefined) pb.meta.slugAuto = !hadSlug;
    if (!pb.meta.lastSlug) pb.meta.lastSlug = pb.meta.slug;
    pb.chapters = pb.chapters || [];
    pb.sectionBodies = pb.sectionBodies || {};
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
    pb.assetHotspots = pb.assetHotspots || {}; // asset-keyed pin sets for inline images
    // Stamp explicit chapter types. Without one, renderers fall back to the
    // legacy id map (ch-1 = foreword letter …) — correct only for the genuine
    // P&C seed. An authored playbook's ch-1 (e.g. Finance "Purpose") would
    // otherwise render as the letter layout and its sections/videos vanish.
    var seedLike = !!(pb.meta && pb.meta.fromSeed) ||
      !!(pb.prose && (pb.prose['ch5.band.img'] || pb.prose['ch4.band.img'] || pb.prose['ch2.band.img']));
    pb.chapters.forEach(function (c) {
      if (c.type) return;
      if (c.id === 'cover') { c.type = 'cover'; return; }
      if (c.id === 'intro') { c.type = 'intro-video'; return; }
      if (seedLike) {
        c.type = c.id === 'ch-1' ? 'letter' : c.hasSubs ? 'lifecycle' : c.id === 'ch-2' ? 'directory' : 'standard';
      } else {
        c.type = c.hasSubs ? 'lifecycle' : 'standard';
      }
      if (c.type === 'part') c.subs = c.subs || [];
    });
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
      var hasKids = type === 'lifecycle' || (type === 'part' && (ch.subs || []).length);
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
        var kidList = type === 'lifecycle' ? PB.lifecycle : (ch.subs || []);
        var kidKind = type === 'lifecycle' ? 'lifecycle-sub' : 'part-sub';
        kidList.forEach(function (sub) {
          var node = treeNode({
            key: 'sub:' + sub.id, label: (sub.letter ? sub.letter + '. ' : '') + sub.label,
            onSelect: function () { select({ kind: kidKind, id: sub.id, chapter: ch.id, sub: sub.id }); }
          });
          if (sub.depth === 2) node.style.paddingLeft = '26px'; // topic under a § section
          kids.appendChild(node);
        });
        tree.appendChild(kids);
      }
    });
    // chapter management: add
    tree.appendChild(el('button', { class: 'tree-add', onclick: openAddChapterModal }, ['+ Add chapter']));

    // reflect current selection
    if (SEL) highlightTree();
  }

  // ---- Chapter management: add / move / delete ----------------------------
  var ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
  function realChapterCount() {
    return PB.chapters.filter(function (c) { return c.id !== 'cover' && c.id !== 'intro' && c.id !== 'menu'; }).length;
  }
  function nextChapterId() {
    var max = 0;
    PB.chapters.forEach(function (c) {
      var m = /^ch-(\d+)$/.exec(c.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'ch-' + (max + 1);
  }
  function openAddChapterModal() {
    var order = ['standard', 'sections-list', 'lifecycle', 'directory', 'letter', 'tile-menu', 'part', 'card-track'];
    var descs = {
      'standard': 'Opener plus numbered policy sections with items.',
      'sections-list': 'A simple list of sections — good for toolkits and resources.',
      'lifecycle': 'Stages with their own policy sections (the wheel model).',
      'directory': 'People grids: senior management, leaders and beliefs.',
      'letter': 'Foreword-style editorial chapter.',
      'tile-menu': 'A grid of image tiles, each linking to a chapter — like the Contents page, placed anywhere.',
      'part': 'A part that groups sub-topics — sub-topics show indented in the outline and rail (e.g. “Introduction” with 1.1–1.7 under it).',
      'card-track': 'A horizontal track of linked cards on a spine — an opportunity/section map. Stacks vertically on mobile.'
    };
    var body = el('div', {});
    body.appendChild(el('div', { class: 'note', text: 'Pick the kind of chapter to add. It is appended to the outline — use Move up / Move down in the chapter panel to reorder.' }));
    order.forEach(function (t) {
      body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); addChapter(t); } }, [
        el('div', {}, [
          el('div', { class: 'nc-title', text: CHAPTER_TYPES[t].label }),
          el('div', { class: 'nc-desc', text: descs[t] })
        ])
      ]));
    });
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); openPdfImportFlow(); } }, [
      el('div', {}, [
        el('div', { class: 'nc-title', text: 'From PDF' }),
        el('div', { class: 'nc-desc', text: 'Upload a PDF — its structure, text and figures become a new chapter for your review.' })
      ])
    ]));
    showModal('Add chapter', body, [{ label: 'Cancel', onClick: closeModal }]);
  }
  function addChapter(type) {
    var id = nextChapterId();
    var ch = { id: id, numeral: ROMANS[realChapterCount()] || String(realChapterCount() + 1), label: CHAPTER_TYPES[type].label, type: type, opener: '' };
    if (type === 'lifecycle') {
      ch.hasSubs = true;
      var sub = { id: uid('sub'), letter: 'A', label: 'Stage one', img: '', lede: '' };
      PB.lifecycle.push(sub);
      PB.lifecycleContent[sub.id] = { sections: [] };
    }
    if (type === 'standard' || type === 'sections-list') {
      PB.sectionBodies[id] = { intro: [], sections: [] };
    }
    if (type === 'tile-menu') {
      PB.sectionBodies[id] = { intro: [], sections: [] };
      ch.tiles = [{ title: 'First tile', text: '', img: '', target: 'menu' }];
    }
    if (type === 'part') {
      PB.sectionBodies[id] = { intro: [], sections: [] };
      var sub0 = { id: uid('top'), label: 'First sub-topic' };
      ch.subs = [sub0];
      PB.sectionBodies[sub0.id] = { intro: [], sections: [] };
    }
    if (type === 'card-track') {
      PB.sectionBodies[id] = { intro: [], sections: [] };
      ch.track = [{ num: '01', icon: '', label: 'SECTION 1', title: 'First card', pill: '',
        links: [{ num: '1', name: 'First link', target: 'menu' }] }];
    }
    PB.chapters.push(ch);
    touch(); renderTree();
    select({ kind: 'chapter', id: id, type: type, chapter: id });
    toast('Chapter added — rename it and add content in the inspector.', 'ok');
  }
  function firstMovableIndex() {
    var i = 0;
    while (i < PB.chapters.length && (PB.chapters[i].id === 'cover' || PB.chapters[i].id === 'intro')) i++;
    return i; // cover + welcome film stay pinned at the top
  }
  function moveChapter(id, dir) {
    var i = -1;
    PB.chapters.forEach(function (c, ix) { if (c.id === id) i = ix; });
    var j = i + dir;
    var lo = firstMovableIndex();
    if (i < lo || j < lo || j >= PB.chapters.length) return;
    var tmp = PB.chapters[i]; PB.chapters[i] = PB.chapters[j]; PB.chapters[j] = tmp;
    touch(); renderTree(); renderInspector();
  }
  function deleteChapter(id) {
    if (!window.confirm('Delete this chapter and all its content? This cannot be undone.')) return;
    var victim = PB.chapters.filter(function (c) { return c.id === id; })[0];
    PB.chapters = PB.chapters.filter(function (c) { return c.id !== id; });
    if (PB.sectionBodies) delete PB.sectionBodies[id];
    if (PB.menuDesc) delete PB.menuDesc[id];
    // Clear the chapter's prose keys too, so a NEW chapter that later lands on
    // this id never inherits leftover wording/images from the deleted one.
    if (victim) {
      var t = victim.type || (victim.id === 'ch-1' ? 'letter' : victim.id === 'ch-2' ? 'directory' :
        victim.hasSubs ? 'lifecycle' : victim.id === 'intro' ? 'intro-video' : victim.id === 'cover' ? 'cover' : 'standard');
      var pre = prosePrefixFor(victim, t);
      if (pre && PB.prose) {
        Object.keys(PB.prose).forEach(function (k) {
          if (k === pre || k.indexOf(pre + '.') === 0) delete PB.prose[k];
        });
      }
    }
    SEL = null;
    touch(); renderTree(); renderInspector();
    toast('Chapter deleted', 'ok');
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
    var key = (SEL.kind === 'lifecycle-sub' || SEL.kind === 'part-sub') ? 'sub:' + SEL.id
      : SEL.kind === 'chapter' ? 'ch:' + SEL.id : null;
    document.querySelectorAll('.tree .node').forEach(function (n) {
      n.classList.toggle('sel', n.getAttribute('data-key') === key);
    });
  }

  // =========================================================================
  // Selection + inspector routing
  // =========================================================================
  function select(sel, opts) {
    opts = opts || {};
    SEL = sel;
    highlightTree();
    renderInspector();
    if (sel.chapter && !opts.noNav) gotoPreview(sel.chapter, sel.sub);
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
    if (SEL.kind === 'part-sub') return renderPartSub(box, SEL);
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

    // Chapter actions: reorder / remove (cover + welcome film are fixed)
    if (ch.id !== 'cover' && ch.id !== 'intro') {
      var chIx = -1;
      PB.chapters.forEach(function (c, ix) { if (c.id === ch.id) chIx = ix; });
      var loIx = firstMovableIndex();
      box.appendChild(el('div', { class: 'ch-actions' }, [
        el('button', { class: 'btn', disabled: chIx <= loIx ? 'disabled' : null, onclick: function () { moveChapter(ch.id, -1); } }, ['↑ Move up']),
        el('button', { class: 'btn', disabled: chIx >= PB.chapters.length - 1 ? 'disabled' : null, onclick: function () { moveChapter(ch.id, 1); } }, ['↓ Move down']),
        el('button', { class: 'btn danger', onclick: function () { deleteChapter(ch.id); } }, ['Delete chapter'])
      ]));
    }

    // Chapter label + card description
    box.appendChild(sectionLabel('Chapter'));
    box.appendChild(textField('Title', ch.label || '', function (v) { ch.label = v; touch(); renderTree(); }, 'Shown in the menu, rail and navigation.'));
    if (ch.id !== 'cover' && ch.id !== 'intro') {
      // Chapter number / label: the numeral drives the default "Chapter N"
      // opener label, the rail number and the Contents-tile eyebrow. A custom
      // label replaces the opener label verbatim; blank numeral hides all.
      box.appendChild(textField('Chapter number (e.g. 04 or XI — blank hides it)', ch.numeral || '', function (v) { ch.numeral = v.trim(); touch(); renderTree(); }, 'Shown on the opener as “Chapter N”, in the rail and on the Contents tile.'));
      box.appendChild(textField('Custom chapter label (optional)', ch.labelText || '', function (v) { ch.labelText = v.trim(); touch(); }, 'Replaces “Chapter N” on the opener, e.g. “Section 3 · Opportunity 5”.'));
      box.appendChild(checkField('Hide the chapter label on the opener', !!ch.hideLabel, function (v) { ch.hideLabel = v; touch(); }));
      box.appendChild(textField('Menu tile text', PB.menuDesc[ch.id] || '', function (v) { PB.menuDesc[ch.id] = v; touch(); }, 'Shown on this chapter\u2019s tile on the Contents page.', true));
      box.appendChild(textField('Opener sub-line', ch.opener || '', function (v) { ch.opener = v; touch(); }, 'Shown under the title on the chapter\u2019s opening page.', true));
      var prefix0 = prosePrefixFor(ch, type);
      if (prefix0 && (type === 'standard' || type === 'sections-list' || type === 'lifecycle' || type === 'directory' || type === 'letter')) {
        box.appendChild(imageField('Opener image (header + menu tile)', PB.prose[prefix0 + '.opener.bg'] || '', function (fn) { PB.prose[prefix0 + '.opener.bg'] = fn; touch(); }));
        box.appendChild(videoField('Opener video (above the text)', PB.prose[prefix0 + '.opener.video'] || '', function (fn) { PB.prose[prefix0 + '.opener.video'] = fn; touch(); }));
        var body0 = bodyForChapter(ch);
        box.appendChild(paraArrayField('Opening paragraph(s)', body0.intro || [], function (arr) { body0.intro = arr; touch(); }));
      }
      // Tile-menu chapters: the tiles are the whole point — title, text,
      // optional image and the chapter each tile links to.
      if (type === 'card-track') {
        ch.track = ch.track || [];
        var trackTargets = [{ v: 'menu', l: 'Contents page' }].concat(PB.chapters.map(function (c) {
          return { v: c.id, l: (c.numeral ? c.numeral + ' · ' : '') + (c.label || c.id) };
        }));
        box.appendChild(sectionLabel('Cards (' + ch.track.length + ')'));
        renderRepeatable(box, ch.track, {
          nameOf: function (c) { return (c.num ? c.num + ' · ' : '') + (c.title || '(card)'); },
          subOf: function (c) { return (c.links || []).length + ' link(s)'; },
          open: null,
          inlineEdit: function (c, wrap) {
            wrap.appendChild(textField('Number', c.num || '', function (v) { c.num = v; touch(); }, 'e.g. 01'));
            wrap.appendChild(textField('Eyebrow label', c.label || '', function (v) { c.label = v; touch(); }, 'e.g. SECTION 1'));
            wrap.appendChild(textField('Title', c.title || '', function (v) { c.title = v; touch(); }));
            wrap.appendChild(textField('Icon (emoji or short text)', c.icon || '', function (v) { c.icon = v; touch(); }, 'e.g. 🗓 or ⚑'));
            wrap.appendChild(textField('Pill text', c.pill || '', function (v) { c.pill = v; touch(); }, 'e.g. 1 OPPORTUNITY'));
            c.links = c.links || [];
            wrap.appendChild(sectionLabel('Links (' + c.links.length + ')'));
            renderRepeatable(wrap, c.links, {
              nameOf: function (l) { return l.name || '(link)'; },
              subOf: function (l) {
                var t = trackTargets.filter(function (x) { return x.v === l.target; })[0];
                return '→ ' + (t ? t.l : 'Contents page');
              },
              open: null,
              inlineEdit: function (l, wrap2) {
                wrap2.appendChild(textField('Number', l.num || '', function (v) { l.num = v; touch(); }));
                wrap2.appendChild(textField('Name', l.name || '', function (v) { l.name = v; touch(); }));
                wrap2.appendChild(selectField('Links to', l.target || 'menu', trackTargets, function (v) { l.target = v; touch(); }));
              },
              addLabel: 'Add link',
              make: function () { return { num: String(c.links.length + 1), name: 'New link', target: 'menu' }; }
            });
          },
          addLabel: 'Add card',
          make: function () { return { num: '0' + (ch.track.length + 1), icon: '', label: 'SECTION ' + (ch.track.length + 1), title: 'New card', pill: '', links: [] }; }
        });
        var bodyT2 = bodyForChapter(ch);
        box.appendChild(paraArrayField('Intro paragraph(s) above the track (optional)', bodyT2.intro || [], function (arr) { bodyT2.intro = arr; touch(); }));
      }
      if (type === 'part') {
        ch.subs = ch.subs || [];
        ch.subs.forEach(function (s) { if (!s.depth) s.depth = 1; });
        var sections1 = ch.subs.filter(function (s) { return s.depth === 1; });
        box.appendChild(sectionLabel('Sections (' + sections1.length + ')'));
        renderRepeatable(box, sections1, {
          nameOf: function (s) { return s.label || '(section)'; },
          subOf: function (s) {
            var ix = ch.subs.indexOf(s);
            var n = 0;
            for (var j = ix + 1; j < ch.subs.length && ch.subs[j].depth === 2; j++) n++;
            return n + ' sub-topic(s) indented under it';
          },
          open: function (s) { select({ kind: 'part-sub', id: s.id, chapter: ch.id, sub: s.id }); },
          addLabel: 'Add section',
          make: function () {
            var ns = { id: uid('sec'), label: 'New section', depth: 1 };
            PB.sectionBodies[ns.id] = { intro: [], sections: [] };
            return ns;
          },
          onChange: function () {
            // sections1 is a filtered copy — write it back, keeping each
            // section's trailing depth-2 topic run attached to it
            var runs = {}, curId = null;
            (ch.subs || []).forEach(function (s2) {
              if (s2.depth === 1) { curId = s2.id; runs[curId] = []; }
              else if (curId) runs[curId].push(s2);
            });
            var rebuilt = [];
            sections1.forEach(function (s1) {
              rebuilt.push(s1);
              (runs[s1.id] || []).forEach(function (t) { rebuilt.push(t); });
            });
            ch.subs = rebuilt;
          }
        });
        var bodyP = bodyForChapter(ch);
        box.appendChild(paraArrayField('Part intro paragraph(s) (optional)', bodyP.intro || [], function (arr) { bodyP.intro = arr; touch(); }));
      }
      if (type === 'tile-menu') {
        box.appendChild(sectionLabel('Tiles (' + (ch.tiles || []).length + ')'));
        var tileTargets = [{ v: 'menu', l: 'Contents page' }].concat(PB.chapters.map(function (c) {
          return { v: c.id, l: (c.numeral ? c.numeral + ' · ' : '') + (c.label || c.id) };
        }));
        ch.tiles = ch.tiles || [];
        renderRepeatable(box, ch.tiles, {
          nameOf: function (t) { return t.title || '(tile)'; },
          subOf: function (t) {
            var tgt = tileTargets.filter(function (x) { return x.v === t.target; })[0];
            return '→ ' + (tgt ? tgt.l : 'Contents page');
          },
          open: null,
          inlineEdit: function (t, wrap) {
            wrap.appendChild(textField('Tile title', t.title || '', function (v) { t.title = v; touch(); }));
            wrap.appendChild(textField('Tile text', t.text || '', function (v) { t.text = v; touch(); }, '', true));
            wrap.appendChild(imageField('Tile image (optional)', t.img || '', function (fn) { t.img = fn; touch(); }));
            wrap.appendChild(selectField('Links to', t.target || 'menu', tileTargets, function (v) { t.target = v; touch(); }));
          },
          addLabel: 'Add tile',
          make: function () { return { title: 'New tile', text: '', img: '', target: 'menu' }; }
        });
        var bodyT = bodyForChapter(ch);
        box.appendChild(paraArrayField('Intro paragraph(s) above the tiles (optional)', bodyT.intro || [], function (arr) { bodyT.intro = arr; touch(); }));
      }
    }
    if (ch.id === 'cover') {
      box.appendChild(sectionLabel('Cover page'));
      box.appendChild(imageField('Cover image', PB.prose['cover.bg'] || '', function (fn) { PB.prose['cover.bg'] = fn; touch(); }));
      box.appendChild(textField('Cover title (HTML allowed)', PB.prose['cover.titleHtml'] || '', function (v) { PB.prose['cover.titleHtml'] = v; touch(); }, 'e.g. Finance<br/><em>Playbook</em>', true));
      box.appendChild(textField('Cover sub-line', PB.prose['cover.sub'] || '', function (v) { PB.prose['cover.sub'] = v; touch(); }, '', true));
      box.appendChild(sectionLabel('Contents page (menu)'));
      box.appendChild(textField('Menu eyebrow', PB.prose['menu.running'] || '', function (v) { PB.prose['menu.running'] = v; touch(); }, 'Small line above the menu title. Defaults to the playbook title.'));
      box.appendChild(textField('Menu title', PB.prose['menu.title'] || '', function (v) { PB.prose['menu.title'] = v; touch(); }, 'e.g. Explore the Playbook'));
      box.appendChild(textField('Menu intro line', PB.prose['menu.lede'] || '', function (v) { PB.prose['menu.lede'] = v; touch(); }, 'Optional line under the menu title.', true));
    }
    if (ch.id === 'intro' || type === 'intro-video') {
      box.appendChild(sectionLabel('Welcome film'));
      box.appendChild(videoField('Welcome video', PB.prose['intro.video'] || '', function (fn) { PB.prose['intro.video'] = fn; touch(); }));
      box.appendChild(textField('Eyebrow', PB.prose['intro.eyebrow'] || '', function (v) { PB.prose['intro.eyebrow'] = v; touch(); }));
      box.appendChild(textField('Title', PB.prose['intro.title'] || '', function (v) { PB.prose['intro.title'] = v; touch(); }));
      box.appendChild(textField('Button label', PB.prose['intro.nextLabel'] || '', function (v) { PB.prose['intro.nextLabel'] = v; touch(); }, 'e.g. Continue to Contents'));
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
      box.appendChild(selectField('Stage pages below the wheel', ch.showStagePages === 'shown' ? 'shown' : 'hidden', [
        { v: 'hidden', l: 'Hidden (default) — wheel + hover captions only' },
        { v: 'shown', l: 'Shown — each stage also gets a page at the bottom' }
      ], function (v) { ch.showStagePages = v === 'shown' ? 'shown' : null; touch(); }));
      box.appendChild(el('div', { class: 'note', text: 'Stages appear on the interactive wheel automatically — hover or tap a slice to preview it, and link each slice to its chapter. Bottom stage pages are hidden unless you turn them on above.' }));
      renderRepeatable(box, PB.lifecycle, {
        nameOf: function (s) { return (s.letter ? s.letter + '. ' : '') + s.label; },
        subOf: function (s) { return s.lede || ''; },
        open: function (s) { select({ kind: 'lifecycle-sub', id: s.id, chapter: ch.id, sub: s.id }); },
        addLabel: 'Add lifecycle stage',
        make: function () { return { id: uid('sub'), letter: String.fromCharCode(65 + PB.lifecycle.length), label: 'New stage', img: '', lede: '' }; },
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
    // Authored sectionBodies win (a chapter that merely LANDS on id ch-4/ch-5
    // must not fall back to the seed's legacy ch4/ch5 containers).
    if (PB.sectionBodies && PB.sectionBodies[ch.id]) return PB.sectionBodies[ch.id];
    if (ch.id === 'ch-4') return PB.ch4;
    if (ch.id === 'ch-5') return PB.ch5;
    PB.sectionBodies = PB.sectionBodies || {};
    if (!PB.sectionBodies[ch.id]) PB.sectionBodies[ch.id] = { intro: [], sections: [] };
    return PB.sectionBodies[ch.id];
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
    box.appendChild(textField('Label', sub.label || '', function (v) { sub.label = v; touch(); renderTree(); }, 'Shown on the wheel slice and as the stage\u2019s page title.'));
    box.appendChild(textField('Summary (lede)', sub.lede || '', function (v) { sub.lede = v; touch(); }, '', true));
    // Optional redirect: this stage's wheel slice can open another chapter
    // instead of its own page at the bottom of the wheel.
    var linkOpts = [{ v: '', l: 'Own page (bottom of the wheel)' }];
    PB.chapters.forEach(function (c) {
      if (c.id === 'cover' || c.id === 'intro' || c.id === sel.chapter || c.type === 'cover' || c.type === 'intro-video') return;
      linkOpts.push({ v: c.id, l: (c.numeral ? c.numeral + ' · ' : '') + (c.label || c.id) });
    });
    box.appendChild(selectField('Link to chapter (optional)', sub.link || '', linkOpts, function (v) {
      sub.link = v || null;
      touch();
    }));
    box.appendChild(imageField('Hero image', sub.img || '', function (fn) { sub.img = fn; touch(); }));
    box.appendChild(textField('Tagline (optional)', content.tagline || '', function (v) { content.tagline = v; touch(); }, 'Overrides the hero tagline.'));
    box.appendChild(paraArrayField('Intro paragraphs', content.intro || [], function (arr) { content.intro = arr; touch(); }));

    box.appendChild(sectionLabel('Policy sections'));
    renderSectionsList(box, content, null, sel.id);
  }

  // Part sub-topic inspector: label + intro + sections. Bodies live in
  // sectionBodies[subId] — the same container as chapter bodies.
  function renderPartSub(box, sel) {
    var ch = PB.chapters.filter(function (c) { return c.id === sel.chapter; })[0];
    var sub = (ch && ch.subs || []).filter(function (s) { return s.id === sel.id; })[0];
    if (!sub) return;
    if (!sub.depth) sub.depth = 1;
    var content = PB.sectionBodies[sel.id] || (PB.sectionBodies[sel.id] = { intro: [], sections: [] });
    var isSection = sub.depth === 1;
    inspTitle(box, sub.label || 'Sub-topic', (isSection ? 'Section of “' : 'Sub-topic of “') + (ch.label || ch.id) + '”',
      function () { select({ kind: 'chapter', id: sel.chapter, type: 'part', chapter: sel.chapter }); });
    box.appendChild(sectionLabel(isSection ? 'Section' : 'Sub-topic'));
    box.appendChild(textField('Label', sub.label || '', function (v) { sub.label = v; touch(); renderTree(); },
      isSection ? 'Shown as the first indent level under the part.' : 'Shown double-indented under its section.'));
    box.appendChild(paraArrayField('Intro paragraphs', content.intro || [], function (arr) { content.intro = arr; touch(); }));
    if (isSection) {
      // a § section lists its own sub-topics (the depth-2 subs that follow it)
      var myTopics = [];
      var seen = false;
      (ch.subs || []).forEach(function (s2) {
        if (s2 === sub) { seen = true; return; }
        if (!seen) return;
        if (s2.depth === 1) seen = false;
        else myTopics.push(s2);
      });
      box.appendChild(sectionLabel('Sub-topics (' + myTopics.length + ')'));
      renderRepeatable(box, myTopics, {
        nameOf: function (t) { return t.label || '(sub-topic)'; },
        subOf: function () { return 'Indented under this section'; },
        open: function (t) { select({ kind: 'part-sub', id: t.id, chapter: ch.id, sub: t.id }); },
        addLabel: 'Add sub-topic',
        make: function () {
          var ns = { id: uid('top'), label: 'New sub-topic', depth: 2 };
          PB.sectionBodies[ns.id] = { intro: [], sections: [] };
          return ns;
        },
        onChange: function () {
          // myTopics is a derived view — splice it back over the old run
          var ix = ch.subs.indexOf(sub);
          var run = 0;
          for (var j = ix + 1; j < ch.subs.length && ch.subs[j].depth === 2; j++) run++;
          ch.subs.splice.apply(ch.subs, [ix + 1, run].concat(myTopics));
        }
      });
    } else {
      box.appendChild(sectionLabel('Sections'));
      renderSectionsList(box, content, null, sel.id);
    }
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
    if (Array.isArray(sec.blurb)) {
      box.appendChild(paraArrayField('Lead paragraph(s)', sec.blurb, function (arr) { sec.blurb = arr; touch(); }));
    } else {
      box.appendChild(textField('Lead sentence (optional)', sec.blurb || '', function (v) { sec.blurb = v; touch(); }, '', true));
    }
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
      nameOf: function (it) { return typeof it === 'string' ? (it.slice(0, 60) || '(empty)') : (it.name || '(item)'); },
      subOf: function (it) { return typeof it === 'string' ? 'Text' : (symbolLabel(it.s) + (it.blurb ? ' · ' + it.blurb : '')); },
      open: function (it, i) { select({ kind: 'item', ref: { arr: sec.items, index: i }, chapter: sel.chapter, sub: sel.sub, backSel: SEL }); },
      addLabel: 'Add item',
      make: function () { return { s: 'policy', name: 'New item', blurb: '', url: '' }; }
    });
    // Rich frames: image / video / tabbed interaction
    box.appendChild(el('div', { class: 'media-actions', style: 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;' }, [
      el('button', { class: 'btn ghost', onclick: function () { addMediaItem(sec, 'image'); } }, ['+ Add image']),
      el('button', { class: 'btn ghost', onclick: function () { addMediaItem(sec, 'video'); } }, ['+ Add video']),
      el('button', { class: 'btn ghost', onclick: function () {
        sec.items.push({ s: 'tabs', name: 'Tabbed group', tabs: [{ label: 'Tab 1', text: '' }] });
        touch(); renderInspector();
      } }, ['+ Add tabs']),
      el('button', { class: 'btn ghost', onclick: function () {
        sec.items.push({ s: 'timeline', name: 'Timeline', mode: 'all', steps: [{ label: 'Step 1', text: '', url: '' }] });
        touch(); renderInspector();
      } }, ['+ Add timeline']),
      el('button', { class: 'btn ghost', onclick: function () {
        sec.items.push({ s: 'checklist', name: 'Checklist', items: [{ label: 'New item', url: '' }] });
        touch(); renderInspector();
      } }, ['+ Add checklist'])
    ]));
  }

  function addMediaItem(sec, kind) {
    chooseFile(kind === 'image' ? 'image/*' : 'video/*', function (dataUrl, name, file) {
      function finish(dataUrl2, compressed) {
        if (!dataUrl2) return;
        var virtual = (kind === 'image' ? 'img/' : 'video/') + 'upload_' + Date.now() + '_' + safeName(name);
        PB.assets[virtual] = dataUrl2;
        sec.items = sec.items || [];
        sec.items.push({ s: kind, name: name.replace(/\.[a-z0-9]+$/i, ''), url: virtual });
        if (kind === 'video') probeVideo(dataUrl2, name);
        touch(); renderInspector();
        if (compressed) toast('Video compressed automatically (720p H.264) so it fits the cloud limit.', 'ok');
      }
      if (kind === 'video' && file && file.size >= COMPRESS_ABOVE) {
        return processVideoUpload(name, file, finish);
      }
      if (kind === 'image') {
        return withCompressedImage(dataUrl, name, function (dataUrl2) { finish(dataUrl2, false); });
      }
      finish(dataUrl, false);
    });
  }

  function inlineHighlight(h, wrap) {
    wrap.appendChild(textField('Label', h.label || '', function (v) { h.label = v; touch(); }));
    wrap.appendChild(textField('Text', h.text || '', function (v) { h.text = v; touch(); }, '', true));
    wrap.appendChild(textField('Icon key (optional)', h.icon || '', function (v) { h.icon = v; touch(); }, 'Built-in icon name.'));
  }

  function renderItem(box, sel) {
    var it = sel.ref.arr[sel.ref.index];
    // Plain-text bullet (e.g. imported list items): edit the text directly.
    if (typeof it === 'string') {
      inspTitle(box, it.slice(0, 40) || 'Text item', 'Text bullet', function () { SEL = sel.backSel; renderInspector(); });
      box.appendChild(sectionLabel('Bullet'));
      box.appendChild(textField('Text', it, function (v) { sel.ref.arr[sel.ref.index] = v; touch(); }, '', true));
      return;
    }
    inspTitle(box, it.name || 'Item', 'Resource / media / tab item', function () { SEL = sel.backSel; renderInspector(); });
    box.appendChild(sectionLabel('Item'));
    box.appendChild(selectField('Type', it.s || 'policy', ITEM_SYMBOLS, function (v) { it.s = v; touch(); renderInspector(); }));
    box.appendChild(textField('Name', it.name || '', function (v) { it.name = v; touch(); }));
    if (it.s === 'image' || it.s === 'video') {
      box.appendChild(el('div', { class: 'note', text: 'File: ' + (it.url || '(none)') }));
      box.appendChild(el('button', { class: 'btn', onclick: function () {
        chooseFile(it.s === 'image' ? 'image/*' : 'video/*', function (dataUrl, name, file) {
          function finish(dataUrl2, compressed) {
            if (!dataUrl2) return;
            var virtual = (it.s === 'image' ? 'img/' : 'video/') + 'upload_' + Date.now() + '_' + safeName(name);
            PB.assets[virtual] = dataUrl2;
            it.url = virtual;
            if (it.s === 'video') probeVideo(dataUrl2, name);
            touch(); renderInspector();
            if (compressed) toast('Video compressed automatically (720p H.264) so it fits the cloud limit.', 'ok');
          }
          if (it.s === 'video' && file && file.size >= COMPRESS_ABOVE) {
            return processVideoUpload(name, file, finish);
          }
          if (it.s === 'image') {
            return withCompressedImage(dataUrl, name, function (dataUrl2) { finish(dataUrl2, false); });
          }
          finish(dataUrl, false);
        });
      } }, ['Replace ' + it.s + '…']));
      if (it.s === 'image') renderHotspotEditor(box, it);
      return;
    }
    if (it.s === 'tabs') {
      it.tabs = it.tabs || [];
      box.appendChild(sectionLabel('Tabs (' + it.tabs.length + ')'));
      renderRepeatable(box, it.tabs, {
        nameOf: function (t) { return t.label || '(tab)'; },
        subOf: function (t) { return (t.text || '').slice(0, 60); },
        open: null,
        inlineEdit: function (t, wrap) {
          wrap.appendChild(textField('Tab label', t.label || '', function (v) { t.label = v; touch(); }));
          wrap.appendChild(textField('Tab content', t.text || '', function (v) { t.text = v; touch(); }, '', true));
        },
        addLabel: 'Add tab',
        make: function () { return { label: 'Tab ' + (it.tabs.length + 1), text: '' }; }
      });
      return;
    }
    if (it.s === 'timeline') {
      box.appendChild(selectField('Style', it.variant === 'history' ? 'history' : 'steps', [
        { v: 'steps', l: 'Numbered steps (gold rail)' },
        { v: 'history', l: 'History timeline (years + images)' }
      ], function (v) { it.variant = v; touch(); renderInspector(); }));
      if (it.variant !== 'history') {
        box.appendChild(selectField('Display', it.mode === 'reveal' ? 'reveal' : 'all', [
          { v: 'all', l: 'Show all steps' },
          { v: 'reveal', l: 'Click to reveal each step' }
        ], function (v) { it.mode = v; touch(); }));
      }
      it.steps = it.steps || [];
      var hist = it.variant === 'history';
      box.appendChild(sectionLabel((hist ? 'Events' : 'Steps') + ' (' + it.steps.length + ')'));
      renderRepeatable(box, it.steps, {
        nameOf: function (s) { return s.label || (hist ? '(event)' : '(step)'); },
        subOf: function (s) { return (s.text || '').slice(0, 60); },
        open: null,
        inlineEdit: function (s, wrap) {
          wrap.appendChild(textField(hist ? 'Year / marker' : 'Step label', s.label || '', function (v) { s.label = v; touch(); }));
          if (hist) wrap.appendChild(textField('Eyebrow line (optional)', s.sub || '', function (v) { s.sub = v; touch(); }, 'Small caps line under the year, e.g. “The Oriental · Bangkok”.'));
          wrap.appendChild(textField(hist ? 'Event text' : 'Step text', s.text || '', function (v) { s.text = v; touch(); }, '', true));
          if (hist) wrap.appendChild(imageField('Event image (optional)', s.img || '', function (fn) { s.img = fn; touch(); }));
          wrap.appendChild(linkField('Link (optional)', s.url || '', function (v) { s.url = v; touch(); }));
        },
        addLabel: hist ? 'Add event' : 'Add step',
        make: function () { return hist ? { label: String(1900 + it.steps.length), sub: '', text: '', img: '', url: '' } : { label: 'Step ' + (it.steps.length + 1), text: '', url: '' }; }
      });
      return;
    }
    if (it.s === 'checklist') {
      it.items = it.items || [];
      box.appendChild(sectionLabel('Checklist items (' + it.items.length + ')'));
      renderRepeatable(box, it.items, {
        nameOf: function (c) { return c.label || '(item)'; },
        subOf: function (c) { return c.url || ''; },
        open: null,
        inlineEdit: function (c, wrap) {
          wrap.appendChild(textField('Item text', c.label || '', function (v) { c.label = v; touch(); }));
          wrap.appendChild(linkField('Link (optional)', c.url || '', function (v) { c.url = v; touch(); }));
        },
        addLabel: 'Add checklist item',
        make: function () { return { label: 'New item', url: '' }; }
      });
      return;
    }
    if (it.s === 'table') {
      // Rows are edited as text: one row per line, cells separated by |.
      // headFirst tracks the header intent independently of current content,
      // so checking it on an empty table then typing still yields a header.
      if (it.headFirst === undefined) it.headFirst = !!(it.head && it.head.length);
      function tableToText() {
        var lines = [];
        if (it.head && it.head.length) lines.push(it.head.join(' | '));
        (it.rows || []).forEach(function (r) { lines.push((Array.isArray(r) ? r : [r]).join(' | ')); });
        return lines.join('\n');
      }
      box.appendChild(checkField('First row is the header', !!it.headFirst, function (v) {
        it.headFirst = v;
        if (!v && it.head && it.head.length) { it.rows = [it.head].concat(it.rows || []); it.head = []; }
        if (v && !(it.head && it.head.length) && it.rows && it.rows.length) { it.head = it.rows.shift(); }
        touch(); renderInspector();
      }));
      box.appendChild(textField('Rows (one per line, cells separated by |)', tableToText(), function (v) {
        var lines = v.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
        var grid = lines.map(function (l) { return l.split('|').map(function (c) { return c.trim(); }); });
        if (it.headFirst) { it.head = grid.shift() || []; it.rows = grid; }
        else { it.rows = grid; }
        touch();
      }, 'e.g. Strong fence | One More Night | Increase minimum stay to 4 nights', true));
      return;
    }
    if (it.s === 'callout') {
      box.appendChild(textField('Label', it.label || '', function (v) { it.label = v; it.name = v; touch(); }, 'Small caps line, e.g. INSTRUCTION or CONTROL 1.'));
      box.appendChild(textField('Text', it.text || '', function (v) { it.text = v; touch(); }, '', true));
      box.appendChild(selectField('Tone', it.tone === 'warning' ? 'warning' : 'note', [
        { v: 'note', l: 'Note (warm neutral, gold bar)' },
        { v: 'warning', l: 'Warning (red — controls and constraints)' }
      ], function (v) { it.tone = v; touch(); }));
      return;
    }
    box.appendChild(textField('Description', it.blurb || '', function (v) { it.blurb = v; touch(); }, '', true));
    box.appendChild(linkField('Link (URL)', it.url || '', function (v) { it.url = v; touch(); }));
  }

  function symbolLabel(s) {
    var m = ITEM_SYMBOLS.filter(function (x) { return x.v === s; })[0];
    return m ? m.l : (s || 'Item');
  }

  // ---- Hotspot editor (image items) --------------------------------------
  // Authors drop numbered pins on an image; readers click pins to reveal
  // popup text. A figure-level toggle displays all hotspots at once.
  var hotspotArm = null; // { item } when placement mode is armed

  function renderHotspotEditor(box, it) {
    it.hotspots = it.hotspots || [];
    box.appendChild(sectionLabel('Hotspots (' + it.hotspots.length + ')'));
    box.appendChild(el('div', { class: 'note', text: 'Numbered pins on the image. Readers click a pin to reveal its text, or use "Display all hotspots".' }));

    // Default display mode for readers.
    box.appendChild(selectField('Default display', it.hotspotsMode === 'show' ? 'show' : 'reveal', [
      { v: 'reveal', l: 'Click to reveal (one at a time)' },
      { v: 'show', l: 'Display all hotspots' }
    ], function (v) { it.hotspotsMode = v; touch(); }));

    // Placement surface: click on the image to drop a pin.
    var url = assetPreview(it.url) || '';
    var surface = el('div', {
      class: 'hotspot-surface',
      style: 'position:relative;display:inline-block;max-width:100%;border:1px solid var(--line);' +
        (hotspotArm && hotspotArm.item === it ? 'cursor:crosshair;outline:2px solid #B59060;' : '')
    });
    var img = el('img', { src: url, style: 'max-width:100%;display:block;' });
    surface.appendChild(img);
    it.hotspots.forEach(function (h, i) {
      surface.appendChild(el('span', {
        style: 'position:absolute;left:' + h.x + '%;top:' + h.y + '%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#B59060;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:600 11px system-ui;box-shadow:0 2px 6px rgba(13,11,8,.3);'
      }, [String(i + 1)]));
    });
    surface.addEventListener('click', function (e) {
      if (!hotspotArm || hotspotArm.item !== it) return;
      var r = surface.getBoundingClientRect();
      var x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
      var y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
      it.hotspots.push({ x: Math.max(2, Math.min(98, x)), y: Math.max(3, Math.min(97, y)), label: 'Point ' + (it.hotspots.length + 1), text: '' });
      hotspotArm = null;
      touch(); renderInspector();
    });
    box.appendChild(surface);

    box.appendChild(el('div', { style: 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;' }, [
      el('button', { class: 'btn ghost', onclick: function () {
        hotspotArm = hotspotArm && hotspotArm.item === it ? null : { item: it };
        renderInspector();
      } }, [hotspotArm && hotspotArm.item === it ? 'Cancel placement' : '＋ Add hotspot (click on the image)'])
    ]));

    renderRepeatable(box, it.hotspots, {
      nameOf: function (h) { return h.label || '(point)'; },
      subOf: function (h) { return (h.text || '').slice(0, 60); },
      open: null,
      inlineEdit: function (h, wrap) {
        wrap.appendChild(textField('Label', h.label || '', function (v) { h.label = v; touch(); }));
        wrap.appendChild(textField('Popup text', h.text || '', function (v) { h.text = v; touch(); }, 'Shown when a reader clicks this pin.', true));
      },
      addLabel: '',
      make: null
    });
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
    // Move up/down on every list — same affordance as chapters have, applied
    // to sections, items, lifecycle stages, tabs, highlights and people.
    right.push(el('button', { class: 'icon-btn', title: 'Move up', disabled: i === 0 ? 'disabled' : null, onclick: function () {
      if (i === 0) return;
      var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t;
      touch(); if (opts.onChange) opts.onChange(); renderInspector();
    } }, ['↑']));
    right.push(el('button', { class: 'icon-btn', title: 'Move down', disabled: i === arr.length - 1 ? 'disabled' : null, onclick: function () {
      if (i >= arr.length - 1) return;
      var t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t;
      touch(); if (opts.onChange) opts.onChange(); renderInspector();
    } }, ['↓']));
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
    var field = textField(label, (arr || []).join('\n\n'), function (v) {
      onChange(v.trim() ? v.split(/\n\n+/) : []);
      field.querySelectorAll('.para-media-row').forEach(function (r) { r.remove(); });
      field.appendChild(paraMediaRow(field.querySelector('textarea')));
    }, 'Each blank line starts a new paragraph.', true);
    var hint = el('div', { class: 'tip', text: 'Add images inline with the buttons below (they insert an [img:…] marker at your cursor), or type [img:name], [img:left name], [img:right name] on their own line.' });
    field.appendChild(hint);
    var ta = field.querySelector('textarea');
    if (ta) {
      field.appendChild(el('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;' }, [
        el('button', { class: 'btn ghost', onclick: function () { insertInlineImage(ta, ''); } }, ['＋ Image under text']),
        el('button', { class: 'btn ghost', onclick: function () { insertInlineImage(ta, 'left'); } }, ['＋ Image left of text']),
        el('button', { class: 'btn ghost', onclick: function () { insertInlineImage(ta, 'right'); } }, ['＋ Image right of text']),
        el('button', { class: 'btn ghost', onclick: function () { insertInlineVideo(ta, ''); } }, ['＋ Video under text']),
        el('button', { class: 'btn ghost', onclick: function () { insertInlineVideo(ta, 'left'); } }, ['＋ Video left of text']),
        el('button', { class: 'btn ghost', onclick: function () { insertInlineVideo(ta, 'right'); } }, ['＋ Video right of text']),
        el('button', { class: 'btn ghost', onclick: function () {
          var start = ta.selectionStart, end = ta.selectionEnd;
          if (start == null || start === end) { toast('Select some text in the field first, then click Link.', 'err'); return; }
          var url = window.prompt('Link URL (https://…)');
          if (!url) return;
          url = url.trim();
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          var text = ta.value.slice(start, end);
          ta.value = ta.value.slice(0, start) + '[' + text + '](' + url + ')' + ta.value.slice(end);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          toast('Link added to "' + text.slice(0, 30) + (text.length > 30 ? '…' : '') + '"', 'ok');
        } }, ['＋ Link selected text'])
      ]));
      field.appendChild(paraMediaRow(ta));
    }
    return field;
  }

  // One-click inline image: pick a file, then the asset AND the marker land
  // together at the cursor (block, or floated left/right of the text).
  function insertInlineImage(ta, side) {
    if (!ta) return;
    chooseImage(function (dataUrlRaw, fileName) {
      withCompressedImage(dataUrlRaw, fileName, function (dataUrl) {
      var base = safeName(fileName).replace(/\.[a-z0-9]+$/i, '') || 'img';
      var name = base, i = 2;
      while (PB.assets['img/' + name]) { name = base + '-' + i; i++; }
      PB.assets['img/' + name] = dataUrl;
      var marker = side ? '[img:' + side + ' ' + name + ']' : '[img:' + name + ']';
      var v = ta.value;
      var pos = (typeof ta.selectionStart === 'number' && ta.selectionStart >= 0) ? ta.selectionStart : v.length;
      var before = v.slice(0, pos).replace(/\s+$/, '');
      var after = v.slice(pos).replace(/^\s+/, '');
      ta.value = (before ? before + '\n\n' : '') + marker + (after ? '\n\n' + after : '');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      toast('Image inserted ' + (side ? 'floating ' + side + ' of the text' : 'as a block under the text') + '.', 'ok');
      });
    });
  }

  // One-click inline video: pick a file, then the asset AND the [vid:…]
  // marker land together at the cursor.
  function insertInlineVideo(ta, side) {
    if (!ta) return;
    chooseFile('video/*', function (dataUrl, fileName, file) {
      processVideoUpload(fileName, file, function (dataUrl2, compressed) {
        if (!dataUrl2) return;
        probeVideo(dataUrl2, fileName);
        var base = safeName(fileName).replace(/\.[a-z0-9]+$/i, '') || 'vid';
        var name = base, i = 2;
        while (PB.assets['video/' + name]) { name = base + '-' + i; i++; }
        PB.assets['video/' + name] = dataUrl2;
      var marker = side ? '[vid:' + side + ' ' + name + ']' : '[vid:' + name + ']';
      var v = ta.value;
      var pos = (typeof ta.selectionStart === 'number' && ta.selectionStart >= 0) ? ta.selectionStart : v.length;
      var before = v.slice(0, pos).replace(/\s+$/, '');
      var after = v.slice(pos).replace(/^\s+/, '');
      ta.value = (before ? before + '\n\n' : '') + marker + (after ? '\n\n' + after : '');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      toast('Video inserted ' + (side ? 'floating ' + side + ' of the text' : 'as a block under the text') + '.');
      if (compressed) toast('Video compressed automatically (720p H.264) so it fits the cloud limit.', 'ok');
      });
    });
  }

  // Renders upload slots for each [img…] / [vid…] marker found in a paragraph
  // textarea — including LEGACY raw <figure class="inline-img">…</figure> HTML
  // blocks (written by earlier builds), so those images can also be replaced
  // or deleted here.
  function paraMediaEntries(text) {
    var markers = [], m;
    var re = /\[(img|vid)(?:\s*:\s*(?:left|right))?(?:\s*[:\s]\s*([A-Za-z0-9_\-.]+))?\s*\]/g;
    while ((m = re.exec(text))) {
      var entry = { kind: m[1], name: m[2] || 'inline' };
      if (!markers.some(function (x) { return x.kind === entry.kind && x.name === entry.name; })) markers.push(entry);
    }
    var figVid = /<figure\s+class="inline-img[^"]*"\s*>\s*<video[^>]*>\s*<source\s+src="video\/([^"]+)"/g;
    while ((m = figVid.exec(text))) {
      if (!markers.some(function (x) { return x.kind === 'vid' && x.name === m[1]; })) markers.push({ kind: 'vid', name: m[1] });
    }
    var figImg = /<figure\s+class="inline-img[^"]*"\s*>\s*<img\s+src="img\/([^"]+)"/g;
    while ((m = figImg.exec(text))) {
      if (!markers.some(function (x) { return x.kind === 'img' && x.name === m[1]; })) markers.push({ kind: 'img', name: m[1] });
    }
    return markers;
  }

  // Remove every reference to kind/name from a text value: modern markers
  // ([img:name], [img:left name], …) and legacy raw figure HTML, then tidy
  // any blank-line buildup left behind.
  function stripMediaReferences(text, kind, name) {
    var escName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var out = String(text || '')
      .replace(new RegExp('\\[' + kind + '(?:\\s*:\\s*(?:left|right))?(?:\\s*[:\\s]\\s*' + escName + ')\\s*\\]', 'g'), '')
      .replace(new RegExp('<figure\\s+class="inline-img[^"]*"\\s*>\\s*<video[^>]*>\\s*<source\\s+src="video\\/' + escName + '"[^>]*>\\s*(?:<\\/video>)?\\s*(?:<\\/figure>)?', 'g'), '')
      .replace(new RegExp('<figure\\s+class="inline-img[^"]*"\\s*>\\s*<img\\s+src="img\\/' + escName + '"[^>]*>\\s*(?:<\\/figure>)?', 'g'), '');
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  // True if kind/name is still referenced anywhere else in the playbook
  // (prose, chapter bodies, menu, lifecycle, bare filename fields).
  function assetReferencedElsewhere(kind, name) {
    var hay = JSON.stringify([PB.prose || {}, PB.sectionBodies || {}, PB.lifecycleContent || {},
      PB.menuDesc || {}, PB.chapters || [], PB.lifecycle || []]);
    var pats = [kind + '/' + name, '[' + kind + ':' + name + ']', '[' + kind + ': ' + name + ']',
      '[' + kind + ':left ' + name + ']', '[' + kind + ':right ' + name + ']',
      '[' + kind + ': left ' + name + ']', '[' + kind + ': right ' + name + ']', '"' + name + '"'];
    return pats.some(function (p) { return hay.indexOf(p) !== -1; });
  }

  // Which asset's hotspot editor is expanded in a media chip (inline images).
  var openHotspotKey = null;

  function paraMediaRow(textarea) {
    var row = el('div', { class: 'para-media-row', style: 'margin-top:6px;' });
    if (!textarea) return row;
    var markers = paraMediaEntries(textarea.value || '');
    markers.forEach(function (mk) {
      var key = mk.kind + '/' + mk.name;
      var name = mk.name;
      var has = !!(PB.assets && PB.assets[key]);
      var isVid = mk.kind === 'vid';
      var chip = el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;padding:7px 10px;border:1px solid var(--line);border-radius:4px;background:#FBF9F4;' });
      if (has && !isVid) chip.appendChild(el('div', { class: 'thumb', style: 'flex:none;width:44px;height:30px;background-size:cover;background-position:center;background-image:url(' + cssUrl(PB.assets[key]) + ')' }));
      // Filename ellipsizes instead of pushing the action buttons off-panel.
      chip.appendChild(el('span', { class: 'fn', text: key, style: 'flex:1 1 120px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' }));
      chip.appendChild(el('button', { class: 'btn', style: 'flex:none;', onclick: function () {
        chooseFile(isVid ? 'video/*' : 'image/*', function (dataUrl, fileName, file) {
          function place(dataUrl2) {
            PB.assets[key] = dataUrl2;
            if (isVid) probeVideo(dataUrl2, fileName);
            toast((isVid ? 'Video' : 'Image') + ' "' + name + '" set — it now renders where the marker sits in the text.', 'ok');
            touch(); renderInspector();
          }
          if (isVid && file && file.size >= COMPRESS_ABOVE) {
            return processVideoUpload(fileName, file, function (d2) { if (d2) place(d2); });
          }
          if (!isVid) return withCompressedImage(dataUrl, fileName, place);
          place(dataUrl);
        });
      } }, [has ? 'Replace…' : 'Upload…']));
      // Hotspots: add/edit numbered pins on this image (inline images included).
      if (!isVid && has) {
        chip.appendChild(el('button', { class: 'btn ghost', style: 'flex:none;', title: 'Add or edit hotspots on this image', onclick: function () {
          openHotspotKey = openHotspotKey === key ? null : key;
          renderInspector();
        } }, [openHotspotKey === key ? 'Hotspots ▴' : 'Hotspots…']));
      }
      // Delete: strip the reference(s) from this text, and drop the stored
      // asset entirely when nothing else in the playbook uses it.
      chip.appendChild(el('button', { class: 'btn ghost', style: 'flex:none;', title: 'Remove this ' + (isVid ? 'video' : 'image') + ' from the text' + (has ? ' and delete the stored file if unused elsewhere' : ''), onclick: function () {
        if (!confirm('Remove "' + name + '" from this text' + (has ? ' (the stored file is deleted too when nothing else uses it)' : '') + '?')) return;
        textarea.value = stripMediaReferences(textarea.value, mk.kind, name);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        var stillUsed = has && assetReferencedElsewhere(mk.kind, name);
        if (has && !stillUsed) {
          delete PB.assets[key];
          if (PB.assetHotspots && PB.assetHotspots[key]) delete PB.assetHotspots[key];
          if (openHotspotKey === key) openHotspotKey = null;
        }
        toast('"' + name + '" removed from the text' + (has ? (stillUsed ? ' — the file is kept because other parts of the playbook still use it.' : ' — stored file deleted.') : '.'), 'ok');
        touch(); renderInspector();
      } }, ['✕']));
      row.appendChild(chip);
      // Expanded hotspot editor for this chip's image (asset-keyed record, so
      // the pins render wherever this image appears inline).
      if (!isVid && has && openHotspotKey === key) {
        PB.assetHotspots = PB.assetHotspots || {};
        var rec = PB.assetHotspots[key] || (PB.assetHotspots[key] = { url: key, hotspots: [], hotspotsMode: 'reveal' });
        var hsBox = el('div', { style: 'margin:2px 0 10px;padding:10px;border:1px solid var(--line);border-radius:4px;background:#fff;' });
        renderHotspotEditor(hsBox, rec);
        row.appendChild(hsBox);
      }
    });
    return row;
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

  function checkField(label, checked, onChange) {
    return el('div', { class: 'field' }, [
      el('label', { style: 'display:flex;align-items:center;gap:8px;cursor:pointer;' }, [
        el('input', { type: 'checkbox', checked: checked ? 'checked' : null,
          onchange: function (e) { onChange(e.target.checked); } }),
        el('span', { text: label })
      ])
    ]);
  }

  // Colour picker + hex field + Reset (empty = brand default).
  function colourField(label, value, onChange) {
    var inp = el('input', { type: 'color', value: value || '#B59060',
      style: 'width:44px;height:32px;padding:2px;border:1px solid var(--line);background:#fff;cursor:pointer;border-radius:3px;' });
    var txt = el('input', { type: 'text', value: value || '', placeholder: 'Brand default', style: 'flex:1;' });
    inp.addEventListener('input', function () { txt.value = inp.value; onChange(inp.value); });
    txt.addEventListener('input', function () {
      var v = txt.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { inp.value = v; onChange(v); }
      else if (!v) onChange('');
    });
    var reset = el('button', { class: 'btn ghost', onclick: function () { txt.value = ''; onChange(''); } }, ['Reset']);
    return el('div', { class: 'field' }, [
      el('label', {}, [label]),
      el('div', { style: 'display:flex;gap:8px;align-items:center;' }, [inp, txt, reset])
    ]);
  }

  function imageField(label, current, onPick) {
    var url = assetPreview(current);
    var thumb = el('div', { class: 'thumb', style: url ? 'background-image:url(' + cssUrl(url) + ')' : '' });
    var fn = el('div', { class: 'fn', text: current || '(none)' });
    var pick = el('button', { class: 'btn', onclick: function () { chooseImage(function (dataUrl, name) {
      withCompressedImage(dataUrl, name, function (dataUrl2) {
        var virtual = 'img/upload_' + Date.now() + '_' + safeName(name);
        PB.assets[virtual] = dataUrl2;
        onPick(virtual.replace(/^img\//, ''));   // renderer prefixes img/
        thumb.style.backgroundImage = 'url(' + cssUrl(dataUrl2) + ')';
        fn.textContent = virtual;
        touch();
      });
    }); } }, ['Upload…']);
    return el('div', { class: 'field' }, [
      el('label', {}, [label]),
      el('div', { class: 'img-field' }, [thumb, el('div', { class: 'img-actions' }, [pick, fn])])
    ]);
  }

  function videoField(label, current, onPick) {
    var fn = el('div', { class: 'fn', text: current || '(none)' });
    var pick = el('button', { class: 'btn', onclick: function () { chooseFile('video/*', function (dataUrl, name, file) {
      processVideoUpload(name, file, function (dataUrl2, compressed) {
        if (!dataUrl2) return;
        var virtual = 'video/upload_' + Date.now() + '_' + safeName(name);
        PB.assets[virtual] = dataUrl2;
        onPick(virtual.replace(/^video\//, ''));
        fn.textContent = virtual;
        probeVideo(dataUrl2, name);
        touch();
        if (compressed) toast('Video compressed automatically (720p H.264) so it fits the cloud limit.', 'ok');
      });
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

  // ---- Image compression (canvas — no downloads needed) --------------------
  // Large images (hi-res photos, PDF figure captures) are downscaled to
  // 1600px max and re-encoded as JPEG q0.82 on a white matte (safe for alpha
  // PNGs on the paper-white page). Keeps SCORM packages and cloud content
  // lean; SVG and animated GIF pass through untouched.
  var IMG_COMPRESS_ABOVE = 700 * 1024;
  var IMG_MAX_DIM = 1600;
  function compressImageDataUrl(dataUrl) {
    return new Promise(function (resolve) {
      try {
        var parts = /^data:([^;,]+)?;base64,(.*)$/.exec(dataUrl);
        if (!parts) return resolve(dataUrl);
        if (parts[1] === 'image/svg+xml' || parts[1] === 'image/gif') return resolve(dataUrl);
        var approxBytes = Math.floor(parts[2].length * 3 / 4);
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth, h = img.naturalHeight;
            if (approxBytes <= IMG_COMPRESS_ABOVE && Math.max(w, h) <= IMG_MAX_DIM) return resolve(dataUrl);
            var scale = Math.min(1, IMG_MAX_DIM / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
            var c = document.createElement('canvas');
            c.width = cw; c.height = ch;
            var g = c.getContext('2d');
            g.fillStyle = '#ffffff'; g.fillRect(0, 0, cw, ch);
            g.drawImage(img, 0, 0, cw, ch);
            var out = c.toDataURL('image/jpeg', 0.82);
            resolve(out.length < dataUrl.length ? out : dataUrl);
          } catch (e) { resolve(dataUrl); }
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      } catch (e) { resolve(dataUrl); }
    });
  }
  function withCompressedImage(dataUrl, name, done) {
    compressImageDataUrl(dataUrl).then(function (out) {
      if (out !== dataUrl) toast('Image "' + (name || 'upload') + '" optimised automatically (' + Math.round(dataUrl.length / 1370) + 'KB → ' + Math.round(out.length / 1370) + 'KB).', 'ok');
      done(out);
    });
  }
  function chooseFile(accept, cb) {
    var input = el('input', { type: 'file', accept: accept });
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { cb(r.result, f.name, f); };
      r.readAsDataURL(f);
    };
    input.click();
  }

  // Run a picked video through the compressor when needed, then continue.
  function processVideoUpload(name, file, done) {
    if (!file) return done(null, false);
    busy(true, 'Checking video size…');
    compressVideoIfNeeded(file, function (ratio, msg) { busy(true, msg); }).then(function (r) {
      return blobToDataUrl(r.blob).then(function (dataUrl) {
        busy(false);
        done(dataUrl, r.compressed);
      });
    }).catch(function (e) {
      busy(false);
      toast('Video upload failed: ' + ((e && e.message) || e), 'err');
    });
  }

  // ---- Video compression (ffmpeg.wasm, loaded lazily from CDN) ------------
  // Videos over ~15MB are transcoded to 720p H.264 before upload — typically
  // 60-80% smaller. The cloud limit is 50MB/object; anything still over ~48MB
  // after compression is rejected with clear guidance.
  var COMPRESS_ABOVE = 15 * 1024 * 1024;
  var HARD_LIMIT = 48 * 1024 * 1024;
  var ffmpegLib = null, ffmpegLoading = null;

  function withTimeout(p, ms, label) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        reject(new Error(label + ' is taking too long — check your connection and try again, or compress the video first (HandBrake, 720p MP4).'));
      }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function loadVideoCompressor() {
    if (ffmpegLib) return Promise.resolve(ffmpegLib);
    if (ffmpegLoading) return ffmpegLoading;
    function addScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = function () { reject(new Error('Could not load the video compressor (check your connection).')); };
        document.head.appendChild(s);
      });
    }
    // ffmpeg.wasm 0.12 with the SINGLE-THREADED @ffmpeg/core: the multi-thread
    // build (@ffmpeg/core-mt, and every 0.11 core) needs SharedArrayBuffer,
    // which browsers only expose with COOP/COEP response headers — impossible
    // on GitHub Pages. The 0.12 single-thread core runs everywhere.
    //
    // The ~32MB core+wasm are vendored same-origin under authoring-tool/vendor/
    // (reliable on corporate / mainland-China hotel networks where jsdelivr is
    // slow or blocked); the CDN copy is kept as a fallback only.
    // Core/wasm URLs must be ABSOLUTE: ff.load() runs them through import()
    // inside a module worker, where a bare relative path is treated as an
    // unresolvable module specifier. new URL() also handles the GitHub Pages
    // repo subpath automatically.
    function abs(rel) { return new URL(rel, window.location.href).href; }
    var LOCAL = {
      ffmpeg: 'vendor/ffmpeg/ffmpeg.min.js',
      util: 'vendor/ffmpeg/util.min.js',
      core: abs('vendor/ffmpeg/ffmpeg-core.js'),
      wasm: abs('vendor/ffmpeg/ffmpeg-core.wasm'),
      blob: false
    };
    var CDN = {
      ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.min.js',
      util: 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.min.js',
      core: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasm: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      blob: true
    };
    function attempt(src) {
      return addScript(src.ffmpeg).then(function () {
        return addScript(src.util);
      }).then(function () {
        var FF = window.FFmpegWASM && window.FFmpegWASM.FFmpeg;
        var U = window.FFmpegUtil;
        if (!FF || !U) throw new Error('The video compressor failed to initialise.');
        var ff = new FF();
        var urls = src.blob
          ? Promise.all([U.toBlobURL(src.core, 'text/javascript'), U.toBlobURL(src.wasm, 'application/wasm')])
          : Promise.resolve([src.core, src.wasm]);
        return urls.then(function (u) {
          return withTimeout(ff.load({ coreURL: u[0], wasmURL: u[1] }), 300000, 'Loading the video compressor');
        }).then(function () { ffmpegLib = ff; return ff; });
      });
    }
    ffmpegLoading = attempt(LOCAL).catch(function () {
      return attempt(CDN);
    }).catch(function (e) { ffmpegLoading = null; throw e; });
    return ffmpegLoading;
  }

  function compressVideoIfNeeded(file, onProgress) {
    if (!file || file.size < COMPRESS_ABOVE) return Promise.resolve({ blob: file, compressed: false, originalSize: file ? file.size : 0 });
    onProgress = onProgress || function () {};
    onProgress(0.02, 'Loading video compressor…');
    return loadVideoCompressor().then(function (ffmpeg) {
      var ratio = 0;
      try {
        ffmpeg.on('progress', function (p) {
          var r = p && typeof p.progress === 'number' ? p.progress : 0;
          if (r > ratio) {
            ratio = r;
            onProgress(0.05 + ratio * 0.85, 'Compressing video… ' + Math.round(ratio * 100) + '%');
          }
        });
      } catch (e) { /* progress is best-effort */ }
      // Keep the source extension so ffmpeg probes the right demuxer.
      var ext = (/\.[a-z0-9]+$/i.exec(file.name || '') || ['.mp4'])[0].toLowerCase();
      var inName = 'input' + ext;
      return window.FFmpegUtil.fetchFile(file).then(function (buf) {
        return ffmpeg.writeFile(inName, buf);
      }).then(function () {
        return withTimeout(
          ffmpeg.exec(['-i', inName, '-vf', 'scale=-2:720', '-c:v', 'libx264',
            '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '96k',
            '-movflags', '+faststart', 'output.mp4']),
          10 * 60 * 1000, 'Compressing the video');
      }).then(function () {
        return ffmpeg.readFile('output.mp4');
      }).then(function (data) {
        var blob = new Blob([data], { type: 'video/mp4' });
        try { ffmpeg.deleteFile(inName); ffmpeg.deleteFile('output.mp4'); } catch (e) {}
        onProgress(1, 'Compression complete');
        return { blob: blob, compressed: true, originalSize: file.size };
      });
    }).then(function (r) {
      if (r.blob.size > HARD_LIMIT) {
        throw new Error('"' + file.name + '" is ' + Math.round(r.blob.size / 1048576) + 'MB even after compression — the cloud limit is 50MB. Please split it or compress it further (HandBrake, 720p).');
      }
      return r;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.readAsDataURL(blob);
    });
  }

  // Probe a picked video for browser-decodability (iPhone HEVC .mp4/.mov
  // files render as a greyed 0:00 player in Chrome). Non-blocking: warns so
  // the author can convert instead of discovering it later in the LMS.
  function probeVideo(dataUrl, name) {
    try {
      var v = document.createElement('video');
      var done = false;
      function finish(bad) {
        if (done) return; done = true;
        if (bad) toast('Heads up: “' + (name || 'This video') + '” can’t be played by browsers (likely iPhone HEVC). Convert it to H.264 MP4 (HandBrake/VLC/Photos export) — it will show as 0:00 otherwise.', 'err');
      }
      v.addEventListener('loadedmetadata', function () { finish(!(v.duration > 0)); });
      v.addEventListener('error', function () { finish(true); });
      setTimeout(function () { finish(!(v.duration > 0)); }, 4000);
      v.preload = 'metadata';
      v.src = dataUrl;
    } catch (e) { /* probing is best-effort */ }
  }

  // =========================================================================
  // Settings: meta, completion rules, SCORM manifest inspector
  // =========================================================================
  function renderSettings(box) {
    inspTitle(box, 'Playbook settings', 'Metadata · completion · SCORM');
    var m = PB.meta;
    box.appendChild(sectionLabel('General'));
    box.appendChild(textField('Playbook title', m.title || '', function (v) {
      m.title = v;
      $('#docName').value = v;
      if (m.slugAuto && window.PlaybookPublish) m.slug = window.PlaybookPublish.slugify(v);
      touch();
    }));
    box.appendChild(textField('Wordmark (cover)', m.wordmark || '', function (v) { m.wordmark = v; touch(); }));
    box.appendChild(textField('Edition line', m.edition || '', function (v) { m.edition = v; touch(); }));
    box.appendChild(textField('Publish slug', m.slug || '', function (v) {
      m.slug = window.PlaybookPublish ? window.PlaybookPublish.slugify(v) : v;
      m.slugAuto = false; // a hand-set slug is respected from now on
      touch(); renderInspector();
    }, 'URL-safe id used for the published bucket path. Auto-follows the title unless you edit it here.'));
    box.appendChild(textField('Department (library folder)', m.department || '', function (v) {
      m.department = v.trim(); touch();
    }, 'Folder id from playbooks.json — files this playbook under that department in the Playbook Library.'));

    box.appendChild(sectionLabel('SCORM package'));
    m.scorm = m.scorm || {};
    box.appendChild(textField('Manifest identifier', m.scorm.identifier || '', function (v) { m.scorm.identifier = v; touch(); }, 'Written into imsmanifest.xml.'));
    box.appendChild(textField('Course title (LMS)', m.scorm.title || '', function (v) { m.scorm.title = v; touch(); }));
    box.appendChild(textField('Mastery score', String(m.scorm.masteryScore != null ? m.scorm.masteryScore : 100), function (v) { m.scorm.masteryScore = parseInt(v, 10) || 0; touch(); }));

    box.appendChild(sectionLabel('Typography'));
    m.typography = m.typography || {};
    box.appendChild(selectField('Body font size', String(m.typography.fontSize || 17), [
      { v: '15', l: '15px — compact' }, { v: '16', l: '16px' }, { v: '17', l: '17px — default' },
      { v: '18', l: '18px — large' }, { v: '19', l: '19px — extra large' }
    ], function (v) { m.typography.fontSize = parseInt(v, 10); touch(); }));
    box.appendChild(selectField('Heading size', String(m.typography.headingScale || 1), [
      { v: '0.9', l: '90% — smaller' }, { v: '1', l: '100% — default' },
      { v: '1.15', l: '115% — larger' }, { v: '1.3', l: '130% — extra large' }
    ], function (v) { m.typography.headingScale = parseFloat(v); touch(); }, 'Scales chapter titles and section headings.'));
    box.appendChild(selectField('Text alignment', m.typography.align || 'left', [
      { v: 'left', l: 'Left' }, { v: 'justify', l: 'Justified' }, { v: 'center', l: 'Centered' }
    ], function (v) { m.typography.align = v; touch(); }));

    box.appendChild(sectionLabel('Colours'));
    box.appendChild(colourField('Accent colour (gold details, links, timeline)', m.typography.accent || '', function (v) { m.typography.accent = v; touch(); }));
    box.appendChild(colourField('Heading colour', m.typography.headingInk || '', function (v) { m.typography.headingInk = v; touch(); }));
    box.appendChild(colourField('Body text colour', m.typography.bodyInk || '', function (v) { m.typography.bodyInk = v; touch(); }));

    box.appendChild(sectionLabel('Completion rule'));
    renderCompletion(box);

    // One-click cleanup for playbooks that were duplicated from the P&C seed:
    // removes leftover seed wording/images that don't belong to this playbook
    // (chapter prose for chapters that no longer exist, the P&C welcome film,
    // and the P&C menu-page text). Cover fields are left untouched.
    box.appendChild(sectionLabel('Maintenance'));
    box.appendChild(el('button', { class: 'btn danger', onclick: function () {
      if (!window.confirm('Remove leftover P&C seed content from this playbook? This clears the old welcome film, old menu text, and content of deleted seed chapters. Your chapters and cover fields are kept. Cannot be undone.')) return;
      var removed = 0;
      var chapterPrefixes = {};
      PB.chapters.forEach(function (c) {
        var t = c.type || (c.id === 'ch-1' ? 'letter' : c.id === 'ch-2' ? 'directory' :
          c.hasSubs ? 'lifecycle' : c.id === 'intro' ? 'intro-video' : c.id === 'cover' ? 'cover' : 'standard');
        var pre = prosePrefixFor(c, t);
        if (pre) chapterPrefixes[pre] = true;
      });
      Object.keys(PB.prose || {}).forEach(function (k) {
        var top = k.split('.')[0];
        var keep = !!chapterPrefixes[top] || top === 'cover';
        if (!keep) { delete PB.prose[k]; removed++; }
      });
      // intro + menu leftovers are only seed content if there is no intro chapter
      var hasIntro = PB.chapters.some(function (c) { return c.id === 'intro'; });
      if (!hasIntro) {
        ['intro.eyebrow', 'intro.title', 'intro.video', 'intro.nextLabel'].forEach(function (k) {
          if (PB.prose[k] !== undefined) { delete PB.prose[k]; removed++; }
        });
      }
      ['menu.running', 'menu.title', 'menu.lede'].forEach(function (k) {
        if (PB.prose[k] !== undefined) { delete PB.prose[k]; removed++; }
      });
      if (PB.meta) delete PB.meta.fromSeed;
      touch();
      toast(removed ? ('Cleaned ' + removed + ' leftover item(s). Review the preview, then Save.') : 'Nothing to clean — no leftover seed content found.', 'ok');
      renderInspector();
    } }, ['Remove leftover P&C content…']));

    // Media optimizer: shrinks every oversized stored asset in one pass —
    // images via canvas (1600px JPEG), videos via the ffmpeg compressor
    // (720p H.264). Fixes playbooks whose media was uploaded before
    // autocompression existed, which also shrinks SCORM exports and the
    // cloud draft/published copies at the next Save/Publish.
    box.appendChild(el('button', { class: 'btn', style: 'margin-top:8px;', onclick: function () {
      var assets = PB.assets || {};
      var imgKeys = Object.keys(assets).filter(function (k) {
        return k.indexOf('img/') === 0 && typeof assets[k] === 'string' && assets[k].indexOf('data:') === 0 && assets[k].length > IMG_COMPRESS_ABOVE * 1.4;
      });
      var vidKeys = Object.keys(assets).filter(function (k) {
        return k.indexOf('video/') === 0 && typeof assets[k] === 'string' && assets[k].indexOf('data:') === 0 && assets[k].length > COMPRESS_ABOVE * 1.4;
      });
      if (!imgKeys.length && !vidKeys.length) { toast('Nothing to optimise — all stored media is already lean.', 'ok'); return; }
      if (!window.confirm('Optimise ' + imgKeys.length + ' image(s) and ' + vidKeys.length + ' video(s)? Images are resized to 1600px JPEG; videos are re-compressed to 720p H.264. This cannot be undone — Save afterwards to keep the smaller versions.')) return;
      var beforeTotal = imgKeys.concat(vidKeys).reduce(function (s, k) { return s + assets[k].length; }, 0);
      var doneCount = 0, shrunk = 0;
      function stepImg() {
        if (!imgKeys.length) return stepVid();
        var k = imgKeys.shift();
        busy(true, 'Optimising images… ' + (++doneCount) + ' (' + k.replace(/^img\//, '').slice(0, 40) + ')');
        compressImageDataUrl(assets[k]).then(function (out) {
          if (out !== assets[k]) { assets[k] = out; shrunk++; }
          stepImg();
        });
      }
      function stepVid() {
        if (!vidKeys.length) return finish();
        var k = vidKeys.shift();
        var name = k.replace(/^video\//, '');
        busy(true, 'Optimising video ' + name.slice(0, 40) + '…');
        fetch(assets[k]).then(function (r) { return r.blob(); }).then(function (blob) {
          var file = new File([blob], name, { type: blob.type || 'video/mp4' });
          return compressVideoIfNeeded(file, function (p, msg) { busy(true, msg); });
        }).then(function (r) {
          return blobToDataUrl(r.blob).then(function (d) {
            if (d.length < assets[k].length) { assets[k] = d; shrunk++; }
            stepVid();
          });
        }).catch(function (e) {
          busy(false);
          toast('Video optimisation stopped: ' + ((e && e.message) || e), 'err');
          finish();
        });
      }
      function finish() {
        busy(false);
        var afterTotal = Object.keys(assets).reduce(function (s, k) { return s + (typeof assets[k] === 'string' ? assets[k].length : 0); }, 0);
        touch();
        toast(shrunk
          ? 'Optimised ' + shrunk + ' asset(s) — media is now ~' + Math.round(afterTotal / 1370 / 1024) + 'MB (was ~' + Math.round(beforeTotal / 1370 / 1024) + 'MB). Press Save to keep the smaller versions.'
          : 'No further savings found.', 'ok');
        renderInspector();
      }
      stepImg();
    } }, ['Optimise media (shrink images & videos)…']));

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
      view.appendChild(nField('Minimum chapters (N)', String(comp.n || 1), function (v) { comp.n = Math.max(1, parseInt(v, 10) || 1); touch(); refreshManifest(); }));
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
          refreshManifest();
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

  // A dedicated field builder for N so we can refresh the manifest live.
  function nField(label, value, onInput) {
    var input = el('input', { type: 'text', value: value, oninput: function (e) { onInput(e.target.value); } });
    return el('div', { class: 'field' }, [el('label', {}, [label]), input]);
  }
  var _manifestBox = null;
  function refreshManifest() {
    if (!_manifestBox) return;
    _manifestBox.innerHTML = '';
    renderManifestRows(_manifestBox);
  }
  function renderManifestInspector(box) {
    _manifestBox = el('div', {});
    renderManifestRows(_manifestBox);
    box.appendChild(_manifestBox);
  }
  function renderManifestRows(box) {
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
    rows.forEach(function (r) {
      box.appendChild(el('div', { class: 'kv' }, [el('span', { class: 'k', text: r[0] }), el('span', { class: 'v', text: r[1] })]));
    });
  }

  // =========================================================================
  // Topbar actions: New / Open / Save / Export
  // =========================================================================
  function wireTopbar() {
    $('#docName').addEventListener('input', function (e) {
      PB.meta.title = e.target.value;
      // Auto slugs track the title — renaming re-derives the slug, so the
      // library lane and version history follow the playbook's real name.
      if (PB.meta.slugAuto && window.PlaybookPublish) PB.meta.slug = window.PlaybookPublish.slugify(e.target.value);
      touch();
    });
    $('#btnSettings').addEventListener('click', function () { SEL = { kind: 'settings' }; highlightTree(); renderInspector(); });
    $('#btnNew').addEventListener('click', openNewModal);
    $('#btnOpen').addEventListener('click', doOpen);
    // Reload the stored version from the cloud on demand — the recovery path
    // when the local draft is stale (e.g. content was published from a newer
    // state than the last local save).
    var cloudBtn = document.getElementById('btnCloudReload');
    if (cloudBtn) cloudBtn.addEventListener('click', function () {
      var slug = window.PlaybookPublish ? window.PlaybookPublish.slugFor(PB) : (PB.meta && PB.meta.slug);
      if (!slug) { toast('Set a Publish slug in Settings first.', 'err'); return; }
      if (!window.confirm('Replace the local draft with the stored version of “' + slug + '” from the cloud? Local unsaved changes will be lost.')) return;
      loadPublishedForEdit(slug);
    });
    $('#btnSave').addEventListener('click', doSave);
    $('#btnExport').addEventListener('click', doExportOffline);
    $('#btnExportMenu').addEventListener('click', toggleExportMenu);
    $('#btnPublish').addEventListener('click', doPublishClick);
    $('#btnVersions').addEventListener('click', doVersionsClick);
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

  function downloadJsonFallback() {
    var name = safeName(PB.meta.title || 'playbook').toLowerCase() + '.json';
    return STORE.exportFile(PB, name).then(function () { return name; });
  }

  // Save = browser working copy + (when signed in) a version snapshot in the
  // Supabase dashboard, filed under the playbook's department. The .json
  // download is now just the fallback for when you're not signed in or the
  // version write fails.
  // Collision guard: the slug decides the cloud lane (drafts/published) and
  // the version history — it must be UNIQUE to this playbook. Checks the
  // static library list and the published index; if the current slug belongs
  // to a different-titled playbook, re-derive from this playbook's title
  // (suffixing -2, -3… as needed). Remembers the previous slug so the stale
  // library entry can be cleaned up after the save.
  function ensureUniqueSlug(next) {
    if (!PB.meta || !window.PlaybookPublish) return next();
    var prevSlug = PB.meta.slug || window.PlaybookPublish.slugify(PB.meta.title);
    var cfg = window.SUPABASE_CONFIG || { url: '', bucket: 'playbook-content' };
    var idxUrl = cfg.url + '/storage/v1/object/public/' + (cfg.bucket || 'playbook-content') + '/published/index.json';
    Promise.all([
      fetch('../playbooks.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
      fetch(idxUrl + '?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (res) {
      // Track ALL titles holding each slug — a slug is taken when ANY holder
      // has a different title (a stale entry from this playbook's own earlier
      // save must not mask a collision with someone else's playbook).
      var taken = {};
      function note(list) {
        (list || []).forEach(function (p) {
          if (!p || !p.slug) return;
          taken[p.slug] = taken[p.slug] || {};
          taken[p.slug][p.title || ''] = true;
        });
      }
      note(res[0].playbooks);
      note(res[1] && res[1].playbooks);
      function isTaken(s, myTitle) {
        var titles = taken[s];
        if (!titles) return false;
        return Object.keys(titles).some(function (t) { return t !== myTitle; });
      }
      var title = PB.meta.title || '';
      var candidate = prevSlug;
      if (isTaken(candidate, title)) {
        candidate = window.PlaybookPublish.slugify(title) || candidate;
      }
      var root = candidate, i = 2;
      while (isTaken(candidate, title)) {
        candidate = root + '-' + i; i++;
      }
      if (candidate !== prevSlug) {
        PB.meta.lastSlug = prevSlug; // stale entry cleanup after the save
        PB.meta.slug = candidate;
        PB.meta.slugAuto = true;
        touch();
        toast('Playbook slug corrected to "' + candidate + '" (the previous one belonged to another playbook).', 'ok');
      }
      next();
    }).catch(function () { next(); }); // offline guard: never block a save
  }

  function doSave() {
    ensureUniqueSlug(function () {
    STORE.save(PB).then(function () {
      markSaved(); STORE.clearAutosnapshot();
      if (!(window.PlaybookPublish && window.PlaybookPublish.getSession && window.PlaybookVersions)) {
        return downloadJsonFallback().then(function (name) { toast('Saved ' + name, 'ok'); });
      }
      return window.PlaybookPublish.getSession().then(function (session) {
        if (!(session && session.access_token)) {
          return downloadJsonFallback().then(function (name) {
            toast('Saved ' + name + '. Sign in to also list it in the Library and dashboard.', 'ok');
          });
        }
        return window.PlaybookVersions.saveSnapshot(PB, {
          source: 'manual-save',
          session: session,
          publishedBy: (session.user && session.user.email) || null
        }).then(function () {
          // Also bank it as a Draft in the Library (work-in-progress lane —
          // never touches the published course). Best-effort: the dashboard
          // save already succeeded, so draft failures only warn.
          return window.PlaybookPublish.saveDraft(PB, {
            session: session,
            onProgress: function () {}
          }).then(function (res) {
            var dept = (PB.meta && PB.meta.department) ? PB.meta.department : null;
            toast('Saved · listed in the Library as Draft' + (dept ? ' · ' + dept : ''), 'ok');
            reportFailedAssets(res);
            // Slug changed on this save (collision guard)? Remove the stale
            // library entry the old slug left behind — but only when its title
            // matches THIS playbook, proving it was ours and not someone else's.
            if (PB.meta.lastSlug && PB.meta.lastSlug !== PB.meta.slug && window.PlaybookPublish.removeIndexEntry) {
              window.PlaybookPublish.removeIndexEntry(PB.meta.lastSlug, PB.meta.title, session);
              PB.meta.lastSlug = PB.meta.slug;
            }
          }).catch(function (draftErr) {
            var dept = (PB.meta && PB.meta.department) ? PB.meta.department : null;
            toast('Saved to the version dashboard' + (dept ? ' · ' + dept : '') +
              ' — but the Library draft failed: ' + ((draftErr && draftErr.message) || draftErr), 'err');
          });
        }).catch(function (err) {
          return downloadJsonFallback().then(function (name) {
            toast('Saved ' + name + ' — but the dashboard version failed: ' + ((err && err.message) || err), 'err');
          });
        });
      });
    }).catch(function (e) { toast('Save failed: ' + (e.message || e), 'err'); });
    }); // end ensureUniqueSlug
  }

  // ---- New playbook flows -------------------------------------------------
  function openNewModal() {
    var body = el('div', {});
    if (pendingCreate) {
      body.appendChild(el('div', { class: 'form-note', text: 'Creating for department: ' + pendingCreate.name + '. The new playbook will be tagged to this library folder.' }));
    }
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); newFromSeed(); } }, [
      el('div', {}, [el('div', { class: 'nc-title', text: 'Duplicate the P&C seed' }),
        el('div', { class: 'nc-desc', text: 'Start from a full copy of the current People & Culture playbook and edit from there.' })])
    ]));
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); newBlankModal(); } }, [
      el('div', {}, [el('div', { class: 'nc-title', text: 'Blank playbook' }),
        el('div', { class: 'nc-desc', text: 'Choose which chapter types to include and build up from empty templates.' })])
    ]));
    body.appendChild(el('button', { class: 'new-card', onclick: function () { closeModal(); newFromPdfModal(); } }, [
      el('div', {}, [el('div', { class: 'nc-title', text: 'Import from PDF' }),
        el('div', { class: 'nc-desc', text: 'Upload an SOP or policy PDF — it is structured into chapters and sections automatically, with figures carried over. Nothing leaves your browser.' })])
    ]));
    showModal('Start a new playbook', body, [
      { label: 'Cancel', onClick: closeModal }
    ]);
  }

  // ---- Course Creation: import chapters from PDF (AI) ---------------------
  function newFromPdfModal() {
    var body = el('div', {});
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Playbook title']),
      el('input', { type: 'text', id: 'pdfNewTitle', value: pendingCreate ? pendingCreate.name + ' Playbook' : 'New Playbook' })]));
    body.appendChild(el('div', { class: 'note', text: 'A cover is created first; each PDF you import then becomes a chapter. You can import more PDFs later via "+ Add chapter → From PDF".' }));
    showModal('Import from PDF', body, [
      { label: 'Cancel', onClick: closeModal },
      { label: 'Create & choose PDF', primary: true, onClick: function () {
        var title = ($('#pdfNewTitle') && $('#pdfNewTitle').value) || 'New Playbook';
        closeModal();
        buildBlank(title, ['cover', 'intro-video']);
        openPdfImportFlow();
      } }
    ]);
  }

  var _pdfInput = null;
  function openPdfImportFlow() {
    if (!window.PdfImport || !window.PdfImport.supported()) {
      toast('PDF engine is unavailable (pdf.js failed to load). Check your connection and reload.', 'err');
      return;
    }
    if (!_pdfInput) {
      _pdfInput = el('input', { type: 'file', accept: 'application/pdf', style: 'display:none' });
      document.body.appendChild(_pdfInput);
      _pdfInput.addEventListener('change', function () {
        var f = _pdfInput.files && _pdfInput.files[0];
        _pdfInput.value = '';
        if (f) handlePdfFile(f);
      });
    }
    _pdfInput.click();
  }

  function handlePdfFile(file) {
    busy(true, 'Reading PDF…');
    window.PdfImport.extractPdf(file).then(function (extracted) {
      if (!extracted.paragraphs || !extracted.paragraphs.length) {
        throw new Error('No readable text found — this looks like a scanned PDF. A text-based PDF is required.');
      }
      busy(true, 'Structuring document…');
      return window.PdfImport.buildResult(extracted, file.name);
    }).then(function (pack) {
      busy(false);
      openPdfPreviewModal(pack.result, pack.extracted, file.name);
    }).catch(function (e) {
      busy(false);
      toast('Import failed: ' + ((e && e.message) || e), 'err');
    });
  }

  function openPdfPreviewModal(result, extracted, fileName) {
    var titleInput = el('input', { type: 'text', value: result.chapter.title });
    var blurbInput = el('input', { type: 'text', value: result.chapter.blurb || '' });
    var body = el('div', {});
    body.appendChild(el('div', { class: 'form-note', text: fileName + ' — ' + extracted.pageCount + ' page(s) read, ' +
      (extracted.images || []).length + ' figure(s) found' +
      (extracted.truncated ? ' (large document: truncated)' : '') +
      '. “Add as one chapter” keeps headings as numbered sections (recommended for SOPs); “Sections as chapters” creates one chapter per heading.' }));
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Chapter title']), titleInput]));
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Chapter blurb (opening line)']), blurbInput]));
    body.appendChild(el('div', { class: 'section-label', text: 'Sections found (' + result.sections.length + ')' }));
    var list = el('ul', { class: 'check-list' });
    result.sections.forEach(function (s) {
      // Show the detected hierarchy: parts flush-left, topics indented,
      // sub-sections double-indented.
      var lvl = s.level || 'chapter';
      var pad = lvl === 'part' ? '' : (lvl === 'topic' ? '\u2003\u21b3 ' : (lvl === 'sub' ? '\u2003\u2003\u21b3 ' : ''));
      list.appendChild(el('li', { style: pad ? 'padding-left:' + (lvl === 'sub' ? '44px' : '22px') + ';' : '' },
        [(s.title || '(untitled)') + ' — ' + s.paragraphs.length + ' paragraph(s)' +
        (s.bullets.length ? ', ' + s.bullets.length + ' bullet(s)' : '') +
        ((s.blocks || []).length ? ', ' + s.blocks.length + ' table/callout/steps' : '')]));
    });
    body.appendChild(list);
    showModal('Import preview', body, [
      { label: 'Cancel', onClick: closeModal },
      { label: 'Sections as chapters', onClick: function () {
        result.chapter.title = titleInput.value.trim() || result.chapter.title;
        result.chapter.blurb = blurbInput.value.trim();
        closeModal();
        insertPdfChaptersSplit(result);
      } },
      { label: 'Add as one chapter', primary: true, onClick: function () {
        result.chapter.title = titleInput.value.trim() || result.chapter.title;
        result.chapter.blurb = blurbInput.value.trim();
        closeModal();
        insertPdfChapter(result);
      } }
    ]);
  }

  // Document headings map onto the outline respecting the detected hierarchy:
  // part dividers (big display titles) become PART chapters, numbered topics
  // (3.2) become indented sub-topics under them, sub-sections (3.2.1) become
  // sections inside the current topic, and anything unnumbered mid-part rides
  // along as a sub-topic. Documents with no hierarchy (SOPs) stay flat — one
  // chapter per heading, exactly as before.
  function insertPdfChaptersSplit(result) {
    PB.sectionBodies = PB.sectionBodies || {};
    var lastId = null;
    // Fold wrapper headings ("Procedures" & friends) into their first step so
    // no empty standalone chapter is created; one-chapter mode keeps them
    // visible as grouping headings instead.
    var sections = window.PdfImport.foldWrappers(result.sections);
    var curPart = null, curTopicId = null, first = true;

    function makeBody(s, withBlurb) {
      var bodySec = { intro: [], sections: [] };
      if (withBlurb && result.chapter.blurb) bodySec.intro.push(result.chapter.blurb);
      (s.paragraphs || []).forEach(function (p2) { bodySec.intro.push(p2); });
      var items = window.PdfImport.sectionItems(s);
      if (items.length) bodySec.sections.push({ num: '', title: '', blurb: [], items: items });
      return bodySec;
    }
    function newId() { return nextChapterId(); }
    function numeral() { return ROMANS[realChapterCount()] || String(realChapterCount() + 1); }

    // Three-tier mapping: part chapters hold a flat subs list where each sub
    // carries depth (1 = § section, 2 = topic). Opportunity name pages fold
    // into their § section's intro (they are the identity of the opportunity,
    // not outline entries — this is what keeps "Leverage dynamic steering"
    // from appearing as a sibling of "Package pricing / yielding").
    var curSectionId = null;
    sections.forEach(function (s, i) {
      var lvl = s.level || 'chapter';
      if (lvl === 'part') {
        var id = newId();
        var ch = { id: id, numeral: numeral(), label: s.title || 'Part', type: 'part', opener: '', subs: [] };
        PB.sectionBodies[id] = makeBody(s, first);
        PB.chapters.push(ch);
        curPart = ch; curSectionId = null; curTopicId = null; lastId = id; first = false;
        return;
      }
      if (lvl === 'section' && curPart) {
        var sec = { id: uid('sec'), label: s.title || 'Section', depth: 1 };
        curPart.subs.push(sec);
        PB.sectionBodies[sec.id] = makeBody(s, first);
        curSectionId = sec.id; curTopicId = null; lastId = curPart.id; first = false;
        return;
      }
      if (lvl === 'opptitle') {
        // fold the opportunity name page into the active § section (or part)
        var hostId = curSectionId || (curPart && curPart.id);
        if (hostId) {
          var hb = PB.sectionBodies[hostId];
          (s.paragraphs || []).forEach(function (p3) { hb.intro.push(p3); });
          var it0 = window.PdfImport.sectionItems(s);
          if (it0.length) hb.sections.push({ num: '', title: s.title, blurb: [], items: it0 });
          return;
        }
        // no host — fall through to standalone
      }
      if (lvl === 'topic' || (lvl === 'chapter' && (curSectionId || curPart))) {
        if (curSectionId || curPart) {
          var depth = curSectionId ? 2 : 1;
          var host = curPart;
          var sub = { id: uid('top'), label: s.title || 'Sub-topic', depth: depth };
          // insert after the last depth-2 sub of the current section (or at end)
          host.subs.push(sub);
          PB.sectionBodies[sub.id] = makeBody(s, first);
          curTopicId = sub.id; lastId = host.id; first = false;
          return;
        }
      }
      if (lvl === 'sub' && curTopicId) {
        var tb = PB.sectionBodies[curTopicId];
        tb.sections.push({ num: '', title: s.title, blurb: s.paragraphs || [], items: window.PdfImport.sectionItems(s) });
        return;
      }
      var id2 = newId();
      var ch2 = { id: id2, numeral: numeral(), label: s.title || (result.chapter.title + ' — part ' + (i + 1)), type: 'standard', opener: '' };
      PB.sectionBodies[id2] = makeBody(s, first);
      PB.chapters.push(ch2);
      lastId = id2; first = false;
    });
    touch(); renderTree();
    if (lastId) select({ kind: 'chapter', id: lastId, type: 'standard', chapter: lastId });
    var partCount = PB.chapters.filter(function (c) { return c.type === 'part'; }).length;
    toast(sections.length + ' section(s) imported' + (partCount ? ' — parts and sub-topics are indented in the outline' : ' — one chapter per heading') + '. Review and edit in the inspector.', 'ok');
  }

  function insertPdfChapter(result) {
    var id = nextChapterId();
    var ch = {
      id: id,
      numeral: ROMANS[realChapterCount()] || String(realChapterCount() + 1),
      label: result.chapter.title,
      type: 'standard',
      opener: ''
    };
    PB.sectionBodies = PB.sectionBodies || {};
    PB.sectionBodies[id] = window.PdfImport.toSectionsBody(result);
    PB.chapters.push(ch);
    touch(); renderTree();
    select({ kind: 'chapter', id: id, type: 'standard', chapter: id });
    toast('Chapter "' + ch.label + '" added from PDF — review and edit in the inspector.', 'ok');
  }

  function newFromSeed() {
    fetch('seed-playbook.json').then(function (r) { return r.json(); }).then(function (seed) {
      seed = JSON.parse(JSON.stringify(seed));
      seed.meta = seed.meta || {};
      seed.meta.fromSeed = true;
      seed.meta.title = 'Copy of ' + (seed.meta.title || 'Playbook');
      applyPendingCreate(seed);
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
      el('input', { type: 'text', id: 'newTitle', value: pendingCreate ? pendingCreate.name + ' Playbook' : 'New Playbook' })]));
    body.appendChild(el('div', { class: 'note', text: 'Tick the chapters to include. You can add, rename or reorder content later.' }));
    var ul = el('ul', { class: 'check-list' });
    order.forEach(function (t, idx) {
      var def = t === 'cover' || t === 'intro-video' || t === 'standard';
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
    applyPendingCreate(pb);
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
          pb.sectionBodies[id] = { intro: [], sections: [] };
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
      menuDesc: {}, lifecycleContent: {}, ch4: { sections: [] }, ch5: { sections: [] },
      sectionBodies: {}, prose: {}, assets: {}
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

  // After a save/publish, surface any media files that could not be uploaded
  // (collected by publish.js's isolated per-asset uploads). These are the
  // files that would otherwise show as broken players / torn images in the
  // playbook and the LMS.
  function reportFailedAssets(result) {
    var failed = (result && result.failedAssets) || [];
    if (!failed.length) return;
    toast(failed.length + ' media file(s) did NOT upload — they will show as unavailable in the playbook:', 'err');
    failed.slice(0, 4).forEach(function (f) {
      setTimeout(function () {
        toast('✕ ' + f.path.replace(/^(img|video)\//, '').slice(0, 60) + ' — ' + f.reason, 'err');
      }, 350);
    });
    if (failed.length > 4) {
      setTimeout(function () { toast('…and ' + (failed.length - 4) + ' more. Run Settings → Optimise media, then save again.', 'err'); }, 700);
    } else {
      setTimeout(function () { toast('Fix: Settings → Optimise media, then save again.', 'err'); }, 700);
    }
  }

  function busy(on, msg) {
    var ex = $('#busy');
    if (on) {
      if (ex) {
        // Already visible — update the message so long jobs (e.g. video
        // compression) show live progress instead of a stale first message.
        var m = ex.querySelector('.busy-msg');
        if (m && msg) m.textContent = msg;
        return;
      }
      document.body.appendChild(el('div', { class: 'busy', id: 'busy' }, [
        el('div', { class: 'spinner' }), el('div', { class: 'busy-msg', text: msg || 'Working…' })
      ]));
    } else if (ex) { ex.remove(); }
  }

  function uid(p) { return (p || 'id') + '-' + Math.random().toString(36).slice(2, 8); }

  // =========================================================================
  // SCORM 1.2 export — offline (unchanged behaviour) + remote (new)
  // =========================================================================
  function doExportOffline() {
    closeExportMenu();
    busy(true, 'Building SCORM package (offline)…');
    window.buildScormPackage(PB, computeRequiredPages(), {
      toast: toast,
      done: function () { busy(false); },
      fail: function (e) { busy(false); toast('Export failed: ' + (e.message || e), 'err'); }
    });
  }

  function doExportRemote() {
    closeExportMenu();
    if (!window.buildRemoteScormPackage) { toast('Remote export module not loaded.', 'err'); return; }
    var slug = window.PlaybookPublish ? window.PlaybookPublish.slugFor(PB) : (PB.meta && PB.meta.slug);
    busy(true, 'Building SCORM package (remote)…');
    window.buildRemoteScormPackage(PB, computeRequiredPages(), slug, {
      toast: toast,
      done: function () { busy(false); },
      fail: function (e) { busy(false); toast('Remote export failed: ' + (e.message || e), 'err'); }
    });
  }

  function toggleExportMenu() {
    var existing = document.querySelector('.export-menu');
    if (existing) { closeExportMenu(); return; }
    var menu = el('div', { class: 'export-menu' }, [
      el('button', { class: 'em-opt', onclick: doExportOffline }, [
        el('div', { class: 'em-title' }, ['Export SCORM (offline)', el('span', { class: 'tag', text: 'self-contained' })]),
        el('div', { class: 'em-desc', text: 'A complete, self-contained package with all content and images bundled in. Works with no network access, but you must re-export and re-upload to the LMS whenever content changes.' })
      ]),
      el('button', { class: 'em-opt', onclick: doExportRemote }, [
        el('div', { class: 'em-title' }, ['Export SCORM (remote)', el('span', { class: 'tag', text: 'auto-updates' })]),
        el('div', { class: 'em-desc', text: 'A small package that fetches the latest content from the cloud each time a learner opens it, after you Publish. Needs the LMS network to allow reaching Supabase; always falls back to a bundled offline-safe copy if that fails.' })
      ])
    ]);
    var btn = $('#btnExportMenu');
    document.body.appendChild(menu);
    var r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 6 + window.scrollY) + 'px';
    menu.style.left = Math.max(8, r.right - menu.offsetWidth) + 'px';
    setTimeout(function () { document.addEventListener('click', onDocClickCloseMenu); }, 0);
  }
  function onDocClickCloseMenu(e) {
    var menu = document.querySelector('.export-menu');
    if (menu && !menu.contains(e.target) && e.target.id !== 'btnExportMenu') closeExportMenu();
  }
  function closeExportMenu() {
    var menu = document.querySelector('.export-menu');
    if (menu) menu.remove();
    document.removeEventListener('click', onDocClickCloseMenu);
  }

  // =========================================================================
  // Publish (Supabase) — login gate + upload flow
  // =========================================================================
  var _authSession = null;
  function renderAuthChip() {
    var chip = $('#authChip');
    if (!chip) return;
    if (_authSession && _authSession.user) {
      chip.style.display = '';
      chip.innerHTML = '';
      chip.appendChild(el('span', {}, ['Signed in as ']));
      chip.appendChild(el('span', { class: 'who', text: _authSession.user.email }));
      chip.appendChild(el('button', { class: 'linklike', onclick: function () {
        window.PlaybookPublish.signOut().then(function () { _authSession = null; renderAuthChip(); toast('Signed out', 'ok'); });
      } }, ['Sign out']));
    } else {
      chip.style.display = 'none';
      chip.innerHTML = '';
    }
  }
  if (window.PlaybookPublish) {
    window.PlaybookPublish.getSession().then(function (s) { _authSession = s; renderAuthChip(); });
    window.PlaybookPublish.onAuthChange(function (s) { _authSession = s; renderAuthChip(); });
  }

  function doPublishClick() {
    if (!window.PlaybookPublish) { toast('Publish is unavailable (Supabase client failed to load).', 'err'); return; }
    window.PlaybookPublish.getSession().then(function (session) {
      _authSession = session;
      if (session) { runPublish(session); }
      else { openLoginModal(runPublish); }
    });
  }

  function openLoginModal(onSignedIn) {
    var body = el('div', { class: 'login-form' });
    var errBox = el('div', { class: 'form-error', style: 'display:none' });
    var emailInput = el('input', { type: 'email', placeholder: 'you@mandarinoriental.com', autocomplete: 'username' });
    var passInput = el('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
    body.appendChild(errBox);
    body.appendChild(el('div', { class: 'form-note', text: 'Sign in with your Supabase account to publish this playbook.' }));
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Email']), emailInput]));
    body.appendChild(el('div', { class: 'field' }, [el('label', {}, ['Password']), passInput]));

    function attemptSignIn() {
      var email = emailInput.value.trim();
      var pass = passInput.value;
      errBox.style.display = 'none';
      if (!email || !pass) { errBox.textContent = 'Enter both an email and a password.'; errBox.style.display = ''; return; }
      var signInBtn = document.querySelector('.modal .m-foot .btn.primary');
      if (signInBtn) signInBtn.disabled = true;
      window.PlaybookPublish.signIn(email, pass).then(function (session) {
        if (signInBtn) signInBtn.disabled = false;
        _authSession = session;
        closeModal();
        toast('Signed in as ' + (session.user && session.user.email || email), 'ok');
        if (onSignedIn) onSignedIn(session);
      }).catch(function (e) {
        if (signInBtn) signInBtn.disabled = false;
        errBox.textContent = (e && e.message) || 'Sign-in failed. Check your email and password.';
        errBox.style.display = '';
      });
    }

    passInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') attemptSignIn(); });

    showModal('Sign in to publish', body, [
      { label: 'Cancel', onClick: closeModal },
      { label: 'Sign in', primary: true, onClick: attemptSignIn }
    ]);
    setTimeout(function () { emailInput.focus(); }, 30);
  }

  function runPublish(session) {
    ensureUniqueSlug(function () {
    var slug = window.PlaybookPublish.slugFor(PB);
    if (!PB.meta.slug) { PB.meta.slug = slug; touch(); }
    busy(true, 'Publishing… (0 files)');
    window.PlaybookPublish.publish(PB, {
      // Pass the in-memory session straight through so the upload uses this
      // exact access token, even when the browser blocks session persistence
      // (common inside an embedded/iframe preview).
      session: session,
      onProgress: function (done, total) { busy(true, 'Publishing… (' + done + '/' + total + ' files)'); }
    }).then(function (result) {
      busy(false);
      toast('Published “' + (PB.meta.title || slug) + '” · ' + result.assetCount + ' asset(s) uploaded', 'ok');
      reportFailedAssets(result);
      if (PB.meta.lastSlug && PB.meta.lastSlug !== PB.meta.slug && window.PlaybookPublish.removeIndexEntry) {
        window.PlaybookPublish.removeIndexEntry(PB.meta.lastSlug, PB.meta.title, session);
        PB.meta.lastSlug = PB.meta.slug;
      }
      showPublishSuccessModal(result);
      recordPublishedVersion(result, session);
    }).catch(function (e) {
      busy(false);
      if (e && e.message === 'NOT_AUTHENTICATED') {
        toast('Your session expired. Please sign in again.', 'err');
        openLoginModal(runPublish);
        return;
      }
      toast('Publish failed: ' + ((e && e.message) || e), 'err');
    });
    }); // end ensureUniqueSlug
  }

  function showPublishSuccessModal(result) {
    var libraryEntry = {
      slug: result.slug,
      title: (PB.meta && PB.meta.title) || result.slug,
      department: (PB.meta && PB.meta.department) || '',
      edition: (PB.meta && PB.meta.edition) || '',
      description: ''
    };
    var snippet = JSON.stringify(libraryEntry, null, 2);
    var pre = el('pre', { class: 'snippet', text: snippet });
    var copyBtn = el('button', { class: 'btn', onclick: function () {
      var doneOk = function () { toast('Library entry copied — paste it into playbooks.json', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(doneOk, function () { fallbackCopy(snippet, doneOk); });
      } else { fallbackCopy(snippet, doneOk); }
    } }, ['Copy library entry']);
    var body = el('div', {}, [
      el('div', { class: 'form-note', text: 'Your playbook is live at:' }),
      el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Content URL' }), el('span', { class: 'v', text: result.contentUrl })]),
      el('div', { class: 'kv' }, [el('span', { class: 'k', text: 'Slug' }), el('span', { class: 'v', text: result.slug })]),
      el('div', { class: 'note', text: 'Use “Export SCORM (remote)” now (or re-use an already-exported remote package) — it will automatically pick up this update the next time a learner opens it.' }),
      el('div', { class: 'section-label', text: 'List it in the Playbook Library' }),
      el('div', { class: 'note', text: 'Paste this entry into the “playbooks” array in playbooks.json (fill in department + description), then push — the playbook appears in that department folder.' }),
      pre,
      copyBtn
    ]);
    showModal('Published', body, [{ label: 'Done', primary: true, onClick: closeModal }]);
  }

  function fallbackCopy(text, cb) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (cb) cb();
    } catch (e) { toast('Copy failed — select the text manually.', 'err'); }
  }

  // =========================================================================
  // Version history (Supabase) — additive snapshot layer
  // =========================================================================
  function doVersionsClick() {
    if (!window.PlaybookVersions) { toast('Version history is unavailable (versions.js failed to load).', 'err'); return; }
    if (!window.PlaybookPublish) { toast('Version history needs Supabase sign-in, but the Supabase client failed to load.', 'err'); return; }
    window.PlaybookPublish.getSession().then(function (session) {
      _authSession = session;
      if (session) openVersionsModal(session);
      else openLoginModal(function (s) { openVersionsModal(s); });
    });
  }

  function recordPublishedVersion(result, session) {
    if (!window.PlaybookVersions) return;
    window.PlaybookVersions.saveSnapshot(PB, {
      slug: result.slug,
      source: 'publish',
      note: 'Published to Remote SCORM',
      session: session,
      publishedBy: result.publishedBy || (session && session.user && session.user.email) || null,
      storagePrefix: 'published/' + result.slug + '/'
    }).then(function (row) {
      toast('Version history saved (' + String(row.id).slice(0, 8) + ')', 'ok');
    }).catch(function (e) {
      // Deliberately non-blocking: Remote SCORM latest publish already succeeded.
      console.warn('[versions] publish snapshot failed:', e);
      toast('Remote SCORM published successfully. (The version-history row was not saved: ' + ((e && e.message) || e) + ')', 'err');
    });
  }

  function openVersionsModal(session) {
    var slug = window.PlaybookPublish.slugFor(PB);
    var body = el('div', { class: 'versions-ui dashboard-ui' });
    body.appendChild(el('div', { class: 'form-note', text: 'Saved versions are stored in Supabase table public.playbook_versions. Sign-in is required; the Remote SCORM latest publish path is unchanged.' }));

    var playbookList = el('div', { class: 'playbook-list' }, [el('div', { class: 'empty', text: 'Loading playbooks…' })]);
    var listBox = el('div', { class: 'version-list' }, [el('div', { class: 'empty', text: 'Loading versions…' })]);
    var refresh = function () { loadDashboard(session, slug, playbookList, listBox); };
    var noteInput = el('input', { type: 'text', placeholder: 'Optional note — e.g. “before CPO review”' });
    var saveBtn = el('button', { class: 'btn primary', onclick: function () { saveCurrentVersion(session, slug, noteInput, saveBtn, refresh); } }, ['Save current as version']);
    body.appendChild(el('div', { class: 'version-save-row' }, [noteInput, saveBtn]));

    body.appendChild(el('div', { class: 'dashboard-grid' }, [
      el('div', { class: 'dashboard-playbooks' }, [el('div', { class: 'section-label', text: 'Playbooks' }), playbookList]),
      el('div', { class: 'dashboard-versions' }, [el('div', { class: 'section-label', text: 'Saved versions' }), listBox])
    ]));

    showModal('Version dashboard', body, [{ label: 'Close', primary: true, onClick: closeModal }]);
    var modal = document.querySelector('.modal');
    if (modal) modal.classList.add('modal-dashboard');
    refresh();
  }

  function saveCurrentVersion(session, slug, noteInput, saveBtn, refresh) {
    saveBtn.disabled = true;
    window.PlaybookVersions.saveSnapshot(PB, {
      slug: slug,
      source: 'manual-save',
      note: noteInput.value.trim() || null,
      session: session,
      publishedBy: (session && session.user && session.user.email) || null,
      storagePrefix: 'local-json/' + slug + '/'
    }).then(function (row) {
      saveBtn.disabled = false;
      noteInput.value = '';
      toast('Version saved (' + String(row.id).slice(0, 8) + ')', 'ok');
      if (refresh) refresh();
    }).catch(function (e) {
      saveBtn.disabled = false;
      toast('Version save failed: ' + ((e && e.message) || e), 'err');
    });
  }

  var deptNamesPromise = null;
  function loadDeptNames() {
    // Department display names come from the library index (single source of
    // truth); ids are humanized as a fallback when it can't be read.
    if (!deptNamesPromise) {
      deptNamesPromise = fetch('../playbooks.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (data) {
        var map = {};
        (data.departments || []).forEach(function (d) { map[d.id] = d.name; });
        return map;
      }).catch(function () { return {}; });
    }
    return deptNamesPromise;
  }

  function loadDashboard(session, selectedSlug, playbookList, listBox) {
    playbookList.innerHTML = '';
    listBox.innerHTML = '';
    playbookList.appendChild(el('div', { class: 'empty', text: 'Loading playbooks…' }));
    listBox.appendChild(el('div', { class: 'empty', text: 'Loading versions…' }));
    Promise.all([window.PlaybookVersions.listAllVersions({ session: session }), loadDeptNames()]).then(function (res) {
      var rows = res[0];
      var deptNames = res[1];
      var depts = groupVersionsByDepartment(rows, deptNames);
      var groups = [];
      depts.forEach(function (d) { groups = groups.concat(d.groups); });
      playbookList.innerHTML = '';
      listBox.innerHTML = '';
      if (!groups.length) {
        playbookList.appendChild(el('div', { class: 'empty', text: 'No Supabase versions yet.' }));
        listBox.appendChild(el('div', { class: 'empty', text: 'Save a version or Publish to create one.' }));
        return;
      }
      var selected = groups.some(function (g) { return g.slug === selectedSlug; }) ? selectedSlug : groups[0].slug;
      depts.forEach(function (dept) {
        playbookList.appendChild(el('div', { class: 'dept-header', text: dept.label }));
        dept.groups.forEach(function (group) {
          playbookList.appendChild(dashboardPlaybookRow(group, group.slug === selected, function () {
            playbookList.querySelectorAll('.playbook-row').forEach(function (rowEl) { rowEl.classList.remove('on'); });
            var rowEl = rowElForGroup(playbookList, group.slug);
            if (rowEl) rowEl.classList.add('on');
            renderDashboardVersions(session, group.rows, listBox);
          }));
        });
      });
      renderDashboardVersions(session, (groups.filter(function (g) { return g.slug === selected; })[0] || groups[0]).rows, listBox);
    }).catch(function (e) {
      playbookList.innerHTML = '';
      listBox.innerHTML = '';
      playbookList.appendChild(el('div', { class: 'form-error', text: (e && e.message) || 'Could not load playbooks.' }));
      listBox.appendChild(el('div', { class: 'form-error', text: (e && e.message) || 'Could not load versions.' }));
    });
  }

  function humanizeDept(id) {
    if (!id || id === 'uncategorized') return 'Uncategorized';
    return id.split('-').map(function (w) {
      if (w === 'pc') return 'P&C';
      if (w === 'and') return '&';
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  // Group saved versions into department folders, then playbooks inside each.
  // Versions saved before departments existed (no department value) collect
  // under "Uncategorized".
  function groupVersionsByDepartment(rows, deptNames) {
    var depts = {};
    var order = [];
    (rows || []).forEach(function (row) {
      var d = (row.department || '').trim() || 'uncategorized';
      if (!depts[d]) {
        depts[d] = { id: d, label: (deptNames && deptNames[d]) || humanizeDept(d), slugs: {}, slugOrder: [] };
        order.push(d);
      }
      var slug = row.slug || 'playbook';
      if (!depts[d].slugs[slug]) {
        depts[d].slugs[slug] = { slug: slug, title: row.title || slug, rows: [] };
        depts[d].slugOrder.push(slug);
      }
      depts[d].slugs[slug].rows.push(row);
    });
    // departments alphabetically, "Uncategorized" always last
    order.sort(function (a, b) {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      return depts[a].label.localeCompare(depts[b].label);
    });
    return order.map(function (d) {
      var dd = depts[d];
      return { id: dd.id, label: dd.label, groups: dd.slugOrder.map(function (s) { return dd.slugs[s]; }) };
    });
  }

  function rowElForGroup(playbookList, slug) {
    var rows = playbookList.querySelectorAll('.playbook-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-slug') === slug) return rows[i];
    }
    return null;
  }

  function dashboardPlaybookRow(group, isOn, onSelect) {
    var latest = group.rows[0] || {};
    return el('button', { class: 'playbook-row' + (isOn ? ' on' : ''), 'data-slug': group.slug, onclick: onSelect }, [
      el('div', { class: 'playbook-title', text: group.title || group.slug }),
      el('div', { class: 'playbook-sub', text: group.slug }),
      el('div', { class: 'playbook-meta', text: group.rows.length + ' version' + (group.rows.length === 1 ? '' : 's') + ' · latest ' + fmtDate(latest.published_at) })
    ]);
  }

  function renderDashboardVersions(session, rows, listBox) {
    listBox.innerHTML = '';
    if (!rows || !rows.length) {
      listBox.appendChild(el('div', { class: 'empty', text: 'No saved versions for this playbook yet.' }));
      return;
    }
    rows.forEach(function (row) { listBox.appendChild(versionRow(session, row)); });
  }

  function loadVersionRows(session, slug, listBox) {
    listBox.innerHTML = '';
    listBox.appendChild(el('div', { class: 'empty', text: 'Loading versions…' }));
    window.PlaybookVersions.listVersions(slug, { session: session }).then(function (rows) {
      renderDashboardVersions(session, rows, listBox);
    }).catch(function (e) {
      listBox.innerHTML = '';
      listBox.appendChild(el('div', { class: 'form-error', text: (e && e.message) || 'Could not load versions.' }));
    });
  }

  function versionRow(session, row) {
    var when = fmtDate(row.published_at);
    var meta = el('div', { class: 'version-meta' }, [
      el('div', { class: 'version-title', text: row.title || row.slug || 'Playbook' }),
      el('div', { class: 'version-sub', text: when + ' · ' + (row.source || 'save') + (row.published_by ? ' · ' + row.published_by : '') }),
      row.note ? el('div', { class: 'version-note', text: row.note }) : null
    ]);
    var actions = el('div', { class: 'version-actions' }, [
      el('button', { class: 'btn ghost', onclick: function () { restoreVersion(session, row.id); } }, ['Restore']),
      el('button', { class: 'btn ghost', onclick: function () { downloadVersion(session, row); } }, ['Download'])
    ]);
    return el('div', { class: 'version-row' }, [meta, actions]);
  }

  function restoreVersion(session, id) {
    busy(true, 'Restoring version…');
    window.PlaybookVersions.getVersion(id, { session: session }).then(function (row) {
      busy(false);
      if (!row || !row.data) throw new Error('That version has no playbook data.');
      // Slim snapshots carry asset refs only (no base64 payloads) — point the
      // resolver at the lane that holds the files so images/videos pull
      // through from the bucket on render.
      var cfg2 = window.SUPABASE_CONFIG || {};
      if (row.data.__slimAssets && cfg2.url) {
        var lane = row.source === 'publish' ? 'published' : 'drafts';
        row.data.__remoteAssetBase = String(cfg2.url).replace(/\/$/, '') +
          '/storage/v1/object/public/' + (cfg2.bucket || 'playbook-content') + '/' + lane + '/' + row.slug + '/assets/';
      }
      setPlaybook(row.data);
      scheduleAutosave();
      closeModal();
      toast('Version restored into the editor', 'ok');
    }).catch(function (e) {
      busy(false);
      toast('Restore failed: ' + ((e && e.message) || e), 'err');
    });
  }

  function downloadVersion(session, row) {
    window.PlaybookVersions.getVersion(row.id, { session: session }).then(function (full) {
      var name = safeName((full && full.title) || row.title || row.slug || 'playbook').toLowerCase() + '-' + String(row.id).slice(0, 8) + '.json';
      return STORE.exportFile(full.data, name);
    }).then(function () {
      toast('Version downloaded', 'ok');
    }).catch(function (e) {
      toast('Download failed: ' + ((e && e.message) || e), 'err');
    });
  }

  function fmtDate(iso) {
    try { return iso ? new Date(iso).toLocaleString() : '—'; }
    catch (e) { return iso || '—'; }
  }

  // expose a couple of helpers for export.js
  window.__editor = { assetPreview: assetPreview };

  boot();
})();
