import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Terracotta layout ───────────────────────────────────────────────
 * Earthy, warm, rustic. Adobe walls, dried botanicals, golden hour.
 * Not orange — warm terracotta clay with cream + sage accents.
 *
 * Palette (fixed; also mirrored in wedding-themes.ts so the picker
 * preview and CSS-variable consumers stay in sync):
 *   primary    #C17A56  terracotta clay
 *   accent     #8B7355  warm brown (botanical line, secondary tags)
 *   background #FAF6F0  warm cream (page)
 *   surface    #F2EBE0  soft linen (cards, vendor credits)
 *   ink        #3D2B1F  dark espresso
 *   inkMuted   #7A6355  warm grey-brown
 *   border     #E8DDD0  linen border
 *
 * Visual cues:
 *   - Hero photo overlay = terracotta @ 0.3 opacity (warm wash, not dark gradient)
 *   - Section dividers   = thin botanical SVG (stem + 2-3 leaves)
 *   - Countdown          = earthy pill badges (NOT cards)
 *   - RSVP section       = cream bg, terracotta CTA button
 *   - Vendor credits     = linen card background
 *   - Typography         = Cormorant Garamond display, Inter body
 */

const TC = {
  primary:    "#C17A56",
  accent:     "#8B7355",
  background: "#FAF6F0",
  surface:    "#F2EBE0",
  ink:        "#3D2B1F",
  inkMuted:   "#7A6355",
  border:     "#E8DDD0",
  onPrimary:  "#FAF6F0",  /* text on the terracotta CTA / band */
} as const;

