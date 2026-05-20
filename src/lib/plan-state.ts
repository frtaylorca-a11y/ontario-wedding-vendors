/**
 * Planner state shape + Ontario budget allocations (per-category percentages
 * from CLAUDE.md). All percentages sum to 100%. Used by BudgetCalculator and
 * the future VendorSlots component to derive per-category budgets.
 */

export type VendorCategoryKey =
  | "venue_rental"
  | "catering_bar"
  | "photo_video"
  | "music_dj"
  | "flowers_decor"
  | "cake"
  | "hair_makeup"
  | "officiant"
  | "stationery"
  | "transportation"
  | "attire_bride"
  | "attire_groom"
  | "lighting_sound"
  | "photo_booth"
  | "wedding_rings"
  | "favors_gifts"
  | "accommodation"
  | "rentals"
  | "wedding_planner"
  | "miscellaneous";

export type BudgetCategory = {
  key: VendorCategoryKey;
  label: string;
  pct: number;
  /** Vendor-directory category for the "Find vendors" link. Null = no vendor match (budget tracking only). */
  vendorCategory: string | null;
};

/**
 * Ontario research-backed pcts (RBC My Money Matters + WeddingWire Canada
 * Global Wedding Report + WealthNorth regional data) normalized to sum
 * to exactly 1.0 (raw research values summed to 1.09; each is divided by
 * 1.09 here so allocations sum cleanly without redistribution math).
 *
 * Keys preserved from the prior schema so existing user budgetCategoryStates
 * blobs remain valid (no migration needed).
 */
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: "venue_rental",     label: "Venue Rental",                pct: 0.2477, vendorCategory: null }, /* handled by Step 2 venue search */
  { key: "catering_bar",     label: "Catering & Bar",              pct: 0.2294, vendorCategory: "catering" },
  { key: "photo_video",      label: "Photography & Videography",   pct: 0.1009, vendorCategory: "photographer" },
  { key: "music_dj",         label: "Music / DJ",                  pct: 0.0459, vendorCategory: "dj" },
  { key: "flowers_decor",    label: "Flowers & Decorations",       pct: 0.0826, vendorCategory: "florist" },
  { key: "cake",             label: "Wedding Cake",                pct: 0.0183, vendorCategory: "cake" },
  { key: "hair_makeup",      label: "Hair & Makeup",               pct: 0.0275, vendorCategory: "hair_makeup" },
  { key: "officiant",        label: "Officiant",                   pct: 0.0092, vendorCategory: "officiant" },
  { key: "stationery",       label: "Invitations & Stationery",    pct: 0.0183, vendorCategory: null },
  { key: "transportation",   label: "Transportation",              pct: 0.0183, vendorCategory: "limo" },
  { key: "attire_bride",     label: "Wedding Attire (Bride)",      pct: 0.0367, vendorCategory: null },
  { key: "attire_groom",     label: "Wedding Attire (Groom)",      pct: 0.0183, vendorCategory: null },
  { key: "lighting_sound",   label: "Lighting & Sound",            pct: 0.0275, vendorCategory: "lighting_decor" },
  { key: "photo_booth",      label: "Photo Booth",                 pct: 0.0092, vendorCategory: "photo_booth" },
  { key: "wedding_rings",    label: "Wedding Rings",               pct: 0.0275, vendorCategory: null },
  { key: "favors_gifts",     label: "Favors & Gifts",              pct: 0.0183, vendorCategory: null },
  { key: "accommodation",    label: "Accommodation",               pct: 0.0183, vendorCategory: null },
  { key: "rentals",          label: "Rentals (Tents/Chairs/Tables)", pct: 0.0092, vendorCategory: null },
  { key: "wedding_planner",  label: "Wedding Planner",             pct: 0.0092, vendorCategory: "wedding_planner" },
  { key: "miscellaneous",    label: "Miscellaneous",               pct: 0.0275, vendorCategory: null },
];

/** Region options for the calculator dropdown — fewer than REGIONS, matching the planner spec */
export const PLANNER_REGIONS = [
  { slug: "niagara",          label: "Niagara" },
  { slug: "gta",              label: "Greater Toronto" },
  { slug: "golden-horseshoe", label: "Hamilton & Burlington" },
  { slug: "cottage-country",  label: "Muskoka & Cottage Country" },
  { slug: "other",            label: "Other Ontario region" },
];

