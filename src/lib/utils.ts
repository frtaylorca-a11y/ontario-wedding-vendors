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
