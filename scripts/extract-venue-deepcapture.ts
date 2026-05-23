/**
 * Venue deep-capture extraction pipeline.
 *
 * For each candidate venue (website on file, not yet deep-captured):
 *   A. Fetch homepage + wedding-specific pages (concurrent, 10 workers).
 *      Rank by wedding-keyword density, keep the top 2-3 pages.
 *      Combine + truncate to ~15k tokens (~60k chars). Cache to
 *      venues.raw_site_text + venues.site_snapshot_at.
 *   B. Send to claude-sonnet-4-6 with a forced-JSON prompt. Retry once
 *      on parse failure. Skip venues whose combined text < 200 words.
 *   C. Persist the parsed object to venues.deep_capture and promote a
 *      handful of scalars (capacity, price_tier, catering_model …) to
 *      their own columns for fast SQL.
 *
 * The narrative + completeness fields are filled by the next two
 * scripts in the pipeline — this script leaves them null.
 *
 * CLI:
 *   npx tsx scripts/extract-venue-deepcapture.ts                # 10-venue dry-run
 *   npx tsx scripts/extract-venue-deepcapture.ts --dry-run --limit 5
 *   npx tsx scripts/extract-venue-deepcapture.ts --confirm --limit 50
 *   npx tsx scripts/extract-venue-deepcapture.ts --confirm --rerun
 *   npx tsx scripts/extract-venue-deepcapture.ts --confirm --concurrency 8
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";

const MODEL                  = "claude-sonnet-4-6";
const MAX_INPUT_CHARS        = 60_000;  /* ~15k tokens for Sonnet */
const FETCH_TIMEOUT_MS       = 9_000;
const PER_VENUE_PAUSE_MS     = 200;     /* Anthropic politeness */
const MIN_WORDS_FOR_EXTRACT  = 200;
const DEFAULT_CONCURRENCY    = 10;
const DEFAULT_LIMIT          = 10;
const USER_AGENT             = "Mozilla/5.0 (compatible; OWVBot/1.0; +https://ontarioweddingvendors.com)";

const URL_SUFFIX_CANDIDATES = [
  "/weddings",
  "/wedding",
  "/events",
  "/packages",
  "/pricing",
  "/celebrate",
] as const;

const WEDDING_KEYWORDS = [
  "wedding", "weddings", "ceremony", "ceremonies", "reception", "receptions",
  "package", "packages", "pricing", "celebrate", "celebration", "capacity",
  "guests", "bridal", "bride", "groom", "officiant",
];

/* ─── CLI ──────────────────────────────────────────────────────────── */

type Args = {
  limit:       number;
  confirm:     boolean;
  rerun:       boolean;
  concurrency: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let limit       = DEFAULT_LIMIT;
  let confirm     = false;
  let rerun       = false;
  let concurrency = DEFAULT_CONCURRENCY;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm")  confirm = true;
    else if (a === "--dry-run") confirm = false;
    else if (a === "--rerun")   rerun = true;
    else if (a === "--limit") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a === "--concurrency") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) concurrency = n;
    } else if (a.startsWith("--limit=")) {
      const n = parseInt(a.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, confirm, rerun, concurrency };
}

/* ─── Page fetching + ranking ──────────────────────────────────────── */

type Page = { url: string; text: string; score: number };

async function fetchPage(url: string): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const t   = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers:  { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
      redirect: "follow",
      signal:   ctl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    const html = await res.text();
    const $    = cheerio.load(html);
    $("script,style,noscript,nav,footer,header,svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function keywordDensity(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of WEDDING_KEYWORDS) {
    /* word-boundary count via split — faster than per-keyword regex */
    const re = new RegExp(`\\b${kw}\\b`, "g");
    const m  = lower.match(re);
    if (m) hits += m.length;
  }
  /* Normalize by length so a 50k page doesn't dominate a 5k page */
  return hits / Math.max(1, text.length / 1000);
}

function candidateUrls(website: string, weddingsPageUrl: string | null): string[] {
  const urls = new Set<string>();
  if (weddingsPageUrl) urls.add(weddingsPageUrl);
  try {
    const base = new URL(website);
    urls.add(base.toString());
    for (const suffix of URL_SUFFIX_CANDIDATES) {
      urls.add(new URL(suffix, base).toString());
    }
  } catch {
    /* Bad website URL — drop the venue, will surface as no-text below. */
  }
  return Array.from(urls);
}

