/**
 * Seed vendor_pricing_data with the published baseline from RBC / WeddingWire
 * Canada / WealthNorth. Keyed by (category, region, tier, source="published").
 *
 * Idempotent — re-run to refresh ranges. Scraped rows are untouched.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const REGIONS = [
  "niagara", "gta", "golden-horseshoe", "hamilton", "ottawa",
  "eastern", "waterloo-region", "cottage-country",
] as const;

/* Published baseline: (low, mid, high) per category, in CAD.
 * Derived from RBC My Money Matters + WeddingWire 2024 Canada averages. */
const BASELINE: Record<string, { low: number; mid: number; high: number }> = {
  photographer:    { low: 2200, mid: 3500, high:  6500 },
  videographer:    { low: 1500, mid: 2400, high:  4500 },
  dj:              { low:  900, mid: 1600, high:  3000 },
  florist:         { low:  900, mid: 2200, high:  5500 },
  catering:        { low: 4500, mid: 9500, high: 22000 }, /* whole-event */
  cake:            { low:  450, mid:  900, high:  1800 },
  hair_makeup:     { low:  500, mid:  950, high:  1800 },
  officiant:       { low:  300, mid:  550, high:   900 },
  limo:            { low:  300, mid:  650, high:  1400 },
  lighting_decor:  { low:  500, mid: 1500, high:  4000 },
  photo_booth:     { low:  800, mid: 1300, high:  2200 },
  wedding_planner: { low:  500, mid: 2500, high:  8000 },
};

/* Regional multiplier — applied to the baseline. GTA = 1.30, Niagara = 1.00, etc. */
const REGIONAL_MULTIPLIER: Record<string, number> = {
  "gta":               1.30,
  "niagara":           1.00,
  "hamilton":          0.95,
  "golden-horseshoe":  0.95,
  "ottawa":            0.95,
  "eastern":           0.85,
  "waterloo-region":   0.90,
  "cottage-country":   1.10,
};

async function run() {
  const sql = neon(url!);
  let upserts = 0;

  for (const region of REGIONS) {
    const mult = REGIONAL_MULTIPLIER[region] ?? 1.0;
    for (const [category, { low, mid, high }] of Object.entries(BASELINE)) {
      const tiers: Array<{ tier: "budget" | "mid" | "luxury"; min: number; max: number; med: number }> = [
        { tier: "budget", min: Math.round(low  * mult), max: Math.round(mid  * mult), med: Math.round((low  * mult + mid  * mult) / 2) },
        { tier: "mid",    min: Math.round(mid  * mult), max: Math.round(high * mult), med: Math.round(mid  * mult) },
        { tier: "luxury", min: Math.round(high * mult), max: Math.round(high * mult * 1.8), med: Math.round(high * mult * 1.3) },
      ];
      for (const t of tiers) {
        await sql`
          INSERT INTO vendor_pricing_data
            (category, region, tier, range_min, range_max, median, sample_size, source, last_updated)
          VALUES
            (${category}, ${region}, ${t.tier}, ${t.min}, ${t.max}, ${t.med}, 0, 'published', now())
          ON CONFLICT (category, region, tier, source) DO UPDATE SET
            range_min   = EXCLUDED.range_min,
            range_max   = EXCLUDED.range_max,
            median      = EXCLUDED.median,
            last_updated = now()
        `;
        upserts++;
      }
    }
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM vendor_pricing_data`;
  console.log(`Upserted ${upserts} published rows. Total rows: ${count}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
