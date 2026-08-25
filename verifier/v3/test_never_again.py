#!/usr/bin/env python3
"""Verifier v3 — never-again acceptance suite (runs against the live merged tree).

Behaviour 1: Edit always loads the latest cloud version (stale local slot never wins).
Behaviour 2: latest-saved-regardless-of-author — true two-author sequence.
Behaviour 3: Open never fails to load — drafts newer / published-only / drafts-404.
Plus: live-read smoke check on the real Supabase bucket (public GET paths the code uses).
"""
import json, sys, time
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
            {"num": "3", "title": "FOR SSC HOTELS", "blurb": "Lead sentence for " + title, "items": []}]}},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

CLOUD = {"drafts_version": None, "published_version": None, "drafts_pb": None, "published_pb": None}

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS" if ok else "FAIL"), name, ("— " + detail if detail else ""))

def cloud_route(route):
    url = route.request.url
    body, status = None, 404
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        body = CLOUD["drafts_version"]; status = 200 if body else 404
    elif url.startswith(BUCKET + "/published/" + SLUG + "/version.json"):
        body = CLOUD["published_version"]; status = 200 if body else 404
    elif url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        body = CLOUD["drafts_pb"]; status = 200 if body else 404
    elif url.startswith(BUCKET + "/published/" + SLUG + "/playbook-data.json"):
        body = CLOUD["published_pb"]; status = 200 if body else 404
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
    # Record every toast the app shows (they auto-dismiss after ~3s)
    page.add_init_script("""
      window.__toastLog = [];
      function __arm(){
        new MutationObserver(function(muts){
          muts.forEach(function(m){ m.addedNodes.forEach(function(n){
            if (n.nodeType===1 && n.classList && n.classList.contains('toast')) window.__toastLog.push(n.textContent);
          });});
        }).observe(document.documentElement, {childList:true, subtree:true});
      }
      if (document.documentElement) __arm();
      else document.addEventListener('DOMContentLoaded', __arm);
    """)
    return ctx, page, errors

def iso(seconds_from_now):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + seconds_from_now))

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ===== BEHAVIOUR 2: two-author sequence, latest-regardless-of-author =====
    # rchu saves (T0). emmawong saves later (T1 > T0). Third open must get emmawong's.
    ctx, page, errors = new_page(browser)
    CLOUD.update(
        drafts_version={"publishedAt": iso(-600), "publishedBy": "rchu@mohg.com", "stage": "draft"},
        drafts_pb=make_pb("RCHU SAVE T0"),
        published_version=None, published_pb=None)
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#docName') && document.querySelector('#docName').value.length > 0", timeout=20000)
    v1 = page.eval_on_selector("#docName", "el => el.value")
    check("B2 step1 rchu's save loads first", v1 == "RCHU SAVE T0", v1)
    # emmawong saves later (newer draft)
    CLOUD.update(
        drafts_version={"publishedAt": iso(-60), "publishedBy": "emmawong@mohg.com", "stage": "draft", "autosave": True},
        drafts_pb=make_pb("EMMAWONG SAVE T1"))
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#docName') && document.querySelector('#docName').value === 'EMMAWONG SAVE T1'", timeout=20000)
    v2 = page.eval_on_selector("#docName", "el => el.value")
    check("B2 emmawong's later save wins on next open", v2 == "EMMAWONG SAVE T1", v2)
    toasts = " | ".join(page.evaluate("window.__toastLog || []"))
    check("B2 author of loaded version shown (emmawong)", "emmawong@mohg.com" in toasts, toasts[:160])
    ctx.close()

    # ===== BEHAVIOUR 1: Edit never loads a stale local slot over newer cloud =====
    ctx, page, errors = new_page(browser)
    # cloud V1 -> editor loads it -> local slot written via autosnapshot
    CLOUD.update(
        drafts_version={"publishedAt": iso(-3600), "publishedBy": "rchu@mohg.com", "stage": "draft"},
        drafts_pb=make_pb("CLOUD OLD"),
        published_version=None, published_pb=None)
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#docName') && document.querySelector('#docName').value.length > 0", timeout=20000)
    page.eval_on_selector("#docName", "el => { el.value='LOCAL TOUCH'; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    page.wait_for_timeout(2500)
    # colleague saves newer version
    CLOUD.update(
        drafts_version={"publishedAt": iso(+3600), "publishedBy": "avap@mohg.com", "stage": "draft"},
        drafts_pb=make_pb("AVAP NEWER CLOUD"))
    page.goto(BASE + "/authoring-tool/?edit=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(6000)
    v = page.eval_on_selector("#docName", "el => el.value")
    check("B1 Edit loads newest cloud version, not stale local", v == "AVAP NEWER CLOUD", v)
    ctx.close()

    # ===== BEHAVIOUR 3a: Open loads drafts when drafts is newer =====
    ctx, page, errors = new_page(browser)
    CLOUD.update(
        drafts_version={"publishedAt": iso(-60), "publishedBy": "emmawong@mohg.com", "stage": "draft", "autosave": True},
        drafts_pb=make_pb("OPEN DRAFT LATEST"),
        published_version={"publishedAt": iso(-86400), "publishedBy": "rchu@mohg.com", "stage": "published"},
        published_pb=make_pb("OPEN PUBLISHED OLD"))
    page.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    t = page.title()
    check("B3a Open loads latest saved (drafts) version", "OPEN DRAFT LATEST" in t, t)
    check("B3a no page errors", len(errors) == 0, "; ".join(errors[:2]))
    ctx.close()

    # ===== BEHAVIOUR 3b: Open loads published when no draft exists =====
    ctx, page, errors = new_page(browser)
    CLOUD.update(drafts_version=None, drafts_pb=None,
        published_version={"publishedAt": iso(-86400), "publishedBy": "rchu@mohg.com", "stage": "published"},
        published_pb=make_pb("ONLY PUBLISHED EXISTS"))
    page.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    t = page.title()
    check("B3b Open loads published when no draft lane", "ONLY PUBLISHED EXISTS" in t, t)
    check("B3b no page errors", len(errors) == 0, "; ".join(errors[:2]))
    ctx.close()

    # ===== BEHAVIOUR 3c: Open with explicit stage=draft still forces drafts =====
    ctx, page, errors = new_page(browser)
    CLOUD.update(
        drafts_version={"publishedAt": iso(-3600), "publishedBy": "avap@mohg.com", "stage": "draft"},
        drafts_pb=make_pb("FORCED DRAFT VIEW"))
    page.goto(BASE + "/player/index.html?slug=" + SLUG + "&stage=draft", wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    t = page.title()
    check("B3c stage=draft pins the draft lane", "FORCED DRAFT VIEW" in t, t)
    ctx.close()

    browser.close()

# ===== Live smoke: the public GET paths the code depends on really work =====
import urllib.request
def live_get(path):
    try:
        with urllib.request.urlopen(BUCKET + "/" + path, timeout=15) as r:
            return r.status
    except Exception as e:
        return str(e)
st = live_get("published/people-culture-playbook/version.json")
check("LIVE public read of published version.json (lane probe path)", st == 200, str(st))
st = live_get("published/people-culture-playbook/playbook-data.json")
check("LIVE public read of published playbook-data.json (content path)", st == 200, str(st))

failed = [r for r in results if not r[1]]
print("\n%d/%d passed" % (len(results) - len(failed), len(results)))
sys.exit(1 if failed else 0)
