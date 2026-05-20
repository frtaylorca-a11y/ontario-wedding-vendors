/**
 * One-time migration: add the wedding-website columns onto wedding_plans.
 *
 * Run:  npx tsx scripts/migrate-wedding-website.ts
 *
 * Idempotent — uses IF NOT EXISTS so re-runs are safe.
 *
 * Added columns:
 *   wedding_theme            varchar(20)  default 'romantic'
 *   wedding_published        boolean      default false
 *   wedding_hero_image       varchar(500)
 *   wedding_party            jsonb
 *   wedding_registry         jsonb
 *   wedding_generated_copy   jsonb
 *   wedding_page_config      jsonb
 *   wedding_password         varchar(100)
 *   wedding_hashtag          varchar(100)
 *   wedding_page_views       integer      default 0
 *   our_story                text
 *   travel_copy              text
 *   dress_code_style         varchar(50)
 *   dress_code_description   text
 *   dress_code_image_url     varchar(500)
 *   things_to_do             jsonb
 *   multiple_events          jsonb
 *   photo_gallery_urls       jsonb
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  console.log("[migrate] adding wedding-website columns to wedding_plans…");

  await db.execute(sql`
    ALTER TABLE wedding_plans
      ADD COLUMN IF NOT EXISTS wedding_theme           varchar(20)   DEFAULT 'romantic',
      ADD COLUMN IF NOT EXISTS wedding_published       boolean       DEFAULT false,
      ADD COLUMN IF NOT EXISTS wedding_hero_image      varchar(500),
      ADD COLUMN IF NOT EXISTS wedding_party           jsonb,
      ADD COLUMN IF NOT EXISTS wedding_registry        jsonb,
      ADD COLUMN IF NOT EXISTS wedding_generated_copy  jsonb,
      ADD COLUMN IF NOT EXISTS wedding_page_config     jsonb,
      ADD COLUMN IF NOT EXISTS wedding_password        varchar(100),
      ADD COLUMN IF NOT EXISTS wedding_hashtag         varchar(100),
      ADD COLUMN IF NOT EXISTS wedding_page_views      integer       DEFAULT 0,
      ADD COLUMN IF NOT EXISTS our_story               text,
      ADD COLUMN IF NOT EXISTS travel_copy             text,
      ADD COLUMN IF NOT EXISTS dress_code_style        varchar(50),
      ADD COLUMN IF NOT EXISTS dress_code_description  text,
      ADD COLUMN IF NOT EXISTS dress_code_image_url    varchar(500),
      ADD COLUMN IF NOT EXISTS things_to_do            jsonb,
      ADD COLUMN IF NOT EXISTS multiple_events         jsonb,
      ADD COLUMN IF NOT EXISTS photo_gallery_urls      jsonb;
  `);

  console.log("[migrate] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
