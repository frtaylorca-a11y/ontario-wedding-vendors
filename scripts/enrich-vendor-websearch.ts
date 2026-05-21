/**
 * Enrich vendors that have no usable website by researching them via
 * Claude Sonnet 4.6 + the web_search tool.
 *
 * Candidate filter — vendors that:
 *   - is_hidden = false
 *   - bio_enriched_at IS NULL
 *   - (website IS NULL OR website matches a social-only host)
 *   - google_rating IS NOT NULL
 *   - review_count >= --min-reviews (default 3)
 *
 * These are vendors with independent review proof (Google says they
 * exist + people booked them) but no surface from which we can
 * scrape a bio. Claude does the research on Anthropic's side via
 * web_search and returns a structured JSON verdict.
 *
 * Cost (Sonnet 4.6 + web_search):
 *   ~$0.010 per search call × ~2 searches per vendor + ~$0.005
 *   inference = ~$0.015 / vendor. 500 vendors ≈ $7.50.
 *
 * CLI:
 *   --limit 10        (default) cap rows processed
 *   --min-reviews 3   (default) minimum google review_count to consider
 *   --dry-run         (default when --confirm not passed) — show what
 *                     would be written without touching the DB
 *   --confirm         actually persist verdicts
 *
 * Smoke test:
 *   npx tsx scripts/enrich-vendor-websearch.ts --limit 5 --dry-run
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNull, isNotNull, gte, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { isSocialOnlyUrl, SOCIAL_HOSTS } from "../src/lib/social-hosts";

const PER_VENDOR_DELAY_MS = 700;

type Args = {
  limit:       number;
  minReviews:  number;
  dryRun:      boolean;
  /** Optional ILIKE-style name filter for smoke testing a specific vendor. */
  name:        string | null;
};

function parseArgs(): Args {
  const args  = process.argv.slice(2);
  let limit   = 10;
  let minReviews = 3;
  let confirm = false;
  let name: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--confirm") confirm = true;
    else if (a === "--dry-run") confirm = false;
    else if (a === "--limit") {
      const n = parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = parseInt(a.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a === "--min-reviews") {
      const n = parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n >= 0) minReviews = n;
    } else if (a.startsWith("--min-reviews=")) {
      const n = parseInt(a.slice("--min-reviews=".length), 10);
      if (Number.isFinite(n) && n >= 0) minReviews = n;
    } else if (a === "--name") {
      name = args[++i] ?? null;
    } else if (a.startsWith("--name=")) {
      name = a.slice("--name=".length);
    }
  }
  return { limit, minReviews, dryRun: !confirm, name };
}

/* ─── Candidate loader ──────────────────────────────────────────── */

type Candidate = {
  id:           number;
  name:         string;
  slug:         string;
  category:     string;
  city:         string | null;
  region:       string | null;
  googleRating: string | null;
  reviewCount:  number | null;
  website:      string | null;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  /* Pull everything that meets the rating/review threshold and is
   * un-enriched and visible. Filter the social-only check in JS
   * because SOCIAL_HOSTS lives in TS and isn't ergonomic in SQL. */
  const rows = await db
    .select({
      id:           vendors.id,
      name:         vendors.name,
      slug:         vendors.slug,
      category:     vendors.category,
      city:         vendors.city,
      region:       vendors.region,
      googleRating: vendors.googleRating,
      reviewCount:  vendors.reviewCount,
      website:      vendors.website,
    })
    .from(vendors)
    .where(
      and(
        eq(vendors.isHidden, false),
        isNull(vendors.bioEnrichedAt),
        isNotNull(vendors.googleRating),
        gte(vendors.reviewCount, args.minReviews),
        or(
          isNull(vendors.website),
          sql`${vendors.website} = ''`,
          /* Compare website against the social-host list — we tolerate
           * a slightly bigger pull here and filter precisely in JS. */
          sql`${vendors.website} ILIKE '%instagram.com%'`,
          sql`${vendors.website} ILIKE '%facebook.com%'`,
          sql`${vendors.website} ILIKE '%tiktok.com%'`,
          sql`${vendors.website} ILIKE '%linktr.ee%'`,
        ),
        /* Smoke-test escape hatch — when --name is passed, also apply
         * a name ILIKE filter so we can target a specific vendor. */
        args.name ? sql`${vendors.name} ILIKE ${'%' + args.name + '%'}` : sql`TRUE`,
      ),
    )
    .orderBy(sql`${vendors.googleRating} DESC NULLS LAST`, sql`${vendors.reviewCount} DESC NULLS LAST`);

  const filtered = rows.filter((r) =>
    r.website == null || r.website === "" || isSocialOnlyUrl(r.website),
  );
  return filtered.slice(0, args.limit).map((r) => ({
    id:           r.id,
    name:         r.name,
    slug:         r.slug,
    category:     r.category!,
    city:         r.city,
    region:       r.region,
    googleRating: r.googleRating,
    reviewCount:  r.reviewCount,
    website:      r.website,
  }));
}

