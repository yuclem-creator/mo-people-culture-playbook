/* ============================================================================
   pdf-import.js — "Course Creation" engine for MO Playbook Studio (v2)
   ----------------------------------------------------------------------------
   Turns an uploaded PDF into structured playbook chapters — DETERMINISTICALLY,
   entirely in the browser. No AI in the path: v1 delegated structuring to an
   LLM, which kept dropping section bodies and mangling formatting, so v2 does
   the layout analysis itself and keeps the document's text VERBATIM:

     1. extractPdf(file)    — pdf.js text+layout extraction (masthead/footer
                              stripping, heading detection, bullet detection).
     2. segment()           — split at detected headings; wrapper headings
                              ("Procedures" & friends) fold into their first
                              step; every section keeps its full source text.
     3. extractImages()     — embedded figures (exhibits, screenshots) pulled
                              out as downscaled JPEG data-URLs and attached to
                              the section they appear in. Repeated masthead
                              logos are skipped.
     4. buildResult()       — assembles {chapter, sections} for editor.js.

   Exposed as window.PdfImport. UI glue lives in editor.js.
   ============================================================================ */
(function (global) {
  'use strict';

  var PDFJS_VERSION = '3.11.174';
  var PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VERSION + '/build/';
  var MAX_PAGES = 80;
  var MAX_CHARS = 200000;
  var MAX_IMG_WIDTH = 1400;

  function supported() {
    return !!(global.pdfjsLib && global.fetch);
  }

  function ensureWorker() {
    if (global.pdfjsLib && !global.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + 'pdf.worker.min.js';
    }
  }

  /* ---- 1. extraction -------------------------------------------------------- */

  function normLine(s) {
    return String(s || '').toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  }

  function pageLines(items) {
    var lines = {};
    items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var y = Math.round(it.transform[5] / 2) * 2;
      var size = Math.abs(it.transform[3]) || it.height || 10;
      var key = String(y);
      if (!lines[key]) lines[key] = { y: y, size: 0, bold: false, parts: [], segs: [] };
      lines[key].size = Math.max(lines[key].size, size);
      if (/bold|black|semibold|demi/i.test(it.fontName || '')) lines[key].bold = true;
      lines[key].parts.push(it.str);
      // Keep per-item geometry for table/step/callout detection (x = left edge).
      lines[key].segs.push({ x: it.transform[4] || 0, w: it.width || 0, text: it.str });
    });
    return Object.keys(lines).map(function (k) {
      var l = lines[k];
      l.segs.sort(function (a, b) { return a.x - b.x; });
      return { y: l.y, size: l.size, bold: l.bold, text: l.parts.join(' ').replace(/\s+/g, ' ').trim(), segs: l.segs };
    }).sort(function (a, b) { return b.y - a.y; }); // pdf y grows upward
  }

  var BULLET_RE = /^[\u2022\u00b7\u25aa\u25e6\u2023\-\u2013\u2014*]\s+/;

  /* ---- 1b. structured blocks (tables / circled steps / callouts) ----------
     Works on per-line geometry (segs carry x + width per text item) so
     table-heavy pages (the Commercial playbooks) become real structured
     elements instead of flattened text. Emits blocks in page order and marks
     consumed lines so the paragraph pass skips them. */

  function segsMerged(l) {
    // merge segments separated by a small gap (same cell, wrapped words)
    var s = (l.segs || []).slice().sort(function (a, b) { return a.x - b.x; });
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var prev = out[out.length - 1];
      if (prev && s[i].x - (prev.x + prev.w) < 10) {
        prev.text += ' ' + s[i].text;
        prev.w = s[i].x + s[i].w - prev.x;
      } else out.push({ x: s[i].x, w: s[i].w, text: s[i].text.trim() });
    }
    return out.filter(function (x) { return x.text; });
  }
  function isAllCapsLine(t) {
    var letters = String(t).replace(/[^A-Za-z]/g, '');
    return letters.length >= 2 && !/[a-z]/.test(letters);
  }
  // Collapse letter-spaced tracked caps: "W H Y" -> "WHY", "S T E P 1" ->
  // "STEP 1", "R E S U LT" -> "RESULT". Word boundaries are unrecoverable
  // once pdf.js flattens tracking to plain spaces, so the two formulaic
  // two-word headers in this document family are restored explicitly.
  var KNOWN_CAPS = { 'SOWE': 'SO WE', 'SOTHAT': 'SO THAT' };
  function despace(t) {
    var out = String(t || '').replace(/(?:\b[A-Z] )+[A-Z]{1,3}\b/g, function (m) { return m.replace(/ /g, ''); });
    return KNOWN_CAPS[out] || out;
  }

  function detectBlocks(lines, median) {
    var used = new Array(lines.length).fill(false);
    var blocks = [];
    var i, k;

    // --- tables: an ALL-CAPS multi-column header line + >=2 aligned rows ---
    for (i = 0; i < lines.length; i++) {
      if (used[i]) continue;
      var headSegs = segsMerged(lines[i]);
      if (headSegs.length < 2 || !headSegs.every(function (s) { return isAllCapsLine(s.text); })) continue;
      var colX = headSegs.map(function (s) { return s.x; });
      var headText = headSegs.map(function (s) { return s.text; });
      // Wrapped header cell just ABOVE the header line (a cell wrapped
      // mid-word, e.g. "CANCELLATIO" over "N") merges into that column.
      if (i > 0 && !used[i - 1]) {
        var upSegs = segsMerged(lines[i - 1]);
        if (upSegs.length === 1 && isAllCapsLine(upSegs[0].text) && Math.abs(lines[i - 1].y - lines[i].y) <= median * 2.2) {
          for (var hc = 1; hc < colX.length; hc++) {
            if (Math.abs(upSegs[0].x - colX[hc]) <= 8) {
              headText[hc] = upSegs[0].text + headText[hc];
              used[i - 1] = true;
              break;
            }
          }
        }
      }
      var rows = [], lastY = lines[i].y;
      k = i + 1;
      while (k < lines.length) {
        var l2 = lines[k];
        if (used[k]) { k++; continue; }
        var dy = Math.abs(lastY - l2.y);
        if (dy > median * 2.6) break;
        var sg = segsMerged(l2);
        if (!sg.length) { k++; continue; }
        var firstCol = Math.abs(sg[0].x - colX[0]) <= 8;
        var alignsBeyond = sg.some(function (s) {
          return colX.some(function (cx, ci) { return ci > 0 && Math.abs(s.x - cx) <= 8; });
        });
        if (!alignsBeyond && !(firstCol && sg.length > 1)) break;
        if (sg.length === 1 && !firstCol && rows.length) {
          // continuation of the previous row's cell (wrapped cell text)
          var ci2 = -1;
          for (var c2 = colX.length - 1; c2 >= 1; c2--) { if (sg[0].x >= colX[c2] - 8) { ci2 = c2; break; } }
          if (ci2 > 0) {
            var last = rows[rows.length - 1];
            last.cells[ci2] = (last.cells[ci2] ? last.cells[ci2] + ' ' : '') + sg[0].text;
            used[k] = true; lastY = l2.y; k++; continue;
          }
        }
        var cells = colX.map(function () { return ''; });
        sg.forEach(function (s) {
          var ci = 0;
          for (var c = colX.length - 1; c >= 0; c--) { if (s.x >= colX[c] - 8) { ci = c; break; } }
          cells[ci] = cells[ci] ? cells[ci] + ' ' + s.text : s.text;
        });
        rows.push({ cells: cells });
        used[k] = true; lastY = l2.y; k++;
      }
      if (rows.length >= 2) {
        used[i] = true;
        blocks.push({ kind: 'table', y: lines[i].y,
          head: headText.map(despace),
          rows: rows.map(function (r) { return r.cells.map(despace); }) });
      }
    }

    // --- circled-number steps: bare digit line, text indented to its right -
    for (i = 0; i < lines.length; i++) {
      if (used[i]) continue;
      if (!/^\d{1,2}$/.test(lines[i].text.trim())) continue;
      var numX = (lines[i].segs && lines[i].segs.length) ? lines[i].segs[0].x : 0;
      var steps = [];
      k = i;
      while (k < lines.length) {
        var ln = lines[k];
        if (used[k]) { k++; continue; }
        var tt = ln.text.trim();
        if (!/^\d{1,2}$/.test(tt)) { k++; continue; }
        var nx = (ln.segs && ln.segs.length) ? ln.segs[0].x : 0;
        if (Math.abs(nx - numX) > 20) break; // a different column of numbers
        var parts = [], m = k + 1, lastStepY = ln.y;
        // backward: the number circle is vertically centred on its text, so
        // the step's first line can sit just above the number
        var m0 = k - 1;
        while (m0 >= 0 && !used[m0]) {
          var lv0 = lines[m0];
          if (/^\d{1,2}$/.test(lv0.text.trim())) break;
          var vx0 = (lv0.segs && lv0.segs.length) ? lv0.segs[0].x : 0;
          if (vx0 < numX + 15) break;
          if (Math.abs(lastStepY - lv0.y) > median * 1.3) break;
          if (lv0.size > median * 1.18) break;
          parts.unshift(lv0.text);
          used[m0] = true;
          lastStepY = lv0.y; m0--;
        }
        while (m < lines.length && !used[m]) {
          var lv = lines[m];
          if (/^\d{1,2}$/.test(lv.text.trim())) break;
          var vx = (lv.segs && lv.segs.length) ? lv.segs[0].x : 0;
          if (vx < numX + 15) break;                       // left column (spec card) — not ours
          if (Math.abs(lastStepY - lv.y) > median * 2.4) break;
          if (lv.size > median * 1.18) break;              // a heading
          parts.push(lv.text);
          lastStepY = lv.y; m++;
        }
        if (parts.length) {
          used[k] = true;
          for (var u = k + 1; u < m; u++) used[u] = true;
          steps.push(despace(parts.join(' ')));
          k = m;
        } else break;
      }
      if (steps.length >= 2) {
        blocks.push({ kind: 'steps', y: lines[i].y, steps: steps });
      }
    }

    // --- stage spec-cards: STAGE/OBJECTIVE/TIMING/OWNER label->value pairs --
    var SPEC = { STAGE: 1, OBJECTIVE: 1, TIMING: 1, OWNER: 1 };
    for (i = 0; i < lines.length; i++) {
      if (used[i] || !SPEC[despace(lines[i].text.trim())]) continue;
      var pairs = [];
      k = i;
      while (k < lines.length && !used[k] && SPEC[despace(lines[k].text.trim())]) {
        var lab = despace(lines[k].text.trim());
        var val = [], m2 = k + 1, lastPairY = lines[k].y;
        while (m2 < lines.length && !used[m2]) {
          var lv2 = lines[m2];
          if (/^\d{1,2}$/.test(lv2.text.trim())) break;   // a circled step number — not ours
          if (SPEC[despace(lv2.text.trim())] || isAllCapsLine(lv2.text.trim())) break;
          if (Math.abs(lastPairY - lv2.y) > median * 2.2) break;
          val.push(lv2.text);
          lastPairY = lv2.y; m2++;
        }
        if (!val.length) break;
        used[k] = true;
        for (var u2 = k + 1; u2 < m2; u2++) used[u2] = true;
        pairs.push([lab, val.join(' ')]);
        k = m2;
      }
      if (pairs.length >= 2) blocks.push({ kind: 'table', y: lines[i].y, head: [], rows: pairs.map(function (pr) { return [pr[0], despace(pr[1])]; }) });
    }

    // --- callouts: an ALL-CAPS label line + body ----------------------------
    for (i = 0; i < lines.length; i++) {
      if (used[i]) continue;
      var lt = lines[i].text.trim();
      if (!isAllCapsLine(lt) || lt.length > 70 || /[.!?]$/.test(lt)) continue;
      if (/^DEEP DIVE/.test(lt)) continue; // cross-reference pills stay inline
      var body = [];
      k = i + 1;
      var lastCY = lines[i].y;
      while (k < lines.length && !used[k]) {
        var lb = lines[k];
        if (/^\d{1,2}$/.test(lb.text.trim())) break;      // a circled step number
        if (Math.abs(lastCY - lb.y) > median * 2.2) break;
        if (isAllCapsLine(lb.text.trim()) && lb.text.trim().length <= 70) break;
        if (lb.size < lines[i].size - 1) break;
        body.push(lb.text);
        lastCY = lb.y; k++;
      }
      if (!body.length) continue;
      used[i] = true;
      for (var u3 = i + 1; u3 < k; u3++) used[u3] = true;
      var tone = /CONTROL|DO NOT|NOT REPLICATE|CONSTRAINT|WARNING|CAUTION|IMPORTANT/.test(lt) ? 'warning' : 'note';
      blocks.push({ kind: 'callout', y: lines[i].y, label: despace(lt), text: despace(body.join(' ')), tone: tone });
    }

    blocks.sort(function (a, b) { return b.y - a.y; }); // same top-first order as lines
    return { used: used, blocks: blocks };
  }


  function extractPdf(file) {
    if (!supported()) return Promise.reject(new Error('PDF engine failed to load (pdf.js). Check your connection and reload.'));
    ensureWorker();
    return file.arrayBuffer().then(function (buf) {
      return global.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pageCount = Math.min(doc.numPages, MAX_PAGES);
      var pages = [];
      var images = []; // {page, objId, isJpeg}
      var imgSeen = {}; // objId -> pages seen on (boilerplate logo filter)
      var chain = Promise.resolve();
      for (var p = 1; p <= pageCount; p++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return doc.getPage(pageNum).then(function (page) {
              return page.getTextContent().then(function (tc) {
                pages.push(pageLines(tc.items));
                return page.getOperatorList().then(function (ops) {
                  for (var i = 0; i < ops.fnArray.length; i++) {
                    var fn = ops.fnArray[i];
                    var OPS = global.pdfjsLib.OPS;
                    if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
                      var objId = ops.argsArray[i][0];
                      imgSeen[objId] = (imgSeen[objId] || 0) + 1;
                      images.push({ page: pageNum, objId: objId, isJpeg: fn === OPS.paintJpegXObject, doc: doc, pageObj: page });
                    }
                  }
                });
              });
            });
          });
        })(p);
      }
      return chain.then(function () {
        var assembled = assemble(pages, doc.numPages);
        return extractImages(images, imgSeen, pages, assembled.counts, assembled.threshold).then(function (imgs) {
          assembled.images = imgs;
          return assembled;
        });
      });
    });
  }

  function assemble(pages, totalPages) {
    var sizes = [];
    pages.forEach(function (lines) { lines.forEach(function (l) { sizes.push(l.size); }); });
    sizes.sort(function (a, b) { return a - b; });
    var median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 10;

    // Boilerplate: same normalized line on >=60% of pages (SOP mastheads,
    // "Page N of M" footers). Only when there are enough pages to judge.
    var counts = {};
    if (pages.length >= 3) {
      pages.forEach(function (lines) {
        var seen = {};
        lines.forEach(function (l) {
          var n = normLine(l.text);
          if (n.length < 4 || seen[n]) return;
          seen[n] = true;
          counts[n] = (counts[n] || 0) + 1;
        });
      });
    }
    var threshold = Math.ceil(pages.length * 0.6);

    // Secondary boilerplate tier: SHORT lines (≤4 words) repeated on many
    // pages (≥20%, min 3) are table side-labels / running headers that the
    // 60% masthead rule misses — e.g. "DoRM" role labels in the Commercial
    // playbooks, or repeated column captions. Numbered-heading-shaped lines
    // are exempt (real section numbers repeat legitimately across a TOC-free
    // document only via the heading itself).
    var looseThreshold = Math.max(3, Math.ceil(pages.length * 0.2));

    // TOC / cross-reference pages: pages dominated by number-like lines
    // ("0.1", "2.7 – 2.11", "3.2.1 · 3.2.4 · 3.3") contain no content — only
    // entries that would be misdetected as headings.
    var NUMLINE_RE = /^\d+(\.\d+)*(\s|$|[–—·])/;
    var isTocPage = pages.map(function (lines) {
      if (lines.length < 6) return false;
      var numLines = lines.filter(function (l) { return NUMLINE_RE.test(l.text.trim()); }).length;
      return numLines >= 6 && numLines >= lines.length * 0.5;
    });

    var paragraphs = []; // {text, heading, bullet, page, size, bold}
    var charCount = 0;
    var truncated = false;

    for (var p = 0; p < pages.length && !truncated; p++) {
      if (isTocPage[p]) continue;
      var lines = pages[p];
      // Structured blocks (tables / circled steps / callouts) are lifted out
      // first; their lines are skipped by the paragraph pass and the blocks
      // are interleaved back into the stream in page order.
      var blk = detectBlocks(lines, median);
      var blkPtr = 0;
      for (var i = 0; i < lines.length; i++) {
        while (blkPtr < blk.blocks.length && blk.blocks[blkPtr].y > lines[i].y) {
          paragraphs.push({ page: p, y: blk.blocks[blkPtr].y, block: blk.blocks[blkPtr] });
          blkPtr++;
        }
        if (blk.used[i]) continue;
        var l = lines[i];
        var n = normLine(l.text);
        if (counts[n] >= threshold) continue; // repeated masthead/footer line
        // Running-header format "4 · Section title" (chapter mastheads).
        if (/^\d+\s+·\s+\S/.test(l.text)) continue;
        // Short line repeated across many pages (table side-label etc.).
        if (counts[n] >= looseThreshold && l.text.split(/\s+/).length <= 4 &&
            !/^(?:\d+\.\s+\S|\d+(?:\.\d+)+\s+\S)/.test(l.text)) continue;

        // Heading signals, strongest first. Everything is measured against the
        // median line size so table-cell text (SMALLER than body prose) can
        // never become a heading. Lines that are clearly NOT headings:
        //  - sentence-like (internal '? ', terminal punctuation, >9 words, comma)
        //  - continuations (start lowercase, or with a quote mark)
        //  - table rows (a digit mid-line without leading number, trailing '•')
        //  - pure number/letter sequences from stepper graphics ("01 02 03", "A B C")
        var gapBefore = i === 0 || Math.abs(lines[i - 1].y - l.y) > median * 1.6;
        var gapAfter = i === lines.length - 1 || Math.abs(l.y - lines[i + 1].y) > median * 1.6;
        var wordCount = l.text.split(/\s+/).length;
        // "4. Director of Finance" (single level, trailing dot), "1.4 What…"
        // and "3.2.1 Packages…" (multi-level) — but not "4 weeks" or "0.1".
        var numberedShape = /^(?:\d+\.\s+\S|\d+(?:\.\d+)+\s+\S)/.test(l.text);
        // Numbered titles ("2.11 Room type, country of residence …") may carry
        // commas and run long — they are exempt from the sentence tests, which
        // exist to stop bold BODY lines and table rows becoming headings.
        var sentenceLike = numberedShape
          ? (/[.;:]$/.test(l.text) || wordCount > 12)
          : (/\?\s+\S/.test(l.text) || /[.;:,]$/.test(l.text) || /,/.test(l.text) || wordCount > 9);
        var startsLowerOrQuote = /^[a-z"'‘“]/.test(l.text);
        var midLineDigit = /\d/.test(l.text) && !numberedShape;
        var trailingBullet = /[•·]\s*$/.test(l.text);
        var glyphSequence = /^\d[\d\s·.\-–—]*$/.test(l.text) || /^([A-Z]\s+){1,}[A-Z]$/.test(l.text);
        // "60-70% offers · 30-40% packages" — but NOT step-numbered titles
        // like "01 Front Office" (digits, space, capitalised word).
        var metricCallout = /^\d/.test(l.text) && !numberedShape && !/^\d+\s+[A-Z]/.test(l.text);
        var notHeadingShape = sentenceLike || startsLowerOrQuote || midLineDigit || trailingBullet || glyphSequence || metricCallout;
        var isShort = l.text.length > 2 && l.text.length <= 60 && !notHeadingShape;
        // Numbered headings carry no size floor — an SOP's "1. Front Office"
        // sits slightly BELOW body size and is still the section title. The
        // numbered lookalikes to exclude are progress-stepper labels on
        // summary pages ("8.2 ASSESS", "6.4 TEST & ROLLOUT"): small, ALL-CAPS
        // duplicates of a real heading that exists on the following page.
        var numberTitle = numberedShape ? l.text.replace(/^(?:\d+\.\s+|\d+(?:\.\d+)+\s+)/, '') : '';
        var capsLetters = (numberTitle.match(/[A-Z]/g) || []).length;
        var stepperLabel = numberedShape && capsLetters >= 3 && !/[a-z]/.test(numberTitle) && l.size < median;
        var isNumberedHeading = numberedShape && l.text.length <= 90 &&
          gapBefore && !sentenceLike && !trailingBullet && !midLineDigit && !stepperLabel;
        // Display-font size overrides case: a 30pt lowercase line can still be
        // a heading continuation ("events" on a divider page). Unmerged
        // lowercase fragments are demoted to body in a later pass, so there is
        // no front-matter block here — SOP department headings are big-font
        // lines on pages 2-3 and must survive.
        var isBigFont = l.size > median * 1.18 &&
          !(sentenceLike || trailingBullet || glyphSequence || metricCallout || midLineDigit || /^["'‘“]/.test(l.text));
        // Plain bold short line: no size floor and no gap requirement — in
        // SOP documents the bold heading is the SAME size as (or slightly
        // smaller than) body text and tightly spaced ("Front Office" 11pt
        // bold among 12pt prose). The notHeadingShape filters are what keep
        // table rows and sentence-like bold lines out.
        var isBoldShort = l.bold && l.text.length <= 60 && !notHeadingShape;
        var isIsolatedShort = isShort && gapBefore && gapAfter && l.size >= median;
        var isHeading = (isBigFont || isBoldShort || isIsolatedShort || isNumberedHeading) &&
          l.text.length <= 120 && !/[<>]/.test(l.text) && !/:$/.test(l.text) && !/[.!?]["'”’]?$/.test(l.text);

        var bullet = false;
        var text = l.text;
        if (BULLET_RE.test(text)) {
          bullet = true;
          text = text.replace(BULLET_RE, '').trim();
        }

        var prev = paragraphs[paragraphs.length - 1];
        var gap = prev && prev.page === p ? Math.abs(prev.y - l.y) : Infinity;
        if (isHeading || bullet || !prev || prev.page !== p || prev.bullet || prev.heading || gap > median * 1.7) {
          paragraphs.push({ page: p, y: l.y, text: text, heading: isHeading, bullet: bullet, size: l.size, bold: l.bold });
        } else {
          prev.text += ' ' + text;
          prev.y = l.y;
        }
        charCount += text.length;
        if (charCount > MAX_CHARS) { truncated = true; break; }
      }
      while (blkPtr < blk.blocks.length) {
        paragraphs.push({ page: p, y: blk.blocks[blkPtr].y, block: blk.blocks[blkPtr] });
        blkPtr++;
      }
    }

    // Merge multi-line headings: a display-font title that wraps onto the next
    // line ("Special" / "events" on a divider page, or a long numbered title)
    // must become ONE heading, not a heading per fragment. Merges adjacent
    // heading paragraphs of matching size/weight when the first has no
    // terminal punctuation and the continuation isn't itself numbered.
    function canMerge(cur, nxt, median) {
      if (!cur || !nxt || !cur.heading || !nxt.heading) return false;
      if (cur.page !== nxt.page) return false;
      // Size match is the strong signal; mixed-font lines ("Test &" set in two
      // faces) may disagree on the bold flag, so it is not required.
      if (Math.abs(cur.size - nxt.size) > 0.6) return false;
      // Gap tolerance scales with the heading size: display-font titles have
      // large leading ("Special"/"events" at 30pt are ~36pt apart).
      if (Math.abs(cur.y - nxt.y) > Math.max(median * 2.4, cur.size * 2.4)) return false;
      if (/[.!?;:]$/.test(cur.text)) return false;
      if (/^(?:\d+\.\s+\S|\d+(?:\.\d+)+\s+\S)/.test(nxt.text)) return false;
      // Never merge two identical label lines ("Assess" + "Assess" repeats are
      // separate page headers, not one wrapped title).
      if (cur.text.trim().toLowerCase() === nxt.text.trim().toLowerCase()) return false;
      if ((cur.text + ' ' + nxt.text).length > 120) return false;
      return true;
    }
    for (var mi = 0; mi < paragraphs.length - 1; mi++) {
      var cur = paragraphs[mi];
      if (!cur.heading) continue;
      if (canMerge(cur, paragraphs[mi + 1], median)) {
        cur.text += ' ' + paragraphs[mi + 1].text;
        paragraphs.splice(mi + 1, 1);
        mi--; // the merged heading may continue onto a third line
        continue;
      }
      // Two-column layouts interleave a body line between the two halves of a
      // wrapped display title ("Test &" … "rollout"). Merge across at most
      // ONE intervening body paragraph, which stays right after the heading.
      var mid = paragraphs[mi + 1], far = paragraphs[mi + 2];
      if (mid && !mid.heading && far && canMerge(cur, far, median)) {
        cur.text += ' ' + far.text;
        paragraphs.splice(mi + 2, 1);
        mi--;
        continue;
      }
    }

    // Orphan fragments: any heading still starting with a lowercase letter
    // after merging is the second half of a wrapped title whose first half
    // was absorbed elsewhere (e.g. into the numbered heading line). Real
    // headings in these documents always start uppercase — demote the
    // fragment to body so it folds into the preceding section.
    paragraphs.forEach(function (pp) {
      if (pp.heading && /^[a-z]/.test(pp.text)) pp.heading = false;
    });

    return { paragraphs: paragraphs, pageCount: pages.length, totalPages: totalPages,
      truncated: truncated || (totalPages > MAX_PAGES), images: [], counts: counts, threshold: threshold };
  }

  /* ---- 2. figure capture (render + crop) ----------------------------------------
     Embedded-image extraction is unreliable across PDF producers (masks,
     Form XObjects, vector-drawn figures). Instead we render any page that
     paints non-boilerplate graphics to a canvas and crop away the repeated
     masthead/footer band — the remaining region IS the figure, whether it
     was raster or vector. Boilerplate is identified the same way as for
     text: lines repeated on most pages.
  ------------------------------------------------------------------------------- */

  var FIGURE_SCALE = 2;

  function isMostlyBlank(ctx, w, h) {
    var data = ctx.getImageData(0, 0, w, h).data;
    var dark = 0, total = 0;
    for (var i = 0; i < data.length; i += 4 * 97) {
      total++;
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) dark++;
    }
    return total === 0 || (dark / total) < 0.01;
  }

  function renderPageFigure(page, lines, boilerplateCount, boilerplateThreshold) {
    var viewport = page.getViewport({ scale: FIGURE_SCALE });
    var vh1 = page.getViewport({ scale: 1 }).height;

    // Crop band: masthead = boilerplate lines in the page's top half (high
    // pdf-y), footer = boilerplate lines in the bottom half (low pdf-y).
    var mastBottom = null, footTop = null;
    lines.forEach(function (l) {
      if ((boilerplateCount[normLine(l.text)] || 0) < boilerplateThreshold) return;
      if (l.y > vh1 / 2) mastBottom = mastBottom == null ? l.y : Math.min(mastBottom, l.y);
      else footTop = footTop == null ? l.y : Math.max(footTop, l.y);
    });
    var padTop = 18, padBottom = 24;
    var cropTop = mastBottom != null ? (vh1 - mastBottom - padTop) * FIGURE_SCALE : 0;
    var cropBottom = footTop != null ? (vh1 - footTop - padBottom) * FIGURE_SCALE : viewport.height;
    if (cropBottom - cropTop < 80 * FIGURE_SCALE) { cropTop = 0; cropBottom = viewport.height; }

    var full = document.createElement('canvas');
    full.width = viewport.width; full.height = viewport.height;
    var fctx = full.getContext('2d');
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, full.width, full.height);
    return page.render({ canvasContext: fctx, viewport: viewport }).promise.then(function () {
      var w = full.width;
      var h = Math.max(1, Math.round(cropBottom - cropTop));
      var crop = document.createElement('canvas');
      crop.width = w; crop.height = h;
      var cctx = crop.getContext('2d');
      cctx.fillStyle = '#ffffff';
      cctx.fillRect(0, 0, w, h);
      cctx.drawImage(full, 0, Math.round(cropTop), w, h, 0, 0, w, h);
      if (isMostlyBlank(cctx, w, h)) return null;
      if (crop.width > MAX_IMG_WIDTH) {
        var scale = MAX_IMG_WIDTH / crop.width;
        var down = document.createElement('canvas');
        down.width = MAX_IMG_WIDTH; down.height = Math.round(crop.height * scale);
        down.getContext('2d').drawImage(crop, 0, 0, down.width, down.height);
        crop = down;
      }
      return crop.toDataURL('image/jpeg', 0.85);
    });
  }

  function extractImages(images, imgSeen, pages, counts, threshold) {
    // Pages that paint at least one non-boilerplate graphic get a figure.
    var boilerplateIds = {};
    Object.keys(imgSeen).forEach(function (id) { if (imgSeen[id] >= 3) boilerplateIds[id] = true; });
    var figurePages = {};
    images.forEach(function (im) {
      if (boilerplateIds[im.objId]) return;
      if (im.page === 1 && pages.length >= 3) return; // page 1 masthead/logo, not a figure
      figurePages[im.page] = im.pageObj;
    });
    var out = [];
    var chain = Promise.resolve();
    Object.keys(figurePages).forEach(function (pageNum) {
      var n = parseInt(pageNum, 10);
      chain = chain.then(function () {
        return renderPageFigure(figurePages[n], pages[n - 1] || [], counts, threshold).then(function (dataUrl) {
          if (dataUrl) out.push({ page: n, dataUrl: dataUrl });
        }).catch(function () { /* a page that fails to render is skipped, never fatal */ });
      });
    });
    return chain.then(function () { return out; });
  }

  /* ---- 3. segmentation (deterministic) ----------------------------------------- */

  var WRAPPER_NAMES = /^(procedures?|process(es)?|steps?|workflow)\b/i;
  var NUMBERED_STEP = /^\s*(\d+[.)]|[A-Z][.)]|[ivxlcdm]+[.)])/i;

  function cleanTitle(fileName, sections) {
    var t = String(fileName || '').replace(/\.pdf$/i, '')
      .replace(/\s*\(\d+\)\s*$/, '')           // "(1)" download suffix
      .replace(/^\w+\s*\d+\s+SOP\s*\d+\s*[-–]\s*/i, '') // "A 01 SOP 04 - "
      .replace(/^SOP\s*\d+\s*[-–]\s*/i, '')
      .trim();
    if (!t && sections.length) t = sections[0].title;
    return t || 'Imported chapter';
  }

  // Split paragraphs into sections at heading lines; fold wrapper headings
  // ("Procedures", "Process", "Steps", "Workflow") and bodiless unnumbered
  // headings into the first substantive section that follows — a wrapper is
  // always viewable together with its first step.
  function segment(paragraphs) {
    var sections = [];
    var cur = null;
    paragraphs.forEach(function (p) {
      if (p.heading) {
        cur = { title: p.text, paragraphs: [], bullets: [], images: [], blocks: [], mixed: [], startPage: p.page };
        sections.push(cur);
        return;
      }
      if (!cur) { // content before the first heading (rare after boilerplate strip)
        cur = { title: '', paragraphs: [], bullets: [], images: [], blocks: [], mixed: [], startPage: p.page };
        sections.push(cur);
      }
      if (p.block) { cur.blocks.push(p.block); cur.mixed.push({ block: p.block }); }
      else if (p.bullet) { cur.bullets.push(p.text); cur.mixed.push({ bullet: p.text }); }
      else cur.paragraphs.push(p.text);
    });

    // Attach images to the section covering their page.
    return sections;
  }

  function attachImages(sections, images) {
    images.forEach(function (img) {
      var target = null;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        var nextStart = i + 1 < sections.length ? sections[i + 1].startPage : Infinity;
        if (img.page >= s.startPage && img.page < nextStart) target = s;
      }
      if (!target && sections.length) target = sections[sections.length - 1];
      if (target) {
        var n = target.images.length + 1;
        target.images.push({ caption: target.title ? (target.title + ' — figure ' + n) : ('Figure ' + n), dataUrl: img.dataUrl });
      }
    });
  }

  function foldWrappers(sections, opts) {
    opts = opts || {};
    var out = [];
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var bodyChars = s.paragraphs.join(' ').length + s.bullets.join(' ').length;
      var isWrapper = !NUMBERED_STEP.test(s.title) && i < sections.length - 1 &&
        (opts.onlyEmpty ? bodyChars === 0
                        : (bodyChars < 200 && (WRAPPER_NAMES.test(s.title) || bodyChars === 0 || !s.title)));
      if (isWrapper && out.length >= 0) {
        var nxt = sections[i + 1];
        var introBits = [];
        if (s.title) introBits.push(s.title + ':');
        nxt.paragraphs = [introBits.concat(s.paragraphs).join(' ')].concat(nxt.paragraphs).filter(function (x) { return x; });
        nxt.bullets = s.bullets.concat(nxt.bullets);
        nxt.images = s.images.concat(nxt.images);
        continue;
      }
      out.push(s);
    }
    return out.filter(function (s) {
      return s.title && (s.paragraphs.length || s.bullets.length || s.images.length);
    });
  }

  function buildResult(extracted, fileName) {
    var sections = segment(extracted.paragraphs);
    attachImages(sections, extracted.images || []);
    // Wrapper headings ("Procedures" etc.) stay VISIBLE as grouping headings
    // when they carry intro text; only completely bodiless ones fold into the
    // section that follows. Fuller folding happens only in "Sections as
    // chapters" mode (editor.js), where a bodiless wrapper would otherwise
    // become an empty chapter.
    sections = foldWrappers(sections, { onlyEmpty: true });
    if (!sections.length) {
      throw new Error('Could not find any structured sections in this document. Is it a text-based PDF (not a scan)?');
    }
    var firstBody = '';
    for (var i = 0; i < sections.length && !firstBody; i++) {
      firstBody = sections[i].paragraphs[0] || '';
    }
    return {
      result: {
        chapter: { title: cleanTitle(fileName, sections), blurb: firstBody.slice(0, 300) },
        sections: sections
      },
      extracted: extracted
    };
  }

  /* ---- 4. schema mapping (shared by both insert modes) ------------------------- */

  function blockToItem(b) {
    if (b.kind === 'table') {
      return { s: 'table', name: (b.head && b.head.length ? b.head.join(' \u00b7 ') : 'Details'), head: b.head || [], rows: b.rows || [] };
    }
    if (b.kind === 'callout') {
      return { s: 'callout', name: b.label, label: b.label, text: b.text, tone: b.tone || 'note' };
    }
    if (b.kind === 'steps') {
      return { s: 'timeline', variant: 'steps', mode: 'all', name: 'Steps',
        steps: (b.steps || []).map(function (t, i) { return { label: 'Step ' + (i + 1), text: t, url: '' }; }) };
    }
    return null;
  }

  function sectionItems(s) {
    var items = [];
    if ((s.mixed || []).length) {
      // stream order: bullets and structured blocks interleaved as extracted
      s.mixed.forEach(function (en) {
        if (en.bullet) { items.push(en.bullet); return; }
        var it = blockToItem(en.block);
        if (it) items.push(it);
      });
    } else {
      items = (s.bullets || []).slice();
    }
    (s.images || []).forEach(function (img) {
      items.push({ s: 'image', name: img.caption, url: img.dataUrl });
    });
    return items;
  }

  function toSectionsBody(result) {
    return {
      intro: result.chapter.blurb ? [result.chapter.blurb] : [],
      sections: result.sections.map(function (s, i) {
        return {
          num: String(i + 1),
          title: s.title || ('Section ' + (i + 1)),
          blurb: s.paragraphs || [],
          items: sectionItems(s)
        };
      })
    };
  }

  global.PdfImport = {
    supported: supported,
    extractPdf: extractPdf,
    buildResult: buildResult,
    toSectionsBody: toSectionsBody,
    sectionItems: sectionItems,
    foldWrappers: foldWrappers
  };
})(window);
