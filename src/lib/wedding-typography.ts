/**
 * Five typography "feels" the couple chooses between. We never expose
 * raw font names — they pick a vibe and we map it to the right pair.
 *
 * fontDisplay / fontBody are CSS values that reference the
 * site-loaded next/font variables (registered in src/app/layout.tsx).
 *
 * displayStyle controls whether headings render italic in the
 * preview — and the same string is exposed to the AI generator so
 * Claude's copy hint can match the visual tone.
 */

export type TypographyStyle = {
  id:           string;   // stored on wedding_plans.wedding_typography_style
  label:        string;
  fontDisplay:  string;   // CSS font-family
  fontBody:     string;
  displayStyle: "italic" | "normal";
  displayWeight: number;
  /* Human-readable note shown to Claude in the AI prompt. */
  promptHint:   string;
};

export const TYPOGRAPHY_STYLES: TypographyStyle[] = [
  {
    id:           "romantic-serif",
    label:        "Romantic & Serif",
    fontDisplay:  "var(--font-display), 'Cormorant Garamond', Georgia, serif",
    fontBody:     "var(--font-body), 'Inter', system-ui, sans-serif",
    displayStyle: "italic",
    displayWeight: 500,
    promptHint:   "Warm, soft, italic Cormorant Garamond for headings; Inter for body. Tone: romantic, lyrical, intimate.",
  },
  {
    id:           "clean-modern",
    label:        "Clean & Modern",
    fontDisplay:  "var(--font-body), 'Inter', system-ui, sans-serif",
    fontBody:     "var(--font-body), 'Inter', system-ui, sans-serif",
    displayStyle: "normal",
    displayWeight: 700,
    promptHint:   "Bold Inter for headings, light Inter for body. Tone: confident, contemporary, minimal.",
  },
  {
    id:           "bold-editorial",
    label:        "Bold & Editorial",
    fontDisplay:  "var(--font-playfair), 'Playfair Display', Georgia, serif",
    fontBody:     "var(--font-body), 'Inter', system-ui, sans-serif",
    displayStyle: "normal",
    displayWeight: 700,
    promptHint:   "Bold Playfair Display for headings paired with Lato-style body (Inter fallback). Tone: editorial, magazine-feature, statement.",
  },
  {
    id:           "whimsical",
    label:        "Whimsical",
    fontDisplay:  "var(--font-fraunces), 'Fraunces', Georgia, serif",
    fontBody:     "var(--font-nunito), 'Nunito', system-ui, sans-serif",
    displayStyle: "italic",
    displayWeight: 600,
    promptHint:   "Expressive Fraunces italic for headings with friendly Nunito body. Tone: playful, joyful, garden-party-light.",
  },
  {
    id:           "minimalist",
    label:        "Minimalist",
    fontDisplay:  "var(--font-display), 'Cormorant Garamond', Georgia, serif",
    fontBody:     "var(--font-body), 'Inter', system-ui, sans-serif",
    displayStyle: "normal",
    displayWeight: 600,
    promptHint:   "Cormorant Garamond upright for headings (DM Serif Display fallback) with Inter body. Tone: refined, restrained, luxury minimal.",
  },
];

export const TYPOGRAPHY_BY_ID: Record<string, TypographyStyle> = Object.fromEntries(
  TYPOGRAPHY_STYLES.map((t) => [t.id, t]),
);

/* Map a layout theme → default typography. Used when the couple
 * hasn't explicitly chosen one. */
export function defaultTypographyForTheme(theme: string | null | undefined): string {
  switch (theme) {
    case "romantic":
    case "boho":
    case "garden":
    case "rustic":     return "romantic-serif";
    case "modern":
    case "coastal":    return "clean-modern";
    case "classic":    return "bold-editorial";
    case "luxe":
    case "frosted":
    case "terracotta": return "minimalist";
    default:           return "romantic-serif";
  }
}
