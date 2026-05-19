import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const PIC_BOOTH_VENDOR_HREF = "/vendors/photo-booth/pic-booth-st-catharines" as Route;
const UTM = "utm_source=owv&utm_medium=site-partner&utm_campaign=photo-booth-category";

/**
 * Compact Site Partner card on the /vendors/photo-booth listing. Sits above
 * the grid; Pic Booth also appears as the first regular result via the
 * pinned-sort logic (rose Recommended Partner border on the VendorCard).
 *
 * Sized ~25% smaller than the prior takeover-style card — feels like a
 * premium featured listing rather than a full hero.
 */
export function PicBoothSitePartnerCard() {
  return (
    <article className="relative overflow-hidden rounded-card border-[1.5px] border-rose bg-white shadow-[var(--shadow-card)]">
      {/* Site Partner banner */}
      <div className="flex items-center gap-1.5 bg-rose px-4 py-1.5">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3 w-3 fill-none stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white">
          Site Partner
        </span>
      </div>

      {/* Two-column body: image on the left, content on the right.
       * Tighter aspect than the prior 21/9 hero so the card collapses vertically. */}
      <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr] md:items-center md:gap-5 md:p-5">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-bg-soft md:aspect-[4/3] md:h-32">
          <Image
            src="/images/pic-booth-hero.png"
            alt="Pic Booth open-air sailcloth setup at a wedding reception"
            fill
            sizes="(max-width: 768px) 100vw, 180px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-rose">
            Photo Booth · Niagara &amp; GTA
          </div>
          <h3 className="mt-0.5 font-display text-[1.1rem] font-semibold leading-tight text-charcoal">
            <Link
              href={PIC_BOOTH_VENDOR_HREF}
              className="rounded-sm transition-colors hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Pic Booth
            </Link>
          </h3>

          <div className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-gold-light px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-charcoal">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-2.5 w-2.5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            JUNO Awards photo booth provider
          </div>

          <p className="mt-2 text-[0.8rem] leading-relaxed text-text-mid">
            St. Catharines-based, serving Niagara and the GTA. Open-air sailcloth
            booths, enclosed luxury cabinets, and instant-print packages.
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Link
              href={PIC_BOOTH_VENDOR_HREF}
              className="inline-flex items-center gap-1.5 rounded-pill bg-rose px-3.5 py-1.5 text-[0.75rem] font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              View profile
              <span aria-hidden>→</span>
            </Link>
            <a
              href={`https://picbooth.ca/?${UTM}`}
              target="_blank"
              rel="noopener"
              className="text-[0.75rem] font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
            >
              picbooth.ca →
            </a>
          </div>
        </div>
      </div>

      {/* Disclosure — single line, smaller */}
      <div className="border-t border-border-light bg-bg-soft px-4 py-2 md:px-5">
        <p className="text-[0.65rem] leading-relaxed text-text-mid">
          <strong className="font-semibold text-charcoal">Disclosure:</strong>{" "}
          Pic Booth is operated by the team that runs Ontario Wedding Vendors.
          Other photo booth vendors appear below ranked by readiness score.
        </p>
      </div>
    </article>
  );
}
