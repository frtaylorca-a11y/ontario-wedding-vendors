import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const PIC_BOOTH_VENDOR_HREF = "/vendors/photo-booth/pic-booth-st-catharines" as Route;

const UTM_BASE = "utm_source=owv&utm_medium=featured-partner&utm_campaign=niagara-gta";

type Props = {
  /** Used in copy + UTM tracking. Pass region.label for region pages, venue.name for venue pages. */
  contextLabel: string;
  /** Slug for UTM content tracking (region slug or venue slug). */
  contextSlug: string;
  /** Where the visitor came from — drives the copy variant. */
  source: "region" | "venue";
};

export function PicBoothFeaturedPartner({ contextLabel, contextSlug, source }: Props) {
  const externalHref =
    `https://picbooth.ca/?${UTM_BASE}&utm_content=${source}-${encodeURIComponent(contextSlug)}` as Route;

  const headline =
    source === "region"
      ? `Photo booth partner in ${contextLabel}`
      : `Photo booth partner for ${contextLabel}`;

  return (
    <aside
      aria-label="Featured photo booth partner"
      className="overflow-hidden rounded-card border-[1.5px] border-rose bg-white"
    >
      {/* Featured Partner banner */}
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
          Featured Partner
        </span>
      </div>

      {/* Hero image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-soft">
        <Image
          src="/images/pic-booth-hero.png"
          alt="Pic Booth setup at a Niagara wedding"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="p-6 md:p-7">
        <h3 className="font-display text-2xl font-semibold leading-tight text-charcoal">
          {headline}
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
          Pic Booth is a St. Catharines–based photo booth company serving Niagara
          and the Greater Toronto Area. Open-air sailcloth booths, enclosed
          luxury cabinets, and instant-print packages sized for venues like the
          ones above.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={PIC_BOOTH_VENDOR_HREF}
            className="inline-flex items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            See Pic Booth on Ontario Wedding Vendors
            <span aria-hidden>→</span>
          </Link>
          <a
            href={externalHref}
            target="_blank"
            rel="noopener"
            className="text-sm font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
          >
            picbooth.ca →
          </a>
        </div>

        {/* Disclosure label — required for every Featured Partner placement */}
        <p className="mt-5 border-t border-border-light pt-4 text-[0.7rem] leading-relaxed text-text-muted">
          <strong className="font-semibold text-text-mid">Disclosure:</strong> Pic
          Booth is operated by the same team that runs Ontario Wedding Vendors.
          Other photo booth vendors serving this area appear in the directory
          without a Featured Partner label.
        </p>
      </div>
    </aside>
  );
}
