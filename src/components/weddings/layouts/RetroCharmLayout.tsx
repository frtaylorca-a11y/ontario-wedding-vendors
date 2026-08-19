import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Retro Charm layout ──────────────────────────────────────────────
 * Heirloom letterpress wedding invitation — 1920s art-deco / mid-
 * century stationery. Not "vintage boho" — formal, ornate, and
 * decorative. Burgundy #6B1F2A speaks the loudest; gold hairlines
 * carry the ornamental language throughout.
 *
 * Signature devices reused across every section:
 *   - Ornate double-line frames (thin outer + thicker inner, gold)
 *     around hero panel, event cards, RSVP card, vendor blocks
 *   - Art-deco divider ornaments between sections (diamond + hairlines)
 *   - Playfair Display all-caps for section eyebrows; italic for titles
 *   - Chapter marks rendered as Roman numerals inside a gold circle
 *   - Photo overlays use a burgundy wash (not black) — every image
 *     keeps its warm cast so the palette holds together
 *
 * Palette (fixed; mirrored in wedding-themes.ts → RETRO):
 *   pageBg     #FDF8F0  warm cream (page)
 *   surface    #FEFCF8  near-cream (cards)
 *   surfaceAlt #F5EDD8  deeper cream / wheat (alt stripes)
 *   ink        #2E1216  dark burgundy-brown (body / headings)
 *   inkMuted   #6B4248  faded burgundy (secondary text)
 *   accent     #6B1F2A  deep burgundy (hero panel, CTA, chapter marks)
 *   accentSoft #EFD4D8  pale rose wash (accent-on-cream states)
 *   border     #D8C9A0  gold-toned hairline (all frames + dividers)
 *
 * Typography: Playfair Display (--font-playfair) for display, Inter
 * for body. Explicit Playfair italic on names/titles for the classic
 * invitation feel.
 */
const RC = {
  pageBg:     "#FDF8F0",
  surface:    "#FEFCF8",
  surfaceAlt: "#F5EDD8",
  ink:        "#2E1216",
  inkMuted:   "#6B4248",
  accent:     "#6B1F2A",
  accentSoft: "#EFD4D8",
  gold:       "#D8C9A0",
  onAccent:   "#FDF8F0",
} as const;

const DISPLAY_FONT =
  "var(--font-playfair), 'Playfair Display', Georgia, serif";

