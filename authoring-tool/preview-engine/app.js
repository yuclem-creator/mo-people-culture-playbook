/* =================================================================
   MANDARIN ORIENTAL — P&C PLAYBOOK · MAGAZINE V2 · DATA-DRIVEN
   All chapter content verbatim from the May 2026 source document.
   ----------------------------------------------------------------
   DATA-DRIVEN REFACTOR: every editable value is read from a single
   global window.PLAYBOOK object. Structured lists (chapters, lifecycle,
   journey, people, beliefs, policy sections/items) live under PLAYBOOK.*;
   one-off prose strings inside the fixed magazine templates are read via
   the T(key, fallback) helper from PLAYBOOK.prose[key]. When PLAYBOOK is
   absent (legacy standalone use) or a key is missing, the verbatim
   fallback is used, so output is byte-identical to the original renderer.
   The visual FORM of every set-piece is fixed in code; only CONTENT edits.
   ================================================================= */

// ---- PLAYBOOK bootstrap -------------------------------------------
// A single source of truth. In the authoring tool the editor mutates
// window.PLAYBOOK live and re-renders. In the exported SCORM package a
// generated playbook-data.js sets window.PLAYBOOK before this file runs.
var PB = (typeof window !== 'undefined' && window.PLAYBOOK) ? window.PLAYBOOK : null;
if (!PB) { PB = {}; if (typeof window !== 'undefined') window.PLAYBOOK = PB; }
PB.prose = PB.prose || {};

// Editable-prose accessor. Returns PLAYBOOK.prose[key] if set, else the
// verbatim fallback (and records the fallback so the editor/exporter can
// harvest a complete default set). Preserves byte-identical output.
function T(key, fallback) {
  if (PB.prose[key] === undefined || PB.prose[key] === null) {
    if (PB.__harvest) PB.prose[key] = fallback;
    return fallback;
  }
  return PB.prose[key];
}

// ---- CHAPTER DEFINITIONS ------------------------------------------
// Order & numerals follow the source TOC. Sourced from PLAYBOOK.chapters
// when present, else the verbatim default below.
const CHAPTERS_DEFAULT = [
  { id: 'cover',    numeral: '',    label: 'Cover',                                      icon: '·'  },
  { id: 'intro',    numeral: '',    label: 'A Message to Colleagues',                    opener: 'cpo_portrait.jpg',  isVideo: true },
  { id: 'ch-1',     numeral: 'I',   label: 'Introduction',                               opener: 'opener_intro.jpg'   },
  { id: 'ch-2',     numeral: 'II',  label: 'About Mandarin Oriental',                    opener: 'opener_about.jpg'   },
  { id: 'ch-3',     numeral: 'III', label: 'Leading Through the Colleague Lifecycle',    opener: 'opener_lifecycle.jpg', hasSubs: true },
  { id: 'ch-4',     numeral: 'IV',  label: 'Pre-Opening Hotels',                         opener: 'opener_preopen.jpg' },
  { id: 'ch-5',     numeral: 'V',   label: 'P&C Audit',                                  opener: 'opener_audit.jpg'   },
  { id: 'ch-6',     numeral: 'VI',  label: 'Staying Connected & Supported',              opener: 'opener_support.jpg' }
];
let CHAPTERS;

// Sub-chapters for Chapter III (Colleague Lifecycle)
const LIFECYCLE_DEFAULT = [
  { id: 'sub-A', letter: 'A', label: 'Leading with Integrity',      img: 'ch_A_integrity.jpg',
    lede: 'Ethical Conduct and Fair Employment set the foundation for how we lead, hire, and treat every Colleague.' },
  { id: 'sub-B', letter: 'B', label: 'Attracting & Hiring',         img: 'ch_B_attracting.jpg',
    lede: 'Our recruitment philosophy — from talent acquisition strategy to selection and offer management.' },
  { id: 'sub-C', letter: 'C', label: 'Onboarding',                  img: 'ch_C_onboarding.jpg',
    lede: 'Welcoming new Colleagues into the MO family through structured induction and early performance care.' },
  { id: 'sub-D', letter: 'D', label: 'People & Culture Operations', img: 'ch_D_operations.jpg',
    lede: 'The day-to-day systems, records, payroll, benefits, and analytics that keep P&C running.' },
  { id: 'sub-E', letter: 'E', label: 'Colleague Experience',        img: 'ch_E_experience.jpg',
    lede: 'Engagement, recognition, wellbeing, and voice — the fabric of daily life at Mandarin Oriental.' },
  { id: 'sub-F', letter: 'F', label: 'Rewarding Great People',      img: 'ch_F_rewarding.jpg',
    lede: 'Compensation, benefits, and mobility — how we recognise contribution and support growth.' },
  { id: 'sub-G', letter: 'G', label: 'Developing & Growing',        img: 'ch_G_developing.jpg',
    lede: 'Performance management, learning, and career development — investing in every Colleague\u2019s craft.' },
  { id: 'sub-H', letter: 'H', label: 'Leaving with Connection',     img: 'ch_H_leaving.jpg',
    lede: 'Offboarding with dignity, and staying connected through the Forever Fans alumni community.' }
];
let LIFECYCLE;

// Colleague Journey — how the Colleague Experience maps to the lifecycle,
// and how People & Culture delivers it at each stage. Stage words are drawn
// verbatim from the source ("attract, welcome, grow, care for, and stay
// connected"); the P&C role notes are grounded in the source lifecycle ledes.
const JOURNEY_DEFAULT = [
  { stage: 'Attract',  img: 'journey_attract.jpg', icon: 'sub-B', pos: '34% 32%',
    role: 'People &amp; Culture shapes our recruitment philosophy — from talent acquisition strategy to selection and offer management — so the right people find their place with us.' },
  { stage: 'Welcome',  img: 'journey_welcome.jpg', icon: 'sub-C', pos: 'center 38%',
    role: 'P&amp;C welcomes new Colleagues into the MO family through structured induction and early performance care.' },
  { stage: 'Grow',     img: 'journey_grow.jpg', icon: 'sub-G', pos: 'center 40%',
    role: 'Through performance management, learning, and career development, P&amp;C invests in every Colleague’s craft.' },
  { stage: 'Care for', img: 'journey_carefor.jpg', icon: 'sub-E', pos: 'center 38%',
    role: 'P&amp;C nurtures engagement, recognition, wellbeing, and voice — the fabric of daily life at Mandarin Oriental.' },
  { stage: 'Stay connected', img: 'journey_stay.jpg', icon: 'sub-H', pos: 'center 30%',
    role: 'Even as Colleagues move on, P&amp;C offboards with dignity and keeps them close through the Forever Fans alumni community.' }
];
let JOURNEY;

// Senior Management (verbatim)
const SENIOR_MGMT_DEFAULT = [
  { name: 'Laurent Kleitman',      role: 'Group Chief Executive',              img: 'sm_laurent.jpg' },
  { name: 'Amanda Hyndman',        role: 'Chief Operating Officer',            img: 'sm_amanda.jpg' },
  { name: 'ShaoWei Ong',           role: 'Chief People & Culture Officer',     img: 'sm_shaowei.jpg' },
  { name: 'Matthew Bishop',        role: 'Chief Financial Officer',            img: 'sm_matthew.jpg' },
  { name: 'Kieren Barry',          role: 'Group Counsel',                      img: 'sm_kieren.jpg' },
  { name: 'Francesco Cefalu',      role: 'Chief Development Officer',          img: 'sm_francesco.jpg' },
  { name: 'Vincent Marot',         role: 'Chief Technical Services Officer',   img: 'sm_vincent.jpg' },
  { name: 'Raphael Bick',          role: 'Chief Information Officer',          img: 'sm_raphael.jpg' },
  { name: 'Kristin Ruble',         role: 'Chief Commercial Officer',           img: 'sm_kristin.jpg' },
  { name: 'Alex Schellenberger',   role: 'Chief Brand & Marketing Officer',    img: 'sm_alex.jpg' }
];
let SENIOR_MGMT;

// Vice President & Regional P&C Leaders (verbatim)
const PC_LEADERS_DEFAULT = [
  { name: 'Koray Genckul',   role: 'Group Vice-President · P&C Operations', img: 'vp_koray.jpg' },
  { name: 'Nicoleta Cucos',  role: 'Regional Director · Middle East',       img: 'vp_nicoleta.jpg' },
  { name: 'Robin Vermeire',  role: 'Regional Director · Europe',            img: 'vp_robin.jpg' },
  { name: 'Laura Wilson',    role: 'Regional Director · Asia Pacific',       img: 'vp_laura.jpg' }
];
let PC_LEADERS;

/* =================================================================
   ELEGANT LINE ICONS — thin-stroke, MO style
   ================================================================= */
