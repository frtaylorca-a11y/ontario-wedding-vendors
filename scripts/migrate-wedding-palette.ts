/**
 * Add the custom-colour palette columns to wedding_plans.
 *
 *   npx tsx scripts/migrate-wedding-palette.ts
 *
 * Idempotent — uses IF NOT EXISTS so re-runs are safe.
 *
 * Added columns:
 *   custom_color_primary  varchar(7)   -- "#B96476"
 *   custom_color_accent   varchar(7)
 *   custom_color_bg       varchar(7)
 *   custom_color_text     varchar(7)
 *   custom_palette_id     varchar(50)  -- "romantic.blush-and-gold"
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  console.log("[migrate] adding custom-palette columns to wedding_plans…");

  await db.execute(sql`
    ALTER TABLE wedding_plans
      ADD COLUMN IF NOT EXISTS custom_color_primary    varchar(7),
      ADD COLUMN IF NOT EXISTS custom_color_accent     varchar(7),
      ADD COLUMN IF NOT EXISTS custom_color_bg         varchar(7),
      ADD COLUMN IF NOT EXISTS custom_color_text       varchar(7),
      ADD COLUMN IF NOT EXISTS custom_palette_id       varchar(50),
      ADD COLUMN IF NOT EXISTS wedding_typography_style varchar(30),
      /* Premium tier + generation tracking */
      ADD COLUMN IF NOT EXISTS tier                   varchar(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS premium_activated_at   timestamp,
      ADD COLUMN IF NOT EXISTS premium_expires_at     timestamp,
      ADD COLUMN IF NOT EXISTS wedding_generation_count integer DEFAULT 0;
  `);

  console.log("[migrate] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
