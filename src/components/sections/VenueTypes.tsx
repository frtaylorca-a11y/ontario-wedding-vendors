import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

type VenueType = {
  label: string;
  href: Route;
  image: string;
};

const TYPES: VenueType[] = [
  { label: "Winery",       href: "/venues?type=winery" as Route,       image: "/images/venue-winery.png" },
  { label: "Estate",       href: "/venues?type=estate" as Route,       image: "/images/venue-estate.png" },
  { label: "Outdoor",      href: "/venues?indoor=outdoor" as Route,    image: "/images/venue-outdoor.png" },
  { label: "Hotel",        href: "/venues?type=hotel" as Route,        image: "/images/venue-hotel.png" },
  { label: "Barn",         href: "/venues?type=barn" as Route,         image: "/images/venue-barn.png" },
  { label: "Golf Club",    href: "/venues?type=golf-club" as Route,    image: "/images/venue-golf.png" },
  { label: "Conservation", href: "/venues?type=conservation" as Route, image: "/images/venue-conservation.png" },
  { label: "Intimate",     href: "/venues?capacity=50" as Route,       image: "/images/venue-intimate.png" },
];

export function VenueTypes() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20">
      <header className="mb-10 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Browse by venue type
        </div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-charcoal">
          Find your <em className="italic text-rose">style</em>
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-text-mid">
          From Niagara wineries to Muskoka lakefronts — pick the setting that
          fits your day.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {TYPES.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group relative block aspect-[4/5] overflow-hidden rounded-card border-[1.5px] border-border bg-bg-soft transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            <Image
              src={t.image}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 z-10 p-4"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
            >
              <h3
                className="font-display font-semibold leading-tight"
                style={{ fontSize: "1.2rem", color: "#ffffff", opacity: 1 }}
              >
                {t.label}
              </h3>
              <span
                className="mt-1 inline-flex items-center gap-1"
                style={{ fontSize: "0.75rem", color: "#ffffff", opacity: 1 }}
              >
                Browse
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
