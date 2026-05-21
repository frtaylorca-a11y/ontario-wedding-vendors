import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    placeId: varchar("place_id", { length: 255 }).unique(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    address: text("address"),
    city: varchar("city", { length: 100 }),
    region: varchar("region", { length: 100 }),
    province: varchar("province", { length: 10 }).default("ON"),
    postalCode: varchar("postal_code", { length: 10 }),

    phone: varchar("phone", { length: 50 }),
    website: varchar("website", { length: 500 }),
    email: varchar("email", { length: 255 }),

    category: varchar("category", { length: 100 }),
    venueType: varchar("venue_type", { length: 100 }),
    capacityMin: integer("capacity_min"),
    capacityMax: integer("capacity_max"),

    coordinatorName: varchar("coordinator_name", { length: 255 }),
    coordinatorEmail: varchar("coordinator_email", { length: 255 }),
    coordinatorPhone: varchar("coordinator_phone", { length: 50 }),

    catering: varchar("catering", { length: 100 }),
    accommodations: varchar("accommodations", { length: 500 }),
    indoorOutdoor: varchar("indoor_outdoor", { length: 100 }),

    hasWeddingsPage: varchar("has_weddings_page", { length: 10 }),
    weddingsPageUrl: varchar("weddings_page_url", { length: 500 }),
    hasPackages: varchar("has_packages", { length: 10 }),
    packages: varchar("packages", { length: 500 }),
    hasPricing: varchar("has_pricing", { length: 10 }),
    hasTestimonials: varchar("has_testimonials", { length: 10 }),
    bookingPlatform: varchar("booking_platform", { length: 100 }),
    instagramHandle: varchar("instagram_handle", { length: 100 }),

    googleRating: numeric("google_rating", { precision: 3, scale: 1 }),
    reviewCount: integer("review_count"),
    googleClosed: varchar("google_closed", { length: 10 }).default("no"),

    weddingReadinessScore: integer("wedding_readiness_score"),
    scoreReasoning: text("score_reasoning"),
    description: text("description"),

    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),

    tier: varchar("tier", { length: 20 }).default("free"),
    claimed: boolean("claimed").default(false),
    verified: boolean("verified").default(false),
    featured: boolean("featured").default(false),

    websiteStatus: varchar("website_status", { length: 50 }),
    lastGoogleSync: timestamp("last_google_sync"),
    lastWebsiteCheck: timestamp("last_website_check"),
    lastVerified: timestamp("last_verified"),
    enrichedAt: timestamp("enriched_at"),

    /* Photo pipeline — mirrors the vendors table so VenueCard's
     * fallback chain (heroImageCustom → heroImage → category fallback)
     * works identically to VendorCard.
     *   heroImageCustom      = R2 URL (best, permanent) — set by
     *                          scripts/upgrade-venue-photos.ts after
     *                          Claude Vision picks website over Google.
     *   heroImage            = Google photo_reference (Stage 1
     *                          bootstrap) — set by
     *                          scripts/backfill-venue-photos.ts.
     *   heroImageSource      = 'google' | 'website' | 'upload'
     *   heroImageRefreshedAt = when the source last refreshed
     *                          (Google URLs rotate)
     *   heroImageValidated   = Claude Vision approved (only true once
     *                          the website image won the comparison)
     */
    heroImage:               varchar("hero_image", { length: 500 }),
    heroImageCustom:         varchar("hero_image_custom", { length: 500 }),
    heroImageSource:         varchar("hero_image_source", { length: 20 }),
    heroImageRefreshedAt:    timestamp("hero_image_refreshed_at"),
    heroImageValidated:      boolean("hero_image_validated").default(false),

    /* Cached additional Google Places photos — same shape and cache
     * pattern as vendors.additionalPhotos. Fed into the
     * InteractiveBentoGallery section on the venue detail page when
     * the venue has 2+ photos available. */
    additionalPhotos:        jsonb("additional_photos"),

    /* FAQs scraped from the venue's own website, same shape as
     * vendors.faqs. Populated by a future venue-side bio-enrichment
     * script; rendered by the Part-2 venue FAQ section. */
    faqs:                    jsonb("faqs"),

    source: varchar("source", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    slugIdx: index("venues_slug_idx").on(t.slug),
    regionIdx: index("venues_region_idx").on(t.region),
    cityIdx: index("venues_city_idx").on(t.city),
    venueTypeIdx: index("venues_venue_type_idx").on(t.venueType),
    scoreIdx: index("venues_score_idx").on(t.weddingReadinessScore),
    tierIdx: index("venues_tier_idx").on(t.tier),
  }),
);