export function TerracottaLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper,
    weddingDateLong, generated, party, registry, things, extraEvents,
    gallery, faqItems, storyPhoto, siteUrl,
  } = props;

  const datePill = formatLongDate(plan.weddingDate);
  const venuePill = venue?.city
    ? [venue.address, `${venue.city}, Ontario`].filter(Boolean).join(", ")
    : (venue?.address || null);

  const mapQuery =
    venue?.address
      ? `${venue.name ?? ""} ${venue.address}`.trim()
      : (venue?.name && venue?.city ? `${venue.name} ${venue.city}` : null);
  const mapHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  const rsvpHref = plan.oneqrSlug
    ? `https://oneqr.events/e/${plan.oneqrSlug}`
    : null;

  return (
    <main
      style={{
        background: TC.background,
        color:      TC.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero — full bleed photo + terracotta @ 0.3 wash ───────── */}
      <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {plan.weddingHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.weddingHeroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Warm terracotta wash — keeps the photo readable but
             * shifts the whole hero into the palette. Sat at exactly
             * 0.3 per the brief. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{ background: TC.primary, opacity: 0.3 }}
            />
            {/* Slight bottom darken for legibility of the text + pills */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 -z-10 h-1/2"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(61,43,31,0.35) 100%)",
              }}
            />
          </>
        ) : (
          /* No-photo fallback — terracotta + linen wash so the hero
           * still feels on-theme. */
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(160deg, ${TC.primary} 0%, ${TC.surface} 100%)`,
            }}
          />
        )}

        <div className="relative max-w-[860px]">
          <div
            className="text-[0.7rem] font-medium uppercase tracking-[0.36em]"
            style={{ color: "rgba(250,246,240,0.85)" }}
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
              textShadow:    "0 2px 24px rgba(61,43,31,0.35)",
            }}
          >
            {coupleLabel}
          </h1>

          {/* Earthy pill badges — date + venue */}
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {datePill && <HeroPill>{datePill}</HeroPill>}
            {venuePill && <HeroPill>{venuePill}</HeroPill>}
          </div>

          {/* Countdown as earthy pill badges (NOT card stack) */}
          {plan.weddingDate && (
            <div className="mt-10">
              <PillCountdown isoDate={plan.weddingDate} />
            </div>
          )}

          {config.rsvp && rsvpHref && (
            <div className="mt-10">
              <a
                href={rsvpHref}
                className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-3 text-xs font-bold uppercase tracking-[0.28em] transition-colors hover:bg-white/15"
                style={{ borderColor: "rgba(250,246,240,0.9)", color: TC.onPrimary }}
              >
                RSVP
              </a>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
               stroke="rgba(250,246,240,0.8)" strokeWidth="1.5"
               strokeLinecap="round" strokeLinejoin="round"
               className="tc-chev">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <style>{`
          @keyframes tcchev { 0%,100%{transform:translateY(0);opacity:0.55}50%{transform:translateY(8px);opacity:1} }
          .tc-chev { animation: tcchev 2.2s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .tc-chev { animation: none } }
        `}</style>
      </section>

      {/* ── Welcome band — terracotta ─────────────────────────────── */}
      <ScrollFadeIn>
        <section className="px-6 py-20 text-center lg:py-24"
                 style={{ background: TC.primary, color: TC.onPrimary }}>
          <div className="mx-auto max-w-[820px]">
            <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
                 style={{ color: "rgba(250,246,240,0.85)" }}>
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
               style={{ color: "rgba(250,246,240,0.95)" }}>
              {generated?.heroTagline ||
                `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
            </p>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Ceremony + Reception event cards ────────────────────── */}
      <ScrollFadeIn>
        <section className="px-6 py-20 lg:py-24">
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

          {extraEvents.length > 0 && (
            <ul className="mx-auto mt-10 grid max-w-[1080px] gap-4 sm:grid-cols-2">
              {extraEvents.map((ev) => (
                <li key={ev.id}
                    className="rounded-sm border p-6"
                    style={{ borderColor: TC.border, background: TC.surface }}>
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.28em]"
                       style={{ color: TC.primary }}>
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
        </section>
      </ScrollFadeIn>

      <Botanical />

      {/* ── RSVP — cream bg, terracotta CTA ───────────────────────── */}
      {config.rsvp && (
        <ScrollFadeIn>
          <section className="px-6 py-20 text-center lg:py-24"
                   style={{ background: TC.background }}>
            <div className="mx-auto max-w-[680px]">
              <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
                   style={{ color: TC.primary }}>
                Please Reply
              </div>
              <h2 className="mt-3 text-[clamp(2rem,5.5vw,3rem)] leading-tight"
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                    fontStyle:  "italic",
                    color:      TC.ink,
                  }}>
                Let us know you&rsquo;re coming
              </h2>
              <p className="mt-5 text-[1.05rem] leading-[1.85]"
                 style={{ color: TC.inkMuted }}>
                {rsvpHref
                  ? "We can&rsquo;t wait to celebrate with you. Click below to confirm your seat at the table."
                  : "RSVPs open six weeks before the wedding — you'll find a link here when they do."}
              </p>
              {rsvpHref && (
                <a href={rsvpHref}
                   className="mt-8 inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-xs font-bold uppercase tracking-[0.28em] transition-opacity hover:opacity-90"
                   style={{ background: TC.primary, color: TC.onPrimary }}>
                  RSVP →
                </a>
              )}
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Our Story — asymmetric editorial ──────────────────────── */}
      {config.ourStory && plan.ourStory && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <section style={{ background: TC.surface }} className="py-20 lg:py-24">
              <div className="mx-auto grid max-w-[1180px] gap-10 px-6 lg:grid-cols-[55fr_45fr] lg:gap-16">
                <div className="lg:order-1 lg:py-6">
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.36em]"
                       style={{ color: TC.primary }}>
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
                        color:      TC.primary,
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
                      style={{ background: TC.background, border: `1px solid ${TC.border}` }}
                    >
                      <BotanicalSpray tint={TC.accent} large />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Travel ─────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <section className="px-6 py-20 text-center lg:py-24"
                     style={{ background: TC.background }}>
              <div className="mx-auto max-w-[820px]">
                <BotanicalSpray tint={TC.accent} />
                <div className="mt-7 text-[0.72rem] font-medium uppercase tracking-[0.36em]"
                     style={{ color: TC.primary }}>
                  Plan Your Trip
                </div>
                <h2 className="mt-3 text-[clamp(2.2rem,6vw,3.3rem)] leading-tight"
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                      fontStyle:  "italic",
                      color:      TC.ink,
                    }}>
                  Travel &amp; Accommodation
                </h2>
                <p className="mt-7 whitespace-pre-line text-[1.02rem] leading-[1.85]"
                   style={{ color: TC.inkMuted }}>
                  {plan.travelCopy}
                </p>
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Wedding party ─────────────────────────────────────── */}
      {config.weddingParty && party.length > 0 && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.surface}>
              <SectionHead eyebrow="Standing With Us" title="Wedding Party" tint={TC.primary} ink={TC.ink} />
              <ul className="mx-auto mt-12 grid max-w-[1080px] gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m) => (
                  <li key={m.id} className="text-center">
                    <div
                      className="mx-auto h-32 w-32 overflow-hidden rounded-full border-2 transition-transform hover:scale-[1.04] sm:h-36 sm:w-36"
                      style={{ borderColor: TC.primary, background: TC.background }}
                    >
                      <div className="flex h-full w-full items-center justify-center"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontStyle:  "italic",
                             color:      TC.primary,
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
                         style={{ color: TC.primary }}>
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
        </>
      )}

      {/* ── Gallery ───────────────────────────────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.background}>
              <SectionHead eyebrow="Memories" title="Our Photos" tint={TC.primary} ink={TC.ink} />
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
        </>
      )}

      {/* ── Dress code ────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.surface}>
              <SectionHead eyebrow="What to Wear" title="Dress Code" tint={TC.primary} ink={TC.ink} />
              <div className="mx-auto mt-10 max-w-[640px] text-center">
                {plan.dressCodeStyle && (
                  <div className="inline-block rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.24em]"
                       style={{ background: TC.primary, color: TC.onPrimary }}>
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
        </>
      )}

      {/* ── Things to do ──────────────────────────────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.background}>
              <SectionHead eyebrow="While You're Here" title="Things to Do Nearby" tint={TC.primary} ink={TC.ink} />
              <ol className="mx-auto mt-10 max-w-[800px] space-y-5">
                {things.map((t, i) => (
                  <li key={t.id}
                      className="flex gap-5 rounded-sm border p-6"
                      style={{ background: TC.surface, borderColor: TC.border }}>
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                         style={{
                           background: TC.primary,
                           color:      TC.onPrimary,
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
                           style={{ color: TC.primary }}>
                          Visit website ↗
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Registry ──────────────────────────────────────────── */}
      {config.registry && registry.length > 0 && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.surface}>
              <SectionHead eyebrow="With Our Thanks" title="Registry" tint={TC.primary} ink={TC.ink} />
              <div className="mx-auto mt-10 flex max-w-[680px] flex-wrap justify-center gap-3">
                {registry.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener"
                     className="rounded-full border-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:opacity-80"
                     style={{ borderColor: TC.primary, color: TC.primary }}>
                    {r.label || "Registry"} ↗
                  </a>
                ))}
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── FAQ ───────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.background}>
              <SectionHead eyebrow="Good to Know" title="Frequently Asked" tint={TC.primary} ink={TC.ink} />
              <ul className="mx-auto mt-10 max-w-[720px] space-y-4">
                {faqItems.map((f) => (
                  <li key={f.id}
                      className="rounded-sm border p-6"
                      style={{ background: TC.surface, borderColor: TC.border }}>
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
        </>
      )}

      {/* ── Vendor credits — linen card background ──────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <>
          <Botanical />
          <ScrollFadeIn>
            <Section bg={TC.background}>
              <SectionHead eyebrow="The Team Behind the Day" title="Our Venue &amp; Vendors" tint={TC.primary} ink={TC.ink} />
              <div className="mx-auto mt-10 max-w-[920px] space-y-4">
                {venue?.name && (
                  <div className="rounded-sm border p-6"
                       style={{ borderColor: TC.border, background: TC.surface }}>
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em]"
                         style={{ color: TC.primary }}>
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
                           style={{ borderColor: TC.primary, color: TC.primary }}>
                          View profile →
                        </a>
                      )}
                      {venue.website && (
                        <a href={venue.website} target="_blank" rel="noopener"
                           className="rounded-full border px-4 py-1.5 font-medium uppercase tracking-[0.18em]"
                           style={{ borderColor: TC.border, color: TC.ink }}>
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
                          style={{ borderColor: TC.border, background: TC.surface }}>
                        <div className="text-[0.6rem] font-bold uppercase tracking-[0.28em]"
                             style={{ color: TC.primary }}>
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
        </>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <Botanical />
      <footer className="px-6 py-14 text-center" style={{ background: TC.surface }}>
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
        <div aria-hidden className="mx-auto my-6 h-px w-16" style={{ background: TC.primary, opacity: 0.5 }} />
        {plan.weddingHashtag && (
          <div className="text-[0.75rem] font-bold uppercase tracking-[0.32em]"
               style={{ color: TC.primary }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: TC.inkMuted }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: TC.primary }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-5 py-2 text-[0.72rem] font-medium uppercase tracking-[0.18em]"
      style={{
        borderColor: "rgba(250,246,240,0.5)",
        color:       "#FAF6F0",
        background:  "rgba(61,43,31,0.22)",
        backdropFilter: "blur(4px)",
      }}
    >
      {children}
    </span>
  );
}

/* Earthy pill countdown — days / hours / minutes each in their own
 * outlined cream pill. NOT cards (per the brief). Server-rendered with
 * Date.now() at render — refresh-on-mount happens via the
 * CountdownTimer pattern; for the layout's purposes the SSR snapshot
 * is good enough since couples typically reload to check. */
function PillCountdown({ isoDate }: { isoDate: string }) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff <= 0) {
    return (
      <div className="text-[0.7rem] uppercase tracking-[0.3em]"
           style={{ color: "rgba(250,246,240,0.85)" }}>
        Already celebrated · check the gallery
      </div>
    );
  }
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <CountdownPill value={days}    label="days" />
      <CountdownPill value={hours}   label="hrs"  />
      <CountdownPill value={minutes} label="min"  />
    </div>
  );
}