/* ─── Claude prompt + invocation ─────────────────────────────────── */

const SYSTEM_PROMPT = `You are researching Ontario wedding vendors for a directory. Search for this vendor on the web and extract REAL, FACTUAL information only. Never invent details. If you cannot confirm a fact from a source you found, omit it rather than guess.

Use the web_search tool. Make at most 3 searches. Search variations of the vendor's name + city + Ontario + their category. Look at the top results — review sites (Yelp, WeddingWire), social profiles (Instagram, Pinterest), local listings, and any direct vendor websites.

Return ONLY a JSON object on a single line with no surrounding text and no markdown fences:

{
  "description":      "150-250 words about the vendor's business, style, and services based on what you found. Third person. Use their own language where you can quote it. No generic filler phrases ('highly-rated', 'wedding-ready'). No marketing fluff. Canadian spelling.",
  "specialties":      ["specialty1", "specialty2"],
  "serviceAreas":     ["city1", "city2"],
  "instagramHandle":  "handle without the @ — null if none found",
  "yelpUrl":          "full URL or null",
  "pinterestUrl":     "full URL or null",
  "realWebsite":      "vendor's actual website URL if you find one, otherwise null",
  "styleKeywords":    ["romantic", "candid", "modern", etc — up to 5],
  "priceHint":        "budget | mid | luxury  — null if no signal",
  "confidence":       "high | medium | low",
  "sourcesFound":     ["yelp", "instagram", "pinterest", "weddingwire", ...],
  "notFound":         false
}

Confidence rubric:
  high   — multiple independent sources confirm the same business; description quotes specifics from their own materials.
  medium — at least one strong source (their IG / a review site) with consistent details; description is reasonable but lighter on specifics.
  low    — can find the name but no consistent details; OR results look like a different business with the same name.

If you cannot find the vendor at all on the web, return:
  { "notFound": true, "confidence": "low", "description": null, ... }`;

type AnthropicResp = { content: Array<{ type: string; text?: string }> };

type RawVerdict = {
  description?:     unknown;
  specialties?:     unknown;
  serviceAreas?:    unknown;
  instagramHandle?: unknown;
  yelpUrl?:         unknown;
  pinterestUrl?:    unknown;
  realWebsite?:     unknown;
  styleKeywords?:   unknown;
  priceHint?:       unknown;
  confidence?:      unknown;
  sourcesFound?:    unknown;
  notFound?:        unknown;
};

type Verdict = {
  description:     string | null;
  specialties:     string[];
  serviceAreas:    string[];
  instagramHandle: string | null;
  yelpUrl:         string | null;
  pinterestUrl:    string | null;
  realWebsite:     string | null;
  styleKeywords:   string[];
  priceHint:       "budget" | "mid" | "luxury" | null;
  confidence:      "high" | "medium" | "low";
  sourcesFound:    string[];
  notFound:        boolean;
};

