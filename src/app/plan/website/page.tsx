import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans, venues } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import { WebsiteEditor } from "@/components/plan/WebsiteEditor";
import {
  DEFAULT_PAGE_CONFIG,
  mergePageConfig,
  type WeddingPageConfig,
  type WeddingPartyMember,
  type RegistryLink,
  type ThingsToDoItem,
  type MultipleEvent,
  type GeneratedCopy,
  type WeddingTheme,
} from "@/lib/wedding-website";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding Website Editor | Ontario Wedding Vendors",
  description:
    "Build your free wedding website. Pick a theme, toggle sections on or off, and Claude can generate your copy.",
  alternates: { canonical: "/plan/website" },
  robots:     { index: false, follow: false },
};

export default async function WebsiteEditorPage() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return (
      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[820px] px-6 py-16">
          <PlannerTabs active="website" />
          <p className="rounded-card border border-border bg-white p-8 text-center text-text-mid">
            Plan-session cookie missing. Reload this page in your browser to
            mint one, then come back.
          </p>
        </div>
      </main>
    );
  }

  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  let venueLabel: string | null = null;
  if (plan?.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    if (v?.name) venueLabel = v.city ? `${v.name} · ${v.city}` : v.name;
  }

  const config: WeddingPageConfig = plan?.weddingPageConfig
    ? mergePageConfig(plan.weddingPageConfig)
    : { ...DEFAULT_PAGE_CONFIG };

  const initial = {
    sessionId,
    partner1Name:           plan?.partner1Name           ?? "",
    partner2Name:           plan?.partner2Name           ?? "",
    weddingDate:            plan?.weddingDate            ?? null,
    venueLabel,
    weddingSiteSlug:        plan?.weddingSiteSlug        ?? null,
    weddingSiteDomain:      plan?.weddingSiteRegionalDomain ?? null,
    weddingTheme:           (plan?.weddingTheme as WeddingTheme | null) ?? "romantic",
    weddingPublished:       plan?.weddingPublished       ?? false,
    weddingHeroImage:       plan?.weddingHeroImage       ?? "",
    weddingHashtag:         plan?.weddingHashtag         ?? "",
    weddingPassword:        plan?.weddingPassword        ?? "",
    weddingSiteShowVendors: plan?.weddingSiteShowVendors ?? true,
    weddingPageConfig:      config,
    ourStory:               plan?.ourStory               ?? "",
    travelCopy:             plan?.travelCopy             ?? "",
    dressCodeStyle:         plan?.dressCodeStyle         ?? "",
    dressCodeDescription:   plan?.dressCodeDescription   ?? "",
    dressCodeImageUrl:      plan?.dressCodeImageUrl      ?? "",
    weddingParty:           (plan?.weddingParty     as WeddingPartyMember[]  | null) ?? [],
    weddingRegistry:        (plan?.weddingRegistry  as RegistryLink[]        | null) ?? [],
    thingsToDo:             (plan?.thingsToDo       as ThingsToDoItem[]      | null) ?? [],
    multipleEvents:         (plan?.multipleEvents   as MultipleEvent[]       | null) ?? [],
    photoGalleryUrls:       (plan?.photoGalleryUrls as string[]              | null) ?? [],
    weddingGeneratedCopy:   (plan?.weddingGeneratedCopy as GeneratedCopy     | null) ?? null,
    region:                 plan?.region                 ?? null,
    /* Custom palette + typography */
    customColorPrimary:     plan?.customColorPrimary     ?? null,
    customColorAccent:      plan?.customColorAccent      ?? null,
    customColorBg:          plan?.customColorBg          ?? null,
    customColorText:        plan?.customColorText        ?? null,
    customPaletteId:        plan?.customPaletteId        ?? null,
    weddingTypographyStyle: plan?.weddingTypographyStyle ?? null,
    /* Premium + AI generation tracking */
    tier:                   (plan?.tier as "free" | "premium" | null) ?? "free",
    weddingGenerationCount: plan?.weddingGenerationCount ?? 0,
  };

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[980px] px-6 py-10 lg:py-14">
        <PlannerTabs active="website" />

        <header className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Wedding website
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
            Your free <em className="italic text-rose">wedding website</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-text-mid">
            Pick a theme. Toggle sections on or off. Edit each one inline.
            Claude can write your copy for you — start there and edit anything
            you don&rsquo;t love.
          </p>
        </header>

        <WebsiteEditor initial={initial} />
      </div>
    </main>
  );
}
