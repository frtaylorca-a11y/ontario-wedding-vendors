/**
 * Creates the blog_drafts table + its index.
 *
 * We run this via neon-serverless directly (rather than drizzle-kit
 * push) because the project's working directory has unrelated index
 * drift that turns drizzle-kit into an interactive prompt. This
 * script is idempotent — re-running is safe.
 *
 * Run:
 *   npx tsx scripts/migrate-blog-drafts.ts
 */
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`
    CREATE TABLE IF NOT EXISTS blog_drafts (
      id                 SERIAL PRIMARY KEY,
      slug               VARCHAR(255) NOT NULL UNIQUE,
      title              VARCHAR(255) NOT NULL,
      meta_description   TEXT,
      content_mdx        TEXT NOT NULL,
      topic              TEXT,
      target_keyword     VARCHAR(255),
      target_region      VARCHAR(100),
      category           VARCHAR(50),
      competitor_url     VARCHAR(500),
      internal_links     JSONB,
      word_count         INTEGER,
      published_at       TIMESTAMP,
      created_at         TIMESTAMP DEFAULT NOW(),
      updated_at         TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS blog_drafts_published_at_idx
      ON blog_drafts (published_at, created_at)
  `;

  console.log("[migrate] blog_drafts table + index ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
