/**
 * Analytics helpers — single entry point for firing custom events into
 * GA4 and Meta Pixel. No-ops when either tracker isn't loaded.
 *
 *   GA4:    window.gtag("event", name, params)
 *   Meta:   window.fbq("track", standardEvent, params)
 *
 * Meta only supports a closed set of standard events. We map our internal
 * event names to the closest Pixel standard where one applies; events with
 * no Pixel equivalent only fire to GA4.
 *
 * Cookie consent: both gtag and fbq are only defined on window when the
 * AnalyticsLoaders component has mounted their scripts, which happens
 * only after the user accepts cookies. So calls before consent are silent
 * no-ops without any extra gating logic here.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?:  ((...args: unknown[]) => void) & { callMethod?: unknown };
    clarity?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type OwvEventName =
  | "plan_started"
  | "venue_selected"
  | "vendor_saved"
  | "quote_requested"
  | "checklist_task_completed"
  | "oneqr_activated";

/** Map internal event → Meta Pixel standard event when one applies. */
const META_STANDARD_EVENT: Partial<Record<OwvEventName, string>> = {
  plan_started:    "Lead",
  quote_requested: "Contact",
};

export function trackEvent(
  name: OwvEventName,
  params?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;

  /* GA4 */
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params ?? {});
    }
  } catch { /* silently ignore — analytics must never break the app */ }

  /* Meta — only when a standard event mapping exists */
  try {
    const metaEvent = META_STANDARD_EVENT[name];
    if (metaEvent && typeof window.fbq === "function") {
      window.fbq("track", metaEvent, params);
    }
  } catch { /* ignore */ }
}

/**
 * Meta-only ViewContent (vendor + venue detail pages). Fires once after
 * hydration via a dedicated <TrackPageView /> client component.
 */
export function trackMetaViewContent(params: {
  content_type: "vendor" | "venue";
  content_name: string;
  content_category?: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", params);
    }
  } catch { /* ignore */ }
}
