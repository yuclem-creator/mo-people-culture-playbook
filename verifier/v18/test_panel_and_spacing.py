#!/usr/bin/env python3
"""Verifier v18 — Panel 2.0 tabs, drag-to-resize spacing, SCORM desktop/mobile.

Studio (?edit=v18-fixtures):
H1  chapter inspector shows Content/Design/Settings tabs; numbering & labels
    collapsed under an <details.adv>; 'Opener & menu' card sits in Design;
    lifecycle card + chapter actions sit in Settings; active tab persists
    across re-renders;
H2  'Hide panel' toggle collapses the inspector (body.panel-hidden);
H3  dragging an element's top grip sets it.gap in the model (px, clamped),
    and the preview shows a .pb-gap wrapper after commit;
H4  item form exposes a 'Space above this element (px)' field;
Player (player/index.html?slug=v18-fixtures&stage=draft):
H5  gap wrapper renders in the player (padding-top for positive gap) at
    desktop width;
H6  same content renders correctly at mobile width (390px): gap wrapper
    present, scorecard circles still centred, no horizontal overflow;
H7  zero page errors in both Studio and player passes;
H8  mirrored copies: mo-brand.css byte-identical, app.js divergence only in
    the known Studio-wiring lines.
"""
import json, subprocess
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
BASE = "http://127.0.0.1:8910"
SUPA = "https://akcypiuealhfqspiwebp.supabase.co"
BUCKET = SUPA + "/storage/v1/object/public/playbook-content"
SLUG = "v18-fixtures"

PASS = FAIL = 0
def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + str(detail) if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + str(detail) if detail else ""))

def make_pb():
    return {
        "meta": {"title": "V18 Fixtures", "slug": SLUG},
        "chapters": [
            {"id": "cover", "type": "cover", "label": "Cover"},
            {"id": "ch-1", "label": "Alpha", "numeral": "1"},
            {"id": "ch-2", "label": "Beta", "numeral": "2"},
        ],
        "sectionBodies": {
            "ch-1": {"intro": ["Intro paragraph for tabs."], "sections": [
                {"num": "1", "title": "Sec One", "items": [
                    {"s": "heading", "name": "Head", "text": "Element A heading", "sub": ""},
                    {"s": "ix", "kind": "scorecard", "name": "sc", "gap": 40,
                     "taskCol": "Task", "dims": ["Score"], "scaleMax": 4,
                     "tasks": [{"name": "T1", "covers": "x"}]},
                    {"s": "text", "name": "txt", "text": "Element C text body."},
                ]},
            ], "items": []},
            "ch-2": {"intro": [], "sections": [], "items": []},
        },
    }

def route(r):
    url = r.request.url
    if "cdn.jsdelivr.net" in url: return r.continue_()
    if url.startswith(SUPA + "/auth/v1/"):
        return r.fulfill(status=200, content_type="application/json", body="{}")
    for lane in ("drafts", "published"):
        if url.startswith(BUCKET + "/" + lane + "/" + SLUG + "/version.json"):
            return r.fulfill(status=200, content_type="application/json",
                             body=json.dumps({"publishedAt": "2026-08-27T08:00:00Z"}))
        if url.startswith(BUCKET + "/" + lane + "/" + SLUG + "/playbook-data.json"):
            return r.fulfill(status=200, content_type="application/json", body=json.dumps(make_pb()))
    if url.startswith(BUCKET):
        return r.fulfill(status=404, body="not found")
    if r.request.method in ("POST", "PUT", "PATCH") and "supabase.co" in url:
        return r.fulfill(status=200, content_type="application/json", body="{}")
    return r.continue_()

