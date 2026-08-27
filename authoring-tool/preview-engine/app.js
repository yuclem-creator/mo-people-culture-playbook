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

// ---- Chart / dashboard block ----------------------------------------------
// Branded SVG charts (bar / line / donut) — dependency-free and scalable.
function pbChartPalette(i) { const c = ['#B59060', '#7C917F', '#8f6d3f', '#5C7062', '#C9A879', '#A9BBAC']; return c[i % c.length]; }
function pbFmtNum(v, unit) {
  const a = Math.abs(v); let s;
  if (a >= 1e6) s = String(Math.round(v / 1e5) / 10) + 'M';
  else if (a >= 1e4) s = String(Math.round(v / 1e2) / 10) + 'k';
  else s = String(Math.round(v * 100) / 100);
  return s + (unit ? '\u2009' + unit : '');
}
function pbNiceMax(v) {
  if (!isFinite(v) || v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
}
function pbChartHTML(it) {
  const type = ['bar', 'line', 'donut'].indexOf(it.chartType) !== -1 ? it.chartType : 'bar';
  const labels = Array.isArray(it.labels) ? it.labels : [];
  const series = (Array.isArray(it.series) ? it.series : []).filter(function (s) { return s && Array.isArray(s.values) && s.values.length; });
  const unit = it.unit || '';
  if (!labels.length || !series.length) {
    return `<div class="pb-chart pb-chart-empty">Add category labels and at least one series of values to draw this chart.</div>`;
  }
  if (type === 'donut') {
    const vals = labels.map(function (_, i) { return Math.max(0, Number(series[0].values[i]) || 0); });
    const total = vals.reduce(function (a, b) { return a + b; }, 0);
    if (total <= 0) return `<div class="pb-chart pb-chart-empty">Add values above zero to draw this chart.</div>`;
    const cx = 150, cy = 150, r = 96, sw = 42, C = 2 * Math.PI * r;
    let acc = 0;
    const segs = vals.map(function (v, i) {
      const len = v / total * C;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pbChartPalette(i)}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(String(labels[i]))}: ${esc(pbFmtNum(v, unit))}</title></circle>`;
      acc += len;
      return seg;
    }).join('');
    const items = vals.map(function (v, i) {
      const pct = Math.round(v / total * 100);
      return `<div class="pb-chart-legrow"><span class="pb-chart-chip" style="background:${pbChartPalette(i)}"></span><span class="pb-chart-leglabel">${esc(String(labels[i]))}</span><span class="pb-chart-legval">${esc(pbFmtNum(v, unit))} · ${pct}%</span></div>`;
    }).join('');
    return `<div class="pb-chart"><div class="pb-chart-donutwrap">
      <svg viewBox="0 0 300 300" role="img" aria-label="${esc(it.name || 'Donut chart')}">
        ${segs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="pb-chart-big">${esc(pbFmtNum(total, unit))}</text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" class="pb-chart-bigsub">${esc(series[0].label || 'Total')}</text>
      </svg>
      <div class="pb-chart-legcol">${items}</div>
    </div></div>`;
  }
  // bar / line — shared axes
  const W = 760, H = 360, P = { l: 58, r: 18, t: 26, b: 46 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const allVals = series.reduce(function (a, s) { return a.concat(s.values); }, [0]);
  const maxV = pbNiceMax(Math.max.apply(null, allVals.map(function (v) { return Math.max(0, Number(v) || 0); })));
  const gx = function (i) { return P.l + (iw / labels.length) * (i + 0.5); };
  const gy = function (v) { return P.t + ih - (Math.max(0, v) / maxV) * ih; };
  let grid = '';
  for (let t = 0; t <= 4; t++) {
    const y = (P.t + ih - ih * t / 4).toFixed(1);
    grid += `<line x1="${P.l}" y1="${y}" x2="${W - P.r}" y2="${y}" class="pb-chart-grid${t === 0 ? ' pb-chart-base' : ''}" />
      <text x="${P.l - 8}" y="${+y + 4}" text-anchor="end" class="pb-chart-tick">${esc(pbFmtNum(maxV * t / 4, unit))}</text>`;
  }
  const xlabels = labels.map(function (lb, i) {
    return `<text x="${gx(i).toFixed(1)}" y="${H - P.b + 20}" text-anchor="middle" class="pb-chart-tick">${esc(String(lb))}</text>`;
  }).join('');
  let body = '';
  if (type === 'bar') {
    const gw = iw / labels.length;
    const bw = Math.min(38, gw * 0.62 / series.length);
    series.forEach(function (s, si) {
      labels.forEach(function (_, i) {
        const v = Math.max(0, Number(s.values[i]) || 0);
        const x = gx(i) - bw * series.length / 2 + si * bw;
        const y = gy(v), h = P.t + ih - y;
        body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="2.5" fill="${pbChartPalette(si)}"><title>${esc(s.label || ('Series ' + (si + 1)))} · ${esc(String(labels[i]))}: ${esc(pbFmtNum(v, unit))}</title></rect>`;
        if (series.length === 1) body += `<text x="${(x + (bw - 3) / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="pb-chart-val">${esc(pbFmtNum(v, unit))}</text>`;
      });
    });
  } else { // line
    series.forEach(function (s, si) {
      const pts = labels.map(function (_, i) { return gx(i).toFixed(1) + ',' + gy(Math.max(0, Number(s.values[i]) || 0)).toFixed(1); }).join(' ');
      body += `<polyline points="${pts}" fill="none" stroke="${pbChartPalette(si)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`;
      labels.forEach(function (_, i) {
        const v = Math.max(0, Number(s.values[i]) || 0);
        body += `<circle cx="${gx(i).toFixed(1)}" cy="${gy(v).toFixed(1)}" r="4" fill="#fff" stroke="${pbChartPalette(si)}" stroke-width="2.5"><title>${esc(s.label || ('Series ' + (si + 1)))} · ${esc(String(labels[i]))}: ${esc(pbFmtNum(v, unit))}</title></circle>`;
      });
    });
  }
  const legRows = series.length > 1 ? `<div class="pb-chart-legend">${series.map(function (s, si) {
    return `<span class="pb-chart-legitem"><span class="pb-chart-chip" style="background:${pbChartPalette(si)}"></span>${esc(s.label || ('Series ' + (si + 1)))}</span>`;
  }).join('')}</div>` : '';
  return `<div class="pb-chart">${legRows}
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(it.name || 'Chart')}">${grid}${body}${xlabels}</svg>
  </div>`;
}

// A single expandable subheading (resource) row.
// Collapsed: symbol + name + kind + chevron.
// Expanded: reveals the blurb description and the hyperlinked resource.
// Every content element can carry an optional heading (it.head), set in the
// Studio inspector — rendered above the element regardless of its type.
function policyItemHTML(it) {
  var inner = policyItemBodyHTML(it);
  var out;
  if (it && it.head && !Array.isArray(it.head) && String(it.head).trim()) {
    var _hsz = ({ s: '16px', m: '20px', l: '28px', xl: '34px' })[it.headSize] || '';
    var _hcl = /^(ink|soft|muted|gold|sage|terra)$/.test(it.headColor || '') ? ' pb-c-' + it.headColor : '';
    out = '<div class="pb-item"><div class="pb-item-head' + _hcl + '"' + (_hsz ? ' style="font-size:' + _hsz + ';"' : '') + '>' + esc(it.head) + '</div>' + inner + '</div>';
  } else {
    out = inner;
  }
  // Author-adjustable spacing: it.gap is extra space above the element in px
  // (set by the drag handle in Studio). Positive gaps use padding (exact, no
  // margin-collapsing); negative gaps use margin to close white space up.
  if (it && typeof it.gap === 'number' && it.gap) {
    var _gst = it.gap > 0 ? 'padding-top:' + it.gap + 'px' : 'margin-top:' + it.gap + 'px';
    return '<div class="pb-gap" style="' + _gst + '">' + out + '</div>';
  }
  return out;
}

