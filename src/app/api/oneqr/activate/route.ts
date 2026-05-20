import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/oneqr/activate
 *
 * Bundles the current plan state and posts it to ONEQR_API_URL/events to
 * provision a OneQR experience. On success, stores the returned slug + URLs
 * on the wedding_plans row.
 *
 * Graceful fallback when ONEQR_API_URL is unset → 503 "coming soon", plan
 * data is still saved locally so the user isn't blocked.
 */
export async function POST() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const apiUrl = process.env.ONEQR_API_URL;
  const apiKey = process.env.ONEQR_API_KEY;
  const webhookBase = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.ONEQR_OWV_WEBHOOK_URL ?? null;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "oneqr_not_configured",
        message: "OneQR activation coming soon — your data is saved and ready.",
      },
      { status: 503 },
    );
  }

  /* Load the full plan + venue join so we can ship a complete brief */
  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let venue: { name: string | null; address: string | null; region: string | null; city: string | null } | null = null;
  if (plan.venueId != null) {
    const [v] = await db
      .select({
        name:    venues.name,
        address: venues.address,
        region:  venues.region,
        city:    venues.city,
      })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    venue = v ?? null;
  }

  const guestCount = Array.isArray(plan.guestList)
    ? (plan.guestList as unknown[]).length
    : plan.guestCount ?? 0;

  const payload = {
    source: "ontario-wedding-vendors",
    /* OneQR uses this opaque id when calling our RSVP webhook so we can
     * match incoming RSVPs back to the right plan row without exposing
     * the session_id cookie. */
    owvPlanRef:  sessionId,
    owvWebhookBaseUrl: webhookBase
      ? `${webhookBase.replace(/\/$/, "")}/api/rsvp`
      : null,
    weddingDate: plan.weddingDate,
    venue: venue
      ? {
          name:    venue.name,
          address: venue.address,
          city:    venue.city,
          region:  venue.region,
        }
      : null,
    guestCount,
    vendors:  plan.bookedVendors ?? {},
    music:    plan.musicSelections ?? null,
    itinerary: plan.itinerary ?? [],
    guests:   plan.guestList ?? [],
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, "")}/events`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-OneQR-Source": "owv",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[oneqr/activate] network error", err);
    return NextResponse.json({ error: "oneqr_network_error" }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[oneqr/activate] non-OK", response.status, text.slice(0, 500));
    return NextResponse.json(
      { error: "oneqr_upstream_error", status: response.status },
      { status: 502 },
    );
  }

  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  const slug         = typeof data.slug         === "string" ? data.slug         : null;
  const qrCodeUrl    = typeof data.qrCodeUrl    === "string" ? data.qrCodeUrl    : null;
  const djPortalUrl  = typeof data.djPortalUrl  === "string" ? data.djPortalUrl  : null;
  const adminUrl     = typeof data.adminUrl     === "string" ? data.adminUrl     : null;

  if (!slug) {
    return NextResponse.json(
      { error: "oneqr_missing_slug", message: "OneQR returned no slug" },
      { status: 502 },
    );
  }

  await db
    .update(weddingPlans)
    .set({
      oneqrSlug:        slug,
      oneqrActivatedAt: new Date(),
      oneqrQrCodeUrl:   qrCodeUrl,
      oneqrDjPortalUrl: djPortalUrl,
      oneqrAdminUrl:    adminUrl,
      updatedAt:        new Date(),
    })
    .where(eq(weddingPlans.sessionId, sessionId));

  return NextResponse.json({
    ok: true,
    slug,
    qrCodeUrl,
    djPortalUrl,
    adminUrl,
    publicUrl: `https://oneqr.events/e/${slug}`,
  });
}
