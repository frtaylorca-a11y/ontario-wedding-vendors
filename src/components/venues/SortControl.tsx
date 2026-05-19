"use client";

import type { Route } from "next";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "score",    label: "Best match" },
  { value: "rating",   label: "Highest rated" },
  { value: "reviews",  label: "Most reviewed" },
  { value: "capacity", label: "Largest capacity" },
];

export function SortControl({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    if (e.target.value === "score") next.delete("sort");
    else next.set("sort", e.target.value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}` as Route);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-text-mid">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-pill border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
