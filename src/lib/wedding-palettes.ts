/**
 * 23 wedding-specific colour palettes grouped into 6 categories.
 *
 * Each palette pins four hex colours: primary (accent / CTA), accent
 * (secondary highlight), bg (page background), and text (default
 * ink). When a couple picks a palette, the picker writes all four
 * values into wedding_plans.custom_color_* and flips
 * wedding_theme to "custom", routing the default layout through
 * these tokens instead of the canned theme palette.
 *
 * Display order = lock order. First 8 are free; the rest require
 * premium. Don't reorder without updating PaletteLockedAfterIndex.
 */

export type WeddingPalette = {
  id:      string;   // e.g. "romantic.blush-and-gold" — stored on the plan
  name:    string;
  primary: string;
  accent:  string;
  bg:      string;
  text:    string;
};

export type PaletteGroup = {
  id:        string;
  label:     string;
  palettes:  WeddingPalette[];
};

/* First 8 palettes are unlocked on the free tier — premium gate begins
 * at the 9th in display order. */
export const PALETTE_FREE_LIMIT = 8;

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    id:    "romantic",
    label: "Romantic",
    palettes: [
      { id: "romantic.blush-and-gold",    name: "Blush & Gold",     primary: "#B96476", accent: "#C9A96E", bg: "#FDF8F8", text: "#2C2C2A" },
      { id: "romantic.rose-and-ivory",    name: "Rose & Ivory",     primary: "#C4778A", accent: "#E8D5B7", bg: "#FFFAF9", text: "#2C2C2A" },
      { id: "romantic.lavender-garden",   name: "Lavender Garden",  primary: "#A78BFA", accent: "#C9A96E", bg: "#FAF5FF", text: "#3D2C6B" },
      { id: "romantic.coral-romance",     name: "Coral Romance",    primary: "#FB7185", accent: "#10B981", bg: "#FFFBEB", text: "#991B1B" },
      { id: "romantic.dreamy-pastels",    name: "Dreamy Pastels",   primary: "#FED7D7", accent: "#DDD6FE", bg: "#FFFBEB", text: "#78716C" },
      { id: "romantic.spring-blossom",    name: "Spring Blossom",   primary: "#FBCFE8", accent: "#BBF7D0", bg: "#FFFBEB", text: "#57534E" },
    ],
  },
  {
    id:    "rustic",
    label: "Rustic & Warm",
    palettes: [
      { id: "rustic.burgundy-and-cream", name: "Burgundy & Cream",  primary: "#6B1F2A", accent: "#C9A96E", bg: "#FDF8F0", text: "#2C1810" },
      { id: "rustic.terracotta-and-sand",name: "Terracotta & Sand", primary: "#C4632A", accent: "#EAB308", bg: "#FEF3C7", text: "#451A03" },
      { id: "rustic.autumn-harvest",     name: "Autumn Harvest",    primary: "#B45309", accent: "#EAB308", bg: "#FEF3C7", text: "#451A03" },
      { id: "rustic.rustic-barn",        name: "Rustic Barn",       primary: "#92400E", accent: "#F59E0B", bg: "#FEF3C7", text: "#44403C" },
    ],
  },
  {
    id:    "classic",
    label: "Classic & Formal",
    palettes: [
      { id: "classic.navy-and-gold",      name: "Navy & Gold",      primary: "#1F2937", accent: "#C9A96E", bg: "#FAF8F5", text: "#1F2937" },
      { id: "classic.black-and-white",    name: "Black & White",    primary: "#000000", accent: "#C9A96E", bg: "#FFFFFF", text: "#111827" },
      { id: "classic.champagne-and-ivory",name: "Champagne & Ivory",primary: "#C9A96E", accent: "#B96476", bg: "#FFFDF7", text: "#2C2C2A" },
      { id: "classic.silver-and-white",   name: "Silver & White",   primary: "#6B7280", accent: "#9CA3AF", bg: "#F9FAFB", text: "#111827" },
    ],
  },
  {
    id:    "garden",
    label: "Garden & Nature",
    palettes: [
      { id: "garden.sage-and-rose",       name: "Sage & Rose",      primary: "#4A7C59", accent: "#B96476", bg: "#F4F7F4", text: "#1A2E1A" },
      { id: "garden.forest-and-gold",     name: "Forest & Gold",    primary: "#3D4A2E", accent: "#C9A96E", bg: "#F4F7F4", text: "#1A2E1A" },
      { id: "garden.botanical-emerald",   name: "Botanical Emerald",primary: "#059669", accent: "#F472B6", bg: "#ECFDF5", text: "#064E3B" },
      { id: "garden.earth-and-stone",     name: "Earth & Stone",    primary: "#78716C", accent: "#15803D", bg: "#FAF8F7", text: "#292524" },
    ],
  },
  {
    id:    "luxury",
    label: "Luxury & Special",
    palettes: [
      { id: "luxury.champagne-dreams",    name: "Champagne Dreams", primary: "#D4AF37", accent: "#6B21A8", bg: "#FFFAF0", text: "#44403C" },
      { id: "luxury.black-and-gold",      name: "Black & Gold",     primary: "#000000", accent: "#EAB308", bg: "#FAFAFA", text: "#171717" },
      { id: "luxury.royal-purple",        name: "Royal Purple",     primary: "#6B21A8", accent: "#EAB308", bg: "#FAF5FF", text: "#581C87" },
    ],
  },
  {
    id:    "pastel",
    label: "Pastel & Soft",
    palettes: [
      { id: "pastel.dusty-blue-and-white",name: "Dusty Blue & White",primary: "#2B6CB0", accent: "#C9A96E", bg: "#F0F9FF", text: "#0C4A6E" },
      { id: "pastel.mauve-and-blush",     name: "Mauve & Blush",    primary: "#9D6B7A", accent: "#C9A96E", bg: "#FAF5F7", text: "#4A2030" },
    ],
  },
];

/* Flat, indexed by display order — used for the locked check. */
export const PALETTES_FLAT: WeddingPalette[] = PALETTE_GROUPS.flatMap((g) => g.palettes);

/* Look up a palette by id — used when applying a custom palette to
 * theme tokens during render. */
export const PALETTE_BY_ID: Record<string, WeddingPalette> = Object.fromEntries(
  PALETTES_FLAT.map((p) => [p.id, p]),
);

export function isPalettePremium(palette: WeddingPalette): boolean {
  return PALETTES_FLAT.indexOf(palette) >= PALETTE_FREE_LIMIT;
}
