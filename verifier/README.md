# Verifier index (append-only)

## v1 — 2026-08-25
Measures, for the storage/save/load fix round:
1. `node --check` clean on every touched JS file.
2. Playwright stubbed regression (verifier/v1/test_storage.py):
   - Save writes draft to cloud (Supabase REST) not only localStorage; cloud row is the source of truth on load.
   - Second "browser" (fresh context, no localStorage) loads latest cloud draft — cross-browser parity.
   - Expired/absent session surfaces a visible warning instead of silently falling back to local-only.
   - Hub "Open" and "Edit" render identical content for the same playbook.
   - Chapter with string `blurb` no longer throws `sec.blurb.map is not a function`.
3. Language-fix regression (previous round) still passes.

## v2 — 2026-08-25
Adds, on top of v1 (same harness, new file test_storage_v2.py):
4. Author attribution: cloud version.json publishedBy is surfaced in the editor
   load toast; latest version loads regardless of author (rchu then emmawong
   scenario).
5. Signed-in-only acceptance: an UNSIGNED newer local slot no longer wins the
   load — the latest cloud version loads instead (local slot kept, not deleted).
6. Open serves the drafts lane even when its version.json is an autosave copy
   (autosave: true) — Open == latest saved version, published or not.

## v3 — 2026-08-25
Acceptance suite for Clement's three never-again behaviours, run against the
exact tree that is live on GitHub (merged commit a7442a8):
1) Edit always loads the latest cloud version (stale local slot never wins).
2) Latest-saved-regardless-of-author, exercised as a true two-author sequence
   (rchu saves, emmawong saves later, third open gets emmawong's + her name).
3) Open never fails to load: drafts lane newer -> drafts; only published
   exists -> published; drafts probe 404s -> published still loads.
Adds a live-read smoke check against the real Supabase bucket (public GETs the
code paths depend on). Harness identical to v2 (intercepted cloud fixtures).

## v4 — 2026-08-25
Redesign acceptance (visual editor panel + topbar saved-by chip), run against the
redesigned tree: R1 saved-by chip author+relative time; R2 always-visible auth chip
(muted signed-out state); R3 inspector card grouping across chapter/stage/settings
with field-handler write-through intact; R4 zero cloud writes while signed out;
R5 change scope limited to known presentation/storage files.
Result: 9/9 PASS. v1 9/9, v2 13/13, v3 11/11 re-run on the same tree — all PASS.
