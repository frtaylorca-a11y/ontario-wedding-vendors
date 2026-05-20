"use client";

import { useState } from "react";

/* Centred modal shown when:
 *   - a free user hits the AI-generation limit
 *   - a free user clicks a premium-locked theme or palette
 *
 * Wired to /api/plan/upgrade-premium for the testing flow (no payment
 * processing yet — flips tier='premium'). Stripe is a later commit.
 */
export function PremiumUpgradeModal({
  reason,
  onClose,
  onUpgraded,
}: {
  /* Optional context — shown in the title of the modal. */
  reason:    "generation-limit" | "premium-theme" | "premium-palette" | null;
  onClose:   () => void;
  onUpgraded: () => void;
}) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (reason === null) return null;

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/upgrade-premium", { method: "POST" });
      if (!res.ok) throw new Error(`upgrade ${res.status}`);
      onUpgraded();
      onClose();
    } catch {
      setError("Couldn't activate premium — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const headline =
    reason === "generation-limit"
      ? "You've used your 3 free generations"
      : reason === "premium-theme"
      ? "This theme is included in Premium"
      : "This palette is included in Premium";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[440px] rounded-card bg-white p-7 shadow-2xl sm:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-rose">
            Upgrade required
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal sm:text-3xl">
            {headline}
          </h2>
        </div>

        <div className="mt-6 rounded-card bg-rose-pale/40 p-5">
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-rose">
            Upgrade to Premium and unlock
          </div>
          <ul className="mt-3 space-y-2 text-sm text-text-mid">
            <UnlockItem>Unlimited AI generations</UnlockItem>
            <UnlockItem>All 6 custom layout themes</UnlockItem>
            <UnlockItem>All 23 colour palettes</UnlockItem>
            <UnlockItem>Custom domain connection</UnlockItem>
            <UnlockItem>Remove Ontario Wedding Vendors branding</UnlockItem>
          </ul>
        </div>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            className="w-full rounded-pill bg-rose px-5 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-60"
          >
            {busy ? "Activating…" : "Upgrade for $9.99/month →"}
          </button>
          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            className="w-full rounded-pill border-2 border-rose bg-white px-5 py-3 text-sm font-bold text-rose transition-all hover:bg-rose-pale disabled:opacity-60"
          >
            Or one-time $49
          </button>
          <p className="text-center text-[0.65rem] text-text-muted">
            Stripe billing arrives in the next release — for now both
            buttons activate Premium instantly so you can try the
            features.
          </p>
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-text-muted underline hover:text-charcoal"
          >
            Maybe later
          </button>
          <span className="mx-2 text-text-muted">·</span>
          <button
            type="button"
            className="text-xs font-medium text-rose underline hover:text-rose-hover"
            onClick={() => alert("Sign-in flow ships with vendor accounts.")}
          >
            Already upgraded? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

function UnlockItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 fill-none stroke-rose"
           strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
