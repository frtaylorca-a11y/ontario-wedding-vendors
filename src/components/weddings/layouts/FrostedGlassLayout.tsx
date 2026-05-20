import { ScrollFadeIn } from "../ScrollFadeIn";
import { CountdownTimer } from "../CountdownTimer";
import { BotanicalDivider } from "../BotanicalDivider";
import type { WeddingLayoutProps } from "./types";

/* ─── Frosted Glass theme ─────────────────────────────────────────────
 * Inspired by J.O. Sullivan. Golden-hour photo with a frosted-glass
 * invite card centered, polaroid overlap at the top-right.
 *
 * Palette (fixed):
 *   #3D4A2E  deep olive ink
 *   #7C9A7E  sage accent
 *   #FBF7EE  cream / linen
 *   #F0EAD8  warm sand
 *   rgba(255,255,255,0.8)  frosted glass surface
 *
 * Fonts: Cormorant Garamond + Nunito.
 */

const FG = {
  olive:        "#3D4A2E",
  oliveMuted:   "#5F6C4F",
  sage:         "#7C9A7E",
  sageDeep:     "#5F7C61",
  cream:        "#FBF7EE",
  linen:        "#F0EAD8",
  gold:         "#C9A96E",
  glass:        "rgba(255,255,255,0.82)",
  glassBorder:  "rgba(255,255,255,0.45)",
} as const;

