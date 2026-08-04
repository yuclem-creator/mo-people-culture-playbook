/* ============================================================================
   export.js — client-side SCORM 1.2 package builder (uses JSZip from CDN)
   ----------------------------------------------------------------------------
   Produces a fully self-contained, offline course:
     - index.html            (renderer shell, CSS inline, script tags injected)
     - playbook-data.js       (sets window.PLAYBOOK; asset paths, not data URLs)
     - app.js, playbook-content.js, mo-brand.css   (data-driven renderer)
     - scorm_api.js, scorm_hook.js                 (SCORM plumbing, verbatim)
     - imsmanifest.xml (title/id/mastery substituted) + 4 XSD schemas
     - img/*, video/*  (bundled originals + any uploaded images decoded to files)
   The manifest sits at the ZIP ROOT. No network calls at runtime.
   ============================================================================ */
(function () {
  'use strict';

  var BASE = 'preview-engine/';

  function textFile(path) {
    return fetch(BASE + path).then(function (r) {
      if (!r.ok) throw new Error('Missing ' + path);
      return r.text();
    });
  }
  function binFile(path) {
    return fetch(BASE + path).then(function (r) {
      if (!r.ok) throw new Error('Missing ' + path);
      return r.blob();
    });
  }

  function dataUrlToParts(dataUrl) {
    // data:<mime>;base64,<payload>
    var m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
    if (!m) return null;
    return { mime: m[1] || 'application/octet-stream', base64: !!m[2], payload: m[3] };
  }
  function extFor(mime) {
    var map = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
      'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm' };
    return map[mime] || 'bin';
  }

  // Deep-clone PLAYBOOK and replace embedded data URLs with real file paths.
  // Returns { playbook, extraFiles: {path: {base64|blob}} }.
  function externalizeAssets(pb) {
    var clone = JSON.parse(JSON.stringify(pb));
    var extra = {};   // path -> { base64: string } or { text }
    var assets = clone.assets || {};
    var pathMap = {}; // old asset-key -> new relative path

    Object.keys(assets).forEach(function (key, i) {
      var dataUrl = assets[key];
      if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) {
        // already a path — keep as-is
        return;
      }
      var parts = dataUrlToParts(dataUrl);
      if (!parts) return;
      var folder = key.indexOf('video/') === 0 ? 'video/' : 'img/';
      var base = key.replace(/^(img|video)\//, '').replace(/\.[^.]+$/, '');
      var fname = folder + (base || ('asset_' + i)) + '.' + extFor(parts.mime);
      pathMap[key] = fname;
      extra[fname] = { base64: parts.base64 ? parts.payload : btoa(unescape(encodeURIComponent(parts.payload))) };
    });

    // In the exported package, assets are real files, so PLAYBOOK.assets must be
    // empty (the renderer then resolves img/<filename> straight to the bundled
    // files). The filenames referenced across the playbook already match the
    // externalised paths because uploads store a matching img/<name> key.
    // We rewrite any prose/struct field that pointed at an uploaded key's bare
    // name so it points at the new file's bare name.
    var renameBare = {}; // oldBare -> newBare
    Object.keys(pathMap).forEach(function (k) {
      var oldBare = k.replace(/^(img|video)\//, '');
      var newBare = pathMap[k].replace(/^(img|video)\//, '');
      if (oldBare !== newBare) renameBare[oldBare] = newBare;
    });
    if (Object.keys(renameBare).length) {
      var json = JSON.stringify(clone);
      Object.keys(renameBare).forEach(function (o) {
        json = json.split(o).join(renameBare[o]);
      });
      clone = JSON.parse(json);
    }
    clone.assets = {};  // decoded to real files
    return { playbook: clone, extraFiles: extra, uploaded: pathMap };
  }

  function buildIndexHtml(indexSrc, requiredPages) {
    // Inject SCORM scripts + playbook-data + required-pages into the renderer shell.
    var reqScript = '<script>window.SCORM_REQUIRED_PAGES = ' + JSON.stringify(requiredPages) + ';<\/script>\n';
    var head = reqScript + '<script src="scorm_api.js"><\/script>\n';
    // put scorm_api + required pages right before </head> (api must exist early)
    var out = indexSrc.replace('</head>', head + '</head>');
    // load playbook-data.js before app.js; scorm_hook.js after app.js
    out = out.replace('<script src="playbook-content.js"><\/script>',
      '<script src="playbook-data.js"><\/script>\n<script src="playbook-content.js"><\/script>');
    out = out.replace('<script src="app.js"><\/script>',
      '<script src="app.js"><\/script>\n<script src="ask.js"><\/script>\n<script src="scorm_hook.js"><\/script>');
    return out;
  }

  function buildManifest(manifestSrc, meta) {
    var s = meta.scorm || {};
    var id = s.identifier || 'MO_PLAYBOOK_MANIFEST';
    var title = escapeXml(s.title || meta.title || 'Playbook');
    var mastery = String(s.masteryScore != null ? s.masteryScore : 100);
    var out = manifestSrc;
    out = out.replace(/identifier="MO_PC_PLAYBOOK_MANIFEST"/g, 'identifier="' + escapeXml(id) + '"');
    // replace both <title><langstring> and org/item titles
    out = out.replace(/<langstring xml:lang="en">[^<]*<\/langstring>/,
      '<langstring xml:lang="en">' + title + '</langstring>');
    out = out.replace(/<title>Mandarin Oriental — People &amp; Culture Playbook<\/title>/g, '<title>' + title + '</title>');
    out = out.replace(/<title>People &amp; Culture Playbook<\/title>/g, '<title>' + title + '</title>');
    out = out.replace(/<adlcp:masteryscore>\d+<\/adlcp:masteryscore>/, '<adlcp:masteryscore>' + mastery + '</adlcp:masteryscore>');
    // ensure playbook-data.js + scorm files are listed as resource files
    out = out.replace('<file href="playbook-content.js"/>',
      '<file href="playbook-data.js"/>\n      <file href="playbook-content.js"/>');
    return out;
  }
  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Export-time image compression ----------------------------------------
  // Re-encode large embedded images for the PACKAGE copy (the author's saved
  // draft is untouched): downscale to 1600px max, JPEG q0.82 on a white
  // matte (safe for alpha PNGs). SVG / animated GIF pass through.
  var IMG_COMPRESS_ABOVE = 700 * 1024;
  var IMG_MAX_DIM = 1600;
  function compressImageDataUrl(dataUrl) {
    return new Promise(function (resolve) {
      try {
        var parts = /^data:([^;,]+)?;base64,(.*)$/.exec(dataUrl);
        if (!parts) return resolve(dataUrl);
        if (parts[1] === 'image/svg+xml' || parts[1] === 'image/gif') return resolve(dataUrl);
        var approxBytes = Math.floor(parts[2].length * 3 / 4);
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth, h = img.naturalHeight;
            if (approxBytes <= IMG_COMPRESS_ABOVE && Math.max(w, h) <= IMG_MAX_DIM) return resolve(dataUrl);
            var scale = Math.min(1, IMG_MAX_DIM / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
            var c = document.createElement('canvas');
            c.width = cw; c.height = ch;
            var g = c.getContext('2d');
            g.fillStyle = '#ffffff'; g.fillRect(0, 0, cw, ch);
            g.drawImage(img, 0, 0, cw, ch);
            var out = c.toDataURL('image/jpeg', 0.82);
            resolve(out.length < dataUrl.length ? out : dataUrl);
          } catch (e) { resolve(dataUrl); }
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      } catch (e) { resolve(dataUrl); }
    });
  }

  // Returns a Promise of a pb clone whose large img/* data URLs are compressed.
  function compressImagesForExport(pb) {
    var clone = JSON.parse(JSON.stringify(pb));
    var assets = clone.assets || {};
    var keys = Object.keys(assets).filter(function (k) {
      return k.indexOf('img/') === 0 && typeof assets[k] === 'string' && assets[k].indexOf('data:') === 0;
    });
    var chain = Promise.resolve();
    keys.forEach(function (k) {
      chain = chain.then(function () {
        return compressImageDataUrl(assets[k]).then(function (out) { assets[k] = out; });
      });
    });
    return chain.then(function () { return clone; });
  }

  // Drop decoded/bundled asset files that the playbook JSON never references
  // (leftover uploads, or seed library media irrelevant to this playbook) —
  // the single biggest SCORM size win for imported playbooks.
  function filterUnreferenced(extraFiles, playbookJson) {
    var keep = {};
    Object.keys(extraFiles || {}).forEach(function (path) {
      var bare = path.replace(/^(img|video)\//, '');
      if (playbookJson.indexOf(bare) !== -1) keep[path] = extraFiles[path];
    });
    return keep;
  }

  // Expose shared helpers so publish.js and export-remote.js can reuse the
  // exact same data-URL decode logic instead of duplicating/rewriting it.
  window.__scormExportHelpers = {
    externalizeAssets: externalizeAssets,
    dataUrlToParts: dataUrlToParts,
    extFor: extFor,
    escapeXml: escapeXml,
    buildManifest: buildManifest,
    buildIndexHtml: buildIndexHtml,
    textFile: textFile,
    binFile: binFile,
    compressImageDataUrl: compressImageDataUrl,
    compressImagesForExport: compressImagesForExport,
    filterUnreferenced: filterUnreferenced,
    BASE: BASE
  };

  window.buildScormPackage = function (pb, requiredPages, cb) {
    cb = cb || {};
    if (!window.JSZip) { (cb.fail || function(){})(new Error('JSZip not loaded')); return; }
    var zip = new JSZip();

    var TEXT = ['index.html', 'app.js', 'ask.js', 'playbook-content.js', 'mo-brand.css',
      'scorm_api.js', 'scorm_hook.js', 'imsmanifest.xml',
      'adlcp_rootv1p2.xsd', 'ims_xml.xsd', 'imscp_rootv1p1p2.xsd', 'imsmd_rootv1p2p1.xsd'];

    // Autocompress: large images are re-encoded for the package, and media
    // the playbook never references is left out of the zip entirely.
    compressImagesForExport(pb).then(function (pbSlim) {
      var ext = externalizeAssets(pbSlim);
      var pbJson = JSON.stringify(ext.playbook);
      ext.extraFiles = filterUnreferenced(ext.extraFiles, pbJson);

      return Promise.all([
        Promise.all(TEXT.map(function (f) { return textFile(f).then(function (t) { return { f: f, t: t }; }); })),
        fetch(BASE + 'asset-manifest.json').then(function (r) { return r.json(); })
      ]).then(function (res) {
      var texts = {};
      res[0].forEach(function (o) { texts[o.f] = o.t; });
      var bundledAssets = res[1];   // list of img/* and video/*

      // 1. Transformed index.html + manifest
      zip.file('index.html', buildIndexHtml(texts['index.html'], requiredPages));
      zip.file('imsmanifest.xml', buildManifest(texts['imsmanifest.xml'], pb.meta || {}));

      // 2. Verbatim renderer + plumbing + schemas
      ['app.js', 'ask.js', 'playbook-content.js', 'mo-brand.css', 'scorm_api.js', 'scorm_hook.js',
        'adlcp_rootv1p2.xsd', 'ims_xml.xsd', 'imscp_rootv1p1p2.xsd', 'imsmd_rootv1p2p1.xsd']
        .forEach(function (f) { zip.file(f, texts[f]); });

      // 3. playbook-data.js
      zip.file('playbook-data.js',
        '/* Generated by MO Playbook Studio. Sets the data-driven PLAYBOOK. */\n' +
        'window.PLAYBOOK = ' + JSON.stringify(ext.playbook) + ';\n');

      // 4. Uploaded/decoded assets
      Object.keys(ext.extraFiles).forEach(function (path) {
        zip.file(path, ext.extraFiles[path].base64, { base64: true });
      });

      // 5. Bundled original assets (skip any that an upload already replaced,
      //    and any the playbook JSON never references — e.g. the seed media
      //    library inside an imported Finance playbook)
      var replaced = {};
      Object.keys(ext.uploaded).forEach(function (k) { replaced[ext.uploaded[k]] = true; });
      var needed = bundledAssets.filter(function (p) {
        if (replaced[p]) return false;
        return pbJson.indexOf(p.replace(/^(img|video)\//, '')) !== -1;
      });

      return Promise.all(needed.map(function (p) {
        return binFile(p).then(function (blob) { zip.file(p, blob); }).catch(function () {/* skip missing */});
      })).then(function () { return zip; });
      });
    }).then(function (zip) {
      return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    }).then(function (blob) {
      var sizeMb = (blob.size / 1048576).toFixed(1);
      var name = (pb.meta && pb.meta.title ? pb.meta.title : 'playbook')
        .toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') + '-scorm12.zip';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      (cb.toast || function(){})('Exported ' + name + ' (' + sizeMb + ' MB)', 'ok');
      (cb.done || function(){})();
    }).catch(function (e) { (cb.fail || function(){})(e); });
  };
})();
