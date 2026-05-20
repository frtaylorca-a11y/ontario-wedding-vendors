import { ScrollFadeIn } from "../ScrollFadeIn";
import { CountdownTimer } from "../CountdownTimer";
import type { WeddingLayoutProps } from "./types";

/* ─── Terracotta theme ────────────────────────────────────────────────
 * Inspired by Abigail & Rick. Editorial weekend-invite layout.
 *
 * Palette (fixed):
 *   #C4632A  terracotta accent
 *   #F5EDE3  warm sand band
 *   #FAF6F1  cream page
 *   #2C1810  dark brown ink
 *
 * Fonts: Cormorant Garamond (display, italic) + Inter (body).
 */

const TC = {
  accent:       "#C4632A",
  accentDeep:   "#A8521E",
  sand:         "#F5EDE3",
  cream:        "#FAF6F1",
  ink:          "#2C1810",
  inkMuted:     "#6B5240",
  whiteOnDark:  "#FAF6F1",
  pillBorder:   "rgba(250,246,241,0.5)",
} as const;

export function TerracottaLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper,
    weddingDateLong, generated, party, registry, things, extraEvents,
    gallery, faqItems, storyPhoto, siteUrl,
  } = props;

  const datePill = formatWeekendPill(plan.weddingDate);
  const venuePill = venue?.city
    ? [venue.address, venue.city + ", Ontario"].filter(Boolean).join(", ")
    : (venue?.address || null);

  const mapQuery =
    venue?.address
      ? `${venue.name ?? ""} ${venue.address}`.trim()
      : (venue?.name && venue?.city ? `${venue.name} ${venue.city}` : null);

  const mapHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <main
      style={{
        background: TC.cream,
        color:      TC.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero: full-bleed photo + centered names + pill badges ─── */}
      <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {plan.weddingHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.weddingHeroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "linear-gradient(180deg, rgba(44,24,16,0.4) 0%, rgba(44,24,16,0.55) 100%)",
              }}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(160deg, ${TC.accentDeep} 0%, ${TC.ink} 100%)`,
            }}
          />
        )}

        <div className="relative max-w-[860px]">
          <div
            className="text-[0.7rem] font-medium uppercase tracking-[0.36em]"
            style={{ color: "rgba(250,246,241,0.75)" }}
          >
            The Wedding Of
          </div>

          <h1
            className="mt-6 text-[clamp(2.4rem,8.5vw,5rem)] leading-[1.02]"
            style={{
              fontFamily:    "var(--font-display), 'Cormorant Garamond', Georgia, serif",
              fontStyle:     "italic",
              letterSpacing: "0.01em",
              color:         "#FFFFFF",
            }}
          >
            {coupleLabel}
          </h1>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {datePill && (
              <span
                className="inline-flex items-center rounded-full border px-5 py-2 text-[0.72rem] font-medium uppercase tracking-[0.18em]"
                style={{
                  borderColor: TC.pillBorder,
                  color:       TC.whiteOnDark,
                  background:  "rgba(0,0,0,0.18)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {datePill}
              </span>
            )}
            {venuePill && (
              <span
                className="inline-flex items-center rounded-full border px-5 py-2 text-[0.72rem] font-medium uppercase tracking-[0.18em]"
                style={{
                  borderColor: TC.pillBorder,
                  color:       TC.whiteOnDark,
                  background:  "rgba(0,0,0,0.18)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {venuePill}
              </span>
            )}
          </div>

          {config.rsvp && plan.oneqrSlug && (
            <div className="mt-10">
              <a
                href={`https://oneqr.events/e/${plan.oneqrSlug}`}
                className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-3 text-xs font-bold uppercase tracking-[0.28em] transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(250,246,241,0.9)", color: TC.whiteOnDark }}
              >
                RSVP
              </a>
            </div>
          )}

          {plan.weddingDate && (
            <div className="mt-12">
              <CountdownTimer isoDate={plan.weddingDate} />
            </div>
          )}
        </div>

        {/* Bottom-edge scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
               stroke="rgba(250,246,241,0.75)" strokeWidth="1.5"
               strokeLinecap="round" strokeLinejoin="round"
               className="tc-chevron-bounce">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <style>{`
          @keyframes tcchev { 0%,100%{transform:translateY(0);opacity:0.55}50%{transform:translateY(8px);opacity:1} }
          .tc-chevron-bounce { animation: tcchev 2.2s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .tc-chevron-bounce { animation: none } }
        `}</style>
      </section>

      {/* ── Terracotta band — "The Wedding Weekend" ────────────────── */}
      <ScrollFadeIn>
        <section
          className="px-6 py-20 text-center lg:py-28"
          style={{ background: TC.accent, color: TC.whiteOnDark }}
        >
          <div className="mx-auto max-w-[820px]">
            <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
                 style={{ color: "rgba(250,246,241,0.8)" }}>
              You&rsquo;re Invited
            </div>
            <h2
              className="mt-5 text-[clamp(2.2rem,6vw,3.5rem)] leading-tight"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                fontStyle:  "italic",
              }}
            >
              The Wedding Weekend
            </h2>
            <p className="mt-7 text-[1.05rem] leading-[1.85] sm:text-[1.15rem]"
               style={{ color: "rgba(250,246,241,0.92)" }}>
              {generated?.heroTagline ||
                `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
            </p>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Two-column event cards (Ceremony | Reception) ──────────── */}
      <ScrollFadeIn>
        <section className="px-6 py-20 lg:py-28">
          <div className="mx-auto grid max-w-[1080px] gap-6 sm:grid-cols-2 lg:gap-10">
            <EventCard
              eyebrow="The Ceremony"
              title={venue?.name ?? "The Ceremony"}
              meta={weddingDateLong}
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
            />
            <EventCard
              eyebrow="The Reception"
              title={venue?.name ?? "The Reception"}
              meta="Dinner & dancing to follow"
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
            />
          </div>

          {/* Additional events */}
          {extraEvents.length > 0 && (
            <ul className="mx-auto mt-10 grid max-w-[1080px] gap-4 sm:grid-cols-2">
              {extraEvents.map((ev) => (
                <li key={ev.id}
                    className="rounded-sm border p-6"
                    style={{ borderColor: "#E0CFB4", background: TC.cream }}>
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.28em]"
                       style={{ color: TC.accent }}>
                    {ev.name}
                  </div>
                  <div className="mt-2 text-base" style={{ color: TC.ink }}>
                    {[ev.date, ev.time].filter(Boolean).join(" · ")}
                  </div>
                  {ev.location && (
                    <div className="mt-1 text-sm" style={{ color: TC.inkMuted }}>
                      {ev.location}
                    </div>
                  )}
                  {ev.description && (
                    <p className="mt-3 text-[0.95rem] leading-[1.8]" style={{ color: TC.inkMuted }}>
                      {ev.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 text-center">
            {plan.oneqrSlug ? (
              <a href={`https://oneqr.events/e/${plan.oneqrSlug}`}
                 className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs font-bold uppercase tracking-[0.28em] transition-all hover:opacity-90"
                 style={{ background: TC.accent, color: TC.whiteOnDark }}>
                Full schedule &amp; RSVP →
              </a>
            ) : (
              <span className="text-[0.7rem] uppercase tracking-[0.28em]"
                    style={{ color: TC.inkMuted }}>
                Full RSVP opens 6 weeks before the wedding
              </span>
            )}
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Our Love Story — asymmetric editorial ──────────────────── */}
      {config.ourStory && plan.ourStory && (
        <ScrollFadeIn>
          <section style={{ background: TC.sand }} className="py-20 lg:py-28">
            <div className="mx-auto grid max-w-[1180px] gap-10 px-6 lg:grid-cols-[55fr_45fr] lg:gap-16">
              {/* Text */}
              <div className="lg:order-1 lg:py-6">
                <div className="text-[0.7rem] font-medium uppercase tracking-[0.36em]"
                     style={{ color: TC.accent }}>
                  Chapter One
                </div>
                <h2
                  className="mt-3 text-[clamp(2.2rem,6vw,3.3rem)] leading-tight"
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                    fontStyle:  "italic",
                    color:      TC.ink,
                  }}
                >
                  Our Love Story
                </h2>

                <div className="relative mt-8">
                  <span
                    aria-hidden
                    className="absolute -left-1 -top-7 select-none leading-none"
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                      color:      TC.accent,
                      opacity:    0.5,
                      fontSize:   "5rem",
                    }}
                  >
                    &ldquo;
                  </span>
                  <p
                    className="text-[1.05rem] leading-[1.85] sm:text-[1.1rem]"
                    style={{ color: TC.inkMuted, whiteSpace: "pre-line" }}
                  >
                    {plan.ourStory}
                  </p>
                </div>
              </div>

              {/* Photo */}
              <div className="lg:order-2">
                {storyPhoto ? (
                  <div className="overflow-hidden rounded-sm shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storyPhoto} alt=""
                         className="h-full w-full object-cover"
                         style={{ aspectRatio: "4 / 5" }}
                         loading="lazy" />
                  </div>
                ) : (
                  <div
                    className="flex aspect-[4/5] items-center justify-center rounded-sm"
                    style={{ background: TC.cream, border: `1px solid #E0CFB4` }}
                  >
                    <ChurchIllustration tint={TC.accent} />
                  </div>
                )}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Travel band — illustrated line art icon ────────────────── */}
      {config.travel && plan.travelCopy && (
        <ScrollFadeIn>
          <section
            className="px-6 py-20 text-center lg:py-28"
            style={{ background: TC.accent, color: TC.whiteOnDark }}
          >
            <div className="mx-auto max-w-[820px]">
              <ChurchIllustration tint="rgba(250,246,241,0.9)" />

              <div className="mt-7 text-[0.72rem] font-medium uppercase tracking-[0.36em]"
                   style={{ color: "rgba(250,246,241,0.8)" }}>
                Plan Your Trip
              </div>
              <h2 className="mt-3 text-[clamp(2.2rem,6vw,3.3rem)] leading-tight"
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                    fontStyle:  "italic",
                  }}>
                Travel &amp; Accommodation
              </h2>
              <p className="mt-7 whitespace-pre-line text-[1.02rem] leading-[1.85]"
                 style={{ color: "rgba(250,246,241,0.92)" }}>
                {plan.travelCopy}
              </p>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Wedding party ──────────────────────────────────────────── */}
      {config.weddingParty && party.length > 0 && (
        <ScrollFadeIn>
          <Section bg={TC.cream}>
            <SectionHead eyebrow="Standing With Us" title="Wedding Party" tint={TC.accent} ink={TC.ink} />
            <ul className="mx-auto mt-12 grid max-w-[1080px] gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {party.map((m) => (
                <li key={m.id} className="text-center">
                  <div
                    className="mx-auto h-32 w-32 overflow-hidden rounded-full border-2 transition-transform hover:scale-[1.04] sm:h-36 sm:w-36"
                    style={{ borderColor: TC.accent, background: TC.sand }}
                  >
                    <div className="flex h-full w-full items-center justify-center"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontStyle:  "italic",
                           color:      TC.accent,
                           fontSize:   "2.5rem",
                         }}>
                      {initials(m.name)}
                    </div>
                  </div>
                  <div className="mt-4 text-xl"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         fontStyle:  "italic",
                         color:      TC.ink,
                       }}>
                    {m.name}
                  </div>
                  <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.28em]"
                       style={{ color: TC.accent }}>
                    {m.role}
                  </div>
                  {m.bio && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: TC.inkMuted }}>
                      {m.bio}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Gallery — full-bleed mosaic ─────────────────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <ScrollFadeIn>
          <Section bg={TC.sand}>
            <SectionHead eyebrow="Memories" title="Our Photos" tint={TC.accent} ink={TC.ink} />
            <div className="mt-10 grid gap-1 grid-cols-2 sm:grid-cols-3">
              {gallery.filter(Boolean).map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={url} alt=""
                     className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                     loading="lazy" />
              ))}
            </div>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Dress code ─────────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <ScrollFadeIn>
          <Section bg={TC.cream}>
            <SectionHead eyebrow="What to Wear" title="Dress Code" tint={TC.accent} ink={TC.ink} />
            <div className="mx-auto mt-10 max-w-[640px] text-center">
              {plan.dressCodeStyle && (
                <div className="inline-block rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.24em]"
                     style={{ background: TC.accent, color: TC.whiteOnDark }}>
                  {plan.dressCodeStyle}
                </div>
              )}
              {plan.dressCodeDescription && (
                <p className="mt-5 text-[1.05rem] leading-[1.85]" style={{ color: TC.inkMuted }}>
                  {plan.dressCodeDescription}
                </p>
              )}
            </div>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Things to do ───────────────────────────────────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <ScrollFadeIn>
          <Section bg={TC.sand}>
            <SectionHead eyebrow="While You're Here" title="Things to Do Nearby" tint={TC.accent} ink={TC.ink} />
            <ol className="mx-auto mt-10 max-w-[800px] space-y-5">
              {things.map((t, i) => (
                <li key={t.id}
                    className="flex gap-5 rounded-sm border p-6"
                    style={{ background: TC.cream, borderColor: "#E0CFB4" }}>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                       style={{
                         background: TC.accent,
                         color:      TC.whiteOnDark,
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         fontStyle:  "italic",
                       }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontStyle:  "italic",
                           color:      TC.ink,
                         }}>
                      {t.name}
                    </div>
                    <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: TC.inkMuted }}>
                      {t.description}
                    </p>
                    {t.url && (
                      <a href={t.url} target="_blank" rel="noopener"
                         className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.28em]"
                         style={{ color: TC.accent }}>
                        Visit website ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Registry ───────────────────────────────────────────────── */}
      {config.registry && registry.length > 0 && (
        <ScrollFadeIn>
          <Section bg={TC.cream}>
            <SectionHead eyebrow="With Our Thanks" title="Registry" tint={TC.accent} ink={TC.ink} />
            <div className="mx-auto mt-10 flex max-w-[680px] flex-wrap justify-center gap-3">
              {registry.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener"
                   className="rounded-full border-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:opacity-80"
                   style={{ borderColor: TC.accent, color: TC.accent }}>
                  {r.label || "Registry"} ↗
                </a>
              ))}
            </div>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <ScrollFadeIn>
          <Section bg={TC.sand}>
            <SectionHead eyebrow="Good to Know" title="Frequently Asked" tint={TC.accent} ink={TC.ink} />
            <ul className="mx-auto mt-10 max-w-[720px] space-y-4">
              {faqItems.map((f) => (
                <li key={f.id}
                    className="rounded-sm border p-6"
                    style={{ background: TC.cream, borderColor: "#E0CFB4" }}>
                  <div className="text-lg font-bold" style={{ color: TC.ink }}>
                    {f.question}
                  </div>
                  <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: TC.inkMuted }}>
                    {f.answer}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Vendor credits ──────────────────────────────────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <ScrollFadeIn>
          <Section bg={TC.cream}>
            <SectionHead eyebrow="The Team Behind the Day" title="Our Venue &amp; Vendors" tint={TC.accent} ink={TC.ink} />
            <div className="mx-auto mt-10 max-w-[920px] space-y-4">
              {venue?.name && (
                <div className="rounded-sm border p-6"
                     style={{ borderColor: "#E0CFB4", background: TC.sand }}>
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em]"
                       style={{ color: TC.accent }}>
                    Venue
                  </div>
                  <div className="mt-2 text-3xl"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         fontStyle:  "italic",
                         color:      TC.ink,
                       }}>
                    {venue.name}
                  </div>
                  {venue.city && (
                    <div className="mt-0.5 text-sm" style={{ color: TC.inkMuted }}>
                      {venue.city}, Ontario
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                    {venue.slug && (
                      <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                         className="rounded-full border-2 px-4 py-1.5 font-bold uppercase tracking-[0.18em]"
                         style={{ borderColor: TC.accent, color: TC.accent }}>
                        View profile →
                      </a>
                    )}
                    {venue.website && (
                      <a href={venue.website} target="_blank" rel="noopener"
                         className="rounded-full border px-4 py-1.5 font-medium uppercase tracking-[0.18em]"
                         style={{ borderColor: "#E0CFB4", color: TC.ink }}>
                        Visit website ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {credits.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {credits.map((c, i) => (
                    <li key={`${c.category}-${i}`}
                        className="rounded-sm border p-5"
                        style={{ borderColor: "#E0CFB4", background: TC.sand }}>
                      <div className="text-[0.6rem] font-bold uppercase tracking-[0.28em]"
                           style={{ color: TC.accent }}>
                        {prettyCategory(c.category)}
                      </div>
                      <div className="mt-1.5 text-lg"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontStyle:  "italic",
                             color:      TC.ink,
                           }}>
                        {c.name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </ScrollFadeIn>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="px-6 py-14 text-center" style={{ background: TC.sand }}>
        <div className="text-3xl sm:text-4xl"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               fontStyle:  "italic",
               color:      TC.ink,
             }}>
          {coupleLabel}
        </div>
        {weddingDateUpper && (
          <div className="mt-2 text-[0.75rem] uppercase tracking-[0.32em]"
               style={{ color: TC.inkMuted }}>
            {weddingDateUpper}
          </div>
        )}
        <div aria-hidden className="mx-auto my-6 h-px w-16" style={{ background: TC.accent, opacity: 0.5 }} />
        {plan.weddingHashtag && (
          <div className="text-[0.75rem] font-bold uppercase tracking-[0.32em]"
               style={{ color: TC.accent }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: TC.inkMuted }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: TC.accent }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function Section({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <section style={{ background: bg }} className="px-6 py-20 lg:py-28">
      {children}
    </section>
  );
}

function SectionHead({ eyebrow, title, tint, ink }: {
  eyebrow: string; title: string; tint: string; ink: string;
}) {
  return (
    <div className="mx-auto max-w-[1080px] text-center">
      <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
           style={{ color: tint }}>
        {eyebrow}
      </div>
      <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontStyle:  "italic",
            color:      ink,
          }}
          dangerouslySetInnerHTML={{ __html: title }}
      />
      <div aria-hidden className="mx-auto mt-5 h-px w-12" style={{ background: tint, opacity: 0.5 }} />
    </div>
  );
}

function EventCard({ eyebrow, title, meta, address, mapHref }: {
  eyebrow: string;
  title:   string;
  meta:    string | null;
  address: string;
  mapHref: string | null;
}) {
  return (
    <div className="rounded-sm border p-7 sm:p-8 lg:p-10"
         style={{ background: TC.cream, borderColor: "#E0CFB4" }}>
      <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
           style={{ color: TC.accent }}>
        {eyebrow}
      </div>
      <h3 className="mt-3 text-3xl leading-tight sm:text-4xl"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontStyle:  "italic",
            color:      TC.ink,
          }}>
        {title}
      </h3>
      {meta && (
        <div className="mt-3 text-[0.95rem]" style={{ color: TC.inkMuted }}>
          {meta}
        </div>
      )}
      {address && (
        <div className="mt-1 text-[0.95rem] leading-[1.7]" style={{ color: TC.inkMuted }}>
          {address}
        </div>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noopener"
           className="mt-5 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.28em]"
           style={{ color: TC.accent }}>
          View on map →
        </a>
      )}
    </div>
  );
}

/* Simple church + arch line illustration. Stroke-only, theme-coloured. */
function ChurchIllustration({ tint }: { tint: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      width="120"
      height="80"
      fill="none"
      stroke={tint}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto"
      aria-hidden
    >
      {/* Central nave */}
      <path d="M40 70 L40 38 Q60 18 80 38 L80 70 Z" />
      {/* Spire */}
      <path d="M60 10 L60 24" />
      <circle cx="60" cy="9" r="1.5" />
      <path d="M55 28 L60 24 L65 28" />
      {/* Side wings */}
      <path d="M20 70 L20 50 Q30 44 40 50" />
      <path d="M100 70 L100 50 Q90 44 80 50" />
      {/* Door */}
      <path d="M54 70 L54 52 Q60 47 66 52 L66 70" />
      {/* Hairline ground */}
      <line x1="6" y1="70" x2="114" y2="70" />
    </svg>
  );
}

function formatWeekendPill(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function prettyCategory(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