function icon(paths, cls = '') {
  return `<svg class="line-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

const ICONS = {
  // Lifecycle stages
  'sub-A': icon('<path d="M12 4v16"/><path d="M8.5 20h7"/><path d="M4.5 7h15"/><path d="M6.5 7l-2.8 5.5a3.1 3.1 0 0 0 5.6 0L6.5 7z"/><path d="M17.5 7l-2.8 5.5a3.1 3.1 0 0 0 5.6 0L17.5 7z"/><circle cx="12" cy="3.4" r="0.9"/>'),
  'sub-B': icon('<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5"/><path d="M15.5 15.5l2.3-2.3"/><path d="M18.2 18.2l2.3-2.3"/>'),
  'sub-C': icon('<path d="M5.5 21V5a1.8 1.8 0 0 1 1.8-1.8h9.4A1.8 1.8 0 0 1 18.5 5v16"/><path d="M3 21h18"/><path d="M13.5 3.2V21"/><circle cx="11" cy="12" r="0.7"/>'),
  'sub-D': icon('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
  'sub-E': icon('<path d="M12 20.2S4.8 15.5 3.1 11a5 5 0 0 1 8.9-4.3A5 5 0 0 1 20.9 11c-1.7 4.5-8.9 9.2-8.9 9.2z"/>'),
  'sub-F': icon('<path d="M12 3.2l2.6 5.4 6 .8-4.4 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.4 9.4l6-.8L12 3.2z"/>'),
  'sub-G': icon('<path d="M12 21v-8"/><path d="M12 13c0-4.2 3.1-7.2 8-7.2 0 4.2-3.1 7.2-8 7.2z"/><path d="M12 13c0-3.2-2.4-5.4-6-5.4 0 3.2 2.4 5.4 6 5.4z"/>'),
  'sub-H': icon('<circle cx="9" cy="12" r="4.8"/><circle cx="15" cy="12" r="4.8"/>'),
  // Chapters
  'ch-1': icon('<path d="M12 6.2C10 4.8 7.2 4.2 3.5 4.2v13.9c3.7 0 6.5.6 8.5 2 2-1.4 4.8-2 8.5-2V4.2c-3.7 0-6.5.6-8.5 2z"/><path d="M12 6.2v13.9"/>'),
  'ch-2': icon('<path d="M12 20V4.5"/><path d="M12 20L5.3 8"/><path d="M12 20L18.7 8"/><path d="M5.3 8a13.2 13.2 0 0 1 13.4 0"/>'),
  'ch-3': icon('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3.5V8h-4.5"/>'),
  'ch-4': icon('<path d="M4.5 21V8.5L12 3.5l7.5 5V21"/><path d="M2.5 21h19"/><path d="M10 21v-5h4v5"/>'),
  'ch-5': icon('<rect x="5" y="3.5" width="14" height="17.5" rx="1.2"/><path d="M8.5 9l1.7 1.7 3.3-3.3"/><path d="M8.5 14.5h7"/><path d="M8.5 17.5h4.5"/>'),
  'ch-6': icon('<circle cx="12" cy="18" r="0.9"/><path d="M8.4 14.4a5.1 5.1 0 0 1 7.2 0"/><path d="M5.4 11.4a9.3 9.3 0 0 1 13.2 0"/>')
};

// Short descriptions for the visual contents menu
const MENU_DESC_DEFAULT = {
  'intro': 'A short welcome film introducing our People & Culture Playbook.',
  'ch-1': 'Our purpose, who this Playbook is for, and how to use it.',
  'ch-2': 'Our heritage, our global presence, and the leadership that guides us.',
  'ch-3': 'The eight stages of the Colleague journey — from integrity to lasting connection.',
  'ch-4': 'How People & Culture brings a new hotel to life, from planning to opening day.',
  'ch-5': 'How we measure and uphold the standards of People & Culture across the Group.',
  'ch-6': 'The networks, tools, and communities that keep every Colleague supported.'
};
let MENU_DESC;

// Policy chip symbols — thin-stroke line icons
const SYM = {
  policy: icon('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5"/>'),
  guide:  icon('<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.8l-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9z"/>'),
  kit:    icon('<rect x="4" y="7.5" width="16" height="12" rx="1.5"/><path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7"/><path d="M4 12.5h16"/>'),
  xref:   icon('<path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v16H8a1.5 1.5 0 0 1-1.5-1.5v-16z"/><path d="M6.5 17.5H19"/><path d="M10 8h6"/>'),
  // link / external-resource glyph
  link:   icon('<path d="M9.5 14.5l5-5"/><path d="M8 11l-2.2 2.2a3.1 3.1 0 0 0 4.4 4.4L12 16"/><path d="M16 13l2.2-2.2a3.1 3.1 0 0 0-4.4-4.4L12 8"/>'),
  // chevron for accordion toggles
  chevron: icon('<path d="M6 9l6 6 6-6"/>')
};

// Elegant line icons for the "How to Use" step sequence
const STEP_ICONS = {
  purpose: icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="0.6"/>'),
  scope:   icon('<path d="M9 4.5h6l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z"/><path d="M15 4.5v4h4"/><circle cx="11" cy="14" r="2.4"/><path d="M12.7 15.7L15 18"/>'),
  local:   icon('<circle cx="12" cy="11" r="7.2"/><path d="M4.8 11h14.4"/><path d="M12 3.8c2.4 2 3.6 4.6 3.6 7.2s-1.2 5.2-3.6 7.2c-2.4-2-3.6-4.6-3.6-7.2S9.6 5.8 12 3.8z"/>')
};

// Elegant line icons for numbered content sections (Chapters III–VI).
// Keyword-matched from the section title so every section carries a
// meaningful, on-brand mark in its header.
const SECTION_ICONS = {
  ethics:      icon('<path d="M12 4v16"/><path d="M8.5 20h7"/><path d="M4.5 7h15"/><path d="M6.5 7l-2.8 5.5a3.1 3.1 0 0 0 5.6 0L6.5 7z"/><path d="M17.5 7l-2.8 5.5a3.1 3.1 0 0 0 5.6 0L17.5 7z"/>'),
  fair:        icon('<circle cx="12" cy="12" r="8.5"/><path d="M8 12l2.6 2.6L16 9"/>'),
  strategy:    icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="0.6"/>'),
  hiring:      icon('<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5"/><path d="M15.5 15.5l2.3-2.3"/>'),
  contract:    icon('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5"/>'),
  welcome:     icon('<path d="M5.5 21V5a1.8 1.8 0 0 1 1.8-1.8h9.4A1.8 1.8 0 0 1 18.5 5v16"/><path d="M3 21h18"/><path d="M13.5 3.2V21"/>'),
  operations:  icon('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
  wellbeing:   icon('<path d="M12 20.2S4.8 15.5 3.1 11a5 5 0 0 1 8.9-4.3A5 5 0 0 1 20.9 11c-1.7 4.5-8.9 9.2-8.9 9.2z"/>'),
  reward:      icon('<path d="M12 3.2l2.6 5.4 6 .8-4.4 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.4 9.4l6-.8L12 3.2z"/>'),
  develop:     icon('<path d="M12 21v-8"/><path d="M12 13c0-4.2 3.1-7.2 8-7.2 0 4.2-3.1 7.2-8 7.2z"/><path d="M12 13c0-3.2-2.4-5.4-6-5.4 0 3.2 2.4 5.4 6 5.4z"/>'),
  connect:     icon('<circle cx="9" cy="12" r="4.8"/><circle cx="15" cy="12" r="4.8"/>'),
  data:        icon('<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>'),
  budget:      icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.6-2.5 1.6-2.5.6-2.5 1.6 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>'),
  build:       icon('<path d="M4.5 21V8.5L12 3.5l7.5 5V21"/><path d="M2.5 21h19"/><path d="M10 21v-5h4v5"/>'),
  audit:       icon('<rect x="5" y="3.5" width="14" height="17.5" rx="1.2"/><path d="M8.5 9l1.7 1.7 3.3-3.3"/><path d="M8.5 14.5h7"/><path d="M8.5 17.5h4.5"/>'),
  governance:  icon('<path d="M12 20V4.5"/><path d="M12 20L5.3 8"/><path d="M12 20L18.7 8"/><path d="M5.3 8a13.2 13.2 0 0 1 13.4 0"/>'),
  hotel:       icon('<path d="M4 21V8.4l8-3.9 8 3.9V21"/><path d="M2.5 21h19"/><path d="M9 21v-3.6a3 3 0 0 1 6 0V21"/><path d="M7.5 11h1.4M11.3 11h1.4M15.1 11h1.4M7.5 14h1.4M15.1 14h1.4"/>'),
  default:     icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/>')
};

// Resolve an icon by explicit SECTION_ICONS key (falls back to keyword match).
function iconByKey(key) {
  if (key && SECTION_ICONS[key]) return SECTION_ICONS[key];
  return sectionIcon(key);
}

function sectionIcon(title) {
  const t = String(title || '').toLowerCase();
  const map = [
    ['ethic', 'ethics'], ['integrity', 'ethics'], ['conduct', 'ethics'],
    ['fair', 'fair'], ['equal', 'fair'], ['opportunity', 'fair'],
    ['strateg', 'strategy'], ['governance', 'governance'], ['escalation', 'governance'],
    ['acquisition', 'strategy'],
    ['recruit', 'hiring'], ['hiring', 'hiring'], ['selection', 'hiring'], ['attract', 'hiring'], ['interview', 'hiring'],
    ['contract', 'contract'], ['document', 'contract'], ['offer', 'contract'], ['record', 'contract'],
    ['onboard', 'welcome'], ['welcome', 'welcome'], ['induction', 'welcome'], ['orientation', 'welcome'],
    ['operation', 'operations'], ['payroll', 'budget'], ['system', 'data'], ['digital', 'data'], ['data', 'data'], ['privacy', 'data'],
    ['wellbeing', 'wellbeing'], ['well-being', 'wellbeing'], ['experience', 'wellbeing'], ['care', 'wellbeing'], ['safety', 'wellbeing'], ['health', 'wellbeing'], ['inclusion', 'wellbeing'],
    ['reward', 'reward'], ['recognition', 'reward'], ['benefit', 'reward'], ['compensation', 'reward'], ['pay', 'reward'],
    ['develop', 'develop'], ['grow', 'develop'], ['learning', 'develop'], ['training', 'develop'], ['talent', 'develop'], ['career', 'develop'], ['succession', 'develop'],
    ['leaving', 'connect'], ['exit', 'connect'], ['alumni', 'connect'], ['connect', 'connect'], ['offboard', 'connect'],
    ['budget', 'budget'], ['finance', 'budget'],
    ['pre-open', 'build'], ['opening', 'build'], ['framework', 'build'], ['tool', 'build'], ['workforce', 'build'], ['planning', 'build'],
    ['audit', 'audit'], ['assessment', 'audit'], ['self-assess', 'audit'], ['risk', 'audit'], ['compliance', 'audit']
  ];
  for (const [kw, key] of map) { if (t.includes(kw)) return SECTION_ICONS[key]; }
  return SECTION_ICONS.default;
}

/* =================================================================
   CHAPTER 3 — SUB-CHAPTER POLICY CONTENT (verbatim from source)
   ================================================================= */
/* =================================================================
   CHAPTER 3 SUB-CHAPTER CONTENT + PRE-OPENING/AUDIT CONTENT
   Data (LIFECYCLE_CONTENT, CH4_CONTENT, CH5_CONTENT) is defined in
   playbook-content.js (auto-generated, verbatim from source),
   loaded BEFORE this file in index.html.
   Back-compat aliases for section arrays:
   ================================================================= */
// Prefer PLAYBOOK-supplied content (authoring tool / exported package); fall
// back to the constants declared in playbook-content.js (standalone use).
// NOTE: LIFECYCLE_CONTENT / CH4_CONTENT / CH5_CONTENT may be declared with
// `const` in playbook-content.js (same global scope), so we must NOT redeclare
// them here. We read those globals safely and alias into PB-aware locals.
function _globalOr(name, fallback) {
  try { return (typeof window !== 'undefined' && name in window) ? window[name] : eval(name); }
  catch (e) { return fallback; }
}
let _LC, _CH4, _CH5, PB_LIFECYCLE_CONTENT, PB_CH4_CONTENT, PB_CH5_CONTENT, CH4_SECTIONS, CH5_SECTIONS, BELIEFS;
// Recompute every PB-derived module value. Called once at load and again on
// every applyPlaybook() so the editor's live preview (and remote boots) render
// the CURRENT playbook, not whatever was baked at page load.
function refreshDerived() {
  CHAPTERS = (PB.chapters && PB.chapters.length) ? PB.chapters : CHAPTERS_DEFAULT;
  LIFECYCLE = (PB.lifecycle && PB.lifecycle.length) ? PB.lifecycle : LIFECYCLE_DEFAULT;
  JOURNEY = (PB.journey && PB.journey.length) ? PB.journey : JOURNEY_DEFAULT;
  SENIOR_MGMT = (PB.seniorMgmt && PB.seniorMgmt.length) ? PB.seniorMgmt : SENIOR_MGMT_DEFAULT;
  PC_LEADERS = (PB.pcLeaders && PB.pcLeaders.length) ? PB.pcLeaders : PC_LEADERS_DEFAULT;
  MENU_DESC = (PB.menuDesc) ? PB.menuDesc : MENU_DESC_DEFAULT;
  BELIEFS = (PB.beliefs && PB.beliefs.length) ? PB.beliefs : BELIEFS_DEFAULT;
  _LC  = PB.lifecycleContent || _globalOr('LIFECYCLE_CONTENT', {});
  _CH4 = PB.ch4 || _globalOr('CH4_CONTENT', { sections: [] });
  _CH5 = PB.ch5 || _globalOr('CH5_CONTENT', { sections: [] });
  PB_LIFECYCLE_CONTENT = _LC;
  PB_CH4_CONTENT = _CH4;
  PB_CH5_CONTENT = _CH5;
  CH4_SECTIONS = PB_CH4_CONTENT.sections;
  CH5_SECTIONS = PB_CH5_CONTENT.sections;
}


/* =================================================================
   RENDERING
   ================================================================= */

function symLabel(s) {
  return { policy: 'Global Policy', guide: 'Guidelines', kit: 'Template · Toolkit', xref: 'Cross-Reference' }[s] || '';
}

// HTML-escape for text nodes / attributes (content is verbatim from source)
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// unique id counter for accordion controls
let _accId = 0;

// A single expandable subheading (resource) row.
// Collapsed: symbol + name + kind + chevron.
// Expanded: reveals the blurb description and the hyperlinked resource.
function policyItemHTML(it) {
  const id = 'acc-' + (++_accId);
  // Group heading row (not a resource): a titled band that introduces the
  // resources beneath it. Renders name + descriptive blurb, no kind tag.
  if (it.s === 'group') {
    return `
      <div class="policy-group-heading">
        <div class="policy-group-heading-top">
          <span class="policy-group-icon" aria-hidden="true">${SYM.kit || ''}</span>
          <h4 class="policy-group-title">${esc(it.name)}</h4>
        </div>
        ${it.desc ? `<p class="policy-group-desc">${esc(it.desc)}</p>` : ''}
      </div>`;
  }
  const hasDetail = !!(it.blurb || it.url);
  const kind = symLabel(it.s);
  // Resource line: hyperlink if url present, else plain styled name.
  const resourceLine = it.url
    ? `<a class="resource-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
         <span class="resource-link-icon">${SYM.link}</span>
         <span class="resource-link-text">${esc(it.name)}</span>
       </a>`
    : `<div class="resource-link resource-link--none">
         <span class="resource-link-icon">${SYM.link}</span>
         <span class="resource-link-text">${esc(it.name)}</span>
         <span class="resource-link-note">Resource available internally</span>
       </div>`;

  if (!hasDetail) {
    // No blurb and no url — render as a static (non-expandable) row.
    return `
      <div class="policy-item static">
        <div class="policy-symbol">${SYM[it.s]}</div>
        <div class="policy-name">${esc(it.name)}</div>
        <div class="policy-kind">${kind}</div>
      </div>`;
  }

  return `
    <div class="policy-item accordion" data-open="false">
      <button class="policy-item-toggle" aria-expanded="false" aria-controls="${id}">
        <span class="policy-symbol">${SYM[it.s]}</span>
        <span class="policy-name">${esc(it.name)}</span>
        <span class="policy-kind">${kind}</span>
        <span class="policy-chevron" aria-hidden="true">${SYM.chevron}</span>
      </button>
      <div class="policy-item-panel" id="${id}" role="region" hidden>
        <div class="policy-item-panel-inner">
          ${it.blurb ? `<p class="policy-item-blurb">${esc(it.blurb)}</p>` : ''}
          <div class="policy-item-resource">
            <span class="resource-eyebrow">Resource</span>
            ${resourceLine}
          </div>
        </div>
      </div>
    </div>`;
}

function policyListHTML(items) {
  if (!items || !items.length) return '';
  return `<div class="policy-list">
    ${items.map(policyItemHTML).join('')}
  </div>`;
}

// Full-width atmospheric image band for chapter visual rhythm.
// Purely visual — caption is an editorial descriptor, not source body text.
function editorialBandHTML(img, eyebrow, caption, fullWidth) {
  return `
    <figure class="editorial-band${fullWidth ? ' editorial-band--full' : ''}">
      <div class="editorial-band-img" style="background-image: url('img/${img}');" role="img" aria-label="${esc(caption || '')}"></div>
      <figcaption class="editorial-band-cap">
        ${eyebrow ? `<span class="editorial-band-eyebrow">${esc(eyebrow)}</span>` : ''}
        ${caption ? `<span class="editorial-band-text">${esc(caption)}</span>` : ''}
      </figcaption>
    </figure>`;
}

// A grid of elegant line-icon cards. Each card's text is a VERBATIM key phrase
// promoted from the source for scannability (duplicated for emphasis) — purely
// a visual reframing, the full verbatim prose still renders in the blurb.
function highlightGridHTML(highlights, eyebrow) {
  if (!highlights || !highlights.length) return '';
  const cards = highlights.map(h => `
    <div class="hl-card">
      <span class="hl-card-icon" aria-hidden="true">${SECTION_ICONS[h.icon] || SECTION_ICONS.default}</span>
      ${h.label ? `<span class="hl-card-label">${esc(h.label)}</span>` : ''}
      <span class="hl-card-text">${esc(h.text)}</span>
    </div>`).join('');
  return `
    <div class="hl-block">
      ${eyebrow ? `<div class="hl-block-eyebrow">${esc(eyebrow)}</div>` : ''}
      <div class="hl-grid hl-grid--${highlights.length >= 4 ? 4 : highlights.length}">${cards}</div>
    </div>`;
}

// An in-body feature pull-quote (verbatim key sentence, duplicated for emphasis).
function featureQuoteHTML(quote) {
  if (!quote) return '';
  return `
    <figure class="section-quote section-quote--feature">
      <span class="section-quote-mark" aria-hidden="true">“</span>
      <blockquote class="section-quote-text">${esc(quote)}</blockquote>
      <span class="section-quote-flourish" aria-hidden="true"></span>
    </figure>`;
}

// Render blurb paragraphs, optionally split into two chunks so a feature quote /
// highlight grid can be interleaved (splitAfter = # of paragraphs before break).
function blurbChunkHTML(paras, from, to) {
  const slice = paras.slice(from, to);
  if (!slice.length) return '';
  return `<div class="policy-section-blurb">${slice.map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
}

// Section (numbered Heading) — optional intro blurb, resource accordions, optional transition.
// Optional visual-only fields: feature_quote (verbatim pull-quote), highlights
// (icon-card grid of verbatim key phrases), splitAfter (interleave point).
function sectionHTML(sec) {
  let blurb;
  if (sec.blurb && sec.blurb.length && (sec.feature_quote || sec.highlights)) {
    // Chunked layout: first paragraphs -> feature quote -> highlight grid -> rest.
    const splitAt = Number.isInteger(sec.splitAfter) ? sec.splitAfter : 1;
    blurb = blurbChunkHTML(sec.blurb, 0, splitAt)
      + featureQuoteHTML(sec.feature_quote)
      + highlightGridHTML(sec.highlights, sec.highlights_eyebrow)
      + blurbChunkHTML(sec.blurb, splitAt, sec.blurb.length);
  } else {
    blurb = (sec.blurb && sec.blurb.length)
      ? `<div class="policy-section-blurb">${sec.blurb.map(p => `<p>${esc(p)}</p>`).join('')}</div>`
      : '';
  }
  // The verbatim source "transition" sentence is promoted into an editorial
  // pull-quote with an oversized quotation mark (magazine treatment). Text
  // itself is unchanged — only its visual framing is elevated.
  const transition = sec.transition
    ? `<figure class="section-quote">
         <span class="section-quote-mark" aria-hidden="true">“</span>
         <blockquote class="section-quote-text">${esc(sec.transition)}</blockquote>
         <span class="section-quote-flourish" aria-hidden="true"></span>
       </figure>`
    : '';
  // Verbatim supporting sentences that PRECEDE the pull-quote — ordinary body
  // text (NOT quoted), so only the key sentence is elevated into a quote.
  const transitionPre = (sec.transition_pre && sec.transition_pre.length)
    ? `<div class="policy-section-blurb policy-section-blurb--before">${sec.transition_pre.map(p => `<p>${esc(p)}</p>`).join('')}</div>`
    : '';
  // Verbatim supporting sentences that follow the pull-quote — rendered as
  // ordinary body text (NOT quoted), so only the key sentence stays a quote.
  const transitionBody = (sec.transition_body && sec.transition_body.length)
    ? `<div class="policy-section-blurb policy-section-blurb--after">${sec.transition_body.map(p => `<p>${esc(p)}</p>`).join('')}</div>`
    : '';
  const numHTML = sec.num ? `<span class="num">${esc(sec.num)}.</span>` : '';
  const iconHTML = `<span class="policy-section-icon" aria-hidden="true">${sectionIcon(sec.title)}</span>`;
  const headerHTML = sec.title
    ? `<div class="policy-section-header">${iconHTML}${numHTML}<h3>${esc(sec.title)}</h3></div>`
    : '';
  return `
    <div class="policy-section">
      ${headerHTML}
      ${blurb}
      ${policyListHTML(sec.items)}
      ${transitionPre}
      ${transition}
      ${transitionBody}
    </div>
  `;
}

// CH4 §1 rendered with a vertical milestone timeline (Task 3). The dense
// sequential prose describing the Pre-Opening Path is reorganised into a
// two-column layout: framing intro + callout on the left, an icon-marked
// vertical timeline of the key stages on the right. Every sentence is verbatim
// from the source blurb; only the visual framing (icons, labels, layout) is new.
function ch4Section1HTML(sec) {
  const b = sec.blurb || [];
  const numHTML = sec.num ? `<span class="num">${esc(sec.num)}.</span>` : '';
  const iconHTML = `<span class="policy-section-icon" aria-hidden="true">${sectionIcon(sec.title)}</span>`;
  const headerHTML = sec.title
    ? `<div class="policy-section-header">${iconHTML}${numHTML}<h3>${esc(sec.title)}</h3></div>`
    : '';
  // Left column: the two framing paragraphs (verbatim), plus the key sentence
  // (verbatim) promoted into an image-7-style callout band.
  const timeline = milestoneTimelineHTML({
    eyebrow: 'The Pre-Opening Path',
    heading: 'Key Milestones',
    lead: [b[1]].filter(Boolean),
    callout_lead: 'People & Culture',
    callout: 'plays a critical role in laying this foundation, ensuring that the right structures, tools, and processes are in place to support Colleagues and deliver the exceptional service for which Mandarin Oriental is known.',
    callout_icon: 'connect',
    steps: [
      { icon: 'data',    label: 'Shared Platform',    text: b[2] },
      { icon: 'connect', label: 'Early Coordination', text: b[3] },
      { icon: 'build',   label: 'Dedicated Workspace', text: b[4] },
      { icon: 'welcome', label: 'Leadership Arrival',  text: b[5] },
      { icon: 'operations', label: 'Aligned Delivery', text: b[6] }
    ].filter(s => s.text)
  });
  // Opening framing paragraph (verbatim) sits above the timeline as a lede.
  const lede = b[0] ? `<div class="policy-section-blurb"><p>${esc(b[0])}</p></div>` : '';
  // Closing pointer sentence (verbatim) after the timeline + resources.
  const closing = b[7] ? `<div class="policy-section-blurb policy-section-blurb--after"><p>${esc(b[7])}</p></div>` : '';
  return `
    <div class="policy-section">
      ${headerHTML}
      ${lede}
      ${timeline}
      ${policyListHTML(sec.items)}
      ${closing}
    </div>
  `;
}

// CH5 — "The P&C Audit Framework" orbit diagram. The Framework sits at the
// core; Mandarin Oriental properties orbit it on a dashed ring; the three key
// benefits (verbatim key phrases from the source) anchor around the diagram.
// Purely a visual reframing — the full verbatim prose still renders alongside.
function auditOrbitHTML() {
  // Mandarin Oriental properties (rendered as hotel glyphs) orbit the gold core.
  // Enlarged diagram: bigger viewBox, wider orbit radius to fill the panel.
  const cx = 240, cy = 240, ring = 188;
  const dots = 8;
  // A single hotel glyph, drawn at unit scale then translated onto the ring.
  const hotelGlyph = '<path d="M-9 12V-4.2l9-4.4 9 4.4V12"/><path d="M-11 12h22"/><path d="M-3.4 12V7.9a3.4 3.4 0 0 1 6.8 0V12"/><path d="M-6 0h1.6M-1 0h1.6M4 0h1.6M-6 4.4h1.6M4 4.4h1.6"/>';
  let dotsSVG = '';
  for (let i = 0; i < dots; i++) {
    const ang = (i / dots) * Math.PI * 2 - Math.PI / 2;
    const x = cx + ring * Math.cos(ang);
    const y = cy + ring * Math.sin(ang);
    const s = (i % 2 === 0) ? 1.05 : 0.82;
    // Soft celadon medallion behind each hotel glyph, then the glyph itself.
    dotsSVG += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(15 * s).toFixed(1)}" fill="${i % 2 === 0 ? '#FFFFFF' : '#EDF1EC'}" stroke="#A9BBAC" stroke-width="1"/>`;
    dotsSVG += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.62 * s).toFixed(3)})" fill="none" stroke="#5C7062" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${hotelGlyph}</g>`;
  }
  const benefits = [
    { icon: 'operations', label: 'Monitor', text: 'monitor operational practices' },
    { icon: 'develop',    label: 'Improve',  text: 'identify areas for improvement' },
    { icon: 'governance', label: 'Govern',   text: 'maintain strong governance standards' }
  ];
  const benefitCards = benefits.map(b => `
        <div class="orbit-benefit">
          <span class="orbit-benefit-icon" aria-hidden="true">${iconByKey(b.icon)}</span>
          <div class="orbit-benefit-body">
            <div class="orbit-benefit-label">${esc(b.label)}</div>
            <p class="orbit-benefit-text">${esc(b.text)}</p>
          </div>
        </div>`).join('');
  return `
    <div class="orbit">
      <div class="orbit-eyebrow">The P&amp;C Audit Framework</div>
        <div class="orbit-stage" role="img" aria-label="The P&amp;C Audit Framework at the core, with Mandarin Oriental hotels orbiting it.">
          <svg class="audit-orbit-svg" viewBox="0 0 480 480" width="100%" height="100%">
            <defs>
              <radialGradient id="orbitCore" cx="50%" cy="42%" r="62%">
                <stop offset="0%" stop-color="#FFFFFF"/>
                <stop offset="100%" stop-color="#F5F3EE"/>
              </radialGradient>
            </defs>
            <!-- outer dashed orbit ring (celadon) + inner ring (gold) -->
            <circle cx="240" cy="240" r="188" fill="none" stroke="#A9BBAC" stroke-width="1" stroke-dasharray="3 7"/>
            <circle cx="240" cy="240" r="150" fill="none" stroke="#E7DECB" stroke-width="1"/>
            ${dotsSVG}
            <!-- core disc -->
            <circle cx="240" cy="240" r="112" fill="url(#orbitCore)" stroke="#B59060" stroke-width="1.2"/>
            <circle cx="240" cy="240" r="112" fill="none" stroke="#C9A879" stroke-width="0.6" opacity="0.6" transform="scale(1.06)" transform-origin="240 240"/>
            <g transform="translate(240 168)" fill="none" stroke="#8f6d3f" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="-13" y="-11" width="26" height="33" rx="1.6"/>
              <path d="M-6.5 -2l3.2 3.2 6.5-6.5"/>
              <path d="M-6.5 9h13"/>
              <path d="M-6.5 15h8.5"/>
            </g>
            <text x="240" y="236" text-anchor="middle" font-family="Avenir Next LT Pro" font-size="12" letter-spacing="2.5" fill="#6b625a">THE P&amp;C AUDIT</text>
            <text x="240" y="270" text-anchor="middle" font-family="MO Exceptional" font-size="31" font-style="italic" font-weight="500" fill="#0d0b08">Framework</text>
            <text x="240" y="298" text-anchor="middle" font-family="Avenir Next LT Pro" font-size="10" letter-spacing="2.5" fill="#8f6d3f">AT THE CORE</text>
          </svg>
          <div class="orbit-caption">All Mandarin Oriental properties orbit a single, shared framework.</div>
        </div>
        <div class="orbit-benefits">
          <div class="orbit-benefits-eyebrow">What the framework enables</div>
          ${benefitCards}
        </div>
    </div>`;
}

