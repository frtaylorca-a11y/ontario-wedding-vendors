import Link from "next/link";
import type { Route } from "next";

type Props = {
  venueName: string;
  venueSlug: string;
};

const UTM_BASE =
  "utm_source=owv&utm_medium=venue-page&utm_campaign=niagara-planner";

export function PicBoothCTA({ venueName, venueSlug }: Props) {
  const href =
    `https://picbooth.ca/?${UTM_BASE}&utm_content=photo-booth-${encodeURIComponent(venueSlug)}` as Route;

  return (
    <aside className="rounded-card border-[1.5px] border-border bg-bg-warm p-6 md:p-7">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
        Vendor recommendation
      </div>
      <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-charcoal">
        A photo booth pairs well with{" "}
        <em className="italic text-rose">{venueName}</em>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-text-mid">
        Pic Booth is a Niagara-based photo booth company that has worked with
        couples across the region. Setups range from open-air sailcloth booths
        to enclosed luxury cabinets — sized for venues like this one.
      </p>
      <Link
        href={href}
        target="_blank"
        rel="noopener"
        className="mt-5 inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
      >
        See Pic Booth packages
        <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}
