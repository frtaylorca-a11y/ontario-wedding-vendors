/**
 * Populate {vendors,venues}.hero_image_custom by hoisting the first
 * R2-hosted URL out of the existing additional_photos jsonb array.
 *
 * Context: the gallery scraper (backfill-website-photos.ts) already
 * uploaded 14k+ vendor/venue photos to R2 and cached the URLs in
 * additional_photos. But the HERO scraper never ran, so
 * hero_image_custom is NULL for every row — the card falls through to
 * hero_image (Google photo_reference) which now 403s because Google
 * disabled the legacy Places API on this project.
 *
 * This script picks the first R2 URL out of additional_photos and
 * writes it to hero_image_custom. Zero new scrapes, zero Claude calls,
 * zero R2 uploads. Rows where every additional_photos entry is a dead
 * Google URL, or where the array is empty, keep hero_image_custom NULL
 * and fall through to the category placeholder image.
 *
 * CLI:
 *   npx tsx scripts/hoist-gallery-photo-to-hero.ts             # dry-run, both tables
 *   npx tsx scripts/hoist-gallery-photo-to-hero.ts --confirm   # write
 */
import 'dotenv/config';
import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

const R2_HOST_LIKE = '%pub-144d25e168a245f5b84a36cdb498e30d.r2.dev%';

const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');

async function preview(table: 'venues' | 'vendors'): Promise<{ candidates: number; sample: unknown[] }> {
  /* For each row without hero_image_custom, find the first R2 URL in
   * additional_photos (order preserved) via a lateral join. */
  const q = sql`
    SELECT id, name, first_r2_url
    FROM ${sql.raw(table)} t,
    LATERAL (
      SELECT elem->>'url' AS first_r2_url
      FROM jsonb_array_elements(t.additional_photos) WITH ORDINALITY AS a(elem, ord)
      WHERE elem->>'url' LIKE ${R2_HOST_LIKE}
      ORDER BY ord
      LIMIT 1
    ) picked
    WHERE t.hero_image_custom IS NULL
      AND jsonb_typeof(t.additional_photos) = 'array'
  `;
  const rows = await db.execute(q);
  return {
    candidates: rows.rows.length,
    sample: rows.rows.slice(0, 3),
  };
}

async function apply(table: 'venues' | 'vendors'): Promise<number> {
  const q = sql`
    UPDATE ${sql.raw(table)} AS t
    SET hero_image_custom     = picked.url,
        hero_image_source     = 'gallery',
        hero_image_refreshed_at = NOW(),
        updated_at            = NOW()
    FROM (
      SELECT t2.id, first_r2.url
      FROM ${sql.raw(table)} t2,
      LATERAL (
        SELECT elem->>'url' AS url
        FROM jsonb_array_elements(t2.additional_photos) WITH ORDINALITY AS a(elem, ord)
        WHERE elem->>'url' LIKE ${R2_HOST_LIKE}
        ORDER BY ord
        LIMIT 1
      ) first_r2
      WHERE t2.hero_image_custom IS NULL
        AND jsonb_typeof(t2.additional_photos) = 'array'
    ) AS picked
    WHERE t.id = picked.id
  `;
  const res = await db.execute(q);
  return res.rowCount ?? 0;
}

async function main() {
  console.log(dryRun ? '=== DRY RUN (add --confirm to write) ===\n' : '=== APPLYING WRITES ===\n');

  for (const table of ['venues', 'vendors'] as const) {
    const pre = await preview(table);
    console.log(`${table}: ${pre.candidates} rows would receive an R2 hero URL`);
    for (const r of pre.sample) console.log('  sample:', r);
    if (!dryRun && pre.candidates > 0) {
      const n = await apply(table);
      console.log(`  → wrote ${n} row(s)`);
    }
    console.log();
  }

  /* Post-run summary. */
  console.log('=== hero_image_custom coverage after run ===');
  const s = await db.execute(sql`
    SELECT 'venues' AS tbl,
      COUNT(*)::int AS total,
      COUNT(hero_image_custom)::int AS with_custom,
      COUNT(*) FILTER (WHERE hero_image_custom LIKE ${R2_HOST_LIKE})::int AS r2_hosted
    FROM venues
    UNION ALL
    SELECT 'vendors',
      COUNT(*)::int,
      COUNT(hero_image_custom)::int,
      COUNT(*) FILTER (WHERE hero_image_custom LIKE ${R2_HOST_LIKE})::int
    FROM vendors
  `);
  for (const r of s.rows) console.log(r);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
