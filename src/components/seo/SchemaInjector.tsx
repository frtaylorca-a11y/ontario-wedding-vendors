import type { Venue, Vendor } from "@/lib/schema";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

/* JSON-LD escape: drop </script tags from any user content to prevent injection */
function safeJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function numOrUndef(v: string | number | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function VenueSchema({
  venue,
  imageUrl,
}: {
  venue: Venue;
  imageUrl: string;
}) {
  const id = `${SITE_URL}/venues/${venue.slug}#venue`;
  const url = `${SITE_URL}/venues/${venue.slug}`;

  const rating = numOrUndef(venue.googleRating);
  const reviews = numOrUndef(venue.reviewCount);
  const lat = numOrUndef(venue.lat);
  const lng = numOrUndef(venue.lng);

  type SchemaNode = Record<string, unknown>;

  const node: SchemaNode = {
    "@type": ["LocalBusiness", "EventVenue"],
    "@id": id,
    name: venue.name,
    url,
    image: imageUrl.startsWith("http") ? imageUrl : `${SITE_URL}${imageUrl}`,
  };

  if (venue.description) node.description = venue.description;
  if (venue.phone) node.telephone = venue.phone;
  if (venue.website) node.sameAs = [venue.website];

  if (venue.address || venue.city || venue.postalCode) {
    node.address = {
      "@type": "PostalAddress",
      ...(venue.address ? { streetAddress: venue.address } : {}),
      ...(venue.city ? { addressLocality: venue.city } : {}),
      addressRegion: venue.province ?? "ON",
      ...(venue.postalCode ? { postalCode: venue.postalCode } : {}),
      addressCountry: "CA",
    };
  }

  if (lat != null && lng != null) {
    node.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }

  if (rating != null && reviews != null && reviews > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount: reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (venue.capacityMax != null) {
    node.maximumAttendeeCapacity = venue.capacityMax;
  }

  const payload = {
    "@context": "https://schema.org",
    "@graph": [node],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}

export function VendorSchema({
  vendor,
  imageUrl,
}: {
  vendor: Vendor;
  imageUrl: string;
}) {
  const id = `${SITE_URL}/vendors/${vendor.category.replace(/_/g, "-")}/${vendor.slug}#vendor`;
  const url = `${SITE_URL}/vendors/${vendor.category.replace(/_/g, "-")}/${vendor.slug}`;

  const rating = numOrUndef(vendor.googleRating);
  const reviews = numOrUndef(vendor.reviewCount);
  const lat = numOrUndef(vendor.lat);
  const lng = numOrUndef(vendor.lng);

  type SchemaNode = Record<string, unknown>;
  const node: SchemaNode = {
    "@type": "LocalBusiness",
    "@id": id,
    name: vendor.name,
    url,
    image: imageUrl.startsWith("http") ? imageUrl : `${SITE_URL}${imageUrl}`,
  };

  if (vendor.description) node.description = vendor.description;
  if (vendor.phone) node.telephone = vendor.phone;
  if (vendor.website) node.sameAs = [vendor.website];
  if (vendor.priceTier) {
    const map: Record<string, string> = { budget: "$", mid: "$$", premium: "$$$" };
    node.priceRange = map[vendor.priceTier] ?? vendor.priceTier;
  }

  if (vendor.address || vendor.city) {
    node.address = {
      "@type": "PostalAddress",
      ...(vendor.address ? { streetAddress: vendor.address } : {}),
      ...(vendor.city ? { addressLocality: vendor.city } : {}),
      addressRegion: vendor.province ?? "ON",
      addressCountry: "CA",
    };
  }
  if (lat != null && lng != null) {
    node.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }
  if (rating != null && reviews != null && reviews > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount: reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  /* areaServed — prefer the enriched serviceAreas jsonb when present,
   * otherwise fall back to the vendor's city + region. Each item is a
   * Place node so search engines can resolve it as a real location
   * rather than free text. */
  const serviceAreas: string[] = Array.isArray(vendor.serviceAreas)
    ? (vendor.serviceAreas as unknown[]).filter(
        (s): s is string => typeof s === "string" && s.trim().length > 0,
      )
    : [];
  const areaServedNames =
    serviceAreas.length > 0
      ? serviceAreas
      : [vendor.city, vendor.region].filter((s): s is string => !!s && s.length > 0);
  if (areaServedNames.length > 0) {
    node.areaServed = areaServedNames.map((name) => ({
      "@type": "Place",
      name,
    }));
  }

  const payload = { "@context": "https://schema.org", "@graph": [node] };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}

export function ItemListSchema({
  name,
  items,
}: {
  name: string;
  items: { name: string; url: string }[];
}) {
  if (!items.length) return null;
  const payload = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
      name: it.name,
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}

export function FaqSchema({ items }: { items: { question: string; answer: string }[] }) {
  if (!items.length) return null;
  const payload = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(payload) }}
    />
  );
}
