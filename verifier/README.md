# Verifier index (append-only)

## v1 — 2026-08-25
Measures, for the storage/save/load fix round:
1. `node --check` clean on every touched JS file.
2. Playwright stubbed regression (verifier/v1/test_storage.py):
   - Save writes draft to cloud (Supabase REST) not only localStorage; cloud row is the source of truth on load.
   - Second "browser" (fresh context, no localStorage) loads latest cloud draft — cross-browser parity.
   - Expired/absent session surfaces a visible warning instead of silently falling back to local-only.
   - Hub "Open" and "Edit" render identical content for the same playbook.
   - Chapter with string `blurb` no longer throws `sec.blurb.map is not a function`.
3. Language-fix regression (previous round) still passes.

## v2 — 2026-08-25
Adds, on top of v1 (same harness, new file test_storage_v2.py):
4. Author attribution: cloud version.json publishedBy is surfaced in the editor
   load toast; latest version loads regardless of author (rchu then emmawong
   scenario).
5. Signed-in-only acceptance: an UNSIGNED newer local slot no longer wins the
   load — the latest cloud version loads instead (local slot kept, not deleted).
6. Open serves the drafts lane even when its version.json is an autosave copy
   (autosave: true) — Open == latest saved version, published or not.

## v3 — 2026-08-25
Acceptance suite for Clement's three never-again behaviours, run against the
exact tree that is live on GitHub (merged commit a7442a8):
1) Edit always loads the latest cloud version (stale local slot never wins).
2) Latest-saved-regardless-of-author, exercised as a true two-author sequence
   (rchu saves, emmawong saves later, third open gets emmawong's + her name).
3) Open never fails to load: drafts lane newer -> drafts; only published
   exists -> published; drafts probe 404s -> published still loads.
Adds a live-read smoke check against the real Supabase bucket (public GETs the
code paths depend on). Harness identical to v2 (intercepted cloud fixtures).

## v4 — 2026-08-25
Redesign acceptance (visual editor panel + topbar saved-by chip), run against the
redesigned tree: R1 saved-by chip author+relative time; R2 always-visible auth chip
(muted signed-out state); R3 inspector card grouping across chapter/stage/settings
with field-handler write-through intact; R4 zero cloud writes while signed out;
R5 change scope limited to known presentation/storage files (allowlist extended
2026-08-25 to include both mirrored mo-brand.css copies for the ix style fix).
Result: 9/9 PASS. v1 9/9, v2 13/13, v3 11/11 re-run on the same tree — all PASS.

## v5 — 2026-08-25
Interactive elements (s:'ix') style regression gate. Root cause of the "17
Interaction button renders only text" report: pbIxHTML shipped 17 renderers with
no stylesheet. v5 proves: X1 both mirrored mo-brand.css copies carry the ix style
block and stay byte-identical; X2 ix selectors are NOT scoped under .mo-root (no
.mo-root element exists in the DOM — scoped rules silently never match); X3 in the
preview engine, testline / flipcards / processflow get real computed styling
(flex band, card radius, 900px flip perspective, hidden backfaces, pill steps);
X4 the flip toggle rotates the front face away.
Result: 10/10 PASS. v1 9/9, v2 13/13, v3 11/11, v4 9/9 re-run — all PASS.

## v6 — 2026-08-25
Categorical Content Elements picker (flattened interactions). The two-level
"Add interactive" button that hid 17 kinds behind a dropdown is replaced by a
single-level panel: all 35 elements (18 classic + 17 interactive) are one-click
inserts, grouped into five collapsible categories (Text & media / Lists &
checks / Steps, timelines & journeys / Data & dashboards / Cards & explorers).
v6 proves: C1 five category groups with approved labels; C2 35 first-level
buttons, no "Add interactive" junk-drawer; C3 all 17 ix kinds offered directly;
C4 one click inserts kind 'testline' with starter content and the live preview
iframe shows the styled .pb-ixtl band; C5 category headers collapse/expand;
C6 change scope limited to presentation/storage files.
Result: 10/10 PASS. v1–v5 re-run on the same tree — all PASS.
(v6 updated 2026-08-25b: 37 buttons / 18 kinds after the compare + body-text batch.)

