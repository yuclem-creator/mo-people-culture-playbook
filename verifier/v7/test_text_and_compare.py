#!/usr/bin/env python3
"""Verifier v7 — MO fonts, adaptive flip grid, comparison pair, body text.

Acceptance gate for the 2026-08-25 batch:
F1 ix typography uses the embedded MO house fonts (MO Exceptional display /
   Futura PT / Avenir Next body), not Georgia/system stand-ins.
F2 adaptive flip grid: a lone odd last card spans the full grid width; with an
   even count nothing spans.
F3 the 18th kind 'compare' renders the two-tone IS / IS NOT checklist columns
   in the preview engine, styled (gold top border on the IS column).
F4 the new s:'text' body-text element renders paragraphs, lead styling,
   **bold** inline, and weight/colour brand tokens; heading honours tokens too.
F5 mirrored files stay aligned: mo-brand.css copies byte-identical; the
   compare/text renderer blocks identical across app.js copies.
"""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
PORT = 8921
PASS = FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", name, ("— " + detail if detail else ""))
    else: FAIL += 1; print("FAIL", name, ("— " + detail if detail else ""))

# F5 — mirrored files
css_a = open(f"{ROOT}/authoring-tool/preview-engine/mo-brand.css").read()
css_b = open(f"{ROOT}/player/mo-brand.css").read()
check("F5a mirrored mo-brand.css byte-identical", css_a == css_b)
js_a = open(f"{ROOT}/authoring-tool/preview-engine/app.js").read()
js_b = open(f"{ROOT}/player/app.js").read()
def block(s, start, end):
    i, j = s.index(start), s.index(end)
    return s[i:j]
check("F5b compare renderer identical in both app.js copies",
      block(js_a, "// 18. Comparison pair", "};") == block(js_b, "// 18. Comparison pair", "};"))
check("F5c body-text renderer identical in both app.js copies",
      block(js_a, "it.s === 'text'", "  }") == block(js_b, "it.s === 'text'", "  }"))

# F1 — CSS carries MO font vars, no Georgia/system stacks left in the ix block
ix_css = css_a[css_a.index("INTERACTIVE ELEMENTS (ix) STYLES"):]
check("F1a ix block re-declares MO font tokens globally", "--mo-display:\"MO Exceptional\"" in ix_css)
check("F1b no Georgia stand-ins left in ix block", "Georgia" not in ix_css)
check("F1c ix body uses --mo-body", "font-family:var(--mo-body)" in ix_css)