export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    placeId: varchar("place_id", { length: 255 }).unique(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    // photographer, videographer, dj, florist, photo_booth,
    // catering, cake, hair_makeup, officiant, limo
    category: varchar("category", { length: 100 }).notNull(),

    city: varchar("city", { length: 100 }),
    region: varchar("region", { length: 100 }),
    province: varchar("province", { length: 10 }).default("ON"),
    address: text("address"),

    phone: varchar("phone", { length: 50 }),
    website: varchar("website", { length: 500 }),
    email: varchar("email", { length: 255 }),
    instagramHandle: varchar("instagram_handle", { length: 100 }),

    googleRating: numeric("google_rating", { precision: 3, scale: 1 }),
    reviewCount: integer("review_count"),
    googleClosed: varchar("google_closed", { length: 10 }).default("no"),

    priceTier: varchar("price_tier", { length: 20 }), // budget, mid, premium
    priceFrom: integer("price_from"),
    priceTo: integer("price_to"),

    description: text("description"),
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),
    serveRadiusKm: integer("serve_radius_km").default(100),

    tier: varchar("tier", { length: 20 }).default("free"),
    claimed: boolean("claimed").default(false),
    verified: boolean("verified").default(false),
    featured: boolean("featured").default(false),
    isPicBooth: boolean("is_pic_booth").default(false),
    isNiagaraPhotoBooth: boolean("is_niagara_photo_booth").default(false),

    /* Recommended Partner system — pinned vendors sort first when they
     * fall within the active radius + a pinned category/region. Disclosed
     * as "Recommended Partner" with a rose border; never labelled Ad. */
    isPinned: boolean("is_pinned").default(false),
    pinnedCategories: text("pinned_categories").array(),
    pinnedRegions: text("pinned_regions").array(),
    pinnedNote: text("pinned_note"),

    /* Promotional fields — drives the Variant A photo card + sort-to-top behavior */
    heroImage: varchar("hero_image", { length: 500 }), /* Google photo_reference (fallback) */
    /* Photo pipeline:
     *   heroImageCustom = R2 URL (best, permanent) — set by upgrade-vendor-photos.ts
     *   heroImage       = Google photo_reference   — set by backfill-vendor-photos.ts
     *   heroImageSource: 'google' | 'website' | 'upload'
     *   heroImageRefreshedAt: when the source last refreshed (Google URLs rotate)
     *   heroImageValidated: Claude Vision approved (only set true after AI check)
     */
    heroImageCustom: varchar("hero_image_custom", { length: 500 }),
    heroImageSource: varchar("hero_image_source", { length: 20 }),
    heroImageRefreshedAt: timestamp("hero_image_refreshed_at"),
    heroImageValidated: boolean("hero_image_validated").default(false),
    isFeatured: boolean("is_featured").default(false),
    featuredUntil: timestamp("featured_until"),

    /* Visibility gating — public-facing vendor queries filter
     * isHidden=true rows. Used to suppress vendors that don't meet
     * the "real business with a real online presence" bar, primarily
     * those without a website on file. Once a website lands (manual
     * edit, find-vendor-websites.ts AI search, etc.), the row is
     * un-hidden in the same write.
     *   isHidden            true = excluded from /vendors listings,
     *                       individual /vendors/[cat]/[slug] pages
     *                       still resolve directly (caller decides
     *                       whether to 404)
     *   hiddenReason        free-text label for why ('no_website',
     *                       'duplicate', 'low_quality', etc.)
     *   needsWebsiteSearch  flag the row for find-vendor-websites.ts.
     *                       Set true alongside isHidden=true on
     *                       no-website vendors; the AI search clears
     *                       it on a successful match.
     */
    isHidden:            boolean("is_hidden").default(false),
    hiddenReason:        varchar("hidden_reason", { length: 100 }),
    needsWebsiteSearch:  boolean("needs_website_search").default(false),

    /* Cached Google Reviews — array of {author, rating, text, time}
     * shaped objects, fetched via Places Details ?fields=reviews and
     * stored here so the vendor detail page doesn't hit Google on
     * every visit. Empty array means "not cached yet"; null means
     * "not fetched yet" — distinct from "no reviews". */
    reviewExcerpts:      jsonb("review_excerpts"),

    /* Cached additional Google Places photos for the
     * InteractiveBentoGallery on the vendor detail page. Shape:
     * [{ url: string, attributions: string[] }, ...]. URLs include
     * the API key as a query string — they rotate every few weeks,
     * so a periodic re-fetch script can refresh them. null until
     * first fetched. */
    additionalPhotos:    jsonb("additional_photos"),

    /* Pre-computed multi-factor ranking score driving every public
     * vendor sort. Higher = better. Recomputed by
     * scripts/recompute-vendor-rankings.ts and by the import +
     * bio-enrichment paths whenever a vendor row changes. See
     * DISPLAY_RANK_SCORE_SQL in src/lib/queries.ts for the formula. */
    displayRankScore:    integer("display_rank_score"),

    /* Whether this vendor's detail page is healthy enough to be
     * indexed by Google. Public listings always include the row;
     * sitemap.xml + the page's robots meta tag both gate on this
     * flag so empty-shell pages don't drag the domain's quality
     * signal down. Recomputed by import + bio-enrichment + the
     * cache-vendor-reviews script. See IS_INDEXABLE_SQL in
     * src/lib/queries.ts for the OR formula. */
    isIndexable:         boolean("is_indexable").default(false),

    /* FAQs extracted from the vendor's own website by
     * scripts/enrich-vendor-bios.ts. Shape:
     *   [{ question: string, answer: string, source: 'vendor_website' }]
     * Caps at 5 entries — bio enrichment writes up to 5 if found.
     * null = "never enriched"; [] = "enriched, none found". Read by
     * the vendor detail page's FAQ section + FAQ JSON-LD emitter. */
    faqs:                jsonb("faqs"),

    source: varchar("source", { length: 100 }),
    /* Wedding-readiness signal for vendors discovered through referrals + reviews */
    vendorReadinessScore: integer("vendor_readiness_score"),
    /* Bio enrichment — populated by scripts/enrich-vendor-bios.ts via
     * Claude Vision over the vendor's own website. description column
     * (already present above) gets overwritten with the AI-extracted
     * 2-3-sentence narrative; these supplemental fields are stored
     * alongside. bio_enriched_at gates re-enrichment. */
    ownerName:        varchar("owner_name",       { length: 100 }),
    yearsInBusiness:  integer("years_in_business"),
    specialties:      jsonb("specialties"),
    serviceAreas:     jsonb("service_areas"),
    bioEnrichedAt:    timestamp("bio_enriched_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    slugIdx: index("vendors_slug_idx").on(t.slug),
    categoryIdx: index("vendors_category_idx").on(t.category),
    regionIdx: index("vendors_region_idx").on(t.region),
    cityIdx: index("vendors_city_idx").on(t.city),
    isPicBoothIdx: index("vendors_is_pic_booth_idx").on(t.isPicBooth),
  }),
);

