/**
 * Build a Google Maps URL from a Places API place_id.
 *
 *   ChIJN1t_tDeuEmsRUsoyG83frY4
 *     → https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4
 *
 * Skips synthetic ids ('yp-...', 'ww-...', 'picbooth...') — those don't
 * resolve on Google's side. Returns null when no usable id is present
 * so the renderer can hide the link.
 */
const SYNTHETIC_PREFIXES = ["yp-", "ww-", "picbooth", "ref-", "web-"];

export function googleMapsUrl(placeId: string | null | undefined): string | null {
  if (!placeId) return null;
  for (const p of SYNTHETIC_PREFIXES) if (placeId.startsWith(p)) return null;
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}