function policyItemBodyHTML(it) {
  const id = 'acc-' + (++_accId);
  // Interactive elements (17 kinds) — builders and wiring live in the
  // pbIxHTML block appended to this file.
  if (it && it.s === 'ix') { return pbIxHTML(it); }
  // Video frame (uploaded or linked).
  if (it && it.s === 'video') {
    return `<figure class="policy-video" style="margin:16px 0;">
      <video controls playsinline style="width:100%;display:block;background:#0d0b08;"><source src="${esc(it.url)}" /></video>
      ${it.name ? `<figcaption style="font-size:12px;color:var(--ink-mute);margin-top:8px;">${esc(it.name)}</figcaption>` : ''}
    </figure>`;
  }
  // Tabbed interaction: a labelled tab bar with switchable panels.
  if (it && it.s === 'tabs') {
    const tabs = Array.isArray(it.tabs) ? it.tabs : [];
    const tid = 'tabs-' + (++_accId);
    return `<div class="policy-tabs" id="${tid}" style="margin:16px 0;border:1px solid var(--rule);border-radius:6px;overflow:hidden;">
      <div class="policy-tabs-bar" style="display:flex;flex-wrap:wrap;background:#F4F1EA;border-bottom:1px solid var(--rule);">
        ${tabs.map((t, i) => `<button type="button" class="policy-tab${i === 0 ? ' on' : ''}" data-tab-i="${i}" style="border:0;border-right:1px solid var(--rule);background:${i === 0 ? '#fff' : 'none'};padding:12px 18px;font:600 12px system-ui;letter-spacing:.08em;text-transform:uppercase;color:${i === 0 ? '#8f6d3f' : '#6b625a'};cursor:pointer;">${esc(t.label || ('Tab ' + (i + 1)))}</button>`).join('')}
      </div>
      ${tabs.map((t, i) => `<div class="policy-tab-panel" data-tab-p="${i}" style="display:${i === 0 ? 'block' : 'none'};padding:18px 22px;background:#fff;"><p style="margin:0;font-size:14px;color:#4a443f;line-height:1.7;">${esc(t.text || '')}</p></div>`).join('')}
    </div>`;
  }
  // Table: branded data table lifted from an imported document or authored
  // in the Studio (rows of pipe-separated cells there).
  if (it && it.s === 'table') {
    const head = Array.isArray(it.head) ? it.head : [];
    const rows = Array.isArray(it.rows) ? it.rows : [];
    return `<div class="pb-tablewrap"><table class="pb-table">
      ${head.length ? `<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : ''}
      <tbody>${rows.map(r => `<tr>${(Array.isArray(r) ? r : [r]).map((c, ci) => `<td data-th="${esc(head[ci] || '')}">${inlineRichHTML(String(c || ''))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }
  // Callout: a labelled panel — note (warm neutral, gold bar) or warning
  // (red-tinted, for controls and constraints).
  if (it && it.s === 'callout') {
    const tone = ['warning', 'recap', 'tip'].indexOf(it.tone) !== -1 ? it.tone : 'note';
    return `<div class="pb-callout pb-callout--${tone}">
      ${it.label ? `<div class="pb-callout-label">${esc(it.label)}</div>` : ''}
      <div class="pb-callout-text">${inlineRichHTML(it.text || '')}</div>
    </div>`;
  }
  // Vertical timeline, two styles: numbered steps on a gold rail (show-all or
  // click-to-reveal), or a HERITAGE history timeline — year markers on a
  // spine with eyebrow label, body text and an optional image per event.
  if (it && it.s === 'timeline') {
    const steps = Array.isArray(it.steps) ? it.steps : [];
    if (it.variant === 'history') {
      return `<div class="pb-history">
        ${steps.map(function (s) {
          return `
          <div class="pb-h-event">
            <div class="pb-h-year"><span class="pb-h-dot" aria-hidden="true"></span><span class="pb-h-year-num">${esc(s.label || '')}</span></div>
            <div class="pb-h-body">
              ${s.sub ? `<div class="pb-h-eyebrow">${esc(s.sub)}</div>` : ''}
              <div class="pb-h-text">${inlineRichHTML(s.text || '')}</div>
              ${s.url ? `<a class="pb-step-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Open resource →</a>` : ''}
            </div>
            ${s.img ? `<figure class="pb-h-img"><img src="img/${esc(s.img)}" alt="${esc(s.label || '')}" loading="lazy" /></figure>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }
    const reveal = it.mode === 'reveal';
    return `<div class="pb-timeline" data-mode="${reveal ? 'reveal' : 'all'}">
      ${steps.map(function (s, i) {
        return `
        <div class="pb-step${reveal ? '' : ' open'}" data-step="${i}">
          <button type="button" class="pb-step-head">
            <span class="pb-step-num">${i + 1}</span>
            <span class="pb-step-label">${esc(s.label || ('Step ' + (i + 1)))}</span>
          </button>
          <div class="pb-step-body">
            ${inlineRichHTML(s.text || '')}
            ${s.url ? `<a class="pb-step-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Open resource →</a>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }
  // Checklist: tickable items with optional links (state kept per page session).
  if (it && it.s === 'checklist') {
    const items = Array.isArray(it.items) ? it.items : [];
    const cid = id;
    const showProgress = !!it.showProgress;
    return `<div class="pb-checklist" data-checklist="${cid}" data-done-text="${esc(it.doneText || '')}">
      ${showProgress ? `<div class="pb-check-progress"><div class="pb-check-bar"><div class="pb-check-fill" style="width:0%"></div></div><div class="pb-check-count">0 of ${items.length} complete</div></div>` : ''}
      ${items.map(function (c, i) {
        const inner = c.url
          ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.label || '')}</a>`
          : `<span>${esc(c.label || '')}</span>`;
        return `
        <div class="pb-check${c.note ? ' has-note' : ''}" data-check="${cid}-${i}">
          <button type="button" class="pb-check-box" aria-label="Toggle item ${i + 1}"><span>✓</span></button>
          <span class="pb-check-text">${inner}${c.note ? '<span class="pb-check-more">details +</span>' : ''}</span>
          ${c.note ? `<div class="pb-check-note">${inlineRichHTML(c.note)}</div>` : ''}
        </div>`;
      }).join('')}
      ${it.doneText ? `<div class="pb-check-done">${esc(it.doneText)}</div>` : ''}
    </div>`;
  }
  // Gated task list (V5 Baselining pattern): numbered task rows with
  // reference pills and tap-to-expand notes, a gate row that only unlocks
  // when every task is ticked, a progress bar, and on-device persistence
  // (localStorage) with a reset link.
  if (it && it.s === 'tasklist') {
    const items = Array.isArray(it.items) ? it.items : [];
    const cid = it.cid || ('tl-' + String(it.name || 'list').replace(/[^\w]+/g, '-'));
    const total = items.length + (it.gateText ? 1 : 0);
    // Optional V5 context card: dark sticky panel beside the tasks with
    // customisable label/value rows and a live "N of M complete" progress.
    const card = (it.card && it.card.on) ? it.card : null;
    const cardHtml = card ? `<aside class="pb-tl-card">
      ${(card.rows || []).map(function (r) {
        return (r && (r.label || r.value))
          ? `<div class="pb-tl-card-lbl">${esc(r.label || '')}</div><div class="pb-tl-card-val">${inlineRichHTML(r.value || '')}</div>`
          : '';
      }).join('')}
      ${card.showCount !== false ? `<div class="pb-tl-card-progress"><div class="pb-tl-card-bar"><div class="pb-tl-card-fill" style="width:0%"></div></div><div class="pb-tl-card-count">0 of ${total} complete</div></div>` : ''}
    </aside>` : '';
    const listHtml = `<div class="pb-tasklist" data-tasklist="${esc(cid)}" data-count="${items.length}"
      data-gate-locked="${esc(it.gateLocked || 'Complete all actions first.')}"
      data-gate-open="${esc(it.gateOpen || 'Gate passed.')}">
      ${it.showProgress !== false ? `<div class="pb-tl-progress"><div class="pb-tl-bar"><div class="pb-tl-fill" style="width:0%"></div></div><div class="pb-tl-count">0 of ${total} complete</div></div>` : ''}
      ${items.map(function (c, i) {
        return `
        <div class="pb-task" data-task="${cid}-${i}">
          <span class="pb-task-num">${i + 1}</span>
          <div class="pb-task-body">
            <div class="pb-task-act">${inlineRichHTML(c.text || '')}</div>
            ${(c.pills || []).length ? `<div class="pb-task-pills">${c.pills.map(function (p2) {
              return p2.target
                ? `<button type="button" class="pb-task-pill ${esc(p2.tone || 'gold')}" data-goto="${esc(p2.target)}">${esc(p2.text || 'See')}</button>`
                : `<span class="pb-task-pill ${esc(p2.tone || 'gold')}">${esc(p2.text || '')}</span>`;
            }).join('')}</div>` : ''}
            ${c.note ? `<div class="pb-task-note">${inlineRichHTML(c.note)}</div>` : ''}
          </div>
          <button type="button" class="pb-task-check" aria-label="Mark task ${i + 1} done"><span>✓</span></button>
        </div>`;
      }).join('')}
      ${it.gateText ? `
      <div class="pb-task pb-task-gate" data-gate-row="1">
        <span class="pb-task-num pb-task-gate-num">◌</span>
        <div class="pb-task-body">
          <div class="pb-task-act">${esc(it.gateText)}</div>
          <div class="pb-task-gatenote">${esc(it.gateLocked || 'Complete all actions first.')}</div>
        </div>
        <button type="button" class="pb-task-check" aria-label="Sign off"><span>✓</span></button>
      </div>` : ''}
      <div class="pb-tl-saved">Your ticks are saved on this device — pick up where you left off. <button type="button" class="pb-tl-reset">Reset</button></div>
    </div>`;
    return card ? `<div class="pb-tl-wrap">${cardHtml}${listHtml}</div>` : listHtml;
  }
  // Swimlane timeline: one lane per role, steps flowing left to right with
  // continuous numbering across lanes; a handoff marker appears where a new
  // lane begins. Pure CSS grid — stacks lane-by-lane on narrow screens.
  if (it && it.s === 'swimlane') {
    const lanes = Array.isArray(it.lanes) ? it.lanes : [];
    let n = 0;
    return `<div class="pb-swim">
      ${lanes.map(function (l, li) {
        const steps = Array.isArray(l.steps) ? l.steps : [];
        return `<div class="pb-swim-row">
          <div class="pb-swim-role"><span class="pb-swim-role-num">${String(li + 1).padStart(2, '0')}</span><span>${esc(l.role || ('Lane ' + (li + 1)))}</span></div>
          <div class="pb-swim-steps">
            ${li > 0 ? '<span class="pb-swim-hand" aria-hidden="true">↓</span>' : ''}
            ${steps.map(function (s) {
              n++;
              return `<div class="pb-swim-step">
                <span class="pb-swim-num">${n}</span>
                <div class="pb-swim-card">
                  <div class="pb-swim-label">${esc(s.label || '')}</div>
                  ${s.text ? `<div class="pb-swim-text">${inlineRichHTML(s.text)}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }
  // Chart / dashboard: branded SVG bar, line or donut chart — no library.
  if (it && it.s === 'chart') {
    return pbChartHTML(it);
  }
  // Before / after: draggable comparison slider when both images are set
  // (clip-path driven, keyboard accessible), with optional text cards below.
  if (it && it.s === 'beforeafter') {
    const bL = it.beforeLabel || 'Before', aL = it.afterLabel || 'After';
    const slider = (it.beforeImg && it.afterImg) ? `<figure class="pb-ba" style="--ba:50%;">
        <img class="pb-ba-base" src="img/${esc(it.afterImg)}" alt="${esc(aL)}" draggable="false" />
        <img class="pb-ba-top" src="img/${esc(it.beforeImg)}" alt="${esc(bL)}" draggable="false" />
        <span class="pb-ba-tag pb-ba-tag--b">${esc(bL)}</span>
        <span class="pb-ba-tag pb-ba-tag--a">${esc(aL)}</span>
        <div class="pb-ba-handle"><button type="button" class="pb-ba-btn" aria-label="Comparison slider — drag or use arrow keys"><span>‹</span><span>›</span></button></div>
      </figure>` : '';
    const rows = function (text, mark) {
      return String(text || '').split('\n').map(function (ln) { return ln.trim(); }).filter(Boolean)
        .map(function (ln) { return `<div class="pb-ba-line"><span class="pb-ba-mark">${mark}</span><span>${inlineRichHTML(ln)}</span></div>`; }).join('');
    };
    const cards = (it.beforeText || it.afterText) ? `<div class="pb-ba-cards">
        <div class="pb-ba-card pb-ba-card--b"><div class="pb-ba-eyebrow">${esc(bL)}</div><div class="pb-ba-cardtext">${rows(it.beforeText, '—')}</div></div>
        <div class="pb-ba-card pb-ba-card--a"><div class="pb-ba-eyebrow">${esc(aL)}</div><div class="pb-ba-cardtext">${rows(it.afterText, '✓')}</div></div>
      </div>` : '';
    if (!slider && !cards) return `<div class="pb-bawrap pb-ba-empty">Add before / after images or text to build this comparison.</div>`;
    return `<div class="pb-bawrap">${slider}${cards}</div>`;
  }
  // Heading: a standalone section heading for pacing long pages.
  if (it && it.s === 'heading') {
    if (!it.text) return '';
    var hfmt = _pbFmtCls(it);
    return `<div class="pb-heading">
      ${it.sub ? `<div class="pb-heading-sub">${esc(it.sub)}</div>` : ''}
      <h2 class="pb-heading-text${hfmt}"${it.font === 'display' || it.size ? ` style="${it.font === 'display' ? 'font-family:var(--mo-display);' : ''}${it.size ? 'font-size:' + ({s:'18px',m:'22px',l:'28px',xl:'34px'}[it.size] || it.size) + ';"' : ''}"` : ''}>${esc(it.text)}</h2>
      ${!it.hideRule ? '<span class="pb-heading-rule" aria-hidden="true"></span>' : ''}
    </div>`;
  }
  // Body text: standalone prose block. Blank line = new paragraph; optional
  // lead paragraph styling; **bold** inline; weight/colour brand tokens.
  if (it && it.s === 'text') {
    // Empty text still renders a (visually invisible) host div so the Studio
    // canvas keeps a 1:1 item<->node map and the author can click to fill it.
    if (!it.text) return '<div class="pb-text pb-text--empty"></div>';
    var paras = String(it.text).split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (!paras.length) return '';
    var tfmt = _pbFmtCls(it);
    return '<div class="pb-text' + tfmt + '">' + paras.map(function (p, i) {
      var html = esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      return '<p' + (it.lead && i === 0 ? ' class="pb-text-lead"' : '') + '>' + html + '</p>';
    }).join('') + '</div>';
  }
  // Stat / KPI band: a strip of headline metrics with optional deltas.
  if (it && it.s === 'statband') {
    const stats = (Array.isArray(it.stats) ? it.stats : []).filter(function (s) { return s && (s.value || s.label); });
    if (!stats.length) return `<div class="pb-stats pb-chart-empty">Add stats to draw this band.</div>`;
    return `<div class="pb-stats" style="--cols:${stats.length}">` + stats.map(function (s) {
      const mark = s.deltaDir === 'down' ? '▼ ' : s.deltaDir === 'up' ? '▲ ' : '';
      return `<div class="pb-stat">
        <div class="pb-stat-num">${esc(String(s.value || ''))}${s.unit ? `<span class="pb-stat-unit">${esc(s.unit)}</span>` : ''}</div>
        <div class="pb-stat-label">${esc(s.label || '')}</div>
        ${s.sub ? `<div class="pb-stat-sub">${esc(s.sub)}</div>` : ''}
        ${s.delta ? `<div class="pb-stat-delta${s.deltaDir === 'down' ? ' down' : ''}">${mark}${esc(s.delta)}</div>` : ''}
      </div>`;
    }).join('') + '</div>';
  }
  // Gauge / maturity meter: semicircular dial, needle from score ÷ max, with
  // a level scale whose active level follows the score.
  if (it && it.s === 'gauge') {
    const gmax = (isFinite(it.max) && it.max > 0) ? Number(it.max) : 5;
    const gval = Math.max(0, Math.min(gmax, Number(it.value) || 0));
    const levels = (Array.isArray(it.levels) ? it.levels : []).filter(Boolean);
    const zn = Math.max(levels.length, 2);
    const gcx = 180, gcy = 180, gr = 150;
    const gpt = function (a, rr) { const th = (180 - a) * Math.PI / 180; return [gcx + rr * Math.cos(th), gcy - rr * Math.sin(th)]; };
    const gap = 1.2;
    const zones = [];
    for (let zi = 0; zi < zn; zi++) {
      const a0 = zi * 180 / zn + gap, a1 = (zi + 1) * 180 / zn - gap;
      const p0 = gpt(a0, gr), p1 = gpt(a1, gr);
      zones.push(`<path d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${gr} ${gr} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" fill="none" stroke="${pbChartPalette(zi)}" stroke-width="26" stroke-linecap="${zi === 0 || zi === zn - 1 ? 'round' : 'butt'}"/>`);
    }
    const activeI = Math.max(0, Math.min(zn - 1, Math.round(gval / gmax * zn) - (gval > 0 ? 1 : 0)));
    const needleDeg = gval / gmax * 180 - 90;
    const endL = gpt(0, gr), endR = gpt(180, gr);
    const rows = levels.map(function (l, i) {
      return `<div class="pb-gauge-row${i === activeI ? ' now' : ''}"><span class="dot"></span>${esc(String(l))}</div>`;
    }).join('');
    return `<div class="pb-gauge-card">
      <div class="pb-gauge-svgwrap">
        <svg viewBox="0 0 360 205" role="img" aria-label="${esc(it.name || 'Gauge')}">
          <path d="M ${endL[0]} ${endL[1]} A ${gr} ${gr} 0 0 1 ${endR[0]} ${endR[1]}" fill="none" stroke="#EDEADF" stroke-width="26" stroke-linecap="round"/>
          ${zones}
          <g transform="rotate(${needleDeg.toFixed(1)} ${gcx} ${gcy})">
            <path d="M ${gcx - 4} ${gcy} L ${gcx} ${gcy - 118} L ${gcx + 4} ${gcy} Z" fill="#26241F"/>
            <circle cx="${gcx}" cy="${gcy}" r="11" fill="#26241F"/>
            <circle cx="${gcx}" cy="${gcy}" r="4.5" fill="#FDFDF3"/>
          </g>
          <text x="${endL[0]}" y="203" font-size="11" fill="#9a958a" text-anchor="middle">1</text>
          <text x="${endR[0]}" y="203" font-size="11" fill="#9a958a" text-anchor="middle">${zn}</text>
        </svg>
      </div>
      <div class="pb-gauge-read">
        ${it.levelLabel ? `<div class="pb-gauge-level">${esc(it.levelLabel)}</div>` : ''}
        <div class="pb-gauge-of">${esc(pbFmtNum(gval, ''))} of ${esc(pbFmtNum(gmax, ''))}${it.caption ? ' · ' + esc(it.caption) : ''}</div>
        ${rows ? `<div class="pb-gauge-scale">${rows}</div>` : ''}
      </div>
    </div>`;
  }
  // Hierarchy / pyramid: layered tiers, apex first, with side annotations.
  if (it && it.s === 'pyramid') {
    const tiers = (Array.isArray(it.tiers) ? it.tiers : []).filter(function (t) { return t && t.name; });
    if (!tiers.length) return `<div class="pb-pyr pb-chart-empty">Add tiers to build this pyramid.</div>`;
    const shades = ['#B59060', '#5C7062', '#7C917F', '#A9BBAC', '#C3CFC5', '#DCE3DD'];
    const n = tiers.length;
    const stack = tiers.map(function (t, i) {
      const w = 34 + (n > 1 ? (i / (n - 1)) * 66 : 66);
      const bg = shades[Math.min(i, shades.length - 1)];
      const light = i >= 3;
      return `<div class="pb-pyr-tier${light ? ' light' : ''}" style="width:${w.toFixed(0)}%;background:${bg};">
        <div class="t-name">${esc(t.name)}</div>
        ${t.sub ? `<div class="t-sub">${esc(t.sub)}</div>` : ''}
      </div>`;
    }).join('');
    const notes = tiers.map(function (t, i) {
      if (!t.note) return '';
      const bg = shades[Math.min(i, shades.length - 1)];
      return `<div class="pb-pyr-note"><span class="swatch" style="background:${bg};"></span><span><b>${esc(t.name)}.</b> ${esc(t.note)}</span></div>`;
    }).join('');
    return `<div class="pb-pyr"><div class="pb-pyr-stack">${stack}</div>${notes ? `<div class="pb-pyr-notes">${notes}</div>` : ''}</div>`;
  }
  // Radial lifecycle wheel: tappable ring segments around a hub; the detail
  // card follows the selected segment (delegated wiring below).
  if (it && it.s === 'wheel') {
    const stages = (Array.isArray(it.stages) ? it.stages : []).filter(function (s) { return s && s.label; });
    if (!stages.length) return `<div class="pb-wheelwrap pb-chart-empty">Add stages to build this wheel.</div>`;
    const wcx = 260, wcy = 260, r1 = 132, r2 = 242, wgap = 2.4;
    const wpt = function (r, a) { const rad = (a - 90) * Math.PI / 180; return [wcx + r * Math.cos(rad), wcy + r * Math.sin(rad)]; };
    const wn = stages.length, step = 360 / wn;
    const segs = stages.map(function (s, i) {
      const a0 = i * step + wgap / 2, a1 = (i + 1) * step - wgap / 2;
      const p0 = wpt(r2, a0), p1 = wpt(r2, a1), p2 = wpt(r1, a1), p3 = wpt(r1, a0);
      const large = (a1 - a0) > 180 ? 1 : 0;
      const lp = wpt((r1 + r2) / 2, (a0 + a1) / 2);
      return `<path class="pb-wheel-seg${i === 0 ? ' on' : ''}" data-wi="${i}" tabindex="0" role="button" aria-label="${esc(s.label)}"
        d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r2} ${r2} 0 ${large} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} A ${r1} ${r1} 0 ${large} 0 ${p3[0].toFixed(1)} ${p3[1].toFixed(1)} Z"
        fill="${['#7C917F','#5C7062','#8FA294','#6E8274','#A9BBAC','#93A896'][i % 6]}"/>` +
        `<text class="pb-wheel-num" x="${lp[0].toFixed(1)}" y="${(lp[1] - 2).toFixed(1)}" text-anchor="middle">${('0' + (i + 1)).slice(-2)}</text>` +
        `<text class="pb-wheel-lbl" x="${lp[0].toFixed(1)}" y="${(lp[1] + 13).toFixed(1)}" text-anchor="middle">${esc(String(s.label).toUpperCase())}</text>`;
    }).join('');
    const cards = stages.map(function (s, i) {
      return `<div class="pb-wheel-stage" data-wc="${i}" style="display:${i === 0 ? 'block' : 'none'};">
        <div class="s-num">Stage ${('0' + (i + 1)).slice(-2)}</div>
        <div class="s-name">${esc(s.label)}</div>
        <div class="s-text">${inlineRichHTML(s.text || '')}</div>
      </div>`;
    }).join('');
    return `<div class="pb-wheelwrap">
      <div class="pb-wheel">
        <svg viewBox="0 0 520 520">${segs}<circle cx="${wcx}" cy="${wcy}" r="118" fill="#FDFDF3" stroke="#E3E0D3"/></svg>
        <div class="pb-wheel-hub">
          ${it.hubEyebrow ? `<div class="h-eyebrow">${esc(it.hubEyebrow)}</div>` : ''}
          <div class="h-title">${esc(it.hubTitle || it.name || '')}</div>
        </div>
      </div>
      <div class="pb-wheel-side">${cards}<div class="pb-wheel-hint">Tap a segment to read its stage</div></div>
    </div>`;
  }
  // Embedded figure carried over from an imported document — optionally with
  // interactive hotspots (numbered pins revealing popup text on click).
  if (it && it.s === 'image') {
    const hs = Array.isArray(it.hotspots) ? it.hotspots : [];
    const imgHtml = `<img src="${it.url}" alt="${esc(it.name || 'Document figure')}" style="max-width:100%;display:block;" />`;
    if (!hs.length) {
      return `<figure class="policy-image" style="margin:16px 0;">${imgHtml}
        ${it.name ? `<figcaption style="font-size:12px;color:var(--ink-mute);margin-top:8px;">${esc(it.name)}</figcaption>` : ''}
      </figure>`;
    }
    const showAll = it.hotspotsMode === 'show';
    return `<figure class="policy-image hotspot-figure" data-hotspots-mode="${showAll ? 'show' : 'reveal'}" style="margin:16px 0;">
      <div class="hotspot-wrap" style="position:relative;display:inline-block;max-width:100%;">
        ${imgHtml}
        ${hs.map(function (h, i) {
          return `
          <button type="button" class="hotspot-dot${showAll ? ' on' : ''}" data-hotspot="${i}" style="position:absolute;left:${h.x}%;top:${h.y}%;">${i + 1}</button>
          <div class="hotspot-pop${showAll ? ' show' : ''}" data-hotspot-pop="${i}" style="left:${h.x}%;top:${h.y}%;">
            ${h.label ? `<div class="hotspot-pop-title">${esc(h.label)}</div>` : ''}
            <div class="hotspot-pop-text">${esc(h.text || '')}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="hotspot-tools">
        <button type="button" class="hotspot-toggle">${showAll ? 'Click to reveal' : 'Display all hotspots'}</button>
        ${it.name ? `<span class="hotspot-cap">${esc(it.name)}</span>` : ''}
      </div>
    </figure>`;
  }
  // Plain text bullet (e.g. imported list items): simple row, no resource chrome.
  if (typeof it === 'string') {
    return `<div class="policy-text-item" style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--rule);line-height:1.55;"><span style="color:#B59060;flex:none;">•</span><span>${inlineRichHTML(it)}</span></div>`;
  }
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
  const hasDetail = !!(it.blurb || (it.url && !it.hideLink));
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
          ${it.hideLink ? '' : `<div class="policy-item-resource">
            <span class="resource-eyebrow">Resource</span>
            ${resourceLine}
          </div>`}
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

// Shared paragraph-line renderer: a line starting with "## " becomes a proper
// section heading (h4.pb-para-h) anywhere paragraph arrays are rendered —
// chapter/sub intros, section blurbs, transition notes. Everything else stays
// an ordinary paragraph. Returns '' for the heading case sentinel handling at
// call sites that need the raw string check (they call isParaHeading first).
function isParaHeading(p) {
  return typeof p === 'string' && /^##\s+\S/.test(p);
}
function paraLineHTML(p) {
  if (isParaHeading(p)) return `<h4 class="pb-para-h">${inlineRichHTML(String(p).replace(/^##\s+/, ''))}</h4>`;
  return `<p>${inlineRichHTML(p)}</p>`;
}

// Render blurb paragraphs, optionally split into two chunks so a feature quote /
// highlight grid can be interleaved (splitAfter = # of paragraphs before break).
function blurbChunkHTML(paras, from, to) {
  const slice = paras.slice(from, to);
  if (!slice.length) return '';
  return `<div class="policy-section-blurb">${slice.map(p => isParaHeading(p) ? paraLineHTML(p) : `<p>${esc(p)}</p>`).join('')}</div>`;
}

// Section (numbered Heading) — optional intro blurb, resource accordions, optional transition.
// Optional visual-only fields: feature_quote (verbatim pull-quote), highlights
// (icon-card grid of verbatim key phrases), splitAfter (interleave point).
// The editor stores a freshly-authored lead sentence as a STRING (only
// imported sections carry arrays) — normalise here or .map throws and the
// whole preview dies with "sec.blurb.map is not a function".
function asParas(v) {
  if (Array.isArray(v)) return v;
  if (v && String(v).trim()) return [String(v)];
  return [];
}
function sectionHTML(sec) {
  const blurbParas = asParas(sec.blurb);
  let blurb;
  if (blurbParas.length && (sec.feature_quote || sec.highlights)) {
    // Chunked layout: first paragraphs -> feature quote -> highlight grid -> rest.
    const splitAt = Number.isInteger(sec.splitAfter) ? sec.splitAfter : 1;
    blurb = blurbChunkHTML(blurbParas, 0, splitAt)
      + featureQuoteHTML(sec.feature_quote)
      + highlightGridHTML(sec.highlights, sec.highlights_eyebrow)
      + blurbChunkHTML(blurbParas, splitAt, blurbParas.length);
  } else {
    blurb = blurbParas.length
      ? `<div class="policy-section-blurb">${blurbParas.map(p => paraLineHTML(p)).join('')}</div>`
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
  const transitionPreParas = asParas(sec.transition_pre);
  const transitionPre = transitionPreParas.length
    ? `<div class="policy-section-blurb policy-section-blurb--before">${transitionPreParas.map(p => paraLineHTML(p)).join('')}</div>`
    : '';
  // Verbatim supporting sentences that follow the pull-quote — rendered as
  // ordinary body text (NOT quoted), so only the key sentence stays a quote.
  const transitionBodyParas = asParas(sec.transition_body);
  const transitionBody = transitionBodyParas.length
    ? `<div class="policy-section-blurb policy-section-blurb--after">${transitionBodyParas.map(p => paraLineHTML(p)).join('')}</div>`
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
// Inline images in prose: authors drop a marker on its own line —
//   [img:name]            block image under the text
//   [img:left name]       floated left, text wraps around it
//   [img:right name]      floated right
// The marker maps to PLAYBOOK.assets['img/name']; resolveAssets() turns it
// into a data-URL (Studio) or the published bucket URL (remote/player).
function inlineVideoHTML(text) {
  const re = /\[vid(?:\s*:\s*(left|right))?(?:\s*[:\s]\s*([A-Za-z0-9_\-.]+))?\s*\]/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const side = m[1] || '';
    const name = m[2] || 'inline';
    const cls = side ? 'inline-img inline-img--' + side : 'inline-img';
    out += `<figure class="${cls} inline-vid"><video controls playsinline preload="metadata"><source src="video/${esc(name)}" /></video></figure>`;
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out;
}

// Unified inline processor: one pass over the text, replacing author markers
// with rich elements and escaping everything else exactly once.
//   [img:name]  [img:left name]  [img:right name]   inline image (block / floated)
//   [vid:name]  [vid:left name]  [vid:right name]   inline video
//   [link text](https://url)                        hyperlink
// Asset-level hotspots: pins authored against an uploaded image (by asset
// key) render wherever that image appears inline. Same markup and behaviour
// as item-level hotspot figures.
function assetHotspotsFor(kind, name) {
  var rec = PB && PB.assetHotspots && PB.assetHotspots[kind + '/' + name];
  return rec && Array.isArray(rec.hotspots) && rec.hotspots.length ? rec : null;
}
function hotspotFigureHTML(imgSrc, rec, caption, extraCls) {
  var hs = rec.hotspots;
  var showAll = rec.hotspotsMode === 'show';
  return '<figure class="policy-image hotspot-figure' + (extraCls ? ' ' + extraCls : '') + '" data-hotspots-mode="' + (showAll ? 'show' : 'reveal') + '" style="margin:16px 0;">'
    + '<div class="hotspot-wrap" style="position:relative;display:inline-block;max-width:100%;">'
    + '<img src="' + imgSrc + '" alt="' + esc(caption || '') + '" style="max-width:100%;display:block;" />'
    + hs.map(function (h, i) {
        return '<button type="button" class="hotspot-dot' + (showAll ? ' on' : '') + '" data-hotspot="' + i + '" style="position:absolute;left:' + h.x + '%;top:' + h.y + '%;">' + (i + 1) + '</button>'
          + '<div class="hotspot-pop' + (showAll ? ' show' : '') + '" data-hotspot-pop="' + i + '" style="left:' + h.x + '%;top:' + h.y + '%;">'
          + (h.label ? '<div class="hotspot-pop-title">' + esc(h.label) + '</div>' : '')
          + '<div class="hotspot-pop-text">' + esc(h.text || '') + '</div></div>';
      }).join('')
    + '</div>'
    + '<div class="hotspot-tools"><button type="button" class="hotspot-toggle">' + (showAll ? 'Click to reveal' : 'Display all hotspots') + '</button>'
    + (caption ? '<span class="hotspot-cap">' + esc(caption) + '</span>' : '') + '</div></figure>';
}

// Legacy inline media: earlier editor builds and the PDF importer wrote raw
// <figure class="inline-img">…</figure> HTML straight into paragraph text,
// which the escaping pass then displayed as literal text. Normalise those
// blocks back into [img:name] / [vid:name] markers so old content renders
// as media again without any data migration. Tolerates the closing tag on
// the next line (as seen in real drafts).
function normalizeLegacyFigures(text) {
  if (!text || text.indexOf('<figure') === -1) return text;
  return String(text)
    .replace(/<figure\s+class="inline-img(?:\s+inline-img--(left|right))?(?:\s+inline-vid)?"\s*>\s*<video[^>]*>\s*<source\s+src="video\/([^"]+)"[^>]*>\s*(?:<\/video>)?\s*(?:<\/figure>)?/g,
      function (m, side, name) { return '[vid:' + (side ? side + ' ' : '') + name + ']'; })
    .replace(/<figure\s+class="inline-img(?:\s+inline-img--(left|right))?"\s*>\s*<img\s+src="img\/([^"]+)"[^>]*>\s*(?:<\/figure>)?/g,
      function (m, side, name) { return '[img:' + (side ? side + ' ' : '') + name + ']'; });
}

function inlineRichHTML(text) {
  text = normalizeLegacyFigures(text);
  const re = /\[(img|vid)(?:\s*:\s*(left|right))?(?:\s*[:\s]\s*([A-Za-z0-9_\-.]+))?\s*\]|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    if (m[4]) {
      out += `<a href="${esc(m[5])}" target="_blank" rel="noopener noreferrer" style="color:#8f6d3f;text-decoration:underline;text-underline-offset:2px;">${esc(m[4])}</a>`;
    } else {
      const side = m[2] || '';
      const name = m[3] || 'inline';
      const cls = side ? 'inline-img inline-img--' + side : 'inline-img';
      const hsRec = m[1] === 'img' ? assetHotspotsFor('img', name) : null;
      out += m[1] === 'vid'
        ? `<figure class="${cls} inline-vid"><video controls playsinline preload="metadata"><source src="video/${esc(name)}" /></video></figure>`
        : (hsRec
            ? hotspotFigureHTML('img/' + esc(name), hsRec, '', cls)
            : `<figure class="${cls}"><img src="img/${esc(name)}" alt="" /></figure>`);
    }
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out;
}

function inlineImgHTML(text) {
  const re = /\[img(?:\s*:\s*(left|right))?(?:\s*[:\s]\s*([A-Za-z0-9_\-.]+))?\s*\]/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const side = m[1] || '';
    const name = m[2] || 'inline';
    const cls = side ? 'inline-img inline-img--' + side : 'inline-img';
    out += `<figure class="${cls}"><img src="img/${esc(name)}" alt="" /></figure>`;
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  return out;
}

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
      // "## Heading" lines become proper headings, anywhere in the intro flow.
      if (isParaHeading(p)) {
        flush(); collecting = false;
        html += paraLineHTML(p);
        return;
      }
      if (p && typeof p === 'object') {
        flush(); collecting = false;
        const cls = 'sub-intro-lead' + (p.size ? ' intro-' + p.size : '') + (p.font === 'display' ? ' intro-display' : '');
        html += `<p class="${cls}">${esc(p.text || '')}</p>`;
        return;
      }
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
        html += `<p>${inlineRichHTML(p)}</p>`;
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
  const bg = T('cover.bg', '');
  const metaTitle = (PB.meta && PB.meta.title) || 'Playbook';
  // Explore always continues to the NEXT chapter in the outline (Welcome Film
  // if it comes next, otherwise Chapter I) — never jumps straight to the menu.
  const nextAfterCover = (function () {
    const i = CHAPTERS.findIndex(function (c) { return c.id === 'cover'; });
    const rest = CHAPTERS.slice(i + 1).filter(function (c) { return c.id !== 'menu'; });
    return rest.length ? rest[0].id : 'menu';
  })();
  const hasIntro = nextAfterCover === 'intro';
  const coverLangs = (PB.meta && PB.meta.languages) || [];
  const curLang = currentLangCode() || 'en';
  const coverLangRow = coverLangs.length
    ? '<div class="cover-lang">' + [{ code: 'en', label: 'English' }].concat(coverLangs).map(function (l) {
        return '<button type="button" class="cover-lang-btn' + (l.code === curLang ? ' on' : '') + '" data-lang-switch="' + esc(l.code) + '">' + esc(l.label) + '</button>';
      }).join('') + '</div>'
    : '';
  return `
    <section class="chapter" id="cover">
      <div class="cover-full"${bg ? ` style="background-image: url('img/${bg}');"` : ' style="background:linear-gradient(160deg,#17150f 0%,#2b2417 100%);"'}>
        <div class="cover-veil"></div>
        ${coverLangRow}
        <div class="cover-inner">
          <div class="cover-top">
            <div class="cover-wordmark">${T('cover.wordmark',(PB.meta && PB.meta.wordmark) || 'Mandarin Oriental')}</div>
            <div class="cover-edition">${T('cover.edition',(PB.meta && PB.meta.edition && PB.meta.edition !== 'Edition') ? PB.meta.edition : '')}</div>
          </div>
          <div class="cover-center">
            <div class="cover-eyebrow">${T('cover.eyebrow', UI('coverEyebrow'))}</div>
            <h1 class="cover-title">${T('cover.titleHtml', esc(metaTitle))}</h1>
            <p class="cover-sub">${T('cover.sub','')}</p>
            <button class="cover-cta" data-goto="${nextAfterCover}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 6.2C10 4.8 7.2 4.2 3.5 4.2v13.9c3.7 0 6.5.6 8.5 2 2-1.4 4.8-2 8.5-2V4.2c-3.7 0-6.5.6-8.5 2z"/><path d="M12 6.2v13.9"/></svg>
              ${T('cover.ctaLabel', UI('explore'))}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---- INTRO VIDEO (welcome interstitial) ----------------------------
function renderIntro() {
  const vid = T('intro.video', '');
  // videoField stores a bare filename (e.g. "upload_…_film.mp4"); the seed
  // uses a "video/"-prefixed path. Normalise to the prefixed form so
  // resolveAssets() picks it up — without this the welcome film 404s.
  const vidNorm = vid && !/^(video\/|data:|https?:)/.test(vid) ? 'video/' + vid : vid;
  const metaTitle = esc((PB.meta && PB.meta.title) || 'Playbook');
  return `
    <section class="chapter" id="intro">
      <div class="intro-full">
        <div class="intro-inner">
          <div class="intro-eyebrow">${T('intro.eyebrow', UI('welcome'))}</div>
          <h1 class="intro-title">${T('intro.title', UI('welcomeTo') + metaTitle)}</h1>
          <div class="intro-video-wrap">
            ${vid
              ? `<video class="intro-video" src="${esc(vidNorm)}" playsinline controls preload="auto"></video>`
              : `<div style="display:flex;align-items:center;justify-content:center;min-height:240px;border:1px dashed var(--rule);color:var(--ink-mute);font-size:14px;padding:40px;text-align:center;">No welcome film yet — upload one in the Studio (Welcome Film chapter) to feature it here.</div>`}
          </div>
          <button class="intro-next" data-goto="menu">
            ${T('intro.nextLabel', UI('continueContents'))}
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
          <div class="running-mini">${T('letter.running', UI('foreword'))}</div>
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-1"]}</span>${chapterLabel('I')}</div></div>
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-2"]}</span>${chapterLabel('II')}</div></div>
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-3"]}</span>${chapterLabel('III')}</div></div>
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

/* ---- Generic interactive lifecycle wheel (any lifecycle chapter) ----------
   Same markup contract as the seed wheel (wheel-slice / wheel-caption /
   data-sub), so the existing hover/tap wiring and showWheelCaption work
   unchanged — but slice count, palette, labels and captions are all driven
   by the chapter's own stages. */
function buildGenericWheelSVG(stages, chapterLabel) {
  const N = stages.length;
  if (!N) return '';
  const cx = 300, cy = 300, rOuter = 250, rInner = 130;
  const palette = ['#E8DFCC','#DDCDA6','#C8A874','#B08544','#8F6D3F','#B08544','#C8A874','#DDCDA6'];
  const arcs = stages.map(function (s, i) {
    const startAngle = (i * 360 / N) - 90 - (360 / N / 2);
    const endAngle   = ((i + 1) * 360 / N) - 90 - (360 / N / 2);
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
    const p1 = polar(cx, cy, rOuter, startAngle);
    const p2 = polar(cx, cy, rOuter, endAngle);
    const p3 = polar(cx, cy, rInner, endAngle);
    const p4 = polar(cx, cy, rInner, startAngle);
    const d = 'M ' + p1.x + ' ' + p1.y + ' A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + p2.x + ' ' + p2.y +
              ' L ' + p3.x + ' ' + p3.y + ' A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + p4.x + ' ' + p4.y + ' Z';
    const mid = (startAngle + endAngle) / 2;
    return {
      d: d,
      fill: palette[i % palette.length],
      letter: s.letter || String.fromCharCode(65 + i),
      num: ('0' + (i + 1)).slice(-2),
      label: String(s.label || ''),
      labelPos: polar(cx, cy, (rOuter + rInner) / 2, mid),
      letterPos: polar(cx, cy, rOuter - 22, mid),
      id: s.id,
      aria: String(s.label || 'Stage')
    };
  });
  return `
    <svg class="wheel-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <g>
        ${arcs.map(function (a) { return `<path class="wheel-slice" d="${a.d}" fill="${a.fill}" stroke="#ffffff" stroke-width="2" data-sub="${a.id}" tabindex="0" role="button" aria-label="${esc(a.aria)} — explore this stage"/>`; }).join('')}
      </g>
      ${arcs.map(function (a) {
        const words = String(a.label).split(/\s+/);
        let l1 = a.label, l2 = '';
        if (a.label.length > 12 && words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          l1 = words.slice(0, mid).join(' ');
          l2 = words.slice(mid).join(' ');
        }
        // Number + label stacked as one group in the middle of the wedge —
        // no radial collision, whatever the slice angle.
        return `
        <text x="${a.labelPos.x}" y="${a.labelPos.y - 12}" text-anchor="middle" dominant-baseline="middle" style="font:600 21px 'Avenir Next LT Pro',system-ui,sans-serif;fill:#0d0b08;">${esc(a.num)}</text>
        <text class="wheel-label" x="${a.labelPos.x}" y="${a.labelPos.y + 6}" text-anchor="middle" dominant-baseline="middle">${esc(l1)}</text>
        ${l2 ? `<text class="wheel-label" x="${a.labelPos.x}" y="${a.labelPos.y + 19}" text-anchor="middle" dominant-baseline="middle">${esc(l2)}</text>` : ''}`; }).join('')}
      <circle cx="300" cy="300" r="118" fill="#FAF9F6" stroke="#C9A879" stroke-width="1"/>
      <text x="300" y="296" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-style="italic" fill="#0d0b08">${esc(chapterLabel || 'Lifecycle')}</text>
      <text x="300" y="326" text-anchor="middle" font-family="Avenir Next LT Pro, system-ui, sans-serif" font-size="10" letter-spacing="3" fill="#6b625a">${N} STAGE${N === 1 ? '' : 'S'}</text>
    </svg>`;
}

function lifecycleWheelHTML(ch) {
  if (!LIFECYCLE.length) return '';
  const prefix = ch.id.replace('ch-', 'ch');
  const eyebrow = T(prefix + '.wheel.eyebrow', 'Process & Lifecycle');
  const lede = T(prefix + '.wheel.lede', 'Select any stage to explore its guidance.');
  return `
    <div class="wheel-spread">
      <div class="section-eyebrow" style="max-width: 720px; margin: 0 auto 24px;">
        <span class="num">◈</span>
        <span class="txt">${eyebrow}</span>
        <span class="rule"></span>
      </div>
      <p class="spread-lede center" style="max-width: 640px; margin: 0 auto 12px;">${lede}</p>
      <div class="wheel-layout">
        <div class="wheel-wrap">${buildGenericWheelSVG(LIFECYCLE, ch.label || '')}</div>
        <div class="wheel-caption" id="wheelCaption-${esc(ch.id)}" aria-live="polite">
          <div class="wheel-caption-inner wheel-caption--rest" data-state="rest">
            <div class="wheel-caption-eyebrow">${LIFECYCLE.length} Stage${LIFECYCLE.length === 1 ? '' : 's'}</div>
            <h3 class="wheel-caption-title">Explore ${esc(ch.label || 'the lifecycle')}</h3>
            <p class="wheel-caption-desc">Hover over a stage on the wheel to preview it — or tap a stage to see its focus, then open it in full.</p>
          </div>
          ${LIFECYCLE.map(function (s, i) {
            const c2 = PB_LIFECYCLE_CONTENT[s.id] || {};
            const hasContent = (c2.sections || []).length || s.lede || s.img || (c2.intro || []).length || c2.tagline;
            const cta = s.link
              ? `<button class="wheel-caption-cta" data-goto="${esc(s.link)}">Open chapter`
              : (hasContent && ch.showStagePages === 'shown' ? `<button class="wheel-caption-cta" data-goto="${esc(ch.id)}" data-sub="${s.id}">Explore this stage` : '');
            return `
            <div class="wheel-caption-inner" data-sub="${s.id}" hidden>
              <div class="wheel-caption-eyebrow">${esc(s.letter || String.fromCharCode(65 + i))} · Stage ${i + 1} · ${esc(ch.label || '')}</div>
              <h3 class="wheel-caption-title">${esc(s.label || '')}</h3>
              <p class="wheel-caption-desc">${esc(s.lede || '')}</p>
              ${cta ? cta + `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>` : ''}
            </div>`; }).join('')}
        </div>
      </div>
    </div>`;
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-4"]}</span>${chapterLabel('IV')}</div></div>
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-5"]}</span>${chapterLabel('V')}</div></div>
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
              <div class="opener-top-left"><button class="opener-back" data-goto="menu" aria-label="${UI('backContents')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>${UI('contents')}</button><div class="opener-numeral"><span class="opener-icon">${ICONS["ch-6"]}</span>${chapterLabel('VI')}</div></div>
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
      ${c.hasSubs || (chapterTypeOf(c) === 'part' && (c.subs || []).length) ? `
        <ul class="rail-sub" data-parent="${c.id}">
          ${(chapterTypeOf(c) === 'part' ? (c.subs || []) : LIFECYCLE).map(s => `<li${s.depth === 2 ? ' class="lvl2"' : (s.depth === 3 ? ' class="lvl3"' : '')}><button data-goto="${c.id}" data-sub="${s.id}" data-letter="${s.letter || ''}"><span>${s.label}</span></button></li>`).join('')}
        </ul>
      ` : ''}
    </li>
  `).join('');
}

// ---- VISUAL CONTENTS MENU ------------------------------------------
function renderMenu() {
  // Tile image: prefer the chapter's prose opener background (what the
  // Studio's Opener image field writes); accept the seed's filename-style
  // opener only when it actually looks like an image; otherwise a plain
  // gradient tile (never a broken image).
  function menuCardImg(c) {
    const prefix = c.id.replace('ch-', 'ch');
    let img = T(prefix + '.opener.bg', '');
    if (!img && /\.(jpe?g|png|webp|gif|svg)$/i.test(c.opener || '')) img = c.opener;
    return img;
  }
  const chapterCards = CHAPTERS.filter(c => c.id !== 'cover' && c.id !== 'letter' && c.id !== 'intro').map(c => {
    const img = menuCardImg(c);
    return `
    <button class="menu-card" data-goto="${c.id}">
      ${img
        ? `<div class="menu-card-img"><img src="img/${img}" alt="${c.label}" loading="lazy" /></div>`
        : `<div class="menu-card-img" style="background:linear-gradient(135deg,#F4F1EA 0%,#E7DFCE 100%);"></div>`}
      <div class="menu-card-body">
        <div class="menu-card-eyebrow">${ICONS[c.id] ? `<span class="menu-card-icon">${ICONS[c.id]}</span>` : ''}${c.numeral ? chapterLabel(c.numeral) : (c.isVideo ? UI('welcomeFilm') : UI('foreword'))}</div>
        <div class="menu-card-title">${c.label}</div>
        <div class="menu-card-desc">${MENU_DESC[c.id] || ''}</div>
      </div>
    </button>`;
  }).join('');

  return `
    <section class="chapter" id="menu">
      <div class="spread">
        <div class="spread-header">
          <div class="running-mini">${T('menu.running', isSeedPlaybook() ? 'People &amp; Culture' : esc((PB.meta && PB.meta.title) || ''))}</div>
          <div class="center-rule"></div>
          <h2 class="spread-title center">${T('menu.title', UI('menuTitle'))}</h2>
          <p class="spread-lede center">${T('menu.lede','')}</p>
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
  // The id-based legacy mapping only applies to the genuine P&C seed — an
  // authored playbook's "ch-1" is just its first chapter (e.g. Purpose), not
  // the seed's foreword set-piece. Without this guard, authored ch-1 content
  // (sections, videos) renders as the letter layout and its body vanishes.
  if (!isSeedPlaybook()) return ch.hasSubs ? 'lifecycle' : 'standard';
  if (ch.id === 'ch-1') return 'letter';
  if (ch.hasSubs) return 'lifecycle';
  if (ch.id === 'ch-2') return 'directory';
  return 'standard';
}

// Per-chapter section bodies. The seed's two bespoke bodies stay on
// PB.ch4 / PB.ch5; chapters created in the editor store theirs under
// PB.sectionBodies[chapterId].
function chapterBodyFor(ch) {
  // Authored content wins: any chapter with a body in sectionBodies uses it.
  // The ch-4/ch-5 legacy containers only apply to the seed playbook, which
  // has no sectionBodies entries for those ids.
  if (PB.sectionBodies && PB.sectionBodies[ch.id]) return PB.sectionBodies[ch.id];
  if (ch.id === 'ch-4') return PB_CH4_CONTENT;
  if (ch.id === 'ch-5') return PB_CH5_CONTENT;
  return { intro: [], sections: [] };
}

// Generic magazine-style chapter page, used for any chapter that has no
// bespoke (seed) renderer — i.e. everything authored from a blank playbook.
// Tile-menu chapter: a grid of cards (same visual language as the root
// Contents page), each linking to another chapter. Authored in the Studio as
// an ordered list of {title, text, img, target} tiles.
function tileMenuChapterHTML(ch) {
  var tiles = ch.tiles || [];
  var b = chapterBodyFor(ch);
  var intro = b.intro && b.intro.length ? subIntroHTML({ intro: b.intro }) : '';
  if (!tiles.length) {
    return '<div class="spread">' + intro + '<p style="color:var(--ink-mute);max-width:560px;">This menu has no tiles yet — add some in the Studio. Each tile links to a chapter.</p></div>';
  }
  return '<div class="spread">' + intro + '<div class="menu-grid">' + tiles.map(function (t, i) {
    var img = t.img || '';
    return '<button class="menu-card" data-goto="' + esc(t.target || 'menu') + '">' +
      (img
        ? '<div class="menu-card-img"><img src="img/' + esc(img) + '" alt="' + esc(t.title || '') + '" loading="lazy" /></div>'
        : '<div class="menu-card-img" style="background:linear-gradient(135deg,#F4F1EA 0%,#E7DFCE 100%);"></div>') +
      '<div class="menu-card-body">' +
        '<div class="menu-card-eyebrow">' + ('0' + (i + 1)).slice(-2) + '</div>' +
        '<div class="menu-card-title">' + esc(t.title || 'Tile') + '</div>' +
        '<div class="menu-card-desc">' + esc(t.text || '') + '</div>' +
      '</div>' +
    '</button>';
  }).join('') + '</div></div>';
}

// Card-track diagram: a horizontal track of linked cards on a spine (an
// opportunity/section map). Each card carries number, eyebrow, title, pill
// and inner link chips that navigate to chapters. Stacks vertically on
// mobile (CSS).
function cardTrackHTML(ch) {
  var cards = ch.track || [];
  var b = chapterBodyFor(ch);
  var intro = b.intro && b.intro.length ? subIntroHTML({ intro: b.intro }) : '';
  if (!cards.length) {
    return '<div class="spread">' + intro + '<p style="color:var(--ink-mute);max-width:560px;">No cards yet — add some in the Studio. Each card can link to chapters.</p></div>';
  }
  return '<div class="spread">' + intro + '<div class="pb-track">' +
    cards.map(function (c) {
      return '<div class="pb-track-card">' +
        '<span class="pb-track-dot" aria-hidden="true"></span>' +
        (c.num ? '<div class="pb-track-num">' + esc(c.num) + '</div>' : '') +
        (c.icon ? '<div class="pb-track-icon">' + esc(c.icon) + '</div>' : '') +
        (c.label ? '<div class="pb-track-label">' + esc(c.label) + '</div>' : '') +
        '<div class="pb-track-title">' + esc(c.title || 'Card') + '</div>' +
        (c.pill ? '<div class="pb-track-pill">' + esc(c.pill) + '</div>' : '') +
        ((c.links || []).length
          ? '<div class="pb-track-links">' + c.links.map(function (l) {
              return '<button type="button" class="pb-track-link" data-goto="' + esc(l.target || 'menu') + '">' +
                (l.num ? '<span class="pb-track-link-num">' + esc(l.num) + '</span>' : '') +
                '<span class="pb-track-link-name">' + esc(l.name || 'Link') + '</span>' +
                '<span class="pb-track-arrow">→</span></button>';
            }).join('') + '</div>'
          : '') +
      '</div>';
    }).join('') +
  '</div></div>';
}

// Process diagram chapter ("MO Luminous Cards" directory): a reference
// diagram of section cards on a spine, each with linked step rows that
// navigate to chapters. Author-provided design system (.mo-opp). Desktop
// grid; mobile accordion (delegated handler below).
var PROC_ICONS = {
  ruler: '<svg width="30" height="30" viewBox="0 0 30 30"><rect x="4" y="9.5" width="22" height="11" rx="2"/><path d="M9 9.5v4M13.5 9.5v4M18 9.5v4M22.5 9.5v4"/></svg>',
  tag: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M6 6h8l10 10-8 8L6 14V6z"/><circle cx="11" cy="11" r="1.6"/></svg>',
  sliders: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M6 9h18M6 15h18M6 21h18"/><circle cx="12" cy="9" r="2.4" fill="#FDFDF3"/><circle cx="19" cy="15" r="2.4" fill="#FDFDF3"/><circle cx="10" cy="21" r="2.4" fill="#FDFDF3"/></svg>',
  flag: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M9 26V5"/><path d="M9 6c3-2 6 2 9 0s4-1 4-1v9s-1-1-4 1-6-2-9 0"/></svg>',
  calendar: '<svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="7" width="20" height="18" rx="2"/><path d="M5 12h20M10 4v5M20 4v5"/></svg>',
  chart: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M6 25V5"/><path d="M6 25h19"/><path d="M10 20l4-5 4 3 6-8"/></svg>',
  check: '<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10"/><path d="M10 15.4l3.4 3.4L20 12"/></svg>',
  doc: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M9 4h9l5 5v17H9z"/><path d="M18 4v5h5"/><path d="M12 15h8M12 19h8"/>'
};
function procIcon(key) { return PROC_ICONS[key] || PROC_ICONS.ruler; }
function pluralUnit(n, unit) { return n + ' ' + (unit || 'item') + (n === 1 ? '' : ((unit || '').endsWith('y') ? 'ies' : 's')); }

function processDiagramHTML(ch) {
  var d = ch.diagram || {};
  var b = chapterBodyFor(ch);
  var intro = b.intro && b.intro.length ? subIntroHTML({ intro: b.intro }) : '';
  var sections = d.sections || [];
  var unit = d.unit || 'opportunity';
  var cols = sections.map(function (s, si) {
    var links = s.links || [];
    var count = pluralUnit(links.length, unit);
    var meta = (s.label || ('Section ' + (si + 1))) + ' \u00b7 ' + count;
    return '<div class="mo-opp__col" style="--d: ' + (si * 0.12).toFixed(2) + 's;">' +
      '<article class="mo-opp__section">' +
        '<button class="mo-opp__head" type="button" aria-expanded="false" aria-controls="mo-opp-body-' + si + '">' +
          '<span class="mo-opp__section-top">' +
            '<span class="mo-opp__icon" aria-hidden="true">' + procIcon(s.icon) + '</span>' +
            '<span class="mo-opp__num">' + esc(s.num || ('0' + (si + 1)).slice(-2)) + '</span>' +
          '</span>' +
          '<span class="mo-opp__head-text">' +
            '<span class="mo-opp__section-label">' + esc(s.label || ('Section ' + (si + 1))) + '</span>' +
            '<span class="mo-opp__head-meta">' + esc(meta) + '</span>' +
            '<span class="mo-opp__section-name">' + esc(s.name || 'Section') + '</span>' +
          '</span>' +
          '<span class="mo-opp__count">' + esc(count) + '</span>' +
          '<span class="mo-opp__chevron" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2.5 9.5 7 5 11.5"/></svg></span>' +
        '</button>' +
        '<div class="mo-opp__body" id="mo-opp-body-' + si + '"><div class="mo-opp__body-inner">' +
          links.map(function (l, li) {
            return '<button type="button" class="mo-opp__link" style="--d: ' + (li * 0.05).toFixed(2) + 's;" data-goto="' + esc(l.target || 'menu') + '">' +
              '<span class="mo-opp__link-num">' + esc(l.num || String(li + 1)) + '</span>' +
              '<span class="mo-opp__link-text">' +
                '<span class="mo-opp__link-name">' + esc(l.name || 'Link') + '</span>' +
                (l.ref ? '<span class="mo-opp__link-chapter">' + esc(l.ref) + '</span>' : '') +
              '</span>' +
              '<span class="mo-opp__link-arrow" aria-hidden="true"><svg width="18" height="12" viewBox="0 0 18 12"><path d="M1 6h14M10.5 1.5 15 6l-4.5 4.5"/></svg></span>' +
            '</button>';
          }).join('') +
        '</div></div>' +
      '</article>' +
    '</div>';
  }).join('');
  return '<div class="spread">' + intro + '<div class="mo-opp-ground"><section class="mo-opp" aria-label="Process diagram">' +
    '<header class="mo-opp__header"><div>' +
      (d.eyebrow ? '<p class="mo-opp__eyebrow">' + esc(d.eyebrow) + '</p>' : '') +
      (d.title ? '<h1 class="mo-opp__title">' + esc(d.title) + '</h1>' : '') +
      (d.subline ? '<p class="mo-opp__subline">' + esc(d.subline) + '</p>' : '') +
    '</div>' + (d.pill ? '<span class="mo-opp__pill">' + esc(d.pill) + '</span>' : '') + '</header>' +
    '<div class="mo-opp__panel"><div class="mo-opp__grid' + (sections.length >= 6 ? ' mo-opp__grid--many' : '') + '" style="--cols:' + Math.max(sections.length, 1) + '">' + cols + '</div>' +
    (d.footnote ? '<footer class="mo-opp__footer"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10"/><path d="M7 11.4l2.6 2.6L15 8.6"/></svg><p>' + esc(d.footnote) + '</p></footer>' : '') +
    '</div>' +
  '</section></div></div>';
}

// Chapter-level content items and sections authored on a diagram-type
// chapter (lifecycle wheel, tile menu, card track, process diagram). Those
// layouts render their bespoke visual only — this appends anything the author
// added beneath it, so items never silently vanish on non-standard types.
function chapterBodyExtrasHTML(ch) {
  var b = chapterBodyFor(ch);
  var html = (b.items || []).map(policyItemHTML).join('') +
    (b.sections || []).map(sectionHTML).join('');
  return html ? '<div class="spread">' + html + '</div>' : '';
}

// Opening paragraphs for chapter types whose bespoke layout would otherwise
// drop them (lifecycle, directory; tile-menu / card-track / process-diagram
// render their intro inside their own templates).
function chapterIntroHTML(ch) {
  var b = chapterBodyFor(ch);
  return (b.intro && b.intro.length) ? '<div class="spread">' + subIntroHTML({ intro: b.intro }) + '</div>' : '';
}

function renderGenericChapter(ch, prevId, nextId) {
  const type = chapterTypeOf(ch);
  const prefix = ch.id.replace('ch-', 'ch'); // prose key convention: ch-7 -> ch7
  const bg = T(prefix + '.opener.bg', '');
  const title = T(prefix + '.opener.title', '') || esc(ch.label || '');
  const sub = T(prefix + '.opener.sub', ch.opener || '');
  const eyebrow = T(prefix + '.opener.eyebrow', '');
  const backBtn = '<button class="opener-back" data-goto="menu" aria-label="' + UI('backContents') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' + UI('contents') + '</button>';
  // Chapter label on the opener: default "Chapter N"; a custom label replaces
  // it verbatim (e.g. "Section 3 · Opportunity 5"); hideLabel or a blank
  // numeral removes it entirely.
  const numeral = ch.hideLabel ? '' : (ch.labelText ? esc(ch.labelText) : (ch.numeral ? chapterLabel(esc(ch.numeral)) : ''));

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

  // Opener video: renders between the chapter header and the body text,
  // aligned to the same 720px text column.
  const openerVid = T(prefix + '.opener.video', '');
  const openerVideoHTML = openerVid
    ? `<div class="opener-video" style="max-width:720px;margin:28px 0;"><video controls playsinline preload="metadata" style="width:100%;display:block;background:#0d0b08;"><source src="video/${esc(openerVid)}" /></video></div>`
    : '';

  let body = '';
  if (type === 'lifecycle') {
    body = chapterIntroHTML(ch) + lifecycleWheelHTML(ch) + LIFECYCLE.filter(function (s) {
      // Bottom stage pages are OFF by default and only render when the chapter
      // explicitly opts in ('shown'), the stage has content, and it is not
      // redirected to another chapter.
      if (ch.showStagePages !== 'shown') return false;
      var c = PB_LIFECYCLE_CONTENT[s.id] || {};
      var hasContent = (c.sections || []).length || s.lede || s.img || (c.intro || []).length || c.tagline;
      return hasContent && !s.link;
    }).map(s => {
      const c = PB_LIFECYCLE_CONTENT[s.id] || { sections: [] };
      const hero = s.img
        ? `<div class="stage-hero" style="margin:0 0 28px;"><img src="img/${esc(s.img)}" alt="${esc(s.label || 'Stage')}" style="width:100%;display:block;" /></div>`
        : '';
      return `
        <div class="spread tight" id="${esc(s.id)}">
          ${hero}
          <div class="section-eyebrow"><span class="txt">${esc((s.letter ? s.letter + '. ' : '') + (s.label || ''))}</span><span class="rule"></span></div>
          ${s.lede ? `<div class="editorial-body"><p>${inlineRichHTML(s.lede)}</p></div>` : ''}
          ${(c.sections || []).map(sectionHTML).join('')}
        </div>`;
    }).join('') + chapterBodyExtrasHTML(ch);
  } else if (type === 'directory') {
    body = chapterIntroHTML(ch) + `
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
      ${BELIEFS && BELIEFS.length ? `<div class="spread tight">${beliefsTabsHTML()}</div>` : ''}` + chapterBodyExtrasHTML(ch);
  } else if (type === 'tile-menu') {
    body = tileMenuChapterHTML(ch) + chapterBodyExtrasHTML(ch);
  } else if (type === 'card-track') {
    body = '<div class="spread">' + openerVideoHTML + '</div>' + cardTrackHTML(ch) + chapterBodyExtrasHTML(ch);
  } else if (type === 'process-diagram') {
    body = '<div class="spread">' + openerVideoHTML + '</div>' + processDiagramHTML(ch) + chapterBodyExtrasHTML(ch);
  } else if (type === 'part') {
    // Part chapter: opener + part intro, then each sub-topic as its own
    // anchored block (rail links scroll to them). No wheel — this is the
    // document-hierarchy model, not the lifecycle model.
    const pb = chapterBodyFor(ch);
    body = `<div class="spread">
      ${openerVideoHTML}
      ${pb.intro && pb.intro.length ? subIntroHTML({ intro: pb.intro }) : ''}
      ${(pb.items || []).map(policyItemHTML).join('')}
      ${(pb.sections || []).map(sectionHTML).join('')}
      ${(ch.subs || []).map(function (sub) {
        const sb = chapterBodyFor({ id: sub.id });
        const tier = sub.depth === 3 ? 'sub' : (sub.depth === 2 ? 'topic' : 'section');
        return `
        <div class="spread tight part-${tier}" id="${esc(sub.id)}">
          <div class="section-eyebrow${tier !== 'section' ? ' part-' + tier + '-eyebrow' : ''}"><span class="txt">${esc(sub.label || '')}</span><span class="rule"></span></div>
          ${sb.intro && sb.intro.length ? subIntroHTML({ intro: sb.intro }) : ''}
          ${(sb.sections || []).map(sectionHTML).join('')}
        </div>`;
      }).join('')}
    </div>`;
  } else {
    const b = chapterBodyFor(ch);
    body = `<div class="spread">
      ${openerVideoHTML}
      ${b.intro && b.intro.length ? subIntroHTML({ intro: b.intro }) : ''}
      ${(b.items || []).map(policyItemHTML).join('')}
      ${(b.sections || []).map(sectionHTML).join('')}
    </div>`;
  }

  return `
    <section class="chapter" id="${esc(ch.id)}">
      ${opener}
      ${body}
      ${chapterNavHTML(prevId, nextId)}
      ${cycleDockHTML(ch)}
    </section>`;
}

// ---- Lifecycle step dock ----
// Chapters AND part subs may declare cycle = { wid, index } pointing at a
// lifecycle wheel element (s:'wheel', it.wid) anywhere in the playbook. The
// dock reads that wheel's stages LIVE at render time — rename, reorder or add
// stages in the wheel and every linked dock updates automatically. On part
// chapters with several linked subs, one fixed dock follows the scroll and
// highlights the step whose spread is currently in view.
function findWheelById(wid) {
  if (!wid || !PB || !PB.sectionBodies) return null;
  var bodies = PB.sectionBodies;
  for (var key in bodies) {
    var b = bodies[key]; if (!b) continue;
    var pools = [];
    if (Array.isArray(b.items)) pools.push(b.items);
    (Array.isArray(b.sections) ? b.sections : []).forEach(function (s) { if (s && Array.isArray(s.items)) pools.push(s.items); });
    for (var pi = 0; pi < pools.length; pi++) {
      for (var ii = 0; ii < pools[pi].length; ii++) {
        var it = pools[pi][ii];
        if (it && it.s === 'wheel' && (it.wid === wid || it.name === wid)) {
          // map the body key back to its chapter (+ sub, when nested in a part)
          var loc = { chapterId: key, subId: '' };
          (PB.chapters || []).forEach(function (ch) {
            if (ch.id === key) { loc.chapterId = ch.id; loc.subId = ''; }
            (Array.isArray(ch.subs) ? ch.subs : []).forEach(function (s) { if (s.id === key) { loc.chapterId = ch.id; loc.subId = s.id; } });
          });
          return { it: it, chapterId: loc.chapterId, subId: loc.subId };
        }
      }
    }
  }
  return null;
}

function cycleDockHTML(ch) {
  if (!ch) return '';
  var entries = [];
  if (ch.cycle && ch.cycle.wid && ch.cycle.index != null) entries.push({ a: '', i: Number(ch.cycle.index) || 0, wid: ch.cycle.wid });
  (Array.isArray(ch.subs) ? ch.subs : []).forEach(function (s) {
    if (s && s.cycle && s.cycle.wid && s.cycle.index != null) entries.push({ a: s.id, i: Number(s.cycle.index) || 0, wid: s.cycle.wid });
  });
  if (!entries.length) return '';
  var found = findWheelById(entries[0].wid);
  if (!found) return '';
  var stages = (Array.isArray(found.it.stages) ? found.it.stages : []).filter(function (s) { return s && s.label; });
  var n = stages.length;
  if (!n) return '';
  entries.forEach(function (e) { e.i = Math.max(0, Math.min(e.i, n - 1)); });
  var cx = 26, cy = 26, rr = 20, stepA = 360 / n, gap = n > 1 ? 4 : 0;
  function pt(a) { var rad = (a - 90) * Math.PI / 180; return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)]; }
  var segs = '';
  for (var i = 0; i < n; i++) {
    var p0 = pt(i * stepA + gap / 2), p1 = pt((i + 1) * stepA - gap / 2);
    var large = (stepA - gap) > 180 ? 1 : 0;
    var on = i === entries[0].i;
    segs += '<path class="pb-cyc-seg" data-i="' + i + '" d="M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A ' + rr + ' ' + rr + ' 0 ' + large + ' 1 ' +
      p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '" fill="none" stroke="' + (on ? '#B59060' : '#8a9a8b') +
      '" stroke-opacity="' + (on ? '1' : '.38') + '" stroke-width="7" stroke-linecap="round"/>';
  }
  var labels = stages.map(function (s) { return String(s.label || ''); });
  var hub = String(found.it.hubTitle || found.it.name || '');
  var first = entries[0];
  return '<button type="button" class="pb-cyc-dock"' +
    ' data-goto="' + esc(found.chapterId) + '"' + (found.subId ? ' data-sub="' + esc(found.subId) + '"' : '') +
    ' data-cycentries="' + esc(JSON.stringify(entries.map(function (e) { return { a: e.a, i: e.i }; }))) + '"' +
    ' data-cyclabels="' + esc(JSON.stringify(labels)) + '"' +
    ' data-cychub="' + esc(hub) + '"' +
    ' aria-label="Step ' + (first.i + 1) + ' of ' + n + ' — ' + esc(labels[first.i]) + '. Open the ' + esc(hub || 'lifecycle') + ' diagram.">' +
    '<svg viewBox="0 0 52 52" width="50" height="50" aria-hidden="true">' + segs +
    '<circle cx="26" cy="26" r="13" fill="#FDFDF3"/>' +
    '<text x="26" y="30" text-anchor="middle" class="pb-cyc-docknum">' + ('0' + (first.i + 1)).slice(-2) + '</text></svg>' +
    '<span class="pb-cyc-docklbl"><b class="pb-cyc-step">Step ' + (first.i + 1) + ' of ' + n + '</b>' +
    '<span class="pb-cyc-name">' + esc(labels[first.i]) + (hub ? ' · ' + esc(hub) : '') + '</span></span></button>';
}

function cycleDockSetState(dock, idx) {
  var labels = [];
  try { labels = JSON.parse(dock.getAttribute('data-cyclabels') || '[]'); } catch (e) {}
  var hub = dock.getAttribute('data-cychub') || '';
  var n = labels.length || dock.querySelectorAll('.pb-cyc-seg').length;
  dock.querySelectorAll('.pb-cyc-seg').forEach(function (seg) {
    var on = Number(seg.getAttribute('data-i')) === idx;
    seg.setAttribute('stroke', on ? '#B59060' : '#8a9a8b');
    seg.setAttribute('stroke-opacity', on ? '1' : '.38');
  });
  var num = dock.querySelector('.pb-cyc-docknum');
  if (num) num.textContent = ('0' + (idx + 1)).slice(-2);
  var step = dock.querySelector('.pb-cyc-step');
  if (step) step.textContent = 'Step ' + (idx + 1) + ' of ' + n;
  var name = dock.querySelector('.pb-cyc-name');
  if (name) name.textContent = (labels[idx] || '') + (hub ? ' · ' + hub : '');
  dock.setAttribute('aria-label', 'Step ' + (idx + 1) + ' of ' + n + ' — ' + (labels[idx] || '') + '. Open the ' + (hub || 'lifecycle') + ' diagram.');
}

// Re-arm dock scroll-following after every render. The single fixed dock on a
// chapter highlights the step whose sub spread is most in view; chapters with
// only their own ch.cycle stay static (no anchored entries to observe).
// Pin the dock's horizontal position to the chapter's content column (the
// .spread's text edge), so the pill sits under the body copy rather than out
// by the contents rail. Falls back to the CSS left:22px when no spread found.
function cycleDockPlace(dock) {
  if (window.innerWidth <= 640) { dock.style.left = ''; return; } // mobile: CSS rules
  var ch = dock.closest('.chapter');
  var spread = ch && ch.querySelector('.spread');
  if (!spread) { dock.style.left = ''; return; }
  var r = spread.getBoundingClientRect();
  var padL = parseFloat((window.getComputedStyle ? getComputedStyle(spread).paddingLeft : '0')) || 0;
  dock.style.left = Math.max(12, Math.round(r.left + padL)) + 'px';
}
function cycleDockPlaceAll() {
  document.querySelectorAll('.pb-cyc-dock').forEach(cycleDockPlace);
}
if (typeof window !== 'undefined' && !window._cycDockResizeWired) {
  window._cycDockResizeWired = true;
  window.addEventListener('resize', function () { try { cycleDockPlaceAll(); } catch (e) {} });
}

// A dock is visible only while one of its LINKED anchors is actually on screen
// (it "belongs" to those sections, not the whole chapter). Entries with no
// anchor are chapter-level links — those docks stay visible for the whole
// chapter, as before.
function cycleDockVisibility(dock, entries, ratios) {
  var any = entries.some(function (e) { return !e.a || (ratios[e.a] || 0) > 0; });
  dock.classList.toggle('pb-cyc-dock--hidden', !any);
}

var _cycDockObserver = null;
function cycleDockScan() {
  if (_cycDockObserver) { _cycDockObserver.disconnect(); _cycDockObserver = null; }
  try { cycleDockPlaceAll(); } catch (e) {}
  if (typeof IntersectionObserver === 'undefined') return;
  var ratios = {};
  _cycDockObserver = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { ratios[en.target.id] = en.intersectionRatio; });
    document.querySelectorAll('.pb-cyc-dock[data-cycentries]').forEach(function (dock) {
      var entries;
      try { entries = JSON.parse(dock.getAttribute('data-cycentries') || '[]'); } catch (e) { return; }
      var best = null, bestR = 0;
      entries.forEach(function (e) {
        if (!e.a) return;
        var r = ratios[e.a] || 0;
        if (r > bestR) { bestR = r; best = e; }
      });
      if (best) cycleDockSetState(dock, best.i);
      cycleDockVisibility(dock, entries, ratios);
    });
  }, { threshold: [0, 0.15, 0.35, 0.55, 0.75] });
  document.querySelectorAll('.pb-cyc-dock[data-cycentries]').forEach(function (dock) {
    var entries;
    try { entries = JSON.parse(dock.getAttribute('data-cycentries') || '[]'); } catch (e) { return; }
    var anchored = entries.filter(function (e) { return !!e.a; });
    // Start hidden until the observer reports; a chapter-level link (no
    // anchor) keeps the dock visible throughout.
    dock.classList.toggle('pb-cyc-dock--hidden', anchored.length > 0 && entries.length === anchored.length);
    anchored.forEach(function (e) {
      var elx = document.getElementById(e.a);
      if (elx) _cycDockObserver.observe(elx);
    });
  });
}

// True only for the genuine P&C seed (or a duplicate of it) — NOT merely any
// playbook with prose keys, since the editor writes prose on every upload.
// The marker key is seed-specific and never written by the generic editor.
function isSeedPlaybook() {
  // Seed-bespoke 'band' prose keys are never written by the generic editor,
  // and meta.fromSeed marks duplicates made from the seed going forward.
  return !!(PB && ((PB.meta && PB.meta.fromSeed) ||
    (PB.prose && (PB.prose['ch5.band.img'] || PB.prose['ch4.band.img'] || PB.prose['ch2.band.img']))));
}

function renderAll() {
  const reader = document.getElementById('reader');
  const parts = [renderCover()];
  // The Welcome Film page renders only when the playbook actually has an
  // intro chapter in its outline — never as a hidden page.
  const hasIntro = CHAPTERS.some(function (c) { return c.id === 'intro' || chapterTypeOf(c) === 'intro-video'; });
  if (hasIntro) parts.push(renderIntro());
  parts.push(renderMenu());
  // Bespoke seed renderers are used only for the genuine seed playbook, so
  // no seed wording leaks into authored playbooks.
  const seedLike = isSeedPlaybook();
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
  var bare = path.replace(/^(img|video)\//, '');
  if (a['img/' + bare]) return a['img/' + bare];
  if (a['video/' + bare]) return a['video/' + bare];
  if (a[bare]) return a[bare];
  // Remote shells: anything not embedded lives at the published asset base —
  // including bare prose filenames (cover.bg, opener.bg, intro.video), which
  // otherwise 404 against the SCORM package's missing img/ folder.
  if (PB.__remoteAssetBase && bare) return PB.__remoteAssetBase + bare;
  return null;
}
function resolveAssets(root) {
  if ((!PB.assets || !Object.keys(PB.assets).length) && !PB.__remoteAssetBase) return;
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

function goTo(chapterId, subId, opts) {
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
    if (opts && opts.keepY != null) { window.scrollTo(0, opts.keepY); return; }
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

  // Menu-type pages (the root Contents page and tile-menu chapters): hide the
  // left rail — it duplicates the tiles on screen. The rail returns when you
  // visit a content chapter, and the floating Contents button stays available.
  var chObj = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).filter(function (c) { return c.id === chapterId; })[0];
  var isMenuPage = chapterId === 'menu' || !!(chObj && chapterTypeOf(chObj) === 'tile-menu');
  document.body.classList.toggle('on-menu', isMenuPage);

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

  // Re-arm the lifecycle dock: the freshly shown chapter's spread may sit at a
  // different left offset, and newly visible subs feed the scroll-follow.
  try { cycleDockScan(); } catch (e) {}
}

// ---- Search --------------------------------------------------------
function buildSearchIndex() {
  const idx = [];
  CHAPTERS.forEach(c => {
    if (c.id === 'cover' || c.id === 'intro') return;
    idx.push({ chapter: c.id, sub: null, title: c.numeral ? `${c.numeral}. ${c.label}` : c.label, crumb: c.numeral ? UI('chapterCrumb') : UI('foreword'), text: c.label });
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
      results.innerHTML = `<div class="search-result"><div class="sr-title">${UI('noResults')}</div><div class="sr-crumb">${UI('noResultsHint')}</div></div>`;
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
  const cap = (typeof currentChapter !== 'undefined' && document.getElementById('wheelCaption-' + currentChapter)) ||
              document.getElementById('wheelCaption');
  if (!cap) return;
  cap.querySelectorAll('.wheel-caption-inner').forEach(el => {
    el.hidden = (el.dataset.sub !== subId) && !(subId === null && el.dataset.state === 'rest');
  });
  document.querySelectorAll('.wheel-slice').forEach(sl => {
    sl.classList.toggle('is-active', sl.dataset.sub === subId);
  });
}

// In the Studio preview, clicking a menu tile opens that chapter's editor on
// the right WITHOUT navigating away from the menu — editing happens in the
// side panel. The capture phase suppresses the normal data-goto navigation
// for tiles/header only; every other link still navigates as usual.
if (!window.__menuSelectWired) {
  window.__menuSelectWired = true;
  document.addEventListener('click', function (e) {
    if (!window.__inStudio || window.parent === window) return;
    var card = e.target && e.target.closest ? e.target.closest('.menu-card') : null;
    var hdr = e.target && e.target.closest ? e.target.closest('.chapter#menu .spread-header') : null;
    var id = card ? card.getAttribute('data-goto') : (hdr ? 'cover' : null);
    if (id) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'studio-select', id: id }, '*');
    }
  }, true);
}

// Video codec hint: if a video element fails to load (typically iPhone HEVC,
// which browsers cannot decode), say so under the frame instead of leaving a
// greyed 0:00 player with no explanation.
if (!window.__videoErrorHintWired) {
  window.__videoErrorHintWired = true;
  document.addEventListener('error', function (e) {
    var v = e.target;
    if (!v || (v.tagName !== 'VIDEO' && v.tagName !== 'SOURCE')) return;
    var fig = v.closest('figure');
    if (!fig || fig.querySelector('.video-codec-hint')) return;
    var hint = document.createElement('div');
    hint.className = 'video-codec-hint';
    hint.style.cssText = 'margin-top:8px;padding:10px 14px;border:1px solid #C9A879;border-radius:4px;background:#FBF7EE;color:#8f6d3f;font-size:12.5px;line-height:1.5;';
    hint.textContent = 'This video can\u2019t be played in the browser — it was likely recorded in HEVC (e.g. on an iPhone). Convert it to H.264 MP4 and it will play everywhere.';
    fig.appendChild(hint);
  }, true);
}

// Process diagram mobile accordion (active <= 620px only, matching the
// design's matchMedia gate; desktop heads stay inert).
if (!window.__moOppWired) {
  window.__moOppWired = true;
  document.addEventListener('click', function (e) {
    var head = e.target && e.target.closest ? e.target.closest('.mo-opp__head') : null;
    if (!head) return;
    if (!window.matchMedia('(max-width: 620px)').matches) return;
    var section = head.closest('.mo-opp__section');
    var open = section.classList.toggle('open');
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}


// Gated task lists: tick tasks, expand notes, gate sign-off, persistence.
if (!window.__pbTasksWired) {
  window.__pbTasksWired = true;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var tl = t.closest('.pb-tasklist');
    if (!tl) return;
    var cid = tl.getAttribute('data-tasklist');
    var total = parseInt(tl.getAttribute('data-count') || '0', 10);
    var hasGate = !!tl.querySelector('.pb-task-gate');

    function readState() {
      try { return JSON.parse(localStorage.getItem('motask-' + cid)) || { done: [], gate: false }; }
      catch (err) { return { done: [], gate: false }; }
    }
    function writeState(st) { try { localStorage.setItem('motask-' + cid, JSON.stringify(st)); } catch (err) {} }
    function doneCount() { return tl.querySelectorAll('.pb-task.done:not(.pb-task-gate)').length; }
    function updateProgress() {
      var n = doneCount() + (tl.querySelector('.pb-task-gate.unlocked') ? 1 : 0);
      var fill = tl.querySelector('.pb-tl-fill');
      var count = tl.querySelector('.pb-tl-count');
      var full = total + (hasGate ? 1 : 0) || 1;
      if (fill) fill.style.width = Math.round(n / full * 100) + '%';
      if (count) count.textContent = n + ' of ' + full + ' complete';
      var wrap = tl.closest('.pb-tl-wrap');
      if (wrap) {
        var cfill = wrap.querySelector('.pb-tl-card-fill');
        var ccount = wrap.querySelector('.pb-tl-card-count');
        if (cfill) cfill.style.width = Math.round(n / full * 100) + '%';
        if (ccount) ccount.textContent = n + ' of ' + full + ' complete';
      }
    }

    var reset = t.closest('.pb-tl-reset');
    if (reset) {
      tl.querySelectorAll('.pb-task.done').forEach(function (r) { r.classList.remove('done'); });
      var g0 = tl.querySelector('.pb-task-gate');
      if (g0) { g0.classList.remove('unlocked'); var gn0 = g0.querySelector('.pb-task-gatenote'); if (gn0) gn0.textContent = tl.getAttribute('data-gate-locked'); }
      writeState({ done: [], gate: false });
      updateProgress();
      return;
    }

    var check = t.closest('.pb-task-check');
    var row = t.closest('.pb-task');
    if (check && row) {
      if (row.classList.contains('pb-task-gate')) {
        // gate: only unlocks when every task is done
        if (doneCount() < total - 1 && !row.classList.contains('unlocked')) {
          var gn = row.querySelector('.pb-task-gatenote');
          if (gn) { gn.textContent = tl.getAttribute('data-gate-locked'); row.classList.add('nudge'); setTimeout(function () { row.classList.remove('nudge'); }, 400); }
          return;
        }
        var un = row.classList.toggle('unlocked');
        var gn2 = row.querySelector('.pb-task-gatenote');
        if (gn2) gn2.textContent = un ? tl.getAttribute('data-gate-open') : tl.getAttribute('data-gate-locked');
        var st2 = readState(); st2.gate = un; writeState(st2);
        updateProgress();
        return;
      }
      row.classList.toggle('done');
      var st = readState();
      var idx = row.getAttribute('data-task');
      if (row.classList.contains('done')) { if (st.done.indexOf(idx) === -1) st.done.push(idx); }
      else { st.done = st.done.filter(function (x) { return x !== idx; }); }
      writeState(st);
      updateProgress();
      return;
    }
    // tap the row body (not a pill/link) to expand its note
    var body = t.closest('.pb-task-body');
    if (body && !t.closest('.pb-task-pill') && !t.closest('a') && row && row.querySelector('.pb-task-note')) {
      row.classList.toggle('open');
    }
  });
}

// Restore task-list ticks + gate after (re)render, then paint progress.
function refreshTasklists() {
  document.querySelectorAll('.pb-tasklist').forEach(function (tl) {
    var cid = tl.getAttribute('data-tasklist');
    var st;
    try { st = JSON.parse(localStorage.getItem('motask-' + cid)) || { done: [], gate: false }; }
    catch (e) { st = { done: [], gate: false }; }
    tl.querySelectorAll('.pb-task[data-task]').forEach(function (r) {
      if (st.done.indexOf(r.getAttribute('data-task')) !== -1) r.classList.add('done');
    });
    var g = tl.querySelector('.pb-task-gate');
    if (g && st.gate) {
      g.classList.add('unlocked');
      var gn = g.querySelector('.pb-task-gatenote');
      if (gn) gn.textContent = tl.getAttribute('data-gate-open');
    }
    var n = tl.querySelectorAll('.pb-task.done:not(.pb-task-gate)').length + (g && st.gate ? 1 : 0);
    var total = parseInt(tl.getAttribute('data-count') || '0', 10) + (g ? 1 : 0);
    var fill = tl.querySelector('.pb-tl-fill');
    var count = tl.querySelector('.pb-tl-count');
    if (fill) fill.style.width = Math.round(n / (total || 1) * 100) + '%';
    if (count) count.textContent = n + ' of ' + total + ' complete';
    var wrap = tl.closest('.pb-tl-wrap');
    if (wrap) {
      var cfill = wrap.querySelector('.pb-tl-card-fill');
      var ccount = wrap.querySelector('.pb-tl-card-count');
      if (cfill) cfill.style.width = Math.round(n / (total || 1) * 100) + '%';
      if (ccount) ccount.textContent = n + ' of ' + total + ' complete';
    }
  });
}

// Timeline + checklist interactions.
if (!window.__pbStepsWired) {
  window.__pbStepsWired = true;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var head = t.closest('.pb-step-head');
    if (head) {
      var step = head.closest('.pb-step');
      var tl = step.closest('.pb-timeline');
      if (tl.getAttribute('data-mode') === 'reveal') {
        var wasOpen = step.classList.contains('open');
        tl.querySelectorAll('.pb-step.open').forEach(function (s) { s.classList.remove('open'); });
        if (!wasOpen) step.classList.add('open');
      }
      return;
    }
    var box = t.closest('.pb-check-box');
    if (box) {
      var chk = box.closest('.pb-check');
      chk.classList.toggle('done');
      try {
        var k = 'pbcheck-' + chk.getAttribute('data-check');
        if (chk.classList.contains('done')) sessionStorage.setItem(k, '1');
        else sessionStorage.removeItem(k);
      } catch (err) {}
      // progress bar + completion banner
      var list = chk.closest('.pb-checklist');
      if (list) {
        var total = list.querySelectorAll('.pb-check').length;
        var doneN = list.querySelectorAll('.pb-check.done').length;
        var fill = list.querySelector('.pb-check-fill');
        var count = list.querySelector('.pb-check-count');
        if (fill) fill.style.width = Math.round(doneN / total * 100) + '%';
        if (count) count.textContent = doneN + ' of ' + total + ' complete';
        list.classList.toggle('all-done', total > 0 && doneN === total);
      }
      return;
    }
    // expandable note rows (tap the text, not the tick box or a link)
    var ctxt = t.closest('.pb-check-text');
    if (ctxt && !t.closest('a')) {
      var row = ctxt.closest('.pb-check.has-note');
      if (row) row.classList.toggle('note-open');
    }
  });
}

