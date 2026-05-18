import { listVendors } from "@/lib/queries";

export const metadata = { title: "Wedding vendors in Ontario" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const { vendors, total } = await listVendors({
    region: first(raw.region),
    city: first(raw.city),
    category: first(raw.category),
    limit: 24,
  });

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-4xl">Wedding vendors</h1>
      <p className="mt-2 text-sm text-[var(--owv-warm-grey)]">
        {total} vendors — UI pending
      </p>
      <ul className="mt-6 space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="text-sm">
            <strong>{v.name}</strong> · {v.category} · {v.city}
          </li>
        ))}
      </ul>
    </main>
  );
}
