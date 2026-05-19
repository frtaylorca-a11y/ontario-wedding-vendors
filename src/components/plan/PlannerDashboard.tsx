"use client";

import { useEffect, useRef, useState } from "react";
import { BudgetCalculator } from "./BudgetCalculator";
import { VenueSearch } from "./VenueSearch";
import { VendorSlots } from "./VendorSlots";
import { AddVendorSlideOver } from "./AddVendorSlideOver";
import {
  DEFAULT_PLAN,
  getVenuePricingRange,
  venueMidRange,
  type PlanState,
  type BookedVendor,
} from "@/lib/plan-state";

const LOCAL_STORAGE_KEY = "owv_plan_state_v1";
const SAVE_DEBOUNCE_MS = 800;

type Props = {
  sessionId: string;
  initialPlan: Partial<PlanState> | null;
};

export function PlannerDashboard({ sessionId, initialPlan }: Props) {
  const [state, setState] = useState<PlanState>(() => ({
    ...DEFAULT_PLAN,
    sessionId,
    ...(initialPlan ?? {}),
  } as PlanState));

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addVendorCategory, setAddVendorCategory] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  function handleBookVendor(vendor: BookedVendor) {
    setState((s) => ({
      ...s,
      bookedVendors: { ...s.bookedVendors, [vendor.category]: vendor },
    }));
  }

  function handleRemoveBooking(category: string) {
    setState((s) => {
      const next = { ...s.bookedVendors };
      delete next[category];
      return { ...s, bookedVendors: next };
    });
  }

  /* Hydrate from localStorage on first client render — DB state wins if newer */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && !initialPlan) {
        const local = JSON.parse(raw);
        setState((s) => ({ ...s, ...local, sessionId }));
      }
    } catch {
      /* ignore */
    }
  }, [initialPlan, sessionId]);

  /* Persist on every change (debounced) — localStorage immediately, DB after pause */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalBudget:          state.totalBudget,
            guestCount:           state.guestCount,
            region:               state.region,
            weddingDate:          state.weddingDate,
            venueId:              state.venueId,
            bookedVendors:        state.bookedVendors,
            budgetCategoryStates: state.budgetCategoryStates,
          }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Save status bar */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Plan saved automatically · session{" "}
          <code className="rounded bg-bg-soft px-1.5 py-0.5 text-[0.65rem]">
            {sessionId.slice(0, 8)}…
          </code>
        </span>
        <span
          className={
            saveStatus === "saving"
              ? "text-text-muted"
              : saveStatus === "saved"
                ? "text-green"
                : saveStatus === "error"
                  ? "text-red-600"
                  : "text-text-muted"
          }
        >
          {saveStatus === "saving" && "● Saving…"}
          {saveStatus === "saved" && "✓ All changes saved"}
          {saveStatus === "error" && "⚠ Save failed (local copy kept)"}
          {saveStatus === "idle" && "Ready"}
        </span>
      </div>

      {/* Step 1 — Budget */}
      <BudgetCalculator
        totalBudget={state.totalBudget}
        guestCount={state.guestCount}
        region={state.region}
        weddingDate={state.weddingDate}
        venueName={state.venueName}
        venueType={state.venueType}
        venueCapacityMax={state.venueCapacityMax}
        budgetCategoryStates={state.budgetCategoryStates}
        onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
      />

      {/* Step 2 — Venue */}
      <VenueSearch
        venueId={state.venueId}
        venueName={state.venueName}
        venueCity={state.venueCity}
        region={state.region}
        onSelect={(venue) => {
          if (venue) {
            setState((s) => {
              const nextRegion = venue.region ?? s.region;
              /* Auto-lock venue_rental to mid-range of the venue type pricing
               * model. User can unlock at any time. Skip if already locked. */
              const range = getVenuePricingRange(venue.venueType, nextRegion);
              const venueToggle = s.budgetCategoryStates.toggles.venue_rental;
              const shouldAutoLock = range && venueToggle.lockedAmount == null;
              const nextStates = shouldAutoLock
                ? {
                    ...s.budgetCategoryStates,
                    toggles: {
                      ...s.budgetCategoryStates.toggles,
                      venue_rental: {
                        ...venueToggle,
                        enabled: true,
                        lockedAmount: venueMidRange(range),
                      },
                    },
                  }
                : s.budgetCategoryStates;
              return {
                ...s,
                venueId:           venue.id,
                venueName:         venue.name,
                venueCity:         venue.city,
                venueType:         venue.venueType,
                venueCapacityMax:  venue.capacityMax,
                venueCatering:     venue.catering,
                region:            nextRegion,
                budgetCategoryStates: nextStates,
              };
            });
          } else {
            setState((s) => ({
              ...s,
              venueId: null,
              venueName: null,
              venueCity: null,
              venueType: null,
              venueCapacityMax: null,
              venueCatering: null,
            }));
          }
        }}
      />

      {/* Step 3 — Vendor slots (only after venue) */}
      {state.venueId ? (
        <VendorSlots
          totalBudget={state.totalBudget}
          region={state.region}
          bookedVendors={state.bookedVendors}
          onAddVendor={(category) => setAddVendorCategory(category)}
          onRemoveBooking={handleRemoveBooking}
        />
      ) : (
        <section className="rounded-card border-[1.5px] border-dashed border-border bg-bg-soft p-8 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Step 3 · Vendors
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            Pick a venue above to unlock your vendor list
          </h2>
          <p className="mt-2 text-sm text-text-mid">
            Each of the 12 vendor categories gets a slot with your per-category
            budget and a button to browse vendors filtered to your region.
          </p>
        </section>
      )}

      {/* Step 4 — slide-over (overlay, lives outside the doc flow) */}
      <AddVendorSlideOver
        open={addVendorCategory !== null}
        category={addVendorCategory}
        defaultRegion={state.region}
        onClose={() => setAddVendorCategory(null)}
        onBook={handleBookVendor}
      />
    </div>
  );
}
