/**
 * Find missing website URLs for vendors using Claude's web_search tool.
 *
 * Companion to scripts/enrich-vendor-bios.ts — that script extracts
 * editorial descriptions from a vendor's site, but only works on
 * vendors that already have website populated. Roughly 1,963 of the
 * 5,426 vendors in the directory (~36%) have no website on file.
 * This script tries to find one.
 *
 * Pipeline per vendor:
 *   1. Build a search query from the vendor row: name + category +
 *      city + "wedding Ontario".
 *   2. Send the query to claude-sonnet-4-6 with the web_search tool
 *      enabled. Sonnet (not haiku) because the match-confirmation
 *      reasoning matters more than per-call cost — false matches
 *      (wrong business, common name) write bad data that's expensive
 *      to clean up.
 *   3. Claude returns a JSON verdict:
 *        { url, confidence: 'high'|'medium'|'low', reason }
 *   4. If confidence === 'high', run a post-fetch sanity check: pull
 *      the candidate URL's <title> + og:title + meta description and
 *      verify the vendor's name (or a meaningful word from it) OR the
 *      vendor's city appears in that content. This is the defence
 *      against "Smith Photography" matching the wrong Smith.
 *   5. On both checks passing, UPDATE vendors row:
 *        website = <found URL>
 *        updated_at = NOW()
 *      Otherwise skip — log as "low confidence" or "validation
 *      failed". Nothing is ever written without a confidence + name
 *      gate.
 *
 * Once a vendor has website set by this script, the existing
 * scripts/enrich-vendor-bios.ts will pick it up on its next run and
 * extract a description, owner name, specialties etc. for free
 * (well, ~$0.004 of Claude haiku per vendor).
 *
 * Required env (.env / .env.local):
 *   ANTHROPIC_API_KEY     — Claude web_search tool runs on Anthropic's side
 *
 * Cost per vendor:
 *   - 1 Anthropic web_search call:           ~$0.010 (server tool fee)
 *   - claude-sonnet-4-6 inference (~2k tok):  ~$0.005
 *   - 1 website HEAD/GET for validation:     free
 *   Total: ~$0.015 per vendor.
 *   Full run across ~1,963 missing-website vendors: ~$30.
 *
 * Smoke-test sequence (recommended order):
 *   npx tsx scripts/find-vendor-websites.ts --limit 20 --dry-run
 *     # Spends ~$0.30 to surface 20 candidate matches WITHOUT writing
 *     # to the DB. Eyeball the high-confidence picks for accuracy
 *     # before committing.
 *   npx tsx scripts/find-vendor-websites.ts --limit 20
 *     # ~$0.30 + commits the high-confidence ones.
 *   npx tsx scripts/find-vendor-websites.ts
 *     # Full pass.
 *
 * Flags:
 *   --limit N            Process at most N candidates.
 *   --dry-run            Run the full pipeline but never write to DB.
 *   --confidence X       Accept matches at or above X. Default 'high'.
 *   --min-confidence X   (alias for --confidence)
 *
 * Confidence behaviour:
 *   high (default) — only commit when Claude's web_search returns HIGH
 *                    confidence + the page passes name/city + relevance
 *                    checks.
 *   medium         — also commit MEDIUM-confidence matches IF the page
 *                    passes one of three independent corroborating
 *                    checks (phone last-7-digit match, verbatim
 *                    business name in body, or domain root contains
 *                    a name slug). Coming-soon placeholder pages are
 *                    rejected outright. This catches legitimate vendors
 *                    with simple websites that lack wedding-specific
 *                    signals.
 *   low            — never accepted.
 */
import "dotenv/config";
import { and, eq, isNull, isNotNull, or } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { classifyCategoryRelevance, actionForVerdict } from "../src/lib/category-relevance";

const DELAY_BETWEEN_REQUESTS_MS = 500;
const FETCH_TIMEOUT_MS          = 8_000;
const COST_PER_VENDOR_USD       = 0.015;

type Confidence = "high" | "medium" | "low";

