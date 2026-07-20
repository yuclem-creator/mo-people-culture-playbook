# PLAYBOOK Schema

This document describes the shape of the single global object, `window.PLAYBOOK`,
that drives the Mandarin Oriental interactive-magazine renderer. The authoring
tool edits this object; the renderer (`preview-engine/app.js`) reads from it.

Everything a non-developer can change lives in `PLAYBOOK`. The renderer supplies
the fixed magazine **form** (layout, CSS, set-piece geometry); `PLAYBOOK`
supplies the **content**. The seed file `seed-playbook.json` is a complete
`PLAYBOOK` for the current P&C Playbook and is the canonical example.

> **Parity guarantee.** The renderer was refactored to read from `PLAYBOOK`
> without changing a single pixel of output. Any key that is missing from
> `PLAYBOOK` falls back to the original verbatim value baked into `app.js`, so a
> partial `PLAYBOOK` still renders correctly. `seed-playbook.json` contains the
> full set of defaults so nothing is left implicit.

---

## Top-level shape

```jsonc
{
  "meta":        { ... },   // title, wordmark, edition, SCORM + completion settings
  "chapters":    [ ... ],   // ordered chapter/TOC definitions
  "lifecycle":   [ ... ],   // the 8 Colleague-Lifecycle sub-chapters (Chapter III)
  "journey":     [ ... ],   // the 5 "Colleague Journey" stages (Chapter I set-piece)
  "seniorMgmt":  [ ... ],   // Senior Management people grid (Chapter II)
  "pcLeaders":   [ ... ],   // VP & Regional P&C leaders grid (Chapter II)
  "beliefs":     [ ... ],   // Vision / Mission / Values tabbed set-piece (Chapter II)
  "menuDesc":    { ... },   // one-line descriptions on the Contents cards
  "lifecycleContent": { ... }, // policy content for each lifecycle sub-chapter
  "ch4":         { ... },   // Pre-Opening chapter content (intro/philosophy/sections)
  "ch5":         { ... },   // P&C Audit chapter content (intro/sections)
  "prose":       { ... },   // flat map of editable one-off strings (see "Prose keys")
  "assets":      { ... }    // optional: "img/foo.jpg" -> dataURL, for uploaded images
}
```

---

## `meta`

```jsonc
{
  "title":   "People & Culture Playbook",   // internal name
  "wordmark":"Mandarin Oriental",           // cover wordmark (also editable via prose "cover.wordmark")
  "edition": "Edition · July 2026",
  "slug": "pc-playbook",  // optional; URL-safe id for Publish/Remote SCORM. Defaults
                          // to a kebab-case slug of `title` if omitted (see Settings panel).
  "scorm": {
    "identifier":   "MO_PC_PLAYBOOK_MANIFEST", // written into imsmanifest.xml on export
    "title":        "MO People & Culture Playbook", // manifest <title>
    "masteryScore": 100
  },
  "completion": {
    "mode": "open-each-chapter",  // "open-each-chapter" | "open-all" | "open-n"
    "requiredChapterIds": ["cover","intro","ch-1","ch-2","ch-3","ch-4","ch-5","ch-6"],
    "n": 6                        // only used when mode === "open-n"
  }
}
```

**Completion modes** (used to generate `window.SCORM_REQUIRED_PAGES` on export):
- `open-each-chapter` (default) — learner must open every id in `requiredChapterIds`.
- `open-all` — same, but the list is auto-set to all real chapters (cover…ch-6).
- `open-n` — learner must open at least `n` of the chapters. On export this is
  approximated for SCORM 1.2 by requiring the first `n` chapters (the LMS marks
  complete once `n` are viewed).

`scorm_api.js` reads `window.SCORM_REQUIRED_PAGES` if present, else uses its
built-in full-chapter default — so the file itself is never rewritten.

---

## `chapters[]`

Ordered list; controls the rail, the Contents grid, chapter numerals, and openers.

```jsonc
{
  "id":      "ch-1",              // stable id; also the SCORM completion page id
  "numeral": "I",                // Roman numeral shown in chrome ("" for cover/intro)
  "label":   "Introduction",     // rail + card + nav title
  "opener":  "opener_intro.jpg", // hero image filename (under img/)
  "isVideo": true,               // (intro only) marks the welcome-film card
  "hasSubs": true                // (ch-3 only) renders the lifecycle wheel + subs
}
```

Editing chapter body content is done through the chapter-specific structures
(`lifecycleContent`, `ch4`, `ch5`) and the `prose` keys (openers, headings,
paragraphs). See **Prose keys**.

---

## `lifecycle[]` — Chapter III sub-chapters (8)

```jsonc
{
  "id":    "sub-A",                        // stable id (sub-A … sub-H)
  "letter":"A",                            // wheel + hero letter
  "label": "Leading with Integrity",       // title
  "img":   "ch_A_integrity.jpg",           // hero image filename
  "lede":  "Ethical Conduct and Fair …"    // one-line summary (wheel caption + hero)
}
```

The wheel geometry, colours and the center disc are fixed FORM in `buildWheelSVG()`.
Only the eight labels/letters/ledes are content.

---

## `journey[]` — Chapter I "Colleague Journey" (5 stages)

```jsonc
{
  "stage": "Attract",
  "img":   "journey_attract.jpg",
  "icon":  "sub-B",          // references a lifecycle icon by id
  "pos":   "34% 32%",        // CSS background-position for the stage image
  "role":  "People &amp; Culture shapes …"  // may contain inline HTML entities
}
```

