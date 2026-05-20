/**
 * Wedding-website theme tokens.
 *
 * Each theme is a CSS-variable bundle injected into <main> on the wedding
 * page. Swapping `data-theme` on the root changes every visual token in
 * one go — no per-component theme prop drilling.
 *
 * Sonnet/Opus: only "Romantic" is fully tuned for launch. The other four
 * (Classic / Rustic / Modern / Garden) carry placeholder palettes derived
 * from Romantic — they will be retuned in a follow-up pass. Couples can
 * still preview them; the layout stays the same.
 */
import type { WeddingTheme } from "./wedding-website";

export type ThemeTokens = {
  /* Colours */
  pageBg:        string;
  surface:       string;
  surfaceAlt:    string;
  border:        string;
  ink:           string;   /* primary text */
  inkMuted:      string;   /* secondary text */
  accent:        string;   /* CTA + headings highlight */
  accentInk:     string;   /* text-on-accent */
  accentSoft:    string;   /* lighter wash of accent */

  /* Typography */
  fontDisplay:   string;
  fontBody:      string;
  displayItalic: string;   /* "italic" | "normal" — flips H1/H2 italic emphasis */

  /* Decorative */
  heroFloral:    "rose" | "vine" | "branch" | "none";
};

const ROMANTIC: ThemeTokens = {
  pageBg:        "#FDF5F7",   /* rose-pale */
  surface:       "#FFFFFF",
  surfaceAlt:    "#FAF0F2",
  border:        "#E8D5D9",
  ink:           "#2C2C2C",
  inkMuted:      "#6B6B6B",
  accent:        "#B96476",   /* dusty rose */
  accentInk:     "#FFFFFF",
  accentSoft:    "#F2DCE0",
  fontDisplay:   "Cormorant Garamond, Georgia, serif",
  fontBody:      "Inter, system-ui, sans-serif",
  displayItalic: "italic",
  heroFloral:    "rose",
};

const CLASSIC: ThemeTokens = {
  ...ROMANTIC,
  pageBg:        "#FFFFFF",
  surface:       "#FFFFFF",
  surfaceAlt:    "#F5F5F5",
  border:        "#222222",
  ink:           "#000000",
  inkMuted:      "#555555",
  accent:        "#000000",
  accentInk:     "#FFFFFF",
  accentSoft:    "#F0F0F0",
  displayItalic: "normal",
  heroFloral:    "none",
};

const RUSTIC: ThemeTokens = {
  ...ROMANTIC,
  pageBg:        "#F7F1E6",
  surface:       "#FFFCF5",
  surfaceAlt:    "#EFE6D3",
  border:        "#D4C3A0",
  ink:           "#3A2E1F",
  inkMuted:      "#6B5A42",
  accent:        "#8C7045",
  accentInk:     "#FFFCF5",
  accentSoft:    "#E5D9BD",
  heroFloral:    "branch",
};

const MODERN: ThemeTokens = {
  ...ROMANTIC,
  pageBg:        "#FAFAFA",
  surface:       "#FFFFFF",
  surfaceAlt:    "#F0F0F0",
  border:        "#E0E0E0",
  ink:           "#1A1A1A",
  inkMuted:      "#666666",
  accent:        "#2C2C2C",
  accentInk:     "#FFFFFF",
  accentSoft:    "#E8E8E8",
  fontDisplay:   "Inter, system-ui, sans-serif",
  fontBody:      "Inter, system-ui, sans-serif",
  displayItalic: "normal",
  heroFloral:    "none",
};

const GARDEN: ThemeTokens = {
  ...ROMANTIC,
  pageBg:        "#F4F1E8",
  surface:       "#FBF9F2",
  surfaceAlt:    "#E8E5D8",
  border:        "#C5C8AD",
  ink:           "#2F3A28",
  inkMuted:      "#5A6852",
  accent:        "#6B7F4F",
  accentInk:     "#FBF9F2",
  accentSoft:    "#D5DCC0",
  heroFloral:    "vine",
};

const THEME_TABLE: Record<WeddingTheme, ThemeTokens> = {
  classic:  CLASSIC,
  romantic: ROMANTIC,
  rustic:   RUSTIC,
  modern:   MODERN,
  garden:   GARDEN,
};

export function getThemeTokens(theme: WeddingTheme | string | null | undefined): ThemeTokens {
  if (theme && theme in THEME_TABLE) return THEME_TABLE[theme as WeddingTheme];
  return ROMANTIC;
}

/* Build the inline CSS-variable string for a <main style={...}>. */
export function themeStyle(theme: WeddingTheme | string | null | undefined): React.CSSProperties {
  const t = getThemeTokens(theme);
  return {
    /* Custom CSS variables — React allows arbitrary keys on style. */
    ["--wt-page-bg"        as string]: t.pageBg,
    ["--wt-surface"        as string]: t.surface,
    ["--wt-surface-alt"    as string]: t.surfaceAlt,
    ["--wt-border"         as string]: t.border,
    ["--wt-ink"            as string]: t.ink,
    ["--wt-ink-muted"      as string]: t.inkMuted,
    ["--wt-accent"         as string]: t.accent,
    ["--wt-accent-ink"     as string]: t.accentInk,
    ["--wt-accent-soft"    as string]: t.accentSoft,
    ["--wt-font-display"   as string]: t.fontDisplay,
    ["--wt-font-body"      as string]: t.fontBody,
    ["--wt-display-italic" as string]: t.displayItalic,
    backgroundColor: "var(--wt-page-bg)",
    color: "var(--wt-ink)",
    fontFamily: "var(--wt-font-body)",
  };
}