// CH2 — "What We Believe": interactive Vision / Mission / Values.
// Click a tab to reveal a split panel — the statement (with highlighted
// keywords) on the left, an icon-led list of principles on the right.
// Mirrors the reference spreads for Vision, Mission and Values. All verbatim.
const BELIEFS_DEFAULT = [
  {
    key: 'vision',
    tab: 'Our Vision',
    eyebrow: 'A Meaningful Vision',
    statement: 'Be <em>Fans</em> of the <em>Exceptional</em>, <em>Every Day</em>, <em>Everywhere</em>',
    items: [
      { icon: 'wellbeing',  label: 'Fans',        text: 'We are passionate beyond our duty' },
      { icon: 'reward',     label: 'Exceptional', text: 'We stand out from the usual and expected' },
      { icon: 'welcome',    label: 'Every Day',   text: 'Our motivation and dedication is continuous' },
      { icon: 'connect',    label: 'Everywhere',  text: 'Exceptional delivery in parts of the guest journey' }
    ]
  },
  {
    key: 'mission',
    tab: 'Our Mission',
    eyebrow: 'A Meaningful Mission',
    statement: 'Craft time-<em>enriching experiences</em> that transform the ordinary to the <em>exceptional</em> and guests to fans',
    items: [
      { icon: 'develop',  label: 'Enriching',   text: 'Enabling our guests’ self-growth and fulfillment' },
      { icon: 'strategy', label: 'Experiences', text: 'We create loyalty through memorable stays and experiences' },
      { icon: 'reward',   label: 'Exceptional', text: 'Elevated experiences transform simple things into moments of delight' }
    ]
  },
  {
    key: 'values',
    tab: 'Our Values',
    eyebrow: 'Our Values',
    statement: 'The <em>Exceptional</em> · <em>Growth</em> · <em>Teamwork</em> · <em>Respect</em> · <em>Responsibility</em>',
    items: [
      { icon: 'reward',     label: 'The Exceptional', text: 'We Deliver the Exceptional.' },
      { icon: 'develop',    label: 'Growth',          text: 'We Embrace a Growth Mindset.' },
      { icon: 'connect',    label: 'Teamwork',        text: 'We Succeed Together.' },
      { icon: 'fair',       label: 'Respect',         text: 'We Demonstrate Integrity and Respect.' },
      { icon: 'ethics',     label: 'Responsibility',  text: 'We Act Responsibly.' }
    ]
  }
];


function beliefsTabsHTML() {
  const tabs = BELIEFS.map((b, i) => `
        <button class="beliefs-tab${i === 0 ? ' is-active' : ''}" role="tab"
          aria-selected="${i === 0 ? 'true' : 'false'}" data-belief="${b.key}" id="belief-tab-${b.key}">
          ${esc(b.tab)}
        </button>`).join('');
  const panels = BELIEFS.map((b, i) => {
    const items = b.items.map(it => `
          <div class="beliefs-item">
            <span class="beliefs-item-icon" aria-hidden="true">${iconByKey(it.icon)}</span>
            <div class="beliefs-item-body">
              <div class="beliefs-item-label">${esc(it.label)}</div>
              <p class="beliefs-item-text">${esc(it.text)}</p>
            </div>
          </div>`).join('');
    return `
        <div class="beliefs-panel${i === 0 ? ' is-active' : ''}" role="tabpanel"
          data-belief="${b.key}" aria-labelledby="belief-tab-${b.key}"${i === 0 ? '' : ' hidden'}>
          <div class="beliefs-statement-col">
            <div class="beliefs-statement-eyebrow">${esc(b.eyebrow)}</div>
            <div class="beliefs-statement">${b.statement}</div>
          </div>
          <div class="beliefs-items-col">
            ${items}
          </div>
        </div>`;
  }).join('');
  return `
    <div class="beliefs">
      <div class="beliefs-tabs" role="tablist" aria-label="Vision, Mission and Values">
        ${tabs}
      </div>
      <div class="beliefs-panels">
        ${panels}
      </div>
    </div>`;
}

// Stylised, low-detail world map (equirectangular, viewBox 0 0 460 250).
// Simplified continent silhouettes — decorative backdrop for the expansion
// routes, not a survey-accurate map. Longitude maps 0..460, latitude 0..250.
const WORLD_MAP_PATHS = `
  <!-- North America -->
  <path d="M60 46 L128 40 L150 54 L142 70 L156 78 L140 96 L120 100 L110 120 L96 116 L92 96 L78 92 L70 74 L58 66 Z"/>
  <!-- Central America -->
  <path d="M110 120 L128 128 L138 150 L128 152 L118 134 L108 126 Z"/>
  <!-- South America -->
  <path d="M138 150 L158 150 L166 172 L156 206 L142 222 L134 200 L138 176 L130 160 Z"/>
  <!-- Greenland -->
  <path d="M172 34 L196 32 L200 48 L184 56 L172 46 Z"/>
  <!-- Europe -->
  <path d="M206 62 L236 58 L242 70 L232 78 L238 90 L224 92 L212 84 L204 74 Z"/>
  <!-- Africa -->
  <path d="M224 96 L262 92 L278 108 L272 140 L252 174 L238 172 L230 140 L222 118 L220 104 Z"/>
  <!-- Middle East / West Asia -->
  <path d="M270 96 L296 96 L300 112 L286 122 L274 112 Z"/>
  <!-- Asia -->
  <path d="M300 56 L378 50 L400 66 L396 84 L372 92 L352 88 L330 96 L308 92 L298 78 L302 66 Z"/>
  <!-- SE Asia / Indochina -->
  <path d="M330 100 L356 104 L360 124 L346 134 L336 120 Z"/>
  <!-- Indian subcontinent -->
  <path d="M308 96 L330 98 L328 118 L316 124 L308 108 Z"/>
  <!-- Japan -->
  <path d="M392 84 L404 88 L400 102 L390 100 Z"/>
  <!-- Maritime SE Asia -->
  <path d="M344 142 L376 146 L378 158 L350 160 L342 150 Z"/>
  <!-- Australia -->
  <path d="M370 170 L410 168 L420 190 L400 206 L376 200 L366 182 Z"/>
`;

// CH2 — "Our Strategic Vision" globe diagram. Hotels spread across a stylised
// globe (celadon meridians, gold location pins); the Group's two headline
// ambitions — evolving the guest experience and carbon neutrality by 2030 —
// anchor beneath as goal callouts. A conceptual, icon-led visual reframing.
function visionGlobeHTML() {
  // A large STATIC globe (no animation) with criss-crossing gold expansion
  // lines and small hotel icons scattered across it — a conceptual visual of
  // Mandarin Oriental's rapid worldwide growth. viewBox 0 0 480 480.
  const CX = 240, CY = 240, R = 178;
  // Project a lat/lon (degrees) onto the visible hemisphere of the sphere.
  // Points on the far side are still drawn but pulled toward the limb.
  const project = (lat, lon) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    const x = Math.cos(la) * Math.sin(lo);
    const y = Math.sin(la);
    const z = Math.cos(la) * Math.cos(lo);
    return { x: CX + x * R, y: CY - y * R, z };
  };
  // Hotel destinations placed by approximate lat/lon, rotated so Asia–Europe
  // faces the viewer. Heritage hubs (Hong Kong, Bangkok) are emphasised.
  const cities = [
    { name: 'Hong Kong', lat: 22,  lon: 24,  hub: true  },
    { name: 'Bangkok',   lat: 14,  lon: 14,  hub: true  },
    { name: 'Tokyo',     lat: 36,  lon: 40,  hub: false },
    { name: 'Singapore', lat: 1,   lon: 20,  hub: false },
    { name: 'Dubai',     lat: 25,  lon: -18, hub: false },
    { name: 'Geneva',    lat: 46,  lon: -40, hub: false },
    { name: 'London',    lat: 51,  lon: -52, hub: false },
    { name: 'Paris',     lat: 49,  lon: -46, hub: false },
    { name: 'Shanghai',  lat: 31,  lon: 30,  hub: false },
    { name: 'Mumbai',    lat: 19,  lon: -2,  hub: false }
  ].map(c => ({ ...c, ...project(c.lat, c.lon) }));
  const idx = n => cities.findIndex(c => c.name === n);
  // Criss-crossing lines fan out from the two heritage hubs to other cities,
  // drawn as gentle quadratic arcs bowed away from the globe centre.
  const routes = [
    ['Hong Kong', 'London'], ['Hong Kong', 'Dubai'], ['Hong Kong', 'Tokyo'],
    ['Hong Kong', 'Geneva'], ['Hong Kong', 'Mumbai'], ['Bangkok', 'Paris'],
    ['Bangkok', 'Singapore'], ['Bangkok', 'Shanghai'], ['Bangkok', 'London']
  ];
  const arc = (a, b, lift) => {
    const p1 = cities[idx(a)], p2 = cities[idx(b)];
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    // Bow the control point outward from the sphere centre for a domed feel.
    const dx = mx - CX, dy = my - CY, dl = Math.hypot(dx, dy) || 1;
    const cxp = mx + (dx / dl) * (lift || 34);
    const cyp = my + (dy / dl) * (lift || 34);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cxp.toFixed(1)} ${cyp.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };
  let routesSVG = '';
  routes.forEach((r, i) => {
    const d = arc(r[0], r[1], 26 + (i % 3) * 12);
    routesSVG += `<path d="${d}" fill="none" stroke="#B59060" stroke-width="1.2" opacity="0.62"/>`;
  });
  // Meridian + parallel lines to read as a globe (static).
  let gridSVG = '';
  for (let k = -60; k <= 60; k += 30) {
    const ry = Math.abs(Math.cos(k * Math.PI / 180)) * R;
    const yy = CY - Math.sin(k * Math.PI / 180) * R;
    gridSVG += `<ellipse cx="${CX}" cy="${yy.toFixed(1)}" rx="${(R * Math.cos(Math.asin(Math.sin(k*Math.PI/180)))).toFixed(1)}" ry="3.4" fill="none" stroke="#A9BBAC" stroke-width="0.7" opacity="0.55"/>`;
  }
  for (let m = 0; m < 6; m++) {
    const rx = Math.abs(Math.cos((m / 6) * Math.PI)) * R;
    gridSVG += `<ellipse cx="${CX}" cy="${CY}" rx="${rx.toFixed(1)}" ry="${R}" fill="none" stroke="#A9BBAC" stroke-width="0.7" opacity="0.5"/>`;
  }
  // Hotel icon glyph (celadon on cream medallion) for each destination.
  const hotelGlyph = '<path d="M-7 9V-3.2l7-3.4 7 3.4V9"/><path d="M-8.5 9h17"/><path d="M-2.6 9V5.9a2.6 2.6 0 0 1 5.2 0V9"/><path d="M-4.6 0h1.2M-0.6 0h1.2M3.4 0h1.2"/>';
  let pinsSVG = '';
  cities.forEach(c => {
    const s = c.hub ? 1.15 : 0.9;
    pinsSVG += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${(12 * s).toFixed(1)}" fill="#FFFFFF" stroke="${c.hub ? '#B59060' : '#A9BBAC'}" stroke-width="${c.hub ? 1.4 : 1}"/>`;
    pinsSVG += `<g transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${(0.66 * s).toFixed(3)})" fill="none" stroke="${c.hub ? '#8f6d3f' : '#5C7062'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${hotelGlyph}</g>`;
  });
  const goals = [
    { icon: 'develop', label: 'Guest Experience', text: 'Evolving the guest experience through digital innovation' },
    { icon: 'wellbeing', label: 'By 2030', text: 'Achieving carbon neutrality across operations', badge: '2030' }
  ];
  const goalCards = goals.map(g => `
        <div class="globe-goal">
          <span class="globe-goal-icon" aria-hidden="true">${iconByKey(g.icon)}</span>
          <div class="globe-goal-body">
            <div class="globe-goal-label">${esc(g.label)}</div>
            <p class="globe-goal-text">${esc(g.text)}</p>
          </div>
        </div>`).join('');
  return `
    <div class="orbit globe">
      <div class="orbit-eyebrow">A Global Ambition</div>
      <div class="orbit-stage" role="img" aria-label="A globe with criss-crossing gold lines and hotel icons across it, representing Mandarin Oriental's rapid expansion from its heritage hubs in Hong Kong and Bangkok to destinations worldwide.">
        <svg class="globe-svg" viewBox="0 0 480 480" width="100%" height="100%">
          <defs>
            <radialGradient id="globeSphere" cx="42%" cy="38%" r="72%">
              <stop offset="0%" stop-color="#FBFDFB"/>
              <stop offset="62%" stop-color="#EDF1EC"/>
              <stop offset="100%" stop-color="#DCE6DD"/>
            </radialGradient>
          </defs>
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#globeSphere)" stroke="#A9BBAC" stroke-width="1.1"/>
          <g>${gridSVG}</g>
          <g class="globe-routes">${routesSVG}</g>
          <g class="globe-pins">${pinsSVG}</g>
        </svg>
        <div class="orbit-caption">Criss-crossing routes trace Mandarin Oriental's rapid expansion across the world's key destinations.</div>
      </div>
      <div class="orbit-benefits globe-goals">
        <div class="orbit-benefits-eyebrow">Ambitions that guide the Group</div>
        ${goalCards}
      </div>
    </div>`;
}

