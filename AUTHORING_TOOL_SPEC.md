# MO Playbook Authoring Tool — Build Specification

## Goal
A visual, browser-based frontend authoring tool that lets a non-technical MO user (Clement, a designer)
edit the existing "MO People & Culture Playbook" interactive magazine, and create NEW playbooks in the
same format, then export a self-contained SCORM 1.2 package. Backend storage will be wired later — for now,
projects save/load as local `.json` project files (with images embedded/bundled).

## Where things live
- Existing playbook (the reference implementation & seed content):
  `/home/user/workspace/mo-playbook/public/` — `app.js` (renderer + data constants), `playbook-content.js`
  (LIFECYCLE_CONTENT + CH4_SECTIONS + CH5_SECTIONS), `index.html` (all CSS in inline `<style>`),
  `mo-brand.css` (fonts), `img/`, `video/`.
- Existing SCORM plumbing to reuse VERBATIM:
  `/home/user/workspace/mo-playbook/scorm_build/scorm_api.js`, `scorm_hook.js`, `imsmanifest.xml`,
  and the four XSDs (adlcp_rootv1p2.xsd, ims_xml.xsd, imscp_rootv1p1p2.xsd, imsmd_rootv1p2p1.xsd).
- Build the NEW tool under: `/home/user/workspace/mo-playbook/authoring-tool/`

## CRITICAL CONSTRAINTS (do not violate)
1. **Do NOT alter the visual design** of the rendered magazine. The editor edits CONTENT (text, images,
   ordering, add/remove of repeatable items) WITHIN the existing fixed layouts. It must NOT try to
   redesign the bespoke set-pieces (vision globe, audit orbit, lifecycle wheel, beliefs tabs, milestone
   timelines, strategic-vision spreads). Their CONTENT (text/images) is editable; their FORM is fixed.
