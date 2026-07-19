# MO Playbook Studio — How-To Guide

Playbook Studio is a visual tool for editing the Mandarin Oriental interactive-
magazine playbook and exporting it as a SCORM course for your LMS. You edit
**content** — text, images, lists, links — while the elegant magazine design
stays fixed. No coding required.

---

## The screen at a glance

The tool has three columns:

| Column | What it is | What you do there |
| --- | --- | --- |
| **Left — Outline** | The list of chapters (and lifecycle stages) | Click a chapter to edit it. Click **Settings** for completion rules and SCORM. |
| **Centre — Live preview** | The real magazine, exactly as learners see it | Watch your edits appear instantly. Toggle **Desktop / Mobile** to check both. |
| **Right — Editor** | The form for whatever you selected | Type new text, upload images, reorder or add items, set links. |

The top bar has: the **playbook name**, an **autosave** indicator, and the
**New / Open / Save / Export SCORM** buttons.

---

## Editing content

1. **Click a chapter** in the left outline. The right panel fills with its
   editable fields.
2. **Change text** by typing in a box. The preview updates as you type.
   - Some boxes say *“HTML allowed”*. There you may use simple tags like
     `<em>italic</em>` or `<br/>` for a line break, matching the original style.
     If you are unsure, just type plain text.
3. **Replace an image**: find the image field, click **Upload…**, choose a file.
   The new picture appears immediately and travels with your playbook.
4. **Lists** (policies, people, lifecycle stages, sections):
   - **Reorder** — drag the `⋮⋮` handle up or down.
   - **Add** — click the dashed **＋ Add…** button.
   - **Remove** — click the **✕** on the row.
   - **Open** — click **Edit ›** to edit a row’s details (or click the row to
     expand it in place, for shorter items).
5. **Links**: open a policy/resource item and paste a URL into **Link (URL)**.
   It opens in a new tab for the learner.

Your work **autosaves** to this browser continuously (the dot turns green). To
keep a permanent, shareable copy, use **Save** (below).

---

## Saving and opening

- **Save** downloads a single `.json` file that contains everything — all text
  **and** any images you uploaded (embedded inside the file). Keep this file as
  your master copy; email it, store it on SharePoint, or hand it to a colleague.
- **Open** loads a `.json` file back into the tool so you can keep editing.
- Because everything is in one file, there are no loose images to lose.

> Tip: after a big editing session, click **Save** and store the dated `.json`
> somewhere safe. That is your backup.

---

## Starting a new playbook

Click **New**, then choose:

- **Duplicate the P&C seed** — a full copy of the current People & Culture
  playbook. Best when you want something similar and will edit from there.
- **Blank playbook** — pick which chapter *types* to include (Cover, Welcome
  film, Foreword, Standard chapter, Lifecycle, People directory, Sections list)
  and build up from empty templates.

> **Note on blank playbooks.** The magazine renderer was designed around the
> P&C playbook’s fixed chapter structure. A brand-new blank playbook is best
> treated as a *starting point for content*; for a production course we
> recommend **Duplicate the P&C seed** and then editing, which preserves every
> set-piece perfectly. See “What you can and can’t edit”.

---

## Completion rules & SCORM

Open **Settings** (top of the outline). There you set:

- **General** — playbook title, cover wordmark, edition line.
- **SCORM package** — the manifest identifier, the course title your LMS shows,
  and the mastery score.
- **Completion rule** — how the LMS decides the learner is “complete”:
  - **Open each required chapter** — tick exactly which chapters must be opened.
  - **Open all chapters** — every chapter must be opened.
  - **Open at least N chapters** — a minimum number.
- **SCORM manifest inspector** — a live summary of what will be written into the
  package (identifier, title, launch file, required pages). It updates as you
  change the rule above.

---

## Exporting a SCORM course

Click **Export SCORM**. The tool builds a **SCORM 1.2** ZIP and downloads it.
The package is **fully self-contained and works offline**:

- All images and video are bundled as real files (uploaded images are decoded
  back to real files automatically — nothing stays as a data URL).
- There are **no internet calls** at runtime.
- The `imsmanifest.xml` is at the ZIP root, with your title, identifier and
  mastery score filled in.
- Your completion rule is written into `window.SCORM_REQUIRED_PAGES`, which the
  bundled `scorm_api.js` reads — so completion behaves exactly as you set it.

**Upload the ZIP** directly to your LMS (SCORM Cloud, Cornerstone, SuccessFactors,
Moodle, etc.). The LMS records **completed** with a score of the mastery value
once the learner has opened the required chapters, and **incomplete** before then.

---

## What you can and can’t edit

**You can edit:** all chapter titles and descriptions; cover, foreword, intro
and closing text; every section heading, paragraph, quote and caption; policy /
resource items and their links; lifecycle stage labels and summaries; the people
directories; the Vision / Mission / Values statements and items; and every image.

**You can’t change (by design):** the magazine’s visual design, layout, fonts,
colours, or the *shape* of the bespoke set-pieces (the lifecycle wheel, the
audit orbit, the vision globe, the beliefs tabs, the timelines). Their **form**
is fixed so the playbook always looks on-brand — you edit the **content** inside
them. A few deeply-geometry-bound bits of copy (the globe’s city list, the
orbit’s benefit ring, and the three fixed paragraphs of the strategic-vision
spread) are kept in the design itself and are not exposed as free-text fields,
to protect the layout.

---

## Troubleshooting

- **My edit didn’t appear** — click elsewhere to commit the field, or wait a
  moment; the preview refreshes a fraction of a second after you stop typing.
- **I lost my work** — reopen the tool; it restores your last autosaved state.
  For older versions, **Open** the `.json` you saved.
