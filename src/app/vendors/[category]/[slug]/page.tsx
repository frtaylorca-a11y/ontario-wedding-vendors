import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors as vendorsTable } from "@/lib/schema";
import {
  getVendorBySlug,
  getSimilarVendors,
  getVenuesRecommendingVendor,
} from "@/lib/queries";
import {
  getGoogleReviews,
  loadCachedAdditionalPhotos,
  type GoogleVendorPhoto,
} from "@/lib/google-reviews";
import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { GoogleReviews } from "@/components/ui/GoogleReviews";
import { VendorCard } from "@/components/ui/VendorCard";
import { VenueCard } from "@/components/ui/VenueCard";
import { VendorSchema, BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { TrackPageView } from "@/components/analytics/TrackPageView";
import { formatRating, normalizeRegionDisplay } from "@/lib/utils";

type Params = Promise<{ category: string; slug: string }>;

const CATEGORY_LABEL: Record<VendorCategory, string> = {
  photographer:    "Photographer",
  videographer:    "Videographer",
  dj:              "DJ",
  florist:         "Florist",
  photo_booth:     "Photo Booth",
  catering:        "Caterer",
  cake:            "Cake Designer",
  hair_makeup:     "Hair & Makeup Artist",
  officiant:       "Officiant",
  limo:            "Limo Service",
  lighting_decor:  "Lighting & Decor",
  wedding_planner: "Wedding Planner",
};

const CATEGORY_PLURAL: Record<VendorCategory, string> = {
  photographer:    "Photographers",
  videographer:    "Videographers",
  dj:              "DJs",
  florist:         "Florists",
  photo_booth:     "Photo Booths",
  catering:        "Caterers",
  cake:            "Cake Designers",
  hair_makeup:     "Hair & Makeup Artists",
  officiant:       "Officiants",
  limo:            "Limo & Transportation",
  lighting_decor:  "Lighting & Decor",
  wedding_planner: "Wedding Planners",
};

/* Dedicated per-category hero images uploaded to /public/images/ */
const CATEGORY_HERO_IMAGE: Record<VendorCategory, string> = {
  photographer:    "/images/vendor-photographer.png",
  videographer:    "/images/vendor-videographer.png",
  dj:              "/images/vendor-dj.png",
  florist:         "/images/vendor-florist.png",
  photo_booth:     "/images/vendor-photo-booth.png",
  catering:        "/images/vendor-catering.png",
  cake:            "/images/vendor-cake.png",
  hair_makeup:     "/images/vendor-hair-makeup.png",
  officiant:       "/images/vendor-officiant.png",
  limo:            "/images/vendor-limo.png",
  lighting_decor:  "/images/vendor-lighting-decor.png",
  wedding_planner: "/images/vendor-wedding-planner.png",
};

const PRICE_TIER_LABEL: Record<string, string> = {
  budget:  "$ Budget",
  mid:     "$$ Mid-range",
  premium: "$$$ Premium",
};

function normalizeCategorySlug(slug: string): string {
  return slug.replace(/-/g, "_");
}
function isValidCategory(slug: string): slug is VendorCategory {
  return (VENDOR_CATEGORIES as readonly string[]).includes(slug);
}
const regionLabel = normalizeRegionDisplay;
function normalizeIgHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor not found" };

  const category = vendor.category;
  const isValid = isValidCategory(category);
  const label = isValid ? CATEGORY_LABEL[category] : "Wedding Vendor";
  const city = vendor.city ?? regionLabel(vendor.region);
  const title = `${vendor.name} | Wedding ${label} in ${city}, Ontario`;
  const desc = vendor.description?.slice(0, 160)
    ?? `${vendor.name} — wedding ${label.toLowerCase()} serving ${city}, Ontario. Reviews, packages, contact details.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/vendors/${category.replace(/_/g, "-")}/${vendor.slug}` },
    openGraph: { title, description: desc, type: "website" },
  };
}

