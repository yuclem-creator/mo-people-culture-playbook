/* =================================================================
   MANDARIN ORIENTAL — P&C PLAYBOOK · MAGAZINE V2
   All chapter content verbatim from the May 2026 source document.
   ================================================================= */

// ---- CHAPTER DEFINITIONS ------------------------------------------
// Order & numerals follow the source TOC.
const CHAPTERS = [
  { id: 'cover',    numeral: '',    label: 'Cover',                                      icon: '·'  },
  { id: 'ch-1',     numeral: 'I',   label: 'Introduction',                               opener: 'opener_intro.jpg'   },
  { id: 'ch-2',     numeral: 'II',  label: 'About Mandarin Oriental',                    opener: 'opener_about.jpg'   },
  { id: 'ch-3',     numeral: 'III', label: 'Leading Through the Colleague Lifecycle',    opener: 'ch_A_integrity.jpg', hasSubs: true },
  { id: 'ch-4',     numeral: 'IV',  label: 'Pre-Opening Hotels',                         opener: 'opener_preopen.jpg' },
  { id: 'ch-5',     numeral: 'V',   label: 'P&C Audit',                                  opener: 'opener_audit.jpg'   },
  { id: 'ch-6',     numeral: 'VI',  label: 'Staying Connected & Supported',              opener: 'opener_support.jpg' }
];