async function collectSiteText(opts: {
  website: string;
  weddingsPageUrl: string | null;
}): Promise<{ text: string; usedUrls: string[] }> {
  const urls = candidateUrls(opts.website, opts.weddingsPageUrl);
  const pages: Page[] = [];
  for (const url of urls) {
    const text = await fetchPage(url);
    if (!text) continue;
    pages.push({ url, text, score: keywordDensity(text) });
  }
  /* Take top 3 pages by density, drop those that scored zero (no
   * wedding signal — usually 404 fallthroughs to a homepage). */
  pages.sort((a, b) => b.score - a.score);
  const kept = pages.filter((p) => p.score > 0).slice(0, 3);
  /* If literally nothing scored, fall back to the homepage so we
   * still get *some* text — better than skipping the row. */
  if (kept.length === 0 && pages.length > 0) kept.push(pages[0]);

  let combined = kept.map((p) => `---PAGE--- ${p.url}\n${p.text}`).join("\n\n");
  if (combined.length > MAX_INPUT_CHARS) combined = combined.slice(0, MAX_INPUT_CHARS);
  return { text: combined, usedUrls: kept.map((p) => p.url) };
}

/* ─── Claude extraction ────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a structured-data extraction engine for a wedding venue directory.
You will receive the scraped text of a wedding venue's website (one or more pages).
Extract ONLY facts that are present in or directly supported by the text.

HARD RULES:
- Output a SINGLE valid JSON object matching the provided schema. No prose, no markdown, no code fences.
- For every field, return {value, confidence, source}.
- NEVER invent numbers, prices, or capacities. If the text doesn't state or clearly imply it, set value=null, confidence=null, source=null.
- confidence: "high" only if the site explicitly states it. "medium" if strongly implied or from review/summary text. "low" if you are inferring from venue type/context.
- source: "site" if from the venue's own page text; "places" if from a Google summary/review block; "inferred" if you reasoned it from type/region.
- If the site states a price RANGE, capture the floor in starting_price/per_plate_from and note the range in peak_season_note.
- pricing.pricing_disclosed = true ONLY if an actual dollar figure appears in the text.
- For booleans, use true/false only when supported; otherwise null.
- Lists (ceremony_sites, reception_spaces, style_tags, best_for, nearby) contain only items grounded in the text.
- Do NOT produce the "narrative" object — that is generated in a separate step. Leave it null.
- Do NOT clobber: you are extracting raw facts; the pipeline decides what to keep.

Return the JSON object only.`;

const SCHEMA_SKELETON = {
  schema_version: 1,
  capacity: {
    ceremony_max:           { value: null, confidence: null, source: null },
    reception_seated_max:   { value: null, confidence: null, source: null },
    reception_standing_max: { value: null, confidence: null, source: null },
    minimum_guests:         { value: null, confidence: null, source: null },
    multiple_event_spaces:  { value: null, confidence: null, source: null },
  },
  pricing: {
    price_tier:        { value: null, confidence: null, source: null },
    starting_price:    { value: null, confidence: null, source: null },
    per_plate_from:    { value: null, confidence: null, source: null },
    pricing_model:     { value: null, confidence: null, source: null },
    minimum_spend:     { value: null, confidence: null, source: null },
    peak_season_note:  { value: null, confidence: null, source: null },
    pricing_disclosed: { value: null, confidence: null, source: null },
  },
  catering: {
    model:            { value: null, confidence: null, source: null },
    in_house_kitchen: { value: null, confidence: null, source: null },
    bar_service:      { value: null, confidence: null, source: null },
    dietary:          { value: null, confidence: null, source: null },
    cake_policy:      { value: null, confidence: null, source: null },
  },
  spaces: {
    indoor:              { value: null, confidence: null, source: null },
    outdoor:             { value: null, confidence: null, source: null },
    ceremony_onsite:     { value: null, confidence: null, source: null },
    ceremony_sites:      { value: [],   confidence: null, source: null },
    reception_spaces:    { value: [],   confidence: null, source: null },
    rain_backup:         { value: null, confidence: null, source: null },
    tent_required:       { value: null, confidence: null, source: null },
    getting_ready_space: { value: null, confidence: null, source: null },
  },
  logistics: {
    noise_curfew:      { value: null, confidence: null, source: null },
    vendor_policy:     { value: null, confidence: null, source: null },
    parking:           { value: null, confidence: null, source: null },
    accessibility:     { value: null, confidence: null, source: null },
    in_house_av:       { value: null, confidence: null, source: null },
    ceremony_rehearsal:{ value: null, confidence: null, source: null },
  },
  accommodations: {
    on_site:    { value: null, confidence: null, source: null },
    room_count: { value: null, confidence: null, source: null },
    nearby:     { value: [],   confidence: null, source: null },
  },
  experience: {
    venue_type:  { value: null, confidence: null, source: null },
    style_tags:  { value: [],   confidence: null, source: null },
    scenery:     { value: null, confidence: null, source: null },
    best_for:    { value: [],   confidence: null, source: null },
    exclusivity: { value: null, confidence: null, source: null },
  },
  booking: {
    lead_time_note:  { value: null, confidence: null, source: null },
    deposit_note:    { value: null, confidence: null, source: null },
    tours_available: { value: null, confidence: null, source: null },
  },
};

type DeepCaptureRoot = typeof SCHEMA_SKELETON & {
  narrative?: { about: unknown; highlights: unknown };
  _meta?: Record<string, unknown>;
};

function userMessage(opts: {
  name: string;
  city: string | null;
  region: string | null;
  venueType: string | null;
  capacityMax: number | null;
  siteText: string;
}): string {
  return [
    `VENUE: ${opts.name} — ${opts.city ?? "?"}, ${opts.region ?? "?"}, Ontario`,
    `KNOWN (do not contradict; fill gaps): venue_type=${opts.venueType ?? "unknown"}, capacity_hint=${opts.capacityMax ?? "none"}`,
    "",
    "SCHEMA (return exactly this shape, all fields present, nulls where unknown):",
    JSON.stringify(SCHEMA_SKELETON, null, 2),
    "",
    "WEBSITE TEXT (pages separated by ---PAGE---):",
    opts.siteText,
  ].join("\n");
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

async function callClaude(
  client: Anthropic,
  userText: string,
  retry: boolean,
): Promise<DeepCaptureRoot | null> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: userText },
  ];
  for (let attempt = 0; attempt <= (retry ? 1 : 0); attempt++) {
    if (attempt === 1) {
      messages.push({ role: "user", content: "Your previous output was not valid JSON. Return ONLY the JSON object." });
    }
    let res;
    try {
      res = await client.messages.create({
        model:      MODEL,
        max_tokens: 4_000,
        system:     SYSTEM_PROMPT,
        messages,
      });
    } catch (err) {
      console.warn(`  [claude error] ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
    const text = res.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsed = safeParseJson(text);
    if (parsed) return parsed as DeepCaptureRoot;
  }
  return null;
}

/* ─── Persistence ──────────────────────────────────────────────────── */

