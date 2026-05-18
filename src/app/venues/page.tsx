import { listVenues } from "@/lib/queries";

export const metadata = { title: "Venues" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const result = await listVenues({
    region: first(raw.region),
    city: first(raw.city),
    type: first(raw.type),
    capacity: first(raw.capacity) ? Number(first(raw.capacity)) : undefined,
    score: first(raw.score) ? Number(first(raw.score)) : undefined,
    sort: first(raw.sort) as "rating" | "reviews" | "capacity" | "score" | undefined,
    limit: 24,
  });

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-4xl">Wedding venues in Ontario</h1>
      <p className="mt-2 text-sm text-[var(--owv-warm-grey)]">
        {result.total} venues — UI pending
      </p>
      <ul className="mt-6 space-y-2">
        {result.venues.map((v) => (
          <li key={v.id} className="text-sm">
            <strong>{v.name}</strong> · {v.city}, {v.region}
          </li>
        ))}
      </ul>
    </main>
  );
}
