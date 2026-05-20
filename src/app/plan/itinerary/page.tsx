import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { ItineraryPlanner } from "@/components/plan/ItineraryPlanner";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { ItineraryEntry } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Day Itinerary | Ontario Wedding Vendors",
  description:
    "Build your wedding day timeline — hair & makeup through last song. Generated from your ceremony time, with vendor tags and drag-to-reorder.",
  alternates: { canonical: "/plan/itinerary" },
};

export default async function ItineraryPage() {
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  let initial: ItineraryEntry[] = [];
  try {
    const [row] = await db
      .select({ itinerary: weddingPlans.itinerary })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (Array.isArray(row?.itinerary)) {
      initial = row.itinerary as ItineraryEntry[];
    }
  } catch (err) {
    console.error("[/plan/itinerary] failed to load state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="itinerary" />

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Itinerary
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your <em className="italic text-rose">wedding day</em>, hour by hour
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Anchor the timeline on your ceremony time and we&rsquo;ll
            pre-fill 14 events from hair &amp; makeup through the last song.
            Toggle the guest-visible flag to show events on OneQR.
          </p>
        </header>

        <ItineraryPlanner sessionId={sessionId} initial={initial} />
      </div>
    </main>
  );
}
