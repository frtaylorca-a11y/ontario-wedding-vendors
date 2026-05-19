/**
 * Checklist timeline engine. Tasks are generated backwards from a wedding date
 * using TASK_TEMPLATES; user state (done/notes) is overlaid via taskStates.
 */

export type ChecklistTaskPartner = {
  /** Pill label shown on the task row (e.g., "Powered by OneQR") */
  label: string;
  /** Outbound URL the badge links to */
  url: string;
  /** Optional prominent CTA button on the task row (e.g., "Set up OneQR →") */
  cta?: string;
};

export type ChecklistTaskTemplate = {
  /** Stable key — used to overlay user state on regenerated templates */
  key: string;
  title: string;
  /** Months before wedding date (use fractions for sub-month: 0.5 = 2 weeks, 0.25 = 1 week, 0.033 ≈ 1 day) */
  monthsBefore: number;
  /** Human label for the time bucket — drives grouping */
  bucket: ChecklistBucket;
  /** Vendor category for the "Book now →" link, if applicable */
  vendorCategory: string | null;
  /** Optional explanatory copy shown below the title */
  description?: string;
  /** Optional partner badge + CTA (OneQR, etc.) */
  partner?: ChecklistTaskPartner;
};

export type ChecklistBucket =
  | "18mo"
  | "16mo"
  | "14mo"
  | "12mo"
  | "10mo"
  | "8mo"
  | "6mo"
  | "5mo"
  | "4mo"
  | "3mo"
  | "2mo"
  | "1mo"
  | "2wk"
  | "1wk"
  | "dayBefore"
  | "weddingDay";

export const BUCKET_LABELS: Record<ChecklistBucket, string> = {
  "18mo":       "18 months before",
  "16mo":       "16 months before",
  "14mo":       "14 months before",
  "12mo":       "12 months before",
  "10mo":       "10 months before",
  "8mo":        "8 months before",
  "6mo":        "6 months before",
  "5mo":        "5 months before",
  "4mo":        "4 months before",
  "3mo":        "3 months before",
  "2mo":        "2 months before",
  "1mo":        "1 month before",
  "2wk":        "2 weeks before",
  "1wk":        "1 week before",
  "dayBefore":  "Day before",
  "weddingDay": "Wedding day",
};

/* Order matters for rendering — earliest milestones first */
export const BUCKET_ORDER: ChecklistBucket[] = [
  "18mo", "16mo", "14mo", "12mo", "10mo", "8mo", "6mo", "5mo", "4mo",
  "3mo", "2mo", "1mo", "2wk", "1wk", "dayBefore", "weddingDay",
];

/* OneQR partner blocks — two campaigns: general checklist vs print workflow */
const ONEQR_DEFAULT: ChecklistTaskPartner = {
  label: "Powered by OneQR",
  url:   "https://oneqr.events?utm_source=owv&utm_campaign=checklist",
};
const ONEQR_PRINT: ChecklistTaskPartner = {
  label: "Powered by OneQR",
  url:   "https://oneqr.events?utm_source=owv&utm_campaign=checklist-print",
};