// Recompute checklist progress after ticks are restored from sessionStorage.
function refreshChecklistProgress() {
  document.querySelectorAll('.pb-checklist').forEach(function (list) {
    var total = list.querySelectorAll('.pb-check').length;
    var doneN = list.querySelectorAll('.pb-check.done').length;
    var fill = list.querySelector('.pb-check-fill');
    var count = list.querySelector('.pb-check-count');
    if (fill) fill.style.width = (total ? Math.round(doneN / total * 100) : 0) + '%';
    if (count) count.textContent = doneN + ' of ' + total + ' complete';
    list.classList.toggle('all-done', total > 0 && doneN === total);
  });
}

// Broken-media rescue: a video or image that fails to load (e.g. its file
// never finished uploading to the cloud) is replaced with a quiet placeholder
// instead of a black 0:00 player or a torn-image icon. Media errors do not
// bubble, so this listens in the capture phase.
if (!window.__mediaRescueWired) {
  window.__mediaRescueWired = true;
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || !t.tagName) return;
    if (t.tagName === 'SOURCE') t = t.closest('video') || t;
    if (t.tagName === 'VIDEO') {
      if (t.__rescued) return;
      t.__rescued = true;
      var ph = document.createElement('div');
      ph.className = 'pb-media-missing';
      ph.textContent = 'This video is not available yet — it may still need to be uploaded by the playbook author.';
      if (t.parentNode) t.parentNode.replaceChild(ph, t);
    } else if (t.tagName === 'IMG') {
      if (t.__rescued) return;
      t.__rescued = true;
      var fig = t.closest('figure') || t;
      var ph2 = document.createElement('div');
      ph2.className = 'pb-media-missing pb-media-missing--img';
      ph2.textContent = 'Image unavailable';
      if (fig.parentNode) fig.parentNode.replaceChild(ph2, fig);
    }
  }, true);
}