/**
 * Edge table for "X recommends Y" relationships.
 *   Source: exactly one of sourceVenueId / sourceVendorId is set (the recommender).
 *   Recommended: recommendedVendorId set when the target is in our DB;
 *     otherwise recommendedVendorName captures the raw mention for later matching.
 * Populated by scripts/enrich-venues.ts (Pass 2 + Google-review mining).
 */
export const vendorRelationships = pgTable(
  "vendor_relationships",
  {
    id:                    serial("id").primaryKey(),

    sourceVenueId:         integer("source_venue_id"),
    sourceVendorId:        integer("source_vendor_id"),

    recommendedVendorId:   integer("recommended_vendor_id"),
    recommendedVendorName: varchar("recommended_vendor_name", { length: 255 }),
    recommendedCategory:   varchar("recommended_category", { length: 50 }),

    relationshipType:      varchar("relationship_type", { length: 50 }).notNull(),
      // "preferred_vendor" | "frequent_collaborator" | "review_mention"
    source:                varchar("source", { length: 50 }).notNull(),
      // "venue_website" | "vendor_website" | "google_review"
    sourceUrl:             text("source_url"),
    context:               text("context"),     // sentence / quote for review mentions
    sentiment:             varchar("sentiment", { length: 20 }), // review_mention only

    createdAt:             timestamp("created_at").defaultNow(),
    updatedAt:             timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    sourceVenueIdx:        index("vr_source_venue_idx").on(t.sourceVenueId),
    sourceVendorIdx:       index("vr_source_vendor_idx").on(t.sourceVendorId),
    recommendedIdx:        index("vr_recommended_idx").on(t.recommendedVendorId),
    typeIdx:               index("vr_type_idx").on(t.relationshipType),
  }),
);

