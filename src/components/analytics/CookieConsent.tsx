"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "owv_analytics_consent_v1";

/**
 * Bottom-anchored cookie consent banner. Shows on first visit; hides once
 * the user picks Accept or Decline. Dispatches the `owv:consent` window
 * event so AnalyticsLoaders can mount/withhold GA4 + Meta scripts.
 *
 * Clarity is exempt — fires regardless (anonymized, no cookies set client-
 * side that identify the user).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored !== "accepted" && stored !== "declined") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function setConsent(value: "accepted" | "declined") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch { /* ignore */ }
    /* Notify AnalyticsLoaders so it can mount scripts without a refresh */
    window.dispatchEvent(new CustomEvent("owv:consent", { detail: { value } }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[200] mx-auto max-w-[640px] rounded-card border border-border bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <p className="text-sm text-charcoal">
          We use cookies to improve your experience and measure traffic.{" "}
          <span className="text-text-mid">
            Anonymized heatmaps always on; analytics + advertising cookies
            only after you accept.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConsent("declined")}
            className="rounded-pill border border-border bg-white px-4 py-1.5 text-xs font-bold text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Manage preferences
          </button>
          <button
            type="button"
            onClick={() => setConsent("accepted")}
            className="rounded-pill bg-rose px-5 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