export type BookedVendor = {
  /** Vendor ID from vendors table, or null when the vendor is user-suggested only */
  vendorId: number | null;
  /** user_suggested_vendors.id if the booking came from a user submission */
  suggestedId: number | null;
  name: string;
  category: string;
  city: string | null;
  rating: number | null;
  /** Source of truth flag for the amber "Unverified — added by you" badge */
  isUserSuggested: boolean;
  isPicBooth: boolean;
  bookedAt: string;
};

/**
 * Per-vendor-category budget percentages — derived from BUDGET_CATEGORIES.
 * Photography & Videography (9%) splits 6%/3% photographer/videographer.
 * Sum across all 12 = 59%; remainder (41%) covers venue + non-vendor categories.
 */
export const VENDOR_CATEGORY_BUDGET_PCT: Record<string, number | null> = {
  photographer:    0.06,
  videographer:    0.03,
  dj:              0.03,
  florist:         0.07,
  catering:        0.28,
  cake:            0.02,
  hair_makeup:     0.03,
  officiant:       0.01,
  limo:            0.02,
  lighting_decor:  0.02,
  photo_booth:     0.01,
  wedding_planner: 0.01,
};

/** Order in which the 12 vendor slots appear — high-budget first */
export const VENDOR_SLOT_ORDER: string[] = [
  "catering", "photographer", "florist", "videographer", "dj",
  "hair_makeup", "lighting_decor", "limo", "cake", "officiant",
  "photo_booth", "wedding_planner",
];

export function getVendorBudget(
  vendorCategory: string,
  totalBudget: number,
): number | null {
  const pct = VENDOR_CATEGORY_BUDGET_PCT[vendorCategory];
  if (pct == null) return null;
  return Math.round(totalBudget * pct);
}

/* ─── Stag & Doe ─────────────────────────────────────────────────────────
 * Ontario fundraiser party — couples sell tickets and host games to help
 * fund the wedding. Saved as a single JSONB blob on wedding_plans.stagAndDoe.
 */

export type StagAndDoeRevenue = {
  /** Auto-computed: ticketsSold × ticketPrice. Stored derived to keep persistence simple. */
  tickets: number;
  fiftyFifty: number;
  headsOrTails: number;
  loonieJar: number;
  prizeTable: number;
  bar: number;
  otherGames: number;
};

export type StagAndDoeExpenses = {
  venue: number;
  djMusic: number;
  prizes: number;
  decorations: number;
  printing: number;
  photoBooth: number;
  liquorLicence: number;
  food: number;
  other: number;
};

export type StagAndDoeGames = {
  headsOrTails: boolean;
  fiftyFiftyDraw: boolean;
  loonieJar: boolean;
  chineseAuction: boolean;
  triviaGame: boolean;
  photoBooth: boolean;
  cornHole: boolean;
  limboDance: boolean;
  auctionItems: boolean;
  signatureCocktail: boolean;
};

export type StagAndDoeTicketEntry = {
  id: string;
  name: string;
  tickets: number;
  paid: boolean;
};

export type StagAndDoeState = {
  eventName: string;
  eventDate: string | null;
  venueName: string;
  ticketPrice: number;
  ticketsAvailable: number;
  ticketsSold: number;
  goalAmount: number;
  revenue: StagAndDoeRevenue;
  expenses: StagAndDoeExpenses;
  games: StagAndDoeGames;
  ticketTracker: StagAndDoeTicketEntry[];
};

export const DEFAULT_STAG_AND_DOE: StagAndDoeState = {
  eventName: "",
  eventDate: null,
  venueName: "",
  ticketPrice: 20,
  ticketsAvailable: 200,
  ticketsSold: 0,
  goalAmount: 8000,
  revenue: { tickets: 0, fiftyFifty: 0, headsOrTails: 0, loonieJar: 0, prizeTable: 0, bar: 0, otherGames: 0 },
  expenses: { venue: 0, djMusic: 0, prizes: 0, decorations: 0, printing: 0, photoBooth: 0, liquorLicence: 0, food: 0, other: 0 },
  games: {
    headsOrTails: false, fiftyFiftyDraw: false, loonieJar: false, chineseAuction: false,
    triviaGame: false, photoBooth: false, cornHole: false, limboDance: false,
    auctionItems: false, signatureCocktail: false,
  },
  ticketTracker: [],
};

/**
 * Generate a default 14-event wedding day timeline anchored on the user's
 * ceremony time (HH:MM 24h). Offsets follow the conventional Ontario
 * timeline: prep at -4h, photographer at -2h, ceremony at 0, dinner at +3h,
 * last song at +8.5h.
 */
