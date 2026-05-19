import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

export const metadata: Metadata = {
  title: "About Ontario Wedding Vendors | Our Methodology & Operators",
  description:
    "How we discover and score 1,280+ Ontario wedding venues, what the Verified badge means, how often the data refreshes, and who operates the site.",
  alternates: { canonical: "/about" },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#org`,
      name: "Ontario Wedding Vendors",
      url: SITE_URL,
      logo: `${SITE_URL}/images/hero-niagara-vineyard.png`,
      parentOrganization: {
        "@type": "LocalBusiness",
        name: "Pic Booth",
        url: "https://picbooth.ca",
        address: {
          "@type": "PostalAddress",
          streetAddress: "111 Fourth Ave",
          addressLocality: "St. Catharines",
          addressRegion: "ON",
          addressCountry: "CA",
        },
        award: "JUNO Awards photo booth provider",
      },
    },
  ],
};

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
        {title}
      </h2>
      <div className="prose-tokens mt-4 space-y-4 text-base leading-relaxed text-text-mid">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  const breadcrumbItems = [
    { name: "Home",  url: "/" },
    { name: "About", url: "/about" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ORGANIZATION_SCHEMA).replace(/</g, "\\u003c"),
        }}
      />

      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[820px] px-6 py-16 lg:py-20">
          <nav aria-label="Breadcrumb" className="mb-8 text-xs font-medium text-text-muted">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link href={"/" as Route} className="hover:text-rose">Home</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-charcoal">About</li>
            </ol>
          </nav>

          <header>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              About
            </div>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-charcoal md:text-6xl">
              How we built Ontario&rsquo;s most complete{" "}
              <em className="italic text-rose">wedding venue directory</em>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-text-mid">
              Ontario Wedding Vendors is a directory of 1,280+ wedding venues
              across the province, sourced from Google Places, individually
              reviewed for wedding-readiness, and refreshed on a 60-day cycle.
              We don&rsquo;t take editorial money to rank venues higher. Here is
              exactly how the data works.
            </p>
          </header>

          <Section
            eyebrow="Discovery"
            title="How we find venues"
          >
            <p>
              Our team researches and verifies wedding venues across Ontario
              through a combination of direct outreach, venue websites, and
              Google business data. Every listing is individually reviewed to
              confirm the venue actively serves weddings before it appears in
              our directory.
            </p>
          </Section>

          <Section
            eyebrow="Methodology"
            title="What the wedding-readiness score (0&ndash;100) means"
          >
            <p>
              Every venue gets a score from 0 to 100 derived from objective,
              measurable signals — not editorial opinion. Higher scores mean
              the venue presents itself as wedding-ready to the couples
              searching for it.
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Has a dedicated weddings page on its own site (+20)</li>
              <li>Publishes a capacity range (+10)</li>
              <li>Lists packages and/or pricing (+15)</li>
              <li>Names a coordinator with contact details (+10)</li>
              <li>Has testimonials, recent Google reviews, and a 4.0+ rating (+25)</li>
              <li>Active social presence with wedding imagery (+10)</li>
              <li>Working website and verified business status (+10)</li>
            </ul>
            <p>
              <strong className="font-semibold text-charcoal">Premier</strong>{" "}
              (90+), <strong className="font-semibold text-charcoal">Active</strong>{" "}
              (70&ndash;89), and{" "}
              <strong className="font-semibold text-charcoal">Listed</strong>{" "}
              (50&ndash;69) are the publicly-visible tiers. Anything below 50
              is excluded from search results because the venue isn&rsquo;t
              presenting itself clearly enough for couples to make a decision.
            </p>
          </Section>

          <Section
            eyebrow="Freshness"
            title="The data refreshes every 60 days"
          >
            <p>
              Every 60 days we re-pull Google rating and review counts,
              re-check website availability, and re-verify operating status.
              When a venue passes, its &ldquo;Verified&rdquo; badge updates to
              the current month. When a venue&rsquo;s website goes down or
              Google marks it permanently closed, it&rsquo;s removed from
              public listings within the next cycle.
            </p>
          </Section>

          <Section
            eyebrow="Verified badge"
            title="What &ldquo;Verified May 2026&rdquo; actually means"
          >
            <p>
              A green &ldquo;Verified [Month Year]&rdquo; badge means three
              things checked out on that date: the venue&rsquo;s website
              loaded successfully, Google still lists it as operational, and
              the Google review count had moved in the last 12 months (a
              proxy for active operation). No human inspection — just the
              automated checks. The month tells you how recently we last
              confirmed those signals.
            </p>
          </Section>

          <Section
            eyebrow="Who operates this site"
            title="Built and operated by Pic Booth"
          >
            <p>
              This directory is operated by{" "}
              <a
                href="https://picbooth.ca"
                target="_blank"
                rel="noopener"
                className="text-rose underline-offset-2 hover:underline"
              >
                Pic Booth
              </a>{" "}
              — a JUNO Awards photo booth provider based in St. Catharines,
              Ontario. The same team has spent a decade working weddings
              across Niagara, the GTA, and Muskoka, which is how we know
              what couples actually need to evaluate a venue (and what
              wedding-vendor data is missing from generic directories).
            </p>
            <p>
              <strong className="font-semibold text-charcoal">Pic Booth</strong>
              <br />
              111 Fourth Ave, St. Catharines, ON
              <br />
              <a
                href="https://picbooth.ca"
                target="_blank"
                rel="noopener"
                className="text-rose hover:underline"
              >
                picbooth.ca
              </a>
            </p>
            <p>
              Pic Booth is one of many photo-booth vendors couples can
              consider — and in Niagara/GTA venue pages, you may see a
              recommendation block for it. We disclose this relationship on
              every page footer. Pic Booth does not receive preferential
              ranking in venue or category listings — venues are ranked
              purely on the wedding-readiness score above.
            </p>
          </Section>

          <Section eyebrow="Get in touch" title="Contact us">
            <p>
              Spotted incorrect data, want to claim your venue listing, or
              want to list your wedding-related business? We&rsquo;d like to
              hear from you.
            </p>
            <p className="flex flex-wrap gap-3 pt-2">
              <Link
                href={"/contact" as Route}
                className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                Contact us
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={"/list-your-venue" as Route}
                className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-border bg-white px-5 py-2.5 text-sm font-bold text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                List your venue
              </Link>
            </p>
          </Section>
        </div>
      </main>
    </>
  );
}
