/**
 * Cache Google Places reviews into vendors.review_excerpts.
 *
 * Mirror of scripts/backfill-vendor-photos.ts but for the reviews
 * field. Reads up to 3 top reviews per vendor and stores them as
 * jsonb so the vendor detail page can render them without hitting
 * Google on every visit.
 *
 * Filter:
 *   place_id IS NOT NULL
 *   AND place_id NOT LIKE 'ww-%'     — WeddingWire synthetic
 *   AND place_id NOT LIKE 'yp-%'     — Yellow Pages synthetic
 *   AND place_id NOT LIKE 'ref-%'    — referral mention
 *   AND place_id NOT LIKE 'web-%'    — venue-website mention
 *   AND review_excerpts IS NULL      — not yet cached
 *
 * For each match, GET
 *   https://maps.googleapis.com/maps/api/place/details/json
 *     ?place_id=...&fields=reviews&key=...
 * and store the top 3 results in this shape:
 *   [
 *     {
 *       "text":          "<review body>",
 *       "rating":        <1-5>,
 *       "author_name":   "<reviewer's display name>",
 *       "relative_time": "<e.g. 'a month ago'>"
 *     }
 *   ]
 *
 * Field names match the Google API's own snake_case so a future
 * frontend renderer can paste the row straight in. Setting
 * review_excerpts to an empty array (not null) when Google
 * returned zero reviews lets the cache distinguish "fetched, none
 * available" from "not yet fetched".
 *
 * Pacing: 50 candidates per batch, 200ms sleep between requests.
 *
 * Cost: ~$0.017 per Place Details call (Basic Data, reviews field
 * is included in the same SKU as photos). Full run on the
 * non-synthetic-place_id slice of the directory: ~$60.
 *
 * Usage:
 *   npx tsx scripts/cache-vendor-reviews.ts                  # all matched
 *   npx tsx scripts/cache-vendor-reviews.ts --limit 10       # smoke test
 *   npx tsx scripts/cache-vendor-reviews.ts --dry-run        # no DB writes
 *   npx tsx scripts/cache-vendor-reviews.ts --limit 100 --dry-run
 */
import "dotenv/config";
import { and, eq, isNull, isNotNull, not, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

const BATCH_SIZE                = 50;
const DELAY_BETWEEN_REQUESTS_MS = 200;
const COST_PER_CALL_USD         = 0.017;
const REVIEWS_PER_VENDOR        = 3;

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
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else {
      console.error(`Unknown arg: ${a}`); process.exit(1);
    }
  }
  return { limit, dryRun };
}

type Candidate = { id: number; slug: string; placeId: string };

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const baseQuery = db
    .select({
      id:      vendors.id,
      slug:    vendors.slug,
      placeId: vendors.placeId,
    })
    .from(vendors)
    .where(
      and(
        isNull(vendors.reviewExcerpts),
        isNotNull(vendors.placeId),
        not(sql`${vendors.placeId} LIKE 'ww-%'`),
        not(sql`${vendors.placeId} LIKE 'yp-%'`),
        not(sql`${vendors.placeId} LIKE 'ref-%'`),
        not(sql`${vendors.placeId} LIKE 'web-%'`),
      ),
    )
    .orderBy(vendors.id);

  const rows = limit != null ? await baseQuery.limit(limit) : await baseQuery;
  return rows
    .filter((r): r is Candidate => r.placeId != null)
    .map((r) => ({ id: r.id, slug: r.slug, placeId: r.placeId }));
}

/* Shape stored in vendors.review_excerpts. Matches the Google API's
 * own snake_case so the frontend can map fields straight through. */
type ReviewExcerpt = {
  text:          string;
  rating:        number;
  author_name:   string;
  relative_time: string;
};

type FetchResult =
  | { kind: "ok"; reviews: ReviewExcerpt[] }
  | { kind: "no-reviews" }
  | { kind: "bad-status"; status: string }
  | { kind: "error"; message: string };