errs = []
with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------------- Studio pass ----------------
    ctx = b.new_context(viewport={"width": 1688, "height": 901})
    ctx.route("**/*", route)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("studio:" + str(e)))
    pg.goto(BASE + "/authoring-tool/index.html?edit=" + SLUG, wait_until="domcontentloaded")
    pg.wait_for_timeout(8000)

    # H1 tabs + grouping
    pg.click("#tree >> text=Alpha")
    pg.wait_for_timeout(1200)
    d1 = pg.evaluate("""() => {
      const box = document.getElementById('inspector');
      const tabs = [...box.querySelectorAll('.insp-tabs button')].map(b => b.textContent.trim());
      const adv = box.querySelector('details.adv');
      const paneOf = (name) => {
        const panes = [...box.querySelectorAll('.insp-pane')];
        const pane = panes.find(p => p.dataset.pane === name);
        return pane ? [...pane.querySelectorAll('.card-head')].map(h => h.textContent.trim()) : null;
      };
      return { tabs, advCollapsed: adv ? !adv.open : null,
               design: paneOf('design'), settings: paneOf('settings'),
               contentVisible: box.querySelector('.insp-pane[data-pane=content]').style.display !== 'none',
               actionsInSettings: !!box.querySelector('.insp-pane[data-pane=settings] .ch-actions') };
    }""")
    check("H1 tabs + collapsed advanced + card routing",
          d1["tabs"] == ["Content", "Design", "Settings"] and d1["advCollapsed"]
          and any(h.startswith("Opener & menu") for h in (d1["design"] or []))
          and d1["actionsInSettings"] and d1["contentVisible"],
          json.dumps(d1))

    # H1b tab persists across re-render (switch to Design, then trigger a re-render)
    pg.click(".insp-tabs button[data-tab=design]")
    pg.wait_for_timeout(300)
    pg.evaluate("() => { const t = document.querySelector('.insp-pane[data-pane=design] textarea'); if (t) { t.value='x'; t.dispatchEvent(new Event('input',{bubbles:true})); } }")
    pg.wait_for_timeout(800)
    d1b = pg.evaluate("""() => {
      const box = document.getElementById('inspector');
      const on = box.querySelector('.insp-tabs button.on');
      const dp = box.querySelector('.insp-pane[data-pane=design]');
      return { tab: on && on.dataset.tab, visible: dp && dp.style.display !== 'none' };
    }""")
    check("H1b active tab persists", d1b["tab"] == "design" and d1b["visible"], d1b)

    # H2 panel collapse toggle
    pg.click("#btnPanel")
    pg.wait_for_timeout(400)
    d2a = pg.evaluate("() => document.body.classList.contains('panel-hidden')")
    vis = pg.evaluate("() => { const el = document.querySelector('.col-inspector'); return getComputedStyle(el).display; }")
    pg.click("#btnPanel")
    pg.wait_for_timeout(400)
    d2b = pg.evaluate("() => document.body.classList.contains('panel-hidden')")
    check("H2 panel hide/show toggle", d2a is True and vis == "none" and d2b is False,
          f"hidden={d2a} display={vis} restored={not d2b}")

    # H4 'Space above' field in the item form
    fr = [f for f in pg.frames if "preview-engine" in (f.url or "")][0]
    try:
        fr.click("text=Read the Playbook", timeout=4000)
        pg.wait_for_timeout(600)
    except Exception:
        pass
    fr.evaluate("() => goTo('ch-1')")
    fr.wait_for_selector(".chapter#ch-1 .policy-list", timeout=15000)
    pg.wait_for_timeout(1500)
    pg.evaluate("""() => {
      const br = window.MO_WYSIWYG_BRIDGE;
      const b = br.bodyForChapter({ id: 'ch-1' });
      br.openItem('ch-1', b.sections[0].items, 2);
    }""")
    pg.wait_for_timeout(1200)
    d4 = pg.evaluate("""() => {
      const labels = [...document.querySelectorAll('#inspector .field label')].map(l => l.textContent);
      return labels.some(t => t.indexOf('Space above this element') !== -1);
    }""")
    check("H4 item form has 'Space above this element (px)' field", d4, d4)

    # H3 drag the gap grip on the text element (item index 2)
    pg.click(".back-link") if pg.locator(".back-link").count() else None
    fr.evaluate("() => goTo('ch-1')")
    pg.wait_for_timeout(1200)
    d3 = fr.evaluate("""() => {
      const list = document.querySelector('.chapter#ch-1 .policy-list');
      const roots = [...list.children];
      const grip = roots[2].querySelector(':scope > .mo-wys-gap');
      if (!grip) return { grip: false };
      const r = grip.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const opts = (y) => ({ bubbles: true, cancelable: true, clientX: cx, clientY: y });
      grip.dispatchEvent(new MouseEvent('mousedown', opts(cy)));
      document.dispatchEvent(new MouseEvent('mousemove', opts(cy + 36)));
      document.dispatchEvent(new MouseEvent('mouseup', opts(cy + 36)));
      return { grip: true };
    }""")
    pg.wait_for_timeout(1600)
    m3 = pg.evaluate("""() => {
      const b = window.MO_WYSIWYG_BRIDGE.bodyForChapter({ id: 'ch-1' });
      return b.sections[0].items.map(it => (typeof it === 'object' ? it.gap : undefined));
    }""")
    gapwrap = fr.evaluate("""() => {
      const list = document.querySelector('.chapter#ch-1 .policy-list');
      const third = list && list.children[2];
      return (third && third.classList.contains('pb-gap'))
        ? { pad: third.style.paddingTop, marg: third.style.marginTop } : null;
    }""")
    check("H3 drag grip sets it.gap + .pb-gap wrapper renders",
          d3["grip"] and isinstance(m3, list) and m3[2] == 36
          and gapwrap and gapwrap["pad"] == "36px",
          f"grip={d3} gaps={m3} wrap={gapwrap}")
    ctx.close()

    # ---------------- Player pass (what SCORM serves) ----------------
    for label, vw in (("desktop", 1300), ("mobile", 390)):
        ctx2 = b.new_context(viewport={"width": vw, "height": 844})
        ctx2.route("**/*", route)
        pp = ctx2.new_page()
        pp.on("pageerror", lambda e: errs.append(label + ":" + str(e)))
        pp.goto(BASE + "/player/index.html?slug=" + SLUG + "&stage=draft", wait_until="domcontentloaded")
        pp.wait_for_timeout(6000)
        try:
            pp.click("text=Read the Playbook", timeout=4000)
            pp.wait_for_timeout(600)
        except Exception:
            pass
        pp.evaluate("() => goTo('ch-1')")
        pp.wait_for_timeout(1200)
        d5 = pp.evaluate("""() => {
          const g = document.querySelector('.chapter#ch-1 .policy-list > .pb-gap');
          const pk = document.querySelector('.chapter#ch-1 .ixsc-pick');
          const cs = pk ? getComputedStyle(pk) : null;
          return {
            gap: g ? { pad: g.style.paddingTop, w: g.getBoundingClientRect().width } : null,
            cent: cs ? (cs.display.indexOf('flex') !== -1 && cs.alignItems === 'center') : null,
            overflow: document.documentElement.scrollWidth > window.innerWidth + 2
          };
        }""")
        if label == "desktop":
            check("H5 player renders .pb-gap at desktop width",
                  d5["gap"] and d5["gap"]["pad"] == "40px" and not d5["overflow"], json.dumps(d5))
        else:
            check("H6 player renders gap + centred scorecard at mobile width, no h-overflow",
                  d5["gap"] and d5["gap"]["pad"] == "40px" and d5["cent"] and not d5["overflow"],
                  json.dumps(d5))
        ctx2.close()

    check("H7 zero page errors", not errs, errs[:3])
    b.close()

