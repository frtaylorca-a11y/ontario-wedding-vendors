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
