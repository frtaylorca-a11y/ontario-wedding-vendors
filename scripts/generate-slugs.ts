/**
 * Backfill venues.slug for any row missing one (e.g. after a raw insert).
 * Slug is derived from name + city; collisions get -2, -3, ... suffixes.
 */
import "dotenv/config";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";
import { generateSlug } from "../src/lib/utils";

async function main() {
  const rows = await db
    .select({ id: venues.id, name: venues.name, city: venues.city, slug: venues.slug })
    .from(venues)
    .where(or(isNull(venues.slug), eq(venues.slug, "")));

  console.log(`Found ${rows.length} venues without slugs`);

  const taken = new Set<string>(
    (await db.select({ slug: venues.slug }).from(venues)).map((r) => r.slug),
  );

  let updated = 0;
  for (const row of rows) {
    let base = generateSlug(row.name, row.city ?? "");
    let slug = base;
    let i = 2;
    while (taken.has(slug)) {
      slug = `${base}-${i++}`;
    }
    taken.add(slug);
    await db
      .update(venues)
      .set({ slug, updatedAt: sql`now()` })
      .where(eq(venues.id, row.id));
    updated++;
  }

  console.log(`Updated ${updated} slugs`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
