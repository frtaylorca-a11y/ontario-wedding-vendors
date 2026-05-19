import Link from "next/link";
import type { Route } from "next";
import { REGIONS } from "@/lib/regions";

const VENUE_TYPES = [
  { value: "winery",       label: "Winery" },
  { value: "estate",       label: "Estate" },
  { value: "barn",         label: "Barn" },
  { value: "hotel",        label: "Hotel" },
  { value: "golf-club",    label: "Golf Club" },
  { value: "banquet-hall", label: "Banquet Hall" },
  { value: "conservation", label: "Conservation" },
  { value: "restaurant",   label: "Restaurant" },
  { value: "resort",       label: "Resort" },
  { value: "inn",          label: "Inn" },
];

const CAPACITY_BUCKETS = [
  { value: "50",  label: "50+ guests" },
  { value: "100", label: "100+ guests" },
  { value: "150", label: "150+ guests" },
  { value: "200", label: "200+ guests" },
  { value: "300", label: "300+ guests" },
];

export type FilterValues = {
  region?: string;
  type?: string;
  capacity?: string;
  catering?: "in-house" | "open" | "both";
  indoor?: "indoor" | "outdoor" | "both";
};

type ChipDef = { label: string; param: keyof FilterValues };

const SELECT_BASE =
  "rounded-pill border border-border bg-white px-3.5 py-2 text-sm font-medium text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2";

export function FilterBar({
  values,
  sort,
}: {
  values: FilterValues;
  sort?: string;
}) {
  /* Build chips for currently-applied filters so users can clear them one at a time */
  const chips: (ChipDef & { value: string; clearHref: Route })[] = [];

  if (values.region) {
    const r = REGIONS.find((x) => x.slug === values.region);
    chips.push({
      param: "region",
      label: `Region: ${r?.label ?? values.region}`,
      value: values.region,
      clearHref: clearParamHref("region", values, sort),
    });
  }
  if (values.type) {
    const t = VENUE_TYPES.find((x) => x.value === values.type);
    chips.push({
      param: "type",
      label: `Type: ${t?.label ?? values.type}`,
      value: values.type,
      clearHref: clearParamHref("type", values, sort),
    });
  }
  if (values.capacity) {
    chips.push({
      param: "capacity",
      label: `${values.capacity}+ guests`,
      value: values.capacity,
      clearHref: clearParamHref("capacity", values, sort),
    });
  }
  if (values.catering && values.catering !== "both") {
    chips.push({
      param: "catering",
      label: `Catering: ${values.catering === "in-house" ? "In-house" : "Open"}`,
      value: values.catering,
      clearHref: clearParamHref("catering", values, sort),
    });
  }
  if (values.indoor && values.indoor !== "both") {
    chips.push({
      param: "indoor",
      label: values.indoor === "indoor" ? "Indoor" : "Outdoor",
      value: values.indoor,
      clearHref: clearParamHref("indoor", values, sort),
    });
  }

  return (
    <div className="space-y-4">
      <form
        action="/venues"
        method="GET"
        className="flex flex-wrap items-center gap-2.5"
      >
        {/* Preserve sort across filter submits */}
        {sort && <input type="hidden" name="sort" value={sort} />}

        <select name="region" defaultValue={values.region ?? ""} className={SELECT_BASE} aria-label="Region">
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.slug}>{r.label}</option>
          ))}
        </select>

        <select name="type" defaultValue={values.type ?? ""} className={SELECT_BASE} aria-label="Venue type">
          <option value="">All venue types</option>
          {VENUE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select name="capacity" defaultValue={values.capacity ?? ""} className={SELECT_BASE} aria-label="Capacity">
          <option value="">Any capacity</option>
          {CAPACITY_BUCKETS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select name="catering" defaultValue={values.catering ?? "both"} className={SELECT_BASE} aria-label="Catering">
          <option value="both">Any catering</option>
          <option value="in-house">In-house only</option>
          <option value="open">Open / outside caterers</option>
        </select>

        <select name="indoor" defaultValue={values.indoor ?? "both"} className={SELECT_BASE} aria-label="Indoor or outdoor">
          <option value="both">Indoor & outdoor</option>
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
        </select>

        <button
          type="submit"
          className="inline-flex items-center rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          Apply filters
        </button>
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
            Active
          </span>
          {chips.map((c) => (
            <Link
              key={c.param}
              href={c.clearHref}
              className="inline-flex items-center gap-1.5 rounded-pill border border-rose bg-rose-pale px-3 py-1 text-xs font-medium text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              aria-label={`Clear filter: ${c.label}`}
            >
              {c.label}
              <span aria-hidden>×</span>
            </Link>
          ))}
          <Link
            href={"/venues" as Route}
            className="text-xs font-medium text-text-mid underline-offset-4 hover:text-rose hover:underline"
          >
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}

function clearParamHref(
  paramToClear: keyof FilterValues,
  values: FilterValues,
  sort?: string,
): Route {
  const next = new URLSearchParams();
  (["region", "type", "capacity", "catering", "indoor"] as const).forEach((k) => {
    if (k === paramToClear) return;
    const v = values[k];
    if (v && v !== "both") next.set(k, v);
  });
  if (sort) next.set("sort", sort);
  const qs = next.toString();
  return (qs ? `/venues?${qs}` : "/venues") as Route;
}