/**
 * Anonymous wedding plans — keyed by sessionId (UUID cookie), no login required.
 * Plan state lives in localStorage AND mirrors here for cross-device access later.
 */
export const weddingPlans = pgTable(
  "wedding_plans",
  {
    id:                 serial("id").primaryKey(),
    sessionId:          varchar("session_id", { length: 64 }).unique().notNull(),
    weddingDate:        date("wedding_date"),
    totalBudget:        integer("total_budget"),
    guestCount:         integer("guest_count"),
    region:             varchar("region", { length: 100 }),
    venueId:            integer("venue_id"),
    style:              varchar("style", { length: 50 }),
    bookedVendors:      jsonb("booked_vendors"),
    /* Saved (favourited) vendors per category — Mode 1 of the vendor slot:
     *   { photographer: ["vendor-slug-1", "vendor-slug-2"], dj: [...] } */
    savedVendors:       jsonb("saved_vendors"),
    suggestedVendors:   jsonb("suggested_vendors"),
    stagAndDoe:         jsonb("stag_and_doe"),
    budgetCategoryStates: jsonb("budget_category_states"),
    checklistTasks:     jsonb("checklist_tasks"),
    /* Lightweight collection blobs that ship to OneQR on activation */
    musicSelections:    jsonb("music_selections"),
    guestList:          jsonb("guest_list"),
    itinerary:          jsonb("itinerary"),
    /* OneQR activation state — populated by /api/oneqr/activate response */
    oneqrSlug:          varchar("oneqr_slug",         { length: 100 }),
    oneqrActivatedAt:   timestamp("oneqr_activated_at"),
    oneqrQrCodeUrl:     varchar("oneqr_qr_code_url",  { length: 500 }),
    oneqrDjPortalUrl:   varchar("oneqr_dj_portal_url",{ length: 500 }),
    oneqrAdminUrl:      varchar("oneqr_admin_url",    { length: 500 }),
    alertPhone:         varchar("alert_phone", { length: 50 }),
    alertEmail:         varchar("alert_email", { length: 255 }),
    alertChannel:       varchar("alert_channel", { length: 10 }),
    /* Attribution / session capture — written once on INSERT, never updated.
     * Drives marketing analytics + first-visit cohort reporting. */
    /* Wedding-website routing — subdomain on the regional apex domain.
     *   {wedding_site_slug}.{wedding_site_regional_domain}
     * e.g. "smith-and-jones.niagaraweddingvenues.com". Middleware in
     * src/middleware.ts rewrites these to /wedding/[slug] internally. */
    partner1Name:               varchar("partner1_name",                 { length: 100 }),
    partner2Name:               varchar("partner2_name",                 { length: 100 }),
    weddingSiteSlug:            varchar("wedding_site_slug",             { length: 60 }),
    weddingSiteRegionalDomain:  varchar("wedding_site_regional_domain",  { length: 100 }),
    /* Toggle: show the "Our Venue & Vendors" credits section on the
     * couple's wedding site. Default true — couple opts out in the
     * /plan/website editor. */
    weddingSiteShowVendors:     boolean("wedding_site_show_vendors").default(true),

    /* ── Wedding-website fields ────────────────────────────────────
     * Everything below is owned by the /plan/website editor. The
     * couple's public site at {slug}.{regional-domain} renders from
     * these fields + the toggles in weddingPageConfig. */
    weddingTheme:               varchar("wedding_theme",        { length: 20 }).default("romantic"),
    weddingPublished:           boolean("wedding_published").default(false),
    weddingHeroImage:           varchar("wedding_hero_image",   { length: 500 }),
    weddingParty:               jsonb("wedding_party"),
    weddingRegistry:            jsonb("wedding_registry"),
    weddingGeneratedCopy:       jsonb("wedding_generated_copy"),
    /* Per-section visibility toggle map — see WeddingPageConfig in
     * src/lib/wedding-website.ts for the canonical shape. */
    weddingPageConfig:          jsonb("wedding_page_config"),
    /* Optional password gate. When set, /weddings/[slug] renders a
     * password form; correct entry sets a 30-day cookie. */
    weddingPassword:            varchar("wedding_password",     { length: 100 }),
    weddingHashtag:             varchar("wedding_hashtag",      { length: 100 }),
    weddingPageViews:           integer("wedding_page_views").default(0),
    /* Editable section copy — drives Our Story + Travel sections. */
    ourStory:                   text("our_story"),
    travelCopy:                 text("travel_copy"),
    /* Dress code section */
    dressCodeStyle:             varchar("dress_code_style",     { length: 50 }),
    dressCodeDescription:       text("dress_code_description"),
    dressCodeImageUrl:          varchar("dress_code_image_url", { length: 500 }),
    /* Things-to-do items array — see ThingsToDoItem[] type */
    thingsToDo:                 jsonb("things_to_do"),
    /* Additional events beyond ceremony + reception */
    multipleEvents:             jsonb("multiple_events"),
    /* Photo gallery — array of image URLs (couple-uploaded later) */
    photoGalleryUrls:           jsonb("photo_gallery_urls"),

    /* ── Custom palette + typography (owned by /plan/website) ────── */
    customColorPrimary:         varchar("custom_color_primary",     { length: 7 }),
    customColorAccent:          varchar("custom_color_accent",      { length: 7 }),
    customColorBg:              varchar("custom_color_bg",          { length: 7 }),
    customColorText:            varchar("custom_color_text",        { length: 7 }),
    customPaletteId:            varchar("custom_palette_id",        { length: 50 }),
    weddingTypographyStyle:     varchar("wedding_typography_style", { length: 30 }),

    /* ── Premium tier + AI generation tracking ────────────────────── */
    tier:                       varchar("tier", { length: 20 }).default("free"),
    premiumActivatedAt:         timestamp("premium_activated_at"),
    premiumExpiresAt:           timestamp("premium_expires_at"),
    weddingGenerationCount:     integer("wedding_generation_count").default(0),

    /* ── Wedding-website setup wizard ────────────────────────────────
     * The wizard on /plan/website is the screenshot-driven flow shown
     * to fresh couples (where wedding_published=false AND
     * wizard_completed=false). rawStory is the seed paragraph entered
     * in wizard Step 2; the AI generator turns it into ourStory + the
     * rest of the editorial copy. wizardCompleted flips true once the
     * couple reaches Step 3 (photo + publish), at which point future
     * visits go straight to the advanced editor. */
    rawStory:                   text("raw_story"),
    wizardCompleted:            boolean("wizard_completed").default(false),
    wizardCompletedAt:          timestamp("wizard_completed_at"),

    /* ── Bulk quote request flow ────────────────────────────────────
     * /plan/quotes lets the couple shortlist saved vendors and send
     * one personalised inquiry per vendor in a single batch. The
     * AI-generated 3-part template is cached here so the preview UI
     * doesn't have to regenerate on every render; quotesSentAt marks
     * the last successful batch send and drives the "you sent this
     * on {date}" UX.
     *
     * coupleEmail is the reply-to address — collected once when the
     * couple first sends a batch, then reused. Distinct from
     * alertEmail (which is OneQR RSVP notifications). */
    coupleEmail:                varchar("couple_email", { length: 255 }),
    quoteEmailTemplate:         text("quote_email_template"),
    quotesSentAt:               timestamp("quotes_sent_at"),
    ipAddress:          varchar("ip_address",   { length: 45 }),
    userAgent:          text("user_agent"),
    referrer:           varchar("referrer",     { length: 500 }),
    utmSource:          varchar("utm_source",   { length: 100 }),
    utmMedium:          varchar("utm_medium",   { length: 100 }),
    utmCampaign:        varchar("utm_campaign", { length: 100 }),
    utmContent:         varchar("utm_content",  { length: 100 }),
    deviceType:         varchar("device_type",  { length: 20 }), /* mobile|tablet|desktop */
    firstPage:          varchar("first_page",   { length: 500 }),
    firstVisitedAt:     timestamp("first_visited_at"),
    notes:              text("notes"),
    createdAt:          timestamp("created_at").defaultNow(),
    updatedAt:          timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    sessionIdx:         index("plans_session_idx").on(t.sessionId),
  }),
);

