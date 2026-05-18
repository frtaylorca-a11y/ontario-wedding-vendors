import { notFound } from "next/navigation";
import { listVendors } from "@/lib/queries";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/types";

type Params = Promise<{ category: string }>;

const LABELS: Record<VendorCategory, string> = {
  photographer: "Photographers",
  videographer: "Videographers",
  dj: "DJs",
  florist: "Florists",
  photo_booth: "Photo Booths",
  catering: "Catering",
  cake: "Cake & Desserts",
  hair_makeup: "Hair & Makeup",
  officiant: "Officiants",
  limo: "Limo & Transportation",
};

export async function generateMetadata({ params }: { params: Params }) {
  const { category } = await params;
  if (!VENDOR_CATEGORIES.includes(category as VendorCategory)) {
    return { title: "Category not found" };
  }
  const label = LABELS[category as VendorCategory];
  return {
    title: `Wedding ${label.toLowerCase()} in Ontario`,
    alternates: { canonical: `/vendors/${category}` },
  };
}

export default async function VendorCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  if (!VENDOR_CATEGORIES.includes(category as VendorCategory)) notFound();

  const { vendors, total } = await listVendors({ category, limit: 36 });
  const label = LABELS[category as VendorCategory];

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-5xl">Ontario wedding {label.toLowerCase()}</h1>
      <p className="mt-2 text-sm text-[var(--owv-warm-grey)]">
        {total} vendors — UI pending
      </p>
      <ul className="mt-6 space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="text-sm">
            <strong>{v.name}</strong> · {v.city} · {v.region}
          </li>
        ))}
      </ul>
    </main>
  );
}
