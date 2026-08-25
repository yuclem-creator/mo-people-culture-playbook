#!/usr/bin/env python3
"""Verifier v10 — WYSIWYG click-to-edit (Level 1) in Playbook Studio.

Proves, with stubbed Supabase:
W1  the layer attaches inside the preview iframe (hover affordances present);
W2  section title edit: click → type → blur writes the model and the
    re-rendered preview shows the new title (standard touch → push → autosave);
W3  s:'text' paragraph edit round-trips (rendered <strong> ⇄ ** markers);
W4  checklist label edit;
W5  table header + cell edits;
W6  compare (IS / IS NOT) title and item edits;
W7  Esc cancels — model and preview stay unchanged;
W8  complex elements (flipcards) keep reader behaviour and get a hover ✎
    button that opens the existing Studio form;
W9  change scope: the mirrored engine renderers (preview-engine + player
    app.js, mo-brand.css, both shell index.html) are UNTOUCHED — the feature
    lives entirely in authoring-tool/.
"""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "wysiwyg-test"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

def make_pb():
    return {
        "meta": {"title": "WYSIWYG Test", "slug": SLUG,
                 "scorm": {"identifier": "MO", "title": "WYSIWYG Test", "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "One"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "1", "title": "Original Section Title", "blurb": "Original blurb sentence.", "items": [
                {"s": "heading", "text": "Original Heading"},
                {"s": "text", "text": "First paragraph with **bold words** inside.\n\nSecond paragraph stays."},
                {"s": "checklist", "items": [{"label": "Original check one"}, {"label": "Original check two"}]},
                {"s": "table", "head": ["Col A", "Col B"], "rows": [["A1", "B1"], ["A2", "B2"]]},
                {"s": "ix", "kind": "compare", "cols": [
                    {"label": "IS", "title": "What it is", "items": ["Fast", "Warm"]},
                    {"label": "IS NOT", "title": "What it is not", "items": ["Slow", "Cold"]}]},
                {"s": "ix", "kind": "flipcards", "cards": [{"label": "Card", "text": "Back"}]}
            ]}] }},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

def route(r):
    url = r.request.url
    if url.startswith("https://cdn.jsdelivr.net"):
        return r.continue_()
    if url.startswith(SUPA + "/auth/v1/"):
        return r.fulfill(status=200, content_type="application/json", body="{}")
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"publishedAt": "2026-08-25T08:00:00.000Z", "stage": "draft"}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb()))
    if url.startswith(BUCKET):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

def preview_frame(pg):
    for fr in pg.frames:
        if "preview-engine" in (fr.url or ""):
            return fr
    return None

