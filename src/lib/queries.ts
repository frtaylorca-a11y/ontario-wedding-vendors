import { and, asc, desc, eq, gte, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { venues, vendors, vendorRelationships } from "./schema";
import type { Venue, Vendor } from "./schema";

export type VenueListParams = {
  region?: string;
  city?: string;
  type?: string;
  indoor?: "indoor" | "outdoor" | "both";
  catering?: "in-house" | "open" | "both";
  capacity?: number;
  score?: number; // minimum wedding_readiness_score
  sort?: "rating" | "reviews" | "capacity" | "score";
  limit?: number;
  offset?: number;
};

export async function listVenues(
  params: VenueListParams,
): Promise<{ venues: Venue[]; total: number; page: number }> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);
  const minScore = params.score ?? 50;

  const conditions = [
    gte(venues.weddingReadinessScore, minScore),
    or(eq(venues.googleClosed, "no"), sql`${venues.googleClosed} is null`)!,
  ];

  if (params.region) conditions.push(eq(venues.region, params.region));
  if (params.city) conditions.push(ilike(venues.city, `%${params.city}%`));
  if (params.type) {
    // DB stores "golf club" / "banquet hall"; URLs use "golf-club" / "banquet-hall"
    const normalized = params.type.replace(/-/g, " ").toLowerCase();
    conditions.push(eq(venues.venueType, normalized));
  }
  if (params.capacity != null) conditions.push(gte(venues.capacityMax, params.capacity));

  if (params.indoor && params.indoor !== "both") {
    conditions.push(ilike(venues.indoorOutdoor, `%${params.indoor}%`));
  }
  if (params.catering && params.catering !== "both") {
    conditions.push(ilike(venues.catering, `%${params.catering}%`));
  }

  const where = and(...conditions);

  const orderBy = (() => {
    switch (params.sort) {
      case "rating":
        return [desc(venues.googleRating), desc(venues.reviewCount)];
      case "reviews":
        return [desc(venues.reviewCount), desc(venues.googleRating)];
      case "capacity":
        return [desc(venues.capacityMax)];
      case "score":
      default:
        return [desc(venues.weddingReadinessScore), desc(venues.reviewCount)];
    }
  })();

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(venues)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(venues)
      .where(where),
  ]);

  return {
    venues: items,
    total: totalRow[0]?.count ?? 0,
    page: Math.floor(offset / limit) + 1,
  };
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const [row] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
  return row ?? null;
}

export async function getVenuesByRegion(
  region: string,
  limit = 24,
): Promise<Venue[]> {
  return db
    .select()
    .from(venues)
    .where(and(eq(venues.region, region), gte(venues.weddingReadinessScore, 50)))
    .orderBy(desc(venues.weddingReadinessScore), desc(venues.reviewCount))
    .limit(limit);
}

/**
 * Find venues geographically near a reference point.
 * Uses squared lat/lng diff as a cheap proximity proxy — good enough
 * for sorting within Ontario where curvature distortion is negligible.
 * Falls back to score-ordering within the same region when no coords.
 */
export async function getSimilarVenues(opts: {
  region: string | null;
  lat: string | number | null;
  lng: string | number | null;
  excludeId: number;
  limit?: number;
}): Promise<Venue[]> {
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 12);

  const conditions = [
    ne(venues.id, opts.excludeId),
    gte(venues.weddingReadinessScore, 50),
    or(eq(venues.googleClosed, "no"), sql`${venues.googleClosed} is null`)!,
  ];
  if (opts.region) conditions.push(eq(venues.region, opts.region));

  const hasCoords = opts.lat != null && opts.lng != null;
  const lat = hasCoords ? Number(opts.lat) : null;
  const lng = hasCoords ? Number(opts.lng) : null;

  const orderBy = hasCoords && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? [
        sql`(${venues.lat}::float - ${lat}) * (${venues.lat}::float - ${lat}) + (${venues.lng}::float - ${lng}) * (${venues.lng}::float - ${lng}) ASC NULLS LAST`,
      ]
    : [desc(venues.weddingReadinessScore), desc(venues.reviewCount)];

  return db
    .select()
    .from(venues)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit);
}

export async function getFeaturedVenues(limit = 6): Promise<Venue[]> {
  return db
    .select()
    .from(venues)
    .where(gte(venues.weddingReadinessScore, 70))
    .orderBy(desc(venues.weddingReadinessScore), desc(venues.reviewCount))
    .limit(limit);
}

export type VendorListParams = {
  region?: string;
  city?: string;
  category?: string;
  priceTier?: string;
  /** Exclude Pic Booth — pinned card renders it separately to avoid duplicates */
  excludePicBooth?: boolean;
  limit?: number;
  offset?: number;
};

