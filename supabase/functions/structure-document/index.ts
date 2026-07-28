// ============================================================================
// structure-document — Supabase Edge Function (Deno)
// ----------------------------------------------------------------------------
// Turns extracted PDF text into a structured playbook chapter, using an
// external LLM (Perplexity API by default). The API key lives ONLY here, as
// a function secret — never in browser code.
//
// Request  (POST, JSON):
//   { docName: string, text: string, headingCandidates?: string[] }
//   Headers: Authorization: Bearer <supabase user access token>
//            apikey: <supabase publishable/anon key>  (gateway)
// Response (200):
//   { chapter: { title, blurb }, sections: [{ title, paragraphs[], bullets[] }] }
//
// Secrets/env:
//   PPLX_API_KEY        (required)  Perplexity API key
//   PPLX_MODEL          (optional, default "sonar")
//   PPLX_SEARCH_CONTEXT (optional, default "low" — minimizes web-search fees;
//                      set to "off" to omit the search option entirely)
//   ALLOWED_ORIGINS     (optional, comma-separated; default "*")
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsOrigin = Deno.env.get("ALLOWED_ORIGINS") || "*";

function corsHeaders(extra?: Record<string, string>) {
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(extra || {}),
  };
}

const SYSTEM_PROMPT = [
  "You are a document-structuring engine inside a corporate playbook authoring tool.",
  "Convert the provided internal document into ONE structured playbook chapter.",
  "STRICT RULES:",
  "- Use ONLY the supplied document text. Never search the web. Never invent content.",
  "- Remove repeated page headers/footers, page numbers, and masthead/boilerplate metadata.",
  "- Split the document at its own top-level headings (aim for 3-12 sections).",
  "- Keep the document's own wording; you may lightly smooth broken line-wraps and spacing.",
  "- A numbered step or role (e.g. \"1. Front Office\") owns ALL text up to the next heading",
  "  of the same level: narrative, field lists, bullets and approval steps. Include the FULL",
  "  body of every section. Never return a section with an empty body.",
  "- Headings that merely introduce a group of steps and have no substantive body of their",
  "  own (e.g. \"Procedures\", \"Process\", \"Steps\") are NOT sections — put their intro text",
  "  into the first step's section instead.",
  "- Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:",
  '{"chapter":{"title":string,"blurb":string},"sections":[{"title":string,"paragraphs":string[],"bullets":string[]}]}',
  "- chapter.blurb = one-sentence summary of the whole document.",
  "- paragraphs = full-sentence prose, split into paragraph-sized chunks (1-4 sentences each).",
  "- bullets = short list items: steps, field definitions, requirements. Empty array if none.",
].join("\n");

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function extractJson(raw: string) {
  let s = (raw || "").trim();
  // Strip markdown fences if the model added them despite instructions.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Model returned no JSON object");
  return JSON.parse(s.slice(first, last + 1));
}

function str(v: unknown, max = 1200): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function strArr(v: unknown, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter((x) => x.length > 0).slice(0, maxItems);
}

type Section = { title: string; paragraphs: string[]; bullets: string[] };

// Global wrapper-merge rule: a heading that merely introduces the steps after
// it (e.g. "Procedures", "Process", "Steps") and carries little or no body of
// its own must never become a standalone, empty section — its intro text is
// folded into the first substantive section that follows, so the wrapper is
// always viewable together with its first step. Numbered steps are exempt:
// an empty numbered section is a model failure, not a wrapper.
const WRAPPER_NAMES = /^(procedures?|process(es)?|steps?|workflow|overview|introduction)\b/i;
const NUMBERED_STEP = /^\s*(\d+[.)]|[A-Z][.)]|[ivxlcdm]+[.)])/i;

function mergeWrapperSections(sections: Section[]): Section[] {
  const src = sections.map((s) => ({
    title: s.title,
    paragraphs: [...s.paragraphs],
    bullets: [...s.bullets],
  }));
  const out: Section[] = [];
  for (let i = 0; i < src.length; i++) {
    const s = src[i];
    const bodyChars = s.paragraphs.join(" ").length + s.bullets.join(" ").length;
    const looksNumbered = NUMBERED_STEP.test(s.title);
    const isWrapper =
      !looksNumbered &&
      bodyChars < 200 &&
      i < src.length - 1 &&
      (WRAPPER_NAMES.test(s.title) || bodyChars === 0);
    if (isWrapper) {
      const nxt = src[i + 1];
      nxt.paragraphs = s.paragraphs.concat(nxt.paragraphs);
      nxt.bullets = s.bullets.concat(nxt.bullets);
      continue; // the wrapper travels with its first step
    }
    out.push(s);
  }
  return out.filter((s) => s.paragraphs.length > 0 || s.bullets.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  // ---- auth: only signed-in Studio authors may spend LLM budget ----
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Sign-in required" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Sign-in required" });

  // ---- input ----
  let body: { docName?: string; text?: string; headingCandidates?: string[] };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const text = str(body.text, 120000);
  if (!text || text.length < 200) return json(400, { error: "Document text is too short" });
  const docName = str(body.docName, 200) || "document.pdf";
  const hints = strArr(body.headingCandidates, 40);

  // ---- LLM call ----
  const apiKey = Deno.env.get("PPLX_API_KEY");
  if (!apiKey) return json(500, { error: "PPLX_API_KEY secret is not set on this function" });

  const searchContext = (Deno.env.get("PPLX_SEARCH_CONTEXT") || "low").toLowerCase();
  const payload: Record<string, unknown> = {
    model: Deno.env.get("PPLX_MODEL") || "sonar",
    temperature: 0.1,
    max_tokens: 6000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          "DOCUMENT NAME: " + docName + "\n" +
          (hints.length ? "HEADING CANDIDATES (font-size hints):\n- " + hints.join("\n- ") + "\n" : "") +
          "DOCUMENT TEXT:\n" + text,
      },
    ],
  };
  if (searchContext !== "off") {
    payload["web_search_options"] = { search_context_size: searchContext };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75000);
  let llm: Response;
  try {
    llm = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return json(502, { error: "LLM request failed: " + (e?.message || e) });
  }
  clearTimeout(timer);

  if (!llm.ok) {
    const detail = (await llm.text()).slice(0, 400);
    return json(502, { error: "LLM error HTTP " + llm.status + ": " + detail });
  }

  // ---- parse + sanitize ----
  let parsed;
  try {
    const completion = await llm.json();
    const raw = completion?.choices?.[0]?.message?.content || "";
    parsed = extractJson(raw);
  } catch (e) {
    return json(502, { error: "Could not parse structured output: " + (e?.message || e) });
  }

  const chapter = {
    title: str(parsed?.chapter?.title, 120) || docName.replace(/\.pdf$/i, ""),
    blurb: str(parsed?.chapter?.blurb, 400),
  };
  const sections = mergeWrapperSections(
    (Array.isArray(parsed?.sections) ? parsed.sections : [])
      .slice(0, 20)
      .map((s: unknown) => ({
        title: str((s as Record<string, unknown>)?.title, 160),
        paragraphs: strArr((s as Record<string, unknown>)?.paragraphs, 40),
        bullets: strArr((s as Record<string, unknown>)?.bullets, 60),
      }))
      .filter((s: Section) => s.title || s.paragraphs.length || s.bullets.length)
  );

  if (!sections.length) return json(502, { error: "Model returned no usable sections" });
  return json(200, { chapter, sections });
});
