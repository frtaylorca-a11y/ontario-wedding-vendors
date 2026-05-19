import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVenueBySlug, getSimilarVenues } from "@/lib/queries";
import { getGoogleReviews } from "@/lib/google-reviews";
import { getZone } from "@/lib/zones";
import { PicBoothCTA } from "@/components/ui/PicBoothCTA";
import { PicBoothFeaturedPartner } from "@/components/ui/PicBoothFeaturedPartner";
import { VenueCard } from "@/components/ui/VenueCard";
import { GoogleReviews } from "@/components/ui/GoogleReviews";
import { InstagramCard } from "@/components/ui/InstagramCard";
import { VenueSchema, BreadcrumbSchema, FaqSchema } from "@/components/seo/SchemaInjector";
import {
  formatCapacity,
  formatRating,
  scoreTier,
  SCORE_TIER_LABEL,
} from "@/lib/utils";

type Params = Promise<{ slug: string }>;

const VENUE_TYPE_IMAGE: Record<string, string> = {
  winery: "/images/venue-winery.png",
  barn: "/images/venue-barn.png",
  estate: "/images/venue-estate.png",
  inn: "/images/venue-estate.png",
  hotel: "/images/venue-hotel.png",
  resort: "/images/venue-hotel.png",
  "banquet-hall": "/images/venue-hotel.png",
  "golf-club": "/images/venue-golf.png",
  conservation: "/images/venue-outdoor.png",
  "conservation-area": "/images/venue-outdoor.png",
  conservatory: "/images/venue-outdoor.png",
  farm: "/images/venue-outdoor.png",
  garden: "/images/venue-outdoor.png",
};
const FALLBACK_IMAGE = "/images/venue-winery.png";

const SCORE_CLASSES = {
  premier: "bg-emerald-100 text-emerald-800",
  active:  "bg-blue-100 text-blue-800",
  listed:  "bg-amber-100 text-amber-800",
} as const;

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}

function regionLabel(slug: string | null): string {
  if (!slug) return "Ontario";
  return slug.split("-").map((s) => s[0] ? s[0].toUpperCase() + s.slice(1) : s).join(" ");
}

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.toLowerCase() === "unknown") return null;
  return t;
}

function cateringLabel(c: string | null | undefined): string | null {
  const v = clean(c);
  if (!v) return null;
  const lc = v.toLowerCase();
  if (lc.includes("in-house") || lc.includes("inhouse")) return "In-house catering";
  if (lc.includes("open")) return "Open catering (outside caterers welcome)";
  if (lc.includes("both")) return "In-house or open";
  return v;
}

function indoorLabel(v: string | null | undefined): string | null {
  const s = clean(v);
  if (!s) return null;
  const lc = s.toLowerCase();
  if (lc.includes("both")) return "Indoor & outdoor spaces";
  if (lc === "indoor") return "Indoor";
  if (lc === "outdoor") return "Outdoor";
  return s;
}

function formatMonthYear(d: Date | string | null): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return { title: "Venue not found" };

  const city = venue.city ?? "Ontario";
  const cityLabel = venue.city ? `${venue.city}, Ontario` : "Ontario";
  const title = `${venue.name} Wedding Venue | ${cityLabel}`;

  /* SEO-tuned description: lead with name + city + value props, capped at ~160 chars */
  const reviewBit = venue.reviewCount && venue.googleRating
    ? `${venue.googleRating}★ on Google (${venue.reviewCount} reviews). `
    : "";
  const desc = `Plan your wedding at ${venue.name} in ${city}. ${reviewBit}Capacity, catering, coordinator details and pricing notes — verified directly with the venue.`.slice(0, 160);

  return {
    title,
    description: desc,
    alternates: { canonical: `/venues/${venue.slug}` },
    openGraph: {
      title,
      description: desc,
      url: `/venues/${venue.slug}`,
      type: "website",
    },
  };
}

