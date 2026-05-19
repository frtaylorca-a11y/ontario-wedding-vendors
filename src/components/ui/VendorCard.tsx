import Link from "next/link";
import type { Route } from "next";
import type { Vendor } from "@/lib/schema";
import { formatRating } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  dj: "DJ",
  florist: "Florist",
  photo_booth: "Photo Booth",
  catering: "Catering",
  cake: "Cake & Desserts",
  hair_makeup: "Hair & Makeup",
  officiant: "Officiant",
  limo: "Limo & Transportation",
};

const PRICE_TIER_LABEL: Record<string, string> = {
  budget: "$",
  mid: "$$",
  premium: "$$$",
};

function regionLabel(slug: string | null): string {
  if (!slug) return "Ontario";
  return slug.split("-").map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join(" ");
}

/** Hyphenate snake_case category slugs for SEO-friendly URLs */
function categoryUrlSlug(category: string): string {
  return category.replace(/_/g, "-");
}

export function VendorCard({ vendor }: { vendor: Vendor }) {
  const categoryLabel = CATEGORY_LABEL[vendor.category] ?? vendor.category;
  const priceLabel = vendor.priceTier ? PRICE_TIER_LABEL[vendor.priceTier] : null;
  const ratingStr = formatRating(vendor.googleRating);
  const cityRegion = [vendor.city, regionLabel(vendor.region)].filter(Boolean).join(" · ");

  const href = `/vendors/${categoryUrlSlug(vendor.category)}/${vendor.slug}` as Route;

  return (
    <article className="group relative overflow-hidden rounded-card border-[1.5px] border-border bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose">
            {categoryLabel}
          </div>
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-charcoal">
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
        {priceLabel && (
          <span className="rounded-pill bg-bg-soft px-2.5 py-1 text-[0.78rem] font-bold text-charcoal">
            {priceLabel}
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