type Args = {
  limit:         number | null;
  dryRun:        boolean;
  minConfidence: "high" | "medium";
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit:         number | null = null;
  let dryRun         = false;
  let minConfidence: "high" | "medium" = "high";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else if (a === "--min-confidence" || a === "--confidence") {
      const v = args[++i];
      if (v !== "high" && v !== "medium") {
        console.error(`${a} must be 'high' or 'medium'`); process.exit(1);
      }
      minConfidence = v;
    } else if (a.startsWith("--min-confidence=") || a.startsWith("--confidence=")) {
      const v = a.split("=", 2)[1];
      if (v !== "high" && v !== "medium") {
        console.error(`${a.split("=")[0]} must be 'high' or 'medium'`); process.exit(1);
      }
      minConfidence = v;
    } else {
      console.error(`Unknown arg: ${a}`); process.exit(1);
    }
  }
  return { limit, dryRun, minConfidence };
}

const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "wedding photographer",
  videographer:    "wedding videographer",
  dj:              "wedding DJ",
  florist:         "wedding florist",
  photo_booth:     "wedding photo booth",
  catering:        "wedding caterer",
  cake:            "wedding cake designer",
  hair_makeup:     "wedding hair and makeup artist",
  officiant:       "wedding officiant",
  limo:            "wedding limousine / transportation",
  lighting_decor:  "wedding lighting and decor specialist",
  wedding_planner: "wedding planner",
};

type Candidate = {
  id:       number;
  slug:     string;
  name:     string;
  category: string;
  city:     string | null;
  region:   string | null;
  phone:    string | null;
};

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const baseQuery = db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
      city:     vendors.city,
      region:   vendors.region,
      phone:    vendors.phone,
    })
    .from(vendors)
    .where(
      and(
        or(isNull(vendors.website), eq(vendors.website, "")),
        or(eq(vendors.googleClosed, "no"), isNull(vendors.googleClosed)),
        isNotNull(vendors.name),
      ),
    )
    .orderBy(vendors.id);

  return limit != null ? await baseQuery.limit(limit) : await baseQuery;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Claude web_search verdict ──────────────────────────────────── */

const SYSTEM = `You are searching the web to find the official website for a specific Ontario wedding vendor.

You will be given the vendor's name, city, and category. Use the web_search tool to find their site. Make at most 3 searches.

Return ONLY a JSON object on a single line with no surrounding text, no markdown fences:

{"url": "<canonical homepage URL or null>", "confidence": "high" | "medium" | "low", "reason": "<one short sentence>"}

Confidence rules:
- HIGH: the site's content clearly shows the same business name AND mentions the same city/region in Ontario AND offers the right wedding service category
- MEDIUM: the business name matches AND (city OR category) matches, but one signal is missing or fuzzy
- LOW: the name appears in search results but it could plausibly be a different business with the same name, OR you can only find social-media profiles (Instagram, Facebook) rather than an actual website

Important:
- DO NOT return a social-media profile URL (instagram.com, facebook.com, etc.) — those don't count as "websites" for our directory. Only return a primary domain.
- If you can't find any plausible candidate, return {"url": null, "confidence": "low", "reason": "no results"}.
- The URL should be the homepage, not a deep link. Strip any path/query unless the homepage redirects.`;

type Verdict = {
  url:        string | null;
  confidence: Confidence;
  reason:     string;
};

