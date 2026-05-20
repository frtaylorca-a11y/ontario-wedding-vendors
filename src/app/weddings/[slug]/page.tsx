import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues, vendors, weddingPlans } from "@/lib/schema";
import { weddingSiteUrl } from "@/lib/wedding-site";
import type { BookedVendor } from "@/lib/plan-state";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [plan] = await db
    .select({
      partner1Name: weddingPlans.partner1Name,
      partner2Name: weddingPlans.partner2Name,
      weddingDate:  weddingPlans.weddingDate,
    })
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) {
    return { title: "Wedding site not found" };
  }
  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const title = names ? `${names} · Wedding` : "Our Wedding";
  return {
    title,
    description: plan.weddingDate
      ? `${names || "We're getting married"} on ${plan.weddingDate}.`
      : "Save the date.",
    robots: { index: false, follow: false },
  };
}

/* ─── Category labels + icons for the vendor credits section ─────────── */

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  photographer:    { label: "Photographer",     icon: <CategoryIcon kind="photographer" /> },
  videographer:    { label: "Videographer",     icon: <CategoryIcon kind="videographer" /> },
  dj:              { label: "DJ",               icon: <CategoryIcon kind="dj" /> },
  florist:         { label: "Florist",          icon: <CategoryIcon kind="florist" /> },
  catering:        { label: "Caterer",          icon: <CategoryIcon kind="catering" /> },
  cake:            { label: "Cake Designer",    icon: <CategoryIcon kind="cake" /> },
  hair_makeup:     { label: "Hair & Makeup",    icon: <CategoryIcon kind="hair_makeup" /> },
  officiant:       { label: "Officiant",        icon: <CategoryIcon kind="officiant" /> },
  limo:            { label: "Transportation",   icon: <CategoryIcon kind="limo" /> },
  lighting_decor:  { label: "Lighting & Decor", icon: <CategoryIcon kind="lighting_decor" /> },
  photo_booth:     { label: "Photo Booth",      icon: <CategoryIcon kind="photo_booth" /> },
  wedding_planner: { label: "Wedding Planner",  icon: <CategoryIcon kind="wedding_planner" /> },
};