export async function listVendors(
  params: VendorListParams,
): Promise<{ vendors: Vendor[]; total: number; page: number }> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions = [
    or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
  ];
  if (params.region) conditions.push(eq(vendors.region, params.region));
  if (params.city) conditions.push(ilike(vendors.city, `%${params.city}%`));
  if (params.category) conditions.push(eq(vendors.category, params.category));
  if (params.priceTier) conditions.push(eq(vendors.priceTier, params.priceTier));
  if (params.excludePicBooth) conditions.push(sql`${vendors.isPicBooth} is not true`);

  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(vendors)
      .where(where)
      .orderBy(
        desc(vendors.featured),
        desc(vendors.vendorReadinessScore),
        desc(vendors.googleRating),
        desc(vendors.reviewCount),
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(where),
  ]);

  return {
    vendors: items,
    total: totalRow[0]?.count ?? 0,
    page: Math.floor(offset / limit) + 1,
  };
}

/** Find vendors in same category + region, excluding this one. Sort by readiness, then rating. */
export async function getSimilarVendors(opts: {
  category: string;
  region: string | null;
  excludeId: number;
  limit?: number;
}): Promise<Vendor[]> {
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 12);

  const conditions = [
    eq(vendors.category, opts.category),
    ne(vendors.id, opts.excludeId),
    or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
  ];
  if (opts.region) conditions.push(eq(vendors.region, opts.region));

  return db
    .select()
    .from(vendors)
    .where(and(...conditions))
    .orderBy(
      desc(vendors.vendorReadinessScore),
      desc(vendors.googleRating),
      desc(vendors.reviewCount),
    )
    .limit(limit);
}

/** Venues that recommend this vendor (Pass-2 preferred-vendor edges). */
export async function getVenuesRecommendingVendor(
  vendorId: number,
  limit = 6,
): Promise<Venue[]> {
  const rows = await db
    .selectDistinct({
      id: venues.id,
      placeId: venues.placeId,
      slug: venues.slug,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      region: venues.region,
      province: venues.province,
      postalCode: venues.postalCode,
      phone: venues.phone,
      website: venues.website,
      email: venues.email,
      category: venues.category,
      venueType: venues.venueType,
      capacityMin: venues.capacityMin,
      capacityMax: venues.capacityMax,
      coordinatorName: venues.coordinatorName,
      coordinatorEmail: venues.coordinatorEmail,
      coordinatorPhone: venues.coordinatorPhone,
      catering: venues.catering,
      accommodations: venues.accommodations,
      indoorOutdoor: venues.indoorOutdoor,
      hasWeddingsPage: venues.hasWeddingsPage,
      weddingsPageUrl: venues.weddingsPageUrl,
      hasPackages: venues.hasPackages,
      packages: venues.packages,
      hasPricing: venues.hasPricing,
      hasTestimonials: venues.hasTestimonials,
      bookingPlatform: venues.bookingPlatform,
      instagramHandle: venues.instagramHandle,
      googleRating: venues.googleRating,
      reviewCount: venues.reviewCount,
      googleClosed: venues.googleClosed,
      weddingReadinessScore: venues.weddingReadinessScore,
      scoreReasoning: venues.scoreReasoning,
      description: venues.description,
      lat: venues.lat,
      lng: venues.lng,
      tier: venues.tier,
      claimed: venues.claimed,
      verified: venues.verified,
      featured: venues.featured,
      websiteStatus: venues.websiteStatus,
      lastGoogleSync: venues.lastGoogleSync,
      lastWebsiteCheck: venues.lastWebsiteCheck,
      lastVerified: venues.lastVerified,
      source: venues.source,
      createdAt: venues.createdAt,
      updatedAt: venues.updatedAt,
    })
    .from(vendorRelationships)
    .innerJoin(venues, eq(venues.id, vendorRelationships.sourceVenueId))
    .where(eq(vendorRelationships.recommendedVendorId, vendorId))
    .limit(limit);

  return rows as Venue[];
}

/** Aggregate vendor count per category (excludes Google-closed listings). */
export async function getVendorCountsByCategory(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      category: vendors.category,
      count: sql<number>`count(*)::int`,
    })
    .from(vendors)
    .where(or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!)
    .groupBy(vendors.category);

  const out: Record<string, number> = {};
  for (const r of rows) if (r.category) out[r.category] = r.count;
  return out;
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const [row] = await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1);
  return row ?? null;
}

export async function getNearbyVendors(opts: {
  city: string | null;
  region: string | null;
  categories?: string[];
  limit?: number;
}): Promise<Vendor[]> {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 50);
  const conditions = [
    or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
  ];
  if (opts.region) conditions.push(eq(vendors.region, opts.region));
  if (opts.categories && opts.categories.length > 0) {
    conditions.push(sql`${vendors.category} = ANY(${opts.categories})`);
  }
  return db
    .select()
    .from(vendors)
    .where(and(...conditions))
    .orderBy(
      desc(vendors.isPicBooth),
      desc(vendors.featured),
      desc(vendors.googleRating),
    )
    .limit(limit);
}

export async function getAllVenueSlugs(): Promise<{ slug: string; updatedAt: Date | null }[]> {
  return db
    .select({ slug: venues.slug, updatedAt: venues.updatedAt })
    .from(venues)
    .where(gte(venues.weddingReadinessScore, 50))
    .orderBy(asc(venues.slug));
}
