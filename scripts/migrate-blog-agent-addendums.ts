/**
 * Adds the addendum-A/B/D columns to blog_agent_settings:
 *   - word_count_pillar / _standard / _local
 *   - launch_burst_limit
 *   - cluster_mode / current_cluster
 *
 * Idempotent — IF NOT EXISTS on every column. Safe to re-run.
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS word_count_pillar    INTEGER DEFAULT 2200`;
  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS word_count_standard  INTEGER DEFAULT 1700`;
  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS word_count_local     INTEGER DEFAULT 1000`;
  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS launch_burst_limit   INTEGER DEFAULT 90`;
  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS cluster_mode         BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE blog_agent_settings ADD COLUMN IF NOT EXISTS current_cluster      VARCHAR(50)`;

  /* Backfill the singleton row with defaults where columns landed as NULL. */
  await sql`
    UPDATE blog_agent_settings
       SET word_count_pillar   = COALESCE(word_count_pillar, 2200),
           word_count_standard = COALESCE(word_count_standard, 1700),
           word_count_local    = COALESCE(word_count_local, 1000),
           launch_burst_limit  = COALESCE(launch_burst_limit, 90),
           cluster_mode        = COALESCE(cluster_mode, FALSE)
     WHERE id = 1
  `;

  console.log("[migrate] addendum columns applied.");
}

main().catch((err) => { console.error(err); process.exit(1); });
