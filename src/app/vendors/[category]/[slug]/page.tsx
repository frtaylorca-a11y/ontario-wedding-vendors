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
  listVendors,
} from "@/lib/queries";
import {
  getGoogleReviews,
  loadCachedAdditionalPhotos,
  type GoogleVendorPhoto,
} from "@/lib/google-reviews";
import InteractiveBentoGallery from "@/components/ui/interactive-bento-gallery";
import { FaqAccordion, type FaqItem } from "@/components/ui/FaqAccordion";
import { PlanningResources } from "@/components/ui/PlanningResources";
import { resolveVendorResources } from "@/lib/vendor-resources-resolver";
import { SocialPresence, FindThemOnline, type VendorSocial } from "@/components/ui/VendorSocialLinks";
import { googleMapsUrl } from "@/lib/google-maps";
import { ItemListSchema } from "@/components/seo/SchemaInjector";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { GoogleReviews } from "@/components/ui/GoogleReviews";
import { VendorCard } from "@/components/ui/VendorCard";
import { VenueCard } from "@/components/ui/VenueCard";
import { VendorSchema, BreadcrumbSchema, FaqSchema } from "@/components/seo/SchemaInjector";
import { TrackPageView } from "@/components/analytics/TrackPageView";
import { formatRating, normalizeRegionDisplay } from "@/lib/utils";
import type { Vendor } from "@/lib/schema";

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

/* ─── City landing pages ────────────────────────────────────────────
 * /vendors/[category]/[slug] dispatches to a city listing when the
 * slug matches one of these 19 SEO-target cities. Vendors are
 * extremely unlikely to share a slug with one of these single-word
 * city names (vendor slugs are typically business names + city
 * combined, e.g. "lauren-garbutt-photography-hamilton"), but the
 * city branch runs FIRST so any collision lands on the city page.
 *
 * Region mapping mirrors src/lib/regions.ts so listVendors() can
 * filter by region — but we ALSO filter by exact city match below,
 * since two different cities can share a region.
 */
const SEO_CITIES: Record<string, { label: string; region: string }> = {
  hamilton:                { label: "Hamilton",              region: "golden-horseshoe"      },
  burlington:              { label: "Burlington",            region: "golden-horseshoe"      },
  "niagara-falls":         { label: "Niagara Falls",         region: "niagara"               },
  "st-catharines":         { label: "St. Catharines",        region: "niagara"               },
  "niagara-on-the-lake":   { label: "Niagara-on-the-Lake",   region: "niagara"               },
  toronto:                 { label: "Toronto",               region: "gta"                   },
  mississauga:             { label: "Mississauga",           region: "gta"                   },
  oakville:                { label: "Oakville",              region: "golden-horseshoe"      },
  markham:                 { label: "Markham",               region: "gta"                   },
  vaughan:                 { label: "Vaughan",               region: "gta"                   },
  brampton:                { label: "Brampton",              region: "gta"                   },
  kitchener:               { label: "Kitchener",             region: "waterloo-region"       },
  waterloo:                { label: "Waterloo",              region: "waterloo-region"       },
  guelph:                  { label: "Guelph",                region: "waterloo-region"       },
  kingston:                { label: "Kingston",              region: "eastern"               },
  ottawa:                  { label: "Ottawa",                region: "eastern"               },
  huntsville:              { label: "Huntsville",            region: "cottage-country"       },
  bracebridge:             { label: "Bracebridge",           region: "cottage-country"       },
  picton:                  { label: "Picton",                region: "prince-edward-county"  },
};
const CITY_SLUGS = new Set(Object.keys(SEO_CITIES));
function isCitySlug(s: string): boolean {
  return CITY_SLUGS.has(s);
}

/* Trim a description to ~150 chars at a word boundary so the meta
 * description doesn't slice a word in half. Falls back to a templated
 * sentence when no description exists. */
