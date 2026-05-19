import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues as venuesTable } from "@/lib/schema";
import { getVendorsBySlugs, listVendors } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  /** Comma-separated vendor slugs — when provided, returns just those vendors
   *  (with proximity-decorated distanceKm if venue is also provided). */
  slugs: z.string().optional(),
  /** Venue slug — when provided alongside slugs (or as a list filter), distance is computed. */
  venue: z.string().max(255).optional(),
  radius: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const params = parsed.data;

  try {
    /* Optional venue lookup for distance decoration. */
    let venueLat: number | null = null;
    let venueLng: number | null = null;
    if (params.venue) {
      const [v] = await db
        .select({ lat: venuesTable.lat, lng: venuesTable.lng })
        .from(venuesTable)
        .where(eq(venuesTable.slug, params.venue))
        .limit(1);
      if (v) {
        const latNum = v.lat == null ? null : Number(v.lat);
        const lngNum = v.lng == null ? null : Number(v.lng);
        if (latNum != null && lngNum != null && Number.isFinite(latNum) && Number.isFinite(lngNum)) {
          venueLat = latNum;
          venueLng = lngNum;
        }
      }
    }

    /* Mode A: explicit slugs list (for saved-vendor hydration) */
    if (params.slugs) {
      const slugs = params.slugs.split(",").map((s) => s.trim()).filter(Boolean);
      const rows = await getVendorsBySlugs(slugs);
      const decorated = rows.map((v) => {
        if (venueLat == null || venueLng == null) return { ...v, distanceKm: null };
        const lat2 = v.lat == null ? null : Number(v.lat);
        const lng2 = v.lng == null ? null : Number(v.lng);
        if (lat2 == null || lng2 == null || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
          return { ...v, distanceKm: null };
        }
        const distanceKm = haversineKm(venueLat, venueLng, lat2, lng2);
        return { ...v, distanceKm };
      });
      return NextResponse.json({ vendors: decorated, total: decorated.length });
    }

    /* Mode B: standard list with optional proximity */
    const result = await listVendors({
      region: params.region,
      city: params.city,
      category: params.category,
      lat: venueLat ?? undefined,
      lng: venueLng ?? undefined,
      radiusKm: params.radius ?? (venueLat != null ? 100 : undefined),
      limit: params.limit,
      offset: params.offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/vendors] GET failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
