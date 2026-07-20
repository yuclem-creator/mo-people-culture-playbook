# Remote SCORM + Supabase Publish — Implementation & QA Report

Date: 2026-07-20
Scope: MO Playbook Studio authoring tool (`authoring-tool/`)
Spec: `REMOTE_SCORM_SPEC.md` (authoritative)

This report is itemized and honest about what was verified end-to-end via
automated browser testing vs. what genuinely requires the user's own live
Supabase login to confirm. Nothing below claims a pass that wasn't actually
observed in this session.

---

## 1. What was built

| Part | File(s) | Status |
| --- | --- | --- |
| Part 1 — Supabase client wiring | `supabase-config.js`, `index.html` (script tag) | Done |
| Part 2 — Login gate (sign in / out, session) | `supabase-config.js` (`SUPABASE.getSession/signIn/signOut/onAuthChange`), `editor.js` (modal), `editor.css` | Done |
| Part 2b — `meta.slug` field | `schema.md`, `editor.js` (Settings panel field + `slugify()`/`slugFor()`) | Done |
| Part 3 — Publish flow | `publish.js` (`PlaybookPublish.publish()` — uploads playbook-data.json + assets + version.json to the `playbook-content` bucket) | Done |
| Part 4 — Remote SCORM export | `export-remote.js` (package builder), `remote-loader.js` (runtime fetch + fallback), `remote-config.js` (generated per-export template) | Done |
| Export UI | `index.html`/`editor.js`/`editor.css` — split button + dropdown: "Export SCORM (offline)" vs "Export SCORM (remote)" | Done |
| Docs | `HOW-TO.md` — new "Publishing & Remote SCORM" section | Done |

No secret/service_role key is referenced anywhere in the client code — only
the anon public key from the spec, used client-side exactly as Supabase
intends. No credentials were guessed, brute-forced, or fabricated.

---

## 2. Real bug found and fixed this session

**Bug:** The remote SCORM package's bundled fallback snapshot (used when the
live network fetch to Supabase fails) rendered a broken UI — hero image and
most chapter images 404'd, showing a gray gradient instead of photography.

**Root cause:** `preview-engine/app.js` hardcodes the literal `img/` and
`video/` path prefixes directly inside ~30 render-template strings (e.g.
`` url('img/${T('cover.bg','cover_colleagues.jpg')}') ``). The playbook JSON
itself only ever stores **bare filenames** (`"cover_hero.jpg"`, not
`"img/cover_hero.jpg"`) — app.js's own templates add the prefix at render
time. The original `export-remote.js` implementation:
1. Wrote the fallback snapshot's decoded images into a flat `fallback-assets/`
   folder inside the zip (stripping the `img/`/`video/` prefix), and
2. Had a `rewriteFallbackAssetPaths()` function that was a no-op passthrough,
   based on an incorrect comment claiming bare `img/xxx` references were
   "already right."

Since app.js's hardcoded templates look for `img/cover_hero.jpg` and
`video/intro.mp4` at runtime regardless of environment, but the files were
physically placed at `fallback-assets/cover_hero.jpg`, every asset 404'd in
the fallback path.

**Fix applied** (`export-remote.js`): the fallback snapshot now ships its
decoded images/video under `img/` and `video/` folders — the exact same
folder names the offline package already uses — instead of a flattened
`fallback-assets/` folder. No changes to `app.js` were needed or made (per
the instruction not to duplicate/break existing architecture); `app.js` is
shared byte-for-byte between the offline and remote packages.
`rewriteFallbackAssetPaths()` is kept as an explicit, well-commented no-op
(correct now, for the correct reason) rather than removed, as a hook point
and to document the actual data flow for future maintainers.

**Fix verified:** re-exported the remote package, unzipped it, confirmed
`img/` and `video/` folders exist with the expected files, served it locally,
and reloaded in a real browser (see §3.4 below) — hero image and all chapter
images now render correctly with zero broken `<img>` tags, and the SCORM
completion flow fires identically to the offline package.

---

## 3. What was verified end-to-end (via Playwright browser automation)

### 3.1 Regression — offline export (must keep working exactly as before)
- Exported "Export SCORM (offline)" **after** the fallback-path fix — package
  structure unchanged (`img/`, `video/`, `playbook-data.js`, standard SCORM
  files), confirming the fix to `export-remote.js` has zero effect on the
  separate offline path in `export.js`. **PASS.**
