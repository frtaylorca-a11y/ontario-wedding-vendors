import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const PIC_BOOTH_VENDOR_HREF = "/vendors/photo-booth/pic-booth-st-catharines" as Route;
const UTM = "utm_source=owv&utm_medium=site-partner&utm_campaign=photo-booth-category";

/**
 * Pinned-first card on the /vendors/photo-booth listing.
 * Distinct from the Featured Partner block (which is contextual) — this is a
 * directory entry that always appears first, with the Site Partner disclosure label.
 */
export function PicBoothSitePartnerCard() {
  return (
    <article className="relative overflow-hidden rounded-card border-[2px] border-rose bg-white shadow-[var(--shadow-card)]">
      {/* Site Partner banner */}
      <div className="flex items-center gap-2 bg-rose px-5 py-2">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white">
          Site Partner
        </span>
      </div>

      {/* Hero image */}
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-bg-soft">
        <Image
          src="/images/pic-booth-hero.png"
          alt="Pic Booth open-air sailcloth setup at a wedding reception"
          fill
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
        />
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-7">
        <div className="min-w-0">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
            Photo Booth · Niagara &amp; GTA
          </div>
          <h3 className="mt-1 font-display text-2xl font-semibold leading-tight text-charcoal">
            <Link
              href={PIC_BOOTH_VENDOR_HREF}
              className="rounded-sm transition-colors hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Pic Booth
            </Link>
          </h3>

          <div className="mt-2 inline-flex items-center gap-2 rounded-pill bg-gold-light px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-charcoal">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            JUNO Awards photo booth provider
          </div>

          <p className="mt-4 text-sm leading-relaxed text-text-mid">
            St. Catharines-based photo booth company serving Niagara and the
            Greater Toronto Area. Open-air sailcloth booths, enclosed luxury
            cabinets, and instant-print packages for weddings of every size.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={PIC_BOOTH_VENDOR_HREF}
              className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              View Pic Booth profile
              <span aria-hidden>→</span>
            </Link>
            <a
              href={`https://picbooth.ca/?${UTM}`}
              target="_blank"
              rel="noopener"
              className="text-sm font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
            >
              picbooth.ca →
            </a>
          </div>
        </div>

        {/* Compact rating block */}
        <div className="flex flex-col items-start gap-1 rounded-card border border-border-light bg-bg-soft p-4 md:items-end md:text-right">
          <div className="text-2xl leading-none tracking-wider text-gold">★★★★★</div>
          <div className="font-display text-lg font-semibold text-charcoal">5.0</div>
          <div className="text-[0.7rem] text-text-muted">Editorial pick</div>
        </div>
      </div>

      {/* Disclosure label — required on every Site Partner card */}
      <div className="border-t border-border-light bg-bg-soft px-6 py-3 md:px-7">
        <p className="text-[0.7rem] leading-relaxed text-text-mid">
          <strong className="font-semibold text-charcoal">Disclosure:</strong>{" "}
          Pic Booth is operated by the same team that runs Ontario Wedding
          Vendors. It is listed first on this page as a site partner. Other
          photo booth vendors appear below ranked by their wedding-readiness
          score.
        </p>
      </div>
    </article>
  );
}
