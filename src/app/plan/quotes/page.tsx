import type { Metadata } from "next";
import Link from "next/link";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { weddingPlans, vendors, venues, quoteRequests } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { PlannerTabs } from "@/components/plan/PlannerTabs";
import { QuotesPlanner, type ShortlistVendor } from "@/components/plan/QuotesPlanner";
import { startingFromLabel } from "@/lib/ontario-pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request quotes from vendors | Ontario Wedding Vendors",
  description:
    "Shortlist your saved wedding vendors and send a personalised inquiry to each one at once.",
  alternates: { canonical: "/plan/quotes" },
  robots:     { index: false, follow: false },
};

export default async function QuotesPage() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return (
      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[820px] px-6 py-16">
          <PlannerTabs active="quotes" />
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

  /* Empty state when there's no plan or no saved vendors at all. */
  const savedVendors = (plan?.savedVendors as Record<string, string[]> | null) ?? {};
  const allSavedSlugs = Array.from(new Set(Object.values(savedVendors).flat()));
  if (allSavedSlugs.length === 0) {
    return (
      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[820px] px-6 py-12">
          <PlannerTabs active="quotes" />
          <Header />
          <EmptyState />
        </div>
      </main>
    );
  }

  /* Hydrate vendors. Filter to ones we actually have a row for —
   * stale slugs that got removed from the DB are silently dropped. */
  const vendorRows = await db
    .select({
      id:           vendors.id,
      slug:         vendors.slug,
      name:         vendors.name,
      email:        vendors.email,
      category:     vendors.category,
      city:         vendors.city,
      googleRating: vendors.googleRating,
      reviewCount:  vendors.reviewCount,
    })
    .from(vendors)
    .where(inArray(vendors.slug, allSavedSlugs));
  const bySlug = new Map(vendorRows.map((v) => [v.slug, v]));

  /* Quote-request history — most-recent first; lets us tag each row
   * as "Contacted ✓ {date}" and drive the 30-day dedupe in the UI. */
  const history = await db
    .select({
      vendorId:    quoteRequests.vendorId,
      emailSent:   quoteRequests.emailSent,
      emailSentAt: quoteRequests.emailSentAt,
    })
    .from(quoteRequests)
    .where(eq(quoteRequests.sessionId, sessionId))
    .orderBy(desc(quoteRequests.emailSentAt));
  const lastContactByVendor = new Map<number, string>();
  for (const h of history) {
    if (h.emailSent && h.emailSentAt && !lastContactByVendor.has(h.vendorId)) {
      lastContactByVendor.set(h.vendorId, h.emailSentAt.toISOString());
    }
  }

  /* Flatten into a single ShortlistVendor[] preserving saved-category
   * grouping (a vendor saved under "photographer" stays in that
   * group even if their vendors.category column says otherwise). */
  const shortlist: ShortlistVendor[] = [];
  for (const [category, slugs] of Object.entries(savedVendors)) {
    for (const slug of slugs) {
      const v = bySlug.get(slug);
      if (!v) continue;
      shortlist.push({
        id:             v.id,
        slug:           v.slug,
        name:           v.name,
        email:          v.email ?? null,
        category,
        city:           v.city ?? null,
        googleRating:   v.googleRating != null ? Number(v.googleRating) : null,
        reviewCount:    v.reviewCount ?? null,
        startingFrom:   startingFromLabel(category, plan?.region),
        lastContacted:  lastContactByVendor.get(v.id) ?? null,
      });
    }
  }

  /* Resolve venue label for the planner header (so the couple
   * sees confidence that the data is correct before they send). */
  let venueLabel: string | null = null;
  if (plan?.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    if (v?.name) venueLabel = v.city ? `${v.name} · ${v.city}` : v.name;
  }

  /* Wedding-site public URL — passed through so the AI prompt + the
   * email preview can show it. */
  let publicUrl: string | null = null;
  if (plan?.weddingPublished && plan.weddingSiteSlug && plan.weddingSiteRegionalDomain) {
    publicUrl = `https://${plan.weddingSiteSlug}.${plan.weddingSiteRegionalDomain}`;
  }

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[980px] px-6 py-10 lg:py-14">
        <PlannerTabs active="quotes" />
        <Header />
        <QuotesPlanner
          shortlist={shortlist}
          partner1Name={plan?.partner1Name ?? ""}
          partner2Name={plan?.partner2Name ?? ""}
          weddingDate={plan?.weddingDate ?? null}
          venueLabel={venueLabel}
          region={plan?.region ?? null}
          guestCount={plan?.guestCount ?? null}
          coupleEmail={plan?.coupleEmail ?? ""}
          publicUrl={publicUrl}
          quotesSentAt={plan?.quotesSentAt ? plan.quotesSentAt.toISOString() : null}
          cachedTemplate={plan?.quoteEmailTemplate ?? null}
          /* The whole vendor-outreach flow is gated until we have
           * vendor emails populated. The shortlist + selection UI
           * still renders (couples can save favourites and prep
           * who they'd contact), but Generate + Send + Preview are
           * replaced with a "Coming soon" banner. Flip this to false
           * (or drop the prop) once vendors.email is populated. */
          comingSoon
        />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mb-8">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
        Quote requests
      </div>
      <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
        Shortlist <em className="italic text-rose">your vendors</em>,
        send one email to each.
      </h1>
      <p className="mt-3 max-w-[640px] text-text-mid">
        Pick the vendors you actually want to hear back from. AI writes one
        warm inquiry from your plan + story, personalises it per recipient,
        and sends it in one batch. Replies land in your inbox, not ours.
      </p>
    </header>
  );
}

function EmptyState() {
  return (
    <section className="rounded-card border border-border bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-pale text-rose">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current"
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 4h16v12H5l-1 4z" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-charcoal">
        No saved vendors yet
      </h2>
      <p className="mx-auto mt-2 max-w-[420px] text-sm text-text-mid">
        Save vendors from the directory first — heart any vendor card to add
        them to your shortlist. Come back here when you have a few to send.
      </p>
      <Link
        href="/vendors"
        className="mt-6 inline-flex rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover"
      >
        Browse vendors →
      </Link>
    </section>
  );
}
