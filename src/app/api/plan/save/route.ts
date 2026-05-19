import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

const bookedVendorSchema = z.object({
  vendorId: z.number().int().nullable(),
  suggestedId: z.number().int().nullable(),
  name: z.string(),
  category: z.string(),
  city: z.string().nullable(),
  rating: z.number().nullable(),
  isUserSuggested: z.boolean(),
  isPicBooth: z.boolean(),
  bookedAt: z.string(),
});

/* All fields optional — each client (wedding planner / Stag & Doe) sends only what it owns */
const planSchema = z.object({
  totalBudget:    z.number().int().min(0).max(1_000_000).optional(),
  guestCount:     z.number().int().min(1).max(2000).optional(),
  region:         z.string().max(100).optional(),
  weddingDate:    z.string().nullable().optional(),
  venueId:        z.number().int().nullable().optional(),
  bookedVendors:  z.record(z.string(), bookedVendorSchema).optional(),
  stagAndDoe:     z.unknown().optional(), /* validated client-side; arbitrary JSONB persisted */
});

export async function POST(request: Request) {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  /* Build a partial-update payload: only include fields the client sent.
   * This lets the wedding-planner and Stag-and-Doe pages save independently
   * without clobbering each other's state. */
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  const insertValues: Record<string, unknown> = { sessionId };

  if (data.totalBudget   !== undefined) { updateSet.totalBudget   = data.totalBudget;   insertValues.totalBudget   = data.totalBudget;   }
  if (data.guestCount    !== undefined) { updateSet.guestCount    = data.guestCount;    insertValues.guestCount    = data.guestCount;    }
  if (data.region        !== undefined) { updateSet.region        = data.region;        insertValues.region        = data.region;        }
  if (data.weddingDate   !== undefined) { updateSet.weddingDate   = data.weddingDate;   insertValues.weddingDate   = data.weddingDate;   }
  if (data.venueId       !== undefined) { updateSet.venueId       = data.venueId;       insertValues.venueId       = data.venueId;       }
  if (data.bookedVendors !== undefined) { updateSet.bookedVendors = data.bookedVendors; insertValues.bookedVendors = data.bookedVendors; }
  if (data.stagAndDoe    !== undefined) { updateSet.stagAndDoe    = data.stagAndDoe;    insertValues.stagAndDoe    = data.stagAndDoe;    }

  try {
    await db
      .insert(weddingPlans)
      .values(insertValues as { sessionId: string })
      .onConflictDoUpdate({
        target: weddingPlans.sessionId,
        set: updateSet,
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[plan/save] failed:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function GET() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) return NextResponse.json({ plan: null });

  const [row] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  return NextResponse.json({ plan: row ?? null });
}
