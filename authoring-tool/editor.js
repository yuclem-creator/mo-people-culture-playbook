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
    'card-track':  { label: 'Card track diagram',  prose: null,    body: 'cardtrack' },
    'process-diagram': { label: 'Process diagram', prose: null,    body: 'proc' }
  };

  var ITEM_SYMBOLS = [
    { v: 'policy', l: 'Policy' }, { v: 'guide', l: 'Guideline' },
    { v: 'kit', l: 'Toolkit' }, { v: 'xref', l: 'Cross-reference' },
    { v: 'image', l: 'Image' }, { v: 'video', l: 'Video' }, { v: 'tabs', l: 'Tabbed group' },
    { v: 'timeline', l: 'Timeline' }, { v: 'checklist', l: 'Checklist' },
    { v: 'table', l: 'Table' }, { v: 'callout', l: 'Callout' },
    { v: 'tasklist', l: 'Task list (gated)' },
    { v: 'swimlane', l: 'Swimlane timeline' }, { v: 'chart', l: 'Chart / dashboard' },
    { v: 'beforeafter', l: 'Before / after' },
    { v: 'heading', l: 'Heading' }, { v: 'text', l: 'Body text' },
    { v: 'statband', l: 'Stat / KPI band' },
    { v: 'gauge', l: 'Gauge / maturity meter' }, { v: 'pyramid', l: 'Hierarchy / pyramid' },
    { v: 'wheel', l: 'Radial lifecycle wheel' },
    { v: 'ix', l: 'Interactive element (18 kinds)' }
  ];

  // Interactive elements (s:'ix') — 17 renderer kinds. Kind picker + starter
  // templates here; the renderers live in preview-engine/app.js (and the
  // mirrored player/app.js).
  var IX_KINDS = [
    { v: 'processflow', l: '1 · Decision & exception logic (step pills + branches)' },
    { v: 'horizons',    l: '2 · Horizon stepper / journey map band' },
    { v: 'legendtour',  l: '3 · Legend panel + onboarding tooltip tour' },
    { v: 'flipcards',   l: '4 · Principle flip cards' },
    { v: 'mixbars',     l: '5 · Stacked-bar mix explorer' },
    { v: 'xtable',      l: '6 · Interactive table explorer (sort + filter)' },
    { v: 'benchdash',   l: '7 · Benchmark dashboard' },
    { v: 'alloc',       l: '8 · Discount allocation chart' },
    { v: 'tabx',        l: '9 · Tabbed data explorer' },
    { v: 'cardwall',    l: '10 · Opportunity card wall' },
    { v: 'scorecard',   l: '11 · Assessment scorecard / rubric' },
    { v: 'typedist',    l: '12 · Count / distribution chart (toggle)' },
    { v: 'stageflow',   l: '13 · Stage step flow + checklists (gated)' },
    { v: 'dlcheck',     l: '14 · Downloadable template + guided checklist' },
    { v: 'testline',    l: '15 · Test-design timeline' },
    { v: 'eventcal',    l: '16 · Event calendar timeline' },
    { v: 'kpidash',     l: '17 · KPI dashboard with STLY toggle' },
    { v: 'compare',     l: '18 · Comparison pair (IS / IS NOT)' }
  ];
  var IX_TEMPLATES = {
    processflow: { steps: [
      { label: 'Current situation and diagnosis', sub: 'Always start here', title: 'Outline the reasons', text: 'Describe the situation.', example: '' },
      { label: 'Mitigation actions', sub: 'Then act', title: 'Develop an action plan', text: 'Act on findings.', branches: [{ label: 'Branch A', text: '' }] },
      { label: 'Accountability tracker', sub: 'Track owners', title: 'Assign owners', text: 'Track owners.' }] },
    horizons: { stages: [
      { label: 'Kick-off', dur: '4 weeks', text: '' }, { label: 'Baselining', dur: '4 weeks', gate: 'Gate', text: '' },
      { label: 'Assess', dur: '4 weeks', text: '' }, { label: 'Track', dur: '3–6 months', text: '' }],
      bands: [{ label: 'Phase one', from: 0, to: 1 }, { label: 'Phase two', from: 2, to: 3 }] },
    legendtour: { title: 'How to read this playbook',
      legend: [{ label: 'Section', text: '', color: '#C07A3E' }, { label: 'Gate', text: 'a checklist must be completed', color: '#4E7A6B' }],
      tour: [{ label: 'Stages', text: 'Each stage shows its owner and timing.' }, { label: 'Gate', text: 'The gate is a hard stop.' }] },
    flipcards: { cards: [
      { num: '01', title: 'Position in public', backLabel: 'Principle 01', back: 'Maintain the competitive price positioning in the open market.' },
      { num: '02', title: 'Every discount needs a fence', backLabel: 'Principle 02', back: 'Discounts are accompanied by an appropriate fence.', chips: ['Advance booking windows', 'Length of stay'] }] },
    mixbars: { legend: [{ label: 'Package', color: '#A4523F' }, { label: 'Offers', color: '#C07A3E' }, { label: 'Retail', color: '#4E7A6B' }],
      rows: [{ label: 'Row one', meta: 'ADR 1,240 · 860 room nights', segs: [55, 20, 25], detail: '' }], note: '' },
    xtable: { cols: ['Section', '#', 'Opportunity', 'Owner'], rows: [['1', '1', 'First row', 'Owner']], filterLabel: '' },
    benchdash: { kpis: [{ label: 'RGI', value: '97', sub: 'vs compset', down: true, bar: 40 }],
      trend: { title: 'Index evolution by month', sub: 'this year vs STLY', labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
        series: [{ name: 'This year', color: '#A4523F', values: [100,101,99,97,95,96,93,92,95,98,100,101] },
                 { name: 'STLY', color: '#6b625a', dash: true, values: [102,102,101,101,100,101,100,100,101,101,102,103] }] },
      tips: [{ label: '01 · Tip', title: 'Tip title', text: '' }] },
    alloc: { buildTitle: 'Building the total benefits',
      parts: [{ label: 'USD credit', value: 100, color: '#B59060' }, { label: 'Club benefits access', value: 50, color: '#4E7A6B' }],
      total: { label: 'Total benefits allocated', text: 'USD 150' },
      quality: { eyebrow: 'Package "quality"', value: 12, display: '≈ 12%', text: '' },
      steps: [{ label: 'Step 1', text: '' }] },
    tabx: { tabs: [{ label: 'Tab one', usedin: '', title: 'Tab one', text: '', url: '', linkLabel: '' }, { label: 'Tab two', usedin: '', title: 'Tab two', text: '' }] },
    cardwall: { legend: [{ label: 'Theme', color: '#C07A3E' }], cards: [
      { num: 'Opportunity 1', title: 'First opportunity', owner: 'Owner: …', back: '', steps: ['Assess', 'Adjust', 'Test & rollout', 'Track'], themeColor: '#C07A3E' }] },
    scorecard: { taskCol: 'Process step · Task', dims: ['Dimension 1', 'Dimension 2'], scaleMax: 4,
      tasks: [{ name: 'Task one', covers: '' }], totalLabel: 'Overall score', note: '' },
    typedist: { toggle: { a: 'This year', b: 'STLY' },
      rows: [{ label: 'Run of House', a: 34, b: 30, suffix: '% of room nights', color: '#B59060' }], note: '' },
    stageflow: { cid: '', items: [
      { label: 'Action 1', text: '' }, { label: 'Action 2', text: '' }, { label: 'Action 3', text: '' }],
      gateText: 'Gate — signed off', gateLocked: 'You cannot proceed without this.', gateOpen: 'Gate passed — you may proceed.' },
    dlcheck: { file: { title: 'Companion workbook', meta: 'Excel workbook', text: '', url: '', button: 'Download workbook' },
      listTitle: 'Guided checklist', items: [{ text: 'First checklist item', tag: '' }] },
    testline: { phases: [
      { num: 2, label: 'Weeks · Baseline', text: '', tag: '2 week baseline', color: '#8a8378' },
      { num: 3, label: 'Weeks · Test', text: '', tag: '3 week test', color: '#B59060' },
      { num: 2, label: 'Weeks · Post-test', text: '', tag: '2 week post-test baseline', color: '#4E7A6B' }],
      axis: { from: 'Stay period — not booking period', mid: 'Week 0', to: 'Week 7' },
      cards: [{ label: 'Do not test', text: '', tone: 'warn' }] },
    eventcal: { pins: [
      { at: 'Sep', label: 'Budget', title: 'September budget', bullets: ['Set special event pricing strategy'] },
      { at: '-90 d', label: 'Pre-peak', title: 'Pre-peak period', bullets: ['Review policies'] }],
      end: { date: '25 Dec', label: 'Stay date' }, exception: '', exceptionLabel: '' },
    kpidash: { cats: [{ label: 'Category', kpis: [
      { name: 'KPI one', src: 'D360', unit: 'Index', target: 100,
        ty: [98,99,101,100,102,104,103,105,106,108,107,109], ly: [97,98,99,99,100,101,101,102,103,104,104,105] }] }] },
    compare: { cols: [
      { label: 'What this playbook is', title: 'A practical commercial reference', tone: 'is', items: [
        'A step-by-step method to baseline, assess and adjust package performance',
        'A shared language for Revenue Management and Marketing & Communications',
        'A living document — updated as opportunities are tested and rolled out' ] },
      { label: 'What this playbook is not', title: 'Not a policy manual', tone: 'isnot', items: [
        'Not a replacement for property-level commercial judgement',
        'Not a pricing system or a set of mandatory rate rules',
        'Not a one-off exercise — the Track stage is continuous' ] } ],
      note: '' }
  };
  // ---- Structured form specs for the 18 interaction kinds ------------------
  // Each entry: { k: 'fieldKey', l: 'Label', t: 'text'|'area'|'num'|'check'|
  // 'color'|'select'|'csv'|'lines'|'rowscsv'|'group'|'list', ... }.
  // Rendered by ixField() below — no raw JSON needed for normal editing.
  function ixNameOf(item) { return (item && (item.label || item.title || item.name)) || 'Item'; }

  var IX_FORMS = {
    processflow: [
      { t: 'list', k: 'steps', l: 'Steps', addLabel: 'Add step',
        make: function () { return { label: 'New step', sub: '', title: '', text: '', example: '' }; },
        fields: [
          { k: 'label', l: 'Step name' },
          { k: 'sub', l: 'Small label above the name', tip: 'e.g. "Always start here"' },
          { k: 'title', l: 'Detail panel — title' },
          { k: 'text', l: 'Detail panel — text', t: 'area' },
          { k: 'example', l: 'Worked example (optional)', t: 'area' },
          { t: 'list', k: 'branches', l: 'Branches / exceptions (optional)', addLabel: 'Add branch',
            make: function () { return { label: 'Branch', text: '' }; },
            fields: [{ k: 'label', l: 'Branch label' }, { k: 'text', l: 'Branch text', t: 'area' }] }
        ] }
    ],
    horizons: [
      { t: 'list', k: 'stages', l: 'Stages (left to right)', addLabel: 'Add stage',
        make: function () { return { label: 'Stage', dur: '', gate: '', text: '' }; },
        fields: [
          { k: 'label', l: 'Stage name' },
          { k: 'dur', l: 'Duration label', tip: 'e.g. "4 weeks"' },
          { k: 'gate', l: 'Gate label (optional)', tip: 'e.g. "Gate" — shows a pill under the stage' },
          { k: 'text', l: 'Detail text', t: 'area' }
        ] },
      { t: 'list', k: 'bands', l: 'Journey bands (optional)', addLabel: 'Add band',
        make: function () { return { label: 'Band', from: 0, to: 1 }; },
        fields: [
          { k: 'label', l: 'Band label' },
          { k: 'from', l: 'From stage #', t: 'num', tip: 'Stage positions count from 0' },
          { k: 'to', l: 'To stage #', t: 'num' }
        ] }
    ],
    legendtour: [
      { k: 'title', l: 'Panel title' },
      { t: 'list', k: 'legend', l: 'Legend entries', addLabel: 'Add entry',
        make: function () { return { label: 'Entry', text: '', color: '#C07A3E' }; },
        fields: [{ k: 'label', l: 'Label' }, { k: 'text', l: 'Explanation', t: 'area' }, { k: 'color', l: 'Colour', t: 'color' }] },
      { t: 'list', k: 'tour', l: 'Tour steps (the tooltip walkthrough)', addLabel: 'Add tour step',
        make: function () { return { label: 'Step', text: '' }; },
        fields: [{ k: 'label', l: 'Step title' }, { k: 'text', l: 'Step text', t: 'area' }] }
    ],
    flipcards: [
      { t: 'list', k: 'cards', l: 'Cards', addLabel: 'Add card',
        make: function () { return { num: String(Math.floor(Math.random() * 90) + 10), title: 'New card', backLabel: '', back: '', chips: [] }; },
        fields: [
          { k: 'num', l: 'Number', tip: 'e.g. 01' },
          { k: 'title', l: 'Front — title' },
          { k: 'backLabel', l: 'Back — small label' },
          { k: 'back', l: 'Back — text', t: 'area' },
          { k: 'chips', l: 'Chips on the back (comma separated)', t: 'csv' }
        ] }
    ],
    cardwall: [
      { t: 'list', k: 'legend', l: 'Theme legend (optional)', addLabel: 'Add legend entry',
        make: function () { return { label: 'Theme', color: '#C07A3E' }; },
        fields: [{ k: 'label', l: 'Label' }, { k: 'color', l: 'Colour', t: 'color' }] },
      { t: 'list', k: 'cards', l: 'Opportunity cards', addLabel: 'Add card',
        make: function () { return { num: 'Opportunity', title: 'New opportunity', owner: '', back: '', steps: [], themeColor: '#C07A3E' }; },
        fields: [
          { k: 'num', l: 'Eyebrow', tip: 'e.g. Opportunity 1' },
          { k: 'title', l: 'Front — title' },
          { k: 'owner', l: 'Front — owner line' },
          { k: 'back', l: 'Back — text', t: 'area' },
          { k: 'steps', l: 'Back — steps (comma separated)', t: 'csv' },
          { k: 'themeColor', l: 'Theme colour', t: 'color' }
        ] }
    ],
    mixbars: [
      { t: 'list', k: 'legend', l: 'Segment legend', addLabel: 'Add segment',
        make: function () { return { label: 'Segment', color: '#4E7A6B' }; },
        fields: [{ k: 'label', l: 'Label' }, { k: 'color', l: 'Colour', t: 'color' }] },
      { t: 'list', k: 'rows', l: 'Rows', addLabel: 'Add row',
        make: function () { return { label: 'New row', meta: '', segs: [50, 50], detail: '' }; },
        fields: [
          { k: 'label', l: 'Row label' },
          { k: 'meta', l: 'Meta line', tip: 'e.g. ADR 1,240 · 860 room nights' },
          { k: 'segs', l: 'Segment values (comma separated)', t: 'csv', num: true, tip: 'One value per legend segment, in the same order' },
          { k: 'detail', l: 'Detail text (shown when the row is clicked)', t: 'area' }
        ] },
      { k: 'note', l: 'Note under the chart', t: 'area' }
    ],
    xtable: [
      { k: 'cols', l: 'Column headers (comma separated)', t: 'csv' },
      { k: 'rows', l: 'Rows', t: 'rowscsv', tip: 'One row per line — separate cells with |' },
      { k: 'filterLabel', l: 'Filter placeholder', tip: 'e.g. "Filter opportunities…"' }
    ],
    benchdash: [
      { t: 'list', k: 'kpis', l: 'KPI cards', addLabel: 'Add KPI',
        make: function () { return { label: 'KPI', value: '', sub: '', down: false, bar: 50 }; },
        fields: [
          { k: 'label', l: 'Label' }, { k: 'value', l: 'Value' }, { k: 'sub', l: 'Sub-line' },
          { k: 'down', l: 'Trending down (red)', t: 'check' },
          { k: 'bar', l: 'Bar fill (0–100)', t: 'num' }
        ] },
      { t: 'group', k: 'trend', l: 'Trend chart', fields: [
        { k: 'title', l: 'Chart title' }, { k: 'sub', l: 'Chart sub-line' },
        { k: 'labels', l: 'X-axis labels (comma separated)', t: 'csv' },
        { t: 'list', k: 'series', l: 'Series', addLabel: 'Add series',
          make: function () { return { name: 'Series', color: '#A4523F', dash: false, values: [] }; },
          fields: [
            { k: 'name', l: 'Name' }, { k: 'color', l: 'Colour', t: 'color' },
            { k: 'dash', l: 'Dashed line', t: 'check' },
            { k: 'values', l: 'Values (comma separated)', t: 'csv', num: true }
          ] }
      ] },
      { t: 'list', k: 'tips', l: 'Tips / watch-outs', addLabel: 'Add tip',
        make: function () { return { label: '01 · Tip', title: 'Tip title', text: '' }; },
        fields: [{ k: 'label', l: 'Small label' }, { k: 'title', l: 'Title' }, { k: 'text', l: 'Text', t: 'area' }] }
    ],
    alloc: [
      { k: 'buildTitle', l: 'Left panel title' },
      { t: 'list', k: 'parts', l: 'Benefit parts', addLabel: 'Add part',
        make: function () { return { label: 'Benefit', value: 0, color: '#B59060' }; },
        fields: [{ k: 'label', l: 'Label' }, { k: 'value', l: 'Value (USD)', t: 'num' }, { k: 'color', l: 'Colour', t: 'color' }] },
      { t: 'group', k: 'total', l: 'Total line', fields: [{ k: 'label', l: 'Label' }, { k: 'text', l: 'Value text', tip: 'e.g. USD 150' }] },
      { t: 'group', k: 'quality', l: 'Quality panel (dark box)', fields: [
        { k: 'eyebrow', l: 'Eyebrow' }, { k: 'value', l: 'Percentage number', t: 'num' },
        { k: 'display', l: 'Display text', tip: 'e.g. ≈ 12%' }, { k: 'text', l: 'Explanation', t: 'area' }
      ] },
      { t: 'list', k: 'steps', l: 'Steps under the chart', addLabel: 'Add step',
        make: function () { return { label: 'Step', text: '' }; },
        fields: [{ k: 'label', l: 'Step label' }, { k: 'text', l: 'Step text', t: 'area' }] }
    ],
    tabx: [
      { t: 'list', k: 'tabs', l: 'Tabs', addLabel: 'Add tab',
        make: function () { return { label: 'New tab', usedin: '', title: '', text: '', url: '', linkLabel: '' }; },
        fields: [
          { k: 'label', l: 'Tab label' },
          { k: 'usedin', l: 'Small line above title', tip: 'e.g. Used in 5.2.5' },
          { k: 'title', l: 'Title' },
          { k: 'text', l: 'Body text', t: 'area' },
          { k: 'url', l: 'Link URL (optional)' },
          { k: 'linkLabel', l: 'Link label (optional)' }
        ] }
    ],
    scorecard: [
      { k: 'taskCol', l: 'First column header' },
      { k: 'dims', l: 'Score dimensions (comma separated)', t: 'csv' },
      { k: 'scaleMax', l: 'Maximum score per cell', t: 'num', tip: 'Usually 4' },
      { k: 'totalLabel', l: 'Total label' },
      { k: 'note', l: 'Note under the scorecard', t: 'area' },
      { t: 'list', k: 'tasks', l: 'Tasks / rows', addLabel: 'Add task',
        make: function () { return { name: 'New task', covers: '' }; },
        fields: [{ k: 'name', l: 'Task name' }, { k: 'covers', l: 'What it covers', t: 'area' }] }
    ],
    typedist: [
      { t: 'group', k: 'toggle', l: 'Toggle labels', fields: [
        { k: 'a', l: 'First option', tip: 'e.g. This year' }, { k: 'b', l: 'Second option', tip: 'e.g. STLY' }
      ] },
      { t: 'list', k: 'rows', l: 'Rows', addLabel: 'Add row',
        make: function () { return { label: 'New row', a: 0, b: 0, suffix: '', color: '#B59060' }; },
        fields: [
          { k: 'label', l: 'Label' },
          { k: 'a', l: 'First value', t: 'num' }, { k: 'b', l: 'Second value', t: 'num' },
          { k: 'suffix', l: 'Suffix', tip: 'e.g. % of room nights' },
          { k: 'color', l: 'Colour', t: 'color' }
        ] },
      { k: 'note', l: 'Note under the chart', t: 'area' }
    ],
    stageflow: [
      { t: 'list', k: 'items', l: 'Checklist actions (ticked in order)', addLabel: 'Add action',
        make: function () { return { label: 'Action', text: '' }; },
        fields: [{ k: 'label', l: 'Action label' }, { k: 'text', l: 'Action text', t: 'area' }] },
      { k: 'gateText', l: 'Gate title' },
      { k: 'gateLocked', l: 'Gate text while locked', t: 'area' },
      { k: 'gateOpen', l: 'Gate text once unlocked', t: 'area' }
    ],
    dlcheck: [
      { t: 'group', k: 'file', l: 'Downloadable file', fields: [
        { k: 'title', l: 'File title' }, { k: 'meta', l: 'Meta line', tip: 'e.g. Excel workbook · 9 tabs' },
        { k: 'text', l: 'Description', t: 'area' },
        { k: 'url', l: 'File URL', tip: 'Leave blank until the file is uploaded' },
        { k: 'button', l: 'Button label' }
      ] },
      { k: 'listTitle', l: 'Checklist title' },
      { t: 'list', k: 'items', l: 'Checklist items', addLabel: 'Add item',
        make: function () { return { text: 'New item', tag: '' }; },
        fields: [{ k: 'text', l: 'Item text', t: 'area' }, { k: 'tag', l: 'Tag (optional)' }] }
    ],
    testline: [
      { t: 'list', k: 'phases', l: 'Phases (left to right)', addLabel: 'Add phase',
        make: function () { return { num: 1, label: 'Weeks · Phase', text: '', tag: '', color: '#B59060' }; },
        fields: [
          { k: 'num', l: 'Length (number)', t: 'num', tip: 'e.g. 2 for two weeks' },
          { k: 'label', l: 'Label', tip: 'e.g. Weeks · Test' },
          { k: 'text', l: 'Description', t: 'area' },
          { k: 'tag', l: 'Tag on the bar' },
          { k: 'color', l: 'Colour', t: 'color' }
        ] },
      { t: 'group', k: 'axis', l: 'Axis labels', fields: [
        { k: 'from', l: 'Left label' }, { k: 'mid', l: 'Middle label' }, { k: 'to', l: 'Right label' }
      ] },
      { t: 'list', k: 'cards', l: 'Warning cards (optional)', addLabel: 'Add card',
        make: function () { return { label: 'Note', text: '', tone: 'warn' }; },
        fields: [
          { k: 'label', l: 'Label' }, { k: 'text', l: 'Text', t: 'area' },
          { k: 'tone', l: 'Tone', t: 'select', opts: [{ v: 'warn', l: 'Warning (red)' }, { v: '', l: 'Neutral' }] }
        ] }
    ],
    eventcal: [
      { t: 'list', k: 'pins', l: 'Timeline pins (left to right)', addLabel: 'Add pin',
        make: function () { return { at: '', label: 'Pin', title: '', bullets: [] }; },
        fields: [
          { k: 'at', l: 'When', tip: 'e.g. Sep, -90 d, +1 mo' },
          { k: 'label', l: 'Pin label' },
          { k: 'title', l: 'Detail title' },
          { k: 'bullets', l: 'Detail bullets (one per line)', t: 'lines' }
        ] },
      { t: 'group', k: 'end', l: 'End marker', fields: [
        { k: 'date', l: 'Date', tip: 'e.g. 25 Dec' }, { k: 'label', l: 'Label', tip: 'e.g. Stay date' }
      ] },
      { k: 'exceptionLabel', l: 'Exception label', tip: 'e.g. Timing exception' },
      { k: 'exception', l: 'Exception text (optional)', t: 'area' }
    ],
    kpidash: [
      { t: 'list', k: 'cats', l: 'KPI categories', addLabel: 'Add category',
        make: function () { return { label: 'Category', kpis: [] }; },
        fields: [
          { k: 'label', l: 'Category label' },
          { t: 'list', k: 'kpis', l: 'KPIs in this category', addLabel: 'Add KPI',
            make: function () { return { name: 'New KPI', src: '', unit: 'Index', target: 100, ty: [], ly: [] }; },
            fields: [
              { k: 'name', l: 'KPI name' },
              { k: 'src', l: 'Data source', tip: 'e.g. D360' },
              { k: 'unit', l: 'Unit' },
              { k: 'target', l: 'Target line', t: 'num' },
              { k: 'ty', l: 'This year — monthly values (comma separated)', t: 'csv', num: true },
              { k: 'ly', l: 'Last year (STLY) — monthly values', t: 'csv', num: true }
            ] }
        ] }
    ],
    compare: [
      { t: 'list', k: 'cols', l: 'Columns (two — left and right)', addLabel: 'Add column',
        make: function () { return { label: 'Column label', title: '', tone: 'is', items: ['New point'] }; },
        fields: [
          { k: 'label', l: 'Column label (small caps)', tip: 'e.g. "What this playbook is"' },
          { k: 'title', l: 'Column title (optional)' },
          { k: 'tone', l: 'Tone', t: 'select', opts: [
            { v: 'is', l: 'Positive — gold, ✓ marks' },
            { v: 'isnot', l: 'Negative — terracotta, ✕ marks' } ] },
          { t: 'lines', k: 'items', l: 'Checklist points (one per line)' }
        ] },
      { k: 'note', l: 'Note under the pair (optional)', t: 'area' }
    ]
  };

  function ixLoadStarter(it) {
    var tpl = IX_TEMPLATES[it.kind] || {};
    Object.keys(it).forEach(function (k) { if (['s', 'name', 'head', 'kind'].indexOf(k) === -1) delete it[k]; });
    Object.keys(tpl).forEach(function (k) { it[k] = JSON.parse(JSON.stringify(tpl[k])); });
  }

  // Schema-driven field renderer — shared by top-level fields, groups and
  // inline list rows so every kind gets real form controls.
  function ixField(box, obj, f) {
    if (!f) return;
    if (f.t === 'group') {
      if (!obj[f.k] || typeof obj[f.k] !== 'object' || Array.isArray(obj[f.k])) obj[f.k] = {};
      box.appendChild(sectionLabel(f.l));
      (f.fields || []).forEach(function (sf) { ixField(box, obj[f.k], sf); });
      return;
    }
    if (f.t === 'list') {
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      box.appendChild(sectionLabel(f.l));
      renderRepeatable(box, obj[f.k], {
        nameOf: f.nameOf || ixNameOf,
        addLabel: f.addLabel, make: f.make,
        onChange: function () {},
        inlineEdit: f.fields ? function (item, wrap) {
          (f.fields || []).forEach(function (sf) { ixField(wrap, item, sf); });
        } : null
      });
      return;
    }
    if (f.t === 'csv') {
      var arr = Array.isArray(obj[f.k]) ? obj[f.k] : [];
      box.appendChild(textField(f.l, arr.join(', '), function (v) {
        obj[f.k] = v.split(',').map(function (s) { s = s.trim(); return f.num ? (parseFloat(s) || 0) : s; })
          .filter(function (s, i, a) { return f.num ? (i < a.length) : s !== ''; });
        touch();
      }, f.tip));
      return;
    }
    if (f.t === 'lines') {
      var ls = Array.isArray(obj[f.k]) ? obj[f.k] : [];
      box.appendChild(textField(f.l, ls.join('\n'), function (v) {
        obj[f.k] = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        touch();
      }, f.tip || 'One per line.', true));
      return;
    }
    if (f.t === 'rowscsv') {
      var rows = Array.isArray(obj[f.k]) ? obj[f.k] : [];
      box.appendChild(textField(f.l, rows.map(function (r) { return (Array.isArray(r) ? r : [r]).join(' | '); }).join('\n'), function (v) {
        obj[f.k] = v.split('\n')
          .map(function (ln) { return ln.split('|').map(function (c) { return c.trim(); }); })
          .filter(function (r) { return r.join('').trim() !== ''; });
        touch();
      }, f.tip || 'One row per line — separate cells with |', true));
      return;
    }
    if (f.t === 'check') { box.appendChild(checkField(f.l, !!obj[f.k], function (v) { obj[f.k] = v; touch(); })); return; }
    if (f.t === 'num') {
      box.appendChild(textField(f.l, obj[f.k] == null ? '' : String(obj[f.k]), function (v) {
        obj[f.k] = v.trim() === '' ? null : (parseFloat(v) || 0); touch();
      }, f.tip));
      return;
    }
    if (f.t === 'select') { box.appendChild(selectField(f.l, obj[f.k] || '', f.opts || [], function (v) { obj[f.k] = v; touch(); })); return; }
    if (f.t === 'color') {
      var wrap = el('div', { class: 'field' }, [el('label', {}, [f.l])]);
      var row = el('div', { style: 'display:flex;gap:8px;align-items:center;' });
      var hexOk = function (v) { return /^#[0-9a-fA-F]{6}$/.test(v || ''); };
      var cp = el('input', { type: 'color', value: hexOk(obj[f.k]) ? obj[f.k] : '#B59060',
        style: 'width:44px;height:34px;padding:2px;border:1px solid var(--line);background:var(--paper);border-radius:4px;cursor:pointer;' });
      var tx = el('input', { type: 'text', value: obj[f.k] || '', placeholder: '#B59060', style: 'flex:1;' });
      cp.addEventListener('input', function () { tx.value = cp.value; obj[f.k] = cp.value; touch(); });
      tx.addEventListener('input', function () { obj[f.k] = tx.value.trim(); if (hexOk(tx.value.trim())) cp.value = tx.value.trim(); touch(); });
      row.appendChild(cp); row.appendChild(tx); wrap.appendChild(row); box.appendChild(wrap);
      return;
    }
    // text (default) / area
    box.appendChild(textField(f.l, obj[f.k] == null ? '' : String(obj[f.k]), function (v) { obj[f.k] = v; touch(); }, f.tip, f.t === 'area'));
  }

  function ixRenderForm(box, it) {
    var spec = IX_FORMS[it.kind] || [];
    if (!spec.length) {
      box.appendChild(el('div', { class: 'note', text: 'No form for this kind yet — use the raw JSON below.' }));
      return;
    }
    spec.forEach(function (f) { ixField(box, it, f); });
  }


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
    } else if (d.type === 'preview-lang') {
      // The reader picked a language inside the preview (entry overlay or
      // masthead switch) — mirror it in the toolbar and re-push merged content.
      PREVIEW_LANG = d.lang || 'en';
      syncPreviewLangSelect();
      pushPreview(true);
    }
  });

  // =========================================================================
  // Multilingual (Phase 1)
  // ----------------------------------------------------------------------------
  // English is the source of truth. meta.languages declares the available
  // languages; PB.i18n[code] holds a full-structure overlay JSON whose strings
  // replace the English ones at load time (deep merge — missing or empty
  // strings fall back to English). publish.js uploads each overlay as
  // playbook-data.<code>.json next to playbook-data.json.
  // =========================================================================
  var LANG_CHOICES = [
    { code: 'zh-CN', label: '简体中文 (Simplified Chinese)' },
    { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
    { code: 'ja', label: '日本語 (Japanese)' },
    { code: 'ko', label: '한국어 (Korean)' },
    { code: 'th', label: 'ไทย (Thai)' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'ar', label: 'العربية (Arabic — RTL)' }
  ];
  var PREVIEW_LANG = 'en';

  function deepMergeLang(base, over) {
    if (over == null) return base;
    if (typeof over === 'string') return over.trim() === '' ? base : over;
    if (typeof over !== 'object') return over;
    if (Array.isArray(over)) {
      var src = Array.isArray(base) ? base : [];
      return over.map(function (item, i) {
        return i < src.length ? deepMergeLang(src[i], item) : item;
      });
    }
    var out = {};
    var bObj = (base && typeof base === 'object' && !Array.isArray(base)) ? base : {};
    Object.keys(bObj).forEach(function (k) { out[k] = bObj[k]; });
    Object.keys(over).forEach(function (k) { out[k] = deepMergeLang(bObj[k], over[k]); });
    return out;
  }

  function declaredLangs() {
    if (!PB) return [];
    PB.meta = PB.meta || {};
    if (!Array.isArray(PB.meta.languages)) PB.meta.languages = [];
    return PB.meta.languages;
  }

  // Toolbar language select: visible only when the playbook declares languages.
  function syncPreviewLangSelect() {
    var sel = $('#pvLang');
    if (!sel) return;
    var langs = declaredLangs();
    sel.innerHTML = '';
    var opts = [{ code: 'en', label: 'English (source)' }].concat(langs);
    opts.forEach(function (l) {
      sel.appendChild(el('option', { value: l.code, selected: l.code === PREVIEW_LANG ? 'selected' : null }, [l.label]));
      if (l.code === PREVIEW_LANG) sel.value = l.code;
    });
    if (!opts.some(function (o) { return o.code === PREVIEW_LANG; })) { PREVIEW_LANG = 'en'; sel.value = 'en'; }
    sel.style.display = langs.length ? '' : 'none';
  }

  function playbookForPreview() {
    if (PREVIEW_LANG !== 'en' && PB.i18n && PB.i18n[PREVIEW_LANG]) {
      return deepMergeLang(PB, PB.i18n[PREVIEW_LANG]);
    }
    return PB;
  }

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
    // link), or the last one used. When signed in, the CLOUD draft wins by
    // default (newest timestamp vs the local autosnapshot) — reopening the
    // Studio always shows the latest synced version; unsaved local work is
    // never overwritten (local newer → local stays, with a note).
    var bootSlugPromise = pendingEdit
      ? STORE.setSlug(pendingEdit)
      : STORE.getSlug().then(function (s) { return STORE.setSlug(s || ''); });
    bootSlugPromise.then(function () {
      return maybeLoadCloudDraft();
    }).then(function (cloudPb) {
      if (cloudPb) { maybeEnterFromLibrary(); return null; }
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

  // Cloud-first boot: when this slug exists in the cloud, load the newer of
  // (cloud draft/published) vs the local autosnapshot. Reading the lanes is
  // PUBLIC (no sign-in needed) so this works on every browser, signed in or
  // not — the cloud copy is the cross-device source of truth. Returns the
  // playbook when the cloud copy was loaded, else null.
  function maybeLoadCloudDraft() {
    if (pendingEdit || pendingCreate) return Promise.resolve(null);
    var cfg = window.SUPABASE_CONFIG || { url: '', bucket: 'playbook-content' };
    if (!cfg.url) return Promise.resolve(null);
    var base = cfg.url + '/storage/v1/object/public/' + (cfg.bucket || 'playbook-content') + '/';
    return STORE.getSlug().then(function (slug) {
      if (!slug) return null;
      function probe(lane) {
        return fetch(base + lane + '/' + slug + '/version.json?t=' + Date.now())
          .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      }
      return Promise.all([probe('drafts'), probe('published')]).then(function (v) {
        var cloudAt = 0, lane = null, cloudBy = null;
        ['drafts', 'published'].forEach(function (ln, i) {
          var at = v[i] && v[i].publishedAt ? Date.parse(v[i].publishedAt) : 0;
          if (at > cloudAt) { cloudAt = at; lane = ln; cloudBy = v[i].publishedBy || null; }
        });
        if (!lane) return null;
        return STORE.loadAutosnapshot().then(function (snap) {
          var localAt = snap && snap.at ? snap.at : 0;
          if (localAt && localAt > cloudAt) {
            // Local edits are newer — but UNSIGNED local work is never part of
            // the shared record (only signed-in saves are accepted), so when
            // there is no session the cloud copy still loads; the local slot
            // is kept untouched in this browser.
            return sessionOf().then(function (session) {
              if (session && session.access_token) {
                toast('Your local edits are newer than the cloud copy — press Save to sync them up.', 'ok');
                return null;
              }
              return loadLane(base, lane, slug, cloudBy, cloudAt,
                'Loaded the latest cloud version — edits made while signed out are not shared. Sign in, then Save, to contribute changes.');
            });
          }
          return loadLane(base, lane, slug, cloudBy, cloudAt, null);
        });
      });
    });
  }

  function sessionOf() {
    if (!(window.PlaybookPublish && window.PlaybookPublish.getSession)) return Promise.resolve(null);
    return window.PlaybookPublish.getSession().catch(function () { return null; });
  }

  function loadLane(base, lane, slug, by, at, extraNote) {
    return fetch(base + lane + '/' + slug + '/playbook-data.json?t=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (pb) {
        pb.meta = pb.meta || {};
        if (!pb.meta.slug) pb.meta.slug = slug;
        setPlaybook(pb);
        STORE.save(pb);
        lastAssetSig = assetSig();
        noteSaved(by, at);
        var who = by ? ' (last saved by ' + by + (at ? ' · ' + new Date(at).toLocaleString() : '') + ')' : '';
        toast(extraNote || ('Loaded the latest cloud version of "' + (pb.meta.title || slug) + '"' + who + '.'), 'ok');
        return pb;
      })
      .catch(function () { return null; });
  }

  // Periodic cloud autosave: every 45s, when there are unsynced edits and a
  // sign-in session, sync the draft lane quietly — JSON-only when no new media
  // was added since the last full save, full upload otherwise.
  var cloudAutosaveTimer = setInterval(function () {
    if (!PB || !cloudDirty) return;
    if (document.querySelector('#busy')) return; // an export/publish is running
    if (!(window.PlaybookPublish && window.PlaybookPublish.saveDraftJson)) return;
    window.PlaybookPublish.getSession().then(function (session) {
      if (!(session && session.access_token)) {
        // Unsigned/expired session: edits keep accumulating ONLY in this
        // browser's local slot. Say so in the status pill — a silent
        // browser-only copy is exactly what caused "my Mac save didn't show
        // up on my other computer".
        setAutosave('dirty', 'Saved in this browser only — sign in (Publish) to sync to the cloud.');
        return;
      }
      var slug = window.PlaybookPublish.slugFor(PB);
      if (!slug) return;
      var sig = assetSig();
      var p = (sig === lastAssetSig)
        ? window.PlaybookPublish.saveDraftJson(PB, { session: session })
        : window.PlaybookPublish.saveDraft(PB, { session: session, onProgress: function () {} });
      p.then(function () {
        lastAssetSig = sig;
        cloudDirty = false; dirty = false;
        noteSaved(session.user && session.user.email, Date.now());
        setAutosave('saved', 'Autosaved to cloud · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }).catch(function () {
        // stays dirty — next tick retries, but do not pretend it synced
        setAutosave('dirty', 'Cloud sync failed — will retry. Your work is still saved in this browser.');
      });
    });
  }, 45000);

  // Warn the moment a signed-in session drops (expired token, signed out in
  // another tab): from then on, saves stay in THIS browser only. Previously
  // this was silent — the classic "Save stopped working on my usual browser
  // but incognito was fine" report.
  var hadSession = false;
  if (window.PlaybookPublish && window.PlaybookPublish.onAuthChange) {
    window.PlaybookPublish.getSession().then(function (s) { hadSession = !!(s && s.access_token); });
    window.PlaybookPublish.onAuthChange(function (session) {
      var has = !!(session && session.access_token);
      if (hadSession && !has) {
        toast('Your sign-in session has expired — new edits are saved in this browser only. Open Publish and sign in again to keep syncing to the cloud.', 'err');
        if (cloudDirty) setAutosave('dirty', 'Saved in this browser only — sign in (Publish) to sync to the cloud.');
      }
      hadSession = has;
    });
  }

  // ---- Local safety nets ---------------------------------------------------
  // Optional real-file backup (Chrome/Edge File System Access): once a file
  // is chosen in Settings, saves and a 90s timer rewrite it silently — work
  // survives even a full browser-data wipe.
  var backupHandle = null, backupFileName = '', backupNeedsGesture = false, backupLastWrite = 0;
  if (STORE.loadBackupHandle) {
    STORE.loadBackupHandle().then(function (h) {
      if (h) { backupHandle = h; backupFileName = h.name || 'backup file'; }
    });
  }
  function writeBackupFile() {
    if (!backupHandle || !backupHandle.createWritable || !PB) return Promise.resolve(false);
    return backupHandle.queryPermission({ mode: 'readwrite' }).then(function (perm) {
      if (perm !== 'granted') { backupNeedsGesture = true; return false; }
      return backupHandle.createWritable().then(function (w) {
        return w.write(JSON.stringify(PB, null, 2)).then(function () { return w.close(); });
      }).then(function () {
        backupLastWrite = Date.now(); backupNeedsGesture = false;
        return true;
      });
    }).catch(function () { return false; });
  }
  setInterval(function () {
    if (backupHandle && dirty && !document.querySelector('#busy')) writeBackupFile();
  }, 90000);

  // Never let a tab close silently take unsynced edits with it.
  window.addEventListener('beforeunload', function (e) {
    if (cloudDirty) { e.preventDefault(); e.returnValue = ''; }
  });

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
      // The restored local draft IS this playbook. It is only the freshest
      // copy if it is newer than the cloud lanes — a colleague's (or your
      // own other-browser) save must never be hidden by a stale local
      // autosnapshot, so compare timestamps before deciding.
      pendingEdit = null;
      stripLibraryParams();
      cloudNewerThanLocal(slug, null).then(function (cloudNewer) {
        if (cloudNewer) loadPublishedForEdit(slug);
      });
      return;
    }
    // Different playbook: drafts live in per-slug slots, so switching is
    // always safe and silent — no 'will be replaced' prompt, ever. Load the
    // NEWER of the local slot vs the cloud lanes: the local slot wins only
    // when it is genuinely newer (unsynced edits on THIS browser); otherwise
    // the cloud copy is the source of truth and the stale local slot is
    // replaced, so every browser opens the same latest version.
    STORE.setSlug(slug).then(function () { return STORE.loadAutosnapshot(); }).then(function (snap) {
      cloudNewerThanLocal(slug, snap && snap.at).then(function (cloudNewer) {
        if (snap && snap.playbook && !cloudNewer) {
          setPlaybook(snap.playbook);
          toast('Opened \u201C' + ((snap.playbook.meta && snap.playbook.meta.title) || slug) + '\u201D — your other drafts are kept per playbook.', 'ok');
        } else {
          loadPublishedForEdit(slug);
        }
        pendingEdit = null;
        stripLibraryParams();
      });
    });
  }

  // Compare the local autosnapshot timestamp with the cloud lanes'
  // version.json timestamps (public reads — no sign-in needed). Resolves
  // true when the newest cloud copy is newer than the local slot; any probe
  // failure resolves false (offline → keep the local copy, never block).
  // localAt === null means "the current doc came from this browser's slot,
  // timestamp unknown" — treated as fresh unless the cloud is newer than
  // the last local autosnapshot we can find.
  function cloudNewerThanLocal(slug, localAt) {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !slug) return Promise.resolve(false);
    var base = String(cfg.url).replace(/\/$/, '') + '/storage/v1/object/public/playbook-content/';
    function probe(lane) {
      return fetch(base + lane + '/' + encodeURIComponent(slug) + '/version.json?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (v) { return v && v.publishedAt ? Date.parse(v.publishedAt) : 0; })
        .catch(function () { return 0; });
    }
    function decide(local) {
      return Promise.all([probe('drafts'), probe('published')]).then(function (ts) {
        var cloudAt = Math.max(ts[0], ts[1]);
        if (!cloudAt) return false;
        if (!local) return true; // nothing local — cloud is the truth
        if (cloudAt > local) return true;
        // Local is newer: only counts when the author can actually contribute
        // it — changes made while SIGNED OUT are never accepted into the
        // shared record, so the cloud copy wins the load instead.
        return sessionOf().then(function (session) {
          if (session && session.access_token) {
            toast('Your edits on this browser are newer than the cloud copy — press Save to sync them up.', 'ok');
            return false;
          }
          toast('Loaded the latest cloud version — edits made while signed out are not shared. Sign in, then Save, to contribute changes.', 'ok');
          return true;
        });
      });
    }
    if (localAt) return decide(localAt);
    return STORE.loadAutosnapshot().then(function (snap) {
      return decide(snap && snap.at ? snap.at : 0);
    });
  }
  function loadPublishedForEdit(slug) {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url) { toast('Supabase is not configured here.', 'err'); pendingEdit = null; return; }
    // Always load the NEWER of the two lanes — a playbook that was published
    // once keeps index status 'published' forever, so preferring the published
    // lane would silently load an older copy over a newer draft. The Library's
    // stage=draft hint is only a tiebreak, not the deciding factor.
    var params = new URLSearchParams(window.location.search);
    var preferDraft = params.get('stage') === 'draft'; // tiebreak only
    var base = String(cfg.url).replace(/\/$/, '') + '/storage/v1/object/public/playbook-content/';
    function probe(lane) {
      return fetch(base + lane + '/' + encodeURIComponent(slug) + '/version.json?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    toast('Loading playbook\u2026');
    Promise.all([probe('drafts'), probe('published')]).then(function (vs) {
      var draftAt = vs[0] && vs[0].publishedAt ? Date.parse(vs[0].publishedAt) : 0;
      var pubAt = vs[1] && vs[1].publishedAt ? Date.parse(vs[1].publishedAt) : 0;
      var lane = draftAt > pubAt ? 'drafts' : (pubAt ? 'published' : (draftAt ? 'drafts' : (preferDraft ? null : null)));
      var laneBy = (draftAt > pubAt ? vs[0] : vs[1]) || null;
      var laneAt = Math.max(draftAt, pubAt);
      if (!lane) {
        toast('Could not load the playbook: not found in published or draft storage.', 'err');
        pendingEdit = null;
        stripLibraryParams();
        return;
      }
      fetch(base + lane + '/' + encodeURIComponent(slug) + '/playbook-data.json?t=' + Date.now())
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (pb) {
          pb.meta = pb.meta || {};
          if (!pb.meta.slug) pb.meta.slug = slug;
          setPlaybook(pb);
          markSaved();
          lastAssetSig = assetSig();
          noteSaved(laneBy && laneBy.publishedBy, laneAt || Date.now());
          var laneLabel = lane === 'drafts' ? 'draft' : 'published version';
          var who = laneBy && laneBy.publishedBy
            ? ' Last saved by ' + laneBy.publishedBy + (laneAt ? ' · ' + new Date(laneAt).toLocaleString() : '') + '.'
            : '';
          toast('Loaded \u201C' + ((pb.meta && pb.meta.title) || slug) + '\u201D — you are editing the ' + laneLabel +
            (lane === 'drafts' && pubAt ? ' (newer than the published copy).' : '.') + who, 'ok');
          pendingEdit = null;
          stripLibraryParams();
        }).catch(function () {
          toast('Could not load the playbook content (HTTP error).', 'err');
          pendingEdit = null;
          stripLibraryParams();
        });
    });
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
    PREVIEW_LANG = 'en';
    syncPreviewLangSelect();
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
    var msg = { type: 'set-playbook', playbook: playbookForPreview(), lang: PREVIEW_LANG };
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
          if (sub.depth === 3) node.style.paddingLeft = '46px'; // sub-section under a topic
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
    var order = ['standard', 'sections-list', 'lifecycle', 'directory', 'letter', 'tile-menu', 'part', 'card-track', 'process-diagram'];
    var descs = {
      'standard': 'Opener plus numbered policy sections with items.',
      'sections-list': 'A simple list of sections — good for toolkits and resources.',
      'lifecycle': 'Stages with their own policy sections (the wheel model).',
      'directory': 'People grids: senior management, leaders and beliefs.',
      'letter': 'Foreword-style editorial chapter.',
      'tile-menu': 'A grid of image tiles, each linking to a chapter — like the Contents page, placed anywhere.',
      'part': 'A part that groups sub-topics — sub-topics show indented in the outline and rail (e.g. “Introduction” with 1.1–1.7 under it).',
      'card-track': 'A horizontal track of linked cards on a spine — an opportunity/section map. Stacks vertically on mobile.',
      'process-diagram': 'A reference process diagram: section cards with linked steps that open chapters. Accordion on mobile.'
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
    if (type === 'process-diagram') {
      PB.sectionBodies[id] = { intro: [], sections: [] };
      ch.diagram = {
        eyebrow: '', title: 'Process overview', subline: '', pill: 'Select a step', footnote: '', unit: 'step',
        sections: [{ num: '01', label: 'Section 1', name: 'First section', icon: 'ruler',
          links: [{ num: '1', name: 'First step', ref: '', target: 'menu' }] }]
      };
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
    if (SEL.kind === 'settings') { renderSettings(box); groupInspectorCards(box); return; }
    if (SEL.kind === 'chapter') { renderChapterInspector(box, SEL); groupInspectorCards(box); return; }
    if (SEL.kind === 'lifecycle-sub') { renderLifecycleSub(box, SEL); groupInspectorCards(box); return; }
    if (SEL.kind === 'part-sub') { renderPartSub(box, SEL); groupInspectorCards(box); return; }
    if (SEL.kind === 'section') { renderSection(box, SEL); groupInspectorCards(box); return; }
    if (SEL.kind === 'item') { renderItem(box, SEL); groupInspectorCards(box); return; }
  }

  // Presentation-only regrouping: everything a render* function emits between
  // two .section-label markers is gathered into one white .card (the approved
  // redesign's "Chapter hero / Opening words / Page sections" card language).
  // The data model, field handlers and touch() calls are untouched.
  function groupInspectorCards(box) {
    var nodes = Array.prototype.slice.call(box.childNodes);
    var card = null;
    nodes.forEach(function (n) {
      if (n.nodeType !== 1) return;
      if (n.classList.contains('section-label') && !n.classList.contains('card-head')) {
        card = el('div', { class: 'card' });
        box.insertBefore(card, n);
        n.classList.add('card-head');
        card.appendChild(n);
      } else if (card) {
        card.appendChild(n);
      }
    });
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
      if (prefix0 && (type === 'standard' || type === 'sections-list' || type === 'lifecycle' || type === 'directory' || type === 'letter' ||
        type === 'part' || type === 'tile-menu' || type === 'card-track' || type === 'process-diagram')) {
        box.appendChild(imageField('Opener image (header + menu tile)', PB.prose[prefix0 + '.opener.bg'] || '', function (fn) { PB.prose[prefix0 + '.opener.bg'] = fn; touch(); }));
        box.appendChild(videoField('Opener video (above the text)', PB.prose[prefix0 + '.opener.video'] || '', function (fn) { PB.prose[prefix0 + '.opener.video'] = fn; touch(); }));
        var body0 = bodyForChapter(ch);
        box.appendChild(paraArrayField('Opening paragraph(s)', body0.intro || [], function (arr) { body0.intro = arr; touch(); }));
        // Chapter-level content elements (tables, knowledge tips, timelines,
        // checklists, task lists, media) — render under the opening
        // paragraphs, above the sections.
        body0.items = body0.items || [];
        box.appendChild(sectionLabel('Content elements (' + body0.items.length + ')'));
        renderRepeatable(box, body0.items, {
          nameOf: function (it) { return typeof it === 'string' ? (it.slice(0, 60) || '(empty)') : (it.name || '(item)'); },
          subOf: function (it) { return typeof it === 'string' ? 'Text' : symbolLabel(it.s); },
          open: function (it, i) { select({ kind: 'item', ref: { arr: body0.items, index: i }, chapter: ch.id, backSel: SEL }); },
          addLabel: 'Add item',
          make: function () { return { s: 'policy', name: 'New item', blurb: '', url: '' }; }
        });
        box.appendChild(mediaActionsRow(body0.items));
      }
      // Tile-menu chapters: the tiles are the whole point — title, text,
      // optional image and the chapter each tile links to.
      if (type === 'process-diagram') {
        ch.diagram = ch.diagram || { sections: [] };
        var dgm = ch.diagram;
        dgm.sections = dgm.sections || [];
        var dTargets = [{ v: 'menu', l: 'Contents page' }].concat(PB.chapters.map(function (c) {
          return { v: c.id, l: (c.numeral ? c.numeral + ' · ' : '') + (c.label || c.id) };
        }));
        box.appendChild(sectionLabel('Diagram header'));
        box.appendChild(textField('Eyebrow', dgm.eyebrow || '', function (v) { dgm.eyebrow = v; touch(); }, 'e.g. Part 3 · Opportunities Overview'));
        box.appendChild(textField('Title', dgm.title || '', function (v) { dgm.title = v; touch(); }));
        box.appendChild(textField('Sub-line', dgm.subline || '', function (v) { dgm.subline = v; touch(); }, '', true));
        box.appendChild(textField('Pill (top right)', dgm.pill || '', function (v) { dgm.pill = v; touch(); }, 'e.g. Select an opportunity'));
        box.appendChild(textField('Footer note', dgm.footnote || '', function (v) { dgm.footnote = v; touch(); }, 'Small line under the panel.', true));
        box.appendChild(textField('Unit word (for the count chips)', dgm.unit || 'opportunity', function (v) { dgm.unit = v.trim() || 'opportunity'; touch(); }, 'Singular — e.g. opportunity, step, section. Pluralised automatically.'));
        box.appendChild(sectionLabel('Sections (' + dgm.sections.length + ')'));
        renderRepeatable(box, dgm.sections, {
          nameOf: function (s) { return (s.num ? s.num + ' \u00b7 ' : '') + (s.name || '(section)'); },
          subOf: function (s) { return (s.links || []).length + ' linked step(s)'; },
          open: null,
          inlineEdit: function (s, wrap) {
            wrap.appendChild(textField('Number', s.num || '', function (v) { s.num = v; touch(); }, 'e.g. 01'));
            wrap.appendChild(textField('Label', s.label || '', function (v) { s.label = v; touch(); }, 'e.g. Section 1'));
            wrap.appendChild(textField('Name', s.name || '', function (v) { s.name = v; touch(); }));
            wrap.appendChild(selectField('Icon', s.icon || 'ruler', [
              { v: 'ruler', l: 'Ruler (baseline/measure)' }, { v: 'tag', l: 'Tag (offers/packages)' },
              { v: 'sliders', l: 'Sliders (pricing/controls)' }, { v: 'flag', l: 'Flag (events)' },
              { v: 'calendar', l: 'Calendar' }, { v: 'chart', l: 'Chart (performance)' },
              { v: 'check', l: 'Check (done/review)' }, { v: 'doc', l: 'Document' }
            ], function (v) { s.icon = v; touch(); }));
            s.links = s.links || [];
            wrap.appendChild(sectionLabel('Linked steps (' + s.links.length + ')'));
            renderRepeatable(wrap, s.links, {
              nameOf: function (l) { return l.name || '(step)'; },
              subOf: function (l) {
                var t = dTargets.filter(function (x) { return x.v === l.target; })[0];
                return '\u2192 ' + (t ? t.l : 'Contents page');
              },
              open: null,
              inlineEdit: function (l, wrap2) {
                wrap2.appendChild(textField('Number', l.num || '', function (v) { l.num = v; touch(); }));
                wrap2.appendChild(textField('Step name', l.name || '', function (v) { l.name = v; touch(); }));
                wrap2.appendChild(textField('Reference line (e.g. Chapter VI)', l.ref || '', function (v) { l.ref = v; touch(); }));
                wrap2.appendChild(selectField('Links to', l.target || 'menu', dTargets, function (v) {
                  l.target = v;
                  if (!l.ref) {
                    var t = dTargets.filter(function (x) { return x.v === v; })[0];
                    if (t && t.v !== 'menu' && t.l.indexOf('\u00b7') !== -1) l.ref = 'Chapter ' + t.l.split('\u00b7')[0].trim();
                  }
                  touch();
                }));
              },
              addLabel: 'Add linked step',
              make: function () { return { num: String(s.links.length + 1), name: 'New step', ref: '', target: 'menu' }; }
            });
          },
          addLabel: 'Add section',
          make: function () { return { num: '0' + (dgm.sections.length + 1), label: 'Section ' + (dgm.sections.length + 1), name: 'New section', icon: 'ruler', links: [] }; }
        });
        var bodyD = bodyForChapter(ch);
        box.appendChild(paraArrayField('Intro paragraph(s) above the diagram (optional)', bodyD.intro || [], function (arr) { bodyD.intro = arr; touch(); }));
      }
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
            for (var j = ix + 1; j < ch.subs.length && (ch.subs[j].depth || 1) > 1; j++) {
              if (ch.subs[j].depth === 2) n++;
            }
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
        // The part's own sections (imported content sitting directly under
        // the part) — editable and deletable like any chapter's sections.
        box.appendChild(sectionLabel('Sections in this part (' + (bodyP.sections || []).length + ')'));
        renderSectionsList(box, bodyP, ch.id, null);
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
    // helper: entries belonging to a sub = the run of deeper entries that
    // follow it in the flat subs list (until the next same-or-shallower depth)
    function childRun(parentSub, parentDepth) {
      var out = [];
      var seen = false;
      (ch.subs || []).forEach(function (s2) {
        if (s2 === parentSub) { seen = true; return; }
        if (!seen) return;
        if ((s2.depth || 1) <= parentDepth) seen = false;
        else out.push(s2);
      });
      return out;
    }
    if (isSection) {
      // a § section lists its topics (depth 2; their depth-3 subs ride along)
      var myTopics = childRun(sub, 1).filter(function (t) { return t.depth === 2; });
      // the § section's own imported sections — editable and deletable
      box.appendChild(sectionLabel('Sections in this section (' + (content.sections || []).length + ')'));
      renderSectionsList(box, content, ch.id, sel.id);
      if (!(content.sections || []).length && !myTopics.length) {
        box.appendChild(contentElsewhereNote(ch, sel));
      }
      box.appendChild(sectionLabel('Sub-topics (' + myTopics.length + ')'));
      renderRepeatable(box, myTopics, {
        nameOf: function (t) { return t.label || '(sub-topic)'; },
        subOf: function (t) { return childRun(t, 2).length + ' sub-section(s)'; },
        open: function (t) { select({ kind: 'part-sub', id: t.id, chapter: ch.id, sub: t.id }); },
        addLabel: 'Add sub-topic',
        make: function () {
          var ns = { id: uid('top'), label: 'New sub-topic', depth: 2 };
          PB.sectionBodies[ns.id] = { intro: [], sections: [] };
          return ns;
        },
        onChange: function () {
          // splice the edited topic list back, keeping each topic's depth-3 run
          var ix = ch.subs.indexOf(sub);
          var end = ix + 1;
          while (end < ch.subs.length && (ch.subs[end].depth || 1) > 1) end++;
          var runs = {};
          childRun(sub, 1).forEach(function (t) { if (t.depth === 2) runs[t.id] = childRun(t, 2); });
          var rebuilt = [];
          myTopics.forEach(function (t) {
            rebuilt.push(t);
            (runs[t.id] || []).forEach(function (s3) { rebuilt.push(s3); });
          });
          ch.subs.splice.apply(ch.subs, [ix + 1, end - ix - 1].concat(rebuilt));
        }
      });
    } else if (sub.depth === 2) {
      // a topic lists its sub-sections (depth 3) AND keeps its own sections
      var mySubs = childRun(sub, 2).filter(function (t) { return t.depth === 3; });
      box.appendChild(sectionLabel('Sub-sections (' + mySubs.length + ')'));
      renderRepeatable(box, mySubs, {
        nameOf: function (t) { return t.label || '(sub-section)'; },
        subOf: function () { return 'Indented under this topic'; },
        open: function (t) { select({ kind: 'part-sub', id: t.id, chapter: ch.id, sub: t.id }); },
        addLabel: 'Add sub-section',
        make: function () {
          var ns = { id: uid('sub'), label: 'New sub-section', depth: 3 };
          PB.sectionBodies[ns.id] = { intro: [], sections: [] };
          return ns;
        },
        onChange: function () {
          var ix = ch.subs.indexOf(sub);
          var end = ix + 1;
          while (end < ch.subs.length && (ch.subs[end].depth || 1) > 2) end++;
          ch.subs.splice.apply(ch.subs, [ix + 1, end - ix - 1].concat(mySubs));
        }
      });
      box.appendChild(sectionLabel('Sections'));
      renderSectionsList(box, content, null, sel.id);
      if (!(content.sections || []).length && !childRun(sub, 2).length) {
        box.appendChild(contentElsewhereNote(ch, sub));
      }
    } else {
      box.appendChild(sectionLabel('Sections'));
      renderSectionsList(box, content, null, sel.id);
      if (!(content.sections || []).length) {
        box.appendChild(contentElsewhereNote(ch, sub));
      }
    }
  }

  // When a section/sub-topic page shows content but its own sections list is
  // empty, that content was folded into the parent part during import — point
  // the editor there with a jump link.
  function contentElsewhereNote(ch, sel) {
    var holder = null, holderLabel = '';
    if ((bodyForChapter(ch).sections || []).length) { holderLabel = 'the part "' + ch.label + '"'; }
    else {
      var sibs = (ch.subs || []).filter(function (s) {
        var b = PB.sectionBodies && PB.sectionBodies[s.id];
        return b && (b.sections || []).length;
      });
      if (sibs.length) { holder = sibs[0].id; holderLabel = '"' + sibs[0].label + '"'; }
    }
    var note = el('div', { class: 'form-note' });
    note.style.margin = '2px 0 6px';
    note.appendChild(document.createTextNode(
      'Nothing sits directly under this page. Content shown on the part page (steps, tables, paragraphs) is edited on ' + (holderLabel || 'the parent') + '. '));
    if (holderLabel) {
      var jump = el('button', { type: 'button', class: 'btn ghost', text: 'Open it ›' });
      jump.style.marginLeft = '6px';
      jump.onclick = function () {
        if (holder) select({ kind: 'part-sub', id: holder, chapter: ch.id, sub: holder });
        else select({ kind: 'chapter', id: ch.id, type: ch.type, chapter: ch.id });
      };
      note.appendChild(jump);
    }
    return note;
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
    box.appendChild(mediaActionsRow(sec.items));
  }

  // Shared quick-add panel for content elements — used by the section editor
  // (section items) and the chapter editor (chapter-level items). Every
  // button appends a new item to the given array. All elements — including
  // the 17 interactive kinds — sit at one level, grouped by category in
  // collapsible groups; inserting is always a single click (no kind picker).
  // Weight / colour brand-token fields shared by Body text and Heading.
  var TEXT_WEIGHTS = [
    { v: '', l: 'Default (regular)' }, { v: '400', l: 'Regular 400' },
    { v: '500', l: 'Medium 500' }, { v: '600', l: 'Semibold 600' }, { v: '700', l: 'Bold 700' }
  ];
  var TEXT_COLORS = [
    { v: '', l: 'Default (ink)' }, { v: 'soft', l: 'Soft — supporting copy' },
    { v: 'muted', l: 'Muted — captions' }, { v: 'gold', l: 'Gold — emphasis' },
    { v: 'sage', l: 'Sage — positive / confirmed' }, { v: 'terra', l: 'Terracotta — cautions' }
  ];
  function appendTextFormatFields(box, it) {
    box.appendChild(selectField('Weight', it.weight ? String(it.weight) : '', TEXT_WEIGHTS,
      function (v) { if (v) it.weight = v; else delete it.weight; touch(); }));
    box.appendChild(selectField('Colour', it.color || '', TEXT_COLORS,
      function (v) { if (v) it.color = v; else delete it.color; touch(); }));
  }

  var IX_ADD_LABELS = {
    processflow: 'Decision & exception logic',
    horizons: 'Horizon stepper / journey map',
    legendtour: 'Legend panel + tooltip tour',
    flipcards: 'Principle flip cards',
    mixbars: 'Stacked-bar mix explorer',
    xtable: 'Interactive table explorer',
    benchdash: 'Benchmark dashboard',
    alloc: 'Discount allocation chart',
    tabx: 'Tabbed data explorer',
    cardwall: 'Opportunity card wall',
    scorecard: 'Assessment scorecard / rubric',
    typedist: 'Count / distribution chart',
    stageflow: 'Stage step flow (gated)',
    dlcheck: 'Template + guided checklist',
    testline: 'Test-design timeline',
    eventcal: 'Event calendar timeline',
    kpidash: 'KPI dashboard (STLY toggle)',
    compare: 'Comparison pair'
  };

  function mediaActionsRow(itemsArr) {
    function push(item) { itemsArr.push(item); touch(); renderInspector(); }
    function mk(label, make) {
      return { label: '+ Add ' + label, make: make };
    }
    function mkIx(kind) {
      return { label: '+ Add ' + IX_ADD_LABELS[kind], make: function () {
        var item = { s: 'ix', kind: kind, name: IX_ADD_LABELS[kind] };
        ixLoadStarter(item); // arrives with working example content — ready immediately
        return item;
      } };
    }
    var CATEGORIES = [
      { label: 'Text & media', items: [
        mk('heading', function () { return { s: 'heading', name: 'Heading', text: 'New heading', sub: '' }; }),
        mk('text', function () { return { s: 'text', name: 'Body text', text: 'New paragraph.', lead: false }; }),
        mk('image', null), // media upload flow
        mk('video', null), // media upload flow
        mk('note box', function () { return { s: 'callout', name: 'Quick recap', label: 'Quick recap', text: '', tone: 'recap' }; }),
        mk('knowledge tip', function () { return { s: 'callout', name: 'Knowledge tip', label: 'Knowledge tip', text: '', tone: 'tip' }; })
      ] },
      { label: 'Lists & checks', items: [
        mk('checklist', function () { return { s: 'checklist', name: 'Checklist', items: [{ label: 'New item', url: '' }] }; }),
        mk('task list', function () { return { s: 'tasklist', name: 'Task list', cid: uid('tl'), showProgress: true, gateText: '', items: [{ text: 'New task', note: '', pills: [] }] }; }),
        mk('tabs', function () { return { s: 'tabs', name: 'Tabbed group', tabs: [{ label: 'Tab 1', text: '' }] }; }),
        mk('table', function () { return { s: 'table', name: 'Table', headFirst: true, head: ['Column 1', 'Column 2'], rows: [['', '']] }; }),
        mkIx('compare'),
        mkIx('dlcheck')
      ] },
      { label: 'Steps, timelines & journeys', items: [
        mk('timeline', function () { return { s: 'timeline', name: 'Timeline', mode: 'all', steps: [{ label: 'Step 1', text: '', url: '' }] }; }),
        mk('visual timeline', function () { return { s: 'timeline', name: 'Visual timeline', variant: 'history', steps: [{ label: '1876', sub: 'Era or place', text: '', img: '' }] }; }),
        mk('swimlane', function () { return { s: 'swimlane', name: 'Swimlane timeline', lanes: [
          { role: 'Role 1', steps: [{ label: 'Step 1', text: '' }] },
          { role: 'Role 2', steps: [{ label: 'Step 2', text: '' }] }
        ] }; }),
        mk('before / after', function () { return { s: 'beforeafter', name: 'Before / after', beforeLabel: 'Before', afterLabel: 'After', beforeText: '', afterText: '', beforeImg: '', afterImg: '' }; }),
        mkIx('processflow'),
        mkIx('horizons'),
        mkIx('stageflow'),
        mkIx('testline'),
        mkIx('eventcal')
      ] },
      { label: 'Data & dashboards', items: [
        mk('chart', function () { return { s: 'chart', name: 'Chart', chartType: 'bar', unit: '', labels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ label: 'Series 1', values: [3, 5, 4, 6] }] }; }),
        mk('stat band', function () { return { s: 'statband', name: 'Stat band', stats: [
          { value: '96', unit: '%', label: 'Metric one', sub: '', delta: '', deltaDir: 'up' },
          { value: '72', unit: 'h', label: 'Metric two', sub: '', delta: '', deltaDir: '' }
        ] }; }),
        mk('gauge', function () { return { s: 'gauge', name: 'Gauge', value: 3, max: 5, levelLabel: 'Level 3', caption: '', levels: ['Ad hoc', 'Emerging', 'Established', 'Managed', 'Optimising'] }; }),
        mk('pyramid', function () { return { s: 'pyramid', name: 'Pyramid', tiers: [
          { name: 'Apex outcome', sub: '', note: '' },
          { name: 'Middle tier', sub: '', note: '' },
          { name: 'Foundation', sub: '', note: '' }
        ] }; }),
        mk('wheel', function () { return { s: 'wheel', name: 'Lifecycle wheel', hubEyebrow: '', hubTitle: 'The lifecycle', stages: [
          { label: 'Stage one', text: '' }, { label: 'Stage two', text: '' },
          { label: 'Stage three', text: '' }, { label: 'Stage four', text: '' }
        ] }; }),
        mkIx('mixbars'),
        mkIx('xtable'),
        mkIx('benchdash'),
        mkIx('alloc'),
        mkIx('tabx'),
        mkIx('typedist'),
        mkIx('kpidash')
      ] },
      { label: 'Cards & explorers', items: [
        mkIx('flipcards'),
        mkIx('cardwall'),
        mkIx('scorecard'),
        mkIx('legendtour')
      ] }
    ];

    var wrap = el('div', { class: 'media-actions media-cats', style: 'margin-top:8px;' });
    CATEGORIES.forEach(function (cat) {
      var det = el('details', { class: 'media-cat', open: true });
      det.appendChild(el('summary', { class: 'media-cat-head' }, [cat.label]));
      var grid = el('div', { class: 'media-cat-grid' });
      cat.items.forEach(function (spec) {
        grid.appendChild(el('button', { class: 'btn ghost', onclick: function () {
          if (spec.make) { push(spec.make()); }
          else if (spec.label === '+ Add image') { addMediaItemTo(itemsArr, 'image'); }
          else if (spec.label === '+ Add video') { addMediaItemTo(itemsArr, 'video'); }
        } }, [spec.label]));
      });
      det.appendChild(grid);
      wrap.appendChild(det);
    });
    return wrap;
  }

  // addMediaItem with an explicit target array (chapter-level and section-level
  // uploads share the same flow).
  function addMediaItemTo(itemsArr, kind) {
    var fakeSec = { items: itemsArr };
    addMediaItem(fakeSec, kind);
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
    box.appendChild(textField('Heading above element (optional)', it.head || '', function (v) { it.head = v; touch(); }, 'Shown above this element on the page — leave blank for no heading.'));
    if (it.s === 'ix') {
      if (!it.kind || IX_KINDS.filter(function (k) { return k.v === it.kind; }).length === 0) it.kind = 'processflow';
      box.appendChild(selectField('Interaction kind', it.kind, IX_KINDS, function (v) {
        it.kind = v;
        ixLoadStarter(it); // switch kind = ready-made example content, immediately usable
        touch(); renderInspector();
      }));
      box.appendChild(el('button', { class: 'btn ghost', onclick: function () {
        if (!confirm('Replace this element\u2019s content with the starter example?')) return;
        ixLoadStarter(it); touch(); renderInspector();
        toast('Starter content loaded \u2014 edit the fields below.', 'ok');
      } }, ['Reset to starter content']));
      ixRenderForm(box, it);
      // Advanced: raw JSON for edge cases the form doesn't cover.
      var det = el('details', { style: 'margin-top:16px;border-top:1px solid var(--line);padding-top:10px;' });
      det.appendChild(el('summary', { style: 'cursor:pointer;font-size:12px;color:var(--ink-mute);letter-spacing:.04em;' }, ['Advanced \u2014 edit raw JSON']));
      var jsonTa = el('textarea', { class: 'in', style: 'min-height:160px;margin-top:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;white-space:pre;' });
      var snapshot = {};
      Object.keys(it).forEach(function (k) { if (['s', 'name', 'head', 'kind'].indexOf(k) === -1) snapshot[k] = it[k]; });
      jsonTa.value = JSON.stringify(snapshot, null, 2);
      det.appendChild(jsonTa);
      det.appendChild(el('button', { class: 'btn', style: 'margin-top:6px;', onclick: function () {
        var parsed;
        try { parsed = JSON.parse(jsonTa.value); }
        catch (err) { toast('Invalid JSON: ' + err.message, 'err'); return; }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { toast('JSON must be an object { ... }', 'err'); return; }
        Object.keys(it).forEach(function (k) { if (['s', 'name', 'head', 'kind'].indexOf(k) === -1) delete it[k]; });
        Object.keys(parsed).forEach(function (k) { it[k] = parsed[k]; });
        touch(); renderInspector();
        toast('Interaction updated.', 'ok');
      } }, ['Apply JSON']));
      box.appendChild(det);
      return;
    }
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
      box.appendChild(checkField('Show progress bar ("N of M complete")', !!it.showProgress, function (v) { it.showProgress = v; touch(); }));
      box.appendChild(textField('Completion message (shown when all are ticked)', it.doneText || '', function (v) { it.doneText = v; touch(); }, 'e.g. All complete — ready for sign-off. Blank hides the banner.'));
      box.appendChild(sectionLabel('Checklist items (' + it.items.length + ')'));
      renderRepeatable(box, it.items, {
        nameOf: function (c) { return c.label || '(item)'; },
        subOf: function (c) { return (c.url || '') + (c.note ? (c.url ? ' · ' : '') + 'has details' : ''); },
        open: null,
        inlineEdit: function (c, wrap) {
          wrap.appendChild(textField('Item text', c.label || '', function (v) { c.label = v; touch(); }));
          wrap.appendChild(linkField('Link (optional)', c.url || '', function (v) { c.url = v; touch(); }));
          wrap.appendChild(textField('Details note (optional — readers tap the row to expand)', c.note || '', function (v) { c.note = v; touch(); }, '', true));
        },
        addLabel: 'Add checklist item',
        make: function () { return { label: 'New item', url: '', note: '' }; }
      });
      return;
    }
    if (it.s === 'tasklist') {
      if (!it.cid) it.cid = uid('tl');
      box.appendChild(checkField('Show progress bar ("N of M complete")', it.showProgress !== false, function (v) { it.showProgress = v; touch(); }));
      // Optional V5 context card: dark panel beside the tasks.
      it.card = it.card || { on: false, rows: [], showCount: true };
      box.appendChild(checkField('Show context card (dark panel beside the tasks)', !!it.card.on, function (v) {
        it.card.on = v;
        if (v && !(it.card.rows || []).length) {
          it.card.rows = [{ label: 'Stage', value: '' }, { label: 'Objective', value: '' }, { label: 'Timing', value: '' }, { label: 'Owner', value: '' }];
        }
        touch(); renderInspector();
      }));
      if (it.card.on) {
        box.appendChild(checkField('Show "N of M complete" progress in the card', it.card.showCount !== false, function (v) { it.card.showCount = v; touch(); }));
        it.card.rows = it.card.rows || [];
        box.appendChild(sectionLabel('Card rows (' + it.card.rows.length + ')'));
        renderRepeatable(box, it.card.rows, {
          nameOf: function (r) { return r.label || '(row)'; },
          subOf: function (r) { return (r.value || '').replace(/<[^>]+>/g, '').slice(0, 60); },
          open: null,
          inlineEdit: function (r, wrap) {
            wrap.appendChild(textField('Label (small caps)', r.label || '', function (v) { r.label = v; touch(); }, 'e.g. Stage'));
            wrap.appendChild(textField('Value', r.value || '', function (v) { r.value = v; touch(); }, 'e.g. Baselining', true));
          },
          addLabel: 'Add card row',
          make: function () { return { label: 'Label', value: '' }; }
        });
      }
      box.appendChild(textField('Gate text (sign-off row — optional)', it.gateText || '', function (v) {
        var had = !!it.gateText;
        it.gateText = v;
        touch();
        if (!!v !== had) renderInspector(); // reveal/hide the gate note fields
      }, 'e.g. Discuss with your regional RM lead and ask them to sign off.'));
      if (it.gateText) {
        box.appendChild(textField('Gate locked note', it.gateLocked || '', function (v) { it.gateLocked = v; touch(); }, 'e.g. Gate — complete all actions first.'));
        box.appendChild(textField('Gate unlocked note', it.gateOpen || '', function (v) { it.gateOpen = v; touch(); }, 'e.g. Gate passed — signed off.'));
      }
      it.items = it.items || [];
      box.appendChild(sectionLabel('Tasks (' + it.items.length + ')'));
      var tlTargets = [{ v: '', l: '(no link)' }, { v: 'menu', l: 'Contents page' }].concat(PB.chapters.map(function (c) {
        return { v: c.id, l: (c.numeral ? c.numeral + ' · ' : '') + (c.label || c.id) };
      }));
      renderRepeatable(box, it.items, {
        nameOf: function (c) { return c.text || '(task)'; },
        subOf: function (c) { return (c.pills || []).map(function (p2) { return p2.text; }).join(' · ') + (c.note ? ' · has note' : ''); },
        open: null,
        inlineEdit: function (c, wrap) {
          wrap.appendChild(textField('Task text', c.text || '', function (v) { c.text = v; touch(); }, '', true));
          wrap.appendChild(textField('Details note (optional — readers tap the row to expand)', c.note || '', function (v) { c.note = v; touch(); }, '', true));
          c.pills = c.pills || [];
          wrap.appendChild(sectionLabel('Reference pills (' + c.pills.length + ')'));
          renderRepeatable(wrap, c.pills, {
            nameOf: function (p2) { return p2.text || '(pill)'; },
            subOf: function (p2) {
              var t = tlTargets.filter(function (x) { return x.v === p2.target; })[0];
              return p2.target ? ('→ ' + (t ? t.l : p2.target)) : 'display only';
            },
            open: null,
            inlineEdit: function (p2, wrap2) {
              wrap2.appendChild(textField('Pill text', p2.text || '', function (v) { p2.text = v; touch(); }, 'e.g. See 2.2'));
              wrap2.appendChild(selectField('Colour', p2.tone || 'gold', [
                { v: 'gold', l: 'Gold (cross-reference)' }, { v: 'teal', l: 'Celadon (workbook/resource)' }
              ], function (v) { p2.tone = v; touch(); }));
              wrap2.appendChild(selectField('Links to (optional)', p2.target || '', tlTargets, function (v) { p2.target = v; touch(); }));
            },
            addLabel: 'Add pill',
            make: function () { return { text: 'See …', tone: 'gold', target: '' }; }
          });
        },
        addLabel: 'Add task',
        make: function () { return { text: 'New task', note: '', pills: [] }; }
      });
      return;
    }
    // Swimlane timeline: one lane per role, steps flowing left to right with
    // continuous numbering — shows who does what, and where handoffs happen.
    if (it.s === 'swimlane') {
      it.lanes = it.lanes || [];
      box.appendChild(sectionLabel('Lanes — one per role (' + it.lanes.length + ')'));
      renderRepeatable(box, it.lanes, {
        nameOf: function (l) { return l.role || '(role)'; },
        subOf: function (l) { return (l.steps || []).length + ' step(s)'; },
        open: null,
        inlineEdit: function (l, wrap) {
          wrap.appendChild(textField('Role / lane name', l.role || '', function (v) { l.role = v; touch(); }, 'e.g. Front Office'));
          l.steps = l.steps || [];
          wrap.appendChild(sectionLabel('Steps in this lane (' + l.steps.length + ')'));
          renderRepeatable(wrap, l.steps, {
            nameOf: function (s) { return s.label || '(step)'; },
            subOf: function (s) { return (s.text || '').slice(0, 60); },
            open: null,
            inlineEdit: function (s, wrap2) {
              wrap2.appendChild(textField('Step label', s.label || '', function (v) { s.label = v; touch(); }));
              wrap2.appendChild(textField('Step text (optional)', s.text || '', function (v) { s.text = v; touch(); }, '', true));
            },
            addLabel: 'Add step',
            make: function () { return { label: 'Step', text: '' }; }
          });
        },
        addLabel: 'Add lane',
        make: function () { return { role: 'New role', steps: [{ label: 'Step 1', text: '' }] }; }
      });
      box.appendChild(el('div', { class: 'note', text: 'Steps number continuously across lanes (reading order). A handoff marker appears automatically where a new lane begins.' }));
      return;
    }
    // Chart / dashboard: bar, line or donut rendered as branded SVG — no
    // library. Labels name the categories; series carry the values.
    if (it.s === 'chart') {
      box.appendChild(selectField('Chart type', ['bar', 'line', 'donut'].indexOf(it.chartType) !== -1 ? it.chartType : 'bar', [
        { v: 'bar', l: 'Bar chart' }, { v: 'line', l: 'Line chart' }, { v: 'donut', l: 'Donut chart' }
      ], function (v) { it.chartType = v; touch(); renderInspector(); }));
      box.appendChild(textField('Unit (optional)', it.unit || '', function (v) { it.unit = v; touch(); }, 'e.g. rooms, HKD \'000, %'));
      box.appendChild(textField('Category labels (comma-separated)', (it.labels || []).join(', '), function (v) {
        it.labels = v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); touch();
      }, it.chartType === 'donut' ? 'Each label names a donut segment.' : 'e.g. Jan, Feb, Mar, Apr'));
      it.series = it.series || [];
      box.appendChild(sectionLabel('Series (' + it.series.length + ')'));
      renderRepeatable(box, it.series, {
        nameOf: function (s) { return s.label || '(series)'; },
        subOf: function (s) { return (s.values || []).join(', '); },
        open: null,
        inlineEdit: function (s, wrap) {
          wrap.appendChild(textField('Series label', s.label || '', function (v) { s.label = v; touch(); }));
          wrap.appendChild(textField('Values (comma-separated numbers)', (s.values || []).join(', '), function (v) {
            s.values = v.split(',').map(function (x) { return parseFloat(x.trim()); }).filter(function (n) { return !isNaN(n); }); touch();
          }, 'One number per category label, in the same order.'));
        },
        addLabel: 'Add series',
        make: function () { return { label: 'Series ' + (it.series.length + 1), values: [] }; }
      });
      if (it.chartType === 'donut') box.appendChild(el('div', { class: 'note', text: 'Donut charts draw the first series only — category labels name the segments.' }));
      return;
    }
    // Before / after: draggable image comparison when two images are set,
    // plus optional Before / After text cards below.
    if (it.s === 'beforeafter') {
      box.appendChild(textField('Before label', it.beforeLabel || 'Before', function (v) { it.beforeLabel = v; touch(); }));
      box.appendChild(textField('After label', it.afterLabel || 'After', function (v) { it.afterLabel = v; touch(); }));
      box.appendChild(sectionLabel('Images (optional — enables the drag slider)'));
      box.appendChild(imageField('Before image', it.beforeImg || '', function (fn) { it.beforeImg = fn; touch(); }));
      box.appendChild(imageField('After image', it.afterImg || '', function (fn) { it.afterImg = fn; touch(); }));
      box.appendChild(sectionLabel('Text cards (optional)'));
      box.appendChild(textField('Before text', it.beforeText || '', function (v) { it.beforeText = v; touch(); }, 'One point per line works well.', true));
      box.appendChild(textField('After text', it.afterText || '', function (v) { it.afterText = v; touch(); }, 'One point per line works well.', true));
      box.appendChild(el('div', { class: 'note', text: 'With both images set, readers drag a handle to compare them. Text renders as two cards below the images.' }));
      return;
    }
    // Heading: a standalone section heading for pacing long pages.
    if (it.s === 'heading') {
      box.appendChild(textField('Heading text', it.text || '', function (v) { it.text = v; touch(); }));
      box.appendChild(textField('Eyebrow above heading (optional)', it.sub || '', function (v) { it.sub = v; touch(); }, 'Small caps label above the heading, e.g. "Part 3 · Opportunities".'));
      appendTextFormatFields(box, it);
      return;
    }
    // Body text: standalone prose block with weight/colour brand tokens.
    if (it.s === 'text') {
      box.appendChild(textField('Text', it.text || '', function (v) { it.text = v; touch(); },
        'Blank line = new paragraph. Wrap a phrase in **double asterisks** to make it bold.', true));
      box.appendChild(checkField('Lead paragraph style (first paragraph larger)', !!it.lead, function (v) { it.lead = v; touch(); }));
      appendTextFormatFields(box, it);
      return;
    }
    // Stat / KPI band: a strip of headline metrics.
    if (it.s === 'statband') {
      it.stats = it.stats || [];
      box.appendChild(sectionLabel('Stats (' + it.stats.length + ')'));
      renderRepeatable(box, it.stats, {
        nameOf: function (s) { return (s.value || '?') + (s.unit || '') + ' — ' + (s.label || '(stat)'); },
        subOf: function (s) { return s.sub || ''; },
        open: null,
        inlineEdit: function (s, wrap) {
          wrap.appendChild(textField('Value', s.value || '', function (v) { s.value = v; touch(); }, 'e.g. 96'));
          wrap.appendChild(textField('Unit (optional)', s.unit || '', function (v) { s.unit = v; touch(); }, 'e.g. %, h, rooms'));
          wrap.appendChild(textField('Label', s.label || '', function (v) { s.label = v; touch(); }, 'e.g. Audit completion'));
          wrap.appendChild(textField('Sub-line (optional)', s.sub || '', function (v) { s.sub = v; touch(); }));
          wrap.appendChild(textField('Delta text (optional)', s.delta || '', function (v) { s.delta = v; touch(); }, 'e.g. 4 pts vs last year'));
          wrap.appendChild(selectField('Delta direction', s.deltaDir || '', [
            { v: '', l: 'None' }, { v: 'up', l: 'Up (improvement)' }, { v: 'down', l: 'Down (reduction)' }
          ], function (v) { s.deltaDir = v; touch(); }));
        },
        addLabel: 'Add stat',
        make: function () { return { value: '', unit: '', label: 'New stat', sub: '', delta: '', deltaDir: '' }; }
      });
      return;
    }
    // Gauge / maturity meter: semicircular dial with a level scale.
    if (it.s === 'gauge') {
      box.appendChild(textField('Score', String(it.value == null ? '' : it.value), function (v) { it.value = parseFloat(v) || 0; touch(); }, 'e.g. 3.4'));
      box.appendChild(textField('Maximum', String(it.max == null ? 5 : it.max), function (v) { it.max = parseFloat(v) || 5; touch(); }, 'Scale maximum, e.g. 5'));
      box.appendChild(textField('Result label', it.levelLabel || '', function (v) { it.levelLabel = v; touch(); }, 'e.g. Level 3 — Established'));
      box.appendChild(textField('Caption (optional)', it.caption || '', function (v) { it.caption = v; touch(); }, 'e.g. Commercial maturity self-assessment'));
      it.levels = it.levels || [];
      box.appendChild(sectionLabel('Scale levels — low to high (' + it.levels.length + ')'));
      renderRepeatable(box, it.levels, {
        nameOf: function (l) { return (it.levels.indexOf(l) + 1) + ' · ' + (l || '(level)'); },
        subOf: function () { return ''; },
        open: null,
        inlineEdit: function (l, wrap) {
          var i = it.levels.indexOf(l);
          wrap.appendChild(textField('Level ' + (i + 1) + ' label', l || '', function (v) { it.levels[i] = v; touch(); }, 'e.g. Established — standards followed'));
        },
        addLabel: 'Add level',
        make: function () { return 'New level'; }
      });
      box.appendChild(el('div', { class: 'note', text: 'The needle is placed from Score ÷ Maximum. The level nearest the score is highlighted.' }));
      return;
    }
    // Hierarchy / pyramid: layered tiers building to an apex (top tier first).
    if (it.s === 'pyramid') {
      it.tiers = it.tiers || [];
      box.appendChild(sectionLabel('Tiers — apex first, foundation last (' + it.tiers.length + ')'));
      renderRepeatable(box, it.tiers, {
        nameOf: function (t) { return t.name || '(tier)'; },
        subOf: function (t) { return t.sub || ''; },
        open: null,
        inlineEdit: function (t, wrap) {
          wrap.appendChild(textField('Tier name', t.name || '', function (v) { t.name = v; touch(); }));
          wrap.appendChild(textField('Tier sub-line (optional)', t.sub || '', function (v) { t.sub = v; touch(); }));
          wrap.appendChild(textField('Side note (optional)', t.note || '', function (v) { t.note = v; touch(); }, 'Annotation shown beside the pyramid.', true));
        },
        addLabel: 'Add tier',
        make: function () { return { name: 'New tier', sub: '', note: '' }; }
      });
      box.appendChild(el('div', { class: 'note', text: 'The apex tier renders in gold; lower tiers step down through celadon shades.' }));
      return;
    }
    // Radial lifecycle wheel: tappable segments around a centre hub.
    if (it.s === 'wheel') {
      box.appendChild(textField('Hub eyebrow (optional)', it.hubEyebrow || '', function (v) { it.hubEyebrow = v; touch(); }, 'e.g. The colleague'));
      box.appendChild(textField('Hub title', it.hubTitle || '', function (v) { it.hubTitle = v; touch(); }, 'e.g. Lifecycle at Mandarin Oriental'));
      it.stages = it.stages || [];
      box.appendChild(sectionLabel('Stages (' + it.stages.length + ')'));
      renderRepeatable(box, it.stages, {
        nameOf: function (s) { return ('0' + (it.stages.indexOf(s) + 1)).slice(-2) + ' — ' + (s.label || '(stage)'); },
        subOf: function (s) { return (s.text || '').slice(0, 60); },
        open: null,
        inlineEdit: function (s, wrap) {
          wrap.appendChild(textField('Stage label', s.label || '', function (v) { s.label = v; touch(); }));
          wrap.appendChild(textField('Stage text', s.text || '', function (v) { s.text = v; touch(); }, 'Shown in the detail card when the segment is tapped.', true));
        },
        addLabel: 'Add stage',
        make: function () { return { label: 'New stage', text: '' }; }
      });
      box.appendChild(el('div', { class: 'note', text: 'Readers tap a segment to read that stage. Works best with 4–8 stages.' }));
      return;
    }
    if (it.s === 'table') {
      // Visual grid editor: one input per cell, header row toggle, and
      // add/remove row/column — no pipe-separated text syntax.
      if (it.headFirst === undefined) it.headFirst = !!(it.head && it.head.length);
      it.rows = it.rows || [];
      it.head = it.head || [];
      var colCount = it.head.length || 1;
      it.rows.forEach(function (r) { colCount = Math.max(colCount, Array.isArray(r) ? r.length : 1); });

      box.appendChild(checkField('First row is the header', !!it.headFirst, function (v) {
        it.headFirst = v;
        if (!v && it.head.length) { it.rows = [it.head].concat(it.rows); it.head = []; }
        if (v && !it.head.length && it.rows.length) { it.head = it.rows.shift(); }
        touch(); renderInspector();
      }));

      function cellInput(get, set, isHead) {
        var inp = el('input', { type: 'text', value: get(),
          style: 'width:100%;border:0;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:8px 9px;font-size:12.5px;outline:none;box-sizing:border-box;' +
            (isHead ? 'background:#262220;color:#fff;font-weight:600;letter-spacing:.04em;' : 'background:#fff;') });
        inp.addEventListener('input', function () { set(inp.value); touch(); });
        return inp;
      }
      var wrapG = el('div', { style: 'border:1px solid var(--line);border-radius:4px;overflow:hidden;margin-top:8px;' });
      var grid = el('div', { style: 'display:grid;grid-template-columns:repeat(' + colCount + ',minmax(0,1fr));' });
      if (it.headFirst) {
        for (var hc = 0; hc < colCount; hc++) {
          (function (ci) { grid.appendChild(cellInput(function () { return it.head[ci] || ''; }, function (v) { it.head[ci] = v; }, true)); })(hc);
        }
      }
      it.rows.forEach(function (row, ri) {
        row = Array.isArray(row) ? row : [row];
        it.rows[ri] = row;
        while (row.length < colCount) row.push('');
        for (var cc = 0; cc < colCount; cc++) {
          (function (ci) { grid.appendChild(cellInput(function () { return row[ci]; }, function (v) { row[ci] = v; }, false)); })(cc);
        }
      });
      wrapG.appendChild(grid);
      box.appendChild(wrapG);
      box.appendChild(el('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;' }, [
        el('button', { class: 'btn ghost', onclick: function () { it.rows.push(new Array(colCount).fill('')); touch(); renderInspector(); } }, ['＋ Row']),
        el('button', { class: 'btn ghost', onclick: function () {
          if (it.headFirst) it.head.push('');
          it.rows.forEach(function (r) { r.push(''); });
          touch(); renderInspector();
        } }, ['＋ Column']),
        el('button', { class: 'btn ghost', onclick: function () { if (it.rows.length) { it.rows.pop(); touch(); renderInspector(); } } }, ['− Last row']),
        el('button', { class: 'btn ghost', onclick: function () {
          if (colCount <= 1) return;
          if (it.headFirst && it.head.length) it.head.pop();
          it.rows.forEach(function (r) { r.pop(); });
          touch(); renderInspector();
        } }, ['− Last column'])
      ]));
      return;
    }
    if (it.s === 'callout') {
      box.appendChild(textField('Label', it.label || '', function (v) { it.label = v; it.name = v; touch(); }, 'Small caps line, e.g. INSTRUCTION or CONTROL 1.'));
      box.appendChild(textField('Text', it.text || '', function (v) { it.text = v; touch(); }, '', true));
      box.appendChild(selectField('Tone', ['note', 'recap', 'warning', 'tip'].indexOf(it.tone) !== -1 ? it.tone : 'note', [
        { v: 'tip', l: 'Knowledge tip (warm beige)' },
        { v: 'recap', l: 'Quick recap (celadon green)' },
        { v: 'note', l: 'Note (warm neutral, gold bar)' },
        { v: 'warning', l: 'Warning (red — controls and constraints)' }
      ], function (v) { it.tone = v; touch(); }));
      return;
    }
    box.appendChild(textField('Description', it.blurb || '', function (v) { it.blurb = v; touch(); }, '', true));
    box.appendChild(linkField('Link (URL)', it.url || '', function (v) { it.url = v; touch(); }));
    box.appendChild(checkField('Show the resource link in the expanded panel', !it.hideLink, function (v) {
      it.hideLink = !v; touch();
    }));
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
          // progress events are 0..1 when ffmpeg can read the duration; for
          // some inputs they arrive as raw timestamps — clamp and ignore junk
          var r = p && typeof p.progress === 'number' && isFinite(p.progress) ? p.progress : 0;
          if (r < 0 || r > 1) return;
          if (r > ratio) {
            ratio = r;
            onProgress(0.05 + ratio * 0.85, 'Compressing video… ' + Math.round(ratio * 100) + '%');
          }
        });
      } catch (e) { /* progress is best-effort */ }
      // Keep the source extension so ffmpeg probes the right demuxer.
      var ext = (/\.[a-z0-9]+$/i.exec(file.name || '') || ['.mp4'])[0].toLowerCase();
      var inName = 'input' + ext;
      function runPass(args, label, ms) {
        return withTimeout(ffmpeg.exec(args), ms, label).then(function () {
          return ffmpeg.readFile('output.mp4');
        }).then(function (data) {
          try { ffmpeg.deleteFile('output.mp4'); } catch (e) {}
          if (!data || !data.length) throw new Error('compression produced no output');
          return new Blob([data], { type: 'video/mp4' });
        });
      }
      return window.FFmpegUtil.fetchFile(file).then(function (buf) {
        return ffmpeg.writeFile(inName, buf);
      }).then(function () {
        // Pass 1: 720p CRF 26. On timeout / wasm errors (large sources can
        // exhaust wasm32 memory), retry once with a lighter, faster pass.
        return runPass(['-i', inName, '-vf', 'scale=-2:720', '-c:v', 'libx264',
          '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '96k',
          '-movflags', '+faststart', 'output.mp4'], 'Compressing the video', 10 * 60 * 1000)
          .catch(function (err) {
            onProgress(0.3, 'First pass struggled — retrying with lighter settings…');
            return runPass(['-i', inName, '-vf', 'scale=-2:540', '-c:v', 'libx264',
              '-preset', 'ultrafast', '-crf', '30', '-c:a', 'aac', '-b:a', '80k',
              '-movflags', '+faststart', 'output.mp4'], 'Compressing the video (lighter pass)', 10 * 60 * 1000)
              .catch(function () { throw err; });
          });
      }).then(function (blob) {
        try { ffmpeg.deleteFile(inName); } catch (e) {}
        onProgress(1, 'Compression complete');
        return { blob: blob, compressed: true, originalSize: file.size };
      });
    }).then(function (r) {
      if (r.blob.size > HARD_LIMIT) {
        throw new Error('"' + file.name + '" is ' + Math.round(r.blob.size / 1048576) + 'MB even after compression — the cloud limit is 50MB. Please split it or compress it further (HandBrake, 720p).');
      }
      return r;
    }, function (err) {
      var msg = err && err.message ? err.message : String(err);
      if (/memory|out of bounds|unreachable|RuntimeError/i.test(msg)) {
        throw new Error('"' + file.name + '" is too large to compress in the browser. Please compress it in HandBrake (720p MP4) and upload the smaller file.');
      }
      throw err;
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

    // ---- Languages (multilingual, Phase 1) --------------------------------
    box.appendChild(sectionLabel('Languages (multilingual)'));
    box.appendChild(el('p', { class: 'hint', style: 'margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b665d;' },
      ['English stays the source. Add a language, download the English source JSON, translate the text values (keep ids, keys and asset paths unchanged), then upload the translated JSON. Publishing writes it as playbook-data.<code>.json next to the main content; readers pick a language on the opening screen. Anything left untranslated falls back to English.']));
    var langs = declaredLangs();
    PB.i18n = PB.i18n || {};
    langs.forEach(function (l) {
      var has = PB.i18n[l.code];
      var count = 0;
      if (has) { try { count = Object.keys(has).length; } catch (e) {} }
      var row = el('div', { class: 'field', style: 'border:1px solid #e2ded4;border-radius:4px;padding:10px 12px;margin-bottom:8px;background:#fbfaf7;' }, [
        el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;' }, [
          el('b', { text: l.label + '  ', style: 'font-weight:600;font-size:13px;' }),
          el('span', { class: 'hint', text: has ? 'translation loaded' : 'no translation yet', style: has ? 'color:#5C7062;font-size:11.5px;' : 'color:#a89f92;font-size:11.5px;' })
        ]),
        el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;' }, [
          el('button', { class: 'btn', onclick: function () {
            var src = JSON.parse(JSON.stringify(PB));
            delete src.i18n;
            src.assets = {};
            delete src.__remoteAssetBase;
            STORE.exportFile(src, safeName(PB.meta.title || 'playbook').toLowerCase() + '.english-source.json');
          } }, ['Download English source']),
          el('button', { class: 'btn', onclick: function () {
            var inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.json,application/json';
            inp.onchange = function () {
              var f = inp.files && inp.files[0];
              if (!f) return;
              var r = new FileReader();
              r.onload = function () {
                try {
                  var obj = JSON.parse(r.result);
                  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not an object');
                  PB.i18n[l.code] = obj;
                  touch();
                  toast('Translation loaded for ' + l.label + '. Use the preview language toggle to check it, then Save.', 'ok');
                  renderInspector();
                } catch (e) { toast('That file is not a valid translation JSON.', 'err'); }
              };
              r.readAsText(f);
            };
            inp.click();
          } }, ['Upload translation JSON…']),
          has ? el('button', { class: 'btn', onclick: function () {
            STORE.exportFile(PB.i18n[l.code], safeName(PB.meta.title || 'playbook').toLowerCase() + '.' + l.code + '.json');
          } }, ['Download translation']) : null,
          el('button', { class: 'btn danger', onclick: function () {
            if (!window.confirm('Remove ' + l.label + ' from this playbook? The loaded translation is discarded. (A published playbook-data.' + l.code + '.json already on the server is not deleted.)')) return;
            PB.meta.languages = PB.meta.languages.filter(function (x) { return x.code !== l.code; });
            delete PB.i18n[l.code];
            if (PREVIEW_LANG === l.code) PREVIEW_LANG = 'en';
            touch(); syncPreviewLangSelect(); renderInspector();
          } }, ['Remove'])
        ].filter(Boolean))
      ]);
      box.appendChild(row);
    });
    var remaining = LANG_CHOICES.filter(function (c) {
      return !langs.some(function (l) { return l.code === c.code; });
    });
    if (remaining.length) {
      box.appendChild(selectField('Add a language', '', [{ v: '', l: '— choose —' }].concat(remaining.map(function (c) { return { v: c.code, l: c.label }; })), function (v) {
        if (!v) return;
        var choice = LANG_CHOICES.filter(function (c) { return c.code === v; })[0];
        declaredLangs().push({ code: choice.code, label: choice.label });
        touch(); syncPreviewLangSelect(); pushPreview(true); renderInspector();
      }, 'Readers will be able to pick this language on the opening screen once a translation is uploaded and published.'));
    }

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

    // ---- Local backup & recovery ------------------------------------------
    // Two extra safety nets beyond the single latest autosnapshot:
    //  1. a ring of earlier snapshots kept in this browser (restore any one)
    //  2. an optional real backup file on disk (survives a browser-data wipe)
    box.appendChild(sectionLabel('Local backup & recovery'));

    var backupRow = el('div', { class: 'field' });
    backupRow.appendChild(el('label', {}, ['Backup file on disk']));
    var backupStatus = el('div', { class: 'tip' }, [
      backupHandle
        ? (backupFileName + (backupLastWrite ? ' · last written ' + new Date(backupLastWrite).toLocaleTimeString() : ''))
        : 'Not set — every save and every 90s rewrites this file silently once chosen (Chrome / Edge only).'
    ]);
    backupRow.appendChild(backupStatus);
    var backupBtns = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;' });
    if (window.showSaveFilePicker) {
      backupBtns.appendChild(el('button', { class: 'btn', onclick: function () {
        var suggested = (PB.meta.slug || 'playbook') + '-backup.json';
        window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: 'Playbook backup', accept: { 'application/json': ['.json'] } }]
        }).then(function (h) {
          return STORE.saveBackupHandle(h).then(function () {
            backupHandle = h; backupFileName = h.name || suggested;
            return writeBackupFile();
          });
        }).then(function (ok) {
          if (ok) toast('Backup file set — it will be rewritten on every save.', 'ok');
          renderInspector();
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          toast('Could not set the backup file: ' + ((e && e.message) || e), 'err');
        });
      } }, [backupHandle ? 'Change backup file…' : 'Choose backup file…']));
    }
    if (backupHandle) {
      if (backupNeedsGesture) {
        backupBtns.appendChild(el('button', { class: 'btn primary', onclick: function () {
          backupHandle.requestPermission({ mode: 'readwrite' }).then(function (p) {
            if (p === 'granted') { backupNeedsGesture = false; writeBackupFile(); toast('Backup re-enabled.', 'ok'); }
            renderInspector();
          });
        } }, ['Re-enable backup (needs permission)']));
      }
      backupBtns.appendChild(el('button', { class: 'btn danger', onclick: function () {
        if (!window.confirm('Stop backing up to ' + backupFileName + '? The existing file is left untouched.')) return;
        STORE.clearBackupHandle();
        backupHandle = null; backupFileName = ''; backupNeedsGesture = false; backupLastWrite = 0;
        renderInspector();
      } }, ['Remove']));
    }
    backupRow.appendChild(backupBtns);
    box.appendChild(backupRow);

    box.appendChild(el('div', { class: 'section-label', style: 'margin-top:12px;', text: 'Earlier autosaves (this browser)' }));
    var snapBox = el('div', { class: 'field' });
    snapBox.appendChild(el('div', { class: 'tip' }, ['Loading…']));
    box.appendChild(snapBox);
    STORE.listSnapshots().then(function (snaps) {
      snapBox.innerHTML = '';
      if (!snaps.length) {
        snapBox.appendChild(el('div', { class: 'tip' }, ['No earlier snapshots yet — they accumulate automatically as you work (one every 30s, up to 5 kept).']));
        return;
      }
      snapBox.appendChild(el('div', { class: 'tip' }, ['Up to 5 earlier snapshots, newest last. Restoring replaces the current playbook — Save to cloud first if unsure.']));
      snaps.slice().reverse().forEach(function (snap) {
        var row = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:6px;' });
        row.appendChild(el('div', { style: 'flex:1;font-size:12px;color:var(--ink-3);' }, [
          new Date(snap.at).toLocaleString()
        ]));
        row.appendChild(el('button', { class: 'btn', style: 'font-size:11px;padding:4px 10px;', onclick: function () {
          if (!window.confirm('Restore the snapshot from ' + new Date(snap.at).toLocaleString() + '? This replaces the current playbook content.')) return;
          setPlaybook(JSON.parse(JSON.stringify(snap.playbook)));
          touch();
          toast('Snapshot restored. Press Save to make it the cloud version.', 'ok');
          renderInspector();
        } }, ['Restore']));
        snapBox.appendChild(row);
      });
    });

    // ---- Cloud version history --------------------------------------------
    // Every cloud save (manual Save, 45s autosave, Publish) leaves a
    // timestamped snapshot on the server — newest 30 kept. This is the real
    // recovery path when the wrong version was loaded or content was lost.
    box.appendChild(sectionLabel('Version history (cloud)'));
    var verBox = el('div', { class: 'field' });
    verBox.appendChild(el('div', { class: 'tip' }, ['Loading…']));
    box.appendChild(verBox);
    if (!(window.PlaybookPublish && window.PlaybookPublish.listVersions)) {
      verBox.innerHTML = '';
      verBox.appendChild(el('div', { class: 'tip' }, ['Version history is not available in this build.']));
    } else {
      var verSlug = window.PlaybookPublish.slugFor(PB);
      window.PlaybookPublish.listVersions(verSlug).then(function (versions) {
        verBox.innerHTML = '';
        if (!versions.length) {
          verBox.appendChild(el('div', { class: 'tip' }, ['No cloud versions yet — every Save, autosave and Publish will leave a timestamped copy here (30 kept).']));
          return;
        }
        verBox.appendChild(el('div', { class: 'tip' }, ['Every cloud save keeps a timestamped copy (newest 30). Restoring loads that copy into the editor — press Save to make it the current draft.']));
        versions.slice().reverse().forEach(function (v) {
          var row = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-top:6px;' });
          var label = new Date(v.at).toLocaleString() +
            (v.stage === 'published' ? ' · published' : (v.autosave ? ' · autosave' : ' · draft')) +
            (v.by ? ' · ' + v.by : '');
          row.appendChild(el('div', { style: 'flex:1;font-size:12px;color:var(--ink-3);' }, [label]));
          row.appendChild(el('button', { class: 'btn', style: 'font-size:11px;padding:4px 10px;', onclick: function () {
            if (!window.confirm('Restore the cloud version from ' + new Date(v.at).toLocaleString() + '? This replaces the current playbook content. Press Save afterwards to make it the current draft.')) return;
            busy(true, 'Restoring version…');
            fetch(window.PlaybookPublish.versionUrl(verSlug, v.file) + '?t=' + Date.now())
              .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
              .then(function (pb) {
                pb.meta = pb.meta || {};
                if (!pb.meta.slug) pb.meta.slug = verSlug;
                setPlaybook(pb);
                touch();
                busy(false);
                toast('Version restored. Press Save to make it the current cloud draft.', 'ok');
                renderInspector();
              })
              .catch(function (e) {
                busy(false);
                toast('Could not restore that version: ' + ((e && e.message) || e), 'err');
              });
          } }, ['Restore']));
          verBox.appendChild(row);
        });
      });
    }

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
    var pvLang = $('#pvLang');
    if (pvLang) pvLang.addEventListener('change', function () {
      PREVIEW_LANG = pvLang.value || 'en';
      pushPreview(true);
    });
    syncPreviewLangSelect();
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
    STORE.save(PB).then(function (saveRes) {
      markSaved(); STORE.clearAutosnapshot();
      if (saveRes && saveRes.persisted === false) {
        toast('This browser refused to store the local copy (storage full or blocked) — the cloud save below still runs; Export a .json as a backup too.', 'err');
      }
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
            lastAssetSig = assetSig();
            cloudDirty = false;
            noteSaved(session.user && session.user.email, Date.now());
            writeBackupFile();
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
        // X.Y.Z sub-sections get their own depth-3 outline entry (and page
        // block) under the topic — not folded into the topic's sections.
        var host = curPart;
        var sub3 = { id: uid('sub'), label: s.title || 'Sub-section', depth: 3 };
        if (host) {
          host.subs.push(sub3);
          PB.sectionBodies[sub3.id] = makeBody(s, first);
          lastId = host.id; first = false;
          return;
        }
        // no active part (shouldn't happen — topics set it) — fall through
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
  var cloudDirty = false, lastAssetSig = '';
  function markDirty() { dirty = true; cloudDirty = true; setAutosave('dirty', 'Editing…'); }
  function assetSig() { return Object.keys(PB.assets || {}).sort().join('|'); }
  function markSaved() { dirty = false; setAutosave('saved', 'All changes saved'); }
  function setAutosave(cls, txt) {
    var a = $('#autosave'); a.className = 'autosave ' + cls; $('.txt', a).textContent = txt;
  }
  var autosaveTimer = null;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      STORE.saveAutosnapshot(PB).then(function () {
        setAutosave('saved', 'Autosaved');
        dirty = false;
      }).catch(function () {
        // IndexedDB quota/blocked — the worst silent-failure mode. Tell the
        // author plainly instead of letting "Autosaved" lie.
        setAutosave('dirty', 'Browser storage is full or blocked — press Save (cloud) or Export to keep your work.');
        toast('This browser could not store the autosnapshot (storage full or blocked). Press Save to sync to the cloud, or Export a .json copy.', 'err');
      });
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
  // ---- "Last saved by" chip ------------------------------------------------
  // Always-visible attribution for the most recent CLOUD save of this
  // playbook — newest save wins, whoever made it. Fed by every path that
  // loads or writes a cloud copy: lane loads, manual Save, cloud autosave,
  // Publish, and version restore.
  var lastSavedInfo = null; // { by: string|null, at: number(ms)|null }
  function noteSaved(by, at) {
    lastSavedInfo = { by: by || null, at: at || Date.now() };
    renderSavedByChip();
  }
  function relTime(ms) {
    var s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (s < 45) return 'just now';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d < 7) return d + 'd ago';
    return new Date(ms).toLocaleDateString();
  }
  function renderSavedByChip() {
    var chip = $('#savedByChip');
    if (!chip) return;
    if (!lastSavedInfo || !lastSavedInfo.at) { chip.style.display = 'none'; return; }
    chip.style.display = '';
    var who = lastSavedInfo.by || 'a teammate';
    chip.textContent = 'Last saved by ' + who + ' · ' + relTime(lastSavedInfo.at);
    chip.title = 'Most recent cloud save: ' + who + ' · ' + new Date(lastSavedInfo.at).toLocaleString() +
      ' — the newest save always loads, whoever made it.';
  }
  setInterval(function () { if (lastSavedInfo) renderSavedByChip(); }, 60000);

  var _authSession = null;
  function renderAuthChip() {
    var chip = $('#authChip');
    if (!chip) return;
    chip.innerHTML = '';
    if (_authSession && _authSession.user) {
      chip.className = 'auth-chip on';
      chip.appendChild(el('span', {}, ['Signed in · ']));
      chip.appendChild(el('span', { class: 'who', text: _authSession.user.email }));
      chip.appendChild(el('button', { class: 'linklike', onclick: function () {
        window.PlaybookPublish.signOut().then(function () { _authSession = null; renderAuthChip(); toast('Signed out', 'ok'); });
      } }, ['Sign out']));
    } else {
      // Signed-out state stays VISIBLE (muted) — and is itself the way back
      // in: click it to open the sign-in dialog. An author should never have
      // to hunt through Publish to understand why saves stay local.
      chip.className = 'auth-chip off actionable';
      chip.title = 'Click to sign in so your saves sync to the cloud';
      chip.appendChild(el('span', { text: 'Not signed in — saves stay in this browser' }));
      chip.appendChild(el('button', { class: 'linklike', onclick: function () {
        openLoginModal(function (s) { _authSession = s; renderAuthChip(); toast('Signed in — your saves will now sync to the cloud.', 'ok'); },
          'Sign in to sync your saves');
      } }, ['Sign in']));
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

  function openLoginModal(onSignedIn, title) {
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

    showModal(title || 'Sign in to publish', body, [
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
      noteSaved(result.publishedBy || (session && session.user && session.user.email), Date.now());
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
      // Deliberately no noteSaved() here: restoring loads an OLD copy into
      // the editor — the cloud's most recent save (what the chip reports)
      // is unchanged until the author presses Save.
      toast('Version restored into the editor — press Save to make it the current cloud version', 'ok');
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
