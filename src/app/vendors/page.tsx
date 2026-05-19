import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { getVendorCountsByCategory } from "@/lib/queries";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { categoryColourVars } from "@/lib/vendor-colours";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Wedding Vendors in Ontario | Browse 12 Vendor Categories",
  description:
    "Browse 500+ verified Ontario wedding vendors across 12 categories — photographers, videographers, DJs, florists, planners, photo booths and more.",
  alternates: { canonical: "/vendors" },
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-7 w-7 stroke-current",
};

type CategoryDef = {
  slug: VendorCategory;
  label: string;
  tagline: string;
  icon: React.ReactNode;
};

/* Order matches the user spec: 3-col layout reads in this sequence */
const CATEGORIES: CategoryDef[] = [
  {
    slug: "photographer",
    label: "Photographers",
    tagline: "Capture every moment",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M3 8h3l2-2h8l2 2h3v11H3z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  },
  {
    slug: "videographer",
    label: "Videographers",
    tagline: "Cinematic wedding films",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <rect x="3" y="7" width="13" height="10" rx="1.5" />
        <path d="M16 11l5-3v8l-5-3z" />
      </svg>
    ),
  },
  {
    slug: "dj",
    label: "DJs",
    tagline: "Keep the dance floor full",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M4 6v8a4 4 0 0 0 8 0V6" />
        <path d="M20 6v8a4 4 0 0 1-8 0" />
        <circle cx="8" cy="14" r="1.5" />
        <circle cx="16" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    slug: "florist",
    label: "Florists",
    tagline: "Flowers that tell your story",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <circle cx="12" cy="8" r="2.5" />
        <path d="M9.5 6.5C7 5 5 6 5 8.5s2 3.5 4.5 2.5" />
        <path d="M14.5 6.5C17 5 19 6 19 8.5s-2 3.5-4.5 2.5" />
        <path d="M9.5 9.5C7 11 5 12 5 14s2 2 4.5 0.5" />
        <path d="M14.5 9.5C17 11 19 12 19 14s-2 2-4.5 0.5" />
        <path d="M12 11v10" />
        <path d="M12 17l-3-1m3 1l3-1" />
      </svg>
    ),
  },
  {
    slug: "officiant",
    label: "Officiants",
    tagline: "Ceremonies that matter",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M4 4v16h7V4z" />
        <path d="M13 4v16h7V4z" />
        <path d="M11 4v16M13 4v16" />
        <path d="M7 9h1M7 13h1M16 9h1M16 13h1" />
      </svg>
    ),
  },
  {
    slug: "hair_makeup",
    label: "Hair & Makeup",
    tagline: "Look your best",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <circle cx="9" cy="9" r="6" />
        <path d="M9 15v3M7 19h4" />
        <path d="M16 11l5 5-2 2-5-5z" />
        <path d="M15.5 12.5l3 3" />
      </svg>
    ),
  },
  {
    slug: "catering",
    label: "Catering",
    tagline: "Food worth celebrating",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M3 15h18a8 8 0 0 0-16 0z" />
        <path d="M3 18h18" />
        <path d="M12 7V4M10 4h4" />
      </svg>
    ),
  },
  {
    slug: "wedding_planner",
    label: "Wedding Planners",
    tagline: "Plan without the stress",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <rect x="3" y="5" width="18" height="16" rx="1.5" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M7 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    slug: "cake",
    label: "Cake Designers",
    tagline: "Sweet finishes",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M5 21h14v-7H5z" />
        <path d="M7 14v-3h10v3" />
        <path d="M9 11v-3h6v3" />
        <path d="M12 8V5" />
        <path d="M11 5l1-1.5L13 5" />
      </svg>
    ),
  },
  {
    slug: "limo",
    label: "Limo & Transportation",
    tagline: "Arrive in style",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M3 15v3h18v-3l-2-5H5z" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
        <path d="M6 10l1.5-3h9L18 10" />
      </svg>
    ),
  },
  {
    slug: "photo_booth",
    label: "Photo Booths",
    tagline: "Memories guests take home",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <circle cx="12" cy="9" r="3" />
        <path d="M7 15h10M7 18h10" />
      </svg>
    ),
  },
  {
    slug: "lighting_decor",
    label: "Lighting & Decor",
    tagline: "Set the scene",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 14v-2" />
        <path d="M7 7a5 5 0 0 1 10 0c0 3-2 4-2.5 5h-5C9 11 7 10 7 7z" />
      </svg>
    ),
  },
];