/**
 * Vendors suggested by couples via the planner's "Add a vendor not in our list"
 * flow. Holds discovery candidates for admin review; promoted to vendors table
 * with status = "added" once verified.
 */
export const userSuggestedVendors = pgTable(
  "user_suggested_vendors",
  {
    id:                  serial("id").primaryKey(),
    name:                varchar("name", { length: 255 }).notNull(),
    normalizedName:      varchar("normalized_name", { length: 255 }).notNull(),
    category:            varchar("category", { length: 50 }).notNull(),
    website:             varchar("website", { length: 500 }),
    instagram:           varchar("instagram", { length: 100 }),
    phone:               varchar("phone", { length: 50 }),
    city:                varchar("city", { length: 100 }).notNull(),
    region:              varchar("region", { length: 100 }).notNull(),
    notes:               text("notes"),
    submittedBySession:  varchar("submitted_by_session", { length: 64 }),
    mentionCount:        integer("mention_count").notNull().default(1),
    /** "pending" | "reviewed" | "added" | "rejected" */
    status:              varchar("status", { length: 20 }).notNull().default("pending"),
    matchedVendorId:     integer("matched_vendor_id"),
    contactedAt:         timestamp("contacted_at"),
    claimedAt:           timestamp("claimed_at"),
    createdAt:           timestamp("created_at").defaultNow(),
    updatedAt:           timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    normalizedNameIdx: index("usv_normalized_name_idx").on(t.normalizedName),
    categoryIdx:       index("usv_category_idx").on(t.category),
    statusIdx:         index("usv_status_idx").on(t.status),
    mentionCountIdx:   index("usv_mention_count_idx").on(t.mentionCount),
  }),
);

