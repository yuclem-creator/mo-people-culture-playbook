/* ============================================================================
   export-remote.js — client-side "Remote SCORM" package builder
   ----------------------------------------------------------------------------
   Produces a MUCH smaller SCORM 1.2 zip than export.js's offline package:
   the renderer shell + plumbing, but NO bundled playbook-data.js and NO
   bundled img/video (except a small offline-safe fallback snapshot of the
   CURRENT project state). At runtime the shell fetches the latest published
   content from Supabase Storage (see publish.js / REMOTE_SCORM_SPEC.md Part 4)
   and falls back to the bundled snapshot if that fetch fails.

   Reuses export.js's asset-decode logic (window.__scormExportHelpers) rather
   than duplicating it, per spec.
   ============================================================================ */
(function () {
  'use strict';

  function buildManifestForRemote(manifestSrc, meta, helpers) {
    // Same title/identifier/mastery substitutions as the offline manifest, but
    // the resource file list must name what the remote package actually ships:
    // no playbook-data.js (content is fetched from the cloud at launch) —
    // remote-config.js, remote-loader.js and fallback-playbook-data.js take
    // its place in the package.
    var out = helpers.buildManifest(manifestSrc, meta);
    out = out.replace('      <file href="playbook-data.js"/>\n', '');
    out = out.replace('<file href="playbook-content.js"/>',
      '<file href="remote-config.js"/>\n' +
      '      <file href="remote-loader.js"/>\n' +
      '      <file href="fallback-playbook-data.js"/>\n' +
      '      <file href="playbook-content.js"/>');
    return out;
  }

  window.buildRemoteScormPackage = function (pb, requiredPages, slug, cb) {
    cb = cb || {};
    var helpers = window.__scormExportHelpers;
    if (!window.JSZip) { (cb.fail || function () {})(new Error('JSZip not loaded')); return; }
    if (!helpers) { (cb.fail || function () {})(new Error('export.js helpers not loaded')); return; }
    if (!slug) { (cb.fail || function () {})(new Error('This playbook needs a title (or a Publish slug set in Settings) before exporting.')); return; }

    var zip = new JSZip();
    var BASE = helpers.BASE;
    var cfg = window.SUPABASE_CONFIG || { url: '', bucket: 'playbook-content' };
    var contentUrl = cfg.url + '/storage/v1/object/public/' + (cfg.bucket || 'playbook-content') +
      '/published/' + slug + '/playbook-data.json';

    // Files needed to RENDER (shell + plumbing), reused verbatim.
    var TEXT_SHELL = ['index.html', 'app.js', 'ask.js', 'playbook-content.js', 'mo-brand.css',
      'scorm_api.js', 'scorm_hook.js', 'imsmanifest.xml',
      'adlcp_rootv1p2.xsd', 'ims_xml.xsd', 'imscp_rootv1p1p2.xsd', 'imsmd_rootv1p2p1.xsd'];

    // Fallback snapshot is built from the CURRENT in-memory project — decoded
    // via the exact same externalizeAssets() used for the offline export.
    // Autocompress first: large images are re-encoded for the package, and
    // media the playbook never references is left out of the zip entirely.
    // Oversized fallback VIDEOS (>20MB) are skipped too — at launch the
    // remote shell streams them from Supabase anyway; the fallback stays a
    // lightweight safety net, not a second copy of the whole library.
    var FALLBACK_VIDEO_CAP = 20 * 1024 * 1024;
    var skippedVideos = [];
    var ext = null, pbJson = '';
    helpers.compressImagesForExport(pb).then(function (pbSlim) {
      ext = helpers.externalizeAssets(pbSlim);
      pbJson = JSON.stringify(ext.playbook);
      ext.extraFiles = helpers.filterUnreferenced(ext.extraFiles, pbJson);
      Object.keys(ext.extraFiles).forEach(function (path) {
        if (path.indexOf('video/') !== 0) return;
        var approx = Math.floor((ext.extraFiles[path].base64 || '').length * 3 / 4);
        if (approx > FALLBACK_VIDEO_CAP) {
          skippedVideos.push(path.replace(/^video\//, ''));
          delete ext.extraFiles[path];
        }
      });

      return Promise.all(TEXT_SHELL.map(function (f) { return helpers.textFile(f).then(function (t) { return { f: f, t: t }; }); }))
      .then(function (res) {
        var texts = {};
        res.forEach(function (o) { texts[o.f] = o.t; });

        // 1. index.html — inject remote-config.js + remote-loader.js instead
        //    of the direct playbook-data.js/app.js chain the offline build
        //    uses (remote-loader.js loads those AFTER content resolves).
        zip.file('index.html', buildRemoteIndexHtml(texts['index.html']));

        // 2. imsmanifest.xml — same substitutions as offline export.
        zip.file('imsmanifest.xml', buildManifestForRemote(texts['imsmanifest.xml'], pb.meta || {}, helpers));

        // 3. Renderer + plumbing, verbatim (same files as offline; this is
        //    NOT the heavy part — img/video are what's stripped for remote).
        ['app.js', 'ask.js', 'playbook-content.js', 'mo-brand.css', 'scorm_api.js', 'scorm_hook.js',
          'adlcp_rootv1p2.xsd', 'ims_xml.xsd', 'imscp_rootv1p1p2.xsd', 'imsmd_rootv1p2p1.xsd']
          .forEach(function (f) { zip.file(f, texts[f]); });

        // 4. remote-config.js
        zip.file('remote-config.js',
          '/* Generated by MO Playbook Studio. */\n' +
          'window.REMOTE_CONFIG = ' + JSON.stringify({ contentUrl: contentUrl, slug: slug }) + ';\n');

        // 5. remote-loader.js — fetch this repo's copy so it always matches
        //    the version tested alongside this build (bundled below).
        return fetch('remote-loader.js').then(function (r) {
          if (!r.ok) throw new Error('Missing remote-loader.js');
          return r.text();
        });
      })
      .then(function (loaderSrc) {
        zip.file('remote-loader.js', loaderSrc);

        // 6. Fallback snapshot: fallback-playbook-data.js + img//video/ assets.
        //    IMPORTANT: app.js hardcodes ~30 template strings like
        //    `url('img/${...}')` and `src="img/${...}"` (see preview-engine/app.js)
        //    — those literal "img/"/"video/" prefixes are NOT data-driven and
        //    are shared verbatim with the offline export, so we must NOT
        //    change app.js. Instead the fallback snapshot ships its decoded
        //    assets under the exact same img/ and video/ folder names the
        //    offline package already uses, so app.js's hardcoded paths
        //    resolve correctly with zero changes to app.js. The playbook
        //    JSON itself only ever stores bare filenames like "cover_hero.jpg"
        //    (app.js's own templates add the "img/"/"video/" prefix at render
        //    time), so no JSON path rewriting is needed here.
        var fallbackPb = JSON.parse(JSON.stringify(ext.playbook));
        delete fallbackPb.__remoteAssetBase; // fallback uses bundled relative paths, not a bucket base
        zip.file('fallback-playbook-data.js',
          '/* Generated by MO Playbook Studio — offline-safe snapshot used only if the ' +
          'network fetch of the published content fails. */\n' +
          'window.FALLBACK_PLAYBOOK = ' + JSON.stringify(rewriteFallbackAssetPaths(fallbackPb)) + ';\n');

        Object.keys(ext.extraFiles).forEach(function (path) {
          // path is already "img/foo.jpg" or "video/foo.mp4" — keep as-is so it
          // matches app.js's hardcoded template prefixes exactly.
          zip.file(path, ext.extraFiles[path].base64, { base64: true });
        });

        // Bundled original assets not replaced by an upload also need to be
        // present under img//video/ so the snapshot is truly self-contained.
        return fetch(BASE + 'asset-manifest.json').then(function (r) { return r.json(); });
      })
      .then(function (bundledAssets) {
        var replaced = {};
        Object.keys(ext.uploaded).forEach(function (k) { replaced[ext.uploaded[k]] = true; });
        // Skip replaced AND unreferenced bundled originals — an imported
        // playbook (e.g. Finance) doesn't use the seed media library, so
        // bundling it only inflates the zip.
        var needed = bundledAssets.filter(function (p) {
          if (replaced[p]) return false;
          return pbJson.indexOf(p.replace(/^(img|video)\//, '')) !== -1;
        });
        return Promise.all(needed.map(function (p) {
          return helpers.binFile(p).then(function (blob) {
            // p is already "img/foo.jpg" or "video/foo.mp4" from asset-manifest.json.
            zip.file(p, blob);
          }).catch(function () {/* skip missing */});
        }));
      })
      .then(function () {
        return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      })
      .then(function (blob) {
        var sizeMb = (blob.size / 1048576).toFixed(1);
        var name = (pb.meta && pb.meta.title ? pb.meta.title : 'playbook')
          .toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') + '-scorm12-remote.zip';
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        var note = 'Exported ' + name + ' (' + sizeMb + ' MB — fetches content from the cloud at launch)';
        if (skippedVideos.length) note += '. ' + skippedVideos.length + ' large video(s) (' + skippedVideos.slice(0, 3).join(', ').slice(0, 80) + (skippedVideos.length > 3 || skippedVideos.join('').length > 80 ? '…' : '') + ') stream from the cloud instead of being bundled';
        (cb.toast || function () {})(note, 'ok');
        (cb.done || function () {})(blob);
      })
      .catch(function (e) { (cb.fail || function () {})(e); });
    });
  };

  // The playbook JSON only ever stores BARE filenames (e.g. "cover_hero.jpg"
  // or "ch_A_integrity.jpg") — app.js's own render templates prepend the
  // literal "img/"/"video/" prefix at render time (see preview-engine/app.js,
  // e.g. `url('img/${T('cover.bg','cover_colleagues.jpg')}')`). That means
  // there is nothing to rewrite in the JSON for the fallback snapshot to
  // resolve correctly — it just needs its decoded assets physically placed
  // under img//video/ (done above), matching the same folder names app.js
  // already hardcodes for the offline package. Kept as an explicit no-op
  // passthrough (not deleted) as a hook point + so the intent is documented
  // for future maintainers who might assume otherwise (as an earlier version
  // of this function incorrectly did).
  function rewriteFallbackAssetPaths(pb) { return pb; }

  function buildRemoteIndexHtml(indexSrc) {
    // Swap the offline chain (playbook-data.js + direct app.js) for the
    // remote-loader chain (remote-config.js + remote-loader.js loads the
    // rest AFTER content resolves — see remote-loader.js loadScriptsSequentially).
    var head = '<script>window.MO_ASK_ENTRY_OFF = 1;<\/script>\n' +
               '<script src="remote-config.js"><\/script>\n' +
               '<script src="fallback-playbook-data.js"><\/script>\n';
    var out = indexSrc.replace('</head>', head + '</head>');
    // Remove the two script tags remote-loader.js will inject itself in the
    // correct order (playbook-content.js then app.js), replacing them with a
    // single remote-loader.js tag that loads scorm_api.js/playbook-content.js/
    // app.js/scorm_hook.js only once the PLAYBOOK content has resolved.
    // Regexes tolerate the cache-busting "?v=<epoch>" stamps preview-engine/
    // index.html carries — the previous plain-string version silently no-op'd
    // on stamped tags, leaving the offline chain in the remote package.
    var bothTags = /<script src="playbook-content\.js(\?v=\d+)?"><\/script>\s*\n<script src="app\.js(\?v=\d+)?"><\/script>/;
    if (bothTags.test(out)) {
      out = out.replace(bothTags, '<script src="remote-loader.js"><\/script>');
    } else {
      // Fallback: remove whichever tags are present individually, then add loader once.
      out = out.replace(/<script src="playbook-content\.js(\?v=\d+)?"><\/script>/, '');
      out = out.replace(/<script src="app\.js(\?v=\d+)?"><\/script>/, '<script src="remote-loader.js"><\/script>');
    }
    return out;
  }
})();
