/**
 * Import vendors from the JSON files produced by the ontario-venues-scraper.
 *
 * Reads every *.json file in the scraper's data/vendors/ directory, normalizes
 * the rows to NewVendor shape, and upserts on place_id.
 *
 * Default source path:
 *   C:\Users\rtayl\OneDrive\Desktop\ontario-venues-scraper\data\vendors\
 *
 * Behaviour:
 *   - Skips vendors with vendor_readiness_score < 50 (configurable via SCORE_MIN)
 *   - Skips vendors with no place_id (can't upsert without a unique key)
 *   - Skips rows from the "unknown.json" file (no actionable category)
 *   - Forces Pic Booth's slug to "pic-booth-st-catharines" (must match the
 *     hardcoded reference in PicBoothSitePartnerCard)
 *   - Sets isPicBooth / isNiagaraPhotoBooth from name match in addition to
 *     the scraper's own flag — belt and suspenders
 *   - Maps business_status "OPERATIONAL" → googleClosed "no", else "yes"
 *
 * Usage:
 *   npx tsx scripts/import-vendors.ts
 *   npx tsx scripts/import-vendors.ts <path-to-vendors-dir>
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { db } from "../src/lib/db";
import { vendors, type NewVendor } from "../src/lib/schema";

const DEFAULT_DIR =
  "C:\\Users\\rtayl\\OneDrive\\Desktop\\ontario-venues-scraper\\data\\vendors";

const SCORE_MIN = 50;
const PIC_BOOTH_SLUG = "pic-booth-st-catharines";

/**
 * Normalize scraper category names to canonical singular form.
 * The scraper emits both dj.json and djs.json (etc.) — same vendors, different filenames.
 * Without normalization, half the data ends up under "photographers" and half under "photographer".
 */
const CATEGORY_NORMALIZE: Record<string, string> = {
  djs:               "dj",
  florists:          "florist",
  officiants:        "officiant",
  videographers:     "videographer",
  photographers:     "photographer",
  wedding_planners:  "wedding_planner",
};

function normalizeCategoryName(c: string | null | undefined): string {
  if (!c) return "unknown";
  return CATEGORY_NORMALIZE[c] ?? c;
}

/* Raw row shape coming out of the scraper JSON */
type ScrapedVendor = {
  place_id?: string | null;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  instagram_handle?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  business_status?: string | null;
  lat?: number | null;
  lng?: number | null;
  vendor_readiness_score?: number | null;
  description?: string | null;
  price_tier?: string | null;
  price_from?: number | null;
  price_to?: number | null;
  is_pic_booth?: boolean | null;
  is_niagara_photo_booth?: boolean | null;
  source?: string | null;
};

type Stats = {
  inserted: number;
  updated: number;
  skippedLowScore: number;
  skippedNoPlaceId: number;
  skippedUnknownCategory: number;
  skippedPicBoothDup: number;
  errors: number;
};
type PerCategory = Record<string, Stats>;

function newStats(): Stats {
  return {
    inserted: 0, updated: 0,
    skippedLowScore: 0, skippedNoPlaceId: 0, skippedUnknownCategory: 0,
    skippedPicBoothDup: 0,
    errors: 0,
  };
}

function isPicBoothName(name: string): boolean {
  return /\bpic\s*booth\b/i.test(name);
}
function isNiagaraPhotoBoothName(name: string): boolean {
  return /\bniagara\s+photo\s+booth\b/i.test(name);
}

function cleanString(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.toLowerCase() === "unknown") return null;
  return t;
}

function toRow(raw: ScrapedVendor): NewVendor | null {
  if (!raw.place_id) return null;
  if (!raw.name?.trim()) return null;

  const name = raw.name.trim();
  const picBooth = Boolean(raw.is_pic_booth) || isPicBoothName(name);
  const niagaraPhotoBooth = Boolean(raw.is_niagara_photo_booth) || isNiagaraPhotoBoothName(name);

  const slug = picBooth ? PIC_BOOTH_SLUG : (raw.slug ?? "").trim();
  if (!slug) return null;

  const googleClosed =
    raw.business_status && raw.business_status.toUpperCase() === "OPERATIONAL"
      ? "no"
      : raw.business_status
        ? "yes"
        : "no";

  return {
    placeId:               raw.place_id,
    slug,
    name,
    category:              normalizeCategoryName(raw.category),
    address:               cleanString(raw.address),
    city:                  cleanString(raw.city),
    province:              raw.province ?? "ON",
    region:                cleanString(raw.region),
    phone:                 cleanString(raw.phone),
    website:               cleanString(raw.website),
    email:                 cleanString(raw.email),
    instagramHandle:       cleanString(raw.instagram_handle),
    googleRating:          raw.google_rating != null ? String(raw.google_rating) : null,
    reviewCount:           raw.review_count ?? null,
    googleClosed,
    priceTier:             cleanString(raw.price_tier),
    priceFrom:             raw.price_from ?? null,
    priceTo:               raw.price_to ?? null,
    description:           cleanString(raw.description),
    lat:                   raw.lat != null ? String(raw.lat) : null,
    lng:                   raw.lng != null ? String(raw.lng) : null,
    isPicBooth:            picBooth,
    isNiagaraPhotoBooth:   niagaraPhotoBooth,
    vendorReadinessScore:  raw.vendor_readiness_score ?? null,
    source:                cleanString(raw.source) ?? "google_places",
  };
}

