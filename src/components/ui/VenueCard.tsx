import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Venue } from "@/lib/schema";
import {
  formatCapacity,
  formatRating,
  scoreTier,
  SCORE_TIER_LABEL,
} from "@/lib/utils";

const VENUE_TYPE_IMAGE: Record<string, string> = {
  winery: "/images/venue-winery.png",
  barn: "/images/venue-barn.png",
  estate: "/images/venue-estate.png",
  inn: "/images/venue-estate.png",
  hotel: "/images/venue-hotel.png",
  resort: "/images/venue-hotel.png",
  "banquet-hall": "/images/venue-hotel.png",
  "golf-club": "/images/venue-golf.png",
  conservation: "/images/venue-outdoor.png",
  "conservation-area": "/images/venue-outdoor.png",
  conservatory: "/images/venue-outdoor.png",
  farm: "/images/venue-outdoor.png",
  garden: "/images/venue-outdoor.png",
};
const FALLBACK_IMAGE = "/images/venue-winery.png";

const VENUE_TYPE_LABEL: Record<string, string> = {
  winery: "Winery",
  hotel: "Hotel",
  barn: "Barn",
  estate: "Estate",
  "golf-club": "Golf Club",
  conservation: "Conservation",
  "conservation-area": "Conservation Area",
  conservatory: "Conservatory",
  restaurant: "Restaurant",
  "banquet-hall": "Banquet Hall",
  resort: "Resort",
  inn: "Inn",
  farm: "Farm",
  garden: "Garden",
};

const SCORE_CLASSES: Record<"premier" | "active" | "listed", string> = {
  premier: "bg-emerald-100 text-emerald-800",
  active: "bg-blue-100 text-blue-800",
  listed: "bg-amber-100 text-amber-800",
};

function formatMonthYear(d: Date | string | null): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
}

function regionLabel(slug: string): string {
  return slug
    .split("-")
    .map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}

/** Normalize a free-form string for switch comparison. */
function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Treat null, empty string, and the literal "unknown" as missing data. */
function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  if (t.toLowerCase() === "unknown") return null;
  return t;
}

function cateringLabel(c: string | null | undefined): string | null {
  const v = clean(c);
  if (!v) return null;
  const lc = v.toLowerCase();
  if (lc.includes("in-house") || lc.includes("inhouse")) return "In-house catering";
  if (lc.includes("open")) return "Open catering";
  if (lc.includes("both")) return "In-house or open";
  return v;
}

function indoorLabel(v: string | null | undefined): string | null {
  const s = clean(v);
  if (!s) return null;
  const lc = s.toLowerCase();
  if (lc.includes("both")) return "Indoor & outdoor";
  if (lc === "indoor") return "Indoor";
  if (lc === "outdoor") return "Outdoor";
  return s;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-border-light bg-bg-soft px-2.5 py-1 text-[0.7rem] font-medium text-text-mid">
      {children}
    </span>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  const tier = scoreTier(venue.weddingReadinessScore);
  if (tier === "hidden") return null;

  const ratingStr = formatRating(venue.googleRating);
  const ratingNum = ratingStr ? Number(ratingStr) : null;
  const starsRounded = ratingNum != null ? Math.round(ratingNum) : 0;
  const capacity = formatCapacity(venue.capacityMin, venue.capacityMax);
  const cateringText = cateringLabel(venue.catering);
  const indoorText = indoorLabel(venue.indoorOutdoor);
  const verifiedDate = venue.lastVerified ?? venue.lastGoogleSync;
  const verified = formatMonthYear(verifiedDate);

  const typeKey = norm(venue.venueType);
  const typeShownAsBadge = typeKey && typeKey !== "other" && typeKey !== "unknown";
  const typeLabel = typeShownAsBadge
    ? (VENUE_TYPE_LABEL[typeKey] ?? venue.venueType)
    : null;

  const href = `/venues/${venue.slug}` as Route;
  const imageSrc = (typeKey && VENUE_TYPE_IMAGE[typeKey]) || FALLBACK_IMAGE;

  return (
    <article className="group relative overflow-hidden rounded-card border-[1.5px] border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-hover)]">
      {/* Hero / image */}
      <div className="relative h-48 overflow-hidden bg-bg-soft">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {typeLabel && (
          <span className="absolute left-3 top-3 rounded-pill border-[1.5px] border-rose bg-white px-3 py-[5px] text-[0.7rem] font-bold uppercase tracking-[0.1em] text-rose">
            {typeLabel}
          </span>
        )}

        <span
          className={`absolute right-3 top-3 rounded-pill px-3 py-[5px] text-[0.7rem] font-bold uppercase tracking-[0.08em] ${SCORE_CLASSES[tier]}`}
        >
          {SCORE_TIER_LABEL[tier]}
        </span>

        <button
          type="button"
          aria-label={`Save ${venue.name}`}
          className="absolute bottom-3 right-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border bg-white/95 text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="text-xs font-bold uppercase tracking-[0.1em] text-rose">
          {typeLabel ?? "Wedding Venue"}
        </div>

        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-charcoal">
          <Link
            href={href}
            className="rounded-sm transition-colors after:absolute after:inset-0 after:content-[''] hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            {venue.name}
          </Link>
        </h3>

        {venue.city && (
          <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3 w-3 flex-shrink-0 fill-none stroke-rose"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>
              {venue.city}
              {venue.region ? ` · ${regionLabel(venue.region)}` : ""}
            </span>
          </div>
        )}

        {/* Chips — each value individually checked for null / "unknown" */}
        {(capacity || cateringText || indoorText) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {capacity && <Chip>{capacity}</Chip>}
            {cateringText && <Chip>{cateringText}</Chip>}
            {indoorText && <Chip>{indoorText}</Chip>}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
          <div className="flex items-center gap-2">
            {ratingNum != null && (
              <span className="text-sm leading-none tracking-widest text-gold">
                {"★".repeat(starsRounded)}
                <span className="text-border">{"★".repeat(5 - starsRounded)}</span>
              </span>
            )}
            {ratingStr && (
              <span className="text-xs text-text-mid">
                {ratingStr}
                {venue.reviewCount != null && (
                  <span className="text-text-muted"> ({venue.reviewCount})</span>
                )}
              </span>
            )}
          </div>
          <span className="relative z-[1] text-xs font-bold tracking-[0.04em] text-rose">
            View venue →
          </span>
        </div>

        {verified && (
          <div className="relative z-[1] mt-3 inline-flex items-center gap-1.5 rounded-pill bg-[#EAF2EC] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-green">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-2.5 w-2.5 fill-none stroke-current"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Verified {verified}
          </div>
        )}
      </div>
    </article>
  );
}
