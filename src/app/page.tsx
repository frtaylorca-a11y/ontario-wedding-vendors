import type { Metadata } from "next";
import { getFeaturedVenues } from "@/lib/queries";
import { VenueCard } from "@/components/ui/VenueCard";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { RegionCards } from "@/components/sections/RegionCards";
import { BridgeToPlanner } from "@/components/sections/BridgeToPlanner";
import { VenueTypes } from "@/components/sections/VenueTypes";
import { ListYourVenueCTA } from "@/components/sections/ListYourVenueCTA";

export const dynamic = "force-dynamic";

/* Page-level metadata override — the root layout supplies a generic
 * fallback, but the homepage carries the most search weight on the
 * site and deserves its own keyword-tight description. Kept under
 * 160 characters so Google doesn't truncate. */
export const metadata: Metadata = {
  title: "Ontario Wedding Venues & Vendors | Find Your Perfect Wedding Venue",
  description:
    "Browse 1,000+ Google-verified Ontario wedding venues — Niagara wineries, Muskoka resorts, Toronto ballrooms, barns — plus AI planning and vendor matching.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const venues = await getFeaturedVenues(6);

  return (
    <main>
      <Hero />

      <HowItWorks />

      <RegionCards />

      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <header className="mb-10 text-center">
          <h2 className="font-display text-4xl font-semibold text-charcoal">
            Top <em className="italic text-rose">Ontario</em> wedding venues
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-text-mid">
            Highest-scoring, Google-verified venues from across the province.
          </p>
        </header>

        {venues.length === 0 ? (
          <p className="text-text-muted">
            No venues with a score ≥ 70 yet. Import data or lower the threshold.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </section>

      <BridgeToPlanner />

      <VenueTypes />

      <ListYourVenueCTA />
    </main>
  );
}
