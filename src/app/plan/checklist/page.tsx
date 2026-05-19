import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { ChecklistDashboard } from "@/components/plan/ChecklistDashboard";
import type { ChecklistTasksBlob } from "@/lib/checklist";
import type { BookedVendor } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Checklist | Ontario Wedding Vendors",
  description:
    "Backwards-counting wedding checklist — 18 months to wedding day. Auto-tracks booked vendors, flags overdue tasks, syncs to your planner.",
  alternates: { canonical: "/plan/checklist" },
};

export default async function ChecklistPage() {
  const sessionId = (await readPlanSessionId()) ?? crypto.randomUUID();

  let weddingDate: string | null = null;
  let bookedVendors: Record<string, BookedVendor> = {};
  let checklistTasks: ChecklistTasksBlob | null = null;

  try {
    const [row] = await db
      .select({
        weddingDate:    weddingPlans.weddingDate,
        bookedVendors:  weddingPlans.bookedVendors,
        checklistTasks: weddingPlans.checklistTasks,
      })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (row) {
      weddingDate = row.weddingDate ?? null;
      bookedVendors = (row.bookedVendors as Record<string, BookedVendor>) ?? {};
      checklistTasks = (row.checklistTasks as ChecklistTasksBlob) ?? null;
    }
  } catch (err) {
    console.error("[/plan/checklist] failed to load state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <nav aria-label="Planning tools" className="mb-8 flex flex-wrap gap-2 border-b border-border-light pb-4">
          <Link
            href={"/plan" as Route}
            className="inline-flex items-center rounded-pill border border-border bg-white px-5 py-2 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Wedding Planner
          </Link>
          <Link
            href={"/plan/stag-and-doe" as Route}
            className="inline-flex items-center rounded-pill border border-border bg-white px-5 py-2 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Stag &amp; Doe
          </Link>
          <Link
            href={"/plan/checklist" as Route}
            aria-current="page"
            className="inline-flex items-center rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white"
          >
            Checklist
            <span className="ml-2 rounded-pill bg-white/30 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]">
              New
            </span>
          </Link>
        </nav>

        <header className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Checklist
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your <em className="italic text-rose">wedding timeline</em>, counted backwards
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Set a wedding date on the planner and the full 18-month timeline
            unlocks here — each task with a due date derived from your wedding
            date, flagged when overdue, and linked to vendor categories you
            haven&rsquo;t booked yet.
          </p>
        </header>

        <ChecklistDashboard
          sessionId={sessionId}
          weddingDate={weddingDate}
          bookedVendors={bookedVendors}
          initialTasks={checklistTasks}
        />
      </div>
    </main>
  );
}
