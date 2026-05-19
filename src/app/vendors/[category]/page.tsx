import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues as venuesTable } from "@/lib/schema";
import { listVendors } from "@/lib/queries";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";
import { VendorCard } from "@/components/ui/VendorCard";
import { PicBoothSitePartnerCard } from "@/components/ui/PicBoothSitePartnerCard";
import { VendorFilterSidebar } from "@/components/vendors/VendorFilterSidebar";
import { BreadcrumbSchema, ItemListSchema } from "@/components/seo/SchemaInjector";
import { Pagination } from "@/components/venues/Pagination";
import { categoryColourVars, getCategoryColour } from "@/lib/vendor-colours";
import type { CSSProperties } from "react";

/** Per-category hero photograph rendered behind the listing page's title band. */
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
  const venueSlug = first(raw.venue);
  const radiusRaw = first(raw.radius);
  const page      = Math.max(1, parseInt(first(raw.page) ?? "1", 10) || 1);
  const offset    = (page - 1) * PAGE_SIZE;

  /* Proximity matching when a venue slug is passed */
  const ALLOWED_RADII = [50, 100, 150] as const;
  type RadiusKm = (typeof ALLOWED_RADII)[number];
  const parsedRadius = Number.parseInt(radiusRaw ?? "100", 10);
  const radiusKm: RadiusKm | "all" =
    radiusRaw === "all" ? "all" :
    ALLOWED_RADII.includes(parsedRadius as RadiusKm) ? (parsedRadius as RadiusKm) : 100;

  let venueLat: number | null = null;
  let venueLng: number | null = null;
  let venueName: string | null = null;
  if (venueSlug) {
    const [v] = await db
      .select({ name: venuesTable.name, lat: venuesTable.lat, lng: venuesTable.lng })
      .from(venuesTable)
      .where(eq(venuesTable.slug, venueSlug))
      .limit(1);
    if (v) {
      venueName = v.name;
      const latNum = v.lat == null ? null : Number(v.lat);
      const lngNum = v.lng == null ? null : Number(v.lng);
      if (latNum != null && lngNum != null && Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        venueLat = latNum;
        venueLng = lngNum;
      }
    }
  }

  const showSitePartner = categorySlug === "photo_booth";

  /* Pic Booth now flows through the regular query so the isPinned sort lifts
   * it to the top of the grid with the rose "Recommended Partner" border.
   * The compact Site Partner card above the grid is the editorial brand
   * surface — both can render together. */
  const useProximity = venueLat != null && venueLng != null && radiusKm !== "all";
  const { vendors, total } = await listVendors({
    category: categorySlug,
    region,
    priceTier,
    excludePicBooth: false,
    lat: useProximity ? venueLat! : undefined,
    lng: useProximity ? venueLng! : undefined,
    radiusKm: useProximity ? (radiusKm as number) : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = new URLSearchParams();
  if (region)    baseParams.set("region", region);
  if (priceTier) baseParams.set("priceTier", priceTier);

  /* Pic Booth is now counted in `total` (no longer excluded from the grid),
   * so displayTotal === total. The Site Partner editorial card above the
   * grid is a brand surface, not a separate listing. */
  const displayTotal = total;
  const showingFrom = displayTotal === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + vendors.length, total);

  const breadcrumbItems = [
    { name: "Home",    url: "/" },
    { name: "Vendors", url: "/vendors" },
    { name: label.plural, url: `/vendors/${rawSlug}` },
  ];

  const itemListEntries: { name: string; url: string }[] = [];
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

      <main
        style={categoryColourVars(categorySlug) as CSSProperties}
        className="bg-bg-warm"
      >
        {/* Hero band — category photograph behind a tinted overlay; falls back
         * to the signature colour if no image is mapped for the category. */}
        <section
          className="relative overflow-hidden bg-[var(--cat-primary)] text-white"
        >
          {CATEGORY_HERO_IMAGE[categorySlug] && (
            <>
              <Image
                src={CATEGORY_HERO_IMAGE[categorySlug]}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-50"
              />
              {/* Gradient overlay — keeps the headline readable while letting the photo through */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--cat-primary)]/85 via-[var(--cat-primary)]/55 to-[var(--cat-primary)]/25"
              />
            </>
          )}

          {/* Ghost text decoration */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-[-12px] select-none text-center font-display font-semibold leading-none text-white opacity-[0.08]"
            style={{ fontSize: "clamp(60px, 11vw, 140px)" }}
          >
            {label.plural}
          </span>

          <div className="relative mx-auto max-w-[1280px] px-6 pb-14 pt-10 lg:pb-16 lg:pt-12">
            <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-white/65">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-white">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/vendors" as Route} className="hover:text-white">Vendors</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/90">{label.plural}</li>
              </ol>
            </nav>

            <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">
              Vendor directory
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
              Ontario wedding {label.plural.toLowerCase()}
            </h1>
            <p className="mt-3 max-w-[640px] text-white/85">
              {label.intro}
            </p>

            {/* Count badge */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/15 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              {displayTotal.toLocaleString()} listed
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1280px] px-6 py-10 lg:py-14">

          {/* Sidebar + grid */}
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
            <VendorFilterSidebar
              categorySlug={rawSlug}
              values={{ region, priceTier }}
            />

            <div>
              {/* Radius toggle — only when a venue is locked in */}
              {venueName && (
                <div className="mb-4 rounded-card border border-border bg-bg-soft p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-text-mid">
                      Matching by distance from{" "}
                      <strong className="font-semibold text-charcoal">{venueName}</strong>
                    </div>
                    <div className="inline-flex rounded-pill border border-border bg-white p-1">
                      {([50, 100, 150, "all"] as const).map((r) => {
                        const isActive = (r === "all" && radiusKm === "all") || r === radiusKm;
                        const qs = new URLSearchParams();
                        if (region)    qs.set("region", region);
                        if (priceTier) qs.set("priceTier", priceTier);
                        if (venueSlug) qs.set("venue", venueSlug);
                        qs.set("radius", String(r));
                        const href = `/vendors/${rawSlug}?${qs.toString()}` as Route;
                        return (
                          <Link
                            key={String(r)}
                            href={href}
                            className={`rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                              isActive ? "bg-rose text-white" : "text-text-mid hover:text-rose"
                            }`}
                          >
                            {r === "all" ? "All Ontario" : `${r}km`}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {!venueName && region && (
                <div className="mb-4 rounded-card border border-dashed border-border bg-bg-soft p-3 text-xs text-text-muted">
                  Showing {label.plural.toLowerCase()} in {region.replace(/-/g, " ")} ·
                  Select a venue in the planner for distance matching.
                </div>
              )}

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