## v7 — 2026-08-25
Typography + new-elements batch: F1 ix typography switched from Georgia/system
stand-ins to the embedded MO house fonts (MO Exceptional display, Futura PT,
Avenir Next body — font tokens re-declared globally since mo-brand.css scopes
them under .mo-root, which does not exist in the DOM); F2 adaptive flip-card
grid (lone odd last card spans full width, even counts never stretch); F3 the
18th interaction kind 'compare' (two-tone IS / IS NOT checklist columns, gold
vs terracotta, ✓/✕ marks); F4 the new s:'text' body-text element (paragraphs,
lead styling, **bold** inline) plus weight (400–700) and colour (ink/soft/
muted/gold/sage/terra) brand tokens on text AND heading; F5 mirrored files stay
aligned (mo-brand.css byte-identical, renderer blocks identical across app.js
copies).
Result: 19/19 PASS. v1–v6 re-run on the same tree — all PASS.

## v8 — 2026-08-25
SCORM 1.2 completion end-to-end (test_e2e.py, stubbed LMS API). The model is
view-based: meta.completion picks the mode (open-each-chapter with ticked
requiredChapterIds / open-all / open-n), computeRequiredPages() injects
SCORM_REQUIRED_PAGES into the export, scorm_hook.js marks pages viewed,
persists the viewed set in cmi.suspend_data across relaunches, and on the last
required page reports lesson_status=completed + score 100 + LMSCommit;
LMSFinish on pagehide. v8 proves: C1 init reports incomplete; C2 partial view
does NOT complete, full view completes with score 100 and a commit; C3 the
progress chip tracks viewed/total; C4 relaunch restores completion and the
viewed set from suspend_data; C5 open-n completes after the first N chapters;
C6 a subset of required chapters completes only when the required one opens;
C7 leaving the page calls LMSFinish. 12/12 PASS.
(test_e2e_part2.py is superseded by v9, which covers the same ground with a
correct harness.)
CAVEAT surfaced for authors: 'open-n' means the FIRST N chapters
(chs.slice(0, N)), not any N chapters.

## v9 — 2026-08-25
Full end-to-end QA — saving, storage, loading, playback, mobile (stubbed
Supabase storage + gotrue auth). Q1 Studio boots on the cloud draft; Q2
signed-out Save stays local (fallback .json download, ZERO cloud writes);
Q3 sign-in against gotrue flips the chip; Q4 signed-in Save writes a
versions snapshot + drafts-lane playbook-data + version.json; Q5 edit → save
→ reload round-trips the exact saved body; Q6 the real commercial playbook
JSON import loads with its interactions rendering; Q7 a valid H.264 mp4
becomes playable in the preview engine and a broken video in the player
surfaces the codec hint instead of a black player; Q8 on a 390px touch
viewport the contents overlay opens, chapter taps navigate, a flip card
flips on tap, and there is ZERO horizontal document overflow.
REAL BUG FOUND AND FIXED: the topbar right cluster (language switch injected
by JS + 140px search) blew out the <=900px `1fr auto` grid — 155px of
horizontal overflow at 390px on the commercial playbook. Fix in BOTH mirrored
index.html copies: `minmax(0,1fr) auto` grid, min-width:0 on brand clusters,
shrinkable search and language switch (108px on phones). A Q8d regression
check locks it. Harness fix along the way: the storage stub must unwrap
supabase-js multipart/form-data uploads (file part has filename="blob")
before serving them back, exactly like real storage does.
Result: 17/17 PASS. v1–v8 re-run on the same tree — all PASS
(v4/v6 change-scope allowlists extended to the two index.html copies).

## v10 — 2026-08-25
WYSIWYG click-to-edit (Level 1) for Playbook Studio — authoring-tool/wysiwyg.js,
a Studio-ONLY layer (never loaded by player/SCORM; zero engine changes — W9
asserts the mirrored renderers carry no WYSIWYG code). Click text in the
preview → edit in place → the write goes into the same playbook model the
inspector forms use, via the standard touch() → pushPreview → autosave path.
Scope: section titles + blurbs, item headings, s:'heading', s:'text' (with
<strong>⇄** round-trip), checklist labels, table header/cells, compare column
labels/titles/items. Complex elements keep reader behaviour and get a hover ✎
button that opens the existing form. Guards: DOM→model mapping only binds when
element counts match and section titles line up; fields with [links](…) or
[img]/[vid] figures bail to the form; disabled for non-English preview
languages. W1 attach; W2-W6 per-kind write-throughs; W7 Esc cancels; W8
fallback + flip behaviour intact. 16/16 PASS. v1–v9 re-run — all PASS.

