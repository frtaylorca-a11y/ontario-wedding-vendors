import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Frosted Glass layout ────────────────────────────────────────────
 * Dark, moody, cinematic. Deep navy-black reception halls, candlelight,
 * champagne. Frosted-glass overlays as the recurring motif — panels,
 * countdown cards, vendor credit cards all use the same
 * `rgba(255,255,255,0.08)` fill + `blur(12px)` treatment. Gold as the
 * only warm accent, used sparingly against the cool navy surfaces.
 *
 * Premium-only — gated in src/app/weddings/[slug]/page.tsx behind
 * `plan.tier === "premium"`. Free couples on `frosted` fall through to
 * the default themed layout (colour-only frosted tokens).
 *
 * Palette (fixed; mirrored in wedding-themes.ts → FROSTED):
 *   primary    #4A5568  slate blue-grey (secondary accents, borders)
 *   accent     #C9A96E  OWV gold (CTA fill, highlighted text, dividers)
 *   background #1A1F2E  deep navy-black (odd sections, hero fallback)
 *   surface    #242938  slightly lighter navy (even sections, cards)
 *   ink        #F0F4F8  cool near-white (body copy, headings)
 *   inkMuted   #94A3B8  muted slate (secondary text)
 *   border     #2D3548  subtle dark divider
 */
const FG = {
  primary:    "#4A5568",
  accent:     "#C9A96E",
  background: "#1A1F2E",
  surface:    "#242938",
  ink:        "#F0F4F8",
  inkMuted:   "#94A3B8",
  border:     "#2D3548",
  onAccent:   "#1A1F2E",  /* text on the gold CTA */
} as const;

/* Central definition of the frosted-glass surface treatment. Applied
 * to the hero panel, countdown cards, and vendor credit cards so the
 * motif reads as intentional design language, not decoration. */
const GLASS = {
  background:           "rgba(255,255,255,0.08)",
  border:               "1px solid rgba(255,255,255,0.12)",
  backdropFilter:       "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
} as const;

