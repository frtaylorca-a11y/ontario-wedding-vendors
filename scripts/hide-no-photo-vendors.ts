/**
 * Hide vendors with no photo. A directory listing without an image is
 * a stub — better to keep it out of public listings until the photo
 * backfill catches it. The vendor's individual /vendors/[cat]/[slug]
 * page still resolves directly (so existing inbound links don't break),
 * but the row is excluded from category + region listings.
 *
 * Filter:
 *   hero_image        IS NULL     -- legacy Google photo_reference
 *   AND hero_image_custom IS NULL -- R2 URL (fresh scrape / hoist path)
 *   AND is_hidden = FALSE
 *   AND is_pic_booth = FALSE
 *   AND is_niagara_photo_booth = FALSE
 *
 * Both photo columns must be NULL for the row to be considered
 * photo-less: the render path (src/lib/utils.ts → vendorHeroImageUrl)
 * prefers hero_image_custom, so a vendor with an R2 photo but a NULL
 * hero_image still shows a real image on cards. Filtering on
 * hero_image alone would re-hide vendors like Pic Booth every time
 * the script runs after their website-hero backfill.
 *
 * The brand exemptions (is_pic_booth, is_niagara_photo_booth) are
 * belt-and-suspenders: Rick's own brands must never be caught by the
 * auto-hide even if their photos temporarily break (e.g. R2 outage,
 * URL migration, scraper regression). Restored to visibility by
 * scripts/restore-pic-booth-brands.ts if this rule ever misses them
 * again.
 *
 * Action (on --confirm):
 *   is_hidden     = TRUE
 *   hidden_reason = 'no_photo'
 *   updated_at    = NOW()
 *
 * Then recomputes is_indexable for every vendor — the new indexability
 * rule requires a photo, so the newly-hidden rows ALSO drop out of the
 * index. Same SQL formula, applied in bulk.
 *
 * Run:
 *   npx tsx scripts/hide-no-photo-vendors.ts            # dry-run (default)
 *   npx tsx scripts/hide-no-photo-vendors.ts --confirm  # apply
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { recomputeAllIsIndexable } from "../src/lib/queries";

/* Central WHERE clause — used verbatim by the preview + the UPDATE
 * so they can never drift out of sync. */
const NO_PHOTO_FILTER = and(
  isNull(vendors.heroImage),
  isNull(vendors.heroImageCustom),
  eq(vendors.isHidden,           false),
  eq(vendors.isPicBooth,         false),
  eq(vendors.isNiagaraPhotoBooth, false),
);

async function main() {
  const confirm = process.argv.includes("--confirm");

  /* Preview — show what we're about to do. */
  const candidates = await db
    .select({
      id:       vendors.id,
      name:     vendors.name,
      category: vendors.category,
      slug:     vendors.slug,
    })
    .from(vendors)
    .where(NO_PHOTO_FILTER);

  console.log(`Candidates: ${candidates.length} visible vendors with no hero_image.`);
  if (!confirm) {
    console.log("Dry run — pass --confirm to apply.");
    /* Print a small sample by category so the operator can spot-check. */
    const byCategory: Record<string, number> = {};
    for (const c of candidates) {
      const k = c.category || "(unknown)";
      byCategory[k] = (byCategory[k] ?? 0) + 1;
    }
    console.log("By category:");
    for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(20)} ${v}`);
    }
    return;
  }

  /* Apply the hide. Single UPDATE — no per-row work. */
  const updated = await db
    .update(vendors)
    .set({
      isHidden:     true,
      hiddenReason: "no_photo",
      updatedAt:    new Date(),
    })
    .where(NO_PHOTO_FILTER)
    .returning({ id: vendors.id });

  console.log(`Hidden: ${updated.length} vendors marked is_hidden=true, hidden_reason='no_photo'.`);

  /* Recompute is_indexable for the whole table — the new rule
   * requires hero_image IS NOT NULL, so every newly-hidden row will
   * also drop to is_indexable=false in a single bulk UPDATE. */
  const recomputed = await recomputeAllIsIndexable();
  console.log(`is_indexable recomputed for ${recomputed} vendors.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
