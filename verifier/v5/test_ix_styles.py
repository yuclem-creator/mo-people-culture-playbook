#!/usr/bin/env python3
"""Verifier v5 — interactive elements (s:'ix') render as styled components.

Regression gate for the 2026-08-25 fix: pbIxHTML shipped 17 renderers with no
stylesheet, so every interactive element (testline, card wall, process flow,
flip cards, ...) rendered as stacked plain text.

Proves:
X1 both mirrored mo-brand.css copies carry the ix style block and stay
   byte-identical.
X2 the ix selectors are NOT scoped under .mo-root (no .mo-root element exists
   in the player/preview DOM — scoped rules silently never match).
X3 in the preview engine, a testline / flipcards / processflow element gets
   non-trivial computed styling (panel chrome, flip 3D transforms), not raw
   text flow.
X4 the flip toggle still works (.flip class -> front rotates away, back
   rotates in).
"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

ROOT = "/mnt/agents/work/base/mo-people-culture-playbook-main"
PORT = 8917
PASS = FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print(f"PASS {name}" + (f" — {detail}" if detail else ""))
    else: FAIL += 1; print(f"FAIL {name}" + (f" — {detail}" if detail else ""))

css_a = open(f"{ROOT}/authoring-tool/preview-engine/mo-brand.css").read()
css_b = open(f"{ROOT}/player/mo-brand.css").read()

# X1
ix_markers = [".ixtl-band", ".ixfc-card", ".ixpf-step", ".ixec-pin", ".pb-ixkpi",
              ".ixsf-item", ".ixdl-item", ".ixhz-band", ".ixlg-sw", ".pb-ix{", ".ixbd-", ".ixsc-"]
missing = [m for m in ix_markers if m not in css_a]
check("X1a ix style block present in preview-engine mo-brand.css", not missing, "missing: " + ",".join(missing) if missing else f"{len(ix_markers)} markers")
check("X1b mirrored mo-brand.css copies byte-identical", css_a == css_b)

# X2 — selectors must reach the real DOM (.pb-ix lives under MAIN.reader, no .mo-root ancestor)
bad_scope = [l.strip() for l in css_a.splitlines()
             if l.strip().startswith(".mo-root") and any(k in l for k in ("ix", "pb-"))]
check("X2 ix selectors not scoped under .mo-root", not bad_scope, "; ".join(bad_scope[:3]))

PB_PATH = "/mnt/agents/upload/commercial_and_revenue_playbook (8) 1.json"
if not os.path.exists(PB_PATH):
    PB_PATH = None
    print("SKIP X3/X4 — uploaded playbook JSON not available in this environment")

if PB_PATH:
    PB = json.load(open(PB_PATH))
    srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                           cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1400, "height": 950})
            pg.goto(f"http://127.0.0.1:{PORT}/authoring-tool/preview-engine/index.html",
                    wait_until="domcontentloaded")
            pg.wait_for_timeout(1500)
            pg.evaluate("(pb) => window.applyPlaybook(pb, {})", PB)
            pg.wait_for_timeout(1800)
            try: pg.click("text=Read the Playbook", timeout=2500)
            except Exception: pass
            pg.evaluate("() => goTo('ch-7')")
            pg.wait_for_timeout(1200)

            # X3 styled rendering, not raw text
            r = pg.evaluate("""() => {
              const vis = sel => [...document.querySelectorAll(sel)].find(e => e.offsetParent);
              const tl = vis('.pb-ixtl .ixtl-band');
              const tlPhase = vis('.pb-ixtl .ixtl-phase');
              const fc = vis('.pb-ixfc .ixfc-card');
              const fcFront = vis('.pb-ixfc .ixfc-front');
              // 3D approach: perspective on the card, faces rotate with hidden backfaces
              const pf = vis('.pb-ixpf .ixpf-step');
              const g = (e, p) => e ? getComputedStyle(e)[p] : null;
              return {
                tlDisplay: g(tl, 'display'),
                tlPhaseRadius: g(tlPhase, 'borderRadius'),
                fcPerspective: g(fc, 'perspective'),
                fcFrontBackface: g(fcFront, 'backfaceVisibility'),
                pfRadius: g(pf, 'borderRadius'),
                pfBg: g(pf, 'backgroundColor'),
              };
            }""")
            check("X3a testline band lays out as flex row", r["tlDisplay"] == "flex", str(r["tlDisplay"]))
            check("X3b testline phases are cards (radius set)", bool(r["tlPhaseRadius"]) and r["tlPhaseRadius"] != "0px", str(r["tlPhaseRadius"]))
            check("X3c flip card has 3D perspective", bool(r["fcPerspective"]) and r["fcPerspective"] != "none", str(r["fcPerspective"]))
            check("X3d flip front hides its backface", r["fcFrontBackface"] == "hidden", str(r["fcFrontBackface"]))
            check("X3e processflow steps are pills", r["pfRadius"] == "999px", str(r["pfRadius"]))

            # X4 flip toggle
            pg.evaluate("""() => {
              const cs = [...document.querySelectorAll('.pb-ixfc')].find(x => x.offsetParent);
              cs.querySelector('.ixfc-card').click();
            }""")
            pg.wait_for_timeout(300)
            f = pg.evaluate("""() => {
              const cs = [...document.querySelectorAll('.pb-ixfc')].find(x => x.offsetParent);
              const c = cs.querySelector('.ixfc-card');
              return { flipped: c.classList.contains('flip'),
                       frontT: getComputedStyle(c.querySelector('.ixfc-front')).transform };
            }""")
            check("X4a click toggles .flip", f["flipped"])
            check("X4b flipped front rotates away (matrix3d)", f["frontT"].startswith("matrix3d"), f["frontT"][:24])
            b.close()
    finally:
        srv.send_signal(__import__("signal").SIGTERM)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
