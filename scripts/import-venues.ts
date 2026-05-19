/**
 * Import venues from directory_ready.csv into Neon.
 *
 * Default source path (from CLAUDE.md):
 *   C:\Users\rtayl\OneDrive\Desktop\ontario-wedding-venues\\data\validated\directory_ready.csv
 *
 * Usage:
 *   npx tsx scripts/import-venues.ts
 *   npx tsx scripts/import-venues.ts <path-to-csv>
 *
 * Behaviour:
 *   - Generates slug from name + city
 *   - Maps city slug â†’ region via REGION_MAP
 *   - Upserts on conflict (place_id) â†’ update
 *   - Reports: inserted, updated, skipped
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues, type NewVenue } from "../src/lib/schema";
import { cityToRegion } from "../src/lib/regions";
import { generateSlug, citySlug } from "../src/lib/utils";

const DEFAULT_CSV =
  "C:\\Users\\rtayl\\OneDrive\\Desktop\\ontario-venues-scraper\\data\\validated\\directory_ready.csv";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

function num(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v: string | undefined): number | null {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
}

function str(v: string | undefined): string | null {
  if (!v || v.trim() === "") return null;
  return v.trim();
}

function decimalStr(v: string | undefined): string | null {
  const n = num(v);
  return n == null ? null : String(n);
}

function date(v: string | undefined): Date | null {
  if (!v || v.trim() === "") return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return undefined;
}

function rowToVenue(row: Record<string, string>): NewVenue | null {
  const name = pick(row, "name", "Name", "venue_name", "title");
  const city = pick(row, "city", "City");
  if (!name) return null;

  const placeId = pick(row, "place_id", "placeId", "google_place_id");
  const slug = pick(row, "slug") ?? generateSlug(name, city ?? "");
  const region = pick(row, "region") ?? cityToRegion(citySlug(city ?? "")) ?? null;

  return {
    placeId: str(placeId),
    slug,
    name,
    address: str(pick(row, "address", "formatted_address")),
    city: str(city),
    region: region ?? null,
    province: str(pick(row, "province")) ?? "ON",
    postalCode: str(pick(row, "postal_code", "postalCode")),
    phone: str(pick(row, "phone", "formatted_phone_number")),
    website: str(pick(row, "website")),
    email: str(pick(row, "email")),
    category: str(pick(row, "category")),
    venueType: str(pick(row, "venue_type", "venueType", "type")),
    capacityMin: int(pick(row, "capacity_min", "capacityMin")),
    capacityMax: int(pick(row, "capacity_max", "capacityMax", "capacity")),
    coordinatorName: str(pick(row, "coordinator_name", "coordinatorName")),
    coordinatorEmail: str(pick(row, "coordinator_email", "coordinatorEmail")),
    coordinatorPhone: str(pick(row, "coordinator_phone", "coordinatorPhone")),
    catering: str(pick(row, "catering")),
    accommodations: str(pick(row, "accommodations")),
    indoorOutdoor: str(pick(row, "indoor_outdoor", "indoorOutdoor")),
    hasWeddingsPage: str(pick(row, "has_weddings_page", "hasWeddingsPage")),
    weddingsPageUrl: str(pick(row, "weddings_page_url", "weddingsPageUrl")),
    hasPackages: str(pick(row, "has_packages", "hasPackages")),
    packages: str(pick(row, "packages")),
    hasPricing: str(pick(row, "has_pricing", "hasPricing")),
    hasTestimonials: str(pick(row, "has_testimonials", "hasTestimonials")),
    bookingPlatform: str(pick(row, "booking_platform", "bookingPlatform")),
    instagramHandle: str(pick(row, "instagram_handle", "instagramHandle", "instagram")),
    googleRating: decimalStr(pick(row, "google_rating", "googleRating", "rating")),
    reviewCount: int(pick(row, "review_count", "reviewCount", "user_ratings_total")),
    googleClosed: str(pick(row, "google_closed", "googleClosed")) ?? "no",
    weddingReadinessScore: int(
      pick(row, "wedding_readiness_score", "weddingReadinessScore", "score"),
    ),
    scoreReasoning: str(pick(row, "score_reasoning", "scoreReasoning")),
    description: str(pick(row, "description")),
    lat: decimalStr(pick(row, "lat", "latitude")),
    lng: decimalStr(pick(row, "lng", "longitude")),
    tier: str(pick(row, "tier")) ?? "free",
    source: str(pick(row, "source")) ?? "directory_ready.csv",
    lastGoogleSync: date(pick(row, "scraped_at", "scrapedAt")),
    lastVerified: date(pick(row, "enriched_at", "enrichedAt", "last_verified", "lastVerified")),
  };
}

async function upsert(v: NewVenue): Promise<"inserted" | "updated"> {
  const target = v.placeId ? venues.placeId : venues.slug;
  const result = await db
    .insert(venues)
    .values(v)
    .onConflictDoUpdate({
      target,
      set: {
        slug: v.slug,
        name: v.name,
        address: v.address,
        city: v.city,
        region: v.region,
        province: v.province,
        postalCode: v.postalCode,
        phone: v.phone,
        website: v.website,
        email: v.email,
        category: v.category,
        venueType: v.venueType,
        capacityMin: v.capacityMin,
        capacityMax: v.capacityMax,
        coordinatorName: v.coordinatorName,
        coordinatorEmail: v.coordinatorEmail,
        coordinatorPhone: v.coordinatorPhone,
        catering: v.catering,
        accommodations: v.accommodations,
        indoorOutdoor: v.indoorOutdoor,
        hasWeddingsPage: v.hasWeddingsPage,
        weddingsPageUrl: v.weddingsPageUrl,
        hasPackages: v.hasPackages,
        packages: v.packages,
        hasPricing: v.hasPricing,
        hasTestimonials: v.hasTestimonials,
        bookingPlatform: v.bookingPlatform,
        instagramHandle: v.instagramHandle,
        googleRating: v.googleRating,
        reviewCount: v.reviewCount,
        googleClosed: v.googleClosed,
        weddingReadinessScore: v.weddingReadinessScore,
        scoreReasoning: v.scoreReasoning,
        description: v.description,
        lat: v.lat,
        lng: v.lng,
        tier: v.tier,
        source: v.source,
        lastGoogleSync: v.lastGoogleSync,
        lastVerified: v.lastVerified,
        updatedAt: sql`now()`,
      },
    })
    .returning({ createdAt: venues.createdAt, updatedAt: venues.updatedAt });

  const row = result[0];
  if (!row || !row.createdAt || !row.updatedAt) return "inserted";
  return row.createdAt.getTime() === row.updatedAt.getTime() ? "inserted" : "updated";
}

async function main() {
  const csvPath = resolve(process.argv[2] ?? DEFAULT_CSV);
  console.log(`Reading ${csvPath}`);
  const text = await readFile(csvPath, "utf8");
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const v = rowToVenue(row);
    if (!v) {
      skipped++;
      continue;
    }
    try {
      const op = await upsert(v);
      if (op === "inserted") inserted++;
      else updated++;
    } catch (err) {
      failed++;
      console.error(`  âœ— ${v.slug}: ${(err as Error).message}`);
    }
  }

  console.log(
    `Done. inserted=${inserted} updated=${updated} skipped=${skipped} failed=${failed}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


