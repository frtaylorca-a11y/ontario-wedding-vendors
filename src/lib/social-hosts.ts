/**
 * Hostnames that represent a social-media profile, NOT a vendor's
 * actual website. Vendor rows that land with one of these as
 * vendors.website need the URL stripped + a re-search pass.
 *
 * Centralized here so the cleanup script (hide-social-only-websites.ts),
 * the find-vendor-websites validator, and any future import pass all
 * agree on the same list.
 */

export const SOCIAL_HOSTS: readonly string[] = [
  "instagram.com",   "www.instagram.com",   "m.instagram.com",
  "facebook.com",    "www.facebook.com",    "m.facebook.com",
  "twitter.com",     "www.twitter.com",
  "x.com",           "www.x.com",
  "tiktok.com",      "www.tiktok.com",
  "linkedin.com",    "www.linkedin.com",
  "youtube.com",     "www.youtube.com",     "m.youtube.com",
  "pinterest.com",   "www.pinterest.com",   "ca.pinterest.com",
  /* Photo-host placeholders couples sometimes pass as a 'website'. */
  "linktr.ee",       "www.linktr.ee",
];

const SOCIAL_HOST_SET = new Set(SOCIAL_HOSTS.map((h) => h.toLowerCase()));

/* Returns true iff the given website URL points at a social-media
 * profile. Best-effort URL parse — invalid URLs return false. */
export function isSocialOnlyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (SOCIAL_HOST_SET.has(host)) return true;
    /* Strip subdomain prefix too — "studio.instagram.com" should match. */
    for (const h of SOCIAL_HOST_SET) {
      if (host === h || host.endsWith(`.${h}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