/** Insert or update one row by place_id. Returns "inserted" | "updated". */
async function upsertOne(row: NewVendor): Promise<"inserted" | "updated"> {
  const result = await db
    .insert(vendors)
    .values(row)
    .onConflictDoUpdate({
      target: vendors.placeId,
      set: {
        slug:                 row.slug,
        name:                 row.name,
        category:             row.category,
        address:              row.address,
        city:                 row.city,
        province:             row.province,
        region:               row.region,
        phone:                row.phone,
        website:              row.website,
        email:                row.email,
        instagramHandle:      row.instagramHandle,
        googleRating:         row.googleRating,
        reviewCount:          row.reviewCount,
        googleClosed:         row.googleClosed,
        priceTier:            row.priceTier,
        priceFrom:            row.priceFrom,
        priceTo:              row.priceTo,
        description:          row.description,
        lat:                  row.lat,
        lng:                  row.lng,
        isPicBooth:           row.isPicBooth,
        isNiagaraPhotoBooth:  row.isNiagaraPhotoBooth,
        vendorReadinessScore: row.vendorReadinessScore,
        source:               row.source,
        updatedAt:            new Date(),
      },
    })
    .returning({ id: vendors.id, createdAt: vendors.createdAt, updatedAt: vendors.updatedAt });

  const r = result[0];
  if (!r) return "inserted";
  const created = r.createdAt?.getTime() ?? 0;
  const updated = r.updatedAt?.getTime() ?? 0;
  return Math.abs(updated - created) < 1500 ? "inserted" : "updated";
}

async function main() {
  const sourceDir = resolve(process.argv[2] ?? DEFAULT_DIR);
  console.log(`Source: ${sourceDir}\n`);

  let files: string[];
  try {
    files = (await readdir(sourceDir))
      .filter((f) => f.endsWith(".json"))
      .filter((f) => f.toLowerCase() !== "unknown.json");
  } catch (err) {
    console.error(`Cannot read ${sourceDir}:`, err);
    process.exit(1);
  }

  console.log(`Found ${files.length} JSON files\n`);

  const perFile: Record<string, Stats> = {};
  const perCategory: PerCategory = {};
  const total = newStats();

  /* Pic Booth dedup: only one row with the canonical slug should exist. The
   * scraper sometimes emits multiple Pic-Booth-named entries (Google has
   * duplicate listings). After the first one inserts/updates, skip subsequent. */
  let picBoothProcessed = false;

  for (const filename of files) {
    const filepath = join(sourceDir, filename);
    const fileStats = newStats();
    perFile[filename] = fileStats;

    let rows: ScrapedVendor[] = [];
    try {
      const text = await readFile(filepath, "utf8");
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error(`  ${filename}: parse failed — ${err}`);
      total.errors++;
      continue;
    }

    for (const raw of rows) {
      const cat = normalizeCategoryName(raw.category);
      if (!perCategory[cat]) perCategory[cat] = newStats();
      const catStats = perCategory[cat];

      if (!raw.place_id) {
        fileStats.skippedNoPlaceId++; catStats.skippedNoPlaceId++; total.skippedNoPlaceId++;
        continue;
      }
      if ((raw.vendor_readiness_score ?? 0) < SCORE_MIN) {
        fileStats.skippedLowScore++; catStats.skippedLowScore++; total.skippedLowScore++;
        continue;
      }

      /* Skip Pic Booth duplicates after the first one is processed */
      if (raw.name && isPicBoothName(raw.name) && picBoothProcessed) {
        fileStats.skippedPicBoothDup++; catStats.skippedPicBoothDup++; total.skippedPicBoothDup++;
        continue;
      }

      const row = toRow(raw);
      if (!row) {
        fileStats.skippedUnknownCategory++; catStats.skippedUnknownCategory++; total.skippedUnknownCategory++;
        continue;
      }

      try {
        const result = await upsertOne(row);
        if (result === "inserted") { fileStats.inserted++; catStats.inserted++; total.inserted++; }
        else                       { fileStats.updated++;  catStats.updated++;  total.updated++; }
        /* Mark Pic Booth as processed only on a successful write */
        if (isPicBoothName(row.name)) picBoothProcessed = true;
      } catch (err) {
        fileStats.errors++; catStats.errors++; total.errors++;
        console.error(`    ${row.name} (${row.placeId}): ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(
      `  ${basename(filename).padEnd(22)} ` +
      `ins=${fileStats.inserted}, upd=${fileStats.updated}, ` +
      `skip(low=${fileStats.skippedLowScore}, noPid=${fileStats.skippedNoPlaceId}, unkCat=${fileStats.skippedUnknownCategory}, picDup=${fileStats.skippedPicBoothDup}), ` +
      `err=${fileStats.errors}`,
    );
  }

  /* Per-category summary */
  console.log("\n" + "=".repeat(70));
  console.log("Per-category summary");
  console.log("=".repeat(70));
  console.log(
    `  ${"category".padEnd(20)} ${"ins".padStart(5)} ${"upd".padStart(5)} ` +
    `${"low".padStart(5)} ${"errs".padStart(5)}`,
  );
  for (const c of Object.keys(perCategory).sort()) {
    const s = perCategory[c];
    console.log(
      `  ${c.padEnd(20)} ${String(s.inserted).padStart(5)} ${String(s.updated).padStart(5)} ` +
      `${String(s.skippedLowScore).padStart(5)} ${String(s.errors).padStart(5)}`,
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("Total");
  console.log("=".repeat(70));
  console.log(`  Inserted: ${total.inserted}`);
  console.log(`  Updated:  ${total.updated}`);
  console.log(`  Skipped (low score):    ${total.skippedLowScore}`);
  console.log(`  Skipped (no place_id):  ${total.skippedNoPlaceId}`);
  console.log(`  Skipped (unknown cat):  ${total.skippedUnknownCategory}`);
  console.log(`  Skipped (Pic Booth dup):${total.skippedPicBoothDup}`);
  console.log(`  Errors:   ${total.errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
