/**
 * Category-page intro paragraph helpers.
 *
 * Each intro paragraph is generated from:
 *   - Live vendor count for the category (passed in by the page)
 *   - Live ontario-pricing.ts numbers (so updates flow automatically)
 *   - A category-specific "what couples typically book" paragraph
 *
 * Rendered as Markdown-free plain text so it reads cleanly in the
 * generated HTML without an MDX/markdown dependency.
 */
import { getPricing } from "./ontario-pricing";
import type { VendorCategory } from "@/types";

/* Friendly singular label used in mid-sentence prose. */
const SINGULAR: Record<VendorCategory, string> = {
  photographer:    "wedding photographer",
  videographer:    "wedding videographer",
  dj:              "wedding DJ",
  florist:         "wedding florist",
  photo_booth:     "wedding photo booth",
  catering:        "wedding caterer",
  cake:            "wedding cake designer",
  hair_makeup:     "wedding hair & makeup artist",
  officiant:       "wedding officiant",
  limo:            "wedding transportation provider",
  lighting_decor:  "wedding lighting & decor specialist",
  wedding_planner: "wedding planner",
};

/* The "what couples typically book" supplementary sentence. Kept here
 * (not in CMS) because it changes rarely and benefits from being
 * version-controlled with the rest of the page copy. */
const CATEGORY_CONTEXT: Record<VendorCategory, string> = {
  photographer:
    "Coverage typically runs 6–10 hours, includes engagement photography, and delivers 400–800 edited images. Most Ontario couples book a second shooter for weddings over 100 guests.",
  videographer:
    "Standard delivery is a 4–8 minute highlight reel plus a 15–30 minute feature with full ceremony and speeches. Same-day edits, drone footage, and raw-footage delivery are common add-ons.",
  dj:
    "A standard booking covers ceremony PA, cocktail hour music, and a 6-hour reception with MC duties. Uplighting and dance-floor lighting are the most common upgrades.",
  florist:
    "Most full-service packages cover bridal bouquet, attendant flowers, boutonnières, ceremony arch or florals, centrepieces, and reception accents. Niagara couples often save 20–30% by working with locally-grown blooms in season.",
  photo_booth:
    "Standard packages run 3–4 hours and include unlimited prints, digital copies, a prop selection, and an attendant. Open-air, enclosed, and luxury cabinet setups each suit different reception layouts.",
  catering:
    "Quotes are per-person and exclude HST + gratuity — add 30–35% to the headline number for the real total. Plated, family-style, food-station, and buffet formats each have different cost profiles.",
  cake:
    "Tasting consults happen 6–8 weeks before the wedding. 'Show cakes' (real top tiers + foam-base lower tiers paired with a dessert table) are an increasingly popular way to keep the cake-cutting moment without paying to serve every guest.",
  hair_makeup:
    "Most teams arrive 4–6 hours before the ceremony and travel to the bride's getting-ready location. A trial 4–8 weeks before the wedding is strongly recommended.",
  officiant:
    "Ontario requires all officiants to be authorized through ServiceOntario. Civil, religious, and humanist ceremonies are all available, with most officiants happy to co-author a personalised script.",
  limo:
    "Most operators require a 4–5 hour minimum. Vintage cars (Bentley, Rolls Royce, classic Cadillac) typically have a strict 3-hour window. Guest shuttles are strongly recommended for Niagara wine country and Muskoka venues.",
  lighting_decor:
    "Bistro string lights overhead carry the entire mood of a barn or tent reception. Uplighting along walls adds colour without competing with the room's architecture. Site walks happen 8–12 weeks before the wedding.",
  wedding_planner:
    "Three packages are standard across the industry: month-of coordination, partial planning, and full planning. Full-planning fees typically land 10–15% of the total wedding budget; month-of coordination is a flat fee.",
};

/* Build the intro paragraph that lands above the listing grid. The
 * count comes in live from the page query so it's always accurate
 * to the displayed grid. */
export function buildCategoryIntro({
  category,
  count,
  pluralLabel,
}: {
  category:    VendorCategory;
  count:       number;
  pluralLabel: string;
}): string {
  const singular = SINGULAR[category];
  const niagara = getPricing(category, "niagara");
  const gta     = getPricing(category, "gta");

  /* Lead sentence — the keyword-rich one Google sees first. */
  const lead = `Ontario has ${count.toLocaleString()} verified ${pluralLabel.toLowerCase()} serving couples across Niagara, the GTA, Hamilton, Burlington, Muskoka, and the rest of the province.`;

  /* Pricing sentence — pulls live numbers from ontario-pricing.ts. */
  let pricing = "";
  if (niagara && gta) {
    /* Per-guest categories phrase the range as $/guest. */
    const perGuest = category === "catering";
    const unit = perGuest ? "per guest" : "";
    pricing =
      `Pricing for a ${singular} in Ontario typically runs ` +
      `$${niagara.min.toLocaleString("en-CA")}–$${niagara.max.toLocaleString("en-CA")} in Niagara and ` +
      `$${gta.min.toLocaleString("en-CA")}–$${gta.max.toLocaleString("en-CA")} in the GTA${unit ? ` ${unit}` : ""}.`;
  }

  return `${lead} ${pricing} ${CATEGORY_CONTEXT[category]}`.trim();
}

/* Returns a "Last updated [Month YYYY]" stamp for the current month
 * — keeps the page reading as fresh content for Google without
 * manual edits. Server-rendered, no client hydration cost. */
export function lastUpdatedLabel(date: Date = new Date()): string {
  const month = date.toLocaleString("en-CA", { month: "long" });
  const year  = date.getFullYear();
  return `Last updated: ${month} ${year}`;
}