async function fetchReviews(placeId: string, apiKey: string): Promise<FetchResult> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=reviews` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const data = await res.json() as {
      status?: string;
      result?: {
        reviews?: Array<{
          text?:                  string;
          rating?:                number;
          author_name?:           string;
          relative_time_description?: string;
        }>;
      };
    };
    if (data.status !== "OK") {
      return { kind: "bad-status", status: data.status ?? "UNKNOWN" };
    }
    const raw = data.result?.reviews ?? [];
    if (raw.length === 0) return { kind: "no-reviews" };

    /* Keep top REVIEWS_PER_VENDOR. Google returns "most_relevant"
     * sort by default, so the first N are the high-signal ones. */
    const reviews: ReviewExcerpt[] = raw
      .slice(0, REVIEWS_PER_VENDOR)
      .map((r) => ({
        text:          (r.text ?? "").trim(),
        rating:        typeof r.rating === "number" && Number.isFinite(r.rating) ? r.rating : 0,
        author_name:   (r.author_name ?? "").trim(),
        relative_time: (r.relative_time_description ?? "").trim(),
      }))
      .filter((r) => r.text.length > 0 && r.author_name.length > 0);

    if (reviews.length === 0) return { kind: "no-reviews" };
    return { kind: "ok", reviews };
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
    `Loaded ${candidates.length} candidate vendor(s)` +
      `${limit != null ? ` (limit=${limit})` : ""}${dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do."); return;
  }
  console.log(
    `Estimated cost: ~$${(candidates.length * COST_PER_CALL_USD).toFixed(2)} ` +
      `(${candidates.length} × $${COST_PER_CALL_USD.toFixed(3)})`,
  );

  let cached            = 0;
  let cachedEmpty       = 0; /* fetched, zero reviews — recorded as [] */
  let skippedBadStatus  = 0;
  let failed            = 0;
  const failures: Array<{ slug: string; reason: string }> = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch        = candidates.slice(i, i + BATCH_SIZE);
    const batchNum     = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

    for (const c of batch) {
      const r = await fetchReviews(c.placeId, apiKey);

      if (r.kind === "ok") {
        if (!dryRun) {
          await db
            .update(vendors)
            .set({ reviewExcerpts: r.reviews, updatedAt: new Date() })
            .where(eq(vendors.id, c.id));
          /* Caching real reviews can flip the row into indexability —
           * recompute the flag for this vendor immediately. */
          const { recomputeVendorIsIndexable } = await import("../src/lib/queries");
          await recomputeVendorIsIndexable(c.id);
        }
        cached++;
      } else if (r.kind === "no-reviews") {
        /* Persist [] so we don't re-query this vendor every run.
         * Empty array = "fetched, no reviews"; null = "never fetched". */
        if (!dryRun) {
          await db
            .update(vendors)
            .set({ reviewExcerpts: [], updatedAt: new Date() })
            .where(eq(vendors.id, c.id));
        }
        cachedEmpty++;
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
        `cached=${cached} empty=${cachedEmpty} ` +
        `skip:bad-status=${skippedBadStatus} failed=${failed}`,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:        ${candidates.length}`);
  console.log(`Cached (reviews):        ${cached}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Cached (empty array):    ${cachedEmpty}`);
  console.log(`Skipped (bad status):    ${skippedBadStatus}`);
  console.log(`Failed (network/error):  ${failed}`);
  console.log(`Actual cost:             ~$${(candidates.length * COST_PER_CALL_USD).toFixed(2)}`);

  if (failures.length > 0 && failures.length <= 25) {
    console.log("\nFailure samples:");
    for (const f of failures.slice(0, 25)) console.log(`  ${f.slug} — ${f.reason}`);
  } else if (failures.length > 25) {
    console.log(`\n${failures.length} failures total (showing first 10):`);
    for (const f of failures.slice(0, 10)) console.log(`  ${f.slug} — ${f.reason}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
