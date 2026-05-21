/**
 * Bulk-backfill vendors.additional_photos by scraping each vendor's
 * website for gallery images and uploading the top 6 to R2.
 *
 * Filter:
 *   is_hidden        = false
 *   AND website      IS NOT NULL AND website <> ''
 *   AND additional_photos IS NULL
 *
 * Pacing: 4 vendors in parallel (each one issues 5 concurrent page
 * fetches + up to 12 image downloads). Throughput ~1-2 vendors/sec
 * depending on remote server latency. Free — no API spend.
 *
 * CLI:
 *   npx tsx scripts/backfill-website-photos.ts                    # dry-run, 5 samples
 *   npx tsx scripts/backfill-website-photos.ts --limit 20         # dry-run, 20 samples
 *   npx tsx scripts/backfill-website-photos.ts --confirm          # write all
 *   npx tsx scripts/backfill-website-photos.ts --limit 50 --confirm
 *
 * Dry-run does NOT upload to R2 — it just shows the candidate source
 * URLs the scraper picked, so the operator can sanity-check selection.
 */
import "dotenv/config";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import {
  scrapeWebsitePhotos,
  buildR2Config,
} from "../src/lib/scrape-website-photos";

const CONCURRENCY = 4;

type Args = { limit: number; dryRun: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit = 5;
  let explicitLimit = false;
  let confirm = false;
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
  if (confirm && !explicitLimit) limit = Number.MAX_SAFE_INTEGER;
  return { limit, dryRun: !confirm };
}

type Candidate = {
  id:       number;
  slug:     string;
  name:     string;
  website:  string;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  const q = db
    .select({
      id:      vendors.id,
      slug:    vendors.slug,
      name:    vendors.name,
      website: vendors.website,
    })
    .from(vendors)
    .where(and(
      eq(vendors.isHidden, false),
      isNotNull(vendors.website),
      sql`${vendors.website} <> ''`,
      isNull(vendors.additionalPhotos),
    ))
    .orderBy(vendors.id);

  const safeLimit = Math.min(args.limit, 1_000_000);
  const rows = await q.limit(safeLimit);
  return rows
    .filter((r): r is Candidate => r.website != null && r.website !== "")
    .map((r) => ({
      id:      r.id,
      slug:    r.slug,
      name:    r.name,
      website: r.website!,
    }));
}

async function main() {
  const args = parseArgs();
  const r2 = buildR2Config();
  if (!r2 && !args.dryRun) {
    console.error("R2 env vars missing. Set CLOUDFLARE_R2_* — or pass --dry-run.");
    process.exit(1);
  }

  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} vendor(s) needing additional_photos backfill` +
    `${args.dryRun ? "  · DRY RUN (no uploads, source URLs shown)" : "  · WRITE"}`,
  );
  if (candidates.length === 0) { console.log("Nothing to do."); return; }

  let ok = 0;
  let skipped = 0;
  let lowYield = 0;
  let totalPhotos = 0;

  /* Concurrent worker pool. */
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= candidates.length) return;
      const c = candidates[i];
      try {
        const r = await scrapeWebsitePhotos({
          website:    c.website,
          vendorName: c.name,
          vendorSlug: c.slug,
          r2:         args.dryRun ? null : r2,
          count:      6,
        });
        if (r.skippedReason) {
          skipped++;
          console.log(`  [${i + 1}/${candidates.length}] SKIP  ${c.slug}  · ${r.skippedReason}`);
        } else if (r.photos.length < 2) {
          lowYield++;
          console.log(
            `  [${i + 1}/${candidates.length}] LOW   ${c.slug}  · pages=${r.pagesFetched} candidates=${r.candidates} dl=${r.downloaded}`,
          );
        } else {
          ok++;
          totalPhotos += r.photos.length;
          console.log(
            `  [${i + 1}/${candidates.length}] OK    ${c.slug}  · ${r.photos.length} photos · candidates=${r.candidates}`,
          );
          /* In dry-run, surface the first 2 source URLs so the
           * operator can spot-check quality. */
          if (args.dryRun) {
            for (const p of r.photos.slice(0, 3)) {
              console.log(`        ${p.url.slice(0, 110)}${p.url.length > 110 ? "…" : ""}`);
            }
          } else {
            await db
              .update(vendors)
              .set({ additionalPhotos: r.photos, updatedAt: new Date() })
              .where(eq(vendors.id, c.id));
          }
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

  console.log("\n=== Summary ===");
  console.log(`Candidates:     ${candidates.length}`);
  console.log(`OK (≥2 photos): ${ok}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`Low yield (<2): ${lowYield}`);
  console.log(`Skipped/error:  ${skipped}`);
  console.log(`Avg photos/ok:  ${ok > 0 ? (totalPhotos / ok).toFixed(1) : "—"}`);
  if (ok > 0) {
    const pct = ((ok / candidates.length) * 100).toFixed(1);
    console.log(`Hit rate:       ${pct}%`);
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