function safeParseJson(raw: string): RawVerdict | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

function coerceVerdict(raw: RawVerdict | null): Verdict {
  const conf = (raw?.confidence === "high" || raw?.confidence === "medium" || raw?.confidence === "low")
    ? raw.confidence
    : "low";
  const priceHint = (raw?.priceHint === "budget" || raw?.priceHint === "mid" || raw?.priceHint === "luxury")
    ? raw.priceHint
    : null;
  return {
    description:     typeof raw?.description === "string" ? raw.description.trim() : null,
    specialties:     Array.isArray(raw?.specialties) ? (raw.specialties as unknown[]).filter((x): x is string => typeof x === "string") : [],
    serviceAreas:    Array.isArray(raw?.serviceAreas) ? (raw.serviceAreas as unknown[]).filter((x): x is string => typeof x === "string") : [],
    instagramHandle: typeof raw?.instagramHandle === "string" ? raw.instagramHandle.replace(/^@/, "").trim() || null : null,
    yelpUrl:         typeof raw?.yelpUrl === "string" && raw.yelpUrl.startsWith("http") ? raw.yelpUrl : null,
    pinterestUrl:    typeof raw?.pinterestUrl === "string" && raw.pinterestUrl.startsWith("http") ? raw.pinterestUrl : null,
    realWebsite:     typeof raw?.realWebsite === "string" && raw.realWebsite.startsWith("http") ? raw.realWebsite : null,
    styleKeywords:   Array.isArray(raw?.styleKeywords) ? (raw.styleKeywords as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 5) : [],
    priceHint,
    confidence:      conf,
    sourcesFound:    Array.isArray(raw?.sourcesFound) ? (raw.sourcesFound as unknown[]).filter((x): x is string => typeof x === "string") : [],
    notFound:        raw?.notFound === true,
  };
}