// Image lightbox: click any inline content image to enlarge it full-screen;
// click anywhere, ✕, or Esc to close. Hotspot images are excluded — their
// pins own the click.
if (!window.__lightboxWired) {
  window.__lightboxWired = true;
  document.addEventListener('click', function (e) {
    var open = document.getElementById('pb-lightbox');
    if (open) { open.remove(); return; }
    var img = e.target && e.target.closest ? e.target.closest('.inline-img img') : null;
    if (!img || img.closest('.hotspot-wrap')) return;
    var ov = document.createElement('div');
    ov.id = 'pb-lightbox';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Enlarged image');
    var big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'pb-lightbox-close';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Close');
    ov.appendChild(big);
    ov.appendChild(x);
    document.body.appendChild(ov);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.getElementById('pb-lightbox');
      if (open) open.remove();
    }
  });
}

// Before / after slider: drag the handle (or use arrow keys on it) to sweep
// the comparison. The --ba custom property on the figure drives both the
// clip-path and the handle position.
if (!window.__baWired) {
  window.__baWired = true;
  function pbBaSet(wrap, clientX) {
    var r = wrap.getBoundingClientRect();
    if (!r.width) return;
    var x = Math.min(97, Math.max(3, (clientX - r.left) / r.width * 100));
    wrap.style.setProperty('--ba', x.toFixed(2) + '%');
  }
  document.addEventListener('pointerdown', function (e) {
    var h = e.target && e.target.closest ? e.target.closest('.pb-ba-handle') : null;
    if (!h) return;
    var wrap = h.closest('.pb-ba');
    if (!wrap) return;
    e.preventDefault();
    var move = function (ev) { pbBaSet(wrap, ev.clientX); };
    var up = function () { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    pbBaSet(wrap, e.clientX);
  });
  document.addEventListener('keydown', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.pb-ba-btn') : null;
    if (!b) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var wrap = b.closest('.pb-ba');
    if (!wrap) return;
    var cur = parseFloat(wrap.style.getPropertyValue('--ba')) || 50;
    wrap.style.setProperty('--ba', (e.key === 'ArrowLeft' ? Math.max(3, cur - 4) : Math.min(97, cur + 4)) + '%');
    e.preventDefault();
  });
}

// Radial lifecycle wheel: tap/click a segment (or arrow through with the
// keyboard) to show its stage card beside the wheel.
if (!window.__wheelWired) {
  window.__wheelWired = true;
  function pbWheelPick(seg) {
    var wrap = seg.closest('.pb-wheelwrap');
    if (!wrap) return;
    var i = seg.getAttribute('data-wi');
    wrap.querySelectorAll('.pb-wheel-seg').forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-wi') === i); });
    wrap.querySelectorAll('.pb-wheel-stage').forEach(function (c) { c.style.display = c.getAttribute('data-wc') === i ? 'block' : 'none'; });
  }
  document.addEventListener('click', function (e) {
    var seg = e.target && e.target.closest ? e.target.closest('.pb-wheel-seg') : null;
    if (seg) pbWheelPick(seg);
  });
  document.addEventListener('keydown', function (e) {
    var seg = e.target && e.target.closest ? e.target.closest('.pb-wheel-seg') : null;
    if (!seg) return;
    if (e.key === 'Enter' || e.key === ' ') { pbWheelPick(seg); e.preventDefault(); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var wrap = seg.closest('.pb-wheelwrap');
    var segs = wrap ? Array.prototype.slice.call(wrap.querySelectorAll('.pb-wheel-seg')) : [];
    var i = segs.indexOf(seg);
    var next = segs[(i + (e.key === 'ArrowRight' ? 1 : segs.length - 1)) % segs.length];
    if (next) { pbWheelPick(next); next.focus(); e.preventDefault(); }
  });
}

// Hotspot interactions: dots reveal their popup (one at a time), the toggle
// chip switches between display-all and click-to-reveal.
if (!window.__hotspotsWired) {
  window.__hotspotsWired = true;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var dot = t.closest('.hotspot-dot');
    if (dot) {
      var wrap = dot.closest('.hotspot-wrap');
      var idx = dot.getAttribute('data-hotspot');
      var pop = wrap.querySelector('[data-hotspot-pop="' + idx + '"]');
      var wasOpen = pop && pop.classList.contains('show');
      wrap.querySelectorAll('.hotspot-pop.show').forEach(function (p) { p.classList.remove('show'); });
      wrap.querySelectorAll('.hotspot-dot.on').forEach(function (d) { d.classList.remove('on'); });
      if (!wasOpen && pop) { pop.classList.add('show'); dot.classList.add('on'); }
      e.stopPropagation();
      return;
    }
    var tog = t.closest('.hotspot-toggle');
    if (tog) {
      var fig = tog.closest('.hotspot-figure');
      var showing = fig.getAttribute('data-hotspots-mode') === 'show';
      fig.setAttribute('data-hotspots-mode', showing ? 'reveal' : 'show');
      fig.querySelectorAll('.hotspot-pop').forEach(function (p) { p.classList.toggle('show', !showing); });
      fig.querySelectorAll('.hotspot-dot').forEach(function (d) { d.classList.toggle('on', !showing); });
      tog.textContent = showing ? 'Display all hotspots' : 'Click to reveal';
      e.stopPropagation();
      return;
    }
    // Click anywhere else closes open popups.
    document.querySelectorAll('.hotspot-pop.show').forEach(function (p) { p.classList.remove('show'); });
    document.querySelectorAll('.hotspot-dot.on').forEach(function (d) { d.classList.remove('on'); });
  });
}

