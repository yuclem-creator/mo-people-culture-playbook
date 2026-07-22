# MO People & Culture Interactive Playbook — Full Project Export

Mandarin Oriental Hotel Group — interactive, magazine-style People & Culture
playbook, plus the custom **Playbook Studio** authoring tool used to build and
publish it. Exported as a self-contained project for continued development in
Replit, Kimi, or any Node-capable environment.

## What's in this package

| Folder / File | What it is |
|---|---|
| `public/` | The **live playbook viewer** (what colleagues read). Static HTML/CSS/JS + all branding assets (`mo-brand.css`, `img/`, `video/`). Served by `server.js`. |
| `authoring-tool/` | **Playbook Studio** — the no-code editor used to write/restyle the playbook, manage chapters, and Publish updates. Pure static site (HTML/CSS/JS, no build step). |
| `authoring-tool/preview-engine/` | Mirrors the SCORM runtime so the in-editor "Preview" looks exactly like the real LMS/SCORM output, including MO brand CSS and imagery. |
| `scorm_build/` | The exported offline **SCORM 1.2** package contents (self-contained, works with no internet/Supabase connection). |
| `MO_People_Culture_Playbook_SCORM.zip` | Pre-built SCORM 1.2 package ready to upload to an LMS as-is. |
| `AUTHORING_TOOL_SPEC.md` | Product/technical spec for Playbook Studio. |
| `REMOTE_SCORM_SPEC.md` | Design for the **Remote SCORM** package — a thin SCORM shell that fetches live content from Supabase at runtime (so republishing updates already-deployed SCORM packages without re-uploading to the LMS), with an offline fallback bundled in. |
| `authoring-tool/HOW-TO.md` | End-user guide for Playbook Studio: editing, Save/Export, Sign in, Publish, Remote SCORM export. |
| `authoring-tool/REMOTE_SCORM_QA_REPORT.md` | QA notes on the Remote SCORM implementation. |
| `server.js` / `package.json` | Minimal Express static server for `public/`. Works on Replit out of the box — click Run. |

## Quick start

```bash
npm install
npm start
# serves the playbook viewer at http://localhost:5000 (and :3000 in dev)
```

To work on **Playbook Studio** itself, serve `authoring-tool/` as static files
(it has no backend/build step) — e.g. `npx serve authoring-tool` — or open
`authoring-tool/index.html` with any static file server. Do not open it via
`file://` directly; Supabase auth requires a real HTTP origin.

## Publishing & Remote SCORM (Supabase)

Playbook Studio's **Publish** button uploads the current playbook (content +
assets) to a Supabase Storage bucket, so an already-deployed **Remote SCORM**
package can fetch the latest content live without re-exporting/re-uploading
to the LMS. Config lives in `authoring-tool/supabase-config.js`:

- Project: **MO Digital Learning** (`https://akcypiuealhfqspiwebp.supabase.co`)
- Bucket: `playbook-content` (public read, RLS-protected writes)
- Client key in code: `sb_publishable_h1lL2W5wJt3DOz2nr4IoAQ_20TPGTtF` — this
  is the **browser-safe publishable/anon key**, safe to ship in client code.

**Security — read before touching Supabase settings:** Never put a
`service_role` / `secret` key (anything prefixed `sb_secret_...`) in this
codebase or any client-side file, ever. Only the publishable/anon key belongs
here. Data protection comes entirely from Supabase Row Level Security (RLS)
policies on `storage.objects`, not from hiding the anon key.

Current RLS policies on `storage.objects` for bucket `playbook-content`
(set up directly in the Supabase SQL Editor, not in this repo):
- `INSERT` — authenticated users, `bucket_id = 'playbook-content'`
- `UPDATE` — authenticated users, **both** `USING` and `WITH CHECK` set to
  `bucket_id = 'playbook-content'` (an UPDATE policy needs an explicit
  `USING` clause — without it, Postgres blocks all updates even though
  `WITH CHECK` looks fine, which was the root cause of a hard-to-diagnose
  "row-level security policy" publish failure)
- `DELETE` — authenticated users, `bucket_id = 'playbook-content'`
  (Supabase Storage's upsert can replace-not-just-update existing rows)
- `SELECT` — authenticated users, `bucket_id = 'playbook-content'`
  (required so upsert can check whether a row already exists)

If Publish ever starts failing with an RLS error again, re-check these four
policies exist with exactly this shape before assuming it's a code bug.

## Branding & content assets

All MO branding collateral used by the live build is included in-place,
already wired into the pages that use it — nothing external to fetch:
- `public/mo-brand.css` / `authoring-tool/preview-engine/mo-brand.css` / `scorm_build/mo-brand.css` — MO brand styles (typography, color, quiet-luxury editorial treatment)
- `public/img/`, `authoring-tool/preview-engine/img/`, `scorm_build/img/` — chapter openers, portraits, heritage photography, MO fan mark (`mo_fan.svg`)
- `public/video/`, `authoring-tool/preview-engine/video/`, `scorm_build/video/` — intro video
- `authoring-tool/seed-playbook.json` — the full current playbook content/copy in the Studio's native JSON schema (also what Publish uploads as `playbook-data.json`)

## Continuing development

This zip has no `.git` history (kept clean for import). Run `git init` if you
want version control again. No `node_modules/` is included — run
`npm install` after import.
