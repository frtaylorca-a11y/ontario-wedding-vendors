/**
 * Hide vendors with no photo. A directory listing without an image is
 * a stub — better to keep it out of public listings until the photo
 * backfill catches it. The vendor's individual /vendors/[cat]/[slug]
 * page still resolves directly (so existing inbound links don't break),
 * but the row is excluded from category + region listings.
 *
 * Filter:
 *   hero_image IS NULL
 *   AND is_hidden = FALSE
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
    .where(and(isNull(vendors.heroImage), eq(vendors.isHidden, false)));

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
    .where(and(isNull(vendors.heroImage), eq(vendors.isHidden, false)))
    .returning({ id: vendors.id });

  console.log(`Hidden: ${updated.length} vendors marked is_hidden=true, hidden_reason='no_photo'.`);

  /* Recompute is_indexable for the whole table — the new rule
   * requires hero_image IS NOT NULL, so every newly-hidden row will
   * also drop to is_indexable=false in a single bulk UPDATE. */
  const recomputed = await recomputeAllIsIndexable();
  console.log(`is_indexable recomputed for ${recomputed} vendors.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
