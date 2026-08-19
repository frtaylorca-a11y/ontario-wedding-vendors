import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Editorial layout ────────────────────────────────────────────────
 * Bold, graphic, architectural — Vogue wedding spread. Strong
 * Cormorant Garamond at 700 weight, magazine-style left-aligned
 * headers, asymmetric photo grids, generous whitespace. Rose is the
 * single accent against a monochrome black-and-white palette.
 *
 * Not romantic. Intentional. Reads like a print editorial layout on
 * screen: the photo carries the emotion, the type carries the voice.
 *
 * Palette (fixed; mirrored in wedding-themes.ts → EDITORIAL):
 *   primary    #1A1A1A  near-black (hero panel, headings, borders)
 *   accent     #B96476  OWV rose (CTA, chapter numbers, small marks)
 *   background #FAFAFA  near-white (page)
 *   surface    #F0F0F0  light grey (alt sections, event cards)
 *   ink        #1A1A1A  near-black (body copy, headings)
 *   inkMuted   #6B6B6B  mid grey (secondary text)
 *   border     #E0E0E0  hairline border (dividers, list rules)
 */
const ED = {
  primary:    "#1A1A1A",
  accent:     "#B96476",
  background: "#FAFAFA",
  surface:    "#F0F0F0",
  ink:        "#1A1A1A",
  inkMuted:   "#6B6B6B",
  border:     "#E0E0E0",
  onAccent:   "#FAFAFA",
} as const;

