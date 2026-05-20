/**
 * Types + helpers for the couple's wedding website
 * (rendered at {slug}.{regional-domain} → /weddings/[slug] internally).
 *
 * Everything stored as jsonb in wedding_plans:
 *   wedding_page_config       → WeddingPageConfig
 *   wedding_party             → WeddingPartyMember[]
 *   wedding_registry          → RegistryLink[]
 *   wedding_generated_copy    → GeneratedCopy
 *   things_to_do              → ThingsToDoItem[]
 *   multiple_events           → MultipleEvent[]
 *   photo_gallery_urls        → string[]
 */

/* ── Theme ────────────────────────────────────────────────────────── */

export type WeddingTheme =
  | "romantic"
  | "classic"
  | "rustic"
  | "modern"
  | "garden"
  | "coastal"
  | "boho"
  | "luxe"
  | "terracotta"
  | "frosted";

export const WEDDING_THEMES: { id: WeddingTheme; label: string; description: string; isLayoutVariant?: boolean }[] = [
  { id: "romantic",   label: "Romantic",      description: "Dusty rose + blush, Cormorant italic display." },
  { id: "classic",    label: "Classic",       description: "Navy + ivory, formal Cormorant and Inter." },
  { id: "rustic",     label: "Rustic",        description: "Burgundy + cream, Playfair Display with Lato." },
  { id: "modern",     label: "Modern",        description: "Pure black on white, bold Inter throughout." },
  { id: "garden",     label: "Garden",        description: "Sage green + mint, Cormorant with airy Nunito." },
  { id: "coastal",    label: "Coastal",       description: "Ocean blue + seafoam, Inter with friendly Nunito." },
  { id: "boho",       label: "Boho",          description: "Terracotta + warm sand, expressive Fraunces serif." },
  { id: "luxe",       label: "Luxe",          description: "Deep gold on charcoal — the dark theme." },
  /* — Distinct layout variants (own component, not just token swap) — */
  { id: "terracotta", label: "Terracotta",    description: "Full-bleed weekend invite, terracotta colour bands, editorial 'Love Story' panel.", isLayoutVariant: true },
  { id: "frosted",    label: "Frosted Glass", description: "Golden-hour photo hero with a frosted glass card + polaroid overlay.",               isLayoutVariant: true },
];

/* ── Per-section visibility config ────────────────────────────────── */

export type WeddingPageConfig = {
  /* Hero and Event Details are always rendered — kept here for symmetry */
  hero:           true;
  eventDetails:   true;
  ourStory:       boolean;
  rsvp:           boolean;
  travel:         boolean;
  weddingParty:   boolean;
  photoGallery:   boolean;
  dressCode:      boolean;
  thingsToDo:     boolean;
  registry:       boolean;
  faq:            boolean;
  vendorCredits:  boolean;
};

export const DEFAULT_PAGE_CONFIG: WeddingPageConfig = {
  hero:          true,
  eventDetails:  true,
  ourStory:      true,
  rsvp:          true,
  travel:        true,
  weddingParty:  false,
  photoGallery:  false,
  dressCode:     false,
  thingsToDo:    false,
  registry:      false,
  faq:           true,
  vendorCredits: true,
};

/* The 12 sections in display order — drives the editor toggle list. */
export const SECTION_ORDER: Array<{
  key:           keyof WeddingPageConfig;
  label:         string;
  alwaysOn?:     boolean;
  description:   string;
}> = [
  { key: "hero",          label: "Hero",                  alwaysOn: true, description: "Names + date + venue + RSVP CTA. Always visible." },
  { key: "ourStory",      label: "Our Story",             description: "How you met and the proposal — couple writes or AI generates." },
  { key: "eventDetails",  label: "Event Details",         alwaysOn: true, description: "Ceremony + reception times, venue address, multiple events." },
  { key: "rsvp",          label: "RSVP",                  description: "Big rose button linking to your OneQR RSVP portal." },
  { key: "travel",        label: "Travel & Accommodation",description: "Hotel block, parking, shuttle info." },
  { key: "weddingParty",  label: "Wedding Party",         description: "Bridesmaids, groomsmen, family — photos + roles." },
  { key: "photoGallery",  label: "Photo Gallery",         description: "Engagement photos and pre-wedding shots." },
  { key: "dressCode",     label: "Dress Code",            description: "Black Tie / Cocktail / etc. + optional inspiration image." },
  { key: "thingsToDo",    label: "Things to Do",          description: "Suggestions for out-of-town guests — auto-populated by region." },
  { key: "registry",      label: "Registry Links",        description: "Buttons linking to your registry on each platform." },
  { key: "faq",           label: "FAQ",                   description: "Common questions — Claude generates a starter set." },
  { key: "vendorCredits", label: "Vendor Credits",        description: "\"Our Venue & Vendors\" credit roll at the bottom." },
];

/* ── Section data shapes ──────────────────────────────────────────── */

export type WeddingPartyMember = {
  id:    string; /* stable UUID for React keys */
  name:  string;
  role:  string;  /* Maid of Honour / Best Man / Bridesmaid / Groomsman / Flower Girl / etc. */
  bio?:  string;
  photo?: string; /* future image upload — URL */
};

export type RegistryLink = {
  id:    string;
  label: string;     /* "Crate & Barrel", "Honeyfund", "The Bay" */
  url:   string;
};

export type ThingsToDoItem = {
  id:          string;
  name:        string;
  description: string;
  url?:        string;
};

export type MultipleEvent = {
  id:          string;
  name:        string; /* "Welcome dinner", "Rehearsal dinner", "Brunch" */
  date?:       string; /* ISO date */
  time?:       string; /* "6:30 PM" */
  location?:   string;
  audience:    "everyone" | "wedding-party" | "family-only";
  description?: string;
};

export type FaqItem = {
  id:       string;
  question: string;
  answer:   string;
};

export type GeneratedCopy = {
  heroTagline?:   string;
  ourStory?:      string;
  travelCopy?:    string;
  dressCopyHint?: string;
  thingsToDo?:    ThingsToDoItem[];
  faqItems?:      FaqItem[];
  generatedAt?:   string;
};

/* ── Dress-code style chips ──────────────────────────────────────── */

export const DRESS_CODE_STYLES = [
  "Black Tie",
  "Formal",
  "Cocktail",
  "Semi-Formal",
  "Smart Casual",
  "Casual",
] as const;
export type DressCodeStyle = (typeof DRESS_CODE_STYLES)[number];

/* ── Audience labels for MultipleEvent ──────────────────────────── */

export const EVENT_AUDIENCE_LABELS: Record<MultipleEvent["audience"], string> = {
  "everyone":       "All guests",
  "wedding-party":  "Wedding party only",
  "family-only":    "Family only",
};

/* ── Helpers ─────────────────────────────────────────────────────── */

export function mergePageConfig(stored: unknown): WeddingPageConfig {
  if (!stored || typeof stored !== "object") return { ...DEFAULT_PAGE_CONFIG };
  const s = stored as Record<string, unknown>;
  const out: WeddingPageConfig = { ...DEFAULT_PAGE_CONFIG };
  for (const key of Object.keys(DEFAULT_PAGE_CONFIG) as Array<keyof WeddingPageConfig>) {
    if (key === "hero" || key === "eventDetails") continue; /* always on */
    if (typeof s[key] === "boolean") (out as Record<string, unknown>)[key] = s[key];
  }
  return out;
}

export function newId(): string {
  /* Browser + edge both have crypto.randomUUID() in Next 15. */
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;
}
