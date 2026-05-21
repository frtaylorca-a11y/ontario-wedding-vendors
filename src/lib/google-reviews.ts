export type GoogleVendorPhoto = {
  url: string;
  /** Photo attribution HTML returned by Google — required when displaying photos */
  attributions: string[];
};

/**
 * Server-side helper: load gallery photos for InteractiveBentoGallery.
 *
 * Resolution order (May 2026 — replaces the previous Google-only path):
 *   1. Cached `additional_photos` jsonb on the row → use verbatim.
 *   2. Scrape vendor.website for gallery images → upload to R2 →
 *      persist + return. (See src/lib/scrape-website-photos.ts.)
 *   3. Google Places Photos as last-resort fallback — only when
 *      scraping returns < 2 images AND a placeId is set.
 *
 * Why we changed it: per-page Google Places calls were $0.017 each
 * and the photos weren't always great. Vendor websites usually have
 * higher-quality, curated gallery images for free.
 *
 * The vendor row needs name + slug + website passed in along with the
 * id + placeId + additionalPhotos that were there before — the caller
 * site (the vendor + venue detail pages) was updated to thread these.
 */
import { scrapeWebsitePhotos, buildR2Config } from "./scrape-website-photos";

type AdditionalPhotosRow = {
  id:                number;
  placeId:           string | null;
  additionalPhotos:  unknown;
  name?:             string;
  slug?:             string;
  website?:          string | null;
};

export async function loadCachedAdditionalPhotos(
  row: AdditionalPhotosRow,
  persist: (id: number, photos: GoogleVendorPhoto[]) => Promise<void>,
  count = 6,
): Promise<GoogleVendorPhoto[]> {
  /* 1 — already cached. */
  if (Array.isArray(row.additionalPhotos)) {
    return (row.additionalPhotos as unknown[])
      .filter((p): p is GoogleVendorPhoto => {
        if (!p || typeof p !== "object") return false;
        const r = p as Record<string, unknown>;
        return typeof r.url === "string" && Array.isArray(r.attributions);
      })
      .slice(0, count);
  }

  /* 2 — website scrape. Requires name + slug + website to be passed
   * by the caller. If any is missing we treat scraping as unavailable
   * and skip straight to the Google fallback. */
  const r2 = buildR2Config();
  if (row.name && row.slug && row.website && r2) {
    try {
      const scrape = await scrapeWebsitePhotos({
        website:    row.website,
        vendorName: row.name,
        vendorSlug: row.slug,
        r2,
        count,
      });
      if (scrape.photos.length >= 2) {
        try { await persist(row.id, scrape.photos); }
        catch (err) {
          console.error("[load-additional-photos] persist (scraped) failed for id",
            row.id, err);
        }
        return scrape.photos;
      }
      /* Less than 2 → fall through to Google. */
    } catch (err) {
      console.warn("[load-additional-photos] website scrape failed for id",
        row.id, err instanceof Error ? err.message : err);
    }
  }

  /* 3 — last-resort Google Places. Same behaviour as before. */
  const fresh = await getGoogleVendorPhotos(row.placeId, count);
  if (fresh.length > 0) {
    try { await persist(row.id, fresh); }
    catch (err) {
      console.error("[load-additional-photos] persist (google) failed for id",
        row.id, err);
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
