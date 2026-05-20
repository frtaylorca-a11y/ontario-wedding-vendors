import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues, vendors, weddingPlans } from "@/lib/schema";
import { weddingSiteUrl } from "@/lib/wedding-site";
import {
  DEFAULT_PAGE_CONFIG,
  EVENT_AUDIENCE_LABELS,
  mergePageConfig,
  type FaqItem,
  type GeneratedCopy,
  type MultipleEvent,
  type RegistryLink,
  type ThingsToDoItem,
  type WeddingPageConfig,
  type WeddingPartyMember,
} from "@/lib/wedding-website";
import { themeStyle } from "@/lib/wedding-themes";
import type { BookedVendor } from "@/lib/plan-state";
import { PasswordGate } from "./PasswordGate";
import { HeroBlock } from "@/components/weddings/HeroBlock";
import { BotanicalDivider } from "@/components/weddings/BotanicalDivider";
import { ScrollFadeIn } from "@/components/weddings/ScrollFadeIn";
import { EventBand } from "@/components/weddings/EventBand";
import { TerracottaLayout } from "@/components/weddings/layouts/TerracottaLayout";
import { FrostedGlassLayout } from "@/components/weddings/layouts/FrostedGlassLayout";
import type { CreditVendor, WeddingLayoutProps } from "@/components/weddings/layouts/types";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [plan] = await db
    .select({
      partner1Name: weddingPlans.partner1Name,
      partner2Name: weddingPlans.partner2Name,
      weddingDate:  weddingPlans.weddingDate,
    })
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) return { title: "Wedding site not found" };
  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const title = names ? `${names} · Wedding` : "Our Wedding";
  return {
    title,
    description: plan.weddingDate
      ? `${names || "We're getting married"} on ${plan.weddingDate}.`
      : "Save the date.",
    robots: { index: false, follow: false },
  };
}

/* ─── Vendor category icons (compact set for credits) ─────────────────── */

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  photographer:    { label: "Photographer",     icon: <CategoryIcon kind="photographer" /> },
  videographer:    { label: "Videographer",     icon: <CategoryIcon kind="videographer" /> },
  dj:              { label: "DJ",               icon: <CategoryIcon kind="dj" /> },
  florist:         { label: "Florist",          icon: <CategoryIcon kind="florist" /> },
  catering:        { label: "Caterer",          icon: <CategoryIcon kind="catering" /> },
  cake:            { label: "Cake Designer",    icon: <CategoryIcon kind="cake" /> },
  hair_makeup:     { label: "Hair & Makeup",    icon: <CategoryIcon kind="hair_makeup" /> },
  officiant:       { label: "Officiant",        icon: <CategoryIcon kind="officiant" /> },
  limo:            { label: "Transportation",   icon: <CategoryIcon kind="limo" /> },
  lighting_decor:  { label: "Lighting & Decor", icon: <CategoryIcon kind="lighting_decor" /> },
  photo_booth:     { label: "Photo Booth",      icon: <CategoryIcon kind="photo_booth" /> },
  wedding_planner: { label: "Wedding Planner",  icon: <CategoryIcon kind="wedding_planner" /> },
};