export function EditorialLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper,
    weddingDateLong, generated, party, registry, things, extraEvents,
    gallery, faqItems, storyPhoto, siteUrl,
  } = props;

  const datePillUpper = weddingDateUpper ?? formatUpperDate(plan.weddingDate);

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
        background: ED.background,
        color:      ED.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero — 50/50 split: photo left, black panel right ────── */}
      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left half — full-bleed photo (or fallback graphic) */}
        <div className="relative overflow-hidden">
          {plan.weddingHeroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plan.weddingHeroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Subtle black desaturation wash — pulls the photo
               * into the monochrome palette without killing colour. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "rgba(26,26,26,0.06)" }}
              />
            </>
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: `linear-gradient(160deg, ${ED.surface} 0%, ${ED.border} 100%)` }}
            />
          )}
          {/* Chapter number in the corner — magazine tell */}
          <div className="absolute left-8 top-8 text-[0.7rem] font-medium uppercase tracking-[0.42em]"
               style={{ color: ED.onAccent, mixBlendMode: "difference" }}>
            Vol. I · Issue 01
          </div>
        </div>

        {/* Right half — dark panel with names + date */}
        <div
          className="relative flex flex-col justify-center px-8 py-24 sm:px-14 lg:px-20 lg:py-16"
          style={{ background: ED.primary, color: ED.background }}
        >
          <div className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
               style={{ color: ED.accent }}>
            The Wedding Of
          </div>

          <h1
            className="mt-6 text-[clamp(3rem,9vw,6rem)]"
            style={{
              fontFamily:    "var(--font-display), 'Cormorant Garamond', Georgia, serif",
              fontWeight:    700,
              lineHeight:    0.95,
              letterSpacing: "-0.02em",
              color:         ED.background,
            }}
          >
            {coupleLabel}
          </h1>

          {/* Rose accent hairline */}
          <div aria-hidden className="mt-10 h-[2px] w-16"
               style={{ background: ED.accent }} />

          {datePillUpper && (
            <div className="mt-10 text-[0.85rem] font-medium uppercase tracking-[0.5em]"
                 style={{ color: ED.background }}>
              {datePillUpper}
            </div>
          )}

          {venue?.city && (
            <div className="mt-3 text-[0.75rem] uppercase tracking-[0.42em]"
                 style={{ color: "rgba(250,250,250,0.6)" }}>
              {venue.city}, Ontario
            </div>
          )}

          {plan.weddingDate && (
            <div className="mt-12">
              <MinimalCountdown isoDate={plan.weddingDate} />
            </div>
          )}

          {config.rsvp && rsvpHref && (
            <div className="mt-12">
              <a
                href={rsvpHref}
                className="inline-flex items-center gap-3 border-2 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.32em] transition-colors hover:bg-white/10"
                style={{ borderColor: ED.accent, color: ED.background }}
              >
                <span>RSVP</span>
                <span style={{ color: ED.accent }}>→</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Welcome — huge left-aligned type on light bg ────────── */}
      <ScrollFadeIn>
        <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                 style={{ background: ED.background, borderColor: ED.border }}>
          <div className="mx-auto max-w-[1180px]">
            <ChapterMark n="I" label="Welcome" />
            <h2 className="mt-8 text-[clamp(2.6rem,7vw,5rem)] leading-[0.98]"
                style={{
                  fontFamily:    "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                  fontWeight:    700,
                  color:         ED.ink,
                  letterSpacing: "-0.01em",
                }}>
              The Wedding<br/>Weekend.
            </h2>
            <p className="mt-10 max-w-[640px] text-[1.1rem] leading-[1.75] sm:text-[1.2rem]"
               style={{ color: ED.inkMuted }}>
              {generated?.heroTagline ||
                `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
            </p>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── Ceremony + Reception — asymmetric two-column layout ── */}
      <ScrollFadeIn>
        <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                 style={{ background: ED.surface, borderColor: ED.border }}>
          <div className="mx-auto max-w-[1180px]">
            <ChapterMark n="II" label="The Day" />
            <SectionHeading>Ceremony <em style={{ color: ED.accent, fontStyle: "normal" }}>&amp;</em> Reception</SectionHeading>
            <div className="mt-14 grid gap-x-16 gap-y-10 lg:grid-cols-[45fr_55fr]">
              <EventBlock
                index="01"
                eyebrow="The Ceremony"
                title={venue?.name ?? "The Ceremony"}
                meta={weddingDateLong}
                address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
                mapHref={mapHref}
              />
              <EventBlock
                index="02"
                eyebrow="The Reception"
                title={venue?.name ?? "The Reception"}
                meta="Dinner & dancing to follow"
                address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
                mapHref={mapHref}
              />
            </div>

            {extraEvents.length > 0 && (
              <ul className="mt-16 grid gap-x-16 gap-y-12 lg:grid-cols-2">
                {extraEvents.map((ev, i) => (
                  <li key={ev.id} className="border-t pt-8"
                      style={{ borderColor: ED.ink }}>
                    <div className="flex items-baseline gap-6">
                      <span className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                            style={{ color: ED.accent }}>
                        {String(i + 3).padStart(2, "0")}
                      </span>
                      <span className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                            style={{ color: ED.ink }}>
                        {ev.name}
                      </span>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontWeight: 700,
                           color:      ED.ink,
                         }}>
                      {[ev.date, ev.time].filter(Boolean).join(" · ") || ev.name}
                    </div>
                    {ev.location && (
                      <div className="mt-2 text-sm" style={{ color: ED.inkMuted }}>
                        {ev.location}
                      </div>
                    )}
                    {ev.description && (
                      <p className="mt-4 text-[1rem] leading-[1.75]" style={{ color: ED.inkMuted }}>
                        {ev.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </ScrollFadeIn>

      {/* ── RSVP — stark white, black border input feel, rose CTA ─ */}
      {config.rsvp && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.background, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[45fr_55fr] lg:gap-16">
              <div>
                <ChapterMark n="III" label="Please Reply" />
                <SectionHeading>Let us know.</SectionHeading>
              </div>
              <div className="mt-10 lg:mt-0">
                <p className="max-w-[520px] text-[1.1rem] leading-[1.75]"
                   style={{ color: ED.inkMuted }}>
                  {rsvpHref
                    ? "We can’t wait to celebrate with you. Confirm your seat at the table below."
                    : "RSVPs open six weeks before the wedding — you’ll find a link here when they do."}
                </p>
                {rsvpHref && (
                  <a href={rsvpHref}
                     className="mt-10 inline-flex items-center gap-3 px-10 py-4 text-xs font-bold uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
                     style={{ background: ED.accent, color: ED.onAccent }}>
                    <span>RSVP</span>
                    <span>→</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Our Story — editorial two-column with big pull quote ── */}
      {config.ourStory && plan.ourStory && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.surface, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="IV" label="Chapter One" />
              <SectionHeading>Our Story.</SectionHeading>
              <div className="mt-14 grid gap-x-14 gap-y-10 lg:grid-cols-[55fr_45fr]">
                <div className="lg:pt-2">
                  <p
                    className="text-[1.1rem] leading-[1.85] sm:text-[1.2rem]"
                    style={{ color: ED.ink, whiteSpace: "pre-line", fontWeight: 300 }}
                  >
                    {plan.ourStory}
                  </p>
                </div>
                <div>
                  {storyPhoto ? (
                    <div className="overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={storyPhoto} alt=""
                           className="h-full w-full object-cover"
                           style={{ aspectRatio: "3 / 4" }}
                           loading="lazy" />
                    </div>
                  ) : (
                    <div
                      className="flex aspect-[3/4] items-center justify-center"
                      style={{ background: ED.background, border: `1px solid ${ED.border}` }}
                    >
                      <div className="text-center">
                        <div className="text-[0.68rem] font-medium uppercase tracking-[0.42em]"
                             style={{ color: ED.accent }}>Fig. I</div>
                        <div className="mt-3 text-2xl"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               fontWeight: 700,
                               color:      ED.ink,
                             }}>
                          Portrait
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Travel ─────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.background, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[45fr_55fr] lg:gap-16">
              <div>
                <ChapterMark n="V" label="Plan Your Trip" />
                <SectionHeading>Travel <em style={{ color: ED.accent, fontStyle: "normal" }}>&amp;</em> Stay.</SectionHeading>
              </div>
              <div className="mt-10 lg:mt-0">
                <p className="max-w-[640px] whitespace-pre-line text-[1.1rem] leading-[1.85]"
                   style={{ color: ED.inkMuted }}>
                  {plan.travelCopy}
                </p>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Wedding party — asymmetric grid, square portraits ──── */}
      {config.weddingParty && party.length > 0 && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.surface, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="VI" label="Standing With Us" />
              <SectionHeading>The Party.</SectionHeading>
              <ul className="mt-14 grid gap-x-8 gap-y-14 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m, i) => (
                  <li key={m.id}>
                    <div
                      className="aspect-square w-full transition-transform hover:scale-[1.02]"
                      style={{
                        background: ED.background,
                        border:     `1px solid ${ED.border}`,
                      }}
                    >
                      <div className="flex h-full w-full items-center justify-center"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontWeight: 700,
                             color:      ED.ink,
                             fontSize:   "3rem",
                             letterSpacing: "-0.02em",
                           }}>
                        {initials(m.name)}
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-[0.65rem] font-medium uppercase tracking-[0.32em]"
                            style={{ color: ED.accent }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="text-xl leading-tight"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontWeight: 700,
                             color:      ED.ink,
                           }}>
                        {m.name}
                      </div>
                    </div>
                    <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.32em]"
                         style={{ color: ED.inkMuted }}>
                      {m.role}
                    </div>
                    {m.bio && (
                      <p className="mt-3 text-sm leading-relaxed" style={{ color: ED.inkMuted }}>
                        {m.bio}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Gallery — asymmetric magazine collage ────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.background, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="VII" label="Memories" />
              <SectionHeading>The Portfolio.</SectionHeading>
              <CollageGrid urls={gallery.filter(Boolean)} />
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Dress code ────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.surface, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[45fr_55fr] lg:gap-16">
              <div>
                <ChapterMark n="VIII" label="What to Wear" />
                <SectionHeading>Dress Code.</SectionHeading>
              </div>
              <div className="mt-10 lg:mt-0">
                {plan.dressCodeStyle && (
                  <div className="text-3xl sm:text-4xl"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         fontWeight: 700,
                         color:      ED.ink,
                       }}>
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-6 max-w-[560px] text-[1.05rem] leading-[1.8]" style={{ color: ED.inkMuted }}>
                    {plan.dressCodeDescription}
                  </p>
                )}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Things to do — numbered editorial list ────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.background, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="IX" label="While You’re Here" />
              <SectionHeading>Things To Do.</SectionHeading>
              <ol className="mt-14 divide-y" style={{ borderColor: ED.border }}>
                {things.map((t, i) => (
                  <li key={t.id}
                      className="grid gap-x-8 gap-y-3 py-8 lg:grid-cols-[80px_1fr_auto] lg:items-start"
                      style={{ borderColor: ED.border }}>
                    <div className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                         style={{ color: ED.accent }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl leading-tight"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontWeight: 700,
                             color:      ED.ink,
                           }}>
                        {t.name}
                      </div>
                      <p className="mt-3 max-w-[640px] text-[1rem] leading-[1.75]" style={{ color: ED.inkMuted }}>
                        {t.description}
                      </p>
                    </div>
                    {t.url && (
                      <a href={t.url} target="_blank" rel="noopener"
                         className="text-[0.7rem] font-bold uppercase tracking-[0.32em] lg:justify-self-end"
                         style={{ color: ED.accent }}>
                        Visit ↗
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Registry — clean list layout ──────────────────────── */}
      {config.registry && registry.length > 0 && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.surface, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[45fr_55fr] lg:gap-16">
              <div>
                <ChapterMark n="X" label="With Our Thanks" />
                <SectionHeading>Registry.</SectionHeading>
              </div>
              <ul className="mt-10 divide-y lg:mt-0" style={{ borderColor: ED.border }}>
                {registry.map((r, i) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noopener"
                       className="flex items-center justify-between py-6 transition-opacity hover:opacity-70">
                      <div className="flex items-baseline gap-6">
                        <span className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                              style={{ color: ED.accent }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-2xl sm:text-3xl"
                              style={{
                                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                                fontWeight: 700,
                                color:      ED.ink,
                              }}>
                          {r.label || "Registry"}
                        </span>
                      </div>
                      <span className="text-[0.7rem] font-bold uppercase tracking-[0.32em]"
                            style={{ color: ED.ink }}>
                        Visit ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── FAQ ───────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.background, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="XI" label="Good to Know" />
              <SectionHeading>Frequently Asked.</SectionHeading>
              <ul className="mt-14 divide-y" style={{ borderColor: ED.border }}>
                {faqItems.map((f) => (
                  <li key={f.id} className="py-8">
                    <div className="text-xl sm:text-2xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontWeight: 700,
                           color:      ED.ink,
                         }}>
                      {f.question}
                    </div>
                    <p className="mt-3 max-w-[820px] text-[1rem] leading-[1.8]" style={{ color: ED.inkMuted }}>
                      {f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Vendor credits — clean list, no cards ─────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <ScrollFadeIn>
          <section className="border-b px-6 py-24 lg:px-16 lg:py-32"
                   style={{ background: ED.surface, borderColor: ED.border }}>
            <div className="mx-auto max-w-[1180px]">
              <ChapterMark n="XII" label="The Team Behind the Day" />
              <SectionHeading>Credits.</SectionHeading>
              <ul className="mt-14 divide-y" style={{ borderColor: ED.border }}>
                {venue?.name && (
                  <li>
                    <div className="grid gap-x-8 gap-y-2 py-6 lg:grid-cols-[160px_1fr_auto] lg:items-baseline">
                      <div className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                           style={{ color: ED.accent }}>
                        Venue
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               fontWeight: 700,
                               color:      ED.ink,
                             }}>
                          {venue.name}
                        </div>
                        {venue.city && (
                          <div className="mt-1 text-sm" style={{ color: ED.inkMuted }}>
                            {venue.city}, Ontario
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] font-bold uppercase tracking-[0.32em] lg:justify-self-end">
                        {venue.slug && (
                          <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                             style={{ color: ED.accent }}>
                            Profile →
                          </a>
                        )}
                        {venue.website && (
                          <a href={venue.website} target="_blank" rel="noopener"
                             style={{ color: ED.ink }}>
                            Website ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                )}

                {credits.map((c, i) => (
                  <li key={`${c.category}-${i}`}>
                    <div className="grid gap-x-8 gap-y-2 py-6 lg:grid-cols-[160px_1fr_auto] lg:items-baseline">
                      <div className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                           style={{ color: ED.accent }}>
                        {prettyCategory(c.category)}
                      </div>
                      <div className="text-xl sm:text-2xl"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontWeight: 700,
                             color:      ED.ink,
                           }}>
                        {c.name}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] font-bold uppercase tracking-[0.32em] lg:justify-self-end">
                        {c.slug && (
                          <a href={`${siteUrl}/vendors/${c.category.replace(/_/g, "-")}/${c.slug}`}
                             target="_blank" rel="noopener" style={{ color: ED.accent }}>
                            Profile →
                          </a>
                        )}
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noopener"
                             style={{ color: ED.ink }}>
                            Website ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Footer — colophon feel ─────────────────────────────── */}
      <footer className="px-6 py-16 lg:px-16"
              style={{ background: ED.primary, color: ED.background }}>
        <div className="mx-auto max-w-[1180px] grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
                 style={{ color: ED.accent }}>
              Colophon
            </div>
            <div className="mt-4 text-4xl sm:text-5xl"
                 style={{
                   fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                   fontWeight: 700,
                   color:      ED.background,
                   letterSpacing: "-0.01em",
                 }}>
              {coupleLabel}
            </div>
            {datePillUpper && (
              <div className="mt-3 text-[0.75rem] uppercase tracking-[0.42em]"
                   style={{ color: "rgba(250,250,250,0.7)" }}>
                {datePillUpper}
              </div>
            )}
            {plan.weddingHashtag && (
              <div className="mt-4 text-[0.75rem] font-bold uppercase tracking-[0.32em]"
                   style={{ color: ED.accent }}>
                {plan.weddingHashtag}
              </div>
            )}
          </div>
          <div className="lg:text-right">
            <div className="text-[0.6rem] uppercase tracking-[0.32em]"
                 style={{ color: "rgba(250,250,250,0.6)" }}>
              Planned with
            </div>
            <a href={siteUrl} target="_blank" rel="noopener"
               className="mt-1 block text-sm font-bold uppercase tracking-[0.28em] hover:underline"
               style={{ color: ED.background }}>
              Ontario Wedding Vendors
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

/* Minimal countdown — big numbers only, no cards. Server-rendered
 * snapshot (same pattern as the other layouts); couples refresh to
 * update. */
function MinimalCountdown({ isoDate }: { isoDate: string }) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff <= 0) {
    return (
      <div className="text-[0.7rem] uppercase tracking-[0.32em]"
           style={{ color: "rgba(250,250,250,0.7)" }}>
        Already celebrated · check the gallery
      </div>
    );
  }
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return (
    <div className="grid grid-cols-3 gap-x-10">
      <CountdownFig value={days}    label="Days" />
      <CountdownFig value={hours}   label="Hours" />
      <CountdownFig value={minutes} label="Min" />
    </div>
  );
}

function CountdownFig({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="tabular-nums"
           style={{
             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
             fontWeight: 700,
             color:      "#FAFAFA",
             fontSize:   "clamp(2.4rem,5vw,3.6rem)",
             lineHeight: 1,
           }}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-2 text-[0.62rem] font-medium uppercase tracking-[0.42em]"
           style={{ color: "rgba(250,250,250,0.65)" }}>
        {label}
      </div>
    </div>
  );
}

/* Chapter mark — rose Roman numeral + tiny label, magazine chapter tell */
function ChapterMark({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
            style={{ color: "#B96476" }}>
        {n}
      </span>
      <span className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
            style={{ color: "#6B6B6B" }}>
        {label}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-6 text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.98]"
      style={{
        fontFamily:    "var(--font-display), 'Cormorant Garamond', Georgia, serif",
        fontWeight:    700,
        color:         "#1A1A1A",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function EventBlock({ index, eyebrow, title, meta, address, mapHref }: {
  index:   string;
  eyebrow: string;
  title:   string;
  meta:    string | null;
  address: string;
  mapHref: string | null;
}) {
  return (
    <div className="border-t pt-8" style={{ borderColor: "#1A1A1A" }}>
      <div className="flex items-baseline gap-6">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
              style={{ color: "#B96476" }}>
          {index}
        </span>
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
              style={{ color: "#1A1A1A" }}>
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-4 text-3xl sm:text-4xl lg:text-5xl leading-[1.02]"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontWeight: 700,
            color:      "#1A1A1A",
            letterSpacing: "-0.01em",
          }}>
        {title}
      </h3>
      {meta && (
        <div className="mt-4 text-[0.95rem]" style={{ color: "#6B6B6B" }}>
          {meta}
        </div>
      )}
      {address && (
        <div className="mt-1 text-[0.95rem] leading-[1.7]" style={{ color: "#6B6B6B" }}>
          {address}
        </div>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noopener"
           className="mt-6 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.32em]"
           style={{ color: "#B96476" }}>
          View on map →
        </a>
      )}
    </div>
  );
}

/* Asymmetric photo collage — first item spans 2 columns/rows, rest
 * flow around it. Reads as an editorial spread rather than a uniform
 * gallery grid. */
function CollageGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  const [first, ...rest] = urls;
  return (
    <div className="mt-14 grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
      {/* Feature image — spans 2×2 in the top-left */}
      <div className="lg:col-span-2 lg:row-span-2 aspect-[4/5] lg:aspect-auto overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={first} alt=""
             className="h-full w-full object-cover"
             loading="lazy" />
      </div>
      {rest.slice(0, 4).map((url, i) => (
        <div key={i} className="aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt=""
               className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
               loading="lazy" />
        </div>
      ))}
    </div>
  );
}

function formatUpperDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function prettyCategory(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