export function FrostedGlassLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper,
    weddingDateLong, generated, party, registry, things, extraEvents,
    gallery, faqItems, storyPhoto, siteUrl,
  } = props;

  const datePill  = formatLongDate(plan.weddingDate);
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
        background: FG.background,
        color:      FG.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero — full bleed dark + frosted glass panel ────────────── */}
      <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
        {plan.weddingHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.weddingHeroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Deep navy wash — pulls the photo into the palette without
             * blowing out the frosted glass panel on top of it. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{ background: FG.background, opacity: 0.72 }}
            />
            {/* Radial vignette to focus on the centre panel */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 90%)",
              }}
            />
          </>
        ) : (
          /* No hero image — deep navy → surface gradient with a faint
           * gold radial. Keeps the frosted panel legible when there's
           * no photograph to sit on. */
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(circle at 20% 20%, rgba(201,169,110,0.10) 0%, ${FG.background} 55%), linear-gradient(180deg, ${FG.background} 0%, ${FG.surface} 100%)`,
            }}
          />
        )}

        <div
          className="relative mx-auto w-full max-w-[720px] rounded-sm px-8 py-14 text-center sm:px-14 sm:py-16"
          style={{
            background:           GLASS.background,
            border:               GLASS.border,
            backdropFilter:       GLASS.backdropFilter,
            WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
            boxShadow:            "0 30px 80px -30px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="text-[0.7rem] font-medium uppercase tracking-[0.42em]"
            style={{ color: FG.accent }}
          >
            The Wedding Of
          </div>

          <h1
            className="mt-6 text-[clamp(2.4rem,8.5vw,5rem)] leading-[1.02]"
            style={{
              fontFamily:    "var(--font-display), 'Cormorant Garamond', Georgia, serif",
              fontStyle:     "italic",
              letterSpacing: "0.01em",
              color:         FG.ink,
            }}
          >
            {coupleLabel}
          </h1>

          {/* Thin gold divider — the only warm mark in the hero */}
          <div
            aria-hidden
            className="mx-auto mt-8 h-px w-20"
            style={{ background: FG.accent, opacity: 0.85 }}
          />

          {(datePill || venuePill) && (
            <div className="mt-8 space-y-2 text-[0.8rem] font-medium uppercase tracking-[0.28em]"
                 style={{ color: FG.inkMuted }}>
              {datePill && <div>{datePill}</div>}
              {venuePill && <div>{venuePill}</div>}
            </div>
          )}

          {plan.weddingDate && (
            <div className="mt-10">
              <GlassCountdown isoDate={plan.weddingDate} />
            </div>
          )}

          {config.rsvp && rsvpHref && (
            <div className="mt-10">
              <a
                href={rsvpHref}
                className="inline-flex items-center gap-2 rounded-sm px-9 py-3.5 text-xs font-bold uppercase tracking-[0.28em] transition-opacity hover:opacity-90"
                style={{ background: FG.accent, color: FG.onAccent }}
              >
                RSVP
              </a>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
               stroke={FG.accent} strokeWidth="1.5"
               strokeLinecap="round" strokeLinejoin="round"
               className="fg-chev" style={{ opacity: 0.75 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <style>{`
          @keyframes fgchev { 0%,100%{transform:translateY(0);opacity:0.55}50%{transform:translateY(8px);opacity:1} }
          .fg-chev { animation: fgchev 2.2s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .fg-chev { animation: none } }
        `}</style>
      </section>

      {/* ── Welcome band — surface (lighter dark) ─────────────────── */}
      <ScrollFadeIn>
        <Section bg={FG.surface}>
          <div className="mx-auto max-w-[820px] text-center">
            <Eyebrow>You&rsquo;re Invited</Eyebrow>
            <SectionTitle>The Wedding Weekend</SectionTitle>
            <p className="mt-7 text-[1.05rem] leading-[1.85] sm:text-[1.15rem]"
               style={{ color: FG.inkMuted }}>
              {generated?.heroTagline ||
                `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
            </p>
          </div>
        </Section>
      </ScrollFadeIn>

      <GoldDivider />

      {/* ── Ceremony + Reception event cards ────────────────────── */}
      <ScrollFadeIn>
        <Section bg={FG.background}>
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
                    style={{ borderColor: FG.border, background: FG.surface }}>
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                       style={{ color: FG.accent }}>
                    {ev.name}
                  </div>
                  <div className="mt-2 text-base" style={{ color: FG.ink }}>
                    {[ev.date, ev.time].filter(Boolean).join(" · ")}
                  </div>
                  {ev.location && (
                    <div className="mt-1 text-sm" style={{ color: FG.inkMuted }}>
                      {ev.location}
                    </div>
                  )}
                  {ev.description && (
                    <p className="mt-3 text-[0.95rem] leading-[1.8]" style={{ color: FG.inkMuted }}>
                      {ev.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </ScrollFadeIn>

      {/* ── RSVP — dark surface, gold CTA ──────────────────────── */}
      {config.rsvp && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.surface}>
              <div className="mx-auto max-w-[680px] text-center">
                <Eyebrow>Please Reply</Eyebrow>
                <SectionTitle>Let us know you&rsquo;re coming</SectionTitle>
                <p className="mt-5 text-[1.05rem] leading-[1.85]"
                   style={{ color: FG.inkMuted }}>
                  {rsvpHref
                    ? "We can’t wait to celebrate with you. Click below to confirm your seat at the table."
                    : "RSVPs open six weeks before the wedding — you’ll find a link here when they do."}
                </p>
                {rsvpHref && (
                  <a href={rsvpHref}
                     className="mt-8 inline-flex items-center gap-2 rounded-sm px-9 py-3.5 text-xs font-bold uppercase tracking-[0.28em] transition-opacity hover:opacity-90"
                     style={{ background: FG.accent, color: FG.onAccent }}>
                    RSVP →
                  </a>
                )}
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Our Story ──────────────────────────────────────────── */}
      {config.ourStory && plan.ourStory && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.background}>
              <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[55fr_45fr] lg:gap-16">
                <div className="lg:order-1 lg:py-6">
                  <Eyebrow>Chapter One</Eyebrow>
                  <SectionTitle align="left">Our Love Story</SectionTitle>
                  <div className="relative mt-8">
                    <span
                      aria-hidden
                      className="absolute -left-1 -top-7 select-none leading-none"
                      style={{
                        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                        color:      FG.accent,
                        opacity:    0.6,
                        fontSize:   "5rem",
                      }}
                    >
                      &ldquo;
                    </span>
                    <p
                      className="text-[1.05rem] leading-[1.85] sm:text-[1.1rem]"
                      style={{ color: FG.inkMuted, whiteSpace: "pre-line" }}
                    >
                      {plan.ourStory}
                    </p>
                  </div>
                </div>
                <div className="lg:order-2">
                  {storyPhoto ? (
                    <div className="overflow-hidden rounded-sm shadow-lg"
                         style={{ border: `1px solid ${FG.border}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={storyPhoto} alt=""
                           className="h-full w-full object-cover"
                           style={{ aspectRatio: "4 / 5" }}
                           loading="lazy" />
                    </div>
                  ) : (
                    <div
                      className="flex aspect-[4/5] items-center justify-center rounded-sm"
                      style={{
                        background:           GLASS.background,
                        border:               GLASS.border,
                        backdropFilter:       GLASS.backdropFilter,
                        WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
                      }}
                    >
                      <RingsGlyph tint={FG.accent} large />
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Travel ─────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.surface}>
              <div className="mx-auto max-w-[820px] text-center">
                <Eyebrow>Plan Your Trip</Eyebrow>
                <SectionTitle>Travel &amp; Accommodation</SectionTitle>
                <p className="mt-7 whitespace-pre-line text-[1.02rem] leading-[1.85]"
                   style={{ color: FG.inkMuted }}>
                  {plan.travelCopy}
                </p>
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Wedding party ─────────────────────────────────────── */}
      {config.weddingParty && party.length > 0 && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.background}>
              <div className="text-center">
                <Eyebrow>Standing With Us</Eyebrow>
                <SectionTitle>Wedding Party</SectionTitle>
              </div>
              <ul className="mx-auto mt-12 grid max-w-[1080px] gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m) => (
                  <li key={m.id} className="text-center">
                    <div
                      className="mx-auto h-32 w-32 overflow-hidden rounded-full border-2 transition-transform hover:scale-[1.04] sm:h-36 sm:w-36"
                      style={{ borderColor: FG.accent, background: FG.surface }}
                    >
                      <div className="flex h-full w-full items-center justify-center"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontStyle:  "italic",
                             color:      FG.accent,
                             fontSize:   "2.5rem",
                           }}>
                        {initials(m.name)}
                      </div>
                    </div>
                    <div className="mt-4 text-xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontStyle:  "italic",
                           color:      FG.ink,
                         }}>
                      {m.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.32em]"
                         style={{ color: FG.accent }}>
                      {m.role}
                    </div>
                    {m.bio && (
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: FG.inkMuted }}>
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
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.surface}>
              <div className="text-center">
                <Eyebrow>Memories</Eyebrow>
                <SectionTitle>Our Photos</SectionTitle>
              </div>
              <div className="mt-10 grid gap-1 grid-cols-2 sm:grid-cols-3">
                {gallery.filter(Boolean).map((url, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={url} alt=""
                       className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                       loading="lazy"
                       style={{ filter: "brightness(0.94)" }} />
                ))}
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Dress code ────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.background}>
              <div className="text-center">
                <Eyebrow>What to Wear</Eyebrow>
                <SectionTitle>Dress Code</SectionTitle>
              </div>
              <div className="mx-auto mt-10 max-w-[640px] text-center">
                {plan.dressCodeStyle && (
                  <div className="inline-block rounded-sm px-6 py-2 text-sm font-bold uppercase tracking-[0.28em]"
                       style={{ background: FG.accent, color: FG.onAccent }}>
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-5 text-[1.05rem] leading-[1.85]" style={{ color: FG.inkMuted }}>
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
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.surface}>
              <div className="text-center">
                <Eyebrow>While You&rsquo;re Here</Eyebrow>
                <SectionTitle>Things to Do Nearby</SectionTitle>
              </div>
              <ol className="mx-auto mt-10 max-w-[800px] space-y-5">
                {things.map((t, i) => (
                  <li key={t.id}
                      className="flex gap-5 rounded-sm border p-6"
                      style={{ background: FG.background, borderColor: FG.border }}>
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                         style={{
                           background: FG.accent,
                           color:      FG.onAccent,
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
                             color:      FG.ink,
                           }}>
                        {t.name}
                      </div>
                      <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: FG.inkMuted }}>
                        {t.description}
                      </p>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener"
                           className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.28em]"
                           style={{ color: FG.accent }}>
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
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.background}>
              <div className="text-center">
                <Eyebrow>With Our Thanks</Eyebrow>
                <SectionTitle>Registry</SectionTitle>
              </div>
              <div className="mx-auto mt-10 flex max-w-[680px] flex-wrap justify-center gap-3">
                {registry.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener"
                     className="rounded-sm border-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:bg-white/5"
                     style={{ borderColor: FG.accent, color: FG.accent }}>
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
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.surface}>
              <div className="text-center">
                <Eyebrow>Good to Know</Eyebrow>
                <SectionTitle>Frequently Asked</SectionTitle>
              </div>
              <ul className="mx-auto mt-10 max-w-[720px] space-y-4">
                {faqItems.map((f) => (
                  <li key={f.id}
                      className="rounded-sm border p-6"
                      style={{ background: FG.background, borderColor: FG.border }}>
                    <div className="text-lg font-bold" style={{ color: FG.ink }}>
                      {f.question}
                    </div>
                    <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: FG.inkMuted }}>
                      {f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Vendor credits — glass-morphism cards ──────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <>
          <GoldDivider />
          <ScrollFadeIn>
            <Section bg={FG.background}>
              <div className="text-center">
                <Eyebrow>The Team Behind the Day</Eyebrow>
                <SectionTitle>Our Venue &amp; Vendors</SectionTitle>
              </div>
              <div className="mx-auto mt-10 max-w-[920px] space-y-4">
                {venue?.name && (
                  <div className="rounded-sm p-6"
                       style={{
                         background:           GLASS.background,
                         border:               GLASS.border,
                         backdropFilter:       GLASS.backdropFilter,
                         WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
                       }}>
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.32em]"
                         style={{ color: FG.accent }}>
                      Venue
                    </div>
                    <div className="mt-2 text-3xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontStyle:  "italic",
                           color:      FG.ink,
                         }}>
                      {venue.name}
                    </div>
                    {venue.city && (
                      <div className="mt-0.5 text-sm" style={{ color: FG.inkMuted }}>
                        {venue.city}, Ontario
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                      {venue.slug && (
                        <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                           className="rounded-sm border-2 px-4 py-1.5 font-bold uppercase tracking-[0.18em]"
                           style={{ borderColor: FG.accent, color: FG.accent }}>
                          View profile →
                        </a>
                      )}
                      {venue.website && (
                        <a href={venue.website} target="_blank" rel="noopener"
                           className="rounded-sm border px-4 py-1.5 font-medium uppercase tracking-[0.18em]"
                           style={{ borderColor: FG.border, color: FG.inkMuted }}>
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
                          className="rounded-sm p-5"
                          style={{
                            background:           GLASS.background,
                            border:               GLASS.border,
                            backdropFilter:       GLASS.backdropFilter,
                            WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
                          }}>
                        <div className="text-[0.6rem] font-bold uppercase tracking-[0.32em]"
                             style={{ color: FG.accent }}>
                          {prettyCategory(c.category)}
                        </div>
                        <div className="mt-1.5 text-lg"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               fontStyle:  "italic",
                               color:      FG.ink,
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
      <GoldDivider />
      <footer className="px-6 py-14 text-center" style={{ background: FG.surface }}>
        <div className="text-3xl sm:text-4xl"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               fontStyle:  "italic",
               color:      FG.ink,
             }}>
          {coupleLabel}
        </div>
        {weddingDateUpper && (
          <div className="mt-2 text-[0.75rem] uppercase tracking-[0.32em]"
               style={{ color: FG.inkMuted }}>
            {weddingDateUpper}
          </div>
        )}
        <div aria-hidden className="mx-auto my-6 h-px w-16" style={{ background: FG.accent, opacity: 0.75 }} />
        {plan.weddingHashtag && (
          <div className="text-[0.75rem] font-bold uppercase tracking-[0.32em]"
               style={{ color: FG.accent }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: FG.inkMuted }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: FG.accent }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

/* Countdown as frosted-glass cards — echoes the hero panel treatment.
 * Server-rendered snapshot (same pattern as TerracottaLayout's
 * PillCountdown); couples refresh to update. */
function GlassCountdown({ isoDate }: { isoDate: string }) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff <= 0) {
    return (
      <div className="text-[0.7rem] uppercase tracking-[0.3em]"
           style={{ color: FG.inkMuted }}>
        Already celebrated · check the gallery
      </div>
    );
  }
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <GlassCountdownCard value={days}    label="days" />
      <GlassCountdownCard value={hours}   label="hrs"  />
      <GlassCountdownCard value={minutes} label="min"  />
    </div>
  );
}

function GlassCountdownCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="flex min-w-[72px] flex-col items-center rounded-sm px-4 py-3"
      style={{
        background:           GLASS.background,
        border:               GLASS.border,
        backdropFilter:       GLASS.backdropFilter,
        WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
      }}
    >
      <span className="text-2xl font-bold leading-none tabular-nums"
            style={{ color: FG.ink }}>
        {value}
      </span>
      <span className="mt-1.5 text-[0.6rem] uppercase tracking-[0.24em]"
            style={{ color: FG.inkMuted }}>
        {label}
      </span>
    </div>
  );
}

/* Thin gold divider — the only warm mark separating sections. Sits
 * flush against the section boundary rather than floating between,
 * so the alternating navy → surface stripe reads unbroken from the
 * hero to the footer. */
function GoldDivider() {
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <div className="h-px w-24" style={{ background: FG.accent, opacity: 0.55 }} />
    </div>
  );
}

/* Two interlocking rings — reused in the story photo placeholder and
 * anywhere else we want a wedding-themed decorative mark. Kept out
 * of the hero to keep that panel typography-forward. */
function RingsGlyph({ tint, large = false }: { tint: string; large?: boolean }) {
  const size = large ? 96 : 56;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke={tint}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ opacity: 0.7 }}
    >
      <circle cx="18" cy="28" r="10" />
      <circle cx="30" cy="28" r="10" />
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
         style={{ color: FG.accent }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, align = "center" }: {
  children: React.ReactNode; align?: "center" | "left";
}) {
  return (
    <h2
      className={`mt-4 text-[clamp(2.1rem,6vw,3.3rem)] leading-tight ${align === "center" ? "text-center" : "text-left"}`}
      style={{
        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
        fontStyle:  "italic",
        color:      FG.ink,
      }}
    >
      {children}
    </h2>
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
    <div className="rounded-sm p-7 sm:p-8 lg:p-10"
         style={{
           background:           GLASS.background,
           border:               GLASS.border,
           backdropFilter:       GLASS.backdropFilter,
           WebkitBackdropFilter: GLASS.WebkitBackdropFilter,
         }}>
      <div className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
           style={{ color: FG.accent }}>
        {eyebrow}
      </div>
      <h3 className="mt-3 text-3xl leading-tight sm:text-4xl"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontStyle:  "italic",
            color:      FG.ink,
          }}>
        {title}
      </h3>
      {meta && (
        <div className="mt-3 text-[0.95rem]" style={{ color: FG.inkMuted }}>
          {meta}
        </div>
      )}
      {address && (
        <div className="mt-1 text-[0.95rem] leading-[1.7]" style={{ color: FG.inkMuted }}>
          {address}
        </div>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noopener"
           className="mt-5 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.28em]"
           style={{ color: FG.accent }}>
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
