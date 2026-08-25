#!/usr/bin/env python3
"""Verifier v11 — ix2: 11 new interaction kinds + glossary + motion layer.

Proves, with stubbed Supabase, inside the Studio live preview (preview-engine —
the same renderer the player and both SCORM exports use):

X1   all 11 new kinds render (root elements present, no 'could not be drawn')
X2   handoff plays — token appears, lanes complete
X3   buildup items assemble
X4   parallel paths reveal beats in both columns
X5   ripple lays out nodes on rings and reveals them
X6   journey dot lays out stops and travels
X7   decision tree answers to an outcome and restarts
X8   scenario plays a beat, shows a consequence, finishes
X9   hotspot popover opens
X10  stepper navigates next/previous with counter
X11  matching locks a correct pair and scores
X12  sequencing checks a correct order
X13  glossary [g:term|def] renders and opens on tap
X14  motion layer — statband counter animates to final value, reveals fire
X15  mobile 390px — zero horizontal overflow with all kinds present
X16  static: PB_IX_KINDS has 29 entries; ix2 block byte-identical in both
     app.js copies; mo-brand.css copies byte-identical
X17  static: no Studio-only code (MO_WYSIWYG / editor markers) in engine/player
X18  zero page errors throughout
"""
import json, re, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "ix2-test"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

