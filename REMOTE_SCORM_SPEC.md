# Remote SCORM + Supabase Publish — Build Specification

## Context
Playbook Studio (the authoring tool) lives at `/home/user/workspace/mo-playbook/authoring-tool/`.
Read `schema.md` and skim `editor.js`, `storage.js`, `export.js`, `preview-engine/app.js` before coding.
`storage.js` already defines a clean StorageAdapter interface (`load/save/saveAutosnapshot/
loadAutosnapshot/clearAutosnapshot/exportFile/importFile`) with a `LocalFileAdapter`. Do not break it —
the local save/open flow must keep working exactly as-is.

## Supabase project (already configured by the user — do not change their dashboard settings)
- Project URL: `https://akcypiuealhfqspiwebp.supabase.co`
- anon public key (safe to embed client-side):
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY3lwaXVlYWxoZnFzcGl3ZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTkwMjEsImV4cCI6MjEwMDA3NTAyMX0.lld5gwZd1Bv74ctEguYLpXN6_1QgJ6Uyl1iHtSSTzyk`
- Storage bucket `playbook-content` exists, is set Public (read), and has RLS policies restricting
  INSERT/UPDATE to `authenticated` role only (verified working: unauthenticated upload returns 403 RLS
  violation; public read path returns clean 404 for missing objects, confirming reachability).
- NEVER use or reference the project's secret/service_role key anywwhere in this codebase. Only the
  anon public key above is used, and only client-side (that is its intended, safe use).
- Do not assume a specific user account exists; the user will log in themselves through the UI you build.

## Part 1 — Supabase client + config
Create `authoring-tool/supabase-config.js`:
```js
window.SUPABASE_CONFIG = {
  url: 'https://akcypiuealhfqspiwebp.supabase.co',
  anonKey: '<the anon key above>',
  bucket: 'playbook-content'
};
```
Load the Supabase JS client via CDN in index.html (e.g. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
or esm.sh equivalent — verify it actually loads, don't guess a URL). Initialize a client using
`window.SUPABASE_CONFIG`.

## Part 2 — Login gate for Publish
In the toolbar, add a "Publish" button next to "Export SCORM" (existing buttons: New/Open/Save/Export
SCORM — keep all of those unchanged). Clicking Publish when not logged in shows a small modal: email +
password fields, "Sign in" button, calls `supabase.auth.signInWithPassword({email,password})`. On success,
store the session (supabase-js persists it in localStorage automatically), close modal, proceed to publish.
Show a small "Signed in as <email> · Sign out" indicator somewhere unobtrusive once logged in (e.g. in the
Publish modal or a corner of the toolbar). Handle auth errors (wrong password, no account) with a clear
inline message — do not use browser alert().
On subsequent visits, if a session already exists (supabase.auth.getSession()), skip the login modal.

## Part 3 — Publish flow
"Publish" (once authenticated) uploads the CURRENT in-memory PLAYBOOK project to the bucket at a
per-playbook slug path, e.g.:
```
playbook-content/
  published/<slug>/playbook-data.json     <- { meta, ...all content fields, NO dataURL assets embedded }
  published/<slug>/assets/<hash-or-name>.<ext>   <- decoded binary image/video files (like export.js
                                                     already does for the offline SCORM export — reuse
                                                     that decode logic, do not duplicate/rewrite it)
  published/<slug>/version.json           <- { publishedAt: ISO timestamp, publishedBy: email }
