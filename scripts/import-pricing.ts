/**
 * Import pricing snapshots from the ontario-venues-scraper into the
 * vendor_pricing_data table.
 *
 * Expected JSON shape:
 *   [
 *     {
 *       "category": "photographer",
 *       "region":   "niagara",
 *       "tier":     "mid",
 *       "range_min": 2200,
 *       "range_max": 4200,
 *       "median":    3100,
 *       "sample_size": 38,
 *       "source":    "scraped"
 *     },
 *     ...
 *   ]
 *
 * Idempotent upsert keyed by (category, region, tier, source).
 *
 * Run: `npx tsx scripts/import-pricing.ts`
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_INPUT_PATH =
  "C:\\Users\\rtayl\\OneDrive\\Desktop\\ontario-venues-scraper\\data\\ontario_pricing_table.json";

const inputPath = process.argv[2] ?? DEFAULT_INPUT_PATH;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

type Row = {
  category: string;
  region: string;
  tier: string;
  range_min?: number | null;
  range_max?: number | null;
  median?: number | null;
  sample_size?: number;
  source?: "scraped" | "published";
};

async function run() {
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error(`Pass a path explicitly: npx tsx scripts/import-pricing.ts <path>`);
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf8");
  const data: Row[] = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.error("Expected JSON array at top level");
    process.exit(1);
  }

  const sql = neon(url!);
  let upserts = 0;

  for (const row of data) {
    if (!row.category || !row.region || !row.tier) {
      console.warn("Skipping row with missing category/region/tier:", row);
      continue;
    }
    const source = row.source ?? "scraped";
    await sql`
      INSERT INTO vendor_pricing_data
        (category, region, tier, range_min, range_max, median, sample_size, source, last_updated)
      VALUES
        (${row.category}, ${row.region}, ${row.tier},
         ${row.range_min ?? null}, ${row.range_max ?? null}, ${row.median ?? null},
         ${row.sample_size ?? 0}, ${source}, now())
      ON CONFLICT (category, region, tier, source) DO UPDATE SET
        range_min   = EXCLUDED.range_min,
        range_max   = EXCLUDED.range_max,
        median      = EXCLUDED.median,
        sample_size = EXCLUDED.sample_size,
        last_updated = now()
    `;
    upserts++;
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM vendor_pricing_data`;
  console.log(`Upserted ${upserts} rows. vendor_pricing_data total: ${count}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
