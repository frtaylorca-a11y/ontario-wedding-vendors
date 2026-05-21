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
 *   - Skips vendors with no place_id, EXCEPT when source is in the
 *     SYNTHETIC_ID_SOURCES map AND both name + city are present —
 *     those get a synthetic place_id of "<prefix>-" + slugify(name)
 *     so the (place_id) unique constraint still holds. WeddingWire
 *     and Yellow Pages listings don't carry Google place IDs but are
 *     otherwise high-signal, so this opens the door for them.
 *       weddingwire → "ww-{slug}"
 *       yellowpages → "yp-{slug}"
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

/**
 * Derive a usable region from the city when the scraper's region field is
 * missing, null-ish, or set to the catch-all "southwestern" bucket. Without
 * this, ~30% of vendors end up tagged "southwestern" regardless of where
 * they actually operate, which breaks region filters in the directory.
 *
 * Trust the upstream value when it's already a real region — only override
 * "southwestern" / "None" / "" / null. Default to "gta" if nothing matches,
 * since the directory is Ontario-wide and unknown-Ontario is closer to
 * Toronto than to anywhere else by volume.
 */
function normalizeRegion(
  region: string | null | undefined,
  city:   string | null | undefined,
): string {
  const r = (region ?? "").trim();
  if (r && r !== "southwestern" && r !== "None") return r;

  const c = (city ?? "").toLowerCase();
  if (c.includes("toronto") || c.includes("mississauga") ||
      c.includes("brampton") || c.includes("vaughan") ||
      c.includes("markham") || c.includes("oakville") ||
      c.includes("scarborough") || c.includes("etobicoke")) return "gta";
  if (c.includes("hamilton") || c.includes("burlington")) return "hamilton";
  if (c.includes("niagara") || c.includes("st. catharines") ||
      c.includes("welland") || c.includes("grimsby")) return "niagara";
  if (c.includes("huntsville") || c.includes("bracebridge") ||
      c.includes("gravenhurst") || c.includes("muskoka")) return "muskoka";
  if (c.includes("kitchener") || c.includes("waterloo") ||
      c.includes("guelph") || c.includes("cambridge")) return "waterloo";
  if (c.includes("kingston") || c.includes("ottawa") ||
      c.includes("peterborough") || c.includes("belleville")) return "eastern";
  if (c.includes("picton") || c.includes("prince edward")) return "pec";

  return r || "gta";
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

/* Sources whose rows can carry a synthetic place_id. Each value is
 * the 2-letter prefix used to namespace the synthetic ID so two
 * different sources can't collide on slug. WeddingWire shipped first
 * with "ww-"; Yellow Pages added later with "yp-". Both pipelines
 * upsert on this synthetic ID exactly the same way as a real Google
 * place_id. */
const SYNTHETIC_ID_SOURCES: Record<string, string> = {
  weddingwire: "ww",
  yellowpages: "yp",
};

/** URL-safe slug for synthesizing place IDs (WeddingWire + Yellow Pages). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") /* strip accents */
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

  /* Hide imports that lack a website on file from public listings and
   * flag them for the find-vendor-websites.ts AI search pass. Once
   * that script finds + validates a URL it un-hides the row in the
   * same write. */
  const website = cleanString(raw.website);
  const hasNoWebsite = !website;

  return {
    placeId:               raw.place_id,
    slug,
    name,
    category:              normalizeCategoryName(raw.category),
    address:               cleanString(raw.address),
    city:                  cleanString(raw.city),
    province:              raw.province ?? "ON",
    region:                normalizeRegion(cleanString(raw.region), cleanString(raw.city)),
    phone:                 cleanString(raw.phone),
    website,
    email:                 cleanString(raw.email),
    instagramHandle:       cleanString(raw.instagram_handle),
    googleRating:          raw.google_rating != null ? String(raw.google_rating) : null,
    reviewCount:           raw.review_count ?? null,
    googleClosed,
    isHidden:              hasNoWebsite,
    hiddenReason:          hasNoWebsite ? "no_website" : null,
    needsWebsiteSearch:    hasNoWebsite,
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

/** Suffix a slug with the trailing 6 chars of place_id when two vendors
 *  generate the same base slug (different cities, same business name, etc.). */
function makeUniqueSlug(baseSlug: string, placeId: string): string {
  const tail = placeId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase();
  return tail ? `${baseSlug}-${tail}` : baseSlug;
}

/** Recognize "slug" unique-constraint violations from Postgres / Neon HTTP.
 *  The place_id constraint is handled by ON CONFLICT — anything else that
 *  raises 23505 with "slug" in the constraint / detail is a slug collision. */
function isSlugUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; constraint?: string; detail?: string; message?: string };
  if (e.code === "23505") {
    if (e.constraint && e.constraint.includes("slug")) return true;
    if (e.detail     && e.detail.includes("(slug)"))     return true;
  }
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("slug") && (msg.includes("duplicate") || msg.includes("unique"));
}

async function doUpsert(row: NewVendor): Promise<"inserted" | "updated"> {
  const result = await db
    .insert(vendors)
    .values(row)
    .onConflictDoUpdate({
      target: vendors.placeId, /* place_id is the true identity — slug is just a URL */
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

/**
 * Insert or update one vendor row.
 *
 * Two unique constraints exist on the table:
 *   - place_id  (handled by ON CONFLICT DO UPDATE — same vendor seen twice
 *                across JSON files just updates fields)
 *   - slug      (NOT handled by ON CONFLICT because the conflict target
 *                must match the constraint we're targeting; two different
 *                place_ids that generate the same base slug collide here)
 *
 * On a slug collision we retry once with a placeId-suffixed slug. If that
 * also collides (extremely unlikely — would require two vendors with the
 * same name AND the same 6-char place_id tail), we bubble the error.
 */
async function upsertOne(row: NewVendor): Promise<"inserted" | "updated"> {
  try {
    return await doUpsert(row);
  } catch (err) {
    if (!isSlugUniqueViolation(err) || !row.placeId) throw err;
    const newSlug = makeUniqueSlug(row.slug, row.placeId);
    if (newSlug === row.slug) throw err; /* nothing to suffix */
    console.warn(`  slug collision · '${row.slug}' → retrying as '${newSlug}'`);
    return await doUpsert({ ...row, slug: newSlug });
  }
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

      /* WeddingWire + Yellow Pages scrapes lack Google place_ids —
       * synthesize one when we have enough identity (name + city) to
       * keep the row unique. Prefix comes from SYNTHETIC_ID_SOURCES so
       * each source's IDs stay distinct (ww-… vs yp-…). */
      if (!raw.place_id) {
        const sourceLc = (raw.source ?? "").toLowerCase();
        const prefix   = SYNTHETIC_ID_SOURCES[sourceLc];
        if (prefix && raw.name?.trim() && raw.city?.trim()) {
          raw.place_id = `${prefix}-${slugify(raw.name)}`;
        }
      }

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
