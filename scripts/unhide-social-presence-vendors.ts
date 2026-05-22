/**
 * One-time backfill: un-hide vendors that were previously suppressed
 * with hidden_reason='no_website' but now qualify under the relaxed
 * visibility rule:
 *
 *   visible if website OR
 *              instagram_handle OR yelp_url OR pinterest_url OR
 *              (google_rating >= 4.5 AND review_count >= 20)
 *
 * Pairs with the updated hide-no-website-vendors.ts. The hide path
 * was already tightened in that script — this script flips the
 * existing hidden=true / reason=no_website rows that should now
 * resurface.
 *
 * Only touches rows hidden specifically for 'no_website'; other hide
 * reasons (no_photo, outside_ontario, name_category_mismatch, etc.)
 * are left alone.
 *
 * Usage:
 *   npx tsx scripts/unhide-social-presence-vendors.ts             # dry-run
 *   npx tsx scripts/unhide-social-presence-vendors.ts --confirm   # apply
 */
import "dotenv/config";
import { and, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

function parseArgs(): { confirm: boolean } {
  let confirm = false;
  for (const a of process.argv.slice(2)) {
    if (a === "--confirm") confirm = true;
    else if (a === "--dry-run") confirm = false;
  }
  return { confirm };
}

async function main() {
  const { confirm } = parseArgs();

  const qualifies = or(
    isNotNull(vendors.instagramHandle),
    isNotNull(vendors.yelpUrl),
    isNotNull(vendors.pinterestUrl),
    and(gte(vendors.googleRating, "4.5"), gte(vendors.reviewCount, 20)),
  );

  const filter = and(
    eq(vendors.isHidden, true),
    eq(vendors.hiddenReason, "no_website"),
    qualifies,
  );

  /* Per-category preview */
  const perCategory = await db
    .select({ category: vendors.category, count: sql<number>`COUNT(*)::int` })
    .from(vendors)
    .where(filter)
    .groupBy(vendors.category)
    .orderBy(sql`COUNT(*) DESC`);

  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(vendors)
    .where(filter);
  const total = totalRow?.count ?? 0;

  /* Why each qualifies — drives the per-bucket report */
  const breakdown = await db
    .select({
      hasInstagram:  sql<number>`COUNT(*) FILTER (WHERE ${vendors.instagramHandle} IS NOT NULL)::int`,
      hasYelp:       sql<number>`COUNT(*) FILTER (WHERE ${vendors.yelpUrl} IS NOT NULL)::int`,
      hasPinterest:  sql<number>`COUNT(*) FILTER (WHERE ${vendors.pinterestUrl} IS NOT NULL)::int`,
      highlyRated:   sql<number>`COUNT(*) FILTER (WHERE ${vendors.googleRating} >= 4.5 AND ${vendors.reviewCount} >= 20)::int`,
    })
    .from(vendors)
    .where(filter);
  const b = breakdown[0];

  console.log(`Mode: ${confirm ? "APPLY" : "DRY-RUN"}`);
  console.log("");
  console.log(`Rows to un-hide: ${total}`);
  console.log(`  with instagram_handle:   ${b?.hasInstagram ?? 0}`);
  console.log(`  with yelp_url:           ${b?.hasYelp ?? 0}`);
  console.log(`  with pinterest_url:      ${b?.hasPinterest ?? 0}`);
  console.log(`  highly-rated only (4.5★ / 20+ reviews): ${b?.highlyRated ?? 0}`);
  console.log("");
  console.log("By category:");
  const widest = perCategory.reduce((w, r) => Math.max(w, r.category.length), 8);
  for (const r of perCategory) {
    console.log(`  ${r.category.padEnd(widest)}  ${String(r.count).padStart(5)}`);
  }

  if (!confirm) {
    console.log("\nDry-run — pass --confirm to apply.");
    return;
  }

  const result = await db
    .update(vendors)
    .set({
      isHidden:     false,
      hiddenReason: null,
      updatedAt:    new Date(),
    })
    .where(filter)
    .returning({ id: vendors.id });

  console.log(`\n✓ Applied — un-hid ${result.length} vendor row(s).`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
