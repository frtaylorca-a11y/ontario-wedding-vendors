/**
 * Adds vendors.needs_manual_review column. Idempotent.
 *   npx tsx scripts/migrate-needs-manual-review.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT FALSE`;
  await sql`CREATE INDEX IF NOT EXISTS vendors_needs_review_idx ON vendors (needs_manual_review) WHERE needs_manual_review = TRUE`;
  console.log("[migrate] needs_manual_review column ready.");
}

main().catch((err) => { console.error(err); process.exit(1); });
