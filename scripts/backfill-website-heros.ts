/**
 * Bulk-backfill vendors.hero_image_custom with the best hero image
 * scraped from each vendor's own website, selected by claude-haiku
 * vision out of 3 candidates.
 *
 * Filter:
 *   is_hidden        = false
 *   AND website      IS NOT NULL AND website <> ''
 *
 * NOTE we run this for ALL visible vendors with a website, including
 * those that already have a Google Places hero_image. Website photos
 * are almost always higher quality than Google's auto-selected
 * thumbnails. hero_image stays as a fallback if the website scrape
 * fails for any reason.
 *
 * The detail-page resolver (src/lib/utils.ts → vendorHeroImageUrl)
 * already prefers hero_image_custom over hero_image, so once this
 * runs the website photo wins automatically.
 *
 * Cost: ~$0.003 per vendor (claude-haiku-4-5 vision, 3 image URLs).
 * Page fetch + image download free.
 *
 * CLI:
 *   npx tsx scripts/backfill-website-heros.ts                # dry-run, 5 samples
 *   npx tsx scripts/backfill-website-heros.ts --limit 20     # bigger smoke
 *   npx tsx scripts/backfill-website-heros.ts --confirm      # write all
 *   npx tsx scripts/backfill-website-heros.ts --name "X"     # smoke a specific vendor
 *   npx tsx scripts/backfill-website-heros.ts --confirm --name "Medalla"
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { scrapeWebsiteHero, buildR2Config } from "../src/lib/scrape-website-hero";

const CONCURRENCY = 3;   /* Conservative — each call hits Claude vision. */
const COST_PER_VENDOR_USD = 0.003;

type Args = { limit: number; dryRun: boolean; name: string | null };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit = 5;
  let explicitLimit = false;
  let confirm = false;
  let name: string | null = null;
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
    } else if (arg === "--name") {
      name = a[++i] ?? null;
    } else if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length);
    }
  }
  if (confirm && !explicitLimit && !name) limit = Number.MAX_SAFE_INTEGER;
  return { limit, dryRun: !confirm, name };
}

type Candidate = {
  id:       number;
  slug:     string;
  name:     string;
  category: string;
  website:  string;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  const q = db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
      website:  vendors.website,
    })
    .from(vendors)
    .where(and(
      eq(vendors.isHidden, false),
      isNotNull(vendors.website),
      sql`${vendors.website} <> ''`,
      args.name ? sql`${vendors.name} ILIKE ${'%' + args.name + '%'}` : sql`TRUE`,
    ))
    .orderBy(vendors.id);

  const safeLimit = Math.min(args.limit, 1_000_000);
  const rows = await q.limit(safeLimit);
  return rows
    .filter((r): r is Candidate => r.website != null && r.website !== "")
    .map((r) => ({
      id:       r.id,
      slug:     r.slug,
      name:     r.name,
      category: r.category!,
      website:  r.website!,
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
    `Loaded ${candidates.length} vendor(s)` +
    `${args.name ? ` matching "${args.name}"` : ""}` +
    `${args.dryRun ? "  · DRY RUN (vision call runs, no R2 write)" : "  · WRITE"}`,
  );
  if (candidates.length === 0) { console.log("Nothing to do."); return; }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(3)}\n`);

  let ok = 0, skipped = 0;
  const samples: Array<{ slug: string; reason: string; confidence: string; chosen: string; index: number; candidates: string[] }> = [];

  /* Concurrent worker pool. */
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= candidates.length) return;
      const c = candidates[i];
      try {
        const r = await scrapeWebsiteHero({
          website:        c.website,
          vendorName:     c.name,
          vendorSlug:     c.slug,
          vendorCategory: c.category,
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

        samples.push({
          slug:       c.slug,
          reason:     r.reason,
          confidence: r.confidence,
          chosen:     r.url,
          index:      r.pickedAt,
          candidates: r.candidates,
        });

        if (!args.dryRun) {
          await db
            .update(vendors)
            .set({
              heroImageCustom:      r.url,
              heroImageSource:      "website",
              heroImageRefreshedAt: new Date(),
              needsPhotoBackfill:   false,
              updatedAt:            new Date(),
            })
            .where(eq(vendors.id, c.id));
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
  console.log(`Cost:       ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(3)}`);

  /* In --name mode, dump full candidate list so the operator can
   * see what was considered. Useful for the Medalla smoke test. */
  if (args.name && samples.length > 0) {
    console.log("\n=== Full candidate breakdown (--name mode) ===");
    for (const s of samples) {
      console.log(`\n${s.slug}  · picked #${s.index} (${s.confidence})`);
      console.log(`  reason: ${s.reason}`);
      for (let i = 0; i < s.candidates.length; i++) {
        const marker = i === s.index ? "  ←" : "";
        console.log(`  [${i}] ${s.candidates[i].slice(0, 120)}${marker}`);
      }
    }
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