- **The export is large** — that’s normal; it contains all the high-resolution
  photography. LMSs handle this fine.

---

## Connecting a backend later

Out of the box, Playbook Studio saves to **your browser** (autosave) and to
**`.json` files** you download. This needs no server and no accounts. When
you’re ready for a shared, always-on store (multiple editors, versioning, a
central library), you can add a backend **without changing the editor** — all
persistence goes through one small file: **`storage.js`**.

`storage.js` defines a `StorageAdapter` interface and ships one implementation,
`LocalFileAdapter`. The editor only ever calls `PlaybookStorage.adapter`. To go
to a backend, write a new adapter with the same methods and assign it:

```js
PlaybookStorage.adapter = new SupabaseAdapter(/* ... */);
```

The methods an adapter must provide (all return Promises):

| Method | Purpose |
| --- | --- |
| `load()` | return the current playbook (or `null`) |
| `save(playbook)` | persist the current playbook |
| `saveAutosnapshot(pb)` / `loadAutosnapshot()` / `clearAutosnapshot()` | cheap, frequent backups |
| `exportFile(pb, name)` | let the user download a `.json` |
| `importFile()` | let the user open a `.json` |

### Option A — Supabase (recommended, step by step)

Supabase gives you a Postgres table + file storage + auth with very little code.

1. **Create a project** at supabase.com. Note your **Project URL** and
   **anon public key** (Project Settings → API).
2. **Create a table** `playbooks`:
   ```sql
   create table playbooks (
     id uuid primary key default gen_random_uuid(),
     title text,
     data jsonb not null,          -- the whole PLAYBOOK object
     updated_at timestamptz default now()
   );
   ```
   (Large images live inside `data.assets` as data URLs. If you prefer, store
   images in a Supabase **Storage bucket** instead and keep only paths in
   `data.assets` — see step 5.)
3. **Add the client library** to `index.html`, before `storage.js`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
4. **Write the adapter** (e.g. `storage-supabase.js`), then load it after
   `storage.js` and set it as the active adapter:
   ```js
   function SupabaseAdapter(url, key, rowId) {
     this.db = supabase.createClient(url, key);
     this.rowId = rowId;               // which playbook row this editor edits
   }
   SupabaseAdapter.prototype.load = function () {
     return this.db.from('playbooks').select('data').eq('id', this.rowId)
       .single().then(function (r) { return r.data ? r.data.data : null; });
   };
   SupabaseAdapter.prototype.save = function (pb) {
     return this.db.from('playbooks')
       .upsert({ id: this.rowId, title: pb.meta && pb.meta.title, data: pb, updated_at: new Date() });
   };
   // Autosnapshot can reuse localStorage (fast) or a second row/column.
   SupabaseAdapter.prototype.saveAutosnapshot = function (pb) {
     try { localStorage.setItem('mo_pb_autosnap', JSON.stringify({ at: Date.now(), playbook: pb })); } catch (e) {}
     return Promise.resolve();
   };
   SupabaseAdapter.prototype.loadAutosnapshot = function () {
     try { var r = localStorage.getItem('mo_pb_autosnap'); return Promise.resolve(r ? JSON.parse(r) : null); }
     catch (e) { return Promise.resolve(null); }
   };
   SupabaseAdapter.prototype.clearAutosnapshot = function () { localStorage.removeItem('mo_pb_autosnap'); return Promise.resolve(); };
   // Keep the local file import/export for portability:
   SupabaseAdapter.prototype.exportFile = PlaybookStorage.LocalFileAdapter.prototype.exportFile;
   SupabaseAdapter.prototype.importFile = PlaybookStorage.LocalFileAdapter.prototype.importFile;

   PlaybookStorage.adapter = new SupabaseAdapter('https://YOURPROJECT.supabase.co', 'YOUR_ANON_KEY', 'YOUR_ROW_ID');
   ```
5. **(Optional) Images in a Storage bucket.** Create a public bucket
   `playbook-assets`. When the author uploads an image, upload the file to the
   bucket and store the returned public URL as the value in `PLAYBOOK.assets`
   (instead of a data URL). The renderer already resolves `assets` entries, and
   the SCORM exporter already turns non-data-URL asset values into bundled files.
6. **Turn on Row-Level Security** and add a policy so only signed-in P&C editors
   can read/write. Supabase Auth (magic link or SSO) drops into the same client.

### Option B — Azure (notes)

If Mandarin Oriental standardises on Azure, the same adapter pattern applies:

- **Azure Blob Storage** for the playbook JSON and images. Create a container,
  and have the adapter’s `load`/`save` read/write a blob (e.g. `playbook.json`)
  using the Azure Storage JS SDK or a small **Azure Function** HTTP API in front
  of it (recommended, so keys never reach the browser). Uploaded images become
  blobs; store their URLs in `PLAYBOOK.assets` exactly as in Supabase Option A.
- **Azure Functions / App Service** for a thin API: `GET /playbook/{id}` →
  returns JSON; `PUT /playbook/{id}` → saves JSON. Your adapter’s `load`/`save`
  just `fetch()` those endpoints.
- **Microsoft Entra ID (Azure AD)** for sign-in, so only authorised colleagues
  can edit — acquire a token and send it as a `Bearer` header from the adapter.
- **SharePoint alternative** — because P&C resources already live in SharePoint,
  you could instead store the playbook JSON in a SharePoint document library via
  the Microsoft Graph API; the adapter methods map to Graph `GET`/`PUT` of the
  file’s content.

In every case you change **only `storage.js`** (or add a sibling adapter file
and one assignment line). The editor, the renderer, and the SCORM export are
untouched.