// CH2 — "Our Strategic Vision" rendered as the standard magazine spread:
// verbatim prose + pull-quote on the left, the globe diagram on the right.
function strategicVisionSpreadHTML() {
  const paras = [
    "Mandarin Oriental aims to strengthen its position as one of the world's most admired luxury hospitality brands. The Group continues to expand thoughtfully in key destinations while evolving the guest experience through digital innovation, sustainability leadership and distinctive wellness and lifestyle offerings.",
    "As the brand grows, Mandarin Oriental remains committed to responsible operations and long-term value creation. The Group has set ambitious sustainability goals, including achieving carbon neutrality across its operations by 2030.",
    "Supporting this vision requires exceptional Colleagues, strong leadership and a shared commitment to service excellence across every hotel, residence and corporate office."
  ];
  // All three paragraphs remain verbatim as body; the memorable closing line
  // (verbatim, from the original section pull-quote) is promoted for emphasis.
  const body = `<p class="drop">${esc(paras[0])}</p><p>${esc(paras[1])}</p><p>${esc(paras[2])}</p>`;
  const quote = `
        <figure class="editorial-quote">
          <span class="editorial-quote-mark" aria-hidden="true">“</span>
          <blockquote class="editorial-quote-text">Every Colleague deserves to feel proud, supported, and inspired — every day, everywhere.</blockquote>
        </figure>`;
  return `
    <div class="editorial-spread philosophy-spread audit-spread">
      <div class="editorial-col">
        <div class="philosophy-spread-eyebrow">Our Strategic Vision</div>
        <div class="editorial-body">${body}</div>
        ${quote}
      </div>
      <div class="editorial-col audit-visual-col">
        ${visionGlobeHTML()}
      </div>
    </div>`;
}

// CH5 — P&C Audit chapter intro rendered with the Design Language: a lede,
// the key "Audit Framework helps ensure…" sentence promoted to a pull-quote,
// the orbit diagram, and the remaining verbatim prose. All wording verbatim.
function ch5AuditIntroHTML(c) {
  const p = (c && c.intro) ? c.intro : [];
  // LEFT column: lede (drop-cap) + remaining body, with the key sentence
  // promoted to a pull-quote — mirrors the standard magazine spread.
  // intro[0] = opening lede, intro[1] = pull-quote, intro[2..] = body.
  const first = p[0] ? `<p class="drop">${esc(p[0])}</p>` : '';
  const rest = p.slice(2).map(x => `<p>${esc(x)}</p>`).join('');
  const quote = p[1] ? `
        <figure class="editorial-quote">
          <span class="editorial-quote-mark" aria-hidden="true">“</span>
          <blockquote class="editorial-quote-text">${esc(p[1])}</blockquote>
        </figure>` : '';
  return `
    <div class="editorial-spread philosophy-spread audit-spread">
      <div class="editorial-col">
        <div class="philosophy-spread-eyebrow">The P&amp;C Audit Framework</div>
        <div class="editorial-body">
          ${first}
          ${rest}
        </div>
        ${quote}
      </div>
      <div class="editorial-col audit-visual-col">
        ${auditOrbitHTML()}
      </div>
    </div>`;
}

