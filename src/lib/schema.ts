import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
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
    accommodations: varchar("accommodations", { length: 50 }),
    indoorOutdoor: varchar("indoor_outdoor", { length: 50 }),

    hasWeddingsPage: varchar("has_weddings_page", { length: 10 }),
    weddingsPageUrl: varchar("weddings_page_url", { length: 500 }),
    hasPackages: varchar("has_packages", { length: 10 }),
    packages: text("packages"),
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

    source: varchar("source", { length: 100 }),
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

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