// Tab switching for .policy-tabs components (event delegation, wired once).
if (!window.__policyTabsWired) {
  window.__policyTabsWired = true;
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.policy-tab') : null;
    if (!btn) return;
    var wrap = btn.closest('.policy-tabs');
    if (!wrap) return;
    var idx = btn.getAttribute('data-tab-i');
    wrap.querySelectorAll('.policy-tab').forEach(function (b) {
      var on = b.getAttribute('data-tab-i') === idx;
      b.classList.toggle('on', on);
      b.style.background = on ? '#fff' : 'none';
      b.style.color = on ? '#8f6d3f' : '#6b625a';
    });
    wrap.querySelectorAll('.policy-tab-panel').forEach(function (p) {
      p.style.display = p.getAttribute('data-tab-p') === idx ? 'block' : 'none';
    });
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
      const sliceChapter = slice.closest('.chapter');
      const linkedStage = (typeof LIFECYCLE !== 'undefined' ? LIFECYCLE : []).filter(function (s) { return s.id === slice.dataset.sub; })[0];
      if (linkedStage && linkedStage.link) { goTo(linkedStage.link); return; }
      goTo(sliceChapter ? sliceChapter.id : 'ch-3', slice.dataset.sub);
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
  // Remote boots (Remote SCORM / library player) never call applyPlaybook, so
  // content-derived chrome — masthead title, rail blurb, typography, colour
  // overrides — would otherwise stay at the shell's bundled defaults even
  // though window.PLAYBOOK is already the fetched playbook. Apply it here.
  if (window.PLAYBOOK && PB !== window.PLAYBOOK) PB = window.PLAYBOOK;
  updateMasthead();
  renderLangSwitch();
  applyChromeLang();
  updateRailAbout();
  applyTypography();
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
// Keep the rail "About this edition" note in sync with the loaded playbook
// (the HTML carries a seed-flavoured fallback for the no-data boot only).
function updateRailAbout() {
  var el = document.getElementById('railAbout');
  if (!el) return;
  var m = (PB && PB.meta) || {};
  var title = m.title || 'Playbook';
  var edition = String(m.edition || '').replace(/^Edition\s*[·\-–]?\s*/i, '').trim();
  el.textContent = 'An interactive companion to Mandarin Oriental\u2019s ' + title + '.' +
    (edition ? ' All wording is drawn verbatim from the ' + edition + ' edition.' : '');
}

// Body typography follows the playbook's Settings (font size / alignment),
// applied as CSS variables on the reader root.
// Lighten (pct > 0) or darken (pct < 0) a #rrggbb colour — used to derive the
// accent's deep/hair variants when an author overrides the accent colour.
function shadeHex(hex, pct) {
  var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  var n = parseInt(m[1], 16);
  function adj(c) {
    c = pct < 0 ? c * (100 + pct) / 100 : c + (255 - c) * pct / 100;
    return Math.max(0, Math.min(255, Math.round(c)));
  }
  return '#' + ((1 << 24) + (adj(n >> 16) << 16) + (adj((n >> 8) & 255) << 8) + adj(n & 255)).toString(16).slice(1);
}

function applyTypography() {
  var ty = (PB && PB.meta && PB.meta.typography) || {};
  var r = document.getElementById('reader');
  if (!r) return;
  r.style.setProperty('--pb-font-size', (ty.fontSize || 17) + 'px');
  r.style.setProperty('--pb-line-height', ty.lineHeight || 1.8);
  r.style.setProperty('--pb-text-align', ty.align || 'left');
  r.style.setProperty('--pb-heading-scale', ty.headingScale || 1);
  // Per-playbook colour overrides: accent, heading ink, body ink. Empty means
  // "brand default" — the property must be REMOVED (not set empty) so the
  // :root brand tokens keep applying.
  function setOrClear(name, val) { if (val) r.style.setProperty(name, val); else r.style.removeProperty(name); }
  setOrClear('--gold', ty.accent || '');
  setOrClear('--gold-deep', ty.accent ? shadeHex(ty.accent, -20) : '');
  setOrClear('--gold-hair', ty.accent ? shadeHex(ty.accent, 25) : '');
  setOrClear('--ink', ty.headingInk || '');
  setOrClear('--ink-body', ty.bodyInk || '');
}

// Masthead bar follows the loaded playbook (wordmark + title + edition),
// so non-P&C playbooks no longer carry P&C branding.
/* ---- Masthead language toggle (Phase 1 multilingual) ----------------------
   When the playbook declares languages (meta.languages), a compact switch
   appears in the topbar. In the standalone player / Remote SCORM it reloads
   with ?lang=<code> (the loader merges playbook-data.<code>.json over
   English); inside the Studio preview iframe it asks the editor to re-push
   the merged playbook instead.
--------------------------------------------------------------------------- */
// Language choice is per-playbook and only honoured when the playbook actually
// DECLARES that language (meta.languages). Anything else falls back to English —
// an undeclared playbook can never render non-English chrome. The legacy
// origin-wide 'mo_pb_lang' key is retired (it leaked choices across playbooks).
function declaredLangCodes() {
  var l = (PB && PB.meta && PB.meta.languages) || [];
  var codes = ['en'];
  l.forEach(function (x) { if (x && x.code && codes.indexOf(x.code) === -1) codes.push(x.code); });
  return codes;
}
function langStorageKey() {
  var slug = (PB && PB.meta && PB.meta.slug) || 'default';
  return 'mo_pb_lang_' + slug;
}
try { localStorage.removeItem('mo_pb_lang'); } catch (e) {}
function currentLangCode() {
  var allowed = declaredLangCodes();
  function ok(c) { return !!c && allowed.indexOf(c) !== -1; }
  if (ok(window.MO_PB_LANG)) return window.MO_PB_LANG;
  try { var q = new URLSearchParams(location.search).get('lang'); if (ok(q)) return q; } catch (e) {}
  try { var s = localStorage.getItem(langStorageKey()); if (ok(s)) return s; } catch (e) {}
  return 'en';
}

// ---- UI chrome i18n (Phase 1.5) -------------------------------------------
// Hardcoded renderer chrome (buttons, eyebrows, menu title, openers, search)
// can never be reached by a playbook's translation overlay, because the
// strings live in the renderer, not the data. UI() localises them per
// language; playbook prose keys still win wherever a T() default is used.
const UI_EN = {
  explore: 'Explore',
  coverEyebrow: 'The Interactive Playbook',
  menuTitle: 'Explore the Playbook',
  contents: 'Contents',
  continueContents: 'Continue to Contents',
  backContents: 'Back to Contents',
  welcomeFilm: 'Welcome Film',
  foreword: 'Foreword',
  chapterCrumb: 'Chapter',
  searchPlaceholder: 'Search the playbook…',
  noResults: 'No results',
  noResultsHint: 'Try a different term',
  aboutEdition: 'About this edition',
  welcome: 'Welcome',
  welcomeTo: 'Welcome to the '
};
const UI_I18N = {
  'zh-CN': {
    explore: '开始探索',
    coverEyebrow: '互动手册',
    menuTitle: '浏览手册',
    contents: '目录',
    continueContents: '前往目录',
    backContents: '返回目录',
    welcomeFilm: '欢迎影片',
    foreword: '前言',
    chapterCrumb: '章节',
    searchPlaceholder: '搜索手册…',
    noResults: '没有结果',
    noResultsHint: '请尝试其他关键词',
    aboutEdition: '关于本版本',
    welcome: '欢迎',
    welcomeTo: '欢迎阅读'
  }
};
function UI(key) {
  var dict = UI_I18N[currentLangCode()] || null;
  return (dict && dict[key]) || UI_EN[key] || key;
}
const CN_NUM = { I: '一', II: '二', III: '三', IV: '四', V: '五', VI: '六', VII: '七', VIII: '八', IX: '九', X: '十', XI: '十一', XII: '十二' };
function chapterLabel(numeral) {
  if (currentLangCode() === 'zh-CN') return '第' + (CN_NUM[numeral] || numeral) + '章';
  return 'Chapter ' + numeral;
}
// Swaps the static shell strings (search box, Contents fab, rail eyebrow)
// that live in index.html rather than in render functions.
function applyChromeLang() {
  var si = document.getElementById('searchInput');
  if (si) si.setAttribute('placeholder', UI('searchPlaceholder'));
  var mf = document.querySelector('#menuFab span');
  if (mf) mf.textContent = UI('contents');
  var re = document.querySelector('.rail-eyebrow');
  if (re) re.textContent = UI('contents');
  var rf = document.querySelector('.rail-footer h4');
  if (rf) rf.textContent = UI('aboutEdition');
}

function switchPlaybookLang(code) {
  try { localStorage.setItem(langStorageKey(), code); } catch (e) {}
  if (window.parent !== window) {
    try { window.parent.postMessage({ type: 'preview-lang', lang: code }, '*'); } catch (e) {}
    return;
  }
  try {
    var u = new URL(location.href);
    u.searchParams.set('lang', code);
    location.href = u.toString();
  } catch (e) { location.reload(); }
}
if (!window.__langSwitchWired) {
  window.__langSwitchWired = true;
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-lang-switch]') : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    switchPlaybookLang(b.getAttribute('data-lang-switch'));
  }, true);
}
function renderLangSwitch() {
  var old = document.getElementById('langSwitch');
  if (old) old.remove();
  var host = document.querySelector('.topbar .brand-right');
  if (!host) return;
  var langs = (PB && PB.meta && PB.meta.languages) || [];
  if (!langs.length) return;
  var cur = currentLangCode() || 'en';
  var opts = [{ code: 'en', label: 'English' }].concat(langs.map(function (l) {
    return { code: l.code, label: l.label || l.code };
  }));
  var sel = document.createElement('select');
  sel.id = 'langSwitch';
  sel.className = 'lang-switch';
  sel.setAttribute('aria-label', 'Language');
  opts.forEach(function (o) {
    var op = document.createElement('option');
    op.value = o.code;
    op.textContent = o.label;
    if (o.code === cur) op.selected = true;
    sel.appendChild(op);
  });
  sel.addEventListener('change', function () { switchPlaybookLang(sel.value); });
  host.insertBefore(sel, host.firstChild);
}

function updateMasthead() {
  var m = (PB && PB.meta) || {};
  var wm = document.getElementById('brandWordmark');
  if (wm) wm.textContent = (m.wordmark || 'Mandarin Oriental') + ' \u00b7 ' + (m.title || 'Playbook');
  var rh = document.getElementById('runningHeader');
  if (rh) rh.textContent = m.edition || '';
}

function applyPlaybook(next, opts) {
  opts = opts || {};
  window.PLAYBOOK = next || {};
  PB = window.PLAYBOOK;
  if (!PB.prose) PB.prose = {};
  refreshDerived();
  updateRailAbout();
  updateMasthead();
  renderLangSwitch();
  applyChromeLang();
  applyTypography();
  var keep = opts.chapter || currentChapter || 'cover';
  var keepSub = opts.sub || null;
  // Studio live-edit: re-rendering after an edit must not jump the page back
  // to the top — remember the scroll position when staying on the same chapter.
  var keepY = (opts.keepScroll && keep === currentChapter) ? window.scrollY : null;
  try {
    renderRail();
    renderAll();
    initSearch();
    wireEvents();
    // restore position (chapter may no longer exist -> fall back to cover)
    if (document.getElementById(keep)) goTo(keep, keepSub, keepY != null ? { keepY: keepY } : undefined);
    else goTo('cover');
    // restore reader state AFTER the fresh DOM exists — checklist ticks,
    // task-list ticks + gates, and their progress bars (previously this ran
    // before renderAll and was wiped by it).
    try {
      document.querySelectorAll('.pb-check').forEach(function (chk) {
        var k = 'pbcheck-' + chk.getAttribute('data-check');
        if (sessionStorage.getItem(k)) chk.classList.add('done');
      });
    } catch (e) {}
    refreshChecklistProgress();
    refreshTasklists();
  } catch (e) {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'preview-error', message: String(e && e.message || e) }, '*');
    }
    throw e;
  }
}
window.applyPlaybook = applyPlaybook;

// Re-arm lifecycle dock scroll-following after every full render (mirrors the
// motion-layer hook below; both wrappers call through).
(function () {
  var rawApply = window.applyPlaybook;
  window.applyPlaybook = function (pb, opts) {
    var r = rawApply(pb, opts);
    try { cycleDockScan(); } catch (e) {}
    return r;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { cycleDockScan(); } catch (e) {} });
  else { try { cycleDockScan(); } catch (e) {} }
})();

