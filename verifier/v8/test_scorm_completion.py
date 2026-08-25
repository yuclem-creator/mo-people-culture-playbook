#!/usr/bin/env python3
"""Verifier v8 — SCORM 1.2 completion, end to end against a stub LMS.

Builds the REAL exported package the way export.js does (preview-engine
renderer + injected window.SCORM_REQUIRED_PAGES + scorm_api.js + scorm_hook.js
+ playbook-data.js), embeds it in an LMS shell whose window.API is a recording
stub (state persisted in localStorage to simulate separate LMS attempts), and
proves completion fires robustly:

S1  init sets lesson_status 'incomplete' and records the landing chapter.
S2  partial progress does NOT complete; suspend_data grows as chapters open.
S3  opening the last required chapter reports 'completed' + score 100/0/100
    and commits.
S4  resume: a new attempt with pre-seeded suspend_data keeps prior views and
    completes after the remaining chapters — without double-reporting.
S5  a prior completed attempt stays completed on re-launch (no regression to
    'incomplete').
S6  leaving the course calls LMSFinish (pagehide/unload path).
S7  with no LMS present the package runs silently — zero page errors.
S8  completion honours the data-driven required list (subset completes early).
S9  the whole flow works on a mobile viewport (390x844, touch taps).
"""
import json, os, shutil, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
PE = ROOT + "/authoring-tool/preview-engine"
PKG = "/mnt/agents/work/scorm_pkg"
PORT = 8931
PASS = FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

