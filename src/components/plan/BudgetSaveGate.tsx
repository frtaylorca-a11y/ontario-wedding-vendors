"use client";

import { useEffect, useState } from "react";
import { RegisterModal } from "@/components/auth/RegisterGate";

const LOCAL_STORAGE_KEY = "owv_plan_state_v1";
const SHOWN_KEY        = "owv_budget_gate_shown_v1";
const IDLE_MS          = 5 * 60 * 1000; /* 5 minutes */
const DEFAULT_BUDGET   = 35000; /* DEFAULT_PLAN.totalBudget — see plan-state.ts */

/**
 * Passive registration gate on /plan. After 5 minutes of dwell on the
 * page — assuming the couple has actually engaged with the budget
 * (totalBudget moved off the default) — show the save-budget modal
 * once per browser session.
 *
 * Skipped entirely when:
 *   - We've already shown the modal this session (sessionStorage flag)
 *   - The couple is already authenticated (/api/auth/me)
 *   - The plan looks untouched (no totalBudget or still at default)
 */
export function BudgetSaveGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    /* Bail if already shown this session. */
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
    } catch { /* private mode → just proceed */ }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    /* Skip if already signed in. */
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { authenticated?: boolean }) => {
        if (cancelled || j.authenticated) return;
        timer = setTimeout(maybeShow, IDLE_MS);
      })
      .catch(() => {
        if (!cancelled) timer = setTimeout(maybeShow, IDLE_MS);
      });

    function maybeShow() {
      if (cancelled) return;
      /* Only prompt when the couple has touched the budget — bouncing
       * the modal on a fresh visitor who just landed and tabbed away
       * is annoying, not helpful. */
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw) as { totalBudget?: number; bookedVendors?: object; savedVendors?: object };
        const hasBudget   = typeof state.totalBudget === "number" && state.totalBudget !== DEFAULT_BUDGET && state.totalBudget > 0;
        const hasActivity = Object.keys(state.bookedVendors ?? {}).length > 0
                         || Object.keys(state.savedVendors ?? {}).length > 0;
        if (!hasBudget && !hasActivity) return;
      } catch { return; }

      try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* ignore */ }
      setOpen(true);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!open) return null;
  return (
    <RegisterModal
      intent="save-budget"
      headline="Don't lose your budget — save it free"
      subhead="Create a free account so your budget, venue, and vendor shortlist follow you across every device."
      onClose={() => setOpen(false)}
    />
  );
}