type Scalar = number | string | boolean | null;

function pickValue(obj: unknown, ...path: string[]): Scalar {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return null;
    }
  }
  /* path lands on the {value,confidence,source} leaf */
  if (cur && typeof cur === "object" && "value" in (cur as Record<string, unknown>)) {
    const v = (cur as { value: unknown }).value;
    if (v == null) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    return null;
  }
  return null;
}

function countFilledFields(dc: DeepCaptureRoot): number {
  let n = 0;
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if ("value" in (node as Record<string, unknown>) && "confidence" in (node as Record<string, unknown>)) {
      const v = (node as { value: unknown }).value;
      if (Array.isArray(v) ? v.length > 0 : v != null) n++;
      return;
    }
    for (const child of Object.values(node as Record<string, unknown>)) walk(child);
  };
  walk(dc);
  return n;
}

/* ─── Per-venue runner ─────────────────────────────────────────────── */

type VenueRow = {
  id:               number;
  slug:             string;
  name:             string;
  city:             string | null;
  region:           string | null;
  website:          string | null;
  weddingsPageUrl:  string | null;
  venueType:        string | null;
  capacityMax:      number | null;
};

type RunOutcome =
  | { kind: "skipped"; reason: string }
  | { kind: "extracted"; fieldsFilled: number; usedUrls: string[]; deepCapture: DeepCaptureRoot; scalars: PromotedScalars; charsIn: number }
  | { kind: "failed";  reason: string };

