import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors } from "@/lib/schema";
import type { Vendor } from "@/lib/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor Dashboard | Ontario Wedding Vendors",
  description:
    "Manage your wedding business listing, see profile views and quote requests, and upload photos.",
  alternates: { canonical: "/vendors/dashboard" },
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/* ─── Profile completeness ───────────────────────────────────────────
 * 8 checks, each worth 12.5 points → 100. Drives the meter at the
 * top of the dashboard so vendors know what to improve next. */

type CompletenessCheck = { label: string; done: boolean; weight: number };

function completenessChecks(vendor: Vendor): CompletenessCheck[] {
  return [
    { label: "Business name set",          done: !!vendor.name?.trim(),         weight: 12.5 },
    { label: "Description written",        done: !!vendor.description && vendor.description.length > 80, weight: 12.5 },
    { label: "Website linked",             done: !!vendor.website?.trim(),      weight: 12.5 },
    { label: "Phone number on file",       done: !!vendor.phone?.trim(),        weight: 12.5 },
    { label: "Email on file",              done: !!vendor.email?.trim(),        weight: 12.5 },
    { label: "Instagram handle linked",    done: !!vendor.instagramHandle,      weight: 12.5 },
    { label: "Hero photo uploaded",        done: !!vendor.heroImageCustom || !!vendor.heroImage, weight: 12.5 },
    { label: "Price tier set",             done: !!vendor.priceTier,            weight: 12.5 },
  ];
}

export default async function VendorDashboardPage({
  searchParams,
}: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const slug = first(raw.vendor) ?? null;

  let vendor: Vendor | null = null;
  if (slug) {
    const [row] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.slug, slug))
      .limit(1);
    vendor = row ?? null;
  }

  if (!vendor) {
    return (
      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[680px] px-6 py-20">
          <div className="rounded-card border border-border bg-white p-8 lg:p-10">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Vendor dashboard
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal">
              Sign in to your listing
            </h1>
            <p className="mt-3 text-text-mid">
              Vendor accounts open in the next sprint. In the meantime,{" "}
              <Link href={"/claim-listing" as Route} className="text-rose hover:underline">
                claim your free listing
              </Link>{" "}
              and the team will email you a sign-in link within 24 hours.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={"/claim-listing" as Route}
                className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                Claim a listing →
              </Link>
              <a
                href="mailto:hello@ontarioweddingvendors.com"
                className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                Email the team
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const checks = completenessChecks(vendor);
  const completedCount = checks.filter((c) => c.done).length;
  const completenessPct = Math.round(
    checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0),
  );

  return (
    <main className="bg-bg-warm">
      <div className="mx-auto max-w-[1120px] px-6 py-10 lg:py-14">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Vendor dashboard
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal md:text-4xl">
              {vendor.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Public listing:{" "}
              <Link
                href={`/vendors/${vendor.category.replace(/_/g, "-")}/${vendor.slug}` as Route}
                className="text-rose hover:underline"
              >
                /vendors/{vendor.category.replace(/_/g, "-")}/{vendor.slug}
              </Link>
            </p>
          </div>
          {vendor.claimed ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
              ✓ Claimed
            </span>
          ) : (
            <Link
              href={`/claim-listing?business=${encodeURIComponent(vendor.name)}` as Route}
              className="inline-flex items-center gap-1.5 rounded-pill bg-rose px-4 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Claim this listing →
            </Link>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Profile completeness */}
          <section className="rounded-card border border-border bg-white p-6 lg:col-span-2 lg:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-charcoal">
                Profile completeness
              </h2>
              <div className="font-display text-3xl font-semibold text-rose">
                {completenessPct}%
              </div>
            </div>
            <p className="mt-1 text-sm text-text-mid">
              {completedCount} of {checks.length} fields complete. Couples
              browsing the directory prefer profiles at 75% or higher.
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full bg-rose transition-all"
                style={{ width: `${completenessPct}%` }}
                aria-hidden
              />
            </div>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                      c.done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-text-muted"
                    }`}
                  >
                    {c.done ? (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    )}
                  </span>
                  <span className={c.done ? "text-charcoal" : "text-text-muted"}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Basic stats — skeleton numbers until analytics pipe is wired */}
          <section className="rounded-card border border-border bg-white p-6 lg:p-7">
            <h2 className="font-display text-xl font-semibold text-charcoal">
              30-day activity
            </h2>
            <p className="mt-1 text-[0.7rem] text-text-muted">
              Live counts arrive when GA4 events land — placeholder for now.
            </p>
            <dl className="mt-4 space-y-3">
              <StatRow label="Profile views"        value="—" />
              <StatRow label="Saves to plans"       value={String(vendor.featured ? "—" : "—")} />
              <StatRow label="Quote requests"       value="—" />
              <StatRow label="Phone clicks"         value="—" />
              <StatRow label="Website clicks"       value="—" />
              <StatRow label="Rating"               value={
                vendor.googleRating != null
                  ? `${Number(vendor.googleRating).toFixed(1)}${vendor.reviewCount ? ` (${vendor.reviewCount})` : ""}`
                  : "—"
              } />
            </dl>
          </section>

          {/* Logo / hero upload skeleton */}
          <section className="rounded-card border border-border bg-white p-6 lg:col-span-2 lg:p-7">
            <h2 className="font-display text-xl font-semibold text-charcoal">
              Hero photo
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              The image at the top of your public profile and on every search
              result card. JPEG/PNG/WebP, 16:9 ratio recommended, ≤5 MB.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="relative h-24 w-40 overflow-hidden rounded-card border border-border bg-bg-soft">
                {vendor.heroImageCustom ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={vendor.heroImageCustom}
                    alt={`${vendor.name} hero`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[0.65rem] text-text-muted">
                    No upload yet
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  title="File upload arrives with vendor auth in the next sprint"
                  className="inline-flex items-center gap-2 rounded-pill border-2 border-dashed border-rose bg-white px-4 py-2 text-sm font-bold text-rose opacity-60"
                >
                  Upload new photo (coming soon)
                </button>
                <span className="text-[0.65rem] italic text-text-muted">
                  File upload wires up when vendor accounts go live.
                </span>
              </div>
            </div>
          </section>

          {/* Quick links */}
          <section className="rounded-card border border-border bg-white p-6 lg:p-7">
            <h2 className="font-display text-xl font-semibold text-charcoal">
              Quick actions
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <QuickLink
                href={`/vendors/${vendor.category.replace(/_/g, "-")}/${vendor.slug}` as Route}
                label="View public profile →"
              />
              <QuickLink
                href={`/claim-listing?business=${encodeURIComponent(vendor.name)}` as Route}
                label={vendor.claimed ? "Update contact info →" : "Claim this listing →"}
              />
              <QuickLink
                href={"mailto:hello@ontarioweddingvendors.com" as unknown as Route}
                label="Email the team"
              />
            </ul>
          </section>
        </div>

        <p className="mt-8 text-center text-[0.7rem] text-text-muted">
          This is a preview of the vendor dashboard. Logo upload, live stats,
          and quote-request management arrive with vendor accounts.
        </p>
      </div>
    </main>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-light pb-2 last:border-b-0">
      <dt className="text-sm text-text-mid">{label}</dt>
      <dd className="font-display text-lg font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function QuickLink({ href, label }: { href: Route; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-rose transition-colors hover:underline"
      >
        {label}
      </Link>
    </li>
  );
}