/**
 * Bulk quote requests sent from /plan/quotes. One row per
 * (session, vendor) batch send. The row captures the exact
 * personalised email body that landed in the vendor's inbox so the
 * couple can audit what they sent, and so future reply-tracking
 * (webhook or polling) has somewhere to attach.
 *
 * Index notes:
 *   - sessionIdx: powers "have I contacted X?" lookups in the UI
 *   - vendorIdx + emailSentAt: powers the 30-day dedupe guardrail
 *     ("you contacted them on {date} — send again?")
 */
export const quoteRequests = pgTable(
  "quote_requests",
  {
    id:                serial("id").primaryKey(),
    sessionId:         varchar("session_id", { length: 64 }).notNull(),
    vendorId:          integer("vendor_id").notNull(),
    vendorCategory:    varchar("vendor_category", { length: 50 }),
    vendorEmail:       varchar("vendor_email", { length: 255 }),
    coupleEmail:       varchar("couple_email",  { length: 255 }),
    emailSubject:      text("email_subject"),
    emailBody:         text("email_body"),
    emailSent:         boolean("email_sent").default(false),
    emailSentAt:       timestamp("email_sent_at"),
    sendError:         text("send_error"),
    /* Vendor response capture — populated by a future reply-tracking
     * webhook. Today these stay null; the columns exist now so the
     * shape lands in the table on the first migration. */
    vendorResponse:    text("vendor_response"),
    vendorRespondedAt: timestamp("vendor_responded_at"),
    createdAt:         timestamp("created_at").defaultNow(),
    updatedAt:         timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    sessionIdx: index("quote_requests_session_idx").on(t.sessionId),
    vendorIdx:  index("quote_requests_vendor_idx").on(t.vendorId, t.emailSentAt),
    sentIdx:    index("quote_requests_sent_idx").on(t.emailSent, t.emailSentAt),
  }),
);

export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type NewQuoteRequest = typeof quoteRequests.$inferInsert;

/**
 * Pricing data overlay for vendor categories. Two sources:
 *   - "published" — static estimates from RBC / WeddingWire / WealthNorth
 *   - "scraped"   — live data from the Ontario vendors scraper
 * Lookup is (category, region, tier). When ≥5 samples of "scraped" exist
 * for a (category, region, tier), the API prefers scraped over published.
 */
export const vendorPricingData = pgTable(
  "vendor_pricing_data",
  {
    id:           serial("id").primaryKey(),
    category:     varchar("category", { length: 100 }).notNull(),
    region:       varchar("region",   { length: 100 }).notNull(),
    tier:         varchar("tier",     { length: 20  }).notNull(), /* budget|mid|luxury */
    rangeMin:     integer("range_min"),
    rangeMax:     integer("range_max"),
    median:       integer("median"),
    sampleSize:   integer("sample_size").notNull().default(0),
    lastUpdated:  timestamp("last_updated").defaultNow(),
    source:       varchar("source", { length: 20 }).notNull().default("published"),
  },
  (t) => ({
    lookupIdx: index("vpd_lookup_idx").on(t.category, t.region, t.tier),
  }),
);

