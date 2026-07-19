// Builds seed-playbook.json:
//   structured data  ← _raw_data.json (extracted verbatim from originals)
//   content data     ← LIFECYCLE_CONTENT / CH4_CONTENT / CH5_CONTENT globals
//   prose defaults   ← harvested by running the refactored renderer with
//                       PLAYBOOK.__harvest=true (T() records every fallback)
//   meta / completion / assets ← authored here
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '_raw_data.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const dir = path.join(__dirname, 'preview-engine');
  const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const contentJs = fs.readFileSync(path.join(dir, 'playbook-content.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  const bodyMatch = indexHtml.match(/<body>([\s\S]*?)<\/body>/);
  const body = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/g, '') : '<main class="reader" id="reader"></main><ul id="chapterList"></ul>';
  await page.setContent('<!DOCTYPE html><html><head></head><body>' + body + '</body></html>');

  // Turn on harvest BEFORE app.js runs. Inject as real <script> tags so that
  // `const` declarations live in shared page script scope (as in the browser).
  await page.evaluate(() => { window.PLAYBOOK = { __harvest: true, prose: {} }; });
  await page.addScriptTag({ content: contentJs });
  await page.addScriptTag({ content: appJs });
  const harvested = await page.evaluate(() => {
    if (typeof init === 'function') init();
    return {
      prose: window.PLAYBOOK.prose,
      menuDesc: (typeof MENU_DESC_DEFAULT !== 'undefined') ? MENU_DESC_DEFAULT : null,
      lifecycleContent: (typeof LIFECYCLE_CONTENT !== 'undefined') ? LIFECYCLE_CONTENT : null,
      ch4: (typeof CH4_CONTENT !== 'undefined') ? CH4_CONTENT : null,
      ch5: (typeof CH5_CONTENT !== 'undefined') ? CH5_CONTENT : null
    };
  });

  await browser.close();

  const seed = {
    meta: {
      title: 'People & Culture Playbook',
      wordmark: 'Mandarin Oriental',
      edition: 'Edition · July 2026',
      scorm: { identifier: 'MO_PC_PLAYBOOK_MANIFEST', title: 'MO People & Culture Playbook', masteryScore: 100 },
      completion: { mode: 'open-each-chapter', requiredChapterIds: ['cover','intro','ch-1','ch-2','ch-3','ch-4','ch-5','ch-6'] }
    },
    chapters: raw.CHAPTERS,
    lifecycle: raw.LIFECYCLE,
    journey: raw.JOURNEY,
    seniorMgmt: raw.SENIOR_MGMT,
    pcLeaders: raw.PC_LEADERS,
    beliefs: raw.BELIEFS,
    menuDesc: harvested.menuDesc || undefined,
    lifecycleContent: harvested.lifecycleContent,
    ch4: harvested.ch4,
    ch5: harvested.ch5,
    prose: harvested.prose,
    assets: {}
  };

  fs.writeFileSync(path.join(__dirname, 'seed-playbook.json'), JSON.stringify(seed, null, 2));
  console.log('Wrote seed-playbook.json');
  console.log('prose keys harvested: ' + Object.keys(harvested.prose).length);
  console.log('lifecycleContent keys: ' + (harvested.lifecycleContent ? Object.keys(harvested.lifecycleContent).length : 'null'));
  console.log('ch4 sections: ' + (harvested.ch4 ? harvested.ch4.sections.length : 'null'));
  console.log('ch5 sections: ' + (harvested.ch5 ? harvested.ch5.sections.length : 'null'));
})();
