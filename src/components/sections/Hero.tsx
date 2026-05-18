import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";

const HERO_IMAGE_URL = "/images/hero-niagara-vineyard.png";

type Props = {
  imageUrl?: string;
};

type FilterPill = {
  label: string;
  href: Route;
  icon: React.ReactNode;
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[15px] w-[15px] stroke-current",
};

const FILTERS: FilterPill[] = [
  {
    label: "Winery",
    href: "/venues?type=winery" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M7 3h10l-1 7a4 4 0 0 1-8 0z" />
        <path d="M12 14v6" />
        <path d="M8 21h8" />
      </svg>
    ),
  },
  {
    label: "Estate",
    href: "/venues?type=estate" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M3 11 12 4l9 7" />
        <path d="M5 11v10h14V11" />
        <rect x="7.5" y="13" width="3.5" height="3.5" />
        <rect x="13" y="13" width="3.5" height="3.5" />
        <path d="M10.5 21v-4h3v4" />
      </svg>
    ),
  },
  {
    label: "Outdoor",
    href: "/venues?indoor=outdoor" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        {/* sun rising over horizon */}
        <circle cx="12" cy="13" r="3.5" />
        <path d="M12 6.5V5M12 21v-1.5M5.5 13H4M20 13h-1.5M7 8l-1-1M17 8l1-1M3 21h18" />
      </svg>
    ),
  },
  {
    label: "Hotel",
    href: "/venues?type=hotel" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
        <path d="M10 21v-3h4v3" />
      </svg>
    ),
  },
  {
    label: "Barn",
    href: "/venues?type=barn" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M2 11 12 3l10 8" />
        <path d="M4 11v10h16V11" />
        <path d="M9 21V13h6v8" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    label: "Golf Club",
    href: "/venues?type=golf-club" as Route,
    icon: (
      <svg aria-hidden {...ICON_PROPS}>
        <path d="M7 21V4" />
        <path d="M7 4l10 3-10 4" />
        <path d="M3 21h18" />
      </svg>
    ),
  },
];

export function Hero({ imageUrl = HERO_IMAGE_URL }: Props) {
  const hasImage = Boolean(imageUrl);
  const style: CSSProperties | undefined = hasImage
    ? ({ "--hero-image": `url('${imageUrl}')` } as CSSProperties)
    : undefined;

  return (
    <section
      className={`hero ${hasImage ? "hero-has-image" : ""}`}
      style={style}
    >
      <div className="hero-eyebrow">Niagara · GTA · Muskoka · Ottawa</div>
      <h1>
        Find Your Perfect
        <br />
        Ontario <em>Wedding Venue</em>
      </h1>
      <p className="hero-sub">
        Ontario&rsquo;s most complete wedding directory — venues, vendors, and
        an AI planning tool that builds your entire wedding around the venue
        you choose.
      </p>

      <form className="hero-search" action="/venues" method="GET" role="search">
        <div className="search-wrap">
          <select name="type" aria-label="Venue type" defaultValue="">
            <option value="">All venue types</option>
            <option value="winery">Winery</option>
            <option value="hotel">Hotel</option>
            <option value="barn">Barn</option>
            <option value="estate">Estate</option>
            <option value="golf-club">Golf Club</option>
            <option value="conservation">Conservation</option>
            <option value="restaurant">Restaurant</option>
            <option value="banquet-hall">Banquet Hall</option>
            <option value="resort">Resort</option>
          </select>
          <input
            type="text"
            name="q"
            placeholder="City or venue name…"
            aria-label="Search venues"
          />
          <button type="submit" className="search-btn">
            Search
          </button>
        </div>
      </form>

      <div className="hero-filters" role="list">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            role="listitem"
            className="hero-filter-pill"
          >
            {f.icon}
            <span>{f.label}</span>
          </Link>
        ))}
      </div>

      <div className="hero-stats">
        <div className="stat">
          <div className="stat-num">1,200+</div>
          <div className="stat-label">Venues</div>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <div className="stat-num">76</div>
          <div className="stat-label">Premier listings</div>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <div className="stat-num">8</div>
          <div className="stat-label">Regions</div>
        </div>
      </div>
    </section>
  );
}