export function defaultItineraryFromCeremony(ceremonyTimeHHMM: string): ItineraryEntry[] {
  const [hStr, mStr] = ceremonyTimeHHMM.split(":");
  const hh = Number.parseInt(hStr, 10);
  const mm = Number.parseInt(mStr ?? "0", 10);
  if (!Number.isFinite(hh) || hh < 0 || hh > 23 || !Number.isFinite(mm) || mm < 0 || mm > 59) {
    return [];
  }
  const ceremonyMinutes = hh * 60 + mm;
  const fmt = (totalMin: number): string => {
    /* Normalize across midnight in both directions */
    const wrapped = ((totalMin % 1440) + 1440) % 1440;
    const h = Math.floor(wrapped / 60).toString().padStart(2, "0");
    const m = (wrapped % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const events: Array<{ offsetMin: number; title: string; vendorTag: string | null; guestVisible: boolean }> = [
    { offsetMin: -240, title: "Hair & makeup begins",       vendorTag: "hair_makeup",  guestVisible: false },
    { offsetMin: -120, title: "Photographer arrives",       vendorTag: "photographer", guestVisible: false },
    { offsetMin:  -60, title: "Getting-ready photos",       vendorTag: "photographer", guestVisible: false },
    { offsetMin:  -30, title: "Guests begin arriving",      vendorTag: null,           guestVisible: true  },
    { offsetMin:    0, title: "Ceremony begins",            vendorTag: "officiant",    guestVisible: true  },
    { offsetMin:   30, title: "Cocktail hour",              vendorTag: null,           guestVisible: true  },
    { offsetMin:  120, title: "Guests seated for dinner",   vendorTag: null,           guestVisible: true  },
    { offsetMin:  150, title: "Grand entrance",             vendorTag: "dj",           guestVisible: true  },
    { offsetMin:  165, title: "First dance",                vendorTag: "dj",           guestVisible: true  },
    { offsetMin:  180, title: "Dinner service",             vendorTag: "catering",     guestVisible: true  },
    { offsetMin:  270, title: "Speeches",                   vendorTag: null,           guestVisible: true  },
    { offsetMin:  300, title: "Cake cutting",               vendorTag: "cake",         guestVisible: true  },
    { offsetMin:  315, title: "Dancing begins",             vendorTag: "dj",           guestVisible: true  },
    { offsetMin:  510, title: "Last song of the night",     vendorTag: "dj",           guestVisible: true  },
  ];

  return events.map((e, i) => ({
    id:           `itin-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time:         fmt(ceremonyMinutes + e.offsetMin),
    title:        e.title,
    notes:        "",
    vendorTag:    e.vendorTag,
    guestVisible: e.guestVisible,
  }));
}

export function calculateStagTotals(state: StagAndDoeState): {
  ticketRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  progressPct: number;
} {
  const ticketRevenue = Math.max(0, state.ticketsSold) * Math.max(0, state.ticketPrice);
  const totalRevenue =
    ticketRevenue +
    state.revenue.fiftyFifty +
    state.revenue.headsOrTails +
    state.revenue.loonieJar +
    state.revenue.prizeTable +
    state.revenue.bar +
    state.revenue.otherGames;
  const totalExpenses =
    state.expenses.venue +
    state.expenses.djMusic +
    state.expenses.prizes +
    state.expenses.decorations +
    state.expenses.printing +
    state.expenses.photoBooth +
    state.expenses.liquorLicence +
    state.expenses.food +
    state.expenses.other;
  const netProfit = totalRevenue - totalExpenses;
  const progressPct =
    state.goalAmount > 0
      ? Math.min(100, Math.round((totalRevenue / state.goalAmount) * 100))
      : 0;
  return { ticketRevenue, totalRevenue, totalExpenses, netProfit, progressPct };
}

/* ─── Music selections (lightweight — OneQR DJ portal handles the full library) ── */

export type SongPick = { title: string; artist: string };

export type CeremonyVibe = "Classical" | "Acoustic" | "Religious" | "Modern" | "Custom";
export type ReceptionVibe = "Top 40" | "R&B" | "Country" | "Rock" | "Latin" | "Mixed" | "Custom";

export type MusicSelections = {
  firstDance:        SongPick;
  fatherDaughter:    SongPick;
  motherSon:         SongPick;
  grandEntrance:     SongPick;
  lastSong:          SongPick;
  ceremonyVibe:      CeremonyVibe | null;
  receptionVibe:     ReceptionVibe | null;
  doNotPlay:         string;
};

export const DEFAULT_MUSIC_SELECTIONS: MusicSelections = {
  firstDance:     { title: "", artist: "" },
  fatherDaughter: { title: "", artist: "" },
  motherSon:      { title: "", artist: "" },
  grandEntrance:  { title: "", artist: "" },
  lastSong:       { title: "", artist: "" },
  ceremonyVibe:   null,
  receptionVibe:  null,
  doNotPlay:      "",
};

/* ─── Guest list ─────────────────────────────────────────────────────── */

export type Rsvp = "invited" | "confirmed" | "declined" | "maybe";
export type Dietary = "none" | "vegetarian" | "vegan" | "gluten-free" | "halal" | "kosher" | "other";

export type GuestEntry = {
  id: string;               /* uuid */
  firstName: string;
  lastName: string;
  rsvp: Rsvp;
  dietary: Dietary;
  dietaryNote?: string;     /* free-text when dietary === "other" */
  tableNumber?: number | null;
  plusOne: boolean;
  plusOneName?: string;
  notes?: string;
};

/* ─── Itinerary ──────────────────────────────────────────────────────── */

export type ItineraryEntry = {
  id: string;
  /** ISO time-of-day "HH:MM" — relative to the wedding's local timezone */
  time: string;
  title: string;
  notes?: string;
  /** Vendor category for the "from booked vendors" link, e.g. "photographer" */
  vendorTag?: string | null;
  /** Shows on OneQR's guest-facing day timeline */
  guestVisible: boolean;
};

export type PlanState = {
  sessionId: string;
  totalBudget: number;
  guestCount: number;
  region: string;
  weddingDate: string | null; /* ISO date */
  venueId: number | null;
  venueSlug: string | null;
  venueName: string | null;
  venueCity: string | null;
  /** Captured at venue selection — drives venue-aware budget pricing in Step 1 */
  venueType: string | null;
  venueCapacityMax: number | null;
  venueCatering: string | null;
  bookedVendors: Record<string, BookedVendor>; /* keyed by vendor category */
  /** Saved (favourited) vendor slugs per category. Mode 1 of the vendor slot —
   *  before a date is set, couples just save vendors with direct-contact links. */
  savedVendors: Record<string, string[]>;
  /** Toggle + lock + order overrides for the 20-category budget allocation.
   *  Persists to localStorage immediately; DB sync via budget_category_states column. */
  budgetCategoryStates: BudgetCategoryStates;

  /** Lightweight music collection — full DJ portal lives on OneQR */
  musicSelections: MusicSelections | null;
  /** Per-guest entries — captured in /plan/guests */
  guestList: GuestEntry[];
  /** Day-of timeline — captured in /plan/itinerary */
  itinerary: ItineraryEntry[];

  /** OneQR activation state */
  oneqrSlug:        string | null;
  oneqrActivatedAt: string | null; /* ISO datetime */
  oneqrQrCodeUrl:   string | null;
  oneqrDjPortalUrl: string | null;
  oneqrAdminUrl:    string | null;
};

export const DEFAULT_PLAN: Omit<PlanState, "sessionId"> = {
  totalBudget: 35000,
  guestCount: 100,
  region: "niagara",
  weddingDate: null,
  venueId: null,
  venueSlug: null,
  venueName: null,
  venueCity: null,
  venueType: null,
  venueCapacityMax: null,
  venueCatering: null,
  bookedVendors: {},
  savedVendors: {},
  get budgetCategoryStates() {
    return defaultBudgetCategoryStates();
  },
  musicSelections:   null,
  guestList:         [],
  itinerary:         [],
  oneqrSlug:         null,
  oneqrActivatedAt:  null,
  oneqrQrCodeUrl:    null,
  oneqrDjPortalUrl:  null,
  oneqrAdminUrl:     null,
};

export function calculateBudget(
  totalBudget: number,
): { key: VendorCategoryKey; label: string; amount: number; pct: number }[] {
  return BUDGET_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    amount: Math.round(totalBudget * c.pct),
    pct: c.pct,
  }));
}

/* ─── Interactive budget personalization ─────────────────────────────────
 * Per-category state for the BudgetCalculator's toggle/lock/reorder UI.
 * Persists in PlanState.budgetCategoryStates → localStorage. */

export type BudgetCategoryToggle = {
  enabled: boolean;
  /** Locked dollar override; null = follow proportional allocation */
  lockedAmount: number | null;
  /** Current pct of total when enabled+unlocked. Defaults to the canonical
   *  research pct (BUDGET_CATEGORIES[k].pct). Modified by "Distribute evenly"
   *  to widen pcts and absorb the Unallocated pool into active categories.
   *  Preserved across enable/disable so the user's distribute choice survives
   *  moving categories to the drawer and back. */
  pct?: number;
};

export type BudgetCategoryStates = {
  order: VendorCategoryKey[];
  toggles: Record<VendorCategoryKey, BudgetCategoryToggle>;
};

/** Ontario research-backed floors per category — drives the amber "below minimum" warning */
export const MIN_FLOORS: Record<VendorCategoryKey, number> = {
  venue_rental:    3000,
  catering_bar:    4500,
  photo_video:     2000,
  music_dj:         800,
  flowers_decor:    800,
  cake:             400,
  hair_makeup:      500,
  officiant:        300,
  stationery:       200,
  transportation:   300,
  attire_bride:     800,
  attire_groom:     300,
  lighting_sound:   500,
  photo_booth:      800,
  wedding_rings:   1000,
  favors_gifts:     150,
  accommodation:    200,
  rentals:          200,
  wedding_planner:  500,
  miscellaneous:    200,
};

/** Regional cost-per-guest envelopes (RBC + WeddingWire Canada + WealthNorth) */
export type CostPerGuestEnvelope = { min: number; mid: number; max: number };

export const ONTARIO_COST_PER_GUEST: Record<string, CostPerGuestEnvelope> = {
  gta:               { min: 325, mid: 455, max: 650 },
  niagara:           { min: 225, mid: 310, max: 420 },
  hamilton:          { min: 225, mid: 310, max: 420 },
  "golden-horseshoe":{ min: 225, mid: 310, max: 420 }, /* alias for hamilton/burlington */
  ottawa:            { min: 200, mid: 285, max: 390 },
  eastern:           { min: 185, mid: 260, max: 350 },
  waterloo:          { min: 195, mid: 275, max: 375 },
  "waterloo-region": { min: 195, mid: 275, max: 375 },
  muskoka:           { min: 250, mid: 340, max: 480 },
  "cottage-country": { min: 250, mid: 340, max: 480 },
  default:           { min: 220, mid: 300, max: 410 },
};

export function getCostEnvelope(region: string | null | undefined): CostPerGuestEnvelope {
  if (!region) return ONTARIO_COST_PER_GUEST.default;
  return ONTARIO_COST_PER_GUEST[region.toLowerCase()] ?? ONTARIO_COST_PER_GUEST.default;
}

export type BudgetHealth = "comfortable" | "tight" | "very_tight";

export type BudgetHealthEstimate = {
  envelope: CostPerGuestEnvelope;
  minTotal: number;   /* envelope.min × guestCount */
  midTotal: number;
  maxTotal: number;
  status: BudgetHealth;
  /** Region label that matched, falls back to "Ontario" for the default envelope. */
  regionLabel: string;
};

/**
 * Compute a per-couple budget reality check from regional cost-per-guest data.
 * Returns dollar envelopes + health bucket (comfortable / tight / very_tight).
 */
export function getBudgetHealth(
  totalBudget: number,
  guestCount: number,
  region: string | null | undefined,
): BudgetHealthEstimate {
  const envelope = getCostEnvelope(region);
  const guests = Math.max(1, guestCount);
  const minTotal = envelope.min * guests;
  const midTotal = envelope.mid * guests;
  const maxTotal = envelope.max * guests;
  const status: BudgetHealth =
    totalBudget >= midTotal ? "comfortable" :
    totalBudget >= minTotal ? "tight" :
    "very_tight";

  /* Friendly label for the matched envelope */
  const regionLabel = (() => {
    if (!region) return "Ontario";
    const key = region.toLowerCase();
    switch (key) {
      case "gta":               return "GTA";
      case "niagara":           return "Niagara";
      case "hamilton":
      case "golden-horseshoe":  return "Hamilton & Burlington";
      case "ottawa":            return "Ottawa";
      case "eastern":           return "Eastern Ontario";
      case "waterloo":
      case "waterloo-region":   return "Waterloo Region";
      case "muskoka":
      case "cottage-country":   return "Muskoka & Cottage Country";
      default:                  return "Ontario";
    }
  })();

  return { envelope, minTotal, midTotal, maxTotal, status, regionLabel };
}

/** Top-8 essentials enabled by default — others appear in the drawer */
export const DEFAULT_ACTIVE_KEYS: VendorCategoryKey[] = [
  "venue_rental",
  "catering_bar",
  "photo_video",
  "music_dj",
  "flowers_decor",
  "hair_makeup",
  "officiant",
  "photo_booth",
];

/** Photo Booth is "featured" — cannot be fully removed, only moved to drawer */
export const PROTECTED_KEY: VendorCategoryKey = "photo_booth";

export function defaultBudgetCategoryStates(): BudgetCategoryStates {
  const activeSet = new Set<VendorCategoryKey>(DEFAULT_ACTIVE_KEYS);
  /* Order: top 8 first (in spec order), then everything else (drawer pool) */
  const order: VendorCategoryKey[] = [
    ...DEFAULT_ACTIVE_KEYS,
    ...BUDGET_CATEGORIES.map((c) => c.key).filter((k) => !activeSet.has(k)),
  ];
  return {
    order,
    toggles: Object.fromEntries(
      BUDGET_CATEGORIES.map((c) => [
        c.key,
        { enabled: activeSet.has(c.key), lockedAmount: null, pct: c.pct },
      ]),
    ) as Record<VendorCategoryKey, BudgetCategoryToggle>,
  };
}

/** Resolve a toggle's pct, falling back to the canonical research pct for
 *  rows persisted before the pct field was introduced. */
function togglePct(t: BudgetCategoryToggle | undefined, key: VendorCategoryKey): number {
  if (t?.pct != null) return t.pct;
  return BUDGET_CATEGORIES.find((c) => c.key === key)?.pct ?? 0;
}

/* ─── Venue-aware pricing ────────────────────────────────────────────────
 * Mid-range estimate is used to auto-lock venue_rental when a venue is
 * selected. The user can unlock at any time. */

export type VenuePricingRange = { low: number; high: number };

const VENUE_PRICING_MODEL: Record<string, Record<string, VenuePricingRange>> = {
  winery:   { niagara: { low: 6000, high: 18000 } },
  barn:     { niagara: { low: 3500, high: 10000 } },
  estate:   { niagara: { low: 5000, high: 16000 } },
  hotel:    {
    niagara: { low: 4000, high: 15000 },
    gta:     { low: 8000, high: 30000 },
  },
  outdoor:  { default: { low: 2000, high: 10000 } },
};

export type CateringType = "in-house" | "external";

export type CateringPricingRange = {
  low: number;        /* $ per guest, low end */
  high: number;       /* $ per guest, high end */
  type: CateringType;
};

export const CATERING_PER_GUEST: Record<CateringType, CateringPricingRange> = {
  "in-house": { low: 85, high: 185, type: "in-house" },
  "external": { low: 65, high: 150, type: "external" },
};

export const CATERING_TYPE_LABELS: Record<CateringType, string> = {
  "in-house": "in-house catering",
  "external": "external catering",
};

/** Normalize venue.catering free-text into one of our lookup keys.
 *  Returns null when the venue doesn't disclose a catering arrangement. */
export function normalizeCateringType(raw: string | null | undefined): CateringType | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("in-house") || s.includes("in house") || s.includes("inhouse")) return "in-house";
  if (s.includes("external") || s.includes("outside") || s.includes("off-site") || s.includes("offsite")) return "external";
  /* "Both available", "Yes", or anything affirmative — default to in-house as the most common Ontario case */
  if (s.includes("both") || s === "yes") return "in-house";
  return null;
}

export function cateringMidPerHead(range: CateringPricingRange): number {
  return Math.round((range.low + range.high) / 2);
}

/* ─── Venue catering bundle detection ──────────────────────────────────── */

export type VenueBundleType = "in-house" | "external" | "both" | null;

/**
 * Detect whether the venue's catering is bundled with the venue rental.
 * Drives the Step 1 row merge: "in-house" collapses venue_rental + catering_bar
 * into a single "Venue + Catering" line.
 */
export function getVenueBundleType(catering: string | null | undefined): VenueBundleType {
  if (!catering) return null;
  const s = catering.toLowerCase();
  if (s.includes("both")) return "both";
  if (s.includes("in-house") || s.includes("in house") || s.includes("inhouse")) return "in-house";
  if (s.includes("external") || s.includes("outside") || s.includes("off-site") || s.includes("offsite")) return "external";
  if (s === "yes") return "in-house";
  return null;
}

/* ─── Budget category → vendor slot mapping ───────────────────────────────
 * Step 3 slots derive from the active budget rows in Step 1. Categories
 * with an empty slot array (Wedding Rings, Accommodation, etc.) never get
 * a Step 3 slot even when active. The photo_video row spawns two slots
 * (photographer + videographer), split by VENDOR_CATEGORY_BUDGET_PCT. */
export const BUDGET_TO_VENDOR_SLOTS: Record<VendorCategoryKey, string[]> = {
  venue_rental:    [], /* venue is Step 2 */
  catering_bar:    ["catering"],
  photo_video:     ["photographer", "videographer"],
  music_dj:        ["dj"],
  flowers_decor:   ["florist"],
  cake:            ["cake"],
  hair_makeup:     ["hair_makeup"],
  officiant:       ["officiant"],
  stationery:      [],
  transportation:  ["limo"],
  attire_bride:    [],
  attire_groom:    [],
  lighting_sound:  ["lighting_decor"],
  photo_booth:     ["photo_booth"],
  wedding_rings:   [],
  favors_gifts:    [],
  accommodation:   [],
  rentals:         [],
  wedding_planner: ["wedding_planner"],
  miscellaneous:   [],
};

export type VendorSlot = {
  /** Vendor-directory category (matches /vendors/[category] route slug after `_`→`-`) */
  category: string;
  /** Dollar budget for this slot, derived from the parent budget row */
  budget: number;
  /** The parent budget category that drives this slot — drives the two-way sync */
  budgetCategoryKey: VendorCategoryKey;
};

/**
 * Order Step 3 slots to match Step 1's active rows.
 * For multi-slot budget rows (photo_video), splits the parent amount by
 * the VENDOR_CATEGORY_BUDGET_PCT proportions so photographer/videographer
 * each show a sensible per-slot budget.
 */
export function getActiveVendorSlots(rows: BudgetRow[]): VendorSlot[] {
  const slots: VendorSlot[] = [];
  for (const row of rows) {
    if (!row.enabled) continue;
    const vendorCats = BUDGET_TO_VENDOR_SLOTS[row.key];
    if (!vendorCats || vendorCats.length === 0) continue;

    if (vendorCats.length === 1) {
      slots.push({
        category:          vendorCats[0],
        budget:            row.amount,
        budgetCategoryKey: row.key,
      });
    } else {
      /* Split the parent row by the per-slot pct so a $3,000 photo_video
       * row becomes ~$2,000 photographer + ~$1,000 videographer. */
      const pcts = vendorCats.map((c) => VENDOR_CATEGORY_BUDGET_PCT[c] ?? 1);
      const total = pcts.reduce((a, b) => a + (b ?? 0), 0) || 1;
      vendorCats.forEach((c, i) => {
        slots.push({
          category:          c,
          budget:            Math.round(((pcts[i] ?? 0) / total) * row.amount),
          budgetCategoryKey: row.key,
        });
      });
    }
  }
  return slots;
}

/**
 * Which budget category keys currently have any booked vendor?
 * Used to render the "Booked" badge on Step 1's row when its
 * corresponding Step 3 slot has been filled.
 */
export function bookedBudgetCategories(
  bookedVendors: Record<string, BookedVendor>,
): Set<VendorCategoryKey> {
  const set = new Set<VendorCategoryKey>();
  for (const [bcKey, vendorCats] of Object.entries(BUDGET_TO_VENDOR_SLOTS) as [VendorCategoryKey, string[]][]) {
    if (vendorCats.some((vc) => bookedVendors[vc])) {
      set.add(bcKey);
    }
  }
  return set;
}

/** Look up a venue rental range — falls back to outdoor/default for unknown combinations */
export function getVenuePricingRange(
  venueType: string | null | undefined,
  region: string | null | undefined,
): VenuePricingRange | null {
  if (!venueType) return null;
  const key = venueType.toLowerCase();
  const model = VENUE_PRICING_MODEL[key];
  if (!model) return null;
  const r = (region ?? "").toLowerCase();
  return model[r] ?? model["default"] ?? Object.values(model)[0] ?? null;
}

export function venueMidRange(range: VenuePricingRange): number {
  return Math.round((range.low + range.high) / 2);
}

export type BudgetRow = {
  key: VendorCategoryKey;
  label: string;
  pct: number;            /* original Ontario % */
  amount: number;         /* computed dollar amount */
  enabled: boolean;
  locked: boolean;
  lockedAmount: number | null;
  belowFloor: boolean;    /* true when locked amount < floor for that category */
  minFloor: number;
};

/**
 * Allocate budget across the 20 categories using each toggle's stored pct.
 *   - Disabled categories: amount = 0 (their dollars flow to the Unallocated pool)
 *   - Enabled + locked:    amount = lockedAmount (immutable to slider movement)
 *   - Enabled + unlocked:  amount = togglePct × totalBudget
 * If locked + unlocked targets exceed totalBudget, unlocked categories are
 * proportionally scaled down so the sum fits — Unallocated becomes 0.
 * Otherwise, leftover = totalBudget − sum(enabled) is the Unallocated buffer.
 */
export function calculateBudgetWithState(
  totalBudget: number,
  states: BudgetCategoryStates,
): BudgetRow[] {
  return calculateBudgetWithUnallocated(totalBudget, states).rows;
}

export type BudgetCalculation = {
  rows: BudgetRow[];
  /** Dollars NOT assigned to any enabled category — the contingency buffer. */
  unallocated: number;
};

export function calculateBudgetWithUnallocated(
  totalBudget: number,
  states: BudgetCategoryStates,
): BudgetCalculation {
  const byKey = new Map(BUDGET_CATEGORIES.map((c) => [c.key, c]));

  /* Build rows in user-selected order (then append any missing for forward-compat). */
  const ordered = states.order
    .map((k) => byKey.get(k))
    .filter((c): c is BudgetCategory => c != null);
  for (const c of BUDGET_CATEGORIES) {
    if (!ordered.find((o) => o.key === c.key)) ordered.push(c);
  }

  const rows: BudgetRow[] = ordered.map((c) => {
    const t = states.toggles[c.key];
    const pct = togglePct(t, c.key);
    const enabled = t?.enabled ?? false;
    const lockedAmount = t?.lockedAmount ?? null;
    let amount = 0;
    if (enabled) {
      amount = lockedAmount != null ? lockedAmount : Math.round(pct * totalBudget);
    }
    return {
      key: c.key,
      label: c.label,
      pct,
      amount,
      enabled,
      locked: enabled && lockedAmount != null,
      lockedAmount,
      belowFloor: false, /* set below — based on the resolved amount */
      minFloor: MIN_FLOORS[c.key],
    };
  });

  /* Sum enabled amounts. If we're over budget (typically because of locks),
   * scale the unlocked rows down so the sum fits. Otherwise the leftover
   * becomes the Unallocated pool. */
  const sumEnabled = rows.reduce((s, r) => s + r.amount, 0);
  let unallocated = totalBudget - sumEnabled;

  if (unallocated < 0) {
    const unlocked = rows.filter((r) => r.enabled && !r.locked);
    const unlockedSum = unlocked.reduce((s, r) => s + r.amount, 0);
    const shortfall = -unallocated; /* positive */
    if (unlockedSum > 0) {
      const scale = Math.max(0, (unlockedSum - shortfall) / unlockedSum);
      for (const r of unlocked) r.amount = Math.round(r.amount * scale);
    }
    unallocated = 0;
  }

  /* Below-floor warning: only meaningful for rows actually receiving money.
   * Includes both locked rows below their MIN_FLOOR and unlocked rows that
   * landed below their floor after the (rare) scale-down. */
  for (const r of rows) {
    if (r.enabled && r.amount < r.minFloor) {
      r.belowFloor = true;
    }
  }

  return { rows, unallocated: Math.max(0, Math.round(unallocated)) };
}

/**
 * "Distribute evenly" — absorb the entire Unallocated pool into enabled +
 * unlocked categories, in proportion to each category's current pct. After
 * this runs, the new Unallocated is 0 and every active row's pct has grown.
 * Locked categories are untouched.
 */
export function distributeUnallocated(
  states: BudgetCategoryStates,
  totalBudget: number,
): BudgetCategoryStates {
  const { rows, unallocated } = calculateBudgetWithUnallocated(totalBudget, states);
  if (unallocated <= 0 || totalBudget <= 0) return states;

  const unlocked = rows.filter((r) => r.enabled && !r.locked);
  const pctSum = unlocked.reduce((s, r) => s + r.pct, 0);
  if (pctSum <= 0) return states;

  const nextToggles = { ...states.toggles };
  for (const r of unlocked) {
    const sharePct = (r.pct / pctSum) * (unallocated / totalBudget);
    const newPct = r.pct + sharePct;
    nextToggles[r.key] = {
      ...nextToggles[r.key],
      pct: newPct,
    };
  }
  return { ...states, toggles: nextToggles };
}
