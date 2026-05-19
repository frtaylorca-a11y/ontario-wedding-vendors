/**
 * Per-vendor-category colour identity. One signature colour per category, used
 * consistently across:
 *   - Category page hero band (background, white H1, ghost-text overlay)
 *   - Filter pill active state
 *   - VendorCard accent bar + category pill + "View" CTA
 *   - /vendors index card icons + hover state
 *
 * Components consume these via inline CSS variables on a parent element, then
 * apply via Tailwind arbitrary-value classes like `bg-[var(--cat-primary)]`.
 * That lets us drive ALL the per-category styling from one prop without
 * generating 12× class permutations in the Tailwind JIT.
 */
export type CategoryColour = {
  /** Primary signature colour — used for hero, accent bar, hover border, CTA text */
  primary: string;
  /** Light tint of the primary — category pill bg, icon background, page filter strip */
  bg: string;
  /** Same as primary in most cases; kept as a field so future text-vs-accent splits stay clean */
  text: string;
  /** Pre-computed "R, G, B" tuple for use in `rgba(var(--cat-rgb), 0.12)` shadow strings */
  rgb: string;
};

function hexToRgbTuple(hex: string): string {
  const h = hex.replace(/^#/, "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function entry(primary: string, bg: string): CategoryColour {
  return { primary, bg, text: primary, rgb: hexToRgbTuple(primary) };
}

const COLOURS: Record<string, CategoryColour> = {
  photographer:    entry("#B96476", "#F7EEF1"), // rose
  videographer:    entry("#993556", "#FBEAF0"), // pink
  dj:              entry("#3B4A9E", "#E8ECF7"), // navy
  florist:         entry("#4A7C59", "#EBF3EE"), // green
  officiant:       entry("#0F6E56", "#E1F5EE"), // teal
  hair_makeup:     entry("#534AB7", "#EEEDFE"), // purple
  catering:        entry("#854F0B", "#FAEEDA"), // amber
  wedding_planner: entry("#444441", "#F1EFE8"), // slate
  cake:            entry("#993C1D", "#FAECE7"), // coral
  limo:            entry("#2C2C2C", "#F1EFE8"), // charcoal
  photo_booth:     entry("#B96476", "#F7EEF1"), // rose (same family as photographer)
  lighting_decor:  entry("#C9864E", "#F7F0E8"), // gold
};

const DEFAULT_COLOUR: CategoryColour = entry("#B96476", "#F7EEF1");

export function getCategoryColour(category: string): CategoryColour {
  return COLOURS[category] ?? DEFAULT_COLOUR;
}

/**
 * Returns the CSS variables to set on a parent element. Spread into a `style`
 * prop as `style={{ ...categoryColourVars("photographer") }}`. Components then
 * use `bg-[var(--cat-bg)]`, `border-[var(--cat-primary)]`, etc.
 */
export function categoryColourVars(category: string): Record<string, string> {
  const c = getCategoryColour(category);
  return {
    "--cat-primary": c.primary,
    "--cat-bg":      c.bg,
    "--cat-text":    c.text,
    "--cat-rgb":     c.rgb,
  };
}
