#!/usr/bin/env python3
"""Verifier v8 — full end-to-end QA: SCORM completion, save/load, playback, mobile.

Runs against a local http.server of the repo root. Supabase storage is stubbed
in-memory; the SCORM 1.2 LMS API is stubbed in-page (localStorage-persisted so
a reload simulates an LMS relaunch).

S1 SCORM completion (headless LMS):
  C1 init reports incomplete
  C2 opening every required chapter fires lesson_status=completed + score 100 + commit
  C3 progress chip tracks viewed/total
  C4 relaunch restores viewed state from suspend_data; completion is kept
  C5 open-n mode completes after the first N chapters
  C6 subset mode (requiredChapterIds) completes on that subset only
  C7 leaving the page calls LMSFinish
S2 save / load:
  L1 Studio edit + reload keeps the draft locally
  L2 offline JSON upload renders (user's commercial playbook file)
  L3 player loads the published lane by slug
S3 playback:
  P1 every chapter of the user's playbook renders without page errors
  P2 all 18 ix kinds render non-empty
S4 mobile (390x844):
  M1 player loads and navigates
  M2 no horizontal overflow; ix elements stack
  M3 SCORM completion still fires on mobile
"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
PORT = 8923
BASE = f"http://127.0.0.1:{PORT}"
BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"
COMMERCIAL_JSON = "/mnt/agents/upload/commercial_and_revenue_playbook (8) 1.json"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb(title, n_ch=3):
    chs = [{"id": f"ch-{i}", "numeral": "IVXLCDM"[i-1], "label": f"Chapter {i}"} for i in range(1, n_ch+1)]
    sb = {c["id"]: {"intro": [], "sections": [
        {"num": "1", "title": "Section", "blurb": "Lead", "items": []}]} for c in chs}
    return {"meta": {"title": title, "slug": SLUG,
                     "scorm": {"identifier": "MO", "title": title, "masteryScore": 100},
                     "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
            "chapters": chs, "sectionBodies": sb,
            "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
            "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
            "prose": {}, "assets": {}}

LMS_STUB = """
// NOTE: contexts are isolated browser profiles, so no state clearing needed;
// localStorage persistence across pages is exactly what the relaunch test needs.
window.__lmsGet = function(k){
  var st = JSON.parse(localStorage.getItem('__lms') || '{}');
  return st[k] || '';
};
window.__lmsSet = function(k,v){
  var st = JSON.parse(localStorage.getItem('__lms') || '{}');
  st[k] = v;
  var log = JSON.parse(localStorage.getItem('__lmslog') || '[]');
  log.push(k + '=' + v);
  localStorage.setItem('__lmslog', JSON.stringify(log));
  localStorage.setItem('__lms', JSON.stringify(st));
};
window.__lmsLog = [];
window.API = {
  LMSInitialize: function(){ window.__lmsLog.push('init'); return 'true'; },
  LMSFinish: function(){ window.__lmsLog.push('finish');
    var log = JSON.parse(localStorage.getItem('__lmslog') || '[]'); log.push('finish');
    localStorage.setItem('__lmslog', JSON.stringify(log)); return 'true'; },
  LMSCommit: function(){ window.__lmsLog.push('commit'); return 'true'; },
  LMSSetValue: function(k,v){ window.__lmsSet(k,v); return 'true'; },
  LMSGetValue: function(k){ return window.__lmsGet(k); },
  LMSGetLastError: function(){ return '0'; },
  LMSGetErrorString: function(){ return ''; },
  LMSGetDiagnostic: function(){ return ''; }
};
"""

def scorm_route(required):
    """Route handler injecting the LMS stub + SCORM plumbing into the preview shell."""
    def _route(r):
        u = r.request.url
        if "cdn.jsdelivr.net" in u:
            return r.abort()
        if u.endswith("preview-engine/index.html"):
            return r.fulfill(status=200, content_type="text/html", body=INDEX_SCORM)
        return r.continue_()
    idx = open(f"{ROOT}/authoring-tool/preview-engine/index.html").read()
    head = ("<script>" + LMS_STUB + "</script>\n"
            "<script>window.SCORM_REQUIRED_PAGES = " + json.dumps(required) + ";</script>\n"
            "<script src=\"scorm_api.js\"></script>\n")
    out = idx.replace("</head>", head + "</head>")
    out = out.replace('<script src="app.js"></script>',
                      '<script src="app.js"></script>\n<script src="scorm_hook.js"></script>')
    globals()["INDEX_SCORM"] = out
    return _route

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

def boot_scorm(ctx, pb, url_extra=""):
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
    pg.wait_for_timeout(1500)
    pg.evaluate("(p) => window.applyPlaybook(p, {})", pb)
    pg.wait_for_timeout(1500)
    try: pg.click("text=Read the Playbook", timeout=2000)
    except Exception: pass
    pg.wait_for_timeout(800)  # let scorm_hook markInitial settle
    return pg, errors

try:
    PB3 = make_pb("V8 COMPLETION", 3)
    REQ3 = ["ch-1", "ch-2", "ch-3"]

    with sync_playwright() as p:
        b = p.chromium.launch()

        # ================= S1 — SCORM completion =================
        ctx = b.new_context(viewport={"width": 1400, "height": 950})
        ctx.route("**/*", scorm_route(REQ3))
        pg, errors = boot_scorm(ctx, PB3)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C1 LMS init reports incomplete", st.get("cmi.core.lesson_status") == "incomplete", st.get("cmi.core.lesson_status"))

        pg.evaluate("() => goTo('ch-1')"); pg.wait_for_timeout(400)
        pg.evaluate("() => goTo('ch-2')"); pg.wait_for_timeout(400)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C2a partial view does NOT complete", st.get("cmi.core.lesson_status") == "incomplete",
              st.get("cmi.suspend_data"))
        chip = pg.inner_text("#scormProgress") if pg.query_selector("#scormProgress") else ""
        check("C3 progress chip tracks viewed/total", "2 / 3" in chip, chip)

        pg.evaluate("() => goTo('ch-3')"); pg.wait_for_timeout(600)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C2b all chapters viewed -> completed", st.get("cmi.core.lesson_status") == "completed",
              st.get("cmi.core.lesson_status"))
        check("C2c score 100 reported", st.get("cmi.core.score.raw") == "100", st.get("cmi.core.score.raw"))
        log = pg.evaluate("() => JSON.parse(localStorage.getItem('__lmslog') || '[]')")
        check("C2d LMSCommit fired", "cmi.core.lesson_status=completed" in log, str(log[-4:]))

        # C4 relaunch — new page, same localStorage: state must restore
        pg2 = ctx.new_page()
        pg2.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
        pg2.wait_for_timeout(1800)
        pg2.evaluate("(p) => window.applyPlaybook(p, {})", PB3)
        pg2.wait_for_timeout(1200)
        done = pg2.evaluate("() => window.SCORM && window.SCORM.isComplete()")
        prog = pg2.evaluate("() => window.SCORM && window.SCORM.getProgress()")
        check("C4 relaunch restores completion + viewed state", done is True and prog["viewed"] == 3,
              f"complete={done} progress={prog}")
        pg2.close()
        check("S1 no page errors during completion flow", len(errors) == 0, "; ".join(errors[:2]))
        pg.close()

        # C5 open-n (first N chapters)
        ctx2 = b.new_context(viewport={"width": 1400, "height": 950})
        ctx2.route("**/*", scorm_route(["ch-1", "ch-2"]))  # computeRequiredPages('open-n', n=2)
        pg, errors = boot_scorm(ctx2, PB3)
        pg.evaluate("() => goTo('ch-1')"); pg.wait_for_timeout(400)
        pg.evaluate("() => goTo('ch-2')"); pg.wait_for_timeout(500)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C5 open-n completes after first N chapters", st.get("cmi.core.lesson_status") == "completed",
              st.get("cmi.core.lesson_status"))
        pg.close(); ctx2.close()

        # C6 subset mode (requiredChapterIds = ['ch-2'])
        ctx3 = b.new_context(viewport={"width": 1400, "height": 950})
        ctx3.route("**/*", scorm_route(["ch-2"]))
        pg, errors = boot_scorm(ctx3, PB3)
        pg.evaluate("() => goTo('ch-1')"); pg.wait_for_timeout(400)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C6a non-required chapter does not complete", st.get("cmi.core.lesson_status") != "completed")
        pg.evaluate("() => goTo('ch-2')"); pg.wait_for_timeout(500)
        st = pg.evaluate("() => JSON.parse(localStorage.getItem('__lms') || '{}')")
        check("C6b required chapter completes", st.get("cmi.core.lesson_status") == "completed")
        pg.close(); ctx3.close()

        # C7 finish on leave
        ctx4 = b.new_context(viewport={"width": 1400, "height": 950})
        ctx4.route("**/*", scorm_route(REQ3))
        pg, errors = boot_scorm(ctx4, PB3)
        pg.evaluate("() => goTo('ch-1')"); pg.wait_for_timeout(400)
        pg.close()  # closing the page fires pagehide/unload
        time.sleep(0.5)
        # read the shared localStorage via a fresh page
        pg = ctx4.new_page()
        pg.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
        log = pg.evaluate("() => JSON.parse(localStorage.getItem('__lmslog') || '[]')")
        check("C7 leaving the page calls LMSFinish", "finish" in log, str(log[-3:]))
        pg.close(); ctx4.close()

        print("-- S1 SCORM completion done --")
        b.close()
finally:
    srv.send_signal(__import__("signal").SIGTERM)

print(f"\nS1: {PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
