"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { RegisterGate } from "@/components/auth/RegisterGate";

const LOCAL_STORAGE_KEY = "owv_plan_state_v1";
/* Save shortlist gate fires when the couple tries to ADD a save while
 * already at this count. Three free saves; the 4th opens the register
 * modal. (Removes from the shortlist never gate — they don't grow it.) */
const SHORTLIST_FREE_CAP = 3;

function countSavedVendors(state: { savedVendors?: Record<string, string[]> } | null): number {
  if (!state?.savedVendors) return 0;
  let n = 0;
  for (const list of Object.values(state.savedVendors)) n += list?.length ?? 0;
  return n;
}

/**
 * Heart toggle for saving a vendor to the planner. Works without login —
 * reads/writes the same localStorage blob the planner uses, and POSTs to
 * /api/plan/save on every change so cross-device hydration sees it too.
 *
 * Server-rendered as the empty (unsaved) state; useEffect hydrates the
 * actual saved flag on mount.
 *
 * Anonymous users see the save-shortlist RegisterGate when they try to
 * add a 4th save (SHORTLIST_FREE_CAP). Once signed in (RegisterGate
 * detects via /api/auth/me), the cap lifts.
 */
export function SaveVendorButton({ category, slug }: { category: string; slug: string }) {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as { savedVendors?: Record<string, string[]> };
      const list = state.savedVendors?.[category] ?? [];
      if (list.includes(slug)) setSaved(true);
      setTotalSaved(countSavedVendors(state));
    } catch {
      /* ignore */
    }
  }, [category, slug]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    let next = !saved;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : {};
      const savedVendors: Record<string, string[]> = { ...(state.savedVendors ?? {}) };
      const list = new Set(savedVendors[category] ?? []);
      if (next) list.add(slug);
      else list.delete(slug);
      savedVendors[category] = Array.from(list);
      const merged = { ...state, savedVendors };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      setTotalSaved(countSavedVendors(merged));

      /* Best-effort DB sync — silent on failure (localStorage is the source of truth here) */
      fetch("/api/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedVendors }),
      }).catch(() => {});
    } catch {
      next = saved; /* revert if storage failed */
    }
    setSaved(next);
    if (next) trackEvent("vendor_saved", { category, slug });
  }

  /* Gate is active when the user is about to ADD a save (currently
   * unsaved) AND they're already at the free cap. Removes never gate. */
  const gateActive = !saved && totalSaved >= SHORTLIST_FREE_CAP;

  return (
    <RegisterGate
      active={gateActive}
      intent="save-shortlist"
      headline="Save your shortlist & share with your partner"
      subhead="You've saved 3 vendors — create a free account to keep going, share your shortlist with your partner, and pick up where you left off on any device."
    >
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={saved ? "Remove from saved vendors" : "Save vendor to your plan"}
      aria-pressed={saved}
      title={saved ? "Saved ✓" : "Save to your plan"}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 backdrop-blur-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
        saved
          ? "border-rose text-rose"
          : hovered
            ? "border-rose text-rose"
            : "border-border text-text-muted hover:text-rose"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 stroke-current"
        fill={saved ? "currentColor" : "none"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
    </RegisterGate>
  );
}