async function researchVendor(client: Anthropic, v: Candidate): Promise<Verdict | null> {
  const cityLine = v.city ? `${v.city}, Ontario` : `Ontario`;
  const reviewLine =
    v.googleRating && v.reviewCount
      ? `Google: ${v.googleRating} ★ across ${v.reviewCount} reviews (confirms they're a real, operating business).`
      : "";

  const userPrompt = [
    "Research this wedding vendor and extract info.",
    "",
    `Name:     ${v.name}`,
    `Category: ${v.category}`,
    `City:     ${cityLine}`,
    reviewLine,
    "",
    "Use the web_search tool. Search variations of the name + city +",
    "Ontario + wedding + category. Then return the JSON exactly as",
    "specified in the system prompt.",
  ].filter(Boolean).join("\n");

  let res;
  try {
    res = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 2_000,
      system:     SYSTEM_PROMPT,
      tools: [
        {
          type:     "web_search_20250305",
          name:     "web_search",
          max_uses: 3,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
      messages: [{ role: "user", content: userPrompt }],
    }) as unknown as AnthropicResp;
  } catch (err) {
    console.warn(`  [error] ${v.name}: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  const text = res.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
  return coerceVerdict(safeParseJson(text));
}

/* ─── Main ───────────────────────────────────────────────────────── */

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} candidate(s)  ` +
    `(limit=${args.limit}, min-reviews=${args.minReviews})  ` +
    `${args.dryRun ? "· DRY RUN" : "· WRITE"}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to research."); return;
  }

  let enriched      = 0;
  let skippedLow    = 0;
  let notFound      = 0;
  let errored       = 0;
  let websitesFound = 0;

  for (const v of candidates) {
    console.log(
      `\n[${v.id}] ${v.name}  ${v.category}  ${v.city ?? "?"}  ` +
      `${v.googleRating ?? "?"}★/${v.reviewCount ?? 0} reviews`,
    );
    const verdict = await researchVendor(client, v);
    if (!verdict) { errored++; await sleep(PER_VENDOR_DELAY_MS); continue; }

    if (verdict.notFound) {
      console.log(`  · not found online`);
      notFound++;
      await sleep(PER_VENDOR_DELAY_MS);
      continue;
    }

    if (verdict.confidence === "low") {
      console.log(`  · low confidence — skipping`);
      skippedLow++;
      await sleep(PER_VENDOR_DELAY_MS);
      continue;
    }

    /* Quality verdict — print the full payload so we can audit smoke
     * tests, then either write or note dry-run. */
    console.log(`  confidence:   ${verdict.confidence}`);
    console.log(`  sources:      ${verdict.sourcesFound.join(", ") || "(none)"}`);
    if (verdict.realWebsite)     console.log(`  realWebsite:  ${verdict.realWebsite}`);
    if (verdict.instagramHandle) console.log(`  instagram:    @${verdict.instagramHandle}`);
    if (verdict.yelpUrl)         console.log(`  yelpUrl:      ${verdict.yelpUrl}`);
    if (verdict.pinterestUrl)    console.log(`  pinterestUrl: ${verdict.pinterestUrl}`);
    if (verdict.specialties.length)   console.log(`  specialties:  ${verdict.specialties.join(", ")}`);
    if (verdict.serviceAreas.length)  console.log(`  serviceAreas: ${verdict.serviceAreas.join(", ")}`);
    if (verdict.styleKeywords.length) console.log(`  style:        ${verdict.styleKeywords.join(", ")}`);
    if (verdict.priceHint)            console.log(`  priceHint:    ${verdict.priceHint}`);
    if (verdict.description) {
      const preview = verdict.description.replace(/\s+/g, " ");
      console.log(`  description:  ${preview.slice(0, 400)}${preview.length > 400 ? "…" : ""}`);
    }

    if (args.dryRun) {
      enriched++;
      await sleep(PER_VENDOR_DELAY_MS);
      continue;
    }

    /* Write — only the fields that came back populated. Description is
     * the gating signal; we won't write the other metadata without it. */
    if (!verdict.description) {
      console.log(`  ! verdict had no description — skipping write`);
      skippedLow++;
      await sleep(PER_VENDOR_DELAY_MS);
      continue;
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const patch: Record<string, any> = {
      description:     verdict.description,
      specialties:     verdict.specialties.length > 0 ? verdict.specialties : null,
      serviceAreas:    verdict.serviceAreas.length > 0 ? verdict.serviceAreas : null,
      instagramHandle: verdict.instagramHandle,
      yelpUrl:         verdict.yelpUrl,
      pinterestUrl:    verdict.pinterestUrl,
      bioEnrichedAt:   new Date(),
      bioSource:       "web_search",
      updatedAt:       new Date(),
    };

    /* If Claude surfaced a real website AND the vendor currently has
     * either no website OR only a social URL on file, persist it and
     * clear the search flag. We DON'T overwrite an existing real
     * (non-social) website — assume those were intentional. */
    const isReplaceable = !v.website || isSocialOnlyUrl(v.website);
    if (verdict.realWebsite && isReplaceable) {
      patch.website            = verdict.realWebsite;
      patch.needsWebsiteSearch = false;
      websitesFound++;
    }

    /* If the vendor is currently hidden purely for having no website,
     * clear the hide. Other hidden_reason values (wrong_category, etc.)
     * stay intact. */
    /* (Vendor row's current isHidden is whatever we filtered for —
     * the loadCandidates SQL gate already requires is_hidden=false,
     * so this clause is a defence-in-depth no-op today. Kept for
     * when the caller widens the filter.) */

    await db.update(vendors).set(patch).where(eq(vendors.id, v.id));
    enriched++;
    await sleep(PER_VENDOR_DELAY_MS);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Candidates:       ${candidates.length}`);
  console.log(`Enriched:         ${enriched}${args.dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Real websites:    ${websitesFound}`);
  console.log(`Not found:        ${notFound}`);
  console.log(`Skipped (low):    ${skippedLow}`);
  console.log(`Errored:          ${errored}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
