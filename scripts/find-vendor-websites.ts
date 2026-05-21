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
 *   --min-confidence X   Accept matches at or above X. Default 'high'.
 *                        Set to 'medium' to widen yield at the cost of
 *                        more false positives. Never accepts 'low'.
 */
import "dotenv/config";
import { and, eq, isNull, isNotNull, or } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

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
    } else if (a === "--min-confidence") {
      const v = args[++i];
      if (v !== "high" && v !== "medium") {
        console.error("--min-confidence must be 'high' or 'medium'"); process.exit(1);
      }
      minConfidence = v;
    } else if (a.startsWith("--min-confidence=")) {
      const v = a.slice("--min-confidence=".length);
      if (v !== "high" && v !== "medium") {
        console.error("--min-confidence must be 'high' or 'medium'"); process.exit(1);
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

async function fetchTitleAndMeta(url: string): Promise<string> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal:   ctrl.signal,
        redirect: "follow",
        headers:  { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+website-discovery)" },
      });
      if (!res.ok) return "";
      const text = await res.text();
      const head = text.slice(0, 16_384); /* first 16KB is enough for <head> */
      const titleMatch   = head.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogTitleMatch = head.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const ogDescMatch  = head.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const descMatch    = head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      return [
        titleMatch?.[1] ?? "",
        ogTitleMatch?.[1] ?? "",
        ogDescMatch?.[1] ?? "",
        descMatch?.[1] ?? "",
      ].join(" \n ").toLowerCase();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return "";
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
  | { kind: "ok"; matched: string }
  | { kind: "social-only" }
  | { kind: "no-match"; pageText: string }
  | { kind: "fetch-failed" };

async function validateMatch(url: string, vendor: Candidate): Promise<ValidationResult> {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { kind: "fetch-failed" }; }
  if (SOCIAL_HOSTS.has(host)) return { kind: "social-only" };

  const pageText = await fetchTitleAndMeta(url);
  if (!pageText) return { kind: "fetch-failed" };

  /* Match if (a) any meaningful word from the vendor name appears,
   * OR (b) the vendor's city appears. The OR is intentional: a
   * studio named "Qiu Photography" might list "Toronto" rather than
   * a full company name in their og:title; conversely a famous
   * photographer might omit the city. Either signal is enough. */
  const tokens = meaningfulNameTokens(vendor.name);
  for (const t of tokens) {
    if (pageText.includes(t)) return { kind: "ok", matched: `name:${t}` };
  }
  if (vendor.city) {
    const city = vendor.city.toLowerCase();
    if (pageText.includes(city)) return { kind: "ok", matched: `city:${vendor.city}` };
  }

  return { kind: "no-match", pageText: pageText.slice(0, 120) };
}

/* ─── Confidence ordering ─────────────────────────────────────────── */

function meetsThreshold(c: Confidence, min: "high" | "medium"): boolean {
  if (min === "high")   return c === "high";
  return c === "high" || c === "medium";
}

/* ─── Main loop ───────────────────────────────────────────────────── */

type Outcome =
  | { kind: "committed";       url: string; confidence: Confidence; reason: string; matched: string }
  | { kind: "would-commit";    url: string; confidence: Confidence; reason: string; matched: string }
  | { kind: "below-threshold"; confidence: Confidence; reason: string; url: string | null }
  | { kind: "social-only";     url: string }
  | { kind: "validation-failed"; url: string; preview: string }
  | { kind: "fetch-failed";    url: string }
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

    if (args.dryRun) {
      return {
        kind:       "would-commit",
        url:        verdict.url,
        confidence: verdict.confidence,
        reason:     verdict.reason,
        matched:    validation.matched,
      };
    }

    await db
      .update(vendors)
      .set({ website: verdict.url, updatedAt: new Date() })
      .where(eq(vendors.id, v.id));

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
