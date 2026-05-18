import { getFeaturedVenues } from "@/lib/queries";
import { VenueCard } from "@/components/ui/VenueCard";
import { Hero } from "@/components/sections/Hero";
import { RegionCards } from "@/components/sections/RegionCards";
import { BridgeToPlanner } from "@/components/sections/BridgeToPlanner";
import { VenueTypes } from "@/components/sections/VenueTypes";
import { ListYourVenueCTA } from "@/components/sections/ListYourVenueCTA";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const venues = await getFeaturedVenues(6);

  return (
    <main>
      <Hero />

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
