import { ScrollFadeIn } from "../ScrollFadeIn";
import type { WeddingLayoutProps } from "./types";

/* ─── Minimal Romantic layout ─────────────────────────────────────────
 * Understated, elegant, roomy. Squarespace-wedding vibe. The signature
 * hook — a fixed left-side masthead on desktop with couple names,
 * date, and hashtag, while the main content scrolls on the right.
 * On mobile the sidebar collapses to a slim top header so nothing is
 * clipped or scrolled-under.
 *
 * Restraint is the point:
 *   - Everything is low-contrast — blush accent (#D4A0A0) against ink
 *     and pale-grey surfaces, never black-on-white
 *   - Massive whitespace between sections (py-28 to py-36)
 *   - Cormorant Garamond italic for headings; no bold weights
 *   - No cards, no borders except hairlines, no shadows
 *   - Countdown reads as sentence prose, not a widget
 *
 * Palette (fixed; mirrored in wedding-themes.ts → MINIMAL):
 *   pageBg     #FBF3F3  barely-blush page
 *   surface    #FFFFFF  card / photo tile bg
 *   surfaceAlt #F5F5F3  pale-grey alternate stripe
 *   ink        #1A1A1A  primary text
 *   inkMuted   #6B6B6B  secondary text
 *   accent     #D4A0A0  dusty blush (hairlines, CTA fill, chapter marks)
 *   accentSoft #F2DCDC  wash for hover states
 *   border     #E8D8D8  faint pink-grey hairline
 */
const MR = {
  pageBg:     "#FBF3F3",
  surface:    "#FFFFFF",
  surfaceAlt: "#F5F5F3",
  ink:        "#1A1A1A",
  inkMuted:   "#6B6B6B",
  accent:     "#D4A0A0",
  accentSoft: "#F2DCDC",
  border:     "#E8D8D8",
  onAccent:   "#FFFFFF",
} as const;

