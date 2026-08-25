#!/usr/bin/env python3
"""Verifier v1 — storage/save/load + blurb-crash regression for the MO playbook platform.

Runs against a local http.server of the repo root on 127.0.0.1:8902.
Supabase storage calls are intercepted and served from in-memory fixtures,
simulating the cloud lanes (drafts/published) for slug 'finance-playbook'.

Covers:
  P1  player "Open" serves the NEWER lane (drafts newer than published)  [issue 2]
  P1b same, with a section whose blurb is a STRING — must render, no crash [issue 5]
  E1  editor: stale local slot vs newer cloud draft -> cloud wins        [issue 1/3]
  E2  fresh browser (empty storage) -> latest cloud draft loads          [issue 1/3]
Exit code 0 = all pass.
"""
import json, sys, time, copy
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8902"
BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"

def make_pb(title, with_string_blurb=True):
    return {
        "meta": {"title": title, "slug": SLUG,
                 "scorm": {"identifier": "MO_PLAYBOOK_MANIFEST", "title": title, "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "Controls"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "3", "title": "FOR SSC HOTELS",
             "blurb": "Income audit team of SSC will review after Revenue Management." if with_string_blurb
                      else ["Income audit team of SSC will review after Revenue Management."],
             "items": []}]}},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

# Mutable cloud state the tests flip between steps.
CLOUD = {
    "drafts_version": {"publishedAt": "2026-08-25T08:00:00Z"},
    "published_version": {"publishedAt": "2026-08-20T08:00:00Z"},
    "drafts_pb": make_pb("DRAFT MARKER TITLE"),
    "published_pb": make_pb("PUBLISHED OLD TITLE", with_string_blurb=False),
}

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS" if ok else "FAIL"), name, ("— " + detail if detail else ""))

def cloud_route(route):
    url = route.request.url
    body, status = None, 404
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        body, status = CLOUD["drafts_version"], (200 if CLOUD["drafts_version"] else 404)
    elif url.startswith(BUCKET + "/published/" + SLUG + "/version.json"):
        body, status = CLOUD["published_version"], (200 if CLOUD["published_version"] else 404)
    elif url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        body, status = CLOUD["drafts_pb"], (200 if CLOUD["drafts_pb"] else 404)
    elif url.startswith(BUCKET + "/published/" + SLUG + "/playbook-data.json"):
        body, status = CLOUD["published_pb"], (200 if CLOUD["published_pb"] else 404)
    if body is None:
        route.fulfill(status=404, body="not found", headers={"Content-Type": "text/plain"})
    else:
        route.fulfill(status=200, body=json.dumps(body), headers={"Content-Type": "application/json"})

def new_page(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.context.route(BUCKET + "/**", cloud_route)
    return ctx, page, errors

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---- P1: player Open serves newer lane + string blurb renders ----
    ctx, page, errors = new_page(browser)
    page.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    # Entry overlay: choose "Read", then open ch-1 (chapters render on demand).
    # JS clicks: the overlay's entrance animation fails Playwright actionability.
    try:
        page.wait_for_selector('.ask-card-box .opt[data-k="read"]', timeout=8000)
        page.evaluate("document.querySelector('.opt[data-k=\"read\"]').click()")
        page.wait_for_timeout(800)
        page.evaluate("var b=document.querySelector('[data-goto=\"ch-1\"]'); if(b) b.click();")
        page.wait_for_timeout(1500)
    except Exception as e:
        check("P1 navigate to ch-1", False, str(e).splitlines()[0])
    title = page.title()
    body = page.inner_text("body")
    check("P1 player serves newer (drafts) lane", "DRAFT MARKER TITLE" in title, "title=" + title)
    check("P1 published lane not shown", "PUBLISHED OLD TITLE" not in body)
    check("P1b string blurb renders as paragraph", "Income audit team of SSC" in body)
    check("P1b no sec.blurb.map crash", not any("map is not a function" in e for e in errors),
          "; ".join(errors[:3]))
    ctx.close()

    # ---- E1: editor — stale local slot vs newer cloud draft ----
    ctx, page, errors = new_page(browser)
    # Step 1: cloud has V1 (old). Open in editor -> local slot gets V1.
    CLOUD["drafts_version"] = {"publishedAt": "2026-08-20T08:00:00Z"}
    CLOUD["drafts_pb"] = make_pb("TITLE V1 CLOUD")
    CLOUD["published_version"] = None
    CLOUD["published_pb"] = None
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#docName') && document.querySelector('#docName').value.length > 0", timeout=20000)
    v = page.eval_on_selector("#docName", "el => el.value")
    check("E1 step1 editor loads cloud V1", v == "TITLE V1 CLOUD", "docName=" + v)
    # Make a local edit so the local autosnapshot exists with a fresh timestamp
    page.eval_on_selector("#docName", "el => { el.value = el.value; el.dispatchEvent(new Event('input', {bubbles:true})); }")
    page.wait_for_timeout(2500)  # let the 1.2s autosnapshot write
    # Step 2: cloud becomes NEWER (someone else's browser saved V2)
    future = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 3600))
    CLOUD["drafts_version"] = {"publishedAt": future}
    CLOUD["drafts_pb"] = make_pb("TITLE V2 CLOUD")
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(6000)
    v = page.eval_on_selector("#docName", "el => el.value")
    check("E1 newer cloud draft beats stale local slot", v == "TITLE V2 CLOUD", "docName=" + v)
    ctx.close()

    # ---- E2: fresh browser, no local storage -> latest cloud draft ----
    ctx, page, errors = new_page(browser)
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#docName') && document.querySelector('#docName').value.length > 0", timeout=20000)
    v = page.eval_on_selector("#docName", "el => el.value")
    check("E2 fresh browser loads latest cloud draft", v == "TITLE V2 CLOUD", "docName=" + v)
    ctx.close()

    # ---- P2: language-leak regression — poisoned legacy key, undeclared playbook ----
    ctx, page, errors = new_page(browser)
    page.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    page.evaluate("try{localStorage.setItem('mo_pb_lang','zh-CN')}catch(e){}")
    page.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    body = page.inner_text("body")
    import re
    cjk = re.findall(r'[\u4e00-\u9fff]', body)
    check("P2 poisoned legacy lang key does not leak Chinese chrome", len(cjk) == 0, "cjk=" + "".join(cjk[:10]))
    check("P2 legacy key retired", page.evaluate("localStorage.getItem('mo_pb_lang')") is None)
    ctx.close()

    browser.close()

failed = [r for r in results if not r[1]]
print("\n%d/%d passed" % (len(results) - len(failed), len(results)))
sys.exit(1 if failed else 0)