export const TASK_TEMPLATES: ChecklistTaskTemplate[] = [
  /* 18 months */
  { key: "book-venue",         title: "Book venue",                        monthsBefore: 18, bucket: "18mo", vendorCategory: null },
  /* 16 months */
  { key: "book-photographer",  title: "Book photographer",                 monthsBefore: 16, bucket: "16mo", vendorCategory: "photographer" },
  { key: "book-videographer",  title: "Book videographer",                 monthsBefore: 16, bucket: "16mo", vendorCategory: "videographer" },
  /* 14 months */
  { key: "book-dj",            title: "Book DJ",                           monthsBefore: 14, bucket: "14mo", vendorCategory: "dj" },
  /* 12 months */
  { key: "book-florist",       title: "Book florist",                      monthsBefore: 12, bucket: "12mo", vendorCategory: "florist" },
  { key: "book-caterer",       title: "Book caterer",                      monthsBefore: 12, bucket: "12mo", vendorCategory: "catering" },
  { key: "dress-shopping",     title: "Start dress shopping",              monthsBefore: 12, bucket: "12mo", vendorCategory: null },
  /* 10 months */
  { key: "save-the-dates",     title: "Send save the dates",               monthsBefore: 10, bucket: "10mo", vendorCategory: null },
  { key: "book-hair-makeup",   title: "Book hair & makeup",                monthsBefore: 10, bucket: "10mo", vendorCategory: "hair_makeup" },
  /* 8 months */
  { key: "book-officiant",     title: "Book officiant",                    monthsBefore: 8,  bucket: "8mo",  vendorCategory: "officiant" },
  { key: "book-transportation",title: "Book transportation",               monthsBefore: 8,  bucket: "8mo",  vendorCategory: "limo" },
  { key: "book-photo-booth",   title: "Book photo booth",                  monthsBefore: 8,  bucket: "8mo",  vendorCategory: "photo_booth" },
  /* 6 months */
  { key: "send-invitations",   title: "Send invitations",                  monthsBefore: 6,  bucket: "6mo",  vendorCategory: null },
  { key: "cake-tasting",       title: "Cake tasting",                      monthsBefore: 6,  bucket: "6mo",  vendorCategory: "cake" },
  { key: "rehearsal-venue",    title: "Book rehearsal dinner venue",       monthsBefore: 6,  bucket: "6mo",  vendorCategory: null },
  /* OneQR activation moved to 6mo so the digital pieces are ready by the day */
  {
    key: "oneqr-goes-live", /* preserved key so user state on the moved task isn't lost */
    title: "Activate OneQR for your wedding",
    monthsBefore: 6,
    bucket: "6mo",
    vendorCategory: null,
    description:
      "One QR code gives your guests a live photo gallery, digital seating chart, and day itinerary — set it up now so everything is ready on the day.",
    partner: { ...ONEQR_DEFAULT, cta: "Set up OneQR →" },
  },
  /* 5 months */
  {
    key: "oneqr-upload-guests",
    title: "Upload guest list to OneQR",
    monthsBefore: 5,
    bucket: "5mo",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
  /* 4 months */
  { key: "final-guest-count",  title: "Final guest count",                 monthsBefore: 4,  bucket: "4mo",  vendorCategory: null },
  { key: "seating-plan",       title: "Begin seating plan",                monthsBefore: 4,  bucket: "4mo",  vendorCategory: null },
  { key: "wedding-rings",      title: "Order wedding rings",               monthsBefore: 4,  bucket: "4mo",  vendorCategory: null },
  { key: "book-honeymoon",     title: "Book honeymoon",                    monthsBefore: 4,  bucket: "4mo",  vendorCategory: null },
  {
    key: "oneqr-build-itinerary",
    title: "Build your day-of itinerary in OneQR",
    monthsBefore: 4,
    bucket: "4mo",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
  /* 3 months */
  { key: "dress-fitting-1",    title: "Dress fitting #1",                  monthsBefore: 3,  bucket: "3mo",  vendorCategory: null },
  { key: "confirm-vendors",    title: "Confirm all vendors",               monthsBefore: 3,  bucket: "3mo",  vendorCategory: null },
  { key: "day-of-timeline",    title: "Create day-of timeline",            monthsBefore: 3,  bucket: "3mo",  vendorCategory: null },
  { key: "marriage-licence",   title: "Marriage licence",                  monthsBefore: 3,  bucket: "3mo",  vendorCategory: null },
  {
    key: "oneqr-share-with-vendors",
    title: "Share OneQR link with your vendors (DJ, photographer, coordinator)",
    monthsBefore: 3,
    bucket: "3mo",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
  {
    key: "oneqr-order-table-cards",
    title: "Order your OneQR table cards",
    monthsBefore: 3,
    bucket: "3mo",
    vendorCategory: null,
    description:
      "Your QR code goes on each table — guests scan to find their seat, view the gallery, and follow the day timeline. Order prints at least 8 weeks before your wedding.",
    partner: ONEQR_PRINT,
  },
  {
    key: "oneqr-order-welcome-sign",
    title: "Order your OneQR welcome sign",
    monthsBefore: 3,
    bucket: "3mo",
    vendorCategory: null,
    description:
      "A large format welcome sign at the venue entrance with your QR code sets the tone and gets guests connected from the moment they arrive.",
    partner: ONEQR_PRINT,
  },
  {
    key: "finalize-ceremony-program", /* preserved key so existing user state survives */
    title: "Consider OneQR for ceremony programs",
    monthsBefore: 3,
    bucket: "3mo",
    vendorCategory: null,
    description:
      "Guests scan for ceremony order, readings, and wedding party bios. Zero waste, always up to date.",
    partner: ONEQR_PRINT,
  },
  /* 2 months */
  { key: "dress-fitting-2",    title: "Dress fitting #2",                  monthsBefore: 2,  bucket: "2mo",  vendorCategory: null },
  { key: "send-vendor-timeline", title: "Send timeline to vendors",        monthsBefore: 2,  bucket: "2mo",  vendorCategory: null },
  {
    key: "oneqr-test-qr",
    title: "Test your QR code — scan it yourself",
    monthsBefore: 2,
    bucket: "2mo",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
  {
    key: "confirm-print-quantities", /* preserved key so existing user state survives */
    title: "Confirm print quantities match guest count",
    monthsBefore: 2,
    bucket: "2mo",
    vendorCategory: null,
    description:
      "Confirm table card and place card quantities match your final guest count. Reorder now if needed.",
    partner: ONEQR_PRINT,
  },
  /* 1 month */
  { key: "final-headcount",    title: "Final headcount to caterer",        monthsBefore: 1,  bucket: "1mo",  vendorCategory: null },
  { key: "confirm-rehearsal",  title: "Confirm rehearsal dinner",          monthsBefore: 1,  bucket: "1mo",  vendorCategory: null },
  { key: "prepare-payments",   title: "Prepare vendor final payments",     monthsBefore: 1,  bucket: "1mo",  vendorCategory: null },
  {
    key: "receive-printed-materials",
    title: "Receive and review all printed materials",
    monthsBefore: 1,
    bucket: "1mo",
    vendorCategory: null,
    description:
      "Check all table cards, place cards, and welcome sign. Test each QR code scans correctly and loads your OneQR page.",
    partner: ONEQR_PRINT,
  },
  /* 2 weeks */
  { key: "venue-walkthrough",  title: "Venue walkthrough",                 monthsBefore: 0.5, bucket: "2wk", vendorCategory: null },
  { key: "confirm-transport",  title: "Confirm transportation",            monthsBefore: 0.5, bucket: "2wk", vendorCategory: null },
  { key: "emergency-kit",      title: "Pack emergency kit",                monthsBefore: 0.5, bucket: "2wk", vendorCategory: null },
  {
    key: "oneqr-lock-itinerary",
    title: "Lock your itinerary in OneQR",
    monthsBefore: 0.5,
    bucket: "2wk",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
  /* 1 week */
  { key: "final-payments",     title: "Final vendor payments",             monthsBefore: 0.25, bucket: "1wk", vendorCategory: null },
  { key: "rings-to-party",     title: "Give rings to wedding party",       monthsBefore: 0.25, bucket: "1wk", vendorCategory: null },
  {
    key: "print-programs",
    title: "Print ceremony programs",
    monthsBefore: 0.25,
    bucket: "1wk",
    vendorCategory: null,
    description:
      "Or use OneQR instead — guests scan for the ceremony order. No printing needed.",
    partner: ONEQR_PRINT,
  },
  /* Day before */
  { key: "rehearsal-dinner",   title: "Rehearsal dinner",                  monthsBefore: 0.033, bucket: "dayBefore", vendorCategory: null },
  { key: "deliver-to-venue",   title: "Deliver items to venue",            monthsBefore: 0.033, bucket: "dayBefore", vendorCategory: null },
  /* Wedding day — finish-line task */
  {
    key: "oneqr-live-on-day",
    title: "OneQR is live — guests can scan on arrival",
    monthsBefore: 0,
    bucket: "weddingDay",
    vendorCategory: null,
    partner: ONEQR_DEFAULT,
  },
];

export type ChecklistTaskState = {
  key: string;
  done: boolean;
  /** ISO date when marked done — used for the green check + timestamp */
  doneAt?: string | null;
};

export type ChecklistTasksBlob = {
  /** Map of task key → user state */
  states: Record<string, ChecklistTaskState>;
};

export const DEFAULT_CHECKLIST_TASKS: ChecklistTasksBlob = { states: {} };

export type GeneratedTask = {
  key: string;
  title: string;
  bucket: ChecklistBucket;
  vendorCategory: string | null;
  dueDate: Date | null;     /* null when no wedding date set */
  done: boolean;
  doneAt: string | null;
  overdue: boolean;          /* due before today + not done */
  description?: string;
  partner?: ChecklistTaskPartner;
};

/** Subtract months (and fractional months) from an ISO date — returns Date */
function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  /* For fractional months, convert to days (≈30.44 days/month) and subtract */
  const whole = Math.floor(months);
  const frac = months - whole;
  if (whole > 0) result.setMonth(result.getMonth() - whole);
  if (frac > 0) result.setDate(result.getDate() - Math.round(frac * 30.44));
  return result;
}

export function generateChecklist(
  weddingDateIso: string | null,
  tasksBlob: ChecklistTasksBlob | null,
  now: Date = new Date(),
): GeneratedTask[] {
  const states = tasksBlob?.states ?? {};
  const weddingDate = weddingDateIso ? new Date(weddingDateIso) : null;

  return TASK_TEMPLATES.map((t) => {
    const state = states[t.key];
    const dueDate = weddingDate ? subtractMonths(weddingDate, t.monthsBefore) : null;
    const overdue = !!(dueDate && !state?.done && dueDate < now);
    return {
      key: t.key,
      title: t.title,
      bucket: t.bucket,
      vendorCategory: t.vendorCategory,
      dueDate,
      done: !!state?.done,
      doneAt: state?.doneAt ?? null,
      overdue,
      description: t.description,
      partner: t.partner,
    };
  });
}

export function groupByBucket(
  tasks: GeneratedTask[],
): { bucket: ChecklistBucket; label: string; tasks: GeneratedTask[] }[] {
  const map = new Map<ChecklistBucket, GeneratedTask[]>();
  for (const t of tasks) {
    if (!map.has(t.bucket)) map.set(t.bucket, []);
    map.get(t.bucket)!.push(t);
  }
  return BUCKET_ORDER
    .filter((b) => map.has(b))
    .map((b) => ({ bucket: b, label: BUCKET_LABELS[b], tasks: map.get(b)! }));
}
