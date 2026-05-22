/**
 * Backfill: hide vendors with no public presence we can link to.
 *
 * "No public presence" means ALL of:
 *   - website IS NULL OR website = ''
 *   - instagram_handle IS NULL  (social presence #1)
 *   - yelp_url IS NULL          (social presence #2)
 *   - pinterest_url IS NULL     (social presence #3)
 *   - NOT (google_rating >= 4.5 AND review_count >= 20)
 *     (a high-rated vendor with no web presence is still a real
 *      business worth listing — they get a Google-backed profile)
 *
 * For each match, set:
 *   is_hidden            = true
 *   hidden_reason        = 'no_website'
 *   needs_website_search = true
 *
 * Default mode is dry-run (no writes). Pass --confirm to actually
 * persist the change. Reports counts per category in both modes so
 * you can eyeball the impact before committing.
 *
 * Once find-vendor-websites.ts finds a URL for a flagged vendor, it
 * UPDATEs is_hidden=false + needs_website_search=false in the same
 * write — so the lifecycle is:
 *
 *   import-vendors.ts (no-website path)
 *     → is_hidden=true, needs_website_search=true
 *   find-vendor-websites.ts (URL found + validated)
 *     → website=<url>, is_hidden=false, needs_website_search=false
 *   enrich-vendor-bios.ts
 *     → description populated from website
 *
 * Usage:
 *   npx tsx scripts/hide-no-website-vendors.ts                   # dry-run (default)
 *   npx tsx scripts/hide-no-website-vendors.ts --dry-run         # explicit dry-run
 *   npx tsx scripts/hide-no-website-vendors.ts --confirm         # apply
 */
import "dotenv/config";
import { and, eq, gte, isNull, not, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

type Args = { confirm: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let confirm = false;
  for (const a of args) {
    if (a === "--confirm") confirm = true;
    else if (a === "--dry-run") confirm = false; /* explicit no-op (default) */
    else {
      console.error(`Unknown arg: ${a}`); process.exit(1);
    }
  }
  return { confirm };
}

async function main() {
  const { confirm } = parseArgs();
  const mode = confirm ? "APPLY" : "DRY-RUN";

  /* Hide only when ALL of: no website, no social URLs on file, and the
   * Google rating doesn't qualify as a high-rated business. Anything
   * that has a social link OR a strong Google footprint is left
   * visible — we can still surface it without our own website. */
  const noWebsite        = or(isNull(vendors.website), eq(vendors.website, ""));
  const noInstagram      = isNull(vendors.instagramHandle);
  const noYelp           = isNull(vendors.yelpUrl);
  const noPinterest      = isNull(vendors.pinterestUrl);
  const notHighlyRated   = not(and(
    gte(vendors.googleRating, "4.5"),
    gte(vendors.reviewCount, 20),
  )!);
  const candidateFilter  = and(noWebsite, noInstagram, noYelp, noPinterest, notHighlyRated);

  /* Count by category — what the user is going to read */
  const perCategory = await db
    .select({
      category: vendors.category,
      count:    sql<number>`COUNT(*)::int`,
    })
    .from(vendors)
    .where(candidateFilter)
    .groupBy(vendors.category)
    .orderBy(sql`COUNT(*) DESC`);

  /* Total + how many are already flagged (idempotency check) */
  const totals = await db
    .select({
      total:           sql<number>`COUNT(*)::int`,
      alreadyHidden:   sql<number>`COUNT(*) FILTER (WHERE ${vendors.isHidden} = true)::int`,
      alreadyQueued:   sql<number>`COUNT(*) FILTER (WHERE ${vendors.needsWebsiteSearch} = true)::int`,
    })
    .from(vendors)
    .where(candidateFilter);
  const t = totals[0] ?? { total: 0, alreadyHidden: 0, alreadyQueued: 0 };

  console.log(`Mode: ${mode}`);
  console.log("");
  console.log(`Candidates (website IS NULL OR website = ''): ${t.total}`);
  console.log(`  Already is_hidden=true:           ${t.alreadyHidden}`);
  console.log(`  Already needs_website_search=true: ${t.alreadyQueued}`);
  console.log("");

  /* Width-formatted breakdown */
  const widestCategory = perCategory.reduce((w, r) => Math.max(w, r.category.length), 8);
  console.log("By category:");
  console.log(`  ${"category".padEnd(widestCategory)}  count`);
  console.log(`  ${"-".repeat(widestCategory)}  ${"-".repeat(5)}`);
  for (const r of perCategory) {
    console.log(`  ${r.category.padEnd(widestCategory)}  ${String(r.count).padStart(5)}`);
  }
  console.log("");

  if (!confirm) {
    console.log("No writes performed (dry-run). Re-run with --confirm to apply.");
    return;
  }

  /* Apply: bulk UPDATE in one statement — drizzle will SQL-render
   * `is_hidden=true, hidden_reason='no_website', needs_website_search=true`. */
  const result = await db
    .update(vendors)
    .set({
      isHidden:           true,
      hiddenReason:       "no_website",
      needsWebsiteSearch: true,
      updatedAt:          new Date(),
    })
    .where(
      and(
        candidateFilter,
        /* Don't overwrite a row that's been hidden for a different reason
         * (e.g. duplicate / low_quality). Only target rows that aren't
         * already hidden, OR are already hidden specifically for the
         * no_website reason. */
        or(
          eq(vendors.isHidden, false),
          isNull(vendors.isHidden),
          eq(vendors.hiddenReason, "no_website"),
        ),
      ),
    )
    .returning({ id: vendors.id });

  console.log(`✓ Applied — ${result.length} vendor row(s) marked is_hidden=true, hidden_reason='no_website', needs_website_search=true.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
