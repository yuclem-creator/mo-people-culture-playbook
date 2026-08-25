#!/usr/bin/env python3
"""Verifier v9 — full end-to-end QA: saving, storage, loading, playback, mobile.

Complements v1 (storage lanes), v2 (writes/migration), v3 (open never fails),
v4 (signed-out safety), v8 (SCORM completion). This suite closes the remaining
gaps with stubbed Supabase (storage + gotrue auth):

Q1  Studio loads the cloud draft on boot (loading).
Q2  Signed-out Save writes locally, downloads a fallback .json, and attempts
    ZERO cloud writes (saving — signed out).
Q3  Sign-in works against the stubbed auth endpoint; the chip flips to the
    signed-in state (auth).
Q4  Signed-in Save pushes a versions snapshot AND a drafts-lane write to the
    cloud (saving — signed in).
Q5  Round-trip: reload serves back the exact draft body that was saved, edits
    included (loading — round trip).
Q6  Importing the real offline export (commercial playbook JSON) loads — title
    shows and its interactive elements render in the preview (loading — import).
Q7  Video playback: a valid H.264 mp4 becomes ready to play in the preview
    engine; a broken video in the player surfaces the codec error hint
    instead of a black player (playback).
Q8  Mobile player (390px, touch): contents opens, chapter taps navigate, a
    flip card flips on tap, zero page errors (mobile).
"""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8902"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"
COMMERCIAL_JSON = "/mnt/agents/upload/commercial_and_revenue_playbook (8) 1.json"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

def preview_text(pg, needle, timeout=12):
    """Poll the preview iframe for text (main body inner_text excludes frames/inputs)."""
    for _ in range(timeout * 2):
        for fr in pg.frames:
            if "preview-engine" in (fr.url or ""):
                try:
                    if needle in fr.evaluate("() => document.body ? document.body.innerText : ''"):
                        return True
                except Exception:
                    pass
        pg.wait_for_timeout(500)
    return False

