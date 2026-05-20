import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { StagAndDoeDashboard } from "@/components/plan/StagAndDoeDashboard";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { StagAndDoeState } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stag & Doe Planner | Ontario Wedding Vendors",
  description:
    "Free Stag & Doe / Jack & Jill fundraiser planner — track revenue from tickets, games, 50/50, auctions. Subtract expenses to see net profit toward your wedding goal.",
  alternates: { canonical: "/plan/stag-and-doe" },
};

export default async function StagAndDoePage() {
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  let initialState: StagAndDoeState | null = null;
  try {
    const [row] = await db
      .select({ stagAndDoe: weddingPlans.stagAndDoe })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (row?.stagAndDoe) {
      initialState = row.stagAndDoe as StagAndDoeState;
    }
  } catch (err) {
    console.error("[/plan/stag-and-doe] failed to load existing state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="stag-and-doe" />

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Planner
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Stag &amp; Doe <em className="italic text-rose">planner</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Track ticket sales, game revenue, and expenses for your Stag &amp; Doe
            fundraiser. See your running total against your wedding goal in
            real time. Unique to Ontario — no login needed, saved automatically.
          </p>
        </header>

        <StagAndDoeDashboard sessionId={sessionId} initialState={initialState} />
      </div>
    </main>
  );
}
