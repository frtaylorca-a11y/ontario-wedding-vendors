import type { Metadata } from "next";
import { ClaimListingForm } from "@/components/claim/ClaimListingForm";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { getSiteStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your wedding business listing | Ontario Wedding Vendors",
  description:
    "Claim your free Ontario wedding venue or vendor listing. See profile stats, control your details, and receive direct quote requests from engaged couples.",
  alternates: { canonical: "/claim-listing" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ClaimListingPage({
  searchParams,
}: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const initialBusinessName = (first(raw.business) ?? "").slice(0, 255);

  const stats = await getSiteStats().catch(() => null);
  const vendorCount = stats?.vendorCount ?? null;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home",            url: "/" },
          { name: "Claim a listing", url: "/claim-listing" },
        ]}
      />

      <main className="bg-bg-warm">
        {/* Hero */}
        <section className="border-b border-border-light bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-16 lg:py-20">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              For wedding businesses
            </div>
            <h1 className="mt-3 max-w-[720px] font-display text-5xl font-semibold leading-tight text-charcoal md:text-6xl">
              Is this <em className="italic text-rose">your business?</em>
            </h1>
            <p className="mt-4 max-w-[680px] text-text-mid md:text-lg">
              Join {vendorCount ? `${vendorCount.toLocaleString()}+` : "3,400+"}{" "}
              wedding vendors on Ontario&rsquo;s most complete wedding directory.
              Free to claim, free to keep.
            </p>

            {/* Three benefit columns */}
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <BenefitCard
                icon={
                  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l3-3 3 3 5-5" />
                  </svg>
                }
                title="See your stats"
                body="Profile views, saves, and quote requests in a single dashboard. Know which couples are looking and when."
              />
              <BenefitCard
                icon={
                  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="11" r="2" />
                    <path d="M21 17l-5-5-9 9" />
                  </svg>
                }
                title="Control your profile"
                body="Add photos, write your own description, list packages, link Instagram. Updates publish in real time."
              />
              <BenefitCard
                icon={
                  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 4l8 7 8-7" />
                  </svg>
                }
                title="Receive quote requests"
                body="Couples planning right now can send you a structured brief — date, budget, venue, style — straight to your inbox."
              />
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="mx-auto max-w-[820px] px-6 py-12 lg:py-16">
          <ClaimListingForm initialBusinessName={initialBusinessName} />

          <p className="mt-6 text-center text-[0.7rem] text-text-muted">
            Already listed and want to update something fast? Email{" "}
            <a href="mailto:hello@ontarioweddingvendors.com" className="text-rose hover:underline">
              hello@ontarioweddingvendors.com
            </a>
            .
          </p>
        </section>
      </main>
    </>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-card border border-border-light bg-bg-warm p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-pale text-rose">
        {icon}
      </span>
      <h3 className="mt-3 font-display text-xl font-semibold text-charcoal">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-text-mid">{body}</p>
    </div>
  );
}
