import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import type { Dietary, GuestEntry, Rsvp } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

/**
 * POST /api/rsvp/[planId]
 *
 * Webhook receiver for RSVPs submitted on OneQR's wedding-day URL
 * (oneqr.events/e/[slug]). `planId` is the opaque owvPlanRef OWV passed
 * to OneQR at activation time — currently equal to wedding_plans.session_id.
 *
 * Authentication: shared secret in the Authorization header, set as
 * ONEQR_RSVP_WEBHOOK_SECRET in OWV's env. OneQR must include
 *   Authorization: Bearer <secret>
 * to be accepted.
 *
 * Body shape (per the spec):
 *   { guestName, plusOne, attending, meal, dietary, songRequest, message }
 *
 * Effect: appends a new GuestEntry to wedding_plans.guest_list with the
 * RSVP mapped to our internal {invited|confirmed|declined|maybe} model.
 * Idempotent on (guestName + planId) — re-submissions overwrite the prior
 * entry rather than duplicate it.
 */

const rsvpSchema = z.object({
  guestName:    z.string().min(1).max(120),
  plusOne:      z.string().max(120).nullable().optional(),
  attending:    z.enum(["yes", "no", "maybe"]),
  meal:         z.string().max(120).nullable().optional(),
  dietary:      z.string().max(200).nullable().optional(),
  songRequest:  z.string().max(200).nullable().optional(),
  message:      z.string().max(2000).nullable().optional(),
});

function attendingToRsvp(a: "yes" | "no" | "maybe"): Rsvp {
  if (a === "yes")   return "confirmed";
  if (a === "no")    return "declined";
  return "maybe";
}

function dietaryToCanon(raw: string | null | undefined): { dietary: Dietary; note?: string } {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return { dietary: "none" };
  if (s.includes("vegan"))      return { dietary: "vegan" };
  if (s.includes("vegetarian")) return { dietary: "vegetarian" };
  if (s.includes("gluten"))     return { dietary: "gluten-free" };
  if (s.includes("halal"))      return { dietary: "halal" };
  if (s.includes("kosher"))     return { dietary: "kosher" };
  return { dietary: "other", note: raw ?? undefined };
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  /* Shared-secret auth — OneQR must send the bearer we configured */
  const expected = process.env.ONEQR_RSVP_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[rsvp] ONEQR_RSVP_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const supplied = auth.replace(/^Bearer\s+/i, "").trim();
  if (supplied !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { planId } = await params;
  if (!planId) {
    return NextResponse.json({ error: "missing_plan_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const rsvpIn = parsed.data;

  /* Resolve planId to a wedding_plans row. We accept either the session_id
   * (what OWV stored in oneqr_slug? no — OWV passed session_id as owvPlanRef
   * to OneQR; OneQR echoes it here) OR the oneqr_slug as a secondary lookup. */
  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, planId))
    .limit(1);

  let planRow = plan;
  if (!planRow) {
    const [bySlug] = await db
      .select()
      .from(weddingPlans)
      .where(eq(weddingPlans.oneqrSlug, planId))
      .limit(1);
    planRow = bySlug;
  }
  if (!planRow) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  /* Merge into existing guest list — overwrite on name match, else append.
   * Match is case-insensitive on "firstName lastName". */
  const existing = (Array.isArray(planRow.guestList) ? planRow.guestList : []) as GuestEntry[];
  const { firstName, lastName } = splitName(rsvpIn.guestName);
  const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

  const { dietary, note } = dietaryToCanon(rsvpIn.dietary);
  const rsvpStatus = attendingToRsvp(rsvpIn.attending);

  const incoming: GuestEntry = {
    id:         `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    firstName,
    lastName,
    rsvp:       rsvpStatus,
    dietary,
    dietaryNote: note,
    tableNumber: null,
    plusOne:    !!rsvpIn.plusOne,
    plusOneName: rsvpIn.plusOne ?? undefined,
    notes: [
      rsvpIn.meal       ? `Meal: ${rsvpIn.meal}`         : null,
      rsvpIn.songRequest ? `Song: ${rsvpIn.songRequest}` : null,
      rsvpIn.message     ? `Message: ${rsvpIn.message}`  : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined,
  };

  const matchIdx = existing.findIndex((g) =>
    `${g.firstName} ${g.lastName}`.trim().toLowerCase() === fullName,
  );

  let nextList: GuestEntry[];
  if (matchIdx >= 0) {
    /* Preserve the existing id + table assignment when overwriting */
    nextList = [...existing];
    nextList[matchIdx] = {
      ...incoming,
      id:          existing[matchIdx].id,
      tableNumber: existing[matchIdx].tableNumber,
    };
  } else {
    nextList = [...existing, incoming];
  }

  await db
    .update(weddingPlans)
    .set({ guestList: nextList, updatedAt: new Date() })
    .where(eq(weddingPlans.id, planRow.id));

  return NextResponse.json({
    ok: true,
    matched: matchIdx >= 0 ? "updated" : "inserted",
    guest: { firstName, lastName, rsvp: rsvpStatus },
  });
}
