/**
 * Reclassify vendor rows whose vendors.website points at a social
 * profile (Instagram, Facebook, X, TikTok, LinkedIn, Pinterest,
 * YouTube, Linktree) rather than a real domain.
 *
 * Branching:
 *   has google_rating AND review_count >= 5
 *     → vendor has independent proof they exist. Strip the social URL,
 *       set needs_website_search=true so find-vendor-websites can find
 *       a real domain, KEEP visible. They'll get a bio either from
 *       the future website discovery OR from enrich-vendor-websearch.ts
 *       which uses web_search + their Google rating + reviews.
 *
 *   missing rating OR review_count < 5
 *     → no independent proof, no real domain. Strip the URL, hide
 *       with hidden_reason='social_only_no_reviews', flag for re-search.
 *
 * Run:
 *   npx tsx scripts/hide-social-only-websites.ts            # dry-run
 *   npx tsx scripts/hide-social-only-websites.ts --confirm  # apply
 */
import "dotenv/config";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { isSocialOnlyUrl } from "../src/lib/social-hosts";

const MIN_REVIEWS_TO_KEEP_VISIBLE = 5;

type Candidate = {
  id:           number;
  name:         string;
  category:     string;
  website:      string;
  googleRating: string | null;
  reviewCount:  number | null;
};

async function loadCandidates(): Promise<Candidate[]> {
  const rows = await db
    .select({
      id:           vendors.id,
      name:         vendors.name,
      category:     vendors.category,
      website:      vendors.website,
      googleRating: vendors.googleRating,
      reviewCount:  vendors.reviewCount,
    })
    .from(vendors)
    .where(and(
      isNotNull(vendors.website),
      sql`${vendors.website} <> ''`,
    ));
  return rows
    .filter((r) => r.website != null && isSocialOnlyUrl(r.website))
    .map((r) => ({
      id:           r.id,
      name:         r.name,
      category:     r.category!,
      website:      r.website!,
      googleRating: r.googleRating,
      reviewCount:  r.reviewCount,
    }));
}

function classify(c: Candidate): "keep-visible" | "hide" {
  const reviewCount = c.reviewCount ?? 0;
  const hasRating = c.googleRating != null && c.googleRating !== "";
  if (hasRating && reviewCount >= MIN_REVIEWS_TO_KEEP_VISIBLE) {
    return "keep-visible";
  }
  return "hide";
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  const candidates = await loadCandidates();

  let keepVisible = 0;
  let hidden      = 0;
  for (const c of candidates) {
    if (classify(c) === "keep-visible") keepVisible++;
    else hidden++;
  }

  console.log(`Vendors with social-only website: ${candidates.length}`);
  console.log(`  → keep visible (rating + ${MIN_REVIEWS_TO_KEEP_VISIBLE}+ reviews, URL stripped): ${keepVisible}`);
  console.log(`  → hide (no review threshold): ${hidden}`);

  if (!confirm) {
    console.log("\nDry run — pass --confirm to apply. Sample of first 10 candidates:");
    for (const c of candidates.slice(0, 10)) {
      console.log(
        `  [${classify(c).padEnd(13)}]  ${c.name.padEnd(36)} ` +
        `rating=${c.googleRating ?? "—"} reviews=${c.reviewCount ?? 0} ${c.website}`,
      );
    }
    return;
  }

  /* Apply. Two separate UPDATE statements rather than a CASE expression
   * so the per-bucket counts in the log line up with the actual writes. */

  /* Bucket 1 — keep visible. Strip URL + flag for re-search.
   *
   * Use Drizzle's inArray() helper rather than sql`= ANY(${ids})`.
   * The latter shapes the JS array through Neon's HTTP adapter as a
   * JSON array, which the Postgres planner doesn't recognise as an
   * array literal — "op ANY/ALL (array) requires array on right side". */
  const visibleIds = candidates.filter((c) => classify(c) === "keep-visible").map((c) => c.id);
  if (visibleIds.length > 0) {
    await db
      .update(vendors)
      .set({
        website:            null,
        needsWebsiteSearch: true,
        updatedAt:          new Date(),
      })
      .where(inArray(vendors.id, visibleIds));
  }

  /* Bucket 2 — hide. */
  const hiddenIds = candidates.filter((c) => classify(c) === "hide").map((c) => c.id);
  if (hiddenIds.length > 0) {
    await db
      .update(vendors)
      .set({
        website:            null,
        isHidden:           true,
        hiddenReason:       "social_only_no_reviews",
        needsWebsiteSearch: true,
        updatedAt:          new Date(),
      })
      .where(inArray(vendors.id, hiddenIds));
  }

  console.log(`\nApplied · ${visibleIds.length} kept visible, ${hiddenIds.length} hidden.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