- Full SCORM 1.2 completion test with a mock LMS API shim on the offline
  package: `LMSInitialize` → `lesson_status=incomplete` → visited all 8
  required pages → `lesson_status=completed`, `score.raw=100`. **PASS.**

### 3.2 Regression — local Save/Open (LocalFileAdapter)
- **Save**: downloads a `.json` containing the full schema including the new
  `meta.slug` field (`"people-culture-playbook"`), confirming the new field
  round-trips through the existing local-file adapter without changes to
  `storage.js`. **PASS.**
- **Open**: re-imported the saved `.json`, confirmed "Playbook opened" toast
  and full content restoration. **PASS.**

### 3.3 Login gate / auth UI
- Clicking **Publish** while signed out opens a login modal styled to match
  the MO quiet-luxury aesthetic. **PASS.**
- Submitting incorrect credentials: Supabase returns HTTP 400; the modal
  shows an inline error ("Invalid login credentials") with no JS exception,
  no `alert()`, no crash. **PASS.**
- No real Supabase account credentials were available or sought (per the
  explicit constraint against guessing/fabricating credentials) — **a
  successful sign-in and an authenticated publish were NOT tested.** This is
  the one part of the feature that genuinely requires the user's own live
  Supabase login. See §4.

### 3.4 Remote SCORM export — fallback path (post-fix)
- Exported "Export SCORM (remote)", unzipped, confirmed correct file layout
  including `img/` and `video/` folders with all expected filenames.