export default async function VenuePage({ params }: { params: Params }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue || (venue.weddingReadinessScore ?? 0) < 50) notFound();

  const [similarVenues, googleReviews] = await Promise.all([
    getSimilarVenues({
      region: venue.region,
      lat: venue.lat,
      lng: venue.lng,
      excludeId: venue.id,
      limit: 3,
    }),
    getGoogleReviews(venue.placeId),
  ]);

  /* Auto-FAQs — built from DB fields we always have or skip on null */
  const ratingBlurb =
    venue.googleRating && venue.reviewCount
      ? ` with ${venue.reviewCount} Google reviews and a ${venue.googleRating}★ rating`
      : "";
  const typeBlurb = venue.venueType ? `${venue.venueType.toLowerCase()} ` : "";
  const cityForFaq = venue.city ?? "Ontario";

  const autoFaqs: { question: string; answer: string }[] = [
    {
      question: `Is ${venue.name} available for weddings?`,
      answer: `Yes — ${venue.name} is an active ${typeBlurb}wedding venue in ${cityForFaq}, Ontario${ratingBlurb}.`,
    },
  ];
  if (venue.address) {
    autoFaqs.push({
      question: `Where is ${venue.name} located?`,
      answer: venue.address,
    });
  }
  const contactParts: string[] = [];
  if (venue.phone) contactParts.push(`Call ${venue.phone}.`);
  if (venue.website) contactParts.push(`Visit their website at ${venue.website}.`);
  if (contactParts.length > 0) {
    autoFaqs.push({
      question: `How do I contact ${venue.name}?`,
      answer: contactParts.join(" "),
    });
  }

  const typeKey = norm(venue.venueType);
  const imageSrc = VENUE_TYPE_IMAGE[typeKey] ?? FALLBACK_IMAGE;
  const venueTypeLabel = venue.venueType
    ? venue.venueType.replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const tier = scoreTier(venue.weddingReadinessScore);
  const tierClasses = tier !== "hidden" ? SCORE_CLASSES[tier] : "";

  const capacity = formatCapacity(venue.capacityMin, venue.capacityMax);
  const cateringText = cateringLabel(venue.catering);
  const indoorText = indoorLabel(venue.indoorOutdoor);
  const accommodationsText = clean(venue.accommodations);
  const coordinatorName = clean(venue.coordinatorName);
  const coordinatorPhone = clean(venue.coordinatorPhone);

  const verifiedDate = venue.lastVerified ?? venue.lastGoogleSync;
  const verified = formatMonthYear(verifiedDate);

  const ratingStr = formatRating(venue.googleRating);

  const zone = getZone(venue.region);
  const inPicBoothZone = zone === "niagara-gta";
  /* Legacy CTA — only fires when picBoothCompatible is true (currently null on all venues) */
  const showPicBoothCTA = inPicBoothZone && venue.picBoothCompatible === true;

  const cityLabel = venue.city ?? "Ontario";
  const regionLbl = regionLabel(venue.region);

  const mapQuery = encodeURIComponent(
    [venue.name, venue.address, venue.city, venue.province ?? "ON"].filter(Boolean).join(", "),
  );
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&output=embed`;

  const breadcrumbItems = [
    { name: "Home",   url: "/" },
    { name: "Venues", url: "/venues" },
    { name: venue.name, url: `/venues/${venue.slug}` },
  ];

  return (
    <>
      <VenueSchema venue={venue} imageUrl={imageSrc} />
      <BreadcrumbSchema items={breadcrumbItems} />
      {autoFaqs.length > 0 && <FaqSchema items={autoFaqs} />}

      <main className="bg-bg-warm">
        <section className="relative h-[420px] overflow-hidden md:h-[520px]">
          <Image
            src={imageSrc}
            alt={`${venue.name} wedding venue in ${cityLabel}, Ontario`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "rgba(28, 20, 25, 0.55)" }}
          />
          <div className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-end px-6 pb-12 text-white">
            <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-white/75">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-white">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/venues" as Route} className="hover:text-white">Venues</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/90">{venue.name}</li>
              </ol>
            </nav>

            {venue.venueType && (
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
                {venue.venueType}
              </div>
            )}
            <h1
              className="mt-2 font-display text-4xl font-semibold leading-tight md:text-6xl"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {venue.name}
            </h1>
            <p
              className="mt-3 flex items-center gap-2 text-sm text-white/85 md:text-base"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {cityLabel} · {regionLbl}, Ontario
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {tier !== "hidden" && (
                <span
                  className={`rounded-pill px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] ${tierClasses}`}
                >
                  {SCORE_TIER_LABEL[tier]}
                </span>
              )}
              {verified && (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#EAF2EC] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-green">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Verified {verified}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          <Link
            href={"/venues" as Route}
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-rose transition-colors hover:text-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
          >
            <span aria-hidden>←</span> All Ontario venues
          </Link>

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            <div className="lg:col-span-2">
              {ratingStr && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="text-2xl leading-none tracking-wider text-gold">
                    {"★".repeat(Math.round(Number(ratingStr)))}
                    <span className="text-border">
                      {"★".repeat(5 - Math.round(Number(ratingStr)))}
                    </span>
                  </span>
                  <span className="font-display text-xl font-semibold text-charcoal">
                    {ratingStr}
                  </span>
                  {venue.reviewCount != null && (
                    <span className="text-sm text-text-mid">
                      ({venue.reviewCount.toLocaleString()} Google reviews)
                    </span>
                  )}
                  <span className="text-xs text-text-muted">Powered by Google</span>
                </div>
              )}

              {/* Primary + secondary CTAs — Visit website (only if URL) + Save to plan */}
              <div className="mb-10 flex flex-wrap items-center gap-3">
                {venue.website && (
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noopener nofollow ugc"
                    className="inline-flex items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover hover:shadow-[0_6px_18px_rgba(185,100,118,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    Visit {venue.name}
                    <span aria-hidden>→</span>
                  </a>
                )}
                <Link
                  href={`/plan?venue=${venue.slug}` as Route}
                  className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-border bg-white px-5 py-2.5 text-sm font-bold text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  Save to my wedding plan
                </Link>
              </div>

              {venue.description ? (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    About this venue
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-text-mid">
                    {venue.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No editorial description on file yet — data below is pulled
                  from Google and the venue&rsquo;s own listings.
                </p>
              )}

              {/* Social proof A — Google Reviews (hides if no place_id or no reviews) */}
              <GoogleReviews reviews={googleReviews} venueName={venue.name} />

              {/* Social proof B — Instagram link card (hides if no handle) */}
              {venue.instagramHandle && (
                <InstagramCard handle={venue.instagramHandle} venueName={venue.name} />
              )}

              {venue.address && (
                <section className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    Location
                  </h2>
                  <p className="mt-2 text-sm text-text-mid">{venue.address}</p>
                  <div className="mt-4 overflow-hidden rounded-card border border-border bg-bg-soft">
                    <iframe
                      src={mapSrc}
                      title={`Map showing ${venue.name}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-[360px] w-full border-0"
                    />
                  </div>
                </section>
              )}

              {/* Auto-generated FAQ — always has at least 1 Q, matches FaqSchema */}
              {autoFaqs.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    What couples ask about this venue
                  </h2>
                  <div className="mt-4 space-y-3">
                    {autoFaqs.map((f, i) => (
                      <details
                        key={i}
                        className="group rounded-card border border-border bg-white p-5 transition-colors hover:border-rose"
                      >
                        <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-semibold text-charcoal marker:hidden [&::-webkit-details-marker]:hidden">
                          {f.question}
                          <span
                            aria-hidden
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border text-rose transition-transform group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <p className="mt-3 text-sm leading-relaxed text-text-mid">
                          {f.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {similarVenues.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    Similar venues nearby
                  </h2>
                  <p className="mt-2 text-sm text-text-mid">
                    {venue.region
                      ? `Other ${regionLbl} wedding venues couples often compare with ${venue.name}.`
                      : `Other Ontario wedding venues couples often compare with ${venue.name}.`}
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {similarVenues.map((v) => (
                      <VenueCard key={v.id} venue={v} />
                    ))}
                  </div>
                </section>
              )}

              {/* Internal links strip — region + venue type */}
              {(venue.region || venue.venueType) && (
                <section className="mt-10 rounded-card border border-border bg-white p-6">
                  <h2 className="font-display text-xl font-semibold text-charcoal">
                    Keep browsing
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {venue.region && (
                      <li>
                        <Link
                          href={`/regions/${venue.region}` as Route}
                          className="text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                        >
                          More wedding venues in {regionLbl} →
                        </Link>
                      </li>
                    )}
                    {venue.venueType && venueTypeLabel && (
                      <li>
                        <Link
                          href={`/venues?type=${typeKey}` as Route}
                          className="text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                        >
                          More {venueTypeLabel.toLowerCase()} venues in Ontario →
                        </Link>
                      </li>
                    )}
                    {venue.city && (
                      <li>
                        <Link
                          href={`/venues?city=${encodeURIComponent(venue.city.toLowerCase())}` as Route}
                          className="text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                        >
                          More venues in {venue.city} →
                        </Link>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              <section className="mt-10">
                <h2 className="font-display text-2xl font-semibold text-charcoal">
                  Nearby vendors
                </h2>
                <div className="mt-3 rounded-card border border-dashed border-border bg-bg-soft p-6 text-center">
                  <p className="text-sm text-text-mid">
                    Vendors coming soon in this area.
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Photographers, florists, DJs and photo booths matched to{" "}
                    {cityLabel} venues — launching in Phase 2.
                  </p>
                </div>
              </section>

              {/* Featured Partner — shows on every venue in the niagara-gta zone */}
              {inPicBoothZone && (
                <div className="mt-10">
                  <PicBoothFeaturedPartner
                    contextLabel={venue.name}
                    contextSlug={venue.slug}
                    source="venue"
                  />
                </div>
              )}

              {/* Legacy contextual CTA — fires only when picBoothCompatible flag is set */}
              {showPicBoothCTA && (
                <div className="mt-10">
                  <PicBoothCTA venueName={venue.name} venueSlug={venue.slug} />
                </div>
              )}
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-[76px] space-y-4">
                <div className="rounded-card border-[1.5px] border-border bg-white p-6 shadow-[var(--shadow-card)]">
                  <h2 className="font-display text-xl font-semibold text-charcoal">
                    Venue details
                  </h2>

                  <dl className="mt-5 space-y-4 text-sm">
                    {/* Capacity — always renders; falls back to contact */}
                    <DetailRow
                      label="Capacity"
                      value={capacity ?? <span className="text-text-muted italic">Contact venue for capacity</span>}
                    />
                    {/* Catering — always renders; falls back to contact */}
                    <DetailRow
                      label="Catering"
                      value={cateringText ?? <span className="text-text-muted italic">Contact venue for catering policy</span>}
                    />
                    {indoorText && <DetailRow label="Spaces" value={indoorText} />}
                    {accommodationsText && <DetailRow label="Accommodations" value={accommodationsText} />}
                  </dl>

                  {/* Coordinator block — prominent if present */}
                  {coordinatorName && (
                    <div className="mt-5 rounded-card border border-rose-pale bg-rose-pale p-4">
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
                        Wedding coordinator
                      </div>
                      <div className="mt-1 font-display text-base font-semibold text-charcoal">
                        {coordinatorName}
                      </div>
                      {coordinatorPhone && (
                        <a
                          href={`tel:${coordinatorPhone}`}
                          className="mt-1 inline-block text-sm font-medium text-rose hover:underline"
                        >
                          {coordinatorPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Quick-link rows */}
                  <dl className="mt-5 space-y-4 text-sm">
                    {venue.website && (
                      <DetailRow
                        label="Website"
                        value={
                          <a
                            href={venue.website}
                            target="_blank"
                            rel="noopener nofollow"
                            className="text-rose hover:underline"
                          >
                            Visit venue site →
                          </a>
                        }
                      />
                    )}
                    {venue.instagramHandle && (
                      <DetailRow
                        label="Instagram"
                        value={(() => {
                          const handle = venue.instagramHandle.replace(/^@+/, "");
                          return (
                            <a
                              href={`https://instagram.com/${handle}`}
                              target="_blank"
                              rel="noopener"
                              className="text-rose hover:underline"
                            >
                              @{handle}
                            </a>
                          );
                        })()}
                      />
                    )}
                  </dl>

                  {/* Why this score — collapsible, only if reasoning exists */}
                  {venue.scoreReasoning && (
                    <details className="group mt-5 border-t border-border-light pt-4">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-bold text-charcoal marker:hidden [&::-webkit-details-marker]:hidden">
                        Why this score?
                        <span
                          aria-hidden
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border text-rose transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-text-mid">
                        {venue.scoreReasoning}
                      </p>
                    </details>
                  )}
                </div>

                {/* Claim this listing — only for unclaimed venues */}
                {!venue.claimed && (
                  <div className="rounded-card border border-dashed border-border bg-bg-soft p-4">
                    <p className="text-xs text-text-mid">
                      Are you the venue owner?
                    </p>
                    <Link
                      href={`/claim-listing?venue=${venue.slug}` as Route}
                      className="mt-1 inline-block text-sm font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                    >
                      Claim this listing →
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-charcoal">{value}</dd>
    </div>
  );
}