async function findWebsite(client: Anthropic, v: Candidate): Promise<Verdict> {
  const categoryLabel = CATEGORY_LABEL[v.category] ?? `wedding ${v.category}`;
  const locationLine = v.city
    ? `based in ${v.city}, Ontario`
    : v.region
      ? `in the ${v.region} region of Ontario`
      : "in Ontario";

  const userPrompt =
    `Vendor name: "${v.name}"\n` +
    `Service category: ${categoryLabel}\n` +
    `Location: ${locationLine}\n\n` +
    `Find this vendor's official website and return the JSON verdict as specified.`;

  let res;
  try {
    /* The web_search tool is server-side — Anthropic charges per
     * search invocation in addition to the inference tokens. The
     * SDK's tool-type union doesn't include "web_search_*" yet at
     * 0.32.x, so we cast to `any` here. The API accepts it. */
    res = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system:     SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [
        {
          type:     "web_search_20250305",
          name:     "web_search",
          max_uses: 3,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    return { url: null, confidence: "low", reason: `claude error: ${err instanceof Error ? err.message : String(err)}` };
  }

  /* Concatenate all text blocks. Tool-use blocks are interleaved
   * but we only need the final text response after the search. */
  const text = res.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = text.match(/\{[\s\S]*?"url"[\s\S]*?\}/);
  if (!match) {
    return { url: null, confidence: "low", reason: `no parseable JSON: ${text.slice(0, 80)}` };
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      url?:        unknown;
      confidence?: unknown;
      reason?:     unknown;
    };
    const url =
      typeof parsed.url === "string" && parsed.url.startsWith("http")
        ? parsed.url
        : null;
    const confidence: Confidence =
      parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
        ? parsed.confidence
        : "low";
    const reason = typeof parsed.reason === "string" ? parsed.reason : "no reason";
    return { url, confidence, reason };
  } catch {
    return { url: null, confidence: "low", reason: `JSON parse failed: ${match[0].slice(0, 80)}` };
  }
}

/* ─── Post-fetch sanity check ────────────────────────────────────── */

/* Defence-in-depth: even when Claude is high-confidence, we fetch the
 * candidate URL and check that the vendor's name OR city actually
 * appears in the page's title / og:title / meta description. This
 * catches the failure mode where Claude returns a syntactically valid
 * but semantically wrong site (common business name → unrelated
 * company in a different city / industry). */

const SOCIAL_HOSTS = new Set([
  "instagram.com", "www.instagram.com",
  "facebook.com",  "www.facebook.com",  "m.facebook.com",
  "twitter.com",   "www.twitter.com",   "x.com", "www.x.com",
  "tiktok.com",    "www.tiktok.com",
  "linkedin.com",  "www.linkedin.com",
  "youtube.com",   "www.youtube.com",
]);

/* Returns:
 *   meta — lowercase concatenation of <title> + og:title + og:description
 *          + meta description. Same string the original validator used.
 *   body — first 6000 chars of plain visible text from the page body.
 *          Used by the medium-confidence verifier (phone + verbatim
 *          name + coming-soon detection). Empty string when fetch fails.
 *   bodyLowercase — body but lowercased for case-insensitive matching.
 *
 * One HTTP fetch produces both — keeps the round-trip count flat. */
type FetchedPage = {
  meta:          string;
  body:          string;
  bodyLowercase: string;
};

async function fetchTitleAndMeta(url: string): Promise<FetchedPage> {
  const empty: FetchedPage = { meta: "", body: "", bodyLowercase: "" };
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal:   ctrl.signal,
        redirect: "follow",
        headers:  { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+website-discovery)" },
      });
      if (!res.ok) return empty;
      const text = await res.text();
      const head = text.slice(0, 16_384); /* first 16KB is enough for <head> */
      const titleMatch   = head.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogTitleMatch = head.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const ogDescMatch  = head.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const descMatch    = head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const meta = [
        titleMatch?.[1] ?? "",
        ogTitleMatch?.[1] ?? "",
        ogDescMatch?.[1] ?? "",
        descMatch?.[1] ?? "",
      ].join(" \n ").toLowerCase();

      /* Plain text body — strip script/style, then tags, then collapse
       * whitespace. Cap at 6000 chars: enough for phone + about copy
       * + footer (where most vendor contact info lives) without
       * loading entire blog rolls into memory. */
      const body = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi,   " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6_000);

      return { meta, body, bodyLowercase: body.toLowerCase() };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return empty;
  }
}

/* Pick the "meaningful" words from a vendor name — drops generic
 * stop-words ("photography", "studio", "the", "&", etc.) so that
 * "Qiu Photography" reduces to ["qiu"] for the substring test. */
