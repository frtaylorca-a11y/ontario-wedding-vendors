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

    source: varchar("source", { length: 100 }),
    /* Wedding-readiness signal for vendors discovered through referrals + reviews */
    vendorReadinessScore: integer("vendor_readiness_score"),
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
    brideName:                  varchar("bride_name",                    { length: 100 }),
    groomName:                  varchar("groom_name",                    { length: 100 }),
    weddingSiteSlug:            varchar("wedding_site_slug",             { length: 60 }),
    weddingSiteRegionalDomain:  varchar("wedding_site_regional_domain",  { length: 100 }),
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