export type VendorPricingDataRow = typeof vendorPricingData.$inferSelect;
export type NewVendorPricingDataRow = typeof vendorPricingData.$inferInsert;

/**
 * Inbound claim submissions from /claim-listing. Stored verbatim; an
 * operator reviews and either links to vendors/venues by id (status →
 * "verified") or marks "rejected".
 */
export const vendorClaims = pgTable(
  "vendor_claims",
  {
    id:               serial("id").primaryKey(),
    listingType:      varchar("listing_type",   { length: 20  }).notNull(), /* 'venue'|'vendor' */
    category:         varchar("category",       { length: 50  }),           /* vendor category slug */
    businessName:     varchar("business_name",  { length: 255 }).notNull(),
    businessUrl:      varchar("business_url",   { length: 500 }),
    vendorId:         integer("vendor_id"),  /* set by admin once verified */
    venueId:          integer("venue_id"),   /* set by admin once verified */
    claimantName:     varchar("claimant_name",  { length: 120 }).notNull(),
    claimantEmail:    varchar("claimant_email", { length: 255 }).notNull(),
    claimantPhone:    varchar("claimant_phone", { length: 50  }),
    claimantRole:     varchar("claimant_role",  { length: 120 }),
    message:          text("message"),
    status:           varchar("status",         { length: 20  }).notNull().default("pending"),
                                                                /* pending|verified|rejected */
    ipAddress:        varchar("ip_address",     { length: 45  }),
    userAgent:        text("user_agent"),
    createdAt:        timestamp("created_at").defaultNow(),
    updatedAt:        timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("vendor_claims_status_idx").on(t.status, t.createdAt),
    emailIdx:  index("vendor_claims_email_idx").on(t.claimantEmail),
  }),
);

export type VendorClaim = typeof vendorClaims.$inferSelect;
export type NewVendorClaim = typeof vendorClaims.$inferInsert;

/* AI-generated blog drafts. /api/blog/generate writes here; the
 * admin reviews the preview and either flips publishedAt to a date
 * (going live in BLOG_POSTS via a migration) or deletes the row. */
export const blogDrafts = pgTable(
  "blog_drafts",
  {
    id:              serial("id").primaryKey(),
    slug:            varchar("slug",             { length: 255 }).notNull().unique(),
    title:           varchar("title",            { length: 255 }).notNull(),
    metaDescription: text("meta_description"),
    contentMdx:      text("content_mdx").notNull(),
    /* Capture the request that produced the draft so we can rerun
     * generation when the competitor post changes or pricing updates. */
    topic:           text("topic"),
    targetKeyword:   varchar("target_keyword",   { length: 255 }),
    targetRegion:    varchar("target_region",    { length: 100 }),
    category:        varchar("category",         { length: 50  }),
    competitorUrl:   varchar("competitor_url",   { length: 500 }),
    /* [{ text, url, kind: 'vendor'|'venue'|'internal' }] */
    internalLinks:   jsonb("internal_links"),
    wordCount:       integer("word_count"),
    /* null = draft; set to a date when the post is approved + lives
     * in BLOG_POSTS (or its replacement). */
    publishedAt:     timestamp("published_at"),
    createdAt:       timestamp("created_at").defaultNow(),
    updatedAt:       timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    publishedAtIdx: index("blog_drafts_published_at_idx").on(t.publishedAt, t.createdAt),
  }),
);

export type BlogDraft = typeof blogDrafts.$inferSelect;
export type NewBlogDraft = typeof blogDrafts.$inferInsert;

/* ─── Blog agent tables ─────────────────────────────────────────── */

/* Published blog posts. The TSX-defined posts in src/lib/blog.tsx
 * stay where they are — DB-first lookup in /blog/[slug] falls back
 * to BLOG_POSTS so existing URLs never break. */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id:                     serial("id").primaryKey(),
    slug:                   varchar("slug", { length: 255 }).notNull().unique(),
    title:                  varchar("title", { length: 255 }).notNull(),
    content:                text("content").notNull(),       /* markdown body */
    metaDescription:        text("meta_description"),
    excerpt:                text("excerpt"),
    category:               varchar("category", { length: 100 }),
    tags:                   jsonb("tags"),                    /* string[] */
    publishedAt:            timestamp("published_at"),
    wordCount:              integer("word_count"),
    sourceTopic:            text("source_topic"),
    sourceDirectory:        varchar("source_directory", { length: 120 }),
    internalLinks:          jsonb("internal_links"),          /* [{text,url,kind}] */
    isPublished:            boolean("is_published").default(false),
    isAiGenerated:          boolean("is_ai_generated").default(true),
    heroImageUrl:           varchar("hero_image_url", { length: 500 }),
    heroImageAlt:           varchar("hero_image_alt", { length: 200 }),
    heroImagePrompt:        text("hero_image_prompt"),
    heroImageGeneratedAt:   timestamp("hero_image_generated_at"),
    createdAt:              timestamp("created_at").defaultNow(),
    updatedAt:              timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    publishedIdx: index("blog_posts_published_idx").on(t.isPublished, t.publishedAt),
    slugIdx:      index("blog_posts_slug_idx").on(t.slug),
  }),
);

