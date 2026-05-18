import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import { venues, vendors } from "./schema";
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
  if (params.type) conditions.push(eq(venues.venueType, params.type));
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

  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select()
      .from(vendors)
      .where(where)
      .orderBy(
        desc(vendors.isPicBooth),
        desc(vendors.featured),
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
