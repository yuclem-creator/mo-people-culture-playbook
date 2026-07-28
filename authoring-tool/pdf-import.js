/* ============================================================================
   pdf-import.js — "Course Creation" engine for MO Playbook Studio
   ----------------------------------------------------------------------------
   Turns an uploaded PDF into a structured playbook chapter:

     1. extractPdf(file)     — text + layout extraction in the browser (pdf.js).
                               The file never leaves the author's machine; only
                               extracted text is sent onward.
                               Strips repeated page headers/footers (SOP
                               mastheads, page numbers) and detects headings
                               from font sizes/bold flags.
     2. structureChapter()   — calls the Supabase Edge Function
                               'structure-document' (the LLM lives there; only
                               signed-in authors can call it).
     3. toSectionsBody()     — maps the AI result onto the playbook schema
                               ({intro, sections:[{num,title,blurb,items}]}).

   Exposed as window.PdfImport. UI glue lives in editor.js.
   ============================================================================ */
(function (global) {
  'use strict';

  var PDFJS_VERSION = '3.11.174';
  var PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VERSION + '/build/';
  var MAX_PAGES = 50;
  var MAX_CHARS = 60000;

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

  // Group pdf.js text items into visual lines per page.
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

  function extractPdf(file) {
    if (!supported()) return Promise.reject(new Error('PDF engine failed to load (pdf.js). Check your connection and reload.'));
    ensureWorker();
    return file.arrayBuffer().then(function (buf) {
      return global.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pageCount = Math.min(doc.numPages, MAX_PAGES);
      var pages = [];
      var chain = Promise.resolve();
      for (var p = 1; p <= pageCount; p++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return doc.getPage(pageNum).then(function (page) {
              return page.getTextContent().then(function (tc) {
                pages.push(pageLines(tc.items));
              });
            });
          });
        })(p);
      }
      return chain.then(function () { return assemble(pages, doc.numPages); });
    });
  }

  function assemble(pages, totalPages) {
    // Median font size across all lines.
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

    var headingCandidates = [];
    var paragraphs = [];
    var charCount = 0;
    var truncated = false;

    for (var p = 0; p < pages.length && !truncated; p++) {
      var lines = pages[p];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        var n = normLine(l.text);
        if (counts[n] >= threshold) continue; // repeated masthead/footer line
        // Heading signals, strongest first: larger font, bold face, or a short
        // punctuation-less line isolated by vertical gaps (typical for SOP
        // section headings, whose fonts are often subset-embedded with no
        // readable bold flag).
        var gapBefore = i === 0 || Math.abs(lines[i - 1].y - l.y) > median * 1.6;
        var gapAfter = i === lines.length - 1 || Math.abs(l.y - lines[i + 1].y) > median * 1.6;
        var isShort = l.text.length > 2 && l.text.length <= 60 && !/[.,;:]$/.test(l.text);
        var isHeading = ((l.size > median * 1.18) || (l.bold && l.text.length <= 90) ||
          (isShort && gapBefore && gapAfter)) && l.text.length <= 120;
        if (isHeading && headingCandidates.length < 40 && headingCandidates.indexOf(l.text) < 0) {
          headingCandidates.push(l.text);
        }
        var prev = paragraphs[paragraphs.length - 1];
        var gap = prev && prev.page === p ? Math.abs(prev.y - l.y) : Infinity;
        if (isHeading || !prev || prev.page !== p || gap > median * 1.7) {
          paragraphs.push({ page: p, y: l.y, text: l.text, heading: isHeading });
        } else {
          prev.text += ' ' + l.text;
          prev.y = l.y;
        }
        charCount += l.text.length;
        if (charCount > MAX_CHARS) { truncated = true; break; }
      }
    }

    var text = paragraphs.map(function (para) {
      return (para.heading ? '\n' : '') + para.text;
    }).join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return {
      text: text,
      headingCandidates: headingCandidates,
      pageCount: pages.length,
      totalPages: totalPages,
      truncated: truncated || (totalPages > MAX_PAGES)
    };
  }

  /* ---- 2. AI structuring (via Edge Function) --------------------------------- */

  function functionsBase() {
    var cfg = global.SUPABASE_CONFIG || {};
    if (cfg.functionsUrl) return String(cfg.functionsUrl).replace(/\/$/, '');
    return String(cfg.url || '').replace(/\/$/, '') + '/functions/v1';
  }

  function structureChapter(extracted, opts) {
    opts = opts || {};
    if (!global.PlaybookPublish || !global.PlaybookPublish.getSession) {
      return Promise.reject(new Error('Sign-in is required for PDF import.'));
    }
    return global.PlaybookPublish.getSession().then(function (session) {
      if (!session || !session.access_token) {
        var e = new Error('AUTH_REQUIRED');
        e.code = 'AUTH_REQUIRED';
        throw e;
      }
      var cfg = global.SUPABASE_CONFIG || {};
      return fetch(functionsBase() + '/structure-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.anonKey || '',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          docName: opts.docName || 'document.pdf',
          text: extracted.text,
          headingCandidates: extracted.headingCandidates || []
        })
      }).then(function (r) {
        return r.json().then(function (j) {
          if (r.status === 401) {
            var e1 = new Error('AUTH_REQUIRED');
            e1.code = 'AUTH_REQUIRED';
            throw e1;
          }
          if (r.status === 404) {
            throw new Error('The PDF import service is not deployed yet — run the Edge Function deploy steps (supabase/README.md).');
          }
          if (!r.ok) throw new Error(j.error || ('Import failed (HTTP ' + r.status + ')'));
          return validateResult(j);
        });
      });
    });
  }

  function validateResult(j) {
    var chapter = (j && j.chapter) || {};
    var sections = Array.isArray(j && j.sections) ? j.sections : [];
    if (!chapter.title || !sections.length) {
      throw new Error('The AI could not find a structure in this document. Try a text-based PDF (not a scan).');
    }
    return {
      chapter: { title: String(chapter.title), blurb: String(chapter.blurb || '') },
      sections: sections.map(function (s) {
        return {
          title: String(s.title || ''),
          paragraphs: Array.isArray(s.paragraphs) ? s.paragraphs.map(String) : [],
          bullets: Array.isArray(s.bullets) ? s.bullets.map(String) : []
        };
      })
    };
  }

  /* ---- 3. schema mapping ------------------------------------------------------ */

  function toSectionsBody(result) {
    return {
      intro: result.chapter.blurb ? [result.chapter.blurb] : [],
      sections: result.sections.map(function (s, i) {
        return {
          num: String(i + 1),
          title: s.title || ('Section ' + (i + 1)),
          blurb: s.paragraphs || [],
          items: s.bullets || []
        };
      })
    };
  }

  global.PdfImport = {
    supported: supported,
    extractPdf: extractPdf,
    structureChapter: structureChapter,
    toSectionsBody: toSectionsBody
  };
})(window);