// Sub-chapter intro block: tagline + intro paragraphs (with bullet detection).
function subIntroHTML(c) {
  if (!c) return '';
  const parts = [];
  if (c.tagline) parts.push(`<p class="sub-tagline">${esc(c.tagline)}</p>`);
  if (c.intro && c.intro.length) {
    // Render "People & Culture's role is to ensure:" style lead-ins as paragraphs;
    // short imperative lines that follow such a lead become a bullet list.
    let html = '';
    let bulletBuf = [];
    const flush = () => {
      if (bulletBuf.length) {
        html += `<ul class="sub-intro-list">${bulletBuf.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
        bulletBuf = [];
      }
    };
    let collecting = false;
    c.intro.forEach(p => {
      const isLead = /:\s*$/.test(p);
      if (isLead) {
        flush();
        collecting = true;
        html += `<p class="sub-intro-lead">${esc(p)}</p>`;
      } else if (collecting && p.length < 130) {
        bulletBuf.push(p);
      } else {
        flush();
        collecting = false;
        html += `<p>${esc(p)}</p>`;
      }
    });
    flush();
    parts.push(`<div class="sub-intro">${html}</div>`);
  }
  return parts.join('');
}

// Pick a contextually-appropriate line icon for a short verbatim phrase by
// keyword. Falls back through a rotating set so adjacent points never repeat.
function phraseIcon(text, i) {
  const t = String(text || '').toLowerCase();
  const rules = [
    [/complian|legal|policy|standard|governanc|regulat/, 'governance'],
    [/fair|inclusi|transparen|integrity|ethic|respect/, 'fair'],
    [/hir|recruit|select|candidate|talent|attract/, 'hiring'],
    [/onboard|welcom|day 1|day one|arriv|first/, 'welcome'],
    [/develop|grow|learn|capab|train|mobilit|career|progress/, 'develop'],
    [/manager|leader|model|reinforc|behav|team/, 'strategy'],
    [/document|record|data|report|measur|track/, 'data'],
    [/reward|recogni|benefit|pay|compensat/, 'reward'],
    [/wellbe|care|safe|health|support/, 'wellbeing'],
    [/communicat|connect|engage|relationship|alumni/, 'connect'],
    [/review|audit|assess|monitor|check/, 'audit'],
    [/build|foundation|structur|plan|open/, 'build'],
    [/operat|process|deliver|service|consisten/, 'operations']
  ];
  for (const [re, key] of rules) if (re.test(t)) return key;
  const cycle = ['fair', 'governance', 'develop', 'connect', 'operations'];
  return cycle[i % cycle.length];
}

// An elegant framed iconography card for the right column of a philosophy
// spread — mirrors the framed visual panel in image-13, but built from line
// iconography (not a photo). The points are VERBATIM source phrases (the
// "role is to ensure" list), each paired with a contextual line icon.
// Tinted emphasis text-box with a gold left border + small line icon
// (Design Language #2). Used to chunk dense verbatim prose into a visual
// moment. Text is verbatim from source — only its framing is elevated.
function emphasisBoxHTML(text, iconKey) {
  const glyph = SECTION_ICONS[iconKey] || SECTION_ICONS.default;
  return `
    <div class="prose-emphasis">
      <span class="prose-emphasis-icon" aria-hidden="true">${glyph}</span>
      <p class="prose-emphasis-text">${esc(text)}</p>
    </div>`;
}

function philosophyVisualCardHTML(eyebrow, lead, points, themeIcon) {
  const rows = (points || []).map((p, i) => `
        <div class="pcard-row">
          <span class="pcard-row-icon" aria-hidden="true">${SECTION_ICONS[phraseIcon(p, i)] || SECTION_ICONS.default}</span>
          <span class="pcard-row-text">${esc(p)}</span>
        </div>`).join('');
  return `
    <aside class="philosophy-card" role="group" aria-label="${esc(eyebrow || 'People & Culture priorities')}">
      <div class="philosophy-card-eyebrow">${esc(eyebrow || 'In Practice')}</div>
      <div class="philosophy-card-crest" aria-hidden="true">${themeIcon || SECTION_ICONS.default}</div>
      ${lead ? `<p class="philosophy-card-lead">${esc(lead)}</p>` : ''}
      <div class="philosophy-card-rows">${rows}</div>
    </aside>`;
}

// Philosophy spread for a sub-chapter — two-column magazine layout matching
// image-13: verbatim prose (drop-cap) on the LEFT with a promoted pull-quote,
// and a framed iconography card on the RIGHT built from the verbatim
// "role is to ensure" points. All wording is verbatim from the source.
function philosophyHTML(c, fallbackLede, themeIcon) {
  const title = (c && c.philosophy && c.philosophy.title) ? c.philosophy.title : 'Our Philosophy';
  const paras = (c && c.philosophy && c.philosophy.paras && c.philosophy.paras.length)
    ? c.philosophy.paras.slice() : (fallbackLede ? [fallbackLede] : []);
  // Separate the "...to ensure:" lead + its short bullets from the prose.
  const leadIdx = paras.findIndex(p => /:\s*$/.test(p));
  let prose = paras, ensureLead = '', ensurePoints = [], afterEnsure = [];
  if (leadIdx > -1) {
    prose = paras.slice(0, leadIdx);
    ensureLead = paras[leadIdx];
    const tail = paras.slice(leadIdx + 1);
    tail.forEach(p => { if (p.length < 130) ensurePoints.push(p); else afterEnsure.push(p); });
  }
  // LEFT: drop-cap first para, one sentence promoted to a pull-quote, rest body.
  // Choose the pull-quote as the shortest punchy middle sentence (verbatim).
  let quoteIdx = -1;
  if (prose.length >= 3) {
    // pick the shortest of paras[1..] as the emphasised line
    let best = Infinity;
    for (let k = 1; k < prose.length; k++) {
      if (prose[k].length < best) { best = prose[k].length; quoteIdx = k; }
    }
  }
  // When the prose is long (dense wall of text), promote the FINAL prose
  // paragraph into an icon-led emphasis box to chunk the reading rhythm.
  const emphasiseLast = prose.length >= 4;
  const lastProseIdx = prose.length - 1;
  // A drop-cap only reads well when the first paragraph is long enough for the
  // text to wrap beside the oversized letter. For a short one-line opener
  // (e.g. "Operational Excellence is an expression of care.") the drop-cap
  // floats alone and collides with the rule above — so render it as a lead
  // line instead and move the drop-cap to the first substantial paragraph.
  const dropIdx = prose.findIndex(p => p.length >= 90);
  const leftParts = [];
  prose.forEach((p, k) => {
    if (k === 0 && dropIdx !== 0) { leftParts.push(`<p class="philosophy-lead-line">${esc(p)}</p>`); return; }
    if (k === dropIdx) { leftParts.push(`<p class="drop">${esc(p)}</p>`); return; }
    if (k === quoteIdx) {
      leftParts.push(`
        <figure class="editorial-quote">
          <span class="editorial-quote-mark" aria-hidden="true">&ldquo;</span>
          <blockquote class="editorial-quote-text">${esc(p)}</blockquote>
        </figure>`);
    } else if (emphasiseLast && k === lastProseIdx) {
      leftParts.push(emphasisBoxHTML(p, phraseIcon(p, k)));
    } else {
      leftParts.push(`<p>${esc(p)}</p>`);
    }
  });
  // Verbatim paragraphs that trail the "ensure" list are rendered as icon-led
  // emphasis boxes so the dense text is visually chunked (Design Language #2).
  afterEnsure.forEach((p, k) => leftParts.push(emphasisBoxHTML(p, phraseIcon(p, k))));
  // RIGHT: framed iconography card built from the verbatim "ensure" points.
  const card = ensurePoints.length
    ? philosophyVisualCardHTML(title, ensureLead, ensurePoints, themeIcon)
    : philosophyVisualCardHTML(title, '', prose.slice(0, 3).map(s => s), themeIcon);
  return `
    <div class="philosophy-spread">
      <div class="editorial-spread">
        <div class="editorial-col">
          <div class="philosophy-spread-eyebrow">${esc(title)}</div>
          <div class="editorial-body">${leftParts.join('')}</div>
        </div>
        <div class="editorial-col philosophy-card-col">
          ${card}
        </div>
      </div>
    </div>`;
}

// CH4 "Our Pre-Opening Philosophy" rendered as a two-column magazine spread:
// verbatim prose + drop-cap on the left, Colleague-experience image on the
// right, and the key "build momentum" sentence promoted to a pull-quote below
// the prose. The "role is to ensure:" lead + bullets follow as a full-width
// block. All wording is verbatim from CH4_CONTENT.philosophy.paras.
function ch4PhilosophySpreadHTML(c, img, cap) {
  const p = (c && c.philosophy && c.philosophy.paras) ? c.philosophy.paras : [];
  const title = (c && c.philosophy && c.philosophy.title) ? c.philosophy.title : 'Our Philosophy';
  // Left-column prose: opening para (drop cap) + the framing para (index 2).
  const proseLeft = [];
  if (p[0]) proseLeft.push(`<p class="drop">${esc(p[0])}</p>`);
  if (p[2]) proseLeft.push(`<p>${esc(p[2])}</p>`);
  // Pull-quote: the "build momentum" sentence (index 1), verbatim.
  const quote = p[1] ? `
        <blockquote class="editorial-quote">
          <span class="editorial-quote-mark" aria-hidden="true">&ldquo;</span>
          <p class="editorial-quote-text">${esc(p[1])}</p>
        </blockquote>` : '';
  // Below the spread: the "role is to ensure:" lead + its bullet list (verbatim).
  let below = '';
  const leadIdx = p.findIndex(x => /:\s*$/.test(x));
  if (leadIdx > -1) {
    const bullets = p.slice(leadIdx + 1).filter(x => x && x.length < 160);
    below = `
      <div class="philosophy-ensure">
        <p class="philosophy-ensure-lead">${esc(p[leadIdx])}</p>
        <ul class="philosophy-ensure-list">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>`;
  }
  return `
    <div class="philosophy-spread">
      <div class="editorial-spread editorial-spread--reverse">
        <div class="editorial-col">
          <div class="philosophy-spread-eyebrow">${esc(title)}</div>
          <div class="editorial-body">${proseLeft.join('')}</div>
          ${quote}
        </div>
        <figure class="editorial-figure">
          <div class="editorial-figure-img" style="background-image:url('img/${img}');background-position:center 58%;"></div>
          <figcaption class="editorial-figure-cap">${esc(cap)}</figcaption>
        </figure>
      </div>
      ${below}
    </div>`;
}

// Vertical milestone timeline (CH4 §1): a two-column magazine layout with a
// short framing intro on the left and a vertical, icon-marked timeline on the
// right depicting the key stages of the Pre-Opening Path. Each stage carries a
// UI-only eyebrow label + icon (visual framing) and verbatim source text.
function milestoneTimelineHTML(cfg) {
  const eyebrow = cfg.eyebrow ? `<div class="mstone-eyebrow">${esc(cfg.eyebrow)}</div>` : '';
  const heading = cfg.heading ? `<h4 class="mstone-heading">${esc(cfg.heading)}</h4>` : '';
  const lead = (cfg.lead || []).map(p => `<p>${esc(p)}</p>`).join('');
  // Optional image-7-style callout band highlighting one key sentence (verbatim).
  const callout = cfg.callout ? `
        <div class="mstone-callout">
          <span class="mstone-callout-icon" aria-hidden="true">${iconByKey(cfg.callout_icon || 'connect')}</span>
          <p class="mstone-callout-text">${cfg.callout_lead ? `<em>${esc(cfg.callout_lead)}</em> ` : ''}${esc(cfg.callout)}</p>
        </div>` : '';
  const steps = (cfg.steps || []).map((s, i) => `
        <li class="mstone-step">
          <div class="mstone-marker">
            <span class="mstone-icon" aria-hidden="true">${iconByKey(s.icon)}</span>
          </div>
          <div class="mstone-body">
            <div class="mstone-step-eyebrow">${esc(s.label)}</div>
            <p class="mstone-step-text">${esc(s.text)}</p>
          </div>
        </li>`).join('');
  return `
    <div class="mstone">
      <div class="mstone-grid">
        <div class="mstone-left">
          ${eyebrow}
          ${heading}
          <div class="mstone-lead">${lead}</div>
          ${callout}
        </div>
        <div class="mstone-right">
          <ol class="mstone-timeline">${steps}</ol>
        </div>
      </div>
    </div>`;
}

// ---- COVER ----------------------------------------------------------
function renderCover() {
  return `
    <section class="chapter" id="cover">
      <div class="cover-full" style="background-image: url('img/${T('cover.bg','cover_colleagues.jpg')}');">
        <div class="cover-veil"></div>
        <div class="cover-inner">
          <div class="cover-top">
            <div class="cover-wordmark">${T('cover.wordmark','Mandarin Oriental')}</div>
            <div class="cover-edition">${T('cover.edition','Edition · July 2026')}</div>
          </div>
          <div class="cover-center">
            <div class="cover-eyebrow">${T('cover.eyebrow','The Interactive Playbook')}</div>
            <h1 class="cover-title">${T('cover.titleHtml','People &amp; Culture<br/><em>Playbook</em>')}</h1>
            <p class="cover-sub">${T('cover.sub','A living framework for every People &amp; Culture leader — from attracting talent to leaving with connection.')}</p>
            <button class="cover-cta" data-goto="intro">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 6.2C10 4.8 7.2 4.2 3.5 4.2v13.9c3.7 0 6.5.6 8.5 2 2-1.4 4.8-2 8.5-2V4.2c-3.7 0-6.5.6-8.5 2z"/><path d="M12 6.2v13.9"/></svg>
              ${T('cover.ctaLabel','Explore')}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---- INTRO VIDEO (welcome interstitial) ----------------------------
function renderIntro() {
  return `
    <section class="chapter" id="intro">
      <div class="intro-full">
        <div class="intro-inner">
          <div class="intro-eyebrow">${T('intro.eyebrow','A Message to Colleagues')}</div>
          <h1 class="intro-title">${T('intro.title','Welcome to our People &amp; Culture (P&amp;C) Playbook')}</h1>
          <div class="intro-video-wrap">
            <video class="intro-video" src="${T('intro.video','video/intro.mp4')}" playsinline controls preload="auto"></video>
          </div>
          <button class="intro-next" data-goto="menu">
            ${T('intro.nextLabel','Continue to Contents')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </section>
  `;
}

// ---- A LETTER TO COLLEAGUES (Chief People & Culture Officer) --------
function renderLetter() {
  return `
    <section class="chapter" id="letter">
      <div class="spread">
        <div class="spread-header center">
          <div class="running-mini">${T('letter.running','Foreword')}</div>
          <div class="center-rule"></div>
          <h2 class="spread-title center">${T('letter.title','From the Chief People &amp; Culture Officer')}</h2>
          <p class="spread-lede center">${T('letter.lede','A letter to Colleagues — the intent, the tone, and the invitation behind these pages.')}</p>
        </div>

        <div class="cpo-spread">
          <div class="cpo-portrait-wrap">
            <img class="cpo-portrait" src="img/${T('letter.portrait','cpo_portrait.jpg')}" alt="${T('letter.name','ShaoWei Ong')}" />
            <div class="cpo-caption">
              <div class="cpo-name">${T('letter.name','ShaoWei Ong')}</div>
              <div class="cpo-role">${T('letter.role','Chief People &amp; Culture Officer')}</div>
            </div>
          </div>
          <div class="cpo-letter">
            <div class="letter-greeting">${T('letter.greeting','Dear Colleagues,')}</div>
            <div class="letter-body">
              ${(T('letter.body',['This guide represents an important step toward creating <strong>globally consistent people processes and services</strong> for all our Colleagues.','Our ambition is simple yet powerful: to ensure that every interaction, every process, and every service reflects our <strong>brand DNA</strong> and commitment to excellence. We believe that delivering exceptional experiences is not limited to our guests — it extends to every Colleague, in every role, across every location.','This playbook is designed to support you as <strong>masters of your craft</strong>, providing clarity and consistency in our people related processes while respecting the unique character of each market. It is a resource to help us work smarter, collaborate better, and uphold the highest standards in everything we do.','Thank you for embracing these principles and for your continued dedication to making our workplace extraordinary.','Together, we will keep raising the bar for People &amp; Culture excellence.'])).map(p=>`<p>${p}</p>`).join('\n              ')}
            </div>
            <div class="letter-close">
              <div class="letter-signature">${T('letter.signature','ShaoWei Ong')}</div>
              <div class="cpo-role" style="font-family: 'Avenir Next LT Pro'; font-style: italic; color: var(--ink-mute); margin-top: 4px;">${T('letter.role','Chief People &amp; Culture Officer')}</div>
            </div>
          </div>
        </div>
      </div>

      ${chapterNavHTML('intro', 'ch-1')}
    </section>
  `;
}

// ---- CHAPTER I — INTRODUCTION --------------------------------------
function renderCh1() {
  return `
    <section class="chapter" id="ch-1">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch1.opener.bg','opener_intro.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-1"]}</span>Chapter I</div></div>
              <div class="opener-eyebrow">${T('ch1.opener.eyebrow','Introduction')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch1.opener.title','Welcome to our<br/>Playbook')}</h1>
              <p class="opener-sub">${T('ch1.opener.sub','Why this guide exists, who it serves, and how to use it.')}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow">
          <span class="num">01</span>
          <span class="txt">${T('ch1.s01.eyebrow','Our Purpose')}</span>
          <span class="rule"></span>
        </div>

        <!-- Magazine editorial spread: image left, body + featured pull-quote right -->
        <div class="editorial-spread">
          <figure class="editorial-figure">
            <div class="editorial-figure-img" style="background-image:url('img/${T('ch1.s01.img','colleagues_group.jpg')}');"></div>
            <figcaption class="editorial-figure-cap">${T('ch1.s01.cap','Mandarin Oriental &middot; A culture of care')}</figcaption>
          </figure>
          <div class="editorial-col">
            <div class="editorial-body">
              <p class="drop">${T('ch1.s01.p1','The Playbook exists to strengthen alignment between our shared values and daily P&amp;C practices; to support P&amp;C teams in delivering a consistent experience — from recruitment to farewell; to ensure every policy is interpreted with care, fairness, and respect; and to provide clarity, templates, and examples that make implementation simple and intuitive.')}</p>
              <p>${T('ch1.s01.p2','Each section has been designed to follow the Colleague lifecycle, a journey that mirrors how we attract, welcome, grow, care for, and stay connected with our people.')}</p>
            </div>
            <blockquote class="editorial-quote">
              <span class="editorial-quote-mark" aria-hidden="true">&ldquo;</span>
              <p class="editorial-quote-text">${T('ch1.s01.quote',"Our aim is simple: to make the Playbook practical for action and inspiring in spirit — so that every P&amp;C leader can translate Mandarin Oriental's culture of care into everyday decisions and Colleague experiences.")}</p>
            </blockquote>
          </div>
        </div>

        <!-- The Colleague Journey: an illustration of how P&C delivers the
             Colleague Experience across the lifecycle (not a navigation menu) -->
        <div class="journey">
          <div class="journey-head">
            <div class="feature-caption">${T('ch1.journey.caption','The Colleague Journey')}</div>
            <p class="journey-intro">${T('ch1.journey.intro','The Colleague Experience unfolds as one continuous journey. At every stage — and even beyond it — People &amp; Culture is the hand that delivers this experience, from the first hello to a lasting connection.')}</p>
          </div>
          <div class="journey-path">
            ${JOURNEY.map((s, i) => `
            <div class="journey-stage${i === JOURNEY.length - 1 ? ' journey-stage--last' : ''}">
              <div class="journey-media">
                <div class="journey-img" style="background-image:url('img/${s.img}');${s.pos ? `background-position:${s.pos};` : ''}"></div>
                <span class="journey-node">${ICONS[s.icon]}</span>
              </div>
              <div class="journey-step">Stage ${String(i + 1).padStart(2, '0')}</div>
              <div class="journey-stage-name">${s.stage}</div>
              <p class="journey-role">${s.role}</p>
            </div>`).join('')}
          </div>
          <p class="journey-foot">${T('ch1.journey.foot','People &amp; Culture&rsquo;s role is to deliver this experience — consistently, and with care — at every step of the journey.')}</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">02</span>
          <span class="txt">${T('ch1.s02.eyebrow','Who This Playbook Is For')}</span>
          <span class="rule"></span>
        </div>

        <div class="editorial-spread editorial-spread--reverse">
          <div class="editorial-col">
            <div class="editorial-body">
              <p class="drop">${T('ch1.s02.intro','This resource is written primarily for:')}</p>
            </div>
            <div class="bubble-list">
              <div class="bubble-item">
                <div class="bubble-media">
                  <div class="bubble-img" style="background-image:url('img/${T('ch1.s02.b1.img','ch_F_rewarding.jpg')}');"></div>
                  <span class="bubble-num">01</span>
                </div>
                <div class="bubble-body">
                  <h4 class="bubble-title">${T('ch1.s02.b1.title','People &amp; Culture leaders')}</h4>
                  <p class="bubble-text">${T('ch1.s02.b1.text','At hotel, regional, and corporate levels.')}</p>
                </div>
              </div>
              <div class="bubble-item">
                <div class="bubble-media">
                  <div class="bubble-img" style="background-image:url('img/${T('ch1.s02.b2.img','ch_D_operations.jpg')}');"></div>
                  <span class="bubble-num">02</span>
                </div>
                <div class="bubble-body">
                  <h4 class="bubble-title">${T('ch1.s02.b2.title','Support functions')}</h4>
                  <p class="bubble-text">${T('ch1.s02.b2.text','Such as Finance, and Operations — who partner with P&amp;C.')}</p>
                </div>
              </div>
            </div>
            <blockquote class="editorial-quote">
              <span class="editorial-quote-mark" aria-hidden="true">&ldquo;</span>
              <p class="editorial-quote-text">${T('ch1.s02.quote','It may also serve as a reference for any Colleague who wishes to understand how we nurture fairness, inclusion, and excellence across the Group.')}</p>
            </blockquote>
          </div>
          <figure class="editorial-figure">
            <div class="editorial-figure-img" style="background-image:url('img/${T('ch1.s02.img','opener_support.jpg')}');"></div>
            <figcaption class="editorial-figure-cap">${T('ch1.s02.cap','For those who shape the Colleague Experience')}</figcaption>
          </figure>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">03</span>
          <span class="txt">${T('ch1.s03.eyebrow','How to Use the Playbook')}</span>
          <span class="rule"></span>
        </div>
        <div class="editorial-spread">
          <figure class="editorial-figure editorial-figure--short">
            <div class="editorial-figure-img" style="background-image:url('img/${T('ch1.s03.img','opener_intro.jpg')}');"></div>
            <figcaption class="editorial-figure-cap">${T('ch1.s03.cap','Structured to be practical and intuitive')}</figcaption>
          </figure>
          <div class="editorial-col">
            <div class="editorial-body">
              <p class="drop">${T('ch1.s03.p1','The Playbook is structured to be practical and intuitive. Each section begins with the <strong>why</strong> — the purpose or belief behind the policy — followed by the <strong>what</strong> and <strong>how</strong>: the key standards and responsibilities. Resources are grouped by stage of the Colleague lifecycle, from Foundations to Leaving with Dignity &amp; Connection.')}</p>
            </div>
          </div>
        </div>

        <div class="feature-caption">${T('ch1.s03.stepsCaption','When consulting a resource')}</div>
        <div class="step-row">
          <div class="step-node">
            <div class="step-icon">${STEP_ICONS.purpose}<span class="step-index">i</span></div>
            <div class="step-title">${T('ch1.s03.step1.title','Purpose')}</div>
            <p class="step-text">${T('ch1.s03.step1.text','Start by reading its <strong>purpose</strong> — this explains the intent.')}</p>
          </div>
          <div class="step-node">
            <div class="step-icon">${STEP_ICONS.scope}<span class="step-index">ii</span></div>
            <div class="step-title">${T('ch1.s03.step2.title','Scope &amp; Responsibilities')}</div>
            <p class="step-text">${T('ch1.s03.step2.text',"Review the <strong>scope and responsibilities</strong> — who it applies to and what's expected.")}</p>
          </div>
          <div class="step-node">
            <div class="step-icon">${STEP_ICONS.local}<span class="step-index">iii</span></div>
            <div class="step-title">${T('ch1.s03.step3.title','Local Adaptation')}</div>
            <p class="step-text">${T('ch1.s03.step3.text','Refer to the <strong>local adaptation notes</strong> — these ensure compliance with country-specific laws and practices.')}</p>
          </div>
        </div>

        <div class="editorial-body">
          <p style="margin-top: 8px;">${T('ch1.s03.foot','Local P&amp;C teams may adapt policies, practices, and guidelines to meet legal or cultural needs, while remaining aligned with Group guidelines.')}</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">04</span>
          <span class="txt">${T('ch1.s04.eyebrow','Tone and Spirit')}</span>
          <span class="rule"></span>
        </div>
        <div class="editorial-spread">
          <figure class="editorial-figure">
            <div class="editorial-figure-img" style="background-image:url('img/${T('ch1.s04.img','intro_care.jpg')}');"></div>
            <figcaption class="editorial-figure-cap">${T('ch1.s04.cap','Care begins with our Colleagues')}</figcaption>
          </figure>
          <div class="editorial-col">
            <div class="editorial-body">
              <p class="drop">${T('ch1.s04.p1',"Every policy in this Playbook reflects our belief that <strong>care begins with our Colleagues</strong>. Our tone is human and respectful — clear enough for action, yet warm enough to remind us that every decision touches someone's experience.")}</p>
            </div>
            <blockquote class="editorial-quote">
              <span class="editorial-quote-mark" aria-hidden="true">&ldquo;</span>
              <p class="editorial-quote-text">${T('ch1.s04.quote','We invite you to approach these pages not as a rulebook, but as a living framework: a guide that evolves as we continue to learn, grow, and serve together.')}</p>
            </blockquote>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">05</span>
          <span class="txt">${T('ch1.s05.eyebrow','Understanding Symbols')}</span>
          <span class="rule"></span>
        </div>
        <p class="section-lead">${T('ch1.s05.lead',"To make this Playbook easier to read, we use a few simple symbols throughout to help you recognise what kind of information you're looking at and how to use it.")}</p>
        <div class="feature-caption">${T('ch1.s05.caption','The Four Symbols')}</div>
        <div class="symbol-legend symbol-legend--refined">
          <div class="symbol-item"><div class="sym">${SYM.policy}</div><div><h4>${T('ch1.s05.sym1.title','Global Policy')}</h4><p>${T('ch1.s05.sym1.text','Indicates a Group-wide policy that applies to all properties. Local versions must align with the guidelines outlined here.')}</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.guide}</div><div><h4>${T('ch1.s05.sym2.title','Guidelines')}</h4><p>${T('ch1.s05.sym2.text','Offers recommended practices that help interpret or apply Group policies consistently.')}</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.kit}</div><div><h4>${T('ch1.s05.sym3.title','Template / Toolkit')}</h4><p>${T('ch1.s05.sym3.text','Points to practical tools such as forms, checklists, and dashboards that support implementation.')}</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.xref}</div><div><h4>${T('ch1.s05.sym4.title','Cross-Reference')}</h4><p>${T('ch1.s05.sym4.text','Shows where another related policy or section may also apply.')}</p></div></div>
        </div>
      </div>

      ${chapterNavHTML('intro', 'ch-2')}
    </section>
  `;
}

// ---- CHAPTER II — ABOUT MO -----------------------------------------
function renderCh2() {
  return `
    <section class="chapter" id="ch-2">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch2.opener.bg','opener_about.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-2"]}</span>Chapter II</div></div>
              <div class="opener-eyebrow">${T('ch2.opener.eyebrow','The House')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch2.opener.title','About<br/>Mandarin Oriental')}</h1>
              <p class="opener-sub">${T('ch2.opener.sub','Our heritage, our people, and the leadership that guides everything from Hong Kong 1963 to today.')}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="editorial-spread editorial-spread--reverse">
          <div class="editorial-col">
            <div class="editorial-body">
              <p class="drop">${T('ch2.intro.p1',"Mandarin Oriental Hotel Group is internationally recognised for delivering some of the world's most distinctive luxury hospitality experiences. Renowned for its legendary service, refined design, and deep respect for local culture, the Group has built a reputation for creating memorable moments that reflect both global standards and a strong sense of place.")}</p>
              <p>${T('ch2.intro.p2','At Mandarin Oriental, it is our Colleagues who bring this vision to life. Through their professionalism, care, and attention to detail, they create the experiences that define the brand.')}</p>
              <p>${T('ch2.intro.p3','For this reason, the Colleague Experience sits at the heart of how we operate.')}</p>
            </div>
            <blockquote class="editorial-quote">
              <span class="editorial-quote-mark">&ldquo;</span>
              <p class="editorial-quote-text">${T('ch2.intro.quote','Directors of People &amp; Culture play a critical role in shaping environments where Colleagues feel supported, inspired, and empowered to deliver exceptional service.')}</p>
            </blockquote>
          </div>
          <figure class="editorial-figure">
            <div class="editorial-figure-img" style="background-image:url('img/${T('ch2.intro.img','about_foh.jpg')}');"></div>
            <figcaption class="editorial-figure-cap">${T('ch2.intro.cap','The Colleague Experience &middot; Front of house')}</figcaption>
          </figure>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow" id="heritage"><span class="num">01</span><span class="txt">${T('ch2.s01.eyebrow','Our Heritage')}</span><span class="rule"></span></div>
        <div class="cols-2">
          <div>
            <figure class="heritage-figure">
              <div class="heritage-figure-img" style="background-image:url('img/${T('ch2.s01.img','about_reception.jpg')}');"></div>
              <figcaption class="heritage-figure-cap">${T('ch2.s01.cap','A sense of place &middot; Colleagues at reception')}</figcaption>
            </figure>
            <p>${T('ch2.s01.p1',"Mandarin Oriental's story is rooted in two legendary hotels: The Mandarin in Hong Kong, which opened in 1963 as a symbol of modern luxury in the city, and The Oriental in Bangkok, which dates back to 1876 and became renowned for its heritage and service excellence.")}</p>
            <p>${T('ch2.s01.p2',"In 1974, Mandarin International Hotels acquired a significant stake in The Oriental, bringing together Hong Kong's spirit of innovation with Bangkok's rich hospitality tradition. This partnership evolved into a full merger in 1985, forming Mandarin Oriental Hotel Group under a unified brand and the now-iconic fan logo.")}</p>
            <p>${T('ch2.s01.p3','This heritage established the foundation for a global brand that blends Eastern elegance with world-class hospitality.')}</p>
          </div>
          <div class="timeline">
            <div class="timeline-item timeline-item--media">
              <div class="timeline-node"></div>
              <div class="timeline-text">
                <div class="timeline-year">1876</div>
                <div class="timeline-label">The Oriental · Bangkok</div>
                <div class="timeline-note">A legend of heritage and service excellence is born on the Chao Phraya.</div>
              </div>
              <figure class="timeline-media">
                <img src="img/heritage_bangkok_1876.jpg" alt="The Oriental Hotel, Bangkok, in its early years" loading="lazy">
              </figure>
            </div>
            <div class="timeline-item timeline-item--media">
              <div class="timeline-node"></div>
              <div class="timeline-text">
                <div class="timeline-year">1963</div>
                <div class="timeline-label">The Mandarin · Hong Kong</div>
                <div class="timeline-note">A new symbol of modern luxury opens in the heart of the city.</div>
              </div>
              <figure class="timeline-media">
                <img src="img/heritage_hongkong_1963.jpg" alt="The Mandarin, Hong Kong, rising above the harbour district" loading="lazy">
              </figure>
            </div>
            <div class="timeline-item">
              <div class="timeline-node"></div>
              <div class="timeline-text">
                <div class="timeline-year">1974</div>
                <div class="timeline-label">Two Legends Join</div>
                <div class="timeline-note">Mandarin International Hotels acquires a significant stake in The Oriental.</div>
              </div>
            </div>
            <div class="timeline-item timeline-item--media timeline-item--wide">
              <div class="timeline-node"></div>
              <div class="timeline-text">
                <div class="timeline-year">1985</div>
                <div class="timeline-label">Full Merger · Unified Brand</div>
                <div class="timeline-note">Mandarin Oriental Hotel Group is formed under the iconic fan.</div>
              </div>
              <figure class="timeline-media timeline-media--wide">
                <img src="img/heritage_merger_1985.jpg" alt="Dual roots: The Mandarin in Hong Kong and The Oriental in Bangkok unite under one brand" loading="lazy">
              </figure>
            </div>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">02</span><span class="txt">${T('ch2.s02.eyebrow','Global Presence')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch2.s02.p1',"Mandarin Oriental's portfolio spans hotels, resorts, residences, and Exceptional Homes in some of the world's most desirable destinations. Each property is designed to reflect its location, integrating local culture, heritage, and design into a contemporary luxury experience.")}</p>
        </div>

        <div class="portfolio-grid">
          <div class="portfolio-card">
            <div class="portfolio-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 41V15l15-8 15 8v26" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M6 41h36" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M16 41V25h5v16M27 41V25h5v16" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M21 17h6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="portfolio-name">Hotels</div>
            <div class="portfolio-desc">Landmark city addresses defined by legendary service.</div>
          </div>
          <div class="portfolio-card">
            <div class="portfolio-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 40h36" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M24 40V22" stroke="currentColor" stroke-width="1.1"/>
                <path d="M24 22c-7 0-12-4-12-9 6 0 12 3 12 9zM24 22c7 0 12-4 12-9-6 0-12 3-12 9z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M14 40c2-4 6-6 10-6s8 2 10 6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="portfolio-name">Resorts</div>
            <div class="portfolio-desc">Sanctuaries in the world's most sought-after destinations.</div>
          </div>
          <div class="portfolio-card">
            <div class="portfolio-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 41V11l14-4v34M38 41V19l-14-4" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M6 41h36" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M15 16v3M15 24v3M15 32v3M31 24v3M31 32v3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="portfolio-name">Residences</div>
            <div class="portfolio-desc">Branded homes with the assurance of hotel living.</div>
          </div>
          <div class="portfolio-card">
            <div class="portfolio-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 42V20l16-11 16 11v22" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M5 42h38" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M24 15.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="portfolio-name">Exceptional Homes</div>
            <div class="portfolio-desc">A curated collection of the rarest private retreats.</div>
          </div>
        </div>

        <div class="place-statement">
          <span class="place-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 36s12-9.6 12-19a12 12 0 1 0-24 0c0 9.4 12 19 12 19z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
              <circle cx="20" cy="17" r="4.4" stroke="currentColor" stroke-width="1.1"/>
            </svg>
          </span>
          <p class="place-text">${T('ch2.s02.place','Every Mandarin Oriental is shaped by its <em>sense of place</em> &mdash; each property reflecting the culture, heritage, and design of its own location to create a distinctly contemporary luxury experience.')}</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">03</span><span class="txt">${T('ch2.s03.eyebrow','Operations')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch2.s03.p1','Mandarin Oriental operates through a combination of owned and managed properties, ensuring consistency in brand standards across the Group. While each property reflects its unique destination, all operate within a shared commitment to service excellence, operational discipline, and continuous improvement.')}</p>
          <p>${T('ch2.s03.p2','This approach is supported by strong collaboration across functions, with People &amp; Culture playing a key role in developing talent, enabling performance, and sustaining the standards that define the Mandarin Oriental experience.')}</p>
        </div>

        <div class="ops-model">
          <div class="ops-model-head">The Operating Model</div>
          <div class="ops-pillars">
            <div class="ops-pillar">
              <div class="ops-icon">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="8" y="18" width="14" height="22" stroke="currentColor" stroke-width="1.1"/>
                  <path d="M26 40V12l14 6v22" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                  <path d="M5 40h38" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  <path d="M12 24h6M12 30h6M31 22v3M31 29v3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="ops-name">Owned &amp; Managed</div>
              <div class="ops-desc">A balanced portfolio operated to one consistent standard.</div>
            </div>
            <div class="ops-pillar">
              <div class="ops-icon">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M24 6l14 5v11c0 9-6 15-14 20-8-5-14-11-14-20V11z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                  <path d="M18 24l4 4 8-9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="ops-name">Brand Standards</div>
              <div class="ops-desc">Consistency in every detail, in every destination.</div>
            </div>
            <div class="ops-pillar">
              <div class="ops-icon">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M24 9l4.3 8.7 9.7 1.4-7 6.8 1.7 9.6L24 41l-8.6 4.5 1.7-9.6-7-6.8 9.7-1.4z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="ops-name">Service Excellence</div>
              <div class="ops-desc">A shared commitment that defines the experience.</div>
            </div>
            <div class="ops-pillar">
              <div class="ops-icon">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M38 14a17 17 0 1 0 3.4 12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  <path d="M39 8v8h-8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M24 16v8l6 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="ops-name">Continuous Improvement</div>
              <div class="ops-desc">Discipline and refinement, sustained over time.</div>
            </div>
          </div>
          <div class="ops-pc-band">
            <span class="ops-pc-icon" aria-hidden="true">
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="16" r="5" stroke="currentColor" stroke-width="1.1"/>
                <circle cx="29" cy="16" r="5" stroke="currentColor" stroke-width="1.1"/>
                <path d="M6 34c1.5-5 5-7.5 9-7.5s7.5 2.5 9 7.5M20 34c1.3-4.4 4.6-6.8 9-6.8s7.7 2.4 9 6.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
              </svg>
            </span>
            <p class="ops-pc-text"><span class="ops-pc-label">People &amp; Culture</span>&nbsp;connects every function &mdash; developing talent, enabling performance, and sustaining the standards that define the Mandarin Oriental experience.</p>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">04</span><span class="txt">${T('ch2.s04.eyebrow','Senior Management')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch2.s04.p1',"Mandarin Oriental's Senior Management team provides the strategic leadership that guides the Group's global operations. Working across hotels, residences and corporate functions, the team ensures alignment with the Group's vision, brand standards and long-term growth ambitions.")}</p>
          <p>${T('ch2.s04.p2','In close partnership with regional and hotel leadership teams, Senior Management supports operational excellence, consistent guest experiences and strong Colleague engagement across the portfolio. People &amp; Culture plays an important role in supporting this leadership through talent development, workforce planning and the cultivation of a strong and enduring service culture.')}</p>
        </div>

        <div class="leaders-grid">
          ${SENIOR_MGMT.map(l => `
            <div class="leader">
              <img class="leader-photo" src="img/${l.img}" alt="${l.name}" />
              <div class="leader-name">${l.name}</div>
              <div class="leader-role">${l.role}</div>
            </div>
          `).join('')}
        </div>
        <div class="leader-footnote">${T('ch2.s04.footnote','To learn more about Mandarin Oriental\'s Senior Management team, please visit <a href="https://www.mandarinoriental.com/en/our-company/senior-management" target="_blank" rel="noopener">mandarinoriental.com/en/our-company/senior-management</a>.')}</div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">05</span><span class="txt">${T('ch2.s05.eyebrow','Vice President &amp; Regional P&amp;C Leaders')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch2.s05.p1',"The Vice President and Regional People &amp; Culture Leaders play a key role in translating the Group's People &amp; Culture strategy into meaningful practices across regions and hotels. Working closely with business and hotel leadership teams, they help ensure that people decisions support operational excellence, sustainable growth and a consistent Colleague experience across Mandarin Oriental.")}</p>
          <p>${T('ch2.s05.p2',"Through their partnership with Directors of People &amp; Culture, they guide leadership capability, talent development and workforce planning across the Group's global portfolio.")}</p>
        </div>

        <div class="leaders-grid leaders-grid--pc">
          ${PC_LEADERS.map(l => `
            <div class="leader">
              <img class="leader-photo" src="img/${l.img}" alt="${l.name}" />
              <div class="leader-name">${l.name}</div>
              <div class="leader-role">${l.role}</div>
            </div>
          `).join('')}
        </div>
        <p style="text-align:center; font-family:'Avenir Next LT Pro'; font-style: italic; color: var(--ink-mute); margin-top: 32px;">${T('ch2.s05.foot',"Together, they provide strategic leadership for People &amp; Culture across Mandarin Oriental's global portfolio.")}</p>
      </div>

      <div class="spread">
        ${strategicVisionSpreadHTML()}
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">07</span><span class="txt">${T('ch2.s07.eyebrow','What We Believe')}</span><span class="rule"></span></div>
        <p class="beliefs-intro">${T('ch2.s07.intro','Select Vision, Mission or Values to explore what guides Mandarin Oriental.')}</p>
        ${beliefsTabsHTML()}
        <div class="editorial-body beliefs-values-note">
          <p>${T('ch2.s07.p1',"Mandarin Oriental's approach is guided by core values that shape every interaction with guests, Colleagues and partners. These values reflect the Group's commitment to exceptional service, continuous growth, collaboration, respect and responsible business practices.")}</p>
          <p>${T('ch2.s07.p2',"Across all Mandarin Oriental properties, these principles help ensure that every destination delivers a distinctive sense of place while maintaining the Group's global standards of excellence.")}</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">08</span><span class="txt">${T('ch2.s08.eyebrow','Within the Jardine Matheson Group')}</span><span class="rule"></span></div>
        <div class="cols-2">
          <div>
            <p>${T('ch2.s08.p1','Mandarin Oriental Hotel Group is part of the Jardine Matheson Group, a diversified international business group with a long-standing heritage in Asia.')}</p>
            <p>${T('ch2.s08.p2',"While Mandarin Oriental operates with its own brand identity, leadership and culture, it benefits from Jardine Matheson's long-term investment philosophy, strong governance framework and commitment to responsible business practices.")}</p>
          </div>
          <div>
            <p>${T('ch2.s08.p3',"Jardine Matheson operates through a network of listed companies and affiliated businesses supported by the Group's strategic oversight. The Group's leaders guide the broader Jardine Matheson organization.")}</p>
          </div>
        </div>

        <div class="board-block">
          <div class="board-heading">
            <span class="board-rule"></span>
            <span class="board-title">${T('ch2.s08.boardTitle','Board Leadership')}</span>
            <span class="board-rule"></span>
          </div>
          <div class="board-grid">
            <div class="board-card">
              <div class="board-role">Chairman</div>
              <img class="board-photo" src="img/board_keswick.jpg" alt="Ben Keswick, Chairman" loading="lazy" />
              <div class="board-name">Ben Keswick</div>
            </div>
            <div class="board-card">
              <div class="board-role">Group Managing Director</div>
              <img class="board-photo" src="img/board_pan.jpg" alt="Lincoln Pan, Group Managing Director" loading="lazy" />
              <div class="board-name">Lincoln Pan</div>
            </div>
            <div class="board-card">
              <div class="board-role">Group Finance Director</div>
              <img class="board-photo" src="img/board_baker.jpg" alt="Graham Baker, Group Finance Director" loading="lazy" />
              <div class="board-name">Graham Baker</div>
            </div>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">09</span><span class="txt">${T('ch2.s09.eyebrow','Our People &amp; Culture Strategy')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch2.s09.p1',"Mandarin Oriental's People &amp; Culture Strategy strengthens the Group's ability to deliver exceptional Colleague and guest experiences. It focuses on attracting outstanding talent, building capability, developing future leaders, and fostering a culture where wellbeing, inclusion and performance thrive together.")}</p>
          <p>${T('ch2.s09.p2',"Across all properties, People &amp; Culture works in partnership with business leaders to ensure that people decisions support Mandarin Oriental's strategy, values and long-term growth.")}</p>
          <p>${T('ch2.s09.p3','To support consistent execution across the Group, Mandarin Oriental provides tools and guidance to help hotels translate People &amp; Culture priorities into clear annual plans.')}</p>
        </div>
        <div style="max-width: 800px; margin: 32px auto 0;">
          ${policyListHTML([
            {
              s: 'kit',
              name: 'Hotel P&C Strategy Planning Template',
              blurb: 'Each hotel develops an annual P&C strategy aligned with Group priorities and regional guidance.',
              url: 'https://mohgl.sharepoint.com/:p:/r/sites/GlobalHRPP/Shared%20Documents/General/0.%20PathPoints/4.%20Files%20Linking%20to%20Playbook/II.%20About%20MO/P%26C%20Strategy%202026%20Template.pptx?d=w5d1c5cd5f0e34eeda763ceb15ce91326&csf=1&web=1&e=3PDo1g'
            },
            {
              s: 'kit',
              name: 'Hotel Organisation Chart',
              blurb: 'Reporting lines, team composition, and how roles connect across the business.',
              url: 'https://mohgl.sharepoint.com/sites/GlobalHRPP/Shared%20Documents/General/0.%20PathPoints/4.%20Resource%20Files%20Linking%20to%20Playbook/II.%20About%20MO/Hotel%20Organisation%20Chart.pdf'
            }
          ])}
        </div>
      </div>

      ${chapterNavHTML('ch-1', 'ch-3')}
    </section>
  `;
}

// ---- CHAPTER III — THE COLLEAGUE LIFECYCLE (with wheel) -----------
function renderCh3() {
  return `
    <section class="chapter" id="ch-3">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch3.opener.bg','opener_lifecycle.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-3"]}</span>Chapter III</div></div>
              <div class="opener-eyebrow">${T('ch3.opener.eyebrow','The Colleague Lifecycle')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch3.opener.title',"Leading Through<br/>the Colleague<br/><em style=\"font-family:'MO Exceptional'; font-weight:400;\">Lifecycle</em>")}</h1>
              <p class="opener-sub">${T('ch3.opener.sub','How People &amp; Culture drives consistency, care, and compliance across each stage — from attracting talent to leaving with connection.')}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="editorial-body">
          <p>${T('ch3.intro.p1','Our People Philosophy defines who we are. The Colleague Lifecycle shows how we bring that philosophy to life.')}</p>
          <p>${T('ch3.intro.p2','This playbook follows the key touchpoints of the Colleague lifecycle at Mandarin Oriental — from attracting talent and welcoming new Colleagues, to developing capabilities, supporting Colleague wellbeing, and maintaining meaningful connections even after Colleagues move on.')}</p>
          <p>${T('ch3.intro.p3',"This section brings together the Group's key People &amp; Culture resources and practices, organised around the Colleague journey. For each stage, you will find the governance, tools and guidance that help P&amp;C leaders support both business priorities and the Colleague experience.")}</p>
        </div>
      </div>

      <!-- THE WHEEL — anchor menu -->
      <div class="wheel-spread">
        <div class="section-eyebrow" style="max-width: 720px; margin: 0 auto 24px;">
          <span class="num">◈</span>
          <span class="txt">${T('ch3.wheel.eyebrow','The Colleague Lifecycle · Eight Stages')}</span>
          <span class="rule"></span>
        </div>
        <p class="spread-lede center" style="max-width: 640px; margin: 0 auto 12px;">${T('ch3.wheel.lede','Select any stage to explore its governance, tools, and guidance.')}</p>

        <div class="wheel-layout">
          <div class="wheel-wrap">
            ${buildWheelSVG()}
          </div>

          <div class="wheel-caption" id="wheelCaption" aria-live="polite">
            <div class="wheel-caption-inner wheel-caption--rest" data-state="rest">
              <div class="wheel-caption-eyebrow">${T('ch3.wheel.restEyebrow','Eight Stages')}</div>
              <h3 class="wheel-caption-title">${T('ch3.wheel.restTitle','Explore the Colleague Lifecycle')}</h3>
              <p class="wheel-caption-desc">${T('ch3.wheel.restDesc','Hover over a stage on the wheel to preview it — or tap a stage to see its focus, then open it in full.')}</p>
            </div>
            ${LIFECYCLE.map((s, i) => `
              <div class="wheel-caption-inner" data-sub="${s.id}" hidden>
                <div class="wheel-caption-icon">${ICONS[s.id]}</div>
                <div class="wheel-caption-eyebrow">${s.letter} · 0${i+1} · Colleague Lifecycle</div>
                <h3 class="wheel-caption-title">${esc(s.label)}</h3>
                <p class="wheel-caption-desc">${esc(s.lede)}</p>
                <button class="wheel-caption-cta" data-goto="ch-3" data-sub="${s.id}">${T('ch3.wheel.cta','Explore this stage')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Sub-chapters render here -->
      <div id="subContainer">
        ${LIFECYCLE.map(sub => renderSubChapter(sub)).join('')}
      </div>

      ${chapterNavHTML('ch-2', 'ch-4')}
    </section>
  `;
}

function buildWheelSVG() {
  // 8-segment wheel, ordered clockwise from top-right
  // Colors: cream/wheat spectrum matching Behance mockup
  const stages = LIFECYCLE.map((s, i) => ({ ...s, idx: i }));
  const cx = 300, cy = 300, rOuter = 250, rInner = 130;
  const N = 8;
  const paletteWheel = ['#E8DFCC','#DDCDA6','#C8A874','#B08544','#8F6D3F','#B08544','#C8A874','#DDCDA6'];

  const arcs = stages.map((s, i) => {
    const startAngle = (i * 360 / N) - 90 - (360 / N / 2);
    const endAngle   = ((i + 1) * 360 / N) - 90 - (360 / N / 2);
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
    const p1 = polar(cx, cy, rOuter, startAngle);
    const p2 = polar(cx, cy, rOuter, endAngle);
    const p3 = polar(cx, cy, rInner, endAngle);
    const p4 = polar(cx, cy, rInner, startAngle);
    const d = `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
    const midAngle = (startAngle + endAngle) / 2;
    const labelPos = polar(cx, cy, (rOuter + rInner) / 2, midAngle);
    const letterPos = polar(cx, cy, rOuter - 22, midAngle);
    return { d, fill: paletteWheel[i], label: s.label.split(' ').slice(0,1).join(' '), letter: s.letter, labelPos, letterPos, id: s.id };
  });

  return `
    <svg class="wheel-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="wheelShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0d0b08" flood-opacity="0.08"/>
        </filter>
      </defs>
      <g filter="url(#wheelShadow)">
        ${arcs.map(a => `<path class="wheel-slice" d="${a.d}" fill="${a.fill}" stroke="#ffffff" stroke-width="2" data-sub="${a.id}" tabindex="0" role="button" aria-label="${esc(labelFor(a.id))} — explore this stage"/>`).join('')}
      </g>
      ${arcs.map(a => `
        <text class="wheel-letter" x="${a.letterPos.x}" y="${a.letterPos.y}" text-anchor="middle" dominant-baseline="middle">${a.letter}</text>
        <text class="wheel-label" x="${a.labelPos.x}" y="${a.labelPos.y}" text-anchor="middle" dominant-baseline="middle">${labelFor(a.id)}</text>
      `).join('')}
      <!-- center disc -->
      <circle cx="300" cy="300" r="118" fill="#FAF9F6" stroke="#C9A879" stroke-width="1"/>
      <text x="300" y="278" text-anchor="middle" font-family="Avenir Next LT Pro" font-size="11" letter-spacing="3" fill="#6b625a">THE COLLEAGUE</text>
      <text x="300" y="306" text-anchor="middle" font-family="MO Exceptional" font-size="30" font-style="italic" font-weight="500" fill="#0d0b08">Lifecycle</text>
      <text x="300" y="330" text-anchor="middle" font-family="Avenir Next LT Pro" font-size="10" letter-spacing="3" fill="#6b625a">EIGHT STAGES</text>
    </svg>
  `;
}
function labelFor(id) {
  const map = {
    'sub-A':'Integrity','sub-B':'Attracting','sub-C':'Onboarding',
    'sub-D':'Operations','sub-E':'Experience','sub-F':'Rewarding',
    'sub-G':'Developing','sub-H':'Leaving'
  };
  return map[id] || '';
}
function polar(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function renderSubChapter(sub) {
  const c = PB_LIFECYCLE_CONTENT[sub.id];
  const heroLede = (c && c.tagline) ? c.tagline : sub.lede;
  const theme = sectionIcon(sub.label);
  const hasPhil = !!(c && c.philosophy && c.philosophy.paras && c.philosophy.paras.length);
  const hasIntro = !!(c && c.intro && c.intro.length);
  const introHasEnsure = hasIntro && c.intro.some(p => /:\s*$/.test(p));
  // Build the intro/philosophy design-language block.
  let introBlock = '';
  if (hasPhil) {
    // Standard case: a dedicated philosophy → two-column iconography spread,
    // preceded by any plain intro paragraphs.
    if (hasIntro) introBlock += subIntroHTML({ intro: c.intro });
    introBlock += philosophyHTML(c, sub.lede, theme);
  } else if (introHasEnsure) {
    // No separate philosophy but the intro carries a "role is to ensure" list
    // (e.g. sub-A). Render the intro itself as the two-column iconography spread.
    introBlock += philosophyHTML({ philosophy: { title: 'Governance & Standards', paras: c.intro } }, sub.lede, theme);
  } else if (hasIntro) {
    introBlock += subIntroHTML({ intro: c.intro });
  } else {
    introBlock += philosophyHTML(c, sub.lede, theme);
  }
  return `
    <div class="sub-chapter" id="${sub.id}" style="scroll-margin-top: 90px;">
      <div class="sub-hero" style="margin-top: 24px;">
        <img class="sub-hero-img" src="img/${sub.img}" alt="${esc(sub.label)}" />
        <div class="sub-hero-caption">
          <div class="letter">${sub.letter}</div>
          <div class="title-block">
            <div class="eyebrow"><span class="eyebrow-icon">${ICONS[sub.id]}</span>Colleague Lifecycle · Stage ${sub.letter}</div>
            <h2>${esc(sub.label)}</h2>
            <div class="sub-lede">${esc(heroLede)}</div>
          </div>
        </div>
      </div>
      <div class="spread tight">
        ${introBlock}
        ${c ? c.sections.map(sectionHTML).join('') : ''}
      </div>
    </div>
  `;
}

// ---- CHAPTER IV — PRE-OPENING --------------------------------------
function renderCh4() {
  return `
    <section class="chapter" id="ch-4">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch4.opener.bg','opener_preopen.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-4"]}</span>Chapter IV</div></div>
              <div class="opener-eyebrow">${T('ch4.opener.eyebrow','Openings')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch4.opener.title','Pre-Opening<br/>Hotels')}</h1>
              <p class="opener-sub">${T('ch4.opener.sub','The tools and frameworks that ensure every new property opens with a fully-realised People &amp; Culture foundation.')}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="spread">
        ${PB_CH4_CONTENT.intro && PB_CH4_CONTENT.intro.length ? subIntroHTML({ intro: PB_CH4_CONTENT.intro }) : ''}
        ${ch4PhilosophySpreadHTML(PB_CH4_CONTENT, 'preopen_table.jpg', 'The Colleague Experience · Setting the stage')}
      </div>
      ${editorialBandHTML(T('ch4.band.img','journey_welcome.jpg'), T('ch4.band.title','The Pre-Opening Journey'), T('ch4.band.text','Building the People & Culture foundation of a new hotel, Colleague by Colleague.'), true)}
      <div class="spread">
        ${PB_CH4_CONTENT.sections.map((sec, i) => i === 0 ? ch4Section1HTML(sec) : sectionHTML(sec)).join('')}
      </div>
      ${chapterNavHTML('ch-3', 'ch-5')}
    </section>
  `;
}

// ---- CHAPTER V — AUDIT ---------------------------------------------
function renderCh5() {
  return `
    <section class="chapter" id="ch-5">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch5.opener.bg','opener_audit.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-5"]}</span>Chapter V</div></div>
              <div class="opener-eyebrow">${T('ch5.opener.eyebrow','Governance')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch5.opener.title','P&amp;C<br/>Audit')}</h1>
              <p class="opener-sub">${T('ch5.opener.sub','Self-assessment, governance and escalation frameworks that keep People Operations disciplined at every property.')}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="spread">
        ${PB_CH5_CONTENT.intro && PB_CH5_CONTENT.intro.length ? ch5AuditIntroHTML(PB_CH5_CONTENT) : ''}
        ${editorialBandHTML(T('ch5.band.img','colleagues_group.jpg'), T('ch5.band.title','A Shared Standard'), T('ch5.band.text','Governance exists to protect the Colleague experience at every property.'))}
        ${PB_CH5_CONTENT.sections.map(sectionHTML).join('')}
      </div>
      ${chapterNavHTML('ch-4', 'ch-6')}
    </section>
  `;
}

// ---- CHAPTER VI — STAYING CONNECTED --------------------------------
function renderCh6() {
  return `
    <section class="chapter" id="ch-6">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/${T('ch6.opener.bg','opener_support.jpg')}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-6"]}</span>Chapter VI</div></div>
              <div class="opener-eyebrow">${T('ch6.opener.eyebrow','Closing')}</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${T('ch6.opener.title','Staying Connected<br/>&amp; Supported')}</h1>
              <p class="opener-sub">${T('ch6.opener.sub','Confidentiality, authorship, and how this Playbook continues to evolve with the Group.')}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="eyebrow-icon" aria-hidden="true">${SECTION_ICONS.data}</span><span class="num">01</span><span class="txt">${T('ch6.s01.eyebrow','Confidentiality &amp; Use')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch6.s01.p1','This Playbook is an internal Mandarin Oriental resource. It is intended for the exclusive use of Colleagues and authorised partners. Its content, tools and templates should not be shared externally without formal approval from Group People &amp; Culture.')}</p>
        </div>
        ${editorialBandHTML(T('ch6.band.img','journey_stay.jpg'), T('ch6.band.title','Connected & Supported'), T('ch6.band.text','Every Colleague remains part of the Mandarin Oriental community.'))}
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="eyebrow-icon" aria-hidden="true">${SECTION_ICONS.develop}</span><span class="num">02</span><span class="txt">${T('ch6.s02.eyebrow','Authorship &amp; Development')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch6.s02.p1','The Playbook is developed and maintained by the Group People &amp; Culture team in collaboration with Regional People &amp; Culture leaders and cross-functional partners. It draws on Group policies, guidelines, tools and templates that have been reviewed and endorsed for consistent adoption across the portfolio.')}</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="eyebrow-icon" aria-hidden="true">${SECTION_ICONS.governance}</span><span class="num">03</span><span class="txt">${T('ch6.s03.eyebrow','Disclaimer')}</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>${T('ch6.s03.p1','This Playbook offers a Group-level reference framework. It does not replace local labour laws, regulations, or country-specific requirements. Local People &amp; Culture teams remain responsible for ensuring compliance with all applicable legal and regulatory obligations in their markets.')}</p>
        </div>
        <figure class="section-quote section-quote--closing">
          <span class="section-quote-mark" aria-hidden="true">“</span>
          <blockquote class="section-quote-text">${T('ch6.s03.quote','A living framework — evolving as we continue to learn, grow, and serve together.')}</blockquote>
          <span class="section-quote-flourish" aria-hidden="true"></span>
        </figure>
      </div>

      ${chapterNavHTML('ch-5', null)}
    </section>
  `;
}

// ---- CHAPTER NAV (bottom) ------------------------------------------
function chapterNavHTML(prevId, nextId) {
  const prev = prevId ? CHAPTERS.find(c => c.id === prevId) : null;
  const next = nextId ? CHAPTERS.find(c => c.id === nextId) : null;
  return `
    <div class="chapter-nav">
      ${prev ? `
        <button class="nav-btn" data-goto="${prev.id}">
          <div class="eyebrow">← Previous</div>
          <div class="title">${prev.numeral ? prev.numeral + ' · ' : ''}${prev.label}</div>
        </button>
      ` : '<div></div>'}
      ${next ? `
        <button class="nav-btn right" data-goto="${next.id}">
          <div class="eyebrow">Next →</div>
          <div class="title">${next.numeral ? next.numeral + ' · ' : ''}${next.label}</div>
        </button>
      ` : '<div></div>'}
    </div>
  `;
}

/* =================================================================
   RENDER + WIRE
   ================================================================= */
function renderRail() {
  const list = document.getElementById('chapterList');
  list.innerHTML = CHAPTERS.map(c => `
    <li>
      <button class="rail-link" data-goto="${c.id}" data-chapter="${c.id}">
        <span class="rail-numeral">${c.numeral || ''}</span>
        <span>${c.label}</span>
      </button>
      ${c.hasSubs ? `
        <ul class="rail-sub" data-parent="${c.id}">
          ${LIFECYCLE.map(s => `<li><button data-goto="${c.id}" data-sub="${s.id}" data-letter="${s.letter}"><span>${s.label}</span></button></li>`).join('')}
        </ul>
      ` : ''}
    </li>
  `).join('');
}

// ---- VISUAL CONTENTS MENU ------------------------------------------
function renderMenu() {
  const chapterCards = CHAPTERS.filter(c => c.id !== 'cover' && c.id !== 'letter' && c.id !== 'intro').map(c => `
    <button class="menu-card" data-goto="${c.id}">
      <div class="menu-card-img"><img src="img/${c.opener}" alt="${c.label}" loading="lazy" /></div>
      <div class="menu-card-body">
        <div class="menu-card-eyebrow">${ICONS[c.id] ? `<span class="menu-card-icon">${ICONS[c.id]}</span>` : ''}${c.numeral ? 'Chapter ' + c.numeral : (c.isVideo ? 'Welcome Film' : 'Foreword')}</div>
        <div class="menu-card-title">${c.label}</div>
        <div class="menu-card-desc">${MENU_DESC[c.id] || ''}</div>
      </div>
    </button>
  `).join('');

  return `
    <section class="chapter" id="menu">
      <div class="spread">
        <div class="spread-header">
          <div class="running-mini">${T('menu.running','People &amp; Culture')}</div>
          <div class="center-rule"></div>
          <h2 class="spread-title center">${T('menu.title','Explore our Playbook')}</h2>
          <p class="spread-lede center">${T('menu.lede','Globally Defined &middot; Regionally Governed &middot; Locally Executed')}</p>
        </div>
        <div class="menu-grid">${chapterCards}</div>
      </div>
    </section>
  `;
}

// Chapter type, mirroring the editor's chapterType() (seed chapters carry no
// explicit type, so ids fall back to the legacy mapping).
function chapterTypeOf(ch) {
  if (ch.type) return ch.type;
  if (ch.id === 'cover') return 'cover';
  if (ch.id === 'intro') return 'intro-video';
  if (ch.id === 'ch-1') return 'letter';
  if (ch.hasSubs) return 'lifecycle';
  if (ch.id === 'ch-2') return 'directory';
  return 'standard';
}

// Per-chapter section bodies. The seed's two bespoke bodies stay on
// PB.ch4 / PB.ch5; chapters created in the editor store theirs under
// PB.sectionBodies[chapterId].
function chapterBodyFor(ch) {
  if (ch.id === 'ch-4') return PB_CH4_CONTENT;
  if (ch.id === 'ch-5') return PB_CH5_CONTENT;
  return (PB.sectionBodies && PB.sectionBodies[ch.id]) || { intro: [], sections: [] };
}

// Generic magazine-style chapter page, used for any chapter that has no
// bespoke (seed) renderer — i.e. everything authored from a blank playbook.
function renderGenericChapter(ch, prevId, nextId) {
  const type = chapterTypeOf(ch);
  const prefix = ch.id.replace('ch-', 'ch'); // prose key convention: ch-7 -> ch7
  const bg = T(prefix + '.opener.bg', '');
  const title = T(prefix + '.opener.title', '') || esc(ch.label || '');
  const sub = T(prefix + '.opener.sub', ch.opener || '');
  const eyebrow = T(prefix + '.opener.eyebrow', '');
  const backBtn = '<button class="opener-back" data-goto="menu" aria-label="Back to Contents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Contents</button>';
  const numeral = ch.numeral ? 'Chapter ' + esc(ch.numeral) : '';

  const opener = bg
    ? `<div class="opener">
        <div class="opener-hero" style="background-image: url('img/${bg}');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-top-left">${backBtn}<div class="opener-numeral">${numeral}</div></div>
              ${eyebrow ? `<div class="opener-eyebrow">${eyebrow}</div>` : ''}
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">${title}</h1>
              ${sub ? `<p class="opener-sub">${sub}</p>` : ''}
            </div>
          </div>
        </div>
      </div>`
    : `<div class="opener">
        <div style="padding: 56px 6vw 34px; border-bottom: 1px solid var(--rule); background: var(--paper-warm);">
          <div class="opener-top-left" style="display:flex; align-items:center; gap:18px;">${backBtn}<div class="opener-numeral">${numeral}</div></div>
          ${eyebrow ? `<div class="opener-eyebrow" style="margin-top:26px;">${eyebrow}</div>` : ''}
          <h1 class="opener-title" style="color:var(--ink); margin:10px 0 0;">${title}</h1>
          ${sub ? `<p class="opener-sub" style="color:var(--ink-mute); margin:12px 0 0; max-width:640px;">${sub}</p>` : ''}
        </div>
      </div>`;

  let body = '';
  if (type === 'lifecycle') {
    body = LIFECYCLE.map(s => {
      const c = PB_LIFECYCLE_CONTENT[s.id] || { sections: [] };
      return `
        <div class="spread tight" id="${esc(s.id)}">
          <div class="section-eyebrow"><span class="txt">${esc((s.letter ? s.letter + '. ' : '') + (s.label || ''))}</span><span class="rule"></span></div>
          ${s.lede ? `<div class="editorial-body"><p>${esc(s.lede)}</p></div>` : ''}
          ${(c.sections || []).map(sectionHTML).join('')}
        </div>`;
    }).join('');
  } else if (type === 'directory') {
    body = `
      <div class="spread">
        <div class="section-eyebrow"><span class="txt">${T(prefix + '.people.eyebrow', 'Senior Management')}</span><span class="rule"></span></div>
        <div class="leaders-grid">
          ${SENIOR_MGMT.map(l => `
            <div class="leader">
              <img class="leader-photo" src="img/${l.img}" alt="${esc(l.name)}" />
              <div class="leader-name">${esc(l.name)}</div>
              <div class="leader-role">${esc(l.role)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="spread">
        <div class="section-eyebrow"><span class="txt">${T(prefix + '.leaders.eyebrow', 'P&C Leaders')}</span><span class="rule"></span></div>
        <div class="leaders-grid leaders-grid--pc">
          ${PC_LEADERS.map(l => `
            <div class="leader">
              <img class="leader-photo" src="img/${l.img}" alt="${esc(l.name)}" />
              <div class="leader-name">${esc(l.name)}</div>
              <div class="leader-role">${esc(l.role)}</div>
            </div>`).join('')}
        </div>
      </div>
      ${BELIEFS && BELIEFS.length ? `<div class="spread tight">${beliefsTabsHTML()}</div>` : ''}`;
  } else {
    const b = chapterBodyFor(ch);
    body = `<div class="spread">
      ${b.intro && b.intro.length ? subIntroHTML({ intro: b.intro }) : ''}
      ${(b.sections || []).map(sectionHTML).join('')}
    </div>`;
  }

  return `
    <section class="chapter" id="${esc(ch.id)}">
      ${opener}
      ${body}
      ${chapterNavHTML(prevId, nextId)}
    </section>`;
}

function renderAll() {
  const reader = document.getElementById('reader');
  const parts = [renderCover(), renderIntro(), renderMenu()];
  // Bespoke seed renderers are used only when this playbook actually carries
  // seed prose; blank-authored playbooks take the generic path for every
  // chapter so no seed wording leaks through.
  const seedLike = PB.prose && Object.keys(PB.prose).length > 0;
  const BESPOKE = { 'ch-1': renderCh1, 'ch-2': renderCh2, 'ch-3': renderCh3, 'ch-4': renderCh4, 'ch-5': renderCh5, 'ch-6': renderCh6 };
  const realChs = CHAPTERS.filter(c => c.id !== 'cover' && c.id !== 'intro' && c.id !== 'menu');
  realChs.forEach((ch, i) => {
    const prev = realChs[i - 1], next = realChs[i + 1];
    if (seedLike && BESPOKE[ch.id]) parts.push(BESPOKE[ch.id]());
    else parts.push(renderGenericChapter(ch, prev ? prev.id : null, next ? next.id : null));
  });
  reader.innerHTML = parts.join('');
  resolveAssets(reader);
}

// Replace img/<filename> references with uploaded data URLs held in
// PLAYBOOK.assets. When assets is empty (the seed) this is a no-op, so render
// parity with the original design is preserved exactly. Keys may be either the
// bare filename ("cover_colleagues.jpg") or the full relative path
// ("img/cover_colleagues.jpg").
function assetFor(path) {
  var a = PB.assets || {};
  if (a[path]) return a[path];
  var bare = path.replace(/^img\//, '');
  if (a['img/' + bare]) return a['img/' + bare];
  if (a[bare]) return a[bare];
  return null;
}
function resolveAssets(root) {
  if (!PB.assets || !Object.keys(PB.assets).length) return;
  // background-image styles
  root.querySelectorAll('[style*="img/"]').forEach(function (el) {
    var m = el.getAttribute('style');
    el.setAttribute('style', m.replace(/url\((['"]?)img\/([^'")]+)\1\)/g, function (full, q, fn) {
      var u = assetFor('img/' + fn);
      return u ? "url('" + u + "')" : full;
    }));
  });
  // <img src="img/...">
  root.querySelectorAll('img[src^="img/"]').forEach(function (el) {
    var u = assetFor(el.getAttribute('src'));
    if (u) el.setAttribute('src', u);
  });
  // <video>/<source src="video/..."> and poster attributes
  root.querySelectorAll('video[src^="video/"],source[src^="video/"]').forEach(function (el) {
    var u = assetFor(el.getAttribute('src'));
    if (u) el.setAttribute('src', u);
  });
}

// ---- Navigation ----------------------------------------------------
let currentChapter = 'cover';

function goTo(chapterId, subId) {
  document.querySelectorAll('.chapter').forEach(c => c.classList.remove('on'));
  const el = document.getElementById(chapterId);
  if (el) el.classList.add('on');
  currentChapter = chapterId;

  // rail active state
  document.querySelectorAll('.rail-link').forEach(b => b.classList.toggle('active', b.dataset.chapter === chapterId));
  document.querySelectorAll('.rail-sub').forEach(u => u.classList.toggle('on', u.dataset.parent === chapterId));
  document.querySelectorAll('.rail-sub button').forEach(b => b.classList.toggle('active', b.dataset.sub === subId));

  // scroll
  requestAnimationFrame(() => {
    if (subId) {
      const s = document.getElementById(subId);
      if (s) { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // close mobile rail
  document.getElementById('rail').classList.remove('on');

  // hide the floating Contents button while on the menu, cover or intro
  const fab = document.getElementById('menuFab');
  if (fab) fab.classList.toggle('hidden', chapterId === 'menu' || chapterId === 'cover' || chapterId === 'intro');

  // Full-screen immersive pages (cover + intro video): hide the top bar & side
  // rail so the page fills the viewport like a magazine — chrome is restored the
  // moment you continue into the Contents.
  document.body.classList.toggle('on-cover', chapterId === 'cover' || chapterId === 'intro');

  // Manage the intro video: autoplay WITH SOUND when arriving (arriving here is
  // always via a user click on “Explore”, which satisfies browser autoplay
  // policies). If a browser still blocks audio, fall back to muted playback so
  // the video at least plays, and let the user unmute via the controls.
  const introVideo = document.querySelector('#intro .intro-video');
  if (introVideo) {
    if (chapterId === 'intro') {
      introVideo.currentTime = 0;
      introVideo.muted = false;
      introVideo.volume = 1;
      const p = introVideo.play();
      if (p && p.catch) {
        p.catch(() => {
          introVideo.muted = true;
          const p2 = introVideo.play();
          if (p2 && p2.catch) p2.catch(() => {});
        });
      }
    } else {
      introVideo.pause();
    }
  }
}

// ---- Search --------------------------------------------------------
function buildSearchIndex() {
  const idx = [];
  CHAPTERS.forEach(c => {
    if (c.id === 'cover' || c.id === 'intro') return;
    idx.push({ chapter: c.id, sub: null, title: c.numeral ? `${c.numeral}. ${c.label}` : c.label, crumb: c.numeral ? 'Chapter' : 'Foreword', text: c.label });
  });
  LIFECYCLE.forEach(s => {
    idx.push({ chapter: 'ch-3', sub: s.id, title: `${s.letter}. ${s.label}`, crumb: 'Lifecycle', text: s.label + ' ' + s.lede });
    const c = PB_LIFECYCLE_CONTENT[s.id];
    if (c) c.sections.forEach(sec => {
      idx.push({ chapter: 'ch-3', sub: s.id, title: sec.title, crumb: `${s.letter}. ${s.label}`, text: sec.title });
      sec.items.forEach(it => idx.push({
        chapter: 'ch-3', sub: s.id, title: it.name,
        crumb: `${s.letter}. ${s.label} · ${sec.title}`,
        text: it.name + ' ' + symLabel(it.s) + ' ' + (it.blurb || '')
      }));
    });
  });
  CH4_SECTIONS.forEach(sec => {
    idx.push({ chapter: 'ch-4', sub: null, title: sec.title, crumb: 'Pre-Opening', text: sec.title });
    sec.items.forEach(it => idx.push({ chapter: 'ch-4', sub: null, title: it.name, crumb: `Pre-Opening · ${sec.title}`, text: it.name + ' ' + (it.blurb || '') }));
  });
  CH5_SECTIONS.forEach(sec => {
    idx.push({ chapter: 'ch-5', sub: null, title: sec.title, crumb: 'P&C Audit', text: sec.title });
    sec.items.forEach(it => idx.push({ chapter: 'ch-5', sub: null, title: it.name, crumb: `P&C Audit · ${sec.title}`, text: it.name + ' ' + (it.blurb || '') }));
  });
  return idx;
}

let SEARCH_IDX = [];
function initSearch() {
  SEARCH_IDX = buildSearchIndex();
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let selIdx = -1;

  function runSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) { results.classList.remove('on'); return; }
    const hits = SEARCH_IDX.filter(e => e.text.toLowerCase().includes(q)).slice(0, 12);
    if (!hits.length) {
      results.innerHTML = `<div class="search-result"><div class="sr-title">No results</div><div class="sr-crumb">Try a different term</div></div>`;
    } else {
      results.innerHTML = hits.map((h, i) => `
        <div class="search-result" data-chapter="${h.chapter}" data-sub="${h.sub||''}" data-i="${i}">
          <div class="sr-title">${highlight(h.title, q)}</div>
          <div class="sr-crumb">${h.crumb}</div>
        </div>
      `).join('');
      selIdx = -1;
    }
    results.classList.add('on');
  }

  input.addEventListener('input', e => runSearch(e.target.value));
  input.addEventListener('focus', e => { if (e.target.value) runSearch(e.target.value); });
  document.addEventListener('click', e => {
    if (!e.target.closest('#searchBox')) results.classList.remove('on');
  });
  results.addEventListener('click', e => {
    const r = e.target.closest('.search-result');
    if (!r || !r.dataset.chapter) return;
    goTo(r.dataset.chapter, r.dataset.sub || undefined);
    input.value = '';
    results.classList.remove('on');
  });
  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.search-result[data-chapter]');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = Math.min(selIdx + 1, items.length - 1); updateSel(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); updateSel(items); }
    else if (e.key === 'Enter' && selIdx >= 0) { e.preventDefault(); items[selIdx].click(); }
    else if (e.key === 'Escape') { results.classList.remove('on'); input.blur(); }
  });
  function updateSel(items) {
    items.forEach((el, i) => el.classList.toggle('sel', i === selIdx));
    if (selIdx >= 0) items[selIdx].scrollIntoView({ block: 'nearest' });
  }

  // ⌘K / Ctrl-K
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); input.focus(); input.select();
    }
  });
}
function highlight(text, q) {
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return text.replace(re, '<mark>$1</mark>');
}

// ---- Bookmarks (session only) -------------------------------------
let bookmarks = [];
function updateBookmarkCount() {
  const el = document.getElementById('bookmarkCount');
  if (el) el.textContent = bookmarks.length;
}

// ---- Progress bar -------------------------------------------------
function initProgress() {
  const bar = document.getElementById('progress');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ---- Global click wiring ------------------------------------------
// Reveal a stage's description in the wheel caption panel (hover/focus/tap).
function showWheelCaption(subId) {
  const cap = document.getElementById('wheelCaption');
  if (!cap) return;
  cap.querySelectorAll('.wheel-caption-inner').forEach(el => {
    el.hidden = (el.dataset.sub !== subId) && !(subId === null && el.dataset.state === 'rest');
  });
  document.querySelectorAll('.wheel-slice').forEach(sl => {
    sl.classList.toggle('is-active', sl.dataset.sub === subId);
  });
}

function wireEvents() {
  // Wheel: preview a stage's description on hover / keyboard focus (desktop).
  const wheelLayout = () => document.querySelector('.wheel-layout');
  document.addEventListener('mouseover', e => {
    const slice = e.target.closest('.wheel-slice');
    if (slice && slice.dataset.sub && window.matchMedia('(hover: hover)').matches) {
      showWheelCaption(slice.dataset.sub);
    }
  });
  document.addEventListener('mouseout', e => {
    const slice = e.target.closest('.wheel-slice');
    const wl = wheelLayout();
    if (slice && wl && window.matchMedia('(hover: hover)').matches) {
      // Only reset when the pointer leaves the wheel entirely.
      const to = e.relatedTarget;
      if (!to || !to.closest || !to.closest('.wheel-layout')) showWheelCaption(null);
    }
  });
  document.addEventListener('focusin', e => {
    const slice = e.target.closest('.wheel-slice');
    if (slice && slice.dataset.sub) showWheelCaption(slice.dataset.sub);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const slice = e.target.closest && e.target.closest('.wheel-slice');
    if (slice && slice.dataset.sub) { e.preventDefault(); goTo('ch-3', slice.dataset.sub); }
  });

  document.addEventListener('click', e => {
    // accordion toggle (expandable subheading)
    const toggle = e.target.closest('.policy-item-toggle');
    if (toggle) {
      const item = toggle.closest('.policy-item.accordion');
      const panel = item.querySelector('.policy-item-panel');
      const open = item.getAttribute('data-open') === 'true';
      item.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (open) { panel.hidden = true; }
      else { panel.hidden = false; }
      return;
    }
    // Vision / Mission / Values interactive tabs (click to reveal)
    const belTab = e.target.closest('.beliefs-tab');
    if (belTab) {
      const key = belTab.dataset.belief;
      const root = belTab.closest('.beliefs');
      root.querySelectorAll('.beliefs-tab').forEach(t => {
        const on = t === belTab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      root.querySelectorAll('.beliefs-panel').forEach(p => {
        const on = p.dataset.belief === key;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });
      return;
    }
    // feature card (Welcome page lifecycle preview)
    const fcard = e.target.closest('.feature-card[data-nav-chapter]');
    if (fcard) { e.preventDefault(); goTo(fcard.dataset.navChapter, fcard.dataset.navSub || null); return; }
    // wheel slice — on hover-capable devices, click navigates directly (the
    // description already previews on hover). On touch devices (no hover),
    // the first tap reveals the stage description in the caption panel; the
    // “Explore this stage” button (data-goto) then navigates.
    const slice = e.target.closest('.wheel-slice');
    if (slice && slice.dataset.sub) {
      const noHover = window.matchMedia('(hover: none)').matches;
      if (noHover) { showWheelCaption(slice.dataset.sub); return; }
      goTo('ch-3', slice.dataset.sub);
      return;
    }
    // any generic data-goto
    const btn = e.target.closest('[data-goto]');
    if (btn) {
      if (btn.tagName === 'A') e.preventDefault();
      const chapter = btn.dataset.goto;
      const sub = btn.dataset.sub || undefined;
      goTo(chapter, sub);
    }
  });

  // rail toggle (mobile)
  document.getElementById('railToggle').addEventListener('click', () => {
    document.getElementById('rail').classList.toggle('on');
  });
}

// ---- Init -----------------------------------------------------------
function init() {
  renderRail();
  renderAll();
  const h = location.hash.replace('#', '');
  if (h.startsWith('sub-') && LIFECYCLE.some(s => s.id === h)) goTo('ch-3', h);
  else if (CHAPTERS.some(c => c.id === h)) goTo(h);
  else {
    const anchor = h && document.getElementById(h);
    const parent = anchor && anchor.closest('.chapter');
    if (parent) {
      goTo(parent.id);
      setTimeout(() => anchor.scrollIntoView({ block: 'start' }), 400);
    } else goTo('cover');
  }
  initSearch();
  initProgress();
  wireEvents();
  updateBookmarkCount();
}
document.addEventListener('DOMContentLoaded', init);

// ---- Live-preview bridge (used by the authoring tool) --------------------
// The editor hosts this renderer in an <iframe> and pushes a fresh PLAYBOOK
// whenever the author changes something. We swap window.PLAYBOOK, rebind the
// PB reference the render helpers close over, and re-render in place while
// trying to keep the reader on the same chapter.
function applyPlaybook(next, opts) {
  opts = opts || {};
  window.PLAYBOOK = next || {};
  PB = window.PLAYBOOK;
  if (!PB.prose) PB.prose = {};
  refreshDerived();
  var keep = opts.chapter || currentChapter || 'cover';
  var keepSub = opts.sub || null;
  try {
    renderRail();
    renderAll();
    initSearch();
    wireEvents();
    // restore position (chapter may no longer exist -> fall back to cover)
    if (document.getElementById(keep)) goTo(keep, keepSub);
    else goTo('cover');
  } catch (e) {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'preview-error', message: String(e && e.message || e) }, '*');
    }
    throw e;
  }
}
window.applyPlaybook = applyPlaybook;

window.addEventListener('message', function (ev) {
  var d = ev.data || {};
  if (d.type === 'editor-ping') {
    // The editor (re)announces itself — reply so it knows we are listening.
    if (window.parent !== window) window.parent.postMessage({ type: 'preview-boot' }, '*');
    return;
  }
  if (d.type === 'set-playbook') {
    applyPlaybook(d.playbook, { chapter: d.chapter, sub: d.sub });
    if (window.parent !== window) window.parent.postMessage({ type: 'preview-ready' }, '*');
  } else if (d.type === 'goto') {
    goTo(d.chapter, d.sub);
  }
});

// Initial derivation + announce readiness so the editor can push PLAYBOOK.
refreshDerived();
if (window.parent !== window) {
  window.parent.postMessage({ type: 'preview-boot' }, '*');
}