def make_pb():
    items = [
        {"s": "ix", "kind": "handoff", "token": "✉", "lanes": [
            {"role": "Guest", "text": "Makes the request."},
            {"role": "Guest Services", "text": "Logs it and hands it over."},
            {"role": "Housekeeping", "text": "Delivers and confirms."}]},
        {"s": "ix", "kind": "buildup", "items": [
            {"label": "Foundation", "x": 50, "y": 78},
            {"label": "Core", "x": 50, "y": 52},
            {"label": "Finish", "x": 50, "y": 26}]},
        {"s": "ix", "kind": "parallel",
         "good": {"title": "With it", "beats": ["Beat one", "Beat two"], "verdict": "Saved."},
         "bad": {"title": "Without it", "beats": ["Miss one", "Miss two"], "verdict": "Lost."}},
        {"s": "ix", "kind": "ripple", "trigger": {"label": "One action", "sub": "centre"}, "nodes": [
            {"icon": "①", "label": "Inner", "cons": "First", "ring": 1},
            {"icon": "②", "label": "Outer", "cons": "Later", "ring": 2}]},
        {"s": "ix", "kind": "journeydot", "stops": [
            {"label": "Start", "text": "Begins."},
            {"label": "Middle", "text": "Along."},
            {"label": "End", "text": "Lands."}]},
        {"s": "ix", "kind": "dtree", "title": "Find the path", "nodes": [
            {"q": "Is the guest waiting?", "opts": [
                {"t": "Yes — act now", "to": 1, "result": ""},
                {"t": "No — later", "to": 0, "result": "Log it and follow up within the hour."}]},
            {"q": "Can you solve it yourself?", "opts": [
                {"t": "Yes", "to": 0, "result": "Solve it and tell the guest."},
                {"t": "No", "to": 0, "result": "Escalate to the manager."}]}]},
        {"s": "ix", "kind": "scenario", "title": "What would you do?", "beats": [
            {"tag": "Beat 1", "text": "A guest complains about noise.", "opts": [
                {"t": "Apologise and act", "cons": "Exactly right.", "ok": True},
                {"t": "Explain the policy", "cons": "That feels cold.", "ok": False}]},
            {"tag": "Beat 2", "text": "It happens again at 2am.", "opts": [
                {"t": "Offer a room move", "cons": "Well handled.", "ok": True}]}]},
        {"s": "ix", "kind": "hotspot", "img": "", "points": [
            {"x": 25, "y": 35, "t": "The tray", "d": "Always present it with two hands."},
            {"x": 70, "y": 55, "t": "The card", "d": "Talk to the [g:MOD|Manager on Duty] first."}]},
        {"s": "ix", "kind": "stepper", "steps": [
            {"t": "Greet", "d": "Warm welcome.", "img": "", "color": "#B59060"},
            {"t": "Assist", "d": "Offer help.", "img": "", "color": "#4E7A6B"},
            {"t": "Farewell", "d": "Sincere goodbye.", "img": "", "color": "#C07A3E"}]},
        {"s": "ix", "kind": "matching", "title": "Match them", "pairs": [
            ["Oshibori", "Refreshment towel"], ["MOD", "Manager on Duty"]]},
        {"s": "ix", "kind": "seq", "title": "Order these", "items": ["Greet", "Assist", "Farewell"]},
        {"s": "statband", "stats": [
            {"value": "96", "unit": "%", "label": "Guest satisfaction", "sub": "", "delta": "", "deltaDir": "up"}]},
    ]
    return {
        "meta": {"title": "IX2 Test", "slug": SLUG,
                 "scorm": {"identifier": "MO", "title": "IX2 Test", "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "One"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "1", "title": "Every new element", "blurb": "", "items": items}]}},
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

def show(fr, sel, wait=3200):
    """Scroll an element into view and let its animation finish."""
    fr.evaluate("(s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({block:'center'}); }", sel)
    fr.page.wait_for_timeout(wait)

with sync_playwright() as p:
    # ---- static checks first (no browser needed) --------------------------
    pe = open(ROOT + "/authoring-tool/preview-engine/app.js").read()
    pl = open(ROOT + "/player/app.js").read()
    m = re.search(r"var PB_IX_KINDS = \[([^\]]+)\]", pe)
    kinds = re.findall(r"'([a-z0-9]+)'", m.group(1)) + re.findall(r"PB_IX_KINDS\.push\(([^)]*)\)", pe)[0].replace("'", "").split(",")
    kinds = [k.strip() for k in kinds if k.strip()]
    check("X16a 29 ix kinds registered", len(set(kinds)) == 29, f"{len(set(kinds))} kinds")
    tail = pe[pe.index("INTERACTIVE ELEMENTS v2"):]
    check("X16b ix2 block byte-identical in player", "INTERACTIVE ELEMENTS v2" in pl and pl[pl.index("INTERACTIVE ELEMENTS v2"):] == tail)
    css_pe = open(ROOT + "/authoring-tool/preview-engine/mo-brand.css", "rb").read()
    css_pl = open(ROOT + "/player/mo-brand.css", "rb").read()
    check("X16c mo-brand.css byte-identical", css_pe == css_pl and b"ix2" in css_pe)
    leak = [n for n in ("MO_WYSIWYG", "MO_WYSIWYG_BRIDGE") if n in pe or n in pl]
    check("X17 no Studio-only code in engine/player", not leak, "leaked: " + ", ".join(leak) if leak else "clean")

    # ---- browser suite -----------------------------------------------------
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(6000)
    fr = preview_frame(pg)
    if not fr:
        print("FATAL no preview frame"); sys.exit(1)
    try:
        fr.click("text=Read the Playbook", timeout=4000)
        pg.wait_for_timeout(800)
    except Exception:
        pass
    fr.evaluate("() => goTo('ch-1')")
    pg.wait_for_timeout(2500)
    fr = preview_frame(pg)

    # X1 — everything rendered
    roots = fr.evaluate("""() => ({
        ho: !!document.querySelector('.pb-ix2ho'), bu: !!document.querySelector('.pb-ix2bu'),
        pt: !!document.querySelector('.pb-ix2pt'), ri: !!document.querySelector('.pb-ix2ri'),
        jn: !!document.querySelector('.pb-ix2jn'), dt: !!document.querySelector('.pb-ix2dt'),
        sc: !!document.querySelector('.pb-ix2sc'), hs: !!document.querySelector('.pb-ix2hs'),
        st: !!document.querySelector('.pb-ix2st'), ma: !!document.querySelector('.pb-ix2ma'),
        sq: !!document.querySelector('.pb-ix2sq'),
        broken: document.querySelectorAll('.pb-chart-empty').length })""")
    check("X1 all 11 kinds render, none broken",
          all(roots[k] for k in ("ho","bu","pt","ri","jn","dt","sc","hs","st","ma","sq")) and roots["broken"] == 0,
          json.dumps(roots))

    # X2 — handoff
    show(fr, ".pb-ix2ho", 4000)
    ho = fr.evaluate("""() => ({ token: document.querySelector('.pb-ix2ho .ix2ho-token').classList.contains('show'),
        done: document.querySelectorAll('.pb-ix2ho .ix2ho-lane.done').length })""")
    check("X2 handoff token travels, lanes complete", ho["token"] and ho["done"] >= 2, json.dumps(ho))

    # X3 — buildup
    show(fr, ".pb-ix2bu", 3000)
    bu = fr.evaluate("() => document.querySelectorAll('.pb-ix2bu .ix2bu-item.in').length")
    check("X3 buildup items assemble", bu == 3, f"{bu}/3")

    # X4 — parallel
    show(fr, ".pb-ix2pt", 3200)
    pt = fr.evaluate("""() => ({ g: document.querySelectorAll('.ix2pt-good .ix2pt-beat.in').length,
        b: document.querySelectorAll('.ix2pt-bad .ix2pt-beat.in').length,
        v: document.querySelectorAll('.ix2pt-verdict.in').length })""")
    check("X4 parallel beats reveal in sync", pt["g"] == 2 and pt["b"] == 2 and pt["v"] == 2, json.dumps(pt))

    # X5 — ripple
    show(fr, ".pb-ix2ri", 3500)
    ri = fr.evaluate("""() => ({ nodes: document.querySelectorAll('.ix2ri-node').length,
        inN: document.querySelectorAll('.ix2ri-node.in').length,
        trig: document.querySelector('.ix2ri-trigger').classList.contains('in') })""")
    check("X5 ripple nodes layout + reveal", ri["nodes"] == 2 and ri["inN"] == 2 and ri["trig"], json.dumps(ri))

    # X6 — journey dot
    show(fr, ".pb-ix2jn", 4200)
    jn = fr.evaluate("""() => ({ stops: document.querySelectorAll('.ix2jn-stop').length,
        inS: document.querySelectorAll('.ix2jn-stop.in').length,
        dot: document.querySelector('.ix2jn-dot').classList.contains('show'),
        cx: parseFloat(document.querySelector('.ix2jn-dot').getAttribute('cx')) })""")
    check("X6 journey dot travels, stops reveal", jn["stops"] == 3 and jn["inS"] == 3 and jn["dot"] and jn["cx"] > 100, json.dumps(jn))

    # X7 — decision tree
    show(fr, ".pb-ix2dt", 1200)
    fr.click(".pb-ix2dt [data-dt-opt='0']")   # Yes — act now → node 1
    pg.wait_for_timeout(400)
    q2 = fr.text_content(".pb-ix2dt .ix2dt-q")
    fr.click(".pb-ix2dt [data-dt-opt='1']")   # No → outcome
    pg.wait_for_timeout(400)
    res = fr.text_content(".pb-ix2dt .ix2dt-result-text")
    fr.click(".pb-ix2dt [data-dt-restart]")
    pg.wait_for_timeout(400)
    q0 = fr.text_content(".pb-ix2dt .ix2dt-q")
    check("X7 decision tree branches, concludes, restarts",
          "solve it yourself" in (q2 or "") and "Escalate" in (res or "") and "guest waiting" in (q0 or ""),
          f"q2={q2!r} res={res!r}")

    # X8 — scenario
    show(fr, ".pb-ix2sc", 1200)
    fr.click(".pb-ix2sc [data-sc-opt='0']")
    pg.wait_for_timeout(400)
    cons = fr.evaluate("() => ({ t: document.querySelector('.ix2sc-cons') ? document.querySelector('.ix2sc-cons').textContent : '', ok: !!document.querySelector('.ix2sc-cons.ok') })")
    fr.click(".pb-ix2sc [data-sc-next]")
    pg.wait_for_timeout(300)
    fr.click(".pb-ix2sc [data-sc-opt='0']")
    pg.wait_for_timeout(300)
    fr.click(".pb-ix2sc [data-sc-next]")
    pg.wait_for_timeout(400)
    end = fr.evaluate("() => !!document.querySelector('.ix2sc-end')")
    check("X8 scenario consequence + finish", cons["ok"] and "Exactly right" in cons["t"] and end, json.dumps(cons))

    # X9 — hotspot
    show(fr, ".pb-ix2hs", 1200)
    fr.click(".pb-ix2hs [data-hs='0']")
    pg.wait_for_timeout(300)
    hs = fr.evaluate("""() => ({ vis: !document.querySelector('[data-hsp="0"]').hidden,
        t: document.querySelector('[data-hsp="0"] .ix2hs-pop-t').textContent })""")
    check("X9 hotspot popover opens", hs["vis"] and hs["t"] == "The tray", json.dumps(hs))

    # X13 — glossary (inside the hotspot card text)
    gl = fr.evaluate("""() => { const g = document.querySelector('.mo-gloss'); if (!g) return {found:false};
        g.click(); return { found:true, open: g.classList.contains('open'),
        pop: g.querySelector('.mo-gloss-pop').textContent }; }""")
    check("X13 glossary term renders + opens", gl.get("found") and gl.get("open") and "Manager on Duty" in gl.get("pop",""), json.dumps(gl))

    # X10 — stepper
    show(fr, ".pb-ix2st", 1200)
    fr.click(".pb-ix2st [data-st='1']")
    pg.wait_for_timeout(300)
    st1 = fr.evaluate("""() => ({ c: document.querySelector('.ix2st-count').textContent,
        t: document.querySelector('.ix2st-t').textContent })""")
    fr.click(".pb-ix2st [data-st='-1']")
    pg.wait_for_timeout(300)
    st0 = fr.text_content(".ix2st-count")
    check("X10 stepper next/previous + counter", st1["c"].strip() == "2 / 3" and st1["t"] == "Assist" and st0.strip() == "1 / 3", json.dumps(st1))

    # X11 — matching
    show(fr, ".pb-ix2ma", 1200)
    fr.click(".pb-ix2ma [data-ma-term='0']")
    pg.wait_for_timeout(200)
    fr.click(".pb-ix2ma [data-ma-def='0']")
    pg.wait_for_timeout(400)
    ma = fr.evaluate("""() => ({ done: document.querySelectorAll('.ix2ma-item.done').length,
        score: document.querySelector('.ix2ma-score').textContent })""")
    fr.click(".pb-ix2ma [data-ma-term='1']")
    pg.wait_for_timeout(200)
    fr.click(".pb-ix2ma [data-ma-def='1']")
    pg.wait_for_timeout(400)
    ma2 = fr.text_content(".ix2ma-score")
    check("X11 matching locks pairs + scores", ma["done"] == 2 and "1 of 2" in ma["score"] and "All matched" in (ma2 or ""), json.dumps(ma))

    # X12 — sequencing (correct order is Greet, Assist, Farewell = indices 0,1,2)
    show(fr, ".pb-ix2sq", 1200)
    for i in ("0", "1", "2"):
        fr.click(f".ix2sq-pool [data-sq='{i}']")
        pg.wait_for_timeout(150)
    fr.click(".pb-ix2sq [data-sq-check]")
    pg.wait_for_timeout(400)
    sq = fr.evaluate("""() => ({ ok: document.querySelectorAll('.ix2sq-order .ix2sq-chip.ok').length,
        msg: document.querySelector('.ix2sq-msg').textContent })""")
    check("X12 sequencing checks order", sq["ok"] == 3 and "Perfect" in sq["msg"], json.dumps(sq))

    # X14 — motion layer: counter ends at final value + reveals fired
    show(fr, ".pb-stats", 2500)
    mo = fr.evaluate("""() => ({
        stat: document.querySelector('.pb-stat-num').textContent,
        counted: !!document.querySelector('.pb-stat-num').dataset.counted,
        rvIn: document.querySelectorAll('.mo-rv.in').length })""")
    check("X14 motion: counter final + reveals fired", mo["counted"] and mo["stat"].startswith("96") and mo["rvIn"] > 0, json.dumps(mo))

    check("X18 zero page errors", not errs, " | ".join(errs[:3]) if errs else "clean")
    ctx.close()

    # X15 — mobile 390px, no horizontal overflow with everything on the page
    ctx2 = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                         user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ctx2.route("**/*", route)
    pg2 = ctx2.new_page()
    errs2 = []
    pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg2.wait_for_timeout(6000)
    fr2 = preview_frame(pg2)
    try:
        fr2.click("text=Read the Playbook", timeout=4000)
        pg2.wait_for_timeout(600)
    except Exception:
        pass
    fr2.evaluate("() => goTo('ch-1')")
    pg2.wait_for_timeout(2500)
    fr2 = preview_frame(pg2)
    fr2.evaluate("() => document.querySelector('.pb-ix2ri').scrollIntoView({block:'center'})")
    pg2.wait_for_timeout(1500)
    ov = fr2.evaluate("""() => { const d = document.documentElement;
        return { sw: d.scrollWidth, cw: d.clientWidth,
                 ri: !!document.querySelector('.ix2ri-node'),
                 hs: !!document.querySelector('.ix2hs-dot') }; }""")
    check("X15 mobile 390px — zero overflow, kinds render", ov["sw"] - ov["cw"] <= 1 and ov["ri"] and ov["hs"],
          f"overflow={ov['sw']-ov['cw']}px")
    check("X18b mobile — zero page errors", not errs2, " | ".join(errs2[:3]) if errs2 else "clean")
    ctx2.close()
    b.close()

print(f"\n===== v11 ix2: {PASS} passed, {FAIL} failed =====")
sys.exit(1 if FAIL else 0)
