import { CountdownTimer } from "./CountdownTimer";

/**
 * Dramatic dark-scrim hero. White type universally; theme accent
 * tints the gradient + the RSVP CTA.
 *
 * Layout from top:
 *   - Monogram in script font (initials + ampersand) — 60px
 *   - "Save the date" eyebrow in spaced caps
 *   - Thin horizontal rule
 *   - Couple names — 48px mobile / 80px desktop, italic display
 *   - Thin horizontal rule
 *   - Date in spaced caps ("AUGUST 15, 2026")
 *   - Venue line
 *   - Hashtag (if set)
 *   - RSVP CTA (if OneQR activated)
 *   - Countdown timer
 *   - Animated chevron scroll cue
 */
export function HeroBlock({
  coupleLabel,
  partner1Name,
  partner2Name,
  weddingDateIso,
  weddingDateUpper,
  venueLine,
  heroImage,
  hashtag,
  oneqrSlug,
  showRsvpCta,
}: {
  coupleLabel:       string;
  partner1Name:      string | null;
  partner2Name:      string | null;
  weddingDateIso:    string | null;
  weddingDateUpper:  string | null;
  venueLine:         string | null;
  heroImage:         string | null;
  hashtag:           string | null;
  oneqrSlug:         string | null;
  showRsvpCta:       boolean;
}) {
  const initialA = firstLetter(partner1Name);
  const initialB = firstLetter(partner2Name);
  const monogram = initialA && initialB
    ? `${initialA} & ${initialB}`
    : initialA || initialB || null;

  return (
    <section className="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      {/* Backdrop layer — image when set, else theme-tinted gradient */}
      {heroImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          {/* Dark scrim — top vignette + edge darkening for legibility */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.6) 100%)",
            }}
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(155deg, color-mix(in srgb, var(--wt-accent) 78%, #1a1a1a) 0%, #1a1a1a 60%, color-mix(in srgb, var(--wt-accent) 50%, #1a1a1a) 100%)",
          }}
        />
      )}

      <div className="relative max-w-[860px]">
        {/* Monogram */}
        {monogram && (
          <div
            className="text-[3.5rem] leading-none"
            style={{
              fontFamily: "var(--font-monogram), 'Great Vibes', cursive",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {monogram}
          </div>
        )}

        {/* Save the date eyebrow */}
        <div
          className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.32em]"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Save the date
        </div>

        {/* Top rule */}
        <Rule />

        {/* Couple names */}
        <h1
          className="text-[clamp(2.6rem,9vw,5rem)] leading-[1.05]"
          style={{
            fontFamily:    "var(--wt-font-display)",
            fontStyle:     "italic",
            letterSpacing: "0.02em",
            color:         "#FFFFFF",
          }}
        >
          {coupleLabel}
        </h1>

        {/* Bottom rule */}
        <Rule />

        {/* Date in spaced caps */}
        {weddingDateUpper && (
          <div
            className="mt-5 text-[0.95rem] font-medium uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {weddingDateUpper}
          </div>
        )}

        {/* Venue */}
        {venueLine && (
          <div
            className="mt-2 text-[0.85rem] tracking-[0.04em]"
            style={{
              color: "rgba(255,255,255,0.7)",
              fontFamily: "var(--wt-font-body)",
            }}
          >
            {venueLine}
          </div>
        )}

        {/* Hashtag */}
        {hashtag && (
          <div
            className="mt-6 text-[0.75rem] font-bold uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {hashtag}
          </div>
        )}

        {/* RSVP CTA */}
        {showRsvpCta && oneqrSlug && (
          <div className="mt-8">
            <a
              href={`https://oneqr.events/e/${oneqrSlug}`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-7 py-3 text-xs font-bold uppercase tracking-[0.28em] text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              RSVP &amp; details
            </a>
          </div>
        )}
        {showRsvpCta && !oneqrSlug && (
          <div className="mt-8 text-[0.7rem] uppercase tracking-[0.32em]"
               style={{ color: "rgba(255,255,255,0.65)" }}>
            RSVP opens 6 weeks before the wedding
          </div>
        )}

        {/* Countdown */}
        {weddingDateIso && (
          <div className="mt-10">
            <CountdownTimer isoDate={weddingDateIso} />
          </div>
        )}
      </div>

      {/* Animated chevron scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hero-chevron-bounce"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <style>{`
        @keyframes herochev {
          0%   { transform: translateY(0);   opacity: 0.55; }
          50%  { transform: translateY(8px); opacity: 1;    }
          100% { transform: translateY(0);   opacity: 0.55; }
        }
        .hero-chevron-bounce {
          animation: herochev 2.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-chevron-bounce { animation: none; }
        }
      `}</style>
    </section>
  );
}

function Rule() {
  return (
    <div
      aria-hidden
      className="mx-auto my-6 h-px w-[64%] max-w-[420px]"
      style={{ background: "rgba(255,255,255,0.3)" }}
    />
  );
}

function firstLetter(s: string | null | undefined): string {
  const v = (s ?? "").trim();
  return v.length > 0 ? v.charAt(0).toUpperCase() : "";
}