export function MinimalRomanticLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper,
    weddingDateLong, generated, party, registry, things, extraEvents,
    gallery, faqItems, storyPhoto, siteUrl,
  } = props;

  const datePillUpper = weddingDateUpper ?? formatUpperDate(plan.weddingDate);
  const daysToGo      = plan.weddingDate ? daysUntil(plan.weddingDate) : null;

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

  const jumpItems: Array<{ href: string; label: string }> = [];
  jumpItems.push({ href: "#the-day",  label: "The Day" });
  if (config.rsvp)                                                    jumpItems.push({ href: "#rsvp",     label: "RSVP" });
  if (config.ourStory     && plan.ourStory)                           jumpItems.push({ href: "#story",    label: "Our Story" });
  if (config.travel       && plan.travelCopy)                         jumpItems.push({ href: "#travel",   label: "Travel" });
  if (config.weddingParty && party.length > 0)                        jumpItems.push({ href: "#party",    label: "The Party" });
  if (config.thingsToDo   && things.length > 0)                       jumpItems.push({ href: "#things",   label: "Nearby" });
  if (config.registry     && registry.length > 0)                     jumpItems.push({ href: "#registry", label: "Registry" });
  if (config.faq          && faqItems.length > 0)                     jumpItems.push({ href: "#faq",      label: "FAQ" });
  if (config.vendorCredits && (venue?.name || credits.length > 0))    jumpItems.push({ href: "#credits",  label: "Credits" });

  return (
    <main
      style={{
        background: MR.pageBg,
        color:      MR.ink,
        fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Mobile top masthead (visible < lg) ────────────────────── */}
      <MobileMasthead
        coupleLabel={coupleLabel}
        datePillUpper={datePillUpper}
        venueCity={venue?.city ?? null}
        jumpItems={jumpItems}
      />

      {/* ── Desktop grid: fixed-width sidebar + scrolling main ────── */}
      <div className="lg:grid lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Sidebar — hidden on mobile (handled by MobileMasthead above) */}
        <aside
          className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:justify-between lg:border-r lg:px-10 lg:py-14"
          style={{ borderColor: MR.border, background: MR.pageBg }}
        >
          <div>
            <div className="text-[0.68rem] font-medium uppercase tracking-[0.42em]"
                 style={{ color: MR.accent }}>
              The Wedding Of
            </div>
            <h1
              className="mt-6 leading-[1.02]"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                fontStyle:  "italic",
                color:      MR.ink,
                fontSize:   "clamp(2.4rem, 4.5vw, 3.4rem)",
              }}
            >
              {coupleLabel}
            </h1>
            <div aria-hidden className="mt-8 h-px w-12"
                 style={{ background: MR.accent, opacity: 0.7 }} />
            {datePillUpper && (
              <div className="mt-7 text-[0.72rem] uppercase tracking-[0.36em]"
                   style={{ color: MR.inkMuted }}>
                {datePillUpper}
              </div>
            )}
            {venue?.city && (
              <div className="mt-2 text-[0.72rem] uppercase tracking-[0.32em]"
                   style={{ color: MR.inkMuted, opacity: 0.75 }}>
                {venue.city}, Ontario
              </div>
            )}
            {daysToGo != null && daysToGo > 0 && (
              <div className="mt-10 text-[0.85rem] leading-[1.6]"
                   style={{ color: MR.ink, fontStyle: "italic",
                            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif" }}>
                {daysToGo} days until forever.
              </div>
            )}
            {jumpItems.length > 0 && (
              <nav className="mt-12">
                <ul className="space-y-3.5">
                  {jumpItems.map((item) => (
                    <li key={item.href}>
                      <a href={item.href}
                         className="text-[0.75rem] uppercase tracking-[0.28em] transition-colors hover:text-[color:var(--mr-hover)]"
                         style={{ color: MR.inkMuted, ["--mr-hover" as string]: MR.accent }}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          <div>
            {plan.weddingHashtag && (
              <div className="text-[0.7rem] font-medium uppercase tracking-[0.32em]"
                   style={{ color: MR.accent }}>
                {plan.weddingHashtag}
              </div>
            )}
            <div className="mt-3 text-[0.6rem] uppercase tracking-[0.28em]"
                 style={{ color: MR.inkMuted, opacity: 0.7 }}>
              Planned with{" "}
              <a href={siteUrl} target="_blank" rel="noopener"
                 className="hover:underline" style={{ color: MR.ink }}>
                Ontario Wedding Vendors
              </a>
            </div>
          </div>
        </aside>

        {/* Main scrolling column — every section lives here */}
        <div className="min-w-0">
          {/* ── Hero — full-bleed photo, no overlay text ───────────── */}
          <section className="relative overflow-hidden">
            {plan.weddingHeroImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan.weddingHeroImage}
                  alt=""
                  className="block h-[70vh] w-full object-cover lg:h-[calc(100vh-56px)] lg:min-h-[600px]"
                />
                {/* Barely-there pink wash so the photo sits inside the palette */}
                <div aria-hidden className="absolute inset-0"
                     style={{ background: "rgba(212,160,160,0.06)" }} />
              </>
            ) : (
              <div
                aria-hidden
                className="block h-[70vh] w-full lg:h-[calc(100vh-56px)] lg:min-h-[600px]"
                style={{
                  background: `linear-gradient(160deg, ${MR.accentSoft} 0%, ${MR.pageBg} 55%, ${MR.surfaceAlt} 100%)`,
                }}
              />
            )}
          </section>

          {/* ── Welcome / The Day ───────────────────────────────── */}
          <ScrollFadeIn>
            <Section id="the-day" bg={MR.pageBg}>
              <ChapterMark>Welcome</ChapterMark>
              <SectionHeading>The Day.</SectionHeading>
              <div className="mt-10 max-w-[620px]">
                <p className="text-[1.05rem] leading-[1.9]" style={{ color: MR.inkMuted }}>
                  {generated?.heroTagline ||
                    `We are delighted to invite you to celebrate with us in ${venue?.city ?? "Ontario"}. What follows is everything you need — the schedule, the place, and a few things to do while you're in town.`}
                </p>
              </div>

              <div className="mt-16 grid gap-x-14 gap-y-12 sm:grid-cols-2">
                <EventBlock
                  eyebrow="The Ceremony"
                  title={venue?.name ?? "The Ceremony"}
                  meta={weddingDateLong}
                  address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
                  mapHref={mapHref}
                />
                <EventBlock
                  eyebrow="The Reception"
                  title={venue?.name ?? "The Reception"}
                  meta="Dinner & dancing to follow"
                  address={[venue?.address, venue?.city && `${venue.city}, Ontario`].filter(Boolean).join(", ")}
                  mapHref={mapHref}
                />
              </div>

              {extraEvents.length > 0 && (
                <ul className="mt-14 divide-y" style={{ borderColor: MR.border }}>
                  {extraEvents.map((ev) => (
                    <li key={ev.id} className="py-8">
                      <div className="text-[0.68rem] font-medium uppercase tracking-[0.36em]"
                           style={{ color: MR.accent }}>
                        {ev.name}
                      </div>
                      <div className="mt-2 text-2xl italic"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      MR.ink,
                           }}>
                        {[ev.date, ev.time].filter(Boolean).join(" · ")}
                      </div>
                      {ev.location && (
                        <div className="mt-1 text-sm" style={{ color: MR.inkMuted }}>
                          {ev.location}
                        </div>
                      )}
                      {ev.description && (
                        <p className="mt-3 max-w-[560px] text-[0.98rem] leading-[1.8]"
                           style={{ color: MR.inkMuted }}>
                          {ev.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </ScrollFadeIn>

          {/* ── RSVP ───────────────────────────────────────────── */}
          {config.rsvp && (
            <ScrollFadeIn>
              <Section id="rsvp" bg={MR.surfaceAlt}>
                <ChapterMark>Please Reply</ChapterMark>
                <SectionHeading>Let us know.</SectionHeading>
                <p className="mt-10 max-w-[560px] text-[1.05rem] leading-[1.9]"
                   style={{ color: MR.inkMuted }}>
                  {rsvpHref
                    ? "We can’t wait to celebrate with you. Confirm your seat at the table below."
                    : "RSVPs open six weeks before the wedding — you’ll find a link here when they do."}
                </p>
                {rsvpHref && (
                  <a href={rsvpHref}
                     className="mt-10 inline-flex items-center gap-3 rounded-full px-10 py-3.5 text-xs font-bold uppercase tracking-[0.32em] transition-opacity hover:opacity-90"
                     style={{ background: MR.accent, color: MR.onAccent }}>
                    <span>RSVP</span>
                    <span>→</span>
                  </a>
                )}
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Our Story ─────────────────────────────────────── */}
          {config.ourStory && plan.ourStory && (
            <ScrollFadeIn>
              <Section id="story" bg={MR.pageBg}>
                <ChapterMark>Chapter One</ChapterMark>
                <SectionHeading>Our story.</SectionHeading>
                <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-[3fr_2fr]">
                  <div>
                    <p className="text-[1.05rem] leading-[1.95]"
                       style={{ color: MR.ink, whiteSpace: "pre-line", fontWeight: 300 }}>
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
                        style={{ background: MR.surface, border: `1px solid ${MR.border}` }}
                      >
                        <div className="text-center">
                          <div aria-hidden className="mx-auto h-px w-10"
                               style={{ background: MR.accent, opacity: 0.7 }} />
                          <div className="mt-4 text-2xl italic"
                               style={{
                                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                                 color:      MR.inkMuted,
                               }}>
                            Portrait
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Travel ─────────────────────────────────────────── */}
          {config.travel && plan.travelCopy && (
            <ScrollFadeIn>
              <Section id="travel" bg={MR.surfaceAlt}>
                <ChapterMark>Plan Your Trip</ChapterMark>
                <SectionHeading>Travel &amp; stay.</SectionHeading>
                <p className="mt-10 max-w-[640px] whitespace-pre-line text-[1.02rem] leading-[1.9]"
                   style={{ color: MR.inkMuted }}>
                  {plan.travelCopy}
                </p>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Wedding party ─────────────────────────────────── */}
          {config.weddingParty && party.length > 0 && (
            <ScrollFadeIn>
              <Section id="party" bg={MR.pageBg}>
                <ChapterMark>Standing With Us</ChapterMark>
                <SectionHeading>The party.</SectionHeading>
                <ul className="mt-14 grid gap-x-8 gap-y-14 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                  {party.map((m) => (
                    <li key={m.id}>
                      <div
                        className="aspect-[4/5] w-full overflow-hidden transition-transform hover:scale-[1.02]"
                        style={{ background: MR.surface, border: `1px solid ${MR.border}` }}
                      >
                        <div className="flex h-full w-full items-center justify-center italic"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               color:      MR.accent,
                               fontSize:   "2.6rem",
                             }}>
                          {initials(m.name)}
                        </div>
                      </div>
                      <div className="mt-4 text-xl italic leading-tight"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      MR.ink,
                           }}>
                        {m.name}
                      </div>
                      <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.32em]"
                           style={{ color: MR.accent }}>
                        {m.role}
                      </div>
                      {m.bio && (
                        <p className="mt-3 text-[0.9rem] leading-[1.75]" style={{ color: MR.inkMuted }}>
                          {m.bio}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Gallery ───────────────────────────────────────── */}
          {config.photoGallery && gallery.filter(Boolean).length > 0 && (
            <ScrollFadeIn>
              <Section id="gallery" bg={MR.surfaceAlt}>
                <ChapterMark>Memories</ChapterMark>
                <SectionHeading>Photographs.</SectionHeading>
                <div className="mt-12 grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {gallery.filter(Boolean).map((url, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={url} alt=""
                         className="aspect-[4/5] w-full object-cover transition-transform hover:scale-[1.02]"
                         loading="lazy" />
                  ))}
                </div>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Dress code ────────────────────────────────────── */}
          {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
            <ScrollFadeIn>
              <Section id="dress" bg={MR.pageBg}>
                <ChapterMark>What to Wear</ChapterMark>
                <SectionHeading>Dress code.</SectionHeading>
                {plan.dressCodeStyle && (
                  <div className="mt-10 text-3xl italic sm:text-4xl"
                       style={{
                         fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                         color:      MR.ink,
                       }}>
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-5 max-w-[560px] text-[1.02rem] leading-[1.85]" style={{ color: MR.inkMuted }}>
                    {plan.dressCodeDescription}
                  </p>
                )}
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Things to do ──────────────────────────────────── */}
          {config.thingsToDo && things.length > 0 && (
            <ScrollFadeIn>
              <Section id="things" bg={MR.surfaceAlt}>
                <ChapterMark>While You’re Here</ChapterMark>
                <SectionHeading>Things nearby.</SectionHeading>
                <ol className="mt-12 divide-y" style={{ borderColor: MR.border }}>
                  {things.map((t) => (
                    <li key={t.id} className="grid gap-x-8 gap-y-3 py-8 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <div className="text-2xl italic leading-tight sm:text-3xl"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               color:      MR.ink,
                             }}>
                          {t.name}
                        </div>
                        <p className="mt-3 max-w-[640px] text-[1rem] leading-[1.8]" style={{ color: MR.inkMuted }}>
                          {t.description}
                        </p>
                      </div>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener"
                           className="text-[0.7rem] font-bold uppercase tracking-[0.32em] sm:justify-self-end sm:pt-2"
                           style={{ color: MR.accent }}>
                          Visit ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Registry ──────────────────────────────────────── */}
          {config.registry && registry.length > 0 && (
            <ScrollFadeIn>
              <Section id="registry" bg={MR.pageBg}>
                <ChapterMark>With Our Thanks</ChapterMark>
                <SectionHeading>Registry.</SectionHeading>
                <ul className="mt-10 divide-y" style={{ borderColor: MR.border }}>
                  {registry.map((r) => (
                    <li key={r.id}>
                      <a href={r.url} target="_blank" rel="noopener"
                         className="flex items-center justify-between py-6 transition-opacity hover:opacity-70">
                        <span className="text-2xl italic sm:text-3xl"
                              style={{
                                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                                color:      MR.ink,
                              }}>
                          {r.label || "Registry"}
                        </span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-[0.32em]"
                              style={{ color: MR.accent }}>
                          Visit ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── FAQ ───────────────────────────────────────────── */}
          {config.faq && faqItems.length > 0 && (
            <ScrollFadeIn>
              <Section id="faq" bg={MR.surfaceAlt}>
                <ChapterMark>Good to Know</ChapterMark>
                <SectionHeading>Frequently asked.</SectionHeading>
                <ul className="mt-10 divide-y" style={{ borderColor: MR.border }}>
                  {faqItems.map((f) => (
                    <li key={f.id} className="py-8">
                      <div className="text-xl italic sm:text-2xl"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             color:      MR.ink,
                           }}>
                        {f.question}
                      </div>
                      <p className="mt-3 max-w-[720px] text-[1rem] leading-[1.85]" style={{ color: MR.inkMuted }}>
                        {f.answer}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Vendor credits ────────────────────────────────── */}
          {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
            <ScrollFadeIn>
              <Section id="credits" bg={MR.pageBg}>
                <ChapterMark>The Team</ChapterMark>
                <SectionHeading>With thanks.</SectionHeading>
                <ul className="mt-12 divide-y" style={{ borderColor: MR.border }}>
                  {venue?.name && (
                    <li>
                      <div className="grid gap-x-8 gap-y-2 py-6 lg:grid-cols-[160px_1fr_auto] lg:items-baseline">
                        <div className="text-[0.68rem] font-medium uppercase tracking-[0.32em]"
                             style={{ color: MR.accent }}>
                          Venue
                        </div>
                        <div>
                          <div className="text-2xl italic sm:text-3xl"
                               style={{
                                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                                 color:      MR.ink,
                               }}>
                            {venue.name}
                          </div>
                          {venue.city && (
                            <div className="mt-1 text-sm" style={{ color: MR.inkMuted }}>
                              {venue.city}, Ontario
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-bold uppercase tracking-[0.32em] lg:justify-self-end">
                          {venue.slug && (
                            <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                               style={{ color: MR.accent }}>
                              Profile →
                            </a>
                          )}
                          {venue.website && (
                            <a href={venue.website} target="_blank" rel="noopener"
                               style={{ color: MR.ink }}>
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
                        <div className="text-[0.68rem] font-medium uppercase tracking-[0.32em]"
                             style={{ color: MR.accent }}>
                          {prettyCategory(c.category)}
                        </div>
                        <div className="text-xl italic sm:text-2xl"
                             style={{
                               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                               color:      MR.ink,
                             }}>
                          {c.name}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-bold uppercase tracking-[0.32em] lg:justify-self-end">
                          {c.slug && (
                            <a href={`${siteUrl}/vendors/${c.category.replace(/_/g, "-")}/${c.slug}`}
                               target="_blank" rel="noopener" style={{ color: MR.accent }}>
                              Profile →
                            </a>
                          )}
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener"
                               style={{ color: MR.ink }}>
                              Website ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            </ScrollFadeIn>
          )}

          {/* ── Footer on mobile — the sidebar handles this on desktop */}
          <footer className="border-t px-6 py-12 text-center lg:hidden"
                  style={{ background: MR.surfaceAlt, borderColor: MR.border }}>
            <div className="text-2xl italic"
                 style={{
                   fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                   color:      MR.ink,
                 }}>
              {coupleLabel}
            </div>
            {plan.weddingHashtag && (
              <div className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.32em]"
                   style={{ color: MR.accent }}>
                {plan.weddingHashtag}
              </div>
            )}
            <p className="mt-4 text-[0.6rem] uppercase tracking-[0.28em]" style={{ color: MR.inkMuted }}>
              Planned with{" "}
              <a href={siteUrl} target="_blank" rel="noopener"
                 className="font-bold hover:underline"
                 style={{ color: MR.ink }}>
                Ontario Wedding Vendors
              </a>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

/* Slim top header for mobile — mirrors the desktop sidebar's names +
 * date so users on phones still get the wayfinding info the sidebar
 * would provide on wide screens. Hidden on lg+ where the aside takes
 * over. Sticky so the couple's name is always visible while they
 * scroll through the sections. */
function MobileMasthead({
  coupleLabel,
  datePillUpper,
  venueCity,
  jumpItems,
}: {
  coupleLabel:   string;
  datePillUpper: string | null;
  venueCity:     string | null;
  jumpItems:     Array<{ href: string; label: string }>;
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b px-5 py-4 lg:hidden"
      style={{ background: "#FBF3F3", borderColor: "#E8D8D8" }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-lg italic leading-none"
               style={{
                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                 color:      "#1A1A1A",
               }}>
            {coupleLabel}
          </div>
          <div className="mt-1 text-[0.55rem] uppercase tracking-[0.32em]"
               style={{ color: "#6B6B6B" }}>
            {[datePillUpper, venueCity].filter(Boolean).join(" · ")}
          </div>
        </div>
        {jumpItems.length > 0 && (
          <details className="relative">
            <summary
              className="cursor-pointer list-none rounded-full border px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.28em]"
              style={{ borderColor: "#E8D8D8", color: "#1A1A1A" }}
            >
              Menu
            </summary>
            <ul
              className="absolute right-0 top-full z-40 mt-2 min-w-[180px] border p-3 shadow-sm"
              style={{ background: "#FFFFFF", borderColor: "#E8D8D8" }}
            >
              {jumpItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href}
                     className="block px-2 py-2 text-[0.7rem] uppercase tracking-[0.28em]"
                     style={{ color: "#6B6B6B" }}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </header>
  );
}

function Section({
  id, bg, children,
}: { id: string; bg: string; children: React.ReactNode }) {
  return (
    <section id={id}
             className="px-6 py-24 sm:px-10 lg:px-16 lg:py-32 xl:py-36"
             style={{ background: bg }}>
      <div className="max-w-[820px] xl:max-w-[900px]">
        {children}
      </div>
    </section>
  );
}

function ChapterMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px w-6" style={{ background: "#D4A0A0", opacity: 0.75 }} />
      <span className="text-[0.68rem] font-medium uppercase tracking-[0.42em]"
            style={{ color: "#D4A0A0" }}>
        {children}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-6 italic leading-[1.02]"
      style={{
        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
        color:      "#1A1A1A",
        fontSize:   "clamp(2.4rem, 6vw, 4rem)",
      }}
    >
      {children}
    </h2>
  );
}

function EventBlock({ eyebrow, title, meta, address, mapHref }: {
  eyebrow: string;
  title:   string;
  meta:    string | null;
  address: string;
  mapHref: string | null;
}) {
  return (
    <div>
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.36em]"
           style={{ color: "#D4A0A0" }}>
        {eyebrow}
      </div>
      <h3 className="mt-3 text-3xl italic leading-[1.05] sm:text-4xl"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            color:      "#1A1A1A",
          }}>
        {title}
      </h3>
      {meta && (
        <div className="mt-3 text-[0.95rem]" style={{ color: "#6B6B6B" }}>
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
           className="mt-5 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.32em]"
           style={{ color: "#D4A0A0" }}>
          View on map →
        </a>
      )}
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

function daysUntil(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) return null;
  const target = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`).getTime();
  const diff   = target - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / 86_400_000);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function prettyCategory(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