// Sub-chapters for Chapter III (Colleague Lifecycle)
const LIFECYCLE = [
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

// Senior Management (verbatim)
const SENIOR_MGMT = [
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
const MENU_DESC = {
  'ch-1': 'A letter from our Chief People & Culture Officer, and how to use this Playbook.',
  'ch-2': 'Our heritage, our global presence, and the leadership that guides us.',
  'ch-3': 'The eight stages of the Colleague journey — from integrity to lasting connection.',
  'ch-4': 'How People & Culture brings a new hotel to life, from planning to opening day.',
  'ch-5': 'How we measure and uphold the standards of People & Culture across the Group.',
  'ch-6': 'The networks, tools, and communities that keep every Colleague supported.'
};

// Policy chip symbols — thin-stroke line icons
const SYM = {
  policy: icon('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5"/>'),
  guide:  icon('<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.8l-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9z"/>'),
  kit:    icon('<rect x="4" y="7.5" width="16" height="12" rx="1.5"/><path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7"/><path d="M4 12.5h16"/>'),
  xref:   icon('<path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v16H8a1.5 1.5 0 0 1-1.5-1.5v-16z"/><path d="M6.5 17.5H19"/><path d="M10 8h6"/>')
};

/* =================================================================
   CHAPTER 3 — SUB-CHAPTER POLICY CONTENT (verbatim from source)
   ================================================================= */
const LIFECYCLE_CONTENT = {
  'sub-A': {
    philosophy: 'Ethical Conduct and Fair Employment set the foundation for how we lead, hire, and treat every Colleague.',
    sections: [
      { num: '1', title: 'Ethical Conduct & Integrity', items: [
        { s:'policy', name:'Code of Conduct & Ethics' },
        { s:'policy', name:'Social Media & Digital Responsibility Policy' },
        { s:'policy', name:'Open Door Policy' },
        { s:'policy', name:'Anti-Harassment & Bullying Policy' },
        { s:'policy', name:'Whistleblowing Policy' },
        { s:'guide',  name:'Whistleblowing Speak-Up Guide' },
        { s:'policy', name:'Colleague Relationship Policy' },
        { s:'policy', name:'Business Entertainment Policy' }
      ]},
      { num: '2', title: 'Fair Employment & Equal Opportunity', items: [
        { s:'policy', name:'Employment Policy' }
      ]}
    ]
  },
  'sub-B': {
    philosophy: 'We attract people whose values, craft and curiosity match Mandarin Oriental\u2019s standard of excellence. Every hire is a promise to guests, to Colleagues, and to the culture.',
    sections: [
      { num: '1', title: 'Talent Acquisition Strategy & Governance', items: [
        { s:'guide',  name:'Talent Acquisition Governance Framework Guidelines' },
        { s:'policy', name:'Recruitment, Selection & Hiring Requisition & Approvals Policy' },
        { s:'kit',    name:'Job Requisition Management — Evergreen JR and Job Posting' },
        { s:'kit',    name:'Candidate Job Application Process (Recruiting Stages)' },
        { s:'kit',    name:'Bulk or Mass Action and Candidate Communications' },
        { s:'kit',    name:'Referrals & Internal Candidates' },
        { s:'guide',  name:'Recruitment Data & Analytics' }
      ]},
      { num: '2', title: 'Employer Brand & Candidate Experience', items: [
        { s:'guide',  name:'Colleague Value Proposition Guidelines' },
        { s:'guide',  name:'Colleague Brand Identity & Guidelines' },
        { s:'kit',    name:'Colleague Brand Layouts' },
        { s:'kit',    name:'Colleague Images' },
        { s:'guide',  name:'LinkedIn Recruitment Guidelines' },
        { s:'kit',    name:'InMail templates for Recruiters' },
        { s:'guide',  name:'LinkedIn Executive Guide' },
        { s:'guide',  name:'Candidate Experience Guidelines' },
        { s:'kit',    name:'Candidate Emails from Recruitment Processes' },
        { s:'guide',  name:'Local Employer Brand Awards Guidelines' }
      ]},
      { num: '3', title: 'Job Advertisements', items: [
        { s:'kit', name:'Job Description Template' },
        { s:'kit', name:'Job Advertisement Templates' }
      ]},
      { num: '4', title: 'Sourcing Channels', items: [
        { s:'guide',  name:'Proactive Recruitment Guidelines' },
        { s:'guide',  name:'Talent Bank Screening Interview Guidelines' },
        { s:'policy', name:'Colleague Transfer Policy' },
        { s:'kit',    name:'Colleague Transfer Flow Chart' },
        { s:'policy', name:'Rehiring Colleagues Policy' },
        { s:'policy', name:'Colleague Referral Policy' },
        { s:'policy', name:'Employment of Relatives Policy' },
        { s:'guide',  name:'Local University Engagement Strategy' },
        { s:'kit',    name:'University Engagement Slide Deck, Collateral, and Marketing materials' },
        { s:'guide',  name:'Recruitment Agency Engagement Guidelines' },
        { s:'kit',    name:'Recruitment Agency Ethical Conduct & Compliance Form' }
      ]},
      { num: '5', title: 'Selection & Assessment', items: [
        { s:'policy', name:'Talogy Assessment Guidelines' },
        { s:'guide',  name:'Refresher training sessions — Talogy' },
        { s:'policy', name:'Reference / Background Check Policy' }
      ]},
      { num: '6', title: 'Offer Management & Pre-Boarding', items: [] }
    ]
  },
  'sub-C': {
    philosophy: 'The first weeks shape a Colleague\u2019s relationship with Mandarin Oriental for years. Onboarding is a promise to welcome, orient, and support with intention.',
    sections: [
      { num: '1', title: 'Onboarding & Integration', items: [
        { s:'policy', name:'Onboarding ("MOve In") Policy' },
        { s:'guide',  name:'Induction & Orientation Guidelines' },
        { s:'kit',    name:'Induction Samples' },
        { s:'guide',  name:'Designing the Colleague Handbook' },
        { s:'kit',    name:'Colleague Handbook Samples' },
        { s:'guide',  name:'Introduction to MOve-In' },
        { s:'guide',  name:'Management MOve-In Explanation for L&D' }
      ]},
      { num: '2', title: 'Probation & Early Performance', items: [
        { s:'policy', name:'Probationary Period Policy' }
      ]}
    ]
  },
  'sub-D': {
    philosophy: 'The quiet, exacting systems behind People & Culture — workforce planning, records, technology, payroll and analytics — must run with the same precision as the service we deliver.',
    sections: [
      { num: '1', title: 'Strategic Workforce Planning', items: [
        { s:'guide',  name:'Manpower Planning Guidelines' },
        { s:'guide',  name:'Workforce Budgeting & Forecasting' },
        { s:'kit',    name:'Workforce Planning Templates & Dashboard' },
        { s:'guide',  name:'Workforce Plan Review Cycle' },
        { s:'guide',  name:'Job Classification Structure' },
        { s:'kit',    name:'Hotel Position Matrix' },
        { s:'guide',  name:'Compensation Benchmarking and Salary Survey Guidelines' },
        { s:'policy', name:'Headcount Requisition Policy' },
        { s:'policy', name:'CEA / Task Force Policy' },
        { s:'kit',    name:'CEA / Task Force Kit' },
        { s:'policy', name:'Cluster & Area Roles Policy' }
      ]},
      { num: '2', title: 'Employment Administration & Records', items: [
        { s:'policy', name:'Employment Contracts' },
        { s:'policy', name:'Colleague File Policy' },
        { s:'xref',   name:'Colleague Status Changes (Finance-owned — cross-reference)' },
        { s:'policy', name:'Colleague Action Form Policy' },
        { s:'kit',    name:'Colleague Action Form Template' },
        { s:'guide',  name:'Right-to-Work & Identity Verification Guidelines' }
      ]},
      { num: '3', title: 'P&C Documentation & Systems', items: [
        { s:'policy', name:'HR Information Systems (HRIS) Policy' },
        { s:'xref',   name:'Data Privacy & Confidentiality Policy (Cross-ref to IT Data Privacy Manual 2025)' }
      ]},
      { num: '4', title: 'Technology & Data Use', items: [
        { s:'xref',   name:'IT Systems & Data Policy' },
        { s:'policy', name:'Artificial Intelligence (AI) Policy' }
      ]},
      { num: '5', title: 'Payroll & Benefits Operations', items: [
        { s:'xref',   name:'Timekeeping & Payroll Accounting Policy' },
        { s:'policy', name:'Payroll Accuracy & Data Reconciliation Policy' },
        { s:'policy', name:'Absenteeism, Punctuality & Hours of Work Policy' },
        { s:'guide',  name:'Compensation Administration Guidelines' },
        { s:'policy', name:'Hotel Benefits Administration Policy' },
        { s:'policy', name:'Cash Shortage & Overage Policy' },
        { s:'policy', name:'Hotel Business Travel Policy' },
        { s:'policy', name:'Alcohol Consumption Policy' },
        { s:'policy', name:'Breakage Policy' }
      ]},
      { num: '6', title: 'Reporting & Analytics', items: [] }
    ]
  },
  'sub-E': {
    philosophy: 'Care begins with our Colleagues. Engagement, recognition, wellbeing, and voice are how we live that belief every day.',
    sections: [
      { num: '1', title: 'Engagement, Connection & Community', items: [
        { s:'policy', name:'Colleague Communication & Activities Policy' },
        { s:'policy', name:'Inclusion, Equity & Diversity' },
        { s:'policy', name:'Volunteering Policy' },
        { s:'kit',    name:'Volunteering Leave Application Form' },
        { s:'policy', name:'Fan Pins & Fan Name Tags' },
        { s:'guide',  name:'Employee Engagement & Pulse Survey Guidelines' },
        { s:'guide',  name:'Heart-of-House Guide' }
      ]},
      { num: '2', title: 'Recognition & Appreciation', items: [
        { s:'guide', name:'Colleague Recognition & Appreciation Guidelines' },
        { s:'guide', name:'Dedicated Service Award' }
      ]},
      { num: '3', title: 'Health, Safety & Wellbeing', items: [
        { s:'guide',  name:'Employee Assistance Program (EAP)' },
        { s:'xref',   name:'Mental Health First Aid Certification' },
        { s:'xref',   name:'Mental Health First Aid Certification — About the Role' },
        { s:'xref',   name:'Mental Health First Aid Colleague List' },
        { s:'guide',  name:'Personal Grooming Standards' },
        { s:'policy', name:'Operational Risk Management' }
      ]},
      { num: '4', title: 'Colleague Voice', items: [
        { s:'policy', name:'Colleague Grievances Policy' },
        { s:'policy', name:'Progressive Disciplinary Procedures Policy' }
      ]}
    ]
  },
  'sub-F': {
    philosophy: 'How we pay, reward, and support movement across the Group reflects our respect for the craft of every Colleague.',
    sections: [
      { num: '1', title: 'Compensation', items: [
        { s:'policy', name:'Compensation Framework and Governance Policy' },
        { s:'policy', name:'Base Pay Policy' },
        { s:'policy', name:'Year End Salary Budget Approval (corporate)' },
        { s:'xref',   name:'Year End Salary Budget Approval (appendix for corporate)' },
        { s:'xref',   name:'Vacation Pay and Other Entitlements (Finance-owned — cross-reference)' },
        { s:'xref',   name:'Provisions for Vacation Pay and Bonus (Finance-owned — cross-reference)' },
        { s:'policy', name:'Incentive Compensation Plan Policy' }
      ]},
      { num: '2', title: 'Benefits', items: [
        { s:'guide',  name:'Leave Policy Guidelines' },
        { s:'guide',  name:'Health & Insurance Benefits Guidelines' },
        { s:'guide',  name:'Meal Allowance Guidelines' },
        { s:'guide',  name:'Colleague Dining Programme Guidelines' },
        { s:'guide',  name:'Colleague Spa Discount Programme Guidelines' },
        { s:'guide',  name:'Access to Health Club / Fitness Centres' },
        { s:'policy', name:'Complimentary Colleague Room Stay Benefits Programme (MOcomp)' },
        { s:'policy', name:'Discounted Colleague Room Stay Benefits Programme (MOrate)' },
        { s:'xref',   name:'Employee Loans (Finance-owned — cross-reference)' },
        { s:'xref',   name:'General Tuition Loan Policy' },
        { s:'kit',    name:'General Tuition Loan Addendum — Sample' },
        { s:'guide',  name:'Retirement & Pension Guidelines' }
      ]},
      { num: '3', title: 'Mobility', items: [
        { s:'policy', name:'International Mobility Policy' },
        { s:'policy', name:'Relocation Assistance Policy' },
        { s:'xref',   name:'Colleague Transfer Policy — Compensation & Benefits' },
        { s:'xref',   name:'Task Force, CEA fact sheet' }
      ]}
    ]
  },
  'sub-G': {
    philosophy: 'Every Colleague deserves the chance to grow. Performance conversations, learning pathways, and career development are how we invest in that growth.',
    sections: [
      { num: '1', title: 'Performance Management', items: [
        { s:'policy', name:'Compensation Framework and Governance Policy' },
        { s:'policy', name:'Base Pay Policy' },
        { s:'policy', name:'Year End Salary Budget Approval (corporate)' },
        { s:'xref',   name:'Year End Salary Budget Approval (appendix for corporate)' },
        { s:'xref',   name:'Vacation Pay and Other Entitlements (Finance-owned — cross-reference)' },
        { s:'xref',   name:'Provisions for Vacation Pay and Bonus (Finance-owned — cross-reference)' },
        { s:'policy', name:'Incentive Compensation Plan Policy' }
      ]},
      { num: '2', title: 'Learning & Capability', items: [
        { s:'guide', name:'Learning & Development Standards' },
        { s:'kit',   name:'L&D Standards Review Form' }
      ]},
      { num: '3', title: 'Career Development', items: [
        { s:'kit',   name:'Interviewing for Success' },
        { s:'guide', name:'Mentoring Programme' },
        { s:'guide', name:'Rising Fan Programme' },
        { s:'guide', name:'MOve Ahead Programme' },
        { s:'guide', name:'MOve Up Programme' },
        { s:'guide', name:'Presenting for Success' },
        { s:'kit',   name:'External Development Programme Application — Sample' },
        { s:'kit',   name:'External Development Programme Evaluation — Sample' },
        { s:'guide', name:'e-Cornell Introduction & Guidelines' },
        { s:'kit',   name:'e-Cornell Application Form' }
      ]}
    ]
  },
  'sub-H': {
    philosophy: 'Every departure is also a door left open. How we say farewell — and how we stay in touch — shapes the story a Colleague tells about Mandarin Oriental long after they leave.',
    sections: [
      { num: '1', title: 'Separation & Transition', items: [
        { s:'policy', name:'Offboarding Policy' }
      ]},
      { num: '2', title: 'Alumni & Re-Engagement', items: [
        { s:'policy', name:'Forever Fans MO Alumni Policy' }
      ]}
    ]
  }
};

// Pre-Opening / Audit / Support content
const CH4_SECTIONS = [
  { num: '1', title: 'P&C Pre-Opening Tools & Frameworks', items: [
    { s:'guide',  name:'P&C Guidelines for Hotel Openings and Rebrandings' },
    { s:'kit',    name:'Pre-Opening Checklist' },
    { s:'kit',    name:'Pre-Opening Budget template' },
    { s:'kit',    name:'Pre-Opening Payroll template' },
    { s:'kit',    name:'Hotel Position Matrix' },
    { s:'guide',  name:'Finance Collaboration & P&C Requirements' }
  ]}
];
const CH5_SECTIONS = [
  { num: '1', title: 'P&C Audit', items: [
    { s:'kit',    name:'P&C Operations Risk Self-Assessment Checklist' }
  ]},
  { num: '2', title: 'People Operations Governance', items: [
    { s:'guide',  name:'P&C Governance, Roles, and Escalation Framework' }
  ]}
];

/* =================================================================
   RENDERING
   ================================================================= */

function symLabel(s) {
  return { policy: 'Global Policy', guide: 'Guidelines', kit: 'Template · Toolkit', xref: 'Cross-Reference' }[s] || '';
}

function policyListHTML(items) {
  if (!items || !items.length) return '<div class="policy-item" style="grid-template-columns: 1fr; color: var(--ink-fade); font-family: Avenir Next LT Pro, sans-serif; font-style: italic; text-align: center; padding: 24px 0;">Guidance in preparation.</div>';
  return `<div class="policy-list">
    ${items.map(it => `
      <div class="policy-item">
        <div class="policy-symbol">${SYM[it.s]}</div>
        <div>
          <div class="policy-name">${it.name}</div>
        </div>
        <div class="policy-kind">${symLabel(it.s)}</div>
      </div>
    `).join('')}
  </div>`;
}

function sectionHTML(sec) {
  return `
    <div class="policy-section">
      <div class="policy-section-header">
        <span class="num">${sec.num}.</span>
        <h3>${sec.title}</h3>
      </div>
      ${policyListHTML(sec.items)}
    </div>
  `;
}

// ---- COVER ----------------------------------------------------------
function renderCover() {
  return `
    <section class="chapter" id="cover">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/cover_hero.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral">Edition · July 2026</div>
              <div class="opener-eyebrow">Mandarin Oriental · Global</div>
            </div>
            <div class="opener-bottom">
              <div class="opener-numeral" style="margin-bottom: 20px;">The Interactive Playbook</div>
              <h1 class="opener-title">People &amp;<br/>Culture<br/><em style="font-family: 'MO Exceptional'; font-weight: 400;">Playbook</em></h1>
              <p class="opener-sub">A living framework for every People &amp; Culture leader — from attracting talent to leaving with connection.</p>
              <button class="cover-cta" data-goto="menu">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/></svg>
                Explore the Contents
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="spread-header center">
          <div class="running-mini">Foreword</div>
          <div class="center-rule"></div>
          <h2 class="spread-title center">From the Chief People &amp; Culture Officer</h2>
          <p class="spread-lede center">A letter to Colleagues — the intent, the tone, and the invitation behind these pages.</p>
        </div>

        <div class="cpo-spread">
          <div class="cpo-portrait-wrap">
            <img class="cpo-portrait" src="img/cpo_portrait.jpg" alt="ShaoWei Ong" />
            <div class="cpo-caption">
              <div class="cpo-name">ShaoWei Ong</div>
              <div class="cpo-role">Chief People &amp; Culture Officer</div>
            </div>
          </div>
          <div class="cpo-letter">
            <div class="letter-greeting">Dear Colleagues,</div>
            <div class="letter-body">
              <p>This guide represents an important step toward creating <strong>globally consistent people processes and services</strong> for all our Colleagues.</p>
              <p>Our ambition is simple yet powerful: to ensure that every interaction, every process, and every service reflects our <strong>brand DNA</strong> and commitment to excellence. We believe that delivering exceptional experiences is not limited to our guests — it extends to every Colleague, in every role, across every location.</p>
              <p>This playbook is designed to support you as <strong>masters of your craft</strong>, providing clarity and consistency in our people related processes while respecting the unique character of each market. It is a resource to help us work smarter, collaborate better, and uphold the highest standards in everything we do.</p>
              <p>Thank you for embracing these principles and for your continued dedication to making our workplace extraordinary.</p>
              <p>Together, we will keep raising the bar for People &amp; Culture excellence.</p>
            </div>
            <div class="letter-close">
              <div class="letter-signature">ShaoWei Ong</div>
              <div class="cpo-role" style="font-family: 'Avenir Next LT Pro'; font-style: italic; color: var(--ink-mute); margin-top: 4px;">Chief People &amp; Culture Officer</div>
            </div>
          </div>
        </div>
      </div>

      ${chapterNavHTML(null, 'ch-1')}
    </section>
  `;
}

// ---- CHAPTER I — INTRODUCTION --------------------------------------
function renderCh1() {
  return `
    <section class="chapter" id="ch-1">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/opener_intro.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-1"]}</span>Chapter I</div>
              <div class="opener-eyebrow">Introduction</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">Welcome to our<br/>Playbook</h1>
              <p class="opener-sub">Why this guide exists, who it serves, and how to use it.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow">
          <span class="num">01</span>
          <span class="txt">Our Purpose</span>
          <span class="rule"></span>
        </div>
        <div class="editorial-body">
          <p class="drop">The Playbook exists to strengthen alignment between our shared values and daily P&amp;C practices; to support P&amp;C teams in delivering a consistent experience — from recruitment to farewell; to ensure every policy is interpreted with care, fairness, and respect; and to provide clarity, templates, and examples that make implementation simple and intuitive.</p>
          <p>Each section has been designed to follow the Colleague lifecycle, a journey that mirrors how we attract, welcome, grow, care for, and stay connected with our people.</p>
        </div>
        <div class="pullquote">Our aim is simple: to make the Playbook practical for action and inspiring in spirit — so that every P&amp;C leader can translate Mandarin Oriental's culture of care into everyday decisions and Colleague experiences.</div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">02</span>
          <span class="txt">Who This Playbook Is For</span>
          <span class="rule"></span>
        </div>
        <div class="cols-2">
          <div>
            <p>This resource is written primarily for:</p>
            <ul class="purpose-list" style="margin-top: 12px;">
              <li><span class="num">i.</span><span class="txt"><strong>People &amp; Culture leaders</strong> at hotel, regional, and corporate levels.</span></li>
              <li><span class="num">ii.</span><span class="txt"><strong>Support functions</strong> — such as Finance, and Operations — who partner with P&amp;C.</span></li>
            </ul>
          </div>
          <div>
            <p style="font-family: 'Avenir Next LT Pro', sans-serif; font-style: italic; font-size: 1.15rem; color: var(--ink);">It may also serve as a reference for any Colleague who wishes to understand how we nurture fairness, inclusion, and excellence across the Group.</p>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">03</span>
          <span class="txt">How to Use the Playbook</span>
          <span class="rule"></span>
        </div>
        <div class="editorial-body">
          <p>The Playbook is structured to be practical and intuitive. Each section begins with the <strong>why</strong> — the purpose or belief behind the policy — followed by the <strong>what</strong> and <strong>how</strong>: the key standards and responsibilities. Resources are grouped by stage of the Colleague lifecycle, from Foundations to Leaving with Dignity &amp; Connection.</p>
          <p>When consulting a resource:</p>
          <ul class="purpose-list">
            <li><span class="num">i.</span><span class="txt">Start by reading its <strong>purpose</strong> — this explains the intent.</span></li>
            <li><span class="num">ii.</span><span class="txt">Review the <strong>scope and responsibilities</strong> — who it applies to and what's expected.</span></li>
            <li><span class="num">iii.</span><span class="txt">Refer to the <strong>local adaptation notes</strong> — these ensure compliance with country-specific laws and practices.</span></li>
          </ul>
          <p style="margin-top: 24px;">Local P&amp;C teams may adapt policies, practices, and guidelines to meet legal or cultural needs, while remaining aligned with Group guidelines.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">04</span>
          <span class="txt">Tone and Spirit</span>
          <span class="rule"></span>
        </div>
        <div class="editorial-body">
          <p>Every policy in this Playbook reflects our belief that <strong>care begins with our Colleagues</strong>. Our tone is human and respectful — clear enough for action, yet warm enough to remind us that every decision touches someone's experience.</p>
          <p>We invite you to approach these pages not as a rulebook, but as a <strong>living framework</strong>: a guide that evolves as we continue to learn, grow, and serve together.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow">
          <span class="num">05</span>
          <span class="txt">Understanding Symbols</span>
          <span class="rule"></span>
        </div>
        <p style="max-width: 640px; margin: 0 0 8px; color: var(--ink-mute); font-family: 'Avenir Next LT Pro', sans-serif; font-style: italic; font-size: 1.1rem;">To make this Playbook easier to read, we use a few simple symbols throughout to help you recognise what kind of information you're looking at and how to use it.</p>
        <div class="symbol-legend">
          <div class="symbol-item"><div class="sym">${SYM.policy}</div><div><h4>Global Policy</h4><p>Indicates a Group-wide policy that applies to all properties. Local versions must align with the guidelines outlined here.</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.guide}</div><div><h4>Guidelines</h4><p>Offers recommended practices that help interpret or apply Group policies consistently.</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.kit}</div><div><h4>Template / Toolkit</h4><p>Points to practical tools such as forms, checklists, and dashboards that support implementation.</p></div></div>
          <div class="symbol-item"><div class="sym">${SYM.xref}</div><div><h4>Cross-Reference</h4><p>Shows where another related policy or section may also apply.</p></div></div>
        </div>
      </div>

      ${chapterNavHTML('cover', 'ch-2')}
    </section>
  `;
}

// ---- CHAPTER II — ABOUT MO -----------------------------------------
function renderCh2() {
  return `
    <section class="chapter" id="ch-2">
      <div class="opener">
        <div class="opener-hero" style="background-image: url('img/opener_about.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-2"]}</span>Chapter II</div>
              <div class="opener-eyebrow">The House</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">About<br/>Mandarin Oriental</h1>
              <p class="opener-sub">Our heritage, our people, and the leadership that guides everything from Hong Kong 1963 to today.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="editorial-body">
          <p class="drop">Mandarin Oriental Hotel Group is internationally recognised for delivering some of the world's most distinctive luxury hospitality experiences. Renowned for its legendary service, refined design, and deep respect for local culture, the Group has built a reputation for creating memorable moments that reflect both global standards and a strong sense of place.</p>
          <p>At Mandarin Oriental, it is our Colleagues who bring this vision to life. Through their professionalism, care, and attention to detail, they create the experiences that define the brand.</p>
          <p>For this reason, the Colleague Experience sits at the heart of how we operate. Directors of People &amp; Culture play a critical role in shaping environments where Colleagues feel supported, inspired, and empowered to deliver exceptional service.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow" id="heritage"><span class="num">01</span><span class="txt">Our Heritage</span><span class="rule"></span></div>
        <div class="cols-2">
          <div>
            <p>Mandarin Oriental's story is rooted in two legendary hotels: The Mandarin in Hong Kong, which opened in 1963 as a symbol of modern luxury in the city, and The Oriental in Bangkok, which dates back to 1876 and became renowned for its heritage and service excellence.</p>
            <p>In 1974, Mandarin International Hotels acquired a significant stake in The Oriental, bringing together Hong Kong's spirit of innovation with Bangkok's rich hospitality tradition. This partnership evolved into a full merger in 1985, forming Mandarin Oriental Hotel Group under a unified brand and the now-iconic fan logo.</p>
            <p>This heritage established the foundation for a global brand that blends Eastern elegance with world-class hospitality.</p>
          </div>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-node"></div>
              <div class="timeline-year">1876</div>
              <div class="timeline-label">The Oriental · Bangkok</div>
              <div class="timeline-note">A legend of heritage and service excellence is born on the Chao Phraya.</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-node"></div>
              <div class="timeline-year">1963</div>
              <div class="timeline-label">The Mandarin · Hong Kong</div>
              <div class="timeline-note">A new symbol of modern luxury opens in the heart of the city.</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-node"></div>
              <div class="timeline-year">1974</div>
              <div class="timeline-label">Two Legends Join</div>
              <div class="timeline-note">Mandarin International Hotels acquires a significant stake in The Oriental.</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-node"></div>
              <div class="timeline-year">1985</div>
              <div class="timeline-label">Full Merger · Unified Brand</div>
              <div class="timeline-note">Mandarin Oriental Hotel Group is formed under the iconic fan.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">02</span><span class="txt">Global Presence</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>Mandarin Oriental's portfolio spans hotels, resorts, residences, and Exceptional Homes in some of the world's most desirable destinations. Each property is designed to reflect its location, integrating local culture, heritage, and design into a contemporary luxury experience.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">03</span><span class="txt">Operations</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>Mandarin Oriental operates through a combination of owned and managed properties, ensuring consistency in brand standards across the Group. While each property reflects its unique destination, all operate within a shared commitment to service excellence, operational discipline, and continuous improvement.</p>
          <p>This approach is supported by strong collaboration across functions, with People &amp; Culture playing a key role in developing talent, enabling performance, and sustaining the standards that define the Mandarin Oriental experience.</p>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">04</span><span class="txt">Senior Management</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>Mandarin Oriental's Senior Management team provides the strategic leadership that guides the Group's global operations. Working across hotels, residences and corporate functions, the team ensures alignment with the Group's vision, brand standards and long-term growth ambitions.</p>
          <p>In close partnership with regional and hotel leadership teams, Senior Management supports operational excellence, consistent guest experiences and strong Colleague engagement across the portfolio. People &amp; Culture plays an important role in supporting this leadership through talent development, workforce planning and the cultivation of a strong and enduring service culture.</p>
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
        <div class="leader-footnote">To learn more about Mandarin Oriental's Senior Management team, please visit <a href="https://www.mandarinoriental.com/en/our-company/senior-management" target="_blank" rel="noopener">mandarinoriental.com/en/our-company/senior-management</a>.</div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">05</span><span class="txt">Vice President &amp; Regional P&amp;C Leaders</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>The Vice President and Regional People &amp; Culture Leaders play a key role in translating the Group's People &amp; Culture strategy into meaningful practices across regions and hotels. Working closely with business and hotel leadership teams, they help ensure that people decisions support operational excellence, sustainable growth and a consistent Colleague experience across Mandarin Oriental.</p>
          <p>Through their partnership with Directors of People &amp; Culture, they guide leadership capability, talent development and workforce planning across the Group's global portfolio.</p>
        </div>

        <div class="vp-hierarchy">
          <div class="vp-top">
            <div class="vp-card vp-card--top">
              <div class="vp-role-eyebrow">Group Vice-President · P&amp;C Operations</div>
              <img class="vp-photo" src="img/vp_koray.jpg" alt="Koray Genckul" />
              <div class="vp-name">Koray Genckul</div>
            </div>
          </div>
          <div class="vp-branches">
            <div class="vp-branch">
              <div class="vp-card">
                <div class="vp-role-eyebrow">Regional Director · Middle East</div>
                <img class="vp-photo" src="img/vp_nicoleta.jpg" alt="Nicoleta Cucos" />
                <div class="vp-name">Nicoleta Cucos</div>
              </div>
            </div>
            <div class="vp-branch">
              <div class="vp-card">
                <div class="vp-role-eyebrow">Regional Director · Europe</div>
                <img class="vp-photo" src="img/vp_robin.jpg" alt="Robin Vermeire" />
                <div class="vp-name">Robin Vermeire</div>
              </div>
            </div>
            <div class="vp-branch">
              <div class="vp-card">
                <div class="vp-role-eyebrow">Regional Director · Asia Pacific</div>
                <img class="vp-photo" src="img/vp_laura.jpg" alt="Laura Wilson" />
                <div class="vp-name">Laura Wilson</div>
              </div>
            </div>
          </div>
        </div>
        <p style="text-align:center; font-family:'Avenir Next LT Pro'; font-style: italic; color: var(--ink-mute); margin-top: 32px;">Together, they provide strategic leadership for People &amp; Culture across Mandarin Oriental's global portfolio.</p>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">06</span><span class="txt">Our Strategic Vision</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>Mandarin Oriental aims to strengthen its position as one of the world's most admired luxury hospitality brands. The Group continues to expand thoughtfully in key destinations while evolving the guest experience through digital innovation, sustainability leadership and distinctive wellness and lifestyle offerings.</p>
          <p>As the brand grows, Mandarin Oriental remains committed to responsible operations and long-term value creation. The Group has set ambitious sustainability goals, including achieving carbon neutrality across its operations by 2030.</p>
          <p>Supporting this vision requires exceptional Colleagues, strong leadership and a shared commitment to service excellence across every hotel, residence and corporate office.</p>
        </div>
        <div class="pullquote">Every Colleague deserves to feel proud, supported, and inspired — every day, everywhere.</div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">07</span><span class="txt">What We Believe</span><span class="rule"></span></div>
        <div class="values-grid">
          <div class="value-block">
            <h3>Our Vision</h3>
            <p>To be Fans of the Exceptional, Every Day, Everywhere.</p>
          </div>
          <div class="value-block">
            <h3>Our Mission</h3>
            <p>To craft time-enriching experiences that transform the ordinary to the exceptional and guests to fans.</p>
          </div>
          <div class="value-block" style="grid-column: 1 / -1;">
            <h3>Our Values</h3>
            <p>Mandarin Oriental's approach is guided by core values that shape every interaction with guests, Colleagues and partners. These values reflect the Group's commitment to exceptional service, continuous growth, collaboration, respect and responsible business practices.</p>
            <p>Across all Mandarin Oriental properties, these principles help ensure that every destination delivers a distinctive sense of place while maintaining the Group's global standards of excellence.</p>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">08</span><span class="txt">Within the Jardine Matheson Group</span><span class="rule"></span></div>
        <div class="cols-2">
          <div>
            <p>Mandarin Oriental Hotel Group is part of the Jardine Matheson Group, a diversified international business group with a long-standing heritage in Asia.</p>
            <p>While Mandarin Oriental operates with its own brand identity, leadership and culture, it benefits from Jardine Matheson's long-term investment philosophy, strong governance framework and commitment to responsible business practices.</p>
          </div>
          <div>
            <h4 style="color: var(--ink); margin-bottom: 12px;">Board Leadership</h4>
            <p>Jardine Matheson operates through a network of listed companies and affiliated businesses supported by the Group's strategic oversight. The Group's leaders guide the broader Jardine Matheson organization.</p>
          </div>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">09</span><span class="txt">Our People &amp; Culture Strategy</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>Mandarin Oriental's People &amp; Culture Strategy strengthens the Group's ability to deliver exceptional Colleague and guest experiences. It focuses on attracting outstanding talent, building capability, developing future leaders, and fostering a culture where wellbeing, inclusion and performance thrive together.</p>
          <p>Across all properties, People &amp; Culture works in partnership with business leaders to ensure that people decisions support Mandarin Oriental's strategy, values and long-term growth.</p>
          <p>To support consistent execution across the Group, Mandarin Oriental provides tools and guidance to help hotels translate People &amp; Culture priorities into clear annual plans.</p>
        </div>
        <div class="policy-list" style="max-width: 800px; margin: 32px auto 0;">
          <div class="policy-item">
            <div class="policy-symbol">${SYM.kit}</div>
            <div>
              <div class="policy-name">Hotel P&amp;C Strategy Planning Template</div>
              <div class="policy-name-sub">Each hotel develops an annual P&amp;C strategy aligned with Group priorities and regional guidance.</div>
            </div>
            <div class="policy-kind">Template</div>
          </div>
          <div class="policy-item">
            <div class="policy-symbol">${SYM.kit}</div>
            <div>
              <div class="policy-name">Hotel Organisation Chart</div>
              <div class="policy-name-sub">Reporting lines, team composition, and how roles connect across the business.</div>
            </div>
            <div class="policy-kind">Template</div>
          </div>
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
        <div class="opener-hero" style="background-image: url('img/ch_E_experience.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-3"]}</span>Chapter III</div>
              <div class="opener-eyebrow">The Colleague Lifecycle</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">Leading Through<br/>the Colleague<br/><em style="font-family:'MO Exceptional'; font-weight:400;">Lifecycle</em></h1>
              <p class="opener-sub">How People &amp; Culture drives consistency, care, and compliance across each stage — from attracting talent to leaving with connection.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="editorial-body">
          <p>Our People Philosophy defines who we are. The Colleague Lifecycle shows how we bring that philosophy to life.</p>
          <p>This playbook follows the key touchpoints of the Colleague lifecycle at Mandarin Oriental — from attracting talent and welcoming new Colleagues, to developing capabilities, supporting Colleague wellbeing, and maintaining meaningful connections even after Colleagues move on.</p>
          <p>This section brings together the Group's key People &amp; Culture resources and practices, organised around the Colleague journey. For each stage, you will find the governance, tools and guidance that help P&amp;C leaders support both business priorities and the Colleague experience.</p>
        </div>
      </div>

      <!-- THE WHEEL — anchor menu -->
      <div class="wheel-spread">
        <div class="section-eyebrow" style="max-width: 720px; margin: 0 auto 24px;">
          <span class="num">◈</span>
          <span class="txt">The Colleague Lifecycle · Eight Stages</span>
          <span class="rule"></span>
        </div>
        <p class="spread-lede center" style="max-width: 640px; margin: 0 auto 12px;">Select any stage to explore its governance, tools, and guidance.</p>

        <div class="wheel-wrap">
          ${buildWheelSVG()}
        </div>

        <div class="wheel-legend">
          ${LIFECYCLE.map((s, i) => `
            <button class="wheel-legend-item" data-sub="${s.id}">
              <div class="icon">${ICONS[s.id]}</div>
              <div class="num">${s.letter} · 0${i+1}</div>
              <div class="title">${s.label}</div>
              <div class="desc">${s.lede}</div>
            </button>
          `).join('')}
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
        ${arcs.map(a => `<path class="wheel-slice" d="${a.d}" fill="${a.fill}" stroke="#ffffff" stroke-width="2" data-sub="${a.id}"/>`).join('')}
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
  const c = LIFECYCLE_CONTENT[sub.id];
  return `
    <div class="sub-chapter" id="${sub.id}" style="scroll-margin-top: 90px;">
      <div class="sub-hero" style="margin-top: 24px;">
        <img class="sub-hero-img" src="img/${sub.img}" alt="${sub.label}" />
        <div class="sub-hero-caption">
          <div class="letter">${sub.letter}</div>
          <div class="title-block">
            <div class="eyebrow"><span class="eyebrow-icon">${ICONS[sub.id]}</span>Colleague Lifecycle · Stage ${sub.letter}</div>
            <h2>${sub.label}</h2>
            <div class="sub-lede">${sub.lede}</div>
          </div>
        </div>
      </div>
      <div class="spread tight">
        <div class="philosophy-block">
          <div class="eyebrow">Our Philosophy</div>
          <div class="rule"></div>
          <p>${c ? c.philosophy : sub.lede}</p>
        </div>
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
        <div class="opener-hero" style="background-image: url('img/opener_preopen.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-4"]}</span>Chapter IV</div>
              <div class="opener-eyebrow">Openings</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">Pre-Opening<br/>Hotels</h1>
              <p class="opener-sub">The tools and frameworks that ensure every new property opens with a fully-realised People &amp; Culture foundation.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="spread">
        <div class="philosophy-block">
          <div class="eyebrow">Our Pre-Opening Philosophy</div>
          <div class="rule"></div>
          <p>A hotel opens once. Every hire, contract, and system put in place during the pre-opening period sets the standard for the years that follow. People &amp; Culture is present from the earliest planning stages to ensure the house that opens on day one already feels like Mandarin Oriental.</p>
        </div>
        ${CH4_SECTIONS.map(sectionHTML).join('')}
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
        <div class="opener-hero" style="background-image: url('img/opener_audit.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-5"]}</span>Chapter V</div>
              <div class="opener-eyebrow">Governance</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">P&amp;C<br/>Audit</h1>
              <p class="opener-sub">Self-assessment, governance and escalation frameworks that keep People Operations disciplined at every property.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="spread">
        ${CH5_SECTIONS.map(sectionHTML).join('')}
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
        <div class="opener-hero" style="background-image: url('img/opener_support.jpg');">
          <div class="opener-content">
            <div class="opener-top">
              <div class="opener-numeral"><span class="opener-icon">${ICONS["ch-6"]}</span>Chapter VI</div>
              <div class="opener-eyebrow">Closing</div>
            </div>
            <div class="opener-bottom">
              <h1 class="opener-title">Staying Connected<br/>&amp; Supported</h1>
              <p class="opener-sub">Confidentiality, authorship, and how this Playbook continues to evolve with the Group.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="spread">
        <div class="section-eyebrow"><span class="num">01</span><span class="txt">Confidentiality &amp; Use</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>This Playbook is an internal Mandarin Oriental resource. It is intended for the exclusive use of Colleagues and authorised partners. Its content, tools and templates should not be shared externally without formal approval from Group People &amp; Culture.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">02</span><span class="txt">Authorship &amp; Development</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>The Playbook is developed and maintained by the Group People &amp; Culture team in collaboration with Regional People &amp; Culture leaders and cross-functional partners. It draws on Group policies, guidelines, tools and templates that have been reviewed and endorsed for consistent adoption across the portfolio.</p>
        </div>
      </div>

      <div class="spread tight">
        <div class="section-eyebrow"><span class="num">03</span><span class="txt">Disclaimer</span><span class="rule"></span></div>
        <div class="editorial-body">
          <p>This Playbook offers a Group-level reference framework. It does not replace local labour laws, regulations, or country-specific requirements. Local People &amp; Culture teams remain responsible for ensuring compliance with all applicable legal and regulatory obligations in their markets.</p>
        </div>
        <div class="pullquote">A living framework — evolving as we continue to learn, grow, and serve together.</div>
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
  const chapterCards = CHAPTERS.filter(c => c.id !== 'cover').map(c => `
    <button class="menu-card" data-goto="${c.id}">
      <div class="menu-card-img"><img src="img/${c.opener}" alt="${c.label}" loading="lazy" /></div>
      <div class="menu-card-body">
        <div class="menu-card-eyebrow"><span class="menu-card-icon">${ICONS[c.id]}</span>Chapter ${c.numeral}</div>
        <div class="menu-card-title">${c.label}</div>
        <div class="menu-card-desc">${MENU_DESC[c.id] || ''}</div>
      </div>
    </button>
  `).join('');

  return `
    <section class="chapter" id="menu">
      <div class="spread">
        <div class="spread-header">
          <div class="running-mini">People &amp; Culture Playbook</div>
          <div class="center-rule"></div>
          <h2 class="spread-title center">Contents</h2>
          <p class="spread-lede center">Choose where to begin — every page of the Playbook is one step away.</p>
        </div>
        <div class="menu-grid">${chapterCards}</div>
      </div>
    </section>
  `;
}

