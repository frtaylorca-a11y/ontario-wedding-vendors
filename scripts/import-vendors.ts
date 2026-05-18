/**
 * Import vendors from an Excel (.xlsx) or CSV export into Neon.
 *
 * Usage:
 *   npx tsx scripts/import-vendors.ts <path-to-file>
 *
 * Expects columns matching the vendors schema (see src/lib/schema.ts).
 * For .xlsx support, install `xlsx`:
 *   npm i -D xlsx
 *
 * This stub handles CSV out of the box and emits a clear error for .xlsx
 * until the optional dependency is installed.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors, type NewVendor } from "../src/lib/schema";
import { cityToRegion } from "../src/lib/regions";
import { generateSlug, citySlug } from "../src/lib/utils";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const str = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
const num = (v: string | undefined) => {
  if (!v || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: string | undefined) => {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
};
const dec = (v: string | undefined) => {
  const n = num(v);
  return n == null ? null : String(n);
};

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) if (row[k]) return row[k];
  return undefined;
}

function rowToVendor(row: Record<string, string>): NewVendor | null {
  const name = pick(row, "name", "Name");
  const category = pick(row, "category", "Category");
  if (!name || !category) return null;
  const city = pick(row, "city", "City");
  const slug = pick(row, "slug") ?? generateSlug(name, city ?? "");
  const region = pick(row, "region") ?? cityToRegion(citySlug(city ?? "")) ?? null;

  return {
    placeId: str(pick(row, "place_id", "placeId")),
    slug,
    name,
    category,
    city: str(city),
    region: region ?? null,
    province: str(pick(row, "province")) ?? "ON",
    address: str(pick(row, "address")),
    phone: str(pick(row, "phone")),
    website: str(pick(row, "website")),
    email: str(pick(row, "email")),
    instagramHandle: str(pick(row, "instagram_handle", "instagramHandle", "instagram")),
    googleRating: dec(pick(row, "google_rating", "googleRating", "rating")),
    reviewCount: int(pick(row, "review_count", "reviewCount", "user_ratings_total")),
    googleClosed: str(pick(row, "google_closed", "googleClosed")) ?? "no",
    priceTier: str(pick(row, "price_tier", "priceTier")),
    priceFrom: int(pick(row, "price_from", "priceFrom")),
    priceTo: int(pick(row, "price_to", "priceTo")),
    description: str(pick(row, "description")),
    lat: dec(pick(row, "lat", "latitude")),
    lng: dec(pick(row, "lng", "longitude")),
    serveRadiusKm: int(pick(row, "serve_radius_km", "serveRadiusKm")) ?? 100,
    tier: str(pick(row, "tier")) ?? "free",
    isPicBooth: /^(true|1|yes)$/i.test(pick(row, "is_pic_booth", "isPicBooth") ?? ""),
    source: str(pick(row, "source")) ?? "vendor-import",
  };
}

async function upsert(v: NewVendor): Promise<"inserted" | "updated"> {
  const target = v.placeId ? vendors.placeId : vendors.slug;
  const result = await db
    .insert(vendors)
    .values(v)
    .onConflictDoUpdate({
      target,
      set: { ...v, updatedAt: sql`now()` },
    })
    .returning({ createdAt: vendors.createdAt, updatedAt: vendors.updatedAt });
  const row = result[0];
  if (!row || !row.createdAt || !row.updatedAt) return "inserted";
  return row.createdAt.getTime() === row.updatedAt.getTime() ? "inserted" : "updated";
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/import-vendors.ts <path-to-csv>");
    process.exit(1);
  }
  const path = resolve(file);
  const ext = extname(path).toLowerCase();
  if (ext === ".xlsx") {
    console.error(
      "xlsx parsing not enabled. Convert to .csv, or `npm i -D xlsx` and extend this script.",
    );
    process.exit(1);
  }
  if (ext !== ".csv") {
    console.error(`Unsupported file: ${ext}. Expected .csv`);
    process.exit(1);
  }

  const rows = parseCsv(await readFile(path, "utf8"));
  console.log(`Parsed ${rows.length} rows from ${path}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    const v = rowToVendor(row);
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
      console.error(`  ✗ ${v.slug}: ${(err as Error).message}`);
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