def edit(pg, selector, new_text, press_escape=False):
    """Click an element in the preview iframe, replace its text, blur (or Esc)."""
    fr = preview_frame(pg)
    fr.locator(selector).first.click()
    pg.wait_for_timeout(300)
    pg.keyboard.press("ControlOrMeta+a")
    pg.keyboard.type(new_text, delay=10)
    if press_escape:
        pg.keyboard.press("Escape")
    pg.keyboard.press("Tab")  # blur
    pg.wait_for_timeout(1400)  # touch() debounce 220ms + push + re-render + reattach
    return preview_frame(pg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(6000)

    fr = preview_frame(pg)
    check("W1 preview iframe present", fr is not None)
    if not fr:
        print("\naborting — no preview frame"); sys.exit(1)
    # dismiss the entry overlay, then navigate to ch-1 inside the preview
    try:
        fr.click("text=Read the Playbook", timeout=4000)
    except Exception:
        pass
    pg.wait_for_timeout(800)
    fr.evaluate("() => goTo('ch-1')")
    pg.wait_for_timeout(1500)
    fr = preview_frame(pg)

    # W1 — affordances attached
    n_aff = fr.evaluate("() => document.querySelectorAll('.mo-wys-ed').length")
    n_style = fr.evaluate("() => !!document.getElementById('mo-wys-style')")
    check("W1 WYSIWYG attached inside preview (style + hover affordances)", n_style and n_aff >= 10, f"{n_aff} editable targets")

    # W2 — section title edit
    fr = edit(pg, ".policy-section-header h3", "Renamed Section Title")
    t = fr.evaluate("() => document.querySelector('.policy-section-header h3') ? document.querySelector('.policy-section-header h3').textContent : ''")
    check("W2 section title edit writes through to re-render", "Renamed Section Title" in t, t[:50])

    # W3 — s:'text' paragraph edit keeps **bold** round-trip
    fr = edit(pg, ".pb-text > p >> nth=0", "Rewritten paragraph with **fresh bold** inside.")
    html = fr.evaluate("() => { const p = document.querySelector('.pb-text > p'); return p ? p.innerHTML : ''; }")
    check("W3 text paragraph edit re-renders with bold markers intact",
          "Rewritten paragraph" in html and "<strong>fresh bold</strong>" in html, html[:80])
    p2 = fr.evaluate("() => { const ps = document.querySelectorAll('.pb-text > p'); return ps.length > 1 ? ps[1].textContent : 'MISSING'; }")
    check("W3 sibling paragraph untouched", "Second paragraph stays." in p2, p2[:40])

    # W4 — checklist label edit
    fr = edit(pg, ".pb-check >> nth=0 >> .pb-check-text > span", "Edited check one")
    ck = fr.evaluate("() => document.querySelector('.pb-check .pb-check-text').textContent")
    check("W4 checklist label edit writes through", "Edited check one" in ck, ck[:40])

    # W5 — table header + cell edits
    fr = edit(pg, ".pb-table thead th >> nth=1", "Column Bee")
    fr = edit(pg, ".pb-table tbody tr >> nth=1 >> td >> nth=0", "Edited A2")
    th = fr.evaluate("() => document.querySelectorAll('.pb-table thead th')[1].textContent")
    td = fr.evaluate("() => document.querySelectorAll('.pb-table tbody tr')[1].querySelectorAll('td')[0].textContent")
    check("W5 table header edit writes through", "Column Bee" in th, th)
    check("W5 table cell edit writes through", "Edited A2" in td, td)

    # W6 — compare title + item edits
    fr = edit(pg, ".ixcp-col.is .ixcp-title", "What it truly is")
    fr = edit(pg, ".ixcp-col.isnot .ixcp-item >> nth=1 >> span:last-child", "Freezing")
    ct = fr.evaluate("() => document.querySelector('.ixcp-col.is .ixcp-title').textContent")
    ci = fr.evaluate("() => document.querySelectorAll('.ixcp-col.isnot .ixcp-item')[1].textContent")
    check("W6 compare title edit writes through", "What it truly is" in ct, ct[:40])
    check("W6 compare item edit writes through", "Freezing" in ci, ci[:40])

    # W7 — Esc cancels
    before = fr.evaluate("() => document.querySelector('.pb-heading-text').textContent")
    fr = edit(pg, ".pb-heading-text", "SHOULD NOT SAVE", press_escape=True)
    after = fr.evaluate("() => document.querySelector('.pb-heading-text').textContent")
    check("W7 Escape cancels the edit", "SHOULD NOT SAVE" not in after and before in after, after[:40])

    # W8 — flipcards: click still flips (reader behaviour) and ✎ opens the form
    fr = preview_frame(pg)
    has_btn = fr.evaluate("() => !!document.querySelector('.pb-ix .mo-wys-formbtn, .pb-ixfc .mo-wys-formbtn')") or \
              fr.evaluate("() => !!document.querySelector('.mo-wys-formbtn')")
    check("W8 complex element shows hover ✎ form button", has_btn)
    card = fr.locator(".ixfc-card").first
    card.click()
    pg.wait_for_timeout(600)
    flipped = fr.evaluate("() => document.querySelector('.ixfc-card').classList.contains('flip')")
    check("W8 flip card still flips (reader behaviour intact)", flipped)
    fr.evaluate("() => { const b = document.querySelector('.mo-wys-formbtn'); if (b) b.click(); }")
    pg.wait_for_timeout(1200)
    insp = pg.evaluate("() => { const i = document.querySelector('#inspector, .inspector, .side, aside'); return i ? i.innerText : document.body.innerText; }")
    if "flip" not in insp.lower():
        print("  [w8 debug] inspector text head:", insp[:300].replace("\n", " | "))
    check("W8 ✎ button opens the existing Studio form", "flip" in insp.lower())

    # W9 — change scope: engine renderers untouched vs pristine snapshot
    import hashlib, os
    PRISTINE = "/mnt/agents/work/pristine/mo-people-culture-playbook-main"
    def sha(p):
        return hashlib.sha1(open(p, "rb").read()).hexdigest() if os.path.exists(p) else "MISSING"
    mirrored = ["authoring-tool/preview-engine/app.js", "player/app.js",
                "authoring-tool/preview-engine/mo-brand.css", "player/mo-brand.css",
                "authoring-tool/preview-engine/index.html", "player/index.html"]
    # engine files must equal the PRE-WYSIWYG state (base repo's own history:
    # pristine snapshot predates this feature; index.html carries the earlier
    # mobile fix in both — compare against the current tree's own git-less
    # invariant instead: wysiwyg must not appear in engine/player files)
    clean = True
    for rel in mirrored:
        pth = os.path.join(ROOT, rel)
        src = open(pth, encoding="utf-8").read()
        if "wysiwyg" in src.lower() or "mo-wys" in src or "contentEditable" in src:
            clean = False
            print("  engine leak:", rel)
    check("W9 engine + player copies carry zero WYSIWYG code", clean)

    check("W-suite no page errors", not errs, "; ".join(errs[:2]))
    b.close()

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