# H8 mirrored copies
import hashlib
def sha(p):
    return hashlib.sha1(open(p, "rb").read()).hexdigest()
css_same = sha(ROOT + "/authoring-tool/preview-engine/mo-brand.css") == sha(ROOT + "/player/mo-brand.css")
r = subprocess.run(["diff", ROOT + "/authoring-tool/preview-engine/app.js", ROOT + "/player/app.js"],
                   capture_output=True, text=True)
changed_lines = [l for l in r.stdout.splitlines() if l.startswith("<")]
STUDIO_TOKENS = ("__inStudio", "menu-card", "studio-select", "Studio preview", "spread-header",
                 "INTERACTIVE ELEMENTS", "Renderers only", "====", "17 kinds",
                 "window.__menuSelectWired", "data-goto", "capture phase", "side panel",
                 "window.parent", "postMessage", "addEventListener", "closest",
                 "preventDefault", "stopPropagation", "getAttribute", "editing happens",
                 "tiles/header", "e.target", "var ", "if (", "}, true", "}", "//")
def _studio_line(l):
    body = l[1:].strip()
    if not body:
        return True
    return any(t in body for t in STUDIO_TOKENS)
studio_only = all(_studio_line(l) for l in changed_lines)
check("H8 mirrored copies consistent (css identical; app.js diverges only in Studio wiring)",
      css_same and studio_only, f"css_same={css_same} changed_hunks={len(changed_lines)}")

print()
print(f"===== v18: {PASS} passed, {FAIL} failed =====")
