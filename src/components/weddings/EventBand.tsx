/**
 * Full-width event band — replaces the centred "card" look for ceremony /
 * reception / extra events.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ [thin top border in theme accent]                           │
 *   │ ┌──────────┐                                                │
 *   │ │ icon     │   ────── event name (italic display) ──────    │
 *   │ │ TIME     │   audience  ·  date · time                     │
 *   │ │          │   venue line                                   │
 *   │ │          │   description                                  │
 *   │ │          │   [→ View on map]                              │
 *   │ └──────────┘                                                │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Background uses --wt-surface-alt (subtle wash of theme light colour).
 * Border on top uses --wt-accent.
 */
export function EventBand({
  title,
  audience,
  when,
  location,
  description,
  mapQuery,
  icon = "rings",
}: {
  title:        string;
  audience?:    string | null;
  when?:        string | null;
  location?:    string | null;
  description?: string | null;
  mapQuery?:    string | null;
  icon?:        "rings" | "champagne" | "fork";
}) {
  const mapHref =
    mapQuery && mapQuery.trim().length > 0
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      : null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background:       "var(--wt-surface-alt)",
        borderTop:        "2px solid var(--wt-accent)",
      }}
    >
      <div className="mx-auto grid max-w-[1080px] gap-6 px-6 py-12 sm:grid-cols-[200px_1fr] sm:gap-10 sm:px-10 sm:py-16 lg:gap-14">
        {/* Left — icon + time */}
        <div className="flex flex-col items-center justify-center text-center sm:items-start sm:text-left">
          <EventIcon kind={icon} />
          {when && (
            <div
              className="mt-3 text-xl"
              style={{
                fontFamily: "var(--wt-font-display)",
                fontStyle:  "italic",
                color:      "var(--wt-accent)",
              }}
            >
              {when}
            </div>
          )}
        </div>

        {/* Right — venue details */}
        <div className="text-center sm:text-left">
          {audience && (
            <div
              className="text-[0.7rem] font-bold uppercase tracking-[0.28em]"
              style={{ color: "var(--wt-accent)" }}
            >
              {audience}
            </div>
          )}
          <h3
            className="mt-2 text-3xl leading-tight sm:text-4xl"
            style={{
              fontFamily: "var(--wt-font-display)",
              fontStyle:  "var(--wt-display-italic)",
              color:      "var(--wt-ink)",
            }}
          >
            {title}
          </h3>
          {location && (
            <p
              className="mt-3 text-[1.05rem] leading-[1.7]"
              style={{ color: "var(--wt-ink)", fontFamily: "var(--wt-font-body)" }}
            >
              {location}
            </p>
          )}
          {description && (
            <p
              className="mt-3 text-[1rem] leading-[1.8]"
              style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}
            >
              {description}
            </p>
          )}
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.28em]"
              style={{ color: "var(--wt-accent)" }}
            >
              View on map →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EventIcon({ kind }: { kind: "rings" | "champagne" | "fork" }) {
  const common = {
    viewBox: "0 0 64 64" as const,
    fill: "none" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { color: "var(--wt-accent)" },
    className: "h-16 w-16 stroke-current",
  };
  switch (kind) {
    case "rings":
      return (
        <svg aria-hidden {...common}>
          <circle cx="25" cy="38" r="14" />
          <circle cx="39" cy="38" r="14" />
          <path d="M19 22l3-6 3 6" />
          <path d="M39 22l3-6 3 6" />
        </svg>
      );
    case "champagne":
      return (
        <svg aria-hidden {...common}>
          <path d="M22 8h20l-3 22a7 7 0 0 1-14 0z" />
          <path d="M32 38v14" />
          <path d="M24 54h16" />
        </svg>
      );
    case "fork":
      return (
        <svg aria-hidden {...common}>
          <path d="M22 8v18a6 6 0 0 0 12 0V8" />
          <path d="M28 26v30" />
          <path d="M42 8c0 8-3 12-6 16v32" />
        </svg>
      );
  }
}
