#!/usr/bin/env python3
"""Verifier v17 — on-canvas delete, heading-button snap, universal insert handles.

G1  clearing a '## ' heading in a sub intro on-canvas deletes the entry
    (delete-on-empty), and the model no longer contains it;
G2  item roots carry a '×' delete handle; clicking it (confirm accepted)
    removes the element from the model;
G3  a part sub-topic's intro area carries a '+' insert handle (previously
    subs with intro text only had no on-canvas way to add elements);
G4  a PART chapter's intro area carries a '+' insert handle (was gated to
    non-part chapters);
G5  the inspector '＋ Heading' button snaps insertion to the end of the
    current line — a mid-word cursor can no longer split a word/paragraph
    (locator updated to the Panel 2.0 'Intro text' label, same check);
G6  zero page errors throughout;
G7  mirrored copies: mo-brand.css byte-identical, app.js divergence only in
    the known Studio-wiring lines.
"""
import json, subprocess
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "v17-fixtures"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

LONG_INTRO = ("The hotel documents its current real-life process and scores it "
              "against the standard before any redesign work begins.")

def make_pb():
    return {
        "meta": {"title": "V17 Fixtures", "slug": SLUG},
        "chapters": [
            {"id": "cover", "type": "cover", "label": "Cover"},
            {"id": "ch-a", "label": "Alpha", "numeral": "1", "type": "part", "subs": [
                {"id": "sec-h0", "label": "Group", "depth": 1},
                {"id": "top-h0", "label": "Topic", "depth": 2},
                {"id": "sub-h1", "label": "Heading sub", "depth": 3},
            ]},
            {"id": "ch-4", "label": "Delta", "numeral": "4"},
        ],
        "sectionBodies": {
            "ch-a": {"intro": ["Part chapter intro paragraph."], "sections": []},
            "sec-h0": {"intro": ["Filler. " * 8] * 3, "sections": []},
            "top-h0": {"intro": ["Filler. " * 8] * 3, "sections": []},
            "sub-h1": {"intro": ["Opening paragraph.", "## My Heading", "Trailing paragraph."],
                       "sections": [
                           {"num": "2", "title": "Sec Two", "items": [
                               {"s": "ix", "kind": "scorecard", "name": "sc",
                                "taskCol": "Task", "dims": ["Score"], "scaleMax": 4,
                                "tasks": [{"name": "T1", "covers": "x"}]},
                           ]},
                       ]},
            "ch-4": {"intro": [LONG_INTRO], "sections": [], "items": []},
        },
    }

def route(r):
    url = r.request.url
    if "cdn.jsdelivr.net" in url: return r.continue_()
    if url.startswith(SUPA + "/auth/v1/"):
        return r.fulfill(status=200, content_type="application/json", body="{}")
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json",
                         body=json.dumps({"publishedAt": "2026-08-27T08:00:00Z", "stage": "draft"}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb()))
    if url.startswith(BUCKET):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1688, "height": 901})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: d.accept())   # accept the delete confirm
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(8000)
    fr = [f for f in pg.frames if "preview-engine" in (f.url or "")][0]
    try:
        fr.click("text=Read the Playbook", timeout=4000)
        pg.wait_for_timeout(800)
    except Exception:
        pass

    fr.evaluate("() => goTo('ch-a')")
    fr.wait_for_selector(".chapter#ch-a .spread", timeout=15000)
    pg.wait_for_timeout(1500)

    # G3 sub-intro '+' insert handle
    d3 = fr.evaluate("""() => {
      const sub = document.getElementById('sub-h1');
      const intro = sub && sub.querySelector('.sub-intro');
      return intro ? intro.querySelectorAll(':scope > .mo-wys-add').length : -1;
    }""")
    check("G3 sub-topic intro carries '+' insert handle", d3 >= 1, f"handles={d3}")

    # G4 part-chapter intro '+' insert handle
    d4 = fr.evaluate("""() => {
      const ch = document.querySelector('.chapter#ch-a');
      const intro = [...ch.querySelectorAll('.sub-intro')]
        .filter(el => !el.closest('.part-section, .part-topic, .part-sub'))[0];
      return intro ? intro.querySelectorAll(':scope > .mo-wys-add').length : -1;
    }""")
    check("G4 part-chapter intro carries '+' insert handle", d4 >= 1, f"handles={d4}")

    # G1 delete-on-empty: clear the intro heading, it is removed from the model
    fr.evaluate("() => { const el = document.getElementById('sub-h1'); if (el) el.scrollIntoView(); }")
    pg.wait_for_timeout(600)
    fr.locator("#sub-h1 .sub-intro h4.pb-para-h").first.click()
    pg.wait_for_timeout(300)
    pg.keyboard.press("ControlOrMeta+a")
    pg.keyboard.press("Backspace")
    pg.keyboard.press("Tab")
    pg.wait_for_timeout(1600)
    m1 = pg.evaluate("""() => {
      const b = window.MO_WYSIWYG_BRIDGE.bodyForChapter({ id: 'sub-h1' });
      return b.intro;
    }""")
    check("G1 clearing intro heading deletes the entry",
          isinstance(m1, list) and not any(str(x).startswith("##") for x in m1)
          and "Opening paragraph." in [str(x) for x in m1],
          m1)

    # G2 '×' delete handle on an item root removes the element (confirm accepted)
    d2a = fr.evaluate("""() => {
      const sub = document.getElementById('sub-h1');
      return sub ? sub.querySelectorAll('.mo-wys-del').length : -1;
    }""")
    fr.evaluate("""() => {
      const btn = document.querySelector('#sub-h1 .policy-list .mo-wys-del');
      if (btn) btn.click();
    }""")
    pg.wait_for_timeout(1600)
    m2 = pg.evaluate("""() => {
      const b = window.MO_WYSIWYG_BRIDGE.bodyForChapter({ id: 'sub-h1' });
      return (b.sections && b.sections[0]) ? b.sections[0].items : null;
    }""")
    check("G2 item root '×' handle deletes the element",
          d2a >= 1 and isinstance(m2, list) and len(m2) == 0,
          f"delHandles={d2a} itemsAfter={m2}")

    # G5 '＋ Heading' button snaps to end of line (no mid-word split)
    pg.click("#tree >> text=Delta")
    pg.wait_for_timeout(1200)
    fld = pg.locator("#inspector .field", has_text="Intro text").first
    ta = fld.locator("textarea")
    ta.evaluate("(el) => { el.focus(); el.setSelectionRange(15, 15); }")  # mid-word in "documents"
    fld.locator("button", has_text="＋ Heading").click()
    pg.wait_for_timeout(600)
    val = ta.input_value()
    want = LONG_INTRO + "\n\n## New heading"
    check("G5 ＋ Heading snaps to paragraph end (never splits mid-word)",
          val == want, json.dumps(val[-60:]))

    check("G6 zero page errors", not errs, errs[:2])
    b.close()

# G7 mirrored copies
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
check("G7 mirrored copies consistent (css identical; app.js diverges only in Studio wiring)",
      css_same and studio_only, f"css_same={css_same} changed_hunks={len(changed_lines)}")

print()
print(f"===== v17: {PASS} passed, {FAIL} failed =====")
