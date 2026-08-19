/**
 * Venue counterpart to scripts/backfill-website-heros.ts.
 *
 * Populates venues.hero_image_custom by scraping each venue's own
 * website, letting Claude Vision pick the best hero out of 3 candidates,
 * uploading to R2 at vendors/{slug}/website-hero.{ext} (same prefix as
 * the existing venue gallery photos — legacy naming quirk, kept for
 * consistency with the additional_photos URLs).
 *
 * Target population:
 *   hero_image_custom IS NULL
 *   AND website IS NOT NULL AND website <> ''
 *   AND google_closed IS DISTINCT FROM 'yes'
 *
 * The vendor hoist + backfill covered 2,562/11,487 vendor rows.
 * Venue coverage was 479/639 after the hoist; this script targets the
 * remaining 160 visible venues that have a website but no hero photo.
 *
 * CLI:
 *   npx tsx scripts/backfill-venue-website-heros.ts                # dry-run, 5 samples
 *   npx tsx scripts/backfill-venue-website-heros.ts --limit 20     # bigger smoke
 *   npx tsx scripts/backfill-venue-website-heros.ts --confirm      # write all
 *   npx tsx scripts/backfill-venue-website-heros.ts --confirm --name "White Oaks"
 */
import "./_env";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";
import { scrapeWebsiteHero, buildR2Config } from "../src/lib/scrape-website-hero";

const CONCURRENCY = 3;
const COST_PER_VENUE_USD = 0.003;

type Args = { limit: number; dryRun: boolean; name: string | null; onlyMissing: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit = 5;
  let explicitLimit = false;
  let confirm = false;
  let name: string | null = null;
  let onlyMissing = true;  /* Default TRUE for venues — we're populating gaps, not upgrading. */
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") confirm = false;
    else if (arg === "--all") onlyMissing = false;
    else if (arg === "--limit") {
      const n = parseInt(a[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) { limit = n; explicitLimit = true; }
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) { limit = n; explicitLimit = true; }
    } else if (arg === "--name") {
      name = a[++i] ?? null;
    } else if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length);
    }
  }
  if (confirm && !explicitLimit && !name) limit = Number.MAX_SAFE_INTEGER;
  return { limit, dryRun: !confirm, name, onlyMissing };
}

type Candidate = {
  id:        number;
  slug:      string;
  name:      string;
  venueType: string;
  website:   string;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  const q = db
    .select({
      id:        venues.id,
      slug:      venues.slug,
      name:      venues.name,
      venueType: venues.venueType,
      website:   venues.website,
    })
    .from(venues)
    .where(and(
      sql`${venues.googleClosed} IS DISTINCT FROM 'yes'`,
      isNotNull(venues.website),
      sql`${venues.website} <> ''`,
      args.onlyMissing ? isNull(venues.heroImageCustom) : sql`TRUE`,
      args.name ? sql`${venues.name} ILIKE ${'%' + args.name + '%'}` : sql`TRUE`,
    ))
    .orderBy(venues.id);

  const safeLimit = Math.min(args.limit, 1_000_000);
  const rows = await q.limit(safeLimit);
  return rows
    .filter((r): r is Candidate =>
      r.website != null && r.website !== "" && r.venueType != null && r.name != null)
    .map((r) => ({
      id:        r.id,
      slug:      r.slug,
      name:      r.name,
      venueType: r.venueType!,
      website:   r.website!,
    }));
}

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r2 = buildR2Config();
  if (!r2 && !args.dryRun) {
    console.error("R2 env vars missing. Set CLOUDFLARE_R2_* — or pass --dry-run.");
    process.exit(1);
  }

  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} venue(s)` +
    `${args.name ? ` matching "${args.name}"` : ""}` +
    `${args.dryRun ? "  · DRY RUN (vision call runs, no R2 write)" : "  · WRITE"}`,
  );
  if (candidates.length === 0) { console.log("Nothing to do."); return; }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENUE_USD).toFixed(3)}\n`);

  let ok = 0, skipped = 0;

  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= candidates.length) return;
      const c = candidates[i];
      try {
        /* scrapeWebsiteHero takes vendor-named params, but the R2 key
         * scheme (vendors/{slug}/website-hero.{ext}) matches the
         * existing venue gallery URLs, so we reuse the function
         * verbatim and pass venue data through. */
        const r = await scrapeWebsiteHero({
          website:        c.website,
          vendorName:     c.name,
          vendorSlug:     c.slug,
          vendorCategory: c.venueType,
          anthropic:      client,
          r2:             args.dryRun ? null : r2,
        });

        if (r.kind === "skipped") {
          skipped++;
          console.log(`  [${i + 1}/${candidates.length}] SKIP  ${c.slug}  · ${r.reason}`);
          continue;
        }

        ok++;
        console.log(
          `  [${i + 1}/${candidates.length}] OK    ${c.slug}  · pick=#${r.pickedAt} · ${r.confidence} · "${r.reason.slice(0, 60)}"`,
        );
        console.log(`        ${args.dryRun ? "source" : "R2"}: ${r.url.slice(0, 120)}${r.url.length > 120 ? "…" : ""}`);

        if (!args.dryRun) {
          await db
            .update(venues)
            .set({
              heroImageCustom:      r.url,
              heroImageSource:      "website",
              heroImageRefreshedAt: new Date(),
              updatedAt:            new Date(),
            })
            .where(eq(venues.id, c.id));
        }
      } catch (err) {
        skipped++;
        console.log(
          `  [${i + 1}/${candidates.length}] ERR   ${c.slug}  · ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n=== Summary ===`);
  console.log(`Candidates: ${candidates.length}`);
  console.log(`OK:         ${ok}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Cost:       ~$${(candidates.length * COST_PER_VENUE_USD).toFixed(3)}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