function CategoryIcon({ kind }: { kind: string }) {
  const common = {
    viewBox: "0 0 24 24" as const,
    fill: "none" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4 stroke-current",
  };
  switch (kind) {
    case "photographer":
    case "videographer":
      return (<svg aria-hidden {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><circle cx="12" cy="14" r="3" /></svg>);
    case "dj":
      return (<svg aria-hidden {...common}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>);
    case "florist":
      return (<svg aria-hidden {...common}><circle cx="12" cy="12" r="3" /><path d="M12 9V3" /><path d="M12 21v-6" /><path d="M9 12H3" /><path d="M21 12h-6" /></svg>);
    case "catering":
      return (<svg aria-hidden {...common}><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></svg>);
    case "cake":
      return (<svg aria-hidden {...common}><rect x="2" y="10" width="20" height="6" rx="1" /><path d="M12 2v5" /></svg>);
    case "hair_makeup":
      return (<svg aria-hidden {...common}><circle cx="9" cy="9" r="6" /><path d="M16 11l5 5-2 2-5-5z" /></svg>);
    case "officiant":
      return (<svg aria-hidden {...common}><path d="M4 4v16h7V4z" /><path d="M13 4v16h7V4z" /></svg>);
    case "limo":
      return (<svg aria-hidden {...common}><rect x="1" y="3" width="15" height="13" rx="2" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>);
    case "lighting_decor":
      return (<svg aria-hidden {...common}><circle cx="12" cy="5" r="3" /><path d="M12 8v8" /></svg>);
    case "photo_booth":
      return (<svg aria-hidden {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="12" r="2" /></svg>);
    case "wedding_planner":
      return (<svg aria-hidden {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></svg>);
    default:
      return null;
  }
}

function categoryUrlSlug(key: string): string {
  return key.replace(/_/g, "-");
}

/* Anchor bare ISO dates (YYYY-MM-DD) to noon local so toLocaleDateString
 * doesn't slide the day backwards in negative-UTC-offset timezones. */
function parseWeddingDate(iso: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.slice(0, 10));
  if (!m) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
}

function formatDateUpper(iso: string | null): string | null {
  const d = parseWeddingDate(iso);
  if (!d) return null;
  return d.toLocaleDateString("en-CA", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  }).toUpperCase();
}

function formatDateLong(iso: string | null): string | null {
  const d = parseWeddingDate(iso);
  if (!d) return null;
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

/* ─────────────────────────────────────────────────────────────────────── */

export default async function WeddingSitePage({ params }: { params: Params }) {
  const { slug } = await params;

  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) notFound();

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const coupleLabel = names || "Our Wedding";

  /* Password gate */
  if (plan.weddingPassword) {
    const c = await cookies();
    const authed = c.get(`owv_wsite_auth_${slug}`)?.value === "1";
    if (!authed) {
      return (
        <div style={themeStyle(plan.weddingTheme)}>
          <PasswordGate slug={slug} coupleLabel={coupleLabel} />
        </div>
      );
    }
  }

  /* Page-view counter */
  void db
    .update(weddingPlans)
    .set({ weddingPageViews: (plan.weddingPageViews ?? 0) + 1 })
    .where(eq(weddingPlans.id, plan.id))
    .catch(() => {});

  /* Resolve venue */
  let venue: { name: string | null; city: string | null; address: string | null; website: string | null; slug: string | null } | null = null;
  if (plan.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city, address: venues.address, website: venues.website, slug: venues.slug })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    venue = v ?? null;
  }

  const config: WeddingPageConfig = plan.weddingPageConfig
    ? mergePageConfig(plan.weddingPageConfig)
    : { ...DEFAULT_PAGE_CONFIG };

  const booked = (plan.bookedVendors ?? {}) as Record<string, BookedVendor>;
  const bookedList = Object.values(booked).filter((b) => b && b.name);

  /* Hydrate vendor credits */
  let credits: CreditVendor[] = [];
  if (config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && bookedList.length > 0) {
    const ids = bookedList
      .map((b) => b.vendorId)
      .filter((v): v is number => typeof v === "number");
    let vendorRows: Array<{ id: number; name: string; category: string; slug: string; website: string | null }> = [];
    if (ids.length > 0) {
      vendorRows = await db
        .select({ id: vendors.id, name: vendors.name, category: vendors.category, slug: vendors.slug, website: vendors.website })
        .from(vendors)
        .where(inArray(vendors.id, ids));
    }
    const byId = new Map(vendorRows.map((r) => [r.id, r]));
    credits = bookedList.map((b) => {
      const v = b.vendorId != null ? byId.get(b.vendorId) : undefined;
      return {
        name:     v?.name ?? b.name,
        category: b.category,
        slug:     v?.slug ?? null,
        website:  v?.website ?? null,
      };
    });
  }

  const canonical = weddingSiteUrl(plan.weddingSiteSlug, plan.weddingSiteRegionalDomain);

  const weddingDateUpper = formatDateUpper(plan.weddingDate);
  const weddingDateLong  = formatDateLong(plan.weddingDate);
  const venueLine = venue?.name
    ? [venue.name, venue.city ? `${venue.city}, Ontario` : "Ontario"].filter(Boolean).join(" · ")
    : null;

  const generated = (plan.weddingGeneratedCopy as GeneratedCopy | null) ?? null;

  const eventSchema =
    plan.weddingDate && names && venue?.name
      ? {
          "@context":    "https://schema.org",
          "@type":       "Event",
          name:          `${names} · Wedding`,
          startDate:     plan.weddingDate,
          eventStatus:   "https://schema.org/EventScheduled",
          location: {
            "@type":   "Place",
            name:      venue.name,
            address:   venue.address ?? undefined,
          },
          performer: credits.map((c) => ({
            "@type": "Organization",
            name:    c.name,
            url:     c.website ?? undefined,
          })),
          url: canonical ?? undefined,
        }
      : null;

  const party        = (plan.weddingParty     as WeddingPartyMember[] | null) ?? [];
  const registry     = (plan.weddingRegistry  as RegistryLink[]       | null) ?? [];
  const things       = (plan.thingsToDo       as ThingsToDoItem[]     | null) ?? [];
  const extraEvents  = (plan.multipleEvents   as MultipleEvent[]      | null) ?? [];
  const gallery      = (plan.photoGalleryUrls as string[]             | null) ?? [];
  const faqItems     = (generated?.faqItems   ?? []) as FaqItem[];

  /* Optional photo for Our Story — first gallery photo, falling back to
   * the hero image. When neither is set we render a decorative panel. */
  const storyPhoto = (gallery.find((u) => !!u) ?? plan.weddingHeroImage) || null;

  /* Pick an icon per extra-event by simple keyword match. */
  function eventIcon(name: string): "rings" | "champagne" | "fork" {
    const lc = name.toLowerCase();
    if (lc.includes("brunch") || lc.includes("breakfast") || lc.includes("lunch")) return "fork";
    if (lc.includes("dinner") || lc.includes("welcome") || lc.includes("cocktail")) return "champagne";
    return "rings";
  }

  /* Build the payload once — all layout components consume this shape. */
  const layoutProps: WeddingLayoutProps = {
    plan, venue, config, credits, coupleLabel,
    weddingDateUpper, weddingDateLong, venueLine, generated,
    party, registry, things, extraEvents, gallery, faqItems, storyPhoto,
    siteUrl: SITE_URL,
  };

  /* Dispatch to the matching layout for distinct theme variants. The
   * remaining 8 colour-only themes fall through to the default layout
   * rendered inline below. */
  switch (plan.weddingTheme) {
    case "terracotta":
      return <TerracottaLayout {...layoutProps} />;
    case "frosted":
      return <FrostedGlassLayout {...layoutProps} />;
  }

  return (
    <main style={themeStyle(plan.weddingTheme)} className="min-h-screen">
      {/* Scoped: wedding-party avatar hover. Keyed to .wedding-party-avatar
       * so the rule doesn't bleed into anything else on the page. */}
      <style>{`
        .wedding-party-avatar:hover {
          transform: scale(1.04);
          box-shadow: 0 0 0 3px var(--wt-accent);
        }
        .wedding-party-avatar img { transition: transform 0.4s ease; }
        .wedding-party-avatar:hover img { transform: scale(1.06); }
      `}</style>

      {eventSchema && (
        <script
          type="application/ld+json"
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/</g, "\\u003c") }}
        />
      )}

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <HeroBlock
        coupleLabel={coupleLabel}
        partner1Name={plan.partner1Name}
        partner2Name={plan.partner2Name}
        weddingDateIso={plan.weddingDate}
        weddingDateUpper={weddingDateUpper}
        venueLine={venueLine}
        heroImage={plan.weddingHeroImage}
        hashtag={plan.weddingHashtag}
        oneqrSlug={plan.oneqrSlug}
        showRsvpCta={config.rsvp}
      />

      {/* ─── Our Story ─ asymmetric photo + text ───────────────── */}
      {config.ourStory && plan.ourStory && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <OurStorySection
              storyText={plan.ourStory}
              photo={storyPhoto}
              tagline={generated?.heroTagline ?? null}
            />
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Event Details — full-width bands ──────────────────── */}
      {(venue?.name || extraEvents.length > 0) && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <SectionHead eyebrow="Join us" title="Event details" />
          </ScrollFadeIn>
          <div className="space-y-6 lg:space-y-8">
            {venue?.name && (
              <ScrollFadeIn>
                <EventBand
                  title="Ceremony &amp; reception"
                  audience="All guests"
                  when={weddingDateLong}
                  location={[venue.name, venue.city, venue.address].filter(Boolean).join(" · ")}
                  mapQuery={[venue.name, venue.city, "Ontario"].filter(Boolean).join(" ")}
                  icon="rings"
                />
              </ScrollFadeIn>
            )}
            {extraEvents.map((ev) => (
              <ScrollFadeIn key={ev.id}>
                <EventBand
                  title={ev.name || "Additional event"}
                  audience={EVENT_AUDIENCE_LABELS[ev.audience]}
                  when={[ev.date && formatDateLong(ev.date), ev.time].filter(Boolean).join(" · ") || null}
                  location={ev.location ?? null}
                  description={ev.description ?? null}
                  mapQuery={ev.location ?? null}
                  icon={eventIcon(ev.name)}
                />
              </ScrollFadeIn>
            ))}
          </div>
        </>
      )}

      {/* ─── Travel ────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="Plan your trip" title="Travel & accommodation">
              <p className="mx-auto max-w-[640px] whitespace-pre-line text-center text-[1.05rem] leading-[1.8]"
                 style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}>
                {plan.travelCopy}
              </p>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Wedding Party — circular photo grid ──────────────── */}
      {config.weddingParty && party.length > 0 && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="Standing with us" title="Wedding party">
              <ul className="mx-auto grid max-w-[1080px] gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {party.map((m) => (
                  <li key={m.id} className="text-center">
                    <PartyAvatar name={m.name} photo={undefined} />
                    <div
                      className="mt-4 text-xl"
                      style={{
                        fontFamily: "var(--wt-font-display)",
                        fontStyle:  "italic",
                        color:      "var(--wt-ink)",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.28em]"
                      style={{ color: "var(--wt-accent)" }}
                    >
                      {m.role}
                    </div>
                    {m.bio && (
                      <p className="mt-2 text-sm leading-relaxed"
                         style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}>
                        {m.bio}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Photo Gallery — full-bleed mosaic ────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="Memories" title="Our photos">
              <div className="grid gap-1 grid-cols-2 sm:grid-cols-3">
                {gallery.filter(Boolean).map((url, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                    loading="lazy"
                  />
                ))}
              </div>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Dress Code ────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="What to wear" title="Dress code">
              <div className="mx-auto max-w-[640px] text-center">
                {plan.dressCodeStyle && (
                  <div
                    className="inline-block rounded-full px-6 py-2 text-sm font-bold uppercase tracking-[0.24em]"
                    style={{ background: "var(--wt-accent)", color: "var(--wt-accent-ink)" }}
                  >
                    {plan.dressCodeStyle}
                  </div>
                )}
                {plan.dressCodeDescription && (
                  <p className="mt-5 text-[1.05rem] leading-[1.8]"
                     style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}>
                    {plan.dressCodeDescription}
                  </p>
                )}
                {plan.dressCodeImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={plan.dressCodeImageUrl}
                    alt=""
                    className="mx-auto mt-7 max-h-96 rounded-2xl object-cover"
                  />
                )}
              </div>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Things to Do ──────────────────────────────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="While you're here" title="Things to do nearby">
              <ol className="mx-auto max-w-[760px] space-y-5">
                {things.map((t, i) => (
                  <li key={t.id}
                      className="flex gap-5 rounded-2xl border p-6 transition-shadow hover:shadow-md"
                      style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl"
                      style={{
                        background: "var(--wt-accent-soft)",
                        color:      "var(--wt-accent)",
                        fontFamily: "var(--wt-font-display)",
                        fontStyle:  "italic",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-xl"
                           style={{
                             fontFamily: "var(--wt-font-display)",
                             fontStyle:  "var(--wt-display-italic)",
                             color:      "var(--wt-ink)",
                           }}>
                        {t.name}
                      </div>
                      <p className="mt-2 text-[1rem] leading-[1.8]"
                         style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}>
                        {t.description}
                      </p>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener"
                           className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.28em]"
                           style={{ color: "var(--wt-accent)" }}>
                          Visit website ↗
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Registry ──────────────────────────────────────────── */}
      {config.registry && registry.length > 0 && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="With our thanks" title="Registry">
              <div className="mx-auto flex max-w-[680px] flex-wrap justify-center gap-3">
                {registry.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener"
                    className="rounded-full border-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:bg-[var(--wt-accent)] hover:text-[var(--wt-accent-ink)]"
                    style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}
                  >
                    {r.label || "Registry"} ↗
                  </a>
                ))}
              </div>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── FAQ ───────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="Good to know" title="Frequently asked">
              <ul className="mx-auto max-w-[720px] space-y-4">
                {faqItems.map((f) => (
                  <li key={f.id}
                      className="rounded-2xl border p-6"
                      style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                    <div className="text-lg font-bold"
                         style={{ color: "var(--wt-ink)", fontFamily: "var(--wt-font-body)" }}>
                      {f.question}
                    </div>
                    <p className="mt-2 text-[1rem] leading-[1.8]"
                       style={{ color: "var(--wt-ink-muted)", fontFamily: "var(--wt-font-body)" }}>
                      {f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Vendor Credits ─────────────────────────────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <>
          <BotanicalDivider />
          <ScrollFadeIn>
            <ThemeSection eyebrow="The team behind the day" title="Our venue & vendors">
              <div className="mx-auto max-w-[920px] space-y-4">
                {venue?.name && (
                  <div className="rounded-2xl border p-6"
                       style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em]"
                         style={{ color: "var(--wt-accent)" }}>
                      Venue
                    </div>
                    <div className="mt-2 text-3xl"
                         style={{
                           fontFamily: "var(--wt-font-display)",
                           fontStyle:  "var(--wt-display-italic)",
                           color:      "var(--wt-ink)",
                         }}>
                      {venue.name}
                    </div>
                    {venue.city && (
                      <div className="mt-0.5 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
                        {venue.city}, Ontario
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem]">
                      {venue.slug && (
                        <a href={`${SITE_URL}/venues/${venue.slug}`} target="_blank" rel="noopener"
                           className="rounded-full border-2 px-4 py-1.5 font-bold uppercase tracking-[0.18em]"
                           style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}>
                          View profile →
                        </a>
                      )}
                      {venue.website && (
                        <a href={venue.website} target="_blank" rel="noopener"
                           className="rounded-full border px-4 py-1.5 font-medium uppercase tracking-[0.18em]"
                           style={{ borderColor: "var(--wt-border)", color: "var(--wt-ink)" }}>
                          Visit website ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {credits.length > 0 && (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {credits.map((c, i) => {
                      const meta = CATEGORY_META[c.category];
                      return (
                        <li key={`${c.category}-${i}`}
                            className="rounded-2xl border p-5"
                            style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg"
                                  style={{ background: "var(--wt-accent-soft)", color: "var(--wt-accent)" }}>
                              {meta?.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[0.6rem] font-bold uppercase tracking-[0.18em]"
                                   style={{ color: "var(--wt-accent)" }}>
                                {meta?.label ?? c.category}
                              </div>
                              <div className="truncate text-lg"
                                   style={{
                                     fontFamily: "var(--wt-font-display)",
                                     fontStyle:  "var(--wt-display-italic)",
                                   }}>
                                {c.name}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
                            {c.slug && (
                              <a href={`${SITE_URL}/vendors/${categoryUrlSlug(c.category)}/${c.slug}`}
                                 target="_blank" rel="noopener"
                                 className="rounded-full border px-3 py-1 font-bold uppercase tracking-[0.18em]"
                                 style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}>
                                View profile →
                              </a>
                            )}
                            {c.website && (
                              <a href={c.website} target="_blank" rel="noopener"
                                 className="rounded-full border px-3 py-1 font-medium uppercase tracking-[0.18em]"
                                 style={{ borderColor: "var(--wt-border)", color: "var(--wt-ink)" }}>
                                Visit website ↗
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </ThemeSection>
          </ScrollFadeIn>
        </>
      )}

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <BotanicalDivider />
      <WeddingFooter
        coupleLabel={coupleLabel}
        weddingDateUpper={weddingDateUpper}
        hashtag={plan.weddingHashtag}
      />
    </main>
  );
}

/* ─── Layout atoms ─────────────────────────────────────────────────── */

function SectionHead({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mx-auto max-w-[1080px] px-6 pt-4 text-center">
      {eyebrow && (
        <div className="text-[0.8rem] font-bold uppercase tracking-[0.32em]"
             style={{ color: "var(--wt-accent)" }}>
          {eyebrow}
        </div>
      )}
      <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight"
          style={{
            fontFamily: "var(--wt-font-display)",
            fontStyle:  "var(--wt-display-italic)",
            color:      "var(--wt-ink)",
            letterSpacing: "0.01em",
          }}>
        {title}
      </h2>
      <Hairline />
    </div>
  );
}

function ThemeSection({ eyebrow, title, children }: {
  eyebrow?: string;
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mx-auto max-w-[1080px] px-6 py-16 lg:py-24">
        <div className="text-center">
          {eyebrow && (
            <div className="text-[0.8rem] font-bold uppercase tracking-[0.32em]"
                 style={{ color: "var(--wt-accent)" }}>
              {eyebrow}
            </div>
          )}
          <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight"
              style={{
                fontFamily: "var(--wt-font-display)",
                fontStyle:  "var(--wt-display-italic)",
                color:      "var(--wt-ink)",
                letterSpacing: "0.01em",
              }}>
            {title}
          </h2>
          <Hairline />
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function Hairline() {
  return (
    <div
      aria-hidden
      className="mx-auto mt-6 h-px w-12"
      style={{ background: "var(--wt-accent)", opacity: 0.5 }}
    />
  );
}

/* Our story — asymmetric photo + text, with large rose opening quote */
function OurStorySection({
  storyText,
  photo,
  tagline,
}: {
  storyText: string;
  photo:     string | null;
  tagline:   string | null;
}) {
  return (
    <section>
      <div className="mx-auto max-w-[1180px] px-0 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[40fr_60fr] lg:gap-16">
          {/* Photo OR decorative left panel */}
          {photo ? (
            <div className="overflow-hidden sm:rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div
              className="flex aspect-[4/5] items-center justify-center sm:rounded-2xl"
              style={{ background: "var(--wt-surface-alt)" }}
            >
              <span
                style={{
                  fontFamily: "var(--font-monogram), 'Great Vibes', cursive",
                  color:      "var(--wt-accent)",
                  opacity:    0.55,
                  fontSize:   "8rem",
                  lineHeight: 1,
                }}
              >
                &amp;
              </span>
            </div>
          )}

          {/* Text — large decorative opening quote */}
          <div className="px-6 sm:px-0 lg:py-10">
            <div className="text-[0.8rem] font-bold uppercase tracking-[0.32em]"
                 style={{ color: "var(--wt-accent)" }}>
              How we got here
            </div>
            <h2 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight"
                style={{
                  fontFamily: "var(--wt-font-display)",
                  fontStyle:  "var(--wt-display-italic)",
                  color:      "var(--wt-ink)",
                  letterSpacing: "0.01em",
                }}>
              Our story
            </h2>

            {tagline && (
              <p className="mt-2 text-base italic" style={{ color: "var(--wt-ink-muted)" }}>
                {tagline}
              </p>
            )}

            <div className="relative mt-8">
              {/* 80px rose opening quote glyph */}
              <span
                aria-hidden
                className="absolute -left-2 -top-8 select-none leading-none sm:-left-4"
                style={{
                  fontFamily: "var(--wt-font-display)",
                  color:      "var(--wt-accent)",
                  opacity:    0.6,
                  fontSize:   "5rem",
                }}
              >
                &ldquo;
              </span>
              <p
                className="relative pl-2 text-[1.05rem] leading-[1.85] sm:text-[1.1rem]"
                style={{
                  color:      "var(--wt-ink-muted)",
                  fontFamily: "var(--wt-font-body)",
                  whiteSpace: "pre-line",
                }}
              >
                {storyText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Circular avatar — uses a photo if available, else initials in script. */
function PartyAvatar({ name, photo }: { name: string; photo: string | undefined }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      className="wedding-party-avatar mx-auto h-32 w-32 overflow-hidden rounded-full border-2 transition-all duration-300 sm:h-36 sm:w-36"
      style={{ borderColor: "var(--wt-border)", background: "var(--wt-surface-alt)" }}
    >
      {photo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={photo} alt={name} className="h-full w-full object-cover transition-transform" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"
             style={{
               fontFamily: "var(--font-monogram), 'Great Vibes', cursive",
               color:      "var(--wt-accent)",
               fontSize:   "3rem",
             }}>
          {initials || "·"}
        </div>
      )}
    </div>
  );
}

/* Elegant footer — couple names, date, divider, credit line, hashtag. */
function WeddingFooter({
  coupleLabel,
  weddingDateUpper,
  hashtag,
}: {
  coupleLabel:      string;
  weddingDateUpper: string | null;
  hashtag:          string | null;
}) {
  return (
    <footer className="mx-auto max-w-[820px] px-6 py-14 text-center">
      <div className="text-3xl sm:text-4xl"
           style={{
             fontFamily: "var(--wt-font-display)",
             fontStyle:  "var(--wt-display-italic)",
             color:      "var(--wt-ink)",
           }}>
        {coupleLabel}
      </div>
      {weddingDateUpper && (
        <div className="mt-2 text-[0.75rem] uppercase tracking-[0.32em]"
             style={{ color: "var(--wt-ink-muted)" }}>
          {weddingDateUpper}
        </div>
      )}

      <div
        aria-hidden
        className="mx-auto my-6 h-px w-16"
        style={{ background: "var(--wt-accent)", opacity: 0.5 }}
      />

      {hashtag && (
        <div className="text-[0.75rem] font-bold uppercase tracking-[0.32em]"
             style={{ color: "var(--wt-accent)" }}>
          {hashtag}
        </div>
      )}

      <p className="mt-4 text-[0.6rem] uppercase tracking-[0.24em]"
         style={{ color: "var(--wt-ink-muted)" }}>
        Planned with{" "}
        <a href={SITE_URL} target="_blank" rel="noopener"
           style={{ color: "var(--wt-accent)" }}
           className="font-bold hover:underline">
          Ontario Wedding Vendors
        </a>
      </p>
    </footer>
  );
}
