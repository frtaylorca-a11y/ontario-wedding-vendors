import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Bold Garden layout ──────────────────────────────────────────────
 * Playful, joyful, chromatic — the opposite of Minimal Romantic's
 * restraint. Two accents (punchy pink + bold sage) drive an
 * alternating full-width-band composition: each section is a solid
 * colour block, no cards, no dividers — the colour switch IS the
 * divider.
 *
 * Signature moves:
 *   - Sections alternate cream → pink → sage → cream → pink → sage,
 *     each rendered as an edge-to-edge band
 *   - Split-screen hero: photo left with a sage duotone wash, solid
 *     pink panel right with the couple's names in oversized Cormorant
 *     italic
 *   - Duotone gallery + wedding-party portraits: half the tiles
 *     wear a pink tint, half a sage tint, so the grid reads as a
 *     patterned mosaic
 *   - Two-tone headings: one word in pink, the next in sage (or a
 *     big italic ampersand as the pivot)
 *   - Countdown alternates pink / sage columns
 *   - RSVP band: full sage with a pink pill CTA; vendor credits: full
 *     pink band with white cards
 *
 * Palette:
 *   Pink accent = #D4789A (from BOLD_GARDEN tokens — matches picker preview)
 *   Sage accent = #7C9A7E (hard-coded here; not exposed in the shared
 *                          ThemeTokens shape since it's layout-specific)
 *   Cream / white / near-black neutrals from the shared tokens.
 */
const BG = {
  pageBg:     "#FAF8F5",
  surface:    "#FFFFFF",
  pink:       "#D4789A",
  pinkSoft:   "#F4D4DF",
  pinkPale:   "#FBEEF3",
  sage:       "#7C9A7E",
  sageSoft:   "#D8E1D6",
  sagePale:   "#EDF2EC",
  ink:        "#1A1A1A",
  inkMuted:   "#5A4E54",
  onPink:     "#FFFFFF",
  onSage:     "#FFFFFF",
} as const;

