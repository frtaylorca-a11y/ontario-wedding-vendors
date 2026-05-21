/**
 * Adds vendors.needs_photo_backfill column. Idempotent.
 *   npx tsx scripts/migrate-needs-photo-backfill.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS needs_photo_backfill BOOLEAN DEFAULT FALSE`;
  /* Backfill the flag for existing rows: any visible vendor with a
   * website but no hero_image becomes a backfill candidate. */
  const updated = await sql`
    UPDATE vendors
       SET needs_photo_backfill = TRUE
     WHERE is_hidden = FALSE
       AND hero_image IS NULL
       AND website IS NOT NULL
       AND website <> ''
       AND needs_photo_backfill IS DISTINCT FROM TRUE
    RETURNING id
  `;
  console.log(`[migrate] needs_photo_backfill column ready. Backfilled flag on ${updated.length} rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
