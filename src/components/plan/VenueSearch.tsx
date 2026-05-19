"use client";

import { useEffect, useRef, useState } from "react";
import type { Venue } from "@/lib/schema";

type Props = {
  venueId: number | null;
  venueName: string | null;
  venueCity: string | null;
  /** Region from the calculator — used to bias initial search results */
  region: string;
  /** Live venue count from getSiteStats — drives the hint text */
  totalVenueCount?: number;
  onSelect: (
    venue:
      | {
          id: number;
          slug: string;
          name: string;
          city: string | null;
          region: string | null;
          venueType: string | null;
          capacityMax: number | null;
          catering: string | null;
        }
      | null,
  ) => void;
};

function regionLabel(slug: string | null): string {
  if (!slug) return "Ontario";
  return slug.split("-").map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join(" ");
}

export function VenueSearch({ venueId, venueName, venueCity, region, totalVenueCount, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Debounced search */
  useEffect(() => {
    if (!isEditing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "5",
          score: "0",
        });
        if (region && region !== "other") params.set("region", region);
        const res = await fetch(`/api/venues?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.venues ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, region, isEditing]);

  /* Locked state — venue already selected */
  if (venueId && venueName && !isEditing) {
    return (
      <section className="rounded-card border-[1.5px] border-rose bg-rose-pale p-6 lg:p-8">
        <header className="mb-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Step 2 · Venue
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Your venue is locked in
          </h2>
        </header>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-pill bg-rose px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-white">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Venue selected
            </div>
            <div className="mt-2 font-display text-2xl font-semibold text-charcoal">
              {venueName}
            </div>
            {venueCity && (
              <div className="mt-0.5 text-sm text-text-mid">{venueCity}</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setQuery("");
              setResults([]);
            }}
            className="rounded-pill border border-rose bg-white px-4 py-2 text-sm font-medium text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Change venue
          </button>
        </div>

        <p className="mt-4 text-sm text-text-mid">
          Step 3 unlocks the 12 vendor slots based on your venue&rsquo;s region.
        </p>
      </section>
    );
  }

  /* Search state */
  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 2 · Venue
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your venue unlocks your vendor list
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          Pick the venue you&rsquo;ve booked (or want to book) — vendors will
          match to its region.
        </p>
      </header>

      <div className="relative">
        <input
          type="search"
          autoComplete="off"
          placeholder="Search by venue name (e.g. Stonefields, Ovation)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsEditing(true)}
          className="w-full rounded-pill border border-border bg-white px-5 py-3 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        />
        {loading && (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
            Searching…
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    id:          v.id,
                    slug:        v.slug,
                    name:        v.name,
                    city:        v.city,
                    region:      v.region,
                    venueType:   v.venueType,
                    capacityMax: v.capacityMax,
                    catering:    v.catering,
                  });
                  setIsEditing(false);
                  setQuery("");
                  setResults([]);
                }}
                className="group flex w-full items-start justify-between gap-4 rounded-card border border-border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-rose hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold text-charcoal">
                    {v.name}
                  </div>
                  <div className="mt-0.5 text-xs text-text-mid">
                    {v.city ? `${v.city} · ` : ""}
                    {regionLabel(v.region)}
                    {v.venueType ? ` · ${v.venueType}` : ""}
                  </div>
                </div>
                <span className="rounded-pill bg-rose-pale px-3 py-1 text-xs font-bold text-rose transition-colors group-hover:bg-rose group-hover:text-white">
                  Select →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 rounded-card border border-dashed border-border bg-bg-soft p-4 text-sm text-text-muted">
          No venues match &ldquo;{query}&rdquo;. Try a shorter or different name.
        </p>
      )}

      {query.trim().length < 2 && (
        <p className="mt-3 text-xs text-text-muted">
          Type at least 2 characters to search across {totalVenueCount ? totalVenueCount.toLocaleString() : "all"} Ontario venues.
        </p>
      )}
    </section>
  );
}
