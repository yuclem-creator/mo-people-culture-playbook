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
  var MAX_PAGES = 50;
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
      if (!lines[key]) lines[key] = { y: y, size: 0, bold: false, parts: [] };
      lines[key].size = Math.max(lines[key].size, size);
      if (/bold|black|semibold|demi/i.test(it.fontName || '')) lines[key].bold = true;
      lines[key].parts.push(it.str);
    });
    return Object.keys(lines).map(function (k) {
      var l = lines[k];
      return { y: l.y, size: l.size, bold: l.bold, text: l.parts.join(' ').replace(/\s+/g, ' ').trim() };
    }).sort(function (a, b) { return b.y - a.y; }); // pdf y grows upward
  }

  var BULLET_RE = /^[\u2022\u00b7\u25aa\u25e6\u2023\-\u2013\u2014*]\s+/;

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

    var paragraphs = []; // {text, heading, bullet, page}
    var charCount = 0;
    var truncated = false;

    for (var p = 0; p < pages.length && !truncated; p++) {
      var lines = pages[p];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        var n = normLine(l.text);
        if (counts[n] >= threshold) continue; // repeated masthead/footer line

        // Heading signals, strongest first: larger font, bold face, or a short
        // punctuation-less line isolated by vertical gaps. Lines ending with
        // ':' are sub-headings (kept as body lines) and lines containing
        // <...> are exhibit references, not headings.
        var gapBefore = i === 0 || Math.abs(lines[i - 1].y - l.y) > median * 1.6;
        var gapAfter = i === lines.length - 1 || Math.abs(l.y - lines[i + 1].y) > median * 1.6;
        var isShort = l.text.length > 2 && l.text.length <= 60 && !/[.,;:]$/.test(l.text);
        var isNumberedHeading = /^\s*\d+\.\s+\S/.test(l.text) && l.text.length <= 80 && gapBefore;
        var isHeading = ((l.size > median * 1.18) || (l.bold && l.text.length <= 90) ||
          (isShort && gapBefore && gapAfter) || isNumberedHeading) && l.text.length <= 120 &&
          !/[<>]/.test(l.text) && !/:$/.test(l.text);

        var bullet = false;
        var text = l.text;
        if (BULLET_RE.test(text)) {
          bullet = true;
          text = text.replace(BULLET_RE, '').trim();
        }

        var prev = paragraphs[paragraphs.length - 1];
        var gap = prev && prev.page === p ? Math.abs(prev.y - l.y) : Infinity;
        if (isHeading || bullet || !prev || prev.page !== p || prev.bullet || prev.heading || gap > median * 1.7) {
          paragraphs.push({ page: p, y: l.y, text: text, heading: isHeading, bullet: bullet });
        } else {
          prev.text += ' ' + text;
          prev.y = l.y;
        }
        charCount += text.length;
        if (charCount > MAX_CHARS) { truncated = true; break; }
      }
    }

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
        cur = { title: p.text, paragraphs: [], bullets: [], images: [], startPage: p.page };
        sections.push(cur);
        return;
      }
      if (!cur) { // content before the first heading (rare after boilerplate strip)
        cur = { title: '', paragraphs: [], bullets: [], images: [], startPage: p.page };
        sections.push(cur);
      }
      if (p.bullet) cur.bullets.push(p.text);
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

  function foldWrappers(sections) {
    var out = [];
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var bodyChars = s.paragraphs.join(' ').length + s.bullets.join(' ').length;
      var isWrapper = !NUMBERED_STEP.test(s.title) && bodyChars < 200 && i < sections.length - 1 &&
        (WRAPPER_NAMES.test(s.title) || bodyChars === 0 || !s.title);
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
    sections = foldWrappers(sections);
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

  function sectionItems(s) {
    var items = (s.bullets || []).slice();
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
    sectionItems: sectionItems
  };
})(window);
