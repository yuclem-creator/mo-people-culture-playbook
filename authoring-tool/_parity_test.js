// Render parity test: compares the ORIGINAL public renderer against the
// data-driven preview-engine renderer (seeded from seed-playbook.json).
// Both are loaded into a headless page shell; we snapshot #reader innerHTML
// for every chapter and diff.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function renderWith(page, dir, seedPath) {
  const indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const contentJs = fs.readFileSync(path.join(dir, 'playbook-content.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  // Extract body markup shell from index.html (everything inside <body>).
  const bodyMatch = indexHtml.match(/<body>([\s\S]*?)<\/body>/);
  const body = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/g, '') : '<main class="reader" id="reader"></main><ul id="chapterList"></ul>';
  await page.setContent('<!DOCTYPE html><html><head></head><body>' + body + '</body></html>');
  if (seedPath) {
    const seed = fs.readFileSync(seedPath, 'utf8');
    await page.evaluate((s) => { window.PLAYBOOK = JSON.parse(s); }, seed);
  }
  // Inject as real <script> tags so `const` globals are shared across scripts.
  await page.addScriptTag({ content: contentJs });
  await page.addScriptTag({ content: appJs });
  await page.evaluate(() => { if (typeof init === 'function' && !document.querySelector('#reader section')) init(); });
  const html = await page.evaluate(() => {
    const r = document.getElementById('reader');
    return r ? r.innerHTML : '(no reader)';
  });
  return html;
}

// Normalize: collapse insignificant whitespace between tags and trim text nodes,
// so the diff reflects STRUCTURE + CONTENT + ATTRIBUTES (true visual parity),
// not incidental source indentation.
function norm(html) {
  return html
    .replace(/>\s+</g, '><')      // drop whitespace-only text nodes between tags
    .replace(/\s+/g, ' ')          // collapse runs of whitespace within text
    .trim();
}

(async () => {
  const browser = await chromium.launch();
  const p1 = await browser.newPage();
  const p2 = await browser.newPage();
  const origHtml = await renderWith(p1, path.join(ROOT, 'public'), null);
  const newHtml = await renderWith(p2, path.join(__dirname, 'preview-engine'), path.join(__dirname, 'seed-playbook.json'));
  await browser.close();

  fs.writeFileSync(path.join(__dirname, '_orig_reader.html'), origHtml);
  fs.writeFileSync(path.join(__dirname, '_new_reader.html'), newHtml);
  const a = norm(origHtml), b = norm(newHtml);
  fs.writeFileSync(path.join(__dirname, '_orig_norm.html'), a);
  fs.writeFileSync(path.join(__dirname, '_new_norm.html'), b);
  const rawIdentical = origHtml === newHtml;
  if (a === b) {
    console.log('PARITY (normalized): IDENTICAL ✓  (len ' + a.length + ')  rawIdentical=' + rawIdentical);
  } else {
    console.log('PARITY (normalized): DIFFERENT ✗  orig ' + a.length + ' vs new ' + b.length);
    let i = 0; const n = Math.min(a.length, b.length);
    while (i < n && a[i] === b[i]) i++;
    console.log('First diff at char ' + i);
    console.log('ORIG: ...' + JSON.stringify(a.slice(Math.max(0,i-80), i+160)));
    console.log('NEW : ...' + JSON.stringify(b.slice(Math.max(0,i-80), i+160)));
  }
})();
