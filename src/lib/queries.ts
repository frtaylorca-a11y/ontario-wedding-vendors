import { cache } from "react";
import { and, asc, desc, eq, getTableColumns, gte, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { venues, vendors, vendorRelationships } from "./schema";
import type { Venue, Vendor } from "./schema";

/**
 * Site-wide live counts for trust bars, meta descriptions, and copy.
 * React's `cache()` dedupes within a single render pass — so Header,
 * generateMetadata, and any page reading these all share one round trip.
 */
export const getSiteStats = cache(async () => {
  const [venueRows, vendorRows, premierRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(venues)
      .where(gte(venues.weddingReadinessScore, 50)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(gte(vendors.vendorReadinessScore, 50)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(venues)
      .where(gte(venues.weddingReadinessScore, 90)),
  ]);

  return {
    venueCount:   venueRows[0]?.count   ?? 0,
    vendorCount:  vendorRows[0]?.count  ?? 0,
    premierCount: premierRows[0]?.count ?? 0,
  };
});

export type VenueListParams = {
  region?: string;
  city?: string;
  q?: string;
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
  if (params.q) {
    /* Name search for the planner venue-search input */
    conditions.push(ilike(venues.name, `%${params.q}%`));
  }
  if (params.type) {
    // DB stores "golf club" / "banquet hall"; URLs use "golf-club" / "banquet-hall"
    const normalized = params.type.replace(/-/g, " ").toLowerCase();
    conditions.push(eq(venues.venueType, normalized));
  }
  /* Capacity filter — include venues with unknown capacity so couples don't
   * miss listings just because we haven't enriched the data yet. The card
   * surfaces a "Capacity not listed — contact venue to confirm" note. */
  if (params.capacity != null) {
    conditions.push(
      or(gte(venues.capacityMax, params.capacity), sql`${venues.capacityMax} IS NULL`)!,
    );
  }

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
  /** Proximity matching: when lat/lng/radiusKm are all provided, vendors are
   *  filtered to those within `radiusKm` of (lat,lng) using a Haversine
   *  distance and the result `vendors[i].distanceKm` is populated. */
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
};

/* Admin note — pinning a vendor as a Recommended Partner:
 *   UPDATE vendors SET
 *     is_pinned = true,
 *     pinned_categories = ARRAY['photographer'],
 *     pinned_regions    = ARRAY['niagara','gta'],
 *     pinned_note       = 'Partner vendor — preferred-vendor agreement'
 *   WHERE slug = 'vendor-slug-here';
 *
 * Rules: only renders if the vendor falls within the active radius and
 * the current category/region is in pinned_categories/pinned_regions.
 * Max 2 pinned per category in a result page (enforced at render time). */

/** Vendor row decorated with a distance-to-venue value in kilometers, when proximity matching is in use. */
export type VendorWithDistance = Vendor & { distanceKm: number | null };

export async function listVendors(
  params: VendorListParams,
): Promise<{ vendors: VendorWithDistance[]; total: number; page: number }> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions = [
    or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
    /* Public listings exclude hidden rows. is_hidden defaults to
     * false; explicitly checking !=true to handle nulls as visible. */
    or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
  ];
  if (params.region) conditions.push(eq(vendors.region, params.region));
  if (params.city) conditions.push(ilike(vendors.city, `%${params.city}%`));
  if (params.category) conditions.push(eq(vendors.category, params.category));
  if (params.priceTier) conditions.push(eq(vendors.priceTier, params.priceTier));
  if (params.excludePicBooth) conditions.push(sql`${vendors.isPicBooth} is not true`);

  /* Proximity matching: Haversine distance in km. Earth radius = 6371. We compute
   * it inline so we can both filter by radius and sort closest-first. */
  const hasProximity =
    params.lat != null && params.lng != null && params.radiusKm != null &&
    Number.isFinite(params.lat) && Number.isFinite(params.lng);
  const distanceSql = hasProximity
    ? sql<number>`(
        CASE
          WHEN ${vendors.lat} IS NULL OR ${vendors.lng} IS NULL THEN NULL
          ELSE 6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${params.lat})) * cos(radians(${vendors.lat}::float)) *
              cos(radians(${vendors.lng}::float) - radians(${params.lng})) +
              sin(radians(${params.lat})) * sin(radians(${vendors.lat}::float))
            ))
          )
        END
      )`
    : null;

  if (hasProximity && distanceSql) {
    /* Only include vendors that (a) are within radius OR (b) have no coords
     * AND share the region — we don't want to exclude vendors missing lat/lng. */
    conditions.push(
      or(
        sql`${vendors.lat} is null OR ${vendors.lng} is null`,
        sql`${distanceSql} <= ${params.radiusKm}`,
      )!,
    );
  }

  const where = and(...conditions);

  /* Selection: all vendor columns plus a derived distanceKm (NULL when not in proximity mode). */
  const selection = {
    ...getTableColumns(vendors),
    distanceKm: distanceSql ?? sql<number | null>`NULL::float`,
  };

  /* Sort order — Recommended Partner pins first when they fall in
   * pinnedCategories + pinnedRegions, then featured, isPicBooth (photo_booth),
   * then proximity (when available), then readiness/rating/reviews.
   *
   * pinnedMatch is only "true" when category + region are both known and
   * appear in the vendor's pinned arrays. Otherwise it falls back to FALSE
   * so the order clause is well-defined. */
  const pinnedMatch = params.category && params.region
    ? sql<boolean>`(
        ${vendors.isPinned} = true
        AND ${params.category} = ANY(${vendors.pinnedCategories})
        AND ${params.region}   = ANY(${vendors.pinnedRegions})
      )`
    : params.category
      ? sql<boolean>`(
          ${vendors.isPinned} = true
          AND ${params.category} = ANY(${vendors.pinnedCategories})
        )`
      : sql<boolean>`false`;

  const orderBy: ReturnType<typeof desc>[] = [
    desc(pinnedMatch),
    desc(vendors.featured),
    desc(vendors.isPicBooth),
  ];
  if (hasProximity && distanceSql) orderBy.push(asc(distanceSql));
  orderBy.push(desc(vendors.vendorReadinessScore));
  orderBy.push(desc(vendors.googleRating));
  orderBy.push(desc(vendors.reviewCount));

  const [items, totalRow] = await Promise.all([
    db
      .select(selection)
      .from(vendors)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(where),
  ]);

  const decorated: VendorWithDistance[] = items.map((r) => {
    const distRaw = (r as { distanceKm: number | string | null }).distanceKm;
    const distNum = distRaw == null ? null : Number(distRaw);
    return {
      ...(r as Vendor),
      distanceKm: distNum != null && Number.isFinite(distNum) ? distNum : null,
    };
  });

  return {
    vendors: decorated,
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
    or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
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

/** Fetch a set of vendors by slug — used by the planner to hydrate saved vendor cards. */
export async function getVendorsBySlugs(slugs: string[]): Promise<Vendor[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select()
    .from(vendors)
    .where(
      and(
        sql`${vendors.slug} = ANY(${slugs})`,
        or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
      ),
    );
  return rows;
}

/** Aggregate vendor count per category (excludes Google-closed + hidden listings). */
export async function getVendorCountsByCategory(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      category: vendors.category,
      count: sql<number>`count(*)::int`,
    })
    .from(vendors)
    .where(
      and(
        or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
        or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
      ),
    )
    .groupBy(vendors.category);

  const out: Record<string, number> = {};
  for (const r of rows) if (r.category) out[r.category] = r.count;
  return out;
}

/** Vendor detail lookup. Returns null when hidden — public callers
 * should 404 in that case. Admin tools wanting to access hidden rows
 * should query the DB directly rather than going through this helper. */
export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const [row] = await db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.slug, slug),
        or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
      ),
    )
    .limit(1);
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
    or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
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

/* For sitemap generation — every open, non-hidden vendor with a
 * category gets its own /vendors/[category]/[slug] page, so each
 * one is a unique URL worth surfacing to search engines. Skips
 * google_closed='yes' and is_hidden=true rows. */
export async function getAllVendorSlugs(): Promise<
  { slug: string; category: string; updatedAt: Date | null }[]
> {
  return db
    .select({
      slug:      vendors.slug,
      category:  vendors.category,
      updatedAt: vendors.updatedAt,
    })
    .from(vendors)
    .where(
      and(
        or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
        or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
      ),
    )
    .orderBy(asc(vendors.slug));
}
