// Load the content data constants and the app.js data constants by eval,
// then emit them as JSON for the seed builder.
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'preview-engine');
const contentSrc = fs.readFileSync(path.join(base, 'playbook-content.js'), 'utf8');

// playbook-content.js defines: const LIFECYCLE_CONTENT, CH4_CONTENT, CH5_CONTENT
const sandbox = {};
const runner = new Function(contentSrc + '\n;return {LIFECYCLE_CONTENT, CH4_CONTENT, CH5_CONTENT};');
const content = runner();

// Now app.js data constants. app.js references CH4_CONTENT etc from global scope,
// and defines its own const CHAPTERS, LIFECYCLE, JOURNEY, SENIOR_MGMT, PC_LEADERS, BELIEFS.
// We only need the pure-data arrays; extract them by evaluating just the top portion.
const appSrc = fs.readFileSync(path.join(base, 'app.js'), 'utf8');
// Grab from start up to the line "/* ====...RENDERING" — but simplest: run the whole
// data section. We stop before functions that reference DOM. The data consts we want
// all appear before line ~550 (BELIEFS ends). We'll eval a slice.
// Find markers.
const idxBeliefsEnd = appSrc.indexOf('function beliefsTabsHTML');
const dataSlice = appSrc.slice(0, idxBeliefsEnd);
// dataSlice defines icon(), ICONS, etc + CHAPTERS, LIFECYCLE, JOURNEY, SENIOR_MGMT, PC_LEADERS, BELIEFS
// It also references CH4_CONTENT/CH5_CONTENT at the CH4_SECTIONS lines. Provide them.
const dataRunner = new Function('CH4_CONTENT', 'CH5_CONTENT',
  dataSlice + '\n;return {CHAPTERS, LIFECYCLE, JOURNEY, SENIOR_MGMT, PC_LEADERS, BELIEFS};');
const appData = dataRunner(content.CH4_CONTENT, content.CH5_CONTENT);

const out = {
  CHAPTERS: appData.CHAPTERS,
  LIFECYCLE: appData.LIFECYCLE,
  JOURNEY: appData.JOURNEY,
  SENIOR_MGMT: appData.SENIOR_MGMT,
  PC_LEADERS: appData.PC_LEADERS,
  BELIEFS: appData.BELIEFS,
  LIFECYCLE_CONTENT: content.LIFECYCLE_CONTENT,
  CH4_CONTENT: content.CH4_CONTENT,
  CH5_CONTENT: content.CH5_CONTENT
};
fs.writeFileSync(path.join(__dirname, '_raw_data.json'), JSON.stringify(out, null, 2));
console.log('OK wrote _raw_data.json');
console.log('CHAPTERS', out.CHAPTERS.length, 'LIFECYCLE', out.LIFECYCLE.length,
  'JOURNEY', out.JOURNEY.length, 'SM', out.SENIOR_MGMT.length, 'PC', out.PC_LEADERS.length,
  'BELIEFS', out.BELIEFS.length, 'LC keys', Object.keys(out.LIFECYCLE_CONTENT).length,
  'CH4 sec', out.CH4_CONTENT.sections.length, 'CH5 sec', out.CH5_CONTENT.sections.length);