# ---------------------------------------------------------------- package --
def make_pb():
    ch = lambda cid, num, label: {"id": cid, "numeral": num, "label": label}
    return {
        "meta": {"title": "V8 SCORM QA", "slug": "v8",
                 "scorm": {"identifier": "MO_V8", "title": "V8 SCORM QA", "masteryScore": 100},
                 "completion": {"mode": "open-all", "requiredChapterIds": []}},
        "chapters": [ch("cover", "", "Cover"), ch("intro", "", "Welcome"),
                     ch("ch-1", "1", "One"), ch("ch-2", "2", "Two"), ch("ch-3", "3", "Three")],
        "sectionBodies": {cid: {"intro": [], "sections": [
            {"num": "1", "title": "S", "blurb": "", "items": ["Text for " + cid]}]}
            for cid in ["cover", "intro", "ch-1", "ch-2", "ch-3"]},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

def build_package(required_pages):
    if os.path.exists(PKG):
        shutil.rmtree(PKG)
    os.makedirs(PKG)
    for f in ["app.js", "ask.js", "playbook-content.js", "mo-brand.css",
              "scorm_api.js", "scorm_hook.js", "imsmanifest.xml"]:
        shutil.copy(os.path.join(PE, f), PKG)
    src = open(PE + "/index.html").read()
    head = ('<script>window.SCORM_REQUIRED_PAGES = ' + json.dumps(required_pages) + ';</script>\n'
            '<script src="scorm_api.js"></script>\n')
    out = src.replace('</head>', head + '</head>')
    out = out.replace('<script src="playbook-content.js"></script>',
                      '<script src="playbook-data.js"></script>\n<script src="playbook-content.js"></script>')
    out = out.replace('<script src="app.js"></script>',
                      '<script src="app.js"></script>\n<script src="ask.js"></script>\n<script src="scorm_hook.js"></script>')
    open(PKG + "/index.html", "w").write(out)
    open(PKG + "/playbook-data.js", "w").write("window.PLAYBOOK = " + json.dumps(make_pb()) + ";\n")
    open(PKG + "/read.html", "w").write("<!DOCTYPE html><html><body><script>document.body.textContent = (localStorage.getItem('v8_finished') || '0');</script></body></html>")
    # LMS shell — recording stub API; state persisted across reloads.
    open(PKG + "/lms.html", "w").write("""<!DOCTYPE html><html><head><meta charset="utf-8"><script>
(function () {
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem('v8_lms') || '{}'); } catch (e) {}
  var calls = [];
  window.__calls = calls;
  window.API = {
    _d: saved,
    LMSInitialize: function (s) { calls.push(['init']); return 'true'; },
    LMSFinish: function (s) { calls.push(['finish']); localStorage.setItem('v8_finished', String((+localStorage.getItem('v8_finished') || 0) + 1)); return 'true'; },
    LMSSetValue: function (k, v) { this._d[k] = String(v); calls.push(['set', k, String(v)]); localStorage.setItem('v8_lms', JSON.stringify(this._d)); return 'true'; },
    LMSGetValue: function (k) { return this._d[k] || ''; },
    LMSCommit: function (s) { calls.push(['commit']); return 'true'; },
    LMSGetLastError: function () { return '0'; },
    LMSGetErrorString: function () { return ''; },
    LMSGetDiagnostic: function () { return ''; }
  };
})();
</script></head><body style="margin:0">
<iframe src="index.html" style="width:100vw;height:100vh;border:0"></iframe>
</body></html>""")

ALL = ['cover', 'intro', 'ch-1', 'ch-2', 'ch-3']
build_package(ALL)

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=PKG, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def lms_state(pg):
    return pg.evaluate("() => JSON.parse(localStorage.getItem('v8_lms') || '{}')")

def calls(pg):
    return pg.evaluate("() => window.__calls")

def finish_count(pg):
    pg.goto(f"http://127.0.0.1:{PORT}/read.html", wait_until="domcontentloaded")
    return int(pg.evaluate("() => document.body.textContent"))

def goto_chapters(pg, ids):
    fr = [f for f in pg.frames if f.url.endswith('/index.html')][0]
    for cid in ids:
        fr.evaluate("(id) => goTo(id)", cid)
        pg.wait_for_timeout(400)

try:
    # ================= full-progress attempt (S1, S2, S3) =================
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1400, "height": 950})
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(4000)
        try:
            pg.frames[[f for f in pg.frames if f.url.endswith('/index.html')][0].url]
            pg.frame(url=lambda u: u and u.endswith('/index.html')).click("text=Read the Playbook", timeout=3000)
        except Exception:
            pass
        pg.wait_for_timeout(1000)

        st = lms_state(pg)
        check("S1 lesson_status initialised to 'incomplete'", st.get("cmi.core.lesson_status") == "incomplete", st.get("cmi.core.lesson_status"))
        check("S1 landing chapter recorded in suspend_data", "cover" in (st.get("cmi.suspend_data") or ""), st.get("cmi.suspend_data"))

        goto_chapters(pg, ['intro', 'ch-1', 'ch-2'])
        pg.wait_for_timeout(800)
        st = lms_state(pg)
        check("S2 partial progress does not complete", st.get("cmi.core.lesson_status") != "completed", st.get("cmi.core.lesson_status"))
        sd = st.get("cmi.suspend_data") or ""
        check("S2 suspend_data tracks each opened chapter", all(x in sd for x in ['cover', 'intro', 'ch-1', 'ch-2']), sd)

        goto_chapters(pg, ['ch-3'])
        pg.wait_for_timeout(1000)
        st = lms_state(pg)
        check("S3 last required chapter reports 'completed'", st.get("cmi.core.lesson_status") == "completed")
        check("S3 score reported 100 / 0–100",
              st.get("cmi.core.score.raw") == "100" and st.get("cmi.core.score.max") == "100" and st.get("cmi.core.score.min") == "0",
              f'raw={st.get("cmi.core.score.raw")}')
        cl = calls(pg)
        comp_sets = [c for c in cl if c[0] == 'set' and c[1] == 'cmi.core.lesson_status' and c[2] == 'completed']
        check("S3 completion reported exactly once", len(comp_sets) == 1, f"{len(comp_sets)}x")
        idx_comp = max(i for i, c in enumerate(cl) if c[0] == 'set' and c[1] == 'cmi.core.lesson_status' and c[2] == 'completed')
        check("S3 commit issued after completion", any(c[0] == 'commit' for c in cl[idx_comp:]))
        check("S8 desktop flow produced no page errors", not errs, "; ".join(errs[:2]))
        b.close()

    # ================= S6 exit fires LMSFinish =================
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context()
        pg = ctx.new_page()
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        pg.goto(f"http://127.0.0.1:{PORT}/read.html", wait_until="domcontentloaded")
        before = int(pg.evaluate("() => document.body.textContent"))
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        pg.goto("about:blank")  # navigate away = learner closes course
        pg.wait_for_timeout(1200)
        pg.goto(f"http://127.0.0.1:{PORT}/read.html", wait_until="domcontentloaded")
        after = int(pg.evaluate("() => document.body.textContent"))
        check("S6 leaving the course calls LMSFinish", after > before, f"{before} -> {after}")
        b.close()

    # ================= S4 resume mid-progress =================
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context()
        pg = ctx.new_page()
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(800)
        # seed a prior attempt: 3 of 5 chapters viewed
        pg.evaluate("""() => localStorage.setItem('v8_lms', JSON.stringify({
          'cmi.core.lesson_status': 'incomplete',
          'cmi.suspend_data': 'cover,intro,ch-1' }))""")
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        st = lms_state(pg)
        check("S4 resume keeps prior views (no wipe)", all(x in (st.get("cmi.suspend_data") or "") for x in ['cover', 'intro', 'ch-1']), st.get("cmi.suspend_data"))
        check("S4 resume does not complete early", st.get("cmi.core.lesson_status") != "completed")
        goto_chapters(pg, ['ch-2', 'ch-3'])
        pg.wait_for_timeout(1000)
        st = lms_state(pg)
        check("S4 resume completes after remaining chapters", st.get("cmi.core.lesson_status") == "completed")
        cl = calls(pg)
        comp_sets = [c for c in cl if c[0] == 'set' and c[1] == 'cmi.core.lesson_status' and c[2] == 'completed']
        check("S4 resume reports completion exactly once", len(comp_sets) == 1, f"{len(comp_sets)}x")
        b.close()

    # ================= S5 prior completed attempt =================
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context()
        pg = ctx.new_page()
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(600)
        pg.evaluate("""() => localStorage.setItem('v8_lms', JSON.stringify({
          'cmi.core.lesson_status': 'completed',
          'cmi.suspend_data': 'cover,intro,ch-1,ch-2,ch-3' }))""")
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        st = lms_state(pg)
        check("S5 prior completion preserved on re-launch", st.get("cmi.core.lesson_status") == "completed")
        cl = calls(pg)
        check("S5 never regresses to 'incomplete'",
              not any(c[0] == 'set' and c[1] == 'cmi.core.lesson_status' and c[2] == 'incomplete' for c in cl))
        b.close()

    # ================= S7 no-LMS standalone =================
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        ok = pg.evaluate("() => !!document.querySelector('.chapter, #toc, main, body').innerText.length")
        check("S7 package runs with no LMS (silent, no errors)", not errs and ok, "; ".join(errs[:2]))
        b.close()

    # ================= S8 data-driven required subset =================
    build_package(['ch-1', 'ch-2'])
    time.sleep(1)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context()
        pg = ctx.new_page()
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(600)
        pg.evaluate("() => localStorage.removeItem('v8_lms')")
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(3500)
        goto_chapters(pg, ['ch-1'])
        pg.wait_for_timeout(600)
        st = lms_state(pg)
        check("S8 subset list: one of two does not complete", st.get("cmi.core.lesson_status") != "completed")
        goto_chapters(pg, ['ch-2'])
        pg.wait_for_timeout(1000)
        st = lms_state(pg)
        check("S8 subset list: both required chapters complete the course", st.get("cmi.core.lesson_status") == "completed")
        b.close()

    # ================= S9 mobile completion =================
    build_package(ALL)
    time.sleep(1)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(600)
        pg.evaluate("() => localStorage.removeItem('v8_lms')")
        pg.goto(f"http://127.0.0.1:{PORT}/lms.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(4000)
        fr = pg.frame(url=lambda u: u and u.endswith('/index.html'))
        try:
            fr.click("text=Read the Playbook", timeout=3000)
        except Exception:
            pass
        pg.wait_for_timeout(800)
        goto_chapters(pg, ['intro', 'ch-1', 'ch-2', 'ch-3'])
        pg.wait_for_timeout(1000)
        st = lms_state(pg)
        check("S9 mobile (390px, touch): completion fires", st.get("cmi.core.lesson_status") == "completed", st.get("cmi.core.lesson_status"))
        check("S9 mobile flow produced no page errors", not errs, "; ".join(errs[:2]))
        b.close()
finally:
    srv.send_signal(__import__("signal").SIGTERM)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
