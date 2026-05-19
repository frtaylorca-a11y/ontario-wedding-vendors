import Link from "next/link";
import type { Route } from "next";

const ITEM_BASE =
  "inline-flex h-10 min-w-[40px] items-center justify-center rounded-pill border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2";
const ITEM_INACTIVE = "border-border bg-white text-charcoal hover:border-rose hover:text-rose";
const ITEM_ACTIVE = "border-rose bg-rose text-white hover:bg-rose-hover";
const ITEM_DISABLED = "border-border bg-bg-soft text-text-muted pointer-events-none";

function pageHref(
  page: number,
  baseParams: URLSearchParams,
  basePath: string,
): Route {
  const next = new URLSearchParams(baseParams.toString());
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return (qs ? `${basePath}?${qs}` : basePath) as Route;
}

/** Compact 1 … 3 4 [5] 6 7 … 64 style page list */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  baseParams,
  basePath = "/venues",
  ariaLabel = "Pagination",
}: {
  page: number;
  totalPages: number;
  baseParams: URLSearchParams;
  basePath?: string;
  ariaLabel?: string;
}) {
  if (totalPages <= 1) return null;

  const items = buildPageList(page, totalPages);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
      aria-label={ariaLabel}
    >
      <Link
        href={pageHref(page - 1, baseParams, basePath)}
        aria-label="Previous page"
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={`${ITEM_BASE} ${prevDisabled ? ITEM_DISABLED : ITEM_INACTIVE}`}
      >
        ← Prev
      </Link>

      {items.map((it, i) =>
        it === "…" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="px-2 text-text-muted"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={pageHref(it, baseParams, basePath)}
            aria-label={`Page ${it}`}
            aria-current={it === page ? "page" : undefined}
            className={`${ITEM_BASE} ${it === page ? ITEM_ACTIVE : ITEM_INACTIVE}`}
          >
            {it}
          </Link>
        ),
      )}

      <Link
        href={pageHref(page + 1, baseParams, basePath)}
        aria-label="Next page"
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={`${ITEM_BASE} ${nextDisabled ? ITEM_DISABLED : ITEM_INACTIVE}`}
      >
        Next →
      </Link>
    </nav>
  );
}
