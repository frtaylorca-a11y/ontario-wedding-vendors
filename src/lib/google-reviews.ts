export type GoogleVendorPhoto = {
  url: string;
  /** Photo attribution HTML returned by Google — required when displaying photos */
  attributions: string[];
};

/**
 * Server-side helper: load cached additional Google Places photos for
 * the InteractiveBentoGallery, populating the cache on cold render.
 *
 * If `additionalPhotos` is already an array on the row, return it
 * verbatim (no Google call). Otherwise hit Places Details, build the
 * URLs, persist them to the row's `additional_photos` jsonb column,
 * and return. Errors are swallowed so the page never breaks — the
 * gallery just won't render.
 *
 * Both vendors and venues share this helper — pass the table import
 * from "@/lib/schema". The row must have at minimum {id, placeId,
 * additionalPhotos}; only those fields are read.
 *
 * The Google fetch is intentionally async-blocking on the page
 * server-render. After the first visit, the cached column is used.
 */
type AdditionalPhotosRow = {
  id:                number;
  placeId:           string | null;
  additionalPhotos:  unknown;
};

export async function loadCachedAdditionalPhotos(
  row: AdditionalPhotosRow,
  persist: (id: number, photos: GoogleVendorPhoto[]) => Promise<void>,
  count = 6,
): Promise<GoogleVendorPhoto[]> {
  /* Already cached — return verbatim. */
  if (Array.isArray(row.additionalPhotos)) {
    return (row.additionalPhotos as unknown[])
      .filter((p): p is GoogleVendorPhoto => {
        if (!p || typeof p !== "object") return false;
        const r = p as Record<string, unknown>;
        return typeof r.url === "string" && Array.isArray(r.attributions);
      })
      .slice(0, count);
  }

  const fresh = await getGoogleVendorPhotos(row.placeId, count);
  if (fresh.length > 0) {
    try {
      await persist(row.id, fresh);
    } catch (err) {
      console.error("[load-additional-photos] persist failed for id", row.id, err);
    }
  }
  return fresh;
}

/**
 * Fetch up to N Google Places photos for a vendor (or venue). Returns proxied
 * URLs that take the photo_reference and pull from the Places Photo endpoint.
 * Cached 24h via Next data cache. Returns [] when: no placeId, no API key,
 * fetch fails, no photos.
 *
 * Photo attributions HTML (when present) must be rendered alongside the
 * images per Google's display requirements.
 */
export async function getGoogleVendorPhotos(
  placeId: string | null,
  count = 4,
): Promise<GoogleVendorPhoto[]> {
  if (!placeId) return [];
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=photos` +
      `&key=${key}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK" || !Array.isArray(data.result?.photos)) return [];

    const photos = (data.result.photos as Array<{
      photo_reference: string;
      html_attributions?: string[];
    }>).slice(0, count);

    return photos.map((p) => ({
      url:
        `https://maps.googleapis.com/maps/api/place/photo` +
        `?maxwidth=800` +
        `&photo_reference=${encodeURIComponent(p.photo_reference)}` +
        `&key=${key}`,
      attributions: p.html_attributions ?? [],
    }));
  } catch (err) {
    console.error("[google-vendor-photos] fetch failed for placeId", placeId, err);
    return [];
  }
}

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  placeUrl: string | null;
};

/* "Sarah Murphy" → "Sarah M."  ·  "Sarah" → "Sarah"  ·  "Sarah Anne Murphy" → "Sarah M." */
function shortenAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last[0]}.`;
}

/**
 * Fetch up to 3 Google reviews for a venue, cached 24h via Next data cache.
 * Returns [] when: no placeId, no API key, fetch fails, or status != OK.
 * Costs ~$0.017 per cache miss — at one fetch/venue/day across 1,280 venues
 * that's a theoretical ceiling of ~$22/day if every page is hit daily.
 */
export async function getGoogleReviews(placeId: string | null): Promise<GoogleReview[]> {
  if (!placeId) return [];
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=reviews,url` +
      `&key=${key}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== "OK" || !data.result?.reviews) return [];

    return (data.result.reviews as Array<{
      author_name: string;
      rating: number;
      text?: string;
      relative_time_description?: string;
    }>)
      .slice(0, 3)
      .map((r) => ({
        author: shortenAuthor(r.author_name),
        rating: r.rating,
        text: r.text ?? "",
        relativeTime: r.relative_time_description ?? "",
        placeUrl: typeof data.result.url === "string" ? data.result.url : null,
      }));
  } catch (err) {
    console.error("[google-reviews] fetch failed for placeId", placeId, err);
    return [];
  }
}
