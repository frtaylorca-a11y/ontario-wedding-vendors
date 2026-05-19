import Link from "next/link";
import type { CSSProperties } from "react";
import type { Route } from "next";
import { REGIONS } from "@/lib/regions";
import { categoryColourVars } from "@/lib/vendor-colours";

const PRICE_TIERS = [
  { value: "budget",  label: "$ Budget" },
  { value: "mid",     label: "$$ Mid-range" },
  { value: "premium", label: "$$$ Premium" },
];

/* Active state uses the category signature colour via CSS variables set on the form */
const RADIO_LABEL =
  "flex cursor-pointer items-center gap-2 rounded-pill border border-border bg-white px-3 py-1.5 text-sm text-charcoal transition-colors hover:border-[var(--cat-primary)] has-[:checked]:border-[var(--cat-primary)] has-[:checked]:bg-[var(--cat-primary)] has-[:checked]:font-semibold has-[:checked]:text-white";

export type VendorFilterValues = {
  region?: string;
  priceTier?: string;
};

/**
 * Server-rendered GET form. Works without JS for SEO/crawlers.
 * Action posts back to /vendors/[category] preserving the category in the URL.
 */
export function VendorFilterSidebar({
  categorySlug,
  values,
}: {
  categorySlug: string;
  values: VendorFilterValues;
}) {
  const hasFilters = Boolean(values.region || values.priceTier);
  const baseUrl = `/vendors/${categorySlug}` as Route;
  /* URL uses hyphens (e.g. photo-booth) but the colour map keys use underscores */
  const colourKey = categorySlug.replace(/-/g, "_");
  const cssVars = categoryColourVars(colourKey) as CSSProperties;

  return (
    <aside className="lg:sticky lg:top-[76px]" style={cssVars}>
      <form
        action={baseUrl}
        method="GET"
        className="rounded-card border-[1.5px] border-border bg-[var(--cat-bg)] p-5"
      >
        <h2 className="font-display text-lg font-semibold text-charcoal">Filters</h2>

        {/* Region */}
        <fieldset className="mt-4">
          <legend className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Region
          </legend>
          <select
            name="region"
            defaultValue={values.region ?? ""}
            className="w-full rounded-pill border border-border bg-white px-3 py-2 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            <option value="">All Ontario</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.slug}>{r.label}</option>
            ))}
          </select>
        </fieldset>

        {/* Price tier */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Price tier
          </legend>
          <div className="space-y-2">
            <label className={RADIO_LABEL}>
              <input
                type="radio"
                name="priceTier"
                value=""
                defaultChecked={!values.priceTier}
                className="sr-only"
              />
              Any price
            </label>
            {PRICE_TIERS.map((t) => (
              <label key={t.value} className={RADIO_LABEL}>
                <input
                  type="radio"
                  name="priceTier"
                  value={t.value}
                  defaultChecked={values.priceTier === t.value}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-6 inline-flex w-full items-center justify-center rounded-pill bg-[var(--cat-primary)] px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(var(--cat-rgb),0.3)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          Apply filters
        </button>

        {hasFilters && (
          <Link
            href={baseUrl}
            className="mt-2 block text-center text-xs font-medium text-text-mid hover:text-[var(--cat-primary)] hover:underline"
          >
            Clear all
          </Link>
        )}
      </form>
    </aside>
  );
}
