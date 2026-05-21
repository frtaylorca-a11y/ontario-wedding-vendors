import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";
import type { Vendor } from "@/lib/schema";
import { formatRating, normalizeRegionDisplay, vendorHeroImageUrl } from "@/lib/utils";
import { categoryColourVars } from "@/lib/vendor-colours";
import { SaveVendorButton } from "@/components/plan/SaveVendorButton";

const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "Photographer",
  videographer:    "Videographer",
  dj:              "DJ",
  florist:         "Florist",
  photo_booth:     "Photo Booth",
  catering:        "Catering",
  cake:            "Cake & Desserts",
  hair_makeup:     "Hair & Makeup",
  officiant:       "Officiant",
  limo:            "Limo",
  lighting_decor:  "Lighting & Decor",
  wedding_planner: "Wedding Planner",
};

/* Warm-palette price tier pills — all three tones sit inside the
 * #FAF8F5 → #FDF8F0 cream range so they read as editorial accents,
 * not the loud emerald/blue/amber from the prior palette. */
const PRICE_TIER: Record<string, { label: string; style: CSSProperties }> = {
  budget:  { label: "$",   style: { background: "#F5F1EC", color: "#6B7280" } },
  mid:     { label: "$$",  style: { background: "#FAF8F5", color: "#4B5563", border: "1px solid #EDE9E3" } },
  premium: { label: "$$$", style: { background: "#FDF8F0", color: "#C9A96E" } },
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-3.5 w-3.5 stroke-current",
};

/** 12 mini-icons for the category pill — same shapes as the /vendors index, scaled down */
function CategoryIcon({ category }: { category: string }): ReactNode {
  switch (category) {
    case "photographer":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M3 8h3l2-2h8l2 2h3v11H3z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "videographer":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <rect x="3" y="7" width="13" height="10" rx="1.5" />
          <path d="M16 11l5-3v8l-5-3z" />
        </svg>
      );
    case "dj":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2a10 10 0 0 1 7.07 17.07" />
          <path d="M4.93 4.93A10 10 0 0 0 12 22" />
        </svg>
      );
    case "florist":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <circle cx="12" cy="8" r="2.5" />
          <path d="M12 11v10" />
        </svg>
      );
    case "photo_booth":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <circle cx="12" cy="9" r="3" />
        </svg>
      );
    case "catering":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M3 15h18a8 8 0 0 0-16 0z" />
          <path d="M3 18h18" />
        </svg>
      );
    case "cake":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M5 21h14v-7H5z" />
          <path d="M7 14v-3h10v3" />
          <path d="M12 8V5" />
        </svg>
      );
    case "hair_makeup":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <circle cx="9" cy="9" r="6" />
          <path d="M16 11l5 5-2 2-5-5z" />
        </svg>
      );
    case "officiant":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M4 4v16h7V4z" />
          <path d="M13 4v16h7V4z" />
        </svg>
      );
    case "limo":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M3 15v3h18v-3l-2-5H5z" />
          <circle cx="7" cy="18" r="1.2" />
          <circle cx="17" cy="18" r="1.2" />
        </svg>
      );
    case "lighting_decor":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <path d="M7 7a5 5 0 0 1 10 0c0 3-2 4-2.5 5h-5C9 11 7 10 7 7z" />
          <path d="M9 18h6M10 21h4" />
        </svg>
      );
    case "wedding_planner":
      return (
        <svg aria-hidden {...ICON_PROPS}>
          <rect x="3" y="5" width="18" height="16" rx="1.5" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    default:
      return null;
  }
}

const regionLabel = normalizeRegionDisplay;

function categoryUrlSlug(category: string): string {
  return category.replace(/_/g, "-");
}