## v11 — ix2: 11 new interaction kinds + glossary + motion layer (2026-08-26)

`v11/test_ix2.py` — run: `python3 v11/test_ix2.py` (repo-root http.server on :8910).

Adds 11 kinds to the ix system (29 total), all living in the same appended
block in BOTH mirrored app.js copies (byte-identical tails asserted):

- Concept animations (play-on-view, replay button): handoff (token between
  role lanes), buildup (parts assemble on a stage), parallel (with/without
  beats in sync), ripple (trigger → consequence rings), journeydot (dot
  travels an SVG path revealing stops).
- Practice interactions: dtree (branching Q&A → outcomes), scenario (story
  beats with right-call choices), hotspot (tap-to-reveal points), stepper
  (prev/next walkthrough), matching (pair terms/definitions), seq (tap steps
  in order, check/reset).
- Glossary inline markup `[g:term|definition]` inside any rich-text field —
  dotted term, tap for popover. WYSIWYG bails to the form on `[g:` fields.
- Motion layer: IntersectionObserver play-once reveals, statband counters,
  gauge needle sweep, chart-bar grow, processflow stagger, cinematic chapter
  opener; `prefers-reduced-motion` lands everything in final state. Re-arms
  after every applyPlaybook.
- Studio: all 11 in IX_KINDS / IX_TEMPLATES / IX_FORMS / IX_ADD_LABELS and a
  new "Animations & practice" category (48 one-click buttons, 6 categories).
- JSON payloads embedded as `<script type="application/json">` with
  `JSON.stringify(...).replace(/</g,'\\u003c')` — script is raw text, esc()
  would corrupt it (v1 pattern). Block-scoped `_ix2JSON` helper (v1's
  `_ixJSON` is scoped to its own wiring block).

X1 render all; X2–X6 animations play; X7–X12 interactions work end to end;
X13 glossary; X14 motion; X15 mobile 390px zero overflow; X16 mirroring;
X17 no Studio-only leak; X18 zero page errors. 21/21 PASS.

Full sweep 2026-08-26: v1 9/9 · v2 13/13 · v3 11/11 · v4 9/9 · v5 10/10 ·
v6 10/10 · v7 19/19 · v8 S1 12/12 + SCORM completion 21/21 · v9 17/17 ·
v10 16/16 · v11 21/21. Stress: v9+v11 re-run twice — all PASS, stable.
(v8 part2 carries 5 pre-existing harness quirks — identical results proven
against the pre-change tree; no page errors anywhere.)

Runs in `runs/2026-08-26-sweep-*.log`, `runs/2026-08-26-stress.log`.

## v12 — WYSIWYG on part/outline chapters (2026-08-26)

`v12/test_wysiwyg_parts.py` — run: `python3 v12/test_wysiwyg_parts.py`
(repo-root http.server on :8910; reads the commercial playbook JSON).

Bug found in the field: on PDF-imported playbooks with a part → section /
topic / sub outline (chapter `subs`, bodies under their own ids in
sectionBodies), the v10 WYSIWYG mapping bailed — chapter body has 0 sections
while the rendered page shows every sub's `.policy-section`, so the flat
count guard rejected the whole chapter (0 editable elements on the
commercial playbook).

Fix (Studio-only, `authoring-tool/wysiwyg.js`): the per-section attach logic
is factored into `attachSectionBlock` / `attachSectionSet`; on part chapters
the chapter's own blocks (not nested in a `.part-*` sub spread) map to the
chapter body, then each sub spread (`div.spread.tight.part-*#subId`) maps to
`bodyForChapter({id: sub.id})`, and the sub eyebrow label is editable in
place (writes `sub.label`, updating the rail). Chapter-level items stop
scanning at the first sub spread. Guards unchanged: count match + title
verification, per sub.

