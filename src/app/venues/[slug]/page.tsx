import { notFound } from "next/navigation";
import { getVenueBySlug } from "@/lib/queries";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return { title: "Venue not found" };
  const desc = venue.description?.slice(0, 160) ?? `Wedding venue in ${venue.city}, Ontario.`;
  return {
    title: `${venue.name} — ${venue.city ?? "Ontario"} wedding venue`,
    description: desc,
    alternates: { canonical: `/venues/${venue.slug}` },
  };
}

export default async function VenuePage({ params }: { params: Params }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue || (venue.weddingReadinessScore ?? 0) < 50) notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-5xl">{venue.name}</h1>
      <p className="mt-2 text-sm text-[var(--owv-warm-grey)]">
        {venue.city}, {venue.province} · {venue.venueType}
      </p>
      {venue.description ? (
        <p className="mt-6 whitespace-pre-line">{venue.description}</p>
      ) : null}
      <p className="mt-8 text-xs text-[var(--owv-warm-grey)]">UI components pending.</p>
    </main>
  );
}