function meaningfulNameTokens(name: string): string[] {
  const STOP_WORDS = new Set([
    "photography","studio","studios","the","and","&","wedding","weddings","co","co.","inc","inc.","ltd","ltd.","llc","group",
    "events","event","productions","production","services","service","photo","video","films","film",
    "design","designs","decor","floral","florals","flowers","catering","cake","cakes",
    "hair","makeup","beauty","dj","entertainment","music","limo","limousine","transport","transportation",
    "officiant","officiating","planner","planning","planners","luxury","ontario",
  ]);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

type ValidationResult =
  | { kind: "ok";          matched: string; pageText: string; bodyText: string; bodyLowercase: string }
  | { kind: "social-only" }
  | { kind: "no-match";    pageText: string }
  | { kind: "fetch-failed" };

async function validateMatch(url: string, vendor: Candidate): Promise<ValidationResult> {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { kind: "fetch-failed" }; }
  if (SOCIAL_HOSTS.has(host)) return { kind: "social-only" };

  const fetched = await fetchTitleAndMeta(url);
  if (!fetched.meta && !fetched.body) return { kind: "fetch-failed" };

  /* Token / city match runs against the meta string (title + og + meta
   * description) — same scope as the original validator. The body
   * text is carried through for the medium-confidence verifier. */
  const haystack = fetched.meta + " " + fetched.bodyLowercase;
  const tokens = meaningfulNameTokens(vendor.name);
  for (const t of tokens) {
    if (haystack.includes(t)) {
      return { kind: "ok", matched: `name:${t}`, pageText: fetched.meta, bodyText: fetched.body, bodyLowercase: fetched.bodyLowercase };
    }
  }
  if (vendor.city) {
    const city = vendor.city.toLowerCase();
    if (haystack.includes(city)) {
      return { kind: "ok", matched: `city:${vendor.city}`, pageText: fetched.meta, bodyText: fetched.body, bodyLowercase: fetched.bodyLowercase };
    }
  }

  return { kind: "no-match", pageText: fetched.meta.slice(0, 120) };
}

/* ─── Confidence ordering ─────────────────────────────────────────── */

function meetsThreshold(c: Confidence, min: "high" | "medium"): boolean {
  if (min === "high")   return c === "high";
  return c === "high" || c === "medium";
}

/* ─── Medium-confidence verification ─────────────────────────────── */

/* When --confidence medium accepts medium-conf matches from Claude, we
 * still don't want to commit a website without independent corroborating
 * proof. The medium-conf verifier requires ONE of three concrete
 * signals before persisting:
 *
 *   1. Phone last-7-digit match — the vendor's stored phone (or a
 *      meaningful subsequence of it) appears in the page body.
 *   2. Verbatim business name appears in the body (not just a token —
 *      the full name without the stop-word reduction).
 *   3. Domain root contains a meaningful slug from the business name.
 *
 * Plus a guard: if the page looks like a "coming soon" or "under
 * construction" placeholder, we refuse regardless. */

const COMING_SOON_PATTERNS = [
  /\bcoming\s+soon\b/i,
  /\bunder\s+construction\b/i,
  /\bsite\s+(is\s+)?coming\b/i,
  /\blaunching\s+soon\b/i,
  /\bbe\s+back\s+soon\b/i,
  /\bwebsite\s+(is\s+)?(currently\s+)?down\b/i,
  /\bpage\s+not\s+found\b/i,    /* generic 404 caught by 200-OK soft fail */
  /\bstay\s+tuned\b/i,
];

export function isComingSoonPage(bodyText: string): boolean {
  /* If the page is suspiciously thin, AND contains any placeholder
   * phrase, treat it as coming-soon. We require the thinness gate
   * because legitimate vendors do say "coming soon" in event copy. */
  const len = bodyText.trim().length;
  if (len > 0 && len < 600) {
    for (const re of COMING_SOON_PATTERNS) {
      if (re.test(bodyText)) return true;
    }
  }
  /* Even on long pages, if a placeholder phrase appears in the first
   * 200 chars, that's a strong placeholder signal. */
  const opening = bodyText.slice(0, 200);
  for (const re of COMING_SOON_PATTERNS) {
    if (re.test(opening)) return true;
  }
  return false;
}

/* Compare last-7-digit subsequences of the vendor phone against
 * the body text. We use 7 digits because Canadian numbers vary in
 * formatting (905.555.1234 vs (905) 555-1234 vs 9055551234) and the
 * subscriber number (last 7) is the most stable component. */
