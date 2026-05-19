import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { Vendor } from "@/lib/schema";
import { formatRating } from "@/lib/utils";

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

/* Spec: budget = green, mid = blue, premium (DB term for luxury) = amber */
const PRICE_TIER: Record<string, { label: string; classes: string }> = {
  budget:  { label: "$",   classes: "bg-emerald-100 text-emerald-800" },
  mid:     { label: "$$",  classes: "bg-blue-100 text-blue-800" },
  premium: { label: "$$$", classes: "bg-amber-100 text-amber-800" },
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
          <path d="M4 6v8a4 4 0 0 0 8 0V6" />
          <path d="M20 6v8a4 4 0 0 1-8 0" />
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

function regionLabel(slug: string | null): string {
  if (!slug) return "Ontario";
  return slug.split("-").map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join(" ");
}

function categoryUrlSlug(category: string): string {
  return category.replace(/_/g, "-");
}

export function VendorCard({ vendor }: { vendor: Vendor }) {
  const categoryLabel = CATEGORY_LABEL[vendor.category] ?? vendor.category;
  const priceTier = vendor.priceTier ? PRICE_TIER[vendor.priceTier] : null;
  const ratingStr = formatRating(vendor.googleRating);
  const cityRegion = [vendor.city, regionLabel(vendor.region)].filter(Boolean).join(" · ");

  const href = `/vendors/${categoryUrlSlug(vendor.category)}/${vendor.slug}` as Route;

  return (
    <article className="group relative overflow-hidden rounded-card border-[1.5px] border-border bg-white p-5 pt-6 transition-all duration-200 hover:-translate-y-[3px] hover:border-transparent hover:shadow-[0_12px_32px_rgba(185,100,118,0.12)]">
      {/* 3px rose accent bar at the very top */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-rose"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Category pill — icon + text, rose-pale background, rose text */}
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-rose-pale px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-rose">
            <CategoryIcon category={vendor.category} />
            {categoryLabel}
          </span>

          {/* Vendor name — Cormorant Garamond, slightly larger than before for prominence */}
          <h3 className="mt-2 font-display text-[1.35rem] font-semibold leading-tight text-charcoal">
            <Link
              href={href}
              className="rounded-sm transition-colors after:absolute after:inset-0 after:content-[''] hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              {vendor.name}
            </Link>
          </h3>

          {cityRegion && (
            <div className="mt-1 text-xs text-text-muted">{cityRegion}</div>
          )}
        </div>

        {/* Price tier badge — colored variant */}
        {priceTier && (
          <span
            className={`rounded-pill px-2.5 py-1 text-[0.78rem] font-bold ${priceTier.classes}`}
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
        <span className="relative z-[1] text-xs font-bold tracking-[0.04em] text-rose">
          View →
        </span>
      </div>
    </article>
  );
}
