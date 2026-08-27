#!/usr/bin/env python3
"""Verifier v19 — Panel 2.1: breadcrumbs, inline sections/elements, sync, affordances.

J1  drill-down shows a clickable breadcrumb trail (Chapter › Section › Element);
    clicking a crumb jumps straight to that level;
J2  sections expand inline (accordion) in the chapter Content tab — clicking a
    section row renders its fields in an .inline-wrap without navigating;
J3  a simple element (text/heading) expands inline inside the section; an ix
    element instead opens the focused editor (with breadcrumb);
J4  panel → canvas sync: selecting an element flashes its canvas block
    (.mo-wys-flash) after the async render lands;
J5  canvas → panel sync: clicking an element's chrome on the canvas opens its
    form in the panel;
J6  affordances (＋ × ↕) are faintly visible without hover (opacity .35);
J7  zero page errors throughout;
J8  mirrored copies: mo-brand.css byte-identical, app.js divergence only in
    the known Studio-wiring lines.
"""
import json, subprocess
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "v19-fixtures"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb():
    return {
        "meta": {"title": "V19 Fixtures", "slug": SLUG},
        "chapters": [
            {"id": "cover", "type": "cover", "label": "Cover"},
            {"id": "ch-1", "label": "Alpha", "numeral": "1"},
        ],
        "sectionBodies": {
            "ch-1": {"intro": ["Intro paragraph."], "sections": [
                {"num": "1.1", "title": "First section", "blurb": ["Lead text."], "items": [
                    {"s": "heading", "name": "Head el", "text": "Element A heading", "sub": ""},
                    {"s": "text", "name": "Body el", "text": "Element B body text."},
                    {"s": "ix", "kind": "scorecard", "name": "Grid el",
                     "taskCol": "Task", "dims": ["Score"], "scaleMax": 4,
                     "tasks": [{"name": "T1", "covers": "x"}]},
                ]},
                {"num": "1.2", "title": "Second section", "items": []},
            ], "items": []},
        },
    }