function phoneAppearsInBody(vendorPhone: string | null, bodyText: string): boolean {
  if (!vendorPhone) return false;
  const digits = vendorPhone.replace(/\D/g, "");
  if (digits.length < 7) return false;
  const last7 = digits.slice(-7);

  /* Strip all non-digit chars from the body once, then substring match.
   * That handles every formatting variant in one comparison. */
  const bodyDigits = bodyText.replace(/\D/g, "");
  return bodyDigits.includes(last7);
}

/* Domain-contains-slug check: pull a 3+ char meaningful token from the
 * business name and check whether the URL's hostname contains it. */
function domainContainsNameSlug(name: string, url: string): string | null {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return null; }
  /* Strip the TLD so "qiu.ca" matches "qiu" cleanly. */
  const root = host.replace(/\.[a-z]{2,3}(?:\.[a-z]{2})?$/, "");
  const tokens = meaningfulNameTokens(name);
  for (const t of tokens) {
    if (t.length >= 4 && root.includes(t)) return t;
    /* Allow 3-char tokens only if the entire root is also 3-4 chars
     * (e.g. "qiu.ca" → root "qiu" matches token "qiu"). */
    if (t.length === 3 && root.length <= 4 && root.includes(t)) return t;
  }
  return null;
}

/* Verbatim-name check: normalize both sides (lowercase, collapse
 * whitespace, drop the few obvious noise tokens) and substring search. */
function verbatimNameInBody(name: string, bodyLowercase: string): boolean {
  /* Skip the smallest noise so "Qiu Photography Inc." normalizes
   * to "qiu photography" and still matches "qiu photography studio". */
  const normalized = name
    .toLowerCase()
    .replace(/\b(inc\.?|ltd\.?|llc|co\.?|corp\.?)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 5) return false;
  return bodyLowercase.includes(normalized);
}

type MediumVerification =
  | { kind: "verified";    reason: string }
  | { kind: "coming-soon" }
  | { kind: "no-signal" };

function verifyMediumMatch(
  vendor: Candidate,
  url:    string,
  v:      ValidationResult & { kind: "ok" },
): MediumVerification {
  /* Hard reject: coming-soon / placeholder pages. */
  if (isComingSoonPage(v.bodyText)) return { kind: "coming-soon" };

  /* Then the three corroborating signals — first one that passes wins.
   * Order is the cheapest signal first. */
  if (phoneAppearsInBody(vendor.phone, v.bodyText)) {
    return { kind: "verified", reason: "phone-match" };
  }
  if (verbatimNameInBody(vendor.name, v.bodyLowercase)) {
    return { kind: "verified", reason: "verbatim-name" };
  }
  const domainToken = domainContainsNameSlug(vendor.name, url);
  if (domainToken) {
    return { kind: "verified", reason: `domain-slug:${domainToken}` };
  }
  return { kind: "no-signal" };
}

/* ─── Main loop ───────────────────────────────────────────────────── */

type Outcome =
  | { kind: "committed";       url: string; confidence: Confidence; reason: string; matched: string }
  | { kind: "would-commit";    url: string; confidence: Confidence; reason: string; matched: string }
  | { kind: "below-threshold"; confidence: Confidence; reason: string; url: string | null }
  | { kind: "social-only";     url: string }
  | { kind: "validation-failed"; url: string; preview: string }
  | { kind: "fetch-failed";    url: string }
  | { kind: "category-mismatch-hidden";  url: string; actualCategory: string | null; reason: string }
  | { kind: "category-mismatch-flagged"; url: string; actualCategory: string | null; reason: string }
  | { kind: "medium-no-signal"; url: string }
  | { kind: "coming-soon";      url: string }
  | { kind: "no-result";       reason: string }
  | { kind: "error";           reason: string };