2. **MO aesthetic** preserved exactly: 'MO Exceptional' headers, 'Avenir Next LT Pro' body; gold hairlines;
   CSS vars already defined in index.html (--gold #B59060 etc.). Reuse the existing CSS unchanged.
3. **SCORM export must be fully self-contained & offline** — images/videos bundled in the zip, no network
   calls at runtime. Reuse scorm_api.js / scorm_hook.js. imsmanifest.xml identifier & title configurable.
4. The tool itself is a separate app; it does not need SCORM plumbing to run — only its EXPORT produces it.

## ARCHITECTURE (the key idea: make the renderer data-driven)
The current `app.js` hardcodes content in constants (CHAPTERS, LIFECYCLE, JOURNEY, SENIOR_MGMT, PC_LEADERS,
BELIEFS, plus LIFECYCLE_CONTENT/CH4_SECTIONS/CH5_SECTIONS in playbook-content.js) and per-chapter render
functions (renderCh1..renderCh6, renderCover, renderIntro, renderLetter, etc.).

Refactor so ALL of that editable content is read from a single `PLAYBOOK` JSON object. Concretely:

### Step A — Create the schema + seed data
Create `authoring-tool/schema.md` documenting the PLAYBOOK JSON shape, and
`authoring-tool/seed-playbook.json` = the CURRENT P&C playbook fully extracted into that shape.
The schema must capture EVERY editable field currently in app.js + playbook-content.js. Minimum shape:

```
{
  "meta": {
    "title": "The People & Culture Playbook",
    "wordmark": "Mandarin Oriental",
    "edition": "Edition · July 2026",
    "scorm": { "identifier": "MO_PC_PLAYBOOK_MANIFEST", "title": "MO People & Culture Playbook",
               "masteryScore": 100 },
    "completion": { "mode": "open-each-chapter", "requiredChapterIds": ["cover","intro","ch-1","ch-2","ch-3","ch-4","ch-5","ch-6"] }
  },
  "cover": { "eyebrow": "...", "titleHtml": "People &amp; Culture<br/><em>Playbook</em>",
             "sub": "...", "ctaLabel": "Explore", "bg": "img/cover_colleagues.jpg" },
  "intro": { "eyebrow":"A Message to Colleagues", "isVideo": true, "video":"video/intro.mp4",
             "poster":"img/cpo_portrait.jpg", ... the letter fields ... },
  "chapters": [
    { "id":"ch-1","numeral":"I","label":"Introduction","opener":"img/opener_intro.jpg","type":"ch1",
      ...all editable text blocks used by renderCh1... },
    ... ch-2 (about, senior mgmt array, pc leaders array, vision, beliefs), 
    ch-3 (lifecycle: subs[] each -> LIFECYCLE_CONTENT), ch-4, ch-5, ch-6 ...
  ],
  "lifecycle": [ {id,letter,label,img,lede, content:{tagline,intro[],sections[...]}} , ...8 subs ],
  "journey": [ {stage,img,icon,pos,role}, ...5 ],
  "seniorMgmt": [ {name,role,img}, ... ],
  "pcLeaders": [ {name,role,img}, ... ],
  "assets": { "img/...": "<dataURL or relative path>" }   // media registry
}
```
Extract faithfully — every string currently rendered must appear in seed-playbook.json so the data-driven
render is byte-identical to today's output. VERIFY by diffing rendered HTML (see QA).

### Step B — Refactor renderer to read PLAYBOOK
Copy public/* into authoring-tool/preview-engine/. Replace the hardcoded constants with references into a
global `PLAYBOOK` object (loaded from seed-playbook.json or the editor's live state). Keep every render
function's OUTPUT identical. The render functions stay; only their DATA SOURCE changes.
Keep goTo(chapterId, subId) intact (top-level chapterId used for SCORM completion).

### Step C — The Editor UI (`authoring-tool/index.html` + editor.js + editor.css)
Layout: left = project/outline tree; center = LIVE preview (the actual rendered magazine in an iframe or
mounted div); right = contextual inspector for the selected element.

Editing capabilities (template-scoped):
- **Inline text editing**: click any editable text in the preview -> becomes editable (contenteditable
  or inspector field). Support the fields that allow bold/italic (titleHtml, blurbs). Write back to PLAYBOOK.
- **Image replace**: click any image -> upload from computer -> stored as dataURL in PLAYBOOK.assets and
  referenced. Show current image + "Replace" + alt/caption where applicable.
- **Reorder**: drag to reorder repeatable lists — chapters, lifecycle subs, sections within a sub,
  policy items within a section, journey stages, seniorMgmt, pcLeaders. Use SortableJS (CDN) or HTML5 DnD.
- **Add / remove**: add or delete chapters (from a small set of supported chapter TYPES), lifecycle subs,
  sections, policy items, people, journey stages. New items start from a template clone.
- **Links**: edit policy item URLs (they point to SharePoint) via inspector.
- Everything auto-updates the live preview.

Chapter TYPES: expose the existing chapter archetypes as reusable types so NEW playbooks can pick from:
  `cover`, `intro-video`, `letter`, `standard` (prose + optional editorial band), `lifecycle` (subs with
  policy sections), `directory` (people grids), `sections-list` (like ch-4/ch-5 policy lists).
Advanced set-pieces (globe, orbit, wheel, beliefs tabs) are attached to specific existing chapters; keep
them available when duplicating the seed playbook, but the "new blank playbook" flow only needs the
simpler types above. Document this clearly in the how-to.

### Step D — Completion rules UI (per playbook)
Inspector panel "Completion & SCORM": choose completion mode:
  - `open-each-chapter` (default) with a checklist of which top-level chapters count (auto-listed from
    PLAYBOOK.chapters). This maps to scorm_api.js REQUIRED_PAGES.
  - `open-all` (all chapters required)
  - `open-n` (require any N chapters)
Also edit SCORM manifest title/identifier and mastery score here.
On export, generate scorm_api.js REQUIRED_PAGES from this config (or inject a config object the existing
scorm_api.js reads — cleaner: add `window.SCORM_REQUIRED_PAGES` support so we don't rewrite the file logic).

### Step E — Project save / load (backend-ready)
Create a thin storage abstraction `authoring-tool/storage.js` with an interface:
  `Storage.saveProject(project) / loadProject() / listProjects()`.
Default implementation = LocalFile adapter: "Save Project" downloads `<slug>.playbook.json` (with images
as dataURLs embedded, so it's one portable file); "Open Project" reads a .json from disk. Also keep an
autosave copy in localStorage. Structure the adapter so a Supabase/Azure adapter can be dropped in later
(document the interface in schema.md / how-to). DO NOT integrate any cloud SDK now.

### Step F — SCORM export (client-side zip)
Use JSZip (CDN) to build the zip IN THE BROWSER:
  - index.html (from preview-engine, with the data-driven renderer)
  - a generated `playbook-data.js` that sets `window.PLAYBOOK = {...}` (the current project, with asset
    paths rewritten to bundled files, NOT dataURLs — decode dataURLs back to binary files in img/)
  - app.js (data-driven renderer), mo-brand.css, playbook-content-runtime if needed
  - scorm_api.js (reused; add REQUIRED_PAGES override support), scorm_hook.js (reused)
  - imsmanifest.xml (title/identifier from meta.scorm), the 4 XSDs
  - img/*, video/* (decoded from assets)
Produce a downloadable `<slug>-scorm12.zip`. Manifest & structure must match the existing working package
(imsmanifest.xml at zip ROOT). Reuse the existing imsmanifest.xml as a template, substituting title/id.

## QA (must do before declaring done)
1. Data-driven render parity: render seed-playbook.json through the refactored engine and confirm all 8
   chapters + 8 lifecycle subs render with no console errors, no missing text/images. Spot-check that the
   3 previously-deleted quotes stay gone and the gold Explore button (moved-up, solid) is present.
2. Editor smoke test (Playwright): load seed, edit a heading, replace an image, reorder two policy items,
   add a policy item, delete one, change completion to open-all — confirm preview updates & no errors.
3. Export a SCORM zip; unzip; serve locally; inject a mock LMS API; open all required chapters; confirm
   lesson_status -> completed, score 100, progress chip works. Confirm partial (skip one) stays incomplete.
4. Desktop 1300px AND mobile 390px: no horizontal overflow in preview or exported package.
5. Save project -> reload tool -> open project -> identical state.

## Deliverables
- `authoring-tool/` complete app, runnable by opening index.html (served via http).
- `authoring-tool/HOW-TO.md` — plain-language guide for Clement: editing, images, reordering, new
  playbook, completion rules, SCORM export, saving/opening projects, and a "Connecting a backend later"
  section (Supabase step-by-step + Azure notes, referencing storage.js interface).
- Deploy the tool via deploy_website for a live preview.

## Style / tone
MO restraint. The EDITOR chrome (panels, buttons) should be clean and neutral (light UI, thin rules,
gold accents ok) — NOT competing with the magazine preview. Keep it obvious and beginner-friendly with
clear labels and tooltips.
