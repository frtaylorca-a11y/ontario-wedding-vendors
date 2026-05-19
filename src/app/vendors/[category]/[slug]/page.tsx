import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getVendorBySlug,
  getSimilarVendors,
  getVenuesRecommendingVendor,
} from "@/lib/queries";
import { getGoogleReviews } from "@/lib/google-reviews";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { GoogleReviews } from "@/components/ui/GoogleReviews";
import { VendorCard } from "@/components/ui/VendorCard";
import { VenueCard } from "@/components/ui/VenueCard";
import { VendorSchema, BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { formatRating } from "@/lib/utils";

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
function regionLabel(slug: string | null): string {
  if (!slug) return "Ontario";
  return slug.split("-").map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join(" ");
}
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

  const [reviews, similar, recommendingVenues] = await Promise.all([
    getGoogleReviews(vendor.placeId),
    getSimilarVendors({
      category: vendor.category,
      region: vendor.region,
      excludeId: vendor.id,
      limit: 3,
    }),
    getVenuesRecommendingVendor(vendor.id, 6),
  ]);

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
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "rgba(28, 20, 25, 0.55)" }}
          />
          <div className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-end px-6 pb-10 text-white">
            <nav aria-label="Breadcrumb" className="mb-5 text-xs font-medium text-white/75">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-white">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/vendors" as Route} className="hover:text-white">Vendors</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={`/vendors/${rawCategory}` as Route} className="hover:text-white">{plural}</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/90">{vendor.name}</li>
              </ol>
            </nav>

            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              {label} · {regionLabel(vendor.region)}
            </div>
            <h1
              className="mt-2 font-display text-4xl font-semibold leading-tight md:text-6xl"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
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

                <dl className="mt-5 space-y-4 text-sm">
                  <DetailRow label="Category" value={label} />
                  <DetailRow label="Region" value={regionLabel(vendor.region)} />
                  {vendor.city && <DetailRow label="City" value={vendor.city} />}
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
