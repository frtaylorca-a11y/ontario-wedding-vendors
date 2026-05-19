import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL slug from a venue/vendor name and city.
 *   generateSlug("White Oaks Resort & Spa", "Niagara-on-the-Lake")
 *   → "white-oaks-resort-spa-niagara-on-the-lake"
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

  return citySlug ? `${nameSlug}-${citySlug}` : nameSlug;
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