function CategoryIcon({ kind }: { kind: string }) {
  const common = {
    viewBox: "0 0 24 24" as const,
    fill: "none" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4 stroke-current",
  };
  switch (kind) {
    case "photographer":
    case "videographer":
      return (<svg aria-hidden {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><circle cx="12" cy="14" r="3" /></svg>);
    case "dj":
      return (<svg aria-hidden {...common}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>);
    case "florist":
      return (<svg aria-hidden {...common}><circle cx="12" cy="12" r="3" /><path d="M12 9V3" /><path d="M12 21v-6" /><path d="M9 12H3" /><path d="M21 12h-6" /></svg>);
    case "catering":
      return (<svg aria-hidden {...common}><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></svg>);
    case "cake":
      return (<svg aria-hidden {...common}><rect x="2" y="10" width="20" height="6" rx="1" /><path d="M12 2v5" /></svg>);
    case "hair_makeup":
      return (<svg aria-hidden {...common}><circle cx="9" cy="9" r="6" /><path d="M16 11l5 5-2 2-5-5z" /></svg>);
    case "officiant":
      return (<svg aria-hidden {...common}><path d="M4 4v16h7V4z" /><path d="M13 4v16h7V4z" /></svg>);
    case "limo":
      return (<svg aria-hidden {...common}><rect x="1" y="3" width="15" height="13" rx="2" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>);
    case "lighting_decor":
      return (<svg aria-hidden {...common}><circle cx="12" cy="5" r="3" /><path d="M12 8v8" /></svg>);
    case "photo_booth":
      return (<svg aria-hidden {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="12" r="2" /></svg>);
    case "wedding_planner":
      return (<svg aria-hidden {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>);
    default:
      return null;
  }
}

function categoryUrlSlug(key: string): string {
  return key.replace(/_/g, "-");
}

export default async function WeddingSitePage({ params }: { params: Params }) {
  const { slug } = await params;

  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) notFound();

  let venue: { name: string | null; city: string | null; address: string | null; website: string | null; slug: string | null } | null = null;
  if (plan.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city, address: venues.address, website: venues.website, slug: venues.slug })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    venue = v ?? null;
  }

  /* Booked vendor credits — only when toggle is on and there's at least one. */
  const booked = (plan.bookedVendors ?? {}) as Record<string, BookedVendor>;
  const bookedList = Object.values(booked).filter((b) => b && b.name);
  const showCredits =
    (plan.weddingSiteShowVendors ?? true) &&
    (bookedList.length > 0 || venue != null);

  /* Hydrate each booked vendor's full row (for website + slug). */
  type CreditVendor = { name: string; category: string; slug: string | null; website: string | null };
  let credits: CreditVendor[] = [];
  if (showCredits && bookedList.length > 0) {
    const ids = bookedList
      .map((b) => b.vendorId)
      .filter((v): v is number => typeof v === "number");
    let vendorRows: Array<{ id: number; name: string; category: string; slug: string; website: string | null }> = [];
    if (ids.length > 0) {
      vendorRows = await db
        .select({ id: vendors.id, name: vendors.name, category: vendors.category, slug: vendors.slug, website: vendors.website })
        .from(vendors)
        .where(inArray(vendors.id, ids));
    }
    const byId = new Map(vendorRows.map((r) => [r.id, r]));
    credits = bookedList.map((b) => {
      const v = b.vendorId != null ? byId.get(b.vendorId) : undefined;
      return {
        name:     v?.name ?? b.name,
        category: b.category,
        slug:     v?.slug ?? null,
        website:  v?.website ?? null,
      };
    });
  }

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const canonical = weddingSiteUrl(plan.weddingSiteSlug, plan.weddingSiteRegionalDomain);

  const weddingDateFormatted = plan.weddingDate
    ? new Date(plan.weddingDate).toLocaleDateString("en-CA", {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric",
      })
    : null;

  /* Event JSON-LD — wedding sites are noindex, but the schema makes a clean
   * preview on shared links and is harmless when present. */
  const eventSchema =
    plan.weddingDate && names && venue?.name
      ? {
          "@context":    "https://schema.org",
          "@type":       "Event",
          name:          `${names} · Wedding`,
          startDate:     plan.weddingDate,
          eventStatus:   "https://schema.org/EventScheduled",
          location: {
            "@type":   "Place",
            name:      venue.name,
            address:   venue.address ?? undefined,
          },
          performer: credits.map((c) => ({
            "@type": "Organization",
            name:    c.name,
            url:     c.website ?? undefined,
          })),
          url: canonical ?? undefined,
        }
      : null;

  return (
    <main className="min-h-screen bg-bg-warm">
      {eventSchema && (
        <script
          type="application/ld+json"
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/</g, "\\u003c") }}
        />
      )}

      {/* Hero — save the date */}
      <section className="mx-auto max-w-[820px] px-6 py-16 text-center lg:py-24">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
          Save the date
        </div>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-charcoal md:text-7xl">
          {names || "Our Wedding"}
        </h1>
        {weddingDateFormatted && (
          <p className="mt-5 font-display text-2xl italic text-rose md:text-3xl">
            {weddingDateFormatted}
          </p>
        )}
        {venue?.name && (
          <p className="mt-2 text-sm text-text-mid md:text-base">
            {venue.name}
            {venue.city ? ` · ${venue.city}` : ""}, Ontario
          </p>
        )}

        {plan.oneqrSlug && (
          <div className="mt-10">
            <a
              href={`https://oneqr.events/e/${plan.oneqrSlug}`}
              className="inline-flex items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              RSVP &amp; details →
            </a>
            <p className="mt-3 text-xs text-text-muted">
              Live guest gallery, seating chart, and day-of timeline open on
              the wedding day.
            </p>
          </div>
        )}

        {!plan.oneqrSlug && (
          <p className="mt-10 rounded-card border border-dashed border-border bg-white p-6 text-sm text-text-muted">
            Full RSVP + guest experience coming soon — the couple is still
            setting things up. Check back closer to the wedding date.
          </p>
        )}
      </section>

      {/* Venue + vendor credits */}
      {showCredits && (
        <section className="border-t border-border-light bg-white">
          <div className="mx-auto max-w-[820px] px-6 py-12 lg:py-16">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
                The team
              </div>
              <h2 className="mt-3 font-display text-3xl font-semibold text-charcoal md:text-4xl">
                Our <em className="italic text-rose">venue &amp; vendors</em>
              </h2>
            </div>

            {/* Venue */}
            {venue?.name && (
              <div className="mt-8 rounded-card border border-border bg-bg-warm p-5">
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
                  Venue
                </div>
                <div className="mt-1 font-display text-2xl font-semibold text-charcoal">
                  {venue.name}
                </div>
                {venue.city && (
                  <div className="mt-0.5 text-sm text-text-mid">
                    {venue.city}, Ontario
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[0.75rem]">
                  {venue.slug && (
                    <a
                      href={`${SITE_URL}/venues/${venue.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="rounded-pill border border-rose bg-white px-3 py-1 font-bold text-rose hover:bg-rose hover:text-white"
                    >
                      View profile →
                    </a>
                  )}
                  {venue.website && (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noopener"
                      className="rounded-pill border border-border bg-white px-3 py-1 font-medium text-charcoal hover:border-rose hover:text-rose"
                    >
                      Visit website ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Vendors grid */}
            {credits.length > 0 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {credits.map((c, i) => {
                  const meta = CATEGORY_META[c.category];
                  return (
                    <li key={`${c.category}-${i}`} className="rounded-card border border-border-light bg-bg-warm p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-pale text-rose">
                          {meta?.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-rose">
                            {meta?.label ?? c.category}
                          </div>
                          <div className="truncate font-display text-base font-semibold text-charcoal">
                            {c.name}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem]">
                        {c.slug && (
                          <a
                            href={`${SITE_URL}/vendors/${categoryUrlSlug(c.category)}/${c.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="rounded-pill border border-border bg-white px-2.5 py-0.5 font-bold text-rose hover:border-rose"
                          >
                            View profile →
                          </a>
                        )}
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener"
                            className="rounded-pill border border-border bg-white px-2.5 py-0.5 font-medium text-charcoal hover:border-rose hover:text-rose"
                          >
                            Visit website ↗
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-10 text-center text-[0.7rem] text-text-muted">
              Planned with{" "}
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener"
                className="text-rose hover:underline"
              >
                Ontario Wedding Vendors
              </a>
            </p>
          </div>
        </section>
      )}

      {/* Canonical + ultra-fine footer (always, regardless of credits) */}
      {!showCredits && (
        <section className="mx-auto max-w-[820px] px-6 pb-12 text-center">
          {canonical && (
            <p className="text-[0.65rem] text-text-muted">
              {canonical}
            </p>
          )}
          <p className="mt-4 text-[0.6rem] text-text-muted">
            Wedding site powered by{" "}
            <Link href={"/" as Route} className="text-rose hover:underline">
              Ontario Wedding Vendors
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}
