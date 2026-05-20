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

  /* Password gate — only when plan.weddingPassword is set and the auth
   * cookie isn't present. */
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

  /* Page-view counter — fire-and-forget. */
  void db
    .update(weddingPlans)
    .set({ weddingPageViews: (plan.weddingPageViews ?? 0) + 1 })
    .where(eq(weddingPlans.id, plan.id))
    .catch(() => {});

  /* Resolve venue (always needed for hero + event details + credits). */
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

  /* Hydrate vendor credits — same pattern as before. */
  type CreditVendor = { name: string; category: string; slug: string | null; website: string | null };
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

  const weddingDateFormatted = plan.weddingDate
    ? new Date(plan.weddingDate).toLocaleDateString("en-CA", {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric",
      })
    : null;

  const generated = (plan.weddingGeneratedCopy as GeneratedCopy | null) ?? null;

  /* Event JSON-LD */
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

  return (
    <main style={themeStyle(plan.weddingTheme)} className="min-h-screen">
      {eventSchema && (
        <script
          type="application/ld+json"
          /* eslint-disable-next-line react/no-danger */
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/</g, "\\u003c") }}
        />
      )}

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-[820px] px-6 py-20 text-center lg:py-28">
        {plan.weddingHeroImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={plan.weddingHeroImage}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
          />
        )}
        <div className="text-xs font-bold uppercase tracking-[0.18em]"
             style={{ color: "var(--wt-accent)" }}>
          Save the date
        </div>
        <h1
          className="mt-4 text-5xl font-semibold leading-tight md:text-7xl"
          style={{
            fontFamily: "var(--wt-font-display)",
            fontStyle:  "var(--wt-display-italic)",
            color:      "var(--wt-ink)",
          }}
        >
          {coupleLabel}
        </h1>
        {generated?.heroTagline && (
          <p className="mt-4 text-base italic md:text-lg" style={{ color: "var(--wt-ink-muted)" }}>
            {generated.heroTagline}
          </p>
        )}
        {weddingDateFormatted && (
          <p
            className="mt-6 text-2xl md:text-3xl"
            style={{
              fontFamily: "var(--wt-font-display)",
              fontStyle:  "italic",
              color:      "var(--wt-accent)",
            }}
          >
            {weddingDateFormatted}
          </p>
        )}
        {venue?.name && (
          <p className="mt-2 text-sm md:text-base" style={{ color: "var(--wt-ink-muted)" }}>
            {venue.name}
            {venue.city ? ` · ${venue.city}` : ""}, Ontario
          </p>
        )}

        {plan.weddingHashtag && (
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em]"
             style={{ color: "var(--wt-accent)" }}>
            {plan.weddingHashtag}
          </p>
        )}

        {config.rsvp && plan.oneqrSlug && (
          <div className="mt-10">
            <a
              href={`https://oneqr.events/e/${plan.oneqrSlug}`}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold shadow-md transition-all"
              style={{ background: "var(--wt-accent)", color: "var(--wt-accent-ink)" }}
            >
              RSVP &amp; details →
            </a>
          </div>
        )}
        {config.rsvp && !plan.oneqrSlug && (
          <p className="mt-10 rounded-2xl border border-dashed p-6 text-sm"
             style={{ borderColor: "var(--wt-border)", background: "var(--wt-surface)", color: "var(--wt-ink-muted)" }}>
            RSVP opens 6 weeks before the wedding date.
          </p>
        )}
      </section>

      {/* ─── Our Story ──────────────────────────────────────────── */}
      {config.ourStory && plan.ourStory && (
        <ThemeSection title="Our story">
          <p className="mx-auto max-w-[640px] whitespace-pre-line text-center text-base leading-relaxed md:text-lg"
             style={{ color: "var(--wt-ink-muted)" }}>
            {plan.ourStory}
          </p>
        </ThemeSection>
      )}

      {/* ─── Event Details ──────────────────────────────────────── */}
      {(venue?.name || extraEvents.length > 0) && (
        <ThemeSection title="Event details">
          <div className="mx-auto max-w-[680px] space-y-5">
            {venue?.name && (
              <DetailCard
                title="Ceremony &amp; reception"
                when={weddingDateFormatted}
                location={[venue.name, venue.city, venue.address].filter(Boolean).join(" · ")}
              />
            )}
            {extraEvents.map((ev) => (
              <DetailCard
                key={ev.id}
                title={ev.name || "Additional event"}
                when={[ev.date, ev.time].filter(Boolean).join(" · ")}
                location={ev.location}
                audience={EVENT_AUDIENCE_LABELS[ev.audience]}
                description={ev.description}
              />
            ))}
          </div>
        </ThemeSection>
      )}

      {/* ─── Travel ─────────────────────────────────────────────── */}
      {config.travel && plan.travelCopy && (
        <ThemeSection title="Travel &amp; accommodation">
          <p className="mx-auto max-w-[640px] whitespace-pre-line text-center text-base leading-relaxed"
             style={{ color: "var(--wt-ink-muted)" }}>
            {plan.travelCopy}
          </p>
        </ThemeSection>
      )}

      {/* ─── Wedding Party ──────────────────────────────────────── */}
      {config.weddingParty && party.length > 0 && (
        <ThemeSection title="Wedding party">
          <ul className="mx-auto grid max-w-[820px] gap-4 sm:grid-cols-2">
            {party.map((m) => (
              <li key={m.id}
                  className="rounded-2xl border p-5 text-center"
                  style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                <div className="text-xs font-bold uppercase tracking-[0.12em]"
                     style={{ color: "var(--wt-accent)" }}>
                  {m.role}
                </div>
                <div className="mt-2 text-xl"
                     style={{ fontFamily: "var(--wt-font-display)", fontStyle: "var(--wt-display-italic)" }}>
                  {m.name}
                </div>
                {m.bio && (
                  <p className="mt-2 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
                    {m.bio}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </ThemeSection>
      )}

      {/* ─── Photo Gallery ──────────────────────────────────────── */}
      {config.photoGallery && gallery.filter(Boolean).length > 0 && (
        <ThemeSection title="Our photos">
          <div className="mx-auto grid max-w-[1080px] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.filter(Boolean).map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={url}
                alt=""
                className="aspect-square w-full rounded-2xl object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </ThemeSection>
      )}

      {/* ─── Dress Code ─────────────────────────────────────────── */}
      {config.dressCode && (plan.dressCodeStyle || plan.dressCodeDescription) && (
        <ThemeSection title="Dress code">
          <div className="mx-auto max-w-[640px] text-center">
            {plan.dressCodeStyle && (
              <div
                className="inline-block rounded-full px-5 py-1.5 text-sm font-bold uppercase tracking-[0.1em]"
                style={{ background: "var(--wt-accent)", color: "var(--wt-accent-ink)" }}
              >
                {plan.dressCodeStyle}
              </div>
            )}
            {plan.dressCodeDescription && (
              <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--wt-ink-muted)" }}>
                {plan.dressCodeDescription}
              </p>
            )}
            {plan.dressCodeImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={plan.dressCodeImageUrl}
                alt=""
                className="mx-auto mt-6 max-h-96 rounded-2xl object-cover"
              />
            )}
          </div>
        </ThemeSection>
      )}

      {/* ─── Things to Do ───────────────────────────────────────── */}
      {config.thingsToDo && things.length > 0 && (
        <ThemeSection title="Things to do nearby">
          <ol className="mx-auto max-w-[760px] space-y-4">
            {things.map((t, i) => (
              <li key={t.id}
                  className="flex gap-4 rounded-2xl border p-5"
                  style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-base font-bold"
                     style={{ background: "var(--wt-accent-soft)", color: "var(--wt-accent)" }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-lg"
                       style={{ fontFamily: "var(--wt-font-display)", color: "var(--wt-ink)" }}>
                    {t.name}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--wt-ink-muted)" }}>
                    {t.description}
                  </p>
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener"
                       className="mt-2 inline-block text-xs font-bold"
                       style={{ color: "var(--wt-accent)" }}>
                      Visit website ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </ThemeSection>
      )}

      {/* ─── Registry ───────────────────────────────────────────── */}
      {config.registry && registry.length > 0 && (
        <ThemeSection title="Registry">
          <div className="mx-auto flex max-w-[680px] flex-wrap justify-center gap-3">
            {registry.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener"
                className="rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors"
                style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}
              >
                {r.label || "Registry"} ↗
              </a>
            ))}
          </div>
        </ThemeSection>
      )}

      {/* ─── FAQ ────────────────────────────────────────────────── */}
      {config.faq && faqItems.length > 0 && (
        <ThemeSection title="Frequently asked">
          <ul className="mx-auto max-w-[680px] space-y-3">
            {faqItems.map((f) => (
              <li key={f.id}
                  className="rounded-2xl border p-5"
                  style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                <div className="text-base font-bold" style={{ color: "var(--wt-ink)" }}>
                  {f.question}
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--wt-ink-muted)" }}>
                  {f.answer}
                </p>
              </li>
            ))}
          </ul>
        </ThemeSection>
      )}

      {/* ─── Vendor Credits ─────────────────────────────────────── */}
      {config.vendorCredits && (plan.weddingSiteShowVendors ?? true) && (venue?.name || credits.length > 0) && (
        <ThemeSection title="Our venue & vendors">
          <div className="mx-auto max-w-[820px] space-y-4">
            {venue?.name && (
              <div className="rounded-2xl border p-5"
                   style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em]"
                     style={{ color: "var(--wt-accent)" }}>
                  Venue
                </div>
                <div className="mt-1 text-2xl"
                     style={{ fontFamily: "var(--wt-font-display)", fontStyle: "var(--wt-display-italic)" }}>
                  {venue.name}
                </div>
                {venue.city && (
                  <div className="mt-0.5 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
                    {venue.city}, Ontario
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[0.75rem]">
                  {venue.slug && (
                    <a href={`${SITE_URL}/venues/${venue.slug}`} target="_blank" rel="noopener"
                       className="rounded-full border-2 px-3 py-1 font-bold"
                       style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}>
                      View profile →
                    </a>
                  )}
                  {venue.website && (
                    <a href={venue.website} target="_blank" rel="noopener"
                       className="rounded-full border px-3 py-1 font-medium"
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
                        className="rounded-2xl border p-4"
                        style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                              style={{ background: "var(--wt-accent-soft)", color: "var(--wt-accent)" }}>
                          {meta?.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.6rem] font-bold uppercase tracking-[0.1em]"
                               style={{ color: "var(--wt-accent)" }}>
                            {meta?.label ?? c.category}
                          </div>
                          <div className="truncate text-base"
                               style={{ fontFamily: "var(--wt-font-display)" }}>
                            {c.name}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem]">
                        {c.slug && (
                          <a href={`${SITE_URL}/vendors/${categoryUrlSlug(c.category)}/${c.slug}`}
                             target="_blank" rel="noopener"
                             className="rounded-full border px-2.5 py-0.5 font-bold"
                             style={{ borderColor: "var(--wt-accent)", color: "var(--wt-accent)" }}>
                            View profile →
                          </a>
                        )}
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noopener"
                             className="rounded-full border px-2.5 py-0.5 font-medium"
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
      )}

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[820px] px-6 pb-14 pt-4 text-center">
        {plan.weddingHashtag && (
          <p className="text-sm font-bold uppercase tracking-[0.18em]"
             style={{ color: "var(--wt-accent)" }}>
            {plan.weddingHashtag}
          </p>
        )}
        <p className="mt-3 text-[0.65rem]" style={{ color: "var(--wt-ink-muted)" }}>
          Planned with{" "}
          <a href={SITE_URL} target="_blank" rel="noopener"
             style={{ color: "var(--wt-accent)" }}
             className="font-bold hover:underline">
            Ontario Wedding Vendors
          </a>
        </p>
      </footer>
    </main>
  );
}

/* ─── Layout atoms (theme-aware) ───────────────────────────────────── */

function ThemeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t" style={{ borderColor: "var(--wt-border)" }}>
      <div className="mx-auto max-w-[1080px] px-6 py-16 lg:py-20">
        <h2 className="text-center text-3xl font-semibold md:text-4xl"
            style={{
              fontFamily: "var(--wt-font-display)",
              fontStyle:  "var(--wt-display-italic)",
              color:      "var(--wt-ink)",
            }}>
          {title}
        </h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function DetailCard({
  title, when, location, audience, description,
}: {
  title:        string;
  when?:        string | null;
  location?:    string | null;
  audience?:    string | null;
  description?: string | null;
}) {
  return (
    <div className="rounded-2xl border p-5 text-center"
         style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}>
      <div className="text-xs font-bold uppercase tracking-[0.12em]"
           style={{ color: "var(--wt-accent)" }}>
        {audience ?? "All guests"}
      </div>
      <div className="mt-2 text-2xl"
           style={{
             fontFamily: "var(--wt-font-display)",
             fontStyle:  "var(--wt-display-italic)",
             color:      "var(--wt-ink)",
           }}
           dangerouslySetInnerHTML={{ __html: title }} />
      {when && (
        <div className="mt-2 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
          {when}
        </div>
      )}
      {location && (
        <div className="mt-1 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
          {location}
        </div>
      )}
      {description && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--wt-ink-muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}