## `seniorMgmt[]` and `pcLeaders[]` — people grids

```jsonc
{ "name": "Laurent Kleitman", "role": "Group Chief Executive", "img": "sm_laurent.jpg" }
```

## `beliefs[]` — Vision / Mission / Values tabs (Chapter II set-piece)

```jsonc
{
  "key":      "vision",                       // vision | mission | values
  "tab":      "Our Vision",                   // tab button label
  "eyebrow":  "A Meaningful Vision",
  "statement":"Be <em>Fans</em> of the <em>Exceptional</em> …", // inline HTML allowed
  "items": [
    { "icon": "wellbeing", "label": "Fans", "text": "We are passionate beyond our duty" }
  ]
}
```

The tab/panel layout is fixed FORM; the statement, eyebrow and the icon-led item
list are content. `icon` values map to the renderer's built-in icon set.

## `menuDesc` — Contents-card descriptions

```jsonc
{ "ch-1": "Our purpose, who this Playbook is for, and how to use it.", ... }
```

---

## `lifecycleContent` — policy content per lifecycle sub-chapter

Keyed by lifecycle id (`sub-A` … `sub-H`). Each value:

```jsonc
{
  "tagline": "The non-negotiables that guide how we work …",  // optional hero override
  "intro":   [ "paragraph…", "paragraph…" ],                   // optional intro paras
  "sections": [ Section, Section, … ]
}
```

### `Section`

```jsonc
{
  "num":   "1",
  "title": "Ethical Conduct & Integrity",
  "blurb": "optional lead sentence for the section",
  "splitAfter": 1,                       // optional: layout hint (items before a break)
  "transition": "optional linking sentence rendered after the items",
  "highlights_eyebrow": "What Integrity Protects",  // optional highlight-grid heading
  "highlights": [                                    // optional highlight grid
    { "icon": "ethics", "label": "Professionalism", "text": "…" }
  ],
  "items": [ Item, Item, … ]             // the policy/resource rows
}
```

### `Item` (a policy / guideline / toolkit / cross-reference row)

```jsonc
{
  "s":     "policy",      // symbol: policy | guide | kit | xref
  "name":  "Code of Conduct & Ethics",
  "blurb": "Sets the Group standard for integrity …",   // optional
  "url":   "https://…"                                    // optional link (edit in inspector)
}
```

## `ch4` — Pre-Opening Hotels

```jsonc
{
  "tagline": "…",                       // optional
  "philosophy": { "title": "…", "paras": [ "…", "…" ] },
  "sections": [ Section, … ]            // same Section shape as above
}
```

## `ch5` — P&C Audit

```jsonc
{
  "intro":    [ "…", "…" ],
  "sections": [ Section, … ]
}
```

---

## `prose` — editable one-off strings

A **flat map** of `key → string` (or, for a few keys, `key → string[]`). Every
piece of standalone copy inside the fixed magazine templates — cover text, intro
text, the CPO letter, chapter openers, section eyebrows/headings, narrative
paragraphs, pull-quotes, symbol legends, wheel captions, the closing legal text,
etc. — is addressed by a stable dotted key and read through the renderer's
`T(key, fallback)` helper.

Naming convention:
- `cover.*`, `intro.*`, `letter.*`, `menu.*` — front-matter blocks.
  (`letter.body` is a **string array** — one entry per paragraph.)
- `ch1.*` … `ch6.*` — per-chapter. Within a chapter:
  - `chN.opener.{bg,eyebrow,title,sub}` — the hero opener.
  - `chN.sNN.*` — a numbered section (eyebrow/heading, paragraphs `p1`,`p2`…,
    image `img`, caption `cap`, pull-`quote`, etc.).
  - `chN.band.*`, `chN.journey.*`, `chN.wheel.*` — named set-pieces in that chapter.

Values may contain safe inline HTML (`<em>`, `<strong>`, `<br/>`, `<a href>`)
and HTML entities (`&amp;`, `&middot;`, `&mdash;`) exactly as the original design
used them. The editor edits these in place.

If a `prose` key is **omitted**, the renderer uses the verbatim original string,
so the playbook always renders. `seed-playbook.json` ships with all ~150 keys
populated so authors see and can edit every string.

---

## `assets` — uploaded images (optional)

A map of virtual path → data URL:

```jsonc
{ "img/cover_colleagues.jpg": "data:image/jpeg;base64,…" }
```

When an author replaces an image via upload, the new image is stored here as a
data URL and the corresponding `img/...` filename is pointed at it. On **SCORM
export** the tool decodes each data URL back into a real binary file inside the
package's `img/` folder and rewrites references to plain relative paths — so the
exported course is fully self-contained and makes no network calls. Images that
were never replaced are copied from the original `img/` folder.

---

## Fixed-form set-pieces (content baked in the renderer)

A few bespoke set-pieces keep their content in `app.js` because their copy is
tightly coupled to fixed SVG geometry: the **audit orbit** benefit ring, the
**vision globe** cities/routes/goals, and the three hard-coded paragraphs of the
**strategic-vision spread**. Their visual form — and their text — is preserved
exactly. These are intentionally not exposed as free-text fields in the first
version of the editor (editing them risks breaking the geometry); everything
else on those spreads (section headings, surrounding paragraphs) is editable via
`prose`. See `HOW-TO.md` → "What you can and can't edit".
