"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState, type ReactNode } from "react";
import { PLANNER_REGIONS, type BookedVendor, type VendorSlot } from "@/lib/plan-state";
import type { Vendor } from "@/lib/schema";

type Props = {
  region: string;
  venueSlug?: string | null;
  weddingDate?: string | null;
  slots: VendorSlot[];
  bookedVendors: Record<string, BookedVendor>;
  savedVendors: Record<string, string[]>;
  onAddVendor: (category: string) => void;
  onRemoveBooking: (category: string) => void;
};

const PIC_BOOTH_FEATURED_REGIONS = new Set(["niagara", "gta", "golden-horseshoe"]);
const PIC_BOOTH_URL =
  "https://picbooth.ca?utm_source=owv&utm_medium=vendor-slot&utm_campaign=photo-booth-featured";

function regionDisplayLabel(slug: string): string {
  const match = PLANNER_REGIONS.find((r) => r.slug === slug);
  return match?.label ?? "Ontario";
}

const CATEGORY_PLURAL: Record<string, string> = {
  photographer:    "photographers",
  videographer:    "videographers",
  dj:              "DJs",
  florist:         "florists",
  catering:        "caterers",
  cake:            "cake designers",
  hair_makeup:     "hair & makeup artists",
  officiant:       "officiants",
  limo:            "limo services",
  lighting_decor:  "lighting & decor specialists",
  photo_booth:     "photo booths",
  wedding_planner: "wedding planners",
};