/** URL-friendly slug: photo_booth → photo-booth */
function urlSlug(category: string): string {
  return category.replace(/_/g, "-");
}

export default async function VendorsIndexPage() {
  const counts = await getVendorCountsByCategory();
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  const breadcrumbItems = [
    { name: "Home",    url: "/" },
    { name: "Vendors", url: "/vendors" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />

      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          {/* Header */}
          <header className="mb-10">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs font-medium text-text-muted">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-rose">Home</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-charcoal">Vendors</li>
              </ol>
            </nav>

            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Vendor directory
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
              Ontario wedding{" "}
              <em className="italic text-rose">vendors</em>
            </h1>
            <p className="mt-3 max-w-[640px] text-text-mid">
              {totalAll.toLocaleString()} verified vendors across {CATEGORIES.length}{" "}
              categories — every listing carries a wedding-readiness score and
              Google review data.
            </p>
          </header>

          {/* Featured Pic Booth strip — full width */}
          <section className="mb-10 overflow-hidden rounded-card border-[2px] border-rose bg-white shadow-[var(--shadow-card)]">
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

            <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-7">
              <div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
                  Featured photo booth
                </div>
                <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-charcoal">
                  Ontario&rsquo;s premier{" "}
                  <em className="italic text-rose">photo booth</em>
                </h2>

                <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-gold-light px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-charcoal">
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

                <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-text-mid">
                  Pic Booth — St. Catharines-based, serving Niagara and the GTA.
                  Open-air sailcloth booths, enclosed luxury cabinets, and instant
                  prints for weddings of every size.
                </p>
              </div>

              <Link
                href={"/vendors/photo-booth/pic-booth-st-catharines" as Route}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 md:self-center"
              >
                View Pic Booth
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Disclosure label */}
            <div className="border-t border-border-light bg-bg-soft px-6 py-3 md:px-7">
              <p className="text-[0.7rem] leading-relaxed text-text-mid">
                <strong className="font-semibold text-charcoal">Disclosure:</strong>{" "}
                Pic Booth is operated by the same team that runs Ontario Wedding
                Vendors. Other photo booth vendors are listed in the Photo Booths
                category and ranked by their wedding-readiness score.
              </p>
            </div>
          </section>

          {/* 12-card grid — 3 columns × 4 rows on lg+ */}
          <section>
            <h2 className="sr-only">All vendor categories</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => {
                const count = counts[c.slug] ?? 0;
                const cssVars = categoryColourVars(c.slug) as CSSProperties;
                return (
                  <Link
                    key={c.slug}
                    href={`/vendors/${urlSlug(c.slug)}` as Route}
                    style={cssVars}
                    className="group relative flex flex-col gap-3 overflow-hidden rounded-card border-[1.5px] border-border bg-white p-6 pt-7 transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_12px_32px_rgba(var(--cat-rgb),0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cat-primary)] focus-visible:ring-offset-2"
                  >
                    {/* Category-coloured top border — appears on hover only */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-[var(--cat-primary)] transition-transform duration-200 group-hover:scale-x-100"
                    />
                    <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-[var(--cat-bg)] text-[var(--cat-primary)] transition-colors duration-200 group-hover:bg-[var(--cat-primary)] group-hover:text-white">
                      {c.icon}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold leading-tight text-charcoal">
                        {c.label}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-[var(--cat-primary)]">
                        {count.toLocaleString()} vendor{count === 1 ? "" : "s"} in Ontario
                      </p>
                    </div>
                    <p className="text-sm leading-snug text-text-mid">
                      {c.tagline}
                    </p>
                    <span
                      aria-hidden
                      className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-bold tracking-[0.04em] text-[var(--cat-primary)]"
                    >
                      Browse {c.label.toLowerCase()}
                      <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
