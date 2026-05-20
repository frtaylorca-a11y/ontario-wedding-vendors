/**
 * Hardcoded Ontario wedding-vendor pricing — the canonical floor /
 * median / ceiling for each (category, region) used to drive:
 *
 *   - Budget calculator "Starting from $X" labels
 *   - Vendor card price hints when a vendor has no priceFrom of its own
 *   - The AI budget allocator's seed numbers
 *
 * Orthogonal to vendor_pricing_data in Postgres, which holds the live
 * scraped + published distribution per tier. This module is the
 * load-bearing fallback — it always returns a number even when the
 * scraper hasn't produced enough samples for a category yet.
 *
 * Data source: Ontario Wedding Vendors pricing research, May 2026.
 * Validated against vendor.ca, WeddingWire, WealthNorth, and direct
 * outreach to listed vendors in each category. Refresh quarterly.
 */

export type PricingPoint = {
  min:     number;   /* cleaned floor — strips suspiciously-low outliers */
  median:  number;
  max:     number;
  source?: string;   /* optional attribution when we know the exact number */
};

export type PricingRegion = "niagara" | "gta";

export type PricingByRegion = Record<PricingRegion, PricingPoint>;

/* The 12 wedding-vendor categories carried by the directory. Keys
 * match vendors.category values + the budget-calculator category
 * names so cross-lookup is direct. */
export type PricingCategory =
  | "photographer"
  | "videographer"
  | "dj"
  | "florist"
  | "officiant"
  | "hair_makeup"
  | "catering"
  | "wedding_planner"
  | "cake"
  | "limo"
  | "photo_booth"
  | "lighting_decor";

export const ONTARIO_PRICING: Record<PricingCategory, PricingByRegion> = {
  photographer: {
    niagara: { min: 1200, median: 1875, max: 7500 },
    gta:     { min: 1500, median: 3200, max: 7000 },
  },
  videographer: {
    niagara: { min: 1500, median: 3500, max: 4900 },
    gta:     { min: 1800, median: 2500, max: 9000 },
  },
  dj: {
    niagara: { min: 1200, median: 1750, max: 3500 },
    gta:     { min: 1200, median: 1599, max: 3800 },
  },
  florist: {
    niagara: { min: 2000, median: 3500, max: 8000 },
    gta:     { min: 1500, median: 3000, max: 8000 },
  },
  officiant: {
    niagara: { min:  150, median:  350, max: 1400 },
    gta:     { min:  200, median:  399, max: 1200 },
  },
  hair_makeup: {
    niagara: { min:  250, median:  450, max:  750 },
    gta:     { min:  300, median:  500, max: 1200 },
  },
  /* Per-person estimate — multiply by guest_count for total. */
  catering: {
    niagara: { min:   85, median:  125, max:  200 },
    gta:     { min:   95, median:  140, max:  250 },
  },
  wedding_planner: {
    niagara: { min: 1500, median: 3000, max:  8000 },
    gta:     { min: 2500, median: 6000, max: 15800 },
  },
  cake: {
    niagara: { min:  400, median:  750, max: 2500 },
    gta:     { min:  500, median:  900, max: 3000 },
  },
  limo: {
    niagara: { min:  600, median: 1200, max: 3000 },
    gta:     { min:  800, median: 1500, max: 3995 },
  },
  photo_booth: {
    /* Niagara point is sourced directly from Pic Booth's own rate
     * sheet — we operate the brand, no scraper involved. Update here
     * when the studio adjusts pricing. */
    niagara: { min:  895, median: 1295, max: 2495, source: "Pic Booth" },
    gta:     { min:  800, median: 1200, max: 2500 },
  },
  lighting_decor: {
    niagara: { min:  800, median: 1500, max: 4000 },
    gta:     { min: 1000, median: 2000, max: 6000 },
  },
};

/* ─── Lookup helpers ─────────────────────────────────────────────── */

/* Map any incoming region slug → the two we have pricing for.
 * niagara stays niagara; everything else collapses to gta as the
 * closest urban-Ontario proxy. Tune this as we collect more data. */
export function pricingRegion(region: string | null | undefined): PricingRegion {
  return (region ?? "").toLowerCase() === "niagara" ? "niagara" : "gta";
}

export function getPricing(
  category: PricingCategory | string,
  region:   string | null | undefined,
): PricingPoint | null {
  const cat = category as PricingCategory;
  if (!(cat in ONTARIO_PRICING)) return null;
  return ONTARIO_PRICING[cat][pricingRegion(region)];
}

/* "Starting from $1,200" — friendly label for vendor cards + the
 * budget calculator. Returns null when the category is unknown. */
export function startingFromLabel(
  category: PricingCategory | string,
  region:   string | null | undefined,
): string | null {
  const p = getPricing(category, region);
  if (!p) return null;
  return `Starting from $${p.min.toLocaleString("en-CA")}`;
}

/* Median value for a (category, region) pair — drives the AI
 * budget allocator's seed numbers and the calculator's centre point. */
export function medianFor(
  category: PricingCategory | string,
  region:   string | null | undefined,
): number | null {
  const p = getPricing(category, region);
  return p?.median ?? null;
}
