import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSiteStats } from "@/lib/queries";
import { venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { PlannerDashboard } from "@/components/plan/PlannerDashboard";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { BudgetCategoryStates, PlanState } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Planner | Ontario Wedding Vendors",
  description:
    "Free wedding budget calculator and vendor planner for Ontario couples. Pick your venue, set your budget, and your vendor list builds itself.",
  alternates: { canonical: "/plan" },
  robots: { index: true, follow: true },
};

export default async function PlanPage() {
  /* Cookie is set by middleware before this renders — falls back to a
   * placeholder UUID only if middleware somehow didn't run (shouldn't happen) */
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  /* Try loading any existing plan from DB. localStorage hydration happens on the client. */
  let initialPlan: Partial<PlanState> | null = null;
  try {
    const [row] = await db
      .select()
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (row) {
      initialPlan = {
        totalBudget: row.totalBudget ?? undefined,
        guestCount:  row.guestCount ?? undefined,
        region:      row.region ?? undefined,
        weddingDate: row.weddingDate ?? null,
        venueId:     row.venueId ?? null,
        bookedVendors: (row.bookedVendors as PlanState["bookedVendors"]) ?? {},
        savedVendors:  (row.savedVendors  as PlanState["savedVendors"])  ?? {},
        budgetCategoryStates:
          (row.budgetCategoryStates as BudgetCategoryStates | null) ?? undefined,
        partner1Name:    row.partner1Name ?? null,
        partner2Name:    row.partner2Name ?? null,
        musicSelections: (row.musicSelections as PlanState["musicSelections"]) ?? null,
        guestList:       (row.guestList       as PlanState["guestList"])       ?? [],
        itinerary:       (row.itinerary       as PlanState["itinerary"])       ?? [],
        oneqrSlug:        row.oneqrSlug ?? null,
        oneqrActivatedAt: row.oneqrActivatedAt
          ? row.oneqrActivatedAt.toISOString()
          : null,
        oneqrQrCodeUrl:   row.oneqrQrCodeUrl ?? null,
        oneqrDjPortalUrl: row.oneqrDjPortalUrl ?? null,
        oneqrAdminUrl:    row.oneqrAdminUrl ?? null,
      };

      /* Pull venue metadata for venue-aware pricing in the calculator */
      if (row.venueId != null) {
        const [v] = await db
          .select({
            name:        venues.name,
            city:        venues.city,
            venueType:   venues.venueType,
            capacityMax: venues.capacityMax,
            catering:    venues.catering,
          })
          .from(venues)
          .where(eq(venues.id, row.venueId))
          .limit(1);
        if (v) {
          initialPlan.venueName        = v.name ?? null;
          initialPlan.venueCity        = v.city ?? null;
          initialPlan.venueType        = v.venueType ?? null;
          initialPlan.venueCapacityMax = v.capacityMax ?? null;
          initialPlan.venueCatering    = v.catering ?? null;
        }
      }
    }
  } catch (err) {
    console.error("[/plan] failed to load existing plan", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="planner" />

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Planner
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Plan your <em className="italic text-rose">Ontario wedding</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Set your budget, pick your venue, and unlock a vendor list matched to
            your region. No login required — your plan is saved automatically.
          </p>
        </header>

        <PlannerDashboard
          sessionId={sessionId}
          initialPlan={initialPlan}
          totalVenueCount={(await getSiteStats().catch(() => null))?.venueCount}
        />
      </div>
    </main>
  );
}
