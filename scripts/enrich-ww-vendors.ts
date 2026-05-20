/**
 * Enrich WeddingWire vendor rows with Google Places data.
 *
 * Reads every *.json file in the scraper's data/vendors/ directory and,
 * for each row where source === "weddingwire" AND place_id is null/empty,
 * runs a Text Search → Place Details pair and writes the enriched fields
 * back into the same JSON file.
 *
 * Pipeline per row:
 *   1. Text Search:
 *        GET maps.googleapis.com/maps/api/place/textsearch/json
 *          ?query=<name> wedding <category> <city> Ontario Canada
 *          &key=<KEY>
 *      Take results[0] → place_id + canonical name.
 *   2. Place Details:
 *        GET maps.googleapis.com/maps/api/place/details/json
 *          ?place_id=<place_id>
 *          &fields=name,formatted_address,formatted_phone_number,website,
 *                  rating,user_ratings_total,geometry,photos
 *          &key=<KEY>
 *   3. Patch the row in-place with:
 *        place_id, name, address, phone, website,
 *        google_rating, review_count, lat, lng,
 *        hero_image (= photos[0].photo_reference), enriched_at
 *   4. Persist the whole file after every successful patch so the run
 *      is interruption-safe.
 *
 * Skips:
 *   - rows where place_id is already set
 *   - rows where source !== "weddingwire"
 *   - rows where Google Text Search returns zero results
 *
 * Rate limit: 200ms between requests (each row makes 2 calls).
 * Cost: ~$0.034 / row (Text Search + Place Details basic). At 573 rows
 *       in the current data set, full run ≈ $19.50.
 *
 * Usage:
 *   npx tsx scripts/enrich-ww-vendors.ts                  # all
 *   npx tsx scripts/enrich-ww-vendors.ts --limit 50       # smoke test
 *   npx tsx scripts/enrich-ww-vendors.ts --dry-run        # no file writes
 *   npx tsx scripts/enrich-ww-vendors.ts <path-to-dir>    # custom dir
 *
 * After enrichment:
 *   npx tsx scripts/import-vendors.ts                     # picks up new IDs
 */
import "dotenv/config";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_DIR =
  "C:\\Users\\rtayl\\OneDrive\\Desktop\\ontario-venues-scraper\\data\\vendors";

const DELAY_BETWEEN_REQUESTS_MS = 200;
const COST_PER_ROW_USD = 0.034;

/* Loose row shape — match what the scraper actually writes */
type VendorRow = Record<string, unknown> & {
  name?: string | null;
  city?: string | null;
  category?: string | null;
  source?: string | null;
  place_id?: string | null;
};

