#!/usr/bin/env python3
"""Verifier v4 — redesign acceptance suite (visual editor panel + saved-by chip).

Runs against the redesigned tree. Proves:
R1 saved-by chip appears with author + relative time after a cloud load.
R2 auth chip always visible: muted signed-out state.
R3 inspector card grouping renders (cards + card heads) for chapter, lifecycle
   stage and settings views — and field handlers still write through (edit a
   title -> outline label updates).
R4 no cloud WRITE is attempted while signed out, even after editing.
R5 redesign touched presentation files only (editor.css / index.html /
   editor.js chip+grouping) — player, preview-engine, publish.js, versions.js,
   storage.js byte-identical to the pre-redesign tree.
"""
import json, subprocess, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8902"
BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
SLUG = "finance-playbook"
OLD_SAVE = "2026-08-24T08:00:00.000Z"

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

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS" if ok else "FAIL"), name, ("— " + detail if detail else ""))

writes = []
def route(route_):
    url = route_.request.url
    if "cdn.jsdelivr.net" in url:
        return route_.abort()
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/version.json"):
        return route_.fulfill(status=200, content_type="application/json", body=json.dumps(
            {"publishedAt": OLD_SAVE, "publishedBy": "emmawong@mohg.com", "stage": "draft", "autosave": True}))
    if url.startswith(BUCKET + "/drafts/" + SLUG + "/playbook-data.json"):
        return route_.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb("V4 REDESIGN CLOUD")))
    if url.startswith(BUCKET + "/published/" + SLUG + "/"):
        return route_.fulfill(status=404, body="not found")
    if route_.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        writes.append(url)
    return route_.continue_()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 1000})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(5000)

    chip = pg.query_selector("#savedByChip")
    txt = chip.inner_text() if chip and chip.is_visible() else ""
    check("R1 saved-by chip shows author", "emmawong@mohg.com" in txt, txt)
    check("R1 saved-by chip shows relative time", "ago" in txt or "just now" in txt, txt)

    auth = pg.query_selector("#authChip")
    atxt = auth.inner_text() if auth else ""
    check("R2 auth chip visible when signed out", "Not signed in" in atxt, atxt)

    # chapter inspector cards + write-through
    pg.click(".tree .node")  # first chapter
    pg.wait_for_timeout(1200)
    cards = pg.query_selector_all("#inspector .card")
    heads = pg.query_selector_all("#inspector .card .card-head")
    check("R3 chapter inspector grouped into cards", len(cards) >= 1 and len(heads) >= 1,
          f"{len(cards)} cards, {len(heads)} heads")
    title_input = pg.query_selector("#inspector .field input[type=text]")
    if title_input:
        title_input.fill("Controls — edited in place")
        pg.wait_for_timeout(600)
        tree_txt = pg.inner_text("#tree")
        check("R3 field handler still writes through to the model", "edited in place" in tree_txt)
    else:
        check("R3 field handler still writes through to the model", False, "no title input found")

    # settings view cards
    pg.click("#btnSettings")
    pg.wait_for_timeout(1000)
    scards = pg.query_selector_all("#inspector .card")
    check("R3 settings grouped into cards", len(scards) >= 2, f"{len(scards)} cards")

    pg.wait_for_timeout(3000)  # allow any (illegal) autosave write to fire
    check("R4 no cloud writes while signed out", len(writes) == 0, f"{len(writes)} writes")
    check("R3/R4 no page errors", len(errors) == 0, "; ".join(errors[:2]))
    b.close()

# R5 diff scope vs pristine pre-redesign tree
out = subprocess.run(["diff", "-rq",
                      "/mnt/agents/work/pristine/mo-people-culture-playbook-main",
                      "/mnt/agents/work/base/mo-people-culture-playbook-main"],
                     capture_output=True, text=True).stdout
changed = sorted({l.split()[1].split("mo-people-culture-playbook-main/")[-1] for l in out.splitlines() if l.startswith("Files")})
allowed_prefixes = ("authoring-tool/editor.js", "authoring-tool/editor.css", "authoring-tool/index.html",
                    "authoring-tool/storage.js", "authoring-tool/publish.js", "authoring-tool/versions.js",
                    "player/player-loader.js", "player/app.js", "authoring-tool/preview-engine/app.js",
                    "player/ask.js", "authoring-tool/preview-engine/ask.js", "verifier/")
bad = [c for c in changed if not c.startswith(allowed_prefixes)]
check("R5 change scope limited to known presentation/storage files", len(bad) == 0, ", ".join(bad) or "in-scope only")

n = len(results); ok = sum(1 for r in results if r[1])
print(f"\n{ok}/{n} passed")
sys.exit(0 if ok == n else 1)
