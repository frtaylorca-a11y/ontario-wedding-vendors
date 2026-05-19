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
  | "photo_booth";

export type BudgetCategory = {
  key: VendorCategoryKey;
  label: string;
  pct: number;
  /** Vendor-directory category for the "Find vendors" link. Null = not a vendor category (e.g. attire, venue) */
  vendorCategory: string | null;
};

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: "venue_rental",    label: "Venue Rental",                pct: 0.28, vendorCategory: null }, /* venue lives in step 2 */
  { key: "catering_bar",    label: "Catering & Bar",              pct: 0.32, vendorCategory: "catering" },
  { key: "photo_video",     label: "Photography & Videography",   pct: 0.10, vendorCategory: "photographer" },
  { key: "music_dj",        label: "Music / DJ",                  pct: 0.04, vendorCategory: "dj" },
  { key: "flowers_decor",   label: "Flowers & Decorations",       pct: 0.08, vendorCategory: "florist" },
  { key: "cake",            label: "Wedding Cake",                pct: 0.02, vendorCategory: "cake" },
  { key: "hair_makeup",     label: "Hair & Makeup",               pct: 0.03, vendorCategory: "hair_makeup" },
  { key: "officiant",       label: "Officiant",                   pct: 0.01, vendorCategory: "officiant" },
  { key: "stationery",      label: "Invitations & Stationery",    pct: 0.02, vendorCategory: null },
  { key: "transportation",  label: "Transportation",              pct: 0.02, vendorCategory: "limo" },
  { key: "attire_bride",    label: "Wedding Attire (Bride)",      pct: 0.04, vendorCategory: null },
  { key: "attire_groom",    label: "Wedding Attire (Groom)",      pct: 0.01, vendorCategory: null },
  { key: "lighting_sound",  label: "Lighting & Sound",            pct: 0.02, vendorCategory: "lighting_decor" },
  { key: "photo_booth",     label: "Photo Booth",                 pct: 0.01, vendorCategory: "photo_booth" },
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
 * Per-vendor-category budget percentages.
 * Splits Photography & Videography (10% combined) into 6%/4% per spec norms.
 * wedding_planner is null — Ontario averages don't include it as a fixed line.
 */
export const VENDOR_CATEGORY_BUDGET_PCT: Record<string, number | null> = {
  photographer:    0.06,
  videographer:    0.04,
  dj:              0.04,
  florist:         0.08,
  catering:        0.32,
  cake:            0.02,
  hair_makeup:     0.03,
  officiant:       0.01,
  limo:            0.02,
  lighting_decor:  0.02,
  photo_booth:     0.01,
  wedding_planner: null,
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
  bookedVendors: Record<string, BookedVendor>; /* keyed by vendor category */
};

export const DEFAULT_PLAN: Omit<PlanState, "sessionId"> = {
  totalBudget: 35000,
  guestCount: 100,
  region: "niagara",
  weddingDate: null,
  venueId: null,
  venueName: null,
  venueCity: null,
  bookedVendors: {},
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
