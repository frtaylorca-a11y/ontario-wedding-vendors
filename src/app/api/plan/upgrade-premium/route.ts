import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Manual premium-tier flip for testing.
 *
 * No payment processing — sets tier='premium' and stamps
 * premium_activated_at. Stripe + billing get wired in a later pass.
 *
 * POST /api/plan/upgrade-premium
 *   → { ok: true, tier: 'premium' } on success
 *   → 401 if no session, 404 if no plan row yet
 */
export async function POST() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const [existing] = await db
    .select({ id: weddingPlans.id })
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "No plan to upgrade" }, { status: 404 });
  }

  await db
    .update(weddingPlans)
    .set({
      tier:               "premium",
      premiumActivatedAt: new Date(),
      premiumExpiresAt:   null, /* null = lifetime / monthly handled later */
      updatedAt:          new Date(),
    })
    .where(eq(weddingPlans.sessionId, sessionId));

  return NextResponse.json({ ok: true, tier: "premium" });
}
