import { cache } from "react";
import { and, asc, desc, eq, getTableColumns, gte, ilike, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { venues, vendors, vendorRelationships } from "./schema";
import type { Venue, Vendor } from "./schema";

/* ─── Vendor ranking formula ─────────────────────────────────────────
 * Composite score that drives every public vendor sort. The number
 * is a sum across four buckets:
 *   - tier boost: paid listings always above free (pinned: 1000,
 *     featured: 500, else 0)
 *   - Google quality: rating tiers + review-count tiers (max 35)
 *   - profile completeness: website + non-generic description +
 *     hero photo + phone + specialties + service-areas (max 40)
 *   - recency: small bump for recently bio-enriched rows (max 5)
 * Stored as vendors.display_rank_score by the import/enrichment paths
 * so the ORDER BY is a plain column read, not a per-query computation. */
export const DISPLAY_RANK_SCORE_SQL = sql<number>`(
  CASE
    WHEN ${vendors.isPinned} = true   THEN 1000
    WHEN ${vendors.isFeatured} = true THEN 500
    ELSE 0
  END
  + CASE
      WHEN ${vendors.googleRating} >= 4.8 THEN 20
      WHEN ${vendors.googleRating} >= 4.5 THEN 12
      WHEN ${vendors.googleRating} >= 4.0 THEN 6
      ELSE 0
    END
  + CASE
      WHEN ${vendors.reviewCount} >= 100 THEN 15
      WHEN ${vendors.reviewCount} >= 50  THEN 10
      WHEN ${vendors.reviewCount} >= 20  THEN 6
      WHEN ${vendors.reviewCount} >= 10  THEN 3
      ELSE 0
    END
  + CASE WHEN ${vendors.website} IS NOT NULL AND ${vendors.website} <> '' THEN 10 ELSE 0 END
  + CASE
      WHEN ${vendors.description} IS NOT NULL
        AND ${vendors.description} <> ''
        AND ${vendors.description} NOT LIKE '%highly-rated%'
        AND ${vendors.description} NOT LIKE '%wedding-ready%'
      THEN 8 ELSE 0
    END
  + CASE WHEN ${vendors.heroImage}      IS NOT NULL THEN 8 ELSE 0 END
  + CASE WHEN ${vendors.phone}          IS NOT NULL AND ${vendors.phone} <> '' THEN 5 ELSE 0 END
  + CASE WHEN ${vendors.specialties}    IS NOT NULL THEN 5 ELSE 0 END
  + CASE WHEN ${vendors.serviceAreas}   IS NOT NULL THEN 4 ELSE 0 END
  + CASE WHEN ${vendors.bioEnrichedAt}  > NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END
)`;

/* Recompute display_rank_score for every vendor row in one shot.
 * Safe to run multiple times; the result is idempotent for a given
 * snapshot of the data. Returns the number of rows updated. */
export async function recomputeAllDisplayRankScores(): Promise<number> {
  const res = await db
    .update(vendors)
    .set({
      displayRankScore: DISPLAY_RANK_SCORE_SQL,
      updatedAt:        new Date(),
    })
    .where(isNotNull(vendors.id))
    .returning({ id: vendors.id });
  return res.length;
}

/* Recompute the score for a single vendor row. Called by the import
 * + bio-enrichment paths after they mutate the row's other columns. */
export async function recomputeVendorDisplayRankScore(vendorId: number): Promise<void> {
  await db
    .update(vendors)
    .set({ displayRankScore: DISPLAY_RANK_SCORE_SQL })
    .where(eq(vendors.id, vendorId));
}

/* ─── Indexability gate ──────────────────────────────────────────────
 * A vendor's detail page is healthy enough to be indexed by Google
 * when ANY of these are true:
 *   1. The row has a real description AND has been through the
 *      bio-enrichment pipeline (bio_enriched_at IS NOT NULL).
 *      Catches enriched copy that doesn't trip the generic-phrase
 *      filter even when description is set.
 *   2. Cached Google reviews are present and non-empty. An empty
 *      array means "we checked Google and got zero reviews back" —
 *      different from "haven't checked yet" — but neither counts as
 *      indexable content on its own.
 *   3. The row has a strong Google signal (4.0+ stars, 10+ reviews)
 *      AND a hero image. A vendor with no bio but 4.8 stars and 200
 *      reviews still belongs in the index.
 *
 * Empty-shell pages (no description, no reviews, no rating) get
 * is_indexable=false and a robots:noindex,follow meta on their
 * detail page so Google leaves them out of the SERP — but the page
 * stays directly accessible at its URL.
 */
export const IS_INDEXABLE_SQL = sql<boolean>`(
  (${vendors.description} IS NOT NULL
    AND ${vendors.description} <> ''
    AND ${vendors.bioEnrichedAt} IS NOT NULL)
  OR (${vendors.reviewExcerpts} IS NOT NULL
    AND jsonb_array_length(${vendors.reviewExcerpts}) > 0)
  OR (${vendors.googleRating} >= 4.0
    AND ${vendors.reviewCount} >= 10
    AND ${vendors.heroImage} IS NOT NULL)
)`;

/* Bulk recompute is_indexable for every vendor row. */
export async function recomputeAllIsIndexable(): Promise<number> {
  const res = await db
    .update(vendors)
    .set({
      isIndexable: IS_INDEXABLE_SQL,
      updatedAt:   new Date(),
    })
    .where(isNotNull(vendors.id))
    .returning({ id: vendors.id });
  return res.length;
}

/* Per-row recompute. Called from the import + enrichment + review-
 * caching paths after they mutate the row's contributing columns. */
export async function recomputeVendorIsIndexable(vendorId: number): Promise<void> {
  await db
    .update(vendors)
    .set({ isIndexable: IS_INDEXABLE_SQL })
    .where(eq(vendors.id, vendorId));
}

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

  /* New ranking order — composite display_rank_score (computed by
   * the import + enrichment paths) carries the heavy weight. Legacy
   * vendor_readiness_score remains as a tiebreaker so vendors with
   * the same display score but a fuller historical profile still
   * sort up. The category/region pinnedMatch boost still runs FIRST
   * — that's the "Recommended Partner" surface and intentionally
   * outranks the algorithmic score. */
  const orderBy: ReturnType<typeof desc>[] = [
    desc(pinnedMatch),
    desc(vendors.isPicBooth),
  ];
  if (hasProximity && distanceSql) orderBy.push(asc(distanceSql));
  orderBy.push(desc(vendors.displayRankScore));
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
      desc(vendors.displayRankScore),
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
      desc(vendors.displayRankScore),
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

/* For sitemap generation — only open, non-hidden, AND
 * indexable vendors. The is_indexable gate keeps thin-content
 * pages (no description, no reviews, no rating signal) out of
 * the sitemap so they're not indexed by Google. The page itself
 * stays directly accessible at its URL — only the sitemap +
 * page-level robots meta tag gate on this flag. */
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
        eq(vendors.isIndexable, true),
      ),
    )
    .orderBy(asc(vendors.slug));
}
