import { notFound } from "next/navigation";
import { getRegion } from "@/lib/regions";
import { getVenuesByRegion } from "@/lib/queries";

type Params = Promise<{ region: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { region } = await params;
  const r = getRegion(region);
  if (!r) return { title: "Region not found" };
  return {
    title: `Wedding venues in ${r.label}`,
    description: `Browse top-rated wedding venues in ${r.label}, Ontario.`,
    alternates: { canonical: `/regions/${r.slug}` },
  };
}

export default async function RegionPage({ params }: { params: Params }) {
  const { region } = await params;
  const r = getRegion(region);
  if (!r) notFound();

  const venues = await getVenuesByRegion(r.slug, 24);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-5xl">Wedding venues in {r.label}</h1>
      <p className="mt-2 text-sm text-[var(--owv-warm-grey)]">
        {venues.length} venues shown — UI pending
      </p>
      <ul className="mt-6 space-y-2">
        {venues.map((v) => (
          <li key={v.id} className="text-sm">
            <strong>{v.name}</strong> · {v.city}
          </li>
        ))}
      </ul>
    </main>
  );
}