function buildMetaDescription(
  vendor: Pick<Vendor, "name" | "description" | "city" | "region">,
  categoryLabel: string,
): string {
  if (vendor.description && vendor.description.trim().length > 0) {
    const raw = vendor.description.trim().replace(/\s+/g, " ");
    if (raw.length <= 150) return raw;
    const sliceEnd = raw.lastIndexOf(" ", 150);
    const cut = sliceEnd > 100 ? sliceEnd : 150;
    return raw.slice(0, cut).replace(/[.,;:—-]+$/, "") + "…";
  }
  const city = vendor.city ?? normalizeRegionDisplay(vendor.region);
  return (
    `${vendor.name} is a ${city} ${categoryLabel.toLowerCase()} serving ` +
    `${city} and surrounding Ontario communities. View portfolio, ratings, and request a quote.`
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: rawCategory, slug } = await params;
  const requestedCategory = normalizeCategorySlug(rawCategory);

  /* City branch — runs BEFORE the vendor lookup so a SEO-target city
   * slug never accidentally resolves to a vendor with the same name. */
  if (isCitySlug(slug)) {
    if (!isValidCategory(requestedCategory)) return { title: "Page not found" };
    const cityMeta = SEO_CITIES[slug];
    const label    = CATEGORY_PLURAL[requestedCategory];
    const { total } = await listVendors({
      category: requestedCategory,
      city:     cityMeta.label,
      limit:    1,
    });
    const cityTitle =
      `Wedding ${label} in ${cityMeta.label}, Ontario — ` +
      `${total.toLocaleString()} Verified ${label}`;
    const cityDesc =
      `Find the best wedding ${label.toLowerCase()} in ${cityMeta.label}, Ontario. ` +
      `Browse ${total.toLocaleString()} verified ${label.toLowerCase()} with real reviews and direct quote requests.`;
    return {
      title:       cityTitle,
      description: cityDesc.slice(0, 160),
      alternates:  { canonical: `/vendors/${rawCategory}/${slug}` },
      openGraph: {
        title:       cityTitle,
        description: cityDesc.slice(0, 160),
        type:        "website",
        url:         `${SITE_URL}/vendors/${rawCategory}/${slug}`,
      },
    };
  }

  /* Vendor branch — original behaviour. */
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor not found" };

  const category = vendor.category;
  const isValid = isValidCategory(category);
  const label = isValid ? CATEGORY_LABEL[category] : "Wedding Vendor";
  const city = vendor.city ?? regionLabel(vendor.region);
  /* Title format per the SEO brief — vendor name + categoryLabel +
   * city + Ontario + site name. ~70-80 chars typical. */
  const title = `${vendor.name} — Wedding ${label} in ${city}, Ontario`;
  const desc  = buildMetaDescription(vendor, `Wedding ${label}`);

  /* Thin-content gate: when the row hasn't earned indexability,
   * the page still serves but search engines skip it. follow=true
   * keeps anchor-linked pages reachable from this one. */
  const indexable = vendor.isIndexable === true;

  return {
    title,
    description: desc,
    alternates: { canonical: `/vendors/${category.replace(/_/g, "-")}/${vendor.slug}` },
    robots: indexable
      ? { index: true,  follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description: desc,
      type: "website",
      url: `${SITE_URL}/vendors/${category.replace(/_/g, "-")}/${vendor.slug}`,
    },
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

/* vendor.faqs is stored as jsonb (unknown). Coerce defensively — drop
 * any entry missing a question or answer string, and cap at 5 so a
 * scraper bug can't blow up the page. The page expects the shape:
 *   [{ question: string; answer: string; source?: string }] */
function parseVendorFaqs(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FaqItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = (item as { question?: unknown }).question;
    const a = (item as { answer?:   unknown }).answer;
    if (typeof q !== "string" || typeof a !== "string") continue;
    if (q.trim().length === 0 || a.trim().length === 0)  continue;
    out.push({ question: q.trim(), answer: a.trim() });
    if (out.length >= 5) break;
  }
  return out;
}

export default async function VendorPage({ params }: { params: Params }) {
  const { category: rawCategory, slug } = await params;
  const requestedCategory = normalizeCategorySlug(rawCategory);

  /* City landing page branch — runs before the vendor lookup. */
  if (isCitySlug(slug)) {
    if (!isValidCategory(requestedCategory)) notFound();
    return <CityLandingPage rawCategory={rawCategory} citySlug={slug} />;
  }

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

  const [reviews, galleryPhotos, similar, recommendingVenues, planningResources] = await Promise.all([
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
    resolveVendorResources(vendor.category as VendorCategory),
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
  /* Gallery alt text per the SEO brief — vendor name + category +
   * portfolio + city + Ontario + (photo N). The InteractiveBentoGallery
   * uses item.title as the <img alt> via its MediaItem component, so
   * we set title to the full SEO string per item. */
  const bentoMediaItems = (galleryPhotos as GoogleVendorPhoto[])
    .slice(0, 6)
    .map((p, i) => ({
      id:    i + 1,
      type:  "image",
      title: `${vendor.name} — Wedding ${label} portfolio, ${vendor.city ?? regionLabel(vendor.region) ?? "Ontario"} Ontario (photo ${i + 1})`,
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

  /* Bundle the social fields for the SocialPresence + FindThemOnline
   * components. Both render progressively — null/missing channels
   * are skipped, the whole section hides when nothing is set. */
  const social: VendorSocial = {
    vendorName:      vendor.name,
    instagramHandle: vendor.instagramHandle ?? null,
    yelpUrl:         vendor.yelpUrl ?? null,
    pinterestUrl:    vendor.pinterestUrl ?? null,
    website:         vendor.website ?? null,
    googleRating:    vendor.googleRating ?? null,
    reviewCount:     vendor.reviewCount ?? null,
  };
  const gMapsUrl = googleMapsUrl(vendor.placeId);

  /* Breadcrumb now carries a city item between the category and the
   * vendor name when a city is on file. Routes through the city
   * landing page at /vendors/[category]/[city-slug]. */
  const citySlugForBreadcrumb = vendor.city
    ? vendor.city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : null;
  const breadcrumbItems = [
    { name: "Home",     url: "/" },
    { name: "Vendors",  url: "/vendors" },
    { name: plural,     url: `/vendors/${rawCategory}` },
    ...(vendor.city && citySlugForBreadcrumb
      ? [{ name: vendor.city, url: `/vendors/${rawCategory}/${citySlugForBreadcrumb}` }]
      : []),
    { name: vendor.name, url: `/vendors/${rawCategory}/${vendor.slug}` },
  ];

  /* Vendor-website FAQs scraped by enrich-vendor-bios.ts. The Part-2
   * hybrid (3 from vendor + 2 OWV-generated) is deferred — for now we
   * surface only what the vendor actually published themselves so the
   * answers stay accurate to their offering. */
  const vendorFaqs: FaqItem[] = parseVendorFaqs(vendor.faqs);

  return (
    <>
      <TrackPageView
        contentType="vendor"
        contentName={vendor.name}
        contentCategory={vendor.category}
      />
      <VendorSchema vendor={vendor} imageUrl={heroImage} />
      <BreadcrumbSchema items={breadcrumbItems} />
      {vendorFaqs.length > 0 && (
        <FaqSchema
          items={vendorFaqs.map((f) => ({ question: f.question, answer: f.answer }))}
        />
      )}

      <main className="bg-bg-warm">
        {/* Hero */}
        <section className="relative h-[360px] overflow-hidden md:h-[440px]">
          <Image
            src={heroImage}
            alt={`${vendor.name} — Wedding ${label} in ${vendor.city ?? regionLabel(vendor.region) ?? "Ontario"} Ontario`}
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
            {/* H2 below the H1 — keyword-tight subheading that pairs
             * the category and city. Renders only when a city is on
             * file (otherwise the H1 → category-region eyebrow combo
             * carries the SEO signal). */}
            {vendor.city && (
              <h2
                className="mt-2 font-display text-lg font-medium md:text-2xl"
                style={{
                  color: "rgba(255,255,255,0.95)",
                  textShadow: "0 1px 8px rgba(0,0,0,0.7)",
                }}
              >
                Wedding {label} in {vendor.city}, Ontario
              </h2>
            )}
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

              {/* Social presence pill row — IG / Yelp / Pinterest /
                * Website. Only renders when at least one channel exists. */}
              <SocialPresence social={social} />

              {/* Google reviews. The component now falls back to a
                * rating + count callout when no excerpts are cached,
                * and hides entirely when neither is available. */}
              <GoogleReviews
                reviews={reviews}
                venueName={vendor.name}
                googleRating={vendor.googleRating ?? null}
                reviewCount={vendor.reviewCount ?? null}
                googleMapsUrl={gMapsUrl}
              />

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

              {/* Planning Resources — how-to + cost cards, plus the
               * Featured Local Provider card on photo_booth pages
               * (except Pic Booth's own listing). */}
              <PlanningResources
                resources={planningResources}
                showPicBoothCard={
                  vendor.category === "photo_booth" && vendor.slug !== "pic-booth"
                }
              />

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

              {/* Claim this listing — only when not yet claimed.
               * Expanded panel with the bullet list per the spec; sits
               * in the sidebar so it's persistently visible alongside
               * the vendor details. */}
              {!vendor.claimed && (
                <div className="mt-6 rounded-card border border-rose bg-rose-pale p-5">
                  <h3 className="font-display text-lg font-semibold text-charcoal">
                    Is this your business?
                  </h3>
                  <p className="mt-2 text-sm text-text-mid">
                    This profile was built from public information. Claim it free to:
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-text-mid">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-rose" aria-hidden>✓</span>
                      Add your own photos
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-rose" aria-hidden>✓</span>
                      Update your description
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-rose" aria-hidden>✓</span>
                      Receive quote requests
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-rose" aria-hidden>✓</span>
                      See profile analytics
                    </li>
                  </ul>
                  <Link
                    href={`/claim-listing?business=${encodeURIComponent(vendor.name)}` as Route}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-rose px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    Claim this listing
                    <span aria-hidden>→</span>
                  </Link>
                  <p className="mt-2 text-[0.7rem] text-text-muted">
                    Free forever · Takes 2 minutes
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Find them online — full card grid. Only renders for vendors
         * with NO traditional website but WITH one or more social
         * channels (Instagram/Yelp/Pinterest). Acts as the substitute
         * for the "Visit website" CTA when we don't have a website. */}
        <div className="mx-auto mt-12 max-w-[1180px] px-6">
          <FindThemOnline social={social} />
        </div>

        {/* Vendor FAQ — rendered when the vendor's own website had a
         * FAQ page that we extracted via enrich-vendor-bios.ts. Site-
         * scraped FAQs only for now; the hybrid OWV-generated ones
         * land in Task D Part 2. */}
        {vendorFaqs.length > 0 && (
          <div className="mx-auto mt-12 max-w-[1180px] px-6">
            <FaqAccordion
              items={vendorFaqs}
              heading="Frequently asked questions"
              subheading={`Answers ${vendor.name} provides on their own website.`}
            />
          </div>
        )}

        {/* Full-width "Ready to book…" CTA band. The primary "Request a
         * quote" button always renders — it routes through OWV's own
         * quote flow regardless of what other channels the vendor has.
         * Secondary buttons surface based on data available:
         *   - Visit website     when vendor.website is set
         *   - View on Instagram when vendor.instagramHandle is set
         *   - Read Yelp reviews when vendor.yelpUrl is set
         *   - Call [phone]      when vendor.phone is set
         */}
        <section
          className="mt-16 px-6 py-14"
          style={{ background: "var(--rose, #B96476)" }}
        >
          <div className="mx-auto max-w-[920px] text-center">
            <h2
              className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl"
              style={{ fontStyle: "italic" }}
            >
              Ready to book {vendor.name}?
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {/* Primary — always renders. Falls back to a generic
               * inquiry mailto when the vendor has no email on file. */}
              <a
                href={
                  vendor.email
                    ? `mailto:${vendor.email}?subject=${encodeURIComponent(`Wedding inquiry for ${vendor.name}`)}`
                    : `/contact?vendor=${encodeURIComponent(vendor.slug)}`
                }
                className="inline-flex items-center gap-1.5 rounded-pill bg-white px-6 py-3 text-sm font-bold text-rose shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:bg-rose-pale"
              >
                Request a quote
                <span aria-hidden>→</span>
              </a>

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-1.5 rounded-pill border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Visit website
                  <span aria-hidden>↗</span>
                </a>
              )}

              {social.instagramHandle && (
                <a
                  href={`https://instagram.com/${social.instagramHandle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-1.5 rounded-pill border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  View on Instagram
                  <span aria-hidden>↗</span>
                </a>
              )}

              {social.yelpUrl && (
                <a
                  href={social.yelpUrl}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-1.5 rounded-pill border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Read Yelp reviews
                  <span aria-hidden>↗</span>
                </a>
              )}

              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone.replace(/[^+\d]/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-pill border-2 border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Call {vendor.phone}
                  <span aria-hidden>→</span>
                </a>
              )}
            </div>
          </div>
        </section>
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

/* ─── City landing page ────────────────────────────────────────────
 * Rendered when /vendors/[category]/[slug] is a known SEO-target
 * city. Lists vendors in that city's region, sorted by the standard
 * listVendors ranking. ItemList JSON-LD on output so Google can
 * pull a sitelink-style listing into the SERP. Content layer (intro
 * paragraph, FAQ) lands in a separate commit — page is functional +
 * indexable without it. */
async function CityLandingPage({
  rawCategory,
  citySlug,
}: {
  rawCategory: string;
  citySlug:    string;
}) {
  const requestedCategory = normalizeCategorySlug(rawCategory);
  if (!isValidCategory(requestedCategory)) notFound();
  const cityMeta = SEO_CITIES[citySlug];
  const label    = CATEGORY_LABEL[requestedCategory as VendorCategory];
  const plural   = CATEGORY_PLURAL[requestedCategory as VendorCategory];
  const heroImg  = CATEGORY_HERO_IMAGE[requestedCategory as VendorCategory];

  /* Use the standard listVendors helper so the city page benefits
   * from the same ranking + is_hidden filtering as the parent
   * category page. Filter by city only — region is implied. Adding
   * both filters caused empty pages when a row's region column
   * didn't match the expected mapping (Hamilton vendors sometimes
   * land in 'gta' rather than 'golden-horseshoe' depending on
   * how they were tagged during import). */
  const { vendors: cityVendors, total } = await listVendors({
    category: requestedCategory,
    city:     cityMeta.label,
    limit:    24,
  });

  const breadcrumbItems = [
    { name: "Home",          url: "/" },
    { name: "Vendors",       url: "/vendors" },
    { name: plural,          url: `/vendors/${rawCategory}` },
    { name: cityMeta.label,  url: `/vendors/${rawCategory}/${citySlug}` },
  ];

  const itemListItems = cityVendors.map((v) => ({
    name: v.name,
    url:  `${SITE_URL}/vendors/${rawCategory}/${v.slug}`,
  }));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <ItemListSchema
        name={`Wedding ${plural} in ${cityMeta.label}, Ontario`}
        items={itemListItems}
      />

      <main className="bg-bg-warm">
        {/* Slim hero — keeps the page light since the vendor grid
         * carries most of the page weight. */}
        <section className="relative h-[260px] overflow-hidden md:h-[320px]">
          <Image
            src={heroImg}
            alt={`Wedding ${label.toLowerCase()} in ${cityMeta.label}, Ontario`}
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
            <div
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{
                color:      "rgba(255,255,255,0.85)",
                textShadow: "0 1px 8px rgba(0,0,0,0.6)",
              }}
            >
              {cityMeta.label} · Ontario
            </div>
            <h1
              className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl"
              style={{
                color:      "#ffffff",
                textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)",
              }}
            >
              Wedding {plural} in {cityMeta.label}, Ontario
            </h1>
            <p
              className="mt-2 text-sm md:text-base"
              style={{
                color:      "rgba(255,255,255,0.92)",
                textShadow: "0 1px 8px rgba(0,0,0,0.6)",
              }}
            >
              {total.toLocaleString()} verified {plural.toLowerCase()}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          <Link
            href={`/vendors/${rawCategory}` as Route}
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-rose transition-colors hover:text-rose-hover"
          >
            <span aria-hidden>←</span> All Ontario {plural.toLowerCase()}
          </Link>

          {cityVendors.length === 0 ? (
            <div className="rounded-card border border-dashed border-border bg-white p-10 text-center text-text-muted">
              <p>
                No verified {plural.toLowerCase()} in {cityMeta.label} yet.
              </p>
              <Link
                href={`/vendors/${rawCategory}` as Route}
                className="mt-4 inline-flex rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white"
              >
                Browse all Ontario {plural.toLowerCase()}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cityVendors.map((v) => (
                <li key={v.id}>
                  <VendorCard vendor={v} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
