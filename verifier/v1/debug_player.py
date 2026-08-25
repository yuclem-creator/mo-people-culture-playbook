import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context()
    page = ctx.new_page()
    BUCKET = "https://akcypiuealhfqspiwebp.supabase.co/storage/v1/object/public/playbook-content"
    pb = {"meta":{"title":"DRAFT MARKER TITLE","slug":"finance-playbook","scorm":{"identifier":"X","title":"t","masteryScore":100},"completion":{"mode":"open-each-chapter","requiredChapterIds":[]}},
          "chapters":[{"id":"ch-1","numeral":"I","label":"Controls"}],
          "sectionBodies":{"ch-1":{"intro":[],"sections":[{"num":"3","title":"FOR SSC HOTELS","blurb":"Income audit team of SSC will review after Revenue Management.","items":[]}]}},
          "lifecycle":[],"journey":[],"seniorMgmt":[],"pcLeaders":[],"beliefs":[],"menuDesc":{},"lifecycleContent":{},"ch4":{"sections":[]},"ch5":{"sections":[]},"prose":{},"assets":{}}
    def route(r):
        u = r.request.url
        if u.startswith(BUCKET+"/drafts/finance-playbook/version.json"): r.fulfill(status=200, body=json.dumps({"publishedAt":"2026-08-25T08:00:00Z"}), headers={"Content-Type":"application/json"})
        elif u.startswith(BUCKET+"/published/finance-playbook/version.json"): r.fulfill(status=200, body=json.dumps({"publishedAt":"2026-08-20T08:00:00Z"}), headers={"Content-Type":"application/json"})
        elif u.startswith(BUCKET+"/drafts/finance-playbook/playbook-data.json"): r.fulfill(status=200, body=json.dumps(pb), headers={"Content-Type":"application/json"})
        else: r.fulfill(status=404, body="nf")
    ctx.route(BUCKET+"/**", route)
    page.on("pageerror", lambda e: print("PAGEERR", e))
    page.on("console", lambda m: print("CONSOLE", m.type, m.text[:200]) if m.type in ("error","warning") else None)
    page.goto("http://127.0.0.1:8902/player/index.html?slug=finance-playbook", wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    print("opts:", page.eval_on_selector_all(".opt", "els => els.map(e=>e.getAttribute('data-k'))"))
    print("overlay html present:", page.evaluate("!!document.querySelector('.ask-card-box')"))
    el = page.query_selector('.opt[data-k="read"]')
    print("read btn:", el)
    if el:
        print("visible:", el.is_visible(), "box:", el.bounding_box())
        page.evaluate("document.querySelector('.opt[data-k=\"read\"]').click()")
        page.wait_for_timeout(1000)
        print("after read click:", page.inner_text("body")[:200].replace("\n"," | "))
        page.evaluate("var b=document.querySelector('[data-goto=\"ch-1\"]'); if(b) b.click();")
        page.wait_for_timeout(1500)
        t = page.inner_text("body")
        print("has blurb:", "Income audit team of SSC" in t)
        print(t[:800])
    b.close()