type PromotedScalars = {
  ceremonyCapacity:     Scalar;
  receptionSeatedMax:   Scalar;
  receptionStandingMax: Scalar;
  priceTier:            Scalar;
  startingPrice:        Scalar;
  cateringModel:        Scalar;
};

async function runOne(
  client:  Anthropic,
  venue:   VenueRow,
  confirm: boolean,
): Promise<RunOutcome> {
  if (!venue.website) return { kind: "skipped", reason: "no_website" };

  const { text, usedUrls } = await collectSiteText({
    website:         venue.website,
    weddingsPageUrl: venue.weddingsPageUrl,
  });

  /* Save raw_site_text + snapshot timestamp even if we end up skipping
   * extraction — the cache is valuable on its own. */
  if (confirm) {
    await db
      .update(venues)
      .set({ rawSiteText: text || null, siteSnapshotAt: new Date(), updatedAt: new Date() })
      .where(eq(venues.id, venue.id));
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS_FOR_EXTRACT) {
    return { kind: "skipped", reason: `thin_site (${wordCount}w)` };
  }

  const verdict = await callClaude(
    client,
    userMessage({
      name:        venue.name,
      city:        venue.city,
      region:      venue.region,
      venueType:   venue.venueType,
      capacityMax: venue.capacityMax,
      siteText:    text,
    }),
    /* retry */ true,
  );
  if (!verdict) return { kind: "failed", reason: "claude_json_parse" };

  /* Stamp pipeline metadata onto the object so downstream scripts have it. */
  const fieldsFilled = countFilledFields(verdict);
  const enriched: DeepCaptureRoot = {
    ...verdict,
    _meta: {
      extracted_from_urls:        usedUrls,
      pricing_disclosed_on_site:  pickValue(verdict, "pricing", "pricing_disclosed") === true,
      extraction_model:           MODEL,
      fields_filled:              fieldsFilled,
      extracted_at:               new Date().toISOString(),
    },
  };

  const scalars: PromotedScalars = {
    ceremonyCapacity:     pickValue(verdict, "capacity", "ceremony_max"),
    receptionSeatedMax:   pickValue(verdict, "capacity", "reception_seated_max"),
    receptionStandingMax: pickValue(verdict, "capacity", "reception_standing_max"),
    priceTier:            pickValue(verdict, "pricing",  "price_tier"),
    startingPrice:        pickValue(verdict, "pricing",  "starting_price"),
    cateringModel:        pickValue(verdict, "catering", "model"),
  };

  if (confirm) {
    await db
      .update(venues)
      .set({
        deepCapture:          enriched,
        deepCaptureAt:        new Date(),
        deepCaptureVersion:   1,
        ceremonyCapacity:     toInt(scalars.ceremonyCapacity),
        receptionSeatedMax:   toInt(scalars.receptionSeatedMax),
        receptionStandingMax: toInt(scalars.receptionStandingMax),
        priceTier:            typeof scalars.priceTier === "string" ? scalars.priceTier : null,
        startingPrice:        toInt(scalars.startingPrice),
        cateringModel:        typeof scalars.cateringModel === "string" ? scalars.cateringModel : null,
        updatedAt:            new Date(),
      })
      .where(eq(venues.id, venue.id));
  }

  return {
    kind:         "extracted",
    fieldsFilled,
    usedUrls,
    deepCapture:  enriched,
    scalars,
    charsIn:      text.length,
  };
}

