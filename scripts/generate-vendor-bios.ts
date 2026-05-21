/**
 * Synthesize 2-3 sentence vendor descriptions from DB facts only — no
 * website scraping, no web search. The third tier of the bio pipeline:
 *
 *   Tier 1: enrich-vendor-bios.ts        scrapes their website
 *   Tier 2: enrich-vendor-websearch.ts   Claude web_search (no website)
 *   Tier 3: generate-vendor-bios.ts      bio from name + rating + city
 *
 * Candidate filter (vendors who have a photo but nothing written):
 *   is_hidden          = false
 *   AND bio_enriched_at IS NULL
 *   AND description    IS NULL
 *   AND hero_image     IS NOT NULL
 *
 * The prompt is intentionally restrictive: Claude is told to use ONLY
 * the facts provided, never invent details. The output is short
 * (2-3 sentences) so there's little room to hallucinate.
 *
 * On success the vendor row gets:
 *   description     = generated text
 *   bio_source      = 'generated'
 *   bio_enriched_at = NOW()
 *
 * Cost: ~$0.0002 / vendor (claude-haiku-4-5, ~250 input + ~80 output
 * tokens). 891 candidates ≈ $0.18.
 *
 * CLI:
 *   npx tsx scripts/generate-vendor-bios.ts                    # dry-run, 5 samples
 *   npx tsx scripts/generate-vendor-bios.ts --limit 20         # dry-run, 20 samples
 *   npx tsx scripts/generate-vendor-bios.ts --confirm          # write all
 *   npx tsx scripts/generate-vendor-bios.ts --limit 50 --confirm
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

const PER_VENDOR_DELAY_MS = 250;
const COST_PER_VENDOR_USD = 0.0002;

type Args = { limit: number; dryRun: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit = 5;          /* default smoke-test size when no flag passed */
  let confirm = false;
  let explicitLimit = false;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") confirm = false;
    else if (arg === "--limit") {
      const n = parseInt(a[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) { limit = n; explicitLimit = true; }
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) { limit = n; explicitLimit = true; }
    }
  }
  /* When --confirm but no --limit → process every candidate. */
  if (confirm && !explicitLimit) limit = Number.MAX_SAFE_INTEGER;
  return { limit, dryRun: !confirm };
}

/* ─── Categories — human-readable for the prompt ───────────────── */

const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "wedding photographer",
  videographer:    "wedding videographer",
  dj:              "wedding DJ",
  florist:         "wedding florist",
  photo_booth:     "wedding photo booth rental company",
  catering:        "wedding caterer",
  cake:            "wedding cake designer",
  hair_makeup:     "wedding hair and makeup artist",
  officiant:       "wedding officiant",
  limo:            "wedding transportation provider",
  lighting_decor:  "wedding lighting and decor specialist",
  wedding_planner: "wedding planner",
};

/* ─── Candidate loader ─────────────────────────────────────────── */

type Candidate = {
  id:           number;
  name:         string;
  category:     string;
  city:         string | null;
  googleRating: string | null;
  reviewCount:  number | null;
  priceTier:    string | null;
  specialties:  unknown;
  serviceAreas: unknown;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  const q = db
    .select({
      id:           vendors.id,
      name:         vendors.name,
      category:     vendors.category,
      city:         vendors.city,
      googleRating: vendors.googleRating,
      reviewCount:  vendors.reviewCount,
      priceTier:    vendors.priceTier,
      specialties:  vendors.specialties,
      serviceAreas: vendors.serviceAreas,
    })
    .from(vendors)
    .where(and(
      eq(vendors.isHidden, false),
      isNull(vendors.bioEnrichedAt),
      isNull(vendors.description),
      isNotNull(vendors.heroImage),
    ))
    /* High-signal vendors first. Vendors with strong rating + review
     * count are the ones most worth giving a bio to. */
    .orderBy(vendors.id);

  const safeLimit = Math.min(args.limit, 100_000);
  const rows = await q.limit(safeLimit);
  return rows.map((r) => ({
    id:           r.id,
    name:         r.name,
    category:     r.category!,
    city:         r.city,
    googleRating: r.googleRating,
    reviewCount:  r.reviewCount,
    priceTier:    r.priceTier,
    specialties:  r.specialties,
    serviceAreas: r.serviceAreas,
  }));
}

/* ─── Prompt construction ──────────────────────────────────────── */