- Served the package locally and loaded it in a real browser with a mock
  SCORM 1.2 LMS API shim. Since nothing had been published to the bucket
  (bucket path doesn't exist yet), the live fetch correctly returned
  HTTP 400/404 and the loader fell back to the bundled snapshot. Console
  showed the expected sequence: a benign fetch-failure warning, then
  `[remote-loader] source: bundled-fallback`, then
  `[remote-loader] source: boot-complete`.
- Screenshotted the cover page and an interior chapter (Chapter II — About
  Mandarin Oriental) — hero photography and board-member portrait render
  correctly, no broken images.
- Walked through all 8 required pages (`cover, intro, ch-1..ch-6`) via
  `window.goTo()`; checked every `<img>` on the page afterwards —
  **zero broken images** (`naturalWidth === 0` count: 0).
- SCORM call log confirmed: `LMSInitialize` → incremental
  `suspend_data` commits as each page is visited → final
  `lesson_status=completed`, `score.raw=100`, `score.min=0`, `score.max=100`,
  final `LMSCommit`. UI showed "✓ PLAYBOOK COMPLETE".
- **PASS** — remote package's fallback path now behaves identically to the
  offline package in every respect checked.

### 3.5 Remote SCORM export — primary/success path (live fetch from bucket)
- **NOT tested end-to-end.** This requires an actual `publish()` call to
  succeed against the real Supabase bucket, which requires a signed-in
  session, which requires real user credentials (unavailable — see §4).
- What **was** independently confirmed instead, earlier in this build
  (via direct `curl` against the Supabase REST/Storage API, not through the
  browser): the project URL and anon key from the spec are reachable; an
  **unauthenticated** upload attempt correctly receives a 403 RLS violation
  (proving the bucket's write-side RLS policy is active and the anon key
  cannot bypass it); a public read of a not-yet-published object path
  returns a clean 404-equivalent response (proving public read access works
  and fails gracefully on missing objects, which is exactly the condition
  the remote-loader's fallback logic is built to handle).
- The remote package's `remote-config.js` was inspected and its `contentUrl`
  confirmed to match the expected bucket path pattern
  (`.../storage/v1/object/public/playbook-content/published/<slug>/playbook-data.json`)
  exactly as the spec describes.

### 3.6 Export menu / Settings UI
- Export SCORM split-button + dropdown shows both "Export SCORM (offline)"
  and "Export SCORM (remote)" with clear descriptive copy and badges
  (SELF-CONTAINED / AUTO-UPDATES). **PASS**, visually consistent with the
  existing design language.
- Settings panel: new "Publish slug" field integrates cleanly among the
  existing SCORM settings fields, with correct helper text
  ("URL-safe id used for the published bucket path. Defaults from the title
  if left blank.") and correct auto-derived default
  (`"people-culture-playbook"` from the title "People & Culture Playbook").
  **PASS.**

### 3.7 Viewport QA — desktop 1300px and mobile 390px
- **Desktop (1300×900):** Export dropdown, login modal, and Settings slug
  field all screenshot cleanly — good spacing, legible type, no overflow or
  clipping. **PASS.**
- **Mobile (390×844):** The login modal itself is fully responsive at this
  width — centered, correctly sized inputs/buttons, no overflow. The Export
  dropdown's default action (offline export) triggers correctly from a
  mobile-width click, with a clean, legible loading toast. The new "Publish
  slug" field in the Settings panel renders consistently with its sibling
  fields.
  - **Caveat found (pre-existing, not introduced by this feature):** the
    authoring tool's **top toolbar** (title bar containing New/Open/
    Save/Export SCORM/Publish) and its **three-column editor layout**
    (Outline / Live preview / Editor) have no responsive breakpoint below
    640px in `editor.css` other than the export-dropdown's own width rule.
    At 390px the toolbar buttons render off-screen to the right (confirmed
    via `getBoundingClientRect()`: Export SCORM button at x≈619,
    Publish button at x≈780, both outside the 390px viewport) and the three
    columns overflow horizontally rather than stacking. This is a
    **pre-existing limitation of the whole authoring shell**, present before
    this feature was added (verified: no relevant CSS ever existed for these
    containers at this breakpoint) — it affects every toolbar button
    (New/Open/Save, not just the new Export/Publish ones) and the entire
    editor layout, not anything specific to the remote-SCORM feature. Fixing
    it would mean redesigning the authoring tool's responsive layout, which
    is out of scope for "implement the remote SCORM + Supabase publish
    feature per spec" and was not requested. Flagging it here for visibility
    rather than silently leaving it undocumented.

---

## 4. What still needs the user's own live login test

**Authenticated publish, end-to-end, has not been verified** because no real
Supabase user credentials exist in this environment and the task instructions
explicitly forbid guessing, brute-forcing, or fabricating credentials. To
close this out, the user should, once, with their own real MO/Supabase
account:

1. Open the authoring tool, click **Publish**, sign in with real credentials.
2. Confirm the modal closes and a success toast appears (publish.js reports
   success only after the `playbook-data.json` + asset uploads to the
   `playbook-content` bucket all resolve).
3. Export **SCORM (remote)**, upload the resulting ZIP to a real or sandbox
   LMS (or just serve it locally), and confirm it now loads content from the
   bucket rather than falling back (console should show
   `[remote-loader] source: live-fetch` — the fallback logic already proven
   working in §3.4 will only be exercised again if the bucket becomes
   unreachable).
4. Edit the playbook, publish again, and reload the already-exported remote
   package to confirm it picks up the new content without re-exporting —
   this is the core value proposition of the remote path and the one
   behavior that fundamentally cannot be verified without a real account.

Everything else in this report — the fallback path, the offline export, local
save/open, the login modal's error handling, the RLS policy's enforcement
(via direct API probing), and all new UI at both viewport sizes — **was**
verified directly in this session.

---

## 5. Files changed/added this session (cumulative across the whole feature)

**Added:**
- `supabase-config.js`
- `publish.js`
- `export-remote.js`
- `remote-loader.js`
- `REMOTE_SCORM_QA_REPORT.md` (this file)

**Modified:**
- `index.html` — Supabase client script tag, login modal markup, export
  dropdown markup
- `editor.js` — login modal logic, publish button wiring, slug field,
  export dropdown wiring
- `editor.css` — login modal, export dropdown, auth chip styles
- `export.js` — exposed `window.__scormExportHelpers` only; original
  `buildScormPackage()` logic unchanged
- `schema.md` — documented `meta.slug`
- `HOW-TO.md` — new "Publishing & Remote SCORM" section

**Not modified:** `preview-engine/app.js`, `storage.js`,
`preview-engine/scorm_api.js` — all left untouched, confirming the feature was
built as an addition on top of the existing architecture rather than a
duplication or rewrite of it.

## 6. Git

- `1959e40` — Parts 1–4 core implementation (config, login gate, publish
  flow, remote export builder, remote-loader runtime).
- `d224c3d` — fallback-asset-path bug fix (§2 above) + HOW-TO.md update.

## 7. Deployment

Deployed via `deploy_website`:
- `project_path`: `/home/user/workspace/mo-playbook/authoring-tool`
- `site_name`: "MO Playbook Authoring Tool"
- `entry_point`: `index.html`
- `should_validate`: `false`
- Result: `status: "uploaded"`, 77 files, `asset_id: 63f9ddfc-a8f6-4cf2-bef8-3e7983a84ddb`
- Permanent URL: `https://www.perplexity.ai/computer/a/mo-playbook-authoring-tool-Y_nd_Kj2TPK..D55g6hN2w`
