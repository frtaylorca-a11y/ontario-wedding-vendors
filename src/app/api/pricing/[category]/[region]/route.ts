import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendorPricingData } from "@/lib/schema";

export const dynamic = "force-dynamic";

const MIN_SCRAPED_SAMPLES = 5;

type Params = Promise<{ category: string; region: string }>;

/**
 * GET /api/pricing/[category]/[region]
 *
 * Returns the best available pricing data for (category, region):
 *   - If ≥5 scraped samples exist (summed across tiers): prefer scraped rows.
 *   - Otherwise fall back to "published" rows.
 *
 * Response: { source, tiers: { budget, mid, luxury }, totalSamples }
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { category, region } = await params;

  const rows = await db
    .select()
    .from(vendorPricingData)
    .where(and(eq(vendorPricingData.category, category), eq(vendorPricingData.region, region)))
    .orderBy(desc(vendorPricingData.lastUpdated));

  if (rows.length === 0) {
    return NextResponse.json({ source: null, tiers: {}, totalSamples: 0 }, { status: 404 });
  }

  const scraped = rows.filter((r) => r.source === "scraped");
  const scrapedSamples = scraped.reduce((sum, r) => sum + (r.sampleSize ?? 0), 0);
  const preferScraped = scrapedSamples >= MIN_SCRAPED_SAMPLES;
  const chosen = preferScraped ? scraped : rows.filter((r) => r.source === "published");

  const tiers: Record<string, { rangeMin: number | null; rangeMax: number | null; median: number | null; sampleSize: number }> = {};
  for (const r of chosen) {
    if (!r.tier) continue;
    tiers[r.tier] = {
      rangeMin:   r.rangeMin   ?? null,
      rangeMax:   r.rangeMax   ?? null,
      median:     r.median     ?? null,
      sampleSize: r.sampleSize ?? 0,
    };
  }

  return NextResponse.json({
    source:       preferScraped ? "scraped" : "published",
    totalSamples: preferScraped ? scrapedSamples : 0,
    tiers,
  });
}
