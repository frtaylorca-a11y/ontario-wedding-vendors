import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL slug from a venue/vendor name and city.
 *   generateSlug("White Oaks Resort & Spa", "Niagara-on-the-Lake")
 *   → "white-oaks-resort-spa-niagara-on-the-lake"
 *
 * Doubled-city guard:
 *   When the business name ALREADY contains the city ("Kurtz Orchards
 *   Weddings Niagara on the Lake"), naive concatenation produces
 *   "...niagara-on-the-lake-niagara-on-the-lake". Detect that — when
 *   the name-slug ends with the city-slug as a complete hyphen-aligned
 *   tail, strip those tokens from the name before appending the city.
 */
export function generateSlug(name: string, city: string): string {
  const nameSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const citySlug = (city ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (!citySlug) return nameSlug;

  /* Tail-match on hyphen-aligned tokens. citySlug "niagara-on-the-lake"
   * splits to ["niagara","on","the","lake"] (4 tokens). If the last 4
   * tokens of nameSlug equal that exactly, drop them — appending the
   * citySlug below restores the suffix without duplication. We use
   * token equality (not String.endsWith) so "fort-erie-mens-niagara"
   * doesn't accidentally match the "niagara" tail of "niagara-falls". */
  const nameTokens = nameSlug.split("-");
  const cityTokens = citySlug.split("-");
  let trimmedName = nameSlug;
  if (
    nameTokens.length >= cityTokens.length &&
    nameTokens.slice(-cityTokens.length).join("-") === citySlug
  ) {
    trimmedName = nameTokens.slice(0, -cityTokens.length).join("-").replace(/-+$/, "");
  }

  return trimmedName ? `${trimmedName}-${citySlug}` : citySlug;
}

export function citySlug(city: string | null | undefined): string {
  if (!city) return "";
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatRating(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return n.toFixed(1);
}

export function formatCapacity(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null) return `${lo}–${hi} guests`;
  if (lo != null) return `${lo}+ guests`;
  return `Up to ${hi} guests`;
}

/**
 * Typical guest-count envelopes per venue type. Used to surface an estimated
 * range on venue cards where capacity_max IS NULL — couples see a sensible
 * ballpark and a "Contact to confirm" prompt instead of nothing.
 */
const CAPACITY_ESTIMATES: Record<string, { min: number; max: number }> = {
  winery:        { min: 50,  max: 200 },
  barn:          { min: 50,  max: 250 },
  estate:        { min: 50,  max: 300 },
  hotel:         { min: 100, max: 500 },
  golf_club:     { min: 100, max: 400 },
  conservation:  { min: 50,  max: 150 },
  intimate:      { min: 10,  max: 60  },
  outdoor:       { min: 50,  max: 500 },
  banquet_hall:  { min: 100, max: 500 },
};

const DEFAULT_CAPACITY_ESTIMATE = { min: 50, max: 300 };

/** Normalize "Golf Club" / "golf club" / "golf-club" to the underscore key. */
function normalizeVenueTypeKey(venueType: string | null | undefined): string | null {
  if (!venueType) return null;
  return venueType.toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Return the estimated capacity range for a venue type. Always returns a
 * range — callers should only show it when actual capacity is unknown.
 */
/**
 * Display label for a region slug — fixes title-case ("Gta" → "GTA"),
 * expands abbreviations (pec → Prince Edward County), and applies the
 * canonical multi-word names used in the planner ("hamilton" → "Hamilton
 * & Burlington"). Unknown slugs fall back to first-letter capitalization
 * with hyphens converted to spaces. Pass null/undefined → "Ontario".
 */
const REGION_DISPLAY: Record<string, string> = {
  gta:                "GTA",
  niagara:            "Niagara",
  hamilton:           "Hamilton & Burlington",
  "golden-horseshoe": "Hamilton & Burlington",
  muskoka:            "Muskoka & Cottage Country",
  "cottage-country":  "Muskoka & Cottage Country",
  waterloo:           "Waterloo Region",
  "waterloo-region":  "Waterloo Region",
  eastern:            "Eastern Ontario",
  ottawa:             "Ottawa",
  southwestern:       "Southwestern Ontario",
  pec:                "Prince Edward County",
  "prince-edward-county": "Prince Edward County",
};

export function normalizeRegionDisplay(region: string | null | undefined): string {
  if (!region) return "Ontario";
  const key = region.toLowerCase().trim();
  const mapped = REGION_DISPLAY[key];
  if (mapped) return mapped;
  /* Fallback: capitalize each hyphen-separated word */
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Resolve a vendor's hero image URL. Only hero_image_custom (R2 URL) is
 * served — the legacy Google Places Photo endpoint is disabled on this
 * project and returns 403 on every call, so we no longer build URLs
 * against vendor.heroImage. Vendors without a custom hero fall through
 * to null → caller renders the per-category placeholder.
 *
 * The photo pipeline (scripts/backfill-website-heros.ts) writes
 * hero_image_custom by scraping each vendor's own website and letting
 * Claude Vision pick the best hero out of the top 3 candidates. See
 * that script's header comment for how to rebuild coverage.
 *
 * The `opts.maxwidth` argument is retained for callsite compatibility
 * but is a no-op — R2 serves one URL per row.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function vendorHeroImageUrl(vendor: {
  heroImage?: string | null;
  heroImageCustom?: string | null;
}, _opts?: { maxwidth?: number }): string | null {
  return vendor.heroImageCustom ?? null;
}

/**
 * Resolve a venue's hero image URL. Only hero_image_custom (R2 URL) is
 * served — the legacy Google Places Photo endpoint is disabled on this
 * project and returns 403 on every call. Venues without a custom hero
 * fall through to null → caller renders the per-venue-type placeholder.
 *
 * Populate hero_image_custom by scraping the venue's own website; the
 * upgrade-venue-photos.ts stage-2 script covers this once R2 creds are
 * set and the Google-comparison branch is removed (see also the vendor
 * variant scripts/backfill-website-heros.ts for a Google-free version).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function venueHeroImageUrl(venue: {
  heroImage?: string | null;
  heroImageCustom?: string | null;
}, _opts?: { maxwidth?: number }): string | null {
  return venue.heroImageCustom ?? null;
}

export function getEstimatedCapacity(
  venueType: string | null | undefined,
): { min: number; max: number; label: string } {
  const key = normalizeVenueTypeKey(venueType);
  const range = (key && CAPACITY_ESTIMATES[key]) || DEFAULT_CAPACITY_ESTIMATE;
  return { ...range, label: `Typically ${range.min}–${range.max} guests · Contact to confirm` };
}

export type ScoreTier = "premier" | "active" | "listed" | "hidden";

export function scoreTier(score: number | null | undefined): ScoreTier {
  if (score == null) return "hidden";
  if (score >= 90) return "premier";
  if (score >= 70) return "active";
  if (score >= 50) return "listed";
  return "hidden";
}

export const SCORE_TIER_LABEL: Record<ScoreTier, string> = {
  premier: "Premier",
  active: "Active",
  listed: "Listed",
  hidden: "Hidden",
};
