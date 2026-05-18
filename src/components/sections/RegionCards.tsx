import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

type Region = {
  slug: Route;
  label: string;
  image: string;
};

const REGIONS: Region[] = [
  {
    slug: "/regions/niagara" as Route,
    label: "Niagara",
    image: "/images/region-niagara.png",
  },
  {
    slug: "/regions/gta" as Route,
    label: "Greater Toronto Area",
    image: "/images/region-toronto.png",
  },
  {
    slug: "/regions/cottage-country" as Route,
    label: "Muskoka & Cottage Country",
    image: "/images/region-muskoka.png",
  },
  {
    slug: "/regions/golden-horseshoe" as Route,
    label: "Hamilton & Burlington",
    image: "/images/region-hamilton.png",
  },
];

export function RegionCards() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-20">
      <header className="mb-10 text-center">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-rose">
          Browse by region
        </div>
        <h2 className="mt-2 font-display text-4xl font-semibold text-charcoal">
          Ontario&rsquo;s wedding <em className="italic text-rose">regions</em>
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-text-mid">
          Each region has its own character — explore the venues that define it.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {REGIONS.map((r) => (
          <Link
            key={r.slug}
            href={r.slug}
            className="group relative block aspect-[3/4] overflow-hidden rounded-card border-[1.5px] border-border bg-bg-soft shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
          >
            <Image
              src={r.image}
              alt={`${r.label} wedding venues`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={false}
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
              style={{
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              <h3
                className="font-display font-semibold leading-tight"
                style={{ fontSize: "1.2rem", color: "#ffffff", opacity: 1 }}
              >
                {r.label}
              </h3>
              <span
                className="mt-1 inline-flex items-center gap-1"
                style={{ fontSize: "0.75rem", color: "#ffffff", opacity: 1 }}
              >
                Explore venues
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
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
