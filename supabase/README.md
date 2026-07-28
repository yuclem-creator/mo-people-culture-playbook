# Supabase Edge Function: structure-document

Powers the Studio's **Import from PDF** feature (Course Creation). The
Perplexity API key lives only here, as a function secret — never in the repo
or the browser.

## One-time deploy (≈5 minutes)

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in
(`supabase login`) and this repo checked out.

```bash
# 1. Link the project (once) — ref is in your dashboard URL:
#    https://supabase.com/dashboard/project/akcypiuealhfqspiwebp
supabase link --project-ref akcypiuealhfqspiwebp

# 2. Set the secret (paste your real key; do NOT commit it anywhere)
supabase secrets set PPLX_API_KEY=pplx-xxxxxxxxxxxxxxxx

# 3. Deploy the function
#    --no-verify-jwt is intentional: the function verifies the caller's
#    Supabase session itself (only signed-in Studio authors get through),
#    and this keeps it compatible with the new publishable API keys.
supabase functions deploy structure-document --no-verify-jwt
```

## Verify

```bash
curl -X POST "https://akcypiuealhfqspiwebp.supabase.co/functions/v1/structure-document" \
  -H "apikey: <publishable-key>" \
  -H "Authorization: Bearer <a signed-in author's access token>" \
  -H "Content-Type: application/json" \
  -d '{"docName":"test.pdf","text":"Purpose\nThis procedure supports Policy A 01. It applies to all hotels.\nFrequency\nThis procedure is performed daily. The Night Duty Manager runs the report and the Director of Finance signs off after review by Income Audit and Revenue Management teams."}'
```

Expect a JSON chapter back. A 401 means the token is missing/expired; a 502
with "LLM error" means the Perplexity key or model needs attention.

## Configuration (optional secrets)

| Secret | Default | Purpose |
| --- | --- | --- |
| `PPLX_MODEL` | `sonar` | Perplexity model |
| `PPLX_SEARCH_CONTEXT` | `low` | Minimizes web-search fees; set `off` to omit the search option entirely |
| `ALLOWED_ORIGINS` | `*` | Lock CORS to e.g. `https://yuclem-creator.github.io` |

## Cost & privacy notes

- ~a few US cents per import at typical SOP sizes.
- Sonar models perform web retrieval; `search_context_size: low` minimizes
  it. For confidential documents, the cleaner long-term home for this call
  is Azure OpenAI inside MOHG's tenant — the function is the single place to
  swap.