export function FrostedGlassLayout(props: WeddingLayoutProps) {
  const {
    plan, venue, config, credits, coupleLabel, weddingDateUpper, weddingDateLong,
    venueLine, generated, party, registry, things, extraEvents, gallery,
    faqItems, storyPhoto, siteUrl,
  } = props;

  /* The polaroid uses the first gallery image, falling back to a styled
   * decorative panel when none exists. */
  const polaroid = gallery.find((u) => !!u) || storyPhoto || null;

  return (
    <main
      style={{
        background: FG.cream,
        color:      FG.olive,
        fontFamily: "var(--font-nunito), 'Nunito', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {/* ── Hero: golden-hour photo + frosted glass card + polaroid ─── */}
      <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        {plan.weddingHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.weddingHeroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Warm-gold overlay for the golden-hour wash */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(201,169,110,0.28) 0%, rgba(61,74,46,0.32) 100%)",
              }}
            />
          </>
        ) : (
          /* No hero image — render a golden gradient so the card still pops */
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(135deg, ${FG.gold} 0%, ${FG.sageDeep} 60%, ${FG.olive} 100%)`,
            }}
          />
        )}

        {/* The frosted glass invite card + polaroid overlap container */}
        <div className="relative w-full max-w-[640px]">
          {/* Polaroid — top-right, rotated, overlapping the card */}
          <div
            className="absolute right-[-20px] top-[-40px] z-10 hidden rotate-[3deg] rounded-[2px] bg-white p-2 pb-10 shadow-xl sm:block lg:right-[-60px] lg:top-[-60px]"
            style={{
              width: 180,
              boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
            }}
            aria-hidden
          >
            {polaroid ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={polaroid}
                alt=""
                className="block h-[180px] w-full object-cover"
              />
            ) : (
              <div
                className="flex h-[180px] w-full items-center justify-center"
                style={{ background: FG.linen }}
              >
                <BranchIcon tint={FG.sage} size={48} />
              </div>
            )}
            <div
              className="absolute bottom-3 left-0 right-0 text-center text-[0.65rem] uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                fontStyle:  "italic",
                color:      FG.olive,
              }}
            >
              {coupleLabel}
            </div>
          </div>

          {/* Frosted glass card */}
          <div
            className="relative z-0 mx-auto rounded-[4px] px-8 py-12 text-center sm:px-14 sm:py-12"
            style={{
              background:     FG.glass,
              border:         `1px solid ${FG.glassBorder}`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow:      "0 24px 60px rgba(61,74,46,0.18)",
            }}
          >
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.36em]"
                 style={{ color: FG.sageDeep }}>
              Save the date
            </div>

            <div className="mt-5 flex items-center justify-center">
              <RuleSegment tint={FG.olive} />
              <span className="px-3" aria-hidden>
                <BranchIcon tint={FG.sage} size={18} />
              </span>
              <RuleSegment tint={FG.olive} />
            </div>

            <h1
              className="mt-5 text-[clamp(2.2rem,7vw,3.8rem)] leading-[1.05]"
              style={{
                fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                fontStyle:  "italic",
                color:      FG.olive,
                letterSpacing: "0.005em",
              }}
            >
              {coupleLabel}
            </h1>

            {weddingDateUpper && (
              <div className="mt-4 text-[0.85rem] font-medium uppercase tracking-[0.36em]"
                   style={{ color: FG.olive }}>
                {weddingDateUpper}
              </div>
            )}
            {venueLine && (
              <div className="mt-2 text-[0.85rem]" style={{ color: FG.oliveMuted }}>
                {venueLine}
              </div>
            )}

            {generated?.heroTagline && (
              <p className="mt-5 text-[0.95rem] italic"
                 style={{
                   color: FG.oliveMuted,
                   fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                 }}>
                {generated.heroTagline}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {plan.oneqrSlug && config.rsvp ? (
                <a href={`https://oneqr.events/e/${plan.oneqrSlug}`}
                   className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.28em] transition-all hover:opacity-90"
                   style={{ background: FG.olive, color: FG.cream }}>
                  RSVP
                </a>
              ) : null}
              <a href="#our-story"
                 className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.28em] transition-colors"
                 style={{ borderColor: FG.olive, color: FG.olive }}>
                Learn more
              </a>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
               stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"
               strokeLinecap="round" strokeLinejoin="round"
               className="fg-chevron-bounce">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <style>{`
          @keyframes fgchev { 0%,100%{transform:translateY(0);opacity:0.55}50%{transform:translateY(8px);opacity:1} }
          .fg-chevron-bounce { animation: fgchev 2.2s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .fg-chevron-bounce { animation: none } }
        `}</style>
      </section>

      {/* Botanical divider */}
      <BotanicalThemed tint={FG.sage} />

      {/* ── Countdown band ──────────────────────────────────────────── */}
      {plan.weddingDate && (
        <ScrollFadeIn>
          <section className="px-6 py-14" style={{ background: FG.cream }}>
            <CountdownTimer isoDate={plan.weddingDate} />
          </section>
        </ScrollFadeIn>
      )}

      {/* ── Our story — asymmetric photo + text ─────────────────────── */}
      {config.ourStory && plan.ourStory && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section id="our-story" className="px-6 py-20 lg:py-28" style={{ background: FG.cream }}>
              <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[40fr_60fr] lg:gap-16">
                {/* Photo card */}
                {storyPhoto ? (
                  <div className="overflow-hidden rounded-[2px] bg-white p-3 pb-12 shadow-lg lg:p-4 lg:pb-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={storyPhoto}
                      alt=""
                      className="block aspect-[4/5] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className="flex aspect-[4/5] items-center justify-center rounded-[2px]"
                    style={{ background: FG.linen, border: `1px solid ${FG.linen}` }}
                  >
                    <BranchIcon tint={FG.sage} size={64} />
                  </div>
                )}

                {/* Text */}
                <div>
                  <div className="text-[0.72rem] font-bold uppercase tracking-[0.36em]"
                       style={{ color: FG.sageDeep }}>
                    How we got here
                  </div>
                  <h2 className="mt-3 text-[clamp(2.2rem,6vw,3.3rem)] leading-tight"
                      style={{
                        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                        fontStyle:  "italic",
                        color:      FG.olive,
                      }}>
                    Our Story
                  </h2>

                  <div className="relative mt-7">
                    <span
                      aria-hidden
                      className="absolute -left-1 -top-7 select-none leading-none"
                      style={{
                        fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                        color:      FG.sage,
                        opacity:    0.55,
                        fontSize:   "5rem",
                      }}
                    >
                      &ldquo;
                    </span>
                    <p
                      className="text-[1.05rem] leading-[1.85]"
                      style={{ color: FG.oliveMuted, whiteSpace: "pre-line" }}
                    >
                      {plan.ourStory}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Event details on frosted glass cards over linen ─────────── */}
      {(venue?.name || extraEvents.length > 0) && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.linen }}>
              <SectionHead eyebrow="Join us" title="Event details" tint={FG.sageDeep} ink={FG.olive} />

              <div className="mx-auto mt-12 grid max-w-[1080px] gap-5 lg:grid-cols-2">
                {venue?.name && (
                  <GlassCard>
                    <CardEyebrow tint={FG.sageDeep}>All guests</CardEyebrow>
                    <CardTitle ink={FG.olive}>Ceremony &amp; reception</CardTitle>
                    {weddingDateLong && <CardMeta ink={FG.oliveMuted}>{weddingDateLong}</CardMeta>}
                    <CardMeta ink={FG.oliveMuted}>
                      {[venue.name, venue.city, venue.address].filter(Boolean).join(" · ")}
                    </CardMeta>
                    {venue.address && (
                      <CardMapLink
                        tint={FG.sageDeep}
                        query={[venue.name, venue.address].filter(Boolean).join(" ")}
                      />
                    )}
                  </GlassCard>
                )}
                {extraEvents.map((ev) => (
                  <GlassCard key={ev.id}>
                    <CardEyebrow tint={FG.sageDeep}>{audienceLabel(ev.audience)}</CardEyebrow>
                    <CardTitle ink={FG.olive}>{ev.name || "Additional event"}</CardTitle>
                    {(ev.date || ev.time) && (
                      <CardMeta ink={FG.oliveMuted}>{[ev.date, ev.time].filter(Boolean).join(" · ")}</CardMeta>
                    )}
                    {ev.location && <CardMeta ink={FG.oliveMuted}>{ev.location}</CardMeta>}
                    {ev.description && (
                      <p className="mt-3 text-[0.95rem] leading-[1.8]" style={{ color: FG.oliveMuted }}>
                        {ev.description}
                      </p>
                    )}
                    {ev.location && (
                      <CardMapLink tint={FG.sageDeep} query={ev.location} />
                    )}
                  </GlassCard>
                ))}
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Travel ──────────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.cream }}>
              <SectionHead eyebrow="Plan your trip" title="Travel & accommodation" tint={FG.sageDeep} ink={FG.olive} />
              <p className="mx-auto mt-10 max-w-[680px] whitespace-pre-line text-center text-[1.05rem] leading-[1.85]"
                 style={{ color: FG.oliveMuted }}>
                {plan.travelCopy}
              </p>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Wedding party — circular avatars on linen ──────────────── */}
      {config.weddingParty && party.length > 0 && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.linen }}>
              <SectionHead eyebrow="Standing with us" title="Wedding party" tint={FG.sageDeep} ink={FG.olive} />
              <ul className="mx-auto mt-12 grid max-w-[1080px] gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m) => (
                  <li key={m.id} className="text-center">
                    <div
                      className="mx-auto h-32 w-32 overflow-hidden rounded-full border-2 transition-transform hover:scale-[1.04] sm:h-36 sm:w-36"
                      style={{ borderColor: FG.sage, background: FG.cream }}
                    >
                      <div className="flex h-full w-full items-center justify-center"
                           style={{
                             fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                             fontStyle:  "italic",
                             color:      FG.sageDeep,
                             fontSize:   "2.5rem",
                           }}>
                        {initials(m.name)}
                      </div>
                    </div>
                    <div className="mt-4 text-xl"
                         style={{
                           fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                           fontStyle:  "italic",
                           color:      FG.olive,
                         }}>
                      {m.name}
                    </div>
                    <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.28em]"
                         style={{ color: FG.sageDeep }}>
                      {m.role}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Gallery ─────────────────────────────────────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.cream }}>
              <SectionHead eyebrow="Memories" title="Our photos" tint={FG.sageDeep} ink={FG.olive} />
              <div className="mt-10 grid gap-1 grid-cols-2 sm:grid-cols-3">
                {gallery.filter(Boolean).map((url, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={url} alt=""
                       className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                       loading="lazy" />
                ))}
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Dress code ──────────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.linen }}>
              <SectionHead eyebrow="What to wear" title="Dress code" tint={FG.sageDeep} ink={FG.olive} />
              <div className="mx-auto mt-10 max-w-[640px] text-center">
                {plan.dressCodeStyle && (
                  <div className="inline-block rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.24em]"
                       style={{ background: FG.olive, color: FG.cream }}>
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-5 text-[1.05rem] leading-[1.85]" style={{ color: FG.oliveMuted }}>
                    {plan.dressCodeDescription}
                  </p>
                )}
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Things to do ────────────────────────────────────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.cream }}>
              <SectionHead eyebrow="While you're here" title="Things to do nearby" tint={FG.sageDeep} ink={FG.olive} />
              <ol className="mx-auto mt-10 max-w-[800px] space-y-5">
                {things.map((t, i) => (
                  <li key={t.id}
                      className="flex gap-5 p-6"
                      style={{
                        background:     FG.glass,
                        border:         `1px solid ${FG.linen}`,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}>
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                         style={{
                           background: FG.olive,
                           color:      FG.cream,
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
                             color:      FG.olive,
                           }}>
                        {t.name}
                      </div>
                      <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: FG.oliveMuted }}>
                        {t.description}
                      </p>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener"
                           className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.28em]"
                           style={{ color: FG.sageDeep }}>
                          Visit website ↗
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Registry ────────────────────────────────────────────────── */}
      {config.registry && registry.length > 0 && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.linen }}>
              <SectionHead eyebrow="With our thanks" title="Registry" tint={FG.sageDeep} ink={FG.olive} />
              <div className="mx-auto mt-10 flex max-w-[680px] flex-wrap justify-center gap-3">
                {registry.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener"
                     className="rounded-full border-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:opacity-80"
                     style={{ borderColor: FG.olive, color: FG.olive }}>
                    {r.label || "Registry"} ↗
                  </a>
                ))}
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.cream }}>
              <SectionHead eyebrow="Good to know" title="Frequently asked" tint={FG.sageDeep} ink={FG.olive} />
              <ul className="mx-auto mt-10 max-w-[720px] space-y-4">
                {faqItems.map((f) => (
                  <li key={f.id} className="p-6"
                      style={{
                        background:     FG.glass,
                        border:         `1px solid ${FG.linen}`,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}>
                    <div className="text-lg font-bold" style={{ color: FG.olive }}>
                      {f.question}
                    </div>
                    <p className="mt-2 text-[1rem] leading-[1.8]" style={{ color: FG.oliveMuted }}>
                      {f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Vendor credits ──────────────────────────────────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <>
          <BotanicalThemed tint={FG.sage} />
          <ScrollFadeIn>
            <section className="px-6 py-20 lg:py-28" style={{ background: FG.linen }}>
              <SectionHead eyebrow="The team behind the day" title="Our venue &amp; vendors" tint={FG.sageDeep} ink={FG.olive} />
              <div className="mx-auto mt-10 max-w-[920px] space-y-4">
                {venue?.name && (
                  <GlassCard>
                    <CardEyebrow tint={FG.sageDeep}>Venue</CardEyebrow>
                    <CardTitle ink={FG.olive}>{venue.name}</CardTitle>
                    {venue.city && <CardMeta ink={FG.oliveMuted}>{venue.city}, Ontario</CardMeta>}
                    <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                      {venue.slug && (
                        <a href={`${siteUrl}/venues/${venue.slug}`} target="_blank" rel="noopener"
                           className="rounded-full border-2 px-4 py-1.5 font-bold uppercase tracking-[0.18em]"
                           style={{ borderColor: FG.olive, color: FG.olive }}>
                          View profile →
                        </a>
                      )}
                      {venue.website && (
                        <a href={venue.website} target="_blank" rel="noopener"
                           className="rounded-full border px-4 py-1.5 font-medium uppercase tracking-[0.18em]"
                           style={{ borderColor: FG.sage, color: FG.olive }}>
                          Visit website ↗
                        </a>
                      )}
                    </div>
                  </GlassCard>
                )}

                {credits.length > 0 && (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {credits.map((c, i) => (
                      <li key={`${c.category}-${i}`}>
                        <GlassCard>
                          <CardEyebrow tint={FG.sageDeep}>{prettyCategory(c.category)}</CardEyebrow>
                          <div className="mt-1.5 text-lg"
                               style={{
                                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                                 fontStyle:  "italic",
                                 color:      FG.olive,
                               }}>
                            {c.name}
                          </div>
                        </GlassCard>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </ScrollFadeIn>
        </>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <BotanicalThemed tint={FG.sage} />
      <footer className="px-6 py-14 text-center" style={{ background: FG.cream }}>
        <div className="text-3xl sm:text-4xl"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               fontStyle:  "italic",
               color:      FG.olive,
             }}>
          {coupleLabel}
        </div>
        {weddingDateUpper && (
          <div className="mt-2 text-[0.75rem] uppercase tracking-[0.32em]"
               style={{ color: FG.oliveMuted }}>
            {weddingDateUpper}
          </div>
        )}
        <div aria-hidden className="mx-auto my-6 h-px w-16" style={{ background: FG.sage, opacity: 0.5 }} />
        {plan.weddingHashtag && (
          <div className="text-[0.75rem] font-bold uppercase tracking-[0.32em]"
               style={{ color: FG.sageDeep }}>
            {plan.weddingHashtag}
          </div>
        )}
        <p className="mt-4 text-[0.6rem] uppercase tracking-[0.24em]" style={{ color: FG.oliveMuted }}>
          Planned with{" "}
          <a href={siteUrl} target="_blank" rel="noopener"
             className="font-bold hover:underline"
             style={{ color: FG.sageDeep }}>
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function BotanicalThemed({ tint }: { tint: string }) {
  /* Reuses the shared botanical divider but with the theme accent
   * pinned in via a CSS variable override. */
  return (
    <div style={{ ["--wt-accent" as string]: tint }}>
      <BotanicalDivider />
    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-7 sm:p-8"
      style={{
        background:     FG.glass,
        border:         `1px solid ${FG.linen}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function CardEyebrow({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <div className="text-[0.7rem] font-bold uppercase tracking-[0.32em]" style={{ color: tint }}>
      {children}
    </div>
  );
}

function CardTitle({ children, ink }: { children: React.ReactNode; ink: string }) {
  return (
    <h3 className="mt-2 text-3xl leading-tight sm:text-4xl"
        style={{
          fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
          fontStyle:  "italic",
          color:      ink,
        }}>
      {children}
    </h3>
  );
}

function CardMeta({ children, ink }: { children: React.ReactNode; ink: string }) {
  return (
    <div className="mt-2 text-[1rem] leading-[1.7]" style={{ color: ink }}>
      {children}
    </div>
  );
}

function CardMapLink({ tint, query }: { tint: string; query: string }) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <a href={href} target="_blank" rel="noopener"
       className="mt-5 inline-flex text-[0.7rem] font-bold uppercase tracking-[0.28em]"
       style={{ color: tint }}>
      View on map →
    </a>
  );
}

function SectionHead({ eyebrow, title, tint, ink }: {
  eyebrow: string; title: string; tint: string; ink: string;
}) {
  return (
    <div className="mx-auto max-w-[1080px] text-center">
      <div className="text-[0.72rem] font-bold uppercase tracking-[0.36em]" style={{ color: tint }}>
        {eyebrow}
      </div>
      <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontStyle:  "italic",
            color:      ink,
          }}
          dangerouslySetInnerHTML={{ __html: title }} />
      <div aria-hidden className="mx-auto mt-5 h-px w-12" style={{ background: tint, opacity: 0.5 }} />
    </div>
  );
}

function RuleSegment({ tint }: { tint: string }) {
  return (
    <span
      aria-hidden
      className="block h-px w-10"
      style={{ background: tint, opacity: 0.35 }}
    />
  );
}

function BranchIcon({ tint, size }: { tint: string; size: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      stroke={tint}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 4 v32" />
      <path d="M20 12 q6 -4 11 -2" />
      <path d="M20 12 q-6 -4 -11 -2" />
      <path d="M20 22 q6 -3 11 -1" />
      <path d="M20 22 q-6 -3 -11 -1" />
      <path d="M20 32 q4 -2 8 -1" />
      <path d="M20 32 q-4 -2 -8 -1" />
    </svg>
  );
}

function audienceLabel(a: "everyone" | "wedding-party" | "family-only"): string {
  switch (a) {
    case "wedding-party": return "Wedding party only";
    case "family-only":   return "Family only";
    default:              return "All guests";
  }
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function prettyCategory(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