const CATEGORY_META: Record<string, { label: string; icon: ReactNode }> = {
  photographer: {
    label: "Photographer",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M3 8h3l2-2h8l2 2h3v11H3z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  },
  videographer: {
    label: "Videographer",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <rect x="3" y="7" width="13" height="10" rx="1.5" />
        <path d="M16 11l5-3v8l-5-3z" />
      </svg>
    ),
  },
  dj: {
    label: "DJ",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2a10 10 0 0 1 7.07 17.07" />
        <path d="M4.93 4.93A10 10 0 0 0 12 22" />
      </svg>
    ),
  },
  florist: {
    label: "Florist",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <circle cx="12" cy="8" r="2.5" />
        <path d="M12 11v10" />
        <path d="M12 17l-3-1m3 1l3-1" />
      </svg>
    ),
  },
  catering: {
    label: "Catering",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M3 15h18a8 8 0 0 0-16 0z" />
        <path d="M3 18h18" />
        <path d="M12 7V4M10 4h4" />
      </svg>
    ),
  },
  cake: {
    label: "Cake",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M5 21h14v-7H5z" />
        <path d="M7 14v-3h10v3" />
        <path d="M9 11v-3h6v3" />
        <path d="M12 8V5" />
      </svg>
    ),
  },
  hair_makeup: {
    label: "Hair & Makeup",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <circle cx="9" cy="9" r="6" />
        <path d="M16 11l5 5-2 2-5-5z" />
      </svg>
    ),
  },
  officiant: {
    label: "Officiant",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M4 4v16h7V4z" />
        <path d="M13 4v16h7V4z" />
      </svg>
    ),
  },
  limo: {
    label: "Limo",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M3 15v3h18v-3l-2-5H5z" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </svg>
    ),
  },
  photo_booth: {
    label: "Photo Booth",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <circle cx="12" cy="9" r="3" />
        <path d="M7 15h10M7 18h10" />
      </svg>
    ),
  },
  lighting_decor: {
    label: "Lighting & Decor",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <path d="M7 7a5 5 0 0 1 10 0c0 3-2 4-2.5 5h-5C9 11 7 10 7 7z" />
        <path d="M9 18h6M10 21h4M12 14v-2" />
      </svg>
    ),
  },
  wedding_planner: {
    label: "Wedding Planner",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-current">
        <rect x="3" y="5" width="18" height="16" rx="1.5" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M7 14l2 2 4-4" />
      </svg>
    ),
  },
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function VendorSlots({
  region,
  venueSlug,
  weddingDate,
  slots,
  bookedVendors,
  savedVendors,
  onAddVendor,
  onRemoveBooking,
}: Props) {
  /* Live counts for the "Find N in Region" labels — refetched on region change */
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vendors/counts?region=${encodeURIComponent(region)}`)
      .then((r) => (r.ok ? r.json() : { counts: {} }))
      .then((data) => {
        if (!cancelled) setCounts(data.counts ?? {});
      })
      .catch(() => {
        /* fall back to no count — link still works */
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  /* Hydrate saved vendor metadata (name, phone, email, website, etc.) for every
   * unique slug across all saved categories. Single round trip via the
   * /api/vendors?slugs=... endpoint that we lean on for batched lookup. */
  const allSavedSlugs = Array.from(
    new Set(Object.values(savedVendors ?? {}).flat()),
  );
  const [savedDetails, setSavedDetails] = useState<Record<string, Vendor & { distanceKm?: number | null }>>({});
  useEffect(() => {
    if (allSavedSlugs.length === 0) {
      setSavedDetails({});
      return;
    }
    let cancelled = false;
    const url = new URL("/api/vendors", window.location.origin);
    url.searchParams.set("slugs", allSavedSlugs.join(","));
    if (venueSlug) url.searchParams.set("venue", venueSlug);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : { vendors: [] }))
      .then((data: { vendors: (Vendor & { distanceKm?: number | null })[] }) => {
        if (cancelled) return;
        const out: Record<string, Vendor & { distanceKm?: number | null }> = {};
        for (const v of data.vendors ?? []) out[v.slug] = v;
        setSavedDetails(out);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allSavedSlugs.join(","), venueSlug]);

  const regionLabel = regionDisplayLabel(region);
  const picBoothFeatured = PIC_BOOTH_FEATURED_REGIONS.has(region);
  const hasDate = !!weddingDate;

  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 3 · Vendors
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your <em className="italic text-rose">vendor slots</em>{" "}
          <span className="text-base text-text-muted">({slots.length})</span>
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          Synced to your active budget categories — toggle a row off in
          Step 1 to hide its slot here. Budget per category updates live
          as you move the total slider.
        </p>
      </header>

      {slots.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-bg-soft p-8 text-center text-sm text-text-muted">
          No active budget categories with vendor matches yet. Toggle
          Photography, Catering, Music or any other vendor-linked row on
          in Step 1 to populate this list.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {slots.map((slot) => {
            const cat = slot.category;
            const meta = CATEGORY_META[cat];
            if (!meta) return null;
            const booked = bookedVendors[cat];
            const findHref = (() => {
              const qs = new URLSearchParams();
              if (region && region !== "other") qs.set("region", region);
              if (venueSlug) {
                qs.set("venue", venueSlug);
                qs.set("radius", "100");
              }
              const tail = qs.toString();
              return (`/vendors/${cat.replace(/_/g, "-")}${tail ? `?${tail}` : ""}`) as Route;
            })();
            const showPicBoothFeatured =
              cat === "photo_booth" && picBoothFeatured && !booked;

            return (
              <li
                key={cat}
                className="motion-safe:animate-[slotIn_220ms_ease-out]"
                style={{
                  animationName: "slotIn",
                  animationDuration: "220ms",
                  animationTimingFunction: "ease-out",
                }}
              >
                <div
                  className={`relative h-full rounded-card border-[1.5px] bg-white p-5 transition-colors ${
                    booked
                      ? "border-rose"
                      : showPicBoothFeatured
                        ? "border-rose"
                        : "border-dashed border-border hover:border-rose"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-rose-pale text-rose">
                        {meta.icon}
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-charcoal">
                          {meta.label}
                        </h3>
                        <div className="text-[0.7rem] font-medium text-text-muted">
                          Your budget: {formatMoney(slot.budget)}
                        </div>
                      </div>
                    </div>
                    {booked && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-rose px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white">
                        <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Booked
                      </span>
                    )}
                    {!booked && showPicBoothFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-rose px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white">
                        <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  {booked ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <div className="font-display text-base font-semibold text-charcoal">
                          {booked.name}
                        </div>
                        {booked.isUserSuggested && (
                          <span className="inline-flex items-center rounded-pill bg-amber-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-amber-800">
                            Unverified
                          </span>
                        )}
                        {booked.isPicBooth && (
                          <span className="inline-flex items-center rounded-pill bg-gold-light px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-charcoal">
                            Site Partner
                          </span>
                        )}
                      </div>
                      {booked.rating != null && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-text-mid">
                          <span className="leading-none text-gold">
                            {"★".repeat(Math.round(booked.rating))}
                            <span className="text-border">{"★".repeat(5 - Math.round(booked.rating))}</span>
                          </span>
                          <span>{booked.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {booked.city && (
                        <div className="mt-0.5 text-xs text-text-muted">{booked.city}</div>
                      )}
                      {booked.isUserSuggested && (
                        <p className="mt-2 text-[0.7rem] text-text-muted">
                          Added by you — not yet in our directory
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveBooking(cat)}
                        className="mt-3 text-xs font-medium text-text-muted underline-offset-2 hover:text-rose hover:underline"
                      >
                        Remove from plan
                      </button>
                    </div>
                  ) : showPicBoothFeatured ? (
                    /* Featured Pic Booth card for Niagara / GTA */
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="font-display text-base font-semibold text-charcoal">
                          Pic Booth
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-gold-light px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-charcoal">
                          <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="6" />
                            <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                          </svg>
                          JUNO Awards photo booth provider
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-text-mid">
                          St. Catharines-based, serving Niagara and the GTA. Open-air sailcloth
                          booths and instant-print packages for weddings of every size.
                        </p>
                      </div>
                      <a
                        href={PIC_BOOTH_URL}
                        target="_blank"
                        rel="noopener"
                        className="block w-full rounded-pill bg-rose px-4 py-2 text-center text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                      >
                        Get a quote →
                      </a>
                      <Link
                        href={findHref}
                        className="block w-full rounded-pill border border-border bg-white px-4 py-2 text-center text-xs font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                      >
                        Or compare other photo booths in {regionLabel} →
                      </Link>
                      <p className="text-[0.65rem] text-text-muted">
                        Pic Booth is operated by the Ontario Wedding Vendors team.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {/* Mode 1 — saved vendors with direct contact, always visible */}
                      {(() => {
                        const savedSlugs = savedVendors?.[cat] ?? [];
                        if (savedSlugs.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-text-muted">
                              Your saved {CATEGORY_PLURAL[cat] ?? "vendors"} ({savedSlugs.length})
                            </div>
                            {savedSlugs.map((slug) => {
                              const v = savedDetails[slug];
                              if (!v) {
                                return (
                                  <div key={slug} className="rounded-card border border-border-light bg-bg-soft p-2 text-xs text-text-muted">
                                    Loading {slug}…
                                  </div>
                                );
                              }
                              const distance =
                                v.distanceKm != null && Number.isFinite(v.distanceKm)
                                  ? `${Math.round(v.distanceKm)} km away`
                                  : null;
                              return (
                                <div key={slug} className="rounded-card border border-border-light bg-bg-soft px-3 py-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <Link
                                      href={`/vendors/${cat.replace(/_/g, "-")}/${v.slug}` as Route}
                                      className="text-sm font-semibold text-charcoal hover:text-rose"
                                    >
                                      {v.name}
                                    </Link>
                                    {distance && (
                                      <span className="shrink-0 rounded-pill bg-white px-1.5 py-0.5 text-[0.6rem] text-text-muted">
                                        {distance}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem]">
                                    {v.website && (
                                      <a href={v.website} target="_blank" rel="noopener" className="rounded-pill border border-border bg-white px-2 py-0.5 font-medium text-charcoal hover:border-rose hover:text-rose">
                                        Website ↗
                                      </a>
                                    )}
                                    {v.phone && (
                                      <a href={`tel:${v.phone}`} className="rounded-pill border border-border bg-white px-2 py-0.5 font-medium text-charcoal hover:border-rose hover:text-rose">
                                        Call
                                      </a>
                                    )}
                                    {v.email && (
                                      <a href={`mailto:${v.email}`} className="rounded-pill border border-border bg-white px-2 py-0.5 font-medium text-charcoal hover:border-rose hover:text-rose">
                                        Email
                                      </a>
                                    )}
                                    {v.instagramHandle && (
                                      <a href={`https://instagram.com/${v.instagramHandle.replace(/^@/, "")}`} target="_blank" rel="noopener" className="rounded-pill border border-border bg-white px-2 py-0.5 font-medium text-charcoal hover:border-rose hover:text-rose">
                                        Instagram
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {!hasDate && (
                              <p className="text-[0.65rem] italic text-text-muted">
                                Set your wedding date to request quotes from these vendors.
                              </p>
                            )}
                            {hasDate && (
                              <Link
                                href={"/plan/quotes" as Route}
                                className="block w-full rounded-pill bg-rose px-4 py-2 text-center text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                              >
                                Request quotes from saved vendors →
                              </Link>
                            )}
                          </div>
                        );
                      })()}

                      {/* Browse / find more in directory */}
                      {(() => {
                        const count = counts[cat];
                        const plural = CATEGORY_PLURAL[cat] ?? "vendors";
                        const savedCount = savedVendors?.[cat]?.length ?? 0;
                        const label = savedCount > 0
                          ? `+ Save another ${plural.replace(/s$/, "")}`
                          : count == null
                            ? `Find ${plural} →`
                            : count === 0
                              ? `No ${plural} in ${regionLabel} yet`
                              : `Find ${count} ${plural} in ${regionLabel} →`;
                        const disabled = count === 0;
                        return disabled ? (
                          <span className="block w-full cursor-not-allowed rounded-pill border border-border bg-bg-soft px-4 py-2 text-center text-sm font-medium text-text-muted">
                            {label}
                          </span>
                        ) : (
                          <Link
                            href={findHref}
                            className="block w-full rounded-pill border border-rose bg-white px-4 py-2 text-center text-sm font-bold text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                          >
                            {label}
                          </Link>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => onAddVendor(cat)}
                        className="block w-full text-center text-xs font-medium text-text-mid underline-offset-2 hover:text-rose hover:underline"
                      >
                        + Add vendor not in our list
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Keyframes for slot fade-in on add — kept inline to colocate with the component */}
      <style>{`
        @keyframes slotIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
