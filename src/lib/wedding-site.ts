/**
 * Wedding-website routing helpers.
 *
 * Every plan rooted at a regional venue gets a subdomain on a region-
 * matched apex domain. Niagara venues land on niagaraweddingvenues.com;
 * Niagara-on-the-Lake venues get the dedicated niagaraonthelakeweddingvenues.com.
 *
 * The middleware (src/middleware.ts) rewrites incoming requests from
 *   {slug}.{regionalDomain}
 * to the internal /wedding/{slug} route.
 */

/** Ordered fallback map — first match wins. */
const NIAGARA_ON_THE_LAKE_CITIES = new Set([
  "niagara-on-the-lake",
  "niagara on the lake",
  "notl",
]);

export const REGIONAL_DOMAINS = {
  notl:     "niagaraonthelakeweddingvenues.com",
  niagara:  "niagaraweddingvenues.com",
  hamilton: "burlingtonweddingvenues.com",
  gta:      "torontoweddingdirectory.com",
} as const;

export type RegionalDomain = (typeof REGIONAL_DOMAINS)[keyof typeof REGIONAL_DOMAINS];

/** Set of every regional domain — used by middleware for subdomain detection. */
export const ALL_REGIONAL_DOMAINS: readonly string[] = Object.values(REGIONAL_DOMAINS);

function normalizeCity(city: string | null | undefined): string {
  return (city ?? "").toLowerCase().replace(/[_\s]+/g, "-");
}

/**
 * Pick the apex domain for a couple's wedding website based on the venue
 * they selected. Returns null when no regional match applies (the couple
 * still has a plan, just no auto-provisioned subdomain yet).
 */
export function regionalDomainForVenue(
  region: string | null | undefined,
  city:   string | null | undefined,
): RegionalDomain | null {
  const r = (region ?? "").toLowerCase().trim();
  const c = normalizeCity(city);

  /* NOTL takes precedence — checked before the generic Niagara match */
  if (r === "niagara" && NIAGARA_ON_THE_LAKE_CITIES.has(c)) {
    return REGIONAL_DOMAINS.notl;
  }
  if (r === "niagara") return REGIONAL_DOMAINS.niagara;
  if (r === "hamilton" || r === "golden-horseshoe") return REGIONAL_DOMAINS.hamilton;
  if (r === "gta") return REGIONAL_DOMAINS.gta;

  /* Other regions (cottage-country, eastern, waterloo-region, southwestern,
   * prince-edward-county) don't have a dedicated wedding-site domain yet. */
  return null;
}

/* ─── Slug generation ──────────────────────────────────────────────── */

const RESERVED_SLUGS = new Set([
  "www", "api", "admin", "app", "dashboard", "blog",
  "venues", "vendors", "plan", "checkout", "signup", "signin",
  "about", "contact", "help", "support", "static", "assets",
]);

const SLUG_MAX_LEN = 60;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") /* strip accents */
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Build the wedding-site subdomain slug.
 *
 *   buildWeddingSiteSlug("Alice", "Bob")       → "alice-and-bob"
 *   buildWeddingSiteSlug("",      "Bob")       → "bob"
 *   buildWeddingSiteSlug(null,    null, "abc") → "couple-abc12345"
 *
 * Pass `dedupeSuffix` (typically the first 8 chars of session_id) when the
 * preferred slug collides with another row — appended with a single dash.
 */
export function buildWeddingSiteSlug(
  brideName: string | null | undefined,
  groomName: string | null | undefined,
  fallbackSeed?: string,
): string {
  const a = slugify(brideName ?? "");
  const b = slugify(groomName ?? "");

  let base: string;
  if (a && b)  base = `${a}-and-${b}`;
  else if (a)  base = a;
  else if (b)  base = b;
  else         base = `couple-${slugify(fallbackSeed ?? "").slice(0, 8) || Math.random().toString(36).slice(2, 10)}`;

  /* Truncate + ensure non-reserved */
  let result = base.slice(0, SLUG_MAX_LEN).replace(/-+$/, "");
  if (RESERVED_SLUGS.has(result)) result = `${result}-1`;
  return result;
}

/**
 * Full URL helper — combines slug + regional domain into the canonical
 * wedding-website address.
 */
export function weddingSiteUrl(
  slug: string | null | undefined,
  regionalDomain: string | null | undefined,
): string | null {
  if (!slug || !regionalDomain) return null;
  return `https://${slug}.${regionalDomain}`;
}
