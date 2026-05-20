"use client";

import { useEffect } from "react";

/**
 * Captures attribution data once on first visit and stores it in a
 * httpOnly-free cookie so the /api/plan/save route can read + persist
 * it into the wedding_plans row on INSERT.
 *
 * Cookie name: owv_attribution
 * Cookie body: URL-encoded JSON
 * Lifetime:    30 days
 * Set on:      first page load (when cookie is absent)
 *
 * Captures:
 *   utm_source / utm_medium / utm_campaign / utm_content (from query string)
 *   first_page (window.location.pathname + search at time of capture)
 *
 * Referrer + user-agent + IP are read server-side from the request — they
 * don't need a cookie roundtrip.
 */
const COOKIE = "owv_attribution";
const MAX_AGE_DAYS = 30;

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(/;\s*/).some((c) => c.startsWith(`${name}=`));
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  /* Lax — needed so the cookie survives external referrers (ads, social) */
  document.cookie =
    `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function AttributionCapture() {
  useEffect(() => {
    if (hasCookie(COOKIE)) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const utmSource   = params.get("utm_source");
      const utmMedium   = params.get("utm_medium");
      const utmCampaign = params.get("utm_campaign");
      const utmContent  = params.get("utm_content");
      const payload = {
        utmSource:   utmSource   ?? null,
        utmMedium:   utmMedium   ?? null,
        utmCampaign: utmCampaign ?? null,
        utmContent:  utmContent  ?? null,
        firstPage:   window.location.pathname + window.location.search,
        firstVisitedAt: new Date().toISOString(),
      };
      setCookie(COOKIE, JSON.stringify(payload), MAX_AGE_DAYS);
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