PB = {
    "meta": {"title": "V7", "slug": "v7",
             "scorm": {"identifier": "MO", "title": "V7", "masteryScore": 100},
             "completion": {"mode": "open-each-chapter", "requiredChapterIds": []}},
    "chapters": [{"id": "ch-1", "numeral": "I", "label": "Batch"}],
    "sectionBodies": {"ch-1": {"intro": [], "sections": [
        {"num": "1", "title": "FLIP 3", "blurb": "", "items": [
            {"s": "ix", "kind": "flipcards", "name": "3 cards", "cards": [
                {"label": "One", "text": "a"}, {"label": "Two", "text": "b"}, {"label": "Three", "text": "c"}]}]},
        {"num": "2", "title": "COMPARE + TEXT", "blurb": "", "items": [
            {"s": "ix", "kind": "compare", "name": "pair", "cols": [
                {"label": "What this is", "title": "Practical", "tone": "is", "items": ["Point one", "Point two"]},
                {"label": "What this is not", "title": "Not policy", "tone": "isnot", "items": ["Not a rulebook"]}]},
            {"s": "text", "name": "prose", "lead": True, "weight": "500", "color": "gold",
             "text": "Lead para with **bold words** here.\n\nSecond paragraph follows."},
            {"s": "heading", "name": "h", "text": "Sage heading", "sub": "", "weight": "700", "color": "sage"}]}]}},
    "lifecycle": [], "journey": [], "seniorMgmt": [], "pcLeaders": [], "beliefs": [],
    "menuDesc": {}, "lifecycleContent": {}, "ch4": {"sections": []}, "ch5": {"sections": []},
    "prose": {}, "assets": {}
}

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1400, "height": 950})
        pg.goto(f"http://127.0.0.1:{PORT}/authoring-tool/preview-engine/index.html", wait_until="domcontentloaded")
        pg.wait_for_timeout(1800)
        pg.evaluate("(pb) => window.applyPlaybook(pb, {})", PB)
        pg.wait_for_timeout(1800)
        try: pg.click("text=Read the Playbook", timeout=2500)
        except Exception: pass
        pg.evaluate("() => goTo('ch-1')")
        pg.wait_for_timeout(1500)

        # F1d — computed font on a flip-card title is the MO display face
        ff = pg.evaluate("""() => {
          const t = document.querySelector('.pb-ixfc .ixfc-title');
          return t ? getComputedStyle(t).fontFamily : null;
        }""")
        check("F1d flip-card title computes to MO Exceptional", bool(ff) and "MO Exceptional" in ff, str(ff))

        # F2 — adaptive grid
        grid = pg.evaluate("""() => {
          const cards = [...document.querySelectorAll('.pb-ixfc .ixfc-card')];
          const last = cards[cards.length - 1];
          return { n: cards.length, col: getComputedStyle(last).gridColumn };
        }""")
        check("F2a odd last card spans full width", grid["n"] == 3 and grid["col"].startswith("1"), str(grid))
        even = pg.evaluate("""() => {
          const g = document.querySelector('.pb-ixfc .ixfc-grid');
          const c = g.querySelector('.ixfc-card').cloneNode(true);
          g.appendChild(c);
          const cards = g.querySelectorAll('.ixfc-card');
          const col = getComputedStyle(cards[cards.length - 1]).gridColumn;
          const n = cards.length;
          g.removeChild(c);
          return { n, col };
        }""")
        check("F2b even count — nothing spans", even["n"] == 4 and not even["col"].startswith("1 / -1"), str(even))

        # F3 — compare rendering
        cp = pg.evaluate("""() => {
          const is_ = document.querySelector('.ixcp-col.is');
          const not_ = document.querySelector('.ixcp-col.isnot');
          return {
            cols: document.querySelectorAll('.ixcp-col').length,
            isBorder: is_ ? getComputedStyle(is_).borderTopColor : null,
            isMark: is_ ? is_.querySelector('.ixcp-mark').textContent.trim() : null,
            notMark: not_ ? not_.querySelector('.ixcp-mark').textContent.trim() : null,
            items: document.querySelectorAll('.ixcp-item').length
          };
        }""")
        check("F3a two compare columns render", cp["cols"] == 2, str(cp["cols"]))
        check("F3b IS column has gold top border", cp["isBorder"] == "rgb(181, 144, 96)", str(cp["isBorder"]))
        check("F3c ✓ marks on IS, ✕ marks on IS-NOT", cp["isMark"] == "✓" and cp["notMark"] == "✕",
              f'{cp["isMark"]}/{cp["notMark"]}')
        check("F3d all checklist items render", cp["items"] == 3, str(cp["items"]))

        # F4 — body text + tokens
        tx = pg.evaluate("""() => {
          const t = document.querySelector('.pb-text');
          if (!t) return null;
          return {
            paras: t.querySelectorAll('p').length,
            lead: !!t.querySelector('p.pb-text-lead'),
            bold: t.querySelector('strong') ? t.querySelector('strong').textContent : null,
            cls: t.className,
            weight: getComputedStyle(t).fontWeight,
            color: getComputedStyle(t).color
          };
        }""")
        check("F4a body text renders paragraphs", bool(tx) and tx["paras"] == 2, str(tx and tx["paras"]))
        check("F4b lead paragraph styled", bool(tx) and tx["lead"])
        check("F4c **bold** inline renders <strong>", bool(tx) and tx["bold"] == "bold words", str(tx and tx["bold"]))
        check("F4d weight token applies (500)", bool(tx) and tx["weight"] == "500", str(tx and tx["weight"]))
        check("F4e colour token applies (gold)", bool(tx) and tx["color"] == "rgb(160, 126, 63)", str(tx and tx["color"]))
        hd = pg.evaluate("""() => {
          const h = document.querySelector('.pb-heading-text');
          return h ? { w: getComputedStyle(h).fontWeight, c: getComputedStyle(h).color } : null;
        }""")
        check("F4f heading honours tokens (700 sage)", bool(hd) and hd["w"] == "700" and hd["c"] == "rgb(74, 107, 93)", str(hd))
        b.close()
finally:
    srv.send_signal(__import__("signal").SIGTERM)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
