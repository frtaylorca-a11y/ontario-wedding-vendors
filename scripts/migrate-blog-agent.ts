/**
 * Creates the five blog-agent tables + their indexes + the singleton
 * settings row. Idempotent — safe to re-run.
 *
 * Run:
 *   npx tsx scripts/migrate-blog-agent.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id                       SERIAL PRIMARY KEY,
      slug                     VARCHAR(255) NOT NULL UNIQUE,
      title                    VARCHAR(255) NOT NULL,
      content                  TEXT NOT NULL,
      meta_description         TEXT,
      excerpt                  TEXT,
      category                 VARCHAR(100),
      tags                     JSONB,
      published_at             TIMESTAMP,
      word_count               INTEGER,
      source_topic             TEXT,
      source_directory         VARCHAR(120),
      internal_links           JSONB,
      is_published             BOOLEAN DEFAULT FALSE,
      is_ai_generated          BOOLEAN DEFAULT TRUE,
      hero_image_url           VARCHAR(500),
      hero_image_alt           VARCHAR(200),
      hero_image_prompt        TEXT,
      hero_image_generated_at  TIMESTAMP,
      created_at               TIMESTAMP DEFAULT NOW(),
      updated_at               TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (is_published, published_at)`;
  await sql`CREATE INDEX IF NOT EXISTS blog_posts_slug_idx       ON blog_posts (slug)`;

  await sql`
    CREATE TABLE IF NOT EXISTS blog_scout_log (
      id              SERIAL PRIMARY KEY,
      title           TEXT NOT NULL,
      source_name     VARCHAR(120) NOT NULL,
      source_url      VARCHAR(600),
      discovered_at   TIMESTAMP DEFAULT NOW(),
      score           INTEGER DEFAULT 0,
      used            BOOLEAN DEFAULT FALSE,
      used_at         TIMESTAMP,
      our_post_slug   VARCHAR(255)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS blog_scout_log_discovered_idx ON blog_scout_log (discovered_at)`;
  await sql`CREATE INDEX IF NOT EXISTS blog_scout_log_used_idx       ON blog_scout_log (used, score)`;

  await sql`
    CREATE TABLE IF NOT EXISTS blog_agent_settings (
      id                  SERIAL PRIMARY KEY,
      auto_publish        BOOLEAN DEFAULT FALSE,
      daily_run_enabled   BOOLEAN DEFAULT TRUE,
      min_word_count      INTEGER DEFAULT 700,
      max_word_count      INTEGER DEFAULT 900,
      target_regions      JSONB DEFAULT '["niagara","gta","hamilton"]'::jsonb,
      updated_at          TIMESTAMP DEFAULT NOW()
    )
  `;
  /* Singleton row — id=1 holds live config. */
  await sql`
    INSERT INTO blog_agent_settings (id, auto_publish, daily_run_enabled, min_word_count, max_word_count, target_regions)
    VALUES (1, FALSE, TRUE, 700, 900, '["niagara","gta","hamilton"]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS content_distribution_log (
      id                  SERIAL PRIMARY KEY,
      blog_post_id        INTEGER,
      platform            VARCHAR(40) NOT NULL,
      platform_post_id    VARCHAR(255),
      published_at        TIMESTAMP,
      status              VARCHAR(20) NOT NULL,
      engagement_data     JSONB,
      error_message       TEXT,
      created_at          TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS content_distribution_post_idx   ON content_distribution_log (blog_post_id, platform)`;
  await sql`CREATE INDEX IF NOT EXISTS content_distribution_status_idx ON content_distribution_log (status, created_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id                  SERIAL PRIMARY KEY,
      email               VARCHAR(255) NOT NULL UNIQUE,
      name                VARCHAR(120),
      region              VARCHAR(80),
      subscribed_at       TIMESTAMP DEFAULT NOW(),
      unsubscribe_token   VARCHAR(64) NOT NULL,
      is_active           BOOLEAN DEFAULT TRUE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS newsletter_active_idx ON newsletter_subscribers (is_active, subscribed_at)`;

  console.log("[migrate] blog-agent tables ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
