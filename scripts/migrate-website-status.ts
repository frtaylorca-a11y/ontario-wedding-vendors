/**
 * Adds vendors.website_status + vendors.last_website_check columns.
 * Idempotent. Run once per environment.
 *   npx tsx scripts/migrate-website-status.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website_status     VARCHAR(50)`;
  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_website_check TIMESTAMP`;

  /* Index for the "stale only" filter in the nightly check script —
   * speeds up the "rows that haven't been checked in 24h" scan. */
  await sql`CREATE INDEX IF NOT EXISTS vendors_last_website_check_idx
              ON vendors (last_website_check NULLS FIRST)`;

  console.log("[migrate] vendors.website_status + last_website_check ready.");
}

main().catch((err) => { console.error(err); process.exit(1); });
