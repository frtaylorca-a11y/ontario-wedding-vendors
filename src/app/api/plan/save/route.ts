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

/* All fields optional — each client (wedding planner / Stag & Doe / Checklist) sends only what it owns */
const planSchema = z.object({
  totalBudget:    z.number().int().min(0).max(1_000_000).optional(),
  guestCount:     z.number().int().min(1).max(2000).optional(),
  region:         z.string().max(100).optional(),
  weddingDate:    z.string().nullable().optional(),
  venueId:        z.number().int().nullable().optional(),
  bookedVendors:  z.record(z.string(), bookedVendorSchema).optional(),
  savedVendors:   z.record(z.string(), z.array(z.string().max(255))).optional(),
  stagAndDoe:     z.unknown().optional(), /* validated client-side; arbitrary JSONB persisted */
  budgetCategoryStates: z.unknown().optional(), /* { order, toggles } — see plan-state.ts */
  checklistTasks: z.unknown().optional(), /* per-task done state + custom-added tasks */
  musicSelections: z.unknown().optional(), /* MusicSelections — see plan-state.ts */
  guestList:       z.unknown().optional(), /* GuestEntry[] */
  itinerary:       z.unknown().optional(), /* ItineraryEntry[] */
  alertPhone:     z.string().max(50).nullable().optional(),
  alertEmail:     z.string().max(255).nullable().optional(),
  alertChannel:   z.enum(["sms", "email", "both", "none"]).nullable().optional(),
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
  if (data.savedVendors  !== undefined) { updateSet.savedVendors  = data.savedVendors;  insertValues.savedVendors  = data.savedVendors;  }
  if (data.stagAndDoe    !== undefined) { updateSet.stagAndDoe    = data.stagAndDoe;    insertValues.stagAndDoe    = data.stagAndDoe;    }
  if (data.budgetCategoryStates !== undefined) { updateSet.budgetCategoryStates = data.budgetCategoryStates; insertValues.budgetCategoryStates = data.budgetCategoryStates; }
  if (data.checklistTasks !== undefined) { updateSet.checklistTasks = data.checklistTasks; insertValues.checklistTasks = data.checklistTasks; }
  if (data.musicSelections !== undefined) { updateSet.musicSelections = data.musicSelections; insertValues.musicSelections = data.musicSelections; }
  if (data.guestList       !== undefined) { updateSet.guestList       = data.guestList;       insertValues.guestList       = data.guestList;       }
  if (data.itinerary       !== undefined) { updateSet.itinerary       = data.itinerary;       insertValues.itinerary       = data.itinerary;       }
  if (data.alertPhone   !== undefined) { updateSet.alertPhone   = data.alertPhone;   insertValues.alertPhone   = data.alertPhone;   }
  if (data.alertEmail   !== undefined) { updateSet.alertEmail   = data.alertEmail;   insertValues.alertEmail   = data.alertEmail;   }
  if (data.alertChannel !== undefined) { updateSet.alertChannel = data.alertChannel; insertValues.alertChannel = data.alertChannel; }

  /* Session / attribution capture — INSERT-only fields. Read from request
   * headers + the AttributionCapture cookie. Setting these on the INSERT
   * side of the upsert means existing rows keep their original values. */
  const headers = request.headers;
  const xff = headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    xff.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    null;
  const userAgent = headers.get("user-agent") ?? null;
  const referrer  = headers.get("referer") ?? null;
  const deviceType = userAgent ? deviceTypeFromUa(userAgent) : null;

  const attribution = readAttributionCookie(headers.get("cookie"));

  if (ipAddress)   insertValues.ipAddress  = ipAddress.slice(0, 45);
  if (userAgent)   insertValues.userAgent  = userAgent;
  if (referrer)    insertValues.referrer   = referrer.slice(0, 500);
  if (deviceType)  insertValues.deviceType = deviceType;
  if (attribution) {
    if (attribution.utmSource)      insertValues.utmSource   = attribution.utmSource.slice(0, 100);
    if (attribution.utmMedium)      insertValues.utmMedium   = attribution.utmMedium.slice(0, 100);
    if (attribution.utmCampaign)    insertValues.utmCampaign = attribution.utmCampaign.slice(0, 100);
    if (attribution.utmContent)     insertValues.utmContent  = attribution.utmContent.slice(0, 100);
    if (attribution.firstPage)      insertValues.firstPage   = attribution.firstPage.slice(0, 500);
    if (attribution.firstVisitedAt) insertValues.firstVisitedAt = new Date(attribution.firstVisitedAt);
  }

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

function deviceTypeFromUa(ua: string): "mobile" | "tablet" | "desktop" {
  const lc = ua.toLowerCase();
  /* iPad announces both Mobile and iPad — check tablet first. */
  if (/ipad|tablet/.test(lc)) return "tablet";
  if (/android(?!.*mobile)/.test(lc)) return "tablet"; /* Android tablets often lack "mobile" */
  if (/mobile|android|iphone|ipod/.test(lc)) return "mobile";
  return "desktop";
}

function readAttributionCookie(cookieHeader: string | null): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  firstPage?: string;
  firstVisitedAt?: string;
} | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(/;\s*/);
  const target = cookies.find((c) => c.startsWith("owv_attribution="));
  if (!target) return null;
  try {
    const raw = decodeURIComponent(target.slice("owv_attribution=".length));
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string): string | undefined => {
      const v = parsed[k];
      return typeof v === "string" && v.length > 0 ? v : undefined;
    };
    return {
      utmSource:      pick("utmSource"),
      utmMedium:      pick("utmMedium"),
      utmCampaign:    pick("utmCampaign"),
      utmContent:     pick("utmContent"),
      firstPage:      pick("firstPage"),
      firstVisitedAt: pick("firstVisitedAt"),
    };
  } catch {
    return null;
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
