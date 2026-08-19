/**
 * Hide every photo_booth vendor in the Niagara region EXCEPT any row
 * whose website is on picbooth.ca. Pic Booth is Rick's own business
 * and stays visible (and pinned) as the featured photo booth for the
 * region.
 *
 * Filter (matches the user-provided SQL verbatim):
 *   category = 'photo_booth'
 *   AND region   = 'niagara'
 *   AND (website NOT LIKE '%picbooth.ca%' OR website IS NULL)
 *
 * Rows that already have is_hidden = true are left alone (no-op UPDATE
 * saves a write). hidden_reason is stamped so a future audit can trace
 * why the row was hidden vs the other hide-* scripts in the repo.
 *
 * CLI:
 *   npx tsx scripts/hide-niagara-photo-booths.ts             # dry-run preview
 *   npx tsx scripts/hide-niagara-photo-booths.ts --confirm   # apply hides
 */
import "./_env";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

const REASON = "market-clearance:niagara-photo-booth";

const dryRun = !process.argv.includes("--confirm");

async function main() {
  /* Match the user's SQL: photo_booth × niagara × NOT picbooth.ca.
   * Note: we do NOT filter on is_hidden here — the preview should
   * show all matches, including already-hidden ones, so the user
   * sees the full universe. The UPDATE below only writes to rows
   * that would actually change. */
  const where = and(
    eq(vendors.category, "photo_booth"),
    eq(vendors.region, "niagara"),
    or(
      isNull(vendors.website),
      sql`${vendors.website} NOT LIKE '%picbooth.ca%'`,
    ),
  );

  const candidates = await db
    .select({
      id:       vendors.id,
      name:     vendors.name,
      city:     vendors.city,
      website:  vendors.website,
      isHidden: vendors.isHidden,
    })
    .from(vendors)
    .where(where)
    .orderBy(vendors.city, vendors.name);

  console.log(`=== ${dryRun ? "DRY RUN" : "APPLYING WRITES"} ===\n`);
  console.log(`Matched ${candidates.length} row(s) — photo_booth × niagara × NOT picbooth.ca:\n`);

  for (const c of candidates) {
    const hiddenFlag = c.isHidden ? "  [already hidden]" : "";
    console.log(
      `  ${String(c.id).padStart(6)}  ${(c.city ?? "—").padEnd(24)}  ${c.name}${hiddenFlag}`,
    );
    console.log(`          ${c.website ?? "(no website)"}`);
  }

  const willChange = candidates.filter((c) => !c.isHidden).length;
  const alreadyHidden = candidates.filter((c) =>  c.isHidden).length;
  console.log(`\nWould hide:      ${willChange}`);
  console.log(`Already hidden:  ${alreadyHidden}`);

  /* Belt-and-suspenders — show the picbooth.ca rows that are being
   * PRESERVED so the user can verify the carve-out worked. */
  const preserved = await db
    .select({ id: vendors.id, name: vendors.name, city: vendors.city, website: vendors.website })
    .from(vendors)
    .where(and(
      eq(vendors.category, "photo_booth"),
      eq(vendors.region, "niagara"),
      sql`${vendors.website} LIKE '%picbooth.ca%'`,
    ))
    .orderBy(vendors.city, vendors.name);

  console.log(`\n=== Preserved (picbooth.ca — NOT touched) ===`);
  for (const p of preserved) {
    console.log(`  ${String(p.id).padStart(6)}  ${(p.city ?? "—").padEnd(24)}  ${p.name}  →  ${p.website}`);
  }

  if (dryRun) {
    console.log(`\n(Dry run. Re-run with --confirm to apply the ${willChange} hide(s).)`);
    return;
  }

  if (willChange === 0) {
    console.log(`\nNothing to write.`);
    return;
  }

  const res = await db
    .update(vendors)
    .set({
      isHidden:     true,
      hiddenReason: REASON,
      updatedAt:    new Date(),
    })
    .where(and(where, eq(vendors.isHidden, false)));

  console.log(`\n✓ Updated ${res.rowCount ?? 0} row(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