function renderAll() {
  const reader = document.getElementById('reader');
  reader.innerHTML = [
    renderCover(),
    renderMenu(),
    renderCh1(),
    renderCh2(),
    renderCh3(),
    renderCh4(),
    renderCh5(),
    renderCh6()
  ].join('');
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

  // hide the floating Contents button while on the menu or cover
  const fab = document.getElementById('menuFab');
  if (fab) fab.classList.toggle('hidden', chapterId === 'menu' || chapterId === 'cover');
}

// ---- Search --------------------------------------------------------
function buildSearchIndex() {
  const idx = [];
  CHAPTERS.forEach(c => {
    if (c.id === 'cover') return;
    idx.push({ chapter: c.id, sub: null, title: `${c.numeral}. ${c.label}`, crumb: 'Chapter', text: c.label });
  });
  LIFECYCLE.forEach(s => {
    idx.push({ chapter: 'ch-3', sub: s.id, title: `${s.letter}. ${s.label}`, crumb: 'Lifecycle', text: s.label + ' ' + s.lede });
    const c = LIFECYCLE_CONTENT[s.id];
    if (c) c.sections.forEach(sec => {
      idx.push({ chapter: 'ch-3', sub: s.id, title: sec.title, crumb: `${s.letter}. ${s.label}`, text: sec.title });
      sec.items.forEach(it => idx.push({
        chapter: 'ch-3', sub: s.id, title: it.name,
        crumb: `${s.letter}. ${s.label} · ${sec.title}`,
        text: it.name + ' ' + symLabel(it.s)
      }));
    });
  });
  CH4_SECTIONS.forEach(sec => {
    idx.push({ chapter: 'ch-4', sub: null, title: sec.title, crumb: 'Pre-Opening', text: sec.title });
    sec.items.forEach(it => idx.push({ chapter: 'ch-4', sub: null, title: it.name, crumb: `Pre-Opening · ${sec.title}`, text: it.name }));
  });
  CH5_SECTIONS.forEach(sec => {
    idx.push({ chapter: 'ch-5', sub: null, title: sec.title, crumb: 'P&C Audit', text: sec.title });
    sec.items.forEach(it => idx.push({ chapter: 'ch-5', sub: null, title: it.name, crumb: `P&C Audit · ${sec.title}`, text: it.name }));
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
  document.getElementById('bookmarkCount').textContent = bookmarks.length;
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
function wireEvents() {
  document.addEventListener('click', e => {
    // wheel slice
    const slice = e.target.closest('.wheel-slice');
    if (slice && slice.dataset.sub) { goTo('ch-3', slice.dataset.sub); return; }
    // wheel legend — on touch devices (no hover), first tap reveals the
    // description; second tap navigates. On hover-capable devices, click
    // navigates directly (description already shows on hover).
    const leg = e.target.closest('.wheel-legend-item');
    if (leg && leg.dataset.sub) {
      const noHover = window.matchMedia('(hover: none)').matches;
      if (noHover && !leg.classList.contains('open')) {
        document.querySelectorAll('.wheel-legend-item.open').forEach(el => el.classList.remove('open'));
        leg.classList.add('open');
        return;
      }
      goTo('ch-3', leg.dataset.sub);
      return;
    }
    // any generic data-goto
    const btn = e.target.closest('[data-goto]');
    if (btn) {
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