/* Topics discovered by the daily scout — one row per (source, title)
 * combo, even if rejected. Lets us track dedupe + audit what got picked. */
export const blogScoutLog = pgTable(
  "blog_scout_log",
  {
    id:            serial("id").primaryKey(),
    title:         text("title").notNull(),
    sourceName:    varchar("source_name", { length: 120 }).notNull(),
    sourceUrl:     varchar("source_url", { length: 600 }),
    discoveredAt:  timestamp("discovered_at").defaultNow(),
    score:         integer("score").default(0),
    used:          boolean("used").default(false),
    usedAt:        timestamp("used_at"),
    ourPostSlug:   varchar("our_post_slug", { length: 255 }),
  },
  (t) => ({
    discoveredIdx: index("blog_scout_log_discovered_idx").on(t.discoveredAt),
    usedIdx:       index("blog_scout_log_used_idx").on(t.used, t.score),
  }),
);

/* Singleton settings — id=1 row holds the live config. */
export const blogAgentSettings = pgTable("blog_agent_settings", {
  id:                serial("id").primaryKey(),
  autoPublish:       boolean("auto_publish").default(false),
  dailyRunEnabled:   boolean("daily_run_enabled").default(true),
  minWordCount:      integer("min_word_count").default(700),
  maxWordCount:      integer("max_word_count").default(900),
  targetRegions:     jsonb("target_regions"),  /* string[] */
  updatedAt:         timestamp("updated_at").defaultNow(),
});

/* Cross-platform distribution telemetry — GBP, Instagram, Facebook,
 * Pinterest. status: queued | published | skipped | failed. */
export const contentDistributionLog = pgTable(
  "content_distribution_log",
  {
    id:               serial("id").primaryKey(),
    blogPostId:       integer("blog_post_id"),
    platform:         varchar("platform", { length: 40 }).notNull(),
    platformPostId:   varchar("platform_post_id", { length: 255 }),
    publishedAt:      timestamp("published_at"),
    status:           varchar("status", { length: 20 }).notNull(),
    engagementData:   jsonb("engagement_data"),
    errorMessage:     text("error_message"),
    createdAt:        timestamp("created_at").defaultNow(),
  },
  (t) => ({
    postIdx:     index("content_distribution_post_idx").on(t.blogPostId, t.platform),
    statusIdx:   index("content_distribution_status_idx").on(t.status, t.createdAt),
  }),
);

/* Newsletter subscribers (weekly digest). */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id:                  serial("id").primaryKey(),
    email:               varchar("email", { length: 255 }).notNull().unique(),
    name:                varchar("name", { length: 120 }),
    region:              varchar("region", { length: 80 }),
    subscribedAt:        timestamp("subscribed_at").defaultNow(),
    unsubscribeToken:    varchar("unsubscribe_token", { length: 64 }).notNull(),
    isActive:            boolean("is_active").default(true),
  },
  (t) => ({
    activeIdx: index("newsletter_active_idx").on(t.isActive, t.subscribedAt),
  }),
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogScoutLog = typeof blogScoutLog.$inferSelect;
export type BlogAgentSettings = typeof blogAgentSettings.$inferSelect;
export type ContentDistributionLog = typeof contentDistributionLog.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type VendorRelationship = typeof vendorRelationships.$inferSelect;
export type NewVendorRelationship = typeof vendorRelationships.$inferInsert;
export type WeddingPlan = typeof weddingPlans.$inferSelect;
export type NewWeddingPlan = typeof weddingPlans.$inferInsert;
export type UserSuggestedVendor = typeof userSuggestedVendors.$inferSelect;
export type NewUserSuggestedVendor = typeof userSuggestedVendors.$inferInsert;
