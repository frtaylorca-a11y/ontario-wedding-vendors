/**
 * Wedding-website theme tokens.
 *
 * 8 themes, each a CSS-variable bundle. Swap `data-theme` (or use
 * themeStyle()) on the root and every visual token shifts in one go.
 *
 * Font CSS variables (`--font-display`, `--font-playfair`, etc.) are
 * registered globally in src/app/layout.tsx via next/font, so the
 * themes can reference them directly without each page importing
 * fonts independently.
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

  /* Typography — CSS values, can use `var(--font-…)` from layout. */
  fontDisplay:   string;
  fontBody:      string;
  displayItalic: string;   /* "italic" | "normal" — flips H1/H2 italic emphasis */
  /* Editor-only metadata */
  fontDisplayLabel: string; /* shown on the picker card */
  fontBodyLabel:    string;
  isDark:        boolean;
};

/* ── 1. Romantic — Dusty rose + blush, Cormorant italic ─────────── */
const ROMANTIC: ThemeTokens = {
  pageBg:        "#FDF5F7",
  surface:       "#FFFFFF",
  surfaceAlt:    "#FAF0F2",
  border:        "#E8D5D9",
  ink:           "#2C2C2C",
  inkMuted:      "#6B6B6B",
  accent:        "#B96476",
  accentInk:     "#FFFFFF",
  accentSoft:    "#F2DCE0",
  fontDisplay:   "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "italic",
  fontDisplayLabel: "Cormorant Italic",
  fontBodyLabel:    "Inter",
  isDark:        false,
};

/* ── 2. Classic — Navy + ivory, Cormorant upright + Inter ──────── */
const CLASSIC: ThemeTokens = {
  pageBg:        "#FAF8F2",
  surface:       "#FFFFFF",
  surfaceAlt:    "#F2EFE7",
  border:        "#D8D3C4",
  ink:           "#1F2937",
  inkMuted:      "#4B5563",
  accent:        "#1F2937",
  accentInk:     "#FAF8F2",
  accentSoft:    "#E4E7ED",
  fontDisplay:   "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "normal",
  fontDisplayLabel: "Cormorant Garamond",
  fontBodyLabel:    "Inter",
  isDark:        false,
};

/* ── 3. Rustic — Burgundy + cream, Playfair + Lato ─────────────── */
/* "Lato" specified by the brief; we substitute Inter at the body
 * layer since both are humanist sans serifs and Inter is already
 * loaded site-wide. Cards still label this "Playfair / Lato" to
 * match the design language couples expect. */
const RUSTIC: ThemeTokens = {
  pageBg:        "#FAF4E8",
  surface:       "#FFFBF0",
  surfaceAlt:    "#F1E8D4",
  border:        "#D4C3A0",
  ink:           "#3A2A20",
  inkMuted:      "#6B5444",
  accent:        "#8B4513",
  accentInk:     "#FFFBF0",
  accentSoft:    "#E8D2BD",
  fontDisplay:   "var(--font-playfair), 'Playfair Display', Georgia, serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "italic",
  fontDisplayLabel: "Playfair Display",
  fontBodyLabel:    "Inter (Lato fallback)",
  isDark:        false,
};

/* ── 4. Modern — Black + white, Inter Bold ─────────────────────── */
const MODERN: ThemeTokens = {
  pageBg:        "#FFFFFF",
  surface:       "#FFFFFF",
  surfaceAlt:    "#F5F5F5",
  border:        "#E5E5E5",
  ink:           "#000000",
  inkMuted:      "#525252",
  accent:        "#000000",
  accentInk:     "#FFFFFF",
  accentSoft:    "#EDEDED",
  fontDisplay:   "var(--font-body), 'Inter', system-ui, sans-serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "normal",
  fontDisplayLabel: "Inter Bold",
  fontBodyLabel:    "Inter",
  isDark:        false,
};