```
`<slug>` = derived from `meta.title` (kebab-case) or an explicit `meta.slug` field if present in the
schema (add one if missing: editable in the Settings panel, default derived from title, must be URL-safe).
Rewrite playbook-data.json's asset references to the PUBLIC bucket URLs
(`{SUPABASE_CONFIG.url}/storage/v1/object/public/playbook-content/published/<slug>/assets/<file>`) so the
remote shell can fetch them directly with no auth.
Use supabase-js storage `.upload(path, blob, { upsert: true })` for each file (upsert so re-publishing the
same playbook overwrites cleanly — this IS the "auto-update" mechanism).
Show upload progress (simple "Publishing… (n/total files)") and a success/failure toast. On failure (e.g.
session expired), surface a clear message and re-prompt login rather than failing silently.

## Part 4 — Remote SCORM export (new export type, separate from the existing offline export)
Existing `export.js` builds a fully bundled, offline SCORM 1.2 zip — KEEP THAT FEATURE UNCHANGED as
"Export SCORM (offline)". Add a second button/option "Export SCORM (remote)" that builds a MUCH smaller
zip:
- `index.html`, the renderer (`app.js`/preview-engine equivalent), `mo-brand.css`, fonts as already used —
  i.e. everything needed to RENDER, but with NO bundled playbook-data.js and NO bundled img/video (except
  the fallback copy, see below).
- `scorm_api.js`, `scorm_hook.js`, `imsmanifest.xml`, XSDs — reused exactly as in the offline export.
- A new `remote-config.js`: `window.REMOTE_CONFIG = { contentUrl: '<public bucket URL to
  published/<slug>/playbook-data.json>', slug: '<slug>' }`.
- A new small runtime loader script (e.g. `remote-loader.js`), loaded before the renderer boots, that:
  1. Fetches `REMOTE_CONFIG.contentUrl` (cache-busted, e.g. append `?t=Date.now()`), with a reasonable
     timeout (~8s).
  2. On success: sets `window.PLAYBOOK = <fetched JSON>`, caches it into `localStorage` (namespaced by
     slug) as the new "last known good", then proceeds to boot the renderer.
  3. On failure/timeout/CORS/offline: falls back to (a) the localStorage last-known-good copy if present,
     else (b) a BUNDLED fallback snapshot shipped inside the zip itself (`fallback-playbook-data.js`,
     generated at export time from the CURRENT project state, plus a `fallback-assets/` folder of decoded
     images) — so the course still fully works even if the LMS network blocks the external Supabase call
     or the learner is offline. Log which path was used to the console for diagnosability, and surface a
     tiny unobtrusive note in the UI only when running on the fallback (e.g. a small "showing last saved
     version" corner note) — must not block interaction or look broken.
  4. Completion rules (`meta.completion`) must also come from the fetched/fallback PLAYBOOK, not be
     hardcoded in the shell, so changing which chapters count doesn't require re-uploading to the LMS.
     Wire this into scorm_api.js's REQUIRED_PAGES via whatever override mechanism already exists (check
     scorm_build/scorm_api.js from the earlier work — it may already support an override; extend minimally
     if not, keeping backward compatibility with the existing offline export path).
This export is triggered from the same "Export SCORM" button area — present both offline and remote as
clearly labeled options (e.g. a small dropdown/segmented control), with a one-line explanation of the
difference (offline = self-contained snapshot; remote = auto-updates after you Publish, needs the LMS to
allow reaching Supabase, always has an offline-safe fallback).

## Part 5 — QA (do all of this, fix issues before finishing)
1. Unauthenticated Publish click -> login modal appears; wrong password shows inline error, not a crash.
2. After a successful sign-in (ask the user to test this part live if you cannot obtain valid test
   credentials yourself — do NOT attempt to guess/brute-force a password or use the secret key to create
   one; if you cannot complete a real end-to-end authenticated publish, clearly say so in your final report
   rather than fabricating a pass), Publish uploads files; verify via a plain `fetch()` to the resulting
   public URL that `playbook-data.json` and at least one asset are now retrievable anonymously.
3. Remote SCORM export: build the zip, unzip it, serve locally, load with a mock LMS API AND a live fetch
   to the real published contentUrl (if publish succeeded) — confirm content renders and completion works
   exactly like the offline package (open all required chapters -> completed/score 100; partial -> stays
   incomplete).
4. Simulate the offline-fallback path deliberately (e.g. point contentUrl at a 404 or block the request)
   and confirm the bundled fallback renders correctly with no console errors and completion still works.
5. Confirm the EXISTING offline "Export SCORM" button/flow still works unmodified (regression check).
6. Confirm the existing local Save/Open project flow (storage.js LocalFileAdapter) is untouched and still
   works (regression check).
7. Desktop 1300px + mobile 390px, no overflow, in both the editor and the exported remote package.

## Deliverables
- All new files under `authoring-tool/` (supabase-config.js, publish.js or extend editor.js, remote-loader
  script bundled by export.js, updated HOW-TO.md section documenting Publish + Remote SCORM + the fallback
  behavior + how to rotate keys/rotate the anon key if ever needed).
- Update HOW-TO.md: add "Publishing & Remote SCORM" section covering login, Publish, the two export types,
  and what happens if the LMS network blocks Supabase (fallback explanation, non-alarming tone).
- Do NOT commit any secret/service_role key anywhere. Only the anon key belongs in the code.
- Commit to git incrementally with clear messages.
- Redeploy via `deploy_website` at the end (project_path `/home/user/workspace/mo-playbook/authoring-tool`,
  site_name "MO Playbook Authoring Tool", entry_point index.html, should_validate false) and report the
  URL/asset_id, plus a clear, honest summary of what was verified end-to-end vs. what still needs the
  user's own live login test.
