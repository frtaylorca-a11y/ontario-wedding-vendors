import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { MusicPlanner } from "@/components/plan/MusicPlanner";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { MusicSelections } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Music | Ontario Wedding Vendors",
  description:
    "Capture your wedding music preferences — first dance, key moments, vibe, do-not-play list. Activates the OneQR DJ portal with 16,000+ songs.",
  alternates: { canonical: "/plan/music" },
};

export default async function MusicPage() {
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  let initial: MusicSelections | null = null;
  try {
    const [row] = await db
      .select({ musicSelections: weddingPlans.musicSelections })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (row?.musicSelections) {
      initial = row.musicSelections as MusicSelections;
    }
  } catch (err) {
    console.error("[/plan/music] failed to load state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="music" />

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Music
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your <em className="italic text-rose">wedding soundtrack</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Capture the songs that matter most. The full 16,000-song library
            and your DJ&rsquo;s working playlist live inside OneQR — this page
            just collects the must-haves so they ship through on activation.
          </p>
        </header>

        <MusicPlanner sessionId={sessionId} initial={initial} />
      </div>
    </main>
  );
}
