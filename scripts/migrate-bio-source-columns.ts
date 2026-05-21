/**
 * Adds vendors.yelp_url, vendors.pinterest_url, vendors.bio_source.
 * Idempotent. Run once per environment.
 *
 *   npx tsx scripts/migrate-bio-source-columns.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS yelp_url      VARCHAR(500)`;
  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pinterest_url VARCHAR(500)`;
  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bio_source    VARCHAR(50)`;

  /* Backfill bio_source for existing enriched rows — they came from
   * the vendor-website scrape pass. */
  const updated = await sql`
    UPDATE vendors
       SET bio_source = 'scraped'
     WHERE bio_enriched_at IS NOT NULL
       AND bio_source IS NULL
    RETURNING id
  `;

  console.log(`[migrate] yelp_url / pinterest_url / bio_source columns ready.`);
  console.log(`[migrate] bio_source='scraped' backfilled for ${updated.length} previously-enriched rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
