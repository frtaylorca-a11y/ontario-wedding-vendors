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
 * 20 budget categories matching the Excel template. Sums to exactly 100%.
 * Vendor-mapped categories link to /vendors/[category]; others are budget-only.
 */
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: "venue_rental",     label: "Venue Rental",                pct: 0.25, vendorCategory: null }, /* handled by Step 2 venue search */
  { key: "catering_bar",     label: "Catering & Bar",              pct: 0.28, vendorCategory: "catering" },
  { key: "photo_video",      label: "Photography & Videography",   pct: 0.09, vendorCategory: "photographer" },
  { key: "music_dj",         label: "Music / DJ",                  pct: 0.03, vendorCategory: "dj" },
  { key: "flowers_decor",    label: "Flowers & Decorations",       pct: 0.07, vendorCategory: "florist" },
  { key: "cake",             label: "Wedding Cake",                pct: 0.02, vendorCategory: "cake" },
  { key: "hair_makeup",      label: "Hair & Makeup",               pct: 0.03, vendorCategory: "hair_makeup" },
  { key: "officiant",        label: "Officiant",                   pct: 0.01, vendorCategory: "officiant" },
  { key: "stationery",       label: "Invitations & Stationery",    pct: 0.02, vendorCategory: null },
  { key: "transportation",   label: "Transportation",              pct: 0.02, vendorCategory: "limo" },
  { key: "attire_bride",     label: "Wedding Attire (Bride)",      pct: 0.03, vendorCategory: null },
  { key: "attire_groom",     label: "Wedding Attire (Groom)",      pct: 0.01, vendorCategory: null },
  { key: "lighting_sound",   label: "Lighting & Sound",            pct: 0.02, vendorCategory: "lighting_decor" },
  { key: "photo_booth",      label: "Photo Booth",                 pct: 0.01, vendorCategory: "photo_booth" },
  { key: "wedding_rings",    label: "Wedding Rings",               pct: 0.03, vendorCategory: null },
  { key: "favors_gifts",     label: "Favors & Gifts",              pct: 0.02, vendorCategory: null },
  { key: "accommodation",    label: "Accommodation",               pct: 0.02, vendorCategory: null },
  { key: "rentals",          label: "Rentals (Tents/Chairs/Tables)", pct: 0.02, vendorCategory: null },
  { key: "wedding_planner",  label: "Wedding Planner",             pct: 0.01, vendorCategory: "wedding_planner" },
  { key: "miscellaneous",    label: "Miscellaneous",               pct: 0.01, vendorCategory: null },
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

export type PlanState = {
  sessionId: string;
  totalBudget: number;
  guestCount: number;
  region: string;
  weddingDate: string | null; /* ISO date */
  venueId: number | null;
  venueName: string | null;
  venueCity: string | null;
  /** Captured at venue selection — drives venue-aware budget pricing in Step 1 */
  venueType: string | null;
  venueCapacityMax: number | null;
  venueCatering: string | null;
  bookedVendors: Record<string, BookedVendor>; /* keyed by vendor category */
  /** Toggle + lock + order overrides for the 20-category budget allocation.
   *  Persists to localStorage immediately; DB sync via budget_category_states column. */
  budgetCategoryStates: BudgetCategoryStates;
};

export const DEFAULT_PLAN: Omit<PlanState, "sessionId"> = {
  totalBudget: 35000,
  guestCount: 100,
  region: "niagara",
  weddingDate: null,
  venueId: null,
  venueName: null,
  venueCity: null,
  venueType: null,
  venueCapacityMax: null,
  venueCatering: null,
  bookedVendors: {},
  get budgetCategoryStates() {
    return defaultBudgetCategoryStates();
  },
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
};

export type BudgetCategoryStates = {
  order: VendorCategoryKey[];
  toggles: Record<VendorCategoryKey, BudgetCategoryToggle>;
};

/** Typical Ontario floor per category — drives the amber "below minimum" warning */
export const MIN_FLOORS: Record<VendorCategoryKey, number> = {
  venue_rental:    3000,
  catering_bar:    3000,
  photo_video:     2000,
  music_dj:        1200,
  flowers_decor:   1500,
  cake:             400,
  hair_makeup:      600,
  officiant:        300,
  stationery:       200,
  transportation:   500,
  attire_bride:     500,
  attire_groom:     200,
  lighting_sound:   300,
  photo_booth:      800,
  wedding_rings:   1000,
  favors_gifts:     150,
  accommodation:    200,
  rentals:          200,
  wedding_planner: 1000,
  miscellaneous:    200,
};

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
        { enabled: activeSet.has(c.key), lockedAmount: null },
      ]),
    ) as Record<VendorCategoryKey, BudgetCategoryToggle>,
  };
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
 * Allocate budget across the 20 categories given user state.
 *   - Disabled categories: amount = 0
 *   - Enabled + locked:    amount = locked value (does not move with total)
 *   - Enabled + unlocked:  proportional share of (total - locked sum) by original pct
 * If locked sum exceeds total, unlocked enabled categories collapse to $0.
 */
export function calculateBudgetWithState(
  totalBudget: number,
  states: BudgetCategoryStates,
): BudgetRow[] {
  const byKey = new Map(BUDGET_CATEGORIES.map((c) => [c.key, c]));

  const lockedTotal = BUDGET_CATEGORIES.reduce((sum, c) => {
    const t = states.toggles[c.key];
    return t?.enabled && t.lockedAmount != null ? sum + t.lockedAmount : sum;
  }, 0);

  const unlockedPctSum = BUDGET_CATEGORIES.reduce((sum, c) => {
    const t = states.toggles[c.key];
    return t?.enabled && t.lockedAmount == null ? sum + c.pct : sum;
  }, 0);

  const remaining = Math.max(0, totalBudget - lockedTotal);

  /* Build rows in user-selected order. Unknown keys (shouldn't happen) get filtered. */
  const ordered = states.order
    .map((k) => byKey.get(k))
    .filter((c): c is BudgetCategory => c != null);

  /* Append any categories missing from order (forward-compat for new keys added in code) */
  for (const c of BUDGET_CATEGORIES) {
    if (!ordered.find((o) => o.key === c.key)) ordered.push(c);
  }

  return ordered.map((c) => {
    const t = states.toggles[c.key] ?? { enabled: true, lockedAmount: null };
    const minFloor = MIN_FLOORS[c.key];
    let amount = 0;
    if (t.enabled) {
      if (t.lockedAmount != null) {
        amount = t.lockedAmount;
      } else if (unlockedPctSum > 0) {
        amount = Math.round((c.pct / unlockedPctSum) * remaining);
      }
    }
    return {
      key: c.key,
      label: c.label,
      pct: c.pct,
      amount,
      enabled: t.enabled,
      locked: t.enabled && t.lockedAmount != null,
      lockedAmount: t.lockedAmount,
      belowFloor: t.enabled && t.lockedAmount != null && t.lockedAmount < minFloor,
      minFloor,
    };
  });
}
