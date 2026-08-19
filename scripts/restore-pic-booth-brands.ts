/**
 * One-shot ops script: restore Rick's two owned photo-booth brands
 * (Pic Booth id=507, Niagara Photo Booth id=516) after the earlier
 * hide-no-photo-vendors.ts pass caught them, and backfill a hero
 * image for Pic Booth from picbooth.ca so the auto-hide doesn't
 * catch it again on the next run.
 *
 * Both rows carry `is_pic_booth=true` / `is_niagara_photo_booth=true`
 * respectively — those flags plus `is_pinned=true` (already set on
 * id=507) make Pic Booth the featured Niagara photo booth per
 * CLAUDE.md's spec. This script only touches these two rows by id;
 * nothing else in the vendors table is at risk.
 *
 * CLI:
 *   npx tsx scripts/restore-pic-booth-brands.ts             # dry-run
 *   npx tsx scripts/restore-pic-booth-brands.ts --confirm   # apply
 */
import "./_env";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { scrapeWebsiteHero, buildR2Config } from "../src/lib/scrape-website-hero";

const dryRun = !process.argv.includes("--confirm");
const IDS = [507, 516] as const;

async function main() {
  console.log(`=== ${dryRun ? "DRY RUN" : "APPLYING WRITES"} ===\n`);

  /* Show current state for both rows before touching anything. */
  const before = await db.select({
    id:              vendors.id,
    name:            vendors.name,
    slug:            vendors.slug,
    website:         vendors.website,
    isHidden:        vendors.isHidden,
    hiddenReason:    vendors.hiddenReason,
    isPinned:        vendors.isPinned,
    isPicBooth:      vendors.isPicBooth,
    heroImageCustom: vendors.heroImageCustom,
    category:        vendors.category,
  }).from(vendors).where(inArray(vendors.id, [...IDS]));

  console.log(`Before:`);
  for (const row of before) console.log(`  ${row.id}  "${row.name}"  hidden=${row.isHidden}  reason="${row.hiddenReason ?? ""}"  hero=${row.heroImageCustom ? "yes" : "NO"}`);

  if (dryRun) {
    console.log(`\n(Dry run — no writes. Re-run with --confirm.)`);
    return;
  }

  /* Step 1 — un-hide both rows. Idempotent: no-op on rows that are
   * already is_hidden=false. */
  const u = await db.update(vendors)
    .set({ isHidden: false, hiddenReason: null, updatedAt: new Date() })
    .where(inArray(vendors.id, [...IDS]));
  console.log(`\n✓ Un-hide UPDATE affected ${u.rowCount} row(s).`);

  /* Step 2 — scrape picbooth.ca for a fresh hero image, upload to R2,
   * persist to id=507. Skips id=516 (Niagara Photo Booth) — hero
   * backfill isn't in scope for this run and their gallery URL will
   * scrape fine when the standard backfill runs next. */
  const pb = before.find((r) => r.id === 507);
  if (!pb) { console.error("id=507 not found — aborting"); return; }
  if (!pb.website) { console.error("id=507 has no website — cannot scrape"); return; }

  if (pb.heroImageCustom) {
    console.log(`\nSkipping hero scrape — id=507 already has hero_image_custom (${pb.heroImageCustom}).`);
    console.log(`  If you want to force a re-scrape, clear the column and re-run.`);
  } else {
    console.log(`\nScraping ${pb.website} for a hero image…`);
    if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY missing"); return; }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r2 = buildR2Config();
    if (!r2) { console.error("R2 env vars missing"); return; }

    const result = await scrapeWebsiteHero({
      website:        pb.website,
      vendorName:     pb.name,
      vendorSlug:     pb.slug,
      vendorCategory: pb.category ?? "photo_booth",
      anthropic:      client,
      r2,
    });

    if (result.kind === "skipped") {
      console.log(`  SKIP — ${result.reason}`);
      console.log(`  Pic Booth stays visible with no hero_image_custom. The auto-hide won't`);
      console.log(`  re-catch it because it now has is_hidden=false; hide-no-photo-vendors.ts`);
      console.log(`  is what set hidden_reason='no_photo' originally — worth checking whether`);
      console.log(`  that script exempts is_pic_booth=true rows.`);
    } else {
      await db.update(vendors)
        .set({
          heroImageCustom:      result.url,
          heroImageSource:      "website",
          heroImageRefreshedAt: new Date(),
          needsPhotoBackfill:   false,
          updatedAt:            new Date(),
        })
        .where(eq(vendors.id, 507));
      console.log(`  ✓ OK — picked candidate #${result.pickedAt} (${result.confidence})`);
      console.log(`  R2:  ${result.url}`);
      console.log(`  DB updated for id=507.`);
    }
  }

  /* Step 3 — verify final state + preview the Niagara photo-booth
   * listing order so we can confirm Pic Booth ends up pinned at the
   * top (is_pinned=true rows sort first via ORDER BY is_pinned DESC). */
  console.log(`\n=== After ===`);
  const after = await db.select({
    id:              vendors.id,
    name:            vendors.name,
    isHidden:        vendors.isHidden,
    hiddenReason:    vendors.hiddenReason,
    heroImageCustom: vendors.heroImageCustom,
    isPinned:        vendors.isPinned,
  }).from(vendors).where(inArray(vendors.id, [...IDS]));
  for (const row of after) console.log(`  ${row.id}  "${row.name}"  hidden=${row.isHidden}  pinned=${row.isPinned}  hero=${row.heroImageCustom ? "yes" : "NO"}`);

  console.log(`\n=== Niagara photo_booth listing (visible rows, pinned first) ===`);
  const listing = await db.execute(sql`
    SELECT id, name, is_pinned, is_hidden, city
    FROM vendors
    WHERE category = 'photo_booth' AND region = 'niagara' AND is_hidden = false
    ORDER BY is_pinned DESC NULLS LAST, name
  `);
  for (const row of listing.rows) {
    const r   = row as { id: number; name: string; is_pinned: boolean; city: string | null };
    const pin = r.is_pinned ? "📌 " : "   ";
    console.log(`  ${pin}${String(r.id).padStart(6)}  ${(r.city ?? "—").padEnd(24)}  ${r.name}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
