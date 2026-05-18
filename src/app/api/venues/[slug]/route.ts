import { NextResponse } from "next/server";
import { getVenueBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  try {
    const venue = await getVenueBySlug(slug);
    if (!venue) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ((venue.weddingReadinessScore ?? 0) < 50) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(venue);
  } catch (err) {
    console.error("[api/venues/[slug]] GET failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