export default async function VendorPage({ params }: { params: Params }) {
  const { category: rawCategory, slug } = await params;
  const requestedCategory = normalizeCategorySlug(rawCategory);

  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  /* Reject mismatched category in URL to avoid duplicate-content SEO problems */
  if (vendor.category !== requestedCategory) notFound();
  if (!isValidCategory(vendor.category)) notFound();

  const category = vendor.category as VendorCategory;
  const label = CATEGORY_LABEL[category];
  const plural = CATEGORY_PLURAL[category];
  const heroImage = CATEGORY_HERO_IMAGE[category];
  const cityRegion = [vendor.city, regionLabel(vendor.region)].filter(Boolean).join(" · ");

  const [reviews, galleryPhotos, similar, recommendingVenues] = await Promise.all([
    getGoogleReviews(vendor.placeId),
    /* Cached additional photos for the bento gallery — populates
     * vendors.additional_photos on first visit, served from cache
     * thereafter. Limit 6 per the bento layout below. */
    loadCachedAdditionalPhotos(
      {
        id:               vendor.id,
        placeId:          vendor.placeId,
        additionalPhotos: vendor.additionalPhotos,
      },
      async (id, photos) => {
        await db
          .update(vendorsTable)
          .set({ additionalPhotos: photos, updatedAt: new Date() })
          .where(eq(vendorsTable.id, id));
      },
      6,
    ),
    getSimilarVendors({
      category: vendor.category,
      region: vendor.region,
      excludeId: vendor.id,
      limit: 3,
    }),
    getVenuesRecommendingVendor(vendor.id, 6),
  ]);

  /* Build the bento gallery media-items array. Span pattern per the
   * brief: photo 1 large (col-span-2 row-span-3), photos 2/3/5/6
   * narrow (col-span-1 row-span-2), photo 4 wide (col-span-2
   * row-span-2). Gallery only renders when there are 2+ photos. */
  const BENTO_SPANS = [
    "md:col-span-2 md:row-span-3",
    "md:col-span-1 md:row-span-2",
    "md:col-span-1 md:row-span-2",
    "md:col-span-2 md:row-span-2",
    "md:col-span-1 md:row-span-2",
    "md:col-span-1 md:row-span-2",
  ] as const;
  const bentoMediaItems = (galleryPhotos as GoogleVendorPhoto[])
    .slice(0, 6)
    .map((p, i) => ({
      id:    i + 1,
      type:  "image",
      title: vendor.name,
      desc:  [vendor.city, vendor.category.replace(/_/g, " ")].filter(Boolean).join(" · "),
      url:   p.url,
      span:  BENTO_SPANS[i] ?? BENTO_SPANS[BENTO_SPANS.length - 1],
    }));

  /* Specialties + service areas live in jsonb columns populated by
   * enrich-vendor-bios.ts. Render only when the arrays carry content. */
  const specialtiesList: string[] = Array.isArray(vendor.specialties)
    ? (vendor.specialties as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const serviceAreasList: string[] = Array.isArray(vendor.serviceAreas)
    ? (vendor.serviceAreas as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  const ratingStr = formatRating(vendor.googleRating);
  const priceLabel = vendor.priceTier ? (PRICE_TIER_LABEL[vendor.priceTier] ?? vendor.priceTier) : null;
  const igHandle = vendor.instagramHandle ? normalizeIgHandle(vendor.instagramHandle) : null;

  const breadcrumbItems = [
    { name: "Home",        url: "/" },
    { name: "Vendors",     url: "/vendors" },
    { name: plural,        url: `/vendors/${rawCategory}` },
    { name: vendor.name,   url: `/vendors/${rawCategory}/${vendor.slug}` },
  ];

  return (
    <>
      <TrackPageView
        contentType="vendor"
        contentName={vendor.name}
        contentCategory={vendor.category}
      />
      <VendorSchema vendor={vendor} imageUrl={heroImage} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <main className="bg-bg-warm">
        {/* Hero */}
        <section className="relative h-[360px] overflow-hidden md:h-[440px]">
          <Image
            src={heroImage}
            alt={`${vendor.name} — wedding ${label.toLowerCase()} in ${vendor.city ?? "Ontario"}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ filter: "saturate(0.7)", zIndex: 0 }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.45)", zIndex: 1 }}
          />
          <div
            className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-end px-6 pb-10"
            style={{ zIndex: 2 }}
          >
            <nav
              aria-label="Breadcrumb"
              className="mb-5 text-xs font-medium"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-white" style={{ color: "rgba(255,255,255,0.7)" }}>Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/vendors" as Route} className="hover:text-white" style={{ color: "rgba(255,255,255,0.7)" }}>Vendors</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={`/vendors/${rawCategory}` as Route} className="hover:text-white" style={{ color: "rgba(255,255,255,0.7)" }}>{plural}</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" style={{ color: "#ffffff" }}>{vendor.name}</li>
              </ol>
            </nav>

            <div
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{
                color: "rgba(255,255,255,0.8)",
                textShadow: "0 1px 8px rgba(0,0,0,0.6)",
              }}
            >
              {label} · {regionLabel(vendor.region)}
            </div>
            <h1
              className="mt-2 font-display text-4xl font-semibold leading-tight md:text-6xl text-white!"
              style={{
                color: "#ffffff",
                textShadow:
                  "0 2px 20px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
              }}
            >
              {vendor.name}
            </h1>
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          {/* Back link */}
          <Link
            href={`/vendors/${rawCategory}` as Route}
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-rose transition-colors hover:text-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
          >
            <span aria-hidden>←</span> All Ontario {plural.toLowerCase()}
          </Link>

          {/* Portfolio — InteractiveBentoGallery (drag-reorder + click
           * to open lightbox). Only renders when the vendor has 2+
           * additional photos cached. With 0 or 1 photo we fall
           * through to the single-image hero treatment carried by the
           * top of the page. */}
          {bentoMediaItems.length >= 2 && (
            <section
              className="mb-8"
              aria-label="Portfolio"
              style={{ background: "#ffffff" }}
            >
              <div className="mx-auto max-w-4xl px-2">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-[2rem] font-semibold leading-tight text-charcoal">
                    Portfolio
                  </h2>
                  <span className="text-[0.7rem] text-text-muted">
                    Powered by Google
                  </span>
                </div>
              </div>
              <InteractiveBentoGallery
                mediaItems={bentoMediaItems}
                title=""
                description=""
              />
              {galleryPhotos.some((p) => p.attributions.length > 0) && (
                <p
                  className="mx-auto mt-2 max-w-4xl px-4 text-[0.6rem] text-text-muted"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: galleryPhotos
                      .flatMap((p) => p.attributions)
                      .filter((a, idx, arr) => arr.indexOf(a) === idx)
                      .join(" · "),
                  }}
                />
              )}
            </section>
          )}

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            {/* Main column */}
            <div className="lg:col-span-2">
              {/* Rating row */}
              {ratingStr && (
                <div className="mb-8 flex flex-wrap items-center gap-3">
                  <span className="text-2xl leading-none tracking-wider text-gold">
                    {"★".repeat(Math.round(Number(ratingStr)))}
                    <span className="text-border">
                      {"★".repeat(5 - Math.round(Number(ratingStr)))}
                    </span>
                  </span>
                  <span className="font-display text-xl font-semibold text-charcoal">
                    {ratingStr}
                  </span>
                  {vendor.reviewCount != null && (
                    <span className="text-sm text-text-mid">
                      ({vendor.reviewCount.toLocaleString()} Google reviews)
                    </span>
                  )}
                  <span className="text-xs text-text-muted">Powered by Google</span>
                </div>
              )}

              {/* Description */}
              {vendor.description ? (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    About this {label.toLowerCase()}
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-text-mid">
                    {vendor.description}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No editorial description on file yet.
                </p>
              )}

              {/* Specialties chips — render only when enrich-vendor-bios
               * has populated the jsonb array on this row. */}
              {specialtiesList.length > 0 && (
                <div className="mt-6">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-text-muted">
                    Specialties
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {specialtiesList.map((s) => (
                      <li
                        key={s}
                        className="inline-flex items-center rounded-pill border border-rose bg-rose-pale px-3 py-1 text-xs font-medium text-rose"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Service areas — single line, • separated. Specific
               * cities first; we default to "Ontario" only when the
               * AI extraction couldn't pin down a city. */}
              {serviceAreasList.length > 0 && (
                <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-text-mid">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 flex-shrink-0 fill-none stroke-rose"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>
                    <span className="text-text-muted">Serving</span>{" "}
                    <span className="font-medium text-charcoal">
                      {serviceAreasList.join(" · ")}
                    </span>
                  </span>
                </p>
              )}

              {/* Google reviews — hides when no place_id or no reviews */}
              <GoogleReviews reviews={reviews} venueName={vendor.name} />

              {/* Venues this vendor works with */}
              {recommendingVenues.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    Venues this {label.toLowerCase()} works with
                  </h2>
                  <p className="mt-2 text-sm text-text-mid">
                    Recommended on these venues&rsquo; preferred-vendor pages.
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {recommendingVenues.map((v) => (
                      <VenueCard key={v.id} venue={v} />
                    ))}
                  </div>
                </section>
              )}

              {/* Meet the owner — only renders when enrich-vendor-bios
               * has populated owner_name. Years in business is a
               * companion field — both come from the same about-page
               * extraction so they tend to be present together. */}
              {vendor.ownerName && (
                <section className="mt-10 rounded-card border border-border-light bg-bg-soft p-6">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose">
                    Meet the team
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
                    Meet <em className="italic text-rose">{vendor.ownerName}</em>
                  </h2>
                  {vendor.yearsInBusiness != null && (
                    <p className="mt-2 text-sm text-text-mid">
                      <span className="font-bold text-charcoal">{vendor.yearsInBusiness} years</span> serving
                      Ontario couples.
                    </p>
                  )}
                </section>
              )}

              {/* Similar vendors */}
              {similar.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-charcoal">
                    Similar {plural.toLowerCase()} in {regionLabel(vendor.region)}
                  </h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {similar.map((v) => (
                      <VendorCard key={v.id} vendor={v} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar — Details panel */}
            <aside className="lg:col-span-1">
              <div className="sticky top-[76px] rounded-card border-[1.5px] border-border bg-white p-6 shadow-[var(--shadow-card)]">
                <h2 className="font-display text-xl font-semibold text-charcoal">
                  Vendor details
                </h2>

                {/* Verified by Google badge — renders only when the
                 * row has a Google rating, which is the surest signal
                 * the place_id actually resolved to a Google listing. */}
                {vendor.googleRating != null && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-[#EAF2EC] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-green">
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="h-2.5 w-2.5 fill-none stroke-current"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Verified by Google
                  </div>
                )}

                <dl className="mt-5 space-y-4 text-sm">
                  <DetailRow label="Category" value={label} />
                  <DetailRow label="Region" value={regionLabel(vendor.region)} />
                  {vendor.city && <DetailRow label="City" value={vendor.city} />}
                  {vendor.ownerName && <DetailRow label="Owner" value={vendor.ownerName} />}
                  {vendor.yearsInBusiness != null && (
                    <DetailRow
                      label="Years in business"
                      value={`${vendor.yearsInBusiness} years`}
                    />
                  )}
                  {priceLabel && <DetailRow label="Price tier" value={priceLabel} />}
                  {vendor.phone && (
                    <DetailRow
                      label="Phone"
                      value={<a href={`tel:${vendor.phone}`} className="text-rose hover:underline">{vendor.phone}</a>}
                    />
                  )}
                  {vendor.email && (
                    <DetailRow
                      label="Email"
                      value={<a href={`mailto:${vendor.email}`} className="text-rose hover:underline">{vendor.email}</a>}
                    />
                  )}
                  {vendor.website && (
                    <DetailRow
                      label="Website"
                      value={
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener nofollow"
                          className="text-rose hover:underline"
                        >
                          Visit site →
                        </a>
                      }
                    />
                  )}
                  {igHandle && (
                    <DetailRow
                      label="Instagram"
                      value={
                        <a
                          href={`https://instagram.com/${igHandle}`}
                          target="_blank"
                          rel="noopener"
                          className="text-rose hover:underline"
                        >
                          @{igHandle}
                        </a>
                      }
                    />
                  )}
                </dl>
              </div>

              {/* Claim this listing — only when not yet claimed */}
              {!vendor.claimed && (
                <div className="mt-6 rounded-card border border-rose bg-rose-pale p-5">
                  <h3 className="font-display text-lg font-semibold text-charcoal">
                    Is this your business?
                  </h3>
                  <p className="mt-1 text-sm text-text-mid">
                    Claim your free listing to manage your profile and receive
                    quote requests from couples.
                  </p>
                  <Link
                    href={`/claim-listing?business=${encodeURIComponent(vendor.name)}` as Route}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-rose px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    Claim this listing
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Full-width "Ready to book…" CTA band — only renders when
         * there's at least one actionable destination. Buttons are
         * gated individually: Request a quote → mailto if email set;
         * Visit website → vendor.website when present. Book a
         * consultation is a future hook (no calendlyUrl column yet)
         * and stays hidden until that field lands. */}
        {(vendor.email || vendor.website) && (
          <section
            className="mt-16 px-6 py-14"
            style={{ background: "var(--rose, #B96476)" }}
          >
            <div className="mx-auto max-w-[820px] text-center">
              <h2
                className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl"
                style={{ fontStyle: "italic" }}
              >
                Ready to book {vendor.name}?
              </h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                {vendor.email && (
                  <a
                    href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                      `Wedding inquiry for ${vendor.name}`,
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-white px-6 py-3 text-sm font-bold text-rose shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-rose-pale"
                  >
                    Request a quote
                    <span aria-hidden>→</span>
                  </a>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener nofollow"
                    className="inline-flex items-center gap-1.5 rounded-pill border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Visit their website
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
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
