import { NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendors/counts?region=X
 * Returns { counts: { photographer: 64, ... } } for live-counting
 * the "Find N {category} in {region} →" labels in VendorSlots.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region");

  const conditions = [
    or(eq(vendors.googleClosed, "no"), sql`${vendors.googleClosed} is null`)!,
    /* Public-facing count — exclude hidden rows. Matches the filter
     * applied by listVendors() so the count and the listing agree. */
    or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
  ];
  if (region && region !== "other") {
    conditions.push(eq(vendors.region, region));
  }

  try {
    const rows = await db
      .select({
        category: vendors.category,
        count: sql<number>`count(*)::int`,
      })
      .from(vendors)
      .where(and(...conditions))
      .groupBy(vendors.category);

    const counts: Record<string, number> = {};
    for (const r of rows) if (r.category) counts[r.category] = r.count;
    return NextResponse.json({ counts });
  } catch (err) {
    console.error("[/api/vendors/counts] failed:", err);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