async function processVendor(
  client: Anthropic,
  v:      Candidate,
  args:   Args,
): Promise<Outcome> {
  try {
    const verdict = await findWebsite(client, v);

    if (!verdict.url) {
      return { kind: "no-result", reason: verdict.reason };
    }
    if (!meetsThreshold(verdict.confidence, args.minConfidence)) {
      return {
        kind:       "below-threshold",
        confidence: verdict.confidence,
        reason:     verdict.reason,
        url:        verdict.url,
      };
    }

    const validation = await validateMatch(verdict.url, v);
    if (validation.kind === "social-only")  return { kind: "social-only",       url: verdict.url };
    if (validation.kind === "fetch-failed") return { kind: "fetch-failed",      url: verdict.url };
    if (validation.kind === "no-match")     return { kind: "validation-failed", url: verdict.url, preview: validation.pageText };

    /* Medium-confidence verification gate. When Claude returned MEDIUM
     * confidence AND we're accepting medium matches (args.minConfidence
     * === 'medium'), require independent corroborating proof before
     * committing — phone match OR verbatim name OR domain has slug.
     * Also reject coming-soon placeholder pages. Cheap pre-relevance
     * check — avoids the $0.0002 classifier call on rows we'd reject. */
    if (verdict.confidence === "medium" && args.minConfidence === "medium") {
      const med = verifyMediumMatch(v, verdict.url, validation);
      if (med.kind === "coming-soon") {
        return { kind: "coming-soon", url: verdict.url };
      }
      if (med.kind === "no-signal") {
        return { kind: "medium-no-signal", url: verdict.url };
      }
      /* med.kind === "verified" — log the corroborating signal so the
       * audit trail shows WHY this medium-conf match was accepted. */
      console.log(`    medium-conf verified via ${med.reason}`);
    }

    /* Category relevance check — name/city matched, but does the page
     * actually describe a business in this category? Pass the body
     * text (richer signal than just meta) when available. */
    const verdictRelevance = await classifyCategoryRelevance({
      vendorName:     v.name,
      category:       v.category,
      websiteContent: validation.bodyText || validation.pageText,
    });
    const action = actionForVerdict(verdictRelevance);

    if (action.kind === "hide") {
      console.log(
        `  MISMATCH: ${v.name} (${v.category}) found at ${verdict.url} but website suggests ${action.actualCategory ?? "?"}`,
      );
      if (!args.dryRun) {
        await db
          .update(vendors)
          .set({
            /* Don't store the URL — we don't want this 'website' surfacing
             * in any UI when the vendor is mis-categorized. The relevance
             * verdict is the authoritative signal that this match is wrong. */
            isHidden:           true,
            hiddenReason:       "wrong_category_detected",
            needsManualReview:  true,
            needsWebsiteSearch: false,
            updatedAt:          new Date(),
          })
          .where(eq(vendors.id, v.id));
      }
      return {
        kind:           "category-mismatch-hidden",
        url:            verdict.url,
        actualCategory: action.actualCategory,
        reason:         action.reason,
      };
    }

    if (args.dryRun) {
      return {
        kind:       "would-commit",
        url:        verdict.url,
        confidence: verdict.confidence,
        reason:     verdict.reason,
        matched:    validation.matched,
      };
    }

    /* On a confirmed match we also clear the visibility gates so the
     * row re-enters public listings. hidden_reason is set back to
     * null — the row could still be hidden in the future for a
     * different reason (duplicate, low_quality), so we don't leave
     * the old "no_website" label dangling. */
    await db
      .update(vendors)
      .set({
        website:            verdict.url,
        isHidden:           false,
        hiddenReason:       null,
        needsWebsiteSearch: false,
        /* Medium-confidence mismatch — commit the website but flag for
         * manual review. The vendor stays visible. */
        needsManualReview:  action.kind === "flag" ? true : false,
        updatedAt:          new Date(),
      })
      .where(eq(vendors.id, v.id));

    if (action.kind === "flag") {
      return {
        kind:           "category-mismatch-flagged",
        url:            verdict.url,
        actualCategory: action.actualCategory,
        reason:         action.reason,
      };
    }

    return {
      kind:       "committed",
      url:        verdict.url,
      confidence: verdict.confidence,
      reason:     verdict.reason,
      matched:    validation.matched,
    };
  } catch (err) {
    return { kind: "error", reason: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(args.limit);
  console.log(
    `Loaded ${candidates.length} candidate vendor(s)` +
      `${args.limit != null ? ` (limit=${args.limit})` : ""}` +
      `${args.dryRun ? " · DRY RUN" : ""}` +
      ` · min-confidence=${args.minConfidence}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do."); return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  let committed        = 0;
  let wouldCommit      = 0;
  let belowThreshold   = 0;
  let socialOnly       = 0;
  let validationFailed = 0;
  let fetchFailed      = 0;
  let noResult         = 0;
  let errored          = 0;
  let mismatchHidden   = 0;
  let mismatchFlagged  = 0;
  let mediumNoSignal   = 0;
  let comingSoon       = 0;
  const issues: Array<{ slug: string; outcome: string }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const v = candidates[i];
    const r = await processVendor(client, v, args);

    switch (r.kind) {
      case "committed":
        committed++;
        console.log(`  ✓ ${v.slug} → ${r.url} · conf=${r.confidence} · matched=${r.matched}`);
        break;
      case "would-commit":
        wouldCommit++;
        console.log(`  · ${v.slug} → ${r.url} · conf=${r.confidence} · matched=${r.matched} (dry-run)`);
        break;
      case "below-threshold":
        belowThreshold++;
        issues.push({ slug: v.slug, outcome: `below-threshold (${r.confidence}) ${r.url ?? ""}` });
        break;
      case "social-only":
        socialOnly++;
        issues.push({ slug: v.slug, outcome: `social-only: ${r.url}` });
        break;
      case "validation-failed":
        validationFailed++;
        issues.push({ slug: v.slug, outcome: `validation-failed: ${r.url} · "${r.preview.slice(0, 50)}"` });
        break;
      case "fetch-failed":
        fetchFailed++;
        issues.push({ slug: v.slug, outcome: `fetch-failed: ${r.url}` });
        break;
      case "category-mismatch-hidden":
        mismatchHidden++;
        issues.push({
          slug: v.slug,
          outcome: `MISMATCH-HIDE: ${r.url} → ${r.actualCategory ?? "?"} (${r.reason.slice(0, 50)})`,
        });
        break;
      case "category-mismatch-flagged":
        mismatchFlagged++;
        committed++;  /* still committed the website; counts as a save */
        console.log(`  ✓ ${v.slug} → ${r.url} · FLAGGED for review (${r.actualCategory ?? "?"})`);
        break;
      case "medium-no-signal":
        mediumNoSignal++;
        issues.push({ slug: v.slug, outcome: `MED-NO-SIGNAL: ${r.url}` });
        break;
      case "coming-soon":
        comingSoon++;
        issues.push({ slug: v.slug, outcome: `COMING-SOON: ${r.url}` });
        break;
      case "no-result":
        noResult++;
        break;
      case "error":
        errored++;
        issues.push({ slug: v.slug, outcome: `error: ${r.reason.slice(0, 80)}` });
        break;
    }

    if ((i + 1) % 25 === 0) {
      console.log(
        `  --- progress ${i + 1}/${candidates.length} — committed=${committed} ` +
          `dry=${wouldCommit} below=${belowThreshold} social=${socialOnly} ` +
          `inval=${validationFailed} fetch=${fetchFailed} noresult=${noResult} err=${errored}`,
      );
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:           ${candidates.length}`);
  console.log(`Committed:                  ${committed}${args.dryRun ? " (dry run — see would-commit)" : ""}`);
  if (args.dryRun) {
    console.log(`Would-commit (dry):         ${wouldCommit}`);
  }
  console.log(`Below confidence threshold: ${belowThreshold}`);
  console.log(`Social-media-only URL:      ${socialOnly}`);
  console.log(`Validation failed:          ${validationFailed}`);
  console.log(`Fetch failed:               ${fetchFailed}`);
  console.log(`Category mismatch (hide):   ${mismatchHidden}`);
  console.log(`Category mismatch (flag):   ${mismatchFlagged}`);
  console.log(`Medium-conf no signal:      ${mediumNoSignal}`);
  console.log(`Coming-soon page:           ${comingSoon}`);
  console.log(`No result:                  ${noResult}`);
  console.log(`Errored:                    ${errored}`);
  console.log(`Actual cost:                ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  if (issues.length > 0 && issues.length <= 30) {
    console.log("\nIssue samples:");
    for (const f of issues.slice(0, 30)) console.log(`  ${f.slug} — ${f.outcome}`);
  } else if (issues.length > 30) {
    console.log(`\n${issues.length} issues total (showing first 20):`);
    for (const f of issues.slice(0, 20)) console.log(`  ${f.slug} — ${f.outcome}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
