import type { GoogleReview } from "@/lib/google-reviews";

function truncate(text: string, max = 200): { body: string; truncated: boolean } {
  if (text.length <= max) return { body: text, truncated: false };
  /* break at last space ≤ max to avoid mid-word cut */
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const body = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return { body: `${body}…`, truncated: true };
}

export function GoogleReviews({
  reviews,
  venueName,
  googleRating,
  reviewCount,
  googleMapsUrl,
}: {
  reviews:        GoogleReview[];
  venueName:      string;
  /** Used for the no-excerpts fallback row. When set + reviews are
   *  empty, we render a thin "X stars across N reviews — see them on
   *  Google →" callout instead of hiding the whole section. */
  googleRating?:  string | null;
  reviewCount?:   number | null;
  googleMapsUrl?: string | null;
}) {
  /* No live excerpts AND no aggregate rating → nothing to show. */
  const hasAggregate =
    googleRating != null && googleRating !== "" &&
    reviewCount  != null && reviewCount  > 0;
  if (reviews.length === 0 && !hasAggregate) return null;

  /* Aggregate-only fallback: live API didn't return cached reviews
   * (rate limit, cache miss, no reviews on the listing) but the
   * vendor row carries the verified rating + count. Surface those
   * with a direct link out to Google. */
  if (reviews.length === 0 && hasAggregate) {
    return (
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          What couples say
        </h2>
        <p className="mt-3 text-sm text-text-mid">
          <span className="font-bold text-charcoal">{googleRating}★</span> across{" "}
          <span className="font-bold text-charcoal">{reviewCount!.toLocaleString()}</span>{" "}
          Google reviews.
        </p>
        {googleMapsUrl && (
          <p className="mt-3 text-xs">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener nofollow"
              className="font-bold text-rose hover:underline"
            >
              See all reviews on Google →
            </a>{" "}
            <span className="text-text-muted">· Powered by Google</span>
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          What couples are saying
        </h2>
        <span className="text-xs text-text-muted">Powered by Google</span>
      </div>

      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {reviews.map((r, i) => {
          const { body, truncated } = truncate(r.text, 200);
          const stars = Math.round(r.rating);
          return (
            <li
              key={i}
              className="flex flex-col rounded-card border border-border bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm leading-none tracking-wider text-gold">
                  {"★".repeat(stars)}
                  <span className="text-border">{"★".repeat(5 - stars)}</span>
                </span>
                <span className="text-[0.7rem] text-text-muted">{r.relativeTime}</span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-mid">
                {body}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border-light pt-3 text-[0.78rem]">
                <span className="font-medium text-charcoal">{r.author}</span>
                {r.placeUrl && (
                  <a
                    href={r.placeUrl}
                    target="_blank"
                    rel="noopener nofollow"
                    className="font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                  >
                    {truncated ? "Read more on Google →" : "On Google →"}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[0.7rem] text-text-muted">
        Reviews aggregated from Google for {venueName}. Refreshed every 24
        hours.
      </p>
    </section>
  );
}
