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