const SYSTEM_PROMPT = `You write 2-3 sentence professional wedding-directory descriptions for Ontario wedding vendors. Strict rules:

1. INVENTION BAN. Use ONLY the facts provided in the user message. If a field isn't in the input, don't write about it. Do NOT invent or imply specific services they offer (like "design consultation", "menu planning", "delivery", "logistics"), specific products they sell, processes they use, or years of operation. The ONLY things you may state about their services is the generic category itself (e.g. "wedding cake designer", "wedding photographer") — never list sub-services that weren't explicitly given.
2. THIRD PERSON ONLY. Never use "you", "your", "our", "we". The reader is browsing a directory — write about the vendor, not to the couple.
3. Canadian English (colour, centre, organise).
4. NO FILLER. Banned phrases include: "highly-rated", "exceptional", "world-class", "premier", "renowned", "boutique", "stunning", "passionate", "dedicated team", "go above and beyond", "every detail matters", "love stories", "magical day", "vision", "tailored", "personalised", "memorable", "trusted", "experienced", "talented", "creative team". Also avoid puffery generally — if you'd write it on a brochure cover, don't.
5. 2-3 sentences MAXIMUM. Be direct. The shortest version that captures the facts wins.
6. Be specific to their actual city + category. Name the city. Name the category in plain terms.
7. Only reference rating numbers when they're given AND meaningful (>=20 reviews). Skip otherwise.
8. End on a concrete factual note. No emotional appeals. No closing CTA.

Output ONLY the description text. No JSON, no quotes around it, no labels, no preamble.`;

function arrayLen(x: unknown): number {
  return Array.isArray(x) ? (x as unknown[]).filter((v) => typeof v === "string" && v.length > 0).length : 0;
}

function asStringList(x: unknown): string[] {
  return Array.isArray(x)
    ? (x as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
}

function buildUserPrompt(c: Candidate): string {
  const catLabel = CATEGORY_LABEL[c.category] ?? c.category;
  const cityLine = c.city ? `${c.city}, Ontario` : "Ontario";

  const specialties = asStringList(c.specialties);
  const serviceAreas = asStringList(c.serviceAreas);

  /* Only surface rating when both signal fields are present and the
   * review count is meaningful enough to mention (>= 20). Otherwise
   * we don't mention numbers at all per the system prompt rule. */
  const ratingLine =
    c.googleRating && (c.reviewCount ?? 0) >= 20
      ? `Google rating: ${c.googleRating}/5 across ${c.reviewCount} reviews`
      : null;

  /* Suppress 'mid' — it's the YP scraper's default value for every
   * vendor it imports, so it carries no real signal. Only surface
   * budget / premium / luxury, which were set deliberately. */
  const priceLine =
    c.priceTier && ["budget", "premium", "luxury"].includes(c.priceTier)
      ? `Price tier: ${c.priceTier}`
      : null;

  const specLine    = specialties.length > 0    ? `Specialties: ${specialties.join(", ")}`    : null;
  const serviceLine = serviceAreas.length > 0   ? `Service areas: ${serviceAreas.join(", ")}` : null;

  const lines = [
    `Vendor: ${c.name}`,
    `Type: ${catLabel} in ${cityLine}`,
    ratingLine,
    priceLine,
    specLine,
    serviceLine,
    "",
    "Write 2-3 sentences. Description text only — no labels, no quotes.",
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

/* ─── Claude call ──────────────────────────────────────────────── */

type AnthropicResp = { content: Array<{ type: string; text?: string }> };

async function generateOne(client: Anthropic, c: Candidate): Promise<string | null> {
  let res: AnthropicResp;
  try {
    res = (await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 250,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: buildUserPrompt(c) }],
    })) as unknown as AnthropicResp;
  } catch (err) {
    console.warn(`  [error] ${c.name}: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  const text = res.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim()
    /* Strip any wrapping quotes Claude might emit even with the
     * "no quotes" instruction. */
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "");

  if (text.length < 40) return null;
  return text;
}

/* ─── Main ─────────────────────────────────────────────────────── */

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} candidate(s)  ${args.dryRun ? "· DRY RUN (showing samples)" : "· WRITE"}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do — pool is empty.");
    return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(3)}\n`);

  let generated = 0, errored = 0;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const desc = await generateOne(client, c);
    if (!desc) { errored++; await sleep(PER_VENDOR_DELAY_MS); continue; }

    console.log(`[${i + 1}/${candidates.length}] ${c.name} — ${c.category} · ${c.city ?? "?"}`);
    console.log(`  ${desc.replace(/\s+/g, " ")}\n`);

    if (!args.dryRun) {
      await db
        .update(vendors)
        .set({
          description:    desc,
          bioSource:      "generated",
          bioEnrichedAt:  new Date(),
          updatedAt:      new Date(),
        })
        .where(eq(vendors.id, c.id));
    }
    generated++;

    /* Progress checkpoint every 50 vendors during a confirmed run. */
    if (!args.dryRun && (i + 1) % 50 === 0) {
      console.log(`  ── progress ${i + 1}/${candidates.length} · generated=${generated} errored=${errored}`);
    }

    await sleep(PER_VENDOR_DELAY_MS);
  }

  console.log(`=== Summary ===`);
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Generated:  ${generated}${args.dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Errored:    ${errored}`);
  console.log(`Cost:       ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(3)}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
