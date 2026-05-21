/**
 * Featured Local Provider spotlight — renders above the vendor grid
 * on /vendors/photo_booth. Editorial copy, rose border, cream
 * background. Matches the existing PicBoothSitePartnerCard tone but
 * is a wider banner-style card.
 */
export function PicBoothCategorySpotlight() {
  return (
    <a
      href="https://picbooth.ca/wedding-photo-booth/"
      target="_blank"
      rel="noopener"
      className="group mb-6 block rounded-card border-2 border-rose bg-cream p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm lg:p-7"
    >
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-rose">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 fill-none stroke-white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polygon points="12 2 15 9 22 9 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9 9 9 12 2" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Featured Ontario Provider
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-charcoal group-hover:text-rose">
            Pic Booth — Premium Photo Booth Rentals
          </h2>
          <p className="mt-1 text-sm text-text-mid">
            St. Catharines · Serving Niagara, Hamilton & GTA · Magic Mirror ·
            360 Photo Booth · Draw Bots
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-colors group-hover:bg-rose-hover">
            View packages
            <span aria-hidden>↗</span>
          </span>
          <p className="mt-1 text-right text-[10px] text-text-muted">picbooth.ca</p>
        </div>
      </div>
    </a>
  );
}
