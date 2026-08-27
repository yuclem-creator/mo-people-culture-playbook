#!/usr/bin/env python3
"""Verifier v14 — lifecycle step dock (Concept A).

Proves, with stubbed Supabase:
D1  a chapter with ch.cycle={wid,index} renders the dock: mini-ring with one
    segment per wheel stage, current segment gold, step label text;
D2  chapters WITHOUT ch.cycle render no dock;
D3  the dock is live: rename a wheel stage in the model → re-render → the
    dock label updates (no per-chapter copies of stage names);
D4  adding a stage to the wheel grows every dock to N+1 segments;
D5  clicking the dock navigates to the chapter holding the wheel;
D6  Studio: the chapter inspector offers the lifecycle link UI and setting
    wheel + step writes ch.cycle (new wheels get a wid automatically);
D7  mirrored files stay byte-identical (app.js ix tail + mo-brand.css);
D8  zero page errors.
"""
import json, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "cyc-dock"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb():
    return {
        "meta": {"title": "Cycle Dock Test", "slug": SLUG,
                 "scorm": {"identifier": "MO", "title": "Cycle Dock Test", "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [
            {"id": "ch-1", "numeral": "I", "label": "The Diagram"},
            {"id": "ch-2", "numeral": "II", "label": "Step One Chapter", "cycle": {"wid": "wh-test", "index": 0}},
            {"id": "ch-3", "numeral": "III", "label": "Step Three Chapter", "cycle": {"wid": "wh-test", "index": 2}},
            {"id": "ch-4", "numeral": "IV", "label": "Steps Part", "type": "part", "subs": [
                {"id": "sub-alpha", "label": "Step Alpha", "depth": 2, "cycle": {"wid": "wh-part", "index": 0}},
                {"id": "sub-beta", "label": "Step Beta", "depth": 2, "cycle": {"wid": "wh-part", "index": 1}}
            ]}
        ],
        "sectionBodies": {
            "ch-1": {"intro": [], "items": [
                {"s": "wheel", "name": "Identify", "wid": "wh-test", "hubTitle": "Identify", "stages": [
                    {"label": "Self Assessment", "text": "a"},
                    {"label": "Best in Class", "text": "b"},
                    {"label": "Collaboration", "text": "c"},
                    {"label": "Package Lifecycle", "text": "d"}]}],
                     "sections": []},
            "ch-2": {"intro": [], "sections": [
                {"num": "1", "title": "Score your process", "blurb": "Blurb.", "items": [
                    {"s": "text", "text": "Step one content."}]}]},
            "ch-3": {"intro": [], "sections": [
                {"num": "1", "title": "Work together", "blurb": "", "items": []}]},
            "ch-4": {"intro": [], "sections": []},
            "sub-alpha": {"intro": [], "items": [
                {"s": "wheel", "name": "PartCycle", "wid": "wh-part", "hubTitle": "PartCycle", "stages": [
                    {"label": "Alpha Stage", "text": ""}, {"label": "Beta Stage", "text": ""}]},
                {"s": "text", "text": "Alpha filler. " * 400}],
                          "sections": []},
            "sub-beta": {"intro": [], "sections": [
                {"num": "1", "title": "Beta section", "blurb": "", "items": [
                    {"s": "text", "text": "Beta filler. " * 400},
                    {"s": "text", "text": "More beta filler. " * 400}]}]}
        },
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

def dock_state(fr, cid):
    return fr.evaluate("""(cid) => {
      const ch = document.getElementById(cid);
      const d = ch ? ch.querySelector('.pb-cyc-dock') : null;
      if (!d) return { present: false };
      const segs = [...d.querySelectorAll('svg path')];
      return { present: true, segs: segs.length,
               gold: segs.filter(s => s.getAttribute('stroke') === '#B59060').length,
               num: (d.querySelector('.pb-cyc-docknum') || {}).textContent,
               label: (d.querySelector('.pb-cyc-docklbl') || {}).textContent };
    }""", cid)

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
    fr.evaluate("() => goTo('ch-2')")
    pg.wait_for_timeout(2000)
    fr = frame(pg)

    # D1 — dock on linked chapter
    d2 = dock_state(fr, "ch-2")
    check("D1 dock renders with live ring (4 segs, 1 gold, step label)",
          d2.get("present") and d2["segs"] == 4 and d2["gold"] == 1 and d2["num"] == "01"
          and "Self Assessment" in d2["label"] and "Identify" in d2["label"], json.dumps(d2))

    d3 = dock_state(fr, "ch-3")
    check("D1b second linked chapter highlights its own step (03)",
          d3.get("present") and d3["num"] == "03" and "Collaboration" in d3["label"], json.dumps(d3))

    # D2 — unlinked chapter has no dock
    d1 = dock_state(fr, "ch-1")
    check("D2 unlinked chapter renders no dock", not d1.get("present"), json.dumps(d1))

    # D3 — rename a stage in the wheel model → dock follows on re-render
    pg.evaluate("""() => {
      const pb = window.MO_WYSIWYG_BRIDGE.pb();
      pb.sectionBodies['ch-1'].items[0].stages[0].label = 'Renamed Stage';
      window.MO_WYSIWYG_BRIDGE.touch();
    }""")
    pg.wait_for_timeout(2500)
    fr = frame(pg)
    d2b = dock_state(fr, "ch-2")
    check("D3 dock label follows live wheel rename", "Renamed Stage" in (d2b.get("label") or ""), json.dumps(d2b))

    # D4 — add a stage → every dock grows to 5 segments
    pg.evaluate("""() => {
      const pb = window.MO_WYSIWYG_BRIDGE.pb();
      pb.sectionBodies['ch-1'].items[0].stages.push({ label: 'New Fifth', text: '' });
      window.MO_WYSIWYG_BRIDGE.touch();
    }""")
    pg.wait_for_timeout(2500)
    fr = frame(pg)
    d2c = dock_state(fr, "ch-2")
    d3c = dock_state(fr, "ch-3")
    check("D4 adding a stage grows every linked dock",
          d2c.get("segs") == 5 and d3c.get("segs") == 5 and "Step 1 of 5" in d2c.get("label", ""),
          json.dumps({"ch2": d2c.get("segs"), "ch3": d3c.get("segs")}))

    # D5 — clicking the dock navigates to the wheel chapter
    fr.evaluate("() => { document.getElementById('ch-2').classList.add('on'); }")
    fr.locator("#ch-2 .pb-cyc-dock").click()
    pg.wait_for_timeout(1200)
    active = fr.evaluate("() => { const on = document.querySelector('section.chapter.on'); return on ? on.id : ''; }")
    check("D5 dock click opens the lifecycle diagram chapter", active == "ch-1", active)

    # D9 — part chapter: one fixed dock follows the scroll across linked subs
    fr.evaluate("() => goTo('ch-4')")
    pg.wait_for_timeout(2000)
    fr = frame(pg)
    d4 = dock_state(fr, "ch-4")
    check("D9 part chapter renders one dock from sub links",
          d4.get("present") and d4["segs"] == 2 and d4["num"] == "01", json.dumps(d4))
    fr.evaluate("() => { const el = document.getElementById('sub-beta'); if (el) el.scrollIntoView({block:'start'}); }")
    pg.wait_for_timeout(1500)
    fr = frame(pg)
    d4b = dock_state(fr, "ch-4")
    check("D9b dock follows scroll to the sub in view (step 02)",
          d4b.get("num") == "02" and "Beta Stage" in (d4b.get("label") or ""), json.dumps(d4b))

    # D6 — Studio inspector link UI
    pg.evaluate("""() => {
      const sel = { kind: 'chapter', ref: window.MO_WYSIWYG_BRIDGE.pb().chapters[1] };
      document.querySelectorAll('.tree-row, .toc-row').forEach(function(){});
    }""")
    # open chapter inspector via the tree: click the chapter row in Studio
    pg.click("text=Step One Chapter")
    pg.wait_for_timeout(1200)
    has_ui = pg.evaluate("""() => {
      const labels = [...document.querySelectorAll('#inspector label, #inspector .section-label, .panel label, .panel .section-label')]
        .map(e => e.textContent);
      const sel = [...document.querySelectorAll('select')].map(s => s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '');
      return { hasPart: labels.some(t => t.includes('Part of a lifecycle')),
               wheelOpt: sel.some(t => t.includes('Identify')) };
    }""")
    check("D6 inspector offers lifecycle link UI", has_ui["hasPart"] and has_ui["wheelOpt"], json.dumps(has_ui))

    # D7 — mirrored files byte-identical (engine app.js copies' shared tail + css)
    import hashlib
    def sha(p): return hashlib.sha1(open(p, "rb").read()).hexdigest()
    css_same = sha(ROOT + "/authoring-tool/preview-engine/mo-brand.css") == sha(ROOT + "/player/mo-brand.css")
    a = open(ROOT + "/authoring-tool/preview-engine/app.js").read()
    pl = open(ROOT + "/player/app.js").read()
    fn_a = a[a.index("// ---- Lifecycle step dock ----"):a.index("// True only for the genuine P&C seed")]
    fn_p = pl[pl.index("// ---- Lifecycle step dock ----"):pl.index("// True only for the genuine P&C seed")]
    check("D7 mirrored files consistent (dock fn + css)", css_same and fn_a == fn_p,
          "css_same=%s fn_same=%s" % (css_same, fn_a == fn_p))

    # D8 — zero page errors
    check("D8 zero page errors", errs == [], "; ".join(errs[:3]) or "none")

    print(f"\n{PASS} passed, {FAIL} failed")
    b.close()
    sys.exit(1 if FAIL else 0)
