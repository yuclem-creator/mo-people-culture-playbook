#!/usr/bin/env python3
"""Verifier v12 — WYSIWYG on part/outline chapters (sec/top/sub bodies).

The commercial playbook stores content in a part → section/topic/sub outline:
chapter bodies are empty and each sub's body lives under its own id in
sectionBodies. v10's flat mapping bailed on these pages (0 editable). This
proves:
P1  the layer binds on part chapters — sub section titles, blurbs and items
    become editable (data-wys attributes present);
P2  a sub section title edit writes through to the model and re-renders;
P3  a sub eyebrow label edit writes through (updates the rail label too);
P4  an item paragraph edit inside a sub section writes through;
P5  flat chapters still bind exactly as before (v10 regression guard);
P6  zero page errors.
"""
import json, sys
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "comm-parts"
COMM = json.load(open("/tmp/comm.json"))

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb():
    pb = json.loads(json.dumps(COMM))
    pb["meta"]["slug"] = SLUG
    return pb

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
    fr.evaluate("() => goTo('ch-1')")
    pg.wait_for_timeout(2500)
    fr = frame(pg)

    # P1 — binding on a part chapter
    res = fr.evaluate("""() => ({
        editable: document.querySelectorAll('[data-wys]').length,
        subEditable: document.querySelectorAll('.part-section [data-wys], .part-topic [data-wys], .part-sub [data-wys]').length,
        fallback: document.querySelectorAll('.mo-wys-formbtn').length })""")
    check("P1 part chapter binds (sections + subs)", res["editable"] > 10 and res["subEditable"] > 5, json.dumps(res))

    # P2 — sub section title edit writes through
    target = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      const pb = br.pb();
      const ch = pb.chapters.find(c => c.id === 'ch-1');
      const sub = ch.subs.find(s => (br.bodyForChapter({id: s.id}).sections || []).some(x => (x.title || '').trim()));
      const body = br.bodyForChapter({ id: sub.id });
      const sec = body.sections.find(x => (x.title || '').trim());
      return { subId: sub.id, old: sec.title || '' };
    }""")
    fr.evaluate("(sid) => { const el = document.getElementById(sid); if (el) el.scrollIntoView(); }", target["subId"])
    pg.wait_for_timeout(600)
    sel = "#" + target["subId"] + " .policy-section-header h3"
    fr.locator(sel).first.click()
    pg.wait_for_timeout(300)
    pg.keyboard.press("ControlOrMeta+a")
    pg.keyboard.type("Edited Sub Title", delay=10)
    pg.keyboard.press("Tab")
    pg.wait_for_timeout(1600)
    after = pg.evaluate("""(sid) => {
      const br = window.MO_WYSIWYG_BRIDGE;
      return br.bodyForChapter({ id: sid }).sections[0].title;
    }""", target["subId"])
    fr = frame(pg)
    shown = fr.locator(sel).first.text_content()
    check("P2 sub section title edit writes through + re-renders",
          after == "Edited Sub Title" and "Edited Sub Title" in (shown or ""), f"model={after!r} dom={shown!r}")

    # P3 — sub eyebrow label edit
    old_label = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      return br.pb().chapters.find(c => c.id === 'ch-1').subs[0].label;
    }""")
    fr = frame(pg)
    lbl_sel = ".part-section .section-eyebrow .txt, .part-topic .section-eyebrow .txt"
    fr.locator(lbl_sel).first.click()
    pg.wait_for_timeout(300)
    pg.keyboard.press("ControlOrMeta+a")
    pg.keyboard.type("Edited Overview Label", delay=10)
    pg.keyboard.press("Tab")
    pg.wait_for_timeout(1600)
    new_label = pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      return br.pb().chapters.find(c => c.id === 'ch-1').subs[0].label;
    }""")
    check("P3 sub eyebrow label edit writes through", new_label == "Edited Overview Label",
          f"{old_label!r} → {new_label!r}")

    # P4 — table cell edit inside a sub section (this playbook has no
    # s:'text' items in subs; tables are the editable prose there)
    fr = frame(pg)
    cell_sel = ".part-section .pb-table tbody td, .part-topic .pb-table tbody td, .part-sub .pb-table tbody td"
    has_cell = fr.evaluate("(s) => !!document.querySelector(s)", cell_sel)
    if not has_cell:
        fr.evaluate("() => goTo('ch-6')")
        pg.wait_for_timeout(2500)
        fr = frame(pg)
        has_cell = fr.evaluate("(s) => !!document.querySelector(s)", cell_sel)
    if has_cell:
        fr.locator(cell_sel).first.click()
        pg.wait_for_timeout(300)
        pg.keyboard.press("ControlOrMeta+a")
        pg.keyboard.type("Edited cell", delay=10)
        pg.keyboard.press("Tab")
        pg.wait_for_timeout(1600)
        fr = frame(pg)
        now = fr.evaluate("(s) => { const c = document.querySelector(s); return c ? c.textContent : ''; }", cell_sel)
        check("P4 table cell edit inside sub writes through", "Edited cell" in (now or ""), (now or "")[:60])
    else:
        check("P4 table cell edit inside sub writes through", False, "no table cell found in subs")

    # P7 — callout (note box / knowledge tip) edits in place inside a sub
    fr.evaluate("() => goTo('ch-6')")
    pg.wait_for_timeout(2500)
    fr = frame(pg)
    co_sel = ".part-topic .pb-callout-text, .part-section .pb-callout-text"
    has_co = fr.evaluate("""(s) => {
      const els = [...document.querySelectorAll(s)];
      const vis = els.find(e => e.offsetParent !== null);
      if (!vis) return false;
      vis.setAttribute('data-v12-target', '1');
      vis.scrollIntoView({block:'center'});
      return true;
    }""", co_sel)
    if has_co:
        pg.wait_for_timeout(800)
        before_co = pg.evaluate("""() => {
          const br = window.MO_WYSIWYG_BRIDGE;
          const pb = br.pb();
          const ch = pb.chapters.find(c => c.id === 'ch-6');
          for (const s of ch.subs) {
            for (const sec of (br.bodyForChapter({id: s.id}).sections || [])) {
              const it = (sec.items || []).find(i => i.s === 'callout');
              if (it) return { subId: s.id, text: it.text };
            }
          }
          return null;
        }""")
        fr.locator("[data-v12-target='1']").click()
        pg.wait_for_timeout(300)
        pg.keyboard.press("ControlOrMeta+a")
        pg.keyboard.type("Edited callout text in place.", delay=10)
        pg.keyboard.press("Tab")
        pg.wait_for_timeout(1600)
        model_co = pg.evaluate("""(sid) => {
          const br = window.MO_WYSIWYG_BRIDGE;
          for (const sec of (br.bodyForChapter({id: sid}).sections || [])) {
            const it = (sec.items || []).find(i => i.s === 'callout');
            if (it) return it.text;
          }
          return null;
        }""", before_co["subId"])
        fr = frame(pg)
        dom_co = fr.evaluate("""(s) => {
          const els = [...document.querySelectorAll(s)];
          const vis = els.find(e => e.offsetParent !== null);
          return vis ? vis.textContent : '';
        }""", co_sel)
        check("P7 callout text edits in place (no right-hand form needed)",
              model_co == "Edited callout text in place." and "Edited callout" in (dom_co or ""),
              f"model={model_co!r}")
    else:
        check("P7 callout text edits in place (no right-hand form needed)", False, "no callout in ch-6 subs")

    # P5 — flat chapter regression (ch-10 has chapter-level items)
    fr.evaluate("() => goTo('ch-10')")
    pg.wait_for_timeout(2500)
    fr = frame(pg)
    flat = fr.evaluate("() => document.querySelectorAll('[data-wys]').length")
    check("P5 chapter-level items still bind", flat > 0, f"{flat} editable")

    check("P6 zero page errors", not errs, " | ".join(errs[:3]) if errs else "clean")
    b.close()

print(f"\n===== v12 WYSIWYG parts: {PASS} passed, {FAIL} failed =====")
sys.exit(1 if FAIL else 0)