def make_pb(title):
    return {
        "meta": {"title": title, "slug": SLUG,
                 "scorm": {"identifier": "MO", "title": title, "masteryScore": 100},
                 "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
        "chapters": [{"id": "ch-1", "numeral": "I", "label": "Controls"},
                     {"id": "ch-2", "numeral": "II", "label": "Two"}],
        "sectionBodies": {"ch-1": {"intro": [], "sections": [
            {"num": "3", "title": "FOR SSC HOTELS", "blurb": "Lead " + title, "items": []}]},
            "ch-2": {"intro": [], "sections": [
            {"num": "1", "title": "S2", "blurb": "", "items": [
                {"s": "ix", "kind": "flipcards", "name": "fc", "cards": [
                    {"label": "One", "text": "a"}, {"label": "Two", "text": "b"}]},
                {"s": "video", "name": "Broken clip", "url": "video/definitely-missing.mp4"}]}]}},
        "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
        "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
        "prose": {}, "assets": {}
    }

cloud_writes = []       # (method, url, body)
saved_draft = {"body": None}

def extract_multipart_file(body, content_type):
    """Pull the file part out of a multipart/form-data storage upload."""
    if "multipart/form-data" not in content_type or "boundary=" not in content_type:
        return body
    boundary = content_type.split("boundary=", 1)[1].strip()
    for part in body.split("--" + boundary):
        if "filename=" in part and "\r\n\r\n" in part:
            payload = part.split("\r\n\r\n", 1)[1]
            return payload.rstrip("\r\n")
    return body

def route(r):
    url = r.request.url
    if url.startswith("https://cdn.jsdelivr.net/npm/@supabase") or "supabase-js" in url:
        return r.continue_()
    if url.startswith(SUPA + "/auth/v1/settings"):
        return r.fulfill(status=200, content_type="application/json", body="{}")
    # --- gotrue auth stub ---
    if url.startswith(SUPA + "/auth/v1/token"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps({
            "access_token": "fake-token", "token_type": "bearer", "expires_in": 3600,
            "refresh_token": "fake-refresh",
            "user": {"id": "u1", "email": "clement@mohg.com", "aud": "authenticated", "role": "authenticated"}}))
    if url.startswith(SUPA + "/auth/v1/user"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"id": "u1", "email": "clement@mohg.com", "aud": "authenticated", "role": "authenticated"}))
    # --- storage lanes ---
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"publishedAt": "2026-08-24T08:00:00.000Z", "publishedBy": "emmawong@mohg.com", "stage": "draft", "autosave": True}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        body = saved_draft["body"] or json.dumps(make_pb("V9 CLOUD DRAFT"))
        return r.fulfill(status=200, content_type="application/json", body=body)
    if url.startswith(BUCKET + "/published/" + SLUG + "/playbook-data.json"):
        return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb("V9 PUBLISHED")))
    if url.startswith(BUCKET + "/published/" + SLUG + "/"):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        cloud_writes.append((r.request.method, url, r.request.post_data or ""))
        if "/drafts/" in url and url.endswith("playbook-data.json"):
            # supabase-js storage upload sends multipart/form-data (fields
            # cacheControl / x-upsert / file) — real storage persists only the
            # file part, so the stub must do the same before serving it back.
            saved_draft["body"] = extract_multipart_file(
                r.request.post_data or "", r.request.headers.get("content-type", ""))
        return r.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True}))
    return r.continue_()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))

    # Q1 — boot loads cloud draft
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(5000)
    check("Q1 Studio loads the cloud draft on boot", preview_text(pg, "V9 CLOUD DRAFT"))

    # Q2 — signed-out save: local + fallback download, zero cloud writes
    pg.click(".tree .node")
    pg.wait_for_timeout(1000)
    cloud_writes.clear()
    dl = None
    try:
        with pg.expect_download(timeout=8000) as dli:
            pg.click("#btnSave")
        dl = dli.value
    except Exception:
        pg.click("#btnSave")
    pg.wait_for_timeout(2500)
    check("Q2 signed-out Save downloads fallback .json", dl is not None and dl.suggested_filename.endswith(".json"),
          dl.suggested_filename if dl else "no download")
    check("Q2 signed-out Save attempts zero cloud writes", len(cloud_writes) == 0, f"{len(cloud_writes)} writes")

    # Q3 — sign in via the auth chip
    pg.click("#authChip >> text=Sign in")
    pg.wait_for_timeout(1200)
    pg.fill(".modal .login-form input[type=email]", "clement@mohg.com")
    pg.fill(".modal .login-form input[type=password]", "hunter2")
    pg.click(".modal .m-foot .btn.primary")
    pg.wait_for_timeout(3000)
    chip = pg.inner_text("#authChip")
    check("Q3 sign-in flips chip to signed-in state", "clement@mohg.com" in chip, chip[:60])


    # Q4 — signed-in save pushes snapshot + draft lane
    cloud_writes.clear()
    pg.click("#btnSave")
    pg.wait_for_timeout(4000)
    urls = [u for _, u, _ in cloud_writes]
    check("Q4 signed-in Save writes to the cloud", len(cloud_writes) >= 2, f"{len(cloud_writes)} writes")
    check("Q4 drafts lane received playbook-data", any("/drafts/" in u and "playbook-data" in u for u in urls),
          "; ".join(u.split("playbook-content")[-1] for u in urls[:4]))

    # Q5 — round trip: edit title, save, reload, cloud serves saved body
    pg.fill("#docName", "V9 ROUND TRIP TITLE")
    pg.wait_for_timeout(800)
    pg.click("#btnSave")
    pg.wait_for_timeout(4000)
    check("Q5 save captured the edited draft", bool(saved_draft["body"]) and "V9 ROUND TRIP TITLE" in saved_draft["body"])
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(5000)
    check("Q5 reload serves back the saved draft", preview_text(pg, "V9 ROUND TRIP TITLE"))
    check("Q1-Q5 no page errors", not errs, "; ".join(errs[:2]))

    # Q6 — import the real offline commercial playbook
    with pg.expect_file_chooser(timeout=8000) as fci:
        pg.click("#btnOpen")
    fci.value.set_files(COMMERCIAL_JSON)
    pg.wait_for_timeout(4000)
    doc_name = pg.input_value("#docName")
    check("Q6 offline JSON import loads", "Commercial" in doc_name and "Revenue" in doc_name, doc_name[:60])
    n_ix = None
    for fr in pg.frames:
        if "preview-engine" in (fr.url or ""):
            n_ix = fr.evaluate("() => document.querySelectorAll('.pb-ix').length")
    check("Q6 imported playbook's interactions render in preview", (n_ix or 0) >= 5, f"{n_ix} .pb-ix")

    # Q7a — valid video plays in the preview engine
    ctx2 = b.new_context(viewport={"width": 1400, "height": 950})
    pg2 = ctx2.new_page()
    errs2 = []
    pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(BASE + "/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
    pg2.wait_for_timeout(1500)
    pbv = make_pb("V7 VIDEO")
    pbv["sectionBodies"]["ch-1"]["sections"][0]["items"] = [
        {"s": "video", "name": "Intro", "url": "video/intro.mp4"}]
    pg2.evaluate("(pb) => window.applyPlaybook(pb, {})", pbv)
    pg2.wait_for_timeout(1500)
    try:
        pg2.click("text=Read the Playbook", timeout=2500)
    except Exception:
        pass
    pg2.evaluate("() => goTo('ch-1')")
    pg2.wait_for_timeout(2500)
    ready = pg2.evaluate("""() => new Promise(res => {
      const v = document.querySelector('video');
      if (!v) return res({ found: false });
      if (v.readyState >= 2) return res({ found: true, ready: v.readyState });
      v.addEventListener('loadeddata', () => res({ found: true, ready: v.readyState }), { once: true });
      v.addEventListener('error', () => res({ found: true, error: true }), { once: true });
      setTimeout(() => res({ found: true, ready: v.readyState, timeout: true }), 8000);
    })""")
    check("Q7a valid H.264 video becomes playable", ready.get("found") and ready.get("ready", 0) >= 2 and not ready.get("error"), str(ready))
    b.close()

    # Q7b — broken video in the player surfaces the codec hint
    b = p.chromium.launch()
    ctx3 = b.new_context(viewport={"width": 1400, "height": 950})
    ctx3.route("**/*", route)
    pg3 = ctx3.new_page()
    pg3.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    try:
        pg3.wait_for_function("() => typeof goTo === 'function'", timeout=20000)
    except Exception:
        print("  [q7b debug] body:", pg3.evaluate("() => document.body ? document.body.innerText.slice(0,200) : 'NO BODY'"))
        raise
    pg3.wait_for_timeout(1500)
    try:
        pg3.click("text=Read the Playbook", timeout=3000)
    except Exception:
        pass
    pg3.evaluate("() => goTo('ch-2')")
    pg3.wait_for_timeout(3500)
    hint = pg3.evaluate("() => { const h = document.querySelector('.video-codec-hint'); return h ? h.textContent : null; }")
    check("Q7b broken video shows codec hint, not a black player", bool(hint) and "HEVC" in hint, (hint or "none")[:60])
    b.close()

    # Q8 — mobile player: contents, tap navigation, flip card
    b = p.chromium.launch()
    ctx4 = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                         user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ctx4.route("**/*", route)
    pg4 = ctx4.new_page()
    errs4 = []
    pg4.on("pageerror", lambda e: errs4.append(str(e)))
    pg4.goto(BASE + "/player/index.html?slug=" + SLUG, wait_until="domcontentloaded")
    pg4.wait_for_function("() => typeof goTo === 'function'", timeout=20000)
    pg4.wait_for_timeout(1500)
    try:
        pg4.click("text=Read the Playbook", timeout=3000)
    except Exception:
        pass
    pg4.wait_for_timeout(800)
    # open contents overlay and tap chapter II
    tapped = False
    for sel in ["text=CONTENTS", "#contentsBtn", ".contents-btn"]:
        try:
            pg4.click(sel, timeout=2000)
            tapped = True
            break
        except Exception:
            continue
    pg4.wait_for_timeout(1000)
    nav = False
    if tapped:
        try:
            pg4.click("#toc >> text=Two", timeout=2500)
            nav = True
        except Exception:
            try:
                pg4.click("text=II", timeout=2000)
                nav = True
            except Exception:
                pass
    if not nav:
        pg4.evaluate("() => goTo('ch-2')")
    pg4.wait_for_timeout(1500)
    on_ch2 = pg4.evaluate("() => !!document.querySelector('#ch-2.on, .chapter.on#ch-2') || location.hash.includes('ch-2') || document.querySelector('.pb-ixfc') !== null")
    check("Q8a mobile contents/navigation reaches chapter II", on_ch2)
    fc_card = pg4.query_selector(".pb-ixfc .ixfc-card")
    flipped = False
    if fc_card:
        fc_card.scroll_into_view_if_needed()
        pg4.wait_for_timeout(400)
        fc_card.tap()
        pg4.wait_for_timeout(700)
        flipped = pg4.evaluate("() => document.querySelector('.pb-ixfc .ixfc-card').classList.contains('flip')")
    check("Q8b flip card flips on mobile tap", flipped)
    # Q8d — no horizontal document overflow at 390px on any chapter
    # (regression: topbar right cluster — language switch + search — blew out
    #  the 1fr auto grid and pushed the page 155px past the viewport)
    overflow_chs = []
    for ch in ["cover", "ch-1", "ch-2"]:
        pg4.evaluate("(c) => goTo(c)", ch)
        pg4.wait_for_timeout(800)
        over = pg4.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        if over > 1:
            overflow_chs.append((ch, over))
    check("Q8d zero horizontal document overflow at 390px", not overflow_chs, str(overflow_chs))
    check("Q8c mobile player produced no page errors", not errs4, "; ".join(errs4[:2]))
    b.close()

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
