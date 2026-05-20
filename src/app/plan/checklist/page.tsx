import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { ChecklistDashboard, type AlertChannel } from "@/components/plan/ChecklistDashboard";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import type { ChecklistTasksBlob } from "@/lib/checklist";
import type { BookedVendor } from "@/lib/plan-state";

const VALID_CHANNELS: ReadonlySet<AlertChannel> = new Set(["sms", "email", "both", "none"]);

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
  let alertPhone: string | null = null;
  let alertEmail: string | null = null;
  let alertChannel: AlertChannel | null = null;

  try {
    const [row] = await db
      .select({
        weddingDate:    weddingPlans.weddingDate,
        bookedVendors:  weddingPlans.bookedVendors,
        checklistTasks: weddingPlans.checklistTasks,
        alertPhone:     weddingPlans.alertPhone,
        alertEmail:     weddingPlans.alertEmail,
        alertChannel:   weddingPlans.alertChannel,
      })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);
    if (row) {
      weddingDate    = row.weddingDate ?? null;
      bookedVendors  = (row.bookedVendors as Record<string, BookedVendor>) ?? {};
      checklistTasks = (row.checklistTasks as ChecklistTasksBlob) ?? null;
      alertPhone     = row.alertPhone ?? null;
      alertEmail     = row.alertEmail ?? null;
      alertChannel   = row.alertChannel && VALID_CHANNELS.has(row.alertChannel as AlertChannel)
        ? (row.alertChannel as AlertChannel)
        : null;
    }
  } catch (err) {
    console.error("[/plan/checklist] failed to load state", err);
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
        <PlannerTabs active="checklist" />

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
          initialAlertPhone={alertPhone}
          initialAlertEmail={alertEmail}
          initialAlertChannel={alertChannel}
        />
      </div>
    </main>
  );
}
