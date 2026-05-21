import Link from "next/link";
import type { Route } from "next";

/* Three-step infographic rendered between the Hero and RegionCards
 * on the homepage. Horizontal row on lg+, vertical stack on mobile,
 * connector line between step cards on desktop only. Pure SVG icons
 * so there's no asset load on the home view-above-the-fold path. */

type Step = {
  n:           number;
  title:       string;
  description: string;
  ctaLabel:    string;
  ctaHref:     Route;
  icon:        React.ReactNode;
};

const STEPS: Step[] = [
  {
    n:           1,
    title:       "Find Your Venue",
    description: "Browse 600+ verified Ontario wedding venues by region, style, and guest count.",
    ctaLabel:    "Browse venues",
    ctaHref:     "/venues" as Route,
    icon:        <BuildingIcon />,
  },
  {
    n:           2,
    title:       "Book Your Date",
    description: "Lock in your venue and let our AI planning tool build your wedding budget around it automatically.",
    ctaLabel:    "Start planning",
    ctaHref:     "/plan" as Route,
    icon:        <CalendarIcon />,
  },
  {
    n:           3,
    title:       "Find Your Vendors",
    description: "Discover photographers, DJs, florists and more — filtered by distance from your venue.",
    ctaLabel:    "Browse vendors",
    ctaHref:     "/vendors" as Route,
    icon:        <HeartIcon />,
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      style={{ background: "#FAF8F5" }}
      className="px-6 py-14 lg:py-16"
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-10 text-center">
          <h2
            id="how-it-works-heading"
            className="font-display text-3xl font-semibold text-charcoal md:text-4xl"
          >
            How Ontario Wedding Vendors Works
          </h2>
          <p className="mt-3 text-text-mid">
            Plan your entire Ontario wedding in three simple steps.
          </p>
        </header>

        {/* The connector line sits behind the cards on lg+. On mobile
         * the cards stack and the connector is hidden. */}
        <div className="relative">
          {/* Connector line — desktop only, hairline, rose at ~30% */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[16%] right-[16%] top-[40px] hidden h-px lg:block"
            style={{ background: "rgba(185,100,118,0.28)" }}
          />

          <ol className="relative grid gap-6 lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step) => (
              <li key={step.n} className="relative">
                <div className="flex h-full flex-col rounded-card border border-border-light bg-white p-6 text-center transition-shadow hover:shadow-[var(--shadow-card)] lg:p-7">
                  {/* Numbered rose circle — sits on top of the
                   * connector line so the line appears to pass
                   * through the row of circles. */}
                  <div
                    aria-hidden
                    className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                    style={{ background: "var(--rose, #B96476)" }}
                  >
                    <span className="font-display text-3xl font-semibold text-white">
                      {step.n}
                    </span>
                  </div>

                  {/* Rose icon */}
                  <div className="mx-auto mt-5 text-rose">
                    {step.icon}
                  </div>

                  <h3
                    className="mt-4 font-display font-semibold text-charcoal"
                    style={{ fontSize: "1.375rem", lineHeight: 1.2 }}
                  >
                    {step.title}
                  </h3>

                  <p
                    className="mt-2 flex-1 text-text-mid"
                    style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
                  >
                    {step.description}
                  </p>

                  <Link
                    href={step.ctaHref}
                    className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-bold text-rose hover:underline"
                  >
                    → {step.ctaLabel}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────── */

const svgProps = {
  viewBox:         "0 0 32 32",
  width:           "32",
  height:          "32",
  fill:            "none",
  stroke:          "currentColor",
  strokeWidth:     "1.5",
  strokeLinecap:   "round" as const,
  strokeLinejoin:  "round" as const,
  "aria-hidden":   true,
};

function BuildingIcon() {
  /* Wedding-venue silhouette: peaked roof + door + windows. */
  return (
    <svg {...svgProps}>
      <path d="M5 27V13l11-8 11 8v14" />
      <path d="M5 27h22" />
      <rect x="13" y="18" width="6" height="9" rx="0.5" />
      <rect x="8"  y="17" width="3" height="3" />
      <rect x="21" y="17" width="3" height="3" />
    </svg>
  );
}

function CalendarIcon() {
  /* Calendar with a small heart inside the date grid — nods to the
   * "book your date" framing without bringing in a separate ring. */
  return (
    <svg {...svgProps}>
      <rect x="4" y="7" width="24" height="21" rx="2" />
      <path d="M4 13h24" />
      <path d="M10 4v6M22 4v6" />
      <path d="M16 22.5l-3-3a2 2 0 0 1 3-2.6 2 2 0 0 1 3 2.6z" />
    </svg>
  );
}

function HeartIcon() {
  /* Two figures + a heart — the vendor-network meaning ("people who
   * make your day happen") rather than a pure heart. */
  return (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="3.5" />
      <circle cx="21" cy="11" r="3.5" />
      <path d="M5 26c0-3.5 2.5-6 6-6s6 2.5 6 6" />
      <path d="M15 26c0-3.5 2.5-6 6-6s6 2.5 6 6" />
      <path d="M16 8l-1.6-1.6a1.4 1.4 0 0 1 2-2 1.4 1.4 0 0 1 2 2z" />
    </svg>
  );
}