function CountdownPill({ value, label }: { value: number; label: string }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium"
      style={{
        borderColor: "rgba(250,246,240,0.55)",
        color:       "#FAF6F0",
        background:  "rgba(61,43,31,0.22)",
        backdropFilter: "blur(4px)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span className="text-base font-bold leading-none">{value}</span>
      <span className="text-[0.65rem] uppercase tracking-[0.18em] opacity-85">
        {label}
      </span>
    </span>
  );
}

/* Thin botanical SVG divider — stem with three small leaves either
 * side of a centre point. Pure SVG, no external assets. Used between
 * every major section. */
function Botanical() {
  return (
    <div className="flex justify-center py-10" aria-hidden>
      <svg viewBox="0 0 220 28" width="220" height="28"
           fill="none" stroke={TC.accent}
           strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Centre stem (horizontal) */}
        <line x1="20" y1="14" x2="200" y2="14" />
        {/* Centre dot */}
        <circle cx="110" cy="14" r="2" fill={TC.accent} />
        {/* Three leaves left of centre */}
        <path d="M88 14 Q82 9 76 13 Q82 16 88 14" />
        <path d="M70 14 Q64 9 58 13 Q64 16 70 14" />
        <path d="M52 14 Q46 9 40 13 Q46 16 52 14" />
        {/* Three leaves right of centre (mirror) */}
        <path d="M132 14 Q138 9 144 13 Q138 16 132 14" />
        <path d="M150 14 Q156 9 162 13 Q156 16 150 14" />
        <path d="M168 14 Q174 9 180 13 Q174 16 168 14" />
      </svg>
    </div>
  );
}

