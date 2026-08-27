#!/usr/bin/env python3
"""Verifier v13 — on-preview add-element handles + tasklist & opener editing.

Proves, with stubbed Supabase:
A1  insert handles: every item root in a section list carries a hover "+"
    (inside the root, never as a .policy-list child — count guards intact);
    since v16 a chapter with zero chapter-level items ALSO gets one insert
    handle on the spread itself (so a first element can be added on-canvas),
    hence 4 handles in this fixture (3 item handles + 1 spread handle);
A2  add element: clicking "+" opens the picker modal in Studio, picking
    "heading" splices it at that exact index and the preview re-renders;
A3  tasklist action text edits in place and writes the model;
A4  tasklist note edits in place;
A5  tasklist gate line edits in place;
A6  opener title edits in place → ch.label (no prose override present);
A7  opener sub edits in place → ch.opener;
A8  scope: no wysiwyg/addElement code leaked into preview-engine or player;
A9  zero page errors.
"""
import json, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "wysiwyg-add"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb():
    return {
        "meta": {"title": "WYSIWYG Add Test", "slug": SLUG,
                 "scorm": {"identifier": "MO", "title": "WYSIWYG Add Test", "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "Original Chapter Label",
                      "opener": "Original opener sub"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "1", "title": "Section Alpha", "blurb": "Alpha blurb.", "items": [
                {"s": "tasklist", "cid": "tl1", "showProgress": True, "gateText": "Sign off when done",
                 "items": [{"text": "First task action", "note": "First task note", "pills": []},
                           {"text": "Second task action", "note": "", "pills": []}]},
                {"s": "text", "text": "Trailing paragraph."}
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
            {"publishedAt": "2026-08-26T08:00:00.000Z", "stage": "draft"}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb()))
    if url.startswith(BUCKET):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

def frame(pg):
    for f in pg.frames:
        if "preview-engine" in (f.url or ""):
            return f

def edit(fr, pg, sel, value):
    fr.locator(sel).first.click()
    pg.wait_for_timeout(250)
    pg.keyboard.press("ControlOrMeta+a")
    pg.keyboard.type(value, delay=8)
    pg.keyboard.press("Tab")
    pg.wait_for_timeout(1500)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(8000)
    fr = frame(pg)
    try:
        fr.click("text=Read the Playbook", timeout=4000)
        pg.wait_for_timeout(800)
    except Exception:
        pass
    fr.evaluate("() => goTo('ch-1')")
    pg.wait_for_timeout(2500)
    fr = frame(pg)

    # A1 — handles present inside item roots, none as .policy-list children
    res = fr.evaluate("""() => ({
        handles: document.querySelectorAll('.mo-wys-add').length,
        stray: document.querySelectorAll('.policy-list > .mo-wys-add').length,
        taskAct: document.querySelectorAll('.pb-task-act[data-wys]').length,
        taskNote: document.querySelectorAll('.pb-task-note[data-wys]').length,
        gate: document.querySelectorAll('[data-gate-row] .pb-task-act[data-wys]').length,
        openerTitle: document.querySelectorAll('.opener-title[data-wys]').length,
        openerSub: document.querySelectorAll('.opener-sub[data-wys]').length })""")
    check("A1 handles + bindings present", res["handles"] == 4 and res["stray"] == 0
          and res["taskAct"] == 3 and res["taskNote"] == 1 and res["gate"] == 1  # taskAct includes the gate row
          and res["openerTitle"] == 1 and res["openerSub"] == 1, json.dumps(res))

    # A2 — add element at index 0 via the picker
    fr.locator('.mo-wys-add[data-idx="0"]').first.click()
    pg.wait_for_timeout(600)
    modal_open = pg.evaluate("() => document.querySelectorAll('#modalRoot .modal-back').length")
    pg.click("text=+ Add heading")
    pg.wait_for_timeout(2500)
    after = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      const secs = br.bodyForChapter(br.pb().chapters[0]).sections;
      return { s0: secs[0].items[0].s, count: secs[0].items.length,
               modalLeft: document.querySelectorAll('#modalRoot .modal-back').length };
    }""")
    fr = frame(pg)
    dom_heads = fr.evaluate("() => document.querySelectorAll('.pb-heading-text').length")
    check("A2 add-element splices at index + re-renders",
          modal_open == 1 and after["s0"] == "heading" and after["count"] == 3
          and after["modalLeft"] == 0 and dom_heads >= 1, json.dumps(after))

    # A3 — tasklist action text edit (task rows shifted down by the new heading)
    fr = frame(pg)
    edit(fr, pg, '.pb-task:not([data-gate-row]) .pb-task-act[data-wys]', 'Edited task action')
    model = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      const tl = br.bodyForChapter(br.pb().chapters[0]).sections[0].items[1];
      return { text: tl.items[0].text, note: tl.items[0].note, gate: tl.gateText };
    }""")
    check("A3 task action edit writes model", model["text"] == "Edited task action", json.dumps(model))

    # A4 — tasklist note edit (notes render collapsed; tap the row number to
    # expand — the editable spans stopPropagation, the numeral does not)
    fr = frame(pg)
    fr.evaluate("() => document.querySelector('.pb-task:not([data-gate-row])').classList.add('open')")
    pg.wait_for_timeout(400)
    edit(fr, pg, '.pb-task-note[data-wys]', 'Edited task note')
    model2 = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      return br.bodyForChapter(br.pb().chapters[0]).sections[0].items[1].items[0].note;
    }""")
    check("A4 task note edit writes model", model2 == "Edited task note", repr(model2))

    # A5 — gate line edit
    fr = frame(pg)
    edit(fr, pg, '[data-gate-row] .pb-task-act[data-wys]', 'Edited gate line')
    model3 = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      return br.bodyForChapter(br.pb().chapters[0]).sections[0].items[1].gateText;
    }""")
    check("A5 gate line edit writes model", model3 == "Edited gate line", repr(model3))

    # A6 — opener title edit → ch.label
    fr = frame(pg)
    edit(fr, pg, '.opener-title[data-wys]', 'Edited Chapter Label')
    model4 = pg.evaluate("() => window.MO_WYSIWYG_BRIDGE.pb().chapters[0].label")
    check("A6 opener title edit writes ch.label", model4 == "Edited Chapter Label", repr(model4))

    # A7 — opener sub edit → ch.opener
    fr = frame(pg)
    edit(fr, pg, '.opener-sub[data-wys]', 'Edited opener sub')
    model5 = pg.evaluate("() => window.MO_WYSIWYG_BRIDGE.pb().chapters[0].opener")
    check("A7 opener sub edit writes ch.opener", model5 == "Edited opener sub", repr(model5))

    # A8 — scope: nothing leaked into the mirrored engine/player files
    leak = subprocess.run(
        ["grep", "-rl", "mo-wys-add\\|MO_WYSIWYG\\|openAddElementPicker",
         ROOT + "/player", ROOT + "/authoring-tool/preview-engine"],
        capture_output=True, text=True).stdout.strip()
    check("A8 no Studio code in engine/player", leak == "", leak or "clean")

    # A9 — zero page errors
    check("A9 zero page errors", errs == [], "; ".join(errs[:3]) or "none")

    print(f"\n{PASS} passed, {FAIL} failed")
    b.close()
    sys.exit(1 if FAIL else 0)
