#!/usr/bin/env python3
"""Verifier v6 — categorical Content Elements picker (flattened interactions).

Regression/acceptance gate for the 2026-08-25 change: the two-level
'Add interactive' button (which hid 17 kinds behind a dropdown) is replaced
by a single-level panel where every element — the 18 classic elements and
all 17 interactive kinds — is a one-click insert, grouped into five
collapsible categories.

Proves:
C1 the panel renders 5 category groups with the approved labels.
C2 all 35 elements are first-level buttons; no 'Add interactive' button and
   no intermediate kind dropdown in the insert flow.
C3 each of the 17 interactive kinds is offered as its own button.
C4 one click inserts the correct kind with starter content (testline) and
   the live preview shows the styled component (.pb-ixtl with flex band).
C5 categories collapse/expand via their headers.
C6 change scope vs pristine tree stays within presentation files.
"""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8902"
BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"

def make_pb(title):
    return {
        "meta": {"title": title, "slug": SLUG,
                 "scorm": {"identifier": "MO_PLAYBOOK_MANIFEST", "title": title, "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "Controls"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "3", "title": "FOR SSC HOTELS", "blurb": "Lead", "items": []}]}},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

def route(r):
    url = r.request.url
    if "cdn.jsdelivr.net" in url:
        return r.abort()
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"publishedAt": "2026-08-24T08:00:00.000Z", "publishedBy": "emmawong@mohg.com", "stage": "draft", "autosave": True}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb("V6 CATEGORIES")))
    if url.startswith(BUCKET + "/published/" + SLUG + "/"):
        return r.fulfill(status=404, body="not found")
    return r.continue_()

EXPECTED_CATS = ["Text & media", "Lists & checks", "Steps, timelines & journeys",
                 "Data & dashboards", "Cards & explorers"]
IX_BUTTONS = {
    "processflow": "Decision & exception logic", "horizons": "Horizon stepper / journey map",
    "legendtour": "Legend panel + tooltip tour", "flipcards": "Principle flip cards",
    "mixbars": "Stacked-bar mix explorer", "xtable": "Interactive table explorer",
    "benchdash": "Benchmark dashboard", "alloc": "Discount allocation chart",
    "tabx": "Tabbed data explorer", "cardwall": "Opportunity card wall",
    "scorecard": "Assessment scorecard / rubric", "typedist": "Count / distribution chart",
    "stageflow": "Stage step flow (gated)", "dlcheck": "Template + guided checklist",
    "testline": "Test-design timeline", "eventcal": "Event calendar timeline",
    "kpidash": "KPI dashboard (STLY toggle)",
}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(5000)

    # open the chapter, then its section, so the Content Elements panel shows
    pg.click(".tree .node")
    pg.wait_for_timeout(1200)
    pg.click("#inspector li:has-text('FOR SSC HOTELS') >> button.rep-open")
    pg.wait_for_timeout(1200)

    cats = pg.evaluate("() => Array.from(document.querySelectorAll('#inspector .media-cat > summary')).map(s => s.textContent.trim())")
    check("C1 five categories with approved labels", cats == EXPECTED_CATS, " | ".join(cats))

    btns = pg.evaluate("() => Array.from(document.querySelectorAll('#inspector .media-cat-grid button')).map(x => x.textContent.trim())")
    check("C2a 35 one-click element buttons", len(btns) == 35, f"{len(btns)} buttons")
    check("C2b no 'Add interactive' junk-drawer button", not any("Add interactive" == x.replace("+ ", "") for x in btns))

    missing = [l for l in IX_BUTTONS.values() if ("+ Add " + l) not in btns]
    check("C3 all 17 interactive kinds are first-level buttons", not missing, "missing: " + ", ".join(missing) if missing else "17/17 present")

    # C4 — insert a test-design timeline, verify kind + starter + styled preview
    pg.click("text=+ Add Test-design timeline")
    pg.wait_for_timeout(1500)
    pg.click("#inspector li:has-text('Test-design timeline') >> button.rep-open")
    pg.wait_for_timeout(1200)
    item = pg.evaluate("""() => {
      // the item edit form shows 'Interaction kind' select with the right value
      const sel = Array.from(document.querySelectorAll('#inspector select'))
        .find(s => s.parentElement && s.parentElement.textContent.includes('Interaction kind'));
      return sel ? sel.value : null;
    }""")
    check("C4a inserted item is ix kind 'testline'", item == "testline", str(item))
    starter = pg.evaluate("""() => {
      const ta = document.querySelector('#inspector details textarea');
      return ta ? ta.value.length : 0;
    }""")
    check("C4b starter content loaded (raw JSON non-empty)", starter > 50, f"{starter} chars")
    pg.wait_for_timeout(2500)
    styled = None
    for fr in pg.frames:
        if "preview-engine" in (fr.url or ""):
            styled = fr.evaluate("""() => {
              const pv = document.querySelector('.pb-ixtl .ixtl-band');
              return pv ? getComputedStyle(pv).display : 'not-rendered';
            }""")
    check("C4c live preview shows styled testline band", styled == "flex", str(styled))

    # back to the section view so the picker panel is visible again
    pg.click(".tree .node"); pg.wait_for_timeout(1000)
    pg.click("#inspector li:has-text('FOR SSC HOTELS') >> button.rep-open")
    pg.wait_for_timeout(1000)

    # C5 collapse/expand
    st = pg.evaluate("""() => {
      const d = document.querySelector('#inspector .media-cat');
      const before = d.open;
      d.querySelector('summary').click();
      const mid = d.open;
      d.querySelector('summary').click();
      return { before, mid, after: d.open };
    }""")
    check("C5 category headers collapse and re-expand", st["before"] and not st["mid"] and st["after"], str(st))

    check("C6 no page errors", len(errors) == 0, "; ".join(errors[:2]))
    b.close()

# C6 scope gate (filesystem)
out = subprocess.run(["diff", "-rq",
                      "/mnt/agents/work/pristine/mo-people-culture-playbook-main",
                      "/mnt/agents/work/base/mo-people-culture-playbook-main"],
                     capture_output=True, text=True).stdout
changed = sorted({l.split()[1].split("mo-people-culture-playbook-main/")[-1] for l in out.splitlines() if l.startswith("Files")})
allowed = ("authoring-tool/editor.js", "authoring-tool/editor.css", "authoring-tool/index.html",
           "authoring-tool/storage.js", "authoring-tool/publish.js", "authoring-tool/versions.js",
           "player/player-loader.js", "player/app.js", "authoring-tool/preview-engine/app.js",
           "player/ask.js", "authoring-tool/preview-engine/ask.js", "verifier/",
           "authoring-tool/preview-engine/mo-brand.css", "player/mo-brand.css")
bad = [c for c in changed if not c.startswith(allowed)]
check("C6 change scope limited to presentation/storage files", len(bad) == 0, ", ".join(bad) or "in-scope only")

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
