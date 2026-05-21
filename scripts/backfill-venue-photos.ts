/**
 * STAGE 1 of the venue photo pipeline.
 *
 * Bootstraps venues.hero_image with Google Places photo_reference strings.
 * Stage 2 (scripts/upgrade-venue-photos.ts) later replaces "good enough"
 * Google photos with curated website images stored permanently in R2,
 * after a Claude Vision compare decides whether the website is better.
 *
 * Filter:
 *   hero_image IS NULL
 *   AND place_id IS NOT NULL
 *   AND place_id NOT LIKE 'ref-%'       — referral mention, no Google data
 *   AND place_id NOT LIKE 'web-%'       — venue-website mention
 *   AND place_id NOT LIKE 'ww-%'        — WeddingWire scrape
 *   AND place_id NOT LIKE 'yp-%'        — Yellow Pages scrape
 *
 * For each matched venue, GET
 *   https://maps.googleapis.com/maps/api/place/details/json
 *     ?place_id=...&fields=photos&key=...
 * and on photos[0].photo_reference present, UPDATE:
 *   hero_image              = <photo_reference>
 *   hero_image_source       = 'google'
 *   hero_image_refreshed_at = NOW()
 *   updated_at              = NOW()
 *
 * Pacing: 50 candidates per batch, 200ms sleep between every request
 * (serial-within-batch) — polite to the API and easy to monitor.
 *
 * Reports updated / skipped (no photos / closed / bad status) / failed
 * (network / non-OK HTTP / parse error) tallies.
 *
 * Cost: ~$0.017 per Place Details call (Basic Data, photos field).
 * Full DB run: ~639 venues × $0.017 ≈ $11 one-time.
 *
 * Usage:
 *   npx tsx scripts/backfill-venue-photos.ts                  # all matched
 *   npx tsx scripts/backfill-venue-photos.ts --limit 10       # smoke test
 *   npx tsx scripts/backfill-venue-photos.ts --dry-run        # no DB writes
 *   npx tsx scripts/backfill-venue-photos.ts --limit 100 --dry-run
 */
import "dotenv/config";
import { and, eq, isNull, isNotNull, not, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";

const BATCH_SIZE                = 50;
const DELAY_BETWEEN_REQUESTS_MS = 200;
const COST_PER_CALL_USD         = 0.017;

type Args = {
  limit:  number | null;
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit:  number | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { limit, dryRun };
}

type Candidate = { id: number; slug: string; placeId: string };

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const baseQuery = db
    .select({
      id:      venues.id,
      slug:    venues.slug,
      placeId: venues.placeId,
    })
    .from(venues)
    .where(
      and(
        isNull(venues.heroImage),
        isNotNull(venues.placeId),
        not(sql`${venues.placeId} LIKE 'ref-%'`),
        not(sql`${venues.placeId} LIKE 'web-%'`),
        not(sql`${venues.placeId} LIKE 'ww-%'`),
        not(sql`${venues.placeId} LIKE 'yp-%'`),
      ),
    )
    .orderBy(venues.id);

  const rows = limit != null ? await baseQuery.limit(limit) : await baseQuery;
  return rows
    .filter((r): r is Candidate => r.placeId != null)
    .map((r) => ({ id: r.id, slug: r.slug, placeId: r.placeId }));
}

type FetchResult =
  | { kind: "ok"; photoRef: string }
  | { kind: "no-photos" }
  | { kind: "bad-status"; status: string }
  | { kind: "error"; message: string };

async function fetchPhotoReference(placeId: string, apiKey: string): Promise<FetchResult> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=photos` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const data = await res.json() as {
      status?: string;
      result?: { photos?: Array<{ photo_reference?: string }> };
    };
    if (data.status !== "OK") {
      return { kind: "bad-status", status: data.status ?? "UNKNOWN" };
    }
    const photos = data.result?.photos ?? [];
    if (photos.length === 0) return { kind: "no-photos" };
    const ref = photos[0]?.photo_reference;
    if (!ref || typeof ref !== "string") return { kind: "no-photos" };
    return { kind: "ok", photoRef: ref };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY is not set in .env / .env.local");
    process.exit(1);
  }

  const candidates = await loadCandidates(limit);
  console.log(
    `Loaded ${candidates.length} candidate venue(s)` +
      `${limit != null ? ` (limit=${limit})` : ""}${dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  console.log(
    `Estimated cost: ~$${(candidates.length * COST_PER_CALL_USD).toFixed(2)} ` +
      `(${candidates.length} × $${COST_PER_CALL_USD.toFixed(3)})`,
  );

  let updated          = 0;
  let skippedNoPhotos  = 0;
  let skippedBadStatus = 0;
  let failed           = 0;
  const failures: Array<{ slug: string; reason: string }> = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch        = candidates.slice(i, i + BATCH_SIZE);
    const batchNum     = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

    for (const c of batch) {
      const r = await fetchPhotoReference(c.placeId, apiKey);

      if (r.kind === "ok") {
        if (!dryRun) {
          await db
            .update(venues)
            .set({
              heroImage:            r.photoRef,
              heroImageSource:      "google",
              heroImageRefreshedAt: new Date(),
              updatedAt:            new Date(),
            })
            .where(eq(venues.id, c.id));
        }
        updated++;
      } else if (r.kind === "no-photos") {
        skippedNoPhotos++;
      } else if (r.kind === "bad-status") {
        skippedBadStatus++;
        failures.push({ slug: c.slug, reason: `status=${r.status}` });
      } else {
        failed++;
        failures.push({ slug: c.slug, reason: r.message });
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    console.log(
      `  Batch ${batchNum}/${totalBatches} (${batch.length}) — ` +
        `updated=${updated} skip:no-photos=${skippedNoPhotos} ` +
        `skip:bad-status=${skippedBadStatus} failed=${failed}`,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:       ${candidates.length}`);
  console.log(`Updated:                ${updated}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Skipped (no photos):    ${skippedNoPhotos}`);
  console.log(`Skipped (bad status):   ${skippedBadStatus}`);
  console.log(`Failed (network/error): ${failed}`);
  console.log(`Actual cost:            ~$${(candidates.length * COST_PER_CALL_USD).toFixed(2)}`);

  if (failures.length > 0 && failures.length <= 25) {
    console.log("\nFailure samples:");
    for (const f of failures.slice(0, 25)) {
      console.log(`  ${f.slug} — ${f.reason}`);
    }
  } else if (failures.length > 25) {
    console.log(`\n${failures.length} failures total (showing first 10):`);
    for (const f of failures.slice(0, 10)) {
      console.log(`  ${f.slug} — ${f.reason}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