window.addEventListener('message', function (ev) {
  var d = ev.data || {};
  if (d.type === 'editor-ping') {
    // The editor (re)announces itself — reply so it knows we are listening.
    window.__inStudio = true;
    if (window.parent !== window) window.parent.postMessage({ type: 'preview-boot' }, '*');
    return;
  }
  if (d.type === 'set-playbook') {
    if (d.lang) {
      try {
        window.MO_PB_LANG = d.lang === 'en' ? '' : d.lang;
        document.documentElement.lang = d.lang || 'en';
      } catch (e) {}
    }
    applyPlaybook(d.playbook, { chapter: d.chapter, sub: d.sub, keepScroll: true });
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


// =========================================================================
// INTERACTIVE ELEMENTS (s:'ix') — 17 kinds, schema: it.kind + payload fields.
// Renderers only; all wiring is delegated at the bottom of this block.
// =========================================================================
var PB_IX_KINDS = ['processflow','horizons','legendtour','flipcards','mixbars','xtable','benchdash','alloc','tabx','scorecard','typedist','stageflow','dlcheck','testline','eventcal','kpidash','cardwall','compare'];

// Weight/colour brand-token classes shared by s:'text' and s:'heading'.
function _pbFmtCls(it) {
  var c = '';
  var w = it && it.weight;
  if (w && /^(400|500|600|700)$/.test(String(w))) c += ' pb-w-' + w;
  var col = it && it.color;
  if (col && /^(ink|soft|muted|gold|sage|terra)$/.test(col)) c += ' pb-c-' + col;
  return c;
}

function pbIxHTML(it) {
  var fn = PB_IX_RENDER[it.kind];
  if (!fn) return '<div class="pb-ix pb-chart-empty">Unknown interactive element "' + esc(it.kind || '') + '".</div>';
  try { return fn(it); } catch (e) { return '<div class="pb-ix pb-chart-empty">This interactive element could not be drawn — check its content in Studio.</div>'; }
}

function _ixArr(v) { return Array.isArray(v) ? v : []; }
function _ixId(p) { return p + '-' + (++_accId); }
var _IX_COLORS = ['#B59060','#C07A3E','#4E7A6B','#A4523F','#7A6A9E','#8F6B3C'];

var PB_IX_RENDER = {

  // 1. Decision & exception logic — numbered process flow, one step at a time.
  processflow: function (it) {
    var steps = _ixArr(it.steps);
    if (!steps.length) return '<div class="pb-ix pb-chart-empty">Add steps to build this process flow.</div>';
    var wid = _ixId('ixpf');
    return '<div class="pb-ix pb-ixpf" id="' + wid + '">' +
      '<div class="ixpf-track">' + steps.map(function (s, i) {
        return '<button type="button" class="ixpf-step' + (i === 0 ? ' on' : '') + '" data-pf="' + i + '">' +
          '<span class="ixpf-num">' + (i + 1) + '</span>' +
          '<span class="ixpf-step-name">' + esc(s.label || ('Step ' + (i + 1))) + '</span>' +
          (s.sub ? '<span class="ixpf-step-sub">' + esc(s.sub) + '</span>' : '') +
          '</button>' + (i < steps.length - 1 ? '<span class="ixpf-arrow" aria-hidden="true">→</span>' : '');
      }).join('') + '</div>' +
      steps.map(function (s, i) {
        var branches = _ixArr(s.branches);
        return '<div class="ixpf-detail" data-pfd="' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + ';">' +
          (s.sub ? '<div class="ixpf-d-eyebrow">' + esc(s.sub) + '</div>' : '') +
          '<div class="ixpf-d-title">' + esc(s.title || s.label || '') + '</div>' +
          (s.text ? '<div class="ixpf-d-text">' + inlineRichHTML(s.text) + '</div>' : '') +
          (s.example ? '<div class="ixpf-d-example">' + inlineRichHTML(s.example) + '</div>' : '') +
          (branches.length ? '<div class="ixpf-branches">' + branches.map(function (b, bi) {
            return '<div class="ixpf-branch" style="--bc:' + _IX_COLORS[bi % _IX_COLORS.length] + ';">' +
              '<div class="ixpf-b-label">' + esc(b.label || '') + '</div>' +
              '<div class="ixpf-b-text">' + inlineRichHTML(b.text || '') + '</div></div>';
          }).join('') + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
  },

  // 2. Horizon stepper / journey map band.
  horizons: function (it) {
    var stages = _ixArr(it.stages);
    if (!stages.length) return '<div class="pb-ix pb-chart-empty">Add stages to build this stepper.</div>';
    var bands = _ixArr(it.bands);
    return '<div class="pb-ix pb-ixhz">' +
      '<div class="ixhz-band">' +
        '<div class="ixhz-line" aria-hidden="true"></div>' +
        stages.map(function (s, i) {
          return '<button type="button" class="ixhz-node' + (i === 0 ? ' on' : '') + '" data-hz="' + i + '" style="left:' + (stages.length > 1 ? (3 + (i / (stages.length - 1)) * 94) : 50) + '%;">' +
            '<span class="ixhz-dot">' + (i + 1) + '</span>' +
            '<span class="ixhz-lbl">' + esc(s.label || '') + '</span>' +
            (s.dur ? '<span class="ixhz-dur">' + esc(s.dur) + '</span>' : '') +
            (s.gate ? '<span class="ixhz-gate">' + esc(s.gate === true ? 'Gate' : s.gate) + '</span>' : '') +
            '</button>';
        }).join('') +
      '</div>' +
      (bands.length ? '<div class="ixhz-horizons">' + bands.map(function (b) {
        var from = Math.max(0, Number(b.from) || 0), to = Math.min(stages.length - 1, b.to == null ? stages.length - 1 : Number(b.to));
        var l = stages.length > 1 ? (3 + (from / (stages.length - 1)) * 94) : 0, w = stages.length > 1 ? ((to - from) / (stages.length - 1)) * 94 : 94;
        return '<span class="ixhz-horizon" style="left:' + l + '%;width:' + Math.max(w, 8) + '%;">' + esc(b.label || '') + '</span>';
      }).join('') + '</div>' : '') +
      stages.map(function (s, i) {
        return '<div class="ixhz-detail" data-hzd="' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + ';">' +
          '<div class="ixhz-d-eyebrow">' + esc('Stage ' + (i + 1) + (s.dur ? ' · ' + s.dur : '')) + '</div>' +
          '<div class="ixhz-d-title">' + esc(s.label || '') + '</div>' +
          (s.text ? '<div class="ixhz-d-text">' + inlineRichHTML(s.text) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  },

  // 3. Static legend panel + onboarding tooltip tour.
  legendtour: function (it) {
    var legend = _ixArr(it.legend), tour = _ixArr(it.tour);
    var tid = _ixId('ixlg');
    return '<div class="pb-ix pb-ixlg" id="' + tid + '">' +
      '<div class="ixlg-grid">' +
        '<div class="ixlg-panel"><div class="ixlg-title">' + esc(it.title || 'How to read this playbook') + '</div>' +
          legend.map(function (l, i) {
            return '<div class="ixlg-row"><span class="ixlg-sw" style="background:' + esc(l.color || _IX_COLORS[i % _IX_COLORS.length]) + ';"></span><span class="ixlg-txt"><b>' + esc(l.label || '') + '</b>' + (l.text ? ' — ' + inlineRichHTML(l.text) : '') + '</span></div>';
          }).join('') + '</div>' +
        (tour.length ? '<div class="ixlg-tourwrap">' +
          '<button type="button" class="ixlg-start" data-tour-start="' + tid + '">' + esc(it.tourLabel || 'Take the quick tour') + '</button>' +
          '<div class="ixlg-tip" data-tour-tip="' + tid + '" hidden>' +
            '<div class="ixlg-tip-eyebrow" data-tour-count></div>' +
            '<div class="ixlg-tip-text" data-tour-text></div>' +
            '<div class="ixlg-tip-row"><button type="button" class="ixlg-skip" data-tour-skip>' + esc(it.skipLabel || 'Skip') + '</button>' +
            '<button type="button" class="ixlg-next" data-tour-next>' + esc(it.nextLabel || 'Next') + '</button></div>' +
          '</div>' +
          '<script type="application/json" data-tour-data="' + tid + '">' + JSON.stringify(tour).replace(/</g, '\\u003c') + '</script>' +
        '</div>' : '') +
      '</div></div>';
  },

  // 4. Principle flip cards (light) — front: principle; back: full guidance.
  flipcards: function (it) {
    var cards = _ixArr(it.cards);
    if (!cards.length) return '<div class="pb-ix pb-chart-empty">Add cards to build this set.</div>';
    var dark = it.variant === 'dark';
    var legend = _ixArr(it.legend);
    return '<div class="pb-ix pb-ixfc' + (dark ? ' dark' : '') + '">' +
      (legend.length ? '<div class="ixfc-legend">' + legend.map(function (l, i) {
        return '<span class="ixfc-leg"><span class="ixlg-sw" style="background:' + esc(l.color || _IX_COLORS[i % _IX_COLORS.length]) + ';"></span>' + esc(l.label || '') + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="ixfc-grid' + ([2,3,4].indexOf(parseInt(it.cols, 10)) >= 0 ? ' cols-' + parseInt(it.cols, 10) : '') + '">' + cards.map(function (c, i) {
        var chips = _ixArr(c.chips);
        return '<button type="button" class="ixfc-card" data-fc>' +
          '<span class="ixfc-face ixfc-front" style="' + (dark && c.themeColor ? 'border-top-color:' + esc(c.themeColor) + ';' : '') + '">' +
            (c.num ? '<span class="ixfc-num">' + esc(c.num) + '</span>' : '') +
            '<span class="ixfc-title">' + esc(c.title || ('Card ' + (i + 1))) + '</span>' +
            (dark && c.owner ? '<span class="ixfc-owner">' + esc(c.owner) + '</span>' : '') +
            '<span class="ixfc-hint">' + esc(it.flipHint || 'Tap to flip') + '</span>' +
          '</span>' +
          '<span class="ixfc-face ixfc-back">' +
            (c.backLabel ? '<span class="ixfc-backlabel">' + esc(c.backLabel) + '</span>' : '') +
            '<span class="ixfc-backtext">' + inlineRichHTML(c.back || '') + '</span>' +
            (chips.length ? '<span class="ixfc-chips">' + chips.map(function (ch) { return '<span class="ixfc-chip">' + esc(ch) + '</span>'; }).join('') + '</span>' : '') +
            (dark && _ixArr(c.steps).length ? '<span class="ixfc-steps">' + c.steps.map(function (st) { return '<span class="ixfc-step-chip">' + esc(st) + '</span>'; }).join('<span class="ixfc-step-arrow">→</span>') + '</span>' : '') +
          '</span>' +
          '</button>';
      }).join('') + '</div></div>';
  },

  // 10. Opportunity card wall — dark flip cards grouped by theme (1-2-2-1 etc.).
  cardwall: function (it) {
    it = Object.assign({}, it, { variant: 'dark' });
    return PB_IX_RENDER.flipcards(it);
  },

  // 5. Stacked-bar mix explorer.
  mixbars: function (it) {
    var rows = _ixArr(it.rows);
    if (!rows.length) return '<div class="pb-ix pb-chart-empty">Add rows to build this explorer.</div>';
    var legend = _ixArr(it.legend);
    return '<div class="pb-ix pb-ixmix">' +
      (legend.length ? '<div class="ixmix-legend">' + legend.map(function (l, i) {
        return '<span class="ixfc-leg"><span class="ixlg-sw" style="background:' + esc(l.color || _IX_COLORS[i % _IX_COLORS.length]) + ';"></span>' + esc(l.label || '') + '</span>';
      }).join('') + '</div>' : '') +
      rows.map(function (r, ri) {
        var segs = _ixArr(r.segs);
        var tot = segs.reduce(function (a, b) { return a + (Number(b) || 0); }, 0) || 1;
        return '<button type="button" class="ixmix-row" data-mix="' + ri + '">' +
          '<span class="ixmix-head"><span class="ixmix-name">' + esc(r.label || '') + '</span>' + (r.meta ? '<span class="ixmix-meta">' + esc(r.meta) + '</span>' : '') + '</span>' +
          '<span class="ixmix-bar">' + segs.map(function (v, si) {
            var col = legend[si] && legend[si].color ? legend[si].color : _IX_COLORS[si % _IX_COLORS.length];
            return '<span class="ixmix-seg" style="width:' + (Number(v) / tot * 100).toFixed(1) + '%;background:' + esc(col) + ';"></span>';
          }).join('') + '</span></button>';
      }).join('') +
      '<div class="ixmix-detail" data-mix-detail hidden></div>' +
      (it.note ? '<div class="pb-ix-note">' + inlineRichHTML(it.note) + '</div>' : '') +
      '<script type="application/json" data-mix-data>' + JSON.stringify(rows.map(function (r) { return { label: r.label, meta: r.meta, segs: r.segs, detail: r.detail }; })).replace(/</g, '\\u003c') + '</script>' +
      '<script type="application/json" data-mix-legend>' + JSON.stringify(legend.map(function (l) { return l.label; })).replace(/</g, '\\u003c') + '</script>' +
      '</div>';
  },

  // 6. Interactive table explorer — sort + filter, never overflows.
  xtable: function (it) {
    var head = _ixArr(it.cols), rows = _ixArr(it.rows);
    if (!head.length && Array.isArray(it.head)) head = _ixArr(it.head); // back-compat: early payloads used head[]
    if (!rows.length) return '<div class="pb-ix pb-chart-empty">Add rows to build this table.</div>';
    var tid = _ixId('ixxt');
    return '<div class="pb-ix pb-ixxt" id="' + tid + '" data-sort="-1" data-dir="1">' +
      '<input type="search" class="ixxt-filter" placeholder="' + esc(it.filterLabel || 'Filter…') + '" data-xt-filter />' +
      '<div class="pb-tablewrap"><table class="pb-table ixxt-table">' +
        (head.length ? '<thead><tr>' + head.map(function (h, i) { return '<th><button type="button" class="ixxt-sort" data-xt-sort="' + i + '">' + esc(h) + '<span class="ixxt-arrow" aria-hidden="true"></span></button></th>'; }).join('') + '</tr></thead>' : '') +
        '<tbody>' + rows.map(function (r) {
          return '<tr>' + (Array.isArray(r) ? r : [r]).map(function (c, ci) { return '<td data-th="' + esc(head[ci] || '') + '">' + inlineRichHTML(String(c || '')) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody>' +
      '</table></div>' +
      '<div class="ixxt-count" data-xt-count>' + rows.length + ' of ' + rows.length + ' shown</div>' +
      '</div>';
  },

  // 7. Benchmark dashboard — KPI cards + trend + tips.
  benchdash: function (it) {
    var kpis = _ixArr(it.kpis), trend = it.trend || {}, tips = _ixArr(it.tips);
    var svg = _ixTrendSVG(trend, 760, 260);
    return '<div class="pb-ix pb-ixbd">' +
      (kpis.length ? '<div class="ixbd-kpis" style="--cols:' + kpis.length + ';">' + kpis.map(function (k) {
        return '<div class="ixbd-kpi"><div class="ixbd-k-label">' + esc(k.label || '') + '</div>' +
          '<div class="ixbd-k-value">' + esc(String(k.value || '')) + '</div>' +
          (k.sub ? '<div class="ixbd-k-sub' + (k.down ? ' down' : '') + '">' + esc(k.sub) + '</div>' : '') +
          '<div class="ixbd-k-bar"><span style="width:' + Math.max(4, Math.min(100, Number(k.bar) || 50)) + '%;"></span></div></div>';
      }).join('') + '</div>' : '') +
      (svg ? '<div class="ixbd-trend"><div class="ixbd-t-title">' + esc(trend.title || '') + '</div>' + (trend.sub ? '<div class="ixbd-t-sub">' + esc(trend.sub) + '</div>' : '') + svg +
        '<div class="ixbd-t-legend">' + _ixArr(trend.series).map(function (s) {
          return '<span class="ixfc-leg"><span class="ixlg-sw" style="background:' + esc(s.color || '#B59060') + ';' + (s.dash ? 'height:2px;margin-top:4px;' : '') + '"></span>' + esc(s.name || '') + '</span>';
        }).join('') + '</div></div>' : '') +
      (tips.length ? '<div class="ixbd-tips">' + tips.map(function (t, i) {
        return '<div class="ixbd-tip"><div class="ixbd-tip-eyebrow">' + esc(t.label || ('0' + (i + 1))) + '</div><div class="ixbd-tip-title">' + esc(t.title || '') + '</div><div class="ixbd-tip-text">' + inlineRichHTML(t.text || '') + '</div></div>';
      }).join('') + '</div>' : '') +
      '</div>';
  },

  // 8. Discount allocation chart — build-up + quality gauge + steps.
  alloc: function (it) {
    var parts = _ixArr(it.parts);
    var total = it.total || {}, q = it.quality || {};
    var max = Math.max.apply(null, parts.map(function (p) { return Number(p.value) || 0; }).concat([1]));
    var qv = Math.max(0, Math.min(100, Number(q.value) || 0));
    return '<div class="pb-ix pb-ixal">' +
      '<div class="ixal-top">' +
        '<div class="ixal-build"><div class="ixal-b-title">' + esc(it.buildTitle || '') + '</div>' +
          parts.map(function (p, i) {
            return '<div class="ixal-row"><span class="ixal-r-label">' + esc(p.label || '') + '</span>' +
              '<span class="ixal-r-bar"><span style="width:' + (Number(p.value) / max * 100).toFixed(0) + '%;background:' + esc(p.color || _IX_COLORS[i % _IX_COLORS.length]) + ';"></span></span>' +
              '<span class="ixal-r-val">' + esc(String(p.value || '')) + '</span></div>';
          }).join('') +
          '<div class="ixal-total"><span>' + esc(total.label || '') + '</span><span class="ixal-t-val">' + inlineRichHTML(total.text || '') + '</span></div>' +
        '</div>' +
        '<div class="ixal-quality"><div class="ixal-q-eyebrow">' + esc(q.eyebrow || '') + '</div>' +
          '<div class="ixal-q-val">' + esc(String(q.display || (qv + '%'))) + '</div>' +
          '<div class="ixal-q-bar"><span style="width:' + qv + '%;"></span></div>' +
          (q.text ? '<div class="ixal-q-text">' + inlineRichHTML(q.text) + '</div>' : '') +
        '</div>' +
      '</div>' +
      (_ixArr(it.steps).length ? '<div class="ixal-steps">' + it.steps.map(function (s, i) {
        return '<div class="ixal-step"><div class="ixal-s-eyebrow">' + esc(s.label || ('Step ' + (i + 1))) + '</div><div class="ixal-s-text">' + inlineRichHTML(s.text || '') + '</div></div>';
      }).join('') + '</div>' : '') +
      '</div>';
  },

  // 9. Tabbed data explorer (workbook tabs etc.).
  tabx: function (it) {
    var tabs = _ixArr(it.tabs);
    if (!tabs.length) return '<div class="pb-ix pb-chart-empty">Add tabs to build this explorer.</div>';
    return '<div class="pb-ix pb-ixtx">' +
      '<div class="ixtx-bar">' + tabs.map(function (t, i) {
        return '<button type="button" class="ixtx-tab' + (i === 0 ? ' on' : '') + '" data-tx="' + i + '">' + esc(t.label || ('Tab ' + (i + 1))) + '</button>';
      }).join('') + '</div>' +
      tabs.map(function (t, i) {
        return '<div class="ixtx-panel" data-txd="' + i + '"' + (i ? ' hidden' : '') + '>' +
          (t.usedin ? '<div class="ixtx-usedin">' + esc(t.usedin) + '</div>' : '') +
          '<div class="ixtx-title">' + esc(t.title || t.label || '') + '</div>' +
          (t.text ? '<div class="ixtx-text">' + inlineRichHTML(t.text) + '</div>' : '') +
          (t.url ? '<a class="ixtx-link" href="' + esc(t.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t.linkLabel || 'Open resource →') + '</a>' : '') +
          '</div>';
      }).join('') + '</div>';
  },

  // 11. Assessment scorecard / rubric.
  scorecard: function (it) {
    var dims = _ixArr(it.dims), tasks = _ixArr(it.tasks);
    if (!tasks.length || !dims.length) return '<div class="pb-ix pb-chart-empty">Add dimensions and tasks to build this scorecard.</div>';
    var max = Number(it.scaleMax) || 4;
    var total = tasks.length * dims.length * max;
    return '<div class="pb-ix pb-ixsc" data-scale="' + max + '">' +
      '<div class="pb-tablewrap"><table class="pb-table ixsc-table"><thead><tr><th>' + esc(it.taskCol || 'Task') + '</th>' +
        dims.map(function (d) { return '<th class="ixsc-dim">' + esc(d) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        tasks.map(function (t) {
          return '<tr><td><div class="ixsc-task">' + esc(t.name || '') + '</div>' + (t.covers ? '<div class="ixsc-covers">' + esc(t.covers) + '</div>' : '') + '</td>' +
            dims.map(function (_, di) {
              return '<td class="ixsc-cell">' + '<span class="ixsc-picks">' +
                Array.apply(null, { length: max }).map(function (_, v) {
                  return '<button type="button" class="ixsc-pick" data-sc="' + (v + 1) + '" aria-label="Score ' + (v + 1) + '">' + (v + 1) + '</button>';
                }).join('') + '</span></td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
      '<div class="ixsc-total"><div><div class="ixsc-t-eyebrow">' + esc(it.totalLabel || 'Overall score') + '</div><div class="ixsc-t-val"><span data-sc-total>0</span> / ' + total + '</div></div>' +
      (it.note ? '<div class="ixsc-t-note">' + inlineRichHTML(it.note) + '</div>' : '') + '</div>' +
      '</div>';
  },

  // 12. Count / distribution chart by room type (TY/LY toggle).
  typedist: function (it) {
    var rows = _ixArr(it.rows);
    if (!rows.length) return '<div class="pb-ix pb-chart-empty">Add rows to build this chart.</div>';
    var a = (it.toggle && it.toggle.a) || 'This year', b = (it.toggle && it.toggle.b) || 'STLY';
    var maxv = Math.max.apply(null, rows.map(function (r) { return Math.max(Number(r.a) || 0, Number(r.b) || 0); }).concat([1]));
    return '<div class="pb-ix pb-ixtd">' +
      '<div class="ixtd-toggle"><button type="button" class="on" data-td="a">' + esc(a) + '</button><button type="button" data-td="b">' + esc(b) + '</button></div>' +
      '<div class="ixtd-rows">' + rows.map(function (r, i) {
        var col = r.color || _IX_COLORS[i % _IX_COLORS.length];
        return '<div class="ixtd-row" data-a="' + (Number(r.a) || 0) + '" data-b="' + (Number(r.b) || 0) + '" data-max="' + maxv + '">' +
          '<span class="ixtd-label">' + esc(r.label || '') + '</span>' +
          '<span class="ixtd-track"><span class="ixtd-fill" style="width:' + ((Number(r.a) || 0) / maxv * 100).toFixed(1) + '%;background:' + esc(col) + ';"></span></span>' +
          '<span class="ixtd-val">' + esc(String(r.a || '')) + (r.suffix ? ' ' + esc(r.suffix) : '') + '</span></div>';
      }).join('') + '</div>' +
      (it.note ? '<div class="pb-ix-note">' + inlineRichHTML(it.note) + '</div>' : '') +
      '</div>';
  },

  // 13. Stage step flow + checklists — sequential unlock, ends in a gate.
  stageflow: function (it) {
    var items = _ixArr(it.items);
    if (!items.length) return '<div class="pb-ix pb-chart-empty">Add actions to build this flow.</div>';
    var cid = it.cid || _ixId('ixsf');
    return '<div class="pb-ix pb-ixsf" data-sf="' + esc(cid) + '" data-count="' + items.length + '">' +
      '<div class="ixsf-rail"></div>' +
      items.map(function (c, i) {
        return '<div class="ixsf-item' + (i === 0 ? '' : ' locked') + '" data-sf-i="' + i + '">' +
          '<span class="ixsf-node"></span>' +
          '<button type="button" class="ixsf-check" aria-label="Mark action ' + (i + 1) + ' done"><span>✓</span></button>' +
          '<div class="ixsf-body"><div class="ixsf-eyebrow">' + esc(c.label || ('Action ' + (i + 1))) + '</div>' +
          '<div class="ixsf-text">' + inlineRichHTML(c.text || '') + '</div></div>' +
          '</div>';
      }).join('') +
      (it.gateText ? '<div class="ixsf-gate locked" data-sf-gate data-locked-text="' + esc(it.gateLocked || 'Complete every action to unlock the gate.') + '"' + (it.gateOpen ? ' data-open-text="' + esc(it.gateOpen) + '"' : '') + '>' +
        '<span class="ixsf-gate-mark">✓</span><div class="ixsf-gate-body"><div class="ixsf-gate-title">' + esc(it.gateText) + '</div>' +
        '<div class="ixsf-gate-note" data-sf-gatenote>' + esc(it.gateLocked || 'Complete every action to unlock the gate.') + '</div></div>' +
        '<span class="ixsf-gate-count" data-sf-count>0 / ' + items.length + '</span></div>' : '') +
      '</div>';
  },

  // 14. Downloadable template + guided checklist.
  dlcheck: function (it) {
    var f = it.file || {}, items = _ixArr(it.items);
    var cid = _ixId('ixdl');
    return '<div class="pb-ix pb-ixdl" data-dl="' + cid + '">' +
      '<div class="ixdl-card"><div class="ixdl-icon" aria-hidden="true">↓</div>' +
        '<div class="ixdl-f-title">' + esc(f.title || 'Template') + '</div>' +
        (f.meta ? '<div class="ixdl-f-meta">' + esc(f.meta) + '</div>' : '') +
        (f.text ? '<div class="ixdl-f-text">' + inlineRichHTML(f.text) + '</div>' : '') +
        (f.url ? '<a class="ixdl-btn" href="' + esc(f.url) + '" download>' + esc(f.button || 'Download workbook') + '</a>' : '<span class="ixdl-btn disabled">' + esc(f.button || 'Download workbook') + '</span>') +
      '</div>' +
      (items.length ? '<div class="ixdl-list"><div class="ixdl-l-title">' + esc(it.listTitle || 'Guided checklist') + '</div>' +
        items.map(function (c, i) {
          return '<div class="ixdl-item" data-dl-i="' + i + '"><button type="button" class="ixdl-check" aria-label="Toggle item ' + (i + 1) + '"><span>✓</span></button>' +
            '<span class="ixdl-text">' + inlineRichHTML(c.text || '') + '</span>' +
            (c.tag ? '<span class="ixdl-tag">' + esc(c.tag) + '</span>' : '') + '</div>';
        }).join('') +
        '<div class="ixdl-count" data-dl-count>0 of ' + items.length + ' complete</div></div>' : '') +
      '</div>';
  },

  // 15. Test-design timeline diagram (A/B phases).
  testline: function (it) {
    var phases = _ixArr(it.phases);
    if (!phases.length) return '<div class="pb-ix pb-chart-empty">Add phases to build this timeline.</div>';
    return '<div class="pb-ix pb-ixtl">' +
      '<div class="ixtl-band">' + phases.map(function (p, i) {
        return '<div class="ixtl-phase"><span class="ixtl-bar" style="background:' + esc(p.color || _IX_COLORS[i % _IX_COLORS.length]) + ';"></span>' +
          '<div class="ixtl-num">' + esc(String(p.num != null ? p.num : (i + 1))) + '</div>' +
          '<div class="ixtl-lbl">' + esc(p.label || '') + '</div>' +
          (p.text ? '<div class="ixtl-text">' + inlineRichHTML(p.text) + '</div>' : '') +
          (p.tag ? '<div class="ixtl-tag">' + esc(p.tag) + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
      (it.axis ? '<div class="ixtl-axis"><span>' + esc(it.axis.from || '') + '</span><span>' + esc(it.axis.mid || '') + '</span><span>' + esc(it.axis.to || '') + '</span></div>' : '') +
      (_ixArr(it.cards).length ? '<div class="ixtl-cards">' + it.cards.map(function (c) {
        return '<div class="ixtl-card' + (c.tone === 'warn' ? ' warn' : '') + '"><div class="ixtl-c-eyebrow">' + esc(c.label || '') + '</div><div class="ixtl-c-text">' + inlineRichHTML(c.text || '') + '</div></div>';
      }).join('') + '</div>' : '') +
      '</div>';
  },

  // 16. Event calendar timeline (booking windows countdown).
  eventcal: function (it) {
    var pins = _ixArr(it.pins);
    if (!pins.length) return '<div class="pb-ix pb-chart-empty">Add phases to build this calendar.</div>';
    return '<div class="pb-ix pb-ixec">' +
      '<div class="ixec-trackwrap"><div class="ixec-track" aria-hidden="true"></div>' +
        pins.map(function (p, i) {
          return '<button type="button" class="ixec-pin' + (i === 0 ? ' on' : '') + '" data-ec="' + i + '" style="left:' + (pins.length > 1 ? (3 + (i / (pins.length - 1)) * 90) : 50) + '%;">' +
            '<span class="ixec-at">' + esc(p.at || '') + '</span><span class="ixec-dot">' + (i + 1) + '</span><span class="ixec-lbl">' + esc(p.label || '') + '</span></button>';
        }).join('') +
        (it.end ? '<span class="ixec-end"><span class="ixec-end-date">' + esc(it.end.date || '') + '</span><span class="ixec-end-lbl">' + esc(it.end.label || '') + '</span></span>' : '') +
      '</div>' +
      pins.map(function (p, i) {
        var bl = _ixArr(p.bullets);
        return '<div class="ixec-detail" data-ecd="' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + ';">' +
          '<div class="ixec-d-eyebrow">' + esc([p.at, p.label].filter(Boolean).join(' · ')) + '</div>' +
          '<div class="ixec-d-title">' + esc(p.title || p.label || '') + '</div>' +
          (bl.length ? '<ul class="ixec-d-list">' + bl.map(function (b2) { return '<li>' + inlineRichHTML(b2) + '</li>'; }).join('') + '</ul>' : '') +
          '</div>';
      }).join('') +
      (it.exception ? '<div class="ixec-exception"><b>' + esc(it.exceptionLabel || 'Timing exception') + '</b> — ' + inlineRichHTML(it.exception) + '</div>' : '') +
      '</div>';
  },

  // 17. KPI dashboard with STLY toggle.
  kpidash: function (it) {
    var cats = _ixArr(it.cats);
    var flat = [];
    cats.forEach(function (c) { _ixArr(c.kpis).forEach(function (k) { flat.push({ cat: c.label, name: k.name, src: k.src, unit: k.unit, target: k.target, ty: _ixArr(k.ty), ly: _ixArr(k.ly) }); }); });
    if (!flat.length) return '<div class="pb-ix pb-chart-empty">Add KPIs to build this dashboard.</div>';
    var tid = _ixId('ixkpi');
    return '<div class="pb-ix pb-ixkpi" id="' + tid + '">' +
      '<div class="ixkpi-list">' + cats.map(function (c, ci) {
        return '<div class="ixkpi-cat">' + esc(c.label || '') + '</div>' + _ixArr(c.kpis).map(function (k) {
          var gi = flat.findIndex(function (f) { return f.name === k.name && f.cat === c.label; });
          return '<button type="button" class="ixkpi-item' + (gi === 0 ? ' on' : '') + '" data-kpi="' + gi + '"><span>' + esc(k.name || '') + '</span>' + (k.src ? '<span class="ixkpi-src">' + esc(k.src) + '</span>' : '') + '</button>';
        }).join('');
      }).join('') + '</div>' +
      '<div class="ixkpi-main">' +
        '<div class="ixkpi-head"><div><div class="ixkpi-title" data-kpi-name></div><div class="ixkpi-sub" data-kpi-sub></div></div>' +
        '<div class="ixtd-toggle ixkpi-toggle"><button type="button" class="on" data-kty>This year</button><button type="button" class="on" data-kstly>vs STLY</button></div></div>' +
        '<div class="ixkpi-chart" data-kpi-chart></div>' +
        '<div class="ixkpi-stats"><div class="ixkpi-stat"><div class="l" data-kpi-s1l>Latest month</div><div class="v" data-kpi-s1></div><div class="d" data-kpi-s1d></div></div>' +
        '<div class="ixkpi-stat"><div class="l" data-kpi-s2l>vs previous month</div><div class="v" data-kpi-s2></div><div class="d" data-kpi-s2d></div></div>' +
        '<div class="ixkpi-stat"><div class="l" data-kpi-s3l>vs STLY</div><div class="v" data-kpi-s3></div><div class="d" data-kpi-s3d></div></div></div>' +
      '</div>' +
      '<script type="application/json" data-kpi-data>' + JSON.stringify(flat).replace(/</g, '\\u003c') + '</script>' +
      '</div>';
  },
  // 18. Comparison pair — two checklist columns (IS / IS NOT, Do / Don't ...).
  compare: function (it) {
    var cols = _ixArr(it.cols);
    if (!cols.length) return '<div class="pb-ix pb-chart-empty">Add two columns to build this comparison.</div>';
    return '<div class="pb-ix pb-ixcp"><div class="ixcp-grid">' +
      cols.slice(0, 2).map(function (c, ci) {
        var tone = (c.tone === 'is' || c.tone === 'isnot') ? c.tone : (ci === 0 ? 'is' : 'isnot');
        var items = _ixArr(c.items);
        return '<div class="ixcp-col ' + tone + '">' +
          (c.label ? '<div class="ixcp-eyebrow">' + esc(c.label) + '</div>' : '') +
          (c.title ? '<div class="ixcp-title">' + esc(c.title) + '</div>' : '') +
          (items.length ? '<ul class="ixcp-list">' + items.map(function (x) {
            return '<li class="ixcp-item"><span class="ixcp-mark" aria-hidden="true">' + (tone === 'isnot' ? '✕' : '✓') + '</span><span>' + inlineRichHTML(typeof x === 'string' ? x : (x.text || '')) + '</span></li>';
          }).join('') + '</ul>' : '') +
          '</div>';
      }).join('') + '</div>' +
      (it.note ? '<div class="pb-ix-note">' + inlineRichHTML(it.note) + '</div>' : '') +
      '</div>';
  }
};

// Shared mini trend chart (benchmark dashboard + KPI dashboard).
function _ixTrendSVG(trend, W, H) {
  var series = _ixArr(trend.series).filter(function (s) { return _ixArr(s.values).length > 1; });
  if (!series.length) return '';
  var labels = _ixArr(trend.labels);
  var all = [];
  series.forEach(function (s) { s.values.forEach(function (v) { if (isFinite(v)) all.push(Number(v)); }); });
  if (isFinite(trend.target)) all.push(Number(trend.target));
  var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
  var pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
  var X = function (i, n) { return 40 + (W - 60) * (n > 1 ? i / (n - 1) : 0); };
  var Y = function (v) { return 16 + (H - 60) * (1 - (Number(v) - lo) / (hi - lo)); };
  var s = '<svg class="ixchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" preserveAspectRatio="none" style="width:100%;height:auto;aspect-ratio:' + W + '/' + H + ';">';
  [0.25, 0.5, 0.75].forEach(function (g) {
    var y = 16 + (H - 60) * g;
    s += '<line x1="40" y1="' + y + '" x2="' + (W - 20) + '" y2="' + y + '" stroke="#E5E2DA" stroke-width="1"/>';
  });
  if (isFinite(trend.target)) {
    s += '<line x1="40" y1="' + Y(trend.target) + '" x2="' + (W - 20) + '" y2="' + Y(trend.target) + '" stroke="#4E7A6B" stroke-width="1.5" stroke-dasharray="4 4"/>' +
      '<text x="' + (W - 24) + '" y="' + (Y(trend.target) - 4) + '" text-anchor="end" font-size="10" fill="#4E7A6B">Target ' + esc(String(trend.target)) + '</text>';
  }
  series.forEach(function (sr) {
    var n = sr.values.length;
    var d = sr.values.map(function (v, i) { return (i ? 'L' : 'M') + X(i, n).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    s += '<path d="' + d + '" fill="none" stroke="' + esc(sr.color || '#B59060') + '" stroke-width="2"' + (sr.dash ? ' stroke-dasharray="2 4"' : '') + ' stroke-linecap="round"/>';
    if (sr.dots) sr.values.forEach(function (v, i) { s += '<circle cx="' + X(i, n).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3" fill="#fff" stroke="' + esc(sr.color || '#B59060') + '" stroke-width="1.5"/>'; });
  });
  labels.forEach(function (lb, i) {
    s += '<text x="' + X(i, labels.length).toFixed(1) + '" y="' + (H - 18) + '" text-anchor="middle" font-size="10" fill="#6b625a">' + esc(lb) + '</text>';
  });
  return s + '</svg>';
}

// =========================================================================
// INTERACTIVE ELEMENTS — delegated wiring (wired once, all renderers).
// =========================================================================
if (!window.__ixWired) {
  window.__ixWired = true;

  function _ixJSON(root, sel) {
    var n = root.querySelector(sel);
    if (!n) return null;
    try { return JSON.parse(n.textContent); } catch (e) { return null; }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;

    // 1. Process flow — pick a step.
    var pf = t.closest('.ixpf-step');
    if (pf) {
      var pfw = pf.closest('.pb-ixpf');
      var i = pf.getAttribute('data-pf');
      pfw.querySelectorAll('.ixpf-step').forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-pf') === i); });
      pfw.querySelectorAll('.ixpf-detail').forEach(function (d) { d.style.display = d.getAttribute('data-pfd') === i ? 'block' : 'none'; });
      return;
    }
    // 2. Horizon stepper — pick a stage.
    var hz = t.closest('.ixhz-node');
    if (hz) {
      var hzw = hz.closest('.pb-ixhz');
      var hi = hz.getAttribute('data-hz');
      hzw.querySelectorAll('.ixhz-node').forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-hz') === hi); });
      hzw.querySelectorAll('.ixhz-detail').forEach(function (d) { d.style.display = d.getAttribute('data-hzd') === hi ? 'block' : 'none'; });
      return;
    }
    // 3. Legend tour — start / next / skip.
    var ts = t.closest('[data-tour-start]');
    if (ts) {
      var lw = ts.closest('.pb-ixlg'), tip = lw.querySelector('[data-tour-tip]');
      tip.hidden = false; ts.hidden = true;
      _ixTourStep(lw, 0);
      return;
    }
    var tn = t.closest('[data-tour-next]');
    if (tn) {
      var lw2 = tn.closest('.pb-ixlg');
      var cur = Number(lw2.getAttribute('data-tour-i') || 0);
      var data = _ixJSON(lw2, '[data-tour-data]') || [];
      if (cur + 1 >= data.length) { _ixTourEnd(lw2); } else { _ixTourStep(lw2, cur + 1); }
      return;
    }
    var tk = t.closest('[data-tour-skip]');
    if (tk) { _ixTourEnd(tk.closest('.pb-ixlg')); return; }
    // 4/10. Flip cards.
    var fc = t.closest('.ixfc-card');
    if (fc) { fc.classList.toggle('flip'); return; }
    // 5. Mix explorer — row detail.
    var mx = t.closest('.ixmix-row');
    if (mx) {
      var mxw = mx.closest('.pb-ixmix');
      var rows = _ixJSON(mxw, '[data-mix-data]') || [];
      var leg = _ixJSON(mxw, '[data-mix-legend]') || [];
      var r = rows[Number(mx.getAttribute('data-mix'))];
      var det = mxw.querySelector('[data-mix-detail]');
      if (r && det) {
        var segs = (r.segs || []);
        var tot = segs.reduce(function (a2, b2) { return a2 + (Number(b2) || 0); }, 0) || 1;
        var htm = '<b>' + (r.label || '') + '</b> — ' + segs.map(function (v, si) {
          return (leg[si] || ('Part ' + (si + 1))) + ' ' + Math.round(Number(v) / tot * 100) + '%';
        }).join(' · ') + (r.meta ? '. ' + r.meta + '.' : '') + (r.detail ? ' ' + r.detail : '');
        det.innerHTML = htm;
        det.hidden = false;
      }
      return;
    }
    // 6. Table explorer — sort.
    var xs = t.closest('.ixxt-sort');
    if (xs) {
      var xw = xs.closest('.pb-ixxt');
      var col = Number(xs.getAttribute('data-xt-sort'));
      var dir = xw.getAttribute('data-sort') === String(col) ? -Number(xw.getAttribute('data-dir') || 1) : 1;
      xw.setAttribute('data-sort', String(col)); xw.setAttribute('data-dir', String(dir));
      var tb = xw.querySelector('tbody');
      Array.prototype.slice.call(tb.rows).sort(function (ra, rb) {
        var a2 = ra.cells[col] ? ra.cells[col].textContent : '', b2 = rb.cells[col] ? rb.cells[col].textContent : '';
        var na = parseFloat(String(a2).replace(/[^\d.\-]/g, '')), nb = parseFloat(String(b2).replace(/[^\d.\-]/g, ''));
        var cmp = (isFinite(na) && isFinite(nb)) ? na - nb : String(a2).localeCompare(String(b2));
        return cmp * dir;
      }).forEach(function (r2) { tb.appendChild(r2); });
      xw.querySelectorAll('.ixxt-arrow').forEach(function (a3) { a3.textContent = ''; });
      var ar = xs.querySelector('.ixxt-arrow'); if (ar) ar.textContent = dir > 0 ? ' ▲' : ' ▼';
      return;
    }
    // 9. Tabbed explorer.
    var tx = t.closest('.ixtx-tab');
    if (tx) {
      var txw = tx.closest('.pb-ixtx');
      var ti = tx.getAttribute('data-tx');
      txw.querySelectorAll('.ixtx-tab').forEach(function (b2) { b2.classList.toggle('on', b2.getAttribute('data-tx') === ti); });
      txw.querySelectorAll('.ixtx-panel').forEach(function (p2) { p2.hidden = p2.getAttribute('data-txd') !== ti; });
      return;
    }
    // 11. Scorecard — pick a score.
    var sc = t.closest('.ixsc-pick');
    if (sc) {
      var cell = sc.closest('.ixsc-picks');
      cell.querySelectorAll('.ixsc-pick').forEach(function (p2) { p2.classList.toggle('on', p2 === sc); });
      var scw = sc.closest('.pb-ixsc');
      var tot = 0;
      scw.querySelectorAll('.ixsc-pick.on').forEach(function (p2) { tot += Number(p2.getAttribute('data-sc')) || 0; });
      var out = scw.querySelector('[data-sc-total]'); if (out) out.textContent = tot;
      return;
    }
    // 12. Room type distribution — TY/LY toggle.
    var td = t.closest('.ixtd-toggle [data-td]');
    if (td) {
      var tdw = td.closest('.pb-ixtd');
      var mode = td.getAttribute('data-td');
      tdw.querySelectorAll('.ixtd-toggle [data-td]').forEach(function (b2) { b2.classList.toggle('on', b2 === td); });
      tdw.querySelectorAll('.ixtd-row').forEach(function (r2) {
        var v = Number(r2.getAttribute('data-' + mode)) || 0, mx2 = Number(r2.getAttribute('data-max')) || 1;
        r2.querySelector('.ixtd-fill').style.width = (v / mx2 * 100).toFixed(1) + '%';
        var suf = (r2.querySelector('.ixtd-val').textContent.split(' ').slice(1).join(' '));
        r2.querySelector('.ixtd-val').textContent = v + (suf ? ' ' + suf : '');
      });
      return;
    }
    // 13. Stage flow — sequential ticks + gate.
    var sfc = t.closest('.ixsf-check');
    if (sfc) {
      var sfw = sfc.closest('.pb-ixsf');
      var row = sfc.closest('.ixsf-item');
      if (row.classList.contains('locked')) return;
      row.classList.toggle('done');
      _ixSfSync(sfw);
      return;
    }
    // 14. Download checklist ticks.
    var dlc = t.closest('.ixdl-check');
    if (dlc) {
      var dlw = dlc.closest('.pb-ixdl');
      dlc.closest('.ixdl-item').classList.toggle('done');
      var dn = dlw.querySelectorAll('.ixdl-item.done').length, dt = dlw.querySelectorAll('.ixdl-item').length;
      var cnt = dlw.querySelector('[data-dl-count]'); if (cnt) cnt.textContent = dn + ' of ' + dt + ' complete';
      return;
    }
    // 16. Event calendar pins.
    var ec = t.closest('.ixec-pin');
    if (ec) {
      var ecw = ec.closest('.pb-ixec');
      var ei = ec.getAttribute('data-ec');
      ecw.querySelectorAll('.ixec-pin').forEach(function (p2) { p2.classList.toggle('on', p2.getAttribute('data-ec') === ei); });
      ecw.querySelectorAll('.ixec-detail').forEach(function (d2) { d2.style.display = d2.getAttribute('data-ecd') === ei ? 'block' : 'none'; });
      return;
    }
    // 17. KPI dashboard — pick KPI, toggle series.
    var ki = t.closest('.ixkpi-item');
    if (ki) {
      var kw = ki.closest('.pb-ixkpi');
      kw.querySelectorAll('.ixkpi-item').forEach(function (b2) { b2.classList.toggle('on', b2 === ki); });
      _ixKpiDraw(kw, Number(ki.getAttribute('data-kpi')));
      return;
    }
    var kt = t.closest('.ixkpi-toggle button');
    if (kt) {
      kt.classList.toggle('on');
      var kw2 = kt.closest('.pb-ixkpi');
      var on = kw2.querySelector('.ixkpi-item.on');
      _ixKpiDraw(kw2, on ? Number(on.getAttribute('data-kpi')) : 0);
      return;
    }
  });

  // Table explorer — live filter (input event).
  document.addEventListener('input', function (e) {
    var f = e.target && e.target.matches && e.target.matches('[data-xt-filter]') ? e.target : null;
    if (!f) return;
    var xw = f.closest('.pb-ixxt');
    var q = f.value.trim().toLowerCase();
    var tb = xw.querySelector('tbody');
    var shown = 0, tot = 0;
    Array.prototype.slice.call(tb.rows).forEach(function (r2) {
      tot++;
      var hit = !q || r2.textContent.toLowerCase().indexOf(q) !== -1;
      r2.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    var cnt = xw.querySelector('[data-xt-count]');
    if (cnt) cnt.textContent = shown + ' of ' + tot + ' shown';
  });

  function _ixTourStep(lw, i) {
    var data = _ixJSON(lw, '[data-tour-data]') || [];
    var st = data[i]; if (!st) return;
    lw.setAttribute('data-tour-i', String(i));
    var tip = lw.querySelector('[data-tour-tip]');
    tip.querySelector('[data-tour-count]').textContent = 'Step ' + (i + 1) + ' of ' + data.length + (st.label ? ' · ' + st.label : '');
    tip.querySelector('[data-tour-text]').textContent = st.text || '';
    tip.querySelector('[data-tour-next]').textContent = (i + 1 >= data.length) ? 'Done' : 'Next';
  }
  function _ixTourEnd(lw) {
    var tip = lw.querySelector('[data-tour-tip]'); if (tip) tip.hidden = true;
    var st = lw.querySelector('[data-tour-start]'); if (st) st.hidden = false;
  }

  function _ixSfSync(sfw) {
    var rows = Array.prototype.slice.call(sfw.querySelectorAll('.ixsf-item'));
    var done = 0, ok = true;
    // Sequential rule: a row is unlocked only when every row before it is done.
    rows.forEach(function (r2) {
      r2.classList.toggle('locked', !ok);
      if (r2.classList.contains('done')) done++;
      else ok = false;
    });
    var gate = sfw.querySelector('[data-sf-gate]');
    if (gate) {
      var all = done === rows.length;
      gate.classList.toggle('locked', !all);
      var note = gate.querySelector('[data-sf-gatenote]');
      if (note) note.textContent = all ? (gate.getAttribute('data-open-text') || 'Gate passed — you may proceed.') : (gate.getAttribute('data-locked-text') || '');
    }
    var c = sfw.querySelector('[data-sf-count]');
    if (c) c.textContent = done + ' / ' + rows.length;
  }

  // KPI dashboard chart drawing.
  window._ixKpiDraw = function (kw, gi) {
    var data = _ixJSON(kw, '[data-kpi-data]') || [];
    var k = data[gi]; if (!k) return;
    var showTY = kw.querySelector('[data-kty]').classList.contains('on');
    var showSTLY = kw.querySelector('[data-kstly]').classList.contains('on');
    kw.querySelector('[data-kpi-name]').textContent = k.name || '';
    kw.querySelector('[data-kpi-sub]').textContent = (k.src ? 'Data source: ' + k.src : '') + (k.unit ? ' · ' + k.unit : '');
    var labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].slice(0, Math.max(k.ty.length, k.ly.length));
    var series = [];
    if (showTY && k.ty.length > 1) series.push({ name: 'This year', color: '#B59060', values: k.ty, dots: true });
    if (showSTLY && k.ly.length > 1) series.push({ name: 'Same time last year', color: '#A89F92', values: k.ly, dash: true });
    kw.querySelector('[data-kpi-chart]').innerHTML = _ixTrendSVG({ labels: labels, series: series, target: k.target }, 640, 260);
    var last = k.ty.length ? k.ty[k.ty.length - 1] : null;
    var prev = k.ty.length > 1 ? k.ty[k.ty.length - 2] : null;
    var ly = k.ly.length ? k.ly[k.ly.length - 1] : null;
    var set = function (vSel, dSel, v, d) { var n = kw.querySelector(vSel); if (n) n.textContent = v; var n2 = kw.querySelector(dSel); if (n2) n2.textContent = d || ''; };
    set('[data-kpi-s1]', '[data-kpi-s1d]', last != null ? last : '—', 'This year');
    set('[data-kpi-s2]', '[data-kpi-s2d]', (last != null && prev != null) ? ((last - prev >= 0 ? '+' : '') + (last - prev)) : '—', 'Month-on-month');
    set('[data-kpi-s3]', '[data-kpi-s3d]', (last != null && ly != null) ? ((last - ly >= 0 ? '+' : '') + (last - ly)) : '—', ly != null ? 'Same time last year · ' + ly : '');
  };
  // Draw the initially selected KPI in every dashboard after each render.
  function _ixKpiInit() {
    document.querySelectorAll('.pb-ixkpi').forEach(function (kw) {
      if (kw.getAttribute('data-kpi-init')) return;
      kw.setAttribute('data-kpi-init', '1');
      _ixKpiDraw(kw, 0);
    });
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { _ixKpiInit(); }).observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', _ixKpiInit);
}


// =========================================================================
// INTERACTIVE ELEMENTS v2 — concept animations + practice interactions
// (handoff, buildup, parallel, ripple, journeydot, dtree, scenario,
//  hotspot, stepper, matching, seq) + glossary inline markup + motion layer.
// Appended block — registered by push/assign, no edits to the v1 code above.
// =========================================================================
PB_IX_KINDS.push('stagebar');
Object.assign(PB_IX_RENDER, {
  // 30. Stage bar — slim timeline bar with editable gradient fill; stages from
  // greyFrom index render muted (e.g. the Track stage).
  stagebar: function (it) {
    var stages = _ixArr(it.stages);
    if (!stages.length) return '<div class="pb-ix pb-chart-empty">Add stages to build this timeline.</div>';
    var fill = Math.min(100, Math.max(0, parseFloat(it.fill != null ? it.fill : 75)));
    var greyFrom = (it.greyFrom != null) ? parseInt(it.greyFrom, 10) : stages.length; // 0-based; stages at/after are muted
    var ticks = stages.map(function (s, i) {
      var left = stages.length > 1 ? (i / (stages.length - 1)) * 100 : 50;
      var grey = i >= greyFrom;
      return '<div class="ixsb-stage' + (grey ? ' grey' : '') + '" style="left:' + left + '%;">' +
        '<span class="ixsb-dot"></span>' +
        '<span class="ixsb-lbl">' + esc(s.label || '') + '</span>' +
        (s.dur ? '<span class="ixsb-dur">' + esc(s.dur) + '</span>' : '') +
        (s.text ? '<span class="ixsb-sub">' + esc(s.text) + '</span>' : '') +
        '</div>';
    }).join('');
    return '<div class="pb-ix pb-ixsb">' +
      (it.sub ? '<div class="ixsb-sub-head">' + esc(it.sub) + '</div>' : '') +
      '<div class="ixsb-trackwrap"><div class="ixsb-track"></div>' +
      '<div class="ixsb-fill" style="width:' + fill + '%;"></div>' + ticks + '</div>' +
      '</div>';
  },
});
PB_IX_KINDS.push('handoff','buildup','parallel','ripple','journeydot','dtree','scenario','hotspot','stepper','matching','seq');

Object.assign(PB_IX_RENDER, {

  // C1 — Handoff: a work token travels lane to lane between roles.
  handoff: function (it) {
    var lanes = _ixArr(it.lanes);
    if (!lanes.length) return '<div class="pb-ix pb-chart-empty">Add lanes to build this handoff.</div>';
    var wid = _ixId('ix2ho');
    return '<div class="pb-ix pb-ix2ho" id="' + wid + '">' +
      '<script type="application/json" data-ix2ho>' + JSON.stringify({ lanes: lanes, token: it.token || '' }).replace(/</g, '\\u003c') + '</script>' +
      '<div class="ix2ho-stage">' +
        '<div class="ix2ho-token" aria-hidden="true"><span>' + esc(it.token || '●') + '</span></div>' +
        lanes.map(function (l, i) {
          return '<div class="ix2ho-lane" data-lane="' + i + '">' +
            '<div class="ix2ho-role">' + esc(l.role || ('Role ' + (i + 1))) + '</div>' +
            '<div class="ix2ho-lane-text">' + inlineRichHTML(l.text || '') + '</div>' +
            '</div>';
        }).join('') +
      '</div>' +
      '<div class="ix2-bar"><button type="button" class="ix2-replay" data-ix2-replay>↻ Replay</button></div>' +
      '</div>';
  },

  // C2 — Build-up: components assemble onto a stage one by one.
  buildup: function (it) {
    var items = _ixArr(it.items);
    if (!items.length) return '<div class="pb-ix pb-chart-empty">Add components to build this visual.</div>';
    var wid = _ixId('ix2bu');
    return '<div class="pb-ix pb-ix2bu" id="' + wid + '">' +
      '<div class="ix2bu-stage"' + (it.img ? ' style="background-image:url(\'' + esc(it.img) + '\');"' : '') + '>' +
        items.map(function (p, i) {
          return '<div class="ix2bu-item" data-bu="' + i + '" style="left:' + (parseFloat(p.x) || 0) + '%;top:' + (parseFloat(p.y) || 0) + '%;">' +
            esc(p.label || ('Part ' + (i + 1))) + '</div>';
        }).join('') +
      '</div>' +
      '<div class="ix2-bar"><button type="button" class="ix2-replay" data-ix2-replay>↻ Replay</button></div>' +
      '</div>';
  },

  // C3 — Parallel: two paths (good / bad) revealed beat by beat in sync.
  parallel: function (it) {
    var good = it.good || {}, bad = it.bad || {};
    var gB = _ixArr(good.beats), bB = _ixArr(bad.beats);
    var n = Math.max(gB.length, bB.length);
    if (!n) return '<div class="pb-ix pb-chart-empty">Add beats to both paths.</div>';
    var wid = _ixId('ix2pt');
    function colHTML(side, obj, beats) {
      return '<div class="ix2pt-col ix2pt-' + side + '">' +
        '<div class="ix2pt-head">' + esc(obj.title || (side === 'good' ? 'With it' : 'Without it')) + '</div>' +
        beats.map(function (b, i) {
          return '<div class="ix2pt-beat" data-beat="' + i + '">' + inlineRichHTML(typeof b === 'string' ? b : (b.text || '')) + '</div>';
        }).join('') +
        (obj.verdict ? '<div class="ix2pt-verdict" data-beat="' + n + '">' + esc(obj.verdict) + '</div>' : '') +
        '</div>';
    }
    return '<div class="pb-ix pb-ix2pt" id="' + wid + '" data-beats="' + n + '">' +
      '<div class="ix2pt-grid">' + colHTML('good', good, gB) + colHTML('bad', bad, bB) + '</div>' +
      '<div class="ix2-bar"><button type="button" class="ix2-replay" data-ix2-replay>↻ Replay</button></div>' +
      '</div>';
  },

  // C4 — Ripple: one trigger radiates consequences outward in rings.
  ripple: function (it) {
    var nodes = _ixArr(it.nodes);
    if (!nodes.length) return '<div class="pb-ix pb-chart-empty">Add consequence nodes to this ripple.</div>';
    var wid = _ixId('ix2ri');
    return '<div class="pb-ix pb-ix2ri" id="' + wid + '">' +
      '<script type="application/json" data-ix2ri>' + JSON.stringify({ trigger: it.trigger || {}, nodes: nodes }).replace(/</g, '\\u003c') + '</script>' +
      '<div class="ix2ri-stage">' +
        '<div class="ix2ri-ring" data-ring="1"></div><div class="ix2ri-ring" data-ring="2"></div><div class="ix2ri-ring" data-ring="3"></div>' +
        '<div class="ix2ri-trigger"><div class="ix2ri-trigger-label">' + esc((it.trigger && it.trigger.label) || 'Trigger') + '</div>' +
          ((it.trigger && it.trigger.sub) ? '<div class="ix2ri-trigger-sub">' + esc(it.trigger.sub) + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="ix2-bar"><button type="button" class="ix2-replay" data-ix2-replay>↻ Replay</button></div>' +
      '</div>';
  },

  // C5 — Journey dot: a dot travels a path, revealing stops as it passes.
  journeydot: function (it) {
    var stops = _ixArr(it.stops);
    if (!stops.length) return '<div class="pb-ix pb-chart-empty">Add stops to build this journey.</div>';
    var wid = _ixId('ix2jn');
    return '<div class="pb-ix pb-ix2jn" id="' + wid + '">' +
      '<script type="application/json" data-ix2jn>' + JSON.stringify({ stops: stops }).replace(/</g, '\\u003c') + '</script>' +
      '<div class="ix2jn-stage"><svg class="ix2jn-svg" viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">' +
        '<path class="ix2jn-path" d="M20,200 C180,60 340,220 500,120 C660,20 820,180 980,80" fill="none"/>' +
      '</svg><div class="ix2jn-dot" aria-hidden="true"></div><div class="ix2jn-stops"></div></div>' +
      '<div class="ix2-bar"><button type="button" class="ix2-replay" data-ix2-replay>↻ Replay</button></div>' +
      '</div>';
  },

  // I1 — Decision tree: answer questions to reach an outcome.
  dtree: function (it) {
    var nodes = _ixArr(it.nodes);
    if (!nodes.length) return '<div class="pb-ix pb-chart-empty">Add nodes to build this decision tree.</div>';
    var wid = _ixId('ix2dt');
    return '<div class="pb-ix pb-ix2dt" id="' + wid + '">' +
      '<script type="application/json" data-ix2dt>' + JSON.stringify({ title: it.title || '', nodes: nodes }).replace(/</g, '\\u003c') + '</script>' +
      (it.title ? '<div class="ix2-title">' + esc(it.title) + '</div>' : '') +
      '<div class="ix2dt-trail"></div>' +
      '<div class="ix2dt-node"></div>' +
      '</div>';
  },

  // I2 — Scenario: a story in beats; each beat asks what you'd do.
  scenario: function (it) {
    var beats = _ixArr(it.beats);
    if (!beats.length) return '<div class="pb-ix pb-chart-empty">Add beats to build this scenario.</div>';
    var wid = _ixId('ix2sc');
    return '<div class="pb-ix pb-ix2sc" id="' + wid + '">' +
      '<script type="application/json" data-ix2sc>' + JSON.stringify({ title: it.title || '', beats: beats }).replace(/</g, '\\u003c') + '</script>' +
      (it.title ? '<div class="ix2-title">' + esc(it.title) + '</div>' : '') +
      '<div class="ix2sc-dots"></div>' +
      '<div class="ix2sc-beat"></div>' +
      '</div>';
  },

  // I3 — Hotspot: tap points on an image to learn more.
  hotspot: function (it) {
    var pts = _ixArr(it.points);
    if (!pts.length) return '<div class="pb-ix pb-chart-empty">Add points to this hotspot image.</div>';
    var wid = _ixId('ix2hs');
    var bg = it.img ? ' style="background-image:url(\'' + esc(it.img) + '\');"' : '';
    return '<div class="pb-ix pb-ix2hs" id="' + wid + '">' +
      '<div class="ix2hs-stage' + (it.img ? '' : ' ix2hs-nophoto') + '"' + bg + '>' +
        pts.map(function (p, i) {
          return '<button type="button" class="ix2hs-dot" data-hs="' + i + '" style="left:' + (parseFloat(p.x) || 0) + '%;top:' + (parseFloat(p.y) || 0) + '%;" aria-label="' + esc(p.t || ('Point ' + (i + 1))) + '">' + (i + 1) + '</button>' +
            '<div class="ix2hs-pop" data-hsp="' + i + '" style="left:' + (parseFloat(p.x) || 0) + '%;top:' + (parseFloat(p.y) || 0) + '%;" hidden>' +
              '<div class="ix2hs-pop-t">' + esc(p.t || '') + '</div>' +
              (p.d ? '<div class="ix2hs-pop-d">' + inlineRichHTML(p.d) + '</div>' : '') +
            '</div>';
        }).join('') +
      '</div>' +
      '</div>';
  },

  // I4 — Stepper: walk through steps with visuals, previous/next.
  stepper: function (it) {
    var steps = _ixArr(it.steps);
    if (!steps.length) return '<div class="pb-ix pb-chart-empty">Add steps to build this walkthrough.</div>';
    var wid = _ixId('ix2st');
    return '<div class="pb-ix pb-ix2st" id="' + wid + '">' +
      '<script type="application/json" data-ix2st>' + JSON.stringify({ steps: steps }).replace(/</g, '\\u003c') + '</script>' +
      '<div class="ix2st-stage"></div>' +
      '<div class="ix2st-nav"><button type="button" class="ix2st-btn" data-st="-1">← Previous</button>' +
        '<span class="ix2st-count"></span>' +
        '<button type="button" class="ix2st-btn" data-st="1">Next →</button></div>' +
      '</div>';
  },

  // I5 — Matching: pair each term with its definition.
  matching: function (it) {
    var pairs = _ixArr(it.pairs);
    if (!pairs.length) return '<div class="pb-ix pb-chart-empty">Add pairs to build this matching exercise.</div>';
    var wid = _ixId('ix2ma');
    return '<div class="pb-ix pb-ix2ma" id="' + wid + '">' +
      '<script type="application/json" data-ix2ma>' + JSON.stringify({ title: it.title || '', pairs: pairs }).replace(/</g, '\\u003c') + '</script>' +
      (it.title ? '<div class="ix2-title">' + esc(it.title) + '</div>' : '') +
      '<div class="ix2ma-grid"><div class="ix2ma-col ix2ma-terms"></div><div class="ix2ma-col ix2ma-defs"></div></div>' +
      '<div class="ix2-bar"><span class="ix2ma-score"></span><button type="button" class="ix2-replay" data-ix2-reset>↻ Shuffle &amp; reset</button></div>' +
      '</div>';
  },

  // I6 — Sequencing: tap the steps in the right order.
  seq: function (it) {
    var items = _ixArr(it.items);
    if (!items.length) return '<div class="pb-ix pb-chart-empty">Add steps (in the correct order) to build this exercise.</div>';
    var wid = _ixId('ix2sq');
    return '<div class="pb-ix pb-ix2sq" id="' + wid + '">' +
      '<script type="application/json" data-ix2sq>' + JSON.stringify({ title: it.title || '', items: items }).replace(/</g, '\\u003c') + '</script>' +
      (it.title ? '<div class="ix2-title">' + esc(it.title) + '</div>' : '') +
      '<div class="ix2sq-pool"></div>' +
      '<div class="ix2sq-order"></div>' +
      '<div class="ix2-bar"><button type="button" class="ix2st-btn" data-sq-check>Check order</button>' +
        '<button type="button" class="ix2-replay" data-ix2-reset>↻ Reset</button><span class="ix2sq-msg"></span></div>' +
      '</div>';
  }
});

// -------------------------------------------------------------------------
// ix2 runtime — state, delegated wiring, animation players.
// -------------------------------------------------------------------------
if (!window.__ix2Wired) {
  window.__ix2Wired = true;

  function _ix2JSON(root, sel) {
    var n = root.querySelector(sel);
    if (!n) return null;
    try { return JSON.parse(n.textContent); } catch (e) { return null; }
  }
  window.__ix2State = {};
  window.MO_RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function _ix2St(root) {
    var id = root.id;
    if (!window.__ix2State[id]) window.__ix2State[id] = {};
    return window.__ix2State[id];
  }
  function _ix2Shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function _ix2Timers(root) {
    var st = _ix2St(root);
    if (!st.timers) st.timers = [];
    return st.timers;
  }
  function _ix2Clear(root) { _ix2Timers(root).forEach(clearTimeout); _ix2St(root).timers = []; }
  function _ix2After(root, ms, fn) {
    if (window.MO_RM) { fn(); return; }
    _ix2Timers(root).push(setTimeout(fn, ms));
  }

  // ---- C1 handoff ---------------------------------------------------------
  function _ix2hoPlay(root) {
    var data = _ix2JSON(root, '[data-ix2ho]'); if (!data || !data.lanes.length) return;
    _ix2Clear(root);
    var token = root.querySelector('.ix2ho-token');
    var lanes = root.querySelectorAll('.ix2ho-lane');
    lanes.forEach(function (l) { l.classList.remove('on', 'done'); });
    token.classList.remove('show');
    if (window.MO_RM) { lanes.forEach(function (l) { l.classList.add('done'); }); token.classList.add('show'); return; }
    var step = function (i) {
      if (i >= lanes.length) return;
      var lane = lanes[i];
      var stage = root.querySelector('.ix2ho-stage');
      var y = lane.offsetTop + lane.offsetHeight / 2 - token.offsetHeight / 2;
      token.style.top = y + 'px';
      token.classList.add('show');
      lane.classList.add('on');
      if (i > 0) lanes[i - 1].classList.remove('on'), lanes[i - 1].classList.add('done');
      _ix2After(root, 1100, function () { step(i + 1); });
    };
    token.style.top = (lanes[0].offsetTop + lanes[0].offsetHeight / 2 - token.offsetHeight / 2) + 'px';
    _ix2After(root, 60, function () { step(0); });
  }

  // ---- C2 buildup ----------------------------------------------------------
  function _ix2buPlay(root) {
    _ix2Clear(root);
    var items = root.querySelectorAll('.ix2bu-item');
    items.forEach(function (n) { n.classList.remove('in'); });
    items.forEach(function (n, i) { _ix2After(root, 250 + i * 420, function () { n.classList.add('in'); }); });
  }

  // ---- C3 parallel ----------------------------------------------------------
  function _ix2ptPlay(root) {
    _ix2Clear(root);
    var n = Number(root.getAttribute('data-beats') || 0);
    var beats = root.querySelectorAll('.ix2pt-beat, .ix2pt-verdict');
    beats.forEach(function (b) { b.classList.remove('in'); });
    for (var i = 0; i <= n; i++) {
      (function (i) {
        _ix2After(root, 200 + i * 650, function () {
          root.querySelectorAll('[data-beat="' + i + '"]').forEach(function (b) { b.classList.add('in'); });
        });
      })(i);
    }
  }

  // ---- C4 ripple -------------------------------------------------------------
  function _ix2riLayout(root) {
    var data = _ix2JSON(root, '[data-ix2ri]'); if (!data) return;
    var stage = root.querySelector('.ix2ri-stage');
    // place nodes on rings by angle (remove old)
    stage.querySelectorAll('.ix2ri-node').forEach(function (n) { n.remove(); });
    var byRing = {};
    data.nodes.forEach(function (nd) { var r = Math.min(Math.max(parseInt(nd.ring, 10) || 1, 1), 3); (byRing[r] = byRing[r] || []).push(nd); });
    Object.keys(byRing).forEach(function (r) {
      var arr = byRing[r], ringR = 14 + Number(r) * 11; // % of stage
      arr.forEach(function (nd, i) {
        var ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2 + Number(r) * 0.5;
        var x = 50 + ringR * Math.cos(ang), y = 50 + ringR * Math.sin(ang) * 0.82;
        var el = document.createElement('div');
        el.className = 'ix2ri-node'; el.setAttribute('data-ring', r);
        el.style.left = x + '%'; el.style.top = y + '%';
        el.innerHTML = (nd.icon ? '<span class="ix2ri-icon">' + esc(nd.icon) + '</span>' : '') +
          '<span class="ix2ri-label">' + esc(nd.label || '') + '</span>' +
          (nd.cons ? '<span class="ix2ri-cons">' + esc(nd.cons) + '</span>' : '');
        stage.appendChild(el);
      });
    });
  }
  function _ix2riPlay(root) {
    _ix2Clear(root);
    var trig = root.querySelector('.ix2ri-trigger');
    var rings = root.querySelectorAll('.ix2ri-ring');
    var nodes = root.querySelectorAll('.ix2ri-node');
    trig.classList.remove('in');
    rings.forEach(function (r) { r.classList.remove('in'); });
    nodes.forEach(function (n) { n.classList.remove('in'); });
    _ix2After(root, 150, function () { trig.classList.add('in'); });
    [1, 2, 3].forEach(function (r) {
      _ix2After(root, 500 + r * 550, function () {
        rings.forEach(function (el) { if (el.getAttribute('data-ring') == r) el.classList.add('in'); });
        nodes.forEach(function (el) { if (el.getAttribute('data-ring') == r) el.classList.add('in'); });
      });
    });
  }

  // ---- C5 journey dot -----------------------------------------------------------
  function _ix2jnLayout(root) {
    var data = _ix2JSON(root, '[data-ix2jn]'); if (!data || !data.stops.length) return;
    var path = root.querySelector('.ix2jn-path');
    var stopsBox = root.querySelector('.ix2jn-stops');
    var stage = root.querySelector('.ix2jn-stage');
    var svg = root.querySelector('.ix2jn-svg');
    stopsBox.innerHTML = '';
    var L = path.getTotalLength();
    var boxW = stage.clientWidth || 600, boxH = stage.clientHeight || 200;
    var st = _ix2St(root);
    st.jnPts = data.stops.map(function (s, i) {
      var p = path.getPointAtLength(L * (data.stops.length === 1 ? 1 : i / (data.stops.length - 1)));
      var x = p.x / 1000 * boxW, y = p.y / 240 * boxH;
      var el = document.createElement('div');
      el.className = 'ix2jn-stop';
      var above = (i % 2 === 0);
      // clamp the card (max-width 150px + translateX(-50%)) so edge stops are never clipped
      var half = 84;
      el.style.left = Math.min(Math.max(x, half), Math.max(boxW - half, half)) + 'px';
      el.style.top = (above ? Math.max(y - 110, 6) : Math.min(y + 30, Math.max(boxH - 264, 6))) + 'px';
      el.innerHTML = '<div class="ix2jn-stop-label">' + esc(s.label || ('Stop ' + (i + 1))) + '</div>' +
        (s.text ? '<div class="ix2jn-stop-text">' + esc(s.text) + '</div>' : '');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', function () {
        var was = el.classList.contains('on');
        stopsBox.querySelectorAll('.ix2jn-stop.on').forEach(function (o) { o.classList.remove('on'); });
        if (!was) el.classList.add('on');
      });
      stopsBox.appendChild(el);
      return { x: x, y: y, el: el };
    });
    // scale svg to stage
    svg.setAttribute('width', boxW); svg.setAttribute('height', boxH);
  }
  function _ix2jnPlay(root) {
    _ix2Clear(root);
    var st = _ix2St(root);
    var dot = root.querySelector('.ix2jn-dot');
    var pts = st.jnPts || [];
    if (!pts.length) return;
    pts.forEach(function (p) { p.el.classList.remove('in'); });
    var path = root.querySelector('.ix2jn-path');
    var L = path.getTotalLength();
    var boxW = root.querySelector('.ix2jn-stage').clientWidth || 600, boxH = root.querySelector('.ix2jn-stage').clientHeight || 200;
    function place(i) {
      var p = path.getPointAtLength(L * (pts.length === 1 ? 1 : i / (pts.length - 1)));
      dot.style.left = (p.x / 1000 * boxW) + 'px'; dot.style.top = (p.y / 240 * boxH) + 'px';
    }
    dot.classList.remove('show');
    if (window.MO_RM) { pts.forEach(function (p) { p.el.classList.add('in'); }); place(pts.length - 1); dot.classList.add('show'); return; }
    place(0); dot.classList.add('show');
    pts.forEach(function (p, i) {
      _ix2After(root, 300 + i * 950, function () { place(i); p.el.classList.add('in'); });
    });
  }

  // ---- I1 decision tree ------------------------------------------------------
  function _ix2dtRender(root) {
    var data = _ix2JSON(root, '[data-ix2dt]'); if (!data) return;
    var st = _ix2St(root);
    if (st.dtIdx == null) { st.dtIdx = 0; st.dtTrail = []; }
    var nodeBox = root.querySelector('.ix2dt-node');
    var trailBox = root.querySelector('.ix2dt-trail');
    trailBox.innerHTML = st.dtTrail.map(function (s) { return '<span class="ix2dt-crumb">' + esc(s) + '</span>'; }).join('<span class="ix2dt-sep">→</span>');
    if (st.dtResult != null) {
      nodeBox.innerHTML = '<div class="ix2dt-result"><div class="ix2dt-result-tag">Outcome</div>' +
        '<div class="ix2dt-result-text">' + inlineRichHTML(st.dtResult) + '</div>' +
        '<button type="button" class="ix2st-btn" data-dt-restart>Start again</button></div>';
      return;
    }
    var node = data.nodes[st.dtIdx];
    if (!node) return;
    nodeBox.innerHTML = '<div class="ix2dt-q">' + esc(node.q || '') + '</div>' +
      '<div class="ix2dt-opts">' + _ixArr(node.opts).map(function (o, i) {
        return '<button type="button" class="ix2dt-opt" data-dt-opt="' + i + '">' + esc(o.t || ('Option ' + (i + 1))) + '</button>';
      }).join('') + '</div>';
  }

  // ---- I2 scenario --------------------------------------------------------------
  function _ix2scRender(root) {
    var data = _ix2JSON(root, '[data-ix2sc]'); if (!data) return;
    var st = _ix2St(root);
    if (st.scIdx == null) { st.scIdx = 0; st.scCons = null; }
    var dots = root.querySelector('.ix2sc-dots');
    dots.innerHTML = data.beats.map(function (b, i) {
      return '<span class="ix2sc-dot' + (i < st.scIdx ? ' done' : '') + (i === st.scIdx ? ' on' : '') + '"></span>';
    }).join('');
    var box = root.querySelector('.ix2sc-beat');
    if (st.scIdx >= data.beats.length) {
      box.innerHTML = '<div class="ix2sc-end"><div class="ix2dt-result-tag">Scenario complete</div>' +
        (data.title ? '<div class="ix2sc-end-t">' + esc(data.title) + '</div>' : '') +
        '<button type="button" class="ix2st-btn" data-sc-restart>Play again</button></div>';
      return;
    }
    var b = data.beats[st.scIdx];
    var html = (b.tag ? '<div class="ix2sc-tag">' + esc(b.tag) + '</div>' : '') +
      '<div class="ix2sc-text">' + inlineRichHTML(b.text || '') + '</div>';
    if (st.scCons != null) {
      var ok = st.scConsOk;
      html += '<div class="ix2sc-cons ' + (ok ? 'ok' : 'warn') + '"><div class="ix2sc-cons-tag">' + (ok ? 'Good call' : 'Think again') + '</div>' + inlineRichHTML(st.scCons) + '</div>' +
        '<button type="button" class="ix2st-btn" data-sc-next>' + (st.scIdx < data.beats.length - 1 ? 'Continue →' : 'Finish') + '</button>';
    } else {
      html += '<div class="ix2sc-opts">' + _ixArr(b.opts).map(function (o, i) {
        return '<button type="button" class="ix2dt-opt" data-sc-opt="' + i + '">' + esc(o.t || ('Option ' + (i + 1))) + '</button>';
      }).join('') + '</div>';
    }
    box.innerHTML = html;
  }

  // ---- I4 stepper -----------------------------------------------------------------
  function _ix2stRender(root) {
    var data = _ix2JSON(root, '[data-ix2st]'); if (!data || !data.steps.length) return;
    var st = _ix2St(root);
    if (st.stIdx == null) st.stIdx = 0;
    var i = Math.min(Math.max(st.stIdx, 0), data.steps.length - 1);
    st.stIdx = i;
    var s = data.steps[i];
    var stage = root.querySelector('.ix2st-stage');
    var color = s.color || '#B59060';
    stage.innerHTML = '<div class="ix2st-card" data-step-i="' + i + '">' +
      '<div class="ix2st-num" style="background:' + esc(color) + ';">' + (i + 1) + '</div>' +
      (s.img ? '<div class="ix2st-img" style="background-image:url(\'' + esc(s.img) + '\');"></div>' : '') +
      '<div class="ix2st-t">' + esc(s.t || ('Step ' + (i + 1))) + '</div>' +
      (s.d ? '<div class="ix2st-d">' + inlineRichHTML(s.d) + '</div>' : '') +
      '</div>';
    root.querySelector('.ix2st-count').textContent = (i + 1) + ' / ' + data.steps.length;
    root.querySelector('[data-st="-1"]').disabled = (i === 0);
    root.querySelector('[data-st="1"]').disabled = (i === data.steps.length - 1);
  }

  // ---- I5 matching -------------------------------------------------------------------
  function _ix2maRender(root) {
    var data = _ix2JSON(root, '[data-ix2ma]'); if (!data) return;
    var st = _ix2St(root);
    st.maSel = null; st.maDone = {};
    var terms = root.querySelector('.ix2ma-terms');
    var defs = root.querySelector('.ix2ma-defs');
    terms.innerHTML = ''; defs.innerHTML = '';
    data.pairs.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ix2ma-item'; b.setAttribute('data-ma-term', i);
      b.textContent = (Array.isArray(p) ? p[0] : p.term) || '';
      terms.appendChild(b);
    });
    _ix2Shuffle(data.pairs.map(function (p, i) { return i; })).forEach(function (i) {
      var p = data.pairs[i];
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ix2ma-item'; b.setAttribute('data-ma-def', i);
      b.textContent = (Array.isArray(p) ? p[1] : p.def) || '';
      defs.appendChild(b);
    });
    var sc = root.querySelector('.ix2ma-score'); if (sc) sc.textContent = '';
  }

  // ---- I6 sequencing --------------------------------------------------------------------
  function _ix2sqRender(root) {
    var data = _ix2JSON(root, '[data-ix2sq]'); if (!data) return;
    var st = _ix2St(root);
    st.sqPicked = [];
    var pool = root.querySelector('.ix2sq-pool');
    var order = root.querySelector('.ix2sq-order');
    pool.innerHTML = ''; order.innerHTML = '';
    _ix2Shuffle(data.items.map(function (s, i) { return i; })).forEach(function (i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ix2sq-chip'; b.setAttribute('data-sq', i);
      b.textContent = data.items[i];
      pool.appendChild(b);
    });
    order.innerHTML = '<span class="ix2sq-hint">Tap steps above in the order they happen →</span>';
    var msg = root.querySelector('.ix2sq-msg'); if (msg) msg.textContent = '';
  }

  // ---- play dispatcher (on-view + replay) -------------------------------------------------
  window._ix2Play = function (root) {
    if (root.classList.contains('pb-ix2ho')) _ix2hoPlay(root);
    else if (root.classList.contains('pb-ix2bu')) _ix2buPlay(root);
    else if (root.classList.contains('pb-ix2pt')) _ix2ptPlay(root);
    else if (root.classList.contains('pb-ix2ri')) { if (!root.querySelector('.ix2ri-node')) _ix2riLayout(root); _ix2riPlay(root); }
    else if (root.classList.contains('pb-ix2jn')) { _ix2jnLayout(root); _ix2jnPlay(root); }
    else if (root.classList.contains('pb-ix2dt')) _ix2dtRender(root);
    else if (root.classList.contains('pb-ix2sc')) _ix2scRender(root);
    else if (root.classList.contains('pb-ix2st')) _ix2stRender(root);
    else if (root.classList.contains('pb-ix2ma')) _ix2maRender(root);
    else if (root.classList.contains('pb-ix2sq')) _ix2sqRender(root);
  };
  // interactions that need first render even before view
  function _ix2Init(root) {
    if (root.classList.contains('pb-ix2dt')) _ix2dtRender(root);
    else if (root.classList.contains('pb-ix2sc')) _ix2scRender(root);
    else if (root.classList.contains('pb-ix2st')) _ix2stRender(root);
    else if (root.classList.contains('pb-ix2ma')) _ix2maRender(root);
    else if (root.classList.contains('pb-ix2sq')) _ix2sqRender(root);
    else if (root.classList.contains('pb-ix2ri') && !root.querySelector('.ix2ri-node')) _ix2riLayout(root);
    else if (root.classList.contains('pb-ix2jn') && !( _ix2St(root).jnPts || []).length) _ix2jnLayout(root);
  }
  window._ix2Init = _ix2Init;

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;

    // glossary term popover
    var g = t.closest('.mo-gloss');
    if (g) {
      var was = g.classList.contains('open');
      document.querySelectorAll('.mo-gloss.open').forEach(function (x) { x.classList.remove('open'); });
      if (!was) g.classList.add('open');
      return;
    }
    if (!t.closest('.mo-gloss')) {
      document.querySelectorAll('.mo-gloss.open').forEach(function (x) { x.classList.remove('open'); });
    }

    // replay / reset
    if (t.closest('[data-ix2-replay]')) { var r0 = t.closest('.pb-ix'); if (r0) window._ix2Play(r0); return; }
    if (t.closest('[data-ix2-reset]')) {
      var rr = t.closest('.pb-ix');
      if (rr) { delete window.__ix2State[rr.id]; window._ix2Play(rr); }
      return;
    }

    // dtree
    var dto = t.closest('[data-dt-opt]');
    if (dto) {
      var dtw = dto.closest('.pb-ix2dt');
      var dtd = _ix2JSON(dtw, '[data-ix2dt]');
      var dst = _ix2St(dtw);
      var opt = _ixArr(dtd.nodes[dst.dtIdx].opts)[Number(dto.getAttribute('data-dt-opt'))];
      dst.dtTrail.push(opt.t || '');
      if (opt.result != null && opt.result !== '') dst.dtResult = opt.result;
      else dst.dtIdx = Number(opt.to) || 0;
      _ix2dtRender(dtw); return;
    }
    if (t.closest('[data-dt-restart]')) { var dtw2 = t.closest('.pb-ix2dt'); delete window.__ix2State[dtw2.id]; _ix2dtRender(dtw2); return; }

    // scenario
    var sco = t.closest('[data-sc-opt]');
    if (sco) {
      var scw = sco.closest('.pb-ix2sc');
      var scd = _ix2JSON(scw, '[data-ix2sc]');
      var sst = _ix2St(scw);
      var so = _ixArr(scd.beats[sst.scIdx].opts)[Number(sco.getAttribute('data-sc-opt'))];
      sst.scCons = so.cons || ''; sst.scConsOk = !!so.ok;
      _ix2scRender(scw); return;
    }
    if (t.closest('[data-sc-next]')) { var scw2 = t.closest('.pb-ix2sc'); var sst2 = _ix2St(scw2); sst2.scIdx++; sst2.scCons = null; _ix2scRender(scw2); return; }
    if (t.closest('[data-sc-restart]')) { var scw3 = t.closest('.pb-ix2sc'); delete window.__ix2State[scw3.id]; _ix2scRender(scw3); return; }

    // hotspot
    var hsd = t.closest('.ix2hs-dot');
    if (hsd) {
      var hsw = hsd.closest('.pb-ix2hs');
      var hi = hsd.getAttribute('data-hs');
      var pop = hsw.querySelector('[data-hsp="' + hi + '"]');
      var wasHidden = pop.hidden;
      hsw.querySelectorAll('.ix2hs-pop').forEach(function (p) { p.hidden = true; });
      hsw.querySelectorAll('.ix2hs-dot').forEach(function (d) { d.classList.remove('on'); });
      if (wasHidden) { pop.hidden = false; hsd.classList.add('on'); }
      return;
    }

    // stepper
    var stb = t.closest('[data-st]');
    if (stb && stb.closest('.pb-ix2st')) {
      var stw = stb.closest('.pb-ix2st');
      var sst3 = _ix2St(stw);
      sst3.stIdx = (sst3.stIdx || 0) + Number(stb.getAttribute('data-st'));
      _ix2stRender(stw); return;
    }

    // matching
    var mterm = t.closest('[data-ma-term]');
    if (mterm && !mterm.classList.contains('done')) {
      var mw = mterm.closest('.pb-ix2ma');
      mw.querySelectorAll('[data-ma-term]').forEach(function (x) { x.classList.remove('sel'); });
      mterm.classList.add('sel');
      _ix2St(mw).maSel = mterm.getAttribute('data-ma-term');
      return;
    }
    var mdef = t.closest('[data-ma-def]');
    if (mdef && !mdef.classList.contains('done')) {
      var mw2 = mdef.closest('.pb-ix2ma');
      var mst = _ix2St(mw2);
      if (mst.maSel == null) { mdef.classList.add('shake'); setTimeout(function () { mdef.classList.remove('shake'); }, 450); return; }
      var termBtn = mw2.querySelector('[data-ma-term="' + mst.maSel + '"]');
      if (mdef.getAttribute('data-ma-def') === mst.maSel) {
        termBtn.classList.remove('sel'); termBtn.classList.add('done'); mdef.classList.add('done');
        mst.maSel = null;
        var doneCount = mw2.querySelectorAll('.ix2ma-item.done').length;
        var total = mw2.querySelectorAll('[data-ma-term]').length;
        var scEl = mw2.querySelector('.ix2ma-score');
        if (scEl) scEl.textContent = doneCount / 2 === total ? 'All matched — well done!' : (doneCount / 2) + ' of ' + total + ' matched';
      } else {
        mdef.classList.add('shake'); termBtn.classList.add('shake');
        setTimeout(function () { mdef.classList.remove('shake'); if (termBtn) termBtn.classList.remove('shake'); }, 450);
      }
      return;
    }

    // sequencing
    var sqc = t.closest('[data-sq]');
    if (sqc && sqc.closest('.ix2sq-pool')) {
      var sqw = sqc.closest('.pb-ix2sq');
      var qst = _ix2St(sqw);
      var qi = Number(sqc.getAttribute('data-sq'));
      if (qst.sqPicked.indexOf(qi) !== -1) return;
      qst.sqPicked.push(qi);
      sqc.classList.add('picked');
      var orderBox = sqw.querySelector('.ix2sq-order');
      var hint = orderBox.querySelector('.ix2sq-hint'); if (hint) hint.remove();
      var chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'ix2sq-chip in-order'; chip.setAttribute('data-sq-un', qi);
      chip.innerHTML = '<span class="ix2sq-n">' + qst.sqPicked.length + '</span>' + esc(sqc.textContent);
      orderBox.appendChild(chip);
      return;
    }
    var squn = t.closest('[data-sq-un]');
    if (squn) {
      var sqw2 = squn.closest('.pb-ix2sq');
      var qst2 = _ix2St(sqw2);
      var uqi = Number(squn.getAttribute('data-sq-un'));
      var pos = qst2.sqPicked.indexOf(uqi);
      if (pos !== -1) qst2.sqPicked.splice(pos, 1);
      var poolChip = sqw2.querySelector('.ix2sq-pool [data-sq="' + uqi + '"]');
      if (poolChip) poolChip.classList.remove('picked');
      squn.remove();
      sqw2.querySelectorAll('.ix2sq-order .ix2sq-chip').forEach(function (c, i) {
        var n = c.querySelector('.ix2sq-n'); if (n) n.textContent = (i + 1);
        c.setAttribute('data-sq-un', qst2.sqPicked[i]);
      });
      if (!qst2.sqPicked.length) sqw2.querySelector('.ix2sq-order').innerHTML = '<span class="ix2sq-hint">Tap steps above in the order they happen →</span>';
      return;
    }
    if (t.closest('[data-sq-check]')) {
      var sqw3 = t.closest('.pb-ix2sq');
      var qst3 = _ix2St(sqw3);
      var sqd = _ix2JSON(sqw3, '[data-ix2sq]');
      var chips = sqw3.querySelectorAll('.ix2sq-order .ix2sq-chip');
      var good = 0;
      chips.forEach(function (c, i) {
        var ok = qst3.sqPicked[i] === i;
        c.classList.toggle('ok', ok); c.classList.toggle('bad', !ok);
        if (ok) good++;
      });
      var msg = sqw3.querySelector('.ix2sq-msg');
      if (msg) msg.textContent = chips.length < sqd.items.length ? 'Place every step first.' :
        (good === sqd.items.length ? 'Perfect order — well done!' : good + ' of ' + sqd.items.length + ' in the right spot.');
      return;
    }
  });
}

// -------------------------------------------------------------------------
// Glossary inline markup — [g:term|definition] inside rich text.
// Wraps inlineRichHTML; original kept as core for figure/link handling.
// -------------------------------------------------------------------------
var _inlineRichCore = inlineRichHTML;
inlineRichHTML = function (text) {
  text = String(text == null ? '' : text);
  if (text.indexOf('[g:') === -1) return _inlineRichCore(text);
  var out = '', re = /\[g:([^\]|]+)\|([^\]]+)\]/g, last = 0, m;
  while ((m = re.exec(text))) {
    out += _inlineRichCore(text.slice(last, m.index));
    out += '<span class="mo-gloss" tabindex="0">' + esc(m[1]) + '<span class="mo-gloss-pop" role="tooltip">' + esc(m[2]) + '</span></span>';
    last = m.index + m[0].length;
  }
  out += _inlineRichCore(text.slice(last));
  return out;
};

// -------------------------------------------------------------------------
// MOTION LAYER — scroll-triggered reveals, counters, gauge sweep, chart bars,
// processflow stagger, cinematic chapter opener. Play-once per chapter view;
// reduced-motion users get the final state immediately.
// -------------------------------------------------------------------------
(function () {
  var RM = window.MO_RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Counters — animate the numeric prefix of .pb-stat-num.
  function _moCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var numEl = el.childNodes[0];
    var txt = el.textContent;
    var m = txt.match(/^\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
    if (!m) return;
    var target = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(target) || RM) return;
    var dec = (m[1].split('.')[1] || '').length;
    var suffixNode = el.querySelector('.pb-stat-unit');
    var start = null, dur = 1200;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = (target * eased).toFixed(dec);
      el.firstChild.nodeValue = val.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (p < 1) requestAnimationFrame(frame);
    }
    if (el.firstChild && el.firstChild.nodeType === 3) requestAnimationFrame(frame);
  }

  // Gauge — sweep the needle from -90° to its resting angle.
  function _moGauge(svg) {
    if (svg.dataset.gauged) return;
    svg.dataset.gauged = '1';
    var needle = svg.querySelector('g[transform^="rotate("]');
    if (!needle || RM) return;
    var m = needle.getAttribute('transform').match(/rotate\((-?[0-9.]+)/);
    if (!m) return;
    var end = parseFloat(m[1]), start = null, dur = 1100;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      needle.setAttribute('transform', needle.getAttribute('transform').replace(/rotate\(-?[0-9.]+/, 'rotate(' + (-90 + (end + 90) * eased).toFixed(1)));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function _moScan() {
    // ix2 interactions — init those that need first paint, arm play-on-view
    document.querySelectorAll('.pb-ix2ho,.pb-ix2bu,.pb-ix2pt,.pb-ix2ri,.pb-ix2jn,.pb-ix2dt,.pb-ix2sc,.pb-ix2st,.pb-ix2ma,.pb-ix2sq').forEach(function (r) {
      if (!r.dataset.ix2Armed) {
        r.dataset.ix2Armed = '1';
        window._ix2Init(r);
        _moObserve(r, function () { window._ix2Play(r); });
      }
    });
    // generic reveal
    document.querySelectorAll('.pb-ix:not([class*="pb-ix2"]), .pb-stats').forEach(function (el) {
      if (el.dataset.rvArmed) return;
      el.dataset.rvArmed = '1';
      if (RM) return;
      el.classList.add('mo-rv');
      _moObserve(el, function () { el.classList.add('in'); });
    });
    // statband counters
    document.querySelectorAll('.pb-stat-num').forEach(function (el) {
      if (el.dataset.counted) return;
      _moObserve(el, function () { _moCount(el); });
    });
    // gauge sweep
    document.querySelectorAll('.pb-gauge-svgwrap svg').forEach(function (el) {
      if (el.dataset.gauged) return;
      _moObserve(el, function () { _moGauge(el); });
    });
    // chart bars — grow on view
    document.querySelectorAll('.ixchart').forEach(function (svg) {
      if (svg.dataset.barsArmed) return;
      svg.dataset.barsArmed = '1';
      if (RM) return;
      var bars = svg.querySelectorAll('rect');
      bars.forEach(function (b) { b.classList.add('mo-bar'); });
      _moObserve(svg, function () { svg.classList.add('mo-bars-in'); });
    });
    // processflow stagger
    document.querySelectorAll('.pb-ixpf').forEach(function (pf) {
      if (pf.dataset.stagArmed) return;
      pf.dataset.stagArmed = '1';
      if (RM) return;
      pf.querySelectorAll('.ixpf-step').forEach(function (s, i) { s.style.transitionDelay = (i * 70) + 'ms'; });
      pf.classList.add('mo-rv');
      _moObserve(pf, function () { pf.classList.add('in'); });
    });
    // cinematic chapter opener
    document.querySelectorAll('section.chapter .opener').forEach(function (op) {
      if (op.dataset.opArmed) return;
      op.dataset.opArmed = '1';
      if (RM) { op.classList.add('mo-op-play'); return; }
      _moObserve(op, function () { op.classList.add('mo-op-play'); });
    });
  }

  var _moIO = null;
  function _moObserve(el, cb) {
    if (RM) { cb(); return; }
    if (!('IntersectionObserver' in window)) { cb(); return; }
    if (!_moIO) {
      _moIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var f = en.target.__moCb;
          _moIO.unobserve(en.target);
          if (f) f();
        });
      }, { threshold: 0.25 });
    }
    el.__moCb = cb;
    _moIO.observe(el);
  }

  // re-scan after every render
  if (typeof window.applyPlaybook === 'function' && !window.applyPlaybook.__moWrapped) {
    var _origApply = window.applyPlaybook;
    var wrapped = function () {
      var r = _origApply.apply(this, arguments);
      try { _moScan(); } catch (e) {}
      return r;
    };
    wrapped.__moWrapped = true;
    window.applyPlaybook = wrapped;
  }
  window._moScan = _moScan;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { _moScan(); } catch (e) {} });
  else { try { _moScan(); } catch (e) {} }
})();