export function BoldGardenLayout(props: WeddingLayoutProps) {
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
        background: BG.pageBg,
        color:      BG.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero: 50/50 split — sage-tinted photo left, pink panel right */}
      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left half — full-bleed photo with sage duotone */}
        <div className="relative overflow-hidden">
          {plan.weddingHeroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plan.weddingHeroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: "saturate(0.85) brightness(0.95)" }}
              />
              {/* Sage duotone wash */}
              <div aria-hidden className="absolute inset-0"
                   style={{ background: BG.sage, opacity: 0.38, mixBlendMode: "multiply" }} />
              {/* Warm-cream lift to keep highlights alive */}
              <div aria-hidden className="absolute inset-0"
                   style={{ background: BG.pageBg, opacity: 0.15 }} />
            </>
          ) : (
            <div aria-hidden className="absolute inset-0"
                 style={{ background: `linear-gradient(160deg, ${BG.sageSoft} 0%, ${BG.sage} 100%)` }} />
          )}
        </div>

        {/* Right half — solid pink panel */}
        <div
          className="relative flex flex-col justify-center px-8 py-24 sm:px-14 lg:px-20 lg:py-16"
          style={{ background: BG.pink, color: BG.onPink }}
        >
          <div className="text-[0.72rem] font-medium uppercase tracking-[0.42em]"
               style={{ color: BG.onPink, opacity: 0.9 }}>
            The Wedding Of
          </div>

          <h1
            className="mt-6 italic"
            style={{
              fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 500,
              color:      BG.onPink,
              fontSize:   "clamp(3rem, 9vw, 5.6rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.005em",
            }}
          >
            {coupleLabel}
          </h1>

          {/* Chunky sage bar as the visual anchor */}
          <div aria-hidden className="mt-10 h-2 w-24"
               style={{ background: BG.sage }} />

          {datePillUpper && (
            <div className="mt-10 text-[0.85rem] font-medium uppercase tracking-[0.5em]"
                 style={{ color: BG.onPink }}>
              {datePillUpper}
            </div>
          )}
          {venue?.city && (
            <div className="mt-3 text-[0.72rem] uppercase tracking-[0.42em]"
                 style={{ color: BG.onPink, opacity: 0.85 }}>
              {venue.city} · Ontario
            </div>
          )}

          {plan.weddingDate && (
            <div className="mt-12">
              <ChromaticCountdown isoDate={plan.weddingDate} />
            </div>
          )}

          {config.rsvp && rsvpHref && (
            <div className="mt-12">
              <a href={rsvpHref}
                 className="inline-flex items-center gap-3 rounded-full px-10 py-3.5 text-xs font-bold uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
                 style={{ background: BG.sage, color: BG.onSage }}>
                <span>RSVP</span>
                <span>→</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Welcome — cream band ────────────────────────────────── */}
      <ScrollFadeIn>
        <Band bg={BG.pageBg}>
          <Eyebrow tint={BG.pink}>Welcome</Eyebrow>
          <SplitTitle first="The Wedding" second="Weekend." firstTint={BG.ink} secondTint={BG.pink} secondItalic />
          <p className="mx-auto mt-10 max-w-[680px] text-center text-[1.08rem] leading-[1.9]"
             style={{ color: BG.inkMuted }}>
            {generated?.heroTagline ||
              `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
          </p>
        </Band>
      </ScrollFadeIn>

      {/* ── Ceremony + Reception — pink band ─────────────────── */}
      <ScrollFadeIn>
        <Band bg={BG.pink} textColor={BG.onPink}>
          <Eyebrow tint={BG.onPink} muted>The Day</Eyebrow>
          <SplitTitle first="Ceremony" ampersand second="Reception" firstTint={BG.onPink} secondTint={BG.sage} bothItalic />
          <div className="mx-auto mt-14 grid max-w-[1080px] gap-8 sm:grid-cols-2 lg:gap-10">
            <EventBlock
              eyebrow="The Ceremony"
              title={venue?.name ?? "The Ceremony"}
              meta={weddingDateLong}
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
              titleColor={BG.onPink}
              subColor="rgba(255,255,255,0.85)"
              linkColor={BG.sage}
            />
            <EventBlock
              eyebrow="The Reception"
              title={venue?.name ?? "The Reception"}
              meta="Dinner & dancing to follow"
              address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
              mapHref={mapHref}
              titleColor={BG.onPink}
              subColor="rgba(255,255,255,0.85)"
              linkColor={BG.sage}
            />
          </div>

          {extraEvents.length > 0 && (
            <ul className="mx-auto mt-12 grid max-w-[1080px] gap-6 sm:grid-cols-2">
              {extraEvents.map((ev, i) => (
                <li key={ev.id}
                    className="rounded-sm p-6"
                    style={{
                      background: i % 2 === 0 ? BG.surface : BG.sagePale,
                      color:      BG.ink,
                    }}>
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.36em]"
                       style={{ color: i % 2 === 0 ? BG.pink : BG.sage }}>
                    {ev.name}
                  </div>
                  <div className="mt-2 text-2xl italic"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         color:      BG.ink,
                       }}>
                    {[ev.date, ev.time].filter(Boolean).join(" · ")}
                  </div>
                  {ev.location && (
                    <div className="mt-1 text-sm" style={{ color: BG.inkMuted }}>
                      {ev.location}
                    </div>
                  )}
                  {ev.description && (
                    <p className="mt-3 text-[0.95rem] leading-[1.85]" style={{ color: BG.inkMuted }}>
                      {ev.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Band>
      </ScrollFadeIn>

      {/* ── RSVP — sage band with pink CTA ────────────────────── */}
      {config.rsvp && (
        <ScrollFadeIn>
          <Band bg={BG.sage} textColor={BG.onSage}>
            <Eyebrow tint={BG.onSage} muted>Please Reply</Eyebrow>
            <SplitTitle first="Say" second="yes." firstTint={BG.onSage} secondTint={BG.pinkSoft} bothItalic />
            <p className="mx-auto mt-8 max-w-[540px] text-center text-[1.08rem] leading-[1.9]"
               style={{ color: "rgba(255,255,255,0.9)" }}>
              {rsvpHref
                ? "We can’t wait to celebrate with you. Confirm your seat at the table."
                : "RSVPs open six weeks before the wedding — you’ll find a link here when they do."}
            </p>
            {rsvpHref && (
              <div className="mt-10 flex justify-center">
                <a href={rsvpHref}
                   className="inline-flex items-center gap-3 rounded-full px-12 py-4 text-xs font-bold uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
                   style={{ background: BG.pink, color: BG.onPink }}>
                  <span>RSVP</span>
                  <span>→</span>
                </a>
              </div>
            )}
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Our Story — cream band ─────────────────────────────── */}
      {config.ourStory && plan.ourStory && (
        <ScrollFadeIn>
          <Band bg={BG.pageBg}>
            <Eyebrow tint={BG.sage}>Chapter One</Eyebrow>
            <SplitTitle first="Our" second="Story." firstTint={BG.sage} secondTint={BG.pink} bothItalic />
            <div className="mx-auto mt-14 grid max-w-[1180px] gap-x-12 gap-y-10 lg:grid-cols-[3fr_2fr]">
              <div className="lg:pt-2">
                <p className="text-[1.08rem] leading-[1.95]"
                   style={{ color: BG.ink, whiteSpace: "pre-line" }}>
                  {plan.ourStory}
                </p>
              </div>
              <div>
                {storyPhoto ? (
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storyPhoto} alt=""
                         className="block h-full w-full object-cover"
                         style={{ aspectRatio: "3 / 4" }}
                         loading="lazy" />
                    {/* Sage duotone to match the hero left panel */}
                    <div aria-hidden className="absolute inset-0"
                         style={{ background: BG.sage, opacity: 0.22, mixBlendMode: "multiply" }} />
                  </div>
                ) : (
                  <div
                    className="flex aspect-[3/4] items-center justify-center"
                    style={{ background: BG.pinkPale }}
                  >
                    <div className="text-center">
                      <div className="text-6xl italic"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      BG.pink,
                           }}>
                        &amp;
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Travel — pink pale band ───────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <ScrollFadeIn>
          <Band bg={BG.pinkPale}>
            <Eyebrow tint={BG.pink}>Plan Your Trip</Eyebrow>
            <SplitTitle first="Travel" ampersand second="Stay." firstTint={BG.ink} secondTint={BG.pink} bothItalic />
            <p className="mx-auto mt-10 max-w-[720px] whitespace-pre-line text-center text-[1.05rem] leading-[1.9]"
               style={{ color: BG.inkMuted }}>
              {plan.travelCopy}
            </p>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Wedding party — cream band with pink/sage alternating avatars */}
      {config.weddingParty && party.length > 0 && (
        <ScrollFadeIn>
          <Band bg={BG.pageBg}>
            <Eyebrow tint={BG.sage}>Standing With Us</Eyebrow>
            <SplitTitle first="The" second="Party." firstTint={BG.ink} secondTint={BG.sage} bothItalic />
            <ul className="mx-auto mt-14 grid max-w-[1080px] gap-10 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {party.map((m, i) => {
                /* Alternate pink / sage so the grid reads as patterned */
                const isPink = i % 2 === 0;
                const bg    = isPink ? BG.pink : BG.sage;
                const on    = isPink ? BG.onPink : BG.onSage;
                return (
                  <li key={m.id} className="text-center">
                    <div
                      className="mx-auto h-36 w-36 overflow-hidden rounded-full transition-transform hover:scale-[1.04] sm:h-40 sm:w-40"
                      style={{ background: bg }}
                    >
                      <div className="flex h-full w-full items-center justify-center italic"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      on,
                             fontSize:   "2.6rem",
                           }}>
                        {initials(m.name)}
                      </div>
                    </div>
                    <div className="mt-4 text-xl italic"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           color:      BG.ink,
                         }}>
                      {m.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.36em]"
                         style={{ color: bg }}>
                      {m.role}
                    </div>
                    {m.bio && (
                      <p className="mt-3 text-[0.9rem] leading-[1.8]" style={{ color: BG.inkMuted }}>
                        {m.bio}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Gallery — cream band, checkerboard duotone mosaic ── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <ScrollFadeIn>
          <Band bg={BG.pageBg}>
            <Eyebrow tint={BG.pink}>Memories</Eyebrow>
            <SplitTitle first="The" second="Photos." firstTint={BG.ink} secondTint={BG.pink} bothItalic />
            <div className="mx-auto mt-12 grid max-w-[1200px] gap-3 grid-cols-2 sm:grid-cols-3">
              {gallery.filter(Boolean).map((url, i) => {
                const isPink = i % 2 === 0;
                const overlayColor = isPink ? BG.pink : BG.sage;
                return (
                  <div key={i} className="relative aspect-square overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt=""
                         className="block h-full w-full object-cover transition-transform hover:scale-[1.03]"
                         style={{ filter: "saturate(0.9)" }}
                         loading="lazy" />
                    <div aria-hidden className="absolute inset-0"
                         style={{ background: overlayColor, opacity: 0.22, mixBlendMode: "multiply" }} />
                  </div>
                );
              })}
            </div>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Dress code — sage pale band ────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <ScrollFadeIn>
          <Band bg={BG.sagePale}>
            <Eyebrow tint={BG.sage}>What to Wear</Eyebrow>
            <SplitTitle first="Dress" second="Code." firstTint={BG.sage} secondTint={BG.ink} bothItalic />
            <div className="mx-auto mt-10 max-w-[640px] text-center">
              {plan.dressCodeStyle && (
                <div className="inline-block rounded-full px-8 py-3 text-sm font-bold uppercase tracking-[0.32em]"
                     style={{ background: BG.pink, color: BG.onPink }}>
                  {plan.dressCodeStyle}
                </div>
              )}
              {plan.dressCodeDescription && (
                <p className="mt-6 text-[1.05rem] leading-[1.9]" style={{ color: BG.inkMuted }}>
                  {plan.dressCodeDescription}
                </p>
              )}
            </div>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Things to do — cream band, numbered mosaic list ──── */}
      {config.thingsToDo && things.length > 0 && (
        <ScrollFadeIn>
          <Band bg={BG.pageBg}>
            <Eyebrow tint={BG.pink}>While You&rsquo;re Here</Eyebrow>
            <SplitTitle first="Things to" second="Do." firstTint={BG.ink} secondTint={BG.pink} bothItalic />
            <ol className="mx-auto mt-12 grid max-w-[1080px] gap-6 sm:grid-cols-2">
              {things.map((t, i) => {
                const isPink = i % 2 === 0;
                const badgeBg = isPink ? BG.pink : BG.sage;
                const badgeOn = isPink ? BG.onPink : BG.onSage;
                return (
                  <li key={t.id}
                      className="flex gap-5 rounded-sm p-6"
                      style={{ background: BG.surface, border: `1px solid ${BG.pinkSoft}` }}>
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-2xl italic"
                         style={{
                           background: badgeBg,
                           color:      badgeOn,
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl italic sm:text-3xl"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      BG.ink,
                           }}>
                        {t.name}
                      </div>
                      <p className="mt-3 text-[1rem] leading-[1.8]" style={{ color: BG.inkMuted }}>
                        {t.description}
                      </p>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener"
                           className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.36em]"
                           style={{ color: badgeBg }}>
                          Visit ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Registry — pink band with white pill CTAs ─────────── */}
      {config.registry && registry.length > 0 && (
        <ScrollFadeIn>
          <Band bg={BG.pink} textColor={BG.onPink}>
            <Eyebrow tint={BG.onPink} muted>With Our Thanks</Eyebrow>
            <SplitTitle first="The" second="Registry." firstTint={BG.onPink} secondTint={BG.sage} bothItalic />
            <div className="mx-auto mt-12 flex max-w-[680px] flex-wrap justify-center gap-4">
              {registry.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener"
                   className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs font-bold uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
                   style={{ background: BG.surface, color: BG.pink }}>
                  {r.label || "Registry"} ↗
                </a>
              ))}
            </div>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── FAQ — sage pale band ──────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <ScrollFadeIn>
          <Band bg={BG.sagePale}>
            <Eyebrow tint={BG.sage}>Good to Know</Eyebrow>
            <SplitTitle first="Frequently" second="Asked." firstTint={BG.ink} secondTint={BG.sage} bothItalic />
            <ul className="mx-auto mt-12 max-w-[820px] space-y-4">
              {faqItems.map((f) => (
                <li key={f.id}
                    className="rounded-sm p-6"
                    style={{ background: BG.surface, border: `1px solid ${BG.sageSoft}` }}>
                  <div className="text-lg italic sm:text-xl"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         color:      BG.ink,
                       }}>
                    {f.question}
                  </div>
                  <p className="mt-3 text-[1rem] leading-[1.85]" style={{ color: BG.inkMuted }}>
                    {f.answer}
                  </p>
                </li>
              ))}
            </ul>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Vendor credits — cream band with pink/sage alternating tags */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <ScrollFadeIn>
          <Band bg={BG.pageBg}>
            <Eyebrow tint={BG.pink}>The Team Behind the Day</Eyebrow>
            <SplitTitle first="With" second="Thanks." firstTint={BG.ink} secondTint={BG.pink} bothItalic />

            <div className="mx-auto mt-14 max-w-[920px] space-y-4">
              {venue?.name && (
                <div className="rounded-sm p-6"
                     style={{ background: BG.surface, border: `2px solid ${BG.pink}` }}>
                  <div className="inline-block rounded-full px-4 py-1 text-[0.65rem] font-bold uppercase tracking-[0.32em]"
                       style={{ background: BG.pink, color: BG.onPink }}>
                    Venue
                  </div>
                  <div className="mt-3 text-3xl italic"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         color:      BG.ink,
                       }}>
                    {venue.name}
                  </div>
                  {venue.city && (
                    <div className="mt-1 text-sm" style={{ color: BG.inkMuted }}>
                      {venue.city}, Ontario
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                    {venue.slug && (
                      <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                         className="rounded-full px-4 py-1.5 font-bold uppercase tracking-[0.28em]"
                         style={{ background: BG.pink, color: BG.onPink }}>
                        View profile →
                      </a>
                    )}
                    {venue.website && (
                      <a href={venue.website} target="_blank" rel="noopener"
                         className="rounded-full border-2 px-4 py-1.5 font-medium uppercase tracking-[0.28em]"
                         style={{ borderColor: BG.pinkSoft, color: BG.ink }}>
                        Visit website ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {credits.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {credits.map((c, i) => {
                    const isPink = i % 2 === 0;
                    const tagBg  = isPink ? BG.pink : BG.sage;
                    const tagOn  = isPink ? BG.onPink : BG.onSage;
                    return (
                      <li key={`${c.category}-${i}`}
                          className="rounded-sm p-5"
                          style={{ background: BG.surface, border: `1px solid ${isPink ? BG.pinkSoft : BG.sageSoft}` }}>
                        <div className="inline-block rounded-full px-3 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.32em]"
                             style={{ background: tagBg, color: tagOn }}>
                          {prettyCategory(c.category)}
                        </div>
                        <div className="mt-2 text-lg italic"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               color:      BG.ink,
                             }}>
                          {c.name}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Band>
        </ScrollFadeIn>
      )}

      {/* ── Footer — sage band ───────────────────────────────── */}
      <footer className="px-6 py-14 text-center" style={{ background: BG.sage, color: BG.onSage }}>
        <div className="text-3xl italic sm:text-4xl"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               color:      BG.onSage,
             }}>
          {coupleLabel}
        </div>
        {datePillUpper && (
          <div className="mt-3 text-[0.72rem] uppercase tracking-[0.42em]"
               style={{ color: "rgba(255,255,255,0.85)" }}>
            {datePillUpper}
          </div>
        )}
        <div aria-hidden className="mx-auto my-6 h-1 w-16" style={{ background: BG.pink }} />
        {plan.weddingHashtag && (
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.36em]"
               style={{ color: BG.pinkSoft }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.32em]"
           style={{ color: "rgba(255,255,255,0.75)" }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: BG.onSage }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

/* Full-width colour band. Sections don't wear cards or borders — the
 * band's fill is the section itself, and section transitions happen
 * where two bands meet (no dividers needed). */
function Band({
  bg, textColor = "#1A1A1A", children,
}: {
  bg: string; textColor?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ background: bg, color: textColor }}
             className="px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1180px]">
        {children}
      </div>
    </section>
  );
}

function Eyebrow({ children, tint, muted = false }: {
  children: React.ReactNode; tint: string; muted?: boolean;
}) {
  return (
    <div className="text-center text-[0.72rem] font-medium uppercase tracking-[0.42em]"
         style={{ color: tint, opacity: muted ? 0.85 : 1 }}>
      {children}
    </div>
  );
}

/* Two-tone display heading — first word one colour, second word
 * another, optional italic Cormorant ampersand between. The
 * signature chromatic move of the layout: eyes bounce between the
 * two accents, echoing the alternating bands. */
function SplitTitle({
  first, second, firstTint, secondTint, ampersand = false,
  bothItalic = false, secondItalic = false,
}: {
  first:        string;
  second:       string;
  firstTint:    string;
  secondTint:   string;
  ampersand?:   boolean;
  bothItalic?:  boolean;
  secondItalic?: boolean;
}) {
  const italicOn  = bothItalic;
  const secondIt  = bothItalic || secondItalic;
  return (
    <h2 className="mt-6 text-center leading-[1.02]"
        style={{
          fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
          fontSize:   "clamp(2.4rem, 7vw, 4.6rem)",
          letterSpacing: "-0.01em",
        }}>
      <span style={{ color: firstTint, fontStyle: italicOn ? "italic" : "normal" }}>
        {first}
      </span>
      {ampersand ? (
        <span className="mx-3 italic" style={{ color: secondTint }}>&amp;</span>
      ) : (
        " "
      )}
      <span style={{ color: secondTint, fontStyle: secondIt ? "italic" : "normal" }}>
        {second}
      </span>
    </h2>
  );
}

function EventBlock({
  eyebrow, title, meta, address, mapHref,
  titleColor, subColor, linkColor,
}: {
  eyebrow:    string;
  title:      string;
  meta:       string | null;
  address:    string;
  mapHref:    string | null;
  titleColor: string;
  subColor:   string;
  linkColor:  string;
}) {
  return (
    <div className="text-center">
      <div className="text-[0.7rem] font-medium uppercase tracking-[0.42em]"
           style={{ color: linkColor }}>
        {eyebrow}
      </div>
      <h3 className="mt-4 italic"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            color:      titleColor,
            fontSize:   "clamp(1.9rem, 4vw, 2.6rem)",
            lineHeight: 1.06,
          }}>
        {title}
      </h3>
      {meta && (
        <div className="mt-4 text-[0.98rem]" style={{ color: subColor }}>
          {meta}
        </div>
      )}
      {address && (
        <div className="mt-1 text-[0.95rem] leading-[1.7]" style={{ color: subColor }}>
          {address}
        </div>
      )}
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noopener"
           className="mt-5 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.36em]"
           style={{ color: linkColor }}>
          View on map →
        </a>
      )}
    </div>
  );
}

/* Countdown alternates pink / sage columns — reinforces the
 * chromatic language even in the numeric UI. Numbers rendered as
 * huge italic Cormorant, in the same face as every other heading. */
function ChromaticCountdown({ isoDate }: { isoDate: string }) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff <= 0) {
    return (
      <div className="text-[0.72rem] uppercase tracking-[0.4em]"
           style={{ color: "rgba(255,255,255,0.85)" }}>
        Already celebrated · check the gallery
      </div>
    );
  }
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return (
    <div className="grid grid-cols-3 gap-x-6">
      <ChromaticFig value={days}    label="Days"  chip={BG.sage} />
      <ChromaticFig value={hours}   label="Hours" chip="#FFFFFF" chipInk={BG.pink} />
      <ChromaticFig value={minutes} label="Min"   chip={BG.sage} />
    </div>
  );
}

function ChromaticFig({
  value, label, chip, chipInk,
}: {
  value: number; label: string; chip: string; chipInk?: string;
}) {
  return (
    <div>
      <div className="tabular-nums italic"
           style={{
             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
             color:      "#FFFFFF",
             fontSize:   "clamp(2.4rem,5vw,3.4rem)",
             lineHeight: 1,
           }}>
        {value}
      </div>
      <div className="mt-3 inline-block rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.36em]"
           style={{ background: chip, color: chipInk ?? "#FFFFFF" }}>
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
