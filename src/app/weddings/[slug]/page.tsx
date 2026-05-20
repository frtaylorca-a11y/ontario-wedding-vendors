import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues, weddingPlans } from "@/lib/schema";
import { weddingSiteUrl } from "@/lib/wedding-site";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [plan] = await db
    .select({
      partner1Name: weddingPlans.partner1Name,
      partner2Name: weddingPlans.partner2Name,
      weddingDate: weddingPlans.weddingDate,
    })
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) {
    return { title: "Wedding site not found" };
  }
  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const title = names ? `${names} · Wedding` : "Our Wedding";
  return {
    title,
    description: plan.weddingDate
      ? `${names || "We're getting married"} on ${plan.weddingDate}.`
      : "Save the date.",
    /* This is a private couple site — don't index */
    robots: { index: false, follow: false },
  };
}

export default async function WeddingSitePage({ params }: { params: Params }) {
  const { slug } = await params;

  /* Look up the plan + venue join — slug must be unique (DB index enforces) */
  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  if (!plan) notFound();

  let venue: { name: string | null; city: string | null; address: string | null } | null = null;
  if (plan.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city, address: venues.address })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    venue = v ?? null;
  }

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const canonical = weddingSiteUrl(plan.weddingSiteSlug, plan.weddingSiteRegionalDomain);

  const weddingDateFormatted = plan.weddingDate
    ? new Date(plan.weddingDate).toLocaleDateString("en-CA", {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric",
      })
    : null;

  return (
    <main className="bg-bg-warm min-h-screen">
      <section className="mx-auto max-w-[820px] px-6 py-16 text-center lg:py-24">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
          Save the date
        </div>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-charcoal md:text-7xl">
          {names || "Our Wedding"}
        </h1>
        {weddingDateFormatted && (
          <p className="mt-5 font-display text-2xl italic text-rose md:text-3xl">
            {weddingDateFormatted}
          </p>
        )}
        {venue?.name && (
          <p className="mt-2 text-sm text-text-mid md:text-base">
            {venue.name}
            {venue.city ? ` · ${venue.city}` : ""}, Ontario
          </p>
        )}

        {plan.oneqrSlug && (
          <div className="mt-10">
            <a
              href={`https://oneqr.events/e/${plan.oneqrSlug}`}
              className="inline-flex items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              RSVP &amp; details →
            </a>
            <p className="mt-3 text-xs text-text-muted">
              Live guest gallery, seating chart, and day-of timeline open on
              the wedding day.
            </p>
          </div>
        )}

        {!plan.oneqrSlug && (
          <p className="mt-10 rounded-card border border-dashed border-border bg-white p-6 text-sm text-text-muted">
            Full RSVP + guest experience coming soon — the couple is still
            setting things up. Check back closer to the wedding date.
          </p>
        )}

        {canonical && (
          <p className="mt-12 text-[0.65rem] text-text-muted">
            {canonical}
          </p>
        )}
        <p className="mt-4 text-[0.6rem] text-text-muted">
          Wedding site powered by{" "}
          <Link
            href={"/" as Route}
            className="text-rose hover:underline"
          >
            Ontario Wedding Vendors
          </Link>
        </p>
      </section>
    </main>
  );
}
