import type { Metadata } from "next";
import { getSiteStats, listVenues } from "@/lib/queries";
import { VenueCard } from "@/components/ui/VenueCard";
import { FilterBar } from "@/components/venues/FilterBar";
import { SortControl } from "@/components/venues/SortControl";
import { Pagination } from "@/components/venues/Pagination";

const PAGE_SIZE = 24;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const raw = await searchParams;
  const page = Math.max(1, parseInt(first(raw.page) ?? "1", 10) || 1);
  const stats = await getSiteStats().catch(() => null);
  const venueLabel = stats ? stats.venueCount.toLocaleString() : "hundreds of";

  return {
    title: "Wedding Venues in Ontario",
    description: `Browse ${venueLabel} Google-verified wedding venues across Ontario. Filter by region, venue type, capacity, catering and indoor/outdoor.`,
    /* Pages 2+ shouldn't compete with the canonical filtered listing for SEO */
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

function intParam(v: string | undefined, fallback = 0): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function asEnum<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;

  const region   = first(raw.region);
  const type     = first(raw.type);
  const capacity = first(raw.capacity);
  const catering = asEnum(first(raw.catering), ["in-house", "open", "both"] as const);
  const indoor   = asEnum(first(raw.indoor),   ["indoor", "outdoor", "both"] as const);
  const sort     = asEnum(first(raw.sort),     ["rating", "reviews", "capacity", "score"] as const);

  const page   = Math.max(1, intParam(first(raw.page), 1));
  const offset = (page - 1) * PAGE_SIZE;

  const result = await listVenues({
    region,
    type,
    capacity: capacity ? Number(capacity) : undefined,
    catering,
    indoor,
    sort,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const showingFrom = result.total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, result.total);

  /* Build canonical baseParams for pagination (drops page, keeps everything else) */
  const baseParams = new URLSearchParams();
  if (region)   baseParams.set("region", region);
  if (type)     baseParams.set("type", type);
  if (capacity) baseParams.set("capacity", capacity);
  if (catering && catering !== "both") baseParams.set("catering", catering);
  if (indoor && indoor !== "both")     baseParams.set("indoor", indoor);
  if (sort)     baseParams.set("sort", sort);

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:py-16">
        <header className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Directory
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-charcoal md:text-5xl">
            Wedding venues in <em className="italic text-rose">Ontario</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Browse {result.total.toLocaleString()} Google-verified venues across
            the province. Filter by region, capacity and style — every listing
            includes coordinator contact, pricing notes and a wedding-readiness
            score.
          </p>
        </header>

        <FilterBar
          values={{ region, type, capacity, catering, indoor }}
          sort={sort}
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-4">
          <p className="text-sm text-text-mid">
            {result.total === 0 ? (
              "No venues match these filters."
            ) : (
              <>
                Showing <span className="font-semibold text-charcoal">{showingFrom}–{showingTo}</span>{" "}
                of <span className="font-semibold text-charcoal">{result.total.toLocaleString()}</span> venues
              </>
            )}
          </p>
          <SortControl current={sort ?? "score"} />
        </div>

        {result.venues.length === 0 ? (
          <div className="mt-12 rounded-card border border-border bg-white p-12 text-center">
            <p className="font-display text-2xl text-charcoal">
              No venues match those filters.
            </p>
            <p className="mt-2 text-text-mid">
              Try widening your region or capacity, or clear filters to start
              over.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          baseParams={baseParams}
        />
      </div>
    </main>
  );
}
