import Link from "next/link";
import type { Route } from "next";

type FooterLink = { label: string; href: Route };

const REGIONS: FooterLink[] = [
  { label: "Niagara",                 href: "/regions/niagara" as Route },
  { label: "Greater Toronto",         href: "/regions/gta" as Route },
  { label: "Muskoka",                 href: "/regions/cottage-country" as Route },
  { label: "Hamilton & Burlington",   href: "/regions/golden-horseshoe" as Route },
  { label: "Waterloo Region",         href: "/regions/waterloo-region" as Route },
  { label: "Eastern Ontario",         href: "/regions/eastern" as Route },
  { label: "Prince Edward County",    href: "/regions/prince-edward-county" as Route },
];

const VENUE_TYPES: FooterLink[] = [
  { label: "Winery",        href: "/venues?type=winery" as Route },
  { label: "Estate",        href: "/venues?type=estate" as Route },
  { label: "Barn",          href: "/venues?type=barn" as Route },
  { label: "Hotel",         href: "/venues?type=hotel" as Route },
  { label: "Golf Club",     href: "/venues?type=golf-club" as Route },
  { label: "Outdoor",       href: "/venues?indoor=outdoor" as Route },
  { label: "Conservation",  href: "/venues?type=conservation" as Route },
  { label: "Intimate",      href: "/venues?capacity=50" as Route },
];

const FOR_VENDORS: FooterLink[] = [
  { label: "List your venue free",  href: "/list-your-venue" as Route },
  { label: "Claim your listing",    href: "/claim-listing" as Route },
  { label: "Featured placement",    href: "/featured" as Route },
  { label: "About us",              href: "/about" as Route },
  { label: "Contact us",            href: "/contact" as Route },
];

const HEADING_STYLE: React.CSSProperties = {
  fontSize: "0.7rem",
  letterSpacing: "0.1em",
  marginBottom: "14px",
};

const LINK_STYLE: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "rgba(255,255,255,0.45)",
};

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3
        className="font-bold uppercase text-white"
        style={HEADING_STYLE}
      >
        {heading}
      </h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
              style={LINK_STYLE}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer style={{ background: "#0F0D0C" }}>
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Col 1 — Brand */}
          <div className="lg:pr-4">
            <Link
              href={"/" as Route}
              className="font-display text-[1.5rem] font-semibold leading-none text-white transition-colors hover:opacity-90"
            >
              Ontario Wedding{" "}
              <em className="italic text-rose">Vendors</em>
            </Link>
            <p
              className="mt-4 font-display italic leading-snug"
              style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)" }}
            >
              Find your perfect venue. Plan your perfect wedding.
            </p>
            <p
              className="mt-6 leading-relaxed"
              style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}
            >
              Some vendors listed on this site have a relationship with the
              site operator.
            </p>
          </div>

          <FooterColumn heading="Regions" links={REGIONS} />
          <FooterColumn heading="Venue Types" links={VENUE_TYPES} />
          <FooterColumn heading="For Vendors" links={FOR_VENDORS} />
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="mx-auto max-w-[1280px] px-6 py-5">
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
            © 2026 Ontario Wedding Vendors · ontarioweddingvendors.com
          </p>
        </div>
      </div>
    </footer>
  );
}
