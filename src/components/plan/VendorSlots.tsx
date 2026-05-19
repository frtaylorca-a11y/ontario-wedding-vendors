"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { VENDOR_SLOT_ORDER, getVendorBudget, type BookedVendor } from "@/lib/plan-state";

type Props = {
  totalBudget: number;
  region: string;
  bookedVendors: Record<string, BookedVendor>;
  onAddVendor: (category: string) => void;
  onRemoveBooking: (category: string) => void;
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
        <path d="M4 6v8a4 4 0 0 0 8 0V6" />
        <path d="M20 6v8a4 4 0 0 1-8 0" />
        <circle cx="8" cy="14" r="1.5" />
        <circle cx="16" cy="14" r="1.5" />
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
  totalBudget,
  region,
  bookedVendors,
  onAddVendor,
  onRemoveBooking,
}: Props) {
  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 3 · Vendors
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your <em className="italic text-rose">12 vendor slots</em>
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          Budget allocated per category from your total. Browse vendors or add
          someone outside our directory.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {VENDOR_SLOT_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const booked = bookedVendors[cat];
          const budget = getVendorBudget(cat, totalBudget);
          const findHref =
            (region && region !== "other"
              ? `/vendors/${cat.replace(/_/g, "-")}?region=${region}`
              : `/vendors/${cat.replace(/_/g, "-")}`) as Route;

          return (
            <li key={cat}>
              <div
                className={`relative h-full rounded-card border-[1.5px] bg-white p-5 transition-colors ${
                  booked
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
                        {budget != null ? formatMoney(budget) : "Set your own"}
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
                ) : (
                  <div className="mt-4 space-y-2">
                    <Link
                      href={findHref}
                      className="block w-full rounded-pill border border-rose bg-white px-4 py-2 text-center text-sm font-bold text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                    >
                      Find vendors →
                    </Link>
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
    </section>
  );
}