export function VendorCard({
  vendor,
}: {
  vendor: Vendor & { distanceKm?: number | null };
}) {
  const categoryLabel = CATEGORY_LABEL[vendor.category] ?? vendor.category;
  const priceTier = vendor.priceTier ? PRICE_TIER[vendor.priceTier] : null;
  const ratingStr = formatRating(vendor.googleRating);
  const cityRegion = [vendor.city, regionLabel(vendor.region)].filter(Boolean).join(" · ");

  const href = `/vendors/${categoryUrlSlug(vendor.category)}/${vendor.slug}` as Route;
  const isPinned = vendor.isPinned === true;
  const distanceLabel =
    vendor.distanceKm != null && Number.isFinite(vendor.distanceKm)
      ? `${Math.round(vendor.distanceKm)} km from your venue`
      : null;

  const photoUrl = vendorHeroImageUrl(vendor, { maxwidth: 800 });

  /* CSS vars from the category's signature colour drive every accent on the card */
  const cssVars = categoryColourVars(vendor.category) as CSSProperties;

  /* ─── Photo-tile variant ─────────────────────────────────────────────
   * Photo fills the whole card behind a black overlay (rgba(0,0,0,0.45)).
   * Name / city / rating render white on top. The card body falls back to
   * category gradient + white surface when no photo is available. */
  if (photoUrl) {
    return (
      <article
        style={cssVars}
        className={`group relative h-72 overflow-hidden rounded-card border-[1.5px] bg-[var(--cat-primary)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(var(--cat-rgb),0.25)] ${
          isPinned ? "border-rose hover:border-rose" : "border-border hover:border-[var(--cat-primary)]"
        }`}
      >
        {/* Background photo — slow zoom on hover (700ms / scale 110%)
         * tracks the parent `group` so the lift + zoom stay in sync. */}
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
          loading="lazy"
        />
        {/* Dark overlay — single solid black, no colour tint */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(0,0,0,0.45)" }}
        />

        {/* 3px accent bar */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 z-[1] h-[3px] ${
            isPinned ? "bg-rose" : "bg-[var(--cat-primary)]"
          }`}
        />

        {/* Top row: category pill (L) + price tier / save heart / pinned (R) */}
        <div className="absolute inset-x-3 top-3 z-[2] flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white"
            style={{
              background:       "rgba(0,0,0,0.35)",
              backdropFilter:   "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              border:           "1px solid rgba(255,255,255,0.2)",
              textShadow:       "0 1px 8px rgba(0,0,0,0.6)",
            }}
          >
            <CategoryIcon category={vendor.category} />
            {categoryLabel}
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {isPinned && (
              <div className="inline-flex items-center gap-1 rounded-pill bg-rose-pale px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-rose">
                <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Recommended Partner
              </div>
            )}
            <SaveVendorButton category={vendor.category} slug={vendor.slug} />
            {priceTier && (
              <span
                className="rounded-pill px-2.5 py-1 text-[0.78rem] font-bold"
                style={priceTier.style}
                title={`${vendor.priceTier} price tier`}
              >
                {priceTier.label}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: name + city + rating + distance — all white with text-shadow.
         * Every text element gets the same drop shadow (0 1px 8px rgba(0,0,0,0.6))
         * so the card stays readable on any underlying photo. */}
        <div className="absolute inset-x-5 bottom-4 z-[2]">
          {distanceLabel && (
            <div
              className="mb-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[0.65rem] font-medium text-white"
              style={{
                background:           "rgba(0,0,0,0.35)",
                backdropFilter:       "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                border:               "1px solid rgba(255,255,255,0.2)",
                textShadow:           "0 1px 8px rgba(0,0,0,0.6)",
              }}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {distanceLabel}
            </div>
          )}
          <h3
            className="font-display text-[1.5rem] leading-tight text-white"
            style={{ fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            <Link
              href={href}
              className="rounded-sm transition-colors after:absolute after:inset-0 after:content-[''] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              {vendor.name}
            </Link>
          </h3>
          {cityRegion && (
            <div
              className="mt-1 text-xs text-white"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
            >
              {cityRegion}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {ratingStr ? (
                <>
                  <span
                    className="text-sm leading-none tracking-wider text-gold"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                  >
                    {"★".repeat(Math.round(Number(ratingStr)))}
                    <span className="text-white/40">
                      {"★".repeat(5 - Math.round(Number(ratingStr)))}
                    </span>
                  </span>
                  <span
                    className="text-xs text-white"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                  >
                    {ratingStr}
                    {vendor.reviewCount != null && (
                      <span className="text-white/85"> ({vendor.reviewCount})</span>
                    )}
                  </span>
                </>
              ) : (
                <span
                  className="text-xs text-white"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                >
                  No reviews yet
                </span>
              )}
            </div>
            <span
              className="relative z-[1] inline-flex items-center gap-1 text-xs font-bold tracking-[0.04em] text-white"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
            >
              View
              <ArrowRightIcon />
            </span>
          </div>
        </div>
      </article>
    );
  }

  /* ─── No-photo fallback: category gradient + existing white-body layout ─── */
  return (
    <article
      style={cssVars}
      className={`group relative overflow-hidden rounded-card border-[1.5px] bg-white p-5 pt-6 transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(var(--cat-rgb),0.16)] ${
        isPinned ? "border-rose hover:border-rose" : "border-border hover:border-[var(--cat-primary)]"
      }`}
    >
      {isPinned && (
        <div className="absolute right-3 top-3 z-[2] inline-flex items-center gap-1 rounded-pill bg-rose-pale px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-rose">
          <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Recommended Partner
        </div>
      )}

      <div className={`absolute z-[2] ${isPinned ? "right-3 top-9" : "right-3 top-3"}`}>
        <SaveVendorButton category={vendor.category} slug={vendor.slug} />
      </div>

      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${
          isPinned ? "bg-rose" : "bg-[var(--cat-primary)]"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--cat-bg)] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--cat-primary)]">
            <CategoryIcon category={vendor.category} />
            {categoryLabel}
          </span>

          <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-tight text-charcoal">
            <Link
              href={href}
              className="rounded-sm transition-colors after:absolute after:inset-0 after:content-[''] hover:text-[var(--cat-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              {vendor.name}
            </Link>
          </h3>

          {cityRegion && (
            <div className="mt-1 text-xs text-text-muted">{cityRegion}</div>
          )}
        </div>

        {priceTier && (
          <span
            className="rounded-pill px-2.5 py-1 text-[0.78rem] font-bold"
            style={priceTier.style}
            title={`${vendor.priceTier} price tier`}
          >
            {priceTier.label}
          </span>
        )}
      </div>

      {vendor.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-mid">
          {vendor.description}
        </p>
      )}

      {distanceLabel && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-pill bg-bg-soft px-2 py-0.5 text-[0.65rem] font-medium text-text-mid">
          <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {distanceLabel}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-light pt-3">
        <div className="flex items-center gap-2">
          {ratingStr ? (
            <>
              <span className="text-sm leading-none tracking-wider text-gold">
                {"★".repeat(Math.round(Number(ratingStr)))}
                <span className="text-border">
                  {"★".repeat(5 - Math.round(Number(ratingStr)))}
                </span>
              </span>
              <span className="text-xs text-text-mid">
                {ratingStr}
                {vendor.reviewCount != null && (
                  <span className="text-text-muted"> ({vendor.reviewCount})</span>
                )}
              </span>
            </>
          ) : (
            <span className="text-xs text-text-muted">No reviews yet</span>
          )}
        </div>
        <span className="relative z-[1] inline-flex items-center gap-1 text-xs font-bold tracking-[0.04em] text-[var(--cat-primary)]">
          View
          <ArrowRightIcon />
        </span>
      </div>
    </article>
  );
}

/* Inline ArrowRight icon — replaces the static "→" character in both
 * VendorCard variants. Translates 4px right on the parent card's
 * group-hover state, paired with the photo's group-hover scale to
 * give the card a single coordinated "active" feel. Stroke style
 * matches lucide-react so the icon reads consistent with the rest
 * of the directory's iconography. */
function ArrowRightIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-300 ease-out group-hover:translate-x-1"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
