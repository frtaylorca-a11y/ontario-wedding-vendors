import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

type Feature = { label: string; icon: ReactNode };

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5 stroke-current",
};

const FEATURES: Feature[] = [
  {
    label: "AI budget allocation based on Ontario pricing",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H10.5a1.5 1.5 0 0 0 0 3H15" />
      </svg>
    ),
  },
  {
    label: "Vendors matched by proximity to your venue",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    label: "Guest list, seating, timeline and day-of itinerary",
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 10h18M8 2v4M16 2v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
];

function DashboardMockup() {
  // Donut: r=40 → circumference = 2π·40 ≈ 251.33
  // Segments: Venue 38%, Photography 11%, Florals 9%, Other 42%
  const C = 251.33;
  const venueLen = C * 0.38;
  const photoLen = C * 0.11;
  const floralLen = C * 0.09;
  const photoOffset = -venueLen;
  const floralOffset = -(venueLen + photoLen);

  return (
    <div
      aria-hidden
      className="relative rounded-card border-[1.5px] border-border bg-white p-6 shadow-[var(--shadow-card)]"
    >
      {/* Window chrome */}
      <div className="mb-5 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-text-muted">
          Wedding plan · Sept 14
        </span>
      </div>

      {/* Venue locked card */}
      <div className="mb-5 flex items-center gap-3 rounded-card border border-rose-pale bg-rose-pale p-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose text-white">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 stroke-current">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-rose">
            Venue locked
          </div>
          <div className="truncate font-display text-base font-semibold text-charcoal">
            Stonefields Estate
          </div>
          <div className="text-[0.7rem] text-text-mid">Carleton Place · 180 guests</div>
        </div>
      </div>

      {/* Donut + legend */}
      <div className="mb-5 flex items-center gap-5">
        <div className="relative h-[120px] w-[120px] flex-shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F2EFEC" strokeWidth="14" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#B96476" strokeWidth="14"
              strokeDasharray={`${venueLen} ${C}`} strokeDashoffset="0" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#C9A96E" strokeWidth="14"
              strokeDasharray={`${photoLen} ${C}`} strokeDashoffset={photoOffset} />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#8C7B6E" strokeWidth="14"
              strokeDasharray={`${floralLen} ${C}`} strokeDashoffset={floralOffset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-lg font-semibold text-charcoal">$48k</div>
            <div className="text-[0.6rem] uppercase tracking-[0.1em] text-text-muted">Budget</div>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-[0.78rem]">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-text-mid">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose" /> Venue & catering
            </span>
            <span className="font-medium text-charcoal">$18.2k</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-text-mid">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Photography
            </span>
            <span className="font-medium text-charcoal">$5.3k</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-text-mid">
              <span className="h-2.5 w-2.5 rounded-sm bg-taupe" /> Florals & décor
            </span>
            <span className="font-medium text-charcoal">$4.3k</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-text-muted">
              <span className="h-2.5 w-2.5 rounded-sm bg-border" /> Everything else
            </span>
            <span className="font-medium text-text-mid">$20.2k</span>
          </li>
        </ul>
      </div>

      {/* Vendor matches */}
      <div>
        <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-muted">
          Vendor matches nearby
        </div>
        <ul className="space-y-2">
          {[
            { name: "Sarah Phillips Photography", role: "Photography", dist: "12 km" },
            { name: "Bloomwood Florals", role: "Florals", dist: "18 km" },
            { name: "Pic Booth", role: "Photo booth", dist: "22 km" },
          ].map((v) => (
            <li key={v.name} className="flex items-center gap-3 rounded-card border border-border-light bg-bg-soft p-2.5">
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-rose-pale to-rose-light" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.78rem] font-semibold text-charcoal">{v.name}</div>
                <div className="text-[0.65rem] text-text-muted">
                  {v.role} · {v.dist}
                </div>
              </div>
              <span className="rounded-pill bg-[#EAF2EC] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-green">
                Match
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BridgeToPlanner() {
  return (
    <section className="bg-bg-warm">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
        <DashboardMockup />

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            More than a directory
          </div>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your venue unlocks your{" "}
            <em className="italic text-rose">entire wedding plan</em>
          </h2>
          <p className="mt-5 max-w-[520px] text-base leading-relaxed text-text-mid">
            Pick any venue on OntarioWeddingVendors.com and our AI planner instantly
            allocates your budget, matches vendors within driving distance, and
            builds your full wedding timeline — all in one place.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-rose shadow-[var(--shadow-card)]">
                  {f.icon}
                </span>
                <span className="pt-1.5 text-sm font-medium leading-snug text-charcoal">
                  {f.label}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={"/venues" as Route}
            className="mt-10 inline-flex items-center gap-2 rounded-pill bg-rose px-7 py-3.5 font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.35)] transition-all duration-200 hover:bg-rose-hover hover:shadow-[0_12px_32px_rgba(185,100,118,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Start with a venue
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