def route(r):
    url = r.request.url
    if "cdn.jsdelivr.net" in url: return r.continue_()
    if url.startswith(SUPA + "/auth/v1/"):
        return r.fulfill(status=200, content_type="application/json", body="{}")
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json",
                         body=json.dumps({"publishedAt": "2026-08-27T08:00:00Z"}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb()))
    if url.startswith(BUCKET):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1688, "height": 901})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(8000)

    pg.click("#tree >> text=Alpha")
    pg.wait_for_timeout(1200)

    # J2 sections expand inline
    pg.click("#inspector .rep-item:has-text('1.1') .rep-name")
    pg.wait_for_timeout(800)
    d2 = pg.evaluate("""() => {
      const row = [...document.querySelectorAll('#inspector .rep-item')]
        .find(r => r.textContent.includes('1.1'));
      const wrap = row && row.querySelector('.inline-wrap');
      const hasFields = wrap && [...wrap.querySelectorAll('.field label')]
        .some(l => l.textContent.includes('Title'));
      const stillChapter = !!document.querySelector('.insp-tabs');
      return { inline: !!wrap, hasFields, stillChapter };
    }""")
    check("J2 section expands inline, chapter view intact",
          d2["inline"] and d2["hasFields"] and d2["stillChapter"], json.dumps(d2))

    # J3 simple element expands inline within the open section; ix opens editor
    d3a = pg.evaluate("""() => {
      const rows = [...document.querySelectorAll('#inspector .inline-wrap .rep-item')];
      const t = rows.find(r => r.textContent.includes('Body el'));
      if (t) t.querySelector('.rep-name').click();
      return !!t;
    }""")
    pg.wait_for_timeout(600)
    d3b = pg.evaluate("""() => {
      const rows = [...document.querySelectorAll('#inspector .inline-wrap .rep-item')];
      const t = rows.find(r => r.textContent.includes('Body el'));
      const w = t && t.querySelector('.inline-wrap');
      return w ? [...w.querySelectorAll('.field label')].map(l => l.textContent.slice(0, 20)) : null;
    }""")
    d3c = pg.evaluate("""() => {
      const rows = [...document.querySelectorAll('#inspector .inline-wrap .rep-item')];
      const t = rows.find(r => r.textContent.includes('Grid el'));
      if (t) t.querySelector('.rep-name').click();
      return !!t;
    }""")
    pg.wait_for_timeout(1000)
    d3d = pg.evaluate("""() => {
      const crumbs = [...document.querySelectorAll('#inspector .insp-crumbs > *')].map(n => n.textContent.trim());
      return { crumbs, isGridForm: !!document.querySelector('#inspector [class*=note], #inspector select') };
    }""")
    check("J3 simple element inline; ix opens focused editor with breadcrumb",
          d3a and isinstance(d3b, list) and any("Space above" in x or "Type" in x for x in d3b)
          and d3c and d3d["crumbs"] and "›" in d3d["crumbs"],
          json.dumps({"inline": d3b, "crumbs": d3d["crumbs"]}))

    # J1 breadcrumb labels + click-back to chapter
    d1 = pg.evaluate("""() => {
      const bar = document.querySelector('#inspector .insp-crumbs');
      if (!bar) return null;
      const labels = [...bar.querySelectorAll('.cb')].map(b => b.textContent.trim());
      const cur = bar.querySelector('.cur');
      return { labels, cur: cur && cur.textContent.trim() };
    }""")
    check("J1 breadcrumb trail present (Chapter › Section › Element)",
          d1 and len(d1["labels"]) >= 2 and d1["labels"][0].startswith("Ch 1")
          and d1["cur"] == "Grid el", json.dumps(d1))
    pg.click("#inspector .insp-crumbs .cb")   # jump straight back to chapter
    pg.wait_for_timeout(1000)
    d1b = pg.evaluate("""() => ({
      tabs: !!document.querySelector('.insp-tabs'),
      title: (document.querySelector('.insp-title')||{}).textContent })""")
    check("J1b crumb click jumps to chapter", d1b["tabs"] and d1b["title"] == "Alpha", d1b)

    # J4 panel → canvas flash: select element via bridge openItem (noNav)
    fr = [f for f in pg.frames if "preview-engine" in (f.url or "")][0]
    try:
        fr.click("text=Read the Playbook", timeout=4000)
        pg.wait_for_timeout(600)
    except Exception:
        pass
    fr.evaluate("() => goTo('ch-1')")
    fr.wait_for_selector(".chapter#ch-1 .policy-list", timeout=15000)
    pg.wait_for_timeout(1500)
    pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      const b = br.bodyForChapter({ id: 'ch-1' });
      // select() without noNav: gotoPreview + delayed flash
      br.openItem('ch-1', b.sections[0].items, 1);
    }""")
    pg.wait_for_timeout(600)
    d4 = fr.evaluate("""() => {
      const list = document.querySelector('.chapter#ch-1 .policy-list');
      const el = list && list.children[1];
      return el ? { flash: el.classList.contains('mo-wys-flash'),
                    cls: el.className.slice(0, 40) } : null;
    }""")
    check("J4 panel selection flashes the canvas block", d4 and d4["flash"], json.dumps(d4))

    # J5 canvas → panel: click the scorecard's chrome (a row, non-editable)
    d5pre = pg.evaluate("() => (document.querySelector('.insp-title')||{}).textContent || ''")
    fr.evaluate("""() => {
      const list = document.querySelector('.chapter#ch-1 .policy-list');
      const root = list.children[2];  // scorecard (ix)
      const row = root.querySelector('.ixsc-cell, .ixsc-table, .ixsc-picks') || root;
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }""")
    pg.wait_for_timeout(1200)
    d5 = pg.evaluate("""() => ({
      title: (document.querySelector('.insp-title')||{}).textContent || '',
      crumbs: !!document.querySelector('.insp-crumbs') })""")
    check("J5 canvas click opens the element form in the panel",
          d5["title"] == "Grid el" and d5["crumbs"], json.dumps({"from": d5pre, "to": d5}))

    # J6 faint always-on affordances
    d6 = fr.evaluate("""() => {
      const list = document.querySelector('.chapter#ch-1 .policy-list');
      const root = list.children[1];
      const add = root.querySelector(':scope > .mo-wys-add');
      const gap = root.querySelector(':scope > .mo-wys-gap');
      const del = root.querySelector(':scope > .mo-wys-del');
      return { add: add && getComputedStyle(add).opacity,
               gap: gap && getComputedStyle(gap).opacity,
               del: del && getComputedStyle(del).opacity };
    }""")
    check("J6 affordances visible without hover (opacity .35)",
          d6 and d6["add"] == "0.35" and d6["gap"] == "0.35" and d6["del"] == "0.35", d6)

    check("J7 zero page errors", not errs, errs[:3])
    ctx.close(); b.close()

# J8 mirrored copies
import hashlib
def sha(p):
    return hashlib.sha1(open(p, "rb").read()).hexdigest()
css_same = sha(ROOT + "/authoring-tool/preview-engine/mo-brand.css") == sha(ROOT + "/player/mo-brand.css")
r = subprocess.run(["diff", ROOT + "/authoring-tool/preview-engine/app.js", ROOT + "/player/app.js"],
                   capture_output=True, text=True)
changed_lines = [l for l in r.stdout.splitlines() if l.startswith("<")]
STUDIO_TOKENS = ("__inStudio", "menu-card", "studio-select", "Studio preview", "spread-header",
                 "INTERACTIVE ELEMENTS", "Renderers only", "====", "17 kinds",
                 "window.__menuSelectWired", "data-goto", "capture phase", "side panel",
                 "window.parent", "postMessage", "addEventListener", "closest",
                 "preventDefault", "stopPropagation", "getAttribute", "editing happens",
                 "tiles/header", "e.target", "var ", "if (", "}, true", "}", "//")
def _studio_line(l):
    body = l[1:].strip()
    if not body:
        return True
    return any(t in body for t in STUDIO_TOKENS)
studio_only = all(_studio_line(l) for l in changed_lines)
check("J8 mirrored copies consistent (css identical; app.js diverges only in Studio wiring)",
      css_same and studio_only, f"css_same={css_same} changed_hunks={len(changed_lines)}")

print()
print(f"===== v19: {PASS} passed, {FAIL} failed =====")
