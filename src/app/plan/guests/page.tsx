import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { GuestListPlanner } from "@/components/plan/GuestListPlanner";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { GuestEntry } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Guest List | Ontario Wedding Vendors",
  description:
    "Track RSVPs, dietary needs, table assignments, and plus-ones for your wedding guest list. Export to CSV or copy a clean summary for your caterer.",
  alternates: { canonical: "/plan/guests" },
};

export default async function GuestsPage() {
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  let initial: GuestEntry[] = [];
  try {
    const [row] = await db
      .select({ guestList: weddingPlans.guestList })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (Array.isArray(row?.guestList)) {
      initial = row.guestList as GuestEntry[];
    }
  } catch (err) {
    console.error("[/plan/guests] failed to load state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="guests" />

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Guests
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your <em className="italic text-rose">guest list</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Add guests one at a time or paste a list. Track RSVPs, dietary
            needs, and plus-ones — then export for your caterer in two clicks.
          </p>
        </header>

        <GuestListPlanner sessionId={sessionId} initial={initial} />
      </div>
    </main>
  );
}