P1 binds on part chapters (453 editable on the commercial playbook) ·
P2 sub section title write-through · P3 sub eyebrow label write-through ·
P4 table cell edit inside a sub · P5 flat chapters unchanged · P6 no page
errors. 6/6 PASS. v10 (16/16) + v9 (17/17) re-run — all PASS.

## v13 — On-preview add-element + tasklist/opener editing
`v13/test_wysiwyg_add_tasklist.py` (port 8910, stubbed Supabase): hover "+"
handles on every item root open the Studio element picker and splice the new
element at that exact position (handles live INSIDE item roots so the
DOM↔model count guards are untouched); tasklist action / note / gate line and
the chapter opener title / sub edit in place; engine + player stay clean.

## v14 — Lifecycle step dock (Concept A)
`v14/test_cycle_dock.py` (port 8910, stubbed Supabase): chapters linked to a
lifecycle wheel via ch.cycle={wid,index} render a persistent mini-ring dock
whose segments are read LIVE from the wheel's stages (rename/reorder/add a
stage and every linked dock follows); dock click jumps to the wheel chapter;
Studio chapter inspector links wheel + step; mirrored files stay identical.

## v14b — Lifecycle dock: sub-level links + scroll-follow
v14 extended (11 checks): part subs can carry cycle={wid,index} too; a part
chapter with linked subs renders ONE fixed dock that follows the scroll and
highlights the step whose sub spread is in view. Studio sub inspector gets
the same link UI. Wheel lookup maps sectionBodies keys back to chapter+sub
so the dock click lands on the wheel even when it lives inside a part.

## v17 — 2026-08-27
On-canvas delete + universal insert handles + heading-button snap:
1. G1 delete-on-empty: clearing a '## ' heading / paragraph on-canvas removes the entry.
2. G2 item roots carry a hover '×' delete handle (confirm, then splice + touch).
3. G3 part sub-topic intro areas carry a '+' insert handle (into the first section's items, created lazily).
4. G4 part-chapter intro carries a '+' insert handle (was non-part only).
5. G5 inspector '＋ Heading' snaps insertion to the end of the current line (never splits mid-word).
6. G6 zero page errors; G7 mirrored-copy consistency.
Run: `python3 v17/test_delete_and_insert.py` (repo-root http.server on :8910).

## v18 — 2026-08-27
Panel 2.0 + drag-to-resize spacing + SCORM desktop/mobile display:
1. H1/H1b chapter inspector tabs (Content/Design/Settings), collapsed numbering & labels group, card routing, active tab persists across re-renders.
2. H2 'Hide panel' toggle (body.panel-hidden).
3. H3 drag grip at an element's top edge sets it.gap and re-renders a .pb-gap wrapper.
4. H4 item form exposes 'Space above this element (px)'.
5. H5/H6 player (= what SCORM serves) renders .pb-gap at desktop 1300px and mobile 390px, scorecard circles stay centred, no horizontal overflow.
6. H7 zero page errors; H8 mirrored-copy consistency.
Note: v17 G5 locator updated to the Panel 2.0 'Intro text' label (same assertion).
Run: `python3 v18/test_panel_and_spacing.py` (repo-root http.server on :8910).

## v19 — 2026-08-28
Panel 2.1 — breadcrumbs, inline sections/elements, panel↔canvas sync, affordances:
1. J1/J1b clickable breadcrumb trail on every drill-down (Chapter › Section › Element); crumb click jumps straight to that level.
2. J2 sections expand inline (accordion) inside the chapter Content tab; the chapter view stays put.
3. J3 simple elements expand inline within the section; ix grids open the focused editor (breadcrumb visible).
4. J4 panel selection flashes the canvas block (.mo-wys-flash), incl. retry after async renders.
5. J5 clicking an element's chrome on the canvas opens its form in the panel.
6. J6 ＋ × ↕ affordances faintly visible without hover (opacity .35).
7. J7 zero page errors; J8 mirrored-copy consistency.
Run: `python3 v19/test_breadcrumbs_inline_sync.py` (repo-root http.server on :8910).
