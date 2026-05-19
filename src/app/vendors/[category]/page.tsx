import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listVendors } from "@/lib/queries";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { VendorCard } from "@/components/ui/VendorCard";
import { PicBoothSitePartnerCard } from "@/components/ui/PicBoothSitePartnerCard";
import { VendorFilterSidebar } from "@/components/vendors/VendorFilterSidebar";
import { BreadcrumbSchema, ItemListSchema } from "@/components/seo/SchemaInjector";
import { Pagination } from "@/components/venues/Pagination";

const PAGE_SIZE = 24;

type Params = Promise<{ category: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** URL slug → DB category. URLs use hyphens; DB stores underscores. */
function normalizeCategory(slug: string): string {
  return slug.replace(/-/g, "_");
}

const LABEL: Record<VendorCategory, { plural: string; intro: string }> = {
  photographer:  { plural: "Photographers",          intro: "Wedding photographers across Ontario — from photojournalists to fine-art portrait specialists." },
  videographer:  { plural: "Videographers",          intro: "Cinematic wedding videographers and same-day-edit teams." },
  dj:            { plural: "DJs",                    intro: "Wedding DJs covering ceremony, cocktail, and reception across Ontario." },
  florist:       { plural: "Florists",               intro: "Wedding florists for bouquets, ceremony arches, and reception centrepieces." },
  photo_booth:   { plural: "Photo Booths",           intro: "Wedding photo booth companies serving Ontario — open-air, enclosed, sailcloth, and luxury cabinet setups." },
  catering:      { plural: "Caterers",               intro: "Wedding caterers serving Ontario venues — plated, family-style, station, and food-truck formats." },
  cake:          { plural: "Cake Designers",         intro: "Wedding cake designers and dessert bar specialists across Ontario." },
  hair_makeup:   { plural: "Hair & Makeup Artists",  intro: "Bridal hair and makeup artists across Ontario." },
  officiant:       { plural: "Officiants",             intro: "Wedding officiants — civil, religious, and humanist ceremonies across Ontario." },
  limo:            { plural: "Limo & Transportation",  intro: "Wedding-day transportation: limos, vintage cars, party buses, and shuttle services." },
  lighting_decor:  { plural: "Lighting & Decor",       intro: "Wedding lighting designers, drapery and decor specialists across Ontario." },
  wedding_planner: { plural: "Wedding Planners",       intro: "Wedding planners — full-service coordination, month-of, and day-of packages across Ontario." },
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isValidCategory(slug: string): slug is VendorCategory {
  return (VENDOR_CATEGORIES as readonly string[]).includes(slug);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category } = await params;
  const normalized = normalizeCategory(category);
  if (!isValidCategory(normalized)) return { title: "Category not found" };

  const label = LABEL[normalized];
  const { total } = await listVendors({ category: normalized, limit: 1 });
  const displayTotal = total + (normalized === "photo_booth" ? 1 : 0);

  const raw = await searchParams;
  const page = Math.max(1, parseInt(first(raw.page) ?? "1", 10) || 1);

  return {
    title: `Wedding ${label.plural} in Ontario | Browse ${displayTotal.toLocaleString()} ${label.plural}`,
    description: `${displayTotal.toLocaleString()} verified wedding ${label.plural.toLowerCase()} across Ontario. Filter by region and price. Compare reviews, packages, and availability.`,
    alternates: { canonical: `/vendors/${category}` },
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function VendorCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { category: rawSlug } = await params;
  const categorySlug = normalizeCategory(rawSlug);
  if (!isValidCategory(categorySlug)) notFound();

  const label = LABEL[categorySlug];
  const raw = await searchParams;

  const region    = first(raw.region);
  const priceTier = first(raw.priceTier);
  const page      = Math.max(1, parseInt(first(raw.page) ?? "1", 10) || 1);
  const offset    = (page - 1) * PAGE_SIZE;

  const showSitePartner = categorySlug === "photo_booth";

  const { vendors, total } = await listVendors({
    category: categorySlug,
    region,
    priceTier,
    excludePicBooth: showSitePartner,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = new URLSearchParams();
  if (region)    baseParams.set("region", region);
  if (priceTier) baseParams.set("priceTier", priceTier);

  /* Site-partner card counts as 1 in display total when present on page 1 */
  const displayTotal = total + (showSitePartner ? 1 : 0);
  const sitePartnerCounted = showSitePartner && page === 1 ? 1 : 0;
  const showingFrom = displayTotal === 0 ? 0 : offset + (sitePartnerCounted ? 1 : 1);
  const showingTo = Math.min(offset + vendors.length, total) + sitePartnerCounted;

  const breadcrumbItems = [
    { name: "Home",    url: "/" },
    { name: "Vendors", url: "/vendors" },
    { name: label.plural, url: `/vendors/${rawSlug}` },
  ];

  const itemListEntries: { name: string; url: string }[] = [];
  if (showSitePartner && page === 1) {
    itemListEntries.push({
      name: "Pic Booth",
      url: "/vendors/photo-booth/pic-booth-st-catharines",
    });
  }
  vendors.forEach((v) => {
    itemListEntries.push({ name: v.name, url: `/vendors/${rawSlug}/${v.slug}` });
  });

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <ItemListSchema
        name={`Wedding ${label.plural.toLowerCase()} in Ontario`}
        items={itemListEntries}
      />

      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[1280px] px-6 py-12 lg:py-16">
          {/* Page header */}
          <header className="mb-10">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs font-medium text-text-muted">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-rose">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/vendors" as Route} className="hover:text-rose">Vendors</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-charcoal">{label.plural}</li>
              </ol>
            </nav>

            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Vendor directory
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
              Ontario wedding{" "}
              <em className="italic text-rose">{label.plural.toLowerCase()}</em>
            </h1>
            <p className="mt-3 max-w-[640px] text-text-mid">
              {label.intro} {displayTotal.toLocaleString()} listed.
            </p>
          </header>

          {/* Sidebar + grid */}
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
            <VendorFilterSidebar
              categorySlug={rawSlug}
              values={{ region, priceTier }}
            />

            <div>
              {/* Result count */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-4">
                <p className="text-sm text-text-mid">
                  {displayTotal === 0 ? (
                    "No vendors match these filters."
                  ) : (
                    <>
                      Showing <span className="font-semibold text-charcoal">{showingFrom}–{showingTo}</span>{" "}
                      of <span className="font-semibold text-charcoal">{displayTotal.toLocaleString()}</span>{" "}
                      {label.plural.toLowerCase()}
                    </>
                  )}
                </p>
              </div>

              {/* Site Partner pinned card — page 1, photo_booth only */}
              {showSitePartner && page === 1 && (
                <div className="mb-6">
                  <PicBoothSitePartnerCard />
                </div>
              )}

              {/* Vendor grid */}
              {vendors.length === 0 ? (
                <div className="rounded-card border border-dashed border-border bg-white p-10 text-center">
                  <p className="font-display text-xl text-charcoal">
                    {showSitePartner && page === 1
                      ? `Full ${label.plural} directory expanding soon.`
                      : `No ${label.plural.toLowerCase()} match those filters.`}
                  </p>
                  <p className="mt-2 text-sm text-text-mid">
                    {showSitePartner && page === 1
                      ? "We're importing the rest of the Ontario photo booth directory now. Check back shortly."
                      : "Try widening your region or clearing filters."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {vendors.map((v) => (
                    <VendorCard key={v.id} vendor={v} />
                  ))}
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                baseParams={baseParams}
                basePath={`/vendors/${rawSlug}`}
                ariaLabel="Vendor pagination"
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