/* Small botanical spray used in section headers / placeholders. */
function BotanicalSpray({ tint, large = false }: { tint: string; large?: boolean }) {
  const size = large ? 120 : 80;
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="none"
      stroke={tint}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto"
      aria-hidden
    >
      {/* Central stem */}
      <path d="M40 70 Q40 50 40 22" />
      {/* Centre flower */}
      <circle cx="40" cy="16" r="3.5" fill={tint} fillOpacity="0.18" />
      <circle cx="40" cy="16" r="2" fill={tint} />
      {/* Side leaves */}
      <path d="M40 56 Q30 48 22 50 Q28 56 40 56" />
      <path d="M40 56 Q50 48 58 50 Q52 56 40 56" />
      <path d="M40 44 Q32 38 26 40 Q31 45 40 44" />
      <path d="M40 44 Q48 38 54 40 Q49 45 40 44" />
      <path d="M40 32 Q34 27 30 28 Q33 32 40 32" />
      <path d="M40 32 Q46 27 50 28 Q47 32 40 32" />
    </svg>
  );
}

function Section({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <section style={{ background: bg }} className="px-6 py-20 lg:py-24">
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
         style={{ background: TC.surface, borderColor: TC.border }}>
      <div className="text-[0.72rem] font-medium uppercase tracking-[0.36em]"
           style={{ color: TC.primary }}>
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
           style={{ color: TC.primary }}>
          View on map →
        </a>
      )}
    </div>
  );
}

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
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
