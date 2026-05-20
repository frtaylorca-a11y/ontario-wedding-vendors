import Link from "next/link";
import type { Route } from "next";

export type PlannerTabKey =
  | "planner"
  | "stag-and-doe"
  | "checklist"
  | "music"
  | "guests"
  | "itinerary"
  | "website";

const TABS: { key: PlannerTabKey; label: string; href: Route; isNew?: boolean }[] = [
  { key: "planner",      label: "Wedding Planner", href: "/plan" as Route },
  { key: "stag-and-doe", label: "Stag & Doe",      href: "/plan/stag-and-doe" as Route },
  { key: "checklist",    label: "Checklist",       href: "/plan/checklist" as Route },
  { key: "music",        label: "Music",           href: "/plan/music" as Route },
  { key: "guests",       label: "Guests",          href: "/plan/guests" as Route },
  { key: "itinerary",    label: "Itinerary",       href: "/plan/itinerary" as Route },
  { key: "website",      label: "Website",         href: "/plan/website" as Route,   isNew: true },
];

export function PlannerTabs({ active }: { active: PlannerTabKey }) {
  return (
    <nav
      aria-label="Planning tools"
      className="mb-8 flex flex-wrap gap-2 border-b border-border-light pb-4"
    >
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "inline-flex items-center rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white"
                : "inline-flex items-center rounded-pill border border-border bg-white px-5 py-2 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            }
          >
            {t.label}
            {t.isNew && (
              <span
                className={
                  isActive
                    ? "ml-2 rounded-pill bg-white/30 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]"
                    : "ml-2 rounded-pill bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-amber-700"
                }
              >
                New
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