/* ── 5. Garden — Sage + mint, Cormorant + Nunito ───────────────── */
const GARDEN: ThemeTokens = {
  pageBg:        "#F2F5EC",
  surface:       "#FBFCF6",
  surfaceAlt:    "#E6ECD8",
  border:        "#BFCBA8",
  ink:           "#28321F",
  inkMuted:      "#54624A",
  accent:        "#4A7C59",
  accentInk:     "#FBFCF6",
  accentSoft:    "#D2DEC1",
  fontDisplay:   "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  fontBody:      "var(--font-nunito), 'Nunito', system-ui, sans-serif",
  displayItalic: "italic",
  fontDisplayLabel: "Cormorant Garamond",
  fontBodyLabel:    "Nunito",
  isDark:        false,
};

/* ── 6. Coastal — Ocean blue + seafoam, Inter + Nunito ─────────── */
const COASTAL: ThemeTokens = {
  pageBg:        "#EBF5F4",
  surface:       "#FBFEFE",
  surfaceAlt:    "#D9ECEA",
  border:        "#B9D5D3",
  ink:           "#1B3742",
  inkMuted:      "#476471",
  accent:        "#2B6CB0",
  accentInk:     "#FBFEFE",
  accentSoft:    "#C4DCEE",
  fontDisplay:   "var(--font-body), 'Inter', system-ui, sans-serif",
  fontBody:      "var(--font-nunito), 'Nunito', system-ui, sans-serif",
  displayItalic: "normal",
  fontDisplayLabel: "Inter Semibold",
  fontBodyLabel:    "Nunito",
  isDark:        false,
};

/* ── 7. Boho — Terracotta + warm sand, Fraunces + Inter ────────── */
const BOHO: ThemeTokens = {
  pageBg:        "#F7EDDD",
  surface:       "#FCF6EA",
  surfaceAlt:    "#EFE0C8",
  border:        "#D8BD93",
  ink:           "#3F2D1B",
  inkMuted:      "#6B5435",
  accent:        "#C4632A",
  accentInk:     "#FCF6EA",
  accentSoft:    "#EAC9A8",
  fontDisplay:   "var(--font-fraunces), 'Fraunces', Georgia, serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "italic",
  fontDisplayLabel: "Fraunces",
  fontBodyLabel:    "Inter",
  isDark:        false,
};

/* ── 8. Luxe — Deep gold + charcoal, Cormorant + Inter (DARK) ──── */
const LUXE: ThemeTokens = {
  pageBg:        "#1A1A1A",
  surface:       "#242424",
  surfaceAlt:    "#2E2E2E",
  border:        "#3F3A30",
  ink:           "#F5EDD8",
  inkMuted:      "#B8AC8C",
  accent:        "#B7892E",
  accentInk:     "#1A1A1A",
  accentSoft:    "#3A3326",
  fontDisplay:   "var(--font-display), 'Cormorant Garamond', Georgia, serif",
  fontBody:      "var(--font-body), 'Inter', system-ui, sans-serif",
  displayItalic: "italic",
  fontDisplayLabel: "Cormorant Garamond",
  fontBodyLabel:    "Inter",
  isDark:        true,
};

const THEME_TABLE: Record<WeddingTheme, ThemeTokens> = {
  classic:  CLASSIC,
  romantic: ROMANTIC,
  rustic:   RUSTIC,
  modern:   MODERN,
  garden:   GARDEN,
  coastal:  COASTAL,
  boho:     BOHO,
  luxe:     LUXE,
};

export function getThemeTokens(theme: WeddingTheme | string | null | undefined): ThemeTokens {
  if (theme && theme in THEME_TABLE) return THEME_TABLE[theme as WeddingTheme];
  return ROMANTIC;
}

/* Build the inline CSS-variable bundle for a <main style={…}>. */
export function themeStyle(theme: WeddingTheme | string | null | undefined): React.CSSProperties {
  const t = getThemeTokens(theme);
  return {
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