export function RetroCharmLayout(props: WeddingLayoutProps) {
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
        background: RC.pageBg,
        color:      RC.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero: photo + burgundy wash + centered gold double-frame panel */}
      <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        {plan.weddingHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.weddingHeroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Warm burgundy wash — pulls the photo firmly into the palette */}
            <div aria-hidden className="absolute inset-0 -z-10"
                 style={{ background: RC.accent, opacity: 0.42 }} />
            {/* Vignette so the framed panel reads clearly */}
            <div aria-hidden className="absolute inset-0 -z-10"
                 style={{
                   background:
                     "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(46,18,22,0.35) 100%)",
                 }} />
          </>
        ) : (
          <div aria-hidden className="absolute inset-0 -z-10"
               style={{
                 background: `radial-gradient(circle at 30% 30%, ${RC.accentSoft} 0%, ${RC.pageBg} 45%, ${RC.surfaceAlt} 100%)`,
               }} />
        )}

        <DoubleFrame
          className="relative mx-auto w-full max-w-[720px] px-10 py-14 text-center sm:px-16 sm:py-16"
          bg="rgba(253,248,240,0.94)"
        >
          {/* Corner ornaments — art-deco flourish at each corner */}
          <CornerFlourish position="tl" />
          <CornerFlourish position="tr" />
          <CornerFlourish position="bl" />
          <CornerFlourish position="br" />

          <div className="text-[0.68rem] font-medium uppercase tracking-[0.5em]"
               style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
            The Marriage Of
          </div>

          <h1
            className="mt-6"
            style={{
              fontFamily: DISPLAY_FONT,
              fontStyle:  "italic",
              fontWeight: 500,
              color:      RC.ink,
              fontSize:   "clamp(2.6rem, 8vw, 4.8rem)",
              lineHeight: 1.04,
              letterSpacing: "0.005em",
            }}
          >
            {coupleLabel}
          </h1>

          <ArtDecoDivider className="mt-8" />

          {datePillUpper && (
            <div className="mt-6 text-[0.8rem] uppercase tracking-[0.42em]"
                 style={{ color: RC.ink, fontFamily: DISPLAY_FONT, fontWeight: 500 }}>
              {datePillUpper}
            </div>
          )}
          {venue?.city && (
            <div className="mt-3 text-[0.7rem] uppercase tracking-[0.42em]"
                 style={{ color: RC.inkMuted }}>
              {venue.city} · Ontario
            </div>
          )}

          {plan.weddingDate && (
            <div className="mt-10">
              <NumeralCountdown isoDate={plan.weddingDate} />
            </div>
          )}

          {config.rsvp && rsvpHref && (
            <div className="mt-10">
              <a href={rsvpHref}
                 className="inline-flex items-center gap-3 px-9 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.4em] transition-opacity hover:opacity-90"
                 style={{
                   background: RC.accent, color: RC.onAccent,
                   fontFamily: DISPLAY_FONT,
                 }}>
                Kindly Respond
              </a>
            </div>
          )}
        </DoubleFrame>
      </section>

      {/* ── Welcome ─────────────────────────────────────────────── */}
      <ScrollFadeIn>
        <Section bg={RC.pageBg}>
          <ChapterMonogram n="I" />
          <SectionEyebrow>Welcome</SectionEyebrow>
          <SectionTitle>The Wedding Weekend</SectionTitle>
          <ArtDecoDivider className="mx-auto mt-8" />
          <p className="mx-auto mt-10 max-w-[720px] text-center text-[1.08rem] leading-[1.9]"
             style={{ color: RC.inkMuted }}>
            {generated?.heroTagline ||
              `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
          </p>
        </Section>
      </ScrollFadeIn>

      <OrnamentDivider />

      {/* ── Ceremony + Reception — double-framed cards ─────────── */}
      <ScrollFadeIn>
        <Section bg={RC.surfaceAlt}>
          <ChapterMonogram n="II" />
          <SectionEyebrow>The Day</SectionEyebrow>
          <SectionTitle>Ceremony &amp; Reception</SectionTitle>
          <ArtDecoDivider className="mx-auto mt-8" />

          <div className="mx-auto mt-14 grid max-w-[1080px] gap-8 sm:grid-cols-2 lg:gap-10">
            <EventFrame
              eyebrow="The Ceremony"
              title={venue?.name ?? "The Ceremony"}
              meta={weddingDateLong}
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
            />
            <EventFrame
              eyebrow="The Reception"
              title={venue?.name ?? "The Reception"}
              meta="Dinner &amp; dancing to follow"
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
            />
          </div>

          {extraEvents.length > 0 && (
            <ul className="mx-auto mt-10 grid max-w-[1080px] gap-6 sm:grid-cols-2">
              {extraEvents.map((ev) => (
                <li key={ev.id}>
                  <DoubleFrame className="p-6" bg={RC.surface}>
                    <div className="text-[0.68rem] font-medium uppercase tracking-[0.4em]"
                         style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
                      {ev.name}
                    </div>
                    <div className="mt-3 text-2xl italic"
                         style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                      {[ev.date, ev.time].filter(Boolean).join(" · ")}
                    </div>
                    {ev.location && (
                      <div className="mt-1 text-sm" style={{ color: RC.inkMuted }}>
                        {ev.location}
                      </div>
                    )}
                    {ev.description && (
                      <p className="mt-3 text-[0.95rem] leading-[1.85]" style={{ color: RC.inkMuted }}>
                        {ev.description}
                      </p>
                    )}
                  </DoubleFrame>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </ScrollFadeIn>

      {/* ── RSVP — styled as a formal reply card ─────────────── */}
      {config.rsvp && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.pageBg}>
              <ChapterMonogram n="III" />
              <SectionEyebrow>Please Reply</SectionEyebrow>
              <SectionTitle>Kindly Respond</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />

              <div className="mx-auto mt-12 max-w-[560px]">
                <DoubleFrame className="px-8 py-12 text-center" bg={RC.surface}>
                  <div className="text-[0.72rem] uppercase tracking-[0.42em]"
                       style={{ color: RC.inkMuted, fontFamily: DISPLAY_FONT }}>
                    Reply Card
                  </div>
                  <p className="mt-6 text-[1.05rem] italic leading-[1.9]"
                     style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                    {rsvpHref
                      ? "The favour of your reply is requested."
                      : "Reply cards will be sent six weeks before the wedding."}
                  </p>
                  {rsvpHref && (
                    <a href={rsvpHref}
                       className="mt-8 inline-flex items-center gap-3 px-10 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.4em] transition-opacity hover:opacity-90"
                       style={{
                         background: RC.accent, color: RC.onAccent,
                         fontFamily: DISPLAY_FONT,
                       }}>
                      RSVP →
                    </a>
                  )}
                </DoubleFrame>
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Our Story — editorial two-column ───────────────────── */}
      {config.ourStory && plan.ourStory && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.surfaceAlt}>
              <ChapterMonogram n="IV" />
              <SectionEyebrow>Chapter One</SectionEyebrow>
              <SectionTitle>Our Story</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />

              <div className="mx-auto mt-14 grid max-w-[1180px] gap-x-12 gap-y-10 lg:grid-cols-[3fr_2fr]">
                <div className="relative lg:pt-4">
                  <span aria-hidden
                        className="absolute -left-2 -top-8 select-none leading-none"
                        style={{
                          fontFamily: DISPLAY_FONT,
                          color:      RC.accent,
                          opacity:    0.35,
                          fontSize:   "6rem",
                        }}>
                    &ldquo;
                  </span>
                  <p className="text-[1.08rem] leading-[1.95]"
                     style={{ color: RC.ink, whiteSpace: "pre-line" }}>
                    {plan.ourStory}
                  </p>
                </div>
                <div>
                  {storyPhoto ? (
                    <DoubleFrame className="p-3" bg={RC.surface}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={storyPhoto} alt=""
                           className="block h-full w-full object-cover"
                           style={{ aspectRatio: "3 / 4" }}
                           loading="lazy" />
                    </DoubleFrame>
                  ) : (
                    <DoubleFrame className="flex aspect-[3/4] items-center justify-center" bg={RC.surface}>
                      <div className="text-center">
                        <ArtDecoDivider className="mx-auto" />
                        <div className="mt-4 text-2xl italic"
                             style={{ color: RC.inkMuted, fontFamily: DISPLAY_FONT }}>
                          Portrait
                        </div>
                        <ArtDecoDivider className="mx-auto mt-4" />
                      </div>
                    </DoubleFrame>
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
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.pageBg}>
              <ChapterMonogram n="V" />
              <SectionEyebrow>Plan Your Trip</SectionEyebrow>
              <SectionTitle>Travel &amp; Accommodation</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />
              <p className="mx-auto mt-10 max-w-[760px] whitespace-pre-line text-center text-[1.05rem] leading-[1.9]"
                 style={{ color: RC.inkMuted }}>
                {plan.travelCopy}
              </p>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Wedding party — framed portrait grid ─────────────── */}
      {config.weddingParty && party.length > 0 && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.surfaceAlt}>
              <ChapterMonogram n="VI" />
              <SectionEyebrow>Standing With Us</SectionEyebrow>
              <SectionTitle>The Wedding Party</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />

              <ul className="mx-auto mt-14 grid max-w-[1080px] gap-10 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m) => (
                  <li key={m.id} className="text-center">
                    <DoubleFrame className="aspect-square p-2" bg={RC.surface}>
                      <div className="flex h-full w-full items-center justify-center italic"
                           style={{
                             fontFamily: DISPLAY_FONT,
                             color:      RC.accent,
                             fontSize:   "2.8rem",
                           }}>
                        {initials(m.name)}
                      </div>
                    </DoubleFrame>
                    <div className="mt-4 text-xl italic"
                         style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                      {m.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.4em]"
                         style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
                      {m.role}
                    </div>
                    {m.bio && (
                      <p className="mt-3 text-[0.92rem] leading-[1.8]" style={{ color: RC.inkMuted }}>
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

      {/* ── Gallery — framed square grid ──────────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.pageBg}>
              <ChapterMonogram n="VII" />
              <SectionEyebrow>Memories</SectionEyebrow>
              <SectionTitle>Photographs</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />
              <div className="mx-auto mt-12 grid max-w-[1200px] gap-4 grid-cols-2 sm:grid-cols-3">
                {gallery.filter(Boolean).map((url, i) => (
                  <DoubleFrame key={i} className="p-2 transition-transform hover:scale-[1.02]" bg={RC.surface}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt=""
                         className="block aspect-square w-full object-cover"
                         loading="lazy" />
                  </DoubleFrame>
                ))}
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Dress code ────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.surfaceAlt}>
              <ChapterMonogram n="VIII" />
              <SectionEyebrow>What to Wear</SectionEyebrow>
              <SectionTitle>Attire</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />
              <div className="mx-auto mt-10 max-w-[640px] text-center">
                {plan.dressCodeStyle && (
                  <div className="text-3xl italic sm:text-4xl"
                       style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-5 text-[1.05rem] leading-[1.9]" style={{ color: RC.inkMuted }}>
                    {plan.dressCodeDescription}
                  </p>
                )}
              </div>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Things to do — numbered ornate list ───────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.pageBg}>
              <ChapterMonogram n="IX" />
              <SectionEyebrow>While You&rsquo;re Here</SectionEyebrow>
              <SectionTitle>Things To Do</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />

              <ol className="mx-auto mt-12 max-w-[860px] space-y-6">
                {things.map((t, i) => (
                  <li key={t.id}>
                    <DoubleFrame className="grid gap-6 p-6 sm:grid-cols-[80px_1fr] sm:items-start sm:p-7" bg={RC.surface}>
                      <div
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl italic sm:mx-0"
                        style={{
                          border:     `1.5px solid ${RC.gold}`,
                          background: RC.surfaceAlt,
                          color:      RC.accent,
                          fontFamily: DISPLAY_FONT,
                        }}
                      >
                        {toRoman(i + 1)}
                      </div>
                      <div>
                        <div className="text-2xl italic sm:text-3xl"
                             style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                          {t.name}
                        </div>
                        <p className="mt-3 text-[1rem] leading-[1.85]" style={{ color: RC.inkMuted }}>
                          {t.description}
                        </p>
                        {t.url && (
                          <a href={t.url} target="_blank" rel="noopener"
                             className="mt-4 inline-block text-[0.7rem] font-bold uppercase tracking-[0.4em]"
                             style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
                            Visit ↗
                          </a>
                        )}
                      </div>
                    </DoubleFrame>
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
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.surfaceAlt}>
              <ChapterMonogram n="X" />
              <SectionEyebrow>With Our Thanks</SectionEyebrow>
              <SectionTitle>Registry</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />
              <div className="mx-auto mt-10 flex max-w-[680px] flex-wrap justify-center gap-4">
                {registry.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener"
                     className="inline-flex items-center gap-2 border-2 px-6 py-3 text-[0.72rem] font-bold uppercase tracking-[0.4em] transition-colors hover:bg-[color:var(--rc-hover)]"
                     style={{
                       borderColor: RC.accent, color: RC.accent,
                       fontFamily:  DISPLAY_FONT,
                       ["--rc-hover" as string]: RC.accentSoft,
                     }}>
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
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.pageBg}>
              <ChapterMonogram n="XI" />
              <SectionEyebrow>Good to Know</SectionEyebrow>
              <SectionTitle>Frequently Asked</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />
              <ul className="mx-auto mt-12 max-w-[820px] space-y-5">
                {faqItems.map((f) => (
                  <li key={f.id}>
                    <DoubleFrame className="p-6" bg={RC.surface}>
                      <div className="text-lg italic sm:text-xl"
                           style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                        {f.question}
                      </div>
                      <p className="mt-3 text-[1rem] leading-[1.85]" style={{ color: RC.inkMuted }}>
                        {f.answer}
                      </p>
                    </DoubleFrame>
                  </li>
                ))}
              </ul>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Vendor credits — ornate list ──────────────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <>
          <OrnamentDivider />
          <ScrollFadeIn>
            <Section bg={RC.surfaceAlt}>
              <ChapterMonogram n="XII" />
              <SectionEyebrow>The Team Behind the Day</SectionEyebrow>
              <SectionTitle>With Our Thanks</SectionTitle>
              <ArtDecoDivider className="mx-auto mt-8" />

              <ul className="mx-auto mt-12 max-w-[920px] space-y-3">
                {venue?.name && (
                  <li>
                    <DoubleFrame className="p-6" bg={RC.surface}>
                      <div className="text-[0.68rem] font-medium uppercase tracking-[0.4em]"
                           style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
                        Venue
                      </div>
                      <div className="mt-2 text-3xl italic"
                           style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                        {venue.name}
                      </div>
                      {venue.city && (
                        <div className="mt-1 text-sm" style={{ color: RC.inkMuted }}>
                          {venue.city}, Ontario
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                        {venue.slug && (
                          <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                             className="border-2 px-4 py-1.5 font-bold uppercase tracking-[0.28em]"
                             style={{ borderColor: RC.accent, color: RC.accent, fontFamily: DISPLAY_FONT }}>
                            View profile →
                          </a>
                        )}
                        {venue.website && (
                          <a href={venue.website} target="_blank" rel="noopener"
                             className="border px-4 py-1.5 font-medium uppercase tracking-[0.28em]"
                             style={{ borderColor: RC.gold, color: RC.ink, fontFamily: DISPLAY_FONT }}>
                            Visit website ↗
                          </a>
                        )}
                      </div>
                    </DoubleFrame>
                  </li>
                )}

                {credits.length > 0 && (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {credits.map((c, i) => (
                      <li key={`${c.category}-${i}`}>
                        <DoubleFrame className="p-5" bg={RC.surface}>
                          <div className="text-[0.6rem] font-medium uppercase tracking-[0.4em]"
                               style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
                            {prettyCategory(c.category)}
                          </div>
                          <div className="mt-1.5 text-lg italic"
                               style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
                            {c.name}
                          </div>
                        </DoubleFrame>
                      </li>
                    ))}
                  </ul>
                )}
              </ul>
            </Section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <OrnamentDivider />
      <footer className="px-6 py-14 text-center" style={{ background: RC.pageBg }}>
        <div className="text-3xl italic sm:text-4xl"
             style={{ color: RC.ink, fontFamily: DISPLAY_FONT }}>
          {coupleLabel}
        </div>
        {datePillUpper && (
          <div className="mt-3 text-[0.75rem] uppercase tracking-[0.42em]"
               style={{ color: RC.inkMuted, fontFamily: DISPLAY_FONT }}>
            {datePillUpper}
          </div>
        )}
        <ArtDecoDivider className="mx-auto my-6" />
        {plan.weddingHashtag && (
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.4em]"
               style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.32em]" style={{ color: RC.inkMuted }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: RC.accent }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Ornamental sub-components ─────────────────────────────── */

/* Double-line frame — thin gold outer stroke, thicker gold inner
 * stroke separated by a 3px gap, then the content. The recurring
 * ornament of this layout — every card, event block, portrait tile,
 * hero panel uses it so the invitation feel reads consistently. */
function DoubleFrame({
  children, className = "", bg,
}: { children: React.ReactNode; className?: string; bg: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background:  bg,
        outline:     `1px solid ${RC.gold}`,
        boxShadow:   `inset 0 0 0 4px ${bg}, inset 0 0 0 6px ${RC.gold}`,
      }}
    >
      {children}
    </div>
  );
}

/* Art-deco horizontal ornament: hairline — diamond — hairline. Used
 * inside sections to break blocks without introducing another header. */
function ArtDecoDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="h-px w-16" style={{ background: RC.gold }} />
      <svg viewBox="0 0 12 12" width="10" height="10"
           fill={RC.accent}>
        <polygon points="6,0 12,6 6,12 0,6" />
      </svg>
      <span className="h-px w-16" style={{ background: RC.gold }} />
    </div>
  );
}

/* Full-width ornament between top-level sections. Wider than the
 * ArtDecoDivider and centred on the page — signals "new chapter"
 * more than "same section, next block". */
function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-4" aria-hidden>
      <span className="h-px w-24" style={{ background: RC.gold }} />
      <svg viewBox="0 0 40 20" width="40" height="20"
           fill="none" stroke={RC.accent} strokeWidth="1.4"
           strokeLinecap="round" strokeLinejoin="round">
        <polygon points="20,2 26,10 20,18 14,10" fill={RC.accent} />
        <circle cx="6"  cy="10" r="2" fill={RC.gold} stroke="none" />
        <circle cx="34" cy="10" r="2" fill={RC.gold} stroke="none" />
      </svg>
      <span className="h-px w-24" style={{ background: RC.gold }} />
    </div>
  );
}

/* Corner flourish for the hero double-frame. Four SVG marks tucked
 * into each corner — the classic art-deco framing tell. Positioned
 * absolutely inside the frame's padding. */
function CornerFlourish({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const posClass = {
    tl: "left-4 top-4",
    tr: "right-4 top-4 -scale-x-100",
    bl: "left-4 bottom-4 -scale-y-100",
    br: "right-4 bottom-4 -scale-x-100 -scale-y-100",
  }[position];
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="24" height="24"
      className={`pointer-events-none absolute ${posClass}`}
      fill="none"
      stroke={RC.gold}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20 L4 8 Q4 4 8 4 L20 4" />
      <path d="M4 14 L10 14" />
      <path d="M10 4 L10 10" />
      <circle cx="10" cy="14" r="1.5" fill={RC.accent} stroke="none" />
    </svg>
  );
}

/* Roman-numeral chapter mark in a gold circle — sits above each
 * section title. Ties the whole layout together as a numbered
 * "programme" (Roman numerals I → XII across the twelve chapters). */
function ChapterMonogram({ n }: { n: string }) {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
         style={{
           border:     `1.5px solid ${RC.gold}`,
           background: RC.surface,
           color:      RC.accent,
           fontFamily: DISPLAY_FONT,
         }}>
      <span className="text-lg italic">{n}</span>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 text-center text-[0.7rem] font-medium uppercase tracking-[0.5em]"
         style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-center italic"
        style={{
          fontFamily: DISPLAY_FONT,
          color:      RC.ink,
          fontSize:   "clamp(2.2rem, 6vw, 3.6rem)",
          lineHeight: 1.08,
        }}>
      {children}
    </h2>
  );
}

function Section({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <section style={{ background: bg }} className="px-6 py-20 lg:py-24">
      <div className="mx-auto max-w-[1180px]">
        {children}
      </div>
    </section>
  );
}

function EventFrame({ eyebrow, title, meta, address, mapHref }: {
  eyebrow: string;
  title:   string;
  meta:    string | null;
  address: string;
  mapHref: string | null;
}) {
  return (
    <DoubleFrame className="p-8 text-center sm:p-10" bg={RC.surface}>
      <div className="text-[0.7rem] font-medium uppercase tracking-[0.45em]"
           style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
        {eyebrow}
      </div>
      <h3 className="mt-4 italic"
          style={{
            fontFamily: DISPLAY_FONT,
            color:      RC.ink,
            fontSize:   "clamp(1.7rem, 3.5vw, 2.2rem)",
            lineHeight: 1.08,
          }}>
        {title}
      </h3>
      <ArtDecoDivider className="mx-auto mt-5" />
      {meta && (
        <div className="mt-5 text-[0.98rem]" style={{ color: RC.inkMuted }}>
          {meta}
        </div>
      )}
      {address && (
        <div className="mt-1 text-[0.95rem] leading-[1.7]" style={{ color: RC.inkMuted }}>
          {address}
        </div>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noopener"
           className="mt-6 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.4em]"
           style={{ color: RC.accent, fontFamily: DISPLAY_FONT }}>
          View on map →
        </a>
      )}
    </DoubleFrame>
  );
}

/* Countdown — three columns of large Playfair numerals with gold
 * hairlines above/below the label. Reads like a programme printed
 * inside an invitation, not a digital widget. */
function NumeralCountdown({ isoDate }: { isoDate: string }) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff <= 0) {
    return (
      <div className="text-[0.72rem] uppercase tracking-[0.4em]"
           style={{ color: RC.inkMuted, fontFamily: DISPLAY_FONT }}>
        Already celebrated · check the gallery
      </div>
    );
  }
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return (
    <div className="grid grid-cols-3 gap-x-8">
      <NumeralFig value={days}    label="Days" />
      <NumeralFig value={hours}   label="Hours" />
      <NumeralFig value={minutes} label="Min" />
    </div>
  );
}

function NumeralFig({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="tabular-nums italic"
           style={{
             fontFamily: DISPLAY_FONT,
             color:      RC.ink,
             fontSize:   "clamp(2.4rem,5vw,3.4rem)",
             lineHeight: 1,
           }}>
        {value}
      </div>
      <div aria-hidden className="mx-auto mt-3 h-px w-8" style={{ background: RC.gold }} />
      <div className="mt-2 text-[0.6rem] font-medium uppercase tracking-[0.42em]"
           style={{ color: RC.inkMuted, fontFamily: DISPLAY_FONT }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Formatting helpers ─────────────────────────────────────── */

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

/* Roman numerals up to 20 — the things-to-do section rarely goes
 * beyond ~8 items, but 20 gives us headroom before the fallback
 * kicks in and Arabic is used instead. */
function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  if (n < 1 || n > 20) return String(n);
  let out = "";
  let remaining = n;
  for (const [v, s] of map) {
    while (remaining >= v) { out += s; remaining -= v; }
  }
  return out;
}