type Args = { dir: string; limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let dir = DEFAULT_DIR;
  let limit: number | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else if (!a.startsWith("--")) {
      dir = resolve(a);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { dir, limit, dryRun };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SearchResult = { placeId: string; canonicalName: string | null };
type SearchOutcome =
  | { kind: "ok"; result: SearchResult }
  | { kind: "no-results" }
  | { kind: "bad-status"; status: string }
  | { kind: "error"; message: string };

async function textSearch(query: string, key: string): Promise<SearchOutcome> {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}` +
    `&key=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const data = await res.json() as {
      status?: string;
      results?: Array<{ place_id?: string; name?: string }>;
    };
    if (data.status === "ZERO_RESULTS") return { kind: "no-results" };
    if (data.status !== "OK") return { kind: "bad-status", status: data.status ?? "UNKNOWN" };
    const first = data.results?.[0];
    if (!first?.place_id) return { kind: "no-results" };
    return {
      kind: "ok",
      result: { placeId: first.place_id, canonicalName: first.name ?? null },
    };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

type PlaceDetails = {
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  lat: number | null;
  lng: number | null;
  photoReference: string | null;
};

type DetailsOutcome =
  | { kind: "ok"; details: PlaceDetails }
  | { kind: "bad-status"; status: string }
  | { kind: "error"; message: string };

async function placeDetails(placeId: string, key: string): Promise<DetailsOutcome> {
  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "geometry",
    "photos",
  ].join(",");
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${fields}` +
    `&key=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const data = await res.json() as {
      status?: string;
      result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
        geometry?: { location?: { lat?: number; lng?: number } };
        photos?: Array<{ photo_reference?: string }>;
      };
    };
    if (data.status !== "OK") return { kind: "bad-status", status: data.status ?? "UNKNOWN" };
    const r = data.result ?? {};
    return {
      kind: "ok",
      details: {
        name:           r.name              ?? null,
        address:        r.formatted_address ?? null,
        phone:          r.formatted_phone_number ?? null,
        website:        r.website            ?? null,
        rating:         typeof r.rating === "number" ? r.rating : null,
        reviewCount:    typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
        lat:            r.geometry?.location?.lat ?? null,
        lng:            r.geometry?.location?.lng ?? null,
        photoReference: r.photos?.[0]?.photo_reference ?? null,
      },
    };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

function buildQuery(row: VendorRow): string | null {
  const name = row.name?.toString().trim();
  const city = row.city?.toString().trim();
  if (!name || !city) return null;
  const category = (row.category ?? "").toString().trim().replace(/_/g, " ");
  const parts = [name, "wedding", category, city, "Ontario", "Canada"].filter(Boolean);
  return parts.join(" ");
}

type FileStats = {
  enriched: number;
  skippedHasPid: number;
  skippedNotWw: number;
  noResults: number;
  badStatus: number;
  errored: number;
};

function newStats(): FileStats {
  return {
    enriched: 0,
    skippedHasPid: 0,
    skippedNotWw: 0,
    noResults: 0,
    badStatus: 0,
    errored: 0,
  };
}

async function main() {
  const { dir, limit, dryRun } = parseArgs();
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.error("GOOGLE_PLACES_API_KEY is not set in .env / .env.local");
    process.exit(1);
  }

  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch (err) {
    console.error(`Cannot read directory ${dir}:`, err);
    process.exit(1);
  }

  /* First pass: count candidates without making any API calls */
  let candidateTotal = 0;
  for (const f of files) {
    if (f === "unknown.json") continue;
    const path = join(dir, f);
    try {
      const rows = JSON.parse(await readFile(path, "utf8")) as VendorRow[];
      for (const r of rows) {
        if (
          r &&
          (r.source ?? "").toString().toLowerCase() === "weddingwire" &&
          !r.place_id &&
          r.name && r.city
        ) {
          candidateTotal++;
        }
      }
    } catch { /* file parse error logged below in the main pass */ }
  }
  const willProcess = limit != null ? Math.min(limit, candidateTotal) : candidateTotal;
  console.log(
    `Found ${candidateTotal} WeddingWire candidate(s) across ${files.length} file(s).` +
      `${limit != null ? ` Limit: ${limit}.` : ""}` +
      `${dryRun ? " · DRY RUN" : ""}`,
  );
  console.log(`Estimated cost: ~$${(willProcess * COST_PER_ROW_USD).toFixed(2)} (${willProcess} × $${COST_PER_ROW_USD.toFixed(3)})`);
  if (willProcess === 0) {
    console.log("Nothing to do.");
    return;
  }

  const perCategory: Record<string, FileStats> = {};
  const grandTotal = newStats();
  let processed = 0;

  for (const filename of files) {
    if (filename === "unknown.json") continue;
    const path = join(dir, filename);
    let rows: VendorRow[];
    try {
      const text = await readFile(path, "utf8");
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        console.error(`  ${filename}: not an array, skipping`);
        continue;
      }
      rows = parsed as VendorRow[];
    } catch (err) {
      console.error(`  ${filename}: parse failed —`, err);
      continue;
    }

    let touched = false;
    for (let i = 0; i < rows.length; i++) {
      if (limit != null && processed >= limit) break;
      const row = rows[i];
      const category = (row.category ?? filename.replace(/\.json$/, "")).toString();
      if (!perCategory[category]) perCategory[category] = newStats();
      const cat = perCategory[category];

      const isWw = (row.source ?? "").toString().toLowerCase() === "weddingwire";
      if (!isWw) {
        cat.skippedNotWw++; grandTotal.skippedNotWw++;
        continue;
      }
      if (row.place_id) {
        cat.skippedHasPid++; grandTotal.skippedHasPid++;
        continue;
      }

      const query = buildQuery(row);
      if (!query) {
        cat.errored++; grandTotal.errored++;
        continue;
      }

      const search = await textSearch(query, key);
      if (search.kind !== "ok") {
        if (search.kind === "no-results") { cat.noResults++; grandTotal.noResults++; }
        else if (search.kind === "bad-status") { cat.badStatus++; grandTotal.badStatus++; console.error(`  ${row.name}: search status=${search.status}`); }
        else { cat.errored++; grandTotal.errored++; console.error(`  ${row.name}: search ${search.message}`); }
        processed++;
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
        continue;
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      const details = await placeDetails(search.result.placeId, key);
      if (details.kind !== "ok") {
        if (details.kind === "bad-status") { cat.badStatus++; grandTotal.badStatus++; console.error(`  ${row.name}: details status=${details.status}`); }
        else { cat.errored++; grandTotal.errored++; console.error(`  ${row.name}: details ${details.message}`); }
        processed++;
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
        continue;
      }

      const d = details.details;
      const canonicalName = d.name ?? search.result.canonicalName ?? row.name;

      /* Patch row in-place — snake_case to match the scraper's own shape
       * and what scripts/import-vendors.ts reads. */
      row.place_id     = search.result.placeId;
      row.name         = canonicalName;
      if (d.address)    row.address       = d.address;
      if (d.phone)      row.phone         = d.phone;
      if (d.website)    row.website       = d.website;
      if (d.rating       != null) row.google_rating = d.rating;
      if (d.reviewCount  != null) row.review_count  = d.reviewCount;
      if (d.lat          != null) row.lat           = d.lat;
      if (d.lng          != null) row.lng           = d.lng;
      if (d.photoReference)       row.hero_image    = d.photoReference;
      row.enriched_at = new Date().toISOString();

      touched = true;
      cat.enriched++; grandTotal.enriched++;
      processed++;
      console.log(
        `  ✓ ${row.name} (${row.city}) → ${search.result.placeId.slice(0, 12)}…` +
          ` rating=${d.rating ?? "—"} reviews=${d.reviewCount ?? "—"}` +
          ` website=${d.website ? "✓" : "—"} phone=${d.phone ? "✓" : "—"}`,
      );

      if (!dryRun) {
        /* Save the WHOLE file after every successful patch so an interrupt
         * preserves progress. JSON serialization is fast enough for daily
         * vendor counts that the I/O isn't a bottleneck. */
        try {
          await writeFile(path, JSON.stringify(rows, null, 2));
        } catch (err) {
          console.error(`  ✗ failed to persist ${filename}:`, err);
        }
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    if (touched && dryRun) {
      console.log(`  (dry run — ${filename} not written)`);
    }

    if (limit != null && processed >= limit) {
      console.log(`Reached --limit ${limit}, stopping.`);
      break;
    }
  }

  console.log("\n=== Per-category summary ===");
  console.log(
    `${"category".padEnd(20)} ${"enriched".padStart(9)} ${"no-result".padStart(10)} ` +
      `${"bad-stat".padStart(9)} ${"errored".padStart(8)} ${"hadPID".padStart(7)}`,
  );
  for (const [name, s] of Object.entries(perCategory).sort()) {
    if (s.enriched + s.noResults + s.badStatus + s.errored === 0) continue;
    console.log(
      `${name.padEnd(20)} ${String(s.enriched).padStart(9)} ${String(s.noResults).padStart(10)} ` +
        `${String(s.badStatus).padStart(9)} ${String(s.errored).padStart(8)} ${String(s.skippedHasPid).padStart(7)}`,
    );
  }

  console.log("\n=== Grand totals ===");
  console.log(`Enriched:            ${grandTotal.enriched}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`No Google results:   ${grandTotal.noResults}`);
  console.log(`Bad status:          ${grandTotal.badStatus}`);
  console.log(`Errored:             ${grandTotal.errored}`);
  console.log(`Skipped (had pid):   ${grandTotal.skippedHasPid}`);
  console.log(`Skipped (not ww):    ${grandTotal.skippedNotWw}`);
  console.log(`Actual cost:         ~$${(processed * COST_PER_ROW_USD).toFixed(2)}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
