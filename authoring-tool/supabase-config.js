/* ============================================================================
   supabase-config.js — client-side Supabase configuration for MO Playbook Studio
   ----------------------------------------------------------------------------
   SECURITY: only the anon public key belongs here. It is safe to ship in
   client-side code by design (Supabase's Row Level Security policies are what
   actually protect the data — see HOW-TO.md -> "Publishing & Remote SCORM").
   NEVER put a secret/service_role key in this file or anywhere in this repo.

   To rotate the anon key later (e.g. after a project transfer), update ONLY
   the `anonKey` value below from the Supabase dashboard -> Settings -> API.
   ============================================================================ */
window.SUPABASE_CONFIG = {
  url: 'https://akcypiuealhfqspiwebp.supabase.co',
  // New-format publishable key (browser-safe). Preferred over the legacy JWT
  // anon key: it is signed/validated consistently across Auth and Storage on
  // projects using the new API key system, which fixes storage RLS requests
  // being silently downgraded to anonymous.
  anonKey: 'sb_publishable_h1lL2W5wJt3DOz2nr4IoAQ_20TPGTtF',
  bucket: 'playbook-content'
};

// Initialize a single shared Supabase client for the whole app (auth + storage).
// window.supabase is the global exposed by the UMD build loaded in index.html.
window.SUPABASE = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mo_playbook_supabase_auth_v1' }
    })
  : null;

if (!window.SUPABASE) {
  // The CDN script failed to load or loaded in an unexpected shape. Publish
  // features degrade gracefully (see publish.js) rather than throwing here.
  console.warn('[supabase-config] Supabase client library not available; Publish will be disabled.');
}
