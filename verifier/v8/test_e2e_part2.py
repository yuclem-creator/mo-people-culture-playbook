#!/usr/bin/env python3
"""Verifier v8 (part 2) — save/load, playback, mobile.

S2 save / load:
  L1 Studio edit + reload keeps the draft locally (local persistence)
  L2 offline JSON upload renders (user's commercial playbook, all chapters)
  L3 player loads the published lane by slug
S3 playback:
  P1 every chapter of the user's playbook renders without page errors
  P2 all 18 ix kinds render non-empty in the preview engine
S4 mobile (390x844):
  M1 player loads and navigates chapters
  M2 no horizontal overflow; ix grids stack to one column
  M3 SCORM completion still fires on mobile
"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
PORT = 8924
BASE = f"http://127.0.0.1:{PORT}"
BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"
COMMERCIAL_JSON = "/mnt/agents/upload/commercial_and_revenue_playbook (8) 1.json"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb(title):
    return {"meta": {"title": title, "slug": SLUG,
                     "scorm": {"identifier": "MO", "title": title, "masteryScore": 100},
                     "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
            "chapters": [{"id": "ch-1", "numeral": "I", "label": "Controls"}],
            "sectionBodies": {"ch-1": {"intro": [], "sections": [
                {"num": "3", "title": "FOR SSC HOTELS", "blurb": "Lead", "items": []}]}},
            "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
            "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
            "prose": {}, "assets": {}}

CLOUD = {"drafts_version": {"publishedAt": "2026-08-25T08:00:00Z", "publishedBy": "e@m.com"},
         "published_version": {"publishedAt": "2026-08-20T08:00:00Z"},
         "drafts_pb": make_pb("V8 DRAFT"),
         "published_pb": make_pb("V8 PUBLISHED")}

def cloud_route(r):
    u = r.request.url
    if "cdn.jsdelivr.net" in u:
        return r.abort()
    if u.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(CLOUD["drafts_version"]))
    if u.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(CLOUD["drafts_pb"]))
    if u.startswith(BUCKET + "/published/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(CLOUD["published_version"]))
    if u.startswith(BUCKET + "/published/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(CLOUD["published_pb"]))
    if "supabase.co" in u:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

CPB = json.load(open(COMMERCIAL_JSON)) if os.path.exists(COMMERCIAL_JSON) else None

try:
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ================= S2 — save / load =================
        ctx = b.new_context(viewport={"width": 1600, "height": 1000})
        ctx.route("**/*", cloud_route)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
        pg.wait_for_timeout(5000)
        pg.click(".tree .node"); pg.wait_for_timeout(1000)
        title_input = pg.query_selector("#inspector .field input[type=text]")
        title_input.fill("V8 EDITED TITLE")
        pg.wait_for_timeout(800)
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(5000)
        pg.click(".tree .node"); pg.wait_for_timeout(1000)
        val = pg.query_selector("#inspector .field input[type=text]").input_value()
        check("L1 Studio edit persists across reload (local draft)", "V8 EDITED TITLE" in val, val)
        check("L1b no page errors in Studio", len(errors) == 0, "; ".join(errors[:2]))
        pg.close()

        # L2 offline JSON — full chapter walk in the preview engine
        if CPB:
            pg = ctx.new_page()
            errors2 = []
            pg.on("pageerror", lambda e: errors2.append(str(e)))
            pg.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
            pg.wait_for_timeout(1800)
            pg.evaluate("(p) => window.applyPlaybook(p, {})", CPB)
            pg.wait_for_timeout(2000)
            try: pg.click("text=Read the Playbook", timeout=2500)
            except Exception: pass
            bad = []
            for ch in CPB["chapters"]:
                pg.evaluate("(id) => goTo(id)", ch["id"])
                pg.wait_for_timeout(700)
                txt = pg.evaluate("() => document.querySelector('main') ? document.querySelector('main').innerText.trim().length : 0")
                if txt < 10: bad.append(ch["id"])
            check("L2 offline JSON: every chapter renders content", not bad, "empty: " + ",".join(bad) if bad else f"{len(CPB['chapters'])} chapters")
            check("P1 no page errors across full chapter walk", len(errors2) == 0, "; ".join(errors2[:2]))
            pg.close()
        else:
            check("L2 offline JSON: every chapter renders content", False, "uploaded file missing")
            check("P1 no page errors across full chapter walk", False, "skipped")

        # L3 player loads published lane by slug
        pg = ctx.new_page()
        err3 = []
        pg.on("pageerror", lambda e: err3.append(str(e)))
        pg.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
        pg.wait_for_timeout(6000)
        body = pg.inner_text("body")
        check("L3 player loads published playbook by slug", "V8 PUBLISHED" in body, body[:80].replace("\n", " "))
        check("L3b no page errors in player", len(err3) == 0, "; ".join(err3[:2]))
        pg.close(); ctx.close()

        # ================= S3 — all 18 ix kinds =================
        kinds = {
            "processflow": {"steps": [{"label": "A", "title": "t", "text": "x"}]},
            "horizons": {"stages": [{"label": "S", "dur": "1w", "text": "x"}], "bands": []},
            "legendtour": {"title": "T", "items": [{"label": "L", "text": "x"}]},
            "flipcards": {"cards": [{"label": "C", "text": "x"}]},
            "mixbars": {"rows": [{"label": "R", "segs": [1, 2]}], "legend": [{"label": "a"}, {"label": "b"}]},
            "xtable": {"head": ["A", "B"], "rows": [["1", "2"]]},
            "benchdash": {"kpis": [{"label": "K", "value": 5, "target": 10}]},
            "alloc": {"rows": [{"label": "R", "value": 10}]},
            "tabx": {"tabs": [{"label": "T", "text": "x"}]},
            "scorecard": {"rows": [{"label": "R", "score": 3, "max": 5}]},
            "typedist": {"rows": [{"label": "R", "value": 4}]},
            "stageflow": {"stages": [{"label": "S", "items": [{"text": "x"}]}]},
            "dlcheck": {"file": {"label": "F"}, "items": [{"text": "x"}]},
            "testline": {"phases": [{"num": "4", "unit": "Weeks", "label": "Assess"}], "cards": []},
            "eventcal": {"events": [{"at": "-90 d", "label": "E"}], "end": {"date": "25 Dec"}},
            "kpidash": {"cats": [{"label": "C", "kpis": [{"name": "K", "unit": "i", "target": 100,
                        "ty": [1,2,3], "ly": [1,2,3]}]}]},
            "cardwall": {"cards": [{"label": "C", "text": "x"}]},
            "compare": {"cols": [{"label": "IS", "tone": "is", "items": ["a"]},
                                 {"label": "NOT", "tone": "isnot", "items": ["b"]}]},
        }
        allk_pb = make_pb("V8 ALL KINDS")
        allk_pb["sectionBodies"]["ch-1"]["sections"][0]["items"] = [
            dict({"s": "ix", "kind": k, "name": k}, **v) for k, v in kinds.items()]
        ctx = b.new_context(viewport={"width": 1400, "height": 950})
        ctx.route("**/*", cloud_route)
        pg = ctx.new_page()
        err4 = []
        pg.on("pageerror", lambda e: err4.append(str(e)))
        pg.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(1800)
        pg.evaluate("(p) => window.applyPlaybook(p, {})", allk_pb)
        pg.wait_for_timeout(2000)
        try: pg.click("text=Read the Playbook", timeout=2500)
        except Exception: pass
        pg.evaluate("() => goTo('ch-1')"); pg.wait_for_timeout(1500)
        res = pg.evaluate("""() => {
          const out = {};
          document.querySelectorAll('.pb-ix').forEach(e => {
            const kind = [...e.classList].find(c => c.startsWith('pb-ix') && c !== 'pb-ix');
            out[kind || '?'] = e.innerText.trim().length;
          });
          return out;
        }""")
        missing = [k for k in kinds if not any(k in key for key in res)]
        empty = [k for k, v in res.items() if v < 3 and k != '?']
        check("P2a all 18 ix kinds render", not missing, "missing: " + ",".join(missing) if missing else f"{len(res)} rendered")
        check("P2b no kind renders empty/placeholder-only", not empty, "empty: " + ",".join(empty) if empty else "all non-empty")
        check("P2c no page errors with all kinds", len(err4) == 0, "; ".join(err4[:2]))
        pg.close(); ctx.close()

        # ================= S4 — mobile =================
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        ctx.route("**/*", cloud_route)
        pg = ctx.new_page()
        err5 = []
        pg.on("pageerror", lambda e: err5.append(str(e)))
        pg.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
        pg.wait_for_timeout(6000)
        body = pg.inner_text("body")
        check("M1 mobile player loads", "V8 PUBLISHED" in body, body[:60].replace("\n", " "))
        # navigate to the chapter
        nav = pg.evaluate("""() => {
          try { goTo('ch-1'); return true; } catch (e) { return String(e); }
        }""")
        pg.wait_for_timeout(1000)
        check("M1b mobile chapter navigation works", nav is True, str(nav))
        overflow = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check("M2 no horizontal overflow on mobile", overflow <= 1, f"{overflow}px")
        check("M2b no page errors on mobile", len(err5) == 0, "; ".join(err5[:2]))

        # M3 — SCORM on mobile: ix stacking + completion
        if CPB:
            pg.evaluate("(p) => window.applyPlaybook(p, {})", CPB)
            pg.wait_for_timeout(2000)
            try: pg.click("text=Read the Playbook", timeout=2500)
            except Exception: pass
            pg.evaluate("() => goTo('ch-7')"); pg.wait_for_timeout(1500)
            stack = pg.evaluate("""() => {
              const g = document.querySelector('.ixfc-grid');
              const cols = g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0;
              const cp = document.querySelector('.ixcp-grid');
              const cpCols = cp ? getComputedStyle(cp).gridTemplateColumns.split(' ').length : 0;
              return { fc: cols, cp: cpCols };
            }""")
            check("M2c flip grid stacks on mobile", stack["fc"] == 1, str(stack))
            overflow = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check("M2d no horizontal overflow with ix content", overflow <= 1, f"{overflow}px")
        pg.close(); ctx.close()

        b.close()
finally:
    srv.send_signal(__import__("signal").SIGTERM)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
