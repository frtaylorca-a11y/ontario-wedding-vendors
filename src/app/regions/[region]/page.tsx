import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { listVenues } from "@/lib/queries";
import { getRegionContent } from "@/lib/region-content";
import { VenueCard } from "@/components/ui/VenueCard";
import { PicBoothFeaturedPartner } from "@/components/ui/PicBoothFeaturedPartner";
import { getZone } from "@/lib/zones";
import {
  BreadcrumbSchema,
  FaqSchema,
  ItemListSchema,
} from "@/components/seo/SchemaInjector";

type Params = Promise<{ region: string }>;

const VENUE_LIMIT = 12;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { region } = await params;
  const r = getRegion(region);
  if (!r) return { title: "Region not found" };

  const { total } = await listVenues({ region: r.slug, limit: 1 });
  const countLabel = total.toLocaleString();

  const title = `${r.label} Wedding Venues | Browse ${countLabel} Venues in ${r.label}, Ontario`;
  const desc = `${countLabel} Google-verified ${r.label} wedding venues. Compare capacity, catering, pricing notes and coordinator details — all in one directory.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/regions/${r.slug}` },
    openGraph: { title, description: desc, url: `/regions/${r.slug}`, type: "website" },
  };
}

export default async function RegionPage({ params }: { params: Params }) {
  const { region } = await params;
  const r = getRegion(region);
  if (!r) notFound();

  const content = getRegionContent(r.slug);
  const { venues, total } = await listVenues({
    region: r.slug,
    limit: VENUE_LIMIT,
    sort: "score",
  });

  const heroImage = content?.image ?? "/images/venue-winery.png";
  const intro =
    content?.intro ??
    `Browse Google-verified wedding venues across ${r.label}, Ontario. Compare capacity, catering, indoor/outdoor spaces and coordinator details — every venue carries a wedding-readiness score based on objective criteria.`;
  const faqs = content?.faqs ?? [];
  const highlightTypes = content?.highlightTypes ?? [];

  const breadcrumbItems = [
    { name: "Home",    url: "/" },
    { name: "Regions", url: "/venues" },
    { name: r.label,   url: `/regions/${r.slug}` },
  ];

  const showPicBoothPartner = getZone(r.slug) === "niagara-gta";

  const itemListEntries = venues.map((v) => ({
    name: v.name,
    url: `/venues/${v.slug}`,
  }));

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <ItemListSchema name={`Wedding venues in ${r.label}, Ontario`} items={itemListEntries} />
      {faqs.length > 0 && <FaqSchema items={faqs} />}

      <main className="bg-bg-warm">
        {/* Hero */}
        <section className="relative h-[420px] overflow-hidden md:h-[500px]">
          <Image
            src={heroImage}
            alt={`${r.label} wedding venues — Ontario`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(28,20,25,0.45) 0%, rgba(28,20,25,0.65) 100%)",
            }}
          />
          <div className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-end px-6 pb-12 text-white">
            <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-white/75">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href={"/" as Route} className="hover:text-white">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={"/venues" as Route} className="hover:text-white">Venues</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/90">{r.label}</li>
              </ol>
            </nav>

            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Region
            </div>
            <h1
              className="mt-2 font-display text-4xl font-semibold leading-tight md:text-6xl"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {r.label} <em className="italic text-rose">Wedding Venues</em>
            </h1>
            <p
              className="mt-3 text-sm text-white/85 md:text-base"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              {total.toLocaleString()} Google-verified venues across {r.label}, Ontario
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          {/* Editorial intro */}
          <section className="mb-12 max-w-[760px]">
            <p className="text-base leading-relaxed text-text-mid md:text-lg">
              {intro}
            </p>
          </section>

          {/* Venues grid */}
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-semibold text-charcoal">
                Top {venues.length} venues in {r.label}
              </h2>
              {total > venues.length && (
                <Link
                  href={`/venues?region=${r.slug}` as Route}
                  className="text-sm font-bold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                >
                  See all {total.toLocaleString()} {r.label} venues →
                </Link>
              )}
            </div>

            {venues.length === 0 ? (
              <p className="rounded-card border border-dashed border-border bg-white p-8 text-center text-text-mid">
                No venues match the publication threshold in {r.label} yet.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {venues.map((v) => (
                  <VenueCard key={v.id} venue={v} />
                ))}
              </div>
            )}
          </section>

          {/* Browse by type within this region */}
          {highlightTypes.length > 0 && (
            <section className="mt-16 rounded-card border border-border bg-white p-7 lg:p-9">
              <h2 className="font-display text-2xl font-semibold text-charcoal">
                Browse {r.label} venues by type
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {highlightTypes.map((t) => (
                  <li key={t.type}>
                    <Link
                      href={`/venues?region=${r.slug}&type=${t.type}` as Route}
                      className="inline-flex items-center rounded-pill border border-border bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                    >
                      {t.label} in {r.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={`/venues?region=${r.slug}` as Route}
                    className="inline-flex items-center rounded-pill bg-rose px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    All {r.label} venues →
                  </Link>
                </li>
              </ul>
            </section>
          )}

          {/* Featured Partner — niagara-gta zone only (Pic Booth serves this area) */}
          {showPicBoothPartner && (
            <section className="mt-16">
              <PicBoothFeaturedPartner
                contextLabel={r.label}
                contextSlug={r.slug}
                source="region"
              />
            </section>
          )}

          {/* FAQ */}
          {faqs.length > 0 && (
            <section className="mt-16">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
                Frequently asked
              </div>
              <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
                Planning a wedding in {r.label}
              </h2>
              <div className="mt-6 space-y-4">
                {faqs.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-card border border-border bg-white p-5 transition-colors hover:border-rose"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-semibold text-charcoal marker:hidden [&::-webkit-details-marker]:hidden">
                      {f.question}
                      <span
                        aria-hidden
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-rose transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-base leading-relaxed text-text-mid">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