function toInt(s: Scalar): number | null {
  if (s == null) return null;
  if (typeof s === "number") return Math.round(s);
  const n = parseInt(String(s).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/* ─── Concurrency primitives ───────────────────────────────────────── */

async function runPool<T, R>(
  items:        T[],
  concurrency:  number,
  worker:       (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function pump() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => pump()));
  return results;
}

/* ─── Main ─────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const filter = and(
    isNotNull(venues.website),
    ne(venues.website, ""),
    args.rerun ? undefined : isNull(venues.deepCaptureAt),
  );

  const candidates = await db
    .select({
      id:              venues.id,
      slug:            venues.slug,
      name:            venues.name,
      city:            venues.city,
      region:          venues.region,
      website:         venues.website,
      weddingsPageUrl: venues.weddingsPageUrl,
      venueType:       venues.venueType,
      capacityMax:     venues.capacityMax,
    })
    .from(venues)
    .where(filter as ReturnType<typeof and>)
    .orderBy(venues.id)
    .limit(args.limit);

  console.log(`Mode: ${args.confirm ? "WRITE" : "DRY-RUN"}`);
  console.log(`Candidates: ${candidates.length} (limit ${args.limit}, concurrency ${args.concurrency}, ${args.rerun ? "rerun" : "skip-extracted"})\n`);

  const tally = { extracted: 0, skipped: 0, failed: 0 };
  const sample: Array<{ slug: string; name: string; outcome: RunOutcome }> = [];

  await runPool(candidates, args.concurrency, async (v, i) => {
    const outcome = await runOne(client, v as VenueRow, args.confirm);
    if (outcome.kind === "extracted") tally.extracted++;
    else if (outcome.kind === "skipped") tally.skipped++;
    else tally.failed++;

    const tag =
      outcome.kind === "extracted" ? `EXTRACT (${outcome.fieldsFilled} fields, ${outcome.charsIn}c, ${outcome.usedUrls.length} pages)` :
      outcome.kind === "skipped"   ? `SKIP    (${outcome.reason})` :
      `FAIL    (${outcome.reason})`;
    console.log(`  [${i + 1}/${candidates.length}] ${tag.padEnd(60)} ${v.slug}`);

    if (outcome.kind === "extracted" && sample.length < 5) {
      sample.push({ slug: v.slug, name: v.name, outcome });
    }
    await sleep(PER_VENUE_PAUSE_MS);
  });

  console.log(`\n=== Summary ===`);
  console.log(`Extracted: ${tally.extracted}`);
  console.log(`Skipped:   ${tally.skipped}`);
  console.log(`Failed:    ${tally.failed}`);

  /* In dry-run, print the first 5 extracted payloads for review. */
  if (!args.confirm && sample.length > 0) {
    console.log(`\n=== Sample extractions (dry-run preview) ===`);
    for (const s of sample) {
      if (s.outcome.kind !== "extracted") continue;
      console.log(`\n── ${s.name} (${s.slug}) — ${s.outcome.fieldsFilled} fields, ${s.outcome.usedUrls.length} pages, ${s.outcome.charsIn} chars`);
      console.log(`   URLs: ${s.outcome.usedUrls.join(", ")}`);
      console.log(`   Scalars: ${JSON.stringify(s.outcome.scalars)}`);
      console.log(`   Key facts:`);
      const dc = s.outcome.deepCapture;
      const fmt = (k: string, v: Scalar) => v == null ? "—" : `${k}=${v}`;
      console.log(`     ${fmt("ceremony_max",          pickValue(dc, "capacity",  "ceremony_max"))}`);
      console.log(`     ${fmt("seated_max",            pickValue(dc, "capacity",  "reception_seated_max"))}`);
      console.log(`     ${fmt("price_tier",            pickValue(dc, "pricing",   "price_tier"))}`);
      console.log(`     ${fmt("starting_price",        pickValue(dc, "pricing",   "starting_price"))}`);
      console.log(`     ${fmt("pricing_disclosed",     pickValue(dc, "pricing",   "pricing_disclosed"))}`);
      console.log(`     ${fmt("catering_model",        pickValue(dc, "catering",  "model"))}`);
      console.log(`     ${fmt("ceremony_onsite",       pickValue(dc, "spaces",    "ceremony_onsite"))}`);
      console.log(`     ${fmt("noise_curfew",          pickValue(dc, "logistics", "noise_curfew"))}`);
      console.log(`     ${fmt("vendor_policy",         pickValue(dc, "logistics", "vendor_policy"))}`);
      console.log(`     ${fmt("on_site_accom",         pickValue(dc, "accommodations", "on_site"))}`);
    }
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });

/* Quiet the imports we kept around for symmetry with sibling scripts. */
void or; void sql;
