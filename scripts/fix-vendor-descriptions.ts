/**
 * One-off fix for the grammar bug in scraper-generated vendor descriptions.
 *
 * Bug: the Python scraper templates as `"{name} is a {category}s serving..."`
 * with a hardcoded plural 's'. After we normalized categories to singular at
 * import (photographers→photographer), this leaves descriptions like:
 *   "Nordello is a photographers serving Ontario weddings."
 *
 * Fix: strip the trailing 's' after "is a/an {singular_category}" only when
 * the category in our normalized list naturally ends without an 's'. Skip
 * categories whose singular form ends in 's' (none currently) or that
 * shouldn't be touched.
 *
 * Idempotent — running twice is safe.
 *
 * Usage: npx tsx scripts/fix-vendor-descriptions.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

/* Category words that appear in the buggy template — exact singular form */
const SINGULAR_CATEGORIES = [
  "photographer",
  "videographer",
  "florist",
  "officiant",
  "caterer",
  "cake designer",
  "limo",
  "wedding planner",
  /* 'dj' + 's' = 'djs' which is valid plural; only fix when context is wrong */
];

async function main() {
  let total = 0;
  /* Plain string replace — simpler and unambiguous. We look for the buggy
   * "is a {category}s " phrase (trailing space) and replace with the singular. */
  for (const cat of SINGULAR_CATEGORIES) {
    const buggy = `is a ${cat}s `;
    const fixed = `is a ${cat} `;

    const result = await db.execute(sql`
      UPDATE vendors
      SET description = replace(description, ${buggy}, ${fixed}),
          updated_at = NOW()
      WHERE description LIKE ${`%${buggy}%`}
    `);
    const count = (result as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) console.log(`  ${cat.padEnd(20)} → ${count} rows fixed`);
    total += count;
  }

  console.log(`\nTotal rows updated: ${total}`);
  console.log("\nNote: the underlying bug is in the Python scraper's description template");
  console.log("(`{name} is a {category}s serving...`). Fix that in the scraper to prevent");
  console.log("the bug returning on the next import.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
